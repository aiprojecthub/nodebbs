import db from '../../../db/index.js';
import { sysCurrencies, sysAccounts, sysTransactions } from '../schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { DEFAULT_CURRENCY_CODE } from '../constants.js';

/**
 * 账本服务
 * 处理所有货币交易，具有原子完整性。
 */
export class LedgerService {
  constructor(fastify) {
    this.fastify = fastify;
  }

  /**
   * 获取或创建用户的特定货币账户。
   * @param {number} userId 
   * @param {string} currencyCode 
   * @param {object} [tx] - 可选的事务上下文
   */
  async getAccount(userId, currencyCode, tx = db) {
    let [account] = await tx
      .select()
      .from(sysAccounts)
      .where(and(
        eq(sysAccounts.userId, userId),
        eq(sysAccounts.currencyCode, currencyCode)
      ))
      .limit(1);

    if (!account) {
      // 先检查货币是否存在以避免外键错误，还是让数据库处理？
      // 最好检查或信任应用逻辑。为了性能我们信任外键约束，但有效的货币检查是好的。
      // 目前假设货币存在，否则会抛出异常。
      try {
        [account] = await tx.insert(sysAccounts).values({
          userId,
          currencyCode,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0
        }).returning();
      } catch (err) {
        // 如果唯一约束失败，处理竞态条件
        if (err.code === '23505') { // unique_violation
          [account] = await tx
            .select()
            .from(sysAccounts)
            .where(and(
              eq(sysAccounts.userId, userId),
              eq(sysAccounts.currencyCode, currencyCode)
            ))
            .limit(1);
        } else {
          throw err;
        }
      }
    }
    return account;
  }

  /**
   * 授予用户货币（系统 -> 用户）。
   * @param {object} params
   * @param {number} params.userId
   * @param {number} params.amount
   * @param {string} params.currencyCode
   * @param {string} params.type
   * @param {string} params.referenceType
   * @param {string} params.referenceId
   * @param {string} [params.description]
   * @param {object} [params.metadata]
   */
  async grant({ userId, amount, currencyCode, type, referenceType, referenceId, description, metadata }) {
    if (amount <= 0) throw new Error('Grant amount must be positive');

    return await db.transaction(async (tx) => {
      const account = await this.getAccount(userId, currencyCode, tx);

      const newBalance = Number(account.balance) + amount;
      const newTotalEarned = Number(account.totalEarned) + amount;

      // 更新账户
      await tx.update(sysAccounts)
        .set({
          balance: newBalance,
          totalEarned: newTotalEarned,
          updatedAt: new Date()
        })
        .where(eq(sysAccounts.id, account.id));

      // 创建交易记录
      const [transaction] = await tx.insert(sysTransactions).values({
        userId,
        accountId: account.id,
        currencyCode,
        amount,
        balanceAfter: newBalance,
        type,
        referenceType,
        referenceId: String(referenceId),
        description,
        metadata: metadata ? JSON.stringify(metadata) : null
      }).returning();

      return transaction;
    });
  }

  /**
   * 从用户扣除货币（用户 -> 系统）。
   * @param {object} params
   * @param {number} params.userId
   * @param {number} params.amount
   * @param {string} params.currencyCode
   * @param {string} params.type
   * @param {string} params.referenceType
   * @param {string} params.referenceId
   * @param {string} [params.description]
   * @param {object} [params.metadata]
   * @param {boolean} [params.allowNegative=false]
   */
  async deduct({ userId, amount, currencyCode, type, referenceType, referenceId, description, metadata, allowNegative = false }) {
    if (amount <= 0) throw new Error('Deduct amount must be positive');

    return await db.transaction(async (tx) => {
      const account = await this.getAccount(userId, currencyCode, tx);

      if (!allowNegative && Number(account.balance) < amount) {
        throw new Error(`Insufficient funds. Balance: ${account.balance}, Required: ${amount}`);
      }

      const newBalance = Number(account.balance) - amount;
      const newTotalSpent = Number(account.totalSpent) + amount;

      await tx.update(sysAccounts)
        .set({
          balance: newBalance,
          totalSpent: newTotalSpent,
          updatedAt: new Date()
        })
        .where(eq(sysAccounts.id, account.id));

      const [transaction] = await tx.insert(sysTransactions).values({
        userId,
        accountId: account.id,
        currencyCode,
        amount: -amount, // 扣除为负数
        balanceAfter: newBalance,
        type,
        referenceType,
        referenceId: String(referenceId),
        description,
        metadata: metadata ? JSON.stringify(metadata) : null
      }).returning();

      return transaction;
    });
  }

  /**
   * 在用户之间转账货币（用户 A -> 用户 B）。
   * @param {object} params
   * @param {number} params.fromUserId
   * @param {number} params.toUserId
   * @param {number} params.amount
   * @param {string} params.currencyCode
   * @param {string} params.type
   * @param {string} params.referenceType
   * @param {string} params.referenceId
   * @param {string} [params.description]
   * @param {object} [params.metadata]
   */
  async transfer({ fromUserId, toUserId, amount, currencyCode, type, referenceType, referenceId, description, metadata }) {
    if (amount <= 0) throw new Error('Transfer amount must be positive');
    if (fromUserId === toUserId) throw new Error('Cannot transfer to self');

    return await db.transaction(async (tx) => {
      const fromAccount = await this.getAccount(fromUserId, currencyCode, tx);
      const toAccount = await this.getAccount(toUserId, currencyCode, tx);

      // 检查余额
      if (Number(fromAccount.balance) < amount) {
        throw new Error(`Insufficient funds. Balance: ${fromAccount.balance}, Required: ${amount}`);
      }

      // 更新来源账户
      const fromNewBalance = Number(fromAccount.balance) - amount;
      await tx.update(sysAccounts)
        .set({
          balance: fromNewBalance,
          totalSpent: Number(fromAccount.totalSpent) + amount,
          updatedAt: new Date()
        })
        .where(eq(sysAccounts.id, fromAccount.id));

      // 更新目标账户
      const toNewBalance = Number(toAccount.balance) + amount;
      await tx.update(sysAccounts)
        .set({
          balance: toNewBalance,
          totalEarned: Number(toAccount.totalEarned) + amount,
          updatedAt: new Date()
        })
        .where(eq(sysAccounts.id, toAccount.id));

      // 创建来源交易
      const [fromTx] = await tx.insert(sysTransactions).values({
        userId: fromUserId,
        accountId: fromAccount.id,
        currencyCode,
        amount: -amount,
        balanceAfter: fromNewBalance,
        type,
        referenceType,
        referenceId: String(referenceId),
        relatedUserId: toUserId,
        description: description || `Transfer to user ${toUserId}`,
        metadata: metadata ? JSON.stringify(metadata) : null
      }).returning();

      // 创建目标交易
      const [toTx] = await tx.insert(sysTransactions).values({
        userId: toUserId,
        accountId: toAccount.id,
        currencyCode,
        amount: amount,
        balanceAfter: toNewBalance,
        type,
        referenceType,
        referenceId: String(referenceId),
        relatedUserId: fromUserId,
        description: description || `Transfer from user ${fromUserId}`,
        metadata: metadata ? JSON.stringify(metadata) : null
      }).returning();

      return { fromTx, toTx };
    });
  }

  /**
   * 检查货币是否启用
   */
  async isCurrencyActive(currencyCode) {
    const [currency] = await db
      .select({ isActive: sysCurrencies.isActive })
      .from(sysCurrencies)
      .where(eq(sysCurrencies.code, currencyCode))
      .limit(1);
    return currency?.isActive ?? false;
  }

  /**
   * 获取货币配置
   * @param {string} currencyCode
   * @param {string} key 配置键名
   * @param {any} defaultValue 默认值
   */
  async getCurrencyConfig(currencyCode, key, defaultValue = null) {
    try {
      const [currency] = await db
        .select({ config: sysCurrencies.config })
        .from(sysCurrencies)
        .where(eq(sysCurrencies.code, currencyCode))
        .limit(1);

      if (!currency || !currency.config) return defaultValue;

      const config = JSON.parse(currency.config);
      const item = config[key];
      if (item === undefined) return defaultValue;

      // Handle both old format (direct value) and new format ({ value, description })
      if (item !== null && typeof item === 'object' && 'value' in item) {
          return item.value;
      }
      return item;
    } catch (error) {
      console.error(`[Ledger] Error parsing config for ${currencyCode}:`, error);
      return defaultValue;
    }
  }

  /**
   * 获取货币名称（带缓存）
   * @param {string} currencyCode - 货币代码，默认 DEFAULT_CURRENCY_CODE
   * @returns {Promise<string>} 货币名称
   */
  async getCurrencyName(currencyCode = DEFAULT_CURRENCY_CODE) {
    const cacheKey = `currency:name:${currencyCode}`;
    const ttl = 3600; // 缓存 1 小时

    try {
      return await this.fastify.cache.remember(cacheKey, ttl, async () => {
        const [currency] = await db
          .select({ name: sysCurrencies.name })
          .from(sysCurrencies)
          .where(eq(sysCurrencies.code, currencyCode))
          .limit(1);
        return currency?.name || currencyCode;
      });
    } catch (error) {
      console.error(`[Ledger] Error getting currency name for ${currencyCode}:`, error);
      return currencyCode;
    }
  }
}
