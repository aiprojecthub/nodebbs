import db from '../../db/index.js';
import { systemSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { clearSettingsCache } from '../../utils/settings.js';

// ============= 系统设置常量定义 =============

/**
 * 设置访问级别
 */
const ACCESS_LEVEL = {
  PUBLIC: 'public', // 所有人可见
  MODERATOR: 'moderator', // 版主及以上可见
  ADMIN: 'admin', // 仅管理员可见
};

/**
 * 系统设置键定义
 * 每个设置包含：
 * - key: 设置键名
 * - accessLevel: 访问级别（谁可以查看此设置）
 * - category: 设置分类（用于前端分组显示）
 */
const SETTING_KEYS = {
  // 通用设置
  SITE_NAME: {
    key: 'site_name',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'general',
  },
  SITE_DESCRIPTION: {
    key: 'site_description',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'general',
  },
  SITE_FOOTER_HTML: {
    key: 'site_footer_html',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'general',
  },
  SITE_ANALYTICS_SCRIPTS: {
    key: 'site_analytics_scripts',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'general',
  },

  // 功能开关
  REGISTRATION_MODE: {
    key: 'registration_mode',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'features',
    validValues: ['open', 'invitation', 'closed'],
  },
  EMAIL_VERIFICATION_REQUIRED: {
    key: 'email_verification_required',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'features',
  },
  CONTENT_MODERATION_ENABLED: {
    key: 'content_moderation_enabled',
    accessLevel: ACCESS_LEVEL.MODERATOR,
    category: 'features',
  },
  QR_LOGIN_ENABLED: {
    key: 'qr_login_enabled',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'features',
  },
  QR_LOGIN_TIMEOUT: {
    key: 'qr_login_timeout',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'features',
  },
  UPLOAD_ALLOWED_ROLES: {
    key: 'upload_allowed_roles',
    accessLevel: ACCESS_LEVEL.ADMIN,
    category: 'features',
  },

  // 用户设置 - 用户名修改
  ALLOW_USERNAME_CHANGE: {
    key: 'allow_username_change',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'user_settings',
  },
  USERNAME_CHANGE_COOLDOWN_DAYS: {
    key: 'username_change_cooldown_days',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'user_settings',
  },
  USERNAME_CHANGE_LIMIT: {
    key: 'username_change_limit',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'user_settings',
  },
  USERNAME_CHANGE_REQUIRES_PASSWORD: {
    key: 'username_change_requires_password',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'user_settings',
  },

  // 用户设置 - 邮箱修改
  ALLOW_EMAIL_CHANGE: {
    key: 'allow_email_change',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'user_settings',
  },
  EMAIL_CHANGE_REQUIRES_PASSWORD: {
    key: 'email_change_requires_password',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'user_settings',
  },
  EMAIL_CHANGE_VERIFICATION_EXPIRES_MINUTES: {
    key: 'email_change_verification_expires_minutes',
    accessLevel: ACCESS_LEVEL.PUBLIC,
    category: 'user_settings',
  },

  // 垃圾注册拦截（仅管理员可见和修改）
  SPAM_PROTECTION_ENABLED: {
    key: 'spam_protection_enabled',
    accessLevel: ACCESS_LEVEL.ADMIN,
    category: 'spam_protection',
  },
  SPAM_PROTECTION_API_KEY: {
    key: 'spam_protection_api_key',
    accessLevel: ACCESS_LEVEL.ADMIN,
    category: 'spam_protection',
  },
  SPAM_PROTECTION_CHECK_IP: {
    key: 'spam_protection_check_ip',
    accessLevel: ACCESS_LEVEL.ADMIN,
    category: 'spam_protection',
  },
  SPAM_PROTECTION_CHECK_EMAIL: {
    key: 'spam_protection_check_email',
    accessLevel: ACCESS_LEVEL.ADMIN,
    category: 'spam_protection',
  },
  SPAM_PROTECTION_CHECK_USERNAME: {
    key: 'spam_protection_check_username',
    accessLevel: ACCESS_LEVEL.ADMIN,
    category: 'spam_protection',
  },

  // 访问限速（仅管理员可见）
  RATE_LIMIT_ENABLED: {
    key: 'rate_limit_enabled',
    accessLevel: ACCESS_LEVEL.ADMIN,
    category: 'rate_limit',
  },
  RATE_LIMIT_WINDOW_MS: {
    key: 'rate_limit_window_ms',
    accessLevel: ACCESS_LEVEL.ADMIN,
    category: 'rate_limit',
  },
  RATE_LIMIT_MAX_REQUESTS: {
    key: 'rate_limit_max_requests',
    accessLevel: ACCESS_LEVEL.ADMIN,
    category: 'rate_limit',
  },
  RATE_LIMIT_AUTH_MULTIPLIER: {
    key: 'rate_limit_auth_multiplier',
    accessLevel: ACCESS_LEVEL.ADMIN,
    category: 'rate_limit',
  },
};

/**
 * 获取所有设置键的映射（key -> 配置对象）
 */
const SETTINGS_MAP = Object.values(SETTING_KEYS).reduce((acc, setting) => {
  acc[setting.key] = setting;
  return acc;
}, {});

/**
 * 检查用户是否有权限访问某个设置
 */
function canAccessSetting(setting, userRole) {
  if (!setting) return false;

  const { accessLevel } = setting;

  // 公开设置所有人都可以访问
  if (accessLevel === ACCESS_LEVEL.PUBLIC) {
    return true;
  }

  // 版主级别设置
  if (accessLevel === ACCESS_LEVEL.MODERATOR) {
    return userRole === 'moderator' || userRole === 'admin';
  }

  // 管理员级别设置
  if (accessLevel === ACCESS_LEVEL.ADMIN) {
    return userRole === 'admin';
  }

  return false;
}

/**
 * 根据用户角色过滤设置
 */
function filterSettingsByRole(settings, userRole) {
  const filtered = {};

  for (const [key, value] of Object.entries(settings)) {
    const settingConfig = SETTINGS_MAP[key];
    if (canAccessSetting(settingConfig, userRole)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

export default async function settingsRoutes(fastify) {
  // 获取所有系统配置（根据用户角色过滤）
  fastify.get(
    '/',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['settings'],
        description: '获取所有系统配置（根据用户角色返回不同的设置）',
      },
    },
    async (request, reply) => {
      try {
        const settings = await db
          .select({
            key: systemSettings.key,
            value: systemSettings.value,
            valueType: systemSettings.valueType,
            description: systemSettings.description,
          })
          .from(systemSettings);

        // 转换值类型
        const formattedSettings = settings.reduce((acc, setting) => {
          let value = setting.value;
          if (setting.valueType === 'boolean') {
            value = setting.value === 'true';
          } else if (setting.valueType === 'number') {
            value = parseFloat(setting.value);
          } else if (setting.valueType === 'json') {
            try {
              value = JSON.parse(setting.value);
            } catch (e) {
              value = setting.value;
            }
          }
          acc[setting.key] = {
            value,
            valueType: setting.valueType,
            description: setting.description,
          };
          return acc;
        }, {});

        // 根据用户角色过滤设置
        const userRole = request.user?.role || null;
        const filteredSettings = filterSettingsByRole(
          formattedSettings,
          userRole
        );

        return filteredSettings;
      } catch (error) {
        fastify.log.error('Error fetching settings:', error);
        return reply.code(500).send({ error: '获取系统配置失败' });
      }
    }
  );

  // 获取特定配置（根据权限控制访问）
  fastify.get(
    '/:key',
    {
      preHandler: [fastify.optionalAuth],
      schema: {
        tags: ['settings'],
        description: '获取特定系统配置（根据用户角色判断访问权限）',
        params: {
          type: 'object',
          required: ['key'],
          properties: {
            key: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { key } = request.params;

        // 检查设置是否在定义的列表中
        const settingConfig = SETTINGS_MAP[key];
        if (!settingConfig) {
          return reply.code(404).send({ error: '配置项不存在' });
        }

        // 检查用户是否有权限访问此设置
        const userRole = request.user?.role || null;
        if (!canAccessSetting(settingConfig, userRole)) {
          return reply.code(403).send({ error: '无权访问此配置项' });
        }

        const [setting] = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.key, key))
          .limit(1);

        if (!setting) {
          return reply.code(404).send({ error: '配置项不存在' });
        }

        let value = setting.value;
        if (setting.valueType === 'boolean') {
          value = setting.value === 'true';
        } else if (setting.valueType === 'number') {
          value = parseFloat(setting.value);
        } else if (setting.valueType === 'json') {
          try {
            value = JSON.parse(setting.value);
          } catch (e) {
            value = setting.value; // Fallback to string if parse fails
          }
        }

        return {
          key: setting.key,
          value,
          valueType: setting.valueType,
          description: setting.description,
        };
      } catch (error) {
        fastify.log.error('Error fetching setting:', error);
        return reply.code(500).send({ error: '获取配置失败' });
      }
    }
  );

  // 更新配置（仅管理员）
  fastify.patch(
    '/:key',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['settings'],
        description: '更新系统配置（仅管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['key'],
          properties: {
            key: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['value'],
          // Don't specify value type in schema, validate in handler
        },
      },
    },
    async (request, reply) => {
      try {
        const { key } = request.params;
        const { value } = request.body;

        if (value === undefined) {
          return reply.code(400).send({ error: '缺少 value 参数' });
        }

        // 检查设置是否在定义的列表中
        const settingConfig = SETTINGS_MAP[key];
        if (!settingConfig) {
          return reply.code(404).send({ error: '配置项不存在或不允许修改' });
        }

        // 获取现有配置
        const [existing] = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.key, key))
          .limit(1);

        if (!existing) {
          return reply.code(404).send({ error: '配置项不存在' });
        }

        // 验证值类型
        let stringValue;
        if (existing.valueType === 'boolean') {
          if (typeof value !== 'boolean') {
            return reply.code(400).send({ error: '值类型必须为 boolean' });
          }
          stringValue = value.toString();
        } else if (existing.valueType === 'number') {
          if (typeof value !== 'number' || isNaN(value)) {
            return reply.code(400).send({ error: '值类型必须为 number' });
          }
          stringValue = value.toString();
        } else if (existing.valueType === 'json') {
          if (typeof value !== 'object' && !Array.isArray(value)) {
            return reply.code(400).send({ error: '值类型必须为 json (object or array)' });
          }
          stringValue = JSON.stringify(value);
        } else {
          if (typeof value !== 'string') {
            return reply.code(400).send({ error: '值类型必须为 string' });
          }
          stringValue = value;
        }

        // 验证枚举类型的值
        if (settingConfig.validValues && !settingConfig.validValues.includes(value)) {
          return reply.code(400).send({
            error: `值必须是以下之一: ${settingConfig.validValues.join(', ')}`,
          });
        }

        // 更新配置
        const [updated] = await db
          .update(systemSettings)
          .set({
            value: stringValue,
            updatedAt: new Date(),
            updatedBy: request.user.id,
          })
          .where(eq(systemSettings.key, key))
          .returning();

        // 清除缓存
        clearSettingsCache();

        return {
          key: updated.key,
          value,
          valueType: updated.valueType,
          description: updated.description,
          updatedAt: updated.updatedAt,
        };
      } catch (error) {
        fastify.log.error('Error updating setting:', error);
        return reply.code(500).send({ error: '更新配置失败' });
      }
    }
  );
}

// 导出常量供其他模块使用
export { SETTING_KEYS, ACCESS_LEVEL, SETTINGS_MAP, canAccessSetting };
