/**
 * GitHub OAuth 路由
 */
import { handleOAuthLogin, generateRandomState } from '../../services/oauthService.js';
import { isProd } from '../../config/env.js';

export default async function githubRoutes(fastify, options) {
  const PROVIDER_NAME = 'github';

  /**
   * 获取 GitHub OAuth 授权链接
   */
  fastify.get(
    '/github/connect',
    {
      schema: {
        tags: ['auth'],
        description: '获取 GitHub OAuth 授权链接',
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
        const providerConfig = await fastify.oauth.getProviderConfig(PROVIDER_NAME);
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'GitHub OAuth 未启用' });
        }

        const provider = await fastify.oauth.getProvider(PROVIDER_NAME);
        const validation = provider.validateConfig(providerConfig);
        if (!validation.valid) {
          return reply.code(500).send({ error: `GitHub OAuth 配置不完整: ${validation.message}` });
        }

        const state = generateRandomState();
        const authorizationUri = await provider.getAuthorizationUrl(providerConfig, state);

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
   * GitHub OAuth 回调处理
   */
  fastify.post(
    '/github/callback',
    {
      schema: {
        tags: ['auth'],
        description: 'GitHub OAuth 回调处理',
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
          return reply.code(400).send({ error: '无效的 state 参数，可能的 CSRF 攻击' });
        }

        reply.clearCookie('oauth_state');

        const providerConfig = await fastify.oauth.getProviderConfig(PROVIDER_NAME);
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'GitHub OAuth 未启用' });
        }

        const provider = await fastify.oauth.getProvider(PROVIDER_NAME);
        const { profile, providerAccountId, tokenData } = await provider.handleCallback(providerConfig, code);

        const result = await handleOAuthLogin(
          fastify,
          PROVIDER_NAME,
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
