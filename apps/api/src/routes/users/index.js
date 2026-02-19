import db from '../../db/index.js';
import { users, accounts, topics, posts, follows, bookmarks, categories, userRoles, roles, moderationLogs } from '../../db/schema.js';
import { eq, sql, desc, and, ne, like, inArray, count } from 'drizzle-orm';
import { userEnricher } from '../../services/userEnricher.js';
import { validateUsername } from '../../utils/validateUsername.js';
import { normalizeEmail, normalizeUsername } from '../../utils/normalization.js';
import { VerificationCodeType } from '../../plugins/message/config/verificationCode.js';
import { verifyCode, deleteVerificationCode } from '../../plugins/message/utils/verificationCode.js';

export default async function userRoutes(fastify, options) {
  const { permission } = fastify;
  // 创建用户（仅管理员）
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
          role: { type: 'string', enum: ['user', 'admin'], default: 'user' },
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
            oauthProviders: { 
              type: 'array',
              items: { type: 'string' }
            },
            createdAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    let { username, email, password, name, role = 'user', isEmailVerified = false } = request.body;

    // 规范化并验证用户名格式
    // 规范化邮箱
    email = normalizeEmail(email);

    const normalizedUsername = normalizeUsername(username);
    const usernameValidation = validateUsername(normalizedUsername);

    if (!usernameValidation.valid) {
      return reply.code(400).send({ error: usernameValidation.error });
    }

    // 检查用户是否存在
    const [existingEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail) {
      return reply.code(400).send({ error: '邮箱已被注册' });
    }

    const [existingUsername] = await db.select().from(users).where(eq(users.username, normalizedUsername)).limit(1);
    if (existingUsername) {
      return reply.code(400).send({ error: '用户名已被占用' });
    }

    // 密码哈希处理
    const passwordHash = await fastify.hashPassword(password);

    // 创建用户
    const [newUser] = await db.insert(users).values({
      username: normalizedUsername,
      email,
      passwordHash,
      name: name || normalizedUsername,
      role,
      isEmailVerified
    }).returning();

    // 分配 RBAC 角色（与 users.role 字段保持一致）
    if (role === 'admin') {
      const adminRole = await permission.getRoleBySlug('admin');
      if (adminRole) {
        await permission.assignRoleToUser(newUser.id, adminRole.id, { assignedBy: request.user.id });
      }
    } else {
      await permission.assignDefaultRoleToUser(newUser.id, { assignedBy: request.user.id });
    }

    // 移除敏感数据
    delete newUser.passwordHash;

    return newUser;
  });

  // 获取用户列表（需要 dashboard.users 权限）
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['users'],
      description: '获取用户列表（需要用户管理权限）',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
          search: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
          isBanned: { type: 'boolean' },
          includeDeleted: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request, reply) => {
    // 检查用户管理权限
    await fastify.permission.check(request, 'dashboard.users');

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
      isEmailVerified: users.isEmailVerified,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt
    }).from(users);

    // 应用筛选条件
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

    // 获取总数量
    let countQuery = db.select({ count: count() }).from(users);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [{ count: total }] = await countQuery;

    // 获取创始人（第一个管理员）ID
    const [firstAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(users.id)
      .limit(1);
    
    const founderId = firstAdmin?.id;
    const currentUserId = request.user.id;
    const isCurrentUserFounder = currentUserId === founderId;

    // 批量获取 OAuth 账号信息
    let accountsMap = {};
    let userRolesMap = {};
    if (usersList.length > 0) {
      const userIds = usersList.map(u => u.id);
      const allAccounts = await db
        .select({
          userId: accounts.userId,
          provider: accounts.provider
        })
        .from(accounts)
        .where(inArray(accounts.userId, userIds));

      allAccounts.forEach(acc => {
        if (!accountsMap[acc.userId]) {
          accountsMap[acc.userId] = [];
        }
        accountsMap[acc.userId].push(acc.provider);
      });

      // 批量获取用户角色（从 user_roles 表）
      const allUserRoles = await db
        .select({
          userId: userRoles.userId,
          roleId: userRoles.roleId,
          roleSlug: roles.slug,
          roleName: roles.name,
          roleColor: roles.color,
          roleIcon: roles.icon,
          rolePriority: roles.priority,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(inArray(userRoles.userId, userIds));

      allUserRoles.forEach(ur => {
        if (!userRolesMap[ur.userId]) {
          userRolesMap[ur.userId] = [];
        }
        userRolesMap[ur.userId].push({
          id: ur.roleId,
          slug: ur.roleSlug,
          name: ur.roleName,
          color: ur.roleColor,
          icon: ur.roleIcon,
          priority: ur.rolePriority,
        });
      });

      // 按优先级排序每个用户的角色
      Object.keys(userRolesMap).forEach(userId => {
        userRolesMap[userId].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      });
    }

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
        canManage,
        oauthProviders: accountsMap[user.id] || [],
        userRoles: userRolesMap[user.id] || [],
      };
    });

    return {
      items: enrichedItems,
      page,
      limit,
      total,
    };
  });

  // 根据用户名获取用户资料
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
            isFollowing: { type: 'boolean' },
            avatarFrame: {
              type: ['object', 'null'],
              properties: {
                id: { type: 'number' },
                itemType: { type: 'string' },
                itemName: { type: 'string' },
                itemMetadata: { type: ['string', 'null'] },
                imageUrl: { type: ['string', 'null'] }
              }
            },
            displayRole: {
              type: ['object', 'null'],
              properties: {
                slug: { type: 'string' },
                name: { type: 'string' },
                color: { type: ['string', 'null'] },
                icon: { type: ['string', 'null'] }
              }
            },
            badges: {
              type: 'array',
              // 勋章条目结构与返回字段保持一致
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { username } = request.params;

    // 检查 user.read 权限（guest 角色已被授予此权限，所以默认允许访问）
    // 如果没有权限，静默返回 404（避免信息泄露）
    const canRead = await permission.can(request, 'user.read');
    if (!canRead) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 检查访问者权限
    const isAdmin = request.user?.isAdmin;
    const isOwner = request.user?.id === user.id;

    // 如果用户已被删除且访问者不是管理员，返回 404
    if (user.isDeleted && !isAdmin) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 检查用户隐私设置 contentVisibility
    // 统一返回 404 避免信息泄露（不区分"不公开"和"需要登录"）
    // everyone: 所有人可见
    // authenticated: 仅登录用户可见
    // private: 仅自己和管理员可见
    const visibility = user.contentVisibility || 'everyone';
    if (visibility === 'private' && !isOwner && !isAdmin) {
      return reply.code(404).send({ error: '用户不存在' });
    }
    if (visibility === 'authenticated' && !request.user && !isAdmin) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 如果用户被封禁且访问者不是管理员，隐藏头像
    if (user.isBanned && !isAdmin) {
      user.avatar = null;
    }

    // 获取统计信息
    const [{count: topicCount}] = await db.select({ count: count() }).from(topics).where(and(eq(topics.userId, user.id), ne(topics.isDeleted, true)));
    const [{count: postCount}] = await db.select({ count: count() }).from(posts).where(and(eq(posts.userId, user.id), ne(posts.postNumber, 1)));
    const [{count: followerCount}] = await db.select({ count: count() }).from(follows).where(eq(follows.followingId, user.id));
    const [{count: followingCount}] = await db.select({ count: count() }).from(follows).where(eq(follows.followerId, user.id));

    // 检查当前用户是否关注
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

    const userView = {
      ...user,
      topicCount,
      postCount,
      followerCount,
      followingCount,
      isFollowing,
    };

    // 补充用户对象信息（勋章、头像框等）
    await userEnricher.enrich(userView);

    return userView;
  });

  // 更新当前用户资料
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

    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, request.user.id)).returning();

    // 清除用户缓存
    await fastify.clearUserCache(request.user.id);

    delete updatedUser.passwordHash;

    return updatedUser;
  });

  // 修改密码
  fastify.post('/me/change-password', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['users'],
      description: '修改密码',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 6 }
        }
      },
    }
  }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body;

    const [user] = await db.select().from(users).where(eq(users.id, request.user.id)).limit(1);

    // 如果用户已有密码，则必须验证当前密码
    if (user.passwordHash) {
      if (!currentPassword) {
        return reply.code(400).send({ error: '请提供当前密码' });
      }
      const isValidPassword = await fastify.verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return reply.code(400).send({ error: '当前密码不正确' });
      }
    }

    const passwordHash = await fastify.hashPassword(newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

    return { message: 'Password changed successfully' };
  });

  // 修改用户名
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
    const allowUsernameChange = await fastify.settings.get('allow_username_change', false);
    if (!allowUsernameChange) {
      return reply.code(403).send({ error: '系统暂不允许修改用户名' });
    }

    // 获取当前用户信息
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // 检查是否需要密码验证
    const requiresPassword = await fastify.settings.get('username_change_requires_password', true);
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
    const changeLimit = await fastify.settings.get('username_change_limit', 3);
    if (changeLimit > 0 && user.usernameChangeCount >= changeLimit) {
      return reply.code(400).send({
        error: `已达到用户名修改次数上限（${changeLimit}次）`
      });
    }

    // 检查冷却期
    const cooldownDays = await fastify.settings.get('username_change_cooldown_days', 30);
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

  // 修改邮箱 - 统一的邮箱修改入口
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
    const allowEmailChange = await fastify.settings.get('allow_email_change', true);
    if (!allowEmailChange) {
      return reply.code(403).send({ error: '系统暂不允许修改邮箱' });
    }

    // 获取当前用户信息
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 检查是否需要密码验证
    const requiresPassword = await fastify.settings.get('email_change_requires_password', true);
    if (requiresPassword) {
      if (!password) {
        return reply.code(400).send({ error: '请提供当前密码' });
      }
      const isValidPassword = await fastify.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return reply.code(400).send({ error: '当前密码不正确' });
      }
    }

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

      const newEmailLower = normalizeEmail(newEmail);

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

  // 关注用户
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

    // 检查是否已关注
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

  // 取消关注用户
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

  // 获取用户的关注者
  fastify.get('/:username/followers', {
    preHandler: [fastify.optionalAuth],
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
    const isAdmin = request.user?.isAdmin;
    
    // 如果用户被封禁且访问者不是管理员/版主，隐藏头像
    followers.forEach(follower => {
      if (follower.isBanned && !isAdmin) {
        follower.avatar = null;
      }
      delete follower.isBanned;
    });

    // 获取总数量
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, user.id));

    return {
      items: followers,
      page,
      limit,
      total,
    };
  });

  // 获取用户关注列表
  fastify.get('/:username/following', {
    preHandler: [fastify.optionalAuth],
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
    const isAdmin = request.user?.isAdmin;
    
    // 如果用户被封禁且访问者不是管理员/版主，隐藏头像
    following.forEach(followedUser => {
      if (followedUser.isBanned && !isAdmin) {
        followedUser.avatar = null;
      }
      delete followedUser.isBanned;
    });

    // 获取总数量
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, user.id));

    return {
      items: following,
      page,
      limit,
      total,
    };
  });

  // 获取用户收藏
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
          limit: { type: 'number', default: 20, maximum: 100 },
          search: { type: 'string' },
          sort: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { username } = request.params;
    const { page = 1, limit = 20, search, sort } = request.query;
    const offset = (page - 1) * limit;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 隐私检查：只有本人或管理员/版主可以查看收藏列表
    const currentUser = request.user;
    const isOwner = currentUser && currentUser.id === user.id;
    const isAdmin =
      currentUser?.isAdmin;

    if (!isOwner && !isAdmin) {
      return reply.code(403).send({ error: '无权查看该用户的收藏列表' });
    }
    
    const conditions = [
      eq(bookmarks.userId, user.id),
      eq(topics.isDeleted, false)
    ];

    if (search && search.trim()) {
      conditions.push(like(topics.title, `%${search.trim()}%`));
    }

    let orderBy = desc(bookmarks.createdAt);
    if (sort === 'latest_topic') {
      orderBy = desc(topics.createdAt);
    } else if (sort === 'popular') {
       // 受欢迎排序：综合浏览量和回复数
       orderBy = desc(sql`(${topics.viewCount} * 0.3 + ${topics.postCount} * 5)`);
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
        bookmarkedAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .innerJoin(topics, eq(bookmarks.topicId, topics.id))
      .innerJoin(categories, eq(topics.categoryId, categories.id))
      .innerJoin(users, eq(topics.userId, users.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // 检查用户权限（isAdmin 已在上文定义）
    
    // 如果话题作者被封禁且访问者不是管理员/版主，隐藏头像
    bookmarkedTopics.forEach(topic => {
      if (topic.userIsBanned && !isAdmin) {
        topic.userAvatar = null;
      }
      delete topic.userIsBanned;
    });

    // 获取总数量
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(bookmarks)
      .innerJoin(topics, eq(bookmarks.topicId, topics.id))
      .where(and(...conditions));

    return {
      items: bookmarkedTopics,
      page,
      limit,
      total,
    };
  });

  // 管理员更新用户
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
          role: { type: 'string', enum: ['user', 'admin'] },
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

    // 检查用户是否存在
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 禁止修改第一个管理员（创始人）
    const [firstAdmin] = await db.select().from(users).where(eq(users.role, 'admin')).orderBy(users.id).limit(1);
    if (targetUser.id === firstAdmin.id) {
      return reply.code(403).send({ error: '不能修改创始人账号' });
    }

    const updates = {};

    // 如果修改用户名，需要验证格式和唯一性
    if (username !== undefined && username !== targetUser.username) {
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
      const normalizedEmail = normalizeEmail(email);
      
      const [existingEmail] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (existingEmail && existingEmail.id !== userId) {
        return reply.code(400).send({ error: '邮箱已被注册' });
      }

      updates.email = normalizedEmail;
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

  // 删除用户（仅管理员）
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

    // 检查用户是否存在
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 禁止删除第一个管理员（创始人）
    const [firstAdmin] = await db.select().from(users).where(eq(users.role, 'admin')).orderBy(users.id).limit(1);
    if (targetUser.id === firstAdmin.id) {
      return reply.code(403).send({ error: '不能删除创始人账号' });
    }

    if (permanent) {
      // 硬删除 - 级联会处理关联记录
      // 手动解除一些没有设置 cascade 的关联
      await db.update(topics).set({ lastPostUserId: null }).where(eq(topics.lastPostUserId, userId));

      await db.delete(users).where(eq(users.id, userId));
      return { message: '用户已彻底删除' };
    } else {
      // 软删除
      await db.update(users).set({
        isDeleted: true,
        deletedAt: new Date(),
      }).where(eq(users.id, userId));
      return { message: '用户已删除' };
    }
  });

  // 更新用户角色（仅管理员）
  fastify.put('/:userId/roles', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['users'],
      description: '更新用户角色（仅管理员）',
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
        required: ['roleIds'],
        properties: {
          roleIds: {
            type: 'array',
            items: { type: 'number' },
            minItems: 0,
            description: '要分配给用户的角色ID列表'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  slug: { type: 'string' },
                  name: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { userId } = request.params;
    const { roleIds } = request.body;

    // 检查用户是否存在
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) {
      return reply.code(404).send({ error: '用户不存在' });
    }

    // 禁止修改第一个管理员（创始人）
    const [firstAdmin] = await db.select().from(users).where(eq(users.role, 'admin')).orderBy(users.id).limit(1);
    if (targetUser.id === firstAdmin.id) {
      return reply.code(403).send({ error: '不能修改创始人的角色' });
    }

    // 校验所有 roleId 是否存在
    if (roleIds.length > 0) {
      const existingRoles = await db.select({ id: roles.id }).from(roles).where(inArray(roles.id, roleIds));
      const existingRoleIds = new Set(existingRoles.map(r => r.id));
      const invalidRoleIds = roleIds.filter(id => !existingRoleIds.has(id));
      if (invalidRoleIds.length > 0) {
        return reply.code(400).send({ error: `以下角色ID不存在: ${invalidRoleIds.join(', ')}` });
      }
    }

    // 删除该用户已有角色
    await db.delete(userRoles).where(eq(userRoles.userId, userId));

    // 插入新的角色
    if (roleIds.length > 0) {
      const newUserRoles = roleIds.map(roleId => ({
        userId,
        roleId,
        assignedBy: request.user.id,
        assignedAt: new Date(),
      }));
      await db.insert(userRoles).values(newUserRoles);
    }

    // 获取更新后的角色
    const updatedRoles = await db
      .select({
        id: roles.id,
        slug: roles.slug,
        name: roles.name,
        color: roles.color,
        icon: roles.icon,
        priority: roles.priority,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId))
      .orderBy(desc(roles.priority));

    // 清除用户缓存
    await fastify.clearUserCache(userId);

    // 同时清除权限缓存
    await permission.clearUserPermissionCache(userId);

    return {
      message: '用户角色已更新',
      roles: updatedRoles
    };
  });
}
