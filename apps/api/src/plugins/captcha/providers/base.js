/**
 * BaseCaptchaProvider - 所有人机验证提供商的基类
 * 定义统一的验证接口
 */
import { CaptchaError, CaptchaErrorCode } from '../errors.js';

export class BaseCaptchaProvider {
  constructor() {
    this.name = 'base';
  }

  /**
   * 验证 CAPTCHA token
   * @param {string} token - 用户提交的 token
   * @param {Object} config - 配置对象
   * @param {string} ip - 用户 IP
   * @returns {Promise<{ success: boolean, reason?: string, message?: string }>}
   */
  async verify(token, config, ip) {
    throw new CaptchaError(
      CaptchaErrorCode.UNSUPPORTED_PROVIDER,
      'verify() 方法必须由子类实现'
    );
  }
}
