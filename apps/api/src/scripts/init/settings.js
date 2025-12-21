/**
 * 系统设置默认配置和初始化逻辑
 */

import { systemSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

// 系统设置默认配置
export const SETTING_KEYS = {
  // 通用设置
  SITE_NAME: {
    key: 'site_name',
    value: 'NodeBBS',
    valueType: 'string',
    description: '站点名称',
    category: 'general',
  },
  SITE_DESCRIPTION: {
    key: 'site_description',
    value: '一个基于 Node.js 和 React 的现代化论坛系统',
    valueType: 'string',
    description: '站点描述',
    category: 'general',
  },
  SITE_FOOTER_HTML: {
    key: 'site_footer_html',
    value: '',
    valueType: 'string',
    description: '页脚自定义 HTML 内容（支持 ICP 备案号、公安备案等显示）',
    category: 'general',
  },
  SITE_ANALYTICS_SCRIPTS: {
    key: 'site_analytics_scripts',
    value: '',
    valueType: 'string',
    description: '自定义统计脚本（支持 Google Analytics、百度统计等，将被插入到页面中）',
    category: 'general',
  },

  // 功能开关
  REGISTRATION_MODE: {
    key: 'registration_mode',
    value: 'open',
    valueType: 'string',
    description: '注册模式：open（开放注册）、invitation（邀请码注册）、closed（关闭注册）',
    category: 'features',
  },
  EMAIL_VERIFICATION_REQUIRED: {
    key: 'email_verification_required',
    value: 'false',
    valueType: 'boolean',
    description: '是否要求用户验证邮箱后才能进行创建话题、回复、发站内信等操作',
    category: 'features',
  },
  CONTENT_MODERATION_ENABLED: {
    key: 'content_moderation_enabled',
    value: 'false',
    valueType: 'boolean',
    description: '是否启用内容审核（新发布的内容需要审核后才能公开显示）',
    category: 'features',
  },
  QR_LOGIN_ENABLED: {
    key: 'qr_login_enabled',
    value: 'false',
    valueType: 'boolean',
    description: '是否启用扫码登录功能',
    category: 'features',
  },
  QR_LOGIN_TIMEOUT: {
    key: 'qr_login_timeout',
    value: '300',
    valueType: 'number',
    description: '二维码登录请求的有效期（秒），默认5分钟',
    category: 'features',
  },
  UPLOAD_ALLOWED_ROLES: {
    key: 'upload_allowed_roles',
    value: JSON.stringify(['admin', 'moderator', 'vip']),
    valueType: 'json',
    description: '允许上传文件的角色列表',
    category: 'features',
  },

  // 用户设置
  ALLOW_USERNAME_CHANGE: {
    key: 'allow_username_change',
    value: 'false',
    valueType: 'boolean',
    description: '是否允许用户修改用户名',
    category: 'user_settings',
  },
  USERNAME_CHANGE_COOLDOWN_DAYS: {
    key: 'username_change_cooldown_days',
    value: '30',
    valueType: 'number',
    description: '用户名修改冷却期（天），0表示无冷却期',
    category: 'user_settings',
  },
  USERNAME_CHANGE_LIMIT: {
    key: 'username_change_limit',
    value: '3',
    valueType: 'number',
    description: '用户名修改次数限制，0表示无限制',
    category: 'user_settings',
  },
  USERNAME_CHANGE_REQUIRES_PASSWORD: {
    key: 'username_change_requires_password',
    value: 'true',
    valueType: 'boolean',
    description: '修改用户名是否需要密码验证',
    category: 'user_settings',
  },
  ALLOW_EMAIL_CHANGE: {
    key: 'allow_email_change',
    value: 'true',
    valueType: 'boolean',
    description: '是否允许用户修改邮箱',
    category: 'user_settings',
  },
  EMAIL_CHANGE_REQUIRES_PASSWORD: {
    key: 'email_change_requires_password',
    value: 'true',
    valueType: 'boolean',
    description: '修改邮箱是否需要密码验证',
    category: 'user_settings',
  },
  EMAIL_CHANGE_VERIFICATION_EXPIRES_MINUTES: {
    key: 'email_change_verification_expires_minutes',
    value: '15',
    valueType: 'number',
    description: '邮箱修改验证码有效期（分钟）',
    category: 'user_settings',
  },

  // StopForumSpam 垃圾注册拦截
  SPAM_PROTECTION_ENABLED: {
    key: 'spam_protection_enabled',
    value: 'false',
    valueType: 'boolean',
    description: '是否启用垃圾注册拦截（使用 StopForumSpam API）',
    category: 'spam_protection',
  },
  SPAM_PROTECTION_API_KEY: {
    key: 'spam_protection_api_key',
    value: '',
    valueType: 'string',
    description: 'StopForumSpam API Key（可选，用于提高请求限制）',
    category: 'spam_protection',
  },
  SPAM_PROTECTION_CHECK_IP: {
    key: 'spam_protection_check_ip',
    value: 'true',
    valueType: 'boolean',
    description: '是否检查 IP 地址',
    category: 'spam_protection',
  },
  SPAM_PROTECTION_CHECK_EMAIL: {
    key: 'spam_protection_check_email',
    value: 'true',
    valueType: 'boolean',
    description: '是否检查邮箱地址',
    category: 'spam_protection',
  },
  SPAM_PROTECTION_CHECK_USERNAME: {
    key: 'spam_protection_check_username',
    value: 'true',
    valueType: 'boolean',
    description: '是否检查用户名',
    category: 'spam_protection',
  },

  // 访问限速
  RATE_LIMIT_ENABLED: {
    key: 'rate_limit_enabled',
    value: 'true',
    valueType: 'boolean',
    description: '是否启用访问限速',
    category: 'rate_limit',
  },
  RATE_LIMIT_WINDOW_MS: {
    key: 'rate_limit_window_ms',
    value: '60000',
    valueType: 'number',
    description: '限速时间窗口（毫秒），默认60秒',
    category: 'rate_limit',
  },
  RATE_LIMIT_MAX_REQUESTS: {
    key: 'rate_limit_max_requests',
    value: '100',
    valueType: 'number',
    description: '时间窗口内最大请求数',
    category: 'rate_limit',
  },
  RATE_LIMIT_AUTH_MULTIPLIER: {
    key: 'rate_limit_auth_multiplier',
    value: '2',
    valueType: 'number',
    description: '已登录用户的限速倍数',
    category: 'rate_limit',
  },
};

// 将配置按分类分组
export const SETTINGS_BY_CATEGORY = Object.values(SETTING_KEYS).reduce((acc, setting) => {
  const category = setting.category || 'other';
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(setting);
  return acc;
}, {});

export const CATEGORY_NAMES = {
  general: '通用设置',
  features: '功能开关',
  user_settings: '用户设置',
  spam_protection: '垃圾注册拦截',
  rate_limit: '访问限速',
  other: '其他设置',
};

/**
 * 初始化系统设置
 */
export async function initSystemSettings(db, reset = false) {
  const allSettings = Object.values(SETTING_KEYS);
  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const setting of allSettings) {
    const { key, value, valueType, description } = setting;

    if (reset) {
      // 重置模式：删除后重新插入
      await db.delete(systemSettings).where(eq(systemSettings.key, key));
      await db.insert(systemSettings).values({
        key,
        value,
        valueType,
        description,
      });
      console.log(`🔄 重置配置: ${key} = ${value}`);
      updatedCount++;
    } else {
      // 默认模式：只添加缺失的配置
      // 先检查是否已存在
      const [existing] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);

      if (existing) {
        console.log(`⊙ 跳过配置: ${key} (已存在)`);
        skippedCount++;
      } else {
        // 不存在则插入
        await db.insert(systemSettings).values({
          key,
          value,
          valueType,
          description,
        });
        console.log(`✓ 添加配置: ${key} = ${value}`);
        addedCount++;
      }
    }
  }

  return { addedCount, updatedCount, skippedCount, total: allSettings.length };
}

/**
 * 列出系统设置配置
 */
export function listSystemSettings() {
  console.log('\n📋 系统配置列表\n');
  console.log('='.repeat(80));

  Object.entries(SETTINGS_BY_CATEGORY).forEach(([category, settings]) => {
    console.log(`\n${CATEGORY_NAMES[category] || category}:`);
    console.log('-'.repeat(80));

    settings.forEach((setting) => {
      console.log(`  ${setting.key}`);
      console.log(`    类型: ${setting.valueType}`);
      console.log(`    默认值: ${setting.value}`);
      console.log(`    描述: ${setting.description}`);
      console.log();
    });
  });

  console.log('='.repeat(80));
  console.log(`\n总计: ${Object.values(SETTING_KEYS).length} 个配置项\n`);
}
