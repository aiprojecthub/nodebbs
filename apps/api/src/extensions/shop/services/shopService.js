import db from '../../../db/index.js';
import {
  shopItems,
  userItems,
  users,
} from '../../../db/schema.js';
import { sysAccounts, sysTransactions, sysCurrencies } from '../../ledger/schema.js';
import { userBadges } from '../../badges/schema.js';
import { eq, and, desc, sql, asc, count } from 'drizzle-orm';
import { grantBadge } from '../../badges/services/badgeService.js';
import { notificationService } from '../../../services/notificationService.js';

/**
 * 获取商店商品列表
 * @param {Object} options
 * @param {number} options.page - 页码
 * @param {number} options.limit - 每页数量
 * @param {string} [options.type] - 商品类型筛选
 * @param {boolean} [options.includeInactive] - 是否包含下架商品 (管理员用)
 * @returns {Promise<Object>}
 */
export async function getShopItems(options = {}) {
  const { page = 1, limit = 20, type = null, includeInactive = false } = options;
  const offset = (page - 1) * limit;

  try {
    let query = db.select().from(shopItems);

    const conditions = [];
    if (!includeInactive) {
      conditions.push(eq(shopItems.isActive, true));
    }
    if (type) {
      conditions.push(eq(shopItems.type, type));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const items = await query
      .orderBy(asc(shopItems.displayOrder), desc(shopItems.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取总数
    let countQuery = db
      .select({ count: count() })
      .from(shopItems);

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;

    return {
      items,
      page,
      limit,
      total,
    };
  } catch (error) {
    console.error('[商城] 获取商品列表失败:', error);
    throw error;
  }
}

/**
 * 获取单个商品详情
 * @param {number} itemId
 * @returns {Promise<Object>}
 */
export async function getShopItemById(itemId) {
  const [item] = await db
    .select()
    .from(shopItems)
    .where(eq(shopItems.id, itemId))
    .limit(1);
  return item;
}

/**
 * 购买商品
 * @param {number} userId - 用户ID
 * @param {number} itemId - 商品ID
 * @returns {Promise<Object>}
 */
export async function buyItem(userId, itemId) {
  try {
    return await db.transaction(async (tx) => {
      // 1. 获取商品信息
      const [item] = await tx
        .select()
        .from(shopItems)
        .where(eq(shopItems.id, itemId))
        .limit(1);

      if (!item) {
        throw new Error('商品不存在');
      }

      if (!item.isActive) {
        throw new Error('商品已下架');
      }

      // 检查库存
      if (item.stock !== null && item.stock <= 0) {
        throw new Error('商品库存不足');
      }

      // 2. 检查用户是否已拥有（对于非消耗品，如头像框，通常只能拥有一个）
      const [existingItem] = await tx
        .select()
        .from(userItems)
        .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)))
        .limit(1);

      if (existingItem) {
        throw new Error('您已经拥有该商品');
      }

      // 2.5 对于勋章类型商品，检查用户是否已拥有该勋章
      if (item.type === 'badge') {
        let badgeId = null;
        try {
          let meta = item.metadata ? JSON.parse(item.metadata) : {};
          if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch (e) { /* ignore */ }
          }
          badgeId = meta.badgeId;
        } catch (e) {
          // ignore parse error
        }

        if (badgeId) {
          const [existingBadge] = await tx
            .select()
            .from(userBadges)
            .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
            .limit(1);

          if (existingBadge) {
            throw new Error('您已经拥有该勋章');
          }
        }
      }

      // 3. 检查用户积分余额 (Ledger: sys_accounts)
      const currencyCode = item.currencyCode;
      
      let [account] = await tx
        .select()
        .from(sysAccounts)
        .where(and(eq(sysAccounts.userId, userId), eq(sysAccounts.currencyCode, currencyCode)))
        .limit(1);

      if (!account) {
         // Create account if not exists
         [account] = await tx.insert(sysAccounts).values({
             userId,
             currencyCode,
             balance: 0,
             totalEarned: 0,
             totalSpent: 0
         }).returning();
      }

      const currencySymbol = (await tx.select({ symbol: sysCurrencies.symbol }).from(sysCurrencies).where(eq(sysCurrencies.code, currencyCode)).limit(1))[0]?.symbol || '';

      if (account.balance < item.price) {
        throw new Error(`余额不足，需要 ${item.price} ${currencySymbol}`);
      }

      // 4. 扣除积分
      const newBalance = Number(account.balance) - item.price;
      const newTotalSpent = Number(account.totalSpent) + item.price;

      await tx
        .update(sysAccounts)
        .set({
          balance: newBalance,
          totalSpent: newTotalSpent,
        })
        .where(eq(sysAccounts.id, account.id));

      // 5. 记录交易日志 (sys_transactions)
      await tx.insert(sysTransactions).values({
        userId,
        accountId: account.id, // Fixed: Added missing accountId
        currencyCode,
        amount: -item.price,
        balanceAfter: newBalance,
        type: 'shop_purchase',
        referenceType: 'shop_item',
        referenceId: String(itemId),
        description: `购买商品: ${item.name}`,
        metadata: JSON.stringify({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
        }),
      });

      // 6. 发放商品给用户 (库存记录)
      const [userItem] = await tx
        .insert(userItems)
        .values({
          userId,
          itemId,
          isEquipped: false,
        })
        .returning();

      // 7. 特殊处理：如果由于购买的是勋章，则同时调用勋章系统授予勋章
      if (item.type === 'badge') {
        let badgeId = null;
        try {
          // 尝试从 metadata 解析 badgeId
          let meta = item.metadata ? JSON.parse(item.metadata) : {};
          if (typeof meta === 'string') {
             try { meta = JSON.parse(meta); } catch (e) { /* ignore */ }
          }
          badgeId = meta.badgeId;
        } catch (e) {
          console.error('[商城] 解析勋章商品 metadata 失败', e);
        }

        if (badgeId) {
           try {
             await grantBadge(userId, badgeId, 'shop_buy');
           } catch (err) {
             console.error('[商城] 授予勋章失败:', err);
             throw new Error('勋章授予失败，交易取消');
           }
        } else {
           console.warn(`[商城] 商品 ${item.id} 是 badge 类型但未配置 badgeId`);
        }
      }

      // 8. 更新商品库存 (如果有库存限制)
      if (item.stock !== null) {
        await tx
          .update(shopItems)
          .set({
            stock: item.stock - 1,
          })
          .where(eq(shopItems.id, itemId));
      }

      return {
        message: '购买成功',
        item: userItem,
        balance: newBalance,
      };
    });
  } catch (error) {
    console.error('[商城] 购买失败:', error);
    throw error;
  }
}

/**
 * 获取用户拥有的商品
 * @param {number} userId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getUserItems(userId, options = {}) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  const { page = 1, limit = 50, type = null, isEquipped = null } = options;
  const offset = (page - 1) * limit;

  try {
    const conditions = [eq(userItems.userId, userId)];

    if (type) {
      conditions.push(eq(shopItems.type, type));
    }

    if (isEquipped !== null) {
      conditions.push(eq(userItems.isEquipped, isEquipped));
    }

    let query = db
      .select({
        id: userItems.id,
        userId: userItems.userId,
        itemId: userItems.itemId,
        isEquipped: userItems.isEquipped,
        createdAt: userItems.createdAt,
        expiresAt: userItems.expiresAt,
        // Flattened item properties for frontend convenience
        itemName: shopItems.name,
        itemDescription: shopItems.description,
        itemType: shopItems.type,
        price: shopItems.price,
        itemImageUrl: shopItems.imageUrl,
        itemMetadata: shopItems.metadata,
        metadata: userItems.metadata,
      })
      .from(userItems)
      .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
      .where(and(...conditions));

    const items = await query
      .orderBy(desc(userItems.isEquipped), desc(userItems.createdAt))
      .limit(limit)
      .offset(offset);

    // 总数
    let countQuery = db
      .select({ count: count() })
      .from(userItems)
      .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
      .where(and(...conditions));

    const [{ count: total }] = await countQuery;

    return {
      items,
      page,
      limit,
      total,
    };
  } catch (error) {
    console.error('[商城] 获取用户商品失败:', error);
    throw error;
  }
}

/**
 * 获取用户装备的物品
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export async function getUserEquippedItems(userId) {
  try {
    // Reuse getUserItems logic with isEquipped=true
    const result = await getUserItems(userId, { 
      page: 1, 
      limit: 100, // 假设最大装备数量为 100
      isEquipped: true 
    });
    return result.items || [];
  } catch (error) {
    console.error('[商城] 获取用户装备失败:', error);
    return [];
  }
}

/**
 * 装备物品
 * @param {number} userId
 * @param {number} userItemId - user_items 表的主键 ID (非 shop_items ID)
 * @returns {Promise<Object>}
 */
export async function equipItem(userId, userItemId) {
  try {
    return await db.transaction(async (tx) => {
      // 1. 验证物品归属
      const [userItem] = await tx
        .select({
          id: userItems.id,
          itemId: userItems.itemId,
          type: shopItems.type,
        })
        .from(userItems)
        .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
        .where(
          and(
            eq(userItems.id, userItemId),
            eq(userItems.userId, userId)
          )
        )
        .limit(1);

      if (!userItem) {
        throw new Error('未找到该物品或不属于您');
      }

      // 2. 如果是互斥类型（如头像框），先卸下同类型其他已装备物品
      if (['avatar_frame', 'profile_bg'].includes(userItem.type)) {
         // 找到所有已装备的同类型物品
         const equippedSameType = await tx
           .select({ id: userItems.id })
           .from(userItems)
           .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
           .where(
             and(
               eq(userItems.userId, userId),
               eq(userItems.isEquipped, true),
               eq(shopItems.type, userItem.type)
             )
           );
         
         const idsToUnequip = equippedSameType.map(i => i.id);
         if (idsToUnequip.length > 0) {
           await tx
             .update(userItems)
             .set({ isEquipped: false })
             .where(sql`${userItems.id} IN ${idsToUnequip}`);
         }
      }

      // 3. 装备新物品
      await tx
        .update(userItems)
        .set({ isEquipped: true })
        .where(eq(userItems.id, userItemId));

      return { message: '装备成功' };
    });
  } catch (error) {
    console.error('[商城] 装备失败:', error);
    throw error;
  }
}

/**
 * 卸下物品
 * @param {number} userId
 * @param {number} userItemId
 * @returns {Promise<Object>}
 */
export async function unequipItem(userId, userItemId) {
  try {
    const result = await db
      .update(userItems)
      .set({ isEquipped: false })
      .where(
        and(
          eq(userItems.id, userItemId),
          eq(userItems.userId, userId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error('未找到该物品或不属于您');
    }

    return { message: '卸下成功' };
  } catch (error) {
    console.error('[商城] 卸下失败:', error);
    throw error;
  }
}

/**
 * 获取用户当前装备的头像框
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
export async function getEquippedAvatarFrame(userId) {
  try {
    const [frame] = await db
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
          eq(userItems.userId, userId),
          eq(userItems.isEquipped, true),
          eq(shopItems.type, 'avatar_frame')
        )
      )
      .limit(1);

    return frame || null;
  } catch (error) {
    console.error('[商城] 获取装备头像框失败:', error);
    return null;
  }
}

// ============= 管理员功能 =============

/**
 * 创建商品
 * @param {Object} data
 * @returns
 */
export async function createShopItem(data) {
  let metadata = data.metadata;
  if (metadata && typeof metadata !== 'string') {
    metadata = JSON.stringify(metadata);
  }

  const [item] = await db
    .insert(shopItems)
    .values({
      ...data,
      metadata,
      stock: data.stock === '' || data.stock === null ? null : Number(data.stock),
    })
    .returning();
  return item;
}

/**
 * 更新商品
 * @param {number} id
 * @param {Object} data
 * @returns
 */
export async function updateShopItem(id, data) {
  const updateData = { ...data };
  
  if (updateData.metadata !== undefined) {
    if (updateData.metadata && typeof updateData.metadata !== 'string') {
      updateData.metadata = JSON.stringify(updateData.metadata);
    }
    if (updateData.metadata === '') updateData.metadata = null;
  }

  // 处理 stock: 如果传 null 代表无限
  if (updateData.stock === '') {
    updateData.stock = null;
  } else if (updateData.stock !== undefined && updateData.stock !== null) {
    updateData.stock = Number(updateData.stock);
  }

  const [item] = await db
    .update(shopItems)
    .set({ ...updateData })
    .where(eq(shopItems.id, id))
    .returning();
  return item;
}

/**
 * 删除商品
 */
export async function deleteShopItem(id) {
  await db.delete(shopItems).where(eq(shopItems.id, id));
  return { message: '删除成功' };
}

/**
 * 赠送商品
 * @param {number} senderId - 发送者ID
 * @param {number} receiverId - 接收者ID
 * @param {number} itemId - 商品ID
 * @param {string} message - 赠言
 * @returns {Promise<Object>}
 */
export async function giftItem(senderId, receiverId, itemId, message) {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. 获取商品信息
      const [item] = await tx
        .select()
        .from(shopItems)
        .where(eq(shopItems.id, itemId))
        .limit(1);

      if (!item) throw new Error('商品不存在');
      if (!item.isActive) throw new Error('商品已下架');
      if (item.stock !== null && item.stock <= 0) throw new Error('商品库存不足');

      if (senderId === receiverId) {
        throw new Error('不能赠送给自己，请直接购买');
      }

      // 1.5 获取接收者信息
      const [receiver] = await tx
        .select()
        .from(users)
        .where(eq(users.id, receiverId))
        .limit(1);
      
      if (!receiver) throw new Error('接收用户不存在');

      // 2. 检查发送者余额
      const currencyCode = item.currencyCode;
      
      let [senderAccount] = await tx
         .select()
         .from(sysAccounts)
         .where(and(eq(sysAccounts.userId, senderId), eq(sysAccounts.currencyCode, currencyCode)))
         .limit(1);

      if (!senderAccount) {
        [senderAccount] = await tx
          .insert(sysAccounts)
          .values({ userId: senderId, currencyCode, balance: 0, totalEarned: 0, totalSpent: 0 })
          .returning();
      }

      const currencySymbol = (await tx.select({ symbol: sysCurrencies.symbol }).from(sysCurrencies).where(eq(sysCurrencies.code, currencyCode)).limit(1))[0]?.symbol || '';

      if (senderAccount.balance < item.price) {
        throw new Error(`余额不足，需要 ${item.price} ${currencySymbol}`);
      }

      // 3. 检查接收者是否已拥有
      const [existingItem] = await tx
        .select()
        .from(userItems)
        .where(and(eq(userItems.userId, receiverId), eq(userItems.itemId, itemId)))
        .limit(1);

      if (existingItem) {
        throw new Error('对方已经拥有该商品');
      }

      // 3.5 对于勋章类型商品，检查接收者是否已拥有该勋章
      if (item.type === 'badge') {
        let badgeId = null;
        try {
          let meta = item.metadata ? JSON.parse(item.metadata) : {};
          if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch (e) { /* ignore */ }
          }
          badgeId = meta.badgeId;
        } catch (e) {
          // ignore parse error
        }

        if (badgeId) {
          const [existingBadge] = await tx
            .select()
            .from(userBadges)
            .where(and(eq(userBadges.userId, receiverId), eq(userBadges.badgeId, badgeId)))
            .limit(1);

          if (existingBadge) {
            throw new Error('对方已经拥有该勋章');
          }
        }
      }

      // 4. 扣除发送者积分
      const newBalance = Number(senderAccount.balance) - item.price;
      const newTotalSpent = Number(senderAccount.totalSpent) + item.price;
      
      await tx
        .update(sysAccounts)
        .set({
          balance: newBalance,
          totalSpent: newTotalSpent,
        })
        .where(eq(sysAccounts.id, senderAccount.id));

      // 5. 记录交易日志 (发送者)
      await tx.insert(sysTransactions).values({
        userId: senderId,
        accountId: senderAccount.id,
        currencyCode,
        amount: -item.price,
        balanceAfter: newBalance,
        type: 'gift_sent',
        referenceType: 'shop_item',
        referenceId: String(itemId),
        relatedUserId: receiverId,
        description: `赠送给 ${receiver.username || '用户'}: ${item.name}`,
        metadata: JSON.stringify({
          receiverId,
          itemId,
          message,
          giftedAt: new Date().toISOString()
        })
      });

      // 6. 发放商品给接收者
      const metadata = JSON.stringify({
        fromUserId: senderId,
        fromUsername: await tx.select({ username: users.username }).from(users).where(eq(users.id, senderId)).then(r => r[0]?.username),
        message,
        giftedAt: new Date().toISOString(),
      });

      await tx.insert(userItems).values({
        userId: receiverId,
        itemId: item.id,
        metadata,
      });

      // 7. 如果是勋章，自动佩戴/检查逻辑
      if (item.type === 'badge') {
        let badgeId = null;
        try {
          let meta = item.metadata ? JSON.parse(item.metadata) : {};
          if (typeof meta === 'string') {
             try { meta = JSON.parse(meta); } catch (e) { /* ignore */ }
          }
          badgeId = meta.badgeId;
        } catch (e) {
          console.error('[商城] 解析勋章商品 metadata 失败', e);
        }

        if (badgeId) {
           try {
             await grantBadge(receiverId, badgeId, 'shop_gift');
           } catch (err) {
             console.error('[商城] 赠送勋章虽然商品已发放但勋章授予失败:', err);
           }
        }
      }

      // 8. 扣减库存
      if (item.stock !== null) {
        await tx
          .update(shopItems)
          .set({ stock: item.stock - 1 })
          .where(eq(shopItems.id, itemId));
      }

      return { 
        message: '赠送成功', 
        balance: newBalance,
        // 返回通知所需数据
        notificationData: {
          receiverId,
          senderId,
          itemName: item.name,
          itemId: item.id,
          giftMessage: message
        }
      };
    });

    // 事务成功后发送通知（独立于事务，失败不影响礼物赠送）
    try {
      await notificationService.send({
        userId: result.notificationData.receiverId,
        type: 'gift_received',
        triggeredByUserId: result.notificationData.senderId,
        message: `你收到了一份礼物：${result.notificationData.itemName}`,
        metadata: {
          itemId: result.notificationData.itemId,
          itemName: result.notificationData.itemName,
          message: result.notificationData.giftMessage,
        }
      });
    } catch (notifyError) {
      console.error('[商城] 发送礼物通知失败:', notifyError);
    }

    return { message: result.message, balance: result.balance };
  } catch (error) {
    console.error('[商城] 赠送失败:', error);
    throw error;
  }
}
