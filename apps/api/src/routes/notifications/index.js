import db from '../../db/index.js';
import { notifications, users, topics, posts } from '../../db/schema.js';
import { eq, sql, desc, and, like } from 'drizzle-orm';

export default async function notificationRoutes(fastify, options) {
  // Get user notifications
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
          search: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { page = 1, limit = 20, unreadOnly = false, search } = request.query;
    const offset = (page - 1) * limit;

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

    let query = db
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
      .where(and(...conditions));

    const notificationsList = await query
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count with same conditions
    const totalCountConditions = [eq(notifications.userId, request.user.id)];

    if (search && search.trim()) {
      totalCountConditions.push(like(notifications.message, `%${search.trim()}%`));
    }

    if (unreadOnly) {
      totalCountConditions.push(eq(notifications.isRead, false));
    }

    const [{ count: totalCount }] = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(...totalCountConditions));

    // Get unread count
    const [{ count: unreadCount }] = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, request.user.id),
        eq(notifications.isRead, false)
      ));

    return {
      items: notificationsList,
      page,
      limit,
      total: Number(totalCount),
      unreadCount: Number(unreadCount)
    };
  });

  // Mark notification as read
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

  // Mark all notifications as read
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

  // Delete notification
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

  // Delete all read notifications
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
