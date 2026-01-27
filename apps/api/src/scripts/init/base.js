/**
 * BaseSeeder - 所有 Seeder 的基类
 * 规范了所有 Seeder 的基本行为
 */
import { SeederLogger } from './logger.js';

export class BaseSeeder {
  /**
   * @param {string} key - Seeder 的唯一标识符 (e.g., 'settings', 'oauth')
   * @param {string[]} dependencies - 此 Seeder 依赖的其他 Seeder key 列表
   */
  constructor(key, dependencies = []) {
    if (!key) {
      throw new Error('Seeder key is required');
    }
    this.key = key;
    this.dependencies = dependencies;
    this.logger = new SeederLogger(key);
  }

  /**
   * 初始化数据
   * @param {import('drizzle-orm/node-postgres').NodePgDatabase} db - 数据库连接实例
   * @param {boolean} reset - 是否重置现有配置
   * @returns {Promise<{total: number, addedCount: number, updatedCount: number, skippedCount: number}>} - 统计信息
   */
  async init(db, reset = false) {
    throw new Error(`Seeder '${this.key}' must implement init() method`);
  }

  /**
   * 清理数据
   * @param {import('drizzle-orm/node-postgres').NodePgDatabase} db - 数据库连接实例
   */
  async clean(db) {
    console.warn(`Seeder '${this.key}' does not implement clean() method`);
  }

  /**
   * 列出当前配置
   */
  async list() {
    console.warn(`Seeder '${this.key}' does not implement list() method`);
  }
}
