/**
 * 奖励系统配置初始化 (已迁移至 Ledger Currency Config)
 */

import { userCheckIns, postRewards } from '../../extensions/rewards/schema.js';
import { eq } from 'drizzle-orm';

/**
 * 初始化奖励系统 (仅保留其他数据初始化，配置已移除)
 */
export async function initRewardConfigs(db, reset = false) {
  // Configs are now handled in Ledger init for 'credits' currency.
  return { total: 0, addedCount: 0, updatedCount: 0, skippedCount: 0 };
}

/**
 * 清空奖励系统数据
 * @param {import('drizzle-orm').NodePgDatabase} db
 */
export async function cleanRewards(db) {
  console.log('正在清空奖励系统数据...');

  await db.delete(postRewards);
  console.log('- 已清空帖子打赏 (postRewards)');

  await db.delete(userCheckIns);
  console.log('- 已清空用户签到 (userCheckIns)');


  return { success: true };
}
