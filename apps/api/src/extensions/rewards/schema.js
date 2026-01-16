import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, topics, posts } from '../../db/schema.js';
import { DEFAULT_CURRENCY_CODE } from '../ledger/constants.js';

// ============ Common Fields (Duplicated to avoid circular dep) ============
const $id = integer('id').primaryKey().generatedAlwaysAsIdentity();

const $createdAt = timestamp('created_at', {
  withTimezone: true,
}).defaultNow();

const $updatedAt = timestamp('updated_at', {
  withTimezone: true,
})
  .defaultNow()
  .$onUpdate(() => new Date());

const $ts = {
  createdAt: $createdAt,
  updatedAt: $updatedAt,
};

const $defaults = {
  id: $id,
  ...$ts,
};

// ============ Rewards System Tables ============

// 用户签到/活跃记录表 (User Gamification Data)
export const userCheckIns = pgTable(
  'user_check_ins',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),
    lastCheckInDate: timestamp('last_check_in_date', { withTimezone: true }), // 最后签到日期
    checkInStreak: integer('check_in_streak').notNull().default(0), // 连续签到天数
  },
  (table) => [
    index('user_check_ins_user_idx').on(table.userId),
  ]
);

export const userCheckInsRelations = relations(userCheckIns, ({ one }) => ({
  user: one(users, {
    fields: [userCheckIns.userId],
    references: [users.id],
  }),
}));

// Note: Transactions are now handled by the Ledger system (sys_transactions).
// We keep postRewards for specific business logic tracking if needed, or rely on Ledger metadata.
// For now, we keep postRewards as a specific record of the "Act of Tipping" on a post.

// 帖子打赏记录表
export const postRewards = pgTable(
  'post_rewards',
  {
    ...$defaults,
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    fromUserId: integer('from_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    toUserId: integer('to_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(), // 打赏金额 (Credits)
    currency: varchar('currency', { length: 20 }).default(DEFAULT_CURRENCY_CODE), // 支持多币种打赏
    message: text('message'), // 打赏留言
  },
  (table) => [
    index('post_rewards_post_idx').on(table.postId),
    index('post_rewards_from_user_idx').on(table.fromUserId),
    index('post_rewards_to_user_idx').on(table.toUserId),
    index('post_rewards_created_at_idx').on(table.createdAt),
  ]
);

export const postRewardsRelations = relations(postRewards, ({ one }) => ({
  post: one(posts, {
    fields: [postRewards.postId],
    references: [posts.id],
  }),
  fromUser: one(users, {
    fields: [postRewards.fromUserId],
    references: [users.id],
    relationName: 'sentRewards',
  }),
  toUser: one(users, {
    fields: [postRewards.toUserId],
    references: [users.id],
    relationName: 'receivedRewards',
  }),
}));

