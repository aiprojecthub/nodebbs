/**
 * 人机验证服务统一错误类
 */
export class CaptchaError extends Error {
  /**
   * @param {string} code - 错误码
   * @param {string} message - 错误消息
   * @param {object} details - 额外的错误详情
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'CaptchaError';
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export const CaptchaErrorCode = {
  PROVIDER_NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  UNSUPPORTED_PROVIDER: 'UNSUPPORTED_PROVIDER',
  INVALID_CONFIG: 'INVALID_CONFIG',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  TOKEN_MISSING: 'TOKEN_MISSING',
  REQUEST_ERROR: 'REQUEST_ERROR',
};
