import { checkBadgeConditions } from './services/badgeService.js';
import { DEFAULT_CURRENCY_CODE } from '../ledger/constants.js';

export default async function badgeListeners(fastify) {
  if (!fastify.eventBus) return;

  const handleActivity = async (payload) => {
    try {
      // 检查积分货币是否启用 (Assuming badges rely on credits system)
      if (fastify.ledger) {
        const isCreditsActive = await fastify.ledger.isCurrencyActive(DEFAULT_CURRENCY_CODE);
        if (!isCreditsActive) return;
      }

      const userId = payload.userId || payload.user?.id;
      if (userId) {
        fastify.log.info(`[勋章] 正在检查用户 ${userId} 的解锁条件`);
        const newBadges = await checkBadgeConditions(userId);
        
        if (newBadges && newBadges.length > 0) {
          fastify.log.info(`[勋章] 用户 ${userId} 解锁了 ${newBadges.length} 枚新勋章`);
          
          // 为每个新徽章创建通知
          for (const badge of newBadges) {
            await fastify.notification.send({
              userId,
              type: 'badge_earned',
              message: `恭喜！你获得了一枚新勋章：${badge.name}`,
              metadata: {
                 badgeId: badge.id,
                 badgeName: badge.name,
                 iconUrl: badge.iconUrl,
                 slug: badge.slug
              }
            });
          }
        }
      }
    } catch (err) {
      fastify.log.error(`[勋章] 检查勋章解锁条件时出错: ${err.message}`);
    }
  };

  // 监听可能触发徽章的事件
  fastify.eventBus.on('post.created', handleActivity);
  fastify.eventBus.on('topic.created', handleActivity);
  fastify.eventBus.on('post.liked', (payload) => {
     // 对于 'like_received_count'，payload 可能包含帖子的 ownerId
     if (payload.postOwnerId) {
        handleActivity({ userId: payload.postOwnerId });
     }
  });
  fastify.eventBus.on('user.login', handleActivity); // 用于签到连胜或登录天数
  fastify.eventBus.on('user.checkin', handleActivity); // 监听签到事件
}
