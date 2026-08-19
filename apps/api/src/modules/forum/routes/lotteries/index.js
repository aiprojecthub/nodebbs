import {
  createLottery,
  getLottery,
  enterLottery,
  drawLottery,
  updateDraftLottery,
  deleteLottery,
  listDraftLotteries,
  listLotteriesByTopic,
  maybeDrawDue,
} from '../../services/lotteryService.js';
import db from '#core/db/index.js';
import { lotteries, lotteryParticipants, topics } from '#modules/forum/db/schema.js';
import { users } from '#core/db/schema.js';
import { and, asc, eq } from 'drizzle-orm';

export default async function lotteryRoutes(fastify, options) {
  // POST /lotteries — 创建抽奖
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['lotteries'],
        description: '创建抽奖（不绑定 topic，由后续话题提交时绑定）',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['title', 'winnersCount', 'pointsPerWinner', 'drawAt'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: ['string', 'null'], maxLength: 2000 },
            winnersCount: { type: 'integer', minimum: 1, maximum: 1000 },
            pointsPerWinner: { type: 'integer', minimum: 0 },
            prizeDescription: { type: ['string', 'null'], maxLength: 1000 },
            prizeItems: {
              type: ['array', 'null'],
              maxItems: 1000,
              items: { type: 'string', minLength: 1, maxLength: 500 },
            },
            minAccountDays: { type: 'integer', minimum: 0, default: 0 },
            requireReply: { type: 'boolean', default: false },
            drawAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        await fastify.permission.check(request, 'topic.lottery.create');
        const result = await createLottery(
          {
            ...request.body,
            drawAt: new Date(request.body.drawAt),
          },
          request.user.id,
          fastify.ledger,
        );
        return result;
      } catch (err) {
        if (err.statusCode) {
          return reply.code(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  // GET /lotteries/drafts — 当前用户草稿列表
  fastify.get(
    '/drafts',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['lotteries'],
        description: '列出当前用户的抽奖草稿',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20, maximum: 100 },
          },
        },
      },
    },
    async (request) => {
      return await listDraftLotteries(request.user.id, {
        page: request.query.page,
        limit: request.query.limit,
      });
    }
  );

  // GET /lotteries/by-topic/:topicId — 话题已绑抽奖（仅作者或 dashboard）
  fastify.get(
    '/by-topic/:topicId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['lotteries'],
        description: '列出某话题已绑的抽奖',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['topicId'],
          properties: { topicId: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      const [topic] = await db
        .select({ id: topics.id, userId: topics.userId, categoryId: topics.categoryId })
        .from(topics)
        .where(eq(topics.id, request.params.topicId))
        .limit(1);
      if (!topic) {
        return reply.code(404).send({ error: '话题不存在' });
      }
      const isOwner = request.user.id === topic.userId;
      const hasDashboard = await fastify.permission.can(request, 'dashboard.topics', {
        categoryId: topic.categoryId,
      });
      if (!isOwner && !hasDashboard) {
        return reply.code(403).send({ error: '没有权限查看此话题的抽奖列表' });
      }
      return await listLotteriesByTopic(request.params.topicId, fastify.ledger);
    }
  );

  // GET /lotteries/:id — 抽奖详情
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['lotteries'],
        description: '获取抽奖详情',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user?.id ?? null;
      // 到期未开奖时在此惰性开奖，用户打开话题即可看到结果，无需等待 2 小时的清理调度
      const result = await getLottery(request.params.id, userId, fastify.ledger);
      if (!result) {
        return reply.code(404).send({ error: '抽奖不存在' });
      }
      return result;
    }
  );

  // GET /lotteries/:id/winners — 中奖名单
  fastify.get(
    '/:id/winners',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['lotteries'],
        description: '获取中奖名单',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      await maybeDrawDue(request.params.id, fastify.ledger);
      const [row] = await db
        .select({ status: lotteries.status })
        .from(lotteries)
        .where(eq(lotteries.id, request.params.id))
        .limit(1);
      if (!row) {
        return reply.code(404).send({ error: '抽奖不存在' });
      }
      if (row.status !== 'drawn') {
        return { winners: [] };
      }
      const winners = await db
        .select({
          userId: users.id,
          username: users.username,
          name: users.name,
          avatar: users.avatar,
        })
        .from(lotteryParticipants)
        .innerJoin(users, eq(users.id, lotteryParticipants.userId))
        .where(and(
          eq(lotteryParticipants.lotteryId, request.params.id),
          eq(lotteryParticipants.isWinner, true),
        ))
        .orderBy(asc(lotteryParticipants.id));
      return { winners };
    }
  );

  // POST /lotteries/:id/enter — 参与抽奖
  fastify.post(
    '/:id/enter',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['lotteries'],
        description: '参与抽奖',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      try {
        // 先结算到期抽奖，避免把"已到点但未开奖"误报成"已截止"
        await maybeDrawDue(request.params.id, fastify.ledger);
        return await enterLottery(request.params.id, request.user.id);
      } catch (err) {
        if (err.statusCode) {
          return reply.code(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  // POST /lotteries/:id/draw — 提前开奖（owner 或 dashboard.lotteries）
  fastify.post(
    '/:id/draw',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['lotteries'],
        description: '提前开奖',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      const [row] = await db
        .select({ id: lotteries.id, userId: lotteries.userId, status: lotteries.status })
        .from(lotteries)
        .where(eq(lotteries.id, request.params.id))
        .limit(1);
      if (!row) {
        return reply.code(404).send({ error: '抽奖不存在' });
      }
      if (row.status !== 'pending') {
        return reply.code(400).send({ error: '抽奖已开奖或已取消' });
      }
      const isOwner = request.user.id === row.userId;
      const hasDashboard = await fastify.permission.can(request, 'dashboard.lotteries');
      if (!isOwner && !hasDashboard) {
        return reply.code(403).send({ error: '没有权限开奖' });
      }
      try {
        return await drawLottery(request.params.id, fastify.ledger, {
          triggerSource: isOwner ? 'user-early' : 'admin-early',
        });
      } catch (err) {
        if (err.statusCode) {
          return reply.code(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  // PUT /lotteries/:id — 编辑草稿
  fastify.put(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['lotteries'],
        description: '编辑抽奖草稿（owner + 未绑）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'number' } },
        },
        body: {
          type: 'object',
          required: ['title', 'winnersCount', 'pointsPerWinner', 'drawAt'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: ['string', 'null'], maxLength: 2000 },
            winnersCount: { type: 'integer', minimum: 1, maximum: 1000 },
            pointsPerWinner: { type: 'integer', minimum: 0 },
            prizeDescription: { type: ['string', 'null'], maxLength: 1000 },
            prizeItems: {
              type: ['array', 'null'],
              maxItems: 1000,
              items: { type: 'string', minLength: 1, maxLength: 500 },
            },
            minAccountDays: { type: 'integer', minimum: 0, default: 0 },
            requireReply: { type: 'boolean', default: false },
            drawAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        return await updateDraftLottery(
          request.params.id,
          { ...request.body, drawAt: new Date(request.body.drawAt) },
          request.user.id,
          fastify.ledger,
        );
      } catch (err) {
        if (err.statusCode) {
          return reply.code(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  // DELETE /lotteries/:id — 删除抽奖
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['lotteries'],
        description: '删除抽奖',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      const [row] = await db
        .select({ id: lotteries.id, userId: lotteries.userId })
        .from(lotteries)
        .where(eq(lotteries.id, request.params.id))
        .limit(1);
      if (!row) {
        return reply.code(404).send({ error: '抽奖不存在' });
      }

      const hasDashboard = await fastify.permission.can(request, 'dashboard.lotteries');
      const isOwner = request.user.id === row.userId;

      if (!hasDashboard) {
        if (!isOwner) {
          return reply.code(403).send({ error: '没有权限删除此抽奖' });
        }
        await fastify.permission.check(request, 'topic.lottery.delete');
      }

      try {
        await deleteLottery(
          request.params.id,
          { isAdmin: hasDashboard },
          fastify.ledger,
        );
        return { success: true };
      } catch (err) {
        if (err.statusCode) {
          return reply.code(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
