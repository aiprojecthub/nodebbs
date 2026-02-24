import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../../db/schema.js';
import { DEFAULT_CURRENCY_CODE } from '../ledger/constants.js';
import { $defaults } from '../../db/columns.js';

// ============ 商城商品表 ============
export const shopItems = pgTable(
  'shop_items',
  {
    ...$defaults,
    type: varchar('type', { length: 20 }).notNull(), // 'avatar_frame', 'badge', 'custom'
    // 商品消耗类型
    // 'non_consumable': 非消耗品，只能拥有一个（头像框、勋章）
    // 'consumable': 消耗品，可重复购买、使用即消耗（改名卡、置顶卡）
    consumeType: varchar('consume_type', { length: 20 }).notNull().default('non_consumable'),
    name: varchar('name', { length: 100 }).notNull(), // 商品名称
    description: text('description'), // 商品描述
    price: integer('price').notNull(), // 价格（积分）
    currencyCode: varchar('currency_code', { length: 20 }).notNull().default(DEFAULT_CURRENCY_CODE), // 货币类型
    imageUrl: varchar('image_url', { length: 500 }), // 商品图片
    stock: integer('stock'), // 库存（null=无限）
    // 单用户最大持有数量（null=无限，non_consumable 自动视为 1）
    maxOwn: integer('max_own'),
    isActive: boolean('is_active').notNull().default(true), // 是否上架
    metadata: text('metadata'), // JSON 格式的商品数据（如 CSS 样式、时长配置等）
    displayOrder: integer('display_order').notNull().default(0), // 排序
  },
  (table) => [
    index('shop_items_type_idx').on(table.type),
    index('shop_items_is_active_idx').on(table.isActive),
    index('shop_items_display_order_idx').on(table.displayOrder),
    index('shop_items_consume_type_idx').on(table.consumeType),
  ]
);

export const shopItemsRelations = relations(shopItems, ({ many }) => ({
  userItems: many(userItems),
}));

// ============ 用户商品拥有表（背包） ============
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
    isEquipped: boolean('is_equipped').notNull().default(false), // 是否装备中（非消耗品用）
    // 持有数量（消耗品/订阅型累加，非消耗品固定为 1）
    quantity: integer('quantity').notNull().default(1),
    // 记录状态：active=可用，exhausted=已用尽
    status: varchar('status', { length: 20 }).notNull().default('active'),
    expiresAt: timestamp('expires_at', { withTimezone: true }), // 过期时间（null=永久）
    metadata: text('metadata'), // 储存赠送信息等 { fromUserId, message, giftedAt }
  },
  (table) => [
    uniqueIndex('user_items_user_item_uniq').on(table.userId, table.itemId),
    index('user_items_user_idx').on(table.userId),
    index('user_items_item_idx').on(table.itemId),
    index('user_items_equipped_idx').on(table.isEquipped),
    index('user_items_status_idx').on(table.status),
  ]
);

export const userItemsRelations = relations(userItems, ({ one, many }) => ({
  user: one(users, {
    fields: [userItems.userId],
    references: [users.id],
  }),
  item: one(shopItems, {
    fields: [userItems.itemId],
    references: [shopItems.id],
  }),
  logs: many(userItemLogs),
}));

// ============ 道具使用/激活记录表 ============
// 双重职责：审计日志 + 激活型效果实例追踪
export const userItemLogs = pgTable(
  'user_item_logs',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => shopItems.id, { onDelete: 'cascade' }),
    userItemId: integer('user_item_id')
      .notNull()
      .references(() => userItems.id, { onDelete: 'cascade' }),
    // 使用场景标识：topic_pin / rename / vip_activate 等
    action: varchar('action', { length: 50 }).notNull(),
    // 关联的目标对象（可选）
    targetType: varchar('target_type', { length: 20 }), // 'topic' / 'user' / null
    targetId: integer('target_id'),
    // 消耗量（一般为 1，批量场景可能大于 1）
    quantityUsed: integer('quantity_used').notNull().default(1),
    // 效果生命周期状态
    // completed: 瞬时消耗已完结
    status: varchar('status', { length: 20 }).notNull().default('completed'),
    // 效果到期时间（预留字段）
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    metadata: text('metadata'), // JSON: { duration, originalName, ... }
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('user_item_logs_user_id_idx').on(table.userId),
    index('user_item_logs_item_id_idx').on(table.itemId),
    index('user_item_logs_user_item_id_idx').on(table.userItemId),
    index('user_item_logs_action_idx').on(table.action),
    index('user_item_logs_status_idx').on(table.status),
    index('user_item_logs_created_at_idx').on(table.createdAt),
  ]
);

export const userItemLogsRelations = relations(userItemLogs, ({ one }) => ({
  user: one(users, {
    fields: [userItemLogs.userId],
    references: [users.id],
  }),
  item: one(shopItems, {
    fields: [userItemLogs.itemId],
    references: [shopItems.id],
  }),
  userItem: one(userItems, {
    fields: [userItemLogs.userItemId],
    references: [userItems.id],
  }),
}));
