import db from '../../db/index.js';
import { users, categories, topics, posts } from '../../db/schema.js';
import { sql, eq, and, ne, count } from 'drizzle-orm';

export default async function dashboardRoutes(fastify, options) {
  // 获取统计数据（仅管理员可访问）
  fastify.get('/stats', {
    preHandler: [fastify.requirePermission('dashboard.access')],
    schema: {
      tags: ['dashboard', 'admin'],
      description: '获取管理后台统计数据（仅管理员）',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            totalUsers: { type: 'number' },
            totalCategories: { type: 'number' },
            totalTopics: { type: 'number' },
            totalPosts: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // 并行查询所有统计数据
      const [
        usersCount,
        categoriesCount,
        topicsCount,
        postsCount
      ] = await Promise.all([
        // 总用户数（排除已删除用户）
        db.select({ count: count() })
          .from(users)
          .where(eq(users.isDeleted, false))
          .then(result => result[0]),

        // 分类数量
        db.select({ count: count() })
          .from(categories)
          .then(result => result[0]),

        // 话题数量（排除已删除话题）
        db.select({ count: count() })
          .from(topics)
          .where(eq(topics.isDeleted, false))
          .then(result => result[0]),

        // 回复数量（排除第一条回复，因为第一条回复是话题内容本身）
        db.select({ count: count() })
          .from(posts)
          .where(and(
            eq(posts.isDeleted, false),
            ne(posts.postNumber, 1)
          ))
          .then(result => result[0])
      ]);

      return {
        totalUsers: usersCount.count,
        totalCategories: categoriesCount.count,
        totalTopics: topicsCount.count,
        totalPosts: postsCount.count
      };
    } catch (error) {
      fastify.log.error('获取统计数据失败:', error);
      return reply.code(500).send({ error: '获取统计数据失败' });
    }
  });
}