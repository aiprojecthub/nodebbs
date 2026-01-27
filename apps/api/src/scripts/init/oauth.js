/**
 * OAuth 提供商默认配置和初始化逻辑
 */

import { oauthProviders } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { BaseSeeder } from './base.js';
import chalk from 'chalk';

// OAuth 提供商默认配置
export const OAUTH_PROVIDERS = [
  {
    provider: 'github',
    isEnabled: false,
    displayName: 'GitHub',
    displayOrder: 1,
    scope: JSON.stringify(['user:email', 'read:user']),
    clientId: null,
    clientSecret: null,
    callbackUrl: null,
    additionalConfig: null,
  },
  {
    provider: 'google',
    isEnabled: false,
    displayName: 'Google',
    displayOrder: 2,
    scope: JSON.stringify(['openid', 'profile', 'email']),
    clientId: null,
    clientSecret: null,
    callbackUrl: null,
    additionalConfig: null,
  },
  {
    provider: 'apple',
    isEnabled: false,
    displayName: 'Apple',
    displayOrder: 3,
    scope: JSON.stringify(['name', 'email']),
    clientId: null,
    clientSecret: null,
    callbackUrl: null,
    additionalConfig: JSON.stringify({ teamId: null, keyId: null }),
  },
  // 微信开放平台（Web 扫码登录）
  {
    provider: 'wechat_open',
    isEnabled: false,
    displayName: '微信扫码',
    displayOrder: 4,
    scope: JSON.stringify(['snsapi_login']),
    clientId: null, // AppID
    clientSecret: null, // AppSecret
    callbackUrl: null,
    additionalConfig: null,
  },
  // 微信公众号（H5 网页授权）
  {
    provider: 'wechat_mp',
    isEnabled: false,
    displayName: '微信公众号',
    displayOrder: 5,
    scope: JSON.stringify(['snsapi_userinfo']),
    clientId: null, // AppID
    clientSecret: null, // AppSecret
    callbackUrl: null,
    additionalConfig: null,
  },
  // 微信小程序
  {
    provider: 'wechat_miniprogram',
    isEnabled: false,
    displayName: '微信小程序',
    displayOrder: 6,
    scope: null,
    clientId: null, // AppID
    clientSecret: null, // AppSecret
    callbackUrl: null,
    additionalConfig: null,
  },
];

export class OAuthSeeder extends BaseSeeder {
  constructor() {
    super('oauth');
  }

  /**
   * 初始化 OAuth 提供商配置
   */
  async init(db, reset = false) {
    this.logger.header('初始化 OAuth 提供商配置');

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const skippedProviders = [];
    for (const provider of OAUTH_PROVIDERS) {
      // 检查是否已存在
      const [existing] = await db
        .select()
        .from(oauthProviders)
        .where(eq(oauthProviders.provider, provider.provider))
        .limit(1);

      if (existing) {
        if (reset) {
          // 重置模式：更新现有配置
          await db
            .update(oauthProviders)
            .set(provider)
            .where(eq(oauthProviders.id, existing.id));
          updatedCount++;
          this.logger.success(`重置 OAuth 提供商: ${provider.displayName} (${provider.provider})`);
        } else {
          // 默认模式：跳过
          skippedProviders.push(provider.displayName);
          skippedCount++;
        }
      } else {
        // 不存在则插入
        await db.insert(oauthProviders).values(provider);
        this.logger.success(`添加 OAuth 提供商: ${provider.displayName} (${provider.provider})`);
        addedCount++;
      }
    }
    if (skippedProviders.length > 0) {
      this.logger.info(`跳过 OAuth 提供商: ${skippedProviders.join(', ')} (已存在)`);
    }

    this.logger.summary({ addedCount, updatedCount, skippedCount, total: OAUTH_PROVIDERS.length });
    return { addedCount, updatedCount, skippedCount, total: OAUTH_PROVIDERS.length };
  }

  async list() {
    this.logger.header('OAuth 提供商配置');

    OAUTH_PROVIDERS.forEach((provider) => {
      this.logger.item(`${chalk.bold(provider.displayName)} (${provider.provider})`, '🔐');
      this.logger.detail(`默认状态: ${provider.isEnabled ? '启用' : '禁用'}`);
      this.logger.detail(`权限范围: ${provider.scope}`);
      this.logger.detail(`显示顺序: ${provider.displayOrder}`);
    });
    
    this.logger.divider();
    this.logger.result(`Total: ${OAUTH_PROVIDERS.length} items`);
  }

  /**
   * 清空 OAuth 提供商配置
   * @param {import('drizzle-orm').NodePgDatabase} db
   */
  async clean(db) {
    this.logger.warn('正在清空 OAuth 提供商配置...');
    await db.delete(oauthProviders);
    this.logger.success('已清空 OAuth 提供商配置 (oauthProviders)');
  }
}
