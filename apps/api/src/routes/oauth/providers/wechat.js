/**
 * 微信 OAuth 路由（开放平台、公众号、小程序）
 */
import { normalizeOAuthProfile } from '../../../utils/oauth-helpers.js';
import { generateRandomState, handleOAuthLogin } from '../helpers.js';
import { isProd } from '../../../utils/env.js';

/**
 * 注册微信 OAuth 路由
 */
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
        const config = await fastify.getOAuthProviderConfig('wechat_open');
        if (!config || !config.isEnabled) {
          return reply.code(500).send({ error: '微信扫码登录未启用' });
        }

        if (!config.clientId || !config.clientSecret) {
          return reply.code(500).send({ error: '微信开放平台配置不完整' });
        }

        const state = generateRandomState();
        const params = new URLSearchParams({
          appid: config.clientId,
          redirect_uri: config.callbackUrl,
          response_type: 'code',
          scope: 'snsapi_login',
          state: state,
        });

        const authorizationUri = `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;

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

        const config = await fastify.getOAuthProviderConfig('wechat_open');
        if (!config || !config.isEnabled) {
          return reply.code(500).send({ error: '微信扫码登录未启用' });
        }

        const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.clientId}&secret=${config.clientSecret}&code=${code}&grant_type=authorization_code`;
        const tokenResponse = await fetch(tokenUrl);
        const tokenData = await tokenResponse.json();

        if (tokenData.errcode) {
          throw new Error(tokenData.errmsg || '获取 access_token 失败');
        }

        const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`;
        const userInfoResponse = await fetch(userInfoUrl);
        const wechatUser = await userInfoResponse.json();

        if (wechatUser.errcode) {
          throw new Error(wechatUser.errmsg || '获取用户信息失败');
        }

        const result = await handleOAuthLogin(
          fastify,
          'wechat_open',
          wechatUser.unionid || wechatUser.openid,
          normalizeOAuthProfile('wechat', wechatUser),
          {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: tokenData.expires_in
              ? new Date(Date.now() + tokenData.expires_in * 1000)
              : null,
            scope: tokenData.scope,
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
        const config = await fastify.getOAuthProviderConfig('wechat_mp');
        if (!config || !config.isEnabled) {
          return reply.code(500).send({ error: '微信公众号授权未启用' });
        }

        if (!config.clientId) {
          return reply.code(500).send({ error: '微信公众号配置不完整' });
        }

        const state = generateRandomState();
        const params = new URLSearchParams({
          appid: config.clientId,
          redirect_uri: config.callbackUrl,
          response_type: 'code',
          scope: 'snsapi_userinfo',
          state: state,
        });

        const authorizationUri = `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;

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

        const config = await fastify.getOAuthProviderConfig('wechat_mp');
        if (!config || !config.isEnabled) {
          return reply.code(500).send({ error: '微信公众号授权未启用' });
        }

        const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.clientId}&secret=${config.clientSecret}&code=${code}&grant_type=authorization_code`;
        const tokenResponse = await fetch(tokenUrl);
        const tokenData = await tokenResponse.json();

        if (tokenData.errcode) {
          throw new Error(tokenData.errmsg || '获取 access_token 失败');
        }

        const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`;
        const userInfoResponse = await fetch(userInfoUrl);
        const wechatUser = await userInfoResponse.json();

        if (wechatUser.errcode) {
          throw new Error(wechatUser.errmsg || '获取用户信息失败');
        }

        const result = await handleOAuthLogin(
          fastify,
          'wechat_mp',
          wechatUser.unionid || wechatUser.openid,
          normalizeOAuthProfile('wechat', wechatUser),
          {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: tokenData.expires_in
              ? new Date(Date.now() + tokenData.expires_in * 1000)
              : null,
            scope: tokenData.scope,
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

        const config = await fastify.getOAuthProviderConfig('wechat_miniprogram');
        if (!config || !config.isEnabled) {
          return reply.code(500).send({ error: '微信小程序登录未启用' });
        }

        const sessionUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${config.clientId}&secret=${config.clientSecret}&js_code=${code}&grant_type=authorization_code`;
        const sessionResponse = await fetch(sessionUrl);
        const sessionData = await sessionResponse.json();

        if (sessionData.errcode) {
          throw new Error(sessionData.errmsg || '小程序登录失败');
        }

        const wechatProfile = {
          openid: sessionData.openid,
          unionid: sessionData.unionid,
          nickname: userInfo?.nickName || null,
          headimgurl: userInfo?.avatarUrl || null,
        };

        const result = await handleOAuthLogin(
          fastify,
          'wechat_miniprogram',
          sessionData.unionid || sessionData.openid,
          normalizeOAuthProfile('wechat', wechatProfile),
          {
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
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
