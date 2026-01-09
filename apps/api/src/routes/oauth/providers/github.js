/**
 * GitHub OAuth 路由
 */
import { normalizeOAuthProfile } from '../../../utils/oauth-helpers.js';
import { generateRandomState, handleOAuthLogin } from '../helpers.js';
import { isProd } from '../../../utils/env.js';

/**
 * 注册 GitHub OAuth 路由
 */
export default async function githubRoutes(fastify, options) {
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
        const providerConfig = await fastify.getOAuthProviderConfig('github');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'GitHub OAuth 未启用' });
        }

        if (!providerConfig.clientId) {
          return reply.code(500).send({ error: 'GitHub OAuth 配置不完整' });
        }

        let scope;
        try {
          scope = providerConfig.scope ? JSON.parse(providerConfig.scope) : ['user:email', 'read:user'];
        } catch {
          scope = ['user:email', 'read:user'];
        }

        const state = generateRandomState();
        const params = new URLSearchParams({
          client_id: providerConfig.clientId,
          redirect_uri: providerConfig.callbackUrl,
          scope: scope.join(' '),
          state: state,
        });

        const authorizationUri = `https://github.com/login/oauth/authorize?${params.toString()}`;

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

        const providerConfig = await fastify.getOAuthProviderConfig('github');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'GitHub OAuth 未启用' });
        }

        // 用 code 换取 access_token
        const tokenResponse = await fetch(
          'https://github.com/login/oauth/access_token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              client_id: providerConfig.clientId,
              client_secret: providerConfig.clientSecret,
              code: code,
              redirect_uri: providerConfig.callbackUrl,
            }),
          }
        );

        if (!tokenResponse.ok) {
          throw new Error('代码换取 Token 失败');
        }

        const token = await tokenResponse.json();

        if (token.error) {
          throw new Error(token.error_description || token.error);
        }

        // 获取用户信息
        const userInfoResponse = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            'User-Agent': 'Fastify-OAuth-App',
          },
        });

        if (!userInfoResponse.ok) {
          throw new Error('获取 GitHub 用户信息失败');
        }

        const githubUser = await userInfoResponse.json();

        // 如果没有公开邮箱，获取邮箱列表
        if (!githubUser.email) {
          const emailResponse = await fetch(
            'https://api.github.com/user/emails',
            {
              headers: {
                Authorization: `Bearer ${token.access_token}`,
                'User-Agent': 'Fastify-OAuth-App',
              },
            }
          );

          if (emailResponse.ok) {
            const emails = await emailResponse.json();
            const primaryEmail = emails.find((e) => e.primary && e.verified);
            if (primaryEmail) {
              githubUser.email = primaryEmail.email;
            }
          }
        }

        // 处理 OAuth 登录
        const result = await handleOAuthLogin(
          fastify,
          'github',
          githubUser.id.toString(),
          normalizeOAuthProfile('github', githubUser),
          {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: token.expires_in
              ? new Date(Date.now() + token.expires_in * 1000)
              : null,
            tokenType: token.token_type,
            scope: token.scope,
          }
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
