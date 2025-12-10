import db from '../../db/index.js';
import { users, topics, posts, follows, bookmarks, categories } from '../../db/schema.js';
import { eq, sql, desc, and, ne } from 'drizzle-orm';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function userRoutes(fastify, options) {
  // Create user (admin only)
  fastify.post('/', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['users'],
      description: '创建用户（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string', maxLength: 255 },
          role: { type: 'string', enum: ['user', 'moderator', 'admin', 'vip'], default: 'user' },
          isEmailVerified: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            username: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { username, email, password, name, role = 'user', isEmailVerified = false } = request.body;

    // 规范化并验证用户名格式
    const { validateUsername, normalizeUsername } = await import('../../utils/validateUsername.js');
    const normalizedUsername = normalizeUsername(username);
    const usernameValidation = validateUsername(normalizedUsername);

    if (!usernameValidation.valid) {
      return reply.code(400).send({ error: usernameValidation.error });
    }

    // Check if user exists
    const [existingEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail) {
      return reply.code(400).send({ error: '邮箱已被注册' });
    }

    const [existingUsername] = await db.select().from(users).where(eq(users.username, normalizedUsername)).limit(1);
    if (existingUsername) {
      return reply.code(400).send({ error: '用户名已被占用' });
    }

    // Hash password
    const passwordHash = await fastify.hashPassword(password);

    // Create user
    const [newUser] = await db.insert(users).values({
      username: normalizedUsername,
      email,
      passwordHash,
      name: name || normalizedUsername,
      role,
      isEmailVerified
    }).returning();

    // Remove sensitive data
    delete newUser.passwordHash;

    return newUser;
  });

  // Get users list (admin only)
  fastify.get('/', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['users'],
      description: '获取用户列表（仅管理员）',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
          search: { type: 'string' },
          role: { type: 'string', enum: ['user', 'moderator', 'admin', 'vip'] },
          isBanned: { type: 'boolean' },
          includeDeleted: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request, reply) => {
    const { page = 1, limit = 20, search, role, isBanned, includeDeleted = true } = request.query;
    const offset = (page - 1) * limit;

    let query = db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      name: users.name,
      avatar: users.avatar,
      role: users.role,
      isBanned: users.isBanned,
      isDeleted: users.isDeleted,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt
    }).from(users);

    // Apply filters
    const conditions = [];
    
    // 默认不显示已删除用户，除非明确请求
    if (!includeDeleted) {
      conditions.push(eq(users.isDeleted, false));
    }
    
    if (search) {
      conditions.push(
        sql`${users.username} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`} OR ${users.name} ILIKE ${`%${search}%`}`
      );
    }
    if (role) {
      conditions.push(eq(users.role, role));
    }
    if (isBanned !== undefined) {
      conditions.push(eq(users.isBanned, isBanned));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const usersList = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);


    // Get total count
    let countQuery = db.select({ count: sql`count(*)` }).from(users);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [{ count }] = await countQuery;

    // 获取创始人（第一个管理员）ID
    const [firstAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(users.createdAt) // 按创建时间排序
      .limit(1);
    
    const founderId = firstAdmin?.id;
    const currentUserId = request.user.id;
    const isCurrentUserFounder = currentUserId === founderId;

    // 添加权限标识
    const enrichedItems = usersList.map(user => {
      const isFounder = user.id === founderId;
      
      // 计算管理权限
      let canManage = true;
      
      // 1. 任何人不能管理自己（通过列表操作），应使用个人设置
      if (user.id === currentUserId) canManage = false;
      
      // 2. 只有创始人可以管理其他管理员
      if (user.role === 'admin' && !isCurrentUserFounder) canManage = false;
      
      // 3. 任何人不能管理创始人
      if (isFounder) canManage = false;

      return {
        ...user,
        isFounder,
        canManage
      };
    });

    return {
      items: enrichedItems,
      page,
      limit,
      total: Number(count)
    };
  });

  // Get user profile by username
  fastify.get('/:username', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['users'],
      description: '根据用户名获取用户资料',
      params: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            username: { type: 'string' },
            name: { type: 'string' },
            bio: { type: 'string' },
            avatar: { type: 'string' },
            role: { type: 'string' },
            createdAt: { type: 'string' },
            messagePermission: { type: 'string' },
            contentVisibility: { type: 'string' },
            topicCount: { type: 'number' },
            postCount: { type: 'number' },
            followerCount: { type: 'number' },
            followingCount: { type: 'number' },
            isFollowing: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { username } = request.params;

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 检查用户权限
    const isModerator = request.user && ['moderator', 'admin'].includes(request.user.role);
    
    // 如果用户已被删除且访问者不是管理员/版主，返回 404
    if (user.isDeleted && !isModerator) {
      return reply.code(404).send({ error: '用户不存在' });
    }
    
    // 如果用户被封禁且访问者不是管理员/版主，隐藏头像
    if (user.isBanned && !isModerator) {
      user.avatar = null;
    }

    // Get stats
    const [topicCountResult] = await db.select({ count: sql`count(*)` }).from(topics).where(and(eq(topics.userId, user.id), ne(topics.isDeleted, true)));
    const [postCountResult] = await db.select({ count: sql`count(*)` }).from(posts).where(and(eq(posts.userId, user.id), ne(posts.postNumber, 1)));
    const [followerCountResult] = await db.select({ count: sql`count(*)` }).from(follows).where(eq(follows.followingId, user.id));
    const [followingCountResult] = await db.select({ count: sql`count(*)` }).from(follows).where(eq(follows.followerId, user.id));

    // Check if current user is following
    let isFollowing = false;
    if (request.user) {
      const [follow] = await db.select().from(follows).where(
        and(
          eq(follows.followerId, request.user.id),
          eq(follows.followingId, user.id)
        )
      ).limit(1);
      isFollowing = !!follow;
    }

    delete user.passwordHash;
    delete user.email;

    return {
      ...user,
      topicCount: Number(topicCountResult.count),
      postCount: Number(postCountResult.count),
      followerCount: Number(followerCountResult.count),
      followingCount: Number(followingCountResult.count),
      isFollowing
    };
  });

  // Update current user profile
  fastify.patch('/me', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['users'],
      description: '更新当前用户资料',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 255 },
          bio: { type: 'string' },
          avatar: { type: 'string', maxLength: 500 },
          messagePermission: { type: 'string', enum: ['everyone', 'followers', 'disabled'] },
          contentVisibility: { type: 'string', enum: ['everyone', 'authenticated', 'private'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            username: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            bio: { type: 'string' },
            avatar: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const updates = {};
    if (request.body.name !== undefined) updates.name = request.body.name;
    if (request.body.bio !== undefined) updates.bio = request.body.bio;
    if (request.body.avatar !== undefined) updates.avatar = request.body.avatar;
    if (request.body.messagePermission !== undefined) updates.messagePermission = request.body.messagePermission;
    if (request.body.contentVisibility !== undefined) updates.contentVisibility = request.body.contentVisibility;
    updates.updatedAt = new Date();

    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, request.user.id)).returning();

    // 清除用户缓存
    await fastify.clearUserCache(request.user.id);

    delete updatedUser.passwordHash;

    return updatedUser;
  });

  // Change password
  fastify.post('/me/change-password', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['users'],
      description: '修改密码',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 6 }
        }
      },
    }
  }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body;

    const [user] = await db.select().from(users).where(eq(users.id, request.user.id)).limit(1);

    const isValidPassword = await fastify.verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return reply.code(200).send({ error: '当前密码不正确' });
    }

    const passwordHash = await fastify.hashPassword(newPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

    return { message: 'Password changed successfully' };
  });

  // Change username
  fastify.post('/me/change-username', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['users'],
      description: '修改用户名',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['newUsername'],
        properties: {
          newUsername: { type: 'string', minLength: 3, maxLength: 50 },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            username: { type: 'string' },
            nextChangeAvailableAt: { type: ['string', 'null'] },
            remainingChanges: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { newUsername, password } = request.body;
    const userId = request.user.id;

    // 获取系统设置
    const { getSetting } = await import('../../utils/settings.js');

    const allowUsernameChange = await getSetting('allow_username_change', false);
    if (!allowUsernameChange) {
      return reply.code(403).send({ error: '系统暂不允许修改用户名' });
    }

    // 获取当前用户信息
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // 检查是否需要密码验证
    const requiresPassword = await getSetting('username_change_requires_password', true);
    if (requiresPassword) {
      if (!password) {
        return reply.code(400).send({ error: '请提供当前密码' });
      }
      const isValidPassword = await fastify.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return reply.code(400).send({ error: '当前密码不正确' });
      }
    }

    // 检查用户名修改次数限制
    const changeLimit = await getSetting('username_change_limit', 3);
    if (changeLimit > 0 && user.usernameChangeCount >= changeLimit) {
      return reply.code(400).send({
        error: `已达到用户名修改次数上限（${changeLimit}次）`
      });
    }

    // 检查冷却期
    const cooldownDays = await getSetting('username_change_cooldown_days', 30);
    if (user.usernameChangedAt) {
      const lastChangeDate = new Date(user.usernameChangedAt);
      const now = new Date();
      const daysSinceLastChange = Math.floor((now - lastChangeDate) / (1000 * 60 * 60 * 24));

      if (daysSinceLastChange < cooldownDays) {
        const nextAvailableDate = new Date(lastChangeDate);
        nextAvailableDate.setDate(nextAvailableDate.getDate() + cooldownDays);

        return reply.code(400).send({
          error: `用户名修改冷却期未过，下次可修改时间：${nextAvailableDate.toLocaleDateString('zh-CN')}`,
          nextChangeAvailableAt: nextAvailableDate.toISOString()
        });
      }
    }

    // 规范化并验证用户名格式
    const { validateUsername, normalizeUsername } = await import('../../utils/validateUsername.js');
    const normalizedUsername = normalizeUsername(newUsername);
    const usernameValidation = validateUsername(normalizedUsername);

    if (!usernameValidation.valid) {
      return reply.code(400).send({ error: usernameValidation.error });
    }

    // 检查用户名是否与当前用户名相同
    if (normalizedUsername === user.username) {
      return reply.code(400).send({ error: '新用户名与当前用户名相同' });
    }

    // 检查用户名是否已被占用
    const [existingUser] = await db.select().from(users).where(eq(users.username, normalizedUsername)).limit(1);
    if (existingUser) {
      return reply.code(400).send({ error: '用户名已被占用' });
    }

    // 更新用户名
    const now = new Date();
    const [updatedUser] = await db.update(users).set({
      username: normalizedUsername,
      usernameChangedAt: now,
      usernameChangeCount: user.usernameChangeCount + 1,
      updatedAt: now
    }).where(eq(users.id, userId)).returning();

    // 清除用户缓存
    await fastify.clearUserCache(userId);

    // 记录操作日志
    const { moderationLogs } = await import('../../db/schema.js');
    await db.insert(moderationLogs).values({
      action: 'username_change',
      targetType: 'user',
      targetId: userId,
      moderatorId: userId,
      previousStatus: user.username,
      newStatus: normalizedUsername,
      metadata: JSON.stringify({
        oldUsername: user.username,
        newUsername: normalizedUsername,
        changeCount: updatedUser.usernameChangeCount
      })
    });

    // 计算下次可修改时间
    let nextChangeAvailableAt = null;
    if (cooldownDays > 0) {
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + cooldownDays);
      nextChangeAvailableAt = nextDate.toISOString();
    }

    // 计算剩余修改次数
    const remainingChanges = changeLimit > 0 ? changeLimit - updatedUser.usernameChangeCount : -1;

    return {
      message: '用户名修改成功',
      username: normalizedUsername,
      nextChangeAvailableAt,
      remainingChanges
    };
  });

  // Change email - Unified endpoint for email change
  fastify.post('/me/change-email', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['users'],
      description: '修改邮箱 - 一次性验证旧邮箱和新邮箱',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['oldEmailCode', 'newEmail', 'newEmailCode'],
        properties: {
          password: { type: 'string', description: '当前密码（可选，取决于系统设置）' },
          oldEmailCode: { type: 'string', description: '旧邮箱验证码' },
          newEmail: { type: 'string', format: 'email', description: '新邮箱地址' },
          newEmailCode: { type: 'string', description: '新邮箱验证码' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            email: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { password, oldEmailCode, newEmail, newEmailCode } = request.body;
    const userId = request.user.id;

    // 获取系统设置
    const { getSetting } = await import('../../utils/settings.js');

    const allowEmailChange = await getSetting('allow_email_change', true);
    if (!allowEmailChange) {
      return reply.code(403).send({ error: '系统暂不允许修改邮箱' });
    }

    // 获取当前用户信息
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 检查是否需要密码验证
    const requiresPassword = await getSetting('email_change_requires_password', true);
    if (requiresPassword) {
      if (!password) {
        return reply.code(400).send({ error: '请提供当前密码' });
      }
      const isValidPassword = await fastify.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return reply.code(400).send({ error: '当前密码不正确' });
      }
    }

    const { VerificationCodeType } = await import('../../config/verificationCode.js');
    const { verifyCode, deleteVerificationCode } = await import('../../utils/verificationCode.js');

    try {
      // 步骤 1：验证旧邮箱验证码
      const oldEmailResult = await verifyCode(
        user.email,
        oldEmailCode,
        VerificationCodeType.EMAIL_CHANGE_OLD
      );

      if (!oldEmailResult.valid) {
        return reply.code(400).send({
          error: oldEmailResult.error || '旧邮箱验证码错误或已过期'
        });
      }

      // 步骤 2：验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return reply.code(400).send({ error: '请输入有效的邮箱地址' });
      }

      const newEmailLower = newEmail.toLowerCase();

      // 检查新邮箱是否已被其他用户使用
      const [existingUser] = await db.select().from(users).where(eq(users.email, newEmailLower)).limit(1);
      if (existingUser && existingUser.id !== userId) {
        return reply.code(400).send({ error: '该邮箱已被其他用户使用' });
      }

      // 步骤 3：验证新邮箱验证码
      const newEmailResult = await verifyCode(
        newEmailLower,
        newEmailCode,
        VerificationCodeType.EMAIL_CHANGE_NEW
      );

      if (!newEmailResult.valid) {
        return reply.code(400).send({
          error: newEmailResult.error || '新邮箱验证码错误或已过期'
        });
      }

      const oldEmail = user.email;

      // 步骤 4：更新邮箱
      await db.update(users).set({
        email: newEmailLower,
        isEmailVerified: true,
        updatedAt: new Date()
      }).where(eq(users.id, userId));

      // 删除已使用的验证码
      await deleteVerificationCode(
        user.email,
        VerificationCodeType.EMAIL_CHANGE_OLD
      );
      await deleteVerificationCode(
        newEmailLower,
        VerificationCodeType.EMAIL_CHANGE_NEW
      );

      // 清除用户缓存
      await fastify.clearUserCache(userId);

      // 记录操作日志
      const { moderationLogs } = await import('../../db/schema.js');
      await db.insert(moderationLogs).values({
        action: 'email_change',
        targetType: 'user',
        targetId: userId,
        moderatorId: userId,
        previousStatus: oldEmail,
        newStatus: newEmailLower,
        metadata: JSON.stringify({
          oldEmail,
          newEmail: newEmailLower
        })
      });

      fastify.log.info(`[邮箱修改] 完成邮箱更换: ${oldEmail} → ${newEmailLower}`);

      return {
        message: '邮箱修改成功',
        email: newEmailLower
      };
    } catch (error) {
      fastify.log.error('[邮箱修改] 验证失败:', error);
      return reply.code(500).send({ error: '验证失败，请稍后重试' });
    }
  });

  // Follow user
  fastify.post('/:username/follow', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['users'],
      description: '关注用户',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { username } = request.params;

    const [targetUser] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!targetUser) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    if (targetUser.id === request.user.id) {
      return reply.code(400).send({ error: '不能关注自己' });
    }

    // Check if already following
    const [existing] = await db.select().from(follows).where(
      and(
        eq(follows.followerId, request.user.id),
        eq(follows.followingId, targetUser.id)
      )
    ).limit(1);

    if (existing) {
      return reply.code(400).send({ error: '已关注该用户' });
    }

    await db.insert(follows).values({
      followerId: request.user.id,
      followingId: targetUser.id
    });

    return { message: 'Successfully followed user' };
  });

  // Unfollow user
  fastify.delete('/:username/follow', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['users'],
      description: '取消关注用户',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { username } = request.params;

    const [targetUser] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!targetUser) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    await db.delete(follows).where(
      and(
        eq(follows.followerId, request.user.id),
        eq(follows.followingId, targetUser.id)
      )
    );

    return { message: 'Successfully unfollowed user' };
  });

  // Get user's followers
  fastify.get('/:username/followers', {
    schema: {
      tags: ['users'],
      description: '获取用户粉丝',
      params: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 }
        }
      }
    }
  }, async (request, reply) => {
    const { username } = request.params;
    const { page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    const followers = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatar: users.avatar,
        isBanned: users.isBanned,
        followedAt: follows.createdAt
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, user.id))
      .orderBy(desc(follows.createdAt))
      .limit(limit)
      .offset(offset);

    // 检查用户权限
    const isModerator = request.user && ['moderator', 'admin'].includes(request.user.role);
    
    // 如果用户被封禁且访问者不是管理员/版主，隐藏头像
    followers.forEach(follower => {
      if (follower.isBanned && !isModerator) {
        follower.avatar = null;
      }
      delete follower.isBanned;
    });

    // Get total count
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, user.id));

    return {
      items: followers,
      page,
      limit,
      total: Number(count)
    };
  });

  // Get user's following
  fastify.get('/:username/following', {
    schema: {
      tags: ['users'],
      description: '获取用户关注列表',
      params: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 }
        }
      }
    }
  }, async (request, reply) => {
    const { username } = request.params;
    const { page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    const following = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatar: users.avatar,
        isBanned: users.isBanned,
        followedAt: follows.createdAt
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, user.id))
      .orderBy(desc(follows.createdAt))
      .limit(limit)
      .offset(offset);

    // 检查用户权限
    const isModerator = request.user && ['moderator', 'admin'].includes(request.user.role);
    
    // 如果用户被封禁且访问者不是管理员/版主，隐藏头像
    following.forEach(followedUser => {
      if (followedUser.isBanned && !isModerator) {
        followedUser.avatar = null;
      }
      delete followedUser.isBanned;
    });

    // Get total count
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(follows)
      .where(eq(follows.followerId, user.id));

    return {
      items: following,
      page,
      limit,
      total: Number(count)
    };
  });

  // Get user's bookmarks
  fastify.get('/:username/bookmarks', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['users'],
      description: '获取用户收藏的话题',
      params: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 }
        }
      }
    }
  }, async (request, reply) => {
    const { username } = request.params;
    const { page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 隐私检查：只有本人或管理员/版主可以查看收藏列表
    const currentUser = request.user;
    const isOwner = currentUser && currentUser.id === user.id;
    const isModerator = currentUser && ['moderator', 'admin'].includes(currentUser.role);

    if (!isOwner && !isModerator) {
      return reply.code(403).send({ error: '无权查看该用户的收藏列表' });
    }

    const bookmarkedTopics = await db
      .select({
        id: topics.id,
        title: topics.title,
        slug: topics.slug,
        categoryId: topics.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        userId: topics.userId,
        username: users.username,
        userAvatar: users.avatar,
        userIsBanned: users.isBanned,
        viewCount: topics.viewCount,
        // 注意：likeCount 已从 topics 表移除
        postCount: topics.postCount,
        isPinned: topics.isPinned,
        isClosed: topics.isClosed,
        lastPostAt: topics.lastPostAt,
        createdAt: topics.createdAt,
        bookmarkedAt: bookmarks.createdAt
      })
      .from(bookmarks)
      .innerJoin(topics, eq(bookmarks.topicId, topics.id))
      .innerJoin(categories, eq(topics.categoryId, categories.id))
      .innerJoin(users, eq(topics.userId, users.id))
      .where(and(eq(bookmarks.userId, user.id), eq(topics.isDeleted, false)))
      .orderBy(desc(bookmarks.createdAt))
      .limit(limit)
      .offset(offset);

    // 检查用户权限 (isModerator 已在上文定义)
    
    // 如果话题作者被封禁且访问者不是管理员/版主，隐藏头像
    bookmarkedTopics.forEach(topic => {
      if (topic.userIsBanned && !isModerator) {
        topic.userAvatar = null;
      }
      delete topic.userIsBanned;
    });

    // Get total count
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(bookmarks)
      .innerJoin(topics, eq(bookmarks.topicId, topics.id))
      .where(and(eq(bookmarks.userId, user.id), eq(topics.isDeleted, false)));

    return {
      items: bookmarkedTopics,
      page,
      limit,
      total: Number(count)
    };
  });

  // Upload avatar
  fastify.post('/me/upload-avatar', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['users'],
      description: '上传用户头像',
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            avatar: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: '未上传文件' });
    }

    // 验证文件类型
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(data.mimetype)) {
      return reply.code(400).send({ error: '文件类型无效，仅支持 JPG、PNG、GIF 和 WebP' });
    }

    // 验证文件大小 (最大 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    let fileSize = 0;

    // 如果上传目录不存在则创建
    const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads', 'avatars');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 生成唯一文件名
    const ext = path.extname(data.filename);
    const filename = `${request.user.id}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    try {
      // 保存文件
      await pipeline(data.file, fs.createWriteStream(filepath));

      // 写入后检查文件大小
      const stats = fs.statSync(filepath);
      if (stats.size > maxSize) {
        fs.unlinkSync(filepath); // 删除文件
        return reply.code(400).send({ error: '文件大小超过 5MB 限制' });
      }

      // 更新数据库中的用户头像
      const avatarUrl = `/uploads/avatars/${filename}`;
      
      // 更新前获取当前用户头像
      const [currentUser] = await db.select().from(users).where(eq(users.id, request.user.id)).limit(1);
      const oldAvatar = currentUser?.avatar;

      await db.update(users)
        .set({ avatar: avatarUrl, updatedAt: new Date() })
        .where(eq(users.id, request.user.id));

      // 如果旧头像存在且为本地文件，则将其删除
      if (oldAvatar && oldAvatar.startsWith('/uploads/avatars/')) {
        const oldFilename = path.basename(oldAvatar);
        // 确保不会删除刚刚上传的文件（虽然因为随机命名不应该发生，但为了安全起见）
        if (oldFilename !== filename) {
          const oldFilepath = path.join(uploadsDir, oldFilename);
          try {
            if (fs.existsSync(oldFilepath)) {
              fs.unlinkSync(oldFilepath);
              // fastify.log.info(`Deleted old avatar: ${oldFilename}`);
            }
          } catch (err) {
            fastify.log.error(`Failed to delete old avatar ${oldFilename}:`, err);
            // 如果删除失败，不要让请求失败
          }
        }
      }

      return { avatar: avatarUrl };
    } catch (err) {
      // 如果已创建文件则清理
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      fastify.log.error(err);
      return reply.code(500).send({ error: '文件上传失败' });
    }
  });

  // Update user by admin
  fastify.patch('/:userId', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['users'],
      description: '更新用户信息（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'number' }
        }
      },
      body: {
        type: 'object',
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          name: { type: 'string', maxLength: 255 },
          role: { type: 'string', enum: ['user', 'moderator', 'admin', 'vip'] },
          isEmailVerified: { type: 'boolean' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            username: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            isEmailVerified: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { userId } = request.params;
    const { username, email, name, role, isEmailVerified } = request.body;

    // Check if user exists
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // Prevent modifying the first admin (founder)
    const [firstAdmin] = await db.select().from(users).where(eq(users.role, 'admin')).orderBy(users.id).limit(1);
    if (targetUser.id === firstAdmin.id) {
      return reply.code(403).send({ error: '不能修改创始人账号' });
    }

    const updates = {};

    // 如果修改用户名，需要验证格式和唯一性
    if (username !== undefined && username !== targetUser.username) {
      const { validateUsername, normalizeUsername } = await import('../../utils/validateUsername.js');
      const normalizedUsername = normalizeUsername(username);
      const usernameValidation = validateUsername(normalizedUsername);

      if (!usernameValidation.valid) {
        return reply.code(400).send({ error: usernameValidation.error });
      }

      const [existingUsername] = await db.select().from(users).where(eq(users.username, normalizedUsername)).limit(1);
      if (existingUsername && existingUsername.id !== userId) {
        return reply.code(400).send({ error: '用户名已被占用' });
      }

      updates.username = normalizedUsername;
    }

    // 如果修改邮箱，需要验证唯一性
    if (email !== undefined && email !== targetUser.email) {
      const [existingEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingEmail && existingEmail.id !== userId) {
        return reply.code(400).send({ error: '邮箱已被注册' });
      }

      updates.email = email;
    }

    // 其他字段直接更新
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (isEmailVerified !== undefined) updates.isEmailVerified = isEmailVerified;

    updates.updatedAt = new Date();

    // 如果没有要更新的字段，返回当前用户信息
    if (Object.keys(updates).length === 1 && updates.updatedAt) {
      delete targetUser.passwordHash;
      return targetUser;
    }

    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();

    // 清除用户缓存
    await fastify.clearUserCache(userId);

    delete updatedUser.passwordHash;

    return updatedUser;
  });

  // Delete user (admin only)
  fastify.delete('/:userId', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['users'],
      description: '删除用户（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'number' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          permanent: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { userId } = request.params;
    const { permanent = false } = request.query;

    // Check if user exists
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // Prevent deleting the first admin (founder)
    const [firstAdmin] = await db.select().from(users).where(eq(users.role, 'admin')).orderBy(users.id).limit(1);
    if (targetUser.id === firstAdmin.id) {
      return reply.code(403).send({ error: '不能删除创始人账号' });
    }

    if (permanent) {
      // Hard delete - cascade will handle related records
      await db.delete(users).where(eq(users.id, userId));
      return { message: '用户已彻底删除' };
    } else {
      // Soft delete
      await db.update(users).set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date()
      }).where(eq(users.id, userId));
      return { message: '用户已软删除' };
    }
  });
}
