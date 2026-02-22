import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { createIPX, ipxFSStorage, createIPXNodeServer } from 'ipx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// 创建 IPX 实例，指定 uploads 目录为存储源 https://github.com/unjs/ipx
const ipx = createIPX({
  storage: ipxFSStorage({
    dir: uploadsDir,
  }),
});

// IPX 处理函数（基于 Express 风格，但兼容 Fastify）
const ipxHandler = createIPXNodeServer(ipx);

/**
 * 静态文件服务插件
 * 支持图片处理和静态资源服务
 */
async function staticPlugin(fastify, options) {
  const types = ['avatars', 'topics', 'badges', 'items', 'frames', 'emojis'].join('|');
  // 为每种上传类型注册 IPX 图片处理路由
  fastify.get(
    `/uploads/:modifiers/:type(${types})/*`,
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      // 关键：剥离 /uploads 前缀
      const cleanPath = request.url.replace(/^\/uploads/, '');

      // 修改请求的原始 URL，让 IPX 看到正确的路径
      const req = Object.create(request.raw);
      req.url = cleanPath;

      ipxHandler(req, reply.raw);
      return reply.hijack();
    }
  );

  // 保留原始静态文件服务（可选）
  fastify.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
  });
}

export default fp(staticPlugin, {
  name: 'static',
  dependencies: [],
});
