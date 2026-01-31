/**
 * RBAC 初始化脚本
 * 用于初始化角色和权限数据
 *
 * 所有配置从 config/rbac.js 导入，确保单一数据源
 */

import { eq, and, inArray } from 'drizzle-orm';
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  users,
  invitationRules,
} from '../../db/schema.js';
import {
  SYSTEM_ROLES,
  SYSTEM_PERMISSIONS,
  ROLE_PERMISSION_MAP,
  ROLE_PERMISSION_CONDITIONS,
  validateRbacConfig,
} from '../../config/rbac.js';
import { BaseSeeder } from './base.js';
import { InvitationSeeder } from './invitation.js';
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
      const [existing] = await db
        .select()
        .from(roles)
        .where(eq(roles.slug, roleData.slug))
        .limit(1);

      if (existing) {
        if (reset) {
          await db
            .update(roles)
            .set(roleData)
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
          .values(roleData)
          .returning({ id: roles.id });
        result.roles.addedCount++;
        roleIdMap[roleData.slug] = inserted.id;
        this.logger.success(`创建角色: ${roleData.slug}`);
      }
    }
    if (result.roles.skippedCount > 0) {
       this.logger.info(`跳过 ${result.roles.skippedCount} 个已存在的角色`);
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

      // --- 同步逻辑开始：清理废弃权限 ---
      // 1. 计算目标权限 ID 集合
      const targetPermissionIds = new Set();
      for (const permSlug of actualPermSlugs) {
        const pid = permissionIdMap[permSlug];
        if (pid) targetPermissionIds.add(pid);
      }

      // 2. 获取现有权限关联
      const existingRolePermissions = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      // 3. 找出废弃的关联 ID
      const toDeleteIds = [];
      for (const rp of existingRolePermissions) {
        if (!targetPermissionIds.has(rp.permissionId)) {
          toDeleteIds.push(rp.id);
        }
      }

      // 4. 执行删除 (修改为：仅记录日志，不执行删除，以保留运行时更改)
      // 注意：此处不强制删除是为了支持通过 UI/管理后台进行的动态权限配置。
      // 如果配置中不存在但在数据库中存在，警告开发者即可，不应抹除运营数据。
      if (toDeleteIds.length > 0) {
        // await db.delete(rolePermissions).where(inArray(rolePermissions.id, toDeleteIds));
        this.logger.warn(`  - [${roleSlug}] 发现 ${toDeleteIds.length} 个非配置定义的权限 (保留以支持运行时配置)`);
      }
      // --- 同步逻辑结束 ---

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

    // 5. 兜底保护：确保至少有一个管理员角色（引导模式）
    await this.bootstrapAdmin(db, roleIdMap['admin']);

    // 6. 初始化默认邀请规则 (RBAC 配套)
    // 邀请规则依赖于角色，因此必须在角色初始化后执行
    // 且 clean rbac 也会清理 invitationRules，所以 init rbac 必须负责恢复
    this.logger.item('初始化邀请规则...', '🎫');
    const invitationSeeder = new InvitationSeeder();
    await invitationSeeder.init(db, reset);

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
      this.logger.item(`${chalk.bold(role.slug)}: ${role.name} (Priority: ${role.priority})`, '👤');
    });

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

    await db.delete(invitationRules);
    this.logger.success('已清理邀请规则');

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

      // 检查是否已分配当前角色
      const [existing] = await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, user.id),
            eq(userRoles.roleId, roleId)
          )
        )
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

    this.logger.info(`用户角色同步完成 (新增关联: ${migratedCount}, 跳过: ${skippedCount})`);
    return { migratedCount, skippedCount };
  }

  /**
   * 引导模式：确保系统至少有一个管理员
   * 如果 user_roles 表中没有任何管理员，则将 ID 最小的用户（创始人）强制设为 admin
   */
  async bootstrapAdmin(db, adminRoleId) {
    if (!adminRoleId) {
      this.logger.warn('引导管理员失败: 未找到 admin 角色 ID');
      return;
    }

    // 检查是否已有管理员关联
    const [hasAdmin] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.roleId, adminRoleId))
      .limit(1);

    if (hasAdmin) {
      return;
    }

    this.logger.item('检测到系统无管理员，启动引导模式...', '⚠️');

    // 查找 ID 最小的用户（通常是创始人）
    const [founder] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .orderBy(users.id)
      .limit(1);

    if (founder) {
      await db.insert(userRoles).values({
        userId: founder.id,
        roleId: adminRoleId,
      });
      
      // 同时更新 users 表的逻辑状态（双保障）
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, founder.id));
      
      this.logger.success(`引导模式已开启: 用户 ${founder.username} (ID: ${founder.id}) 已被设为初始管理员`);
    } else {
      this.logger.info('引导模式完成: 暂无注册用户');
    }
  }
}
