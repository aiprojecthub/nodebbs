/**
 * Google reCAPTCHA 验证提供商
 * 支持 v2 和 v3 版本
 */
import { BaseCaptchaProvider } from './base.js';

export class ReCaptchaProvider extends BaseCaptchaProvider {
  constructor() {
    super();
    this.name = 'recaptcha';
    this.defaultEndpoint = 'https://www.google.com/recaptcha/api/siteverify';
  }

  /**
   * 验证 reCAPTCHA token
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
        message: 'reCAPTCHA 配置错误',
      };
    }

    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    // 可选：添加 IP 地址用于额外验证
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

      // reCAPTCHA v3 返回 score，v2 只返回 success
      if (data.success) {
        // v3 版本需要检查分数
        if (config.version === 'v3' && typeof data.score === 'number') {
          const threshold = config.scoreThreshold || 0.5;
          if (data.score < threshold) {
            return {
              success: false,
              reason: 'low_score',
              message: '验证未通过，请重试',
              score: data.score,
            };
          }
        }

        return {
          success: true,
          score: data.score,
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
      console.error('[reCAPTCHA] 验证请求失败:', error);
      return {
        success: false,
        reason: 'request_error',
        message: '验证服务暂时不可用',
      };
    }
  }
}
