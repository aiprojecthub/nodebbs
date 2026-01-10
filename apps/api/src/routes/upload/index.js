import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { getSetting } from '../../utils/settings.js';
import { dirname } from '../../utils/index.js';

export default async function uploadRoutes(fastify) {
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['upload'],
      description: '上传文件（仅限允许的角色）',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { 
            type: 'string', 
            enum: ['common', 'avatar', 'badge', 'topic', 'item', 'frame', 'site'],
            default: 'common'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            filename: { type: 'string' },
            mimetype: { type: 'string' },
            type: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    // 1. Check permissions
    const allowedRoles = await getSetting('upload_allowed_roles', ['admin', 'moderator', 'vip']);
    if (!allowedRoles.includes(request.user.role)) {
      return reply.code(403).send({ error: '您没有上传文件的权限' });
    }

    const uploadType = request.query.type || 'common';

    // 2. Process file
    const data = await request.file();
    
    if (!data) {
      return reply.code(400).send({ error: '请选择要上传的文件' });
    }

    // Validate mime type (images only)
    const allowedMimeTypes = [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/svg+xml',           // SVG 格式（站点 Logo）
      'image/x-icon',            // ICO 格式（Favicon）
      'image/vnd.microsoft.icon' // ICO 的另一种 MIME 类型
    ];
    if (!allowedMimeTypes.includes(data.mimetype)) {
      return reply.code(400).send({ error: '仅支持上传图片格式 (jpg, png, gif, webp, svg, ico)' });
    }

    // Generate unique filename
    const ext = path.extname(data.filename).toLowerCase() || '.jpg';
    const filename = `${randomUUID()}${ext}`;
    
    // Ensure upload directory exists
    const __dirname = dirname(import.meta.url);
    const uploadDir = path.join(__dirname, '../../../uploads', uploadType);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);

    // Save file
    try {
      await pipeline(data.file, fs.createWriteStream(filepath));

      // 验证文件大小 (最大 5MB)
      const maxSize = 5 * 1024 * 1024;
      const stats = fs.statSync(filepath);
      if (stats.size > maxSize) {
        fs.unlinkSync(filepath);
        return reply.code(400).send({ error: '文件大小超过 5MB 限制' });
      }
    } catch (err) {
      // 如果已创建文件则清理
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      
      if (err.code === 'FST_PART_FILE_SIZE_EXCEEDED') {
        return reply.code(400).send({ error: '文件大小超过限制' });
      }

      fastify.log.error('File save error:', err);
      return reply.code(500).send({ error: '文件保存失败' });
    }

    // Return URL
    const url = `/uploads/${uploadType}/${filename}`;

    return {
      url,
      filename,
      mimetype: data.mimetype,
      type: uploadType
    };
  });
}
