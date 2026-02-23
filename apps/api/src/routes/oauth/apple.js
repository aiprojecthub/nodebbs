/**
 * Apple OAuth 路由
 */
import { handleOAuthLogin, generateRandomState } from '../../services/oauthService.js';
import { getFrontendOrigin } from '../../utils/http-helpers.js';

export default async function appleRoutes(fastify, options) {
  const PROVIDER_NAME = 'apple';

  /**
   * 获取 Apple OAuth 授权链接
   */
  fastify.get(
    '/apple/connect',
    {
      schema: {
        tags: ['auth'],
        description: '获取 Apple OAuth 授权链接',
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
          return reply.code(500).send({ error: 'Apple OAuth 未启用' });
        }

        const provider = await fastify.oauth.getProvider(PROVIDER_NAME);
        const validation = provider.validateConfig(providerConfig);
        if (!validation.valid) {
          return reply.code(500).send({ error: `Apple OAuth 配置不完整: ${validation.message}` });
        }

        const state = generateRandomState();
        const authorizationUri = await provider.getAuthorizationUrl(providerConfig, state);

        // Apple 回调是 POST，必须用 SameSite=None
        reply.setCookie('oauth_state', state, {
          path: '/',
          httpOnly: true,
          secure: true,
          maxAge: 600,
          sameSite: 'none',
        });

        // 存储前端 Origin 用于回调重定向
        const baseUrl = getFrontendOrigin(request);
        reply.setCookie('oauth_frontend_origin', baseUrl, {
          path: '/',
          httpOnly: true,
          secure: true,
          maxAge: 600,
          sameSite: 'none',
        });

        return { authorizationUri };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * Apple OAuth 回调处理
   */
  fastify.post(
    '/apple/callback',
    {
      schema: {
        tags: ['auth'],
        description: 'Apple OAuth 回调处理',
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
            state: { type: 'string' },
            user: { type: 'object' },
          },
        },
        response: {
          302: {
            description: '重定向到前端',
            headers: {
              Location: {
                type: 'string',
                description: '前端回调地址',
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { code, state, user } = request.body;

        const savedState = request.cookies.oauth_state;
        if (!state || state !== savedState) {
          return reply.code(400).send({ error: '无效的 state 参数，可能的 CSRF 攻击' });
        }
        reply.clearCookie('oauth_state');

        const providerConfig = await fastify.oauth.getProviderConfig(PROVIDER_NAME);
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'Apple OAuth 未启用' });
        }

        const provider = await fastify.oauth.getProvider(PROVIDER_NAME);
        const { profile, providerAccountId, tokenData } = await provider.handleCallback(
          providerConfig,
          code,
          { user }
        );

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

        // 重定向到前端
        const frontendOrigin = request.cookies.oauth_frontend_origin || '';
        if (!frontendOrigin) {
          fastify.log.warn('Apple 回调未找到 oauth_frontend_origin cookie');
        }
        reply.clearCookie('oauth_frontend_origin');

        const baseUrl = frontendOrigin || '/';
        const frontendRedirectUrl = new URL(`${baseUrl}/auth/apple/callback`);
        frontendRedirectUrl.searchParams.set('token', authToken);
        frontendRedirectUrl.searchParams.set('status', 'success');

        return reply.redirect(frontendRedirectUrl.toString());
      } catch (error) {
        fastify.log.error(error);

        const frontendOrigin = request.cookies.oauth_frontend_origin || '';
        reply.clearCookie('oauth_frontend_origin');
        const baseUrl = frontendOrigin || '/';

        const errorRedirectUrl = new URL(`${baseUrl}/auth/apple/callback`);
        errorRedirectUrl.searchParams.set('error', error.message || 'Login failed');
        errorRedirectUrl.searchParams.set('status', 'error');
        return reply.redirect(errorRedirectUrl.toString());
      }
    }
  );
}
