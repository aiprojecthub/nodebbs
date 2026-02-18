import { emojiGroups, emojis } from '../schema.js';
import { eq, desc, asc, and, inArray } from 'drizzle-orm';

export default async function emojiRoutes(fastify, options) {
  // ============ 公开 API ============

  // 获取所有表情（按分组）
  fastify.get('/', {
    schema: {
      tags: ['emojis'],
      description: '获取所有可用表情（按分组）',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              slug: { type: 'string' },
              size: { type: 'integer', nullable: true },
              emojis: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    code: { type: 'string' },
                    url: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const groups = await fastify.db.select().from(emojiGroups)
      .where(eq(emojiGroups.isActive, true))
      .orderBy(asc(emojiGroups.order));

    if (groups.length === 0) return [];

    const groupIds = groups.map(g => g.id);
    const allEmojis = await fastify.db.select().from(emojis)
      .where(inArray(emojis.groupId, groupIds))
      .orderBy(asc(emojis.order));

    // 用 Map 索引避免 O(n*m) 嵌套遍历
    const emojisByGroup = new Map();
    for (const emoji of allEmojis) {
      const list = emojisByGroup.get(emoji.groupId);
      if (list) list.push(emoji);
      else emojisByGroup.set(emoji.groupId, [emoji]);
    }

    return groups.map(group => ({
      ...group,
      emojis: emojisByGroup.get(group.id) || []
    }));
  });

  // ============ 管理：表情分组 ============

  // 获取所有分组（包含未启用的）
  fastify.get('/admin/groups', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['emojis', 'admin'],
      description: '获取所有表情包分组（仅管理员）',
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const groups = await fastify.db.select().from(emojiGroups).orderBy(asc(emojiGroups.order));
    return groups;
  });

  // 获取单个分组详情（包含表情列表）
  fastify.get('/admin/groups/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['emojis', 'admin'],
      description: '获取单个分组详情（含表情列表，仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    const [group] = await fastify.db.select().from(emojiGroups).where(eq(emojiGroups.id, id)).limit(1);
    if (!group) {
      return reply.code(404).send({ error: '分组不存在' });
    }

    const groupEmojis = await fastify.db.select().from(emojis)
      .where(eq(emojis.groupId, id))
      .orderBy(asc(emojis.order));

    return { ...group, emojis: groupEmojis };
  });

  // 创建分组
  fastify.post('/admin/groups', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['emojis', 'admin'],
      description: '创建表情包分组',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string', maxLength: 50 },
          slug: { type: 'string', minLength: 1, maxLength: 10 },
          order: { type: 'integer' },
          isActive: { type: 'boolean' },
          size: { type: 'integer', nullable: true }
        }
      }
    }
  }, async (request, reply) => {
    const { name, slug, order, isActive } = request.body;

    // 检查 slug 唯一性
    const [existing] = await fastify.db.select().from(emojiGroups).where(eq(emojiGroups.slug, slug)).limit(1);
    if (existing) {
      return reply.code(400).send({ error: '分组标识已存在' });
    }

    const [group] = await fastify.db.insert(emojiGroups).values({
      name,
      slug,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
      size: request.body.size || null
    }).returning();

    return group;
  });

  // 批量排序分组
  fastify.patch('/admin/groups/batch-reorder', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['emojis', 'admin'],
      description: '批量排序分组',
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'order'],
              properties: {
                id: { type: 'integer' },
                order: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { items } = request.body;
    
    let updatedCount = 0;
    await fastify.db.transaction(async (tx) => {
      await Promise.all(items.map(item =>
        tx.update(emojiGroups)
          .set({ order: item.order, updatedAt: new Date() })
          .where(eq(emojiGroups.id, item.id))
      ));
      updatedCount = items.length;
    });

    return { message: '排序更新成功', updated: updatedCount };
  });

  // 更新分组
  fastify.patch('/admin/groups/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['emojis', 'admin'],
      description: '更新表情包分组',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 50 },
          slug: { type: 'string', maxLength: 50 },
          order: { type: 'integer' },
          isActive: { type: 'boolean' },
          size: { type: 'integer', nullable: true }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const [group] = await fastify.db.select().from(emojiGroups).where(eq(emojiGroups.id, id)).limit(1);
    if (!group) {
      return reply.code(404).send({ error: '分组不存在' });
    }

    if (request.body.slug && request.body.slug !== group.slug) {
      const [existing] = await fastify.db.select().from(emojiGroups).where(eq(emojiGroups.slug, request.body.slug)).limit(1);
      if (existing) {
        return reply.code(400).send({ error: '分组标识已存在' });
      }
    }

    // 只允许更新白名单字段
    const { name, slug, order, isActive, size } = request.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (order !== undefined) updates.order = order;
    if (isActive !== undefined) updates.isActive = isActive;
    if (size !== undefined) updates.size = size;
    updates.updatedAt = new Date();

    const [updated] = await fastify.db.update(emojiGroups)
      .set(updates)
      .where(eq(emojiGroups.id, id))
      .returning();

    return updated;
  });

  // 删除分组
  fastify.delete('/admin/groups/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['emojis', 'admin'],
      description: '删除表情包分组',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    // 检查是否存在
    const [group] = await fastify.db.select().from(emojiGroups).where(eq(emojiGroups.id, id)).limit(1);
    if (!group) return reply.code(404).send({ error: '分组不存在' });

    // 删除（关联表情会级联删除）
    await fastify.db.delete(emojiGroups).where(eq(emojiGroups.id, id));

    return { message: '分组删除成功' };
  });

  // ============ 管理：表情 ============

  // 创建表情（通过 URL）
  fastify.post('/admin/emojis', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['emojis', 'admin'],
      description: '添加表情（通过 URL）',
      body: {
        type: 'object',
        required: ['groupId', 'code', 'url'],
        properties: {
          groupId: { type: 'integer' },
          code: { type: 'string' },
          url: { type: 'string' },
        }
      }
    }
  }, async (request, reply) => {
    const { groupId, url } = request.body;
    let { code } = request.body;

    code = code.trim();

    // 检查 code 在分组内唯一性
    const [existing] = await fastify.db.select().from(emojis)
      .where(and(eq(emojis.groupId, groupId), eq(emojis.code, code)))
      .limit(1);
    if (existing) {
      return reply.code(400).send({ error: `表情代码 :${code}: 在该分组中已存在` });
    }

    // 获取分组内最大 order
    const [last] = await fastify.db.select().from(emojis)
      .where(eq(emojis.groupId, groupId))
      .orderBy(desc(emojis.order))
      .limit(1);
    const newOrder = last ? last.order + 1 : 0;

    const [emoji] = await fastify.db.insert(emojis).values({
      groupId,
      code,
      url,
      order: newOrder
    }).returning();

    return emoji;
  });

  // 删除表情
  fastify.delete('/admin/emojis/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['emojis', 'admin'],
      description: '删除表情',
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    const [emoji] = await fastify.db.select().from(emojis).where(eq(emojis.id, id)).limit(1);
    if (!emoji) return reply.code(404).send({ error: '表情不存在' });

    await fastify.db.delete(emojis).where(eq(emojis.id, id));
    return { message: '删除成功' };
  });

  // 批量排序表情
  fastify.patch('/admin/emojis/batch-reorder', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['emojis', 'admin'],
      description: '批量排序/移动表情',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'groupId', 'order'],
              properties: {
                id: { type: 'integer' },
                groupId: { type: 'integer' },
                order: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { items } = request.body;

    await fastify.db.transaction(async (tx) => {
      await Promise.all(items.map(item =>
        tx.update(emojis)
          .set({
            groupId: item.groupId,
            order: item.order,
            updatedAt: new Date()
          })
          .where(eq(emojis.id, item.id))
      ));
    });

    return { message: '排序更新成功', updated: items.length };
  });
}
