import db from '../../db/index.js';
import { tags, topicTags, topics } from '../../db/schema.js';
import { eq, sql, desc, like } from 'drizzle-orm';
import slugify from 'slug';

export default async function tagRoutes(fastify, options) {
  // List all tags
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
    let countQuery = db.select({ count: sql`count(*)` }).from(tags);

    if (search) {
      const searchCondition = like(tags.name, `%${search}%`);
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }

    const tagsList = await query
      .orderBy(desc(tags.topicCount), tags.name)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await countQuery;

    return {
      items: tagsList,
      page,
      limit,
      total: Number(count)
    };
  });

  // Get tag by slug
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

  // Get topics for a tag
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

    // Get total count
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(topicTags)
      .where(eq(topicTags.tagId, tag.id));

    return {
      items: topicsList,
      page,
      limit,
      total: Number(count)
    };
  });

  // Create tag (authenticated users)
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

    // Generate slug if not provided
    if (!slug) {
      slug = slugify(name);
    }

    // Check if tag exists
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

  // Update tag (admin only)
  fastify.patch('/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['tags'],
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

    // Check slug uniqueness if changed
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

  // Delete tag (admin only)
  fastify.delete('/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['tags'],
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

    // Delete all topic_tags associations first (cascade should handle this, but being explicit)
    await db.delete(topicTags).where(eq(topicTags.tagId, id));

    // Delete tag
    await db.delete(tags).where(eq(tags.id, id));

    return { message: '标签删除成功' };
  });
}
