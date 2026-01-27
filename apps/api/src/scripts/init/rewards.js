/**
 * 奖励系统配置初始化 (已迁移至 Ledger Currency Config)
 */

import { userCheckIns, postRewards } from '../../extensions/rewards/schema.js';
import { BaseSeeder } from './base.js';

export class RewardsSeeder extends BaseSeeder {
  constructor() {
    super('rewards');
  }

  /**
   * 初始化奖励系统 (仅保留其他数据初始化，配置已移除)
   */
  async init(db, reset = false) {
    // Configs are now handled in Ledger init for 'credits' currency.
    this.logger.success('奖励系统已由 Ledger 托管 (无需初始化)');
    return { total: 0, addedCount: 0, updatedCount: 0, skippedCount: 0 };
  }

  /**
   * 清空奖励系统数据
   * @param {import('drizzle-orm').NodePgDatabase} db
   */
  async clean(db) {
    this.logger.warn('正在清空奖励系统数据...');

    await db.delete(postRewards);
    this.logger.success('已清空帖子打赏 (postRewards)');

    await db.delete(userCheckIns);
    this.logger.success('已清空用户签到 (userCheckIns)');
  }
}
