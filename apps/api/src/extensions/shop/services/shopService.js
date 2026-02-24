import db from '../../../db/index.js';
import { users } from '../../../db/schema.js';
import { shopItems, userItems, userItemLogs } from '../schema.js';

import { sysAccounts, sysTransactions, sysCurrencies } from '../../ledger/schema.js';
import { userBadges } from '../../badges/schema.js';
import { eq, ne, and, desc, sql, asc, count, inArray } from 'drizzle-orm';
import { grantBadge } from '../../badges/services/badgeService.js';
import { notificationService } from '../../../services/notificationService.js';

/**
 * 安全解析 metadata JSON 字符串（兼容双重 JSON.stringify 的历史数据）
 * @param {string|object|null} raw
 * @returns {object}
 */
function parseMetadata(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    let parsed = JSON.parse(raw);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return parsed || {};
  } catch {
    return {};
  }
}

/**
 * 获取商店商品列表
 * @param {Object} options
 * @param {number} options.page - 页码
 * @param {number} options.limit - 每页数量
 * @param {string} [options.type] - 商品类型筛选
 * @param {boolean} [options.includeInactive] - 是否包含下架商品 (管理员用)
 * @param {number} [options.userId] - 当前登录用户 ID（用于查询 ownership 状态）
 * @returns {Promise<Object>}
 */
export async function getShopItems(options = {}) {
  const { page = 1, limit = 20, type = null, includeInactive = false, userId = null } = options;
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

    // 查询当前用户的 ownership 状态
    let enrichedItems = items;
    if (userId && items.length > 0) {
      const itemIds = items.map(i => i.id);
      const ownedRecords = await db
        .select({
          itemId: userItems.itemId,
          quantity: userItems.quantity,
        })
        .from(userItems)
        .where(
          and(
            eq(userItems.userId, userId),
            inArray(userItems.itemId, itemIds),
            eq(userItems.status, 'active')
          )
        );

      const ownedMap = new Map(ownedRecords.map(r => [r.itemId, r.quantity]));

      enrichedItems = items.map(item => ({
        ...item,
        owned: ownedMap.has(item.id),
        ownedCount: ownedMap.get(item.id) || 0,
      }));
    }

    return {
      items: enrichedItems,
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
export async function buyItem(userId, itemId, quantity = 1) {
  // 数量安全校验
  quantity = Math.max(1, Math.floor(Number(quantity) || 1));
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
      if (item.stock !== null && item.stock < quantity) {
        throw new Error('商品库存不足');
      }

      // 2. 根据 consumeType 处理拥有检查
      const consumeType = item.consumeType || 'non_consumable';

      const [existingItem] = await tx
        .select()
        .from(userItems)
        .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)))
        .limit(1);

      if (consumeType === 'non_consumable') {
        // 非消耗品：不允许重复购买，且数量只能为 1
        if (quantity > 1) {
          throw new Error('非消耗品每次只能购买 1 个');
        }
        if (existingItem) {
          throw new Error('您已经拥有该商品');
        }
      } else {
        // 消耗品/订阅型：检查 maxOwn 上限
        const currentQuantity = existingItem ? existingItem.quantity : 0;
        if (item.maxOwn !== null && currentQuantity + quantity > item.maxOwn) {
          const canBuy = item.maxOwn - currentQuantity;
          throw new Error(canBuy > 0 ? `最多还能购买 ${canBuy} 个（持有上限 ${item.maxOwn}）` : `您已达到该商品的持有上限（${item.maxOwn}）`);
        }
      }

      // 2.5 对于勋章类型商品，检查用户是否已拥有该勋章
      if (item.type === 'badge') {
        const badgeId = parseMetadata(item.metadata).badgeId;

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
         [account] = await tx.insert(sysAccounts).values({
             userId,
             currencyCode,
             balance: 0,
             totalEarned: 0,
             totalSpent: 0
         }).returning();
      }

      const currencySymbol = (await tx.select({ symbol: sysCurrencies.symbol }).from(sysCurrencies).where(eq(sysCurrencies.code, currencyCode)).limit(1))[0]?.symbol || '';

      const totalPrice = item.price * quantity;

      if (account.balance < totalPrice) {
        throw new Error(`余额不足，需要 ${totalPrice} ${currencySymbol}`);
      }

      // 4. 扣除积分
      const newBalance = Number(account.balance) - totalPrice;
      const newTotalSpent = Number(account.totalSpent) + totalPrice;

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
        accountId: account.id,
        currencyCode,
        amount: -totalPrice,
        balanceAfter: newBalance,
        type: 'shop_purchase',
        referenceType: 'shop_item',
        referenceId: String(itemId),
        description: quantity > 1 ? `购买商品: ${item.name} ×${quantity}` : `购买商品: ${item.name}`,
        metadata: JSON.stringify({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          quantity,
        }),
      });

      // 6. 发放商品给用户
      let userItem;
      if (consumeType !== 'non_consumable' && existingItem) {
        // 消耗品/订阅型且已有记录：叠加数量
        const [updated] = await tx
          .update(userItems)
          .set({
            quantity: existingItem.quantity + quantity,
            status: 'active',
          })
          .where(eq(userItems.id, existingItem.id))
          .returning();
        userItem = updated;
      } else {
        // 非消耗品 或 消耗品首次购买：创建新记录
        const [created] = await tx
          .insert(userItems)
          .values({
            userId,
            itemId,
            isEquipped: false,
            quantity,
            status: 'active',
          })
          .returning();
        userItem = created;
      }

      // 7. 特殊处理：勋章商品同时授予勋章
      if (item.type === 'badge') {
        const badgeId = parseMetadata(item.metadata).badgeId;

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

      // 8. 更新商品库存 (如果有库存限制) — 使用 SQL 原子表达式防止并发超卖
      if (item.stock !== null) {
        await tx
          .update(shopItems)
          .set({
            stock: sql`${shopItems.stock} - ${quantity}`,
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
    const conditions = [
      eq(userItems.userId, userId),
      ne(userItems.status, 'exhausted'),
    ];

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
        quantity: userItems.quantity,
        status: userItems.status,
        createdAt: userItems.createdAt,
        expiresAt: userItems.expiresAt,
        // 扁平化商品属性
        itemName: shopItems.name,
        itemDescription: shopItems.description,
        itemType: shopItems.type,
        consumeType: shopItems.consumeType,
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

      // 2. 只有头像框支持装备
      if (userItem.type !== 'avatar_frame') {
        throw new Error('该物品类型不支持装备');
      }

      // 3. 先卸下同类型其他已装备物品（头像框互斥，同时只能装备一个）
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

      // 4. 装备新物品
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
      maxOwn: data.maxOwn === '' || data.maxOwn === null ? null : (data.maxOwn !== undefined ? Number(data.maxOwn) : null),
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

  // 处理 stock
  if (updateData.stock === '') {
    updateData.stock = null;
  } else if (updateData.stock !== undefined && updateData.stock !== null) {
    updateData.stock = Number(updateData.stock);
  }

  // 处理 maxOwn
  if (updateData.maxOwn === '') {
    updateData.maxOwn = null;
  } else if (updateData.maxOwn !== undefined && updateData.maxOwn !== null) {
    updateData.maxOwn = Number(updateData.maxOwn);
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
export async function giftItem(senderId, receiverId, itemId, message, quantity = 1) {
  quantity = Math.max(1, Math.floor(Number(quantity) || 1));
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
      if (item.stock !== null && item.stock < quantity) throw new Error('商品库存不足');

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

      const totalPrice = item.price * quantity;

      if (senderAccount.balance < totalPrice) {
        throw new Error(`余额不足，需要 ${totalPrice} ${currencySymbol}`);
      }

      // 3. 根据 consumeType 检查接收者 ownership
      const consumeType = item.consumeType || 'non_consumable';

      const [existingItem] = await tx
        .select()
        .from(userItems)
        .where(and(eq(userItems.userId, receiverId), eq(userItems.itemId, itemId)))
        .limit(1);

      if (consumeType === 'non_consumable') {
        if (quantity > 1) throw new Error('非消耗品每次只能赠送 1 个');
        if (existingItem) {
          throw new Error('对方已经拥有该商品');
        }
      } else {
        const currentQuantity = existingItem ? existingItem.quantity : 0;
        if (item.maxOwn !== null && currentQuantity + quantity > item.maxOwn) {
          const canGift = item.maxOwn - currentQuantity;
          throw new Error(canGift > 0 ? `对方最多还能接收 ${canGift} 个（持有上限 ${item.maxOwn}）` : `对方已达到该商品的持有上限（${item.maxOwn}）`);
        }
      }

      // 3.5 对于勋章类型商品，检查接收者是否已拥有该勋章
      if (item.type === 'badge') {
        const badgeId = parseMetadata(item.metadata).badgeId;

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
      const newBalance = Number(senderAccount.balance) - totalPrice;
      const newTotalSpent = Number(senderAccount.totalSpent) + totalPrice;
      
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
        amount: -totalPrice,
        balanceAfter: newBalance,
        type: 'gift_sent',
        referenceType: 'shop_item',
        referenceId: String(itemId),
        relatedUserId: receiverId,
        description: quantity > 1 ? `赠送给 ${receiver.username || '用户'}: ${item.name} ×${quantity}` : `赠送给 ${receiver.username || '用户'}: ${item.name}`,
        metadata: JSON.stringify({
          receiverId,
          itemId,
          quantity,
          message,
          giftedAt: new Date().toISOString()
        })
      });

      // 6. 发放商品给接收者
      const giftMeta = JSON.stringify({
        fromUserId: senderId,
        fromUsername: await tx.select({ username: users.username }).from(users).where(eq(users.id, senderId)).then(r => r[0]?.username),
        message,
        giftedAt: new Date().toISOString(),
      });

      if (consumeType !== 'non_consumable' && existingItem) {
        await tx
          .update(userItems)
          .set({
            quantity: existingItem.quantity + quantity,
            status: 'active',
            metadata: giftMeta,
          })
          .where(eq(userItems.id, existingItem.id));
      } else {
        await tx.insert(userItems).values({
          userId: receiverId,
          itemId: item.id,
          quantity,
          status: 'active',
          metadata: giftMeta,
        });
      }

      // 7. 如果是勋章，自动佩戴/检查逻辑
      if (item.type === 'badge') {
        const badgeId = parseMetadata(item.metadata).badgeId;

        if (badgeId) {
           try {
             await grantBadge(receiverId, badgeId, 'shop_gift');
           } catch (err) {
             console.error('[商城] 赠送勋章虽然商品已发放但勋章授予失败:', err);
           }
        }
      }

      // 8. 扣减库存 — 使用 SQL 原子表达式防止并发超卖
      if (item.stock !== null) {
        await tx
          .update(shopItems)
          .set({ stock: sql`${shopItems.stock} - ${quantity}` })
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

// ============= 道具使用/激活 =============

/**
 * 使用瞬时消耗品（改名卡、置顶卡等）
 * action 从 shopItems.metadata.action 读取，前端只传运行时参数
 *
 * @param {number} userId - 用户 ID
 * @param {number} userItemId - user_items 表主键 ID
 * @param {Object} [useData] - 运行时参数（前端传入）
 * @param {string} [useData.targetType] - 目标类型（如 'topic'）
 * @param {number} [useData.targetId] - 目标 ID（如帖子 ID）
 * @param {Object} [useData.metadata] - 附加参数（如 { newUsername }）
 * @returns {Promise<Object>}
 */
export async function useItem(userId, userItemId, useData = {}) {
  try {
    return await db.transaction(async (tx) => {
      // 1. 验证物品归属和状态，同时获取商品 metadata
      const [record] = await tx
        .select({
          id: userItems.id,
          itemId: userItems.itemId,
          quantity: userItems.quantity,
          status: userItems.status,
          consumeType: shopItems.consumeType,
          itemName: shopItems.name,
          itemType: shopItems.type,
          itemMetadata: shopItems.metadata, // 商品配置（含 action）
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

      if (!record) {
        throw new Error('未找到该物品或不属于您');
      }

      if (record.consumeType !== 'consumable') {
        throw new Error('该物品不是消耗品，无法使用');
      }

      if (record.status !== 'active' || record.quantity <= 0) {
        throw new Error('该物品数量不足或不可用');
      }

      // 解析商品 metadata，获取 action 等配置
      const itemMeta = parseMetadata(record.itemMetadata);

      const action = itemMeta.action || 'generic_use';

      // 2. 扣减数量
      const newQuantity = record.quantity - 1;
      const newStatus = newQuantity <= 0 ? 'exhausted' : 'active';

      await tx
        .update(userItems)
        .set({ quantity: newQuantity, status: newStatus })
        .where(eq(userItems.id, userItemId));

      // ======== 业务副作用分发（按商品 metadata.action 扩展）========
      // switch (action) {
      //   case 'topic_pin': {
      //     // 置顶卡：将帖子置顶 N 天
      //     // 前端传入 targetType: 'topic', targetId: topicId
      //     // 置顶天数从 itemMeta.durationDays 读取
      //     const { targetId } = useData;
      //     if (!targetId) throw new Error('请指定要置顶的帖子');
      //     const days = itemMeta.durationDays || 7;
      //     await tx.update(topics)
      //       .set({ isPinned: true, pinnedUntil: new Date(Date.now() + days * 86400000) })
      //       .where(eq(topics.id, targetId));
      //     break;
      //   }
      //   case 'rename': {
      //     // 改名卡：修改用户名
      //     // 前端传入 metadata: { newUsername }
      //     const newName = useData.metadata?.newUsername;
      //     if (!newName) throw new Error('请提供新用户名');
      //     // TODO: 检查重名
      //     await tx.update(users)
      //       .set({ username: newName })
      //       .where(eq(users.id, userId));
      //     break;
      //   }
      //   case 'topic_highlight': {
      //     // 加精卡：帖子加精
      //     const { targetId } = useData;
      //     if (!targetId) throw new Error('请指定要加精的帖子');
      //     await tx.update(topics)
      //       .set({ isHighlighted: true })
      //       .where(eq(topics.id, targetId));
      //     break;
      //   }
      //   case 'double_points': {
      //     // 双倍积分卡（瞬时）：下一次签到积分 ×2
      //     await tx.update(users)
      //       .set({ doublePointsNext: true })
      //       .where(eq(users.id, userId));
      //     break;
      //   }
      //   default:
      //     // 通用消耗：只扣减数量+写日志，不执行额外副作用
      //     break;
      // }

      // 3. 写入使用日志
      const [log] = await tx
        .insert(userItemLogs)
        .values({
          userId,
          itemId: record.itemId,
          userItemId,
          action, // 从商品 metadata 读取
          targetType: useData.targetType || null,
          targetId: useData.targetId || null,
          quantityUsed: 1,
          status: 'completed',
          metadata: JSON.stringify({
            ...itemMeta,                  // 保留商品配置快照
            ...(useData.metadata || {}),  // 合并运行时参数
          }),
        })
        .returning();

      return {
        message: '使用成功',
        action,
        log,
        remainingQuantity: newQuantity,
      };
    });
  } catch (error) {
    console.error('[商城] 使用道具失败:', error);
    throw error;
  }
}

