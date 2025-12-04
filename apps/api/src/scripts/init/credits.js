/**
 * 积分系统配置初始化
 */

import { creditSystemConfig } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * 积分系统默认配置
 */
export const DEFAULT_CREDIT_CONFIGS = [
  {
    key: 'system_enabled',
    value: 'true',
    valueType: 'boolean',
    description: '是否启用积分系统',
    category: 'general',
  },
  {
    key: 'check_in_base_amount',
    value: '10',
    valueType: 'number',
    description: '签到基础积分',
    category: 'earning',
  },
  {
    key: 'check_in_streak_bonus',
    value: '5',
    valueType: 'number',
    description: '连续签到额外奖励（每天）',
    category: 'earning',
  },
  {
    key: 'post_topic_amount',
    value: '5',
    valueType: 'number',
    description: '发布话题奖励',
    category: 'earning',
  },
  {
    key: 'post_reply_amount',
    value: '2',
    valueType: 'number',
    description: '发布回复奖励',
    category: 'earning',
  },
  {
    key: 'receive_like_amount',
    value: '1',
    valueType: 'number',
    description: '获得点赞奖励',
    category: 'earning',
  },
  {
    key: 'reward_min_amount',
    value: '1',
    valueType: 'number',
    description: '打赏最小金额',
    category: 'spending',
  },
  {
    key: 'reward_max_amount',
    value: '1000',
    valueType: 'number',
    description: '打赏最大金额',
    category: 'spending',
  },
  {
    key: 'invite_reward_amount',
    value: '50',
    valueType: 'number',
    description: '邀请新用户奖励',
    category: 'earning',
  },
];

/**
 * 配置分类名称
 */
export const CREDIT_CATEGORY_NAMES = {
  general: '通用设置',
  earning: '获取规则',
  spending: '消费规则',
};

/**
 * 按分类组织的配置
 */
export const CREDIT_CONFIGS_BY_CATEGORY = DEFAULT_CREDIT_CONFIGS.reduce(
  (acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  },
  {}
);

/**
 * 列出所有积分配置
 */
export function listCreditConfigs() {
  console.log('\n' + '='.repeat(80));
  console.log('积分系统配置');
  console.log('='.repeat(80) + '\n');

  Object.entries(CREDIT_CONFIGS_BY_CATEGORY).forEach(([category, configs]) => {
    console.log(`\n📦 ${CREDIT_CATEGORY_NAMES[category] || category}:\n`);
    configs.forEach((config) => {
      console.log(`  ${config.key}:`);
      console.log(`    值: ${config.value} (${config.valueType})`);
      console.log(`    描述: ${config.description}`);
      console.log();
    });
  });

  console.log('总计: ' + DEFAULT_CREDIT_CONFIGS.length + ' 个配置项\n');
}

/**
 * 初始化积分系统配置
 * @param {Object} db - Drizzle 数据库实例
 * @param {boolean} reset - 是否重置现有配置
 * @returns {Promise<{total: number, addedCount: number, updatedCount: number, skippedCount: number}>}
 */
export async function initCreditConfigs(db, reset = false) {
  console.log('📊 初始化积分系统配置...');

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const config of DEFAULT_CREDIT_CONFIGS) {
    try {
      // 检查配置是否已存在
      const [existing] = await db
        .select()
        .from(creditSystemConfig)
        .where(eq(creditSystemConfig.key, config.key))
        .limit(1);

      if (existing) {
        if (reset) {
          // 重置模式：更新现有配置
          await db
            .update(creditSystemConfig)
            .set({
              value: config.value,
              valueType: config.valueType,
              description: config.description,
              category: config.category,
              updatedAt: new Date(),
            })
            .where(eq(creditSystemConfig.key, config.key));
          updatedCount++;
          console.log(`  ✓ 重置: ${config.key}`);
        } else {
          // 非重置模式：跳过已存在的配置
          skippedCount++;
          console.log(`  - 跳过: ${config.key} (已存在)`);
        }
      } else {
        // 插入新配置
        await db.insert(creditSystemConfig).values(config);
        addedCount++;
        console.log(`  + 新增: ${config.key}`);
      }
    } catch (error) {
      console.error(`  ✗ 失败: ${config.key}`, error.message);
    }
  }

  return {
    total: DEFAULT_CREDIT_CONFIGS.length,
    addedCount,
    updatedCount,
    skippedCount,
  };
}
