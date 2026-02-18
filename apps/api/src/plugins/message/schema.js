/**
 * 消息提供商数据库 Schema
 * 统一管理 Email 和 SMS 提供商配置
 */
import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { $defaults } from '../../db/columns.js';

// ============ Message Providers (消息提供商) ============
export const messageProviders = pgTable(
  'message_providers',
  {
    ...$defaults,
    // 渠道类型：'email' | 'sms'
    channel: varchar('channel', { length: 20 }).notNull(),
    // 提供商标识：'smtp', 'sendgrid', 'resend', 'aliyun', 'tencent'
    provider: varchar('provider', { length: 50 }).notNull(),
    isEnabled: boolean('is_enabled').notNull().default(false),
    isDefault: boolean('is_default').notNull().default(false),
    // 通用配置 JSON，根据提供商类型存储不同字段
    // Email SMTP: { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword, fromEmail, fromName }
    // Email API: { apiKey, apiEndpoint, fromEmail, fromName }
    // SMS Aliyun: { accessKeyId, accessKeySecret, signName, region }
    // SMS Tencent: { secretId, secretKey, appId, signName, region }
    config: text('config'),
    displayName: varchar('display_name', { length: 100 }),
    displayOrder: integer('display_order').notNull().default(0),
  },
  (table) => [
    unique('message_providers_channel_provider').on(table.channel, table.provider),
    index('message_providers_channel_idx').on(table.channel),
    index('message_providers_is_enabled_idx').on(table.isEnabled),
    index('message_providers_is_default_idx').on(table.isDefault),
    index('message_providers_display_order_idx').on(table.displayOrder),
  ]
);
