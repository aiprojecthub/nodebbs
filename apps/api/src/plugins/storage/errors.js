/**
 * 存储服务统一错误类
 */
export class StorageError extends Error {
  /**
   * @param {string} code - 错误码
   * @param {string} message - 错误消息
   * @param {object} details - 额外的错误详情
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'StorageError';
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

export const StorageErrorCode = {
  PROVIDER_NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  PROVIDER_DISABLED: 'PROVIDER_DISABLED',
  INVALID_CONFIG: 'INVALID_CONFIG',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  UNSUPPORTED_PROVIDER: 'UNSUPPORTED_PROVIDER',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
};
