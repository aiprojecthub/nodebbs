/**
 * 存储服务商默认配置和初始化逻辑
 */

import { storageProviders } from '../../plugins/storage/schema.js';
import { eq } from 'drizzle-orm';
import { BaseSeeder } from './base.js';
import chalk from 'chalk';

/**
 * S3 兼容存储的默认配置模板
 */
const S3_DEFAULT_CONFIG = {
  accessKeyId: null,
  secretAccessKey: null,
  bucket: null,
  region: 'us-east-1',
  endpoint: null,
  forcePathStyle: false,
  customDomain: null,
  usePresignedUpload: true,
  stripExif: false,
};

/**
 * 存储服务商默认配置
 */
export const STORAGE_PROVIDERS = [
  {
    slug: 'local',
    type: 'local',
    isEnabled: true,
    displayName: '本地存储',
    displayOrder: 1,
    config: JSON.stringify({ stripExif: true }),
  },
  {
    slug: 'cloudflare-r2',
    type: 's3',
    isEnabled: false,
    displayName: 'Cloudflare R2',
    displayOrder: 2,
    config: JSON.stringify(S3_DEFAULT_CONFIG),
  },
  {
    slug: 'aliyun-oss',
    type: 's3',
    isEnabled: false,
    displayName: '阿里云 OSS',
    displayOrder: 3,
    config: JSON.stringify(S3_DEFAULT_CONFIG),
  },
  {
    slug: 'minio',
    type: 's3',
    isEnabled: false,
    displayName: 'MinIO',
    displayOrder: 4,
    config: JSON.stringify({ ...S3_DEFAULT_CONFIG, forcePathStyle: true }),
  },
];

export class StorageSeeder extends BaseSeeder {
  constructor() {
    super('storage');
  }

  /**
   * 初始化存储服务商配置
   * @param {object} db - 数据库实例
   * @param {boolean} reset - 是否重置
   */
  async init(db, reset = false) {
    this.logger.header('初始化存储服务商配置');

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const skippedProviders = [];
    for (const provider of STORAGE_PROVIDERS) {
      // 检查是否已存在
      const [existing] = await db
        .select()
        .from(storageProviders)
        .where(eq(storageProviders.slug, provider.slug))
        .limit(1);

      if (existing) {
        if (reset) {
          await db
            .update(storageProviders)
            .set(provider)
            .where(eq(storageProviders.id, existing.id));
          updatedCount++;
          this.logger.success(`重置存储服务商: ${provider.displayName} (${provider.slug})`);
        } else {
          skippedProviders.push(provider.displayName);
          skippedCount++;
        }
      } else {
        await db.insert(storageProviders).values(provider);
        this.logger.success(`添加存储服务商: ${provider.displayName} (${provider.slug})`);
        addedCount++;
      }
    }
    if (skippedProviders.length > 0) {
      this.logger.info(`跳过存储服务商: ${skippedProviders.join(', ')} (已存在)`);
    }

    this.logger.summary({ addedCount, updatedCount, skippedCount, total: STORAGE_PROVIDERS.length });
    return { addedCount, updatedCount, skippedCount, total: STORAGE_PROVIDERS.length };
  }

  async list() {
    this.logger.header('存储服务商配置');

    console.log(chalk.dim('-'.repeat(40)));
    STORAGE_PROVIDERS.forEach((provider) => {
      this.logger.item(`${chalk.bold(provider.displayName)} (${provider.slug})`, '💾');
      this.logger.detail(`默认状态: ${provider.isEnabled ? '启用' : '禁用'}`);
      this.logger.detail(`显示顺序: ${provider.displayOrder}`);
    });

    this.logger.divider();
    this.logger.result(`Total: ${STORAGE_PROVIDERS.length} items`);
  }

  /**
   * 清空存储服务商配置
   */
  async clean(db) {
    this.logger.warn('正在清空存储服务商配置...');
    await db.delete(storageProviders);
    this.logger.success('已清空存储服务商配置 (storageProviders)');
  }
}
