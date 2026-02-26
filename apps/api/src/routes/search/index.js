import { search } from '../../services/searchService.js';

export default async function searchRoutes(fastify, options) {
  // 搜索接口（单类型：topics / posts / users）
  fastify.get('/', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['search'],
      description: '搜索话题、帖子或用户（单类型搜索）',
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['topics', 'posts', 'users'], default: 'topics' },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 },
        },
      },
    },
  }, async (request) => {
    const { query: { q, type, page, limit }, user } = request;
    return search({ keyword: q, type, page, limit, userId: user?.id });
  });
}
