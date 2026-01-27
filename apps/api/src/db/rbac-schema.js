import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './schema.js';

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

// ============ Roles (角色) ============
export const roles = pgTable(
  'roles',
  {
    ...$defaults,
    slug: varchar('slug', { length: 50 }).notNull().unique(), // admin, moderator, vip, user
    name: varchar('name', { length: 100 }).notNull(), // 显示名称
    description: text('description'), // 角色描述
    color: varchar('color', { length: 20 }), // 角色标识颜色 (如 #ff0000)
    icon: varchar('icon', { length: 50 }), // 角色图标
    parentId: integer('parent_id'), // 父角色ID（用于角色继承）
    isSystem: boolean('is_system').notNull().default(false), // 是否系统内置角色（不可删除）
    isDefault: boolean('is_default').notNull().default(false), // 是否默认角色（新用户自动分配）
    isDisplayed: boolean('is_displayed').notNull().default(true), // 是否在用户资料显示
    priority: integer('priority').notNull().default(0), // 优先级（高优先级的角色会优先显示）
    metadata: text('metadata'), // 额外元数据（JSON 格式）
  },
  (table) => [
    index('roles_slug_idx').on(table.slug),
    index('roles_is_system_idx').on(table.isSystem),
    index('roles_is_default_idx').on(table.isDefault),
    index('roles_priority_idx').on(table.priority),
    index('roles_parent_id_idx').on(table.parentId),
  ]
);

export const rolesRelations = relations(roles, ({ one, many }) => ({
  parent: one(roles, {
    fields: [roles.parentId],
    references: [roles.id],
    relationName: 'childRoles',
  }),
  childRoles: many(roles, { relationName: 'childRoles' }),
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

// ============ Permissions (权限) ============
export const permissions = pgTable(
  'permissions',
  {
    ...$defaults,
    slug: varchar('slug', { length: 100 }).notNull().unique(), // topic.create, topic.delete, user.ban
    name: varchar('name', { length: 100 }).notNull(), // 权限显示名称
    description: text('description'), // 权限描述
    module: varchar('module', { length: 50 }).notNull(), // 所属模块（topic, post, user, system 等）
    action: varchar('action', { length: 50 }).notNull(), // 操作类型（create, read, update, delete 等）
    resourceType: varchar('resource_type', { length: 50 }), // 资源类型（可选，用于更细粒度控制）
    isSystem: boolean('is_system').notNull().default(false), // 是否系统内置权限
  },
  (table) => [
    index('permissions_slug_idx').on(table.slug),
    index('permissions_module_idx').on(table.module),
    index('permissions_action_idx').on(table.action),
    unique('permissions_module_action_unique').on(table.module, table.action, table.resourceType),
  ]
);

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

// ============ Role Permissions (角色-权限关联) ============
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    conditions: text('conditions'), // 条件限制（JSON，如 { "own": true, "fieldFilter": ["*", "!password"] }）
    createdAt: $createdAt,
  },
  (table) => [
    unique('role_permissions_unique').on(table.roleId, table.permissionId),
    index('role_permissions_role_idx').on(table.roleId),
    index('role_permissions_permission_idx').on(table.permissionId),
  ]
);

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// ============ User Roles (用户-角色关联) ============
export const userRoles = pgTable(
  'user_roles',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }), // 可选：角色到期时间（临时角色）
    assignedBy: integer('assigned_by').references(() => users.id, { onDelete: 'set null' }), // 分配者
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
    createdAt: $createdAt,
  },
  (table) => [
    unique('user_roles_unique').on(table.userId, table.roleId),
    index('user_roles_user_idx').on(table.userId),
    index('user_roles_role_idx').on(table.roleId),
    index('user_roles_expires_at_idx').on(table.expiresAt),
  ]
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  assigner: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
    relationName: 'roleAssigner',
  }),
}));

