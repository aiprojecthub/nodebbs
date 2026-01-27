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
import { BaseSeeder } from './base.js';
import chalk from 'chalk';

export {
  SETTING_KEYS,
  SETTINGS_BY_CATEGORY,
  CATEGORY_NAMES
};

export class SettingsSeeder extends BaseSeeder {
  constructor() {
    super('settings');
  }

  /**
   * 初始化系统设置
   * @param {import('drizzle-orm/node-postgres').NodePgDatabase} db
   * @param {boolean} reset
   */
  async init(db, reset = false) {
    this.logger.header('初始化系统设置');
    const allSettings = Object.values(SETTING_KEYS);
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const skippedKeys = [];

    for (const setting of allSettings) {
      const { key, defaultValue, valueType, description } = setting;
      
      // 注意：init 脚本中我们使用 defaultValue 作为初始 value
      const value = defaultValue;

      // 检查是否已存在
      const [existing] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);

      if (existing) {
        if (reset) {
          // 重置模式：更新现有配置
          await db
            .update(systemSettings)
            .set({
              value,
              valueType,
              description,
            })
            .where(eq(systemSettings.id, existing.id));
          updatedCount++;
          this.logger.success(`重置配置: ${key} = ${value}`);
        } else {
          // 默认模式：跳过
          skippedKeys.push(key);
          skippedCount++;
        }
      } else {
        // 不存在则插入
        await db.insert(systemSettings).values({
          key,
          value,
          valueType,
          description,
        });
        this.logger.success(`添加配置: ${key} = ${value}`);
        addedCount++;
      }
    }

    if (skippedKeys.length > 0) {
      this.logger.info(`跳过配置: ${skippedKeys.join(', ')} (已存在)`);
    }

    this.logger.summary({ addedCount, updatedCount, skippedCount, total: allSettings.length });
    return { addedCount, updatedCount, skippedCount, total: allSettings.length };
  }

  /**
   * 列出系统设置配置
   */
  async list() {
    this.logger.header('系统配置列表');

    Object.entries(SETTINGS_BY_CATEGORY).forEach(([category, settings]) => {
      this.logger.subHeader(`${CATEGORY_NAMES[category] || category}:`);
      console.log(chalk.dim('-'.repeat(40)));

      settings.forEach((setting) => {
        this.logger.item(`${chalk.bold(setting.key)}`, '🔹');
        this.logger.detail(`Type: ${setting.valueType}`);
        this.logger.detail(`Default: ${setting.defaultValue}`);
        this.logger.detail(`Desc: ${setting.description}`);
      });
    });

    this.logger.divider();
    this.logger.result(`Total: ${Object.values(SETTING_KEYS).length} items`);
  }

  /**
   * 清空系统设置
   * @param {import('drizzle-orm').NodePgDatabase} db
   */
  async clean(db) {
    this.logger.warn('正在清空系统设置...');
    await db.delete(systemSettings);
    this.logger.success('已清空系统设置 (systemSettings)');
  }
}
