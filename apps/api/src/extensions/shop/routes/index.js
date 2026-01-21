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
          include_inactive: { type: 'boolean' }
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { page, limit, type, include_inactive } = request.query;
      
      const isAdmin = request.user?.role === 'admin';
      // Non-admin users: ignore include_inactive, force false
      const includeInactive = isAdmin && (include_inactive === true || include_inactive === 'true');
      
      const result = await getShopItems({ page, limit, type, includeInactive });
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
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['shop', 'admin'],
      description: '创建商品（管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'price', 'type'],
        properties: {
          name: { type: 'string', maxLength: 100 },
          description: { type: 'string' },
          price: { type: 'integer', minimum: 0 },
          type: { type: 'string' },
          imageUrl: { type: 'string' },
          stock: { type: ['integer', 'null'], minimum: 0 },
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
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['shop', 'admin'],
      description: '更新商品（管理员）',
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
          imageUrl: { type: 'string' },
          stock: { type: ['integer', 'string', 'null'] }, // string 用于处理表单输入的情况
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
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['shop', 'admin'],
      description: '删除商品（管理员）',
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
    },
  }, async (request, reply) => {
    try {
      const { itemId } = request.params;
      const result = await buyItem(request.user.id, itemId);
      return result;
    } catch (error) {
      if (error.message.includes('余额不足') || error.message.includes('已经拥有') || error.message.includes('库存不足')) {
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
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { itemId } = request.params;
      const { receiverId, message } = request.body;
      const result = await giftItem(request.user.id, receiverId, itemId, message);
      return result;
    } catch (error) {
      if (error.message.includes('余额不足') || error.message.includes('已经拥有') || error.message.includes('库存不足') || error.message.includes('不能赠送') || error.message.includes('用户不存在')) {
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
}
