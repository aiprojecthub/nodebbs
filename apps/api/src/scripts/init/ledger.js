/**
 * Ledger 系统初始化
 *用于初始化默认货币等
 */

import { sysCurrencies, sysAccounts, sysTransactions } from '../../extensions/ledger/schema.js';
import { eq } from 'drizzle-orm';

/**
 * 默认货币列表
 */
export const DEFAULT_CURRENCIES = [
  {
    code: 'credits',
    name: '积分',
    symbol: 'pts',
    precision: 0,
    isActive: true,
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

/**
 * 初始化 Ledger 系统 (货币)
 * @param {Object} db - Drizzle 数据库实例
 * @param {boolean} reset - 是否重置
 */
export async function initLedger(db, reset = false) {
  console.log('💰 初始化 Ledger 系统 (货币)...');

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

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
          console.log(`  ✓ 重置: ${currency.name} (${currency.code})`);
        } else {
          skippedCount++;
          console.log(`  - 跳过: ${currency.name} (${currency.code}) (已存在)`);
        }
      } else {
        await db.insert(sysCurrencies).values(currency);
        addedCount++;
        console.log(`  + 新增: ${currency.name} (${currency.code})`);
      }
    } catch (error) {
      console.error(`  ✗ 失败: ${currency.name}`, error.message);
    }
  }

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
export function listCurrencies() {
  console.log('\n' + '='.repeat(80));
  console.log('Ledger 系统货币');
  console.log('='.repeat(80) + '\n');
  
  DEFAULT_CURRENCIES.forEach(currency => {
    console.log(`  ${currency.name} (${currency.code}):`);
    console.log(`    符号: ${currency.symbol}`);
    console.log(`    精度: ${currency.precision}`);
    console.log(`    状态: ${currency.isActive ? '启用' : '禁用'}`);
    console.log();
  });
}

/**
 * 清空 Ledger 系统数据
 * @param {import('drizzle-orm').NodePgDatabase} db
 */
export async function cleanLedger(db) {
  console.log('正在清空 Ledger 系统数据...');

  await db.delete(sysTransactions);
  console.log('- 已清空系统交易 (sysTransactions)');

  await db.delete(sysAccounts);
  console.log('- 已清空系统账户 (sysAccounts)');

  await db.delete(sysCurrencies);
  console.log('- 已清空系统货币 (sysCurrencies)');

  return { success: true };
}
