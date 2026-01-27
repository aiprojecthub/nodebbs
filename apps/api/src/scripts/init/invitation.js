/**
 * 邀请规则默认配置和初始化逻辑
 */

import { invitationRules } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { BaseSeeder } from './base.js';
import chalk from 'chalk';

// 邀请规则默认配置
export const INVITATION_RULES = [
  {
    role: 'user',
    dailyLimit: 1,
    maxUsesPerCode: 1,
    expireDays: 30,
    pointsCost: 0,
    isActive: true,
  },
  {
    role: 'vip',
    dailyLimit: 5,
    maxUsesPerCode: 1,
    expireDays: 60,
    pointsCost: 0,
    isActive: true,
  },
  {
    role: 'moderator',
    dailyLimit: 20,
    maxUsesPerCode: 1,
    expireDays: 90,
    pointsCost: 0,
    isActive: true,
  },
  {
    role: 'admin',
    dailyLimit: 100,
    maxUsesPerCode: 1,
    expireDays: 365,
    pointsCost: 0,
    isActive: true,
  },
];

export class InvitationSeeder extends BaseSeeder {
  constructor() {
    super('invitation');
  }

  /**
   * 初始化邀请规则配置
   */
  async init(db, reset = false) {
    this.logger.header('初始化邀请规则配置');

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const skippedRules = [];
    for (const rule of INVITATION_RULES) {
      // 检查是否已存在
      const [existing] = await db
        .select()
        .from(invitationRules)
        .where(eq(invitationRules.role, rule.role))
        .limit(1);

      if (existing) {
        if (reset) {
          // 重置模式：更新现有配置
          await db
            .update(invitationRules)
            .set(rule)
            .where(eq(invitationRules.id, existing.id));
          updatedCount++;
          this.logger.success(`重置邀请规则: ${rule.role} (每日限制: ${rule.dailyLimit})`);
        } else {
          // 默认模式：跳过
          skippedRules.push(rule.role);
          skippedCount++;
        }
      } else {
        // 不存在则插入
        await db.insert(invitationRules).values(rule);
        this.logger.success(`添加邀请规则: ${rule.role} (每日限制: ${rule.dailyLimit})`);
        addedCount++;
      }
    }
    if (skippedRules.length > 0) {
      this.logger.info(`跳过邀请规则: ${skippedRules.join(', ')} (已存在)`);
    }

    this.logger.summary({ addedCount, updatedCount, skippedCount, total: INVITATION_RULES.length });
    return { addedCount, updatedCount, skippedCount, total: INVITATION_RULES.length };
  }

  /**
   * 列出邀请规则配置
   */
  async list() {
    this.logger.header('邀请规则配置');

    INVITATION_RULES.forEach((rule) => {
      this.logger.item(`${chalk.bold(rule.role)}`, '🎫');
      this.logger.detail(`每日限制: ${rule.dailyLimit}`);
      this.logger.detail(`每码使用次数: ${rule.maxUsesPerCode}`);
      this.logger.detail(`有效期: ${rule.expireDays} 天`);
    });
    
    this.logger.divider();
    this.logger.result(`Total: ${INVITATION_RULES.length} rules`);
  }

  /**
   * 清空邀请规则配置
   * @param {import('drizzle-orm').NodePgDatabase} db
   */
  async clean(db) {
    this.logger.warn('正在清空邀请规则配置...');
    await db.delete(invitationRules);
    this.logger.success('已清空邀请规则配置 (invitationRules)');
  }
}
