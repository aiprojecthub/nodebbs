import { eq, desc, and, like, sql } from 'drizzle-orm';
import { files, users } from '../../db/schema.js';

export default async function filesRoutes(fastify) {
  // 获取文件列表（管理员）
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['files'],
      description: '获取文件列表（管理员）',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          category: { type: 'string' },
          type: { type: 'string', enum: ['image', 'video', 'audio', 'other'] },
          search: { type: 'string' },
          userId: { type: 'integer' },
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  url: { type: 'string' },
                  filename: { type: 'string' },
                  originalName: { type: ['string', 'null'] },
                  category: { type: 'string' },
                  mimetype: { type: 'string' },
                  size: { type: 'integer' },
                  width: { type: ['integer', 'null'] },
                  height: { type: ['integer', 'null'] },
                  createdAt: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      username: { type: 'string' },
                      avatar: { type: ['string', 'null'] },
                    }
                  }
                }
              }
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          }
        }
      }
    }
  }, async (request, reply) => {
    // 权限检查
    try {
      await fastify.permission.check(request, 'dashboard.files');
    } catch (err) {
      return reply.code(403).send({ error: err.message });
    }

    const { page = 1, limit = 20, category, type, search, userId } = request.query;
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions = [];
    if (category) {
      conditions.push(eq(files.category, category));
    }
    if (userId) {
      conditions.push(eq(files.userId, userId));
    }
    if (search) {
      conditions.push(like(files.originalName, `%${search}%`));
    }
    // MIME 类型筛选
    if (type) {
      const mimePrefix = {
        image: 'image/%',
        video: 'video/%',
        audio: 'audio/%',
      };
      if (mimePrefix[type]) {
        conditions.push(like(files.mimetype, mimePrefix[type]));
      } else if (type === 'other') {
        // 非图片、视频、音频的其他文件
        conditions.push(sql`${files.mimetype} NOT LIKE 'image/%' AND ${files.mimetype} NOT LIKE 'video/%' AND ${files.mimetype} NOT LIKE 'audio/%'`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 查询文件列表
    const items = await fastify.db
      .select({
        id: files.id,
        url: files.url,
        filename: files.filename,
        originalName: files.originalName,
        category: files.category,
        mimetype: files.mimetype,
        size: files.size,
        width: files.width,
        height: files.height,
        createdAt: files.createdAt,
        user: {
          id: users.id,
          username: users.username,
          avatar: users.avatar,
        }
      })
      .from(files)
      .leftJoin(users, eq(files.userId, users.id))
      .where(whereClause)
      .orderBy(desc(files.createdAt))
      .limit(limit)
      .offset(offset);

    // 查询总数
    const [{ count }] = await fastify.db
      .select({ count: sql`count(*)::int` })
      .from(files)
      .where(whereClause);

    return {
      items,
      total: count,
      page,
      limit,
    };
  });

  // 删除文件（管理员）
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['files'],
      description: '删除文件（管理员）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    // 权限检查
    try {
      await fastify.permission.check(request, 'dashboard.files');
    } catch (err) {
      return reply.code(403).send({ error: err.message });
    }

    const { id } = request.params;

    // 查询文件记录
    const [file] = await fastify.db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);

    if (!file) {
      return reply.code(404).send({ error: '文件不存在' });
    }

    // 删除物理文件（根据 provider 分派）
    const fileProvider = file.provider || 'local';
    try {
      const storageKey = `${file.category}/${file.filename}`;
      await fastify.storage.delete(storageKey, fileProvider);
    } catch (err) {
      // 文件可能已经不存在，或 provider 不可用，记录日志但继续删除数据库记录
      fastify.log.warn(`Failed to delete file from ${fileProvider}: ${file.filename}`, err.message);
    }

    // 删除数据库记录
    await fastify.db.delete(files).where(eq(files.id, id));

    return {
      success: true,
      message: '文件已删除'
    };
  });
}
