import { eq, desc, and, like, sql } from 'drizzle-orm';
import { files, users } from '../../db/schema.js';

// 可内联渲染的 MIME 白名单。刻意不含 image/svg+xml —— SVG 可携带脚本，
// 内联渲染等于在同源下执行用户上传的内容。
const INLINE_SAFE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
];

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
                  provider: { type: ['string', 'null'] },
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
    } catch (error) {
      return reply.code(403).send({ error: error.message });
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
        provider: files.provider,
        createdAt: files.createdAt,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
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

  // 读取文件原始内容（管理员）
  //
  // 附件（category='attachments'）不经公开的 /uploads 路径（plugins/static.js 已拦截），
  // 后台的预览与下载必须走本路由鉴权后出内容。其余分类虽然公开可访问，
  // 也一并支持，便于前端统一取用。
  fastify.get('/:id/raw', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['files'],
      description: '读取文件原始内容（管理员，用于后台预览/下载）',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          disposition: { type: 'string', enum: ['inline', 'attachment'], default: 'inline' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      await fastify.permission.check(request, 'dashboard.files');
    } catch (error) {
      return reply.code(403).send({ error: error.message });
    }

    const { id } = request.params;

    const [file] = await fastify.db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);

    if (!file) {
      return reply.code(404).send({ error: '文件不存在' });
    }

    const storageKey = `${file.category}/${file.filename}`;
    let stored;
    try {
      stored = await fastify.storage.getDownloadStream(storageKey, file.provider || 'local');
    } catch (error) {
      fastify.log.error({ err: error }, `读取文件失败: ${file.filename}`);
      return reply.code(404).send({ error: '文件内容不存在' });
    }

    const downloadName = file.originalName || file.filename;
    // 只有确认安全的图片类型才按原 MIME 内联渲染。其余（含 svg/html）一律
    // 以二进制附件下发——内联渲染用户上传的内容等于在同源下执行它。
    const inlineSafe = INLINE_SAFE_MIMES.includes(file.mimetype);
    const wantInline = request.query.disposition !== 'attachment' && inlineSafe;

    reply
      .header('Content-Type', wantInline ? file.mimetype : 'application/octet-stream')
      .header(
        'Content-Disposition',
        wantInline
          ? 'inline'
          : `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`
      )
      .header('X-Content-Type-Options', 'nosniff')
      .header('Content-Security-Policy', "default-src 'none'; sandbox")
      .header('Cache-Control', 'private, no-store');

    if (stored.size) {
      reply.header('Content-Length', stored.size);
    }

    return reply.send(stored.stream);
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
    } catch (error) {
      return reply.code(403).send({ error: error.message });
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
    } catch (error) {
      // 文件可能已经不存在，或 provider 不可用，记录日志但继续删除数据库记录
      fastify.log.warn({ err: error }, `Failed to delete file from ${fileProvider}: ${file.filename}`);
    }

    // 删除数据库记录
    await fastify.db.delete(files).where(eq(files.id, id));

    return {
      success: true,
      message: '文件已删除'
    };
  });
}
