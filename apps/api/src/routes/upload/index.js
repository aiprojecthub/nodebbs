import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { dirname } from '../../utils/index.js';
import { MAX_UPLOAD_SIZE_DEFAULT_KB, DEFAULT_ALLOWED_EXTENSIONS, EXT_MIME_MAP } from '../../constants/upload.js';
import { files } from '../../db/schema.js';

export default async function uploadRoutes(fastify) {
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['upload'],
      description: '上传文件',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['assets', 'avatars', 'badges', 'topics', 'items', 'frames', 'emojis'],
            default: 'assets'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            url: { type: 'string' },
            filename: { type: 'string' },
            originalName: { type: 'string' },
            mimetype: { type: 'string' },
            category: { type: 'string' },
            size: { type: 'number' },
            width: { type: ['integer', 'null'] },
            height: { type: ['integer', 'null'] }
          }
        }
      }
    }
  }, async (request, reply) => {
    const category = request.query.category || 'assets';

    // 1. 验证权限并获取条件限制（包含频率限制、账号时长等检查）
    // 注意：此调用会触发 Rate Limit 计数增加
    let conditions = {};
    try {
      const result = await fastify.permission.check(request, `upload.${category}`);
      conditions = result.conditions || {};
    } catch (err) {
      return reply.code(403).send({ error: err.message });
    }

    // 2. 获取具体限制数值（从 RBAC 条件中读取或使用合理的后备默认值）
    const maxFileSizeKB = conditions.maxFileSize || MAX_UPLOAD_SIZE_DEFAULT_KB;
    // allowedFileTypes: ['*'] 表示无限制（如管理员），未设置则使用默认白名单
    const rawAllowedTypes = conditions.allowedFileTypes;
    const allowedExts = rawAllowedTypes?.includes('*')
      ? null  // ['*'] 表示无限制
      : (rawAllowedTypes || DEFAULT_ALLOWED_EXTENSIONS);

    // 3. 处理文件流
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: '请选择要上传的文件' });
    }

    // 4. 验证文件后缀
    const ext = path.extname(data.filename).toLowerCase().replace('.', '');
    if (!ext) {
      return reply.code(400).send({ error: '文件必须包含扩展名' });
    }
    // 如果 allowedExts 不为 null，则进行白名单校验
    if (allowedExts && !allowedExts.includes(ext)) {
      return reply.code(400).send({ error: `不支持的文件类型，允许：${allowedExts.join(', ')}` });
    }

    // 4b. 验证 MIME 类型一致性 (双重校验，防止伪装绕过)
    const expectedMimes = EXT_MIME_MAP[ext];
    if (expectedMimes && !expectedMimes.includes(data.mimetype)) {
      fastify.log.warn(`文件上传伪装尝试：ext=${ext}, mimetype=${data.mimetype}, user=${request.user.id}`);
      return reply.code(400).send({ error: '文件内容与后缀不匹配，请上传正确的图片文件' });
    }

    // 5. 生成唯一文件名
    const filename = `${randomUUID()}.${ext}`;

    // 6. 确保上传子目录存在
    const __dirname = dirname(import.meta.url);
    const uploadDir = path.join(__dirname, '../../../uploads', category);
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);

    // 7. 保存文件并实施流式大小实时监控（Fusing 熔断机制）
    let byteCount = 0;
    const maxSizeBytes = maxFileSizeKB * 1024;
    const writeStream = fs.createWriteStream(filepath);

    try {
      // 使用 Transform 流进行流量监控（避免双重消费流）
      const monitor = new Transform({
        transform(chunk, encoding, callback) {
          byteCount += chunk.length;
          if (byteCount > maxSizeBytes) {
            const err = new Error('FILE_TOO_LARGE');
            err.code = 'FILE_TOO_LARGE';
            return callback(err);
          }
          callback(null, chunk);
        }
      });

      await pipeline(data.file, monitor, writeStream);
    } catch (err) {
      // 捕获异常并清理可能已创建的部分文件
      try {
        await fs.promises.unlink(filepath);
      } catch (e) {
        // Ignore if file doesn't exist
      }

      if (err.code === 'FILE_TOO_LARGE') {
        const readableLimit = maxFileSizeKB >= 1024 ? (maxFileSizeKB / 1024).toFixed(1) + 'MB' : maxFileSizeKB + 'KB';
        return reply.code(400).send({ error: `文件大小超过限制，当前等级最大允许 ${readableLimit}` });
      }

      if (err.code === 'FST_PART_FILE_SIZE_EXCEEDED' || err.code === 'FST_REQ_FILE_TOO_LARGE') {
        return reply.code(400).send({ error: '文件大小超过服务器全局限制' });
      }

      fastify.log.error('File upload error:', err);
      return reply.code(500).send({ error: '文件上传失败' });
    }

    // 8. 提取图片元数据（宽高）
    let width = null;
    let height = null;
    if (data.mimetype.startsWith('image/') && !['image/svg+xml'].includes(data.mimetype)) {
      try {
        const imageMetadata = await sharp(filepath).metadata();
        width = imageMetadata.width || null;
        height = imageMetadata.height || null;
      } catch (err) {
        fastify.log.warn('Failed to extract image metadata:', err.message);
      }
    }

    // 9. 保存文件记录到数据库
    const url = `/uploads/${category}/${filename}`;
    const [file] = await fastify.db.insert(files).values({
      userId: request.user.id,
      filename,
      originalName: data.filename,
      url,
      category,
      mimetype: data.mimetype,
      size: byteCount,
      width,
      height,
    }).returning();

    // 10. 返回访问 URL 和文件元数据
    return {
      id: file.id,
      url,
      filename,
      originalName: data.filename,
      mimetype: data.mimetype,
      category,
      size: byteCount,
      width,
      height,
    };
  });
}
