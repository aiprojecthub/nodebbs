import db from '../../db/index.js';
import { categories, topics } from '../../db/schema.js';
import { eq, sql, desc, isNull, like, and, or, count, inArray } from 'drizzle-orm';
import slugify from 'slug';

export default async function categoryRoutes(fastify, options) {
  // 批量更新分类排序（仅管理员）
  // 注意：此路由需要放在 GET '/' 之前，避免被通配符路由覆盖
  fastify.patch('/batch-reorder', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['categories', 'admin'],
      description: '批量更新分类排序（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'position'],
              properties: {
                id: { type: 'number' },
                position: { type: 'number' }
              }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            updated: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { items } = request.body;

    if (!items || items.length === 0) {
      return reply.code(400).send({ error: '排序项不能为空' });
    }

    // 批量更新每个分类的 position
    let updatedCount = 0;
    for (const item of items) {
      const [updated] = await db
        .update(categories)
        .set({ position: item.position })
        .where(eq(categories.id, item.id))
        .returning();
      
      if (updated) {
        updatedCount++;
      }
    }

    return { message: '排序更新成功', updated: updatedCount };
  });

  // 获取所有分类
  fastify.get('/', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['categories'],
      description: '获取所有分类（平铺返回）',
      querystring: {
        type: 'object',
        properties: {
          isFeatured: { type: 'boolean' },
          search: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { isFeatured, search } = request.query;
    const { user } = request;

    // 构建查询条件
    let conditions = [];

    // 添加搜索条件
    if (search && search.trim()) {
      conditions.push(
        or(
          like(categories.name, `%${search.trim()}%`),
          like(categories.description, `%${search.trim()}%`)
        )
      );
    }

    // 添加精选过滤
    if (isFeatured !== undefined) {
      conditions.push(eq(categories.isFeatured, isFeatured));
    }

    // 构建查询
    let query = db.select().from(categories);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // 排序：精选分类按 position 排序，非精选分类按 name 排序
    let allCategories;
    if (isFeatured === true) {
      // 精选分类：按 position 排序（支持拖拽排序）
      allCategories = await query.orderBy(
        categories.position,
        categories.name
      );
    } else {
      // 非精选分类：按 name 字母排序
      allCategories = await query.orderBy(categories.name);
    }

    // 检查分类是否私有（包括继承的私有属性）
    const isPrivateCategory = (category, allCats) => {
      if (category.isPrivate) return true;

      // 检查父分类是否私有
      if (category.parentId) {
        const parent = allCats.find(c => c.id === category.parentId);
        if (parent) {
          return isPrivateCategory(parent, allCats);
        }
      }

      return false;
    };

    // 过滤私有分类（只有管理员可以看到）
    if (!user?.isAdmin) {
      allCategories = allCategories.filter(cat => !isPrivateCategory(cat, allCategories));
    }

    // 获取用户允许访问的分类（基于 RBAC 权限）
    const allowedCategoryIds = await fastify.permission.getAllowedCategories(request);

    // 如果有分类限制，过滤分类列表
    if (allowedCategoryIds !== null) {
      if (allowedCategoryIds.length === 0) {
        // 无权访问任何分类
        return [];
      }
      allCategories = allCategories.filter(cat => allowedCategoryIds.includes(cat.id));
    }

    // 获取话题统计信息
    const categoriesWithStats = await Promise.all(
      allCategories.map(async (category) => {
        // 获取话题数量
        const [topicCount] = await db
          .select({ count: count() })
          .from(topics)
          .where(and(
            eq(topics.categoryId, category.id),
            eq(topics.isDeleted, false)
          ));

        // 获取总回复数和总浏览数
        const [stats] = await db
          .select({
            postCount: sql`COALESCE(SUM(${topics.postCount}), 0)`,
            viewCount: sql`COALESCE(SUM(${topics.viewCount}), 0)`
          })
          .from(topics)
          .where(and(
            eq(topics.categoryId, category.id),
            eq(topics.isDeleted, false)
          ));

        // 获取最新话题
        const [latestTopic] = await db
          .select({
            id: topics.id,
            title: topics.title,
            slug: topics.slug,
            createdAt: topics.createdAt,
            updatedAt: topics.updatedAt
          })
          .from(topics)
          .where(and(
            eq(topics.categoryId, category.id),
            eq(topics.isDeleted, false)
          ))
          .orderBy(desc(topics.updatedAt))
          .limit(1);

        return {
          ...category,
          topicCount: topicCount.count,
          postCount: Number(stats.postCount),
          viewCount: Number(stats.viewCount),
          latestTopic: latestTopic || null
        };
      })
    );

    // 平铺返回所有分类，不组装层级结构
    return categoriesWithStats;
  });

  // 获取单个分类
  fastify.get('/:slug', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['categories'],
      description: '根据标识获取分类',
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
    const { user } = request;

    const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);

    if (!category) {
      return reply.code(404).send({ error: '分类不存在' });
    }

    // 检查分类是否私有（包括继承的私有属性）
    const checkPrivate = async (cat) => {
      if (cat.isPrivate) return true;
      
      if (cat.parentId) {
        const [parent] = await db
          .select()
          .from(categories)
          .where(eq(categories.id, cat.parentId))
          .limit(1);
        
        if (parent) {
          return await checkPrivate(parent);
        }
      }
      
      return false;
    };

    const isPrivate = await checkPrivate(category);
    
    // 如果是私有分类，检查权限
    if (isPrivate && !user?.isAdmin) {
      return reply.code(403).send({ error: '无权访问此分类' });
    }

    // 检查用户是否有权限查看该分类（基于 RBAC）
    if (!await fastify.permission.can(request, 'topic.read', { categoryId: category.id })) {
      return reply.code(404).send({ error: '分类不存在' });
    }

    // 获取话题数量
    const [{count: topicCount}] = await db
      .select({ count: count() })
      .from(topics)
      .where(eq(topics.categoryId, category.id));

    // 获取子分类
    const subcategories = await db
      .select()
      .from(categories)
      .where(eq(categories.parentId, category.id))
      .orderBy(
        desc(categories.isFeatured),
        categories.position,
        categories.name
      );

    return {
      ...category,
      topicCount,
      subcategories
    };
  });

  // 创建分类（仅管理员）
  fastify.post('/', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['categories', 'admin'],
      description: '创建新分类（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 100 },
          slug: { type: 'string', maxLength: 100 },
          description: { type: 'string' },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          icon: { type: 'string', maxLength: 50 },
          parentId: { type: ['number', 'null'] },
          position: { type: 'number' },
          isPrivate: { type: 'boolean' },
          isFeatured: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    const { name, description, color, icon, parentId, position, isPrivate, isFeatured } = request.body;
    let { slug } = request.body;

    // 未提供标识时自动生成
    if (!slug) {
      slug = slugify(name);
    }

    // 检查标识是否已存在
    const [existing] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (existing) {
      return reply.code(400).send({ error: '该标识的分类已存在' });
    }

    // 如提供父分类则校验其存在
    if (parentId) {
      const [parent] = await db.select().from(categories).where(eq(categories.id, parentId)).limit(1);
      if (!parent) {
        return reply.code(404).send({ error: '父分类不存在' });
      }
    }

    const [newCategory] = await db.insert(categories).values({
      name,
      slug,
      description,
      color: color || '#000000',
      icon,
      parentId,
      position: position !== undefined ? position : 0,
      isPrivate: isPrivate || false,
      isFeatured: isFeatured || false
    }).returning();

    return newCategory;
  });

  // 更新分类（仅管理员）
  fastify.patch('/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['categories', 'admin'],
      description: '更新分类（仅管理员）',
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
          name: { type: 'string', maxLength: 100 },
          slug: { type: 'string', maxLength: 100 },
          description: { type: 'string' },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          icon: { type: 'string', maxLength: 50 },
          parentId: { type: ['number', 'null'] },
          position: { type: 'number' },
          isPrivate: { type: 'boolean' },
          isFeatured: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

    if (!category) {
      return reply.code(404).send({ error: '分类不存在' });
    }

    // 若标识变更则检查唯一性
    if (request.body.slug && request.body.slug !== category.slug) {
      const [existing] = await db.select().from(categories).where(eq(categories.slug, request.body.slug)).limit(1);
      if (existing) {
        return reply.code(400).send({ error: '该标识的分类已存在' });
      }
    }

    const updates = { ...request.body };

    const [updatedCategory] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();

    return updatedCategory;
  });

  // 删除分类（仅管理员）
  fastify.delete('/:id', {
    preHandler: [fastify.requireAdmin],
    schema: {
      tags: ['categories', 'admin'],
      description: '删除分类（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;

    const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

    if (!category) {
      return reply.code(404).send({ error: '分类不存在' });
    }

    // 检查分类下是否有话题
    const [topicCount] = await db.select({ count: count() }).from(topics).where(eq(topics.categoryId, id));

    if (topicCount.count > 0) {
      return reply.code(400).send({ error: '无法删除包含话题的分类' });
    }

    await db.delete(categories).where(eq(categories.id, id));

    return { message: '分类删除成功' };
  });
}
