import db from '../../db/index.js';
import { topics, posts, users, categories, blockedUsers } from '../../db/schema.js';
import { eq, sql, desc, and, or, like, ilike, not, inArray, count } from 'drizzle-orm';
import { isDev } from '../../config/env.js';

export default async function searchRoutes(fastify, options) {
  // 全局搜索
  fastify.get('/', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['search'],
      description: '搜索话题、帖子和用户',
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 2 },
          type: { type: 'string', enum: ['all', 'topics', 'posts', 'users'], default: 'all' },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { q, type = 'all', page = 1, limit = 20 } = request.query;
      const offset = (page - 1) * limit;
      const searchPattern = `%${q}%`;

      // 获取被拉黑用户列表（双向检查）
      let blockedUserIds = new Set();
      if (request.user) {
        const blockedUsersList = await db
          .select({
            blockedUserId: blockedUsers.blockedUserId,
            userId: blockedUsers.userId
          })
          .from(blockedUsers)
          .where(
            or(
              eq(blockedUsers.userId, request.user.id),
              eq(blockedUsers.blockedUserId, request.user.id)
            )
          );

        if (blockedUsersList.length > 0) {
          blockedUsersList.forEach(block => {
            if (block.userId === request.user.id) {
              blockedUserIds.add(block.blockedUserId);
            } else {
              blockedUserIds.add(block.userId);
            }
          });
        }
      }

      const results = {
        query: q,
        type,
        topics: {
          items: [],
          page,
          limit,
          total: 0
        },
        posts: {
          items: [],
          page,
          limit,
          total: 0
        },
        users: {
          items: [],
          page,
          limit,
          total: 0
        }
      };

    // 搜索话题
    if (type === 'all' || type === 'topics') {
      try {
        // 构建查询条件
        const topicsConditions = [
          eq(topics.isDeleted, false),
          ilike(topics.title, searchPattern)
        ];

        // 过滤被拉黑用户的话题
        if (blockedUserIds.size > 0) {
          topicsConditions.push(
            not(inArray(topics.userId, [...blockedUserIds]))
          );
        }

        // 获取总数
        const [countResult] = await db
          .select({ count: count() })
          .from(topics)
          .where(and(...topicsConditions));

        const topicsTotal = countResult?.count || 0;

        // 获取数据 - 分步构建查询
        const topicsData = await db
          .select()
          .from(topics)
          .innerJoin(categories, eq(topics.categoryId, categories.id))
          .innerJoin(users, eq(topics.userId, users.id))
          .where(and(...topicsConditions))
          .orderBy(desc(topics.createdAt))
          .limit(limit)
          .offset(offset);

        // 格式化数据
        results.topics.items = topicsData.map(row => ({
          id: row.topics.id,
          title: row.topics.title,
          slug: row.topics.slug,
          categoryId: row.topics.categoryId,
          categoryName: row.categories.name,
          categorySlug: row.categories.slug,
          userId: row.topics.userId,
          username: row.users.username,
          userAvatar: row.users.avatar,
          viewCount: row.topics.viewCount,
          postCount: row.topics.postCount,
          isPinned: row.topics.isPinned,
          isClosed: row.topics.isClosed,
          tags: row.topics.tags || [],
          lastPostAt: row.topics.lastPostAt,
          createdAt: row.topics.createdAt
        }));
        results.topics.total = topicsTotal;
      } catch (error) {
        request.log.error({ err: error, msg: 'Topics search failed' });
        // 保持空结果
      }
    }

    // 搜索帖子（排除话题内容，即 postNumber = 1 的帖子）
    if (type === 'all' || type === 'posts') {
      try {
        // 构建查询条件
        const postsConditions = [
          eq(posts.isDeleted, false),
          eq(topics.isDeleted, false),
          sql`${posts.postNumber} > 1`,  // 排除话题内容
          ilike(posts.content, searchPattern)
        ];

        // 过滤被拉黑用户的帖子
        if (blockedUserIds.size > 0) {
          postsConditions.push(
            not(inArray(posts.userId, [...blockedUserIds]))
          );
        }

        // 获取总数
        const [countResult] = await db
          .select({ count: count() })
          .from(posts)
          .innerJoin(topics, eq(posts.topicId, topics.id))
          .where(and(...postsConditions));

        const postsTotal = countResult?.count || 0;

        // 获取数据
        const postsData = await db
          .select()
          .from(posts)
          .innerJoin(topics, eq(posts.topicId, topics.id))
          .innerJoin(users, eq(posts.userId, users.id))
          .where(and(...postsConditions))
          .orderBy(desc(posts.createdAt))
          .limit(limit)
          .offset(offset);

        // 格式化数据并截取内容
        results.posts.items = postsData.map(row => ({
          id: row.posts.id,
          content: (row.posts.content || '').substring(0, 200),
          topicId: row.posts.topicId,
          topicTitle: row.topics.title,
          username: row.users.username,
          postNumber: row.posts.postNumber,
          createdAt: row.posts.createdAt
        }));
        results.posts.total = postsTotal;
      } catch (error) {
        request.log.error({ err: error, msg: 'Posts search failed' });
        // 保持空结果
      }
    }

    // 搜索用户
    if (type === 'all' || type === 'users') {
      // 构建查询条件
      const usersConditions = [
        or(
          ilike(users.username, searchPattern),
          ilike(users.name, searchPattern)
        )
      ];

      // 过滤被拉黑用户
      if (blockedUserIds.size > 0) {
        usersConditions.push(
          not(inArray(users.id, [...blockedUserIds]))
        );
      }

      // 获取总数
      const [countResult] = await db
        .select({ count: count() })
        .from(users)
        .where(and(...usersConditions));

      const usersTotal = countResult?.count || 0;

      // 获取数据
      const usersData = await db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          avatar: users.avatar,
          bio: users.bio
        })
        .from(users)
        .where(and(...usersConditions))
        .limit(limit)
        .offset(offset);

      results.users.items = usersData;
      results.users.total = usersTotal;
    }

    return results;
    } catch (error) {
      request.log.error(error);
      reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message,
        details: isDev ? error.stack : undefined
      });
    }
  });
}
