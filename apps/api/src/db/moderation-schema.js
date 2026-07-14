/**
 * 通用内容审核 schema（P1）。
 *
 * 控制面：moderation_items 为全站统一审核队列（单一队列 / 审核台 / 审计 / 扩展点）。
 * 数据面：话题/回复仍保留各自 approval_status 列作为可见性冗余投影，读路径不变；
 *          审核动作在事务内同时更新队列项与业务行状态。
 *
 * 依赖方向：db/moderation → core（仅引用 users 表与公共列）。与 rbac-schema.js 同款循环安全：
 *   本文件在 schema.js 末尾被 `export *`，users 已先定义，且此处仅在 references()/relations 内惰性引用。
 */
import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './schema.js';
import { $defaults } from './columns.js';

// ============ Moderation Items (通用审核队列) ============
export const moderationItems = pgTable(
  'moderation_items',
  {
    ...$defaults,
    // 目标类型：P1 = 'topic' | 'post'；后续扩展 'user_name' | 'user_avatar' | 'user_bio' | 'username' | 'reward_message' ...
    targetType: varchar('target_type', { length: 40 }).notNull(),
    // 业务行 ID（topic.id / post.id / user.id / postReward.id ...）
    targetId: integer('target_id').notNull(),
    // 字段级暂存类型使用（P2：'name' | 'avatar' | 'bio' | 'username'）；行门禁类为 null
    field: varchar('field', { length: 40 }),
    // 提交者（内容作者）
    submittedBy: integer('submitted_by').references(() => users.id, {
      onDelete: 'cascade',
    }),
    // 审核状态
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | approved | rejected
    // 暂存新值（P2 字段级审核用；P1 行门禁类为 null）
    payload: jsonb('payload'),
    // 审核台展示快照（标题 / 摘要 / 作者名等），减少对业务表的实时依赖
    snapshot: jsonb('snapshot'),
    // 驳回备注 / 处理说明
    reason: text('reason'),
    // 审核人
    reviewedBy: integer('reviewed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  },
  (table) => [
    index('moderation_items_status_idx').on(table.status),
    index('moderation_items_target_idx').on(table.targetType, table.targetId),
    index('moderation_items_submitted_by_idx').on(table.submittedBy),
    index('moderation_items_created_at_idx').on(table.createdAt),
  ]
);
