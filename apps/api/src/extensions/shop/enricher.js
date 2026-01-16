import { userEnricher } from '../../services/userEnricher.js';
import db from '../../db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { shopItems, userItems } from '../../db/schema.js';
import { DEFAULT_CURRENCY_CODE } from '../ledger/constants.js';

export default function registerShopEnricher(fastify) {
  // 注册头像框增强 (单用户)
  userEnricher.register('avatar_frame', async (user) => {
    // 初始化默认值
    if (user.avatarFrame === undefined) user.avatarFrame = null;

    // 检查积分货币是否启用
    if (fastify && fastify.ledger) {
      const isCreditsActive = await fastify.ledger.isCurrencyActive(DEFAULT_CURRENCY_CODE);
      if (!isCreditsActive) return;
    }

    try {
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
    } catch (err) {
      console.error('Error enriching user avatar frame:', err);
    }
  });

  // 注册头像框批量增强
  userEnricher.registerBatch('avatar_frame', async (usersList) => {
    // 初始化默认值
    usersList.forEach((u) => {
      if (u.avatarFrame === undefined) u.avatarFrame = null;
    });

    if (usersList.length === 0) return;

    // 检查积分货币是否启用
    if (fastify && fastify.ledger) {
      const isCreditsActive = await fastify.ledger.isCurrencyActive(DEFAULT_CURRENCY_CODE);
      if (!isCreditsActive) return;
    }

    const userIds = usersList.map((u) => u.id);

    try {
      const frames = await db
        .select({
          userId: userItems.userId,
          itemMetadata: shopItems.metadata,
          // 根据需要可以添加更多字段
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
      frames.forEach((f) => frameMap.set(f.userId, f));

      // 映射回用户
      usersList.forEach((u) => {
        if (frameMap.has(u.id)) {
          u.avatarFrame = { itemMetadata: frameMap.get(u.id).itemMetadata };
        }
      });
    } catch (err) {
      console.error('Error batch enriching user avatar frames:', err);
    }
  });
}
