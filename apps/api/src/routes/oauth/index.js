import {
  findUserByOAuthAccount,
  findUserByEmail,
  createOAuthUser,
  linkOAuthAccount,
  unlinkOAuthAccount,
  getUserAccounts,
  normalizeOAuthProfile,
} from '../../utils/oauth-helpers.js';
import db from '../../db/index.js';
import { oauthProviders, users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { isProd } from '../../utils/env.js';
import { getFrontendOrigin } from '../../utils/http-helpers.js';

/**
 * OAuth 认证路由
 */
export default async function oauthRoutes(fastify, options) {


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
        const isAdmin =
          request.user && ['admin', 'moderator'].includes(request.user.role);

        let items;

        if (isAdmin) {
          // 管理员：返回所有提供商的完整信息
          items = await db
            .select()
            .from(oauthProviders)
            .orderBy(oauthProviders.displayOrder);
        } else {
          // 公开：只返回已启用的提供商，不含敏感信息
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

        return {
          items,
        };
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
      preHandler: [fastify.authenticate, fastify.requireAdmin],
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
        // 检查提供商是否存在
        const existing = await db
          .select()
          .from(oauthProviders)
          .where(eq(oauthProviders.provider, provider))
          .limit(1);

        if (existing.length === 0) {
          return reply.code(404).send({ error: 'OAuth 提供商不存在' });
        }

        // 更新配置
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
      preHandler: [fastify.authenticate, fastify.requireAdmin],
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
        // 获取配置
        const config = await db
          .select()
          .from(oauthProviders)
          .where(eq(oauthProviders.provider, provider))
          .limit(1);

        if (config.length === 0) {
          return reply.code(404).send({ error: 'OAuth 提供商不存在' });
        }

        const providerConfig = config[0];

        // 检查必要的配置是否存在
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

  // ============= OAuth 认证流程 =============

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
        // 从数据库获取最新配置
        const providerConfig = await fastify.getOAuthProviderConfig('github');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'GitHub OAuth 未启用' });
        }

        if (!providerConfig.clientId) {
          return reply.code(500).send({ error: 'GitHub OAuth 配置不完整' });
        }

        // 解析 scope
        let scope;
        try {
          scope = providerConfig.scope ? JSON.parse(providerConfig.scope) : ['user:email', 'read:user'];
        } catch {
          scope = ['user:email', 'read:user'];
        }

        // 手动构建授权 URL
        const state = generateRandomState();
        const params = new URLSearchParams({
          client_id: providerConfig.clientId,
          // redirect_uri: providerConfig.callbackUrl || `${frontendUrl}/auth/github/callback`, // Removed frontendUrl
          redirect_uri: providerConfig.callbackUrl, // 必须在后台配置完整的 callbackUrl
          scope: scope.join(' '),
          state: state,
        });

        const authorizationUri = `https://github.com/login/oauth/authorize?${params.toString()}`;

        // 设置 state cookie 防止 CSRF
        reply.setCookie('oauth_state', state, {
          path: '/',
          httpOnly: true,
          secure: isProd,
          maxAge: 600, // 10 minutes
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
   * Google OAuth 授权链接
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
        // 从数据库获取最新配置
        const providerConfig = await fastify.getOAuthProviderConfig('google');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'Google OAuth 未启用' });
        }

        if (!providerConfig.clientId) {
          return reply.code(500).send({ error: 'Google OAuth 配置不完整' });
        }

        // 解析 scope
        let scope;
        try {
          scope = providerConfig.scope ? JSON.parse(providerConfig.scope) : ['openid', 'profile', 'email'];
        } catch {
          scope = ['openid', 'profile', 'email'];
        }

        // 手动构建授权 URL
        const state = generateRandomState();
        
        const params = new URLSearchParams({
          client_id: providerConfig.clientId,
          // redirect_uri: providerConfig.callbackUrl || `${frontendUrl}/auth/google/callback`,
          redirect_uri: providerConfig.callbackUrl,
          scope: scope.join(' '),
          state: state,
          response_type: 'code',
          access_type: 'offline',
          prompt: 'consent',
        });

        const authorizationUri = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

        // 设置 state cookie 防止 CSRF
        reply.setCookie('oauth_state', state, {
          path: '/',
          httpOnly: true,
          secure: isProd,
          maxAge: 600, // 10 minutes
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
   * Apple OAuth 授权链接
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
        // 从数据库获取最新配置
        const providerConfig = await fastify.getOAuthProviderConfig('apple');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'Apple OAuth 未启用' });
        }

        if (!providerConfig.clientId) {
          return reply.code(500).send({ error: 'Apple OAuth 配置不完整' });
        }

        // 解析 scope
        let scope;
        try {
          scope = providerConfig.scope ? JSON.parse(providerConfig.scope) : ['name', 'email'];
        } catch {
          scope = ['name', 'email'];
        }

        // 确定回调地址：优先使用配置，或者是前端代理的 API 地址
        // Apple 的 redirect_uri 必须是公网可访问的 URL，所以不能用 backendUrl (可能是内网 IP)
        // 我们利用 Next.js 的 /api 代理转发
        
        // 使用外部定义的 frontendUrl
        // const defaultCallbackUrl = `${frontendUrl}/api/oauth/apple/callback`;
        
        // 手动构建授权 URL
        const state = generateRandomState();

        // 对于Apple，必须配置准确的 callbackUrl，因为它是 POST 回调
        if (!providerConfig.callbackUrl) { 
           throw new Error('Apple OAuth 需要配置回调 URL');
        }

        const params = new URLSearchParams({
          client_id: providerConfig.clientId,
          redirect_uri: providerConfig.callbackUrl,
          scope: scope.join(' '),
          state: state,
          response_type: 'code id_token', 
          response_mode: 'form_post',
        });

        const authorizationUri = `https://appleid.apple.com/auth/authorize?${params.toString()}`;

        // 设置 state cookie 防止 CSRF (Apple 回调是 POST，必须用 None 否则无法携带 cookie)
        reply.setCookie('oauth_state', state, {
          path: '/',
          httpOnly: true,
          secure: true, // SameSite=None 必须配合 Secure
          maxAge: 600, // 10 minutes
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
        
        // 验证 state 防止 CSRF
        if (!state || state !== savedState) {
           return reply.code(400).send({ error: '无效的 state 参数，可能的 CSRF 攻击' });
        }
        
        // 清除 cookie
        reply.clearCookie('oauth_state');

        // 从数据库获取 GitHub 配置
        const providerConfig = await fastify.getOAuthProviderConfig('github');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'GitHub OAuth 未启用' });
        }

        // 手动构造 token 请求
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

        // 生成 Token 并设置 Cookie
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

        // 验证 state 防止 CSRF
        if (!state || state !== savedState) {
           return reply.code(400).send({ error: '无效的 state 参数，可能的 CSRF 攻击' });
        }
        
        // 清除 cookie
        reply.clearCookie('oauth_state');

        // 从数据库获取 Google 配置
        const providerConfig = await fastify.getOAuthProviderConfig('google');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'Google OAuth 未启用' });
        }

        // 手动构造 token 请求
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

        // 直接从 id_token 解析用户信息，避免再次请求 userinfo 接口
        const idToken = token.id_token;
        if (!idToken) {
           throw new Error('未收到 id_token');
        }
        
        // 简单解码 (生产环境建议验证签名)
        const googleUser = jwt.decode(idToken);
        if (!googleUser) {
           throw new Error('解码 id_token 失败');
        }

        const result = await handleOAuthLogin(
          fastify,
          'google',
          googleUser.sub, // Google id_token 中的 sub 即为用户 ID
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

        // 生成 Token 并设置 Cookie
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
            user: { type: 'object' }, // Apple 仅在首次登录时返回 user 信息
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
        
        // 验证 CSRF State
        const savedState = request.cookies.oauth_state;
        if (!state || state !== savedState) {
           return reply.code(400).send({ error: '无效的 state 参数，可能的 CSRF 攻击' });
        }
        // 清除 cookie
        reply.clearCookie('oauth_state');

        // Apple 返回的 user 是仅在首次登录时提供的 JSON 字符串
        let appleUserWrap = null;
        if (user) {
            try {
                appleUserWrap = typeof user === 'string' ? JSON.parse(user) : user;
            } catch (e) {
                fastify.log.warn('解析 Apple 用户 JSON 失败', e);
            }
        }


        // 从数据库获取 Apple 配置
        const providerConfig = await fastify.getOAuthProviderConfig('apple');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'Apple OAuth 未启用' });
        }

        // 解析额外配置 (Team ID, Key ID)
        let additionalConfig = {};
        try {
          additionalConfig = providerConfig.additionalConfig
            ? JSON.parse(providerConfig.additionalConfig)
            : {};
        } catch (e) {
          fastify.log.warn('Apple 额外配置解析失败', e);
        }

        const { teamId, keyId } = additionalConfig;

        if (!providerConfig.clientId || !providerConfig.clientSecret || !teamId || !keyId) {
          return reply.code(500).send({ error: 'Apple OAuth 配置不完整 (缺少 Team ID, Key ID 或 Key)' });
        }

        // 生成 Client Secret (JWT)
        const clientSecret = generateAppleClientSecret(
          providerConfig.clientId,
          teamId,
          keyId,
          providerConfig.clientSecret // 这里存储的是 Private Key
        );

        // 获取 Token
        const tokenResponse = await fetch(
          'https://appleid.apple.com/auth/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: providerConfig.clientId,
              client_secret: clientSecret,
              code: code,
              redirect_uri: providerConfig.callbackUrl,
              grant_type: 'authorization_code',
            }),
          }
        );

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          fastify.log.error(`Apple Token 交换失败: ${errorText}`);
          throw new Error('代码换取 Token 失败');
        }

        const token = await tokenResponse.json();

        if (token.error) {
          throw new Error(token.error_description || token.error);
        }

        // 验证 ID Token
        const idToken = token.id_token;
        if (!idToken) {
          throw new Error('未收到 Apple id_token');
        }

        const payload = await verifyAppleIdToken(idToken, providerConfig.clientId);

        // Apple 仅在首次授权时返回 user 字段 (包含 name)，后续只返回 email
        // 需要处理这种情况，如果 payload 中有 email，但 appleUserWrap 也是空的
        // 则只能获取到邮箱
        
        // 尝试从首次请求的 user 字段中获取名字
        let fullName = null;
        if (appleUserWrap) {
          try {
             const userObj = typeof appleUserWrap === 'string' ? JSON.parse(appleUserWrap) : appleUserWrap;
             if (userObj.name) {
               const { firstName, lastName } = userObj.name;
               if (firstName && lastName) {
                 fullName = `${firstName} ${lastName}`;
               } else {
                 fullName = firstName || lastName || null;
               }
             }
          } catch(e) {
            fastify.log.warn('解析 Apple 用户名失败', e);
          }
        }

        const profileData = {
          ...payload,
          name: fullName, // 传递可能存在的 name 信息 (String or null)
        };

        const result = await handleOAuthLogin(
          fastify,
          'apple',
          payload.sub,
          normalizeOAuthProfile('apple', profileData),
          {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: token.expires_in
              ? new Date(Date.now() + token.expires_in * 1000)
              : null,
            tokenType: token.token_type,
            idToken: idToken,
          }
        );

        // 生成 Token 并设置 Cookie (HttpOnly)
        const authToken = reply.generateAuthToken({
          id: result.user.id,
        });

        // 3. 构建前端重定向 URL
        // 从 Cookie 获取前端 Origin
        const frontendOrigin = request.cookies.oauth_frontend_origin || '';
        if (!frontendOrigin) {
             fastify.log.warn('Apple 回调未找到 oauth_frontend_origin cookie');
        }
        
        // 清除 cookie
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

/**
 * 生成 Apple Client Secret (JWT)
 */
function generateAppleClientSecret(clientId, teamId, keyId, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15777000; // 6个月 (Apple 允许最长 6 个月)

  return jwt.sign(
    {
      iss: teamId,
      iat: now,
      exp: exp,
      aud: 'https://appleid.apple.com',
      sub: clientId,
    },
    privateKey,
    {
      algorithm: 'ES256',
      header: {
        kid: keyId,
        typ: undefined, // Apple 可能会拒绝带有 typ 头的 JWT，具体视库实现而定，通常不需要
      },
    }
  );
}

/**
 * 验证 Apple ID Token
 * 简化版：只解码并验证 aud 和 iss，不联网获取公钥验证签名
 * 生产环境建议使用 jwks-rsa 等库获取 Apple 公钥进行完整验证
 */
async function verifyAppleIdToken(idToken, clientId) {
  const decoded = jwt.decode(idToken);
  
  if (!decoded) {
    throw new Error('无效的 ID Token');
  }

  if (decoded.iss !== 'https://appleid.apple.com') {
    throw new Error('ID Token 签发者无效');
  }

  if (decoded.aud !== clientId) {
    throw new Error('ID Token 受众无效');
  }

  // 检查有效期
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp < now) {
    throw new Error('ID Token 已过期');
  }

  return decoded;
}

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
      const { provider } = request.params;

      // TODO: 实现账号关联流程
      // 1. 生成 state 包含当前用户 ID
      // 2. 重定向到 OAuth 提供商
      // 3. 回调时检查 state，关联账号而不是登录

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

/**
 * 生成随机 state 参数
 */
function generateRandomState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * 处理 OAuth 登录的通用逻辑
 */
async function handleOAuthLogin(
  fastify,
  provider,
  providerAccountId,
  profile,
  tokenData
) {
  // 1. 查找是否已有关联账号
  let user = await findUserByOAuthAccount(provider, providerAccountId);

  if (user) {
    // 已有关联，更新 token 并登录
    await linkOAuthAccount(user.id, provider, {
      providerAccountId,
      ...tokenData,
    });

    // 用户是通过关联账号找到的
    // 如果 OAuth 提供商确认邮箱已验证，且当前用户未验证，则同步更新状态
    if (profile.isEmailVerified && !user.isEmailVerified && user.email === profile.email) {
          const [updatedUser] = await db.update(users)
            .set({ isEmailVerified: true, updatedAt: new Date() })
            .where(eq(users.id, user.id))
            .returning();
          user = updatedUser;
    }
  } else {
    // 2. 如果有邮箱，查找是否已有相同邮箱的用户
    if (profile.email) {
      user = await findUserByEmail(profile.email);

      if (user) {
        // 邮箱已存在，关联到现有用户
        await linkOAuthAccount(user.id, provider, {
          providerAccountId,
          ...tokenData,
        });

        // 如果 OAuth 提供商确认邮箱已验证，且当前用户未验证，则更新状态
        if (profile.isEmailVerified && !user.isEmailVerified) {
             const [updatedUser] = await db.update(users)
                .set({ isEmailVerified: true, updatedAt: new Date() })
                .where(eq(users.id, user.id))
                .returning();
             user = updatedUser; // 更新本地 user 对象
        }
      }
    }

    // 3. 创建新用户（需要检查注册模式）
    if (!user) {
      // 检查注册模式
      const { getSetting } = await import('../../utils/settings.js');
      const registrationMode = await getSetting('registration_mode', 'open');
      
      if (registrationMode === 'closed') {
        throw new Error('系统当前已关闭用户注册，无法通过 OAuth 创建新账号');
      }
      
      // 邀请码模式下，OAuth 登录也需要邀请码（可选：根据需求决定是否允许）
      // 这里我们允许 OAuth 登录绕过邀请码限制，因为 OAuth 本身就是一种验证
      // 如果需要严格限制，可以在这里添加邀请码检查
      
      user = await createOAuthUser(profile, provider);
      await linkOAuthAccount(user.id, provider, {
        providerAccountId,
        ...tokenData,
      });
    }
  }

  // 检查用户是否被删除
  if (user.isDeleted) {
    throw new Error('该账号已被删除');
  }

  // 检查用户是否被封禁
  if (user.isBanned) {
    throw new Error('账号已被封禁');
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
  };
}
