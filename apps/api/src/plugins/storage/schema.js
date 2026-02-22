/**
 * 存储服务商数据库 Schema
 * 管理本地存储和 S3 兼容存储（含阿里云 OSS、腾讯云 COS、Cloudflare R2、MinIO 等）配置
 */
import {
  integer,
  pgTable,
  varchar,
  text,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { $defaults } from '../../db/columns.js';

// ============ Storage Providers (存储服务商) ============
export const storageProviders = pgTable(
  'storage_providers',
  {
    ...$defaults,
    // 存储类型：'local' | 's3'，用于工厂分发
    type: varchar('type', { length: 20 }).notNull().default('local'),
    // 提供商唯一标识 slug：'local', 'aliyun-oss', 'r2' 等
    slug: varchar('slug', { length: 50 }).notNull().unique(),
    isEnabled: boolean('is_enabled').notNull().default(false),
    // 通用配置 JSON，根据提供商类型存储不同字段
    // local: 无需配置（路径硬编码为 apps/api/uploads）
    // s3: { accessKeyId, secretAccessKey, bucket, region, endpoint, forcePathStyle, customDomain }
    config: text('config'),
    displayName: varchar('display_name', { length: 100 }),
    displayOrder: integer('display_order').notNull().default(0),
  },
  (table) => [
    index('storage_providers_slug_idx').on(table.slug),
    index('storage_providers_is_enabled_idx').on(table.isEnabled),
  ]
);
