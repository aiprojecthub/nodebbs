/**
 * 勋章系统初始化
 */

import { badges, userBadges } from '../../extensions/badges/schema.js';
import { eq } from 'drizzle-orm';
import { BaseSeeder } from './base.js';
import chalk from 'chalk';

/**
 * 默认勋章列表
 */
export const DEFAULT_BADGES = [
  // --- 注册时长 (Registration) ---
  {
    name: '初来乍到',
    slug: 'reg-7days',
    description: '注册满 7 天',
    iconUrl: 'https://placehold.co/300x300/e0e0e0/333333?text=7Days',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'registration_days', threshold: 7 }),
    displayOrder: 10,
    isActive: true,
  },
  {
    name: '满月礼',
    slug: 'reg-30days',
    description: '注册满 30 天',
    iconUrl: 'https://placehold.co/300x300/b0bec5/333333?text=30Days',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'registration_days', threshold: 30 }),
    displayOrder: 11,
    isActive: true,
  },
  {
    name: '老朋友',
    slug: 'reg-1year',
    description: '注册满 1 年',
    iconUrl: 'https://placehold.co/300x300/ffd700/333333?text=1Year',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'registration_days', threshold: 365 }),
    displayOrder: 12,
    isActive: true,
    metadata: JSON.stringify({ effects: { checkInBonus: 5 } }), // 签到额外+5
  },

  // --- 发帖数 (Posts) ---
  {
    name: '初试啼声',
    slug: 'post-1',
    description: '发布第 1 条回复',
    iconUrl: 'https://placehold.co/300x300/81c784/ffffff?text=Post1',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'post_count', threshold: 1 }),
    displayOrder: 20,
    isActive: true,
  },
  {
    name: '活跃分子',
    slug: 'post-100',
    description: '累计发布 100 条回复',
    iconUrl: 'https://placehold.co/300x300/4db6ac/ffffff?text=Post100',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'post_count', threshold: 100 }),
    displayOrder: 21,
    isActive: true,
  },
  {
    name: '妙语连珠',
    slug: 'post-1000',
    description: '累计发布 1000 条回复',
    iconUrl: 'https://placehold.co/300x300/009688/ffffff?text=Post1000',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'post_count', threshold: 1000 }),
    displayOrder: 22,
    isActive: true,
    metadata: JSON.stringify({ effects: { replyCostReductionPercent: 20 } }), // 回复消耗减免 20%
  },

  // --- 话题数 (Topics) ---
  {
    name: '抛砖引玉',
    slug: 'topic-1',
    description: '发布第 1 个话题',
    iconUrl: 'https://placehold.co/300x300/ffb74d/ffffff?text=Topic1',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'topic_count', threshold: 1 }),
    displayOrder: 30,
    isActive: true,
  },
  {
    name: '话题达人',
    slug: 'topic-50',
    description: '累计发布 50 个话题',
    iconUrl: 'https://placehold.co/300x300/ff9800/ffffff?text=Topic50',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'topic_count', threshold: 50 }),
    displayOrder: 31,
    isActive: true,
  },

  // --- 获赞数 (Likes Received) ---
  {
    name: '小有名气',
    slug: 'like-10',
    description: '累计获得 10 个赞',
    iconUrl: 'https://placehold.co/300x300/f06292/ffffff?text=Like10',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'like_received_count', threshold: 10 }),
    displayOrder: 40,
    isActive: true,
  },
  {
    name: '众星捧月',
    slug: 'like-100',
    description: '累计获得 100 个赞',
    iconUrl: 'https://placehold.co/300x300/e91e63/ffffff?text=Like100',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'like_received_count', threshold: 100 }),
    displayOrder: 41,
    isActive: true,
    metadata: JSON.stringify({ effects: { checkInBonus: 2 } }), // 签到额外+2
  },
  {
    name: '万众瞩目',
    slug: 'like-1000',
    description: '累计获得 1000 个赞',
    iconUrl: 'https://placehold.co/300x300/c2185b/ffffff?text=Like1000',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'like_received_count', threshold: 1000 }),
    displayOrder: 42,
    isActive: true,
    metadata: JSON.stringify({ effects: { checkInBonus: 10 } }), // 签到额外+10
  },

  // --- 连续签到 (Check-in Streak) ---
  {
    name: '坚持不懈',
    slug: 'streak-7',
    description: '连续签到 7 天',
    iconUrl: 'https://placehold.co/300x300/64b5f6/ffffff?text=Streak7',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'checkin_streak', threshold: 7 }),
    displayOrder: 50,
    isActive: true,
  },
  {
    name: '持之以恒',
    slug: 'streak-30',
    description: '连续签到 30 天',
    iconUrl: 'https://placehold.co/300x300/2196f3/ffffff?text=Streak30',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'checkin_streak', threshold: 30 }),
    displayOrder: 51,
    isActive: true,
    metadata: JSON.stringify({ effects: { checkInBonusPercent: 10 } }), // 签到加成 10%
  },
  {
    name: '意志如钢',
    slug: 'streak-100',
    description: '连续签到 100 天',
    iconUrl: 'https://placehold.co/300x300/1565c0/ffffff?text=Streak100',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'checkin_streak', threshold: 100 }),
    displayOrder: 52,
    isActive: true,
    metadata: JSON.stringify({ effects: { checkInBonusPercent: 30 } }), // 签到加成 30%
  },

  // --- 特殊 (Special) ---
  {
    name: '管理员认证',
    slug: 'admin-verified',
    description: '官方管理员特别认证',
    iconUrl: 'https://placehold.co/300x300/000000/ffd700?text=Admin',
    category: 'manual',
    unlockCondition: JSON.stringify({ type: 'manual' }),
    displayOrder: 99,
    isActive: true,
  },
];

export class BadgesSeeder extends BaseSeeder {
  constructor() {
    super('badges');
  }

  /**
   * 初始化勋章数据
   * @param {Object} db - Drizzle 数据库实例
   * @param {boolean} reset - 是否重置现有数据
   * @returns {Promise<{total: number, addedCount: number, updatedCount: number, skippedCount: number}>}
   */
  async init(db, reset = false) {
    this.logger.header('初始化勋章数据');

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const skippedBadges = [];
    for (const badge of DEFAULT_BADGES) {
      try {
        // 检查勋章是否已存在
        const [existing] = await db
          .select()
          .from(badges)
          .where(eq(badges.slug, badge.slug))
          .limit(1);

        if (existing) {
          if (reset) {
            // 重置模式：更新现有勋章
            await db
              .update(badges)
              .set({
                ...badge,
                updatedAt: new Date(),
              })
              .where(eq(badges.slug, badge.slug));
            updatedCount++;
            this.logger.success(`重置: ${badge.name} (${badge.slug})`);
          } else {
            // 非重置模式：跳过已存在的勋章
            skippedCount++;
            skippedBadges.push(badge.name);
          }
        } else {
          // 插入新勋章
          await db.insert(badges).values(badge);
          addedCount++;
          this.logger.success(`新增: ${badge.name}`);
        }
      } catch (error) {
        this.logger.error(`失败: ${badge.name}`, error);
      }
    }
    if (skippedBadges.length > 0) {
      this.logger.info(`跳过: ${skippedBadges.join(', ')} (已存在)`);
    }

    this.logger.summary({
      total: DEFAULT_BADGES.length,
      addedCount,
      updatedCount,
      skippedCount,
    });
    return {
      total: DEFAULT_BADGES.length,
      addedCount,
      updatedCount,
      skippedCount,
    };
  }

  /**
   * 列出所有默认勋章
   */
  async list() {
    this.logger.header('默认勋章列表');

    DEFAULT_BADGES.forEach((badge) => {
      this.logger.item(`${chalk.bold(badge.name)} (${badge.slug})`, '🎖️');
      this.logger.detail(`描述: ${badge.description}`);
      this.logger.detail(`类型: ${badge.category}`);
    });

    this.logger.divider();
    this.logger.result(`Total: ${DEFAULT_BADGES.length} badges`);
  }

  /**
   * 清空勋章相关数据
   * @param {import('drizzle-orm').NodePgDatabase} db
   */
  async clean(db) {
    this.logger.warn('正在清空勋章相关数据...');

    // 1. Delete user badges (dependent on badges)
    await db.delete(userBadges);
    this.logger.success('已清空用户勋章 (userBadges)');

    // 2. Delete badges
    await db.delete(badges);
    this.logger.success('已清空勋章 (badges)');
  }
}
