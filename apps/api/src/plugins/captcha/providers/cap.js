/**
 * Cap (https://capjs.js.org) 验证提供商
 * 隐私优先、自托管的 proof-of-work CAPTCHA
 */
import { BaseCaptchaProvider } from './base.js';

export class CapProvider extends BaseCaptchaProvider {
  constructor() {
    super();
    this.name = 'cap';
  }

  /**
   * 验证 Cap token
   * 必须配置 apiEndpoint 使用 Standalone 模式
   *
   * @param {string} token - 用户提交的 token
   * @param {Object} config - 配置对象
   * @param {string} ip - 用户 IP
   * @returns {Object} 验证结果
   */
  async verify(token, config, ip) {
    if (!token) {
      return {
        success: false,
        reason: 'token_missing',
        message: '请完成人机验证',
      };
    }

    // 检查配置
    if (!config.apiEndpoint) {
      return {
        success: false,
        reason: 'missing_configuration',
        message: 'Cap 服务未配置 API 端点',
      };
    }

    return this.verifyStandalone(token, config);
  }

  /**
   * Standalone 模式验证
   * 调用 Cap 服务的 /siteverify 端点
   */
  async verifyStandalone(token, config) {
    // 移除末尾斜杠，防止双斜杠问题
    const baseUrl = config.apiEndpoint.replace(/\/$/, '');
    const endpoint = `${baseUrl}/siteverify`;

    try {
      const params = new URLSearchParams();
      params.append('secret', config.secretKey);
      params.append('response', token);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[Cap] Standalone verify failed: ${response.status} ${text} URL: ${endpoint}`);
         return {
          success: false,
          reason: 'request_error',
          message: '验证服务响应错误',
        };
      }

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
        };
      }

      return {
        success: false,
        reason: 'verification_failed',
        message: '验证失败，请重试',
        errors: data.errors,
      };
    } catch (error) {
      console.error('[Cap] Standalone 验证请求失败:', error);
      return {
        success: false,
        reason: 'request_error',
        message: '验证服务暂时不可用',
      };
    }
  }
}
