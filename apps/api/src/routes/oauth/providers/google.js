/**
 * Google OAuth 路由
 */
import { normalizeOAuthProfile } from '../../../utils/oauth-helpers.js';
import { generateRandomState, handleOAuthLogin } from '../helpers.js';
import { isProd } from '../../../utils/env.js';
import jwt from 'jsonwebtoken';

/**
 * 注册 Google OAuth 路由
 */
export default async function googleRoutes(fastify, options) {
  /**
   * 获取 Google OAuth 授权链接
   */
  fastify.get(
    '/google/connect',
    {
      schema: {
        tags: ['auth'],
        description: '获取 Google OAuth 授权链接',
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
        const providerConfig = await fastify.getOAuthProviderConfig('google');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'Google OAuth 未启用' });
        }

        if (!providerConfig.clientId) {
          return reply.code(500).send({ error: 'Google OAuth 配置不完整' });
        }

        let scope;
        try {
          scope = providerConfig.scope ? JSON.parse(providerConfig.scope) : ['openid', 'profile', 'email'];
        } catch {
          scope = ['openid', 'profile', 'email'];
        }

        const state = generateRandomState();
        const params = new URLSearchParams({
          client_id: providerConfig.clientId,
          redirect_uri: providerConfig.callbackUrl,
          scope: scope.join(' '),
          state: state,
          response_type: 'code',
          access_type: 'offline',
          prompt: 'consent',
        });

        const authorizationUri = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

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
   * Google OAuth 回调处理
   */
  fastify.post(
    '/google/callback',
    {
      schema: {
        tags: ['auth'],
        description: 'Google OAuth 回调处理',
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

        const providerConfig = await fastify.getOAuthProviderConfig('google');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'Google OAuth 未启用' });
        }

        // 用 code 换取 access_token
        const tokenResponse = await fetch(
          'https://oauth2.googleapis.com/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: providerConfig.clientId,
              client_secret: providerConfig.clientSecret,
              code: code,
              redirect_uri: providerConfig.callbackUrl,
              grant_type: 'authorization_code',
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

        // 从 id_token 解析用户信息
        const idToken = token.id_token;
        if (!idToken) {
          throw new Error('未收到 id_token');
        }

        const googleUser = jwt.decode(idToken);
        if (!googleUser) {
          throw new Error('解码 id_token 失败');
        }

        const result = await handleOAuthLogin(
          fastify,
          'google',
          googleUser.sub,
          normalizeOAuthProfile('google', {
            id: googleUser.sub,
            email: googleUser.email,
            email_verified: googleUser.email_verified,
            name: googleUser.name,
            picture: googleUser.picture,
          }),
          {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: token.expires_in
              ? new Date(Date.now() + token.expires_in * 1000)
              : null,
            tokenType: token.token_type,
            scope: token.scope,
            idToken: token.id_token,
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
