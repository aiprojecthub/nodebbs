import {
  getShopItems,
  getShopItemById,
  buyItem,
  getUserItems,
  getUserEquippedItems,
  equipItem,
  unequipItem,
  createShopItem,
  updateShopItem,
  deleteShopItem,
  giftItem,
  getEquippedAvatarFrame,
  useItem,
} from '../services/shopService.js';
import db from '../../../db/index.js';
import { users } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function shopRoutes(fastify, options) {
  // ============ 公开/用户接口 ============

  // 获取商店商品列表 (RESTful: GET /shop/items)
  fastify.get('/items', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['shop'],
      description: '获取商店商品列表',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          type: { type: 'string' },
          includeInactive: { type: 'boolean' }
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { page, limit, type, includeInactive: includeInactiveParam } = request.query;
      
      const canManage = await fastify.permission.can(request, 'dashboard.extensions');
      const includeInactive = canManage && (includeInactiveParam === true || includeInactiveParam === 'true');
      
      // 传递当前用户 ID 用于查询 ownership
      const userId = request.user?.id || null;
      const result = await getShopItems({ page, limit, type, includeInactive, userId });
      return result;
    } catch (error) {
      fastify.log.error('[商城] 获取商品列表失败:', error);
      return reply.code(500).send({ error: '查询失败' });
    }
  });

  // 获取单个商品详情
  fastify.get('/items/:itemId', {
    schema: {
      tags: ['shop'],
      description: '获取单个商品详情',
      params: {
        type: 'object',
        required: ['itemId'],
        properties: {
          itemId: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { itemId } = request.params;
      const item = await getShopItemById(itemId);
      if (!item) {
        return reply.code(404).send({ error: '商品不存在' });
      }
      return item;
    } catch (error) {
      fastify.log.error('[商城] 获取商品详情失败:', error);
      return reply.code(500).send({ error: '查询失败' });
    }
  });

  // 创建商品 (Admin Only: POST /shop/items)
  fastify.post('/items', {
    preHandler: [fastify.requirePermission('dashboard.extensions')],
    schema: {
      tags: ['shop', 'admin'],
      description: '创建商品（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'price', 'type'],
        properties: {
          name: { type: 'string', maxLength: 100 },
          description: { type: 'string' },
          price: { type: 'integer', minimum: 0 },
          type: { type: 'string' },
          consumeType: { type: 'string', enum: ['non_consumable', 'consumable'] },
          imageUrl: { type: 'string' },
          stock: { type: ['integer', 'null'], minimum: 0 },
          maxOwn: { type: ['integer', 'null'], minimum: 1 },
          isActive: { type: 'boolean' },
          displayOrder: { type: 'integer' },
          metadata: { type: 'string' },
          currencyCode: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const item = await createShopItem(request.body);
      return item;
    } catch (error) {
      fastify.log.error('[商城管理] 创建商品失败:', error);
      return reply.code(500).send({ error: '创建失败' });
    }
  });

  // 更新商品 (Admin Only: PATCH /shop/items/:itemId)
  fastify.patch('/items/:itemId', {
    preHandler: [fastify.requirePermission('dashboard.extensions')],
    schema: {
      tags: ['shop', 'admin'],
      description: '更新商品（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['itemId'],
        properties: {
          itemId: { type: 'integer' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'integer', minimum: 0 },
          type: { type: 'string' },
          consumeType: { type: 'string', enum: ['non_consumable', 'consumable'] },
          imageUrl: { type: 'string' },
          stock: { type: ['integer', 'string', 'null'] },
          maxOwn: { type: ['integer', 'string', 'null'] },
          isActive: { type: 'boolean' },
          displayOrder: { type: 'integer' },
          metadata: { type: 'string' },
          currencyCode: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { itemId } = request.params;
      const item = await updateShopItem(itemId, request.body);
      return item;
    } catch (error) {
      fastify.log.error('[商城管理] 更新商品失败:', error);
      return reply.code(500).send({ error: '更新失败' });
    }
  });

  // 删除商品 (Admin Only: DELETE /shop/items/:itemId)
  fastify.delete('/items/:itemId', {
    preHandler: [fastify.requirePermission('dashboard.extensions')],
    schema: {
      tags: ['shop', 'admin'],
      description: '删除商品（仅创始人）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['itemId'],
        properties: {
          itemId: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // 检查是否是第一个管理员（创始人）
      const [firstAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .orderBy(users.createdAt)
        .limit(1);

      if (!firstAdmin || firstAdmin.id !== request.user.id) {
        return reply.code(403).send({ error: '只有创始人（第一个管理员）可以删除商品' });
      }

      const { itemId } = request.params;
      const result = await deleteShopItem(itemId);
      return result;
    } catch (error) {
      fastify.log.error('[商城管理] 删除商品失败:', error);
      return reply.code(500).send({ error: '删除失败' });
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
          itemId: { type: 'integer' },
        },
      },
      body: {
        type: 'object',
        properties: {
          quantity: { type: 'integer', minimum: 1, maximum: 99, default: 1 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { itemId } = request.params;
      const quantity = request.body?.quantity || 1;
      const result = await buyItem(request.user.id, itemId, quantity);
      return result;
    } catch (error) {
      if (error.message.includes('余额不足') || error.message.includes('已经拥有') || error.message.includes('库存不足') || error.message.includes('持有上限') || error.message.includes('最多还能') || error.message.includes('非消耗品')) {
        return reply.code(400).send({ error: error.message });
      }
      fastify.log.error('[商城] 购买失败:', error);
      return reply.code(500).send({ error: '购买失败' });
    }

  });

  // 赠送商品
  fastify.post('/items/:itemId/gift', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['shop'],
      description: '赠送商品',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['itemId'],
        properties: {
          itemId: { type: 'integer' },
        },
      },
      body: {
        type: 'object',
        required: ['receiverId'],
        properties: {
          receiverId: { type: 'integer' },
          message: { type: 'string', maxLength: 200 },
          quantity: { type: 'integer', minimum: 1, maximum: 99, default: 1 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { itemId } = request.params;
      const { receiverId, message, quantity = 1 } = request.body;
      const result = await giftItem(request.user.id, receiverId, itemId, message, quantity);
      return result;
    } catch (error) {
      if (error.message.includes('余额不足') || error.message.includes('已经拥有') || error.message.includes('库存不足') || error.message.includes('不能赠送') || error.message.includes('用户不存在') || error.message.includes('持有上限') || error.message.includes('最多还能') || error.message.includes('非消耗品')) {
        return reply.code(400).send({ error: error.message });
      }
      fastify.log.error('[商城] 赠送失败:', error);
      return reply.code(500).send({ error: '赠送失败' });
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
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 50 },
          type: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { page, limit, type } = request.query;
      fastify.log.info(`[商城] 获取我的商品 userId=${request.user.id}, type=${type}`);
      const result = await getUserItems(request.user.id, { page, limit, type });
      return result;
    } catch (error) {
      fastify.log.error('[商城] 获取我的商品失败:', error);
      return reply.code(500).send({ error: '查询失败' });
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
          userItemId: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { userItemId } = request.params;
      const result = await equipItem(request.user.id, userItemId);
      
      // 只返回 avatarFrame，前端根据操作类型直接更新 isEquipped
      const avatarFrame = await getEquippedAvatarFrame(request.user.id);
      
      return { ...result, avatarFrame };
    } catch (error) {
      if (error.message.includes('未找到')) {
        return reply.code(404).send({ error: error.message });
      }
      fastify.log.error('[商城] 装备失败:', error);
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
          userItemId: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { userItemId } = request.params;
      const result = await unequipItem(request.user.id, userItemId);
      
      // 只返回 avatarFrame，卸下头像框后为 null
      // 前端根据操作类型直接更新 isEquipped
      const avatarFrame = await getEquippedAvatarFrame(request.user.id);
      
      return { ...result, avatarFrame };
    } catch (error) {
      if (error.message.includes('未找到')) {
        return reply.code(404).send({ error: error.message });
      }
      fastify.log.error('[商城] 卸下失败:', error);
      return reply.code(500).send({ error: '卸下失败' });
    }
  });

  // 使用消耗品
  fastify.post('/my-items/:userItemId/use', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['shop'],
      description: '使用消耗品',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userItemId'],
        properties: {
          userItemId: { type: 'integer' },
        },
      },
      body: {
        type: 'object',
        properties: {
          targetType: { type: 'string', maxLength: 20 },
          targetId: { type: 'integer' },
          metadata: { type: 'object', additionalProperties: true, maxProperties: 10 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    try {
      const { userItemId } = request.params;
      const result = await useItem(request.user.id, userItemId, request.body);
      return result;
    } catch (error) {
      if (error.message.includes('未找到') || error.message.includes('不是消耗品') || error.message.includes('数量不足')) {
        return reply.code(400).send({ error: error.message });
      }
      fastify.log.error('[商城] 使用道具失败:', error);
      return reply.code(500).send({ error: '使用失败' });
    }
  });
}
