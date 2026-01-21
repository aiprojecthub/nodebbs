import { getBadges, getUserBadges } from '../services/badgeService.js';
import db from '../../../db/index.js';
import { users, badges } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function badgeRoutes(fastify, options) {
  // 获取勋章列表 (RESTful: GET /badges)
  fastify.get('/', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['badges'],
      description: '获取所有可用勋章，登录用户会返回拥有状态',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          category: { type: 'string' },
          includeInactive: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    const { page, limit, category, includeInactive: includeInactiveParam } = request.query;
    
    const isAdmin = request.user?.role === 'admin';
    // Non-admin users: ignore includeInactive, force false
    const includeInactive = isAdmin && (includeInactiveParam === true || includeInactiveParam === 'true');

    // Public endpoint logic with admin support
    const result = await getBadges({ page, limit, category, includeInactive });

    if (request.user) {
        // 获取用户已拥有的勋章信息
        const userOwned = await getUserBadges(request.user.id);
        
        const ownershipInfo = new Map();
        
        userOwned.forEach(ub => {
            const bid = ub.badge ? ub.badge.id : ub.badgeId;
            ownershipInfo.set(bid, {
                isOwned: true,
                earnedAt: ub.earnedAt,
                isDisplayed: ub.isDisplayed,
                userBadgeId: ub.id  // 用户勋章记录ID，用于更新展示设置
            });
        });

        const enrichedItems = result.items.map(badge => {
            const info = ownershipInfo.get(badge.id);
            if (info) {
                return { ...badge, ...info };
            }
            return { ...badge, isOwned: false };
        });

        return {
            ...result,
            items: enrichedItems
        };
    }

    // 未登录用户，直接返回基础列表
    return { 
        ...result,
        items: result.items.map(b => ({ ...b, isOwned: false })) 
    };
  });

  // 创建勋章 (Admin Only: POST /badges)
  fastify.post('/', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['badges', 'admin'],
      description: '创建新勋章（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'slug', 'iconUrl'],
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          iconUrl: { type: 'string' },
          category: { type: 'string' },
          unlockCondition: { type: 'string' }, // JSON 字符串
          metadata: { type: 'string' }, // JSON 字符串
          displayOrder: { type: 'integer' },
          isActive: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    const { createBadge } = await import('../services/badgeService.js');
    const badge = await createBadge(request.body);
    return badge;
  });

  // 更新勋章 (Admin Only: PATCH /badges/:id)
  fastify.patch('/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['badges', 'admin'],
      description: '更新勋章（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          iconUrl: { type: 'string' },
          category: { type: 'string' },
          unlockCondition: { type: 'string' },
          metadata: { type: 'string' },
          displayOrder: { type: 'integer' },
          isActive: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    const { updateBadge } = await import('../services/badgeService.js');
    const { id } = request.params;
    const badge = await updateBadge(id, request.body);
    return badge;
  });

  // 删除勋章 (Admin Only: DELETE /badges/:id)
  fastify.delete('/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['badges', 'admin'],
      description: '删除勋章（仅创始人）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' }
        }
      }
    }
  }, async (request, reply) => {
    // 检查是否是第一个管理员（创始人）
    const [firstAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(users.createdAt)
      .limit(1);

    if (!firstAdmin || firstAdmin.id !== request.user.id) {
      return reply.code(403).send({ error: '只有创始人（第一个管理员）可以删除勋章' });
    }

    const { deleteBadge } = await import('../services/badgeService.js');
    const { id } = request.params;
    await deleteBadge(id);
    return { success: true };
  });

  // ============ 纯管理操作 (保留 /admin 前缀) ============

  // 管理员：授予徽章给用户
  fastify.post('/admin/grant', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['badges', 'admin'],
      description: '手动授予用户徽章（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['userId', 'badgeId'],
        properties: {
          userId: { type: 'integer', description: '用户 ID' },
          badgeId: { type: 'integer', description: '徽章 ID' },
          reason: { type: 'string', description: '授予原因（可选）' }
        }
      }
    }
  }, async (request, reply) => {
    const { grantBadge } = await import('../services/badgeService.js');
    const { userId, badgeId, reason } = request.body;
    
    // 检查用户是否存在（可选，数据库约束也会处理，但提前检查更友好）
    const [userExists] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!userExists) return reply.code(404).send({ error: '用户不存在' });

    // 检查徽章是否存在
    const [badgeExists] = await db
      .select({ 
        id: badges.id,
        name: badges.name,
        iconUrl: badges.iconUrl,
        slug: badges.slug
      })
      .from(badges)
      .where(eq(badges.id, badgeId))
      .limit(1);
    
    if (!badgeExists) return reply.code(404).send({ error: '徽章不存在' });

    const result = await grantBadge(userId, badgeId, 'admin_manual');

    // 发送通知
    await fastify.notification.send({
      userId: userId,
      type: 'badge_earned',
      triggeredByUserId: request.user.id,
      message: `恭喜！你获得了 "${badgeExists.name}" 勋章`,
      metadata: {
        badgeId: badgeExists.id,
        badgeName: badgeExists.name,
        iconUrl: badgeExists.iconUrl,
        slug: badgeExists.slug
      }
    });

    return { success: true, badge: result, message: '徽章授予成功' };
  });

  // 管理员：撤销用户徽章
  fastify.post('/admin/revoke', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['badges', 'admin'],
      description: '手动撤销用户徽章（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['userId', 'badgeId'],
        properties: {
          userId: { type: 'integer', description: '用户 ID' },
          badgeId: { type: 'integer', description: '徽章 ID' }
        }
      }
    }
  }, async (request, reply) => {
    const { revokeUserBadge } = await import('../services/badgeService.js');
    const { userId, badgeId } = request.body;
    
    const success = await revokeUserBadge(userId, badgeId);
    if (!success) {
         return reply.code(404).send({ error: '未找到该用户持有的此徽章，或者撤销失败' });
    }
    return { success: true, message: '徽章撤销成功' };
  });

  // ============ 用户操作 ============

  // 用户：更新自己的勋章展示设置
  fastify.patch('/user/:userBadgeId', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['badges'],
      description: '更新用户勋章展示设置',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userBadgeId'],
        properties: {
          userBadgeId: { type: 'integer' }
        }
      },
      body: {
        type: 'object',
        properties: {
          isDisplayed: { type: 'boolean' },
          displayOrder: { type: 'integer' }
        }
      }
    }
  }, async (request, reply) => {
    const { updateUserBadgeDisplay } = await import('../services/badgeService.js');
    const { userBadgeId } = request.params;
    const userId = request.user.id;
    
    const result = await updateUserBadgeDisplay(userBadgeId, userId, request.body);
    if (!result) {
      return reply.code(404).send({ error: '勋章不存在或无权操作' });
    }
    
    // 清除用户缓存，确保 /auth/me 返回最新的勋章数据
    await fastify.clearUserCache(userId);
    
    return { success: true, userBadge: result };
  });
}
