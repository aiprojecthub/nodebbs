import fp from 'fastify-plugin';
import emojiRoutes from './routes/index.js';

/**
 * 表情包扩展
 * 提供表情分组和管理功能。
 */
async function emojisPlugin(fastify, options) {
  // 注册路由
  fastify.register(emojiRoutes, { prefix: '/api/emojis' });

  fastify.log.info('[Emojis] 扩展已注册');
}

export default fp(emojisPlugin, {
  name: 'emojis',
  dependencies: [],
});
