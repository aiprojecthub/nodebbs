/**
 * 数据库公共列定义
 * 所有 schema 文件（db、extensions、plugins）均从此处导入，避免重复定义。
 * 此文件不依赖任何业务模块，可安全被任意 schema 引用。
 */
import { integer, timestamp } from 'drizzle-orm/pg-core';

// 主键：自增整型 ID
export const $id = integer('id').primaryKey().generatedAlwaysAsIdentity();

// 创建时间
export const $createdAt = timestamp('created_at', {
  withTimezone: true,
}).defaultNow();

// 更新时间（每次更新自动刷新）
export const $updatedAt = timestamp('updated_at', {
  withTimezone: true,
})
  .defaultNow()
  .$onUpdate(() => new Date());

// 时间戳组合（不含 id）
export const $ts = {
  createdAt: $createdAt,
  updatedAt: $updatedAt,
};

// 默认公共字段组合（id + 时间戳）
export const $defaults = {
  id: $id,
  ...$ts,
};
