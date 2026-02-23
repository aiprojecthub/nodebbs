import db from '../../db/index.js';
import { systemSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  ACCESS_LEVEL,
  SETTING_KEYS,
  SETTINGS_MAP,
} from '../../config/systemSettings.js';

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

/**
 * 将字符串配置值转换为对应的类型
 */
function parseSettingValue(value, valueType) {
  if (valueType === 'boolean') {
    return value === 'true';
  }
  if (valueType === 'number') {
    return parseFloat(value);
  }
  if (valueType === 'json') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  return value;
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
          acc[setting.key] = {
            value: parseSettingValue(setting.value, setting.valueType),
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

        const value = parseSettingValue(setting.value, setting.valueType);

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
      preHandler: [fastify.requirePermission('dashboard.settings')],
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
            updatedBy: request.user.id,
          })
          .where(eq(systemSettings.key, key))
          .returning();

        // 清除缓存
        fastify.settings.clearCache();

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

export { ACCESS_LEVEL, SETTING_KEYS, SETTINGS_MAP, canAccessSetting };
