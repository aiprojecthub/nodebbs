import db from '../../db/index.js';
import { blockedUsers, users } from '../../db/schema.js';
import { eq, and, or, sql, count } from 'drizzle-orm';

export default async function blockedUsersRoutes(fastify) {
  // 获取拉黑用户列表
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['blocked-users'],
        description: '获取拉黑用户列表',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request) => {
      const page = parseInt(request.query.page) || 1;
      const limit = parseInt(request.query.limit) || 20;
      const offset = (page - 1) * limit;

      // 获取总数量
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(blockedUsers)
        .where(eq(blockedUsers.userId, request.user.id));

      // 获取分页列表
      const blockedList = await db
        .select({
          id: blockedUsers.id,
          blockedUserId: blockedUsers.blockedUserId,
          blockedUsername: users.username,
          blockedName: users.name,
          blockedAvatar: users.avatar,
          reason: blockedUsers.reason,
          createdAt: blockedUsers.createdAt,
        })
        .from(blockedUsers)
        .innerJoin(users, eq(blockedUsers.blockedUserId, users.id))
        .where(eq(blockedUsers.userId, request.user.id))
        .orderBy(blockedUsers.createdAt)
        .limit(limit)
        .offset(offset);

      return {
        items: blockedList,
        page,
        limit,
        total,
      };
    }
  );

  // 拉黑用户
  fastify.post(
    '/:userId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['blocked-users'],
        description: '拉黑用户',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'number' },
          },
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = parseInt(request.params.userId);
      const { reason } = request.body;

      // 不能拉黑自己
      if (userId === request.user.id) {
        return reply.code(400).send({ error: '不能拉黑自己' });
      }

      // 检查用户是否存在
      const [targetUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      // 检查是否已拉黑
      const [existing] = await db
        .select()
        .from(blockedUsers)
        .where(
          and(
            eq(blockedUsers.userId, request.user.id),
            eq(blockedUsers.blockedUserId, userId)
          )
        )
        .limit(1);

      if (existing) {
        return reply.code(400).send({ error: '用户已被拉黑' });
      }

      // 创建拉黑关系
      const [blocked] = await db
        .insert(blockedUsers)
        .values({
          userId: request.user.id,
          blockedUserId: userId,
          reason: reason || null,
        })
        .returning();

      return blocked;
    }
  );

  // 取消拉黑用户
  fastify.delete(
    '/:userId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['blocked-users'],
        description: '取消拉黑用户',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = parseInt(request.params.userId);

      const result = await db
        .delete(blockedUsers)
        .where(
          and(
            eq(blockedUsers.userId, request.user.id),
            eq(blockedUsers.blockedUserId, userId)
          )
        )
        .returning();

      if (result.length === 0) {
        return reply.code(404).send({ error: '拉黑关系不存在' });
      }

      return { message: 'User unblocked successfully' };
    }
  );

  // 检查用户是否被拉黑
  fastify.get(
    '/check/:userId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['blocked-users'],
        description: '检查用户是否被拉黑',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'number' },
          },
        },
      },
    },
    async (request) => {
      const userId = parseInt(request.params.userId);

      // 双向检查：当前用户拉黑对方，或对方拉黑当前用户
      const [blocked] = await db
        .select()
        .from(blockedUsers)
        .where(
          or(
            and(
              eq(blockedUsers.userId, request.user.id),
              eq(blockedUsers.blockedUserId, userId)
            ),
            and(
              eq(blockedUsers.userId, userId),
              eq(blockedUsers.blockedUserId, request.user.id)
            )
          )
        )
        .limit(1);

      return {
        isBlocked: !!blocked,
        blockedByMe: blocked?.userId === request.user.id,
        blockedByThem: blocked?.userId === userId,
      };
    }
  );
}
