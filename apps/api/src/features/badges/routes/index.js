import { getBadges, getUserBadges } from '../services/badgeService.js';
import db from '../../../db/index.js';
import { users } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function badgeRoutes(fastify, options) {
  // 获取所有可用勋章（支持登录用户状态增强）
  fastify.get('/', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['badges'],
      description: '获取所有可用勋章，登录用户会返回拥有状态',
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { category } = request.query;
    const allBadges = await getBadges(category);

    if (request.user) {
        // 获取用户已拥有的勋章信息
        const userOwned = await getUserBadges(request.user.id);
        
        const ownershipInfo = new Map();
        
        userOwned.forEach(ub => {
            // 注意：getUserBadges 返回的是 join 后的对象，结构包含 badge 关联
            // 我们只需要标记拥有的 badge ID 和相关信息
            const bid = ub.badge ? ub.badge.id : ub.badgeId;
            ownershipInfo.set(bid, {
                isOwned: true,
                earnedAt: ub.earnedAt,
                isDisplayed: ub.isDisplayed
            });
        });

        return {
            items: allBadges.map(badge => {
                const info = ownershipInfo.get(badge.id);
                if (info) {
                    return { ...badge, ...info };
                }
                return { ...badge, isOwned: false };
            })
        };
    }

    // 未登录用户，直接返回基础列表
    return { items: allBadges.map(b => ({ ...b, isOwned: false })) };
  });

  // Route removed: /users/:userId (Data consolidated into /api/users/:username)

  // 管理员：创建勋章
  fastify.post('/admin', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['badges'],
      description: '创建新勋章',
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

  // 管理员：更新勋章
  fastify.patch('/admin/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['badges'],
      description: '更新勋章',
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

  // 管理员：删除勋章
  fastify.delete('/admin/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['badges'],
      description: '删除勋章',
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
}
