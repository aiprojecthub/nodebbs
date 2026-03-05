/**
 * 消息提供商默认配置和初始化逻辑
 * 统一管理 Email 和 SMS 提供商
 */

import { messageProviders } from '../../plugins/message/schema.js';
import { eq, and } from 'drizzle-orm';
import { BaseSeeder } from './base.js';
import chalk from 'chalk';

/**
 * 消息提供商默认配置
 */
export const MESSAGE_PROVIDERS = [
  // ========== Email 提供商 ==========
  {
    channel: 'email',
    provider: 'smtp',
    isEnabled: false,
    displayName: 'SMTP',
    displayOrder: 1,
    config: JSON.stringify({
      smtpHost: null,
      smtpPort: 587,
      smtpSecure: true,
      smtpUser: null,
      smtpPassword: null,
      fromEmail: null,
      fromName: null,
    }),
  },
  {
    channel: 'email',
    provider: 'sendgrid',
    isEnabled: false,
    displayName: 'SendGrid',
    displayOrder: 2,
    config: JSON.stringify({
      apiKey: null,
      apiEndpoint: 'https://api.sendgrid.com/v3/mail/send',
      fromEmail: null,
      fromName: null,
    }),
  },
  {
    channel: 'email',
    provider: 'resend',
    isEnabled: false,
    displayName: 'Resend',
    displayOrder: 3,
    config: JSON.stringify({
      apiKey: null,
      apiEndpoint: 'https://api.resend.com/emails',
      fromEmail: null,
      fromName: null,
    }),
  },
  {
    channel: 'email',
    provider: 'aliyun',
    isEnabled: false,
    displayName: '阿里云邮件推送',
    displayOrder: 4,
    config: JSON.stringify({
      smtpHost: 'smtpdm.aliyun.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: null,
      smtpPassword: null,
      fromEmail: null,
      fromName: null,
    }),
  },

  // ========== SMS 提供商 ==========
  {
    channel: 'sms',
    provider: 'aliyun',
    isEnabled: false,
    displayName: '阿里云短信',
    displayOrder: 1,
    config: JSON.stringify({
      accessKeyId: null,
      accessKeySecret: null,
      signName: null,
      region: 'cn-hangzhou',
      // 模板映射配置（可选）
      // 如果需要使用自定义模板 ID，请在此配置：
      // templates: {
      //   SMS_LOGIN: 'SMS_987654321',    // 登录验证码模板
      //   SMS_PASSWORD_RESET: '...',     // 密码重置模板
      //   SMS_BIND: '...',               // 绑定手机模板
      //   SMS_CHANGE: '...'              // 更换手机模板
      // }
    }),
  },
  {
    channel: 'sms',
    provider: 'tencent',
    isEnabled: false,
    displayName: '腾讯云短信',
    displayOrder: 2,
    config: JSON.stringify({
      secretId: null,
      secretKey: null,
      appId: null,
      signName: null,
      region: 'ap-guangzhou',
      // 模板映射配置（可选）
      // 如果需要使用自定义模板 ID，请在此配置：
      // templates: {
      //   SMS_LOGIN: '654321',       // 登录验证码模板
      //   SMS_PASSWORD_RESET: '...', // 密码重置模板
      //   SMS_BIND: '...',           // 绑定手机模板
      //   SMS_CHANGE: '...'          // 更换手机模板
      // }
    }),
  },
];

export class MessageSeeder extends BaseSeeder {
  constructor() {
    super('message');
  }

  /**
   * 初始化消息提供商配置
   * @param {object} db - 数据库实例
   * @param {boolean} reset - 是否重置（删除后重新插入）
   */
  async init(db, reset = false) {
    this.logger.header('初始化消息提供商配置');

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const skippedProviders = [];
    for (const provider of MESSAGE_PROVIDERS) {
      // 检查是否已存在
      const [existing] = await db
        .select()
        .from(messageProviders)
        .where(
          and(
            eq(messageProviders.channel, provider.channel),
            eq(messageProviders.provider, provider.provider)
          )
        )
        .limit(1);

      if (existing) {
        if (reset) {
          // 重置模式：更新现有配置
          await db
            .update(messageProviders)
            .set(provider)
            .where(eq(messageProviders.id, existing.id));
          updatedCount++;
          this.logger.success(`重置消息提供商: [${provider.channel}] ${provider.displayName} (${provider.provider})`);
        } else {
          // 默认模式：跳过
          skippedProviders.push(`${provider.displayName}`);
          skippedCount++;
        }
      } else {
        // 不存在则插入
        await db.insert(messageProviders).values(provider);
        this.logger.success(`添加消息提供商: [${provider.channel}] ${provider.displayName} (${provider.provider})`);
        addedCount++;
      }
    }
    if (skippedProviders.length > 0) {
      this.logger.info(`跳过消息提供商: ${skippedProviders.join(', ')} (已存在)`);
    }

    this.logger.summary({ addedCount, updatedCount, skippedCount, total: MESSAGE_PROVIDERS.length });
    return { addedCount, updatedCount, skippedCount, total: MESSAGE_PROVIDERS.length };
  }

  async list() {
    this.logger.header('消息提供商配置');
    
    const emailProviders = MESSAGE_PROVIDERS.filter(p => p.channel === 'email');
    const smsProviders = MESSAGE_PROVIDERS.filter(p => p.channel === 'sms');

    this.logger.subHeader('📮 Email 提供商:');
    console.log(chalk.dim('-'.repeat(40)));
    emailProviders.forEach((provider) => {
      this.logger.item(`${chalk.bold(provider.displayName)} (${provider.provider})`, '📧');
      this.logger.detail(`默认状态: ${provider.isEnabled ? '启用' : '禁用'}`);
      this.logger.detail(`显示顺序: ${provider.displayOrder}`);
    });

    this.logger.subHeader('📱 SMS 提供商:');
    console.log(chalk.dim('-'.repeat(40)));
    smsProviders.forEach((provider) => {
      this.logger.item(`${chalk.bold(provider.displayName)} (${provider.provider})`, '💬');
      this.logger.detail(`默认状态: ${provider.isEnabled ? '启用' : '禁用'}`);
      this.logger.detail(`显示顺序: ${provider.displayOrder}`);
    });

    this.logger.divider();
    this.logger.result(`Total: ${MESSAGE_PROVIDERS.length} items (Email: ${emailProviders.length}, SMS: ${smsProviders.length})`);
  }

  /**
   * 清空消息提供商配置
   * @param {import('drizzle-orm').NodePgDatabase} db
   */
  async clean(db) {
    this.logger.warn('正在清空消息提供商配置...');
    await db.delete(messageProviders);
    this.logger.success('已清空消息提供商配置 (messageProviders)');
  }
}
