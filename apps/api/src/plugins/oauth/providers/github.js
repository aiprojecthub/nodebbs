/**
 * GitHub OAuth 提供商
 */
import { BaseOAuthProvider } from './base.js';
import { normalizeOAuthProfile } from './normalize.js';

export class GitHubProvider extends BaseOAuthProvider {
  constructor() {
    super();
    this.name = 'github';
  }

  async getAuthorizationUrl(config, state) {
    const scope = this.parseScope(config.scope, ['user:email', 'read:user']);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: scope.join(' '),
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async handleCallback(config, code) {
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
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.callbackUrl,
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

    return {
      profile: normalizeOAuthProfile('github', githubUser),
      providerAccountId: githubUser.id.toString(),
      tokenData: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : null,
        tokenType: token.token_type,
        scope: token.scope,
      },
    };
  }
}
