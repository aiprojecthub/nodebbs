import {
  checkIn,
  getPostRewards,
  getCreditRanking,
} from '../services/rewardService.js';
import { DEFAULT_CURRENCY_CODE } from '../../ledger/constants.js';
import db from '../../../db/index.js';
import { posts, users } from '../../../db/schema.js';
import { eq, sql, inArray, and, count, sum } from 'drizzle-orm';

export default async function rewardsRoutes(fastify, options) {
  
  // ============ Feature Interfaces ============

  // ============ Feature Interfaces ============

  // 打赏帖子
  fastify.post('/reward', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['rewards'],
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

      // 验证帖子
      const [post] = await db
        .select({
          id: posts.id,
          userId: posts.userId,
          topicId: posts.topicId,
          isDeleted: posts.isDeleted,
          postNumber: posts.postNumber,
        })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (!post) return reply.code(404).send({ error: '帖子不存在' });
      if (post.isDeleted) return reply.code(400).send({ error: '无法打赏已删除的帖子' });
      if (post.userId === request.user.id) return reply.code(400).send({ error: '不能打赏自己的帖子' });

      // 检查金额限制
      const minAmount = await fastify.ledger.getCurrencyConfig(DEFAULT_CURRENCY_CODE, 'reward_min_amount', 1);
      const maxAmount = await fastify.ledger.getCurrencyConfig(DEFAULT_CURRENCY_CODE, 'reward_max_amount', 1000);

      if (amount < minAmount) return reply.code(400).send({ error: `打赏金额不能低于 ${minAmount}` });
      if (amount > maxAmount) return reply.code(400).send({ error: `打赏金额不能超过 ${maxAmount}` });

      // 检查系统是否启用
      const isSystemEnabled = await fastify.ledger.isCurrencyActive(DEFAULT_CURRENCY_CODE);
      if (!isSystemEnabled) return reply.code(403).send({ error: '奖励系统未启用' });

      // 判断是话题还是回复 (postNumber === 1 为话题内容)
      const isTopic = post.postNumber === 1;
      const notificationType = isTopic ? 'reward_topic' : 'reward_reply';
      const defaultMessage = isTopic ? '打赏了你的话题' : '打赏了你的回复';
      
      // 执行转账
      const { fromTx } = await fastify.ledger.transfer({
        fromUserId: request.user.id,
        toUserId: post.userId,
        amount,
        currencyCode: DEFAULT_CURRENCY_CODE,
        type: 'reward_post',
        referenceType: 'reward_transfer',
        referenceId: `reward_post_${Date.now()}`,
        description: message || (isTopic ? '打赏话题' : '打赏回复'),
        metadata: { 
            message,
            relatedPostId: postId,
            source: 'rewards-extension',
            // Added for history tracking
            isTopic,
            topicId: post.topicId,
            postNumber: post.postNumber 
        },
      });

      // 记录打赏 (Feature Logic)
      const { postRewards } = await import('../schema.js');
      await db.insert(postRewards).values({
        postId,
        fromUserId: request.user.id,
        toUserId: post.userId,
        amount, // currency default DEFAULT_CURRENCY_CODE
        message,
      });

      // 发送通知
      await fastify.notification.send({
        userId: post.userId,
        type: notificationType,
        triggeredByUserId: request.user.id,
        topicId: post.topicId,
        postId: postId,
        message: message || defaultMessage,
        metadata: {
          amount,
          isTopic
        }
      });

      return {
        message: '打赏成功',
        balance: fromTx.balanceAfter, 
      };
    } catch (error) {
        if (error.message.includes('Insufficient funds')) {
          const currencyName = await fastify.ledger.getCurrencyName(DEFAULT_CURRENCY_CODE).catch(() => '');
          return reply.code(400).send({ error: `${currencyName}余额不足` });
        }
        if (error.message.includes('未启用')) return reply.code(403).send({ error: error.message });

        fastify.log.error('[打赏] 失败:', error);
        return reply.code(500).send({ error: '打赏失败' });
    }
  });

  // 获取帖子的打赏列表
  fastify.get('/posts/:postId', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['rewards'],
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
      const { postId } = request.params;
      const { page, limit } = request.query;
      return await getPostRewards(parseInt(postId), { page, limit });
  });
  
    // 批量获取多个帖子的打赏统计
  fastify.post('/posts/batch', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['rewards'],
      description: '批量获取多个帖子的打赏统计',
      body: {
        type: 'object',
        required: ['postIds'],
        properties: {
            postIds: { type: 'array', items: { type: 'integer' } }
        }
      }
    }
  }, async (request, reply) => {
      const { postIds } = request.body;
      if (!postIds || postIds.length === 0) return {};
      
      const { postRewards } = await import('../schema.js');
      
      const stats = await db
        .select({
          postId: postRewards.postId,
          totalAmount: sql`COALESCE(SUM(${postRewards.amount}), 0)`,
          totalCount: count(),
        })
        .from(postRewards)
        .where(inArray(postRewards.postId, postIds))
        .groupBy(postRewards.postId);
        
      const statsMap = {};
      stats.forEach(s => {
          statsMap[s.postId] = {
              totalAmount: Number(s.totalAmount),
              totalCount: Number(s.totalCount)
          };
      });
      
      postIds.forEach(id => {
          if(!statsMap[id]) statsMap[id] = { totalAmount: 0, totalCount: 0 };
      });
      
      return statsMap;
  });

  // 获取积分排行榜
  fastify.get('/rank', {
      schema: { tags: ['rewards'] }
  }, async (request, reply) => {
      const { limit = 50, type = 'balance' } = request.query;
      const items = await getCreditRanking({ limit, type });
      return { items };
  });

  // ============ 管理员接口 ============
  
  fastify.post('/admin/grant', {
    preHandler: [fastify.requireAdmin],
    schema: { tags: ['rewards'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
      const { userId, amount, description } = request.body;
      const tx = await fastify.ledger.grant({
          userId,
          amount,
          currencyCode: DEFAULT_CURRENCY_CODE,
          type: 'admin_grant',
          referenceType: 'admin_operation',
          referenceId: `admin_grant_${Date.now()}`, 
          description: description || '管理员发放',
          metadata: { adminId: request.user.id }
      });
      return { message: '发放成功', transaction: tx };
  });
  
   fastify.post('/admin/deduct', {
    preHandler: [fastify.requireAdmin],
    schema: { tags: ['rewards'], security: [{ bearerAuth: [] }] }
  }, async (request, reply) => {
      const { userId, amount, description } = request.body;
      const tx = await fastify.ledger.deduct({
          userId,
          amount,
          currencyCode: DEFAULT_CURRENCY_CODE,
          type: 'admin_deduct',
          referenceType: 'admin_operation',
          referenceId: `admin_deduct_${Date.now()}`,
          description: description || '管理员扣除',
          metadata: { adminId: request.user.id }
      });
      return { message: '扣除成功', transaction: tx };
  });

}
