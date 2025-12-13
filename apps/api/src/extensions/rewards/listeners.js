// import { grantReward } from './services/rewardService.js';
import db from '../../db/index.js';
import { eq, and } from 'drizzle-orm';

/**
 * Register reward system event listeners
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function registerRewardListeners(fastify) {
  const { eventBus } = fastify;

  if (!eventBus) {
    fastify.log.warn('[奖励系统] EventBus plugin not found, skipping listener registration');
    return;
  }

  // 1. 话题创建奖励 (Topic Created)
  eventBus.on('topic.created', async (topic) => {
    try {
      fastify.log.debug(`[奖励系统] 处理话题创建奖励: TopicID=${topic.id}, UserID=${topic.userId}`);
      
      const amount = await fastify.ledger.getCurrencyConfig('credits', 'post_topic_amount', 5);
      const amountNum = Number(amount);

      if (amountNum > 0) {
        const isCurrencyActive = await fastify.ledger.isCurrencyActive('credits');
        if (isCurrencyActive) {
            await fastify.ledger.grant({
              userId: topic.userId,
              amount: amountNum,
              currencyCode: 'credits',
              type: 'post_topic',
              referenceType: 'reward_event',
              referenceId: `post_topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              description: `发布话题：${topic.title}`,
              metadata: {
                  source: 'rewards-extension',
                  relatedTopicId: topic.id
              }
            });
        }
      }
    } catch (error) {
      fastify.log.error(error, `[积分系统] 处理话题创建奖励/扣费失败: TopicID=${topic.id}`);
    }
  });

  // 2. 回复创建奖励 (Post Created)
  eventBus.on('post.created', async (post) => {
    try {
      // 不奖励第一条帖子（即话题内容）
      if (post.postNumber === 1) return;

      fastify.log.debug(`[积分系统] 处理回复创建奖励: PostID=${post.id}, UserID=${post.userId}`);

      // 读取配置
      const replyAmount = await fastify.ledger.getCurrencyConfig('credits', 'post_reply_amount', 2);
      const amountNum = Number(replyAmount);

      if (amountNum > 0) {
        const isCurrencyActive = await fastify.ledger.isCurrencyActive('credits');
        if (isCurrencyActive) {
            await fastify.ledger.grant({
              userId: post.userId,
              amount: amountNum,
              currencyCode: 'credits',
              type: 'post_reply',
              referenceType: 'reward_event',
              referenceId: `post_reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              description: '发布回复',
              metadata: {
                  source: 'rewards-extension',
                  relatedPostId: post.id,
                  relatedTopicId: post.topicId
              }
            });
        }
      } else {
         fastify.log.debug(`[积分系统] 回复奖励未开启 (Amount=0)`);
      }
    } catch (error) {
      fastify.log.error(error, `[积分系统] 处理回复奖励/扣费失败: PostID=${post.id}`);
    }
  });

  // 3. 点赞奖励 (Post Liked)
  eventBus.on('post.liked', async ({ postId, postAuthorId, userId }) => {
    try {
      // 不奖励自己点赞自己
      if (postAuthorId === userId) {
        return;
      }

      fastify.log.debug(`[积分系统] 处理点赞奖励: PostID=${postId}, ToUserID=${postAuthorId}`);

      // 检查是否已经奖励过 (防止重复点赞/取消点赞刷分)
      // 使用 Ledger sysTransactions 进行检查
      const { sysTransactions } = await import('../../ledger/schema.js');
      
      const [existingTx] = await db
        .select()
        .from(sysTransactions)
        .where(
          and(
            eq(sysTransactions.type, 'receive_like'),
            eq(sysTransactions.referenceType, 'reward_event'),
            eq(sysTransactions.relatedUserId, userId),
            eq(sysTransactions.referenceId, `receive_like_${postId}_${userId}`)
          )
        )
        .limit(1);

      if (existingTx) {
        fastify.log.debug(`[奖励系统] 重复点赞，跳过奖励: PostID=${postId}, LikerID=${userId}`);
        return;
      }

      const amount = await fastify.ledger.getCurrencyConfig('credits', 'receive_like_amount', 1);

      if (amount > 0) {
        const isCurrencyActive = await fastify.ledger.isCurrencyActive('credits');
        if (isCurrencyActive) {
            await fastify.ledger.grant({
              userId: postAuthorId, // 给帖子作者加分
              amount: Number(amount),
              currencyCode: 'credits',
              type: 'receive_like',
              referenceType: 'reward_event',
              referenceId: `receive_like_${postId}_${userId}`, // Deterministic ID for deduplication
              description: '获得点赞奖励',
              metadata: { 
                  source: 'rewards-extension',
                  relatedPostId: postId, 
                  relatedUserId: userId 
              }
            });
        }
      }
    } catch (error) {
      fastify.log.error(error, `[积分系统] 发放点赞奖励失败: PostID=${postId}`);
    }
  });
  
  fastify.log.info('[积分系统] 事件监听器已注册');
}
