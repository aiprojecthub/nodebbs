/**
 * OAuth 服务统一错误类
 */
export class OAuthError extends Error {
  /**
   * @param {string} code - 错误码
   * @param {string} message - 错误消息
   * @param {object} details - 额外的错误详情
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'OAuthError';
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

export const OAuthErrorCode = {
  PROVIDER_NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  PROVIDER_DISABLED: 'PROVIDER_DISABLED',
  UNSUPPORTED_PROVIDER: 'UNSUPPORTED_PROVIDER',
  INVALID_CONFIG: 'INVALID_CONFIG',
  INVALID_STATE: 'INVALID_STATE',
  TOKEN_EXCHANGE_FAILED: 'TOKEN_EXCHANGE_FAILED',
  USER_INFO_FAILED: 'USER_INFO_FAILED',
  LOGIN_FAILED: 'LOGIN_FAILED',
};
