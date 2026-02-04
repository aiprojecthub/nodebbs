import db from '../../db/index.js';
import { tags, topicTags, topics } from '../../db/schema.js';
import { eq, sql, desc, like, count } from 'drizzle-orm';
import slugify from 'slug';

export default async function tagRoutes(fastify, options) {
  // 获取所有标签
  fastify.get('/', {
    schema: {
      tags: ['tags'],
      description: '列出所有标签',
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 50, maximum: 500 }
        }
      }
    }
  }, async (request, reply) => {
    const { search, page = 1, limit = 50 } = request.query;
    const offset = (page - 1) * limit;

    let query = db.select().from(tags);
    let countQuery = db.select({ count: count() }).from(tags);

    if (search) {
      const searchCondition = like(tags.name, `%${search}%`);
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }

    const tagsList = await query
      .orderBy(desc(tags.topicCount), tags.name)
      .limit(limit)
      .offset(offset);

    const [{ count: total }] = await countQuery;

    return {
      items: tagsList,
      page,
      limit,
      total,
    };
  });

  // 根据标识获取标签
  fastify.get('/:slug', {
    schema: {
      tags: ['tags'],
      description: '根据标识获取标签',
      params: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { slug } = request.params;

    const [tag] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);

    if (!tag) {
      return reply.code(404).send({ error: '标签不存在' });
    }

    return tag;
  });

  // 获取标签下的话题
  fastify.get('/:slug/topics', {
    schema: {
      tags: ['tags'],
      description: '获取标签下的话题',
      params: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 }
        }
      }
    }
  }, async (request, reply) => {
    const { slug } = request.params;
    const { page = 1, limit = 20 } = request.query;
    const offset = (page - 1) * limit;

    const [tag] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);

    if (!tag) {
      return reply.code(404).send({ error: '标签不存在' });
    }

    const topicsList = await db
      .select({
        id: topics.id,
        title: topics.title,
        slug: topics.slug,
        viewCount: topics.viewCount,
        // 注意：likeCount 已从 topics 表移除
        postCount: topics.postCount,
        createdAt: topics.createdAt
      })
      .from(topicTags)
      .innerJoin(topics, eq(topicTags.topicId, topics.id))
      .where(eq(topicTags.tagId, tag.id))
      .orderBy(desc(topics.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取总数量
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(topicTags)
      .where(eq(topicTags.tagId, tag.id));

    return {
      items: topicsList,
      page,
      limit,
      total,
    };
  });

  // 创建标签（已登录用户）
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['tags'],
      description: '创建新标签',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 50 },
          slug: { type: 'string', maxLength: 100 },
          description: { type: 'string' },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }
        }
      }
    }
  }, async (request, reply) => {
    const { name, description, color } = request.body;
    let { slug } = request.body;

    // 未提供标识时自动生成
    if (!slug) {
      slug = slugify(name);
    }

    // 检查标签是否已存在
    const [existing] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);

    if (existing) {
      return reply.code(400).send({ error: '该名称的标签已存在' });
    }

    const [newTag] = await db.insert(tags).values({
      name,
      slug,
      description,
      color: color || '#000000'
    }).returning();

    return newTag;
  });

  // 更新标签（仅管理员）
  fastify.patch('/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['tags', 'admin'],
      description: '更新标签（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 50 },
          slug: { type: 'string', maxLength: 100 },
          description: { type: 'string' },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const [tag] = await db.select().from(tags).where(eq(tags.id, id)).limit(1);

    if (!tag) {
      return reply.code(404).send({ error: '标签不存在' });
    }

    // 若标识变更则检查唯一性
    if (request.body.slug && request.body.slug !== tag.slug) {
      const [existing] = await db.select().from(tags).where(eq(tags.slug, request.body.slug)).limit(1);
      if (existing) {
        return reply.code(400).send({ error: '该标识的标签已存在' });
      }
    }

    const updates = { ...request.body };

    const [updatedTag] = await db.update(tags).set(updates).where(eq(tags.id, id)).returning();

    return updatedTag;
  });

  // 删除标签（仅管理员）
  fastify.delete('/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['tags', 'admin'],
      description: '删除标签（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const [tag] = await db.select().from(tags).where(eq(tags.id, id)).limit(1);

    if (!tag) {
      return reply.code(404).send({ error: '标签不存在' });
    }

    // 先删除所有 topic_tags 关联（级联可处理，这里显式执行）
    await db.delete(topicTags).where(eq(topicTags.tagId, id));

    // 删除标签
    await db.delete(tags).where(eq(tags.id, id));

    return { message: '标签删除成功' };
  });
}
