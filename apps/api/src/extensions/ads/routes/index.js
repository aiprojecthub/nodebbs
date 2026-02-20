import {
  getAdSlots,
  getAdSlotById,
  getAdSlotByCode,
  createAdSlot,
  updateAdSlot,
  deleteAdSlot,
  getAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
  getActiveAdsBySlotCode,
  getActiveAdsBySlotCodes,
  recordImpression,
  recordClick,
} from '../services/adService.js';

/**
 * 过滤敏感字段 (点击量、展示量、备注)
 */
function sanitizeAd(ad) {
  if (!ad) return null;
  const { impressions, clicks, remark, ...safeAd } = ad;
  return safeAd;
}

export default async function adsRoutes(fastify, options) {
  // ============ 公开接口 (保持不变) ============

  // 获取多个广告位的广告（Batch）
  fastify.get('/display/batch', {
    schema: {
      tags: ['ads'],
      description: '批量获取广告位的有效广告',
      querystring: {
        type: 'object',
        properties: {
          slots: { type: 'string', description: '逗号分隔的广告位代码' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { slots } = request.query;
      if (!slots) {
        return {};
      }
      const slotCodes = slots.split(',').map(s => s.trim()).filter(Boolean);
      if (slotCodes.length === 0) {
        return {};
      }
      
      const result = await getActiveAdsBySlotCodes(slotCodes);
      
      // 过滤敏感信息
      Object.keys(result).forEach(key => {
        if (result[key] && result[key].ads) {
          result[key].ads = result[key].ads.map(sanitizeAd);
        }
      });

      return result;
    } catch (error) {
      fastify.log.error('[广告] 批量获取广告失败:', error);
      return reply.code(500).send({ error: '获取失败' });
    }
  });

  // 获取指定广告位的广告（用于前端展示）
  fastify.get('/display/:slotCode', {
    schema: {
      tags: ['ads'],
      description: '获取指定广告位的有效广告',
      params: {
        type: 'object',
        required: ['slotCode'],
        properties: {
          slotCode: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { slotCode } = request.params;
      const result = await getActiveAdsBySlotCode(slotCode);

      // 过滤敏感信息
      if (result && result.ads) {
        result.ads = result.ads.map(sanitizeAd);
      }

      return result;
    } catch (error) {
      fastify.log.error('[广告] 获取广告位广告失败:', error);
      return reply.code(500).send({ error: '获取失败' });
    }
  });

  // 记录广告展示
  fastify.post('/:adId/impression', {
    schema: {
      tags: ['ads'],
      description: '记录广告展示',
      params: {
        type: 'object',
        required: ['adId'],
        properties: {
          adId: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { adId } = request.params;
      await recordImpression(adId);
      return { success: true };
    } catch (error) {
      fastify.log.error('[广告] 记录展示失败:', error);
      return reply.code(500).send({ error: '记录失败' });
    }
  });

  // 记录广告点击
  fastify.post('/:adId/click', {
    schema: {
      tags: ['ads'],
      description: '记录广告点击',
      params: {
        type: 'object',
        required: ['adId'],
        properties: {
          adId: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { adId } = request.params;
      await recordClick(adId);
      return { success: true };
    } catch (error) {
      fastify.log.error('[广告] 记录点击失败:', error);
      return reply.code(500).send({ error: '记录失败' });
    }
  });

  // ============ 广告位 (Ad Slots) - RESTful ============

  // 获取广告位列表
  fastify.get('/slots', {
    preHandler: [fastify.requirePermission('dashboard.ads')],
    schema: {
      tags: ['ads', 'admin'],
      description: '获取广告位列表（仅管理员）',
      querystring: {
        type: 'object',
        properties: {
          includeInactive: { type: 'boolean' }
        }
      }
    },
  }, async (request, reply) => {
    try {
      const { includeInactive: includeInactiveParam } = request.query;
      
      const includeInactive = includeInactiveParam === true || includeInactiveParam === 'true';
      
      const slots = await getAdSlots({ includeInactive });
      return slots;
    } catch (error) {
      fastify.log.error('[广告] 获取广告位列表失败:', error);
      return reply.code(500).send({ error: '获取失败' });
    }
  });

  // 获取单个广告位
  fastify.get('/slots/:id', {
    preHandler: [fastify.requirePermission('dashboard.ads')],
    schema: {
      tags: ['ads', 'admin'],
      description: '获取单个广告位（仅管理员）',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const slot = await getAdSlotById(id);
      
      if (!slot) {
        return reply.code(404).send({ error: '广告位不存在' });
      }

      return slot;
    } catch (error) {
      fastify.log.error('[广告] 获取广告位失败:', error);
      return reply.code(500).send({ error: '获取失败' });
    }
  });

  // 创建广告位 (Admin Only)
  fastify.post('/slots', {
    preHandler: [fastify.requirePermission('dashboard.ads')],
    schema: {
      tags: ['ads', 'admin'],
      description: '创建广告位（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'code'],
        properties: {
          name: { type: 'string', maxLength: 100 },
          code: { type: 'string', maxLength: 50 },
          description: { type: 'string' },
          width: { type: 'integer', minimum: 0 },
          height: { type: 'integer', minimum: 0 },
          maxAds: { type: 'integer', minimum: 1, default: 1 },
          isActive: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // 检查 code 是否已存在
      const existing = await getAdSlotByCode(request.body.code);
      if (existing) {
        return reply.code(400).send({ error: '广告位代码已存在' });
      }

      const slot = await createAdSlot(request.body);
      return slot;
    } catch (error) {
      fastify.log.error('[广告] 创建广告位失败:', error);
      return reply.code(500).send({ error: '创建失败' });
    }
  });

  // 更新广告位 (Admin Only)
  fastify.patch('/slots/:id', {
    preHandler: [fastify.requirePermission('dashboard.ads')],
    schema: {
      tags: ['ads', 'admin'],
      description: '更新广告位（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 100 },
          code: { type: 'string', maxLength: 50 },
          description: { type: 'string' },
          width: { type: ['integer', 'null'] },
          height: { type: ['integer', 'null'] },
          maxAds: { type: 'integer', minimum: 1 },
          isActive: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      // 如果更新 code，检查是否与其他广告位冲突
      if (request.body.code) {
        const existing = await getAdSlotByCode(request.body.code);
        if (existing && existing.id !== id) {
          return reply.code(400).send({ error: '广告位代码已存在' });
        }
      }

      const slot = await updateAdSlot(id, request.body);
      if (!slot) {
        return reply.code(404).send({ error: '广告位不存在' });
      }
      return slot;
    } catch (error) {
      fastify.log.error('[广告] 更新广告位失败:', error);
      return reply.code(500).send({ error: '更新失败' });
    }
  });

  // 删除广告位 (Admin Only)
  fastify.delete('/slots/:id', {
    preHandler: [fastify.requirePermission('dashboard.ads')],
    schema: {
      tags: ['ads', 'admin'],
      description: '删除广告位（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      await deleteAdSlot(id);
      return { success: true };
    } catch (error) {
      fastify.log.error('[广告] 删除广告位失败:', error);
      return reply.code(500).send({ error: '删除失败' });
    }
  });

  // ============ 广告 (Ads) - RESTful ============

  // 获取广告列表
  fastify.get('/', {
    preHandler: [fastify.requirePermission('dashboard.ads')],
    schema: {
      tags: ['ads', 'admin'],
      description: '获取广告列表（仅管理员）',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          slotId: { type: 'integer' },
          type: { type: 'string' },
          isActive: { type: 'boolean' },
          includeInactive: { type: 'boolean' }
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { page, limit, slotId, type, isActive, includeInactive: includeInactiveParam } = request.query;
      const includeInactive = includeInactiveParam === true || includeInactiveParam === 'true';

      const queryParams = {
        slotId,
        type,
        page,
        limit,
        includeInactive
      };

      if (isActive !== undefined) queryParams.isActive = isActive;

      const result = await getAds(queryParams);
      return result;
    } catch (error) {
      fastify.log.error('[广告] 获取广告列表失败:', error);
      return reply.code(500).send({ error: '获取失败' });
    }
  });

  // 获取单个广告
  fastify.get('/:id', {
    preHandler: [fastify.requirePermission('dashboard.ads')],
    schema: {
      tags: ['ads', 'admin'],
      description: '获取单个广告（仅管理员）',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const ad = await getAdById(id);
      
      if (!ad) {
        return reply.code(404).send({ error: '广告不存在' });
      }

      return ad;
    } catch (error) {
      fastify.log.error('[广告] 获取广告失败:', error);
      return reply.code(500).send({ error: '获取失败' });
    }
  });

  // 创建广告 (Admin Only)
  fastify.post('/', {
    preHandler: [fastify.requirePermission('dashboard.ads')],
    schema: {
      tags: ['ads', 'admin'],
      description: '创建广告（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['slotId', 'title', 'type'],
        properties: {
          slotId: { type: 'integer' },
          title: { type: 'string', maxLength: 200 },
          type: { type: 'string', enum: ['image', 'html', 'script'] },
          content: { type: 'string' },
          linkUrl: { type: 'string', maxLength: 500 },
          targetBlank: { type: 'boolean' },
          priority: { type: 'integer', default: 0 },
          startAt: { type: ['string', 'null'], format: 'date-time' },
          endAt: { type: ['string', 'null'], format: 'date-time' },
          isActive: { type: 'boolean' },
          remark: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // 验证广告位是否存在
      const slot = await getAdSlotById(request.body.slotId);
      if (!slot) {
        return reply.code(400).send({ error: '广告位不存在' });
      }

      const ad = await createAd(request.body);
      return ad;
    } catch (error) {
      fastify.log.error('[广告] 创建广告失败:', error);
      return reply.code(500).send({ error: '创建失败' });
    }
  });

  // 更新广告 (Admin Only)
  fastify.patch('/:id', {
    preHandler: [fastify.requirePermission('dashboard.ads')],
    schema: {
      tags: ['ads', 'admin'],
      description: '更新广告（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
      body: {
        type: 'object',
        properties: {
          slotId: { type: 'integer' },
          title: { type: 'string', maxLength: 200 },
          type: { type: 'string', enum: ['image', 'html', 'script'] },
          content: { type: 'string' },
          linkUrl: { type: 'string', maxLength: 500 },
          targetBlank: { type: 'boolean' },
          priority: { type: 'integer' },
          startAt: { type: ['string', 'null'], format: 'date-time' },
          endAt: { type: ['string', 'null'], format: 'date-time' },
          isActive: { type: 'boolean' },
          remark: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;

      // 如果更新 slotId，验证广告位是否存在
      if (request.body.slotId) {
        const slot = await getAdSlotById(request.body.slotId);
        if (!slot) {
          return reply.code(400).send({ error: '广告位不存在' });
        }
      }

      const ad = await updateAd(id, request.body);
      if (!ad) {
        return reply.code(404).send({ error: '广告不存在' });
      }
      return ad;
    } catch (error) {
      fastify.log.error('[广告] 更新广告失败:', error);
      return reply.code(500).send({ error: '更新失败' });
    }
  });

  // 删除广告 (Admin Only)
  fastify.delete('/:id', {
    preHandler: [fastify.requirePermission('dashboard.ads')],
    schema: {
      tags: ['ads', 'admin'],
      description: '删除广告（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      await deleteAd(id);
      return { success: true };
    } catch (error) {
      fastify.log.error('[广告] 删除广告失败:', error);
      return reply.code(500).send({ error: '删除失败' });
    }
  });
}
