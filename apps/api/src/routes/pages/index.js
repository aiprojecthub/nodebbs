import {
  PAGE_TYPES,
  createPage,
  deletePage,
  getAdminPageById,
  getPageBySlug,
  listAdminPages,
  updatePage,
} from '../../services/pageService.js';

export default async function pageRoutes(fastify) {
  fastify.get('/admin', {
    preHandler: [fastify.requirePermission('dashboard.pages')],
    schema: {
      tags: ['pages', 'admin'],
      description: '获取页面管理列表（仅管理员）',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          search: { type: 'string' },
          type: { type: 'string', enum: PAGE_TYPES },
          status: { type: 'string', enum: ['published', 'draft'] },
        },
      },
    },
  }, async (request, reply) => {
    try {
      return await listAdminPages(request.query);
    } catch (error) {
      fastify.log.error(error, '[页面] 获取页面列表失败');
      return reply.code(500).send({ error: '获取页面列表失败' });
    }
  });

  fastify.get('/admin/:id', {
    preHandler: [fastify.requirePermission('dashboard.pages')],
    schema: {
      tags: ['pages', 'admin'],
      description: '获取单个页面（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const page = await getAdminPageById(request.params.id);

      if (!page) {
        return reply.code(404).send({ error: '页面不存在' });
      }

      return page;
    } catch (error) {
      fastify.log.error(error, '[页面] 获取页面详情失败');
      return reply.code(500).send({ error: '获取页面详情失败' });
    }
  });

  fastify.post('/admin', {
    preHandler: [fastify.requirePermission('dashboard.pages')],
    schema: {
      tags: ['pages', 'admin'],
      description: '创建页面（仅管理员）',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['title', 'slug', 'type', 'content'],
        properties: {
          title: { type: 'string', maxLength: 255 },
          slug: { type: 'string', maxLength: 500 },
          type: { type: 'string', enum: PAGE_TYPES },
          content: { type: 'string' },
          isPublished: { type: 'boolean' },
          standalone: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      return await createPage(request.body);
    } catch (error) {
      fastify.log.error(error, '[页面] 创建页面失败');
      return reply.code(400).send({ error: error.message || '创建页面失败' });
    }
  });

  fastify.patch('/admin/:id', {
    preHandler: [fastify.requirePermission('dashboard.pages')],
    schema: {
      tags: ['pages', 'admin'],
      description: '更新页面（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 255 },
          slug: { type: 'string', maxLength: 500 },
          type: { type: 'string', enum: PAGE_TYPES },
          content: { type: 'string' },
          isPublished: { type: 'boolean' },
          standalone: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const page = await updatePage(request.params.id, request.body);

      if (!page) {
        return reply.code(404).send({ error: '页面不存在' });
      }

      return page;
    } catch (error) {
      fastify.log.error(error, '[页面] 更新页面失败');
      return reply.code(400).send({ error: error.message || '更新页面失败' });
    }
  });

  fastify.delete('/admin/:id', {
    preHandler: [fastify.requirePermission('dashboard.pages')],
    schema: {
      tags: ['pages', 'admin'],
      description: '删除页面（仅管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const page = await deletePage(request.params.id);

      if (!page) {
        return reply.code(404).send({ error: '页面不存在' });
      }

      return { success: true };
    } catch (error) {
      fastify.log.error(error, '[页面] 删除页面失败');
      return reply.code(500).send({ error: '删除页面失败' });
    }
  });

  fastify.get('/*', {
    preHandler: [fastify.optionalAuth],
    schema: {
      tags: ['pages'],
      description: '按 slug 获取公开页面',
    },
  }, async (request, reply) => {
    try {
      const slug = request.params['*'];
      const page = await getPageBySlug(slug);

      if (!page) {
        return reply.code(404).send({ error: '页面不存在' });
      }

      if (!page.isPublished) {
        const canManagePages = await fastify.permission.can(request, 'dashboard.pages');

        if (!canManagePages) {
          return reply.code(404).send({ error: '页面不存在' });
        }
      }

      return page;
    } catch (error) {
      fastify.log.error(error, '[页面] 获取公开页面失败');
      return reply.code(500).send({ error: '获取页面失败' });
    }
  });
}
