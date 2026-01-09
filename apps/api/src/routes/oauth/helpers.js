/**
 * OAuth 路由通用辅助函数
 */
import {
  findUserByOAuthAccount,
  findUserByEmail,
  createOAuthUser,
  linkOAuthAccount,
} from '../../utils/oauth-helpers.js';
import db from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * 生成随机 state 参数
 */
export function generateRandomState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
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
    if (profile.isEmailVerified && !user.isEmailVerified && user.email === profile.email) {
      const [updatedUser] = await db.update(users)
        .set({ isEmailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      user = updatedUser;
    }
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

        // 如果 OAuth 提供商确认邮箱已验证，且当前用户未验证，则更新状态
        if (profile.isEmailVerified && !user.isEmailVerified) {
          const [updatedUser] = await db.update(users)
            .set({ isEmailVerified: true, updatedAt: new Date() })
            .where(eq(users.id, user.id))
            .returning();
          user = updatedUser;
        }
      }
    }

    // 3. 创建新用户（需要检查注册模式）
    if (!user) {
      // 检查注册模式
      const { getSetting } = await import('../../utils/settings.js');
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

  // 检查用户是否被封禁
  if (user.isBanned) {
    throw new Error('账号已被封禁');
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
