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
import { $defaults } from '../../db/columns.js';

// ============ 广告位表 ============
export const adSlots = pgTable(
  'ad_slots',
  {
    ...$defaults,
    name: varchar('name', { length: 100 }).notNull(), // 广告位名称，如"首页顶部横幅"
    code: varchar('code', { length: 50 }).notNull().unique(), // 广告位代码，如 'header_banner'
    description: text('description'), // 广告位描述
    width: integer('width'), // 建议宽度
    height: integer('height'), // 建议高度
    maxAds: integer('max_ads').notNull().default(1), // 最大广告数量
    isActive: boolean('is_active').notNull().default(true), // 是否启用
  },
  (table) => [
    index('ad_slots_code_idx').on(table.code),
    index('ad_slots_is_active_idx').on(table.isActive),
  ]
);

export const adSlotsRelations = relations(adSlots, ({ many }) => ({
  ads: many(ads),
}));

// ============ 广告表 ============
export const ads = pgTable(
  'ads',
  {
    ...$defaults,
    slotId: integer('slot_id')
      .notNull()
      .references(() => adSlots.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(), // 广告标题
    type: varchar('type', { length: 20 }).notNull(), // 广告类型: image, html, script
    content: text('content'), // 广告内容：图片URL / HTML代码 / 第三方脚本
    linkUrl: varchar('link_url', { length: 500 }), // 点击跳转链接
    targetBlank: boolean('target_blank').notNull().default(true), // 是否新窗口打开
    priority: integer('priority').notNull().default(0), // 优先级，数值越大越靠前
    startAt: timestamp('start_at', { withTimezone: true }), // 投放开始时间
    endAt: timestamp('end_at', { withTimezone: true }), // 投放结束时间
    isActive: boolean('is_active').notNull().default(true), // 是否启用
    impressions: integer('impressions').notNull().default(0), // 展示次数
    clicks: integer('clicks').notNull().default(0), // 点击次数
    remark: text('remark'), // 备注（仅管理员可见）
  },
  (table) => [
    index('ads_slot_id_idx').on(table.slotId),
    index('ads_type_idx').on(table.type),
    index('ads_is_active_idx').on(table.isActive),
    index('ads_priority_idx').on(table.priority),
    index('ads_start_at_idx').on(table.startAt),
    index('ads_end_at_idx').on(table.endAt),
  ]
);

export const adsRelations = relations(ads, ({ one }) => ({
  slot: one(adSlots, {
    fields: [ads.slotId],
    references: [adSlots.id],
  }),
}));
