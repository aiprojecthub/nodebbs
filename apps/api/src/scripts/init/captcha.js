/**
 * CAPTCHA 提供商初始化数据
 */
import { eq } from 'drizzle-orm';
import { captchaProviders } from '../../db/schema.js';
import { BaseSeeder } from './base.js';
import chalk from 'chalk';

// 预定义的 CAPTCHA 提供商
const CAPTCHA_PROVIDERS = [
  {
    provider: 'recaptcha',
    displayName: 'Google reCAPTCHA',
    displayOrder: 1,
    isEnabled: false,
    isDefault: false,
    config: JSON.stringify({
      version: 'v2', // v2 或 v3
      siteKey: '',
      secretKey: '',
      scoreThreshold: 0.5, // v3 专用
    }),
    enabledScenes: JSON.stringify({
      register: false,
      login: false,
    }),
  },
  {
    provider: 'hcaptcha',
    displayName: 'hCaptcha',
    displayOrder: 2,
    isEnabled: false,
    isDefault: false,
    config: JSON.stringify({
      siteKey: '',
      secretKey: '',
    }),
    enabledScenes: JSON.stringify({
      register: false,
      login: false,
    }),
  },
  {
    provider: 'turnstile',
    displayName: 'Cloudflare Turnstile',
    displayOrder: 3,
    isEnabled: false,
    isDefault: false,
    config: JSON.stringify({
      siteKey: '',
      secretKey: '',
      mode: 'managed', // managed, non-interactive, invisible
    }),
    enabledScenes: JSON.stringify({
      register: false,
      login: false,
    }),
  },
  {
    provider: 'cap',
    displayName: 'Cap (自托管 PoW)',
    displayOrder: 4,
    isEnabled: false,
    isDefault: false,
    config: JSON.stringify({
      // Cap Standalone 模式需配置 API 端点
      apiEndpoint: '', // 例如: http://localhost:3000
      siteKey: '',     // 前端需要
      secretKey: '',   // 后端调用 /siteverify 需要
    }),
    enabledScenes: JSON.stringify({
      register: false,
      login: false,
    }),
  },
];

export class CaptchaSeeder extends BaseSeeder {
  constructor() {
    super('captcha');
  }

  /**
   * 初始化 CAPTCHA 提供商配置
   * @param {*} db - 数据库连接
   * @param {boolean} reset - 是否重置配置
   */
  async init(db, reset = false) {
    this.logger.header('初始化 CAPTCHA 提供商配置');

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const skippedProviders = [];
    for (const provider of CAPTCHA_PROVIDERS) {
      const [existing] = await db
        .select()
        .from(captchaProviders)
        .where(eq(captchaProviders.provider, provider.provider))
        .limit(1);

      if (existing) {
        if (reset) {
          // 重置模式：更新配置但保留用户设置的密钥
          await db
            .update(captchaProviders)
            .set({
              displayName: provider.displayName,
              displayOrder: provider.displayOrder,
            })
            .where(eq(captchaProviders.provider, provider.provider));
          updatedCount++;
          this.logger.success(`更新: ${provider.displayName}`);
        } else {
          skippedCount++;
          skippedProviders.push(provider.displayName);
        }
      } else {
        // 新增
        await db.insert(captchaProviders).values(provider);
        addedCount++;
        this.logger.success(`新增: ${provider.displayName}`);
      }
    }
    if (skippedProviders.length > 0) {
      this.logger.info(`跳过: ${skippedProviders.join(', ')} (已存在)`);
    }

    this.logger.summary({
      addedCount,
      updatedCount,
      skippedCount,
      total: CAPTCHA_PROVIDERS.length,
    });
    return {
      addedCount,
      updatedCount,
      skippedCount,
      total: CAPTCHA_PROVIDERS.length,
    };
  }

  /**
   * 列出所有 CAPTCHA 提供商
   */
  async list() {
    this.logger.header('CAPTCHA 提供商列表');
    CAPTCHA_PROVIDERS.forEach((provider, index) => {
      this.logger.item(`${chalk.bold(provider.displayName)} (${provider.provider})`, '🛡️');
    });
    this.logger.divider();
    this.logger.result(`Total: ${CAPTCHA_PROVIDERS.length} providers`);
  }

  /**
   * 清空 CAPTCHA 配置
   */
  async clean(db) {
    this.logger.warn('正在清空 CAPTCHA 提供商配置...');
    await db.delete(captchaProviders);
    this.logger.success('已清空 CAPTCHA 提供商 (captchaProviders)');
  }
}
