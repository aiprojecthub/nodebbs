/**
 * RBAC 初始化脚本
 * 用于初始化角色和权限数据
 *
 * 所有配置从 config/rbac.js 导入，确保单一数据源
 */

import { eq, and } from 'drizzle-orm';
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  users,
} from '../../db/schema.js';
import {
  SYSTEM_ROLES,
  SYSTEM_PERMISSIONS,
  ROLE_PERMISSION_MAP,
  ROLE_PERMISSION_CONDITIONS,
  validateRbacConfig,
} from '../../config/rbac.js';
import { BaseSeeder } from './base.js';
import chalk from 'chalk';

export class RBACSeeder extends BaseSeeder {
  constructor() {
    super('rbac');
  }

  /**
   * 初始化 RBAC 数据
   */
  async init(db, reset = false) {
    // 先校验配置一致性
    const validation = validateRbacConfig();
    if (!validation.valid) {
      this.logger.error('RBAC 配置校验失败:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      throw new Error('RBAC 配置不一致，请检查 config/rbac.js');
    }

    const result = {
      roles: { addedCount: 0, updatedCount: 0, skippedCount: 0, total: SYSTEM_ROLES.length },
      permissions: { addedCount: 0, updatedCount: 0, skippedCount: 0, total: SYSTEM_PERMISSIONS.length },
      rolePermissions: { addedCount: 0, updatedCount: 0, skippedCount: 0, total: 0 },
    };

    this.logger.header('初始化 RBAC 系统');

    // 1. 初始化角色
    this.logger.item('初始化角色...', '🔹');
    const roleIdMap = {}; // slug -> id 映射

    for (const roleData of SYSTEM_ROLES) {
      // 排除 parentSlug，因为它不是数据库字段
      const { parentSlug, ...roleDataWithoutParent } = roleData;

      const [existing] = await db
        .select()
        .from(roles)
        .where(eq(roles.slug, roleData.slug))
        .limit(1);

      if (existing) {
        if (reset) {
          await db
            .update(roles)
            .set(roleDataWithoutParent)
            .where(eq(roles.slug, roleData.slug));
          result.roles.updatedCount++;
          this.logger.success(`更新角色: ${roleData.slug}`);
        } else {
          result.roles.skippedCount++;
        }
        roleIdMap[roleData.slug] = existing.id;
      } else {
        const [inserted] = await db
          .insert(roles)
          .values(roleDataWithoutParent)
          .returning({ id: roles.id });
        result.roles.addedCount++;
        roleIdMap[roleData.slug] = inserted.id;
        this.logger.success(`创建角色: ${roleData.slug}`);
      }
    }
    if (result.roles.skippedCount > 0) {
       this.logger.info(`跳过 ${result.roles.skippedCount} 个已存在的角色`);
    }

    // 1.5 设置角色继承关系
    this.logger.item('设置角色继承关系...', '🔹');
    for (const roleData of SYSTEM_ROLES) {
      if (roleData.parentSlug) {
        const roleId = roleIdMap[roleData.slug];
        const parentId = roleIdMap[roleData.parentSlug];

        if (roleId && parentId) {
          await db
            .update(roles)
            .set({ parentId })
            .where(eq(roles.id, roleId));
          this.logger.success(`设置继承: ${roleData.slug} -> ${roleData.parentSlug}`);
        }
      }
    }

    // 2. 初始化权限
    this.logger.item('初始化权限...', '🔹');
    const permissionIdMap = {}; // slug -> id 映射

    for (const permData of SYSTEM_PERMISSIONS) {
      const [existing] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.slug, permData.slug))
        .limit(1);

      if (existing) {
        if (reset) {
          await db
            .update(permissions)
            .set(permData)
            .where(eq(permissions.slug, permData.slug));
          result.permissions.updatedCount++;
        } else {
          result.permissions.skippedCount++;
        }
        permissionIdMap[permData.slug] = existing.id;
      } else {
        const [inserted] = await db
          .insert(permissions)
          .values(permData)
          .returning({ id: permissions.id });
        result.permissions.addedCount++;
        permissionIdMap[permData.slug] = inserted.id;
      }
    }
    this.logger.info(`权限初始化完成 (新增: ${result.permissions.addedCount}, 更新: ${result.permissions.updatedCount}, 跳过: ${result.permissions.skippedCount})`);

    // 3. 初始化角色权限关联
    this.logger.item('初始化角色权限关联...', '🔹');

    for (const [roleSlug, permSlugs] of Object.entries(ROLE_PERMISSION_MAP)) {
      const roleId = roleIdMap[roleSlug];
      if (!roleId) {
        this.logger.warn(`跳过角色 ${roleSlug}: 角色不存在`);
        continue;
      }

      const conditions = ROLE_PERMISSION_CONDITIONS[roleSlug] || {};

      // 处理 ['*'] 特殊标记：展开为所有权限
      const actualPermSlugs = (permSlugs.length === 1 && permSlugs[0] === '*')
        ? SYSTEM_PERMISSIONS.map(p => p.slug)
        : permSlugs;

      for (const permSlug of actualPermSlugs) {
        const permissionId = permissionIdMap[permSlug];
        if (!permissionId) {
          this.logger.warn(`跳过权限 ${permSlug}: 权限不存在`);
          continue;
        }

        result.rolePermissions.total++;

        // Check if role-permission association already exists
        const [existing] = await db
          .select()
          .from(rolePermissions)
          .where(
            and(
              eq(rolePermissions.roleId, roleId),
              eq(rolePermissions.permissionId, permissionId)
            )
          )
          .limit(1);

        const conditionJson = conditions[permSlug] ? JSON.stringify(conditions[permSlug]) : null;

        if (existing) {
          // Check if condition changed
          if (existing.conditions !== conditionJson) {
            await db
              .update(rolePermissions)
              .set({ conditions: conditionJson })
              .where(eq(rolePermissions.id, existing.id));
             result.rolePermissions.updatedCount++;
          } else {
             result.rolePermissions.skippedCount++;
          }
        } else {
           // Insert new
           await db.insert(rolePermissions).values({
             roleId,
             permissionId,
             conditions: conditionJson,
           });
           result.rolePermissions.addedCount++;
        }
      }
    }
    this.logger.info(`角色权限关联完成 (新增: ${result.rolePermissions.addedCount}, 跳过: ${result.rolePermissions.skippedCount})`);

    // 4. 迁移现有用户 (保证一致性)
    await this.migrateExistingUsers(db);

    this.logger.summary({
      total: result.roles.total + result.permissions.total + result.rolePermissions.total,
      addedCount: result.roles.addedCount + result.permissions.addedCount + result.rolePermissions.addedCount,
      updatedCount: result.roles.updatedCount + result.permissions.updatedCount + result.rolePermissions.updatedCount,
      skippedCount: result.roles.skippedCount + result.permissions.skippedCount + result.rolePermissions.skippedCount
    });
    return result;
  }

  /**
   * 列出 RBAC 配置
   */
  async list() {
    this.logger.header('RBAC 配置列表');

    this.logger.subHeader('System Roles:');
    SYSTEM_ROLES.forEach(role => {
      const inheritInfo = role.parentSlug ? ` -> inherits ${role.parentSlug}` : ' (Base)';
      this.logger.item(`${chalk.bold(role.slug)}: ${role.name} (Priority: ${role.priority})${inheritInfo}`, '👤');
    });

    this.logger.subHeader('Inheritance:');
    this.logger.item('admin -> moderator -> vip -> user', '👑');

    this.logger.subHeader('System Permissions:');
    const modulePermissions = {};
    SYSTEM_PERMISSIONS.forEach(perm => {
      if (!modulePermissions[perm.module]) {
        modulePermissions[perm.module] = [];
      }
      modulePermissions[perm.module].push(perm);
    });

    Object.entries(modulePermissions).forEach(([module, perms]) => {
      console.log(chalk.blue(`  ${module}:`));
      perms.forEach(perm => {
        this.logger.detail(`${perm.slug}: ${perm.name}`);
      });
    });

    this.logger.subHeader('Role Permissions Map:');
    Object.entries(ROLE_PERMISSION_MAP).forEach(([role, perms]) => {
      console.log(chalk.dim(`  ${role}: ${perms.length} permissions`));
    });
    
    this.logger.divider();
  }

  /**
   * 清理 RBAC 数据（危险操作）
   */
  async clean(db) {
    this.logger.warn('Cleaning RBAC data...');

    // 按依赖顺序删除
    await db.delete(rolePermissions);
    this.logger.success('已清理角色权限关联');

    await db.delete(userRoles);
    this.logger.success('已清理用户角色关联');

    await db.delete(permissions);
    this.logger.success('已清理权限');

    await db.delete(roles);
    this.logger.success('已清理角色');

    this.logger.success('RBAC 数据清理完成');
  }

  /**
   * 迁移现有用户到 user_roles 表
   * 根据 users.role 字段为用户分配对应角色
   * TODO: 后期接入 RBAC 的 roles 表数据
   */
  async migrateExistingUsers(db) {
    this.logger.item('迁移现有用户角色...', '🔹');

    // 获取所有角色的 ID 映射
    const allRoles = await db.select().from(roles);
    const roleIdMap = {};
    allRoles.forEach(role => {
      roleIdMap[role.slug] = role.id;
    });

    // 获取所有用户
    const allUsers = await db.select({ id: users.id, role: users.role }).from(users);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of allUsers) {
      const roleId = roleIdMap[user.role];
      if (!roleId) {
        this.logger.warn(`跳过用户 ${user.id}: 角色 ${user.role} 不存在`);
        skippedCount++;
        continue;
      }

      // 检查是否已分配
      const [existing] = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, user.id))
        .limit(1);

      if (existing) {
        skippedCount++;
        continue;
      }

      // 分配角色
      await db.insert(userRoles).values({
        userId: user.id,
        roleId,
      });
      migratedCount++;
    }

    this.logger.info(`用户迁移完成 (迁移: ${migratedCount}, 跳过: ${skippedCount})`);
    return { migratedCount, skippedCount };
  }
}
