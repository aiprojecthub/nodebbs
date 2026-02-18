import {
  integer,
  pgTable,
  varchar,
  boolean,
  index,
  unique,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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

// ============ Emoji Groups (表情包分组) ============
export const emojiGroups = pgTable(
  'emoji_groups',
  {
    ...$defaults,
    name: varchar('name', { length: 50 }).notNull().unique(),
    slug: varchar('slug', { length: 50 }).notNull().unique(),
    order: integer('order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    size: integer('size'), // 默认显示尺寸，为空则使用前端默认值
  },
  (table) => [
    index('emoji_groups_slug_idx').on(table.slug),
    index('emoji_groups_order_idx').on(table.order),
    index('emoji_groups_is_active_idx').on(table.isActive),
  ]
);

export const emojiGroupsRelations = relations(emojiGroups, ({ many }) => ({
  emojis: many(emojis),
}));

// ============ Emojis (表情) ============
export const emojis = pgTable(
  'emojis',
  {
    ...$defaults,
    groupId: integer('group_id')
      .notNull()
      .references(() => emojiGroups.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 50 }).notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    order: integer('order').notNull().default(0),
  },
  (table) => [
    index('emojis_group_id_idx').on(table.groupId),
    index('emojis_code_idx').on(table.code),
    index('emojis_order_idx').on(table.order),
    unique('emojis_group_code_unique').on(table.groupId, table.code), // 联合唯一约束
  ]
);

export const emojisRelations = relations(emojis, ({ one }) => ({
  group: one(emojiGroups, {
    fields: [emojis.groupId],
    references: [emojiGroups.id],
  }),
}));
