import { checkBadgeConditions } from './services/badgeService.js';
import { DEFAULT_CURRENCY_CODE } from '../ledger/constants.js';
import { EVENTS } from '../../constants/events.js';

/**
 * 注册勋章系统事件监听器
 * @param {import('fastify').FastifyInstance} fastify
 */
export function registerBadgeListeners(fastify) {
  if (!fastify.eventBus) {
    fastify.log.warn('[勋章] EventBus 未找到，跳过监听器注册');
    return;
  }

  const handleActivity = async (payload) => {
    try {
      // 检查积分货币是否启用 (Assuming badges rely on credits system)
      if (fastify.ledger) {
        const isCreditsActive = await fastify.ledger.isCurrencyActive(DEFAULT_CURRENCY_CODE);
        if (!isCreditsActive) return;
      }

      const userId = payload.userId || payload.user?.id;
      if (userId) {
        fastify.log.debug(`[勋章] 正在检查用户 ${userId} 的解锁条件`);
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
  fastify.eventBus.on(EVENTS.POST_CREATED, handleActivity);
  fastify.eventBus.on(EVENTS.TOPIC_CREATED, handleActivity);
  fastify.eventBus.on(EVENTS.POST_LIKED, (payload) => {
     // 对于 'like_received_count'，给被点赞的帖子作者触发勋章检查
     if (payload.postAuthorId) {
        handleActivity({ userId: payload.postAuthorId });
     }
  });
  fastify.eventBus.on(EVENTS.USER_CHECKIN, handleActivity); // 监听签到事件

  fastify.log.info('[勋章] 事件监听器已注册');
}
