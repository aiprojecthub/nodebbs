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
  categories,
} from '../db/schema.js';
import { MAX_UPLOAD_SIZE_ADMIN_KB, DEFAULT_ALLOWED_EXTENSIONS } from '../constants/upload.js';

// 权限缓存 TTL（秒）
const PERMISSION_CACHE_TTL = 300; // 5 分钟

// Admin 默认宽松条件（无限制）
const ADMIN_DEFAULT_CONDITIONS = {
  maxFileSize: MAX_UPLOAD_SIZE_ADMIN_KB,
  allowedFileTypes: ['*'],
};

/**
 * 智能合并两个权限条件
 * 原则：取更宽松的条件（并集）
 * @param {Object} cond1 - 条件 1
 * @param {Object} cond2 - 条件 2
 * @returns {Object} 合并后的条件
 */
function mergePermissionConditions(cond1, cond2) {
  // 如果任一条件为空（无限制 = 最宽松），直接返回 null
  if (!cond1 || !cond2) return null;
  
  const merged = {};
  const allKeys = new Set([...Object.keys(cond1), ...Object.keys(cond2)]);
  
  for (const key of allKeys) {
    const val1 = cond1[key];
    const val2 = cond2[key];
    
    // 如果某个条件不存在该限制，说明该限制不生效（更宽松）
    if (val1 === undefined) {
      merged[key] = val2;
      continue;
    }
    if (val2 === undefined) {
      merged[key] = val1;
      continue;
    }
    
    switch (key) {
      case 'categories':
        // categories: 取并集（更多分类 = 更宽松）
        if (Array.isArray(val1) && Array.isArray(val2)) {
          merged.categories = [...new Set([...val1, ...val2])];
        } else {
          merged.categories = val1 || val2;
        }
        break;
        
      case 'accountAge':
        // accountAge: 取较小值（门槛更低 = 更宽松）
        merged.accountAge = Math.min(val1, val2);
        break;
        
      case 'rateLimit':
        // rateLimit: 取较大的 count（更多次数 = 更宽松）
        if (val1.period === val2.period) {
          merged.rateLimit = {
            count: Math.max(val1.count, val2.count),
            period: val1.period,
          };
        } else {
          // 周期不同时，转换为统一周期再比较（简化处理：取 count 较大的）
          merged.rateLimit = val1.count >= val2.count ? val1 : val2;
        }
        break;
        
      case 'maxFileSize':
        // maxFileSize: 取较大值（更大文件 = 更宽松）
        merged.maxFileSize = Math.max(val1, val2);
        break;
        
      case 'allowedFileTypes':
        // allowedFileTypes: 取并集（更多类型 = 更宽松）
        if (Array.isArray(val1) && Array.isArray(val2)) {
          merged.allowedFileTypes = [...new Set([...val1, ...val2])];
        } else {
          merged.allowedFileTypes = val1 || val2;
        }
        break;

      case 'timeRange':
        // timeRange: 取并集（更长时间段 = 更宽松）
        // 简化处理：如果有任一角色无时间限制，则无限制
        if (!val1 || !val2) {
          merged.timeRange = null;
        } else {
          // 取更早的开始时间和更晚的结束时间
          merged.timeRange = {
            start: val1.start < val2.start ? val1.start : val2.start,
            end: val1.end > val2.end ? val1.end : val2.end,
          };
        }
        break;
        
      default:
        // 未知条件类型，保守处理：取第一个
        merged[key] = val1;
    }
  }
  
  return merged;
}

class PermissionService {
  constructor(fastify) {
    this.fastify = fastify;
  }

  /**
   * 展开父分类 ID 到所有子分类 ID（向下继承）
   * @param {Array<number>} parentIds - 父分类 ID 列表
   * @returns {Promise<Set<number>>} 展开后的分类 ID 集合
   */
  async _expandCategoryIds(parentIds) {
    if (!parentIds || parentIds.length === 0) return new Set();

    const allCats = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories);
    const expandedIds = new Set(parentIds);

    const addChildren = (parentId) => {
      for (const cat of allCats) {
        if (cat.parentId === parentId && !expandedIds.has(cat.id)) {
          expandedIds.add(cat.id);
          addChildren(cat.id);
        }
      }
    };
    for (const id of parentIds) {
      addChildren(id);
    }

    return expandedIds;
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
   * 获取用户的所有权限
   * @param {number|null} userId - 用户 ID，null 表示未登录用户（使用 guest 角色）
   * @returns {Promise<Array>} 权限列表（包含条件）
   */
  async getUserPermissions(userId) {
    // 对于未登录用户（null/undefined/空值），使用专门的 guest 缓存 key
    const isGuest = !userId;
    const cacheKey = isGuest ? 'user:guest:permissions' : `user:${userId}:permissions`;

    if (this.fastify?.cache) {
      return await this.fastify.cache.remember(cacheKey, PERMISSION_CACHE_TTL, async () => {
        return this._fetchUserPermissions(userId);
      });
    }

    return this._fetchUserPermissions(userId);
  }

  async _fetchUserPermissions(userId) {
    let roleIds;

    if (!userId) {
      // 未登录用户使用 guest 角色
      const guestRole = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.slug, 'guest'))
        .limit(1);

      if (!guestRole.length) {
        this.fastify?.log?.warn('[RBAC] Guest 角色不存在，未登录用户无任何权限');
        return [];
      }

      roleIds = [guestRole[0].id];
    } else {
      const userRolesList = await this.getUserRoles(userId);
      if (!userRolesList.length) {
        return [];
      }

      roleIds = userRolesList.map(r => r.id);
    }

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

    // 去重并合并条件（使用智能合并策略）
    const permMap = new Map();
    for (const perm of results) {
      const existing = permMap.get(perm.slug);
      const currentConditions = perm.conditions ? JSON.parse(perm.conditions) : null;

      if (!existing) {
        permMap.set(perm.slug, {
          ...perm,
          conditions: currentConditions,
        });
      } else {
        // 智能合并条件：取更宽松的条件
        const mergedConditions = mergePermissionConditions(
          existing.conditions,
          currentConditions
        );
        
        permMap.set(perm.slug, {
          ...perm,
          conditions: mergedConditions,
        });
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
    const result = await this.inspect(userId, permissionSlug, context);
    return result.granted;
  }

  /**
   * 检查用户是否有某个权限（带详细原因）
   * @param {number} userId - 用户 ID
   * @param {string} permissionSlug - 权限标识
   * @param {Object} context - 上下文
   * @returns {Promise<{granted: boolean, conditions?: Object, reason?: string, code?: string}>}
   */
  async inspect(userId, permissionSlug, context = {}) {
    // 快捷路径：admin 角色拥有所有权限，返回宽松条件
    if (userId) {
      const isAdmin = await this.hasRole(userId, 'admin');
      if (isAdmin) {
        return { granted: true, conditions: ADMIN_DEFAULT_CONDITIONS };
      }
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
    const conditions = permission.conditions || {};

    // categories: [1, 2, 3] 表示只能在指定父分类（及其子分类）操作
    if (context.categoryId !== undefined && conditions.categories) {
      const allowedIds = await this._expandCategoryIds(conditions.categories);
      if (!allowedIds.has(context.categoryId)) {
        return {
          granted: false,
          code: 'CATEGORY_NOT_ALLOWED',
          reason: '你没有在该分类下操作的权限',
        };
      }
    }

    // accountAge: 30 表示账号注册天数需达到指定值
    if (conditions.accountAge !== undefined && context.userCreatedAt !== undefined) {
      const accountAgeDays = Math.floor(
        (Date.now() - new Date(context.userCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (accountAgeDays < conditions.accountAge) {
        return {
          granted: false,
          code: 'ACCOUNT_TOO_NEW',
          reason: `账号注册需满 ${conditions.accountAge} 天，当前 ${accountAgeDays} 天`,
        };
      }
    }

    // timeRange: { start: "09:00", end: "18:00" } 表示只在指定时间段内有效
    if (conditions.timeRange) {
      const { start, end } = conditions.timeRange;
      if (start && end) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // 转换时间字符串为分钟数
        const timeToMinutes = (timeStr) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const startMinutes = timeToMinutes(start);
        const endMinutes = timeToMinutes(end);

        let allowed;
        if (startMinutes <= endMinutes) {
          // 正常时间段：09:00 - 18:00
          allowed = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        } else {
          // 跨午夜时间段：22:00 - 02:00
          allowed = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }

        if (!allowed) {
          return {
            granted: false,
            code: 'TIME_NOT_ALLOWED',
            reason: `当前时间不允许操作，开放时间段：${start} - ${end}`,
          };
        }
      }
    }

    // maxFileSize: 1024 表示上传文件最大大小（KB）
    if (conditions.maxFileSize !== undefined && context.fileSize !== undefined) {
      const fileSizeKB = context.fileSize / 1024;
      if (fileSizeKB > conditions.maxFileSize) {
        return {
          granted: false,
          code: 'FILE_TOO_LARGE',
          reason: `文件大小超过限制，最大 ${conditions.maxFileSize} KB`,
        };
      }
    }

    // allowedFileTypes: ["jpg", "png", "gif"] 表示允许的文件类型
    // ['*'] 表示无限制（管理员），未设置则使用系统默认扩展名白名单
    if (context.fileType !== undefined) {
      // ['*'] 表示无限制，跳过检查
      if (conditions.allowedFileTypes?.includes('*')) {
        // 管理员无限制，不做检查
      } else {
        const allowedTypes = conditions.allowedFileTypes || DEFAULT_ALLOWED_EXTENSIONS;
        const ext = context.fileType.toLowerCase().replace('.', '');
        if (!allowedTypes.includes(ext)) {
          return {
            granted: false,
            code: 'FILE_TYPE_NOT_ALLOWED',
            reason: `不支持的文件类型，允许：${allowedTypes.join(', ')}`,
          };
        }
      }
    }

    // rateLimit: { count: 10, period: "hour" } 表示限制操作频率
    // 注意：rateLimit 放在最后检查，避免其他条件失败时也增加计数器
    if (conditions.rateLimit) {
      const { count, period } = conditions.rateLimit;
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

    return { granted: true, conditions };
  }

  /**
   * 内部方法：检查并增加频率限制计数（使用 Redis 原子操作）
   * @private
   */
  async _checkAndIncrementRateLimit(userId, actionKey, maxCount, period) {
    // 计算时间窗口（秒）
    const periodSeconds = {
      minute: 60,
      hour: 3600,
      day: 86400,
    }[period] || 3600;

    // 使用明确的前缀避免与其他功能的 key 冲突
    const cacheKey = `rbac:ratelimit:${userId}:${actionKey}`;

    // 优先使用 Redis（支持原子操作）
    if (this.fastify?.redis) {
      try {
        const current = await this.fastify.redis.incr(cacheKey);

        if (current === 1) {
          // 第一次设置过期时间
          await this.fastify.redis.expire(cacheKey, periodSeconds);
        }

        if (current > maxCount) {
          const ttl = await this.fastify.redis.ttl(cacheKey);
          return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(Date.now() + ttl * 1000),
          };
        }

        return {
          allowed: true,
          remaining: maxCount - current,
        };
      } catch (err) {
        this.fastify?.log.error('[RBAC] Redis 频率限制检查失败:', err);
        // Redis 失败时降级到内存缓存
      }
    }

    // 降级：使用内存缓存（非原子操作，但总比没有好）
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

    // 最终降级：记录警告并允许（避免功能完全不可用）
    this.fastify?.log.warn('[RBAC] 频率限制缓存不可用，已降级允许操作');
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
   * 获取用户允许访问的分类 ID 列表
   * @param {number|null} userId - 用户 ID，null/undefined 表示未登录用户
   * @param {string} permissionSlug - 权限标识，默认为 'topic.read'
   * @returns {Promise<number[]|null>} 分类 ID 列表，null 表示无限制
   */
  async getAllowedCategoryIds(userId, permissionSlug = 'topic.read') {
    // 管理员无限制
    if (userId) {
      const isAdmin = await this.hasRole(userId, 'admin');
      if (isAdmin) return null;
    }

    const userPermissions = await this.getUserPermissions(userId);
    const permission = userPermissions.find(p => p.slug === permissionSlug);

    if (!permission) {
      // 没有该权限，返回空数组（无法访问任何分类）
      return [];
    }

    const parentIds = permission.conditions?.categories;
    if (!parentIds) return null; // 无限制

    // 向下继承：展开父分类到所有子分类
    const expandedIds = await this._expandCategoryIds(parentIds);
    return [...expandedIds];
  }

  /**
   * 检查用户是否有任一权限（仅检查权限是否存在，不评估 conditions）
   * 适用于 UI 可见性判断等无需严格条件校验的场景。
   * 需要严格条件校验时请使用 check() 或 inspect()。
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
   * 检查用户是否有所有权限（仅检查权限是否存在，不评估 conditions）
   * 适用于 UI 可见性判断等无需严格条件校验的场景。
   * 需要严格条件校验时请使用 check() 或 inspect()。
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
      // 同时清除用户信息缓存和权限缓存，确保一致性
      await this.fastify.cache.invalidate([
        `user:${userId}`,
        `user:full:${userId}`,
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
  async enrichUser(user) {
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
      permissions: userPermissions,
      displayRole: displayRole ? {
        slug: displayRole.slug,
        name: displayRole.name,
        color: displayRole.color,
        icon: displayRole.icon,
      } : null,
      // 基于 RBAC 的管理员判断（不依赖旧 role 字段，确保撤销 RBAC 角色后权限立即失效）
      isAdmin: userRolesList.some(r => r.slug === 'admin'),
    };
  }

  // ============ 管理方法 ============

  /**
   * 为新用户分配默认角色
   * - 第一个注册的用户自动分配 admin 角色
   * - 其他用户分配 isDefault 标记的角色，找不到则 fallback 到 slug='user' 的角色
   * @param {number} userId - 用户 ID
   * @param {Object} options - 选项
   * @param {boolean} options.isFirstUser - 是否是系统中第一个注册的用户
   * @param {number} options.assignedBy - 分配者 ID（可选）
   * @returns {Promise<Object|null>} 分配的角色信息
   */
  async assignDefaultRoleToUser(userId, options = {}) {
    const { isFirstUser, assignedBy } = options;

    let targetRole;

    if (isFirstUser) {
      // 第一个用户：分配 admin 角色（需确保种子数据中已创建 admin 角色）
      [targetRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.slug, 'admin'))
        .limit(1);
    } else {
      // 普通用户：优先使用 isDefault=true 的角色
      [targetRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.isDefault, true))
        .limit(1);

      // fallback：未设置默认角色时使用 slug='user' 的角色
      if (!targetRole) {
        [targetRole] = await db
          .select()
          .from(roles)
          .where(eq(roles.slug, 'user'))
          .limit(1);
      }
    }

    if (!targetRole) {
      this.fastify?.log?.warn(
        `[RBAC] 未找到可分配的角色（isFirstUser=${!!isFirstUser}），请检查角色种子数据`
      );
      return null;
    }

    await db.insert(userRoles).values({
      userId,
      roleId: targetRole.id,
      assignedBy,
    }).onConflictDoNothing();

    // 清除缓存，确保后续查询能获取到最新角色数据
    await this.clearUserPermissionCache(userId);

    return targetRole;
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

    // 检查是否是 guest 角色，如果是则清除 guest 权限缓存
    const [role] = await db
      .select({ slug: roles.slug })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (role?.slug === 'guest') {
      await this.fastify.cache.invalidate(['user:guest:permissions']);
      this.fastify.log?.info('[RBAC] 已清除 guest 角色权限缓存');
    }

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

  // ============ Request 感知的便捷方法 ============

  /**
   * 从 request 中提取上下文
   * @private
   */
  _prepareFromRequest(request, context) {
    const userId = request.user?.id ?? null;
    const ctx = { ...context };

    if (request.user && ctx.userCreatedAt === undefined) {
      ctx.userCreatedAt = request.user.createdAt;
    }

    return { userId, ctx };
  }

  /**
   * 权限检查核心逻辑（支持数组）
   * @private
   */
  async _checkCore(userId, permissionSlug, context = {}, any = false) {
    const slugs = Array.isArray(permissionSlug) ? permissionSlug : [permissionSlug];
    let lastDenyResult = null;
    let mergedConditions = {};

    if (any) {
      // any 模式：满足任一权限即可，返回第一个成功的结果
      for (const slug of slugs) {
        const result = await this.inspect(userId, slug, context);
        if (result.granted) {
          return result;
        }
        lastDenyResult = result;
      }
    } else {
      // all 模式：需满足所有权限，合并所有 conditions
      for (const slug of slugs) {
        const result = await this.inspect(userId, slug, context);
        if (!result.granted) {
          lastDenyResult = result;
          break;
        }
        // 合并 conditions
        if (result.conditions) {
          mergedConditions = { ...mergedConditions, ...result.conditions };
        }
      }
      if (!lastDenyResult) {
        return { granted: true, conditions: mergedConditions };
      }
    }

    return lastDenyResult;
  }

  /**
   * 权限检查（从 request 提取上下文，无权限时抛出 403 错误）
   *
   * @param {Object} request - Fastify request 对象
   * @param {string|string[]} permissionSlug - 权限标识或权限数组
   * @param {Object} context - 权限检查上下文
   * @param {number} [context.ownerId] - 资源所有者ID，用于 `own: true` 条件
   * @param {number} [context.categoryId] - 分类ID，用于 `categories: [1,2,3]` 条件
   * @param {Date|string} [context.userCreatedAt] - 用户注册时间（自动注入）
   * @param {number} [context.fileSize] - 文件大小（字节）
   * @param {string} [context.fileType] - 文件类型/扩展名
   * @param {Object} options - 配置选项
   * @param {boolean} options.any - 满足任一权限即可
   * @returns {Promise<{granted: true, conditions?: Object}>} 成功时返回检查结果
   * @throws {Error} 无权限时抛出 403 错误
   *
   * @example
   * // 简单守卫（忽略返回值）
   * await fastify.permission.check(request, 'topic.create');
   *
   * // 获取条件信息
   * const { conditions } = await fastify.permission.check(request, 'upload.create');
   * const maxSize = conditions?.maxFileSize;
   */
  async check(request, permissionSlug, context = {}, options = {}) {
    // 兼容 user.role
    if (request.user?.isAdmin) {
      return { granted: true, conditions: ADMIN_DEFAULT_CONDITIONS };
    }
    const { userId, ctx } = this._prepareFromRequest(request, context);
    const result = await this._checkCore(userId, permissionSlug, ctx, options.any);

    if (!result.granted) {
      const error = new Error(result.reason || '没有执行此操作的权限');
      error.statusCode = 403;
      error.code = result.code;
      throw error;
    }

    return result;
  }

  /**
   * 权限检查（从 request 提取上下文，返回布尔值）
   *
   * @param {Object} request - Fastify request 对象
   * @param {string} permissionSlug - 权限标识
   * @param {Object} context - 权限检查上下文
   * @returns {Promise<boolean>} 是否有权限
   *
   * @example
   * const canEdit = await fastify.permission.can(request, 'topic.update', { ownerId: topic.userId });
   */
  async can(request, permissionSlug, context = {}) {
    const { userId, ctx } = this._prepareFromRequest(request, context);
    return this.hasPermission(userId, permissionSlug, ctx);
  }

  /**
   * 获取用户允许访问的分类 ID 列表（从 request 提取用户）
   *
   * @param {Object} request - Fastify request 对象
   * @param {string} permissionSlug - 权限标识，默认 'topic.read'
   * @returns {Promise<number[]|null>} 分类 ID 数组，null 表示无限制
   *
   * @example
   * const allowedIds = await fastify.permission.getAllowedCategories(request);
   */
  async getAllowedCategories(request, permissionSlug = 'topic.read') {
    const userId = request.user?.id ?? null;
    return this.getAllowedCategoryIds(userId, permissionSlug);
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
