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
import { DEFAULT_CURRENCY_CODE } from '../../ledger/constants.js';
import { users, userItems, shopItems } from '../../../db/schema.js';
import { eq, sql, desc, ilike, and, inArray, ne, count } from 'drizzle-orm';
import { getPassiveEffects } from '../../badges/services/badgeService.js';


/**
 * 获取用户签到状态 (只读，不存在则返回默认值)
 */
export async function getUserCheckInStatus(fastify, userId) {
  try {
    const cacheKey = `checkin:status:${userId}`;
    // 缓存 1 小时 (签到动作会清除此缓存)
    return await fastify.cache.remember(cacheKey, 3600, async () => {
      const [data] = await db
        .select()
        .from(userCheckIns)
        .where(eq(userCheckIns.userId, userId))
        .limit(1);

      if (!data) {
        // 如果没有记录，返回默认状态，不写入数据库
        return {
          userId,
          checkInStreak: 0,
          lastCheckInDate: null
        };
      }
      return data;
    });
  } catch (error) {
    // console.error('[签到数据] 获取失败:', error);
    throw error;
  }
}



/**
 * 每日签到
 */
export async function checkIn(fastify, userId) {
  const systemEnabled = await fastify.ledger.isCurrencyActive(DEFAULT_CURRENCY_CODE);
  if (!systemEnabled) throw new Error('奖励系统未启用');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 快速检查：从缓存判断今天是否已签到
  const cachedStatus = await getUserCheckInStatus(fastify, userId);
  if (cachedStatus.lastCheckInDate) {
    const lastDate = new Date(cachedStatus.lastCheckInDate);
    lastDate.setHours(0, 0, 0, 0);
    if (lastDate.getTime() === today.getTime()) {
      return { message: 'done' };
    }
  }

  // 1. 更新签到数据
  let result;

  // 如果缓存有记录（老用户），直接用缓存数据计算连胜并更新
  if (cachedStatus.lastCheckInDate) {
    const lastCheckIn = new Date(cachedStatus.lastCheckInDate);
    lastCheckIn.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const newStreak = lastCheckIn.getTime() === yesterday.getTime()
      ? cachedStatus.checkInStreak + 1
      : 1;

    await db.update(userCheckIns)
      .set({
        lastCheckInDate: new Date(),
        checkInStreak: newStreak,
      })
      .where(eq(userCheckIns.userId, userId));

    result = { status: 'updated', newStreak };
  } else {
    // 新用户首次签到
    try {
      await db.insert(userCheckIns)
        .values({
          userId,
          lastCheckInDate: new Date(),
          checkInStreak: 1
        });
      result = { status: 'updated', newStreak: 1 };
    } catch (err) {
      // 唯一键冲突意味着并发请求刚刚插入了记录，今天已签到
      if (err.code === '23505') {
        return { message: 'done' };
      }
      throw err;
    }
  }

  if (result.status === 'already_done') {
    return { message: 'done' };
  }

  // 2. 获取被动效果
  const effects = await getPassiveEffects(userId);

  // 3. 发放奖励 (Ledger)
  try {
    const baseAmount = await fastify.ledger.getCurrencyConfig(DEFAULT_CURRENCY_CODE, 'check_in_base_amount', 10);
    const streakBonus = await fastify.ledger.getCurrencyConfig(DEFAULT_CURRENCY_CODE, 'check_in_streak_bonus', 5);
      
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
      currencyCode: DEFAULT_CURRENCY_CODE,
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

    // 触发签到事件，用于徽章检查等
    if (fastify.eventBus) {
      fastify.eventBus.emit('user.checkin', { userId, streak: result.newStreak });
    }

    const currencyName = await fastify.ledger.getCurrencyName(DEFAULT_CURRENCY_CODE);
    return {
      amount: totalAmount,
      balance: tx.balanceAfter,
      checkInStreak: result.newStreak,
      message: `签到成功！获得 ${totalAmount} ${currencyName}${effectBonus > 0 ? ` (含徽章加成 ${effectBonus})` : ''}`,
    };

  } catch (error) {
    console.error('[奖励] 签到奖励发放失败 (连签更新后):', error);
    const currencyName = await fastify.ledger.getCurrencyName(DEFAULT_CURRENCY_CODE).catch(() => DEFAULT_CURRENCY_CODE);
    throw new Error(`签到成功但发放${currencyName}失败，请联系管理员`);
  } finally {
    await fastify.cache.invalidate(`checkin:status:${userId}`);
  }
}

/**
 * 获取帖子的打赏列表
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

    // 获取头像框（与之前相同）
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
        totalCount: count(),
      })
      .from(postRewards)
      .where(eq(postRewards.postId, postId));

    return {
      items: rewards,
      totalAmount: Number(stats?.totalAmount || 0),
      page,
      limit,
      total: stats?.totalCount || 0,
    };
  } catch (error) {
    console.error('[打赏] 列表查询失败:', error);
    throw error;
  }
}

/**
 * 获取积分排行榜 (查询 sysAccounts)
 */
export async function getCreditRanking(options = {}) {
  const { limit = 50, type = 'balance' } = options;

  try {
    const orderField = type === 'totalEarned' ? sysAccounts.totalEarned : sysAccounts.balance;

    const ranking = await db
      .select({
        userId: sysAccounts.userId,
        username: users.username,
        name: users.name,
        avatar: users.avatar,
        balance: sysAccounts.balance,
        totalEarned: sysAccounts.totalEarned,
      })
      .from(sysAccounts)
      .innerJoin(users, eq(sysAccounts.userId, users.id))
      .where(and(
        eq(sysAccounts.currencyCode, DEFAULT_CURRENCY_CODE),
        eq(users.isDeleted, false),
        ne(users.role, 'admin')
      ))
      .orderBy(desc(orderField))
      .limit(limit);

    return ranking;
  } catch (error) {
    console.error('[奖励] 积分排行查询失败:', error);
    throw error;
  }
}
