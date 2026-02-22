/**
 * 本地文件系统存储提供商
 */
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { BaseStorageProvider } from './base.js';
import { StorageError, StorageErrorCode } from '../errors.js';

// providers/ → storage/ → plugins/ → src/ → apps/api/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', '..', '..', 'uploads');

export class LocalStorageProvider extends BaseStorageProvider {
  constructor(config = {}) {
    super(config);
    this.basePath = uploadsDir;
    this.baseUrl = '/uploads';
  }

  /**
   * 校验 key 解析后的路径不会逃逸出 basePath（防路径遍历）
   */
  _safePath(key) {
    const filepath = path.resolve(this.basePath, key);
    if (!filepath.startsWith(this.basePath + path.sep) && filepath !== this.basePath) {
      throw new StorageError(
        StorageErrorCode.UPLOAD_FAILED,
        '非法的存储路径'
      );
    }
    return filepath;
  }

  async upload(fileData, key, options = {}) {
    const filepath = this._safePath(key);
    const dir = path.dirname(filepath);

    // 确保目录存在
    await fs.promises.mkdir(dir, { recursive: true });

    // 写入文件
    if (Buffer.isBuffer(fileData)) {
      await fs.promises.writeFile(filepath, fileData);
    } else if (fileData instanceof Readable || typeof fileData.pipe === 'function') {
      const writeStream = fs.createWriteStream(filepath);
      await pipeline(fileData, writeStream);
    } else {
      throw new StorageError(
        StorageErrorCode.UPLOAD_FAILED,
        '不支持的文件数据类型，需要 Buffer 或 Stream'
      );
    }

    return {
      url: `${this.baseUrl}/${key}`,
      key,
    };
  }

  async uploadFromFile(tmpPath, key) {
    const filepath = this._safePath(key);
    const dir = path.dirname(filepath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.rename(tmpPath, filepath);
    return {
      url: `${this.baseUrl}/${key}`,
      key,
    };
  }

  async delete(key) {
    const filepath = this._safePath(key);
    try {
      await fs.promises.unlink(filepath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw new StorageError(
          StorageErrorCode.DELETE_FAILED,
          `删除文件失败: ${err.message}`
        );
      }
    }
  }

  async exists(key) {
    const filepath = this._safePath(key);
    try {
      await fs.promises.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key) {
    return `${this.baseUrl}/${key}`;
  }

  validateConfig(config) {
    // 本地存储无需特殊配置
    return { valid: true };
  }
}
