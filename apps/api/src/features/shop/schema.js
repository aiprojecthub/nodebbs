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

// 商城商品表
export const shopItems = pgTable(
  'shop_items',
  {
    ...$defaults,
    type: varchar('type', { length: 20 }).notNull(), // 'avatar_frame', 'custom'
    name: varchar('name', { length: 100 }).notNull(), // 商品名称
    description: text('description'), // 商品描述
    price: integer('price').notNull(), // 价格（积分）
    imageUrl: varchar('image_url', { length: 500 }), // 商品图片
    stock: integer('stock'), // 库存（null=无限）
    isActive: boolean('is_active').notNull().default(true), // 是否上架
    metadata: text('metadata'), // JSON格式的商品数据（如CSS样式）
    displayOrder: integer('display_order').notNull().default(0), // 排序
  },
  (table) => [
    index('shop_items_type_idx').on(table.type),
    index('shop_items_is_active_idx').on(table.isActive),
    index('shop_items_display_order_idx').on(table.displayOrder),
  ]
);

export const shopItemsRelations = relations(shopItems, ({ many }) => ({
  userItems: many(userItems),
}));

// 用户商品拥有表
export const userItems = pgTable(
  'user_items',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => shopItems.id, { onDelete: 'cascade' }),
    isEquipped: boolean('is_equipped').notNull().default(false), // 是否装备中
    expiresAt: timestamp('expires_at', { withTimezone: true }), // 过期时间（null=永久）
  },
  (table) => [
    index('user_items_user_idx').on(table.userId),
    index('user_items_item_idx').on(table.itemId),
    index('user_items_equipped_idx').on(table.isEquipped),
  ]
);

export const userItemsRelations = relations(userItems, ({ one }) => ({
  user: one(users, {
    fields: [userItems.userId],
    references: [users.id],
  }),
  item: one(shopItems, {
    fields: [userItems.itemId],
    references: [shopItems.id],
  }),
}));
