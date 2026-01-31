import { customAlphabet } from 'nanoid';
import db from '../db/index.js';
import { invitationCodes, invitationRules, users } from '../db/schema.js';
import { eq, and, gte, sql, count, inArray } from 'drizzle-orm';
import { getPermissionService } from './permissionService.js';

/**
 * 生成唯一的邀请码
 * @param {number} length - 邀请码长度（默认12）
 * @returns {Promise<string>} 唯一的邀请码
 */
export async function generateUniqueCode(length = 12) {
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    // 生成随机字符串（大写字母和数字）
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nanoid = customAlphabet(alphabet, length);
    const code = nanoid();
    
    // 检查是否已存在
    const [existing] = await db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, code))
      .limit(1);
    
    if (!existing) {
      return code;
    }
  }
  
  throw new Error('无法生成唯一邀请码，请稍后重试');
}

/**
 * 获取用户的邀请规则
 * 通过 RBAC 系统获取用户所有角色，然后匹配邀请规则
 * 当用户有多个角色时，取最优规则（dailyLimit 最大的）
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 邀请规则
 */
export async function getUserInvitationRule(userId) {
  // 通过 RBAC 系统获取用户所有角色
  const permissionService = getPermissionService();
  const userRoles = await permissionService.getUserRoles(userId);

  if (!userRoles || userRoles.length === 0) {
    throw new Error('用户没有分配角色');
  }

  // 获取用户所有角色的 slug
  const roleSlugs = userRoles.map(r => r.slug);

  // 查询所有匹配角色的邀请规则
  const rules = await db
    .select()
    .from(invitationRules)
    .where(inArray(invitationRules.role, roleSlugs));

  if (rules.length === 0) {
    throw new Error('没有找到该用户角色的邀请规则');
  }

  // 取最优规则（dailyLimit 最大的）
  const bestRule = rules.reduce((best, current) => {
    return current.dailyLimit > best.dailyLimit ? current : best;
  }, rules[0]);

  return bestRule;
}

/**
 * 获取用户今日已生成的邀请码数量
 * @param {number} userId - 用户ID
 * @returns {Promise<number>} 今日生成数量
 */
export async function getTodayGeneratedCount(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const result = await db
    .select({ count: count() })
    .from(invitationCodes)
    .where(
      and(
        eq(invitationCodes.createdBy, userId),
        gte(invitationCodes.createdAt, today)
      )
    );
  
  return result[0]?.count || 0;
}

/**
 * 生成邀请码
 * @param {number} userId - 用户ID
 * @param {Object} options - 选项
 * @param {string} options.note - 备注
 * @param {number} options.maxUses - 最大使用次数（可选）
 * @param {number} options.expireDays - 有效期天数（可选）
 * @returns {Promise<Object>} 生成的邀请码
 */
export async function generateInvitationCode(userId, options = {}) {
  // 1. 获取用户规则
  const rule = await getUserInvitationRule(userId);
  
  // 2. 检查今日生成数量
  const todayCount = await getTodayGeneratedCount(userId);
  if (todayCount >= rule.dailyLimit) {
    throw new Error(`今日生成数量已达上限（${rule.dailyLimit}个）`);
  }
  
  // 3. 生成唯一码
  const code = await generateUniqueCode();
  
  // 4. 计算过期时间
  const expireDays = options.expireDays || rule.expireDays;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expireDays);
  
  // 5. 确定最大使用次数
  const maxUses = options.maxUses || rule.maxUsesPerCode;
  
  // 6. 插入数据库
  const [invitation] = await db
    .insert(invitationCodes)
    .values({
      code,
      createdBy: userId,
      maxUses,
      expiresAt,
      note: options.note || null,
      status: 'active',
      usedCount: 0,
    })
    .returning();
  
  return invitation;
}

/**
 * 验证邀请码
 * @param {string} code - 邀请码
 * @returns {Promise<Object>} 验证结果 { valid: boolean, message: string, invitation?: Object }
 */
export async function validateInvitationCode(code) {
  // 查找邀请码
  const [invitation] = await db
    .select()
    .from(invitationCodes)
    .where(eq(invitationCodes.code, code))
    .limit(1);
  
  if (!invitation) {
    return {
      valid: false,
      message: '邀请码不存在',
    };
  }
  
  // 检查状态
  if (invitation.status === 'disabled') {
    return {
      valid: false,
      message: '邀请码已被禁用',
    };
  }
  
  if (invitation.status === 'expired') {
    return {
      valid: false,
      message: '邀请码已过期',
    };
  }
  
  // 检查是否已达到使用上限
  if (invitation.usedCount >= invitation.maxUses) {
    return {
      valid: false,
      message: '邀请码已达到使用上限',
    };
  }
  
  // 检查是否过期
  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    // 更新状态为已过期
    await db
      .update(invitationCodes)
      .set({ status: 'expired' })
      .where(eq(invitationCodes.id, invitation.id));
    
    return {
      valid: false,
      message: '邀请码已过期',
    };
  }
  
  return {
    valid: true,
    message: '邀请码有效',
    invitation,
  };
}

/**
 * 标记邀请码为已使用
 * @param {string} code - 邀请码
 * @param {number} userId - 使用者用户ID
 * @returns {Promise<Object>} 更新后的邀请码
 */
export async function markInvitationCodeAsUsed(code, userId) {
  const [invitation] = await db
    .select()
    .from(invitationCodes)
    .where(eq(invitationCodes.code, code))
    .limit(1);
  
  if (!invitation) {
    throw new Error('邀请码不存在');
  }
  
  const newUsedCount = invitation.usedCount + 1;
  const isFullyUsed = newUsedCount >= invitation.maxUses;
  
  const [updated] = await db
    .update(invitationCodes)
    .set({
      usedCount: newUsedCount,
      status: isFullyUsed ? 'used' : 'active',
      usedBy: invitation.usedBy || userId, // 记录首次使用者
      usedAt: invitation.usedAt || new Date(), // 记录首次使用时间
    })
    .where(eq(invitationCodes.id, invitation.id))
    .returning();
  
  return updated;
}

/**
 * 禁用邀请码
 * @param {number} invitationId - 邀请码ID
 * @returns {Promise<Object>} 更新后的邀请码
 */
export async function disableInvitationCode(invitationId) {
  const [updated] = await db
    .update(invitationCodes)
    .set({ status: 'disabled' })
    .where(eq(invitationCodes.id, invitationId))
    .returning();

  if (!updated) {
    throw new Error('邀请码不存在');
  }

  return updated;
}

/**
 * 恢复已禁用的邀请码
 * @param {number} invitationId - 邀请码ID
 * @returns {Promise<Object>} 更新后的邀请码
 */
export async function enableInvitationCode(invitationId) {
  // 先查询邀请码信息
  const [invitation] = await db
    .select()
    .from(invitationCodes)
    .where(eq(invitationCodes.id, invitationId))
    .limit(1);

  if (!invitation) {
    throw new Error('邀请码不存在');
  }

  // 检查是否为禁用状态
  if (invitation.status !== 'disabled') {
    throw new Error('只能恢复已禁用的邀请码');
  }

  // 检查是否已使用
  if (invitation.usedCount >= invitation.maxUses) {
    throw new Error('邀请码已达到使用上限，无法恢复');
  }

  // 检查是否已过期
  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    throw new Error('邀请码已过期，无法恢复');
  }

  // 恢复为活跃状态
  const [updated] = await db
    .update(invitationCodes)
    .set({ status: 'active' })
    .where(eq(invitationCodes.id, invitationId))
    .returning();

  return updated;
}

/**
 * 获取邀请统计
 * @returns {Promise<Object>} 统计数据
 */
export async function getInvitationStats() {
  const stats = await db
    .select({
      totalCodes: count(),
      activeCodes: sql`count(case when status = 'active' then 1 end)::int`,
      usedCodes: sql`count(case when status = 'used' then 1 end)::int`,
      expiredCodes: sql`count(case when status = 'expired' then 1 end)::int`,
      totalInvitedUsers: sql`count(distinct used_by)::int`,
    })
    .from(invitationCodes);
  
  return stats[0];
}
