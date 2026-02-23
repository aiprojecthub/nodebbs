/**
 * OAuth 提供商工厂
 * 动态导入对应的 provider 实现
 */
import { OAuthError, OAuthErrorCode } from '../errors.js';

/**
 * 提供商映射表
 * key: 提供商标识（与数据库中的 provider 字段一致）
 * value: 异步工厂函数，返回 provider 实例
 */
const providerFactories = {
  github: async () => {
    const { GitHubProvider } = await import('./github.js');
    return new GitHubProvider();
  },
  google: async () => {
    const { GoogleProvider } = await import('./google.js');
    return new GoogleProvider();
  },
  apple: async () => {
    const { AppleProvider } = await import('./apple.js');
    return new AppleProvider();
  },
  wechat_open: async () => {
    const { WechatOpenProvider } = await import('./wechat.js');
    return new WechatOpenProvider();
  },
  wechat_mp: async () => {
    const { WechatMpProvider } = await import('./wechat.js');
    return new WechatMpProvider();
  },
  wechat_miniprogram: async () => {
    const { WechatMiniprogramProvider } = await import('./wechat.js');
    return new WechatMiniprogramProvider();
  },
};

/**
 * 根据提供商名称创建对应的 OAuth 提供商实例
 * @param {string} name - 提供商名称
 * @returns {Promise<BaseOAuthProvider>}
 */
export async function createOAuthProvider(name) {
  const factory = providerFactories[name];
  if (!factory) {
    throw new OAuthError(
      OAuthErrorCode.UNSUPPORTED_PROVIDER,
      `不支持的 OAuth 提供商: ${name}`
    );
  }
  return factory();
}

/**
 * 获取所有支持的提供商名称列表
 */
export function getSupportedProviders() {
  return Object.keys(providerFactories);
}
