import fp from 'fastify-plugin';
import db from '../db/index.js';
import { qrLoginRequests, users, moderationLogs } from '../db/schema.js';
import { and, eq, lt, sql } from 'drizzle-orm';
import { anonymizeUser } from '../services/user/index.js';
import { DELETION_COOLDOWN_MS } from '../constants/user.js';
import moderationLogService from '../services/moderationLogService.js';
import { EVENTS } from '../constants/events.js';

/**
 * 数据清理插件
 * 负责定期清理过期的临时数据
 */
async function cleanupPlugin(fastify, options) {
  const tasks = new Map();

  /**
   * 注册清理任务
   * @param {string} name 任务名称
   * @param {Function} taskFn 任务函数，需返回清理的记录数
   */
  function registerCleanupTask(name, taskFn) {
    if (tasks.has(name)) {
      fastify.log.warn(`[清理] 任务 ${name} 已注册，将覆盖原任务。`);
    }
    tasks.set(name, taskFn);
    fastify.log.debug(`[清理] 已注册任务: ${name}`);
  }

  /**
   * 执行所有清理任务
   */
  async function runAllTasks() {
    fastify.log.info(`[清理] 开始执行清理任务 (共 ${tasks.size} 个)...`);
    let totalCleaned = 0;

    for (const [name, taskFn] of tasks) {
      try {
        const count = await taskFn();
        if (count > 0) {
          fastify.log.info(`[清理] 任务 [${name}] 清理了 ${count} 条记录。`);
          totalCleaned += count;
        }
      } catch (err) {
        fastify.log.error(`[清理] 任务 [${name}] 执行出错:`, err);
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

  // 3. 到期注销用户自动匿名化
  registerCleanupTask('pending-deletion-users', async () => {
    const threshold = new Date(Date.now() - DELETION_COOLDOWN_MS);
    const expiredUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        name: users.name,
        deletionReason: users.deletionReason,
      })
      .from(users)
      .where(and(
        eq(users.isDeleted, true),
        sql`${users.deletionRequestedAt} IS NOT NULL`,
        lt(users.deletionRequestedAt, threshold)
      ));

    if (expiredUsers.length === 0) {
      return 0;
    }

    let processed = 0;
    for (const user of expiredUsers) {
      try {
        // 在匿名化之前记录审计日志
        await moderationLogService.log({
          action: 'anonymize',
          targetType: 'user',
          targetId: user.id,
          moderatorId: user.id, // 系统自动执行，记录用户自身 ID
          previousStatus: 'pending_deletion',
          newStatus: 'anonymized',
          reason: '30天冷静期到期，系统自动匿名化',
          metadata: {
            username: user.username,
            email: user.email,
            name: user.name,
            deletionReason: user.deletionReason,
          },
          ip: null,
          targetLabel: user.username,
        });

        await anonymizeUser(user.id);

        // 触发用户删除事件
        if (fastify.eventBus) {
          fastify.eventBus.emit(EVENTS.USER_DELETED, {
            userId: user.id,
            username: user.username,
          });
        }

        processed++;
      } catch (err) {
        fastify.log.error(`[清理] 匿名化用户 ${user.id} 失败:`, err);
      }
    }

    return processed;
  });

  // 4. 过期审核日志自动清理
  registerCleanupTask('moderation-logs-cleanup', async () => {
    const retentionDays = await fastify.settings.get('moderation_log_retention_days', 180);
    if (!retentionDays || retentionDays <= 0) {
      return 0; // 0 表示永不清理
    }

    const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(moderationLogs)
      .where(lt(moderationLogs.createdAt, threshold));

    return result.rowCount || 0;
  });

  // 启动定时任务 (每2小时)
  const interval = setInterval(runAllTasks, 2 * 60 * 60 * 1000);

  // 关闭时清除定时器
  fastify.addHook('onClose', async () => {
    clearInterval(interval);
  });

  fastify.log.info('[清理] 插件已注册');
}

export default fp(cleanupPlugin, {
  name: 'cleanup',
  dependencies: ['db', 'settings'],
});
