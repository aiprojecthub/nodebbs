import db from '../../../db/index.js';
import { shopItems, userItems, users } from '../../../db/schema.js';
import { eq, sql, and, desc } from 'drizzle-orm';
import { deductCredits } from '../services/creditService.js';

export default async function shopRoutes(fastify, options) {
  // ============ 用户端接口 ============

  // 获取商城商品列表
  fastify.get('/items', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['shop'],
      description: '获取商城商品列表',
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['avatar_frame', 'badge', 'custom'] },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { type, page = 1, limit = 20 } = request.query;
      const offset = (page - 1) * limit;

      let query = db
        .select()
        .from(shopItems)
        .where(eq(shopItems.isActive, true))
        .orderBy(shopItems.displayOrder, desc(shopItems.createdAt))
        .limit(limit)
        .offset(offset);

      if (type) {
        query = db
          .select()
          .from(shopItems)
          .where(and(eq(shopItems.isActive, true), eq(shopItems.type, type)))
          .orderBy(shopItems.displayOrder, desc(shopItems.createdAt))
          .limit(limit)
          .offset(offset);
      }

      const items = await query;

      // 获取总数
      let countQuery = db
        .select({ count: sql`count(*)` })
        .from(shopItems)
        .where(eq(shopItems.isActive, true));

      if (type) {
        countQuery = db
          .select({ count: sql`count(*)` })
          .from(shopItems)
          .where(and(eq(shopItems.isActive, true), eq(shopItems.type, type)));
      }

      const [{ count }] = await countQuery;

      return {
        items,
        page,
        limit,
        total: Number(count),
      };
    } catch (error) {
      fastify.log.error('[商城] 获取商品列表失败:', error);
      return reply.code(500).send({ error: '获取商品列表失败' });
    }
  });

  // 购买商品
  fastify.post('/items/:itemId/buy', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['shop'],
      description: '购买商品',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['itemId'],
        properties: {
          itemId: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { itemId } = request.params;
      const userId = request.user.id;

      // 验证商品存在且上架
      const [item] = await db
        .select()
        .from(shopItems)
        .where(eq(shopItems.id, itemId))
        .limit(1);

      if (!item) {
        return reply.code(404).send({ error: '商品不存在' });
      }

      if (!item.isActive) {
        return reply.code(400).send({ error: '商品已下架' });
      }

      // 检查库存
      if (item.stock !== null && item.stock <= 0) {
        return reply.code(400).send({ error: '商品库存不足' });
      }

      // 检查用户是否已拥有（某些商品可能需要唯一性检查）
      const [existingItem] = await db
        .select()
        .from(userItems)
        .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)))
        .limit(1);

      if (existingItem) {
        return reply.code(400).send({ error: '您已拥有该商品' });
      }

      // 使用事务处理购买
      return await db.transaction(async (tx) => {
        // 扣除积分
        await deductCredits({
          userId,
          amount: item.price,
          type: item.type === 'avatar_frame' ? 'buy_avatar_frame' :
                item.type === 'badge' ? 'buy_badge' : 'buy_item',
          relatedItemId: itemId,
          description: `购买商品：${item.name}`,
        });

        // 减少库存
        if (item.stock !== null) {
          await tx
            .update(shopItems)
            .set({ stock: sql`${shopItems.stock} - 1` })
            .where(eq(shopItems.id, itemId));
        }

        // 添加到用户物品
        const [userItem] = await tx
          .insert(userItems)
          .values({
            userId,
            itemId,
            isEquipped: false,
          })
          .returning();

        return {
          message: '购买成功',
          item: userItem,
        };
      });
    } catch (error) {
      if (error.message === '积分余额不足') {
        return reply.code(400).send({ error: '积分余额不足' });
      }
      fastify.log.error('[商城] 购买商品失败:', error);
      return reply.code(500).send({ error: '购买失败' });
    }
  });

  // 获取我的商品列表
  fastify.get('/my-items', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['shop'],
      description: '获取我的商品列表',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['avatar_frame', 'badge', 'custom'] },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { type } = request.query;
      const userId = request.user.id;

      let query = db
        .select({
          id: userItems.id,
          itemId: userItems.itemId,
          isEquipped: userItems.isEquipped,
          expiresAt: userItems.expiresAt,
          createdAt: userItems.createdAt,
          // 商品信息
          itemType: shopItems.type,
          itemName: shopItems.name,
          itemDescription: shopItems.description,
          itemImageUrl: shopItems.imageUrl,
          itemMetadata: shopItems.metadata,
        })
        .from(userItems)
        .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
        .where(eq(userItems.userId, userId))
        .orderBy(desc(userItems.createdAt));

      if (type) {
        query = db
          .select({
            id: userItems.id,
            itemId: userItems.itemId,
            isEquipped: userItems.isEquipped,
            expiresAt: userItems.expiresAt,
            createdAt: userItems.createdAt,
            // 商品信息
            itemType: shopItems.type,
            itemName: shopItems.name,
            itemDescription: shopItems.description,
            itemImageUrl: shopItems.imageUrl,
            itemMetadata: shopItems.metadata,
          })
          .from(userItems)
          .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
          .where(and(eq(userItems.userId, userId), eq(shopItems.type, type)))
          .orderBy(desc(userItems.createdAt));
      }

      const items = await query;

      return { items };
    } catch (error) {
      fastify.log.error('[商城] 获取我的商品失败:', error);
      return reply.code(500).send({ error: '获取失败' });
    }
  });

  // 获取指定用户装备的物品（公开接口）
  fastify.get('/users/:userId/equipped-items', {
    schema: {
      tags: ['shop'],
      description: '获取指定用户装备的物品',
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { userId } = request.params;

      const items = await db
        .select({
          id: userItems.id,
          itemId: userItems.itemId,
          isEquipped: userItems.isEquipped,
          expiresAt: userItems.expiresAt,
          createdAt: userItems.createdAt,
          // 商品信息
          itemType: shopItems.type,
          itemName: shopItems.name,
          itemDescription: shopItems.description,
          itemImageUrl: shopItems.imageUrl,
          itemMetadata: shopItems.metadata,
        })
        .from(userItems)
        .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
        .where(and(eq(userItems.userId, userId), eq(userItems.isEquipped, true)))
        .orderBy(desc(userItems.createdAt));

      return { items };
    } catch (error) {
      fastify.log.error('[商城] 获取用户装备物品失败:', error);
      return reply.code(500).send({ error: '获取失败' });
    }
  });

  // 装备商品
  fastify.post('/my-items/:userItemId/equip', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['shop'],
      description: '装备商品',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userItemId'],
        properties: {
          userItemId: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { userItemId } = request.params;
      const userId = request.user.id;

      // 验证物品存在且属于当前用户
      const [userItem] = await db
        .select({
          id: userItems.id,
          itemType: shopItems.type,
          expiresAt: userItems.expiresAt,
        })
        .from(userItems)
        .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
        .where(and(eq(userItems.id, userItemId), eq(userItems.userId, userId)))
        .limit(1);

      if (!userItem) {
        return reply.code(404).send({ error: '物品不存在' });
      }

      // 检查是否过期
      if (userItem.expiresAt && new Date(userItem.expiresAt) < new Date()) {
        return reply.code(400).send({ error: '物品已过期' });
      }

      return await db.transaction(async (tx) => {
        // 卸下同类型的其他物品（同一类型只能装备一个）
        await tx
          .update(userItems)
          .set({ isEquipped: false })
          .where(
            and(
              eq(userItems.userId, userId),
              sql`${userItems.id} IN (
                SELECT ui.id FROM user_items ui
                INNER JOIN shop_items si ON ui.item_id = si.id
                WHERE ui.user_id = ${userId}
                AND si.type = ${userItem.itemType}
                AND ui.is_equipped = true
              )`
            )
          );

        // 装备当前物品
        await tx
          .update(userItems)
          .set({ isEquipped: true })
          .where(eq(userItems.id, userItemId));

        return { message: '装备成功' };
      });
    } catch (error) {
      fastify.log.error('[商城] 装备物品失败:', error);
      return reply.code(500).send({ error: '装备失败' });
    }
  });

  // 卸下商品
  fastify.post('/my-items/:userItemId/unequip', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['shop'],
      description: '卸下商品',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userItemId'],
        properties: {
          userItemId: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { userItemId } = request.params;
      const userId = request.user.id;

      // 验证物品存在且属于当前用户
      const [userItem] = await db
        .select()
        .from(userItems)
        .where(and(eq(userItems.id, userItemId), eq(userItems.userId, userId)))
        .limit(1);

      if (!userItem) {
        return reply.code(404).send({ error: '物品不存在' });
      }

      // 卸下物品
      await db
        .update(userItems)
        .set({ isEquipped: false })
        .where(eq(userItems.id, userItemId));

      return { message: '卸下成功' };
    } catch (error) {
      fastify.log.error('[商城] 卸下物品失败:', error);
      return reply.code(500).send({ error: '卸下失败' });
    }
  });

  // ============ 管理员接口 ============

  // 获取所有商品（含下架）
  fastify.get('/admin/items', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['shop'],
      description: '获取所有商品（仅管理员）',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { page = 1, limit = 20 } = request.query;
      const offset = (page - 1) * limit;

      const items = await db
        .select()
        .from(shopItems)
        .orderBy(shopItems.displayOrder, desc(shopItems.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(shopItems);

      return {
        items,
        page,
        limit,
        total: Number(count),
      };
    } catch (error) {
      fastify.log.error('[商城管理] 获取商品列表失败:', error);
      return reply.code(500).send({ error: '获取失败' });
    }
  });

  // 创建商品
  fastify.post('/admin/items', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['shop'],
      description: '创建商品（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['type', 'name', 'price'],
        properties: {
          type: { type: 'string', enum: ['avatar_frame', 'badge', 'custom'] },
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          imageUrl: { type: 'string' },
          stock: { type: 'number', minimum: 0 },
          metadata: { type: 'string' },
          displayOrder: { type: 'number', default: 0 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { type, name, description, price, imageUrl, stock, metadata, displayOrder = 0 } = request.body;

      const [item] = await db
        .insert(shopItems)
        .values({
          type,
          name,
          description,
          price,
          imageUrl,
          stock,
          metadata,
          displayOrder,
          isActive: true,
        })
        .returning();

      return {
        message: '商品创建成功',
        item,
      };
    } catch (error) {
      fastify.log.error('[商城管理] 创建商品失败:', error);
      return reply.code(500).send({ error: '创建失败' });
    }
  });

  // 更新商品
  fastify.patch('/admin/items/:itemId', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['shop'],
      description: '更新商品（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['itemId'],
        properties: {
          itemId: { type: 'number' },
        },
      },
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['avatar_frame', 'badge', 'custom'] },
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          imageUrl: { type: 'string' },
          stock: { type: 'number', minimum: 0 },
          isActive: { type: 'boolean' },
          metadata: { type: 'string' },
          displayOrder: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { itemId } = request.params;
      const updates = request.body;

      // 验证商品存在
      const [item] = await db
        .select()
        .from(shopItems)
        .where(eq(shopItems.id, itemId))
        .limit(1);

      if (!item) {
        return reply.code(404).send({ error: '商品不存在' });
      }

      const [updated] = await db
        .update(shopItems)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(shopItems.id, itemId))
        .returning();

      return {
        message: '更新成功',
        item: updated,
      };
    } catch (error) {
      fastify.log.error('[商城管理] 更新商品失败:', error);
      return reply.code(500).send({ error: '更新失败' });
    }
  });

  // 删除商品
  fastify.delete('/admin/items/:itemId', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['shop'],
      description: '删除商品（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['itemId'],
        properties: {
          itemId: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { itemId } = request.params;

      // 验证商品存在
      const [item] = await db
        .select()
        .from(shopItems)
        .where(eq(shopItems.id, itemId))
        .limit(1);

      if (!item) {
        return reply.code(404).send({ error: '商品不存在' });
      }

      // 检查是否有用户拥有该商品
      const [userItemCount] = await db
        .select({ count: sql`count(*)` })
        .from(userItems)
        .where(eq(userItems.itemId, itemId));

      if (Number(userItemCount.count) > 0) {
        return reply.code(400).send({
          error: '无法删除，已有用户购买该商品',
          message: '建议下架商品而不是删除'
        });
      }

      await db.delete(shopItems).where(eq(shopItems.id, itemId));

      return { message: '删除成功' };
    } catch (error) {
      fastify.log.error('[商城管理] 删除商品失败:', error);
      return reply.code(500).send({ error: '删除失败' });
    }
  });
}
