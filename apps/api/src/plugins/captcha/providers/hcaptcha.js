/**
 * hCaptcha 验证提供商
 */
import { BaseCaptchaProvider } from './base.js';

export class HCaptchaProvider extends BaseCaptchaProvider {
  constructor() {
    super();
    this.name = 'hcaptcha';
    this.defaultEndpoint = 'https://hcaptcha.com/siteverify';
  }

  /**
   * 验证 hCaptcha token
   * @param {string} token - 用户提交的 token
   * @param {Object} config - 配置对象
   * @param {string} ip - 用户 IP
   * @returns {Object} 验证结果
   */
  async verify(token, config, ip) {
    const endpoint = config.verifyEndpoint || this.defaultEndpoint;
    const secretKey = config.secretKey;

    if (!secretKey) {
      return {
        success: false,
        reason: 'missing_secret_key',
        message: 'hCaptcha 配置错误',
      };
    }

    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    // 可选：添加 sitekey 用于额外验证
    if (config.siteKey) {
      params.append('sitekey', config.siteKey);
    }

    // 可选：添加 IP 地址
    if (ip) {
      params.append('remoteip', ip);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          credit: data.credit, // 是否为企业验证
        };
      }

      return {
        success: false,
        reason: 'verification_failed',
        message: '验证失败，请重试',
        errors: data['error-codes'],
      };
    } catch (error) {
      console.error('[hCaptcha] 验证请求失败:', error);
      return {
        success: false,
        reason: 'request_error',
        message: '验证服务暂时不可用',
      };
    }
  }
}
