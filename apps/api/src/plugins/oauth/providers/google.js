/**
 * Google OAuth 提供商
 */
import jwt from 'jsonwebtoken';
import { BaseOAuthProvider } from './base.js';
import { normalizeOAuthProfile } from './normalize.js';

export class GoogleProvider extends BaseOAuthProvider {
  constructor() {
    super();
    this.name = 'google';
  }

  async getAuthorizationUrl(config, state) {
    const scope = this.parseScope(config.scope, ['openid', 'profile', 'email']);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: scope.join(' '),
      state,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(config, code) {
    // 用 code 换取 access_token
    const tokenResponse = await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.callbackUrl,
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

    return {
      profile: normalizeOAuthProfile('google', {
        id: googleUser.sub,
        email: googleUser.email,
        email_verified: googleUser.email_verified,
        name: googleUser.name,
        picture: googleUser.picture,
      }),
      providerAccountId: googleUser.sub,
      tokenData: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : null,
        tokenType: token.token_type,
        scope: token.scope,
        idToken: token.id_token,
      },
    };
  }
}
