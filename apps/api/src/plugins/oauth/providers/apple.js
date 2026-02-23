/**
 * Apple OAuth 提供商
 */
import jwt from 'jsonwebtoken';
import { BaseOAuthProvider } from './base.js';
import { normalizeOAuthProfile } from './normalize.js';

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

export class AppleProvider extends BaseOAuthProvider {
  constructor() {
    super();
    this.name = 'apple';
  }

  async getAuthorizationUrl(config, state) {
    const scope = this.parseScope(config.scope, ['name', 'email']);

    if (!config.callbackUrl) {
      throw new Error('Apple OAuth 需要配置回调 URL');
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: scope.join(' '),
      state,
      response_type: 'code id_token',
      response_mode: 'form_post',
    });

    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  validateConfig(config) {
    const base = super.validateConfig(config);
    if (!base.valid) return base;

    const additional = this.parseAdditionalConfig(config.additionalConfig);
    if (!additional.teamId) {
      return { valid: false, message: '缺少 Team ID' };
    }
    if (!additional.keyId) {
      return { valid: false, message: '缺少 Key ID' };
    }
    return { valid: true };
  }

  async handleCallback(config, code, extra = {}) {
    const { user: appleUserRaw } = extra;

    // 解析 Apple 用户信息
    let appleUserWrap = null;
    if (appleUserRaw) {
      try {
        appleUserWrap = typeof appleUserRaw === 'string' ? JSON.parse(appleUserRaw) : appleUserRaw;
      } catch {
        // ignore parse error
      }
    }

    const additionalConfig = this.parseAdditionalConfig(config.additionalConfig);
    const { teamId, keyId } = additionalConfig;

    if (!config.clientId || !config.clientSecret || !teamId || !keyId) {
      throw new Error('Apple OAuth 配置不完整 (缺少 Team ID, Key ID 或 Key)');
    }

    // 生成 Client Secret
    const clientSecret = generateAppleClientSecret(
      config.clientId,
      teamId,
      keyId,
      config.clientSecret
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
          client_id: config.clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: config.callbackUrl,
          grant_type: 'authorization_code',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Apple Token 交换失败: ${errorText}`);
    }

    const token = await tokenResponse.json();

    if (token.error) {
      throw new Error(token.error_description || token.error);
    }

    const idToken = token.id_token;
    if (!idToken) {
      throw new Error('未收到 Apple id_token');
    }

    const payload = await verifyAppleIdToken(idToken, config.clientId);

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
      } catch {
        // ignore
      }
    }

    const profileData = {
      ...payload,
      name: fullName,
    };

    return {
      profile: normalizeOAuthProfile('apple', profileData),
      providerAccountId: payload.sub,
      tokenData: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : null,
        tokenType: token.token_type,
        idToken,
      },
    };
  }
}
