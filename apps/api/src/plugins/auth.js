import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import ms from 'ms';
import env from '../config/env.js';
import { ROLE_ADMIN, ROLE_MODERATOR } from '../constants/roles.js';
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

    // 添加 getter 属性，避免 JSON 序列化时包含这些字段（如果需要的话）
    // 或者直接添加属性，方便查看
    // 这里直接添加属性，因为 request.user 通常只在内部使用
    user.isAdmin = user.role === ROLE_ADMIN;
    user.isModerator = [ROLE_ADMIN, ROLE_MODERATOR].includes(user.role);

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

  // Check if user is moderator or admin
  fastify.decorate('requireModerator', async function(request, reply) {
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

      if (![ROLE_MODERATOR, ROLE_ADMIN].includes(user.role)) {
        return reply.code(403).send({ error: '禁止访问', message: '需要版主或管理员权限' });
      }

      // 更新 request.user 为最新的用户信息
      request.user = enhanceUser(user);
    } catch (err) {
      reply.code(401).send({ error: '未授权', message: '令牌无效或已过期' });
    }
  });

  // ============ RBAC 权限检查装饰器 ============

  /**
   * 检查用户是否有指定权限
   * @param {string|string[]} permissionSlug - 权限标识或权限标识数组
   * @param {Object} options - 选项 { any: true } 表示满足任一权限即可
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

        // 检查封禁状态（支持临时封禁）
        const banStatus = await checkUserBanStatus(user);
        if (banStatus.isBanned) {
          return reply.code(403).send({ error: '访问被拒绝', message: getBanMessage(banStatus) });
        }

        // 检查权限
        const slugs = Array.isArray(permissionSlug) ? permissionSlug : [permissionSlug];
        let hasPermission = false;

        if (options.any) {
          hasPermission = await permissionService.hasAnyPermission(user.id, slugs);
        } else {
          hasPermission = await permissionService.hasAllPermissions(user.id, slugs);
        }

        if (!hasPermission) {
          return reply.code(403).send({
            error: '禁止访问',
            message: `需要权限: ${slugs.join(', ')}`
          });
        }

        request.user = enhanceUser(user);
      } catch (err) {
        reply.code(401).send({ error: '未授权', message: '令牌无效或已过期' });
      }
    };
  });

  /**
   * 检查用户在指定分类的权限
   * @param {string} action - 操作类型: 'view', 'create', 'reply', 'moderate'
   */
  fastify.decorate('requireCategoryPermission', function(action) {
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

        // 检查封禁状态（支持临时封禁）
        const banStatus = await checkUserBanStatus(user);
        if (banStatus.isBanned) {
          return reply.code(403).send({ error: '访问被拒绝', message: getBanMessage(banStatus) });
        }

        // 从请求中获取分类 ID
        const categoryId = request.params.categoryId || request.body?.categoryId;
        if (!categoryId) {
          return reply.code(400).send({ error: '参数错误', message: '未指定分类' });
        }

        // 检查分类权限
        const catPerms = await permissionService.getCategoryPermissions(user.id, categoryId);
        const actionMap = {
          view: 'canView',
          create: 'canCreate',
          reply: 'canReply',
          moderate: 'canModerate',
        };

        const permKey = actionMap[action];
        if (!permKey || !catPerms[permKey]) {
          return reply.code(403).send({
            error: '禁止访问',
            message: `没有该分类的${action}权限`
          });
        }

        request.user = enhanceUser(user);
        request.categoryPermissions = catPerms;
      } catch (err) {
        reply.code(401).send({ error: '未授权', message: '令牌无效或已过期' });
      }
    };
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
