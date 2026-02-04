import fp from 'fastify-plugin';
import db, { pool } from '../db/index.js';

/**
 * 数据库连接管理插件
 * 
 * 职责：
 * 1. 将 Drizzle 实例挂载到 fastify.db
 * 2. 注册关闭钩子，在服务停止时优雅关闭数据库连接池
 */
async function dbPlugin(fastify, options) {
  // 检查数据库连接
  try {
    const client = await pool.connect();
    client.release();
    fastify.log.info('✅ 数据库连接成功');
  } catch (err) {
    fastify.log.error('❌ Database connection failed:', err);
    throw err;
  }

  // 挂载 db 实例
  fastify.decorate('db', db);

  // 注册关闭钩子
  fastify.addHook('onClose', async (instance) => {
    instance.log.info('正在关闭数据库连接池...');
    await pool.end();
    instance.log.info('数据库连接池已关闭');
  });
}

export default fp(dbPlugin, {
  name: 'db',
  dependencies: []
});
