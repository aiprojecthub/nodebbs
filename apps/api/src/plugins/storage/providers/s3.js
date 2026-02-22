/**
 * S3 兼容存储提供商
 * 支持 AWS S3、MinIO、Cloudflare R2 等
 * SDK: @aws-sdk/client-s3, @aws-sdk/lib-storage（动态导入）
 */
import { BaseStorageProvider } from './base.js';
import { StorageError, StorageErrorCode } from '../errors.js';

export class S3Provider extends BaseStorageProvider {
  constructor(config = {}) {
    super(config);
    this.client = null;
  }

  async _getClient() {
    if (this.client) return this.client;

    let S3Client;
    try {
      ({ S3Client } = await import('@aws-sdk/client-s3'));
    } catch {
      throw new StorageError(
        StorageErrorCode.PROVIDER_NOT_CONFIGURED,
        '请先安装 @aws-sdk/client-s3: pnpm --filter api add @aws-sdk/client-s3 @aws-sdk/lib-storage'
      );
    }

    const clientConfig = {
      region: this.config.region || 'us-east-1',
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    };

    if (this.config.endpoint) {
      clientConfig.endpoint = this.config.endpoint;
    }

    if (this.config.forcePathStyle) {
      clientConfig.forcePathStyle = true;
    }

    this.client = new S3Client(clientConfig);
    return this.client;
  }

  async upload(fileData, key, options = {}) {
    const client = await this._getClient();

    try {
      const { Upload } = await import('@aws-sdk/lib-storage');

      const upload = new Upload({
        client,
        params: {
          Bucket: this.config.bucket,
          Key: key,
          Body: fileData,
          ContentType: options.mimetype,
        },
      });

      await upload.done();

      return {
        url: this.getUrl(key),
        key,
      };
    } catch (err) {
      throw new StorageError(
        StorageErrorCode.UPLOAD_FAILED,
        `S3 上传失败: ${err.message}`
      );
    }
  }

  async delete(key) {
    const client = await this._getClient();

    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      await client.send(new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }));
    } catch (err) {
      throw new StorageError(
        StorageErrorCode.DELETE_FAILED,
        `S3 删除失败: ${err.message}`
      );
    }
  }

  async exists(key) {
    const client = await this._getClient();

    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      await client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }));
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  getUrl(key) {
    if (this.config.customDomain) {
      return `${this.config.customDomain.replace(/\/$/, '')}/${key}`;
    }
    const { bucket, region, endpoint, forcePathStyle } = this.config;
    if (endpoint) {
      if (forcePathStyle) {
        return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
      }
      // 虚拟主机风格
      const url = new URL(endpoint);
      return `${url.protocol}//${bucket}.${url.host}/${key}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  async getPresignedUrl(key, options = {}) {
    const client = await this._getClient();
    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const expires = options.expires || 600;
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ContentType: options.mimetype || 'application/octet-stream',
      });
      const url = await getSignedUrl(client, command, { expiresIn: expires });
      return {
        supported: true,
        url,
        headers: { 'Content-Type': options.mimetype || 'application/octet-stream' },
      };
    } catch (err) {
      throw new StorageError(
        StorageErrorCode.UPLOAD_FAILED,
        `S3 生成预签名 URL 失败: ${err.message}`
      );
    }
  }

  validateConfig(config) {
    const required = ['accessKeyId', 'secretAccessKey', 'bucket'];
    for (const field of required) {
      if (!config[field]) {
        return { valid: false, message: `缺少必填配置: ${field}` };
      }
    }
    return { valid: true };
  }
}
