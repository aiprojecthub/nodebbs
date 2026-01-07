import db from '../../../db/index.js';
import { badges, userBadges } from '../schema.js';
import { userCheckIns } from '../../rewards/schema.js';
import { users, topics, posts, shopItems } from '../../../db/schema.js';
import { eq, and, sql, inArray } from 'drizzle-orm';

/**
 * 授予用户徽章
 * @param {string} userId - 用户 ID
 * @param {string} badgeId - 徽章 ID
 * @param {string} source - 徽章来源 (例如 'system', 'admin', 'event')
 * @returns {Promise<object>} 新授予的徽章记录
 */
export async function grantBadge(userId, badgeId, source = 'system') {
  // 检查是否已拥有
  const [existing] = await db
    .select()
    .from(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
    .limit(1);

  if (existing) {
    return { ...existing, isNew: false }; // 已拥有，标记为非新获取
  }

  const [granted] = await db
    .insert(userBadges)
    .values({
      userId,
      badgeId,
      source,
      earnedAt: new Date(),
    })
    .returning();

  return { ...granted, isNew: true }; // 新授予，标记为新获取
}

/**
 * 撤销用户的徽章
 * @param {string} userId - 用户 ID
 * @param {string} badgeId - 徽章 ID
 * @returns {Promise<boolean>} 是否成功撤销
 */
export async function revokeUserBadge(userId, badgeId) {
  const result = await db
    .delete(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
    .returning();
  
  return result.length > 0;
}

/**
 * 获取所有徽章（可选按类别筛选）
 * @param {Object} options
 * @param {number} options.page - 页码
 * @param {number} options.limit - 每页数量
 * @param {string} [options.category] - 按类别筛选
 * @param {boolean} [options.includeInactive] - 是否包含未激活的徽章 (默认: false)
 */
export async function getBadges(options = {}) {
  const { page = 1, limit = 20, category = null, includeInactive = false } = options;
  const offset = (page - 1) * limit;

  const conditions = [];
  
  if (!includeInactive) {
    conditions.push(eq(badges.isActive, true));
  }
  
  if (category) {
    conditions.push(eq(badges.category, category));
  }
  
  let query = db.select().from(badges);
  let countQuery = db.select({ count: sql`count(*)` }).from(badges);

  if (conditions.length > 0) {
    const condition = and(...conditions);
    query = query.where(condition);
    countQuery = countQuery.where(condition);
  }
  
  const items = await query
    .orderBy(badges.displayOrder)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await countQuery;
  
  return {
    items,
    page,
    limit,
    total: Number(count)
  };
}

/**
 * 获取用户拥有的徽章
 */
export async function getUserBadges(userId) {
  return await db
    .select({
      id: userBadges.id,
      earnedAt: userBadges.earnedAt,
      isDisplayed: userBadges.isDisplayed,
      badge: badges
    })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(and(eq(userBadges.userId, userId), eq(badges.isActive, true)))
    .orderBy(userBadges.displayOrder);
}

/**
 * 批量获取用户的徽章
 * @param {number[]} userIds 
 * @returns {Promise<Object>} Map of userId -> badges array
 */
export async function getUsersBadges(userIds) {
  if (!userIds || userIds.length === 0) return {};

  const result = await db
    .select({
      userId: userBadges.userId,
      id: userBadges.id,
      earnedAt: userBadges.earnedAt,
      isDisplayed: userBadges.isDisplayed,
      badge: badges
    })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(and(inArray(userBadges.userId, userIds), eq(badges.isActive, true)))
    .orderBy(userBadges.displayOrder);

  // Group by userId
  const map = {};
  userIds.forEach(id => map[id] = []);
  
  result.forEach(item => {
    if (map[item.userId]) {
      map[item.userId].push({
        id: item.id,
        earnedAt: item.earnedAt,
        isDisplayed: item.isDisplayed,
        badge: item.badge
      });
    }
  });

  return map;
}

/**
 * 创建新徽章
 */
export async function createBadge(data) {
  const [badge] = await db.insert(badges).values(data).returning();
  return badge;
}

/**
 * 更新徽章
 */
export async function updateBadge(id, data) {
  const [badge] = await db
    .update(badges)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(badges.id, id))
    .returning();
  return badge;
}

// ... existing code ...

/**
 * 检查并授予用户符合条件的徽章
 * @param {string} userId - 用户 ID
 */
export async function checkBadgeConditions(userId) {
  // 1. 获取用户统计信息
  const [user] = await db
    .select({
      id: users.id,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return;

  // 统计帖子数
  const [{ count: postCount }] = await db
    .select({ count: sql`count(*)` })
    .from(posts)
    .where(and(eq(posts.userId, userId), eq(posts.isDeleted, false)));

  // 统计话题数
  const [{ count: topicCount }] = await db
    .select({ count: sql`count(*)` })
    .from(topics)
    .where(and(eq(topics.userId, userId), eq(topics.isDeleted, false)));

  // 统计收到的点赞数 (用户帖子的点赞总和)
  const [{ sum: likeCount }] = await db
    .select({ sum: sql`sum(${posts.likeCount})` })
    .from(posts)
    .where(and(eq(posts.userId, userId), eq(posts.isDeleted, false)));

  // 获取签到连胜
  const [creditInfo] = await db
    .select({ streak: userCheckIns.checkInStreak })
    .from(userCheckIns)
    .where(eq(userCheckIns.userId, userId));
  const checkinStreak = creditInfo ? creditInfo.streak : 0;

  // 计算注册天数
  const daysRegistered = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));

  // 2. 获取所有激活的徽章
  const allBadges = await db
    .select()
    .from(badges)
    .where(eq(badges.isActive, true));

  // 3. 评估条件
  const newBadges = [];

  for (const badge of allBadges) {
    if (!badge.unlockCondition) continue;

    try {
      const condition = JSON.parse(badge.unlockCondition);
      let qualified = false;

      switch (condition.type) {
        case 'post_count':
          qualified = postCount >= (condition.threshold || 0);
          break;
        case 'topic_count':
          qualified = topicCount >= (condition.threshold || 0);
          break;
        case 'like_received_count':
          qualified = (Number(likeCount) || 0) >= (condition.threshold || 0);
          break;
        case 'checkin_streak':
          qualified = checkinStreak >= (condition.threshold || 0);
          break;
        case 'registration_days':
          qualified = daysRegistered >= (condition.threshold || 0);
          break;
        case 'manual':
        default:
          qualified = false;
      }

      if (qualified) {
        // 尝试授予徽章 (幂等)
        const result = await grantBadge(userId, badge.id, 'system_rule');
        if (result && result.isNew) {
           // 使用明确的 isNew 标记判断是否为新获取的徽章
           newBadges.push(badge);
        }
      }
    } catch (e) {
      console.error(`Failed to parse condition for badge ${badge.id}:`, e);
    }
  }

  return newBadges;
}

/**
 * 删除徽章
 */
export async function deleteBadge(id) {
  // 1. 查找可能关联此徽章的商店商品
  // 获取所有激活的徽章类型商品并检查其元数据
  const allBadgeItems = await db
    .select()
    .from(shopItems)
    .where(and(eq(shopItems.type, 'badge'), eq(shopItems.isActive, true)));

  const itemsToDisable = [];
  for (const item of allBadgeItems) {
    try {
      if (!item.metadata) continue;
      let meta = item.metadata;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch (e) { /* ignore */ }
      }
      // 以防万一，验证双重编码
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch (e) { /* ignore */ }
      }

      if (meta && (meta.badgeId === id || meta.badgeId === Number(id))) {
        itemsToDisable.push(item.id);
      }
    } catch (e) {
      // ignore parse error
    }
  }

  // 2. 禁用相关商品 (软禁用)
  if (itemsToDisable.length > 0) {
    await db
      .update(shopItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(sql`${shopItems.id} IN ${itemsToDisable}`);
  }

  // 3. 删除徽章 (级联删除将处理 user_badges)
  await db.delete(badges).where(eq(badges.id, id));
  return true;
}

/**
 * 获取用户所有被动效果
 * @param {number} userId
 * @returns {Promise<Object>} { checkInBonus: 0, checkInBonusPercent: 0, replyCostReductionPercent: 0, ... }
 */
export async function getPassiveEffects(userId) {
  try {
    // 1. 获取用户拥有的所有徽章
    const userBadgeList = await getUserBadges(userId);
    
    // 2. 初始化效果汇总
    const effects = {
      checkInBonus: 0, // 签到额外固定积分
      checkInBonusPercent: 0, // 签到额外百分比
      replyCostReductionPercent: 0, // 回复消耗减免百分比
    };

    // 3. 遍历徽章计算效果
    for (const item of userBadgeList) {
      const badge = item.badge;
      if (!badge.isActive) continue;

      // 解析元数据中的 effects 字段
      // 假设结构: metadata: { effects: { checkInBonus: 10, ... } }
      try {
        if (!badge.metadata) continue;
        
        const metadata = typeof badge.metadata === 'string' 
          ? JSON.parse(badge.metadata) 
          : badge.metadata;

        if (metadata.effects) {
          const badgeEffects = metadata.effects;
          
          if (badgeEffects.checkInBonus) {
            effects.checkInBonus += Number(badgeEffects.checkInBonus) || 0;
          }
          if (badgeEffects.checkInBonusPercent) {
            effects.checkInBonusPercent += Number(badgeEffects.checkInBonusPercent) || 0;
          }
          if (badgeEffects.replyCostReductionPercent) {
            effects.replyCostReductionPercent += Number(badgeEffects.replyCostReductionPercent) || 0;
          }
        }
      } catch (e) {
        console.warn(`Badge ${badge.id} metadata parse error:`, e);
      }
    }

    // 限制百分比上限 (例如减免不能超过 100%)
    if (effects.replyCostReductionPercent > 100) effects.replyCostReductionPercent = 100;

    return effects;
  } catch (error) {
    console.error('[Badge] Get passive effects failed:', error);
    return {};
  }
}

