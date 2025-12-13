import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  unique,
  bigint,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../../db/schema.js';

// ============ Common Fields ============
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

// ============ Ledger Tables ============

// 1. Currencies (货币定义)
export const sysCurrencies = pgTable(
  'sys_currencies',
  {
    ...$defaults,
    code: varchar('code', { length: 20 }).notNull().unique(), // e.g., 'credits', 'gold'
    name: varchar('name', { length: 50 }).notNull(), // e.g., '积分', '金币'
    symbol: varchar('symbol', { length: 10 }), // e.g., 'pts', '￥'
    precision: integer('precision').notNull().default(0), // 小数位，0表示整数
    isActive: boolean('is_active').notNull().default(true),
    metadata: text('metadata'), // JSON 配置，如汇率、图标等
    config: text('config'), // JSON 业务规则配置 (如奖励规则)
  },
  (table) => [
    index('sys_currencies_code_idx').on(table.code),
  ]
);

export const sysCurrenciesRelations = relations(sysCurrencies, ({ many }) => ({
  accounts: many(sysAccounts),
}));

// 2. Accounts (用户账户/钱包)
export const sysAccounts = pgTable(
  'sys_accounts',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    currencyCode: varchar('currency_code', { length: 20 })
      .notNull()
      .references(() => sysCurrencies.code, { onDelete: 'cascade' }),
    balance: bigint('balance', { mode: 'number' }).notNull().default(0), // 使用bigint防止溢出，但在JS中如果是大数需注意
    totalEarned: bigint('total_earned', { mode: 'number' }).notNull().default(0),
    totalSpent: bigint('total_spent', { mode: 'number' }).notNull().default(0),
    isFrozen: boolean('is_frozen').notNull().default(false),
  },
  (table) => [
    unique().on(table.userId, table.currencyCode),
    index('sys_accounts_user_idx').on(table.userId),
    index('sys_accounts_currency_idx').on(table.currencyCode),
  ]
);

export const sysAccountsRelations = relations(sysAccounts, ({ one }) => ({
  user: one(users, {
    fields: [sysAccounts.userId],
    references: [users.id],
  }),
  currency: one(sysCurrencies, {
    fields: [sysAccounts.currencyCode],
    references: [sysCurrencies.code],
  }),
}));

// 3. Transactions (交易流水)
export const sysTransactions = pgTable(
  'sys_transactions',
  {
    ...$defaults,
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: integer('account_id')
      .notNull()
      .references(() => sysAccounts.id, { onDelete: 'cascade' }),
    currencyCode: varchar('currency_code', { length: 20 })
      .notNull()
      .references(() => sysCurrencies.code, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'number' }).notNull(), // 正数=收入，负数=支出
    balanceAfter: bigint('balance_after', { mode: 'number' }).notNull(), // 交易后余额
    
    // 交易类型与关联
    type: varchar('type', { length: 50 }).notNull(), // e.g., 'transfer', 'grant', 'check_in', 'post_reward'
    referenceType: varchar('reference_type', { length: 50 }), // e.g., 'post', 'user', 'system'
    referenceId: varchar('reference_id', { length: 100 }), // 关联ID (可以是 string 或 int 转 string)
    
    relatedUserId: integer('related_user_id').references(() => users.id, {
      onDelete: 'set null',
    }), // 关联用户 (如转账对象)
    
    description: text('description'),
    metadata: text('metadata'), // JSON Snapshots, etc.
  },
  (table) => [
    index('sys_transactions_user_idx').on(table.userId),
    index('sys_transactions_account_idx').on(table.accountId),
    index('sys_transactions_currency_idx').on(table.currencyCode),
    index('sys_transactions_type_idx').on(table.type),
    index('sys_transactions_ref_idx').on(table.referenceType, table.referenceId),
    index('sys_transactions_created_at_idx').on(table.createdAt),
  ]
);

export const sysTransactionsRelations = relations(sysTransactions, ({ one }) => ({
  user: one(users, {
    fields: [sysTransactions.userId],
    references: [users.id],
  }),
  account: one(sysAccounts, {
    fields: [sysTransactions.accountId],
    references: [sysAccounts.id],
  }),
  currency: one(sysCurrencies, {
    fields: [sysTransactions.currencyCode],
    references: [sysCurrencies.code],
  }),
  relatedUser: one(users, {
    fields: [sysTransactions.relatedUserId],
    references: [users.id],
    relationName: 'relatedTransactionUser',
  }),
}));
