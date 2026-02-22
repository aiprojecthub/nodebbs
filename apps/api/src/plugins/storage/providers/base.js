/**
 * BaseStorageProvider - 所有存储提供商的基类
 * 定义统一的存储操作接口
 */
import { StorageError, StorageErrorCode } from '../errors.js';

export class BaseStorageProvider {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * 上传文件
   * @param {Buffer|Stream} fileData - 文件数据（Buffer 或 可读流）
   * @param {string} key - 存储路径/key（如 'topics/uuid.jpg'）
   * @param {object} options - 可选参数 { mimetype, size }
   * @returns {Promise<{ url: string, key: string }>}
   */
  async upload(fileData, key, options = {}) {
    throw new StorageError(
      StorageErrorCode.UNSUPPORTED_PROVIDER,
      'upload() 方法必须由子类实现'
    );
  }

  /**
   * 删除文件
   * @param {string} key - 存储路径/key
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new StorageError(
      StorageErrorCode.UNSUPPORTED_PROVIDER,
      'delete() 方法必须由子类实现'
    );
  }

  /**
   * 检查文件是否存在
   * @param {string} key - 存储路径/key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    throw new StorageError(
      StorageErrorCode.UNSUPPORTED_PROVIDER,
      'exists() 方法必须由子类实现'
    );
  }

  /**
   * 获取文件访问 URL
   * @param {string} key - 存储路径/key
   * @returns {string}
   */
  getUrl(key) {
    throw new StorageError(
      StorageErrorCode.UNSUPPORTED_PROVIDER,
      'getUrl() 方法必须由子类实现'
    );
  }

  /**
   * 从本地临时文件上传（默认读取 Buffer 后调用 upload）
   * @param {string} tmpPath - 临时文件路径
   * @param {string} key - 存储路径/key
   * @param {object} options - { mimetype, size }
   * @returns {Promise<{ url: string, key: string }>}
   */
  async uploadFromFile(tmpPath, key, options = {}) {
    const { promises: fsp } = await import('fs');
    const fileBuffer = await fsp.readFile(tmpPath);
    return this.upload(fileBuffer, key, options);
  }

  /**
   * 获取预签名上传 URL（客户端直传）
   * @param {string} key - 存储路径/key
   * @param {object} options - { mimetype, expires }
   * @returns {Promise<{ supported: boolean, url?: string, headers?: object }>}
   */
  async getPresignedUrl(key, options = {}) {
    return { supported: false };
  }

  /**
   * 验证配置是否完整
   * @param {object} config - 配置对象
   * @returns {{ valid: boolean, message?: string }}
   */
  validateConfig(config) {
    return { valid: true };
  }

  /**
   * 测试连接（上传一个小测试文件并删除）
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async testConnection() {
    const testKey = `_test_${Date.now()}.txt`;
    const testData = Buffer.from('storage-provider-test');
    try {
      await this.upload(testData, testKey, { mimetype: 'text/plain' });
      await this.delete(testKey);
      return { success: true, message: '连接测试成功' };
    } catch (err) {
      return { success: false, message: `连接测试失败: ${err.message}` };
    }
  }
}
