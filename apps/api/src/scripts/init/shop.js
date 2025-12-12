/**
 * 商城数据初始化
 */

import { shopItems, userItems } from '../../extensions/shop/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * 默认商城商品列表
 */
export const DEFAULT_SHOP_ITEMS = [
  {
    type: 'avatar_frame',
    name: '经典金边',
    description: '简约而不失高贵的金色边框',
    price: 100,
    imageUrl: 'https://placehold.co/300x300',
    stock: null,
    isActive: true,
    displayOrder: 1,
    metadata: JSON.stringify({
      border: '3px solid #FFD700',
      shadow: '0 0 8px rgba(255, 215, 0, 0.6)'
    })
  },
  {
    type: 'avatar_frame',
    name: '赛博霓虹',
    description: '充满未来感的青色呼吸灯效',
    price: 200,
    imageUrl: 'https://placehold.co/300x300',
    stock: null,
    isActive: true,
    displayOrder: 2,
    metadata: JSON.stringify({
      border: '2px solid #00ffea',
      shadow: '0 0 10px #00ffea, inset 0 0 5px #00ffea',
      animation: 'glow'
    })
  },
  {
    type: 'avatar_frame',
    name: '热烈红焰',
    description: '如火焰般跳动的红色光环',
    price: 300,
    imageUrl: 'https://placehold.co/300x300',
    stock: null,
    isActive: true,
    displayOrder: 3,
    metadata: JSON.stringify({
      border: '3px solid #ff4d4d',
      shadow: '0 0 12px #ff0000',
      animation: 'pulse'
    })
  },
  {
    type: 'avatar_frame',
    name: '旋转虚线',
    description: '动态旋转的紫色虚线框',
    price: 500,
    imageUrl: 'https://placehold.co/300x300',
    stock: null,
    isActive: true,
    displayOrder: 4,
    metadata: JSON.stringify({
      borderWidth: 3,
      borderStyle: 'dashed',
      borderColor: '#d946ef',
      animation: 'spin'
    })
  },
  {
    type: 'avatar_frame',
    name: '彩虹流光',
    description: '绚丽多彩的渐变边框',
    price: 888,
    imageUrl: 'https://placehold.co/300x300',
    stock: null,
    isActive: true,
    displayOrder: 5,
    metadata: JSON.stringify({
      borderWidth: 4,
      borderStyle: 'solid',
      borderColor: 'linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8)',
      animation: 'spin' 
    })
  },
  // 新增：图片头像框示例
  {
    type: 'avatar_frame',
    name: '神龙降世',
    description: '霸气的金色神龙环绕（图片演示）',
    price: 1500,
    imageUrl: 'https://placehold.co/300x300', // 仅作封面示意，实际框使用 metadata.imageUrl
    stock: null,
    isActive: true,
    displayOrder: 10,
    metadata: JSON.stringify({
      type: 'image',
      imageUrl: 'https://placehold.co/300x300', // 注：用户需替换为真实有效的 GIF/APNG 链接
      scale: 1.45,
      yOffset: '-2px'
    })
  },
  {
    type: 'avatar_frame',
    name: '故障艺术',
    description: '赛博朋克风格故障效果（混合模式演示）',
    price: 1200,
    imageUrl: 'https://placehold.co/300x300',
    stock: null,
    isActive: true,
    displayOrder: 11,
    metadata: JSON.stringify({
      type: 'image',
      imageUrl: 'https://placehold.co/300x300', // 需替换有效链接
      scale: 1.2,
      blendMode: 'screen' 
    })
  }
];

/**
 * 初始化商城数据
 * @param {Object} db - Drizzle 数据库实例
 * @param {boolean} reset - 是否重置现有数据
 */
export async function initShopItems(db, reset = false) {
  console.log('🛍️  初始化商城数据...');

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

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
            .set({
              ...item,
              updatedAt: new Date(),
            })
            .where(eq(shopItems.id, existing.id));
          updatedCount++;
          console.log(`  ✓ 重置: ${item.name}`);
        } else {
          // 非重置模式：跳过
          skippedCount++;
          console.log(`  - 跳过: ${item.name} (已存在)`);
        }
      } else {
        // 插入新商品
        await db.insert(shopItems).values(item);
        addedCount++;
        console.log(`  + 新增: ${item.name}`);
      }
    } catch (error) {
      console.error(`  ✗ 失败: ${item.name}`, error.message);
    }
  }

  return {
    total: DEFAULT_SHOP_ITEMS.length,
    addedCount,
    updatedCount,
    skippedCount,
  };
}

/**
 * 清空商城相关数据
 * @param {import('drizzle-orm').NodePgDatabase} db
 */
export async function cleanShopItems(db) {
  console.log('正在清空商城相关数据...');

  // 1. Delete user items (dependent on shopItems)
  await db.delete(userItems);
  console.log('- 已清空用户道具 (userItems)');

  // 2. Delete shop items
  await db.delete(shopItems);
  console.log('- 已清空商城商品 (shopItems)');

  return { success: true };
}
