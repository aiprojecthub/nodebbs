/**
 * 微信 OAuth 路由（开放平台、公众号、小程序）
 */
import { handleOAuthLogin, generateRandomState } from '../../services/oauthService.js';
import { isProd } from '../../config/env.js';

export default async function wechatRoutes(fastify, options) {
  // ============= 微信开放平台（Web 扫码登录）=============

  /**
   * 微信开放平台 - 获取授权链接
   */
  fastify.get(
    '/wechat_open/connect',
    {
      schema: {
        tags: ['auth'],
        description: '获取微信 Web 扫码登录授权链接',
        response: {
          200: {
            type: 'object',
            properties: {
              authorizationUri: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const config = await fastify.oauth.getProviderConfig('wechat_open');
        if (!config || !config.isEnabled) {
          return reply.code(500).send({ error: '微信扫码登录未启用' });
        }

        const provider = await fastify.oauth.getProvider('wechat_open');
        const validation = provider.validateConfig(config);
        if (!validation.valid) {
          return reply.code(500).send({ error: `微信开放平台配置不完整: ${validation.message}` });
        }

        const state = generateRandomState();
        const authorizationUri = await provider.getAuthorizationUrl(config, state);

        reply.setCookie('oauth_state', state, {
          path: '/',
          httpOnly: true,
          secure: isProd,
          maxAge: 600,
          sameSite: 'lax',
        });

        return { authorizationUri };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * 微信开放平台 - 回调处理
   */
  fastify.post(
    '/wechat_open/callback',
    {
      schema: {
        tags: ['auth'],
        description: '微信 Web 扫码登录回调处理',
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
            state: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  role: { type: 'string' },
                  isEmailVerified: { type: 'boolean' },
                },
              },
              token: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { code, state } = request.body;
        const savedState = request.cookies.oauth_state;

        if (!state || state !== savedState) {
          return reply.code(400).send({ error: '无效的 state 参数' });
        }

        reply.clearCookie('oauth_state');

        const config = await fastify.oauth.getProviderConfig('wechat_open');
        if (!config || !config.isEnabled) {
          return reply.code(500).send({ error: '微信扫码登录未启用' });
        }

        const provider = await fastify.oauth.getProvider('wechat_open');
        const { profile, providerAccountId, tokenData } = await provider.handleCallback(config, code);

        const result = await handleOAuthLogin(
          fastify,
          'wechat_open',
          providerAccountId,
          profile,
          tokenData
        );

        const authToken = reply.generateAuthToken({
          id: result.user.id,
        });

        return { ...result, token: authToken };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // ============= 微信公众号（H5 网页授权）=============

  /**
   * 微信公众号 - 获取授权链接
   */
  fastify.get(
    '/wechat_mp/connect',
    {
      schema: {
        tags: ['auth'],
        description: '获取微信公众号网页授权链接',
        response: {
          200: {
            type: 'object',
            properties: {
              authorizationUri: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const config = await fastify.oauth.getProviderConfig('wechat_mp');
        if (!config || !config.isEnabled) {
          return reply.code(500).send({ error: '微信公众号授权未启用' });
        }

        const provider = await fastify.oauth.getProvider('wechat_mp');
        const validation = provider.validateConfig(config);
        if (!validation.valid) {
          return reply.code(500).send({ error: `微信公众号配置不完整: ${validation.message}` });
        }

        const state = generateRandomState();
        const authorizationUri = await provider.getAuthorizationUrl(config, state);

        reply.setCookie('oauth_state', state, {
          path: '/',
          httpOnly: true,
          secure: isProd,
          maxAge: 600,
          sameSite: 'lax',
        });

        return { authorizationUri };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * 微信公众号 - 回调处理
   */
  fastify.post(
    '/wechat_mp/callback',
    {
      schema: {
        tags: ['auth'],
        description: '微信公众号网页授权回调处理',
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
            state: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  role: { type: 'string' },
                  isEmailVerified: { type: 'boolean' },
                },
              },
              token: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { code, state } = request.body;
        const savedState = request.cookies.oauth_state;

        if (!state || state !== savedState) {
          return reply.code(400).send({ error: '无效的 state 参数' });
        }

        reply.clearCookie('oauth_state');

        const config = await fastify.oauth.getProviderConfig('wechat_mp');
        if (!config || !config.isEnabled) {
          return reply.code(500).send({ error: '微信公众号授权未启用' });
        }

        const provider = await fastify.oauth.getProvider('wechat_mp');
        const { profile, providerAccountId, tokenData } = await provider.handleCallback(config, code);

        const result = await handleOAuthLogin(
          fastify,
          'wechat_mp',
          providerAccountId,
          profile,
          tokenData
        );

        const authToken = reply.generateAuthToken({
          id: result.user.id,
        });

        return { ...result, token: authToken };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // ============= 微信小程序登录 =============

  /**
   * 微信小程序登录
   */
  fastify.post(
    '/wechat_miniprogram/login',
    {
      schema: {
        tags: ['auth'],
        description: '微信小程序登录',
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
            userInfo: {
              type: 'object',
              description: '小程序获取的用户信息（可选）',
              properties: {
                nickName: { type: 'string' },
                avatarUrl: { type: 'string' },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  role: { type: 'string' },
                  isEmailVerified: { type: 'boolean' },
                },
              },
              token: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { code, userInfo } = request.body;

        const config = await fastify.oauth.getProviderConfig('wechat_miniprogram');
        if (!config || !config.isEnabled) {
          return reply.code(500).send({ error: '微信小程序登录未启用' });
        }

        const provider = await fastify.oauth.getProvider('wechat_miniprogram');
        const { profile, providerAccountId, tokenData } = await provider.handleCallback(
          config,
          code,
          { userInfo }
        );

        const result = await handleOAuthLogin(
          fastify,
          'wechat_miniprogram',
          providerAccountId,
          profile,
          tokenData
        );

        const authToken = reply.generateAuthToken({
          id: result.user.id,
        });

        return { ...result, token: authToken };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );
}
