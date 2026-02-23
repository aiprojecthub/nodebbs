// CAPTCHA 配置管理路由
import { eq, asc } from 'drizzle-orm';
import { captchaProviders } from '../../db/schema.js';

export default async function captchaRoutes(fastify, options) {
  const db = fastify.db;

  // ============ 公开接口 ============

  /**
   * 获取前端所需的 CAPTCHA 配置
   */
  fastify.get(
    '/config',
    {
      schema: {
        tags: ['captcha'],
        description: '获取当前 CAPTCHA 配置（公开）',
        response: {
          200: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              provider: { type: 'string' },
              siteKey: { type: 'string' },
              enabledScenes: { 
                type: 'object',
                additionalProperties: true 
              },
              version: { type: 'string' },
              mode: { type: 'string' },
              config: { 
                type: 'object',
                additionalProperties: true 
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const config = await fastify.captcha.getPublicConfig();
      if (!config) {
        return { enabled: false };
      }
      return {
        enabled: true,
        ok: 1,
        ...config,
      };
    }
  );

  // ============ 管理员接口 ============

  /**
   * 获取所有 CAPTCHA 提供商配置
   */
  fastify.get(
    '/providers',
    {
      preHandler: [fastify.requirePermission('dashboard.settings')],
      schema: {
        tags: ['captcha', 'admin'],
        description: '获取所有 CAPTCHA 提供商配置（仅管理员）',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      // 获取数据库中的配置
      const providers = await db
        .select()
        .from(captchaProviders)
        .orderBy(asc(captchaProviders.displayOrder));

      // 格式化返回结果
      return providers.map(provider => {
        let config = {};
        let enabledScenes = {};

        try {
          config = provider.config ? JSON.parse(provider.config) : {};
        } catch (e) {}

        try {
          enabledScenes = provider.enabledScenes ? JSON.parse(provider.enabledScenes) : {};
        } catch (e) {}

        return {
          ...provider,
          config,
          enabledScenes,
        };
      });
    }
  );

  /**
   * 更新 CAPTCHA 提供商配置
   */
  fastify.put(
    '/providers/:provider',
    {
      preHandler: [fastify.requirePermission('dashboard.settings')],
      schema: {
        tags: ['captcha', 'admin'],
        description: '更新 CAPTCHA 提供商配置（仅管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            provider: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            isEnabled: { type: 'boolean' },
            config: { type: 'object' },
            enabledScenes: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const { provider } = request.params;
      const { isEnabled, config, enabledScenes } = request.body;

      // 检查记录是否存在
      const [existing] = await db
        .select()
        .from(captchaProviders)
        .where(eq(captchaProviders.provider, provider))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({ error: 'CAPTCHA 提供商不存在或未初始化' });
      }

      // 互斥逻辑：启用一个时禁用其他所有
      if (isEnabled) {
        await db
          .update(captchaProviders)
          .set({ isEnabled: false })
          .where(eq(captchaProviders.isEnabled, true));
      }

      const updateData = {
        isEnabled: isEnabled !== undefined ? isEnabled : existing.isEnabled,
        // 只更新提供的字段
        ...(config && { config: JSON.stringify(config) }),
        ...(enabledScenes && { enabledScenes: JSON.stringify(enabledScenes) }),
      };

      const [result] = await db
        .update(captchaProviders)
        .set(updateData)
        .where(eq(captchaProviders.provider, provider))
        .returning();

      // 返回解析后的结果（解析库里的 JSON）
      const resultConfig = result.config ? JSON.parse(result.config) : {};
      const resultEnabledScenes = result.enabledScenes ? JSON.parse(result.enabledScenes) : {};

      return {
        ...result,
        config: resultConfig,
        enabledScenes: resultEnabledScenes,
      };
    }
  );
}
