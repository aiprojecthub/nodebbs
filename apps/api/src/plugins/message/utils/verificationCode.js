/**
 * 验证码工具函数
 * 提供验证码的生成、存储、校验、限流等功能
 */

import db from '../../../db/index.js';
import { verifications, users } from '../../../db/schema.js';
import { eq, and, gt, lt } from 'drizzle-orm';
import { isPhoneNumber, isEmailAddress } from '../../../utils/normalization.js';
import {
  VerificationCodeType,
  VerificationChannel,
  UserValidation,
  getVerificationCodeConfig,
  isValidVerificationCodeType,
} from '../config/verificationCode.js';


/**
 * 校验发送验证码的请求参数和状态
 * 统一处理配置校验、权限校验、格式校验和用户状态校验
 * 
 * @param {string} identifier - 标识符（邮箱或手机号）
 * @param {string} type - 验证码类型
 * @param {object|null} currentUser - 当前登录用户对象 (request.user)
 * @returns {Promise<{
 *   isValid: boolean, 
 *   config: object, 
 *   user: object|null, 
 *   error?: string, 
 *   statusCode?: number,
 *   shouldFakeSuccess?: boolean
 * }>}
 */
export async function validateVerificationRequest(identifier, type, currentUser = null) {
  // 1. 获取并验证配置
  const config = getVerificationCodeConfig(type);
  if (!config) {
    return { isValid: false, error: '无效的验证码类型', statusCode: 400 };
  }

  // 2. 权限校验
  if (config.requireAuth && !currentUser) {
    return { isValid: false, error: '需要登录后才能执行此操作', statusCode: 401 };
  }

  // 3. 格式校验
  const isEmailChannel = config.channel === VerificationChannel.EMAIL;
  const isSmsChannel = config.channel === VerificationChannel.SMS;

  if (isEmailChannel) {
    if (!isEmailAddress(identifier)) {
      return { isValid: false, error: '请输入有效的邮箱地址', statusCode: 400 };
    }
  } else if (isSmsChannel) {
    if (!isPhoneNumber(identifier)) {
      return { isValid: false, error: '请输入有效的手机号（仅支持中国大陆手机号）', statusCode: 400 };
    }
  }

  // 4. 用户状态校验
  let user = null;
  const userValidation = config.userValidation;

  if (userValidation === UserValidation.MUST_EXIST) {
    // 场景：登录、密码重置、更换账号
    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        isEmailChannel
          ? eq(users.email, identifier)
          : eq(users.phone, identifier)
      )
      .limit(1);

    // 安全机制：防止账号枚举
    // 如果用户必须存在但实际上不存在，返回一个标记，指示调用方伪造成功响应
    if (!existingUser) {
      return { 
        isValid: false, 
        config, 
        shouldFakeSuccess: true, // 关键标记
        error: '用户不存在'      // 内部错误信息（不返回给前端）
      };
    }

    user = existingUser;

    // 权属校验（如果需要认证）
    if (config.requireAuth && user.id !== currentUser.id) {
      return { 
        isValid: false, 
        error: `该${isEmailChannel ? '邮箱' : '手机号'}不属于您`, 
        statusCode: 403 
      };
    }

  } else if (userValidation === UserValidation.MUST_NOT_EXIST) {
    // 场景：注册
    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        isEmailChannel
          ? eq(users.email, identifier)
          : eq(users.phone, identifier)
      )
      .limit(1);

    if (existingUser) {
      return { 
        isValid: false, 
        error: `该${isEmailChannel ? '邮箱' : '手机号'}已被注册`, 
        statusCode: 400 
      };
    }

  } else {
    // 场景：绑定账号、敏感操作（无强制用户存在性要求）
    // 仅当需要认证时，检查是否被其他用户占用
    if (config.requireAuth) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(
          isEmailChannel
            ? eq(users.email, identifier)
            : eq(users.phone, identifier)
        )
        .limit(1);

      if (existingUser && existingUser.id !== currentUser.id) {
        return { 
          isValid: false, 
          error: `该${isEmailChannel ? '邮箱' : '手机号'}已被其他用户使用`, 
          statusCode: 400 
        };
      }
    }
  }

  return { isValid: true, config, user };
}

/**
 * 生成指定位数的数字验证码
 * @param {number} digits - 验证码位数
 * @returns {string} 验证码
 */
export function generateCode(digits = 6) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * 检查发送频率限制
 * @param {string} identifier - 标识符（邮箱、手机号等）
 * @param {string} type - 验证码类型
 * @param {number} rateLimitSeconds - 限制秒数
 * @returns {Promise<{canSend: boolean, remainingSeconds?: number}>}
 */
export async function checkRateLimit(identifier, type, rateLimitSeconds) {
  const limitTime = new Date(Date.now() - rateLimitSeconds * 1000);

  // 查找最近发送的验证码
  const recentCodes = await db
    .select()
    .from(verifications)
    .where(
      and(
        eq(verifications.identifier, identifier),
        eq(verifications.type, type),
        gt(verifications.createdAt, limitTime)
      )
    )
    .orderBy(verifications.createdAt)
    .limit(1);

  if (recentCodes.length > 0) {
    const lastSentTime = new Date(recentCodes[0].createdAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - lastSentTime) / 1000);
    const remaining = rateLimitSeconds - elapsed;

    if (remaining > 0) {
      return { canSend: false, remainingSeconds: remaining };
    }
  }

  return { canSend: true };
}

/**
 * 创建验证码记录
 * @param {string} identifier - 标识符（邮箱、手机号等）
 * @param {string} type - 验证码类型
 * @param {number} userId - 用户ID（可选）
 * @returns {Promise<{code: string, expiresAt: Date}>}
 */
export async function createVerificationCode(identifier, type, userId = null) {
  // 验证类型是否有效
  if (!isValidVerificationCodeType(type)) {
    throw new Error(`无效的验证码类型: ${type}`);
  }

  const config = getVerificationCodeConfig(type);
  if (!config) {
    throw new Error(`未找到验证码配置: ${type}`);
  }

  // 检查频率限制
  const rateLimitCheck = await checkRateLimit(
    identifier,
    type,
    config.rateLimitSeconds
  );

  if (!rateLimitCheck.canSend) {
    throw new Error(
      `发送过于频繁，请在 ${rateLimitCheck.remainingSeconds} 秒后重试`
    );
  }

  // 生成验证码
  const code = generateCode(config.digits);

  // 计算过期时间
  const expiresAt = new Date(Date.now() + config.expiryMinutes * 60 * 1000);

  // 存储新验证码
  await db.transaction(async (tx) => {
    // 清理该标识符下同类型的旧验证码（避免累积）
    await tx
      .delete(verifications)
      .where(
        and(eq(verifications.identifier, identifier), eq(verifications.type, type))
      );

    await tx.insert(verifications).values({
      identifier,
      value: code,
      type,
      expiresAt,
      userId,
      attempts: 0,
    });
  });

  return { code, expiresAt };
}

/**
 * 验证验证码
 * @param {string} identifier - 标识符（邮箱、手机号等）
 * @param {string} code - 验证码
 * @param {string} type - 验证码类型
 * @returns {Promise<{valid: boolean, userId?: number, error?: string}>}
 */
export async function verifyCode(identifier, code, type) {
  // 验证类型是否有效
  if (!isValidVerificationCodeType(type)) {
    return { valid: false, error: '无效的验证码类型' };
  }

  const config = getVerificationCodeConfig(type);
  if (!config) {
    return { valid: false, error: '未找到验证码配置' };
  }

  const now = new Date();

  // 查找验证码记录
  const records = await db
    .select()
    .from(verifications)
    .where(
      and(
        eq(verifications.identifier, identifier),
        eq(verifications.type, type),
        gt(verifications.expiresAt, now) // 未过期
      )
    )
    .limit(1);

  if (records.length === 0) {
    return { valid: false, error: '验证码不存在或已过期' };
  }

  const record = records[0];
  const MAX_ATTEMPTS = 5; // 最大尝试次数

  // 检查是否超过最大尝试次数
  if (record.attempts >= MAX_ATTEMPTS) {
    // 删除过多的尝试记录
    await db
      .delete(verifications)
      .where(eq(verifications.id, record.id));
    return { valid: false, error: '验证次数过多，验证码已失效' };
  }

  // 验证码匹配
  if (record.value !== code) {
    // 增加失败次数
    await db
      .update(verifications)
      .set({ attempts: record.attempts + 1 })
      .where(eq(verifications.id, record.id));
      
    const remainingAttempts = MAX_ATTEMPTS - (record.attempts + 1);
    
    // 如果是最后一次尝试失败，直接删除
    if (remainingAttempts <= 0) {
       await db
        .delete(verifications)
        .where(eq(verifications.id, record.id));
       return { valid: false, error: '验证次数过多，验证码已失效' };
    }

    return { valid: false, error: `验证码错误，剩余 ${remainingAttempts} 次机会` };
  }

  // 验证成功，返回用户ID（如果有）
  return { valid: true, userId: record.userId };
}

/**
 * 删除验证码（验证成功后调用）
 * @param {string} identifier - 标识符
 * @param {string} type - 验证码类型
 * @returns {Promise<void>}
 */
export async function deleteVerificationCode(identifier, type) {
  await db
    .delete(verifications)
    .where(
      and(eq(verifications.identifier, identifier), eq(verifications.type, type))
    );
}

/**
 * 清理过期的验证码（定时任务调用）
 * @returns {Promise<number>} 删除的记录数
 */
export async function cleanupExpiredCodes() {
  const now = new Date();

  const deleted = await db
    .delete(verifications)
    .where(lt(verifications.expiresAt, now))
    .returning();

  return deleted.length;
}
