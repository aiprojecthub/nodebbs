/**
 * 广告位数据初始化
 */

import { adSlots, ads } from '../../extensions/ads/schema.js';
import { eq } from 'drizzle-orm';
import { BaseSeeder } from './base.js';
import chalk from 'chalk';

/**
 * 默认广告位列表
 */
export const DEFAULT_AD_SLOTS = [
  {
    code: 'home_header_banner',
    name: '首页顶部横幅',
    description: '显示在首页顶部的横幅广告位',
    width: 970,
    height: 90,
    maxAds: 1,
    isActive: true,
  },
  {
    code: 'home_footer_banner',
    name: '首页页脚上方横幅',
    description: '显示在首页页脚上方的横幅广告位',
    width: 970,
    height: 90,
    maxAds: 1,
    isActive: true,
  },
  {
    code: 'home_sidebar_top',
    name: '首页侧边栏顶部',
    description: '显示在首页侧边栏顶部的广告位',
    width: 300,
    height: 250,
    maxAds: 1,
    isActive: true,
  },
  {
    code: 'home_sidebar_bottom',
    name: '首页侧边栏底部',
    description: '显示在首页侧边栏底部的广告位',
    width: 300,
    height: 250,
    maxAds: 1,
    isActive: true,
  },
  {
    code: 'topic_list_inline',
    name: '首页话题列表内嵌',
    description: '显示在首页话题列表中间的广告位',
    width: 728,
    height: 90,
    maxAds: 1,
    isActive: true,
  },
  {
    code: 'topic_detail_top',
    name: '话题详情顶部',
    description: '显示在话题详情页顶部的广告位',
    width: 728,
    height: 90,
    maxAds: 1,
    isActive: true,
  },
  {
    code: 'topic_detail_bottom',
    name: '话题详情底部',
    description: '显示在话题详情页底部的广告位',
    width: 728,
    height: 90,
    maxAds: 1,
    isActive: true,
  },
  {
    code: 'topic_sidebar_top',
    name: '话题侧边栏顶部',
    description: '显示在话题详情页侧边栏顶部的广告位',
    width: 300,
    height: 250,
    maxAds: 1,
    isActive: true,
  },
  {
    code: 'topic_sidebar_bottom',
    name: '话题侧边栏底部',
    description: '显示在话题详情页侧边栏底部的广告位',
    width: 300,
    height: 250,
    maxAds: 1,
    isActive: true,
  },
];

export class AdsSeeder extends BaseSeeder {
  constructor() {
    super('ads');
  }

  /**
   * 初始化广告位数据
   * @param {Object} db - Drizzle 数据库实例
   * @param {boolean} reset - 是否重置现有数据
   */
  async init(db, reset = false) {
    this.logger.header('初始化广告位数据');

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const skippedSlots = [];
    for (const slot of DEFAULT_AD_SLOTS) {
      try {
        // 检查广告位是否已存在 (根据 code)
        const [existing] = await db
          .select()
          .from(adSlots)
          .where(eq(adSlots.code, slot.code))
          .limit(1);

        if (existing) {
          if (reset) {
            // 重置模式：更新广告位信息
            await db
              .update(adSlots)
              .set({
                ...slot,
                updatedAt: new Date(),
              })
              .where(eq(adSlots.id, existing.id));
            updatedCount++;
            this.logger.success(`重置: ${slot.name}`);
          } else {
            // 非重置模式：跳过
            skippedCount++;
            skippedSlots.push(slot.name);
          }
        } else {
          // 插入新广告位
          await db.insert(adSlots).values(slot);
          addedCount++;
          this.logger.success(`新增: ${slot.name}`);
        }
      } catch (error) {
        this.logger.error(`失败: ${slot.name}`, error);
      }
    }
    if (skippedSlots.length > 0) {
      this.logger.info(`跳过: ${skippedSlots.join(', ')} (已存在)`);
    }

    this.logger.summary({
      total: DEFAULT_AD_SLOTS.length,
      addedCount,
      updatedCount,
      skippedCount,
    });
    return {
      total: DEFAULT_AD_SLOTS.length,
      addedCount,
      updatedCount,
      skippedCount,
    };
  }

  /**
   * 列出所有默认广告位
   */
  async list() {
    this.logger.header('默认广告位');

    DEFAULT_AD_SLOTS.forEach((slot, index) => {
      this.logger.item(`${chalk.bold(slot.name)} (${slot.code})`, '📢');
      this.logger.detail(`描述: ${slot.description}`);
      this.logger.detail(`尺寸: ${slot.width} × ${slot.height}`);
      this.logger.detail(`最大广告数: ${slot.maxAds}`);
    });

    this.logger.divider();
    this.logger.result(`Total: ${DEFAULT_AD_SLOTS.length} ad slots`);
  }

  /**
   * 清空广告相关数据
   * @param {import('drizzle-orm').NodePgDatabase} db
   */
  async clean(db) {
    this.logger.warn('正在清空广告相关数据...');

    // 1. Delete ads (dependent on adSlots)
    await db.delete(ads);
    this.logger.success('已清空广告 (ads)');

    // 2. Delete ad slots
    await db.delete(adSlots);
    this.logger.success('已清空广告位 (adSlots)');
  }
}
