import fp from 'fastify-plugin';
import db from '../db/index.js';
import { qrLoginRequests } from '../db/schema.js';
import { lt } from 'drizzle-orm';

/**
 * 数据清理插件
 * 负责定期清理过期的临时数据
 */
export default fp(async function (fastify, opts) {
  const tasks = new Map();

  /**
   * 注册清理任务
   * @param {string} name 任务名称
   * @param {Function} taskFn 任务函数，需返回清理的记录数
   */
  function registerCleanupTask(name, taskFn) {
    if (tasks.has(name)) {
      fastify.log.warn(`Cleanup task ${name} already registered, overwriting.`);
    }
    tasks.set(name, taskFn);
    fastify.log.debug(`已注册清理任务: ${name}`);
  }

  /**
   * 执行所有清理任务
   */
  async function runAllTasks() {
    fastify.log.info(`Starting cleanup tasks (${tasks.size} tasks)...`);
    let totalCleaned = 0;

    for (const [name, taskFn] of tasks) {
      try {
        const count = await taskFn();
        if (count > 0) {
          fastify.log.info(`Task [${name}] cleaned ${count} items.`);
          totalCleaned += count;
        }
      } catch (err) {
        fastify.log.error(`Error in cleanup task [${name}]:`, err);
      }
    }
    
    return totalCleaned;
  }

  // 1. 注册核心 API (使用命名空间)
  fastify.decorate('cleanup', {
    registerTask: registerCleanupTask,
    run: runAllTasks
  });

  // 2. 注册默认的 QR 清理任务
  registerCleanupTask('qr-login-requests', async () => {
    try {
      const result = await db
        .delete(qrLoginRequests)
        .where(lt(qrLoginRequests.expiresAt, new Date()));
      return result.rowCount;
    } catch (err) {
      throw err; // 让运行器捕获错误
    }
  });



  // 启动定时任务 (每2小时)
  const interval = setInterval(runAllTasks, 2 * 60 * 60 * 1000);

  // 关闭时清除定时器
  fastify.addHook('onClose', async () => {
    clearInterval(interval);
  });

  fastify.log.info('清理插件已注册到任务调度器');
}, {
  name: 'cleanup-plugin'
});
