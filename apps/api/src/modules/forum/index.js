import fp from 'fastify-plugin';
import path from 'node:path';
import AutoLoad from '@fastify/autoload';
import { sql } from 'drizzle-orm';
import { dirname } from '#core/utils/index.js';
import db from '#core/db/index.js';
import { notifications } from '#core/db/schema.js';
import { categories } from '#modules/forum/db/schema.js';
import { cleanupExpiredDraftPolls } from './services/pollService.js';
import {
  cleanupExpiredDraftLotteries,
  drawDueLotteries,
} from './services/lotteryService.js';
import { cleanupExpiredDraftAttachments } from './services/attachmentService.js';

const __dirname = dirname(import.meta.url);

/**
 * 论坛业务模块。
 *
 * 决策：投票/抽奖是论坛功能（与 topics 同住本模块），直接使用 topics。
 * 论坛表定义在 ./db/schema.js（由 core 的 src/db/schema.js 末尾 re-export 作为 drizzle 组合入口）。
 *
 * 自注册：
 *  - API 路由（topics / posts / categories / tags / search / polls / lotteries），统一 /api 前缀。
 *  - 清理任务（草稿投票/抽奖、到期开奖、孤儿通知）注册到 core 的 fastify.cleanup 调度器——
 *    依赖反转：core 不再 import 任何论坛服务。
 */
async function forumModule(fastify, opts) {
  // 论坛清理任务自注册到核心调度器
  if (fastify.cleanup) {
    fastify.cleanup.registerTask('expired-draft-polls', () => cleanupExpiredDraftPolls());
    fastify.cleanup.registerTask('draw-due-lotteries', () =>
      fastify.ledger ? drawDueLotteries(fastify.ledger) : 0
    );
    fastify.cleanup.registerTask('expired-draft-lotteries', () =>
      fastify.ledger ? cleanupExpiredDraftLotteries(fastify.ledger) : 0
    );
    // 未绑话题的附件草稿超时回收，连同存储对象一起删，避免孤儿文件长期占空间
    fastify.cleanup.registerTask('expired-draft-attachments', () =>
      cleanupExpiredDraftAttachments(fastify.storage)
    );
    // 论坛内容（topics/posts）永久删除后，notifications 已无 FK 级联（schema 拆分时解除耦合），
    // 此任务清理指向已不存在内容的孤儿通知，替代原数据库级 ON DELETE CASCADE。
    fastify.cleanup.registerTask('orphan-content-notifications', async () => {
      const res = await db.delete(notifications).where(sql`
        (${notifications.topicId} IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM topics WHERE topics.id = ${notifications.topicId}))
        OR (${notifications.postId} IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM posts WHERE posts.id = ${notifications.postId}))
      `);
      return res.rowCount ?? 0;
    });
  }

  // RBAC「分类作用域」解析器自注册：父分类 → 含子分类的全集（向下继承）。
  // 让 core 的 permissionService 无需直接查询论坛 categories 表。
  if (fastify.setCategoryScopeResolver) {
    fastify.setCategoryScopeResolver(async (parentIds) => {
      if (!parentIds || parentIds.length === 0) return new Set();
      const allCats = await db
        .select({ id: categories.id, parentId: categories.parentId })
        .from(categories);
      const expanded = new Set(parentIds);
      const addChildren = (pid) => {
        for (const c of allCats) {
          if (c.parentId === pid && !expanded.has(c.id)) {
            expanded.add(c.id);
            addChildren(c.id);
          }
        }
      };
      for (const id of parentIds) addChildren(id);
      return expanded;
    });
  }

  // 论坛 API 路由
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({ prefix: '/api' }, opts),
  });
}

export default fp(forumModule, {
  name: 'forum-module',
  // cleanup / rbac 提供注册 API；db/认证/权限/账本/存储由 plugins+extensions 先行注册
  dependencies: ['db', 'cleanup', 'rbac'],
});
