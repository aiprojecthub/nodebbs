/**
 * OAuth 通用服务
 * 
 * 原：apps/api/src/routes/oauth/helpers.js
 * 迁移原因：职责分离，将业务逻辑从路由层移至服务层
 */
import db from '../db/index.js';
import { users, accounts } from '../db/schema.js';
import { eq, and, count } from 'drizzle-orm';
import crypto from 'crypto';
import { normalizeEmail } from '../utils/normalization.js';
import { getSetting } from './settingsService.js';
import { getPermissionService } from './permissionService.js';

/**
 * 生成随机 state 参数（密码学安全）
 */
export function generateRandomState() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 处理 OAuth 登录的通用逻辑
 * @param {object} fastify - Fastify 实例
 * @param {string} provider - OAuth 提供商名称
 * @param {string} providerAccountId - 提供商账号 ID
 * @param {object} profile - 标准化后的用户信息
 * @param {object} tokenData - Token 数据
 * @returns {Promise<{user: object}>} 用户信息
 */
export async function handleOAuthLogin(
  fastify,
  provider,
  providerAccountId,
  profile,
  tokenData
) {
  // 1. 查找是否已有关联账号
  let user = await findUserByOAuthAccount(provider, providerAccountId);

  if (user) {
    // 已有关联，更新 token 并登录
    await linkOAuthAccount(user.id, provider, {
      providerAccountId,
      ...tokenData,
    });

    // 如果 OAuth 提供商确认邮箱已验证，且当前用户未验证，则同步更新状态
    user = await syncEmailVerified(user, profile);
  } else {
    // 2. 如果有邮箱，查找是否已有相同邮箱的用户
    if (profile.email) {
      user = await findUserByEmail(profile.email);

      if (user) {
        // 邮箱已存在，关联到现有用户
        await linkOAuthAccount(user.id, provider, {
          providerAccountId,
          ...tokenData,
        });

        user = await syncEmailVerified(user, profile);
      }
    }

    // 3. 创建新用户（需要检查注册模式）
    if (!user) {
      // 检查注册模式
      const registrationMode = await getSetting('registration_mode', 'open');

      if (registrationMode === 'closed') {
        throw new Error('系统当前已关闭用户注册，无法通过 OAuth 创建新账号');
      }

      user = await createOAuthUser(profile, provider);
      await linkOAuthAccount(user.id, provider, {
        providerAccountId,
        ...tokenData,
      });
    }
  }

  // 检查用户是否被删除
  if (user.isDeleted) {
    throw new Error('该账号已被删除');
  }

  // 检查用户是否被封禁（支持临时封禁）
  const banStatus = await fastify.checkUserBanStatus(user);
  if (banStatus.isBanned) {
    throw new Error(fastify.getBanMessage(banStatus));
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
  };
}

/**
 * 同步 OAuth 提供商的邮箱验证状态到本地用户
 */
async function syncEmailVerified(user, profile) {
  if (profile.isEmailVerified && !user.isEmailVerified && user.email === profile.email) {
    const [updatedUser] = await db.update(users)
      .set({ isEmailVerified: true })
      .where(eq(users.id, user.id))
      .returning();
    return updatedUser;
  }
  return user;
}

/**
 * 根据 OAuth 提供商和账号 ID 查找关联的用户
 */
export async function findUserByOAuthAccount(provider, providerAccountId) {
  const [account] = await db
    .select({
      user: users,
      account: accounts,
    })
    .from(accounts)
    .innerJoin(users, eq(accounts.userId, users.id))
    .where(
      and(
        eq(accounts.provider, provider),
        eq(accounts.providerAccountId, providerAccountId)
      )
    )
    .limit(1);

  return account?.user;
}

/**
 * 根据邮箱查找用户
 */
export async function findUserByEmail(email) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  return user;
}

/**
 * 创建新用户（OAuth 注册）
 */
export async function createOAuthUser(profile, provider) {
  const { email, name, avatar } = profile;
  
  // 生成唯一用户名
  let username = profile.username || email?.split('@')[0] || `${provider}_user`;
  username = await generateUniqueUsername(username);

  // 检查是否是第一个用户
  const userCount = await db.select({ count: count() }).from(users);
  const isFirstUser = userCount[0].count === 0;

  const [newUser] = await db
    .insert(users)
    .values({
      username,
      email: email || `${provider}_${profile.id}@oauth.local`, // 如果没有邮箱，生成虚拟邮箱
      passwordHash: null, // OAuth 用户没有密码
      name: name || username,
      avatar: avatar || null,
      role: isFirstUser ? 'admin' : 'user',
      isEmailVerified: !!email, // 如果有邮箱，认为已验证
    })
    .returning();

  // 分配默认角色（用户-角色关联）
  const permissionService = getPermissionService();
  await permissionService.assignDefaultRoleToUser(newUser.id, { isFirstUser });

  return newUser;
}

/**
 * 关联 OAuth 账号到用户
 */
export async function linkOAuthAccount(userId, provider, oauthData) {
  const { providerAccountId, accessToken, refreshToken, expiresAt, tokenType, scope, idToken } = oauthData;

  // 检查是否已经关联
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.provider, provider)
      )
    )
    .limit(1);

  if (existingAccount) {
    // 更新现有关联
    const [updatedAccount] = await db
      .update(accounts)
      .set({
        providerAccountId,
        accessToken,
        refreshToken,
        expiresAt,
        tokenType,
        scope,
        idToken,
      })
      .where(eq(accounts.id, existingAccount.id))
      .returning();

    return updatedAccount;
  }

  // 创建新关联
  const [newAccount] = await db
    .insert(accounts)
    .values({
      userId,
      provider,
      providerAccountId,
      accessToken,
      refreshToken,
      expiresAt,
      tokenType,
      scope,
      idToken,
    })
    .returning();

  return newAccount;
}

/**
 * 解除 OAuth 账号关联
 */
export async function unlinkOAuthAccount(userId, provider) {
  // 检查用户是否有密码或其他登录方式
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  // 如果用户没有密码且只有一个 OAuth 账号，不允许解绑
  if (!user.passwordHash && userAccounts.length <= 1) {
    throw new Error('无法解绑最后一个登录方式，请先设置密码');
  }

  const result = await db
    .delete(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.provider, provider)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * 获取用户的所有 OAuth 账号
 */
export async function getUserAccounts(userId) {
  const userAccounts = await db
    .select({
      id: accounts.id,
      provider: accounts.provider,
      providerAccountId: accounts.providerAccountId,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId));

  return userAccounts;
}

/**
 * 生成唯一用户名
 */
async function generateUniqueUsername(baseUsername) {
  // 清理用户名，只保留字母数字和下划线
  let username = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  // 确保用户名长度在 3-50 之间
  if (username.length < 3) {
    username = username + '_user';
  }
  if (username.length > 50) {
    username = username.substring(0, 50);
  }

  // 检查用户名是否已存在
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!existingUser) {
    return username;
  }

  // 如果已存在，添加随机后缀
  let attempts = 0;
  while (attempts < 10) {
    const suffix = crypto.randomBytes(2).toString('hex');
    const newUsername = `${username}_${suffix}`;
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, newUsername))
      .limit(1);

    if (!user) {
      return newUsername;
    }
    
    attempts++;
  }

  // 最后使用时间戳
  return `${username}_${Date.now()}`;
}

