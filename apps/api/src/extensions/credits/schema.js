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

// ============ Credit System Tables ============

// 用户积分账户表
export const userCredits = pgTable(
  'user_credits',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),
    balance: integer('balance').notNull().default(0), // 当前余额
    totalEarned: integer('total_earned').notNull().default(0), // 累计获得
    totalSpent: integer('total_spent').notNull().default(0), // 累计消费
    lastCheckInDate: timestamp('last_check_in_date', { withTimezone: true }), // 最后签到日期
    checkInStreak: integer('check_in_streak').notNull().default(0), // 连续签到天数
  },
  (table) => [
    index('user_credits_user_idx').on(table.userId),
    index('user_credits_balance_idx').on(table.balance),
  ]
);

export const userCreditsRelations = relations(userCredits, ({ one }) => ({
  user: one(users, {
    fields: [userCredits.userId],
    references: [users.id],
  }),
}));

// 积分交易记录表
export const creditTransactions = pgTable(
  'credit_transactions',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(), // 正数=获得，负数=消费
    balance: integer('balance').notNull(), // 交易后余额
    type: varchar('type', { length: 50 }).notNull(), // 交易类型
    relatedUserId: integer('related_user_id').references(() => users.id, {
      onDelete: 'set null',
    }), // 关联用户（如打赏对象）
    relatedTopicId: integer('related_topic_id').references(() => topics.id, {
      onDelete: 'set null',
    }), // 关联话题
    relatedPostId: integer('related_post_id').references(() => posts.id, {
      onDelete: 'set null',
    }), // 关联帖子
    relatedItemId: integer('related_item_id'), // 关联商品ID（头像框/勋章）
    description: text('description'), // 交易描述
    metadata: text('metadata'), // JSON格式的额外数据
  },
  (table) => [
    index('credit_transactions_user_idx').on(table.userId),
    index('credit_transactions_type_idx').on(table.type),
    index('credit_transactions_created_at_idx').on(table.createdAt),
  ]
);

export const creditTransactionsRelations = relations(
  creditTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [creditTransactions.userId],
      references: [users.id],
    }),
    relatedUser: one(users, {
      fields: [creditTransactions.relatedUserId],
      references: [users.id],
      relationName: 'relatedTransactions',
    }),
    relatedTopic: one(topics, {
      fields: [creditTransactions.relatedTopicId],
      references: [topics.id],
    }),
    relatedPost: one(posts, {
      fields: [creditTransactions.relatedPostId],
      references: [posts.id],
    }),
  })
);

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
    amount: integer('amount').notNull(), // 打赏金额
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



// 积分系统配置表
export const creditSystemConfig = pgTable(
  'credit_system_config',
  {
    ...$defaults,
    key: varchar('key', { length: 100 }).notNull().unique(),
    value: text('value').notNull(),
    valueType: varchar('value_type', { length: 20 }).notNull(), // 'number', 'boolean', 'string'
    description: text('description'),
    category: varchar('category', { length: 50 }).notNull(), // 'earning', 'spending', 'general'
  },
  (table) => [
    index('credit_system_config_key_idx').on(table.key),
    index('credit_system_config_category_idx').on(table.category),
  ]
);

export const creditSystemConfigRelations = relations(
  creditSystemConfig,
  () => ({})
);
