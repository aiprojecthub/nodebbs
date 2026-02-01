import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import ms from 'ms';
import env from '../config/env.js';
import { createPermissionService } from '../services/permissionService.js';

async function authPlugin(fastify) {
  // 注册 Cookie 插件
  await fastify.register(import('@fastify/cookie'), {
    secret: env.security.cookieSecret,
    parseOptions: {} 
  });

  // 设置 Auth Cookie 的辅助函数
  fastify.decorateReply('setAuthCookie', function(token) {
    const expiresIn = env.security.jwtExpiresIn;
    
    this.setCookie('auth_token', token, {
      path: '/',
      httpOnly: true,
      // 开发环境：
      // - Secure: 自动检测 (HTTPS时为true，HTTP时为false)
      // - SameSite: Lax (localhost 不同端口视为同站，允许发送)
      secure: env.security.cookieSecure !== undefined 
        ? env.security.cookieSecure
        : this.request.protocol === 'https',
      sameSite: env.security.cookieSameSite,
      domain: env.security.cookieDomain, // 生产环境如果是子域名部署，需要设置主域名 (如 .example.com)
      maxAge: ms(expiresIn) / 1000,
    });
  });

  // 生成 Token 并设置 Cookie
  fastify.decorateReply('generateAuthToken', function(payload) {
    const token = fastify.jwt.sign(payload);
    this.setAuthCookie(token);
    return token;
  });

  // 注册 JWT 插件
  await fastify.register(jwt, {
    secret: env.security.jwtSecret,
    cookie: {
      cookieName: 'auth_token',
      signed: false,
    },
    sign: {
      expiresIn: env.security.jwtExpiresIn
    }
  });

  // 用户信息缓存 TTL（秒）- 默认 2 分钟
  const USER_CACHE_TTL = env.cache.userTtl;

  // 初始化权限服务
  const permissionService = createPermissionService(fastify);
  fastify.decorate('permissionService', permissionService);

  // ============ 封禁状态检查 ============

  /**
   * 检查用户封禁状态（支持临时封禁）
   * @param {Object} user - 用户对象
   * @returns {{ isBanned: boolean, reason?: string, until?: Date }}
   */
  async function checkUserBanStatus(user) {
    if (!user.isBanned) {
      return { isBanned: false };
    }

    // 检查封禁是否已过期
    if (user.bannedUntil) {
      const now = new Date();
      if (new Date(user.bannedUntil) <= now) {
        // 封禁已过期，自动解除
        await db
          .update(users)
          .set({
            isBanned: false,
            bannedUntil: null,
            bannedReason: null,
            bannedBy: null,
          })
          .where(eq(users.id, user.id));

        // 清除缓存
        await fastify.cache.invalidate([`user:${user.id}`]);

        return { isBanned: false };
      }
    }

    return {
      isBanned: true,
      reason: user.bannedReason,
      until: user.bannedUntil,
    };
  }

  /**
   * 生成封禁错误消息
   * @param {{ reason?: string, until?: Date }} banInfo
   * @returns {string}
   */
  function getBanMessage(banInfo) {
    let message = '你的账号已被封禁';
    if (banInfo.until) {
      message += `，解封时间: ${new Date(banInfo.until).toLocaleString('zh-CN')}`;
    }
    if (banInfo.reason) {
      message += `，原因: ${banInfo.reason}`;
    }
    return message;
  }

  // 暴露封禁检查函数供其他路由使用（如登录）
  fastify.decorate('checkUserBanStatus', checkUserBanStatus);
  fastify.decorate('getBanMessage', getBanMessage);

  // ============ 用户信息获取与缓存 ============

  // 获取用户信息（带缓存）
  async function getUserInfo(userId) {
    const cacheKey = `user:${userId}`;
    
    return await fastify.cache.remember(cacheKey, USER_CACHE_TTL, async () => {
      // 从数据库查询
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user) {
        return null;
      }
  
      delete user.passwordHash;
      return user;
    });
  }
  
  // 清除用户缓存（当用户信息更新时调用）
  fastify.decorate('clearUserCache', async function(userId) {
    await fastify.cache.invalidate([`user:${userId}`, `user:full:${userId}`]);
    // 同时清除权限缓存
    await permissionService.clearUserPermissionCache(userId);
    fastify.log.info(`已清除用户 ${userId} 的缓存`);
  });

  /**
   * 公共用户解析：JWT 验证 → 获取用户 → 删除/封禁检查 → RBAC 权限增强
   * 所有需要认证的 preHandler 共用此逻辑
   *
   * @param {Object} request - Fastify request 对象
   * @param {Object} reply - Fastify reply 对象
   * @param {Object} options - 配置选项
   * @param {boolean} options.checkBan - 是否检查封禁状态，默认 false
   * @returns {Promise<Object|null>} 用户对象，验证失败时返回 null（已发送错误响应）
   */
  async function resolveUser(request, reply, { checkBan = false } = {}) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: '未授权', message: '令牌无效或已过期' });
      return null;
    }

    const user = await getUserInfo(request.user.id);

    if (!user) {
      reply.code(401).send({ error: '未授权', message: '用户不存在' });
      return null;
    }

    if (user.isDeleted) {
      reply.code(403).send({ error: '访问被拒绝', message: '该账号已被删除' });
      return null;
    }

    if (checkBan) {
      const banStatus = await checkUserBanStatus(user);
      if (banStatus.isBanned) {
        reply.code(403).send({ error: '访问被拒绝', message: getBanMessage(banStatus) });
        return null;
      }
    }

    request.user = await permissionService.enhanceUserWithPermissions(user);
    return request.user;
  }

  // ============ 认证装饰器 ============

  /**
   * 基础认证：验证 JWT 并注入用户信息到 request.user
   * 注意：不检查封禁状态，被封禁用户仍可通过认证（可查看内容）
   * 写操作需配合 checkBanned 使用：preHandler: [fastify.authenticate, fastify.checkBanned]
   */
  fastify.decorate('authenticate', async function(request, reply) {
    await resolveUser(request, reply);
  });

  /**
   * 封禁检查：需在 authenticate 之后使用
   * 用于写操作（发帖、回复等），阻止被封禁用户执行
   * 支持临时封禁自动解除
   */
  fastify.decorate('checkBanned', async function(request, reply) {
    if (!request.user || !request.user.id) {
      return reply.code(401).send({ error: '未授权', message: '请先登录' });
    }

    const banStatus = await checkUserBanStatus(request.user);
    if (banStatus.isBanned) {
      return reply.code(403).send({
        error: '访问被拒绝',
        message: getBanMessage(banStatus),
      });
    }
  });

  /**
   * 管理员认证：验证 JWT + 检查封禁 + 检查管理员权限
   */
  fastify.decorate('requireAdmin', async function(request, reply) {
    const user = await resolveUser(request, reply, { checkBan: true });
    if (!user) return;

    if (!request.user?.isAdmin) {
      return reply.code(403).send({ error: '禁止访问', message: '需要管理员权限' });
    }
  });

  /**
   * 可选认证：不要求登录，但如已登录则注入用户信息
   * 用于公开页面需要根据登录状态显示不同内容的场景
   */
  fastify.decorate('optionalAuth', async function(request) {
    try {
      await request.jwtVerify();
      const user = await getUserInfo(request.user.id);

      if (user) {
        request.user = await permissionService.enhanceUserWithPermissions(user);
      } else {
        request.user = null;
      }
    } catch (err) {
      request.user = null;
    }
  });

  // ============ RBAC 权限检查装饰器 ============

  /**
   * 权限检查核心逻辑（内部函数）
   * 检查用户是否具有指定权限，返回检查结果
   *
   * @param {number|null} userId - 用户ID，null 表示 guest
   * @param {string|string[]} permissionSlug - 权限标识或权限标识数组
   * @param {Object} context - 权限检查上下文
   * @param {boolean} any - 满足任一权限即可
   * @returns {Promise<{granted: boolean, reason?: string, code?: string}>} 检查结果
   */
  async function checkPermissionCore(userId, permissionSlug, context = {}, any = false) {
    const slugs = Array.isArray(permissionSlug) ? permissionSlug : [permissionSlug];
    let lastDenyResult = null;

    if (any) {
      for (const slug of slugs) {
        const result = await permissionService.checkPermissionWithReason(userId, slug, context);
        if (result.granted) {
          return result;
        }
        lastDenyResult = result;
      }
    } else {
      for (const slug of slugs) {
        const result = await permissionService.checkPermissionWithReason(userId, slug, context);
        if (!result.granted) {
          lastDenyResult = result;
          break;
        }
      }
      if (!lastDenyResult) {
        return { granted: true };
      }
    }

    return lastDenyResult;
  }

  /**
   * 准备权限检查上下文（内部函数）
   * 提取 userId 并自动注入 userCreatedAt
   *
   * @param {Object} request - Fastify request 对象
   * @param {Object} context - 原始上下文
   * @returns {{ userId: number|null, context: Object }}
   */
  function preparePermissionCheck(request, context) {
    const userId = request.user?.id ?? null;

    if (request.user && context.userCreatedAt === undefined) {
      context.userCreatedAt = request.user.createdAt;
    }

    return { userId, context };
  }

  /**
   * 权限检查（用于 handler 内部）
   * 无权限时抛出 403 错误
   *
   * @param {Object} request - Fastify request 对象
   * @param {string|string[]} permissionSlug - 权限标识或权限数组
   * @param {Object} context - 权限检查上下文，根据权限条件传递对应字段
   * @param {number} [context.ownerId] - 资源所有者ID，用于 `own: true` 条件
   * @param {number} [context.categoryId] - 分类ID，用于 `categories: [1,2,3]` 条件
   * @param {Date|string} [context.userCreatedAt] - 用户注册时间，用于 `accountAge` 条件（自动注入）
   * @param {number} [context.fileSize] - 文件大小（字节），用于 `maxFileSize` 条件
   * @param {string} [context.fileType] - 文件类型/扩展名，用于 `allowedFileTypes` 条件
   * @param {string} [context.uploadType] - 上传目录类型，用于 `uploadTypes` 条件
   * @param {Object} options - 配置选项
   * @param {boolean} options.any - 满足任一权限即可
   * @throws {Error} 无权限时抛出 403 错误
   *
   * @example
   * await fastify.checkPermission(request, 'topic.update', { ownerId: topic.userId });
   */
  fastify.decorate('checkPermission', async function(request, permissionSlug, context = {}, options = {}) {
    const prepared = preparePermissionCheck(request, context);
    const result = await checkPermissionCore(prepared.userId, permissionSlug, prepared.context, options.any);

    if (!result.granted) {
      const error = new Error(result.reason || '没有执行此操作的权限');
      error.statusCode = 403;
      error.code = result.code;
      throw error;
    }
  });

  /**
   * 权限检查（不抛异常版本）
   * 返回布尔值，适用于需要返回 404 或条件判断的场景
   *
   * @param {Object} request - Fastify request 对象
   * @param {string} permissionSlug - 权限标识
   * @param {Object} context - 权限检查上下文
   * @returns {Promise<boolean>} 是否有权限
   *
   * @example
   * const canEdit = await fastify.hasPermission(request, 'topic.update', { ownerId: topic.userId });
   */
  fastify.decorate('hasPermission', async function(request, permissionSlug, context = {}) {
    const prepared = preparePermissionCheck(request, context);
    return permissionService.hasPermission(prepared.userId, permissionSlug, prepared.context);
  });

  /**
   * 获取用户允许访问的分类 ID 列表
   * 用于列表过滤场景
   *
   * @param {Object} request - Fastify request 对象
   * @param {string} permissionSlug - 权限标识，默认 'topic.read'
   * @returns {Promise<number[]|null>} 分类 ID 数组，null 表示无限制
   *
   * @example
   * const allowedIds = await fastify.getAllowedCategoryIds(request);
   * if (allowedIds !== null) {
   *   if (allowedIds.length === 0) return { items: [] };
   *   conditions.push(inArray(topics.categoryId, allowedIds));
   * }
   */
  fastify.decorate('getAllowedCategoryIds', async function(request, permissionSlug = 'topic.read') {
    const userId = request.user?.id ?? null;
    return permissionService.getAllowedCategoryIds(userId, permissionSlug);
  });

  // ============ 密码工具 ============

  fastify.decorate('hashPassword', async function(password) {
    return await bcrypt.hash(password, 10);
  });

  fastify.decorate('verifyPassword', async function(password, hash) {
    return await bcrypt.compare(password, hash);
  });
}

export default fp(authPlugin);
