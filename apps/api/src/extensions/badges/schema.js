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
import { users } from '../../db/schema.js';
import { $defaults } from '../../db/columns.js';

// 勋章定义表
export const badges = pgTable(
  'badges',
  {
    ...$defaults,
    slug: varchar('slug', { length: 50 }).notNull().unique(), // 唯一标识符，用于代码引用 (例如 'early_adopter', 'top_contributor')
    name: varchar('name', { length: 100 }).notNull(), // 勋章名称
    description: text('description'), // 勋章描述
    iconUrl: varchar('icon_url', { length: 500 }).notNull(), // 图标URL
    
    // 规则与逻辑
    category: varchar('category', { length: 50 }).notNull().default('achievement'), // 'achievement' (成就), 'event' (活动), 'manual' (手动发/购买)
    unlockCondition: text('unlock_condition'), 
    // JSON 格式的解锁/获取条件。
    // 支持的类型:
    // 1. post_count: 发帖数 {"type": "post_count", "threshold": 100}
    // 2. topic_count: 话题数 {"type": "topic_count", "threshold": 50}
    // 3. like_received_count: 获赞数 {"type": "like_received_count", "threshold": 500}
    // 4. checkin_streak: 连续签到天数 {"type": "checkin_streak", "threshold": 30}
    // 5. registration_days: 注册天数 {"type": "registration_days", "threshold": 365}
    // 6. manual: 人工/系统颁发 {"type": "manual"}
    
    
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    metadata: text('metadata'), // 额外的 JSON 元数据
  },
  (table) => [
    index('badges_slug_idx').on(table.slug),
    index('badges_category_idx').on(table.category),
    index('badges_is_active_idx').on(table.isActive),
    index('badges_display_order_idx').on(table.displayOrder),
  ]
);

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

// 用户勋章拥有表
export const userBadges = pgTable(
  'user_badges',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeId: integer('badge_id')
      .notNull()
      .references(() => badges.id, { onDelete: 'cascade' }),
    
    earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow(), // 获得时间
    source: varchar('source', { length: 50 }), // 来源：'system_grant', 'shop_buy', 'admin_grant'
    
    isDisplayed: boolean('is_displayed').notNull().default(true), // 用户是否选择展示
    displayOrder: integer('display_order').notNull().default(0), // 用户自定义展示顺序
  },
  (table) => [
    index('user_badges_user_idx').on(table.userId),
    index('user_badges_badge_idx').on(table.badgeId),
    index('user_badges_earned_at_idx').on(table.earnedAt),
  ]
);

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));
