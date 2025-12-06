import db from '../../../db/index.js';
import {
  shopItems,
  userItems,
  userCredits,
  creditTransactions,
} from '../../../db/schema.js';
import { eq, and, desc, sql, asc } from 'drizzle-orm';
import { grantBadge } from '../../badges/services/badgeService.js';

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
      .select({ count: sql`count(*)` })
      .from(shopItems);

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count }] = await countQuery;

    return {
      items,
      page,
      limit,
      total: Number(count),
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
      // TODO: 如果未来支持消耗品 (如改名卡)，需要调整此逻辑
      const [existingItem] = await tx
        .select()
        .from(userItems)
        .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)))
        .limit(1);

      if (existingItem) {
        throw new Error('您已经拥有该商品');
      }

      // 3. 检查用户积分余额
      let [credit] = await tx
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);

      if (!credit) {
        // 如果没有积分账户，尝试创建（通常在注册或首次访问积分中心时创建，这里做个兜底）
        [credit] = await tx
          .insert(userCredits)
          .values({ userId })
          .returning();
      }

      if (credit.balance < item.price) {
        throw new Error(`积分不足，需要 ${item.price} 积分`);
      }

      // 4. 扣除积分
      const newBalance = credit.balance - item.price;
      const newTotalSpent = credit.totalSpent + item.price;

      await tx
        .update(userCredits)
        .set({
          balance: newBalance,
          totalSpent: newTotalSpent,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));

      // 5. 记录交易日志
      await tx.insert(creditTransactions).values({
        userId,
        amount: -item.price,
        balance: newBalance,
        type: 'shop_purchase',
        relatedItemId: itemId,
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
          // 容错处理：防止 metadata 被双重 JSON 编码 (creates a string of a JSON string)
          let meta = item.metadata ? JSON.parse(item.metadata) : {};
          if (typeof meta === 'string') {
             try { meta = JSON.parse(meta); } catch (e) { /* ignore */ }
          }
          badgeId = meta.badgeId;
        } catch (e) {
          console.error('[商城] 解析勋章商品 metadata 失败', e);
        }

        if (badgeId) {
          // 调用 badgeService 授予勋章
           // 注意：这里我们是在 shop 的 transaction 中，但 grantBadge 内部目前可能也是独立事务或直接调用 db
           // 为了保持一致性，理想情况下 grantBadge 应该接受 tx 参数，但目前未重构 badgeService。
           // 鉴于 shop 事务主要保证积分扣除和库存记录，勋章授予如果失败（极少情况），
           // 也就是用户买了商品但没拿到勋章记录，可以通过重试解决。
           // 也可以选择在这里 await grantBadge，如果失败则抛出错误回滚整个交易。
           try {
             await grantBadge(userId, badgeId, 'shop_buy');
           } catch (err) {
             console.error('[商城] 授予勋章失败:', err);
             // 根据业务需求，这里可以选择抛出错误回滚，或者仅记录日志。
             // 考虑到用户花了钱，必须给东西，所以最好回滚。
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
            updatedAt: new Date(),
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
  const { page = 1, limit = 50, type = null, isEquipped = null } = options;
  const offset = (page - 1) * limit;

  try {
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
      })
      .from(userItems)
      .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
      .where(eq(userItems.userId, userId));

    if (type) {
      query = query.where(eq(shopItems.type, type));
    }

    if (isEquipped !== null) {
      query = query.where(eq(userItems.isEquipped, isEquipped));
    }

    const items = await query
      .orderBy(desc(userItems.isEquipped), desc(userItems.createdAt))
      .limit(limit)
      .offset(offset);

    // 总数
    let countQuery = db
      .select({ count: sql`count(*)` })
      .from(userItems)
      .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
      .where(eq(userItems.userId, userId));
    
    if (type) {
      countQuery = countQuery.where(eq(shopItems.type, type));
    }
    
    if (isEquipped !== null) {
      countQuery = countQuery.where(eq(userItems.isEquipped, isEquipped));
    }

    const [{ count }] = await countQuery;

    return {
      items,
      page,
      limit,
      total: Number(count),
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
      limit: 100, // Assume max 100 equipped items
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
      // 假设所有类型目前都是单一装备的 (一个用户只能有一个头像框，一个背景等)
      // 如果将来支持多装备 (如勋章可以佩戴多个)，需根据 type 修改逻辑
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

// ============= 管理员功能 =============

/**
 * 创建商品
 * @param {Object} data
 * @returns
 */
/**
 * 创建商品
 * @param {Object} data
 * @returns
 */
export async function createShopItem(data) {
  let metadata = data.metadata;
  // 防止 double-encoding: 如果已经是字符串 (来自 API 的 JSON string)，则直接存。
  // 如果是对象，则 stringify。
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
    // 如果是 null/空字符串，且不是 undefined，则保持原样或置空
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
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(shopItems.id, id))
    .returning();
  return item;
}

/**
 * 删除商品 (由于有关联交易，建议软删除，即下架)
 * 这里实现物理删除，如果有外键约束会报错，前端应提示先下架
 * 或者直接改为 toggle active 状态
 */
export async function deleteShopItem(id) {


  await db.delete(shopItems).where(eq(shopItems.id, id));
  return { message: '删除成功' };
}
