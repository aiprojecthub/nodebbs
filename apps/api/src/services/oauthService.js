/**
 * OAuth 通用服务
 * 
 * 原：apps/api/src/routes/oauth/helpers.js
 * 迁移原因：职责分离，将业务逻辑从路由层移至服务层
 */
import db from '../db/index.js';
import { users, accounts, oauthProviders } from '../db/schema.js';
import { eq, and, count } from 'drizzle-orm';
import crypto from 'crypto';
import { normalizeEmail } from '../utils/normalization.js';
import { generateAutoUsername, generateUniqueUsername } from './user/index.js';
import { getSetting } from './settingsService.js';

/**
 * 生成随机 state 参数（密码学安全）
 */
export function generateRandomState() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 关联流程 state 前缀
 *
 * 随机部分是 hex（字符集 0-9a-f），永远不会以 'l' 开头，因此前缀无歧义；
 * 且全部为字母数字，满足微信对 state 的限制（仅 a-zA-Z0-9，≤128 字节）。
 */
const LINK_STATE_PREFIX = 'lk';

/**
 * 生成「关联账号」流程的 state
 */
export function generateLinkState() {
  return LINK_STATE_PREFIX + crypto.randomBytes(16).toString('hex');
}

/**
 * 判断 state 是否属于「关联账号」流程
 */
export function isLinkState(state) {
  return typeof state === 'string' && state.startsWith(LINK_STATE_PREFIX);
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
  tokenData,
  { ip } = {}
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

      user = await createOAuthUser(profile, provider, { ip, permission: fastify.permission });
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

  // 更新最后登录 IP 和时间
  if (ip) {
    await db.update(users)
      .set({ lastLoginIp: ip })
      .where(eq(users.id, user.id));
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
  if (profile.isEmailVerified && !user.isEmailVerified && user.email && user.email === profile.email) {
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
export async function createOAuthUser(profile, provider, { ip, permission } = {}) {
  const { email, name, avatar } = profile;

  // 生成唯一用户名
  // 有身份信息时保留原始用户名，无身份信息时生成 ~{provider}_ 前缀的自动用户名
  const baseUsername = profile.username || email?.split('@')[0];
  let username;
  if (baseUsername) {
    username = await generateUniqueUsername(baseUsername);
  } else {
    username = await generateAutoUsername(provider);
  }
  // 检查是否是第一个用户
  const userCount = await db.select({ count: count() }).from(users);
  const isFirstUser = userCount[0].count === 0;

  const [newUser] = await db
    .insert(users)
    .values({
      username,
      email: email || `${provider}_${profile.id}@oauth.local`, // 如果没有邮箱，生成虚拟邮箱
      passwordHash: null, // OAuth 用户没有密码
      name: name || (username.startsWith('~') ? provider.charAt(0).toUpperCase() + provider.slice(1) : username),
      avatar: avatar || null,
      role: isFirstUser ? 'admin' : 'user',
      isEmailVerified: !!email, // 如果有邮箱，认为已验证
      registrationIp: ip || null,
      lastLoginIp: ip || null,
    })
    .returning();

  // 分配默认角色（用户-角色关联）
  await permission.assignDefaultRoleToUser(newUser.id, { isFirstUser });

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
 * OAuth 关联/解绑的业务错误
 *
 * 路由层据 code 映射 HTTP 状态码，避免把内部错误当 500 抛给用户。
 */
export class OAuthLinkError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'OAuthLinkError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * 统计用户当前可用的登录方式
 *
 * 本站实际可用于「重新登录」的凭证只有三类：
 * 1. 密码（用户名/邮箱/手机号 + 密码）
 * 2. 手机验证码（需站点开启手机登录，且手机号已验证）
 * 3. 三方账号
 *
 * 注意：邮箱本身不是登录方式（无邮箱验证码登录），且纯三方注册用户的邮箱
 * 可能是虚拟的 `xxx@oauth.local`，连找回密码都走不通，故不计入。
 *
 * @param {number} userId
 * @returns {Promise<{hasPassword: boolean, hasPhoneLogin: boolean, providers: string[]}>}
 */
export async function getLoginMethods(userId) {
  const [[user], userAccounts, phoneLoginEnabled] = await Promise.all([
    db
      .select({
        passwordHash: users.passwordHash,
        phone: users.phone,
        isPhoneVerified: users.isPhoneVerified,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(eq(accounts.userId, userId)),
    getSetting('phone_login_enabled', false),
  ]);

  if (!user) {
    throw new OAuthLinkError('USER_NOT_FOUND', '用户不存在', 404);
  }

  return {
    hasPassword: !!user.passwordHash,
    hasPhoneLogin: !!(user.phone && user.isPhoneVerified && phoneLoginEnabled),
    providers: userAccounts.map((item) => item.provider),
  };
}

/**
 * 关联 OAuth 账号到指定用户（严格模式，供「关联账号」流程使用）
 *
 * 与 linkOAuthAccount 的区别：后者是 upsert，会在用户已绑同平台时静默改掉
 * providerAccountId（把登录方式换掉却无提示），仅适用于登录流程。
 * 此处一律拒绝冲突，由调用方给出明确提示。
 *
 * @returns {Promise<{account: object, alreadyLinked: boolean}>}
 */
export async function linkOAuthAccountForUser({
  userId,
  provider,
  providerAccountId,
  tokenData = {},
}) {
  // 该三方账号是否已被占用（accounts 表有 unique(provider, providerAccountId)）
  const [occupied] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, provider),
        eq(accounts.providerAccountId, providerAccountId)
      )
    )
    .limit(1);

  if (occupied) {
    if (occupied.userId === userId) {
      // 重复关联同一个账号：幂等返回成功
      return { account: occupied, alreadyLinked: true };
    }
    throw new OAuthLinkError(
      'ACCOUNT_OCCUPIED',
      '该账号已被其他用户关联，请更换账号或先在原账号中解除关联',
      409
    );
  }

  // 同一平台只允许绑定一个账号
  const [existingSameProvider] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)))
    .limit(1);

  if (existingSameProvider) {
    throw new OAuthLinkError(
      'PROVIDER_ALREADY_LINKED',
      '已关联该平台账号，请先解绑后再关联新账号',
      409
    );
  }

  const { accessToken, refreshToken, expiresAt, tokenType, scope, idToken } =
    tokenData;

  try {
    const [account] = await db
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

    return { account, alreadyLinked: false };
  } catch (error) {
    // 并发下唯一约束兜底（23505 = unique_violation）
    if (error?.code === '23505') {
      throw new OAuthLinkError(
        'ACCOUNT_OCCUPIED',
        '该账号已被其他用户关联，请更换账号或先在原账号中解除关联',
        409
      );
    }
    throw error;
  }
}

/**
 * 解除 OAuth 账号关联
 *
 * 解绑后必须至少保留一种登录方式，否则用户会把自己锁在门外。
 */
export async function unlinkOAuthAccount(userId, provider) {
  const loginMethods = await getLoginMethods(userId);

  if (!loginMethods.providers.includes(provider)) {
    throw new OAuthLinkError('NOT_LINKED', '未关联该平台账号', 404);
  }

  const remaining =
    (loginMethods.hasPassword ? 1 : 0) +
    (loginMethods.hasPhoneLogin ? 1 : 0) +
    (loginMethods.providers.length - 1);

  if (remaining <= 0) {
    throw new OAuthLinkError(
      'LAST_LOGIN_METHOD',
      '这是你唯一的登录方式，请先设置密码或绑定手机号后再解绑',
      400
    );
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
 *
 * 左连 oauth_providers 带出展示名与启用状态：平台被管理员停用后，
 * 已关联的记录仍需在设置页展示（否则用户无从解绑）。
 */
export async function getUserAccounts(userId) {
  const userAccounts = await db
    .select({
      id: accounts.id,
      provider: accounts.provider,
      providerAccountId: accounts.providerAccountId,
      createdAt: accounts.createdAt,
      displayName: oauthProviders.displayName,
      isEnabled: oauthProviders.isEnabled,
      displayOrder: oauthProviders.displayOrder,
    })
    .from(accounts)
    .leftJoin(oauthProviders, eq(oauthProviders.provider, accounts.provider))
    .where(eq(accounts.userId, userId));

  return userAccounts;
}

