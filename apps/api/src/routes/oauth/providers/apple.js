/**
 * Apple OAuth 路由
 */
import { normalizeOAuthProfile } from '../../../utils/oauth-helpers.js';
import { generateRandomState, handleOAuthLogin } from '../helpers.js';
import { getFrontendOrigin } from '../../../utils/http-helpers.js';
import jwt from 'jsonwebtoken';

/**
 * 生成 Apple Client Secret (JWT)
 */
function generateAppleClientSecret(clientId, teamId, keyId, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15777000; // 6个月

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
        typ: undefined,
      },
    }
  );
}

/**
 * 验证 Apple ID Token
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

  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp < now) {
    throw new Error('ID Token 已过期');
  }

  return decoded;
}

/**
 * 注册 Apple OAuth 路由
 */
export default async function appleRoutes(fastify, options) {
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
        const providerConfig = await fastify.getOAuthProviderConfig('apple');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'Apple OAuth 未启用' });
        }

        if (!providerConfig.clientId) {
          return reply.code(500).send({ error: 'Apple OAuth 配置不完整' });
        }

        let scope;
        try {
          scope = providerConfig.scope ? JSON.parse(providerConfig.scope) : ['name', 'email'];
        } catch {
          scope = ['name', 'email'];
        }

        const state = generateRandomState();

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

        // 解析 Apple 用户信息
        let appleUserWrap = null;
        if (user) {
          try {
            appleUserWrap = typeof user === 'string' ? JSON.parse(user) : user;
          } catch (e) {
            fastify.log.warn('解析 Apple 用户 JSON 失败', e);
          }
        }

        const providerConfig = await fastify.getOAuthProviderConfig('apple');
        if (!providerConfig || !providerConfig.isEnabled) {
          return reply.code(500).send({ error: 'Apple OAuth 未启用' });
        }

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

        // 生成 Client Secret
        const clientSecret = generateAppleClientSecret(
          providerConfig.clientId,
          teamId,
          keyId,
          providerConfig.clientSecret
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

        const idToken = token.id_token;
        if (!idToken) {
          throw new Error('未收到 Apple id_token');
        }

        const payload = await verifyAppleIdToken(idToken, providerConfig.clientId);

        // 提取用户名
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
          name: fullName,
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
