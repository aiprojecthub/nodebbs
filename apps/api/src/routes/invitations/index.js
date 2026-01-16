import db from '../../db/index.js';
import { invitationCodes, invitationRules, users } from '../../db/schema.js';
import { eq, and, desc, sql, or, like, asc } from 'drizzle-orm';
import {
  generateInvitationCode,
  validateInvitationCode,
  getTodayGeneratedCount,
  getUserInvitationRule,
} from '../../utils/invitation.js';
import { DEFAULT_CURRENCY_CODE } from '../../extensions/ledger/constants.js';

export default async function invitationsRoutes(fastify) {
  // 生成邀请码
  fastify.post(
    '/generate',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['invitations'],
        description: '生成邀请码（支持批量生成）',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            note: { type: 'string', maxLength: 500 },
            maxUses: { type: 'number', minimum: 1 },
            expireDays: { type: 'number', minimum: 1 },
            count: { type: 'number', minimum: 1, maximum: 100, default: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              codes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    code: { type: 'string' },
                    maxUses: { type: 'number' },
                    usedCount: { type: 'number' },
                    expiresAt: { type: 'string' },
                    note: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { note, maxUses, expireDays, count = 1 } = request.body;
        const userId = request.user.id;

        // 获取用户规则和今日剩余次数
        const rule = await getUserInvitationRule(userId);
        const todayUsed = await getTodayGeneratedCount(userId);
        const todayRemaining = Math.max(0, rule.dailyLimit - todayUsed);

        // 验证生成数量
        if (count > todayRemaining) {
          throw new Error(
            `生成数量超过今日剩余次数（剩余 ${todayRemaining} 个）`
          );
        }

        // 积分扣除检查
        if (rule.pointsCost > 0) {
          const totalCost = rule.pointsCost * count;
          // 使用账本检查余额
          if (!fastify.ledger) {
             throw new Error('账本系统不可用');
          }

          // 检查余额
          const account = await fastify.ledger.getAccount(request.user.id, DEFAULT_CURRENCY_CODE);
          const currentBalance = account ? Number(account.balance) : 0;

          if (currentBalance < totalCost) {
              const currencyName = await fastify.ledger.getCurrencyName(DEFAULT_CURRENCY_CODE).catch(() => DEFAULT_CURRENCY_CODE);
              return reply.code(400).send({ error: `${currencyName}不足，需要 ${totalCost} ${currencyName} (当前余额: ${currentBalance})` });
          }

          // 扣除积分
          await fastify.ledger.transfer({
               fromUserId: request.user.id,
               toUserId: null, // Burn
               currencyCode: DEFAULT_CURRENCY_CODE,
               amount: totalCost,
               type: 'invite_create',
               description: `生成 ${count} 个邀请码`,
               metadata: { count, costPerCode: rule.pointsCost }
          });
        }

        // 批量生成邀请码
        const invitations = [];
        for (let i = 0; i < count; i++) {
          const invitation = await generateInvitationCode(userId, {
            note: count > 1 ? `${note || ''}${note ? ' ' : ''}#${i + 1}` : note,
            maxUses,
            expireDays,
          });
          invitations.push({
            id: invitation.id,
            code: invitation.code,
            maxUses: invitation.maxUses,
            usedCount: invitation.usedCount,
            expiresAt: invitation.expiresAt,
            note: invitation.note,
            createdAt: invitation.createdAt,
          });
        }

        return {
          codes: invitations,
          count: invitations.length,
        };
      } catch (error) {
        fastify.log.error('生成邀请码时出错:', error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // 获取我的邀请码列表
  fastify.get(
    '/my-codes',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['invitations'],
        description: '获取我的邀请码列表',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            status: {
              type: 'string',
              enum: ['active', 'used', 'expired', 'disabled'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { page = 1, limit = 20, status } = request.query;
        const userId = request.user.id;
        const offset = (page - 1) * limit;

        // 构建查询条件
        const conditions = [eq(invitationCodes.createdBy, userId)];
        if (status) {
          conditions.push(eq(invitationCodes.status, status));
        }

        // 查询邀请码列表
        const codes = await db
          .select({
            id: invitationCodes.id,
            code: invitationCodes.code,
            status: invitationCodes.status,
            maxUses: invitationCodes.maxUses,
            usedCount: invitationCodes.usedCount,
            expiresAt: invitationCodes.expiresAt,
            note: invitationCodes.note,
            createdAt: invitationCodes.createdAt,
            usedAt: invitationCodes.usedAt,
            usedBy: invitationCodes.usedBy,
            usedByUsername: users.username,
            usedByAvatar: users.avatar,
          })
          .from(invitationCodes)
          .leftJoin(users, eq(invitationCodes.usedBy, users.id))
          .where(and(...conditions))
          .orderBy(desc(invitationCodes.createdAt))
          .limit(limit)
          .offset(offset);

        // 获取总数
        const [{ count }] = await db
          .select({ count: sql`count(*)::int` })
          .from(invitationCodes)
          .where(and(...conditions));

        // 格式化返回数据
        const formattedCodes = codes.map((code) => ({
          id: code.id,
          code: code.code,
          status: code.status,
          maxUses: code.maxUses,
          usedCount: code.usedCount,
          expiresAt: code.expiresAt,
          note: code.note,
          createdAt: code.createdAt,
          usedAt: code.usedAt,
          usedBy: code.usedBy
            ? {
                id: code.usedBy,
                username: code.usedByUsername,
                avatar: code.usedByAvatar,
              }
            : null,
        }));

        return {
          items: formattedCodes,
          page,
          limit,
          total: count,
        };
      } catch (error) {
        fastify.log.error('获取邀请码列表时出错:', error);
        return reply.code(500).send({ error: '获取邀请码列表失败' });
      }
    }
  );

  // 验证邀请码
  fastify.post(
    '/validate',
    {
      schema: {
        tags: ['invitations'],
        description: '验证邀请码是否有效',
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              valid: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { code } = request.body;

        if (!code || !code.trim()) {
          return {
            valid: false,
            message: '请提供邀请码',
          };
        }

        const result = await validateInvitationCode(code.trim());

        return {
          valid: result.valid,
          message: result.message,
        };
      } catch (error) {
        fastify.log.error('验证邀请码时出错:', error);
        return reply.code(500).send({ error: '验证邀请码失败' });
      }
    }
  );

  // 获取我的邀请规则和今日剩余次数
  fastify.get(
    '/my-quota',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['invitations'],
        description: '获取我的邀请配额和统计信息',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              quota: {
                type: 'object',
                properties: {
                  dailyLimit: { type: 'number' },
                  todayUsed: { type: 'number' },
                  todayRemaining: { type: 'number' },
                  maxUsesPerCode: { type: 'number' },
                  expireDays: { type: 'number' },
                },
              },
              stats: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  active: { type: 'number' },
                  used: { type: 'number' },
                  expired: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user.id;

        // 获取用户规则
        const rule = await getUserInvitationRule(userId);

        // 获取今日已使用次数
        const todayUsed = await getTodayGeneratedCount(userId);

        // 获取统计信息
        const [stats] = await db
          .select({
            total: sql`count(*)::int`,
            active: sql`count(case when status = 'active' then 1 end)::int`,
            used: sql`count(case when status = 'used' then 1 end)::int`,
            expired: sql`count(case when status = 'expired' then 1 end)::int`,
          })
          .from(invitationCodes)
          .where(eq(invitationCodes.createdBy, userId));

        return {
          quota: {
            dailyLimit: rule.dailyLimit,
            todayUsed,
            todayRemaining: Math.max(0, rule.dailyLimit - todayUsed),
            maxUsesPerCode: rule.maxUsesPerCode,
            expireDays: rule.expireDays,
          },
          stats: stats || { total: 0, active: 0, used: 0, expired: 0 },
        };
      } catch (error) {
        console.log('获取邀请配额时出错:', error);
        return reply.code(500).send({ error: error.message || '获取邀请配额失败' });
      }
    }
  );

  // ============= 管理员 API =============

  // 获取所有邀请码（管理员）
  fastify.get(
    '/all',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['invitations', 'admin'],
        description: '获取所有邀请码列表（管理员）',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            status: {
              type: 'string',
              enum: ['active', 'used', 'expired', 'disabled'],
            },
            createdBy: { type: 'number' },
            search: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { page = 1, limit = 20, status, createdBy, search } = request.query;
        const offset = (page - 1) * limit;

        // 构建查询条件
        const conditions = [];
        if (status) {
          conditions.push(eq(invitationCodes.status, status));
        }
        if (createdBy) {
          conditions.push(eq(invitationCodes.createdBy, createdBy));
        }
        if (search) {
          conditions.push(
            or(
              like(invitationCodes.code, `%${search}%`),
              like(invitationCodes.note, `%${search}%`)
            )
          );
        }

        // 查询邀请码列表
        const codes = await db
          .select({
            id: invitationCodes.id,
            code: invitationCodes.code,
            status: invitationCodes.status,
            maxUses: invitationCodes.maxUses,
            usedCount: invitationCodes.usedCount,
            expiresAt: invitationCodes.expiresAt,
            note: invitationCodes.note,
            createdAt: invitationCodes.createdAt,
            usedAt: invitationCodes.usedAt,
            createdBy: invitationCodes.createdBy,
            creatorUsername: sql`creator.username`,
            creatorAvatar: sql`creator.avatar`,
            usedBy: invitationCodes.usedBy,
            usedByUsername: sql`used_user.username`,
            usedByAvatar: sql`used_user.avatar`,
          })
          .from(invitationCodes)
          .leftJoin(
            sql`users as creator`,
            eq(invitationCodes.createdBy, sql`creator.id`)
          )
          .leftJoin(
            sql`users as used_user`,
            eq(invitationCodes.usedBy, sql`used_user.id`)
          )
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(invitationCodes.createdAt))
          .limit(limit)
          .offset(offset);

        // 获取总数
        const [{ count }] = await db
          .select({ count: sql`count(*)::int` })
          .from(invitationCodes)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        // 格式化返回数据
        const formattedCodes = codes.map((code) => ({
          id: code.id,
          code: code.code,
          status: code.status,
          maxUses: code.maxUses,
          usedCount: code.usedCount,
          expiresAt: code.expiresAt,
          note: code.note,
          createdAt: code.createdAt,
          usedAt: code.usedAt,
          creator: {
            id: code.createdBy,
            username: code.creatorUsername,
            avatar: code.creatorAvatar,
          },
          usedBy: code.usedBy
            ? {
                id: code.usedBy,
                username: code.usedByUsername,
                avatar: code.usedByAvatar,
              }
            : null,
        }));

        return {
          items: formattedCodes,
          page,
          limit,
          total: count,
        };
      } catch (error) {
        fastify.log.error('获取邀请码列表时出错:', error);
        return reply.code(500).send({ error: '获取邀请码列表失败' });
      }
    }
  );

  // 手动生成邀请码（管理员）
  fastify.post(
    '/generate-admin',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['invitations', 'admin'],
        description: '手动生成邀请码（管理员）',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            createdBy: { type: 'number' },
            note: { type: 'string', maxLength: 500 },
            maxUses: { type: 'number', minimum: 1 },
            expireDays: { type: 'number', minimum: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { createdBy, note, maxUses, expireDays } = request.body;

        // 如果没有指定生成者，使用当前管理员
        const userId = createdBy || request.user.id;

        // 生成邀请码（管理员不受每日限制）
        const invitation = await generateInvitationCode(userId, {
          note,
          maxUses,
          expireDays,
        });

        return {
          id: invitation.id,
          code: invitation.code,
          maxUses: invitation.maxUses,
          usedCount: invitation.usedCount,
          expiresAt: invitation.expiresAt,
          note: invitation.note,
          createdAt: invitation.createdAt,
        };
      } catch (error) {
        fastify.log.error('生成邀请码时出错:', error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // 禁用邀请码（管理员）
  fastify.patch(
    '/:id/disable',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['invitations', 'admin'],
        description: '禁用邀请码（管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const { disableInvitationCode } = await import('../../utils/invitation.js');
        const updated = await disableInvitationCode(id);

        return {
          id: updated.id,
          code: updated.code,
          status: updated.status,
        };
      } catch (error) {
        fastify.log.error('禁用邀请码时出错:', error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // 恢复邀请码（管理员）
  fastify.patch(
    '/:id/enable',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['invitations', 'admin'],
        description: '恢复已禁用的邀请码（管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              code: { type: 'string' },
              status: { type: 'string' },
              maxUses: { type: 'number' },
              usedCount: { type: 'number' },
              expiresAt: { type: 'string' },
              note: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const { enableInvitationCode } = await import('../../utils/invitation.js');
        const updated = await enableInvitationCode(id);

        return updated;
      } catch (error) {
        fastify.log.error('启用邀请码时出错:', error);
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // 获取邀请统计（管理员）
  fastify.get(
    '/stats',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['invitations', 'admin'],
        description: '获取邀请统计数据（管理员）',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { getInvitationStats } = await import('../../utils/invitation.js');
        const stats = await getInvitationStats();

        // 获取邀请排行榜（前10名）
        const topInviters = await db
          .select({
            userId: invitationCodes.createdBy,
            username: users.username,
            avatar: users.avatar,
            totalCodes: sql`count(${invitationCodes.id})::int`,
            usedCodes: sql`count(case when ${invitationCodes.status} = 'used' then 1 end)::int`,
            totalInvitations: sql`sum(${invitationCodes.usedCount})::int`,
          })
          .from(invitationCodes)
          .leftJoin(users, eq(invitationCodes.createdBy, users.id))
          .groupBy(invitationCodes.createdBy, users.username, users.avatar)
          .orderBy(desc(sql`sum(${invitationCodes.usedCount})`))
          .limit(10);

        return {
          ...stats,
          topInviters,
        };
      } catch (error) {
        fastify.log.error('获取邀请统计时出错:', error);
        return reply.code(500).send({ error: '获取邀请统计失败' });
      }
    }
  );



  // ============= 邀请规则管理 API =============

  // 获取所有邀请规则（管理员）
  fastify.get(
    '/rules',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['invitations', 'admin'],
        description: '获取所有邀请规则（管理员）',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    role: { type: 'string' },
                    dailyLimit: { type: 'number' },
                    maxUsesPerCode: { type: 'number' },
                    expireDays: { type: 'number' },
                    pointsCost: { type: 'number' },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
              page: { type: 'number' },
              limit: { type: 'number' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { page = 1, limit = 20 } = request.query;
        const offset = (page - 1) * limit;

        // 获取规则列表
        const rules = await db
          .select()
          .from(invitationRules)
          .limit(limit)
          .offset(offset)
          .orderBy(asc(invitationRules.createdAt));

        // 获取总数
        const [{ count }] = await db
          .select({ count: sql`count(*)::int` })
          .from(invitationRules);

        return {
          items: rules,
          page,
          limit,
          total: count,
        };
      } catch (error) {
        fastify.log.error('获取邀请规则时出错:', error);
        return reply.code(500).send({ error: '获取邀请规则失败' });
      }
    }
  );

  // 获取单个角色的规则（管理员）
  fastify.get(
    '/rules/:role',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['invitations', 'admin'],
        description: '获取指定角色的邀请规则（管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { role } = request.params;

        const [rule] = await db
          .select()
          .from(invitationRules)
          .where(eq(invitationRules.role, role))
          .limit(1);

        if (!rule) {
          return reply.code(404).send({ error: '规则不存在' });
        }

        return rule;
      } catch (error) {
        fastify.log.error('获取邀请规则时出错:', error);
        return reply.code(500).send({ error: '获取邀请规则失败' });
      }
    }
  );

  // 创建或更新邀请规则（管理员）
  fastify.put(
    '/rules/:role',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['invitations', 'admin'],
        description: '创建或更新邀请规则（管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['dailyLimit', 'maxUsesPerCode', 'expireDays'],
          properties: {
            dailyLimit: { type: 'number', minimum: 0 },
            maxUsesPerCode: { type: 'number', minimum: 1 },
            expireDays: { type: 'number', minimum: 1 },
            pointsCost: { type: 'number', minimum: 0 },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { role } = request.params;
        const { dailyLimit, maxUsesPerCode, expireDays, pointsCost, isActive } =
          request.body;

        // 检查规则是否存在
        const [existing] = await db
          .select()
          .from(invitationRules)
          .where(eq(invitationRules.role, role))
          .limit(1);

        let result;

        if (existing) {
          // 更新现有规则
          [result] = await db
            .update(invitationRules)
            .set({
              dailyLimit,
              maxUsesPerCode,
              expireDays,
              pointsCost: pointsCost ?? 0,
              isActive: isActive ?? true,
            })
            .where(eq(invitationRules.role, role))
            .returning();
        } else {
          // 创建新规则
          [result] = await db
            .insert(invitationRules)
            .values({
              role,
              dailyLimit,
              maxUsesPerCode,
              expireDays,
              pointsCost: pointsCost ?? 0,
              isActive: isActive ?? true,
            })
            .returning();
        }

        return result;
      } catch (error) {
        fastify.log.error('更新邀请规则时出错:', error);
        return reply.code(500).send({ error: '更新邀请规则失败' });
      }
    }
  );

  // 删除邀请规则（管理员）
  fastify.delete(
    '/rules/:role',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['invitations', 'admin'],
        description: '删除邀请规则（管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { role } = request.params;

        // 不允许删除 user 角色的规则
        if (role === 'user') {
          return reply
            .code(400)
            .send({ error: '不能删除默认用户角色的规则' });
        }

        const [deleted] = await db
          .delete(invitationRules)
          .where(eq(invitationRules.role, role))
          .returning();

        if (!deleted) {
          return reply.code(404).send({ error: '规则不存在' });
        }

        return { success: true, message: '规则已删除' };
      } catch (error) {
        fastify.log.error('删除邀请规则时出错:', error);
        return reply.code(500).send({ error: '删除邀请规则失败' });
      }
    }
  );

  // 切换规则启用状态（管理员）
  fastify.patch(
    '/rules/:role/toggle',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['invitations', 'admin'],
        description: '切换邀请规则启用状态（管理员）',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { role } = request.params;

        // 获取当前状态
        const [current] = await db
          .select()
          .from(invitationRules)
          .where(eq(invitationRules.role, role))
          .limit(1);

        if (!current) {
          return reply.code(404).send({ error: '规则不存在' });
        }

        // 切换状态
        const [updated] = await db
          .update(invitationRules)
          .set({ isActive: !current.isActive })
          .where(eq(invitationRules.role, role))
          .returning();

        return updated;
      } catch (error) {
        fastify.log.error('切换邀请规则状态时出错:', error);
        return reply.code(500).send({ error: '切换规则状态失败' });
      }
    }
  );
}
