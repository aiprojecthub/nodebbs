import db from '../db/index.js';
import { users, accounts } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { normalizeEmail } from './normalization.js';

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
  const userCount = await db.select({ count: users.id }).from(users);
  const isFirstUser = userCount.length === 0;

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
        updatedAt: new Date(),
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

/**
 * 从 OAuth 提供商的用户信息中提取标准化的 profile
 */
export function normalizeOAuthProfile(provider, rawProfile) {
  switch (provider) {
    case 'github':
      return {
        id: rawProfile.id.toString(),
        email: normalizeEmail(rawProfile.email),
        name: rawProfile.name || rawProfile.login,
        username: rawProfile.login,
        avatar: rawProfile.avatar_url,
        isEmailVerified: true, // GitHub 登录且能获取到 Email 通常意味着已验证（或我们在获取时筛选了verified）
      };

    case 'google':
      return {
        id: rawProfile.sub || rawProfile.id,
        email: normalizeEmail(rawProfile.email),
        name: rawProfile.name,
        username: rawProfile.email?.split('@')[0],
        avatar: rawProfile.picture,
        isEmailVerified: rawProfile.email_verified === true // Google 字段: email_verified
      };

    case 'apple':
      return {
        id: rawProfile.sub,
        email: normalizeEmail(rawProfile.email),
        name: rawProfile.name || rawProfile.email?.split('@')[0],
        username: rawProfile.email?.split('@')[0],
        avatar: null, // Apple 不提供头像
        isEmailVerified: true, // Apple 提供的邮箱已验证
      };

    default:
      return {
        id: rawProfile.id?.toString(),
        email: normalizeEmail(rawProfile.email),
        name: rawProfile.name,
        username: rawProfile.username || rawProfile.email?.split('@')[0],
        avatar: rawProfile.avatar || rawProfile.picture,
        isEmailVerified: !!rawProfile.email_verified,
      };
  }
}
