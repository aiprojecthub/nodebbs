/**
 * Cloudflare Turnstile 验证提供商
 */
import { BaseCaptchaProvider } from './base.js';

export class TurnstileProvider extends BaseCaptchaProvider {
  constructor() {
    super();
    this.name = 'turnstile';
    this.defaultEndpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  }

  /**
   * 验证 Turnstile token
   * @param {string} token - 用户提交的 token (cf-turnstile-response)
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
        message: 'Turnstile 配置错误',
      };
    }

    const body = {
      secret: secretKey,
      response: token,
    };

    // 可选：添加 IP 地址用于额外验证
    if (ip) {
      body.remoteip = ip;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          cdata: data.cdata, // 客户端数据
          action: data.action,
        };
      }

      return {
        success: false,
        reason: 'verification_failed',
        message: '验证失败，请重试',
        errors: data['error-codes'],
      };
    } catch (error) {
      console.error('[Turnstile] 验证请求失败:', error);
      return {
        success: false,
        reason: 'request_error',
        message: '验证服务暂时不可用',
      };
    }
  }
}
