import { storageProviders } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getSupportedProviders } from '../../plugins/storage/providers/index.js';

/**
 * 存储服务商配置路由
 * 路径: /api/storage-providers
 */
export default async function storageProvidersRoutes(fastify) {
  /**
   * 获取存储服务商配置
   * 管理员：返回所有服务商（含完整配置）
   * 非管理员：返回 403
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.requirePermission('dashboard.settings')],
      schema: {
        tags: ['storage-providers', 'admin'],
        description: '获取存储服务商配置（仅管理员）',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    slug: { type: 'string' },
                    type: { type: 'string' },
                    isEnabled: { type: 'boolean' },
                    config: { type: ['object', 'null'], additionalProperties: true },
                    displayName: { type: ['string', 'null'] },
                    displayOrder: { type: 'number' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const results = await fastify.db
          .select()
          .from(storageProviders)
          .orderBy(storageProviders.displayOrder);

        const items = results.map((item) => ({
          ...item,
          config: item.config ? JSON.parse(item.config) : null,
        }));

        return { items };
      } catch (error) {
        fastify.log.error('[存储] 获取存储配置失败:', error);
        return reply.code(500).send({ error: '获取存储配置失败' });
      }
    }
  );

  /**
   * 更新存储服务商配置（管理员）
   */
  fastify.patch(
    '/:slug',
    {
      preHandler: [fastify.requirePermission('dashboard.settings')],
      schema: {
        tags: ['storage-providers', 'admin'],
        description: '更新存储服务商配置（仅管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            isEnabled: { type: 'boolean' },
            config: { type: 'object' },
            displayName: { type: 'string' },
            displayOrder: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const updateData = request.body;

      try {
        const existing = await fastify.db
          .select()
          .from(storageProviders)
          .where(eq(storageProviders.slug, slug))
          .limit(1);

        if (existing.length === 0) {
          return reply.code(404).send({ error: '存储服务商不存在' });
        }

        const setData = {};
        if (updateData.isEnabled !== undefined) setData.isEnabled = updateData.isEnabled;
        if (updateData.displayName !== undefined) setData.displayName = updateData.displayName;
        if (updateData.displayOrder !== undefined) setData.displayOrder = updateData.displayOrder;
        if (updateData.config !== undefined) {
          // 合并配置：保留已有字段，覆盖新字段
          const existingConfig = existing[0].config ? JSON.parse(existing[0].config) : {};
          setData.config = JSON.stringify({ ...existingConfig, ...updateData.config });
        }

        // 互斥逻辑：启用一个时禁用其他所有（事务保护）
        if (updateData.isEnabled === true) {
          await fastify.db.transaction(async (tx) => {
            await tx
              .update(storageProviders)
              .set({ isEnabled: false })
              .where(eq(storageProviders.isEnabled, true));

            await tx
              .update(storageProviders)
              .set(setData)
              .where(eq(storageProviders.slug, slug));
          });
        } else {
          await fastify.db
            .update(storageProviders)
            .set(setData)
            .where(eq(storageProviders.slug, slug));
        }

        // 清除 provider 缓存，确保下次使用最新配置
        fastify.storage.invalidateCache(slug);

        fastify.log.info(`[存储] 存储服务商 ${slug} 配置已更新`);

        return {
          message: '存储配置已更新',
        };
      } catch (error) {
        fastify.log.error('[存储] 更新存储配置失败:', error);
        return reply.code(500).send({ error: '更新存储配置失败' });
      }
    }
  );

  /**
   * 测试存储服务商连接（管理员）
   */
  fastify.post(
    '/:slug/test',
    {
      preHandler: [fastify.requirePermission('dashboard.settings')],
      schema: {
        tags: ['storage-providers', 'admin'],
        description: '测试存储服务商连接（仅管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;

      try {
        const result = await fastify.storage.testConnection(slug);
        return result;
      } catch (error) {
        fastify.log.error('[存储] 测试连接失败:', error);
        return { success: false, message: `测试连接失败: ${error.message}` };
      }
    }
  );

  /**
   * 创建存储服务商（管理员）
   */
  fastify.post(
    '/',
    {
      preHandler: [fastify.requirePermission('dashboard.settings')],
      schema: {
        tags: ['storage-providers', 'admin'],
        description: '创建存储服务商（仅管理员）',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['slug', 'type', 'displayName'],
          properties: {
            slug: { type: 'string', minLength: 1, maxLength: 50 },
            type: { type: 'string', minLength: 1, maxLength: 20 },
            displayName: { type: 'string', minLength: 1, maxLength: 100 },
            config: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              slug: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { slug, type, displayName, config } = request.body;

      // 校验 slug 格式
      if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
        return reply.code(400).send({ error: '标识只能包含小写字母、数字和连字符，且不能以连字符开头' });
      }

      if (slug.length > 50) {
        return reply.code(400).send({ error: '标识长度不能超过 50 个字符' });
      }

      // 禁止 slug 为 'local'
      if (slug === 'local') {
        return reply.code(400).send({ error: '不能使用 "local" 作为存储标识' });
      }

      // 校验 type 是否为支持的存储类型（排除 local）
      const supported = getSupportedProviders().filter(t => t !== 'local');
      if (!supported.includes(type)) {
        return reply.code(400).send({ error: `不支持的存储类型: ${type}，可选: ${supported.join(', ')}` });
      }

      try {
        // 检查是否已存在
        const [existing] = await fastify.db
          .select()
          .from(storageProviders)
          .where(eq(storageProviders.slug, slug))
          .limit(1);

        if (existing) {
          return reply.code(409).send({ error: `标识 "${slug}" 已存在` });
        }

        // 获取最大 displayOrder
        const allProviders = await fastify.db
          .select()
          .from(storageProviders)
          .orderBy(storageProviders.displayOrder);
        const maxOrder = allProviders.length > 0
          ? Math.max(...allProviders.map(p => p.displayOrder))
          : 0;

        await fastify.db.insert(storageProviders).values({
          slug,
          type,
          isEnabled: false,
          displayName,
          displayOrder: maxOrder + 1,
          config: JSON.stringify(config || {}),
        });

        fastify.log.info(`[存储] 创建存储服务商: ${displayName} (${slug}, type=${type})`);

        return { message: '存储服务商已创建', slug };
      } catch (error) {
        fastify.log.error('[存储] 创建存储服务商失败:', error);
        return reply.code(500).send({ error: '创建存储服务商失败' });
      }
    }
  );

  /**
   * 删除存储服务商（管理员）
   */
  fastify.delete(
    '/:slug',
    {
      preHandler: [fastify.requirePermission('dashboard.settings')],
      schema: {
        tags: ['storage-providers', 'admin'],
        description: '删除存储服务商（仅管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;

      try {
        const [record] = await fastify.db
          .select()
          .from(storageProviders)
          .where(eq(storageProviders.slug, slug))
          .limit(1);

        if (!record) {
          return reply.code(404).send({ error: '存储服务商不存在' });
        }

        // 禁止删除 local 类型
        if (record.type === 'local') {
          return reply.code(400).send({ error: '本地存储不可删除' });
        }

        // 禁止删除启用中的 provider
        if (record.isEnabled) {
          return reply.code(400).send({ error: '请先切换到其他存储服务商后再删除' });
        }

        await fastify.db
          .delete(storageProviders)
          .where(eq(storageProviders.slug, slug));

        // 清除缓存
        fastify.storage.invalidateCache(slug);

        fastify.log.info(`[存储] 删除存储服务商: ${record.displayName} (${slug})`);

        return { message: '存储服务商已删除' };
      } catch (error) {
        fastify.log.error('[存储] 删除存储服务商失败:', error);
        return reply.code(500).send({ error: '删除存储服务商失败' });
      }
    }
  );
}
