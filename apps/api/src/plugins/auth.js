import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import ms from 'ms';
import env from '../config/env.js';
import { ROLE_ADMIN } from '../constants/roles.js';
import { createPermissionService, getPermissionService } from '../services/permissionService.js';

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
  
  // 增强用户对象，添加权限辅助属性
  function enhanceUser(user) {
    if (!user) return null;

    user.isAdmin = user.role === ROLE_ADMIN;

    return user;
  }

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

  // Decorate fastify with auth utilities
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      await request.jwtVerify();
      
      // 从缓存或数据库获取最新的用户信息
      const user = await getUserInfo(request.user.id);
      
      if (!user) {
        return reply.code(401).send({ error: '未授权', message: '用户不存在' });
      }
      
      // 检查用户是否已被删除
      if (user.isDeleted) {
        return reply.code(403).send({ error: '访问被拒绝', message: '该账号已被删除' });
      }
      
      // 更新 request.user 为最新的用户信息
      request.user = enhanceUser(user);
    } catch (err) {
      reply.code(401).send({ error: '未授权', message: '令牌无效或已过期' });
    }
  });

  // Check if user is banned (use after authenticate)
  // 支持临时封禁自动解除
  fastify.decorate('checkBanned', async function(request, reply) {
    // Ensure user is authenticated first
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

  // Check if user is admin
  fastify.decorate('requireAdmin', async function(request, reply) {
    try {
      await request.jwtVerify();

      // 从缓存或数据库获取最新的用户信息
      const user = await getUserInfo(request.user.id);

      if (!user) {
        return reply.code(401).send({ error: '未授权', message: '用户不存在' });
      }

      if (user.isDeleted) {
        return reply.code(403).send({ error: '访问被拒绝', message: '该账号已被删除' });
      }

      // 检查封禁状态（支持临时封禁）
      const banStatus = await checkUserBanStatus(user);
      if (banStatus.isBanned) {
        return reply.code(403).send({ error: '访问被拒绝', message: getBanMessage(banStatus) });
      }

      if (user.role !== ROLE_ADMIN) {
        return reply.code(403).send({ error: '禁止访问', message: '需要管理员权限' });
      }

      // 更新 request.user 为最新的用户信息
      request.user = enhanceUser(user);
    } catch (err) {
      reply.code(401).send({ error: '未授权', message: '令牌无效或已过期' });
    }
  });

  // ============ RBAC 权限检查装饰器 ============

  /**
   * 前置权限检查（用于 preHandler）
   * 适用于不需要资源上下文的简单权限检查
   *
   * @param {string|string[]} permissionSlug - 权限标识或权限标识数组
   * @param {Object} options - 配置选项
   * @param {boolean} options.any - 满足任一权限即可（用于权限数组）
   *
   * @example
   * // 基础权限检查
   * preHandler: [fastify.requirePermission('topic.create')]
   *
   * @example
   * // 多权限检查（满足任一）
   * preHandler: [fastify.requirePermission(['topic.update', 'topic.delete'], { any: true })]
   */
  fastify.decorate('requirePermission', function(permissionSlug, options = {}) {
    return async function(request, reply) {
      try {
        await request.jwtVerify();

        const user = await getUserInfo(request.user.id);

        if (!user) {
          return reply.code(401).send({ error: '未授权', message: '用户不存在' });
        }

        if (user.isDeleted) {
          return reply.code(403).send({ error: '访问被拒绝', message: '该账号已被删除' });
        }

        // 检查封禁状态
        const banStatus = await checkUserBanStatus(user);
        if (banStatus.isBanned) {
          return reply.code(403).send({ error: '访问被拒绝', message: getBanMessage(banStatus) });
        }

        // 检查权限（无资源上下文）
        const slugs = Array.isArray(permissionSlug) ? permissionSlug : [permissionSlug];
        let lastDenyResult = null;

        if (options.any) {
          // 任一权限满足即可
          for (const slug of slugs) {
            const result = await permissionService.checkPermissionWithReason(user.id, slug);
            if (result.granted) {
              lastDenyResult = null;
              break;
            }
            lastDenyResult = result;
          }
        } else {
          // 所有权限都需满足
          for (const slug of slugs) {
            const result = await permissionService.checkPermissionWithReason(user.id, slug);
            if (!result.granted) {
              lastDenyResult = result;
              break;
            }
          }
        }

        if (lastDenyResult) {
          return reply.code(403).send({
            error: '禁止访问',
            message: lastDenyResult.reason,
            code: lastDenyResult.code,
          });
        }

        request.user = enhanceUser(user);
      } catch (err) {
        fastify.log.error('权限检查错误:', err);
        reply.code(401).send({ error: '未授权', message: '令牌无效或已过期' });
      }
    };
  });

  /**
   * 后置权限检查（用于 handler 内部，在获取资源后调用）
   * 适用于需要资源上下文的条件权限检查，避免重复查询
   *
   * @param {Object} request - Fastify request 对象
   * @param {string|string[]} permissionSlug - 权限标识或权限标识数组
   * @param {Object} context - 权限检查上下文
   * @param {number} context.ownerId - 资源所有者ID（用于 own 条件）
   * @param {number} context.categoryId - 分类ID（用于 categories 条件）
   * @param {Object} options - 配置选项
   * @param {boolean} options.any - 满足任一权限即可
   * @returns {Promise<boolean>} 是否有权限
   * @throws {Error} 无权限时抛出 403 错误
   *
   * @example
   * // 在 handler 中检查权限
   * async (request, reply) => {
   *   const topic = await db.select()...;
   *   if (!topic) return reply.code(404).send({ error: '话题不存在' });
   *
   *   // 检查权限（复用已查询的 topic）
   *   await fastify.checkPermission(request, 'topic.update', {
   *     ownerId: topic.userId,
   *     categoryId: topic.categoryId
   *   });
   *
   *   // 继续处理...
   * }
   */
  fastify.decorate('checkPermission', async function(request, permissionSlug, context = {}, options = {}) {
    const user = request.user;

    if (!user) {
      const error = new Error('未授权');
      error.statusCode = 401;
      throw error;
    }

    // 自动注入用户相关 context
    if (context.userCreatedAt === undefined) {
      context.userCreatedAt = user.createdAt;
    }

    const slugs = Array.isArray(permissionSlug) ? permissionSlug : [permissionSlug];
    let lastDenyResult = null;

    if (options.any) {
      // 任一权限满足即可
      for (const slug of slugs) {
        const result = await permissionService.checkPermissionWithReason(user.id, slug, context);
        if (result.granted) {
          return true;
        }
        lastDenyResult = result;
      }
    } else {
      // 所有权限都需满足
      for (const slug of slugs) {
        const result = await permissionService.checkPermissionWithReason(user.id, slug, context);
        if (!result.granted) {
          lastDenyResult = result;
          break;
        }
      }
      if (!lastDenyResult) {
        return true;
      }
    }

    const error = new Error(lastDenyResult.reason || '没有执行此操作的权限');
    error.statusCode = 403;
    error.code = lastDenyResult.code;
    throw error;
  });

  // Optional authentication (doesn't fail if no token)
  fastify.decorate('optionalAuth', async function(request) {
    try {
      await request.jwtVerify();
      
      // 从缓存或数据库获取最新的用户信息
      const user = await getUserInfo(request.user.id);
      
      if (user) {
        // 更新 request.user 为最新的用户信息
        request.user = enhanceUser(user);
      } else {
        request.user = null;
      }
    } catch (err) {
      // Ignore error, make user undefined
      request.user = null;
    }
  });

  // Hash password utility
  fastify.decorate('hashPassword', async function(password) {
    return await bcrypt.hash(password, 10);
  });

  // Verify password utility
  fastify.decorate('verifyPassword', async function(password, hash) {
    return await bcrypt.compare(password, hash);
  });
}

export default fp(authPlugin);
