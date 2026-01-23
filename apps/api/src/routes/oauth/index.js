/**
 * OAuth 认证路由主入口
 * 
 * 目录结构：
 * - index.js          # 主入口，注册子路由和管理 API
 * - helpers.js        # 通用辅助函数
 * - providers/
 *   - github.js       # GitHub OAuth
 *   - google.js       # Google OAuth
 *   - apple.js        # Apple OAuth
 *   - wechat.js       # 微信 OAuth（开放平台/公众号/小程序）
 */
import db from '../../db/index.js';
import { oauthProviders } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  unlinkOAuthAccount,
  getUserAccounts,
} from '../../utils/oauth-helpers.js';

// 导入各 provider 路由
import githubRoutes from './providers/github.js';
import googleRoutes from './providers/google.js';
import appleRoutes from './providers/apple.js';
import wechatRoutes from './providers/wechat.js';

/**
 * OAuth 认证路由
 */
export default async function oauthRoutes(fastify, options) {
  // ============= 注册各 Provider 路由 =============
  await fastify.register(githubRoutes);
  await fastify.register(googleRoutes);
  await fastify.register(appleRoutes);
  await fastify.register(wechatRoutes);

  // ============= OAuth 配置管理 =============

  /**
   * 获取 OAuth 提供商配置
   * 公开接口：只返回已启用的提供商（不含敏感信息）
   * 管理员：返回所有提供商（含完整配置）
   */
  fastify.get(
    '/providers',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['oauth'],
        description: '获取 OAuth 提供商配置',
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
                    provider: { type: 'string' },
                    isEnabled: { type: 'boolean' },
                    clientId: { type: ['string', 'null'] },
                    clientSecret: { type: ['string', 'null'] },
                    callbackUrl: { type: ['string', 'null'] },
                    scope: { type: ['string', 'null'] },
                    additionalConfig: { type: ['string', 'null'] },
                    displayName: { type: ['string', 'null'] },
                    displayOrder: { type: 'number' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
              page: { type: 'number' },
              limit: { type: 'number' },
              total: { type: 'number' },
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
          items = await db
            .select()
            .from(oauthProviders)
            .orderBy(oauthProviders.displayOrder);
        } else {
          items = await db
            .select({
              provider: oauthProviders.provider,
              isEnabled: oauthProviders.isEnabled,
              displayName: oauthProviders.displayName,
              displayOrder: oauthProviders.displayOrder,
            })
            .from(oauthProviders)
            .where(eq(oauthProviders.isEnabled, true))
            .orderBy(oauthProviders.displayOrder);
        }

        return { items };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: '获取 OAuth 配置失败' });
      }
    }
  );

  /**
   * 更新 OAuth 提供商配置（管理员）
   */
  fastify.patch(
    '/providers/:provider',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['oauth'],
        description: '更新 OAuth 提供商配置',
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
            clientId: { type: 'string' },
            clientSecret: { type: 'string' },
            callbackUrl: { type: 'string' },
            scope: { type: 'string' },
            additionalConfig: { type: 'string' },
            displayName: { type: 'string' },
            displayOrder: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              provider: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  provider: { type: 'string' },
                  isEnabled: { type: 'boolean' },
                  displayName: { type: ['string', 'null'] },
                },
              },
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
          .from(oauthProviders)
          .where(eq(oauthProviders.provider, provider))
          .limit(1);

        if (existing.length === 0) {
          return reply.code(404).send({ error: 'OAuth 提供商不存在' });
        }

        const updated = await db
          .update(oauthProviders)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(oauthProviders.provider, provider))
          .returning();

        fastify.log.info(`OAuth provider ${provider} configuration updated`);

        return {
          message: 'OAuth 配置已更新',
          provider: updated[0],
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: '更新 OAuth 配置失败' });
      }
    }
  );

  /**
   * 测试 OAuth 配置（管理员）
   */
  fastify.post(
    '/providers/:provider/test',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['oauth'],
        description: '测试 OAuth 提供商配置',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            provider: { type: 'string' },
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

      try {
        const config = await db
          .select()
          .from(oauthProviders)
          .where(eq(oauthProviders.provider, provider))
          .limit(1);

        if (config.length === 0) {
          return reply.code(404).send({ error: 'OAuth 提供商不存在' });
        }

        const providerConfig = config[0];

        if (!providerConfig.clientId || !providerConfig.clientSecret) {
          return {
            success: false,
            message: '缺少必要的配置信息（Client ID 或 Client Secret）',
          };
        }

        return {
          success: true,
          message: 'OAuth 配置验证通过',
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: '测试 OAuth 配置失败' });
      }
    }
  );

  // ============= OAuth 账号管理 =============

  /**
   * 关联 OAuth 账号（需要登录）
   */
  fastify.post(
    '/link/:provider',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        description: '关联 OAuth 账号到当前用户',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            provider: { type: 'string', enum: ['github', 'google', 'apple'] },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: 实现账号关联流程
      return reply.code(501).send({ error: '功能开发中' });
    }
  );

  /**
   * 解除 OAuth 账号关联
   */
  fastify.delete(
    '/unlink/:provider',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        description: '解除 OAuth 账号关联',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            provider: { type: 'string', enum: ['github', 'google', 'apple'] },
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
      const userId = request.user.id;

      try {
        await unlinkOAuthAccount(userId, provider);
        return { message: `已解除 ${provider} 账号关联` };
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  /**
   * 获取当前用户的所有关联账号
   */
  fastify.get(
    '/accounts',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        description: '获取当前用户的所有 OAuth 关联账号',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              accounts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    provider: { type: 'string' },
                    providerAccountId: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id;
      const accounts = await getUserAccounts(userId);
      return { accounts };
    }
  );
}
