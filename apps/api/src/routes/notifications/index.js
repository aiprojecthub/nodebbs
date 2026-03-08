import db from '../../db/index.js';
import { notifications, users, topics, posts } from '../../db/schema.js';
import { eq, sql, desc, and, or, like, count, lt } from 'drizzle-orm';
import { createPaginator } from '../../utils/pagination.js';

export default async function notificationRoutes(fastify, options) {
  // 获取用户通知
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['notifications'],
      description: '获取当前用户通知',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
          unreadOnly: { type: 'boolean', default: false },
          search: { type: 'string' },
          cursor: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { unreadOnly = false, search } = request.query;
    const paginator = createPaginator(request.query, { cursorKeys: ['createdAt', 'id'] });

    // 构建查询条件
    const conditions = [eq(notifications.userId, request.user.id)];

    // 添加搜索条件
    if (search && search.trim()) {
      conditions.push(like(notifications.message, `%${search.trim()}%`));
    }

    // 添加未读筛选
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    // 处理 Cursor 模式下的分页 WHERE 条件
    let cursorCondition = null;
    if (paginator.hasCursor && paginator.cursorData) {
      const cData = paginator.cursorData;
      if (cData.id !== undefined && cData.createdAt) {
        cursorCondition = or(
          lt(notifications.createdAt, new Date(cData.createdAt)),
          and(
            eq(notifications.createdAt, new Date(cData.createdAt)),
            lt(notifications.id, cData.id)
          )
        );
      }
    }

    const allConditions = cursorCondition
      ? [...conditions, cursorCondition]
      : conditions;

    const notificationsList = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        message: notifications.message,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        triggeredByUserId: notifications.triggeredByUserId,
        triggeredByUsername: users.username,
        triggeredByAvatar: users.avatar,
        topicId: notifications.topicId,
        topicTitle: topics.title,
        postId: notifications.postId,
        triggeredByName: users.name,
        metadata: notifications.metadata
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.triggeredByUserId, users.id))
      .leftJoin(topics, eq(notifications.topicId, topics.id))
      .where(and(...allConditions))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(paginator.fetchSize)
      .offset(paginator.offset);

    const { items, nextCursor } = paginator.paginate(notificationsList);

    // 非游标模式下查询总数
    let totalCount = 0;
    if (!paginator.hasCursor) {
      const [{ count: tc }] = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(...conditions));
      totalCount = Number(tc);
    }

    // 获取未读数量
    const [{ count: unreadCount }] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, request.user.id),
        eq(notifications.isRead, false)
      ));

    return {
      items,
      page: paginator.page,
      limit: paginator.limit,
      total: totalCount,
      unreadCount,
      nextCursor: nextCursor || undefined,
    };
  });

  // 标记通知为已读
  fastify.patch('/:id/read', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['notifications'],
      description: '标记通知为已读',
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

    const [notification] = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, request.user.id)
      ))
      .limit(1);

    if (!notification) {
      return reply.code(404).send({ error: '通知不存在' });
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();

    return updated;
  });

  // 标记所有通知为已读
  fastify.post('/read-all', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['notifications'],
      description: '标记所有通知为已读',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            count: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const updated = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, request.user.id),
        eq(notifications.isRead, false)
      ))
      .returning();

    return {
      message: '所有通知已标记为已读',
      count: updated.length
    };
  });

  // 删除通知
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['notifications'],
      description: '删除通知',
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

    const deleted = await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, request.user.id)
      ))
      .returning();

    if (deleted.length === 0) {
      return reply.code(404).send({ error: '通知不存在' });
    }

    return { message: '通知删除成功' };
  });

  // 删除所有已读通知
  fastify.delete('/read/all', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['notifications'],
      description: '删除所有已读通知',
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const deleted = await db
      .delete(notifications)
      .where(and(
        eq(notifications.userId, request.user.id),
        eq(notifications.isRead, true)
      ))
      .returning();

    return {
      message: '所有已读通知已删除',
      count: deleted.length
    };
  });
}
