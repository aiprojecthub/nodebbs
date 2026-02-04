import { readFile } from 'fs/promises';
import { join } from 'path';
import { dirname } from '../utils/index.js';
import db from '../db/index.js';
import { topics, posts, users } from '../db/schema.js';
import { sql, gte, eq, and, ne, count } from 'drizzle-orm';

const __dirname = dirname(import.meta.url);
const pkg = JSON.parse(
  await readFile(join(__dirname, '../../package.json'), 'utf-8')
);

export default async function rootRoutes(fastify, options) {
  // 健康检查
  fastify.get(
    '/',
    {
      schema: {
        tags: ['system'],
        description: '健康检查端点',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
              version: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return {
        status: 'ok',
        service: 'Nodebbs API',
        version: pkg.version,
        timestamp: new Date().toISOString(),
      };
    }
  );

  // 论坛统计
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['system'],
        description: '获取论坛统计',
        response: {
          200: {
            type: 'object',
            properties: {
              totalTopics: { type: 'number' },
              totalPosts: { type: 'number' },
              totalUsers: { type: 'number' },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      // 获取话题总数（不含已删除）
      const [{ count: totalTopics }] = await db
        .select({ count: count() })
        .from(topics)
        .where(eq(topics.isDeleted, false));

      // 获取帖子总数（不含已删除）
      const [{ count: totalPosts }] = await db
        .select({ count: count() })
        .from(posts)
        .where(and(eq(posts.isDeleted, false), ne(posts.postNumber, 1)));

      // 获取用户总数（不含已删除）
      const [{ count: totalUsers }] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isDeleted, false));

      // 从在线追踪插件获取在线用户数（如可用）
      const onlineStats = await fastify.getOnlineStats();

      return {
        totalTopics,
        totalPosts,
        totalUsers,
        online: onlineStats,
      };
    }
  );
}
