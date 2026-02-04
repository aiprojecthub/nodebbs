import db from '../../../db/index.js';
import { messageProviders } from '../../../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * 邮件提供商配置路由
 * 路径: /api/message-providers/email
 */
export default async function emailProvidersRoutes(fastify, options) {
  const CHANNEL = 'email';

  /**
   * 获取邮件提供商配置
   * 公开接口：只返回已启用的提供商（不含敏感信息）
   * 管理员：返回所有提供商（含完整配置）
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['message-providers'],
        description: '获取邮件提供商配置',
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
        const isAdmin = request.user?.isAdmin;

        let items;

        if (isAdmin) {
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
        fastify.log.error('[消息] 获取邮件配置失败:', error);
        return reply.code(500).send({ error: '获取邮件配置失败' });
      }
    }
  );

  /**
   * 更新邮件提供商配置（管理员）
   */
  fastify.patch(
    '/:provider',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['message-providers', 'admin'],
        description: '更新邮件提供商配置（仅管理员）',
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
          return reply.code(404).send({ error: '邮件提供商不存在' });
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

        const setData = { updatedAt: new Date() };

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

        fastify.log.info(`[消息] 邮件提供商 ${provider} 配置已更新`);

        return {
          message: '邮件配置已更新',
        };
      } catch (error) {
        fastify.log.error('[消息] 更新邮件配置失败:', error);
        return reply.code(500).send({ error: '更新邮件配置失败' });
      }
    }
  );

  /**
   * 测试邮件配置（管理员）
   */
  fastify.post(
    '/:provider/test',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['message-providers', 'admin'],
        description: '测试邮件提供商配置（仅管理员）',
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
            testEmail: { type: 'string', format: 'email' },
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
      const { testEmail } = request.body;

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
          return reply.code(404).send({ error: '邮件提供商不存在' });
        }

        const providerRecord = results[0];
        const config = fastify.message.email.parseConfig(providerRecord).config;

        try {
          // 使用统一的方法验证配置
          fastify.message.email.validateConfig(provider, config);
        } catch (validationError) {
          return { success: false, message: validationError.message };
        }

        if (testEmail) {
          try {
            await fastify.message.email.send({
              to: testEmail,
              subject: '邮件服务测试',
              html: `
                <h2>邮件服务测试</h2>
                <p>这是一封来自 ${providerRecord.displayName} 的测试邮件。</p>
                <p>如果您收到这封邮件，说明邮件服务配置正确。</p>
                <hr>
                <p style="color: #666; font-size: 12px;">发送时间: ${new Date().toLocaleString('zh-CN')}</p>
              `,
              text: `邮件服务测试\n\n这是一封来自 ${providerRecord.displayName} 的测试邮件。`,
              provider: provider,
              wait: true,
            });

            return { success: true, message: `测试邮件已发送到 ${testEmail}` };
          } catch (error) {
            fastify.log.error('[消息] 发送测试邮件失败:', error);
            return { success: false, message: `发送测试邮件失败: ${error.message}` };
          }
        }

        return { success: true, message: '邮件配置验证通过' };
      } catch (error) {
        fastify.log.error('[消息] 测试邮件配置失败:', error);
        return reply.code(500).send({ error: '测试邮件配置失败' });
      }
    }
  );
}
