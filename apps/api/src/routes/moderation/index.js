import db from '../../db/index.js';
import { reports, posts, topics, users, notifications, moderationLogs } from '../../db/schema.js';
import { eq, sql, desc, and, ne, like, or, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

// 生成举报通知消息
function getReportNotificationMessage(reportType, action) {
  const typeMap = {
    topic: '话题',
    post: '回复',
    user: '用户'
  };
  
  const type = typeMap[reportType] || '内容';
  
  if (action === 'resolve') {
    return `您举报的${type}已被处理，感谢您帮助维护社区秩序`;
  } else if (action === 'dismiss') {
    return `您举报的${type}未发现违规，感谢您的关注`;
  }
  
  return '您的举报已被处理';
}

export default async function moderationRoutes(fastify, options) {
  // ============= 新的统一举报接口 =============
  
  // 创建举报
  fastify.post('/reports', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['moderation'],
      description: '举报话题、回复或用户',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['reportType', 'targetId', 'reason'],
        properties: {
          reportType: { type: 'string', enum: ['topic', 'post', 'user'] },
          targetId: { type: 'number' },
          reason: { type: 'string', minLength: 10, maxLength: 500 }
        }
      }
    }
  }, async (request, reply) => {
    const { reportType, targetId, reason } = request.body;

    // 验证目标是否存在
    let targetExists = false;
    let targetName = '';

    if (reportType === 'topic') {
      const [topic] = await db.select().from(topics).where(eq(topics.id, targetId)).limit(1);
      if (topic && !topic.isDeleted) {
        targetExists = true;
        targetName = topic.title;
      }
    } else if (reportType === 'post') {
      const [post] = await db.select().from(posts).where(eq(posts.id, targetId)).limit(1);
      if (post && !post.isDeleted) {
        targetExists = true;
        targetName = `回复 #${post.postNumber}`;
      }
    } else if (reportType === 'user') {
      const [user] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
      if (user && !user.isBanned) {
        targetExists = true;
        targetName = user.username;
      }
    }

    if (!targetExists) {
      return reply.code(404).send({ error: '举报目标不存在或已被删除' });
    }

    // 检查是否已经举报过
    const [existing] = await db
      .select()
      .from(reports)
      .where(and(
        eq(reports.reportType, reportType),
        eq(reports.targetId, targetId),
        eq(reports.reporterId, request.user.id),
        eq(reports.status, 'pending')
      ))
      .limit(1);

    if (existing) {
      return reply.code(400).send({ error: '您已经举报过此内容，请等待处理' });
    }

    const [newReport] = await db.insert(reports).values({
      reportType,
      targetId,
      reporterId: request.user.id,
      reason,
      status: 'pending'
    }).returning();

    return { 
      message: '举报提交成功，我们会尽快处理', 
      report: newReport 
    };
  });

  // 获取举报列表（管理员/版主）
  fastify.get('/reports', {
    preHandler: [fastify.requireModerator],
    schema: {
      tags: ['moderation'],
      description: '获取举报列表（管理员/版主）',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          reportType: { type: 'string', enum: ['topic', 'post', 'user', 'all'] },
          status: { type: 'string', enum: ['pending', 'resolved', 'dismissed', 'all'] },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
          search: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { reportType = 'all', status = 'pending', page = 1, limit = 20, search } = request.query;
    const offset = (page - 1) * limit;

    // 构建查询��件
    const conditions = [];
    if (reportType !== 'all') {
      conditions.push(eq(reports.reportType, reportType));
    }
    if (status !== 'all') {
      conditions.push(eq(reports.status, status));
    }
    // 添加搜索条件
    if (search && search.trim()) {
      conditions.push(like(reports.reason, `%${search.trim()}%`));
    }

    // 获取举报列表
    let query = db
      .select({
        id: reports.id,
        reportType: reports.reportType,
        targetId: reports.targetId,
        reason: reports.reason,
        status: reports.status,
        reporterUsername: users.username,
        reporterName: users.name,
        createdAt: reports.createdAt,
        resolvedAt: reports.resolvedAt,
        resolverNote: reports.resolverNote
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const reportsList = await query
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取目标详情
    const enrichedReports = await Promise.all(reportsList.map(async (report) => {
      let targetInfo = null;

      if (report.reportType === 'topic') {
        const [topic] = await db
          .select({
            title: topics.title,
            username: users.username,
            isDeleted: topics.isDeleted
          })
          .from(topics)
          .leftJoin(users, eq(topics.userId, users.id))
          .where(eq(topics.id, report.targetId))
          .limit(1);
        targetInfo = topic;
      } else if (report.reportType === 'post') {
        const [post] = await db
          .select({
            content: sql`LEFT(${posts.content}, 100)`,
            username: users.username,
            topicId: posts.topicId,
            isDeleted: posts.isDeleted
          })
          .from(posts)
          .leftJoin(users, eq(posts.userId, users.id))
          .where(eq(posts.id, report.targetId))
          .limit(1);
        targetInfo = post;
      } else if (report.reportType === 'user') {
        const [user] = await db
          .select({
            username: users.username,
            name: users.name,
            isBanned: users.isBanned
          })
          .from(users)
          .where(eq(users.id, report.targetId))
          .limit(1);
        targetInfo = user;
      }

      return {
        ...report,
        targetInfo
      };
    }));

    // 获取总数
    let countQuery = db
      .select({ count: sql`count(*)` })
      .from(reports);

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count }] = await countQuery;

    return {
      items: enrichedReports,
      page,
      limit,
      total: Number(count)
    };
  });

  // 处理举报（管理员/版主）
  fastify.patch('/reports/:id/resolve', {
    preHandler: [fastify.requireModerator],
    schema: {
      tags: ['moderation'],
      description: '处理举报（管理员/版主）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      },
      body: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['resolve', 'dismiss'] },
          note: { type: 'string', maxLength: 500 }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { action, note } = request.body;

    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);

    if (!report) {
      return reply.code(404).send({ error: '举报不存在' });
    }

    if (report.status !== 'pending') {
      return reply.code(400).send({ error: '该举报已被处理' });
    }

    const [updated] = await db
      .update(reports)
      .set({
        status: action === 'resolve' ? 'resolved' : 'dismissed',
        resolvedBy: request.user.id,
        resolvedAt: new Date(),
        resolverNote: note || null
      })
      .where(eq(reports.id, id))
      .returning();

    // 发送通知给举报人
    try {
      await db.insert(notifications).values({
        userId: report.reporterId,
        type: action === 'resolve' ? 'report_resolved' : 'report_dismissed',
        triggeredByUserId: request.user.id,
        message: getReportNotificationMessage(report.reportType, action),
        metadata: JSON.stringify({
          reportId: report.id,
          reportType: report.reportType,
          targetId: report.targetId
        })
      });
    } catch (error) {
      // 通知发送失败不影响举报处理
      fastify.log.error('Failed to send report notification:', error);
    }

    return { 
      message: action === 'resolve' ? '举报已处理' : '举报已驳回',
      report: updated 
    };
  });

  // Ban user (admin only)
  fastify.post('/users/:id/ban', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['moderation'],
      description: '封禁用户（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    if (user.role === 'admin') {
      // 检查是否是第一个管理员
      const [firstAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .orderBy(users.createdAt)
        .limit(1);

      if (firstAdmin && firstAdmin.id === user.id) {
        return reply.code(403).send({ error: '不能封禁第一个管理员（创始人）' });
      }

      // 非第一个管理员，检查当前用户是否是第一个管理员
      if (request.user.id !== firstAdmin.id) {
        return reply.code(403).send({ error: '只有第一个管理员可以封禁其他管理员' });
      }
    }

    const [updated] = await db
      .update(users)
      .set({ isBanned: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    // 清除用户缓存，使封禁立即生效
    await fastify.clearUserCache(id);

    return { message: '用户已封禁', user: updated };
  });

  // Unban user (admin only)
  fastify.post('/users/:id/unban', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['moderation'],
      description: '解封用户（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    const [updated] = await db
      .update(users)
      .set({ isBanned: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    // 清除用户缓存，使解封立即生效
    await fastify.clearUserCache(id);

    return { message: '用户已解封', user: updated };
  });

  // Change user role (admin only)
  fastify.patch('/users/:id/role', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['moderation'],
      description: '修改用户角色（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      },
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['user', 'moderator', 'admin', 'vip'] }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { role } = request.body;

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 获取第一个管理员（创始人）
    const [firstAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(users.createdAt)
      .limit(1);

    // 如果要修改的用户是第一个管理员
    if (user.role === 'admin' && firstAdmin && firstAdmin.id === user.id) {
      return reply.code(403).send({ error: '不能修改第一个管理员（创始人）的角色' });
    }

    // 如果要修改其他管理员的角色，检查当前用户是否是第一个管理员
    if (user.role === 'admin' && request.user.id !== firstAdmin?.id) {
      return reply.code(403).send({ error: '只有第一个管理员可以修改其他管理员的角色' });
    }

    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    // 清除用户缓存，使角色变更立即生效
    await fastify.clearUserCache(id);

    return { message: '用户角色已更新', user: updated };
  });



  // ============= 内容审核接口 =============

  // 获取待审核统计数据（管理员/版主）
  fastify.get('/stat', {
    preHandler: [fastify.requireModerator],
    schema: {
      tags: ['moderation'],
      description: '获取待审核统计数据（管理员/版主）',
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    // 获取待审核话题总数
    const [{ count: topicCount }] = await db
      .select({ count: sql`count(*)` })
      .from(topics)
      .where(eq(topics.approvalStatus, 'pending'));

    // 获取待审核回复总数（排除第一条回复）
    const [{ count: postCount }] = await db
      .select({ count: sql`count(*)` })
      .from(posts)
      .where(and(
        eq(posts.approvalStatus, 'pending'),
        ne(posts.postNumber, 1)
      ));

    return {
      totalTopics: Number(topicCount),
      totalPosts: Number(postCount),
      total: Number(topicCount) + Number(postCount)
    };
  });

  // 获取待审核内容列表（管理员/版主）
  fastify.get('/pending', {
    preHandler: [fastify.requireModerator],
    schema: {
      tags: ['moderation'],
      description: '获取待审核内容列表（管理员/版主）',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['topic', 'post', 'all'] },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
          search: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { type = 'all', page = 1, limit = 20, search } = request.query;
    const offset = (page - 1) * limit;

    const items = [];

    // 获取待审核话题（包含第一条回复的内容）
    if (type === 'all' || type === 'topic') {
      // 构建话题查询条件
      const topicConditions = [eq(topics.approvalStatus, 'pending')];

      // 添加搜索条件
      if (search && search.trim()) {
        topicConditions.push(
          or(
            like(topics.title, `%${search.trim()}%`),
            like(posts.content, `%${search.trim()}%`)
          )
        );
      }

      const pendingTopics = await db
        .select({
          id: topics.id,
          type: sql`'topic'`,
          title: topics.title,
          content: sql`LEFT(${posts.content}, 200)`,
          username: users.username,
          userId: users.id,
          createdAt: topics.createdAt,
          categoryName: sql`NULL`
        })
        .from(topics)
        .innerJoin(users, eq(topics.userId, users.id))
        .leftJoin(posts, and(eq(posts.topicId, topics.id), eq(posts.postNumber, 1)))
        .where(and(...topicConditions))
        .orderBy(desc(topics.createdAt))
        .limit(type === 'topic' ? limit : Math.floor(limit / 2))
        .offset(type === 'topic' ? offset : 0);

      items.push(...pendingTopics);
    }

    // 获取待审核回复（排除第一条回复，因为第一条回复随话题一起审核）
    if (type === 'all' || type === 'post') {
      // 构建回复查询条件
      const postConditions = [
        eq(posts.approvalStatus, 'pending'),
        ne(posts.postNumber, 1) // 排除第一条回复
      ];

      // 添加搜索条件
      if (search && search.trim()) {
        postConditions.push(like(posts.content, `%${search.trim()}%`));
      }

      const pendingPosts = await db
        .select({
          id: posts.id,
          type: sql`'post'`,
          title: sql`NULL`,
          content: sql`LEFT(${posts.content}, 200)`,
          username: users.username,
          userId: users.id,
          createdAt: posts.createdAt,
          topicId: posts.topicId,
          topicTitle: topics.title
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .innerJoin(topics, eq(posts.topicId, topics.id))
        .where(and(...postConditions))
        .orderBy(desc(posts.createdAt))
        .limit(type === 'post' ? limit : Math.floor(limit / 2))
        .offset(type === 'post' ? offset : 0);

      items.push(...pendingPosts);
    }

    // 按时间排序
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 获取总数（应用相同的搜索条件）
    let total = 0;

    if (type === 'all' || type === 'topic') {
      // 构建话题统计条件
      const topicCountConditions = [eq(topics.approvalStatus, 'pending')];

      if (search && search.trim()) {
        topicCountConditions.push(
          or(
            like(topics.title, `%${search.trim()}%`),
            like(posts.content, `%${search.trim()}%`)
          )
        );

        // 对于有搜索条件的情况，需要join posts表
        const [{ count }] = await db
          .select({ count: sql`count(*)` })
          .from(topics)
          .leftJoin(posts, and(eq(posts.topicId, topics.id), eq(posts.postNumber, 1)))
          .where(and(...topicCountConditions));
        total += Number(count);
      } else {
        // 没有搜索条件时，直接统计
        const [{ count }] = await db
          .select({ count: sql`count(*)` })
          .from(topics)
          .where(and(...topicCountConditions));
        total += Number(count);
      }
    }

    if (type === 'all' || type === 'post') {
      // 构建回复统计条件
      const postCountConditions = [
        eq(posts.approvalStatus, 'pending'),
        ne(posts.postNumber, 1) // 排除第一条回复
      ];

      if (search && search.trim()) {
        postCountConditions.push(like(posts.content, `%${search.trim()}%`));
      }

      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(posts)
        .where(and(...postCountConditions));
      total += Number(count);
    }

    return {
      items: items.slice(0, limit),
      page,
      limit,
      total
    };
  });

  // 批准内容（管理员/版主）
  fastify.post('/approve/:type/:id', {
    preHandler: [fastify.requireModerator],
    schema: {
      tags: ['moderation'],
      description: '批准内容（管理员/版主）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['type', 'id'],
        properties: {
          type: { type: 'string', enum: ['topic', 'post'] },
          id: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { type, id } = request.params;

    if (type === 'topic') {
      const [topic] = await db.select().from(topics).where(eq(topics.id, id)).limit(1);

      if (!topic) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      if (topic.approvalStatus !== 'pending') {
        return reply.code(400).send({ error: '该话题不是待审核状态' });
      }

      // 批准话题
      const [updated] = await db
        .update(topics)
        .set({ approvalStatus: 'approved' })
        .where(eq(topics.id, id))
        .returning();

      // 同时批准话题的第一条回复（话题内容）
      await db
        .update(posts)
        .set({ approvalStatus: 'approved' })
        .where(and(eq(posts.topicId, id), eq(posts.postNumber, 1)));

      // 记录审核日志
      await db.insert(moderationLogs).values({
        action: 'approve',
        targetType: 'topic',
        targetId: id,
        moderatorId: request.user.id,
        previousStatus: 'pending',
        newStatus: 'approved'
      });

      // 触发话题创建事件（用于勋章、积分等）
      if (fastify.eventBus) {
        fastify.eventBus.emit('topic.created', updated);
      }

      return { message: '话题已批准（包含话题内容）', topic: updated };
    } else if (type === 'post') {
      const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

      if (!post) {
        return reply.code(404).send({ error: '回复不存在' });
      }

      if (post.approvalStatus !== 'pending') {
        return reply.code(400).send({ error: '该回复不是待审核状态' });
      }

      const [updated] = await db
        .update(posts)
        .set({ approvalStatus: 'approved', updatedAt: new Date() })
        .where(eq(posts.id, id))
        .returning();

      // 记录审核日志
      await db.insert(moderationLogs).values({
        action: 'approve',
        targetType: 'post',
        targetId: id,
        moderatorId: request.user.id,
        previousStatus: 'pending',
        newStatus: 'approved'
      });

      // 触发回复创建事件（用于勋章、积分等）
      if (fastify.eventBus) {
        fastify.eventBus.emit('post.created', updated);
      }

      return { message: '回复已批准', post: updated };
    }
  });

  // 拒绝内容（管理员/版主）
  fastify.post('/reject/:type/:id', {
    preHandler: [fastify.requireModerator],
    schema: {
      tags: ['moderation'],
      description: '拒绝内容（管理员/版主）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['type', 'id'],
        properties: {
          type: { type: 'string', enum: ['topic', 'post'] },
          id: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { type, id } = request.params;

    if (type === 'topic') {
      const [topic] = await db.select().from(topics).where(eq(topics.id, id)).limit(1);

      if (!topic) {
        return reply.code(404).send({ error: '话题不存在' });
      }

      if (topic.approvalStatus !== 'pending') {
        return reply.code(400).send({ error: '该话题不是待审核状态' });
      }

      // 拒绝话题
      const [updated] = await db
        .update(topics)
        .set({ approvalStatus: 'rejected' })
        .where(eq(topics.id, id))
        .returning();

      // 同时拒绝话题的第一条回复（话题内容）
      await db
        .update(posts)
        .set({ approvalStatus: 'rejected' })
        .where(and(eq(posts.topicId, id), eq(posts.postNumber, 1)));

      // 记录审核日志
      await db.insert(moderationLogs).values({
        action: 'reject',
        targetType: 'topic',
        targetId: id,
        moderatorId: request.user.id,
        previousStatus: 'pending',
        newStatus: 'rejected'
      });

      return { message: '话题已拒绝（包含话题内容）', topic: updated };
    } else if (type === 'post') {
      const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

      if (!post) {
        return reply.code(404).send({ error: '回复不存在' });
      }

      if (post.approvalStatus !== 'pending') {
        return reply.code(400).send({ error: '该回复不是待审核状态' });
      }

      const [updated] = await db
        .update(posts)
        .set({ approvalStatus: 'rejected', updatedAt: new Date() })
        .where(eq(posts.id, id))
        .returning();

      // 记录审核日志
      await db.insert(moderationLogs).values({
        action: 'reject',
        targetType: 'post',
        targetId: id,
        moderatorId: request.user.id,
        previousStatus: 'pending',
        newStatus: 'rejected'
      });

      return { message: '回复已拒绝', post: updated };
    }
  });

  // ============= 审核日志接口 =============

  // 获取审核日志列表（管理员/版主）
  fastify.get('/logs', {
    preHandler: [fastify.requireModerator],
    schema: {
      tags: ['moderation'],
      description: '获取审核日志列表（管理员/版主）',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          targetType: { type: 'string', enum: ['topic', 'post', 'user', 'all'] },
          action: { type: 'string', enum: ['approve', 'reject', 'delete', 'restore', 'close', 'open', 'pin', 'unpin', 'all'] },
          targetId: { type: 'number' },
          moderatorId: { type: 'number' },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
          search: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const {
      targetType = 'all',
      action = 'all',
      targetId,
      moderatorId,
      page = 1,
      limit = 20,
      search
    } = request.query;
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions = [];
    if (targetType !== 'all') {
      conditions.push(eq(moderationLogs.targetType, targetType));
    }
    if (action !== 'all') {
      conditions.push(eq(moderationLogs.action, action));
    }
    if (targetId) {
      conditions.push(eq(moderationLogs.targetId, targetId));
    }
    if (moderatorId) {
      conditions.push(eq(moderationLogs.moderatorId, moderatorId));
    }
    if (search && search.trim()) {
      conditions.push(like(users.username, `%${search.trim()}%`));
    }

    // 为多态连接创建别名
    const targetUsers = alias(users, 'targetUsers');
    const topicAuthors = alias(users, 'topicAuthors');
    const postAuthors = alias(users, 'postAuthors');
    const postTopics = alias(topics, 'postTopics');

    // 获取日志列表
    let query = db
      .select({
        id: moderationLogs.id,
        action: moderationLogs.action,
        targetType: moderationLogs.targetType,
        targetId: moderationLogs.targetId,
        reason: moderationLogs.reason,
        previousStatus: moderationLogs.previousStatus,
        newStatus: moderationLogs.newStatus,
        metadata: moderationLogs.metadata,
        createdAt: moderationLogs.createdAt,
        moderatorUsername: users.username,
        moderatorName: users.name,
        moderatorRole: users.role,
        // 话题信息
        topicTitle: topics.title,
        topicSlug: topics.slug,
        topicAuthor: topicAuthors.username,
        // 回复信息
        postContent: sql`LEFT(${posts.content}, 100)`,
        postAuthor: postAuthors.username,
        postTopicId: posts.topicId,
        postTopicTitle: postTopics.title,
        // 用户信息
        targetUserUsername: targetUsers.username,
        targetUserName: targetUsers.name,
        targetUserRole: targetUsers.role
      })
      .from(moderationLogs)
      .innerJoin(users, eq(moderationLogs.moderatorId, users.id))
      // 关联话题
      .leftJoin(topics, and(eq(moderationLogs.targetId, topics.id), eq(moderationLogs.targetType, 'topic')))
      .leftJoin(topicAuthors, eq(topics.userId, topicAuthors.id))
      // 关联回复
      .leftJoin(posts, and(eq(moderationLogs.targetId, posts.id), eq(moderationLogs.targetType, 'post')))
      .leftJoin(postAuthors, eq(posts.userId, postAuthors.id))
      .leftJoin(postTopics, eq(posts.topicId, postTopics.id))
      // 关联用户
      .leftJoin(targetUsers, and(eq(moderationLogs.targetId, targetUsers.id), eq(moderationLogs.targetType, 'user')));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const logsList = await query
      .orderBy(desc(moderationLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // 格式化结果
    const enrichedLogs = logsList.map(log => {
      let targetInfo = null;

      if (log.targetType === 'topic' && log.topicTitle) {
        targetInfo = {
          title: log.topicTitle,
          slug: log.topicSlug,
          authorUsername: log.topicAuthor
        };
      } else if (log.targetType === 'post' && log.postContent) {
        targetInfo = {
          content: log.postContent,
          authorUsername: log.postAuthor,
          topicId: log.postTopicId,
          topicTitle: log.postTopicTitle
        };
      } else if (log.targetType === 'user' && log.targetUserUsername) {
        targetInfo = {
          username: log.targetUserUsername,
          name: log.targetUserName,
          role: log.targetUserRole
        };
      }

      // 清理扁平化字段
      const {
        topicTitle, topicSlug, topicAuthor,
        postContent, postAuthor, postTopicId, postTopicTitle,
        targetUserUsername, targetUserName, targetUserRole,
        ...cleanLog
      } = log;

      return {
        ...cleanLog,
        targetInfo
      };
    });

    // 获取总数
    let countQuery = db
      .select({ count: sql`count(*)` })
      .from(moderationLogs)
      .innerJoin(users, eq(moderationLogs.moderatorId, users.id));

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count }] = await countQuery;

    return {
      items: enrichedLogs,
      page,
      limit,
      total: Number(count)
    };
  });

  // 根据目标ID获取审核日志（查看特定内容的审核历史）
  fastify.get('/logs/:targetType/:targetId', {
    preHandler: [fastify.requireModerator],
    schema: {
      tags: ['moderation'],
      description: '获取特定内容的审核日志（管理员/版主）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['targetType', 'targetId'],
        properties: {
          targetType: { type: 'string', enum: ['topic', 'post', 'user'] },
          targetId: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { targetType, targetId } = request.params;

    const logs = await db
      .select({
        id: moderationLogs.id,
        action: moderationLogs.action,
        reason: moderationLogs.reason,
        previousStatus: moderationLogs.previousStatus,
        newStatus: moderationLogs.newStatus,
        metadata: moderationLogs.metadata,
        createdAt: moderationLogs.createdAt,
        moderatorUsername: users.username,
        moderatorName: users.name,
        moderatorRole: users.role
      })
      .from(moderationLogs)
      .innerJoin(users, eq(moderationLogs.moderatorId, users.id))
      .where(
        and(
          eq(moderationLogs.targetType, targetType),
          eq(moderationLogs.targetId, targetId)
        )
      )
      .orderBy(desc(moderationLogs.createdAt));

    return { items: logs };
  });
}
