/**
 * 系统设置默认配置和初始化逻辑
 */

import { systemSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { 
  SETTING_KEYS, 
  SETTINGS_BY_CATEGORY, 
  CATEGORY_NAMES 
} from '../../config/systemSettings.js';

export {
  SETTING_KEYS,
  SETTINGS_BY_CATEGORY,
  CATEGORY_NAMES
};

/**
 * 初始化系统设置
 */
export async function initSystemSettings(db, reset = false) {
  const allSettings = Object.values(SETTING_KEYS);
  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const setting of allSettings) {
    const { key, defaultValue, valueType, description } = setting;
    
    // 注意：init 脚本中我们使用 defaultValue 作为初始 value
    const value = defaultValue;

    if (reset) {
      // 重置模式：删除后重新插入
      await db.delete(systemSettings).where(eq(systemSettings.key, key));
      await db.insert(systemSettings).values({
        key,
        value,
        valueType,
        description,
      });
      console.log(`🔄 重置配置: ${key} = ${value}`);
      updatedCount++;
    } else {
      // 默认模式：只添加缺失的配置
      // 先检查是否已存在
      const [existing] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);

      if (existing) {
        console.log(`⊙ 跳过配置: ${key} (已存在)`);
        skippedCount++;
      } else {
        // 不存在则插入
        await db.insert(systemSettings).values({
          key,
          value,
          valueType,
          description,
        });
        console.log(`✓ 添加配置: ${key} = ${value}`);
        addedCount++;
      }
    }
  }

  return { addedCount, updatedCount, skippedCount, total: allSettings.length };
}

/**
 * 列出系统设置配置
 */
export function listSystemSettings() {
  console.log('\n📋 系统配置列表\n');
  console.log('='.repeat(80));

  Object.entries(SETTINGS_BY_CATEGORY).forEach(([category, settings]) => {
    console.log(`\n${CATEGORY_NAMES[category] || category}:`);
    console.log('-'.repeat(80));

    settings.forEach((setting) => {
      console.log(`  ${setting.key}`);
      console.log(`    类型: ${setting.valueType}`);
      console.log(`    默认值: ${setting.defaultValue}`);
      console.log(`    描述: ${setting.description}`);
      console.log();
    });
  });

  console.log('='.repeat(80));
  console.log(`\n总计: ${Object.values(SETTING_KEYS).length} 个配置项\n`);
}
