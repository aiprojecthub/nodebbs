/**
 * 验证码工具函数
 * 提供验证码的生成、存储、校验、限流等功能
 */

import db from '../db/index.js';
import { verifications } from '../db/schema.js';
import { eq, and, gt, lt } from 'drizzle-orm';
import {
  getVerificationCodeConfig,
  isValidVerificationCodeType,
} from '../config/verificationCode.js';

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

  // 清理该标识符下同类型的旧验证码（避免累积）
  await db
    .delete(verifications)
    .where(
      and(eq(verifications.identifier, identifier), eq(verifications.type, type))
    );

  // 存储新验证码
  await db.insert(verifications).values({
    identifier,
    value: code,
    type,
    expiresAt,
    userId,
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

  // 验证码匹配
  if (record.value !== code) {
    // 这里可以增加失败次数统计，达到最大次数后删除验证码
    // 简化实现：直接返回错误
    return { valid: false, error: '验证码错误' };
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
