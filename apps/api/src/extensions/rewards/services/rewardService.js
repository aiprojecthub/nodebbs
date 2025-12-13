import db from '../../../db/index.js';
import {
  userCheckIns,
  postRewards,
} from '../schema.js';
import {
  sysAccounts,
  sysTransactions,
  sysCurrencies
} from '../../ledger/schema.js';
import { users, userItems, shopItems } from '../../../db/schema.js';
import { eq, sql, desc, ilike, and, inArray } from 'drizzle-orm';
import { getPassiveEffects } from '../../badges/services/badgeService.js';


/**
 * 获取或创建用户签到数据
 */
export async function getOrCreateUserCheckIn(userId) {
  try {
    let [data] = await db
      .select()
      .from(userCheckIns)
      .where(eq(userCheckIns.userId, userId))
      .limit(1);

    if (!data) {
      [data] = await db
        .insert(userCheckIns)
        .values({
          userId,
          checkInStreak: 0,
        })
        .returning();
    }
    return data;
  } catch (error) {
    // console.error('[签到数据] 获取或创建失败:', error);
    throw error;
  }
}

/**
 * 获取用户积分余额 (Delegates to Ledger)
 */
export async function getUserBalance(fastify, userId) {
  try {
    const account = await fastify.ledger.getAccount(userId, 'credits');
    return account.balance;
  } catch (error) {
    console.error('[奖励服务] 获取余额失败:', error);
    throw error;
  }
}

/**
 * 发放奖励 (Wrapper around Ledger Grant)
 */
export async function grantReward(fastify, {
  userId,
  amount,
  type, // 'check_in', 'post_topic', etc.
  description,
  relatedUserId,
  relatedTopicId,
  relatedPostId,
  metadata = {}
}) {
  const systemEnabled = await fastify.ledger.isCurrencyActive('credits');
  if (!systemEnabled) throw new Error('奖励系统未启用');

  const fullMetadata = {
    ...metadata,
    source: 'rewards-extension',
    relatedTopicId,
    relatedPostId,
    relatedUserId
  };

  return await fastify.ledger.grant({
    userId,
    amount,
    currencyCode: 'credits',
    type,
    referenceType: 'reward_event',
    referenceId: metadata.referenceId || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    description,
    metadata: fullMetadata
  });
}

/**
 * 扣除积分 (Wrapper around Ledger Deduct)
 */
export async function deductCredits(fastify, {
  userId,
  amount,
  type,
  description,
  relatedUserId,
  metadata = {}
}) {
  const systemEnabled = await fastify.ledger.isCurrencyActive('credits');
  if (!systemEnabled) throw new Error('奖励系统未启用');

  return await fastify.ledger.deduct({
    userId,
    amount,
    currencyCode: 'credits',
    type,
    referenceType: 'reward_event',
    referenceId: type + '_' + Date.now(),
    description,
    metadata
  });
}

/**
 * 转账积分 (Wrapper around Ledger Transfer)
 */
export async function transferCredits(fastify, {
  fromUserId,
  toUserId,
  amount,
  type,
  description,
  relatedPostId,
  metadata = {}
}) {
  const systemEnabled = await fastify.ledger.isCurrencyActive('credits');
  if (!systemEnabled) throw new Error('奖励系统未启用');

  const fullMetadata = {
    ...metadata,
    relatedPostId
  };

  return await fastify.ledger.transfer({
    fromUserId,
    toUserId,
    amount,
    currencyCode: 'credits',
    type,
    referenceType: 'reward_transfer',
    referenceId: type + '_' + Date.now(),
    description,
    metadata: fullMetadata
  });
}

/**
 * 每日签到
 */
export async function checkIn(fastify, userId) {
  // console.log('Starting CheckIn for user:', userId);
  const systemEnabled = await fastify.ledger.isCurrencyActive('credits');
  if (!systemEnabled) throw new Error('奖励系统未启用');

  // Need separate transaction for CheckIn Logic OR combine?
  // Since Ledger handles its own transaction, we risk atomicity if we split checkIn update and grant.
  // Ideally we should pass `tx` to Ledger. Since we can't properly do that without changing Ledger API (which we decided not to touch now),
  // we will execute CheckIn tracking FIRST. If it succeeds, we call Ledger.
  // If Ledger fails, we should ROLLBACK CheckIn.
  // But CheckIn committed.
  // So we must use nested transaction logic or simple sequence.
  // Best bet: Calculate everything, START transaction, update checkIn, then call Ledger.
  // But Ledger starts its own transaction.
  // Safe approach: Update checkIn first inside a transaction. Then outside transaction call Ledger.
  // If Ledger fails, user got a streak update but no money.
  // Retries? 
  // Acceptable for now.

  const effects = await getPassiveEffects(userId);

  // 1. Update Check-In Data (Transactional)
  const result = await db.transaction(async (tx) => {
      let [checkInData] = await tx
        .select()
        .from(userCheckIns)
        .where(eq(userCheckIns.userId, userId))
        .limit(1);

      if (!checkInData) {
        [checkInData] = await tx.insert(userCheckIns).values({ userId }).returning();
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInData.lastCheckInDate) {
        const lastCheckIn = new Date(checkInData.lastCheckInDate);
        lastCheckIn.setHours(0, 0, 0, 0);
        if (lastCheckIn.getTime() === today.getTime()) {
          return { status: 'already_done' };
        }
      }

      let newStreak = 1;
      if (checkInData.lastCheckInDate) {
        const lastCheckIn = new Date(checkInData.lastCheckInDate);
        lastCheckIn.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastCheckIn.getTime() === yesterday.getTime()) {
          newStreak = checkInData.checkInStreak + 1;
        }
      }

      await tx.update(userCheckIns)
        .set({
          lastCheckInDate: new Date(),
          checkInStreak: newStreak,
        })
        .where(eq(userCheckIns.userId, userId));
      
      return { status: 'updated', newStreak };
  });

  if (result.status === 'already_done') {
    return { message: 'done' };
  }

  // 2. Grant Reward (Ledger)
  try {
    const baseAmount = await fastify.ledger.getCurrencyConfig('credits', 'check_in_base_amount', 10);
    const streakBonus = await fastify.ledger.getCurrencyConfig('credits', 'check_in_streak_bonus', 5);
      
    let bonusAmount = Math.min(result.newStreak - 1, 6) * streakBonus;
    let effectBonus = 0;
    if (effects.checkInBonus) effectBonus += effects.checkInBonus;
    if (effects.checkInBonusPercent) {
      const baseTotal = baseAmount + bonusAmount;
      effectBonus += Math.floor(baseTotal * (effects.checkInBonusPercent / 100));
    }

    const totalAmount = baseAmount + bonusAmount + effectBonus;

    const tx = await fastify.ledger.grant({
      userId,
      amount: totalAmount,
      currencyCode: 'credits',
      type: 'check_in',
      referenceType: 'check_in',
      referenceId: new Date().toISOString().split('T')[0] + '_' + userId,
      description: `每日签到（连续${result.newStreak}天）`,
      metadata: {
        checkInStreak: result.newStreak,
        baseAmount,
        streakBonus: bonusAmount,
        effectBonus,
        appliedEffects: effects
      }
    });

    return {
      amount: totalAmount,
      balance: tx.balanceAfter,
      checkInStreak: result.newStreak,
      message: `签到成功！获得 ${totalAmount} 积分${effectBonus > 0 ? ` (含徽章加成 ${effectBonus} 分)` : ''}`,
    };

  } catch (error) {
    console.error('CheckIn Grant Failed after Streak Update:', error);
    // TODO: Rollback streak? Or just let user keep streak? Keeping streak is safer UX than losing streak + no money.
    // They can try again tomorrow? No, streak tracks "lastCheckInDate".
    // If we fail here, user "Checked in" but got no money.
    // Ideally we should fix this manually.
    throw new Error('签到成功但发放积分失败，请联系管理员');
  }
}

/**
 * 获取用户交易记录 (Query Ledger sysTransactions)
 */
export async function getUserTransactions(fastify, userId, options = {}) {
  const { page = 1, limit = 20, type = null } = options;
  const offset = (page - 1) * limit;

  try {
    // We only care about 'credits' currency for now in this view
    const conditions = [
      eq(sysTransactions.userId, userId),
      eq(sysTransactions.currencyCode, 'credits')
    ];

    if (type) {
      conditions.push(eq(sysTransactions.type, type));
    }

    const items = await db
      .select()
      .from(sysTransactions)
      .where(and(...conditions))
      .orderBy(desc(sysTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(sysTransactions)
      .where(and(...conditions));

    return {
      items,
      page,
      limit,
      total: Number(count),
    };
  } catch (error) {
    console.error('[交易记录] 查询失败:', error);
    throw error;
  }
}

/**
 * 获取所有交易记录 (Admin)
 */
export async function getAllTransactions(options = {}) {
  const { page = 1, limit = 20, type = null, userId = null, username = null } = options;
  const offset = (page - 1) * limit;

  try {
    let query = db
      .select({
        id: sysTransactions.id,
        userId: sysTransactions.userId,
        username: users.username,
        amount: sysTransactions.amount,
        balance: sysTransactions.balanceAfter, // balance_after
        type: sysTransactions.type,
        currency: sysTransactions.currencyCode,
        description: sysTransactions.description,
        createdAt: sysTransactions.createdAt,
        metadata: sysTransactions.metadata,
      })
      .from(sysTransactions)
      .innerJoin(users, eq(sysTransactions.userId, users.id))
      .where(eq(sysTransactions.currencyCode, 'credits')); // Default view credits

    const conditions = [eq(sysTransactions.currencyCode, 'credits')];

    if (userId) conditions.push(eq(sysTransactions.userId, userId));
    if (username) conditions.push(ilike(users.username, `%${username}%`));
    if (type) conditions.push(eq(sysTransactions.type, type));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const items = await query
      .orderBy(desc(sysTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    // Count logic ... simplified
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(sysTransactions)
      .innerJoin(users, eq(sysTransactions.userId, users.id)) // Join needed for username filter
      .where(and(...conditions));

    return {
      items,
      page,
      limit,
      total: Number(count),
    };
  } catch (error) {
    console.error('[所有交易记录] 查询失败:', error);
    throw error;
  }
}

/**
 * 获取帖子的打赏列表 (Uses postRewards table + sysTransactions via logic?)
 * Actually postRewards table stores the record of tipping.
 */
export async function getPostRewards(postId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  try {
    const rewards = await db
      .select({
        id: postRewards.id,
        amount: postRewards.amount,
        message: postRewards.message,
        createdAt: postRewards.createdAt,
        fromUserId: postRewards.fromUserId,
        fromUsername: users.username,
        fromUserAvatar: users.avatar,
      })
      .from(postRewards)
      .innerJoin(users, eq(postRewards.fromUserId, users.id))
      .where(eq(postRewards.postId, postId))
      .orderBy(desc(postRewards.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch frames (same as before)
    const userIds = [...new Set(rewards.map(r => r.fromUserId))];
    if (userIds.length > 0) {
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

      const frameMap = new Map(frames.map(f => [f.userId, f]));
      rewards.forEach(reward => {
        if (frameMap.has(reward.fromUserId)) {
          reward.userAvatarFrame = {
             itemMetadata: frameMap.get(reward.fromUserId).itemMetadata
          };
        }
      });
    }

    const [stats] = await db
      .select({
        totalAmount: sql`sum(${postRewards.amount})`,
        totalCount: sql`count(*)`,
      })
      .from(postRewards)
      .where(eq(postRewards.postId, postId));

    return {
      items: rewards,
      totalAmount: Number(stats?.totalAmount || 0),
      page,
      limit,
      total: Number(stats?.totalCount || 0),
    };
  } catch (error) {
    console.error('[打赏列表] 查询失败:', error);
    throw error;
  }
}

/**
 * 获取积分排行榜 (Query sysAccounts)
 */
export async function getCreditRanking(options = {}) {
  const { limit = 50, type = 'balance' } = options;

  try {
    const orderField = type === 'totalEarned' ? sysAccounts.totalEarned : sysAccounts.balance;

    const ranking = await db
      .select({
        userId: sysAccounts.userId,
        username: users.username,
        avatar: users.avatar,
        balance: sysAccounts.balance,
        totalEarned: sysAccounts.totalEarned,
        // checkInStreak: userCheckIns.checkInStreak // We need join with userCheckIns if we want streak
      })
      .from(sysAccounts)
      .innerJoin(users, eq(sysAccounts.userId, users.id))
      .where(and(
        eq(sysAccounts.currencyCode, 'credits'),
        eq(users.isDeleted, false)
      ))
      .orderBy(desc(orderField))
      .limit(limit);

    return ranking;
  } catch (error) {
    console.error('[积分排行] 查询失败:', error);
    throw error;
  }
}
