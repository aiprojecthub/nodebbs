/**
 * 勋章系统初始化
 */

import { badges, userBadges } from '../../features/badges/schema.js';
import { eq } from 'drizzle-orm';

/**
 * 默认勋章列表
 */
export const DEFAULT_BADGES = [
  {
    name: '初露锋芒',
    slug: 'newcomer-poster',
    description: '累计发布 10 条回复',
    iconUrl: '/images/badges/newcomer-poster.png',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'post_count', threshold: 10 }),
    displayOrder: 1,
    isActive: true,
  },
  {
    name: '话题达人',
    slug: 'topic-starter',
    description: '累计发布 10 个话题',
    iconUrl: '/images/badges/topic-starter.png',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'topic_count', threshold: 10 }),
    displayOrder: 2,
    isActive: true,
  },
  {
    name: '人气之星',
    slug: 'popular-100likes',
    description: '累计获得 100 个赞',
    iconUrl: '/images/badges/popular-100likes.png',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'like_received_count', threshold: 100 }),
    displayOrder: 3,
    isActive: true,
  },
  {
    name: '签到强人',
    slug: 'checkin-30days',
    description: '连续签到 30 天',
    iconUrl: '/images/badges/checkin-30days.png',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'checkin_streak', threshold: 30 }),
    displayOrder: 4,
    isActive: true,
  },
  {
    name: '老朋友',
    slug: 'veteran-1year',
    description: '注册满 1 年',
    iconUrl: '/images/badges/veteran-1year.png',
    category: 'achievement',
    unlockCondition: JSON.stringify({ type: 'registration_days', threshold: 365 }),
    displayOrder: 5,
    isActive: true,
  },
  {
    name: '管理员认证',
    slug: 'admin-verified',
    description: '官方管理员特别认证',
    iconUrl: '/images/badges/admin-verified.png',
    category: 'manual',
    unlockCondition: JSON.stringify({ type: 'manual' }),
    displayOrder: 99,
    isActive: true,
  },
];

/**
 * 列出所有默认勋章
 */
export function listBadges() {
  console.log('\n' + '='.repeat(80));
  console.log('默认勋章列表');
  console.log('='.repeat(80) + '\n');

  DEFAULT_BADGES.forEach((badge) => {
    console.log(`🎖️ ${badge.name} (${badge.slug})`);
    console.log(`   描述: ${badge.description}`);
    console.log(`   类型: ${badge.category}`);
    console.log(`   条件: ${badge.unlockCondition}`);
    console.log();
  });

  console.log('总计: ' + DEFAULT_BADGES.length + ' 个勋章\n');
}

/**
 * 初始化勋章数据
 * @param {Object} db - Drizzle 数据库实例
 * @param {boolean} reset - 是否重置现有数据
 * @returns {Promise<{total: number, addedCount: number, updatedCount: number, skippedCount: number}>}
 */
export async function initBadges(db, reset = false) {
  console.log('🏅 初始化勋章数据...');

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

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
          console.log(`  ✓ 重置: ${badge.name} (${badge.slug})`);
        } else {
          // 非重置模式：跳过已存在的勋章
          skippedCount++;
          console.log(`  - 跳过: ${badge.name} (已存在)`);
        }
      } else {
        // 插入新勋章
        await db.insert(badges).values(badge);
        addedCount++;
        console.log(`  + 新增: ${badge.name}`);
      }
    } catch (error) {
      console.error(`  ✗ 失败: ${badge.name}`, error.message);
    }
  }

  return {
    total: DEFAULT_BADGES.length,
    addedCount,
    updatedCount,
    skippedCount,
  };
}

/**
 * 清空勋章相关数据
 * @param {import('drizzle-orm').NodePgDatabase} db
 */
export async function cleanBadges(db) {
  console.log('正在清空勋章相关数据...');

  // 1. Delete user badges (dependent on badges)
  await db.delete(userBadges);
  console.log('- 已清空用户勋章 (userBadges)');

  // 2. Delete badges
  await db.delete(badges);
  console.log('- 已清空勋章 (badges)');

  return { success: true };
}
