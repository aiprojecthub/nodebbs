import { userEnricher } from '../../services/userEnricher.js';
import { getUserBadges, getUsersBadges } from './services/badgeService.js';
import { DEFAULT_CURRENCY_CODE } from '../ledger/constants.js';

/**
 * 为单个用户补充勋章信息
 */
export default function registerBadgeEnricher(fastify) {
  /**
   * 为单个用户补充勋章信息
   */
  const enrichUser = async (user) => {
    if (!user || !user.id) return;

    // 检查积分货币是否启用 (Assuming badges rely on credits system)
    if (fastify && fastify.ledger) {
      const isCreditsActive = await fastify.ledger.isCurrencyActive(DEFAULT_CURRENCY_CODE);
      if (!isCreditsActive) return;
    }

    try {
      const badges = await getUserBadges(user.id);
      // 只展示用户设置为显示的勋章
      user.badges = badges.filter(b => b.isDisplayed !== false);
    } catch (err) {
      console.error(`[BadgeEnricher] Failed to enrich user ${user.id}:`, err);
      user.badges = [];
    }
  };

  /**
   * 为多个用户批量补充勋章信息
   */
  const enrichUsers = async (users) => {
    if (!users || users.length === 0) return;

    // 检查积分货币是否启用
    if (fastify && fastify.ledger) {
      const isCreditsActive = await fastify.ledger.isCurrencyActive(DEFAULT_CURRENCY_CODE);
      if (!isCreditsActive) return;
    }

    // 提取 ID，过滤掉已有勋章数据以避免不必要的重复获取（可选优化）
    const userIds = users.filter((u) => u.id).map((u) => u.id);
    const uniqueIds = [...new Set(userIds)];

    if (uniqueIds.length === 0) return;

    try {
      const badgesMap = await getUsersBadges(uniqueIds);

      users.forEach((user) => {
        if (user.id && badgesMap[user.id]) {
          // 只展示用户设置为显示的勋章
          user.badges = badgesMap[user.id].filter(b => b.isDisplayed !== false);
        } else {
          user.badges = [];
        }
      });
    } catch (err) {
      console.error('[BadgeEnricher] Failed to enrich users:', err);
      // 降级处理：设置为空数组
      users.forEach((user) => {
        if (!user.badges) user.badges = [];
      });
    }
  };

  userEnricher.register('badges', enrichUser);
  userEnricher.registerBatch('badges', enrichUsers);
}
