/**
 * 微信 OAuth 提供商（开放平台、公众号、小程序）
 */
import { BaseOAuthProvider } from './base.js';
import { normalizeOAuthProfile } from './normalize.js';

/**
 * 微信网页授权通用回调（开放平台 & 公众号共用）
 */
async function wechatWebHandleCallback(config, code) {
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

  return {
    profile: normalizeOAuthProfile('wechat', wechatUser),
    providerAccountId: wechatUser.unionid || wechatUser.openid,
    tokenData: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
      scope: tokenData.scope,
    },
  };
}

/**
 * 微信开放平台（Web 扫码登录）
 */
export class WechatOpenProvider extends BaseOAuthProvider {
  constructor() {
    super();
    this.name = 'wechat_open';
  }

  async getAuthorizationUrl(config, state) {
    const params = new URLSearchParams({
      appid: config.clientId,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: 'snsapi_login',
      state,
    });

    return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  }

  async handleCallback(config, code) {
    return wechatWebHandleCallback(config, code);
  }
}

/**
 * 微信公众号（H5 网页授权）
 */
export class WechatMpProvider extends BaseOAuthProvider {
  constructor() {
    super();
    this.name = 'wechat_mp';
  }

  async getAuthorizationUrl(config, state) {
    const params = new URLSearchParams({
      appid: config.clientId,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: 'snsapi_userinfo',
      state,
    });

    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
  }

  async handleCallback(config, code) {
    return wechatWebHandleCallback(config, code);
  }
}

/**
 * 微信小程序登录
 */
export class WechatMiniprogramProvider extends BaseOAuthProvider {
  constructor() {
    super();
    this.name = 'wechat_miniprogram';
  }

  /**
   * 小程序不需要授权 URL（前端直接调用 wx.login）
   */
  async getAuthorizationUrl() {
    throw new Error('微信小程序不支持授权 URL，请使用前端 wx.login 获取 code');
  }

  async handleCallback(config, code, extra = {}) {
    const { userInfo } = extra;

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

    return {
      profile: normalizeOAuthProfile('wechat', wechatProfile),
      providerAccountId: sessionData.unionid || sessionData.openid,
      tokenData: {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      },
    };
  }
}
