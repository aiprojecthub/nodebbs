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
 * 每日签到
 */
export async function checkIn(fastify, userId) {
  // console.log('Starting CheckIn for user:', userId);
  const systemEnabled = await fastify.ledger.isCurrencyActive('credits');
  if (!systemEnabled) throw new Error('奖励系统未启用');

  // 需要单独的事务处理签到逻辑还是合并？
  // 由于 Ledger 处理自己的事务，如果我们拆分 checkIn 更新和发放，会有原子性风险。
  // 理想情况下我们应该传递 `tx` 给 Ledger。由于我们不能在不更改 Ledger API（我们决定现在不碰它）的情况下正确做到这一点，
  // 我们将首先执行签到跟踪。如果成功，我们调用 Ledger。
  // 如果 Ledger 失败，我们应该回滚签到。
  // 但签到已经提交了。
  // 所以我们必须使用嵌套事务逻辑或简单的序列。
  // 最好的办法：计算所有内容，开始事务，更新 checkIn，然后调用 Ledger。
  // 但 Ledger 启动它自己的事务。
  // 安全的方法：首先在事务内更新 checkIn。然后在事务外调用 Ledger。
  // 如果 Ledger 失败，用户得到了连胜更新但没有钱。
  // 重试？
  // 目前可以接受。

  const effects = await getPassiveEffects(userId);

  // 1. 更新签到数据 (事务性)
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

  // 2. 发放奖励 (Ledger)
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
    // TODO: 回滚连胜？或者只是让用户保留连胜？保留连胜比失去连胜且没有积分的用户体验更安全。
    // 他们明天可以再试一次？不，连胜追踪的是 "lastCheckInDate"。
    // 如果我们在这里失败，用户“签到了”但没有拿到钱。
    // 理想情况下我们应该手动修复这个问题。
    throw new Error('签到成功但发放积分失败，请联系管理员');
  }
}

/**
 * 获取帖子的打赏列表 (使用 postRewards 表 + 通过逻辑关联 sysTransactions？)
 * 实际上 postRewards 表存储了打赏记录。
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
        avatar: users.avatar,
        balance: sysAccounts.balance,
        totalEarned: sysAccounts.totalEarned,
        // checkInStreak: userCheckIns.checkInStreak // 如果我们想要连胜数据，我们需要关联 userCheckIns 表
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
