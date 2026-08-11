/**
 * OAuth 认证路由主入口
 *
 * 目录结构：
 * - index.js          # 主入口，注册子路由和管理 API
 * - github.js         # GitHub OAuth
 * - google.js         # Google OAuth
 * - apple.js          # Apple OAuth
 * - wechat.js         # 微信 OAuth（开放平台/公众号/小程序）
 * - link.js           # 三方账号关联/解绑（通用 :provider）
 */
import { oauthProviders } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  getUserAccounts,
  getLoginMethods,
} from '../../services/oauthService.js';

// 导入各 provider 路由
import githubRoutes from './github.js';
import googleRoutes from './google.js';
import appleRoutes from './apple.js';
import wechatRoutes from './wechat.js';
import linkRoutes, { LINKABLE_PROVIDERS } from './link.js';

/**
 * OAuth 认证路由
 */
export default async function oauthRoutes(fastify, options) {
  const db = fastify.db;
  // ============= 注册各 Provider 路由 =============
  await fastify.register(githubRoutes);
  await fastify.register(googleRoutes);
  await fastify.register(appleRoutes);
  await fastify.register(wechatRoutes);
  await fastify.register(linkRoutes);

  // ============= OAuth 配置管理 =============

  /**
   * 获取已启用的 OAuth 提供商（公开）
   *
   * 永远只返回已启用的提供商，且不含敏感信息，与调用者身份无关
   * （管理员访问此接口同样只会拿到已启用项）。
   * 登录 / 注册入口使用此接口，因此未启用的提供商绝不会在登录页出现。
   */
  fastify.get(
    '/providers',
    {
      schema: {
        tags: ['oauth'],
        description: '获取已启用的 OAuth 提供商（公开）',
        response: {
          200: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    provider: { type: 'string' },
                    isEnabled: { type: 'boolean' },
                    displayName: { type: ['string', 'null'] },
                    displayOrder: { type: 'number' },
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
        const items = await db
          .select({
            provider: oauthProviders.provider,
            isEnabled: oauthProviders.isEnabled,
            displayName: oauthProviders.displayName,
            displayOrder: oauthProviders.displayOrder,
          })
          .from(oauthProviders)
          .where(eq(oauthProviders.isEnabled, true))
          .orderBy(oauthProviders.displayOrder);

        return { items };
      } catch (error) {
        fastify.log.error(error, '[OAuth] 获取已启用提供商失败');
        return reply.code(500).send({ error: '获取 OAuth 配置失败' });
      }
    }
  );

  /**
   * 获取所有 OAuth 提供商配置（管理员，含完整配置）
   *
   * 用于后台管理页，需要 dashboard.settings 权限。
   */
  fastify.get(
    '/providers/all',
    {
      preHandler: [fastify.requirePermission('dashboard.settings')],
      schema: {
        tags: ['oauth'],
        description: '获取所有 OAuth 提供商配置（管理员）',
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
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const items = await db
          .select()
          .from(oauthProviders)
          .orderBy(oauthProviders.displayOrder);

        return { items };
      } catch (error) {
        fastify.log.error(error, '[OAuth] 获取全部提供商配置失败');
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
      preHandler: [fastify.requirePermission('dashboard.settings')],
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
          .set({ ...updateData })
          .where(eq(oauthProviders.provider, provider))
          .returning();

        fastify.log.info(`[OAuth] 提供商 ${provider} 配置已更新`);

        return {
          message: 'OAuth 配置已更新',
          provider: updated[0],
        };
      } catch (error) {
        fastify.log.error(error, '[OAuth] 更新提供商配置失败');
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
      preHandler: [fastify.requirePermission('dashboard.settings')],
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
        const providerConfig = await fastify.oauth.getProviderConfig(provider);

        if (!providerConfig) {
          return reply.code(404).send({ error: 'OAuth 提供商不存在' });
        }

        const providerInstance = await fastify.oauth.getProvider(provider);
        const validation = providerInstance.validateConfig(providerConfig);

        if (!validation.valid) {
          return {
            success: false,
            message: validation.message,
          };
        }

        return {
          success: true,
          message: 'OAuth 配置验证通过',
        };
      } catch (error) {
        fastify.log.error(error, '[OAuth] 测试提供商配置失败');
        return reply.code(500).send({ error: '测试 OAuth 配置失败' });
      }
    }
  );

  // ============= OAuth 账号管理 =============
  // 关联 / 解绑的具体实现见 ./link.js

  /**
   * 获取当前用户的关联账号概览
   *
   * 一次返回渲染「关联账号」卡片所需的全部信息：已关联列表、能否解绑、
   * 是否需要密码验证、以及后端认可的可关联平台白名单（避免前端硬编码而与后端漂移）。
   */
  fastify.get(
    '/accounts',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        description: '获取当前用户的 OAuth 关联账号及可解绑状态',
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
                    displayName: { type: ['string', 'null'] },
                    isEnabled: { type: ['boolean', 'null'] },
                    displayOrder: { type: ['number', 'null'] },
                    providerAccountId: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
              canUnlink: { type: 'boolean' },
              unlinkRequiresPassword: { type: 'boolean' },
              linkableProviders: {
                type: 'array',
                items: { type: 'string' },
              },
              loginMethods: {
                type: 'object',
                properties: {
                  hasPassword: { type: 'boolean' },
                  hasPhoneLogin: { type: 'boolean' },
                  oauthCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id;

      try {
        const [accounts, loginMethods, requiresPassword] = await Promise.all([
          getUserAccounts(userId),
          getLoginMethods(userId),
          fastify.settings.get('oauth_unlink_requires_password', true),
        ]);

        // 解绑任一账号后是否仍留有登录方式
        const canUnlink =
          loginMethods.hasPassword ||
          loginMethods.hasPhoneLogin ||
          loginMethods.providers.length > 1;

        return {
          accounts,
          canUnlink,
          // 无密码用户（纯三方注册）不可能提供密码，这里直接算好，前端无需再判断
          unlinkRequiresPassword: !!requiresPassword && loginMethods.hasPassword,
          linkableProviders: LINKABLE_PROVIDERS,
          loginMethods: {
            hasPassword: loginMethods.hasPassword,
            hasPhoneLogin: loginMethods.hasPhoneLogin,
            oauthCount: loginMethods.providers.length,
          },
        };
      } catch (error) {
        fastify.log.error(error, '[OAuth] 获取关联账号失败');
        return reply.code(500).send({ error: '获取关联账号失败' });
      }
    }
  );
}
