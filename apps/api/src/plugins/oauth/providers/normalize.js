/**
 * 从 OAuth 提供商的用户信息中提取标准化的 profile
 */
import { normalizeEmail } from '../../../utils/normalization.js';

export function normalizeOAuthProfile(provider, rawProfile) {
  switch (provider) {
    case 'github':
      return {
        id: rawProfile.id.toString(),
        email: normalizeEmail(rawProfile.email),
        name: rawProfile.name || rawProfile.login,
        username: rawProfile.login,
        avatar: rawProfile.avatar_url,
        isEmailVerified: true,
      };

    case 'google':
      return {
        id: rawProfile.sub || rawProfile.id,
        email: normalizeEmail(rawProfile.email),
        name: rawProfile.name,
        username: rawProfile.email?.split('@')[0],
        avatar: rawProfile.picture,
        isEmailVerified: rawProfile.email_verified === true,
      };

    case 'apple':
      return {
        id: rawProfile.sub,
        email: normalizeEmail(rawProfile.email),
        name: rawProfile.name || rawProfile.email?.split('@')[0],
        username: rawProfile.email?.split('@')[0],
        avatar: null,
        isEmailVerified: true,
      };

    case 'wechat':
      return {
        id: rawProfile.unionid || rawProfile.openid,
        email: null,
        name: rawProfile.nickname,
        username: null,
        avatar: rawProfile.headimgurl,
        isEmailVerified: false,
      };

    default:
      return {
        id: rawProfile.id?.toString(),
        email: normalizeEmail(rawProfile.email),
        name: rawProfile.name,
        username: rawProfile.username || rawProfile.email?.split('@')[0],
        avatar: rawProfile.avatar || rawProfile.picture,
        isEmailVerified: !!rawProfile.email_verified,
      };
  }
}
