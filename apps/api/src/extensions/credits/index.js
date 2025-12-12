import fp from 'fastify-plugin';
import creditsRoutes from './routes/index.js';

import { registerCreditListeners } from './listeners.js';


import { userEnricher } from '../../services/userEnricher.js';
import db from '../../db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { users, userItems, shopItems, userBadges, badges as badgeSchema } from '../../db/schema.js';
import { isCreditSystemEnabled } from './services/creditService.js';

/**
 * 积分插件
 * 处理积分系统逻辑、路由和事件监听器。
 */
async function creditsPlugin(fastify, options) {
  // 注册积分增强 (单用户)
  userEnricher.register('credits', async (user) => {
    // 1. 检查系统是否已启用
    const isEnabled = await isCreditSystemEnabled();
    
    // 初始化默认值以确保结构一致
    if (user.avatarFrame === undefined) user.avatarFrame = null;
    if (user.badges === undefined) user.badges = [];

    if (!isEnabled) return;
    
    try {
        // 2. 获取头像框
        const [foundAvatarFrame] = await db
          .select({
            id: userItems.id,
            itemType: shopItems.type,
            itemName: shopItems.name,
            itemMetadata: shopItems.metadata,
            imageUrl: shopItems.imageUrl,
          })
          .from(userItems)
          .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
          .where(
            and(
              eq(userItems.userId, user.id),
              eq(userItems.isEquipped, true),
              eq(shopItems.type, 'avatar_frame')
            )
          )
          .limit(1);

        user.avatarFrame = foundAvatarFrame || null;

        // 3. 获取徽章
        const badges = await db
          .select({
            id: userBadges.id,
            badgeId: badgeSchema.id,
            name: badgeSchema.name,
            slug: badgeSchema.slug,
            iconUrl: badgeSchema.iconUrl,
            description: badgeSchema.description,
            isDisplayed: userBadges.isDisplayed,
            earnedAt: userBadges.earnedAt
          })
          .from(userBadges)
          .innerJoin(badgeSchema, eq(userBadges.badgeId, badgeSchema.id))
          .where(
            and(
              eq(userBadges.userId, user.id),
              eq(userBadges.isDisplayed, true)
            )
          )
          .orderBy(userBadges.displayOrder);
          
        user.badges = badges;
    } catch (err) {
        console.error('Error enriching user credits:', err);
    }
  });

  // 注册批量增强
  userEnricher.registerBatch('credits', async (usersList) => {
      // 1. 检查系统是否已启用
      const isEnabled = await isCreditSystemEnabled();

      // 为所有用户初始化默认值
      usersList.forEach(u => {
          if (u.avatarFrame === undefined) u.avatarFrame = null;
          if (u.badges === undefined) u.badges = [];
      });

      if (!isEnabled || usersList.length === 0) return;

      const userIds = usersList.map(u => u.id);

      try {
          // 2. 批量获取头像框
          const frames = await db
            .select({
              userId: userItems.userId,
              itemMetadata: shopItems.metadata,
            })
            .from(userItems)
            .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
            .where(
              and(
                inArray(userItems.userId, userIds),
                eq(userItems.isEquipped, true),
                eq(shopItems.type, 'avatar_frame')
              )
            );
          
          const frameMap = new Map();
          frames.forEach(f => frameMap.set(f.userId, f));

          // 3. 批量获取徽章
          // 注意：假设我们需要分发的徽章。如果只是热门徽章，逻辑可能会有所不同，但基本列表是可以的。
          const badges = await db
            .select({
                userId: userBadges.userId,
                id: userBadges.id,
                badgeId: badgeSchema.id,
                name: badgeSchema.name,
                slug: badgeSchema.slug,
                iconUrl: badgeSchema.iconUrl,
                isDisplayed: userBadges.isDisplayed
            })
            .from(userBadges)
            .innerJoin(badgeSchema, eq(userBadges.badgeId, badgeSchema.id))
             .where(
                and(
                  inArray(userBadges.userId, userIds),
                  eq(userBadges.isDisplayed, true)
                )
             )
             .orderBy(userBadges.displayOrder);
          
          const badgeMap = new Map();
          badges.forEach(b => {
             if (!badgeMap.has(b.userId)) badgeMap.set(b.userId, []);
             badgeMap.get(b.userId).push(b);
          });

          // 4. 映射回用户
          usersList.forEach(u => {
             if (frameMap.has(u.id)) {
                 u.avatarFrame = { itemMetadata: frameMap.get(u.id).itemMetadata };
             }
             if (badgeMap.has(u.id)) {
                 u.badges = badgeMap.get(u.id);
             }
          });

      } catch (err) {
          console.error('Error batch enriching user credits:', err);
      }
  });

  // 注册路由
  fastify.register(creditsRoutes, { prefix: '/api/credits' });

  // 注册事件监听器
  await registerCreditListeners(fastify);

}

export default fp(creditsPlugin, {
  name: 'credits-plugin',
  dependencies: ['event-bus']
});
