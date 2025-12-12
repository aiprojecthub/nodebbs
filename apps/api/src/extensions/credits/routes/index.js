import {
  getUserBalance,
  getOrCreateUserCredit,
  checkIn,
  getUserTransactions,
  grantCredits,
  deductCredits,
  transferCredits,
  getPostRewards,
  getCreditRanking,
  getCreditConfig,
  getAllTransactions,
  isCreditSystemEnabled,
} from '../services/creditService.js';
import db from '../../../db/index.js';
import { posts, users, creditSystemConfig, userCredits, creditTransactions, postRewards } from '../../../db/schema.js';
import { eq, sql, inArray, and, count, sum } from 'drizzle-orm';

export default async function creditsRoutes(fastify, options) {
  // ============ 公开接口 ============

  // 获取积分系统状态
  fastify.get('/status', {
    schema: {
      tags: ['credits'],
      description: '获取积分系统启用状态',
      response: {
        200: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const enabled = await isCreditSystemEnabled();
    return { enabled };
  });

  // ============ 用户接口 ============

  // 获取当前用户积分余额
  fastify.get('/balance', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['credits'],
      description: '获取当前用户积分余额',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            balance: { type: 'number' },
            totalEarned: { type: 'number' },
            totalSpent: { type: 'number' },
            checkInStreak: { type: 'number' },
            lastCheckInDate: { type: ['string', 'null'] },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const credit = await getOrCreateUserCredit(request.user.id);
      return credit;
    } catch (error) {
      fastify.log.error('[积分余额] 查询失败:', error);
      return reply.code(500).send({ error: '查询失败' });
    }
  });

  // 每日签到
  fastify.post('/check-in', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['credits'],
      description: '每日签到获取积分',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            balance: { type: 'number' },
            checkInStreak: { type: 'number' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const result = await checkIn(request.user.id);
      return result;
    } catch (error) {
      if (error.message === '积分系统未启用') {
        return reply.code(403).send({ error: error.message });
      }
      fastify.log.error('[签到] 失败:', error);
      return reply.code(500).send({ error: '签到失败' });
    }
  });

  // 获取交易记录
  fastify.get('/transactions', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['credits'],
      description: '获取当前用户的积分交易记录',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
          type: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 20, type = null } = request.query;
      const result = await getUserTransactions(request.user.id, { page, limit, type });
      return result;
    } catch (error) {
      fastify.log.error('[交易记录] 查询失败:', error);
      return reply.code(500).send({ error: '查询失败' });
    }
  });

  // 打赏帖子
  fastify.post('/reward', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['credits'],
      description: '打赏帖子',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['postId', 'amount'],
        properties: {
          postId: { type: 'number' },
          amount: { type: 'number', minimum: 1 },
          message: { type: 'string', maxLength: 200 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            balance: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { postId, amount, message = null } = request.body;

      // 验证帖子存在
      const [post] = await db
        .select({
          id: posts.id,
          userId: posts.userId,
          isDeleted: posts.isDeleted,
        })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (!post) {
        return reply.code(404).send({ error: '帖子不存在' });
      }

      if (post.isDeleted) {
        return reply.code(400).send({ error: '无法打赏已删除的帖子' });
      }

      // 不能打赏自己
      if (post.userId === request.user.id) {
        return reply.code(400).send({ error: '不能打赏自己的帖子' });
      }

      // 检查打赏金额限制
      const minAmount = await getCreditConfig('reward_min_amount', 1);
      const maxAmount = await getCreditConfig('reward_max_amount', 1000);

      if (amount < minAmount) {
        return reply.code(400).send({ error: `打赏金额不能低于 ${minAmount}` });
      }

      if (amount > maxAmount) {
        return reply.code(400).send({ error: `打赏金额不能超过 ${maxAmount}` });
      }

      // 执行转账
      const { fromTransaction } = await transferCredits({
        fromUserId: request.user.id,
        toUserId: post.userId,
        amount,
        type: 'reward_post',
        relatedPostId: postId,
        description: message || '打赏帖子',
        metadata: { message },
      });

      // 记录打赏
      await db.insert(postRewards).values({
        postId,
        fromUserId: request.user.id,
        toUserId: post.userId,
        amount,
        message,
      });

      // TODO: 发送通知给被打赏者

      return {
        message: '打赏成功',
        balance: fromTransaction.balance,
      };
    } catch (error) {
      if (error.message === '积分余额不足') {
        return reply.code(400).send({ error: error.message });
      }
      if (error.message === '积分系统未启用') {
        return reply.code(403).send({ error: error.message });
      }
      fastify.log.error('[打赏] 失败:', error);
      return reply.code(500).send({ error: '打赏失败' });
    }
  });

  // 获取帖子的打赏列表
  fastify.get('/rewards/:postId', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['credits'],
      description: '获取帖子的打赏列表',
      params: {
        type: 'object',
        required: ['postId'],
        properties: {
          postId: { type: 'number' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { postId } = request.params;
      const { page, limit } = request.query;
      
      const result = await getPostRewards(parseInt(postId), {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20
      });
      
      return result;
    } catch (error) {
      fastify.log.error('[打赏列表] 查询失败:', error);
      return reply.code(500).send({ error: '查询失败' });
    }
  });

  // 批量获取多个帖子的打赏统计
  fastify.post('/rewards/batch', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['credits'],
      description: '批量获取多个帖子的打赏统计',
      body: {
        type: 'object',
        required: ['postIds'],
        properties: {
          postIds: {
            type: 'array',
            items: { type: 'integer' },
            minItems: 1,
            maxItems: 100, // 限制最多 100 个
          },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              totalAmount: { type: 'number' },
              totalCount: { type: 'number' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { postIds } = request.body;

      if (!postIds || postIds.length === 0) {
        return reply.code(400).send({ error: '请提供帖子ID列表' });
      }

      // 批量查询打赏统计
      // console.log('批量查询打赏统计 - 输入 postIds:', postIds);
      
      const stats = await db
        .select({
          postId: postRewards.postId,
          totalAmount: sql`COALESCE(SUM(${postRewards.amount}), 0)`,
          totalCount: count(),
        })
        .from(postRewards)
        .where(inArray(postRewards.postId, postIds))
        .groupBy(postRewards.postId);

      // console.log('批量查询打赏统计 - 查询结果:', stats);

      // 转换为 Map 格式方便前端使用
      const statsMap = {};
      
      // 确保 stats 是数组
      if (Array.isArray(stats)) {
        stats.forEach(stat => {
          if (stat && stat.postId) {
            statsMap[stat.postId] = {
              totalAmount: parseInt(stat.totalAmount) || 0,
              totalCount: parseInt(stat.totalCount) || 0,
            };
          }
        });
      }

      // 为没有打赏的帖子补充默认值
      if (Array.isArray(postIds)) {
        postIds.forEach(postId => {
          if (!statsMap[postId]) {
            statsMap[postId] = {
              totalAmount: 0,
              totalCount: 0,
            };
          }
        });
      }

      // console.log('批量查询打赏统计 - 最终结果:', statsMap);
      return statsMap;
    } catch (error) {
      // console.log('批量打赏统计错误详情:', {
      //   message: error.message,
      //   stack: error.stack,
      //   postIds: request.body?.postIds,
      // });
      fastify.log.error('[批量打赏统计] 查询失败:', error);
      return reply.code(500).send({ error: '查询失败: ' + error.message });
    }
  });


  // 获取积分排行榜
  fastify.get('/rank', {
    schema: {
      tags: ['credits'],
      description: '获取积分排行榜',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50, maximum: 100 },
          type: { type: 'string', enum: ['balance', 'totalEarned'], default: 'balance' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { limit = 50, type = 'balance' } = request.query;
      const ranking = await getCreditRanking({ limit, type });
      return { items: ranking };
    } catch (error) {
      fastify.log.error('[积分排行] 查询失败:', error);
      return reply.code(500).send({ error: '查询失败' });
    }
  });

  // ============ 管理员接口 ============

  // 获取所有交易记录
  fastify.get('/admin/transactions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          type: { type: 'string' },
          userId: { type: 'integer' },
          username: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { page, limit, type, userId, username } = request.query;
      const result = await getAllTransactions({
        page,
        limit,
        type,
        userId,
        username,
      });
      return result;
    },
  });

  // 获取积分系统统计
  fastify.get('/admin/stats', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['credits'],
      description: '获取积分系统统计（仅管理员）',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      // 总流通积分
      const [totalCirculation] = await db
        .select({ total: sql`COALESCE(SUM(balance), 0)` })
        .from(userCredits);

      // 今日发放
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [todayEarned] = await db
        .select({ total: sql`COALESCE(SUM(amount), 0)` })
        .from(creditTransactions)
        .where(
          sql`${creditTransactions.amount} > 0 AND ${creditTransactions.createdAt} >= ${today}`
        );

      // 今日消费
      const [todaySpent] = await db
        .select({ total: sql`COALESCE(ABS(SUM(amount)), 0)` })
        .from(creditTransactions)
        .where(
          sql`${creditTransactions.amount} < 0 AND ${creditTransactions.createdAt} >= ${today}`
        );

      // 用户总数
      const [userCount] = await db
        .select({ count: sql`COUNT(*)` })
        .from(userCredits);

      return {
        totalCirculation: Number(totalCirculation.total),
        todayEarned: Number(todayEarned.total),
        todaySpent: Number(todaySpent.total),
        userCount: Number(userCount.count),
      };
    } catch (error) {
      console.log(error);
      fastify.log.error('[积分统计] 查询失败:', error);
      return reply.code(500).send({ error: '查询失败' });
    }
  });

  // 手动发放积分
  fastify.post('/admin/grant', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['credits'],
      description: '手动发放积分（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['userId', 'amount'],
        properties: {
          userId: { type: 'number' },
          amount: { type: 'number', minimum: 1 },
          description: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { userId, amount, description = '管理员发放' } = request.body;

      // 验证用户存在
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      const transaction = await grantCredits({
        userId,
        amount,
        type: 'admin_grant',
        description,
        metadata: { adminId: request.user.id },
      });

      return {
        message: '发放成功',
        transaction,
      };
    } catch (error) {
      fastify.log.error('[手动发放] 失败:', error);
      return reply.code(500).send({ error: '发放失败' });
    }
  });

  // 手动扣除积分
  fastify.post('/admin/deduct', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['credits'],
      description: '手动扣除积分（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['userId', 'amount'],
        properties: {
          userId: { type: 'number' },
          amount: { type: 'number', minimum: 1 },
          description: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { userId, amount, description = '管理员扣除' } = request.body;

      // 验证用户存在
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      const transaction = await deductCredits({
        userId,
        amount,
        type: 'admin_deduct',
        description,
        metadata: { adminId: request.user.id },
      });

      return {
        message: '扣除成功',
        transaction,
      };
    } catch (error) {
      if (error.message === '积分余额不足') {
        return reply.code(400).send({ error: error.message });
      }
      fastify.log.error('[手动扣除] 失败:', error);
      return reply.code(500).send({ error: '扣除失败' });
    }
  });

  // 获取积分配置
  fastify.get('/admin/config', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['credits'],
      description: '获取积分系统配置（仅管理员）',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const configs = await db.select().from(creditSystemConfig);
      return { items: configs };
    } catch (error) {
      fastify.log.error('[配置查询] 失败:', error);
      return reply.code(500).send({ error: '查询失败' });
    }
  });

  // 更新积分配置
  fastify.put('/admin/config/:key', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['credits'],
      description: '更新积分系统配置（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['key'],
        properties: {
          key: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['value'],
        properties: {
          value: { type: ['string', 'number', 'boolean'] },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { key } = request.params;
      const { value } = request.body;

      // 检查配置是否存在
      const [config] = await db
        .select()
        .from(creditSystemConfig)
        .where(eq(creditSystemConfig.key, key))
        .limit(1);

      if (!config) {
        return reply.code(404).send({ error: '配置项不存在' });
      }

      // 更新配置
      const [updated] = await db
        .update(creditSystemConfig)
        .set({
          value: String(value),
          updatedAt: new Date(),
        })
        .where(eq(creditSystemConfig.key, key))
        .returning();

      return updated;
    } catch (error) {
      fastify.log.error('[配置更新] 失败:', error);
      return reply.code(500).send({ error: '更新失败' });
    }
  });
}
