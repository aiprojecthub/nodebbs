import db from '../../../db/index.js';
import { messageProviders } from '../../../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * 短信提供商配置路由
 * 路径: /api/message-providers/sms
 */
export default async function smsProvidersRoutes(fastify, options) {
  const CHANNEL = 'sms';

  /**
   * 获取短信提供商配置
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['message-providers'],
        description: '获取短信提供商配置',
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
                    channel: { type: 'string' },
                    provider: { type: 'string' },
                    isEnabled: { type: 'boolean' },
                    isDefault: { type: 'boolean' },
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
        const canManage = await fastify.permission.can(request, 'dashboard.settings');

        let items;

        if (canManage) {
          const results = await db
            .select()
            .from(messageProviders)
            .where(eq(messageProviders.channel, CHANNEL))
            .orderBy(messageProviders.displayOrder);
          
          items = results.map(item => ({
            ...item,
            config: item.config ? JSON.parse(item.config) : null,
          }));
        } else {
          items = await db
            .select({
              provider: messageProviders.provider,
              isEnabled: messageProviders.isEnabled,
              displayName: messageProviders.displayName,
              displayOrder: messageProviders.displayOrder,
            })
            .from(messageProviders)
            .where(and(
              eq(messageProviders.channel, CHANNEL),
              eq(messageProviders.isEnabled, true)
            ))
            .orderBy(messageProviders.displayOrder);
        }

        return { items };
      } catch (error) {
        fastify.log.error('[消息] 获取短信配置失败:', error);
        return reply.code(500).send({ error: '获取短信配置失败' });
      }
    }
  );

  /**
   * 更新短信提供商配置（管理员）
   */
  fastify.patch(
    '/:provider',
    {
      preHandler: [fastify.requirePermission('dashboard.settings')],
      schema: {
        tags: ['message-providers', 'admin'],
        description: '更新短信提供商配置（仅管理员）',
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
            isDefault: { type: 'boolean' },
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
      const { provider } = request.params;
      const updateData = request.body;

      try {
        const existing = await db
          .select()
          .from(messageProviders)
          .where(and(
            eq(messageProviders.channel, CHANNEL),
            eq(messageProviders.provider, provider)
          ))
          .limit(1);

        if (existing.length === 0) {
          return reply.code(404).send({ error: '短信提供商不存在' });
        }

        if (updateData.isDefault === true) {
          await db
            .update(messageProviders)
            .set({ isDefault: false })
            .where(and(
              eq(messageProviders.channel, CHANNEL),
              eq(messageProviders.isDefault, true)
            ));
        }

        const setData = {};

        if (updateData.isEnabled !== undefined) setData.isEnabled = updateData.isEnabled;
        if (updateData.isDefault !== undefined) setData.isDefault = updateData.isDefault;
        if (updateData.displayName !== undefined) setData.displayName = updateData.displayName;
        if (updateData.displayOrder !== undefined) setData.displayOrder = updateData.displayOrder;
        if (updateData.config !== undefined) {
          const existingConfig = existing[0].config ? JSON.parse(existing[0].config) : {};
          setData.config = JSON.stringify({ ...existingConfig, ...updateData.config });
        }

        // 执行更新
        await db
          .update(messageProviders)
          .set(setData)
          .where(and(
            eq(messageProviders.channel, CHANNEL),
            eq(messageProviders.provider, provider)
          ));

        fastify.log.info(`[消息] 短信提供商 ${provider} 配置已更新`);

        return {
          message: '短信配置已更新',
        };
      } catch (error) {
        fastify.log.error('[消息] 更新短信配置失败:', error);
        return reply.code(500).send({ error: '更新短信配置失败' });
      }
    }
  );

  /**
   * 测试短信配置（管理员）
   */
  fastify.post(
    '/:provider/test',
    {
      preHandler: [fastify.requirePermission('dashboard.settings')],
      schema: {
        tags: ['message-providers', 'admin'],
        description: '测试短信提供商配置（仅管理员）',
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
            testPhone: { type: 'string' },
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
      const { provider } = request.params;
      const { testPhone } = request.body;

      try {
        const results = await db
          .select()
          .from(messageProviders)
          .where(and(
            eq(messageProviders.channel, CHANNEL),
            eq(messageProviders.provider, provider)
          ))
          .limit(1);

        if (results.length === 0) {
          return reply.code(404).send({ error: '短信提供商不存在' });
        }

        const providerRecord = results[0];
        const config = fastify.message.sms.parseConfig(providerRecord).config;

        // 验证配置
        if (provider === 'aliyun') {
          if (!config.accessKeyId || !config.accessKeySecret || !config.signName) {
            return { success: false, message: '缺少阿里云短信配置信息' };
          }
        } else if (provider === 'tencent') {
          if (!config.secretId || !config.secretKey || !config.appId || !config.signName) {
            return { success: false, message: '缺少腾讯云短信配置信息' };
          }
        }

        if (testPhone) {
          // TODO: 实现测试短信发送
          // 需要配置测试模板
          /*
          await fastify.message.sms.send({
            to: testPhone,
            template: 'SMS_TEST',
            data: { code: '123456' },
            provider: provider,
            wait: true
          });
          */
          return { 
            success: true, 
            message: '短信配置验证通过，测试短信功能需要配置测试模板' 
          };
        }

        return { success: true, message: '短信配置验证通过' };
      } catch (error) {
        fastify.log.error('[消息] 测试短信配置失败:', error);
        return reply.code(500).send({ error: '测试短信配置失败' });
      }
    }
  );
}
