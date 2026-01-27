/**
 * Ledger 系统初始化
 * 用于初始化默认货币等
 */

import { sysCurrencies, sysAccounts, sysTransactions } from '../../extensions/ledger/schema.js';
import { eq } from 'drizzle-orm';
import { DEFAULT_CURRENCY_CODE } from '../../extensions/ledger/constants.js';
import { BaseSeeder } from './base.js';
import chalk from 'chalk';

/**
 * 默认货币列表
 */
export const DEFAULT_CURRENCIES = [
  {
    code: DEFAULT_CURRENCY_CODE,
    name: '积分',
    symbol: 'pts',
    precision: 0,
    isActive: false,
    metadata: JSON.stringify({
      icon: 'coins',
      color: 'yellow',
    }),
    config: JSON.stringify({
      check_in_base_amount: { value: 10, description: '签到基础奖励' },
      check_in_streak_bonus: { value: 5, description: '连续签到每日递增奖励' },
      post_topic_amount: { value: 5, description: '发布话题奖励' },
      post_reply_amount: { value: 2, description: '发布回复的积分变动 (正数=奖励，负数=扣费)' },
      receive_like_amount: { value: 1, description: '获赞奖励' },
      reward_min_amount: { value: 1, description: '打赏最小金额' },
      reward_max_amount: { value: 1000, description: '打赏最大金额' },
      invite_reward_amount: { value: 50, description: '邀请新用户奖励' }
    })
  },
  {
    code: 'gold',
    name: '金币',
    symbol: 'g',
    precision: 2,
    isActive: false, // 默认不启用，作为示例
    metadata: JSON.stringify({
      icon: 'circle-dollar-sign',
      color: 'amber',
    }),
  },
];

export class LedgerSeeder extends BaseSeeder {
  constructor() {
    super('ledger');
  }

  /**
   * 初始化 Ledger 系统 (货币)
   * @param {Object} db - Drizzle 数据库实例
   * @param {boolean} reset - 是否重置
   */
  async init(db, reset = false) {
    this.logger.header('初始化 Ledger 系统 (货币)');

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const skippedCurrencies = [];
    for (const currency of DEFAULT_CURRENCIES) {
      try {
        const [existing] = await db
          .select()
          .from(sysCurrencies)
          .where(eq(sysCurrencies.code, currency.code))
          .limit(1);

        if (existing) {
          if (reset) {
            await db
              .update(sysCurrencies)
              .set({
                ...currency,
                updatedAt: new Date(),
              })
              .where(eq(sysCurrencies.code, currency.code));
            updatedCount++;
            this.logger.success(`重置: ${currency.name} (${currency.code})`);
          } else {
            skippedCount++;
            skippedCurrencies.push(`${currency.name} (${currency.code})`);
          }
        } else {
          await db.insert(sysCurrencies).values(currency);
          addedCount++;
          this.logger.success(`新增: ${currency.name} (${currency.code})`);
        }
      } catch (error) {
        this.logger.error(`失败: ${currency.name}`, error);
      }
    }
    if (skippedCurrencies.length > 0) {
      this.logger.info(`跳过: ${skippedCurrencies.join(', ')} (已存在)`);
    }

    this.logger.summary({
      total: DEFAULT_CURRENCIES.length,
      addedCount,
      updatedCount,
      skippedCount,
    });
    return {
      total: DEFAULT_CURRENCIES.length,
      addedCount,
      updatedCount,
      skippedCount,
    };
  }

  /**
   * 列出所有货币
   */
  async list() {
    this.logger.header('Ledger 系统货币');
    
    DEFAULT_CURRENCIES.forEach(currency => {
      this.logger.item(`${chalk.bold(currency.name)} (${currency.code}):`, '💰');
      this.logger.detail(`符号: ${currency.symbol}`);
      this.logger.detail(`精度: ${currency.precision}`);
      this.logger.detail(`状态: ${currency.isActive ? '启用' : '禁用'}`);
    });

    this.logger.divider();
    this.logger.result(`Total: ${DEFAULT_CURRENCIES.length} currencies`);
  }

  /**
   * 清空 Ledger 系统数据
   * @param {import('drizzle-orm').NodePgDatabase} db
   */
  async clean(db) {
    this.logger.warn('正在清空 Ledger 系统数据...');

    await db.delete(sysTransactions);
    this.logger.success('已清空系统交易 (sysTransactions)');

    await db.delete(sysAccounts);
    this.logger.success('已清空系统账户 (sysAccounts)');

    await db.delete(sysCurrencies);
    this.logger.success('已清空系统货币 (sysCurrencies)');
  }
}
