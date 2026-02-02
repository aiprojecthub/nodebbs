import db from '../../db/index.js';
import { reports, posts, topics, users, moderationLogs } from '../../db/schema.js';
import { eq, sql, desc, and, ne, like, or, inArray, count } from 'drizzle-orm';
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
    preHandler: [fastify.requireAdmin],
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
      .select({ count: count() })
      .from(reports);

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;

    return {
      items: enrichedReports,
      page,
      limit,
      total
    };
  });

  // 处理举报（管理员/版主）
  fastify.patch('/reports/:id/resolve', {
    preHandler: [fastify.requireAdmin],
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
      await fastify.notification.send({
        userId: report.reporterId,
        type: action === 'resolve' ? 'report_resolved' : 'report_dismissed',
        triggeredByUserId: request.user.id,
        message: getReportNotificationMessage(report.reportType, action),
        metadata: {
          reportId: report.id,
          reportType: report.reportType,
          targetId: report.targetId
        }
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

  // Ban user (需要 dashboard.users 权限)
  fastify.post('/users/:id/ban', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['moderation'],
      description: '封禁用户，支持临时封禁',
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
        properties: {
          duration: { type: 'number', description: '封禁时长（分钟），不填则永久封禁' },
          reason: { type: 'string', maxLength: 500 }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { duration, reason } = request.body || {};

    // 检查 dashboard.users 权限
    await fastify.checkPermission(request, 'dashboard.users');

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

    // 计算封禁到期时间
    let bannedUntil = null;
    if (duration && duration > 0) {
      bannedUntil = new Date(Date.now() + duration * 60 * 1000);
    }

    const [updated] = await db
      .update(users)
      .set({
        isBanned: true,
        bannedUntil,
        bannedReason: reason || null,
        bannedBy: request.user.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    // 记录审核日志
    await db.insert(moderationLogs).values({
      action: 'ban',
      targetType: 'user',
      targetId: id,
      moderatorId: request.user.id,
      reason,
      previousStatus: 'active',
      newStatus: 'banned',
      metadata: JSON.stringify({ duration, bannedUntil }),
    });

    // 清除用户缓存，使封禁立即生效
    await fastify.clearUserCache(id);

    return {
      message: bannedUntil
        ? `用户已封禁至 ${bannedUntil.toLocaleString()}`
        : '用户已永久封禁',
      bannedUntil,
      reason,
      user: updated,
    };
  });

  // Unban user (需要 dashboard.users 权限)
  fastify.post('/users/:id/unban', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['moderation'],
      description: '解封用户',
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

    // 检查 dashboard.users 权限
    await fastify.checkPermission(request, 'dashboard.users');

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    const [updated] = await db
      .update(users)
      .set({
        isBanned: false,
        bannedUntil: null,
        bannedReason: null,
        bannedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    // 记录审核日志
    await db.insert(moderationLogs).values({
      action: 'unban',
      targetType: 'user',
      targetId: id,
      moderatorId: request.user.id,
      previousStatus: 'banned',
      newStatus: 'active',
    });

    // 清除用户缓存，使解封立即生效
    await fastify.clearUserCache(id);

    return { message: '用户已解封', user: updated };
  });

  // Get user status (管理员/版主)
  fastify.get('/users/:id/status', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['moderation'],
      description: '获取用户状态（管理员/版主）',
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

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        isBanned: users.isBanned,
        bannedUntil: users.bannedUntil,
        bannedReason: users.bannedReason,
        bannedBy: users.bannedBy,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 获取封禁操作者信息
    let bannedByUser = null;

    if (user.bannedBy) {
      const [bannedBy] = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(eq(users.id, user.bannedBy))
        .limit(1);
      bannedByUser = bannedBy;
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      ban: {
        isBanned: user.isBanned,
        until: user.bannedUntil,
        reason: user.bannedReason,
      },
      bannedByUser,
    };
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
          role: { type: 'string', enum: ['user', 'admin'] }
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
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['moderation'],
      description: '获取待审核统计数据（管理员/版主）',
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    // 获取待审核话题总数
    const [{ count: topicCount }] = await db
      .select({ count: count() })
      .from(topics)
      .where(eq(topics.approvalStatus, 'pending'));

    // 获取待审核回复总数（排除第一条回复）
    const [{ count: postCount }] = await db
      .select({ count: count() })
      .from(posts)
      .where(and(
        eq(posts.approvalStatus, 'pending'),
        ne(posts.postNumber, 1)
      ));

    return {
      totalTopics: topicCount,
      totalPosts: postCount,
      total: topicCount + postCount
    };
  });

  // 获取待审核内容列表（管理员/版主）
  fastify.get('/pending', {
    preHandler: [fastify.requireAdmin],
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

    // 辅助函数：构建话题查询条件（搜索时同时匹配标题和内容）
    const buildTopicConditions = () => {
      const conditions = [eq(topics.approvalStatus, 'pending')];
      if (search && search.trim()) {
        conditions.push(
          or(
            like(topics.title, `%${search.trim()}%`),
            like(posts.content, `%${search.trim()}%`)
          )
        );
      }
      return conditions;
    };

    // 辅助函数：构建回复查询条件
    const buildPostConditions = () => {
      const conditions = [
        eq(posts.approvalStatus, 'pending'),
        ne(posts.postNumber, 1) // 排除第一条回复
      ];
      if (search && search.trim()) {
        conditions.push(like(posts.content, `%${search.trim()}%`));
      }
      return conditions;
    };

    // 策略：根据 type 选择查询方式
    // type=topic 或 type=post 时，直接分页查询
    // type=all 时，先获取元数据列表，合并排序后分页，再批量获取详情

    if (type === 'topic') {
      // 仅查询话题
      const topicConditions = buildTopicConditions();

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
        .limit(limit)
        .offset(offset);

      // 统计总数
      let topicCountQuery = db
        .select({ count: count() })
        .from(topics);

      if (search && search.trim()) {
        topicCountQuery = topicCountQuery
          .leftJoin(posts, and(eq(posts.topicId, topics.id), eq(posts.postNumber, 1)))
          .where(and(...topicConditions));
      } else {
        topicCountQuery = topicCountQuery.where(and(...topicConditions));
      }

      const [{ count: total }] = await topicCountQuery;

      return {
        items: pendingTopics,
        page,
        limit,
        total
      };
    }

    if (type === 'post') {
      // 仅查询回复
      const postConditions = buildPostConditions();

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
        .limit(limit)
        .offset(offset);

      const [{ count: total }] = await db
        .select({ count: count() })
        .from(posts)
        .where(and(...postConditions));

      return {
        items: pendingPosts,
        page,
        limit,
        total
      };
    }

    // type === 'all'：合并查询策略
    // 步骤1：获取话题和回复的元数据（ID + createdAt）
    const topicConditions = buildTopicConditions();
    const postConditions = buildPostConditions();

    // 获取话题元数据
    const topicMeta = await db
      .select({
        id: topics.id,
        createdAt: topics.createdAt
      })
      .from(topics)
      .leftJoin(posts, and(eq(posts.topicId, topics.id), eq(posts.postNumber, 1)))
      .where(and(...topicConditions));

    // 获取回复元数据
    const postMeta = await db
      .select({
        id: posts.id,
        createdAt: posts.createdAt
      })
      .from(posts)
      .where(and(...postConditions));

    // 步骤2：合并并添加类型标记
    const allMeta = [
      ...topicMeta.map(t => ({ ...t, itemType: 'topic' })),
      ...postMeta.map(p => ({ ...p, itemType: 'post' }))
    ];

    // 步骤3：按时间降序排序
    allMeta.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 步骤4：分页
    const total = allMeta.length;
    const pagedMeta = allMeta.slice(offset, offset + limit);

    // 步骤5：根据分页后的 ID 批量获取详情
    const topicIds = pagedMeta.filter(m => m.itemType === 'topic').map(m => m.id);
    const postIds = pagedMeta.filter(m => m.itemType === 'post').map(m => m.id);

    const items = [];

    // 批量获取话题详情
    if (topicIds.length > 0) {
      const topicDetails = await db
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
        .where(inArray(topics.id, topicIds));

      items.push(...topicDetails);
    }

    // 批量获取回复详情
    if (postIds.length > 0) {
      const postDetails = await db
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
        .where(inArray(posts.id, postIds));

      items.push(...postDetails);
    }

    // 步骤6：按元数据的顺序重新排序（保持分页顺序）
    const idOrderMap = new Map(pagedMeta.map((m, idx) => [`${m.itemType}-${m.id}`, idx]));
    items.sort((a, b) => {
      const keyA = `${a.type}-${a.id}`;
      const keyB = `${b.type}-${b.id}`;
      return idOrderMap.get(keyA) - idOrderMap.get(keyB);
    });

    return {
      items,
      page,
      limit,
      total
    };
  });

  // 批准内容（管理员/版主）
  fastify.post('/approve/:type/:id', {
    preHandler: [fastify.requireAdmin],
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
    preHandler: [fastify.requireAdmin],
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
    preHandler: [fastify.requireAdmin],
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
      .select({ count: count() })
      .from(moderationLogs)
      .innerJoin(users, eq(moderationLogs.moderatorId, users.id));

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;

    return {
      items: enrichedLogs,
      page,
      limit,
      total,
    };
  });

  // 根据目标ID获取审核日志（查看特定内容的审核历史）
  fastify.get('/logs/:targetType/:targetId', {
    preHandler: [fastify.requireAdmin],
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
