/**
 * BaseOAuthProvider - 所有 OAuth 提供商的基类
 * 定义统一的 OAuth 流程接口
 */
import { OAuthError, OAuthErrorCode } from '../errors.js';

export class BaseOAuthProvider {
  constructor() {
    this.name = 'base';
  }

  /**
   * 构建授权 URL
   * @param {object} config - 提供商数据库配置
   * @param {string} state - CSRF state 参数
   * @returns {Promise<string>} 授权 URL
   */
  async getAuthorizationUrl(config, state) {
    throw new OAuthError(
      OAuthErrorCode.UNSUPPORTED_PROVIDER,
      'getAuthorizationUrl() 方法必须由子类实现'
    );
  }

  /**
   * 用授权码换取 token 并获取用户信息
   * @param {object} config - 提供商数据库配置
   * @param {string} code - 授权码
   * @param {object} [extra] - 额外参数（如 Apple 的 user 对象）
   * @returns {Promise<{ profile: object, tokenData: object, providerAccountId: string }>}
   */
  async handleCallback(config, code, extra) {
    throw new OAuthError(
      OAuthErrorCode.UNSUPPORTED_PROVIDER,
      'handleCallback() 方法必须由子类实现'
    );
  }

  /**
   * 解析 scope 配置
   * @param {string|null} scopeStr - 数据库中的 JSON scope 字符串
   * @param {string[]} defaultScope - 默认 scope
   * @returns {string[]}
   */
  parseScope(scopeStr, defaultScope) {
    try {
      return scopeStr ? JSON.parse(scopeStr) : defaultScope;
    } catch {
      return defaultScope;
    }
  }

  /**
   * 解析 additionalConfig
   * @param {string|null} configStr - JSON 字符串
   * @returns {object}
   */
  parseAdditionalConfig(configStr) {
    try {
      return configStr ? JSON.parse(configStr) : {};
    } catch {
      return {};
    }
  }

  /**
   * 验证配置完整性
   * @param {object} config - 提供商配置
   * @returns {{ valid: boolean, message?: string }}
   */
  validateConfig(config) {
    if (!config.clientId) {
      return { valid: false, message: '缺少 Client ID' };
    }
    if (!config.clientSecret) {
      return { valid: false, message: '缺少 Client Secret' };
    }
    return { valid: true };
  }

  /**
   * 带超时的 fetch 请求
   * @param {string} url
   * @param {object} options - fetch options
   * @param {number} timeoutMs - 超时毫秒数，默认 30000
   * @returns {Promise<Response>}
   */
  async fetch(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`OAuth 请求超时 (${timeoutMs}ms): ${url}`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
