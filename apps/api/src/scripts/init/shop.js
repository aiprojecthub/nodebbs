/**
 * 商城数据初始化
 */

import { shopItems, userItems } from '../../extensions/shop/schema.js';
import { eq, and } from 'drizzle-orm';
import { BaseSeeder } from './base.js';
import chalk from 'chalk';

/**
 * 默认商城商品列表
 */
export const DEFAULT_SHOP_ITEMS = [
  // --- 基础系列 (Basic Tier) - 100-500 积分 ---
  // {
  //   type: 'avatar_frame',
  //   name: '深海之蓝',
  //   description: '如深海般静谧的蓝色边框',
  //   price: 100,
  //   imageUrl: 'https://placehold.co/150x150/0000ff/ffffff?text=Blue',
  //   stock: null,
  //   isActive: true,
  //   displayOrder: 1,
  //   metadata: JSON.stringify({
  //     border: '3px solid #0066cc',
  //   })
  // },
  // {
  //   type: 'avatar_frame',
  //   name: '森林之语',
  //   description: '充满生机的绿色简约边框',
  //   price: 150,
  //   imageUrl: 'https://placehold.co/150x150/008000/ffffff?text=Green',
  //   stock: null,
  //   isActive: true,
  //   displayOrder: 2,
  //   metadata: JSON.stringify({
  //     border: '3px solid #4caf50',
  //   })
  // },
  // {
  //   type: 'avatar_frame',
  //   name: '经典黑金',
  //   description: '低调奢华的黑金配色',
  //   price: 500,
  //   imageUrl: 'https://placehold.co/150x150/000000/ffd700?text=BlackGold',
  //   stock: null,
  //   isActive: true,
  //   displayOrder: 3,
  //   metadata: JSON.stringify({
  //     border: '4px double #ffd700',
  //     shadow: '0 0 5px rgba(0,0,0,0.8)'
  //   })
  // },

  // --- 特效系列 (Effect Tier) - 800-1500 积分 ---
  // {
  //   type: 'avatar_frame',
  //   name: '赛博霓虹',
  //   description: '赛博朋克风格的呼吸灯效',
  //   price: 800,
  //   imageUrl: 'https://placehold.co/150x150/0ff/000?text=Neon',
  //   stock: null,
  //   isActive: true,
  //   displayOrder: 10,
  //   metadata: JSON.stringify({
  //     border: '2px solid #00ffea',
  //     shadow: '0 0 10px #00ffea, inset 0 0 5px #00ffea',
  //     animation: 'pulse'
  //   })
  // },
  // {
  //   type: 'avatar_frame',
  //   name: '熔岩脉动',
  //   description: '如同流动的岩浆，散发炽热光芒',
  //   price: 1000,
  //   imageUrl: 'https://placehold.co/150x150/ff4500/fff?text=Magma',
  //   stock: null,
  //   isActive: true,
  //   displayOrder: 11,
  //   metadata: JSON.stringify({
  //     borderWidth: 3,
  //     borderStyle: 'solid',
  //     borderColor: 'linear-gradient(45deg, #ff3300, #ff9900)',
  //     shadow: '0 0 15px #ff4500',
  //     animation: 'glow'
  //   })
  // },
  // {
  //   type: 'avatar_frame',
  //   name: '虚空行者',
  //   description: '神秘的紫色虚空能量',
  //   price: 1200,
  //   imageUrl: 'https://placehold.co/150x150/800080/fff?text=Void',
  //   stock: null,
  //   isActive: true,
  //   displayOrder: 12,
  //   metadata: JSON.stringify({
  //     border: '3px dashed #9c27b0',
  //     shadow: '0 0 10px #ba68c8',
  //     animation: 'spin'
  //   })
  // },

  // --- 尊贵系列 (Premium Tier) - 2000+ 积分 ---
  // {
  //   type: 'avatar_frame',
  //   name: '彩虹流光',
  //   description: '绚丽多彩的动态渐变光环',
  //   price: 2888,
  //   imageUrl: 'https://placehold.co/150x150/ff00ff/fff?text=Rainbow',
  //   stock: null,
  //   isActive: true,
  //   displayOrder: 20,
  //   metadata: JSON.stringify({
  //     borderWidth: 4,
  //     borderStyle: 'solid',
  //     borderColor: 'linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8)',
  //     animation: 'spin'
  //   })
  // },
  {
    type: 'avatar_frame',
    name: '神龙降世',
    description: '霸气金龙环绕 (图片演示)',
    price: 5000,
    imageUrl: 'https://placehold.co/150x150/d4af37/000?text=Dragon',
    stock: 10, // 限量
    isActive: true,
    displayOrder: 99,
    metadata: JSON.stringify({
      type: 'image',
      imageUrl: 'https://placehold.co/300x300/ffd700/000000?text=DragonFrame',
      scale: 1.45,
      yOffset: '-2px'
    })
  }
];

export class ShopSeeder extends BaseSeeder {
  constructor() {
    super('shop');
  }

  /**
   * 初始化商城数据
   * @param {Object} db - Drizzle 数据库实例
   * @param {boolean} reset - 是否重置现有数据
   */
  async init(db, reset = false) {
    this.logger.header('初始化商城数据');

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const skippedItems = [];
    for (const item of DEFAULT_SHOP_ITEMS) {
      try {
        // 检查商品是否已存在 (根据名称和类型)
        const [existing] = await db
          .select()
          .from(shopItems)
          .where(
              and(
                  eq(shopItems.name, item.name),
                  eq(shopItems.type, item.type)
              )
          )
          .limit(1);

        if (existing) {
          if (reset) {
            // 重置模式：更新商品信息
            await db
              .update(shopItems)
              .set({ ...item })
              .where(eq(shopItems.id, existing.id));
            updatedCount++;
            this.logger.success(`重置: ${item.name}`);
          } else {
            // 非重置模式：跳过
            skippedCount++;
            skippedItems.push(item.name);
          }
        } else {
          // 插入新商品
          await db.insert(shopItems).values(item);
          addedCount++;
          this.logger.success(`新增: ${item.name}`);
        }
      } catch (error) {
        this.logger.error(`失败: ${item.name}`, error);
      }
    }
    if (skippedItems.length > 0) {
      this.logger.info(`跳过: ${skippedItems.join(', ')} (已存在)`);
    }

    this.logger.summary({
      total: DEFAULT_SHOP_ITEMS.length,
      addedCount,
      updatedCount,
      skippedCount,
    });
    return {
      total: DEFAULT_SHOP_ITEMS.length,
      addedCount,
      updatedCount,
      skippedCount,
    };
  }

  /**
   * 列出商城商品
   */
  async list() {
    this.logger.header('默认商城商品列表');

    DEFAULT_SHOP_ITEMS.forEach((item) => {
      this.logger.item(`${chalk.bold(item.name)}`, '🛍️');
      this.logger.detail(`类型: ${item.type}`);
      this.logger.detail(`描述: ${item.description}`);
      this.logger.detail(`价格: ${item.price}`);
    });

    this.logger.divider();
    this.logger.result(`Total: ${DEFAULT_SHOP_ITEMS.length} shop items`);
  }

  /**
   * 清空商城相关数据
   * @param {import('drizzle-orm').NodePgDatabase} db
   */
  async clean(db) {
    this.logger.warn('正在清空商城相关数据...');

    // 1. Delete user items (dependent on shopItems)
    await db.delete(userItems);
    this.logger.success('已清空用户道具 (userItems)');

    // 2. Delete shop items
    await db.delete(shopItems);
    this.logger.success('已清空商城商品 (shopItems)');
  }
}
