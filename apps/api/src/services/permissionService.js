/**
 * Permission Service
 * RBAC 权限检查服务
 */

import { eq, and, inArray, isNull, gt, or } from 'drizzle-orm';
import db from '../db/index.js';
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  users,
} from '../db/schema.js';

// 权限缓存 TTL（秒）
const PERMISSION_CACHE_TTL = 300; // 5 分钟

class PermissionService {
  constructor(fastify) {
    this.fastify = fastify;
  }

  /**
   * 获取用户的所有角色
   * @param {number} userId - 用户 ID
   * @returns {Promise<Array>} 用户角色列表
   */
  async getUserRoles(userId) {
    const cacheKey = `user:${userId}:roles`;

    // 尝试从缓存获取
    if (this.fastify?.cache) {
      return await this.fastify.cache.remember(cacheKey, PERMISSION_CACHE_TTL, async () => {
        return this._fetchUserRoles(userId);
      });
    }

    return this._fetchUserRoles(userId);
  }

  async _fetchUserRoles(userId) {
    const now = new Date();

    const results = await db
      .select({
        id: roles.id,
        slug: roles.slug,
        name: roles.name,
        color: roles.color,
        icon: roles.icon,
        priority: roles.priority,
        isDisplayed: roles.isDisplayed,
        parentId: roles.parentId,
        expiresAt: userRoles.expiresAt,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          // 排除已过期的角色：expiresAt 为 null 或 expiresAt > now
          or(
            isNull(userRoles.expiresAt),
            gt(userRoles.expiresAt, now)
          )
        )
      );

    return results;
  }

  /**
   * 获取角色的所有祖先角色ID（用于角色继承）
   * @param {number} roleId - 角色 ID
   * @param {Set} visited - 已访问的角色ID集合（防止循环）
   * @returns {Promise<number[]>} 祖先角色ID列表
   */
  async _getAncestorRoleIds(roleId, visited = new Set()) {
    if (visited.has(roleId)) {
      return []; // 防止循环继承
    }
    visited.add(roleId);

    const [role] = await db
      .select({ parentId: roles.parentId })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role || !role.parentId) {
      return [];
    }

    const ancestors = await this._getAncestorRoleIds(role.parentId, visited);
    return [role.parentId, ...ancestors];
  }

  /**
   * 获取用户所有角色ID（包括继承的父角色）
   * @param {number} userId - 用户 ID
   * @returns {Promise<number[]>} 角色ID列表
   */
  async _getAllRoleIdsWithInheritance(userId) {
    const userRolesList = await this.getUserRoles(userId);
    const allRoleIds = new Set(userRolesList.map(r => r.id));

    // 递归获取所有父角色
    for (const role of userRolesList) {
      if (role.parentId) {
        const ancestors = await this._getAncestorRoleIds(role.id);
        ancestors.forEach(id => allRoleIds.add(id));
      }
    }

    return Array.from(allRoleIds);
  }

  /**
   * 获取用户的所有权限
   * @param {number} userId - 用户 ID
   * @returns {Promise<Array>} 权限列表（包含条件）
   */
  async getUserPermissions(userId) {
    const cacheKey = `user:${userId}:permissions`;

    if (this.fastify?.cache) {
      return await this.fastify.cache.remember(cacheKey, PERMISSION_CACHE_TTL, async () => {
        return this._fetchUserPermissions(userId);
      });
    }

    return this._fetchUserPermissions(userId);
  }

  async _fetchUserPermissions(userId) {
    const userRolesList = await this.getUserRoles(userId);
    if (!userRolesList.length) {
      return [];
    }

    // 获取所有角色ID（包括继承的父角色）
    const roleIds = await this._getAllRoleIdsWithInheritance(userId);

    if (!roleIds.length) {
      return [];
    }

    const results = await db
      .select({
        id: permissions.id,
        slug: permissions.slug,
        name: permissions.name,
        module: permissions.module,
        action: permissions.action,
        conditions: rolePermissions.conditions,
        roleId: rolePermissions.roleId,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(inArray(rolePermissions.roleId, roleIds));

    // 获取角色优先级映射
    const rolePriorityMap = new Map();
    const allRoles = await db
      .select({ id: roles.id, priority: roles.priority })
      .from(roles)
      .where(inArray(roles.id, roleIds));
    allRoles.forEach(r => rolePriorityMap.set(r.id, r.priority));

    // 去重并合并条件（高优先级角色的权限覆盖低优先级）
    const permMap = new Map();
    for (const perm of results) {
      const existing = permMap.get(perm.slug);
      const currentPriority = rolePriorityMap.get(perm.roleId) || 0;
      const existingPriority = existing ? (rolePriorityMap.get(existing.roleId) || 0) : -1;

      if (!existing) {
        permMap.set(perm.slug, {
          ...perm,
          conditions: perm.conditions ? JSON.parse(perm.conditions) : null,
        });
      } else {
        // 如果有更宽松的权限（无条件），使用无条件版本
        // 或者高优先级角色的权限覆盖低优先级
        if (!perm.conditions && existing.conditions) {
          permMap.set(perm.slug, {
            ...perm,
            conditions: null,
          });
        } else if (currentPriority > existingPriority && perm.conditions) {
          // 高优先级角色的条件可能更宽松
          permMap.set(perm.slug, {
            ...perm,
            conditions: JSON.parse(perm.conditions),
          });
        }
      }
    }

    return Array.from(permMap.values());
  }

  /**
   * 检查用户是否有某个权限
   * @param {number} userId - 用户 ID
   * @param {string} permissionSlug - 权限标识
   * @param {Object} context - 上下文（如资源所有者ID、分类ID等）
   * @returns {Promise<boolean>}
   */
  async hasPermission(userId, permissionSlug, context = {}) {
    const result = await this.checkPermissionWithReason(userId, permissionSlug, context);
    return result.granted;
  }

  /**
   * 检查用户是否有某个权限（带详细原因）
   * @param {number} userId - 用户 ID
   * @param {string} permissionSlug - 权限标识
   * @param {Object} context - 上下文
   * @returns {Promise<{granted: boolean, reason?: string, code?: string}>}
   */
  async checkPermissionWithReason(userId, permissionSlug, context = {}) {
    // 快捷路径：admin 角色拥有所有权限，无需检查条件
    const isAdmin = await this.hasRole(userId, 'admin');
    if (isAdmin) {
      return { granted: true };
    }

    const userPermissions = await this.getUserPermissions(userId);
    const permission = userPermissions.find(p => p.slug === permissionSlug);

    if (!permission) {
      return {
        granted: false,
        code: 'NO_PERMISSION',
        reason: '你没有执行此操作的权限',
      };
    }

    // 检查条件
    if (permission.conditions) {
      // own: true 表示只能操作自己的资源
      if (permission.conditions.own && context.ownerId !== undefined) {
        if (context.ownerId !== userId) {
          return {
            granted: false,
            code: 'NOT_OWNER',
            reason: '只能操作自己的内容',
          };
        }
      }

      // categories: [1, 2, 3] 表示只能在指定分类操作
      if (permission.conditions.categories && context.categoryId !== undefined) {
        if (!permission.conditions.categories.includes(context.categoryId)) {
          return {
            granted: false,
            code: 'CATEGORY_NOT_ALLOWED',
            reason: '你没有在该分类下操作的权限',
          };
        }
      }

      // accountAge: 30 表示账号注册天数需达到指定值
      if (permission.conditions.accountAge !== undefined && context.userCreatedAt !== undefined) {
        const accountAgeDays = Math.floor(
          (Date.now() - new Date(context.userCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (accountAgeDays < permission.conditions.accountAge) {
          return {
            granted: false,
            code: 'ACCOUNT_TOO_NEW',
            reason: `账号注册需满 ${permission.conditions.accountAge} 天，当前 ${accountAgeDays} 天`,
          };
        }
      }

      // timeRange: { start: "09:00", end: "18:00" } 表示只在指定时间段内有效
      if (permission.conditions.timeRange) {
        const { start, end } = permission.conditions.timeRange;
        if (start && end) {
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          if (currentTime < start || currentTime > end) {
            return {
              granted: false,
              code: 'TIME_NOT_ALLOWED',
              reason: `当前时间不允许操作，开放时间段：${start} - ${end}`,
            };
          }
        }
      }

      // rateLimit: { count: 10, period: "hour" } 表示限制操作频率
      if (permission.conditions.rateLimit) {
        const { count, period } = permission.conditions.rateLimit;
        if (count && period) {
          const rateLimitResult = await this._checkAndIncrementRateLimit(
            userId,
            permissionSlug,
            count,
            period
          );
          if (!rateLimitResult.allowed) {
            const periodText = { minute: '分钟', hour: '小时', day: '天' }[period] || period;
            return {
              granted: false,
              code: 'RATE_LIMITED',
              reason: `操作过于频繁，每${periodText}最多 ${count} 次`,
            };
          }
        }
      }

      // maxFileSize: 1024 表示上传文件最大大小（KB）
      if (permission.conditions.maxFileSize !== undefined && context.fileSize !== undefined) {
        const fileSizeKB = context.fileSize / 1024;
        if (fileSizeKB > permission.conditions.maxFileSize) {
          return {
            granted: false,
            code: 'FILE_TOO_LARGE',
            reason: `文件大小超过限制，最大 ${permission.conditions.maxFileSize} KB`,
          };
        }
      }

      // allowedFileTypes: ["jpg", "png", "gif"] 表示允许的文件类型
      if (permission.conditions.allowedFileTypes && context.fileType !== undefined) {
        const ext = context.fileType.toLowerCase().replace('.', '');
        if (!permission.conditions.allowedFileTypes.includes(ext)) {
          return {
            granted: false,
            code: 'FILE_TYPE_NOT_ALLOWED',
            reason: `不支持的文件类型，允许：${permission.conditions.allowedFileTypes.join(', ')}`,
          };
        }
      }

      // uploadTypes: ["avatar", "topic"] 表示允许的上传目录类型
      if (permission.conditions.uploadTypes && context.uploadType !== undefined) {
        if (!permission.conditions.uploadTypes.includes(context.uploadType)) {
          return {
            granted: false,
            code: 'UPLOAD_TYPE_NOT_ALLOWED',
            reason: '你没有上传该类型文件的权限',
          };
        }
      }
    }

    return { granted: true };
  }

  /**
   * 内部方法：检查并增加频率限制计数
   * @private
   */
  async _checkAndIncrementRateLimit(userId, actionKey, maxCount, period) {
    // 计算时间窗口（秒）
    const periodSeconds = {
      minute: 60,
      hour: 3600,
      day: 86400,
    }[period] || 3600;

    const cacheKey = `ratelimit:${userId}:${actionKey}`;

    // 如果有缓存，使用滑动窗口计数
    if (this.fastify?.cache) {
      const currentCount = (await this.fastify.cache.get(cacheKey)) || 0;

      if (currentCount >= maxCount) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + periodSeconds * 1000),
        };
      }

      // 增加计数
      await this.fastify.cache.set(cacheKey, currentCount + 1, periodSeconds);

      return {
        allowed: true,
        remaining: maxCount - currentCount - 1,
      };
    }

    // 没有缓存时，默认允许（降级处理）
    return { allowed: true };
  }

  /**
   * 检查用户是否有某个角色
   * @param {number} userId - 用户 ID
   * @param {string} roleSlug - 角色标识
   * @returns {Promise<boolean>}
   */
  async hasRole(userId, roleSlug) {
    const userRolesList = await this.getUserRoles(userId);
    return userRolesList.some(r => r.slug === roleSlug);
  }

  /**
   * 检查频率限制
   * @param {number} userId - 用户 ID
   * @param {string} permissionSlug - 权限标识
   * @param {string} actionKey - 操作标识（用于缓存 key）
   * @returns {Promise<{allowed: boolean, remaining?: number, resetAt?: Date}>}
   */
  async checkRateLimit(userId, permissionSlug, actionKey) {
    const userPermissions = await this.getUserPermissions(userId);
    const permission = userPermissions.find(p => p.slug === permissionSlug);

    if (!permission || !permission.conditions?.rateLimit) {
      return { allowed: true };
    }

    const { count, period } = permission.conditions.rateLimit;
    if (!count || !period) {
      return { allowed: true };
    }

    // 计算时间窗口（秒）
    const periodSeconds = {
      minute: 60,
      hour: 3600,
      day: 86400,
    }[period] || 3600;

    const cacheKey = `ratelimit:${userId}:${actionKey}`;

    // 如果有缓存，使用滑动窗口计数
    if (this.fastify?.cache) {
      const currentCount = await this.fastify.cache.get(cacheKey) || 0;

      if (currentCount >= count) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + periodSeconds * 1000),
        };
      }

      // 增加计数（如果是第一次，设置过期时间）
      await this.fastify.cache.set(cacheKey, currentCount + 1, periodSeconds);

      return {
        allowed: true,
        remaining: count - currentCount - 1,
      };
    }

    // 没有缓存时，默认允许（降级处理）
    return { allowed: true };
  }

  /**
   * 检查每日上传数量限制
   * @param {number} userId - 用户 ID
   * @param {string} permissionSlug - 权限标识
   * @param {number} currentDayCount - 当天已上传数量
   * @returns {Promise<{allowed: boolean, remaining?: number}>}
   */
  async checkDailyUploadLimit(userId, permissionSlug, currentDayCount) {
    const userPermissions = await this.getUserPermissions(userId);
    const permission = userPermissions.find(p => p.slug === permissionSlug);

    if (!permission || !permission.conditions?.maxFilesPerDay) {
      return { allowed: true };
    }

    const maxFiles = permission.conditions.maxFilesPerDay;
    const remaining = maxFiles - currentDayCount;

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
    };
  }

  /**
   * 获取权限的条件配置
   * @param {number} userId - 用户 ID
   * @param {string} permissionSlug - 权限标识
   * @returns {Promise<Object|null>}
   */
  async getPermissionConditions(userId, permissionSlug) {
    const userPermissions = await this.getUserPermissions(userId);
    const permission = userPermissions.find(p => p.slug === permissionSlug);
    return permission?.conditions || null;
  }

  /**
   * 检查用户是否有任一权限
   * @param {number} userId - 用户 ID
   * @param {Array<string>} permissionSlugs - 权限标识列表
   * @returns {Promise<boolean>}
   */
  async hasAnyPermission(userId, permissionSlugs) {
    // 快捷路径：admin 角色拥有所有权限
    const isAdmin = await this.hasRole(userId, 'admin');
    if (isAdmin) {
      return true;
    }

    const userPermissions = await this.getUserPermissions(userId);
    const userPermSlugs = userPermissions.map(p => p.slug);
    return permissionSlugs.some(slug => userPermSlugs.includes(slug));
  }

  /**
   * 检查用户是否有所有权限
   * @param {number} userId - 用户 ID
   * @param {Array<string>} permissionSlugs - 权限标识列表
   * @returns {Promise<boolean>}
   */
  async hasAllPermissions(userId, permissionSlugs) {
    // 快捷路径：admin 角色拥有所有权限
    const isAdmin = await this.hasRole(userId, 'admin');
    if (isAdmin) {
      return true;
    }

    const userPermissions = await this.getUserPermissions(userId);
    const userPermSlugs = userPermissions.map(p => p.slug);
    return permissionSlugs.every(slug => userPermSlugs.includes(slug));
  }

  /**
   * 清除用户权限缓存
   * @param {number} userId - 用户 ID
   */
  async clearUserPermissionCache(userId) {
    if (this.fastify?.cache) {
      await this.fastify.cache.invalidate([
        `user:${userId}:roles`,
        `user:${userId}:permissions`,
      ]);
    }
  }

  /**
   * 增强用户对象，添加 RBAC 数据
   * @param {Object} user - 用户对象
   * @returns {Promise<Object>} 增强后的用户对象
   */
  async enhanceUserWithPermissions(user) {
    if (!user) return null;

    const [userRolesList, userPermissions] = await Promise.all([
      this.getUserRoles(user.id),
      this.getUserPermissions(user.id),
    ]);

    // 获取展示角色（最高优先级且允许展示的角色）
    const displayRole = userRolesList
      .filter(r => r.isDisplayed)
      .sort((a, b) => b.priority - a.priority)[0] || null;

    return {
      ...user,
      // RBAC 数据
      userRoles: userRolesList,
      permissions: userPermissions.map(p => p.slug),
      displayRole: displayRole ? {
        slug: displayRole.slug,
        name: displayRole.name,
        color: displayRole.color,
        icon: displayRole.icon,
      } : null,
      // 向后兼容的权限检查
      isAdmin: userRolesList.some(r => r.slug === 'admin'),
    };
  }

  // ============ 管理方法 ============

  /**
   * 为新用户分配默认角色
   * @param {number} userId - 用户 ID
   * @param {Object} options - 选项
   * @param {number} options.assignedBy - 分配者 ID（可选）
   * @returns {Promise<Object|null>} 分配的角色信息
   */
  async assignDefaultRoleToUser(userId, options = {}) {
    const { assignedBy } = options;

    // 查找默认角色（isDefault = true）或 slug = 'user'
    let [defaultRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.isDefault, true))
      .limit(1);

    // 如果没有设置默认角色，尝试查找 slug = 'user' 的角色
    if (!defaultRole) {
      [defaultRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.slug, 'user'))
        .limit(1);
    }

    if (!defaultRole) {
      // 没有找到默认角色，记录警告但不阻断流程
      if (this.fastify?.log) {
        this.fastify.log.warn(`[RBAC] 未找到默认角色，用户 ${userId} 未分配角色`);
      }
      return null;
    }

    // 分配角色
    await db.insert(userRoles).values({
      userId,
      roleId: defaultRole.id,
      assignedBy,
    }).onConflictDoNothing(); // 如果已存在则忽略

    return defaultRole;
  }

  /**
   * 为用户分配角色
   * @param {number} userId - 用户 ID
   * @param {number} roleId - 角色 ID
   * @param {Object} options - 选项
   */
  async assignRoleToUser(userId, roleId, options = {}) {
    const { expiresAt, assignedBy } = options;

    await db.insert(userRoles).values({
      userId,
      roleId,
      expiresAt,
      assignedBy,
    }).onConflictDoUpdate({
      target: [userRoles.userId, userRoles.roleId],
      set: { expiresAt, assignedBy, assignedAt: new Date() },
    });

    await this.clearUserPermissionCache(userId);
  }

  /**
   * 从用户移除角色
   * @param {number} userId - 用户 ID
   * @param {number} roleId - 角色 ID
   */
  async removeRoleFromUser(userId, roleId) {
    await db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId)
        )
      );

    await this.clearUserPermissionCache(userId);
  }

  /**
   * 获取所有角色
   */
  async getAllRoles() {
    return db.select().from(roles).orderBy(roles.priority);
  }

  /**
   * 获取所有权限
   */
  async getAllPermissions() {
    return db.select().from(permissions).orderBy(permissions.module, permissions.action);
  }

  /**
   * 根据 slug 获取角色
   */
  async getRoleBySlug(slug) {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.slug, slug))
      .limit(1);
    return role;
  }

  /**
   * 获取角色的权限
   */
  async getRolePermissions(roleId) {
    return db
      .select({
        id: permissions.id,
        slug: permissions.slug,
        name: permissions.name,
        module: permissions.module,
        action: permissions.action,
        conditions: rolePermissions.conditions,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
  }

  /**
   * 设置角色的权限
   * @param {number} roleId - 角色 ID
   * @param {Array<{permissionId: number, conditions?: object}>} permissionConfigs - 权限配置
   */
  async setRolePermissions(roleId, permissionConfigs) {
    // 删除现有权限
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    // 插入新权限
    if (permissionConfigs.length > 0) {
      await db.insert(rolePermissions).values(
        permissionConfigs.map(config => ({
          roleId,
          permissionId: config.permissionId,
          conditions: config.conditions ? JSON.stringify(config.conditions) : null,
        }))
      );
    }

    // 清除所有拥有该角色的用户的权限缓存
    await this.clearRoleUsersPermissionCache(roleId);
  }

  /**
   * 清除拥有指定角色的所有用户的权限缓存
   * @param {number} roleId - 角色 ID
   */
  async clearRoleUsersPermissionCache(roleId) {
    if (!this.fastify?.cache) return;

    // 查询所有拥有该角色的用户
    const usersWithRole = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId));

    // 清除每个用户的权限缓存
    for (const { userId } of usersWithRole) {
      await this.clearUserPermissionCache(userId);
    }

    if (usersWithRole.length > 0 && this.fastify?.log) {
      this.fastify.log.info(`[RBAC] 已清除 ${usersWithRole.length} 个用户的权限缓存（角色ID: ${roleId}）`);
    }
  }

  /**
   * 获取角色（包含父角色信息）
   * @param {number} roleId - 角色 ID
   */
  async getRoleById(roleId) {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    return role;
  }

  /**
   * 检测循环继承
   * @param {number} roleId - 要设置的角色 ID
   * @param {number} parentId - 要设置的父角色 ID
   * @returns {Promise<boolean>} 是否存在循环
   */
  async detectCircularInheritance(roleId, parentId) {
    if (!parentId || roleId === parentId) {
      return roleId === parentId;
    }

    const visited = new Set([roleId]);
    let currentId = parentId;

    while (currentId) {
      if (visited.has(currentId)) {
        return true; // 检测到循环
      }
      visited.add(currentId);

      const [role] = await db
        .select({ parentId: roles.parentId })
        .from(roles)
        .where(eq(roles.id, currentId))
        .limit(1);

      currentId = role?.parentId;
    }

    return false;
  }

  /**
   * 检查权限（便捷方法）
   * @param {number} userId - 用户 ID
   * @param {string} permissionSlug - 权限标识
   * @param {Object} context - 上下文
   * @returns {Promise<{granted: boolean}>}
   */
  async can(userId, permissionSlug, context = {}) {
    const granted = await this.hasPermission(userId, permissionSlug, context);
    return { granted };
  }
}

// 创建单例实例工厂
let instance = null;

export function createPermissionService(fastify) {
  instance = new PermissionService(fastify);
  return instance;
}

export function getPermissionService() {
  if (!instance) {
    instance = new PermissionService(null);
  }
  return instance;
}

export default PermissionService;
