import db from '../../../db/index.js';
import {
  userCredits,
  creditTransactions,
  creditSystemConfig,
  postRewards,
  users,
} from '../../../db/schema.js';
import { eq, sql, desc, ilike } from 'drizzle-orm';

/**
 * 获取积分系统配置
 * @param {string} key - 配置键
 * @param {*} defaultValue - 默认值
 * @returns {Promise<*>}
 */
export async function getCreditConfig(key, defaultValue = null) {
  try {
    const [config] = await db
      .select()
      .from(creditSystemConfig)
      .where(eq(creditSystemConfig.key, key))
      .limit(1);

    if (!config) {
      return defaultValue;
    }

    // 根据类型转换值
    switch (config.valueType) {
      case 'number':
        return parseFloat(config.value);
      case 'boolean':
        return config.value === 'true';
      case 'string':
      default:
        return config.value;
    }
  } catch (error) {
    console.error('[积分配置] 获取配置失败:', error);
    return defaultValue;
  }
}

/**
 * 检查积分系统是否启用
 * @returns {Promise<boolean>}
 */
export async function isCreditSystemEnabled() {
  return await getCreditConfig('system_enabled', false);
}

/**
 * 获取或创建用户积分账户
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>}
 */
export async function getOrCreateUserCredit(userId) {
  try {
    // 先尝试获取
    let [credit] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    // 如果不存在则创建
    if (!credit) {
      [credit] = await db
        .insert(userCredits)
        .values({
          userId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          checkInStreak: 0,
        })
        .returning();
    }

    return credit;
  } catch (error) {
    console.error('[积分账户] 获取或创建失败:', error);
    throw error;
  }
}

/**
 * 获取用户积分余额
 * @param {number} userId - 用户ID
 * @returns {Promise<number>}
 */
export async function getUserBalance(userId) {
  const credit = await getOrCreateUserCredit(userId);
  return credit.balance;
}

/**
 * 发放积分
 * @param {Object} params
 * @param {number} params.userId - 用户ID
 * @param {number} params.amount - 积分数量（正数）
 * @param {string} params.type - 交易类型
 * @param {number} [params.relatedUserId] - 关联用户ID
 * @param {number} [params.relatedTopicId] - 关联话题ID
 * @param {number} [params.relatedPostId] - 关联帖子ID
 * @param {number} [params.relatedItemId] - 关联商品ID
 * @param {string} [params.description] - 交易描述
 * @param {Object} [params.metadata] - 元数据
 * @returns {Promise<Object>} 返回交易记录
 */
export async function grantCredits({
  userId,
  amount,
  type,
  relatedUserId = null,
  relatedTopicId = null,
  relatedPostId = null,
  relatedItemId = null,
  description = null,
  metadata = null,
}) {
  // 检查系统是否启用
  const systemEnabled = await isCreditSystemEnabled();
  if (!systemEnabled) {
    throw new Error('积分系统未启用');
  }

  // 验证金额
  if (amount <= 0) {
    throw new Error('积分数量必须大于0');
  }

  try {
    return await db.transaction(async (tx) => {
      // 获取或创建用户积分账户
      const [credit] = await tx
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);

      let currentCredit = credit;
      if (!currentCredit) {
        [currentCredit] = await tx
          .insert(userCredits)
          .values({
            userId,
            balance: 0,
            totalEarned: 0,
            totalSpent: 0,
            checkInStreak: 0,
          })
          .returning();
      }

      // 计算新余额
      const newBalance = currentCredit.balance + amount;
      const newTotalEarned = currentCredit.totalEarned + amount;

      // 更新用户积分
      await tx
        .update(userCredits)
        .set({
          balance: newBalance,
          totalEarned: newTotalEarned,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));

      // 创建交易记录
      const [transaction] = await tx
        .insert(creditTransactions)
        .values({
          userId,
          amount,
          balance: newBalance,
          type,
          relatedUserId,
          relatedTopicId,
          relatedPostId,
          relatedItemId,
          description,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .returning();

      return transaction;
    });
  } catch (error) {
    console.error('[积分发放] 失败:', error);
    throw error;
  }
}

/**
 * 扣除积分
 * @param {Object} params - 与 grantCredits 参数相同
 * @returns {Promise<Object>} 返回交易记录
 */
export async function deductCredits({
  userId,
  amount,
  type,
  relatedUserId = null,
  relatedTopicId = null,
  relatedPostId = null,
  relatedItemId = null,
  description = null,
  metadata = null,
}) {
  // 检查系统是否启用
  const systemEnabled = await isCreditSystemEnabled();
  if (!systemEnabled) {
    throw new Error('积分系统未启用');
  }

  // 验证金额
  if (amount <= 0) {
    throw new Error('积分数量必须大于0');
  }

  try {
    return await db.transaction(async (tx) => {
      // 获取用户积分账户
      const [credit] = await tx
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);

      if (!credit) {
        throw new Error('用户积分账户不存在');
      }

      // 检查余额是否足够
      if (credit.balance < amount) {
        throw new Error('积分余额不足');
      }

      // 计算新余额
      const newBalance = credit.balance - amount;
      const newTotalSpent = credit.totalSpent + amount;

      // 更新用户积分
      await tx
        .update(userCredits)
        .set({
          balance: newBalance,
          totalSpent: newTotalSpent,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));

      // 创建交易记录（金额为负数）
      const [transaction] = await tx
        .insert(creditTransactions)
        .values({
          userId,
          amount: -amount, // 负数表示支出
          balance: newBalance,
          type,
          relatedUserId,
          relatedTopicId,
          relatedPostId,
          relatedItemId,
          description,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .returning();

      return transaction;
    });
  } catch (error) {
    console.error('[积分扣除] 失败:', error);
    throw error;
  }
}

/**
 * 转账积分（用于打赏等场景）
 * @param {Object} params
 * @param {number} params.fromUserId - 转出用户ID
 * @param {number} params.toUserId - 接收用户ID
 * @param {number} params.amount - 积分数量
 * @param {string} params.type - 交易类型
 * @param {number} [params.relatedPostId] - 关联帖子ID
 * @param {string} [params.description] - 交易描述
 * @param {Object} [params.metadata] - 元数据
 * @returns {Promise<Object>} 返回 { fromTransaction, toTransaction }
 */
export async function transferCredits({
  fromUserId,
  toUserId,
  amount,
  type,
  relatedPostId = null,
  description = null,
  metadata = null,
}) {
  // 检查系统是否启用
  const systemEnabled = await isCreditSystemEnabled();
  if (!systemEnabled) {
    throw new Error('积分系统未启用');
  }

  // 验证金额
  if (amount <= 0) {
    throw new Error('积分数量必须大于0');
  }

  // 不能转给自己
  if (fromUserId === toUserId) {
    throw new Error('不能转账给自己');
  }

  try {
    return await db.transaction(async (tx) => {
      // 获取转出方积分账户
      const [fromCredit] = await tx
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, fromUserId))
        .limit(1);

      if (!fromCredit) {
        throw new Error('转出方积分账户不存在');
      }

      // 检查余额
      if (fromCredit.balance < amount) {
        throw new Error('积分余额不足');
      }

      // 获取或创建接收方积分账户
      let [toCredit] = await tx
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, toUserId))
        .limit(1);

      if (!toCredit) {
        [toCredit] = await tx
          .insert(userCredits)
          .values({
            userId: toUserId,
            balance: 0,
            totalEarned: 0,
            totalSpent: 0,
            checkInStreak: 0,
          })
          .returning();
      }

      // 计算新余额
      const fromNewBalance = fromCredit.balance - amount;
      const toNewBalance = toCredit.balance + amount;

      // 更新转出方积分
      await tx
        .update(userCredits)
        .set({
          balance: fromNewBalance,
          totalSpent: fromCredit.totalSpent + amount,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, fromUserId));

      // 更新接收方积分
      await tx
        .update(userCredits)
        .set({
          balance: toNewBalance,
          totalEarned: toCredit.totalEarned + amount,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, toUserId));

      // 创建转出方交易记录
      const [fromTransaction] = await tx
        .insert(creditTransactions)
        .values({
          userId: fromUserId,
          amount: -amount,
          balance: fromNewBalance,
          type,
          relatedUserId: toUserId,
          relatedPostId,
          description: description || `转账给用户 ${toUserId}`,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .returning();

      // 创建接收方交易记录
      const [toTransaction] = await tx
        .insert(creditTransactions)
        .values({
          userId: toUserId,
          amount,
          balance: toNewBalance,
          type,
          relatedUserId: fromUserId,
          relatedPostId,
          description: description || `收到用户 ${fromUserId} 的转账`,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .returning();

      return { fromTransaction, toTransaction };
    });
  } catch (error) {
    console.error('[积分转账] 失败:', error);
    throw error;
  }
}

/**
 * 每日签到
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 返回 { amount, balance, checkInStreak, message }
 */
export async function checkIn(userId) {
  // 检查系统是否启用
  const systemEnabled = await isCreditSystemEnabled();
  if (!systemEnabled) {
    throw new Error('积分系统未启用');
  }

  try {
    return await db.transaction(async (tx) => {
      // 获取用户积分账户
      let [credit] = await tx
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);

      // 如果不存在则创建
      if (!credit) {
        [credit] = await tx
          .insert(userCredits)
          .values({
            userId,
            balance: 0,
            totalEarned: 0,
            totalSpent: 0,
            checkInStreak: 0,
          })
          .returning();
      }

      // 检查今天是否已签到
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (credit.lastCheckInDate) {
        const lastCheckIn = new Date(credit.lastCheckInDate);
        lastCheckIn.setHours(0, 0, 0, 0);

        if (lastCheckIn.getTime() === today.getTime()) {
          throw new Error('今天已经签到过了');
        }
      }

      // 计算连续签到天数
      let newStreak = 1;
      if (credit.lastCheckInDate) {
        const lastCheckIn = new Date(credit.lastCheckInDate);
        lastCheckIn.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastCheckIn.getTime() === yesterday.getTime()) {
          // 连续签到
          newStreak = credit.checkInStreak + 1;
        }
      }

      // 获取签到奖励配置
      const baseAmount = await getCreditConfig('check_in_base_amount', 10);
      const streakBonus = await getCreditConfig('check_in_streak_bonus', 5);

      // 计算奖励（基础+连续签到奖励）
      const bonusAmount = Math.min(newStreak - 1, 6) * streakBonus; // 最多7天额外奖励
      const totalAmount = baseAmount + bonusAmount;

      // 计算新余额
      const newBalance = credit.balance + totalAmount;
      const newTotalEarned = credit.totalEarned + totalAmount;

      // 更新用户积分
      await tx
        .update(userCredits)
        .set({
          balance: newBalance,
          totalEarned: newTotalEarned,
          lastCheckInDate: new Date(),
          checkInStreak: newStreak,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));

      // 创建交易记录
      await tx.insert(creditTransactions).values({
        userId,
        amount: totalAmount,
        balance: newBalance,
        type: 'check_in',
        description: `每日签到（连续${newStreak}天）`,
        metadata: JSON.stringify({
          checkInStreak: newStreak,
          baseAmount,
          bonusAmount,
        }),
      });

      return {
        amount: totalAmount,
        balance: newBalance,
        checkInStreak: newStreak,
        message: `签到成功！获得 ${totalAmount} 积分（连续签到${newStreak}天）`,
      };
    });
  } catch (error) {
    console.error('[签到] 失败:', error);
    throw error;
  }
}

/**
 * 获取用户交易记录
 * @param {number} userId - 用户ID
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码
 * @param {number} options.limit - 每页数量
 * @param {string} [options.type] - 交易类型筛选
 * @returns {Promise<Object>} 返回 { items, page, limit, total }
 */
export async function getUserTransactions(userId, options = {}) {
  const { page = 1, limit = 20, type = null } = options;
  const offset = (page - 1) * limit;

  try {
    let query = db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId));

    if (type) {
      query = query.where(eq(creditTransactions.type, type));
    }

    const items = await query
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取总数
    let countQuery = db
      .select({ count: sql`count(*)` })
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId));

    if (type) {
      countQuery = countQuery.where(eq(creditTransactions.type, type));
    }

    const [{ count }] = await countQuery;

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
 * 获取所有交易记录（管理员用）
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码
 * @param {number} options.limit - 每页数量
 * @param {string} [options.type] - 交易类型筛选
 * @param {number} [options.userId] - 用户ID筛选
 * @returns {Promise<Object>} 返回 { items, page, limit, total }
 */
export async function getAllTransactions(options = {}) {
  const { page = 1, limit = 20, type = null, userId = null, username = null } = options;
  const offset = (page - 1) * limit;

  try {
    let query = db
      .select({
        id: creditTransactions.id,
        userId: creditTransactions.userId,
        username: users.username,
        amount: creditTransactions.amount,
        balance: creditTransactions.balance,
        type: creditTransactions.type,
        description: creditTransactions.description,
        createdAt: creditTransactions.createdAt,
        metadata: creditTransactions.metadata,
      })
      .from(creditTransactions)
      .innerJoin(users, eq(creditTransactions.userId, users.id));

    if (userId) {
      query = query.where(eq(creditTransactions.userId, userId));
    }

    if (username) {
      query = query.where(ilike(users.username, `%${username}%`));
    }

    if (type) {
      query = query.where(eq(creditTransactions.type, type));
    }

    const items = await query
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取总数
    let countQuery = db
      .select({ count: sql`count(*)` })
      .from(creditTransactions);

    if (userId) {
      countQuery = countQuery.where(eq(creditTransactions.userId, userId));
    }

    if (username) {
      // 如果按用户名搜索，需要关联用户表来计算总数
      countQuery = countQuery
        .innerJoin(users, eq(creditTransactions.userId, users.id))
        .where(ilike(users.username, `%${username}%`));
    }

    if (type) {
      countQuery = countQuery.where(eq(creditTransactions.type, type));
    }

    const [{ count }] = await countQuery;

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
 * 获取帖子的打赏列表
 * @param {number} postId - 帖子ID
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码
 * @param {number} options.limit - 每页数量
 * @returns {Promise<Object>}
 */
export async function getPostRewards(postId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  try {
    // 获取分页数据
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

    // 获取总统计
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
 * 获取积分排行榜
 * @param {Object} options
 * @param {number} options.limit - 排名数量
 * @param {string} options.type - 排行类型 'balance' | 'totalEarned'
 * @returns {Promise<Array>}
 */
export async function getCreditRanking(options = {}) {
  const { limit = 50, type = 'balance' } = options;

  try {
    const orderField = type === 'totalEarned' ? userCredits.totalEarned : userCredits.balance;

    const ranking = await db
      .select({
        userId: userCredits.userId,
        username: users.username,
        avatar: users.avatar,
        balance: userCredits.balance,
        totalEarned: userCredits.totalEarned,
        checkInStreak: userCredits.checkInStreak,
      })
      .from(userCredits)
      .innerJoin(users, eq(userCredits.userId, users.id))
      .where(eq(users.isDeleted, false))
      .orderBy(desc(orderField))
      .limit(limit);

    return ranking;
  } catch (error) {
    console.error('[积分排行] 查询失败:', error);
    throw error;
  }
}
