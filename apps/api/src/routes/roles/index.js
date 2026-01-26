/**
 * 角色管理 API
 * 仅管理员可访问
 */

import { eq } from 'drizzle-orm';
import db from '../../db/index.js';
import { roles, permissions, rolePermissions, userRoles, users } from '../../db/schema.js';
import { getPermissionService } from '../../services/permissionService.js';

// ============ RBAC 配置定义 ============

// 权限模块选项
const MODULE_OPTIONS = [
  { value: 'topic', label: '话题' },
  { value: 'post', label: '回复' },
  { value: 'user', label: '用户' },
  { value: 'category', label: '分类' },
  { value: 'system', label: '系统' },
  { value: 'upload', label: '上传' },
  { value: 'invitation', label: '邀请' },
  { value: 'moderation', label: '审核' },
];

// 通用操作 - 适用于大多数模块
const COMMON_ACTIONS = [
  { value: 'create', label: '创建' },
  { value: 'read', label: '查看' },
  { value: 'update', label: '编辑' },
  { value: 'delete', label: '删除' },
  { value: 'manage', label: '管理' },
];

// 模块特殊操作
const MODULE_SPECIAL_ACTIONS = {
  topic: [
    { value: 'pin', label: '置顶' },
    { value: 'close', label: '关闭' },
    { value: 'move', label: '移动' },
    { value: 'approve', label: '审核' },
  ],
  post: [
    { value: 'approve', label: '审核' },
  ],
  user: [
    { value: 'ban', label: '封禁' },
    { value: 'mute', label: '禁言' },
    { value: 'role.assign', label: '分配角色' },
  ],
  category: [],
  system: [
    { value: 'settings', label: '设置' },
    { value: 'dashboard', label: '后台' },
    { value: 'logs', label: '日志' },
  ],
  upload: [
    { value: 'image', label: '图片' },
    { value: 'file', label: '文件' },
  ],
  invitation: [],
  moderation: [
    { value: 'reports', label: '举报' },
    { value: 'content', label: '内容' },
    { value: 'approve', label: '审核' },
  ],
};

// ============ 条件类型定义 ============
// 所有可用的条件类型
const CONDITION_TYPES = {
  // 资源归属
  own: {
    key: 'own',
    label: '仅限自己的资源',
    type: 'boolean',
    description: '只能操作自己创建的内容',
  },
  // 分类限制
  categories: {
    key: 'categories',
    label: '限定分类',
    type: 'array',
    description: '只在指定分类ID内有效（逗号分隔）',
  },
  // 用户门槛
  level: {
    key: 'level',
    label: '最低等级要求',
    type: 'number',
    description: '用户等级需达到指定值',
  },
  minCredits: {
    key: 'minCredits',
    label: '最低积分要求',
    type: 'number',
    description: '用户积分需达到指定值',
  },
  minPosts: {
    key: 'minPosts',
    label: '最低发帖数',
    type: 'number',
    description: '用户发帖数需达到指定值',
  },
  accountAge: {
    key: 'accountAge',
    label: '账号年龄(天)',
    type: 'number',
    description: '账号注册天数需达到指定值',
  },
  // 频率限制
  rateLimit: {
    key: 'rateLimit',
    label: '频率限制',
    type: 'rateLimit',
    description: '限制操作频率（次数/时间段）',
    schema: { count: 'number', period: 'string' }, // period: minute/hour/day
  },
  // 上传限制
  maxFileSize: {
    key: 'maxFileSize',
    label: '最大文件大小(KB)',
    type: 'number',
    description: '单个文件最大大小，单位KB',
  },
  maxFilesPerDay: {
    key: 'maxFilesPerDay',
    label: '每日上传数量',
    type: 'number',
    description: '每天最多上传文件数量',
  },
  allowedFileTypes: {
    key: 'allowedFileTypes',
    label: '允许的文件类型',
    type: 'array',
    description: '允许上传的文件扩展名（逗号分隔，如: jpg,png,gif）',
  },
  // 时间段限制
  timeRange: {
    key: 'timeRange',
    label: '生效时间段',
    type: 'timeRange',
    description: '权限生效的时间段',
    schema: { start: 'string', end: 'string' }, // HH:mm 格式
  },
};

// ============ 权限与条件的映射 ============
// 定义每个权限支持哪些条件类型
const PERMISSION_CONDITIONS = {
  // 话题相关
  'topic.create': ['categories', 'rateLimit', 'level', 'minCredits', 'minPosts', 'accountAge', 'timeRange'],
  'topic.read': ['categories'],
  'topic.update': ['own', 'categories'],
  'topic.delete': ['own', 'categories'],
  'topic.manage': ['categories'],
  'topic.pin': ['categories'],
  'topic.close': ['categories'],
  'topic.move': ['categories'],
  'topic.approve': ['categories'],

  // 回复相关
  'post.create': ['categories', 'rateLimit', 'level', 'minCredits', 'accountAge', 'timeRange'],
  'post.read': ['categories'],
  'post.update': ['own'],
  'post.delete': ['own', 'categories'],
  'post.manage': ['categories'],
  'post.approve': ['categories'],

  // 用户相关
  'user.read': [],
  'user.update': ['own'],
  'user.delete': [],
  'user.manage': [],
  'user.ban': [],
  'user.mute': [],
  'user.role.assign': [],

  // 分类相关
  'category.create': [],
  'category.read': [],
  'category.update': [],
  'category.delete': [],
  'category.manage': [],

  // 上传相关
  'upload.create': ['maxFileSize', 'maxFilesPerDay', 'allowedFileTypes', 'rateLimit'],
  'upload.image': ['maxFileSize', 'maxFilesPerDay', 'rateLimit'],
  'upload.file': ['maxFileSize', 'maxFilesPerDay', 'allowedFileTypes', 'rateLimit'],

  // 邀请相关
  'invitation.create': ['rateLimit', 'level', 'minCredits'],
  'invitation.read': ['own'],
  'invitation.manage': [],

  // 审核相关
  'moderation.reports': [],
  'moderation.content': ['categories'],
  'moderation.approve': ['categories'],
  'moderation.manage': [],

  // 系统相关
  'system.settings': [],
  'system.dashboard': [],
  'system.logs': [],
  'system.manage': [],
};

// 默认条件（当权限未在映射中定义时使用）
const DEFAULT_CONDITIONS = ['own', 'categories', 'level'];

// 获取权限支持的条件类型
function getPermissionConditionTypes(permissionSlug) {
  const conditions = PERMISSION_CONDITIONS[permissionSlug] || DEFAULT_CONDITIONS;
  return conditions.map(key => CONDITION_TYPES[key]).filter(Boolean);
}

export default async function rolesRoutes(fastify, options) {
  const permissionService = getPermissionService();

  // ============ RBAC 配置 API ============

  // 获取 RBAC 配置（公开接口，用于前端渲染）
  fastify.get(
    '/config',
    {
      schema: {
        tags: ['roles'],
        description: '获取 RBAC 配置（模块、操作定义）',
        response: {
          200: {
            type: 'object',
            properties: {
              modules: { type: 'array', items: { type: 'object', additionalProperties: true } },
              commonActions: { type: 'array', items: { type: 'object', additionalProperties: true } },
              moduleSpecialActions: { type: 'object', additionalProperties: { type: 'array', items: { type: 'object', additionalProperties: true } } },
              conditionTypes: { type: 'object', additionalProperties: { type: 'object', additionalProperties: true } },
              permissionConditions: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return {
        modules: MODULE_OPTIONS,
        commonActions: COMMON_ACTIONS,
        moduleSpecialActions: MODULE_SPECIAL_ACTIONS,
        conditionTypes: CONDITION_TYPES,              // 所有条件类型定义
        permissionConditions: PERMISSION_CONDITIONS,  // 权限与条件的映射
      };
    }
  );

  // ============ 角色 CRUD ============

  // 获取所有角色
  fastify.get(
    '/',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '获取所有角色列表',
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                slug: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                color: { type: 'string' },
                icon: { type: 'string' },
                isSystem: { type: 'boolean' },
                isDefault: { type: 'boolean' },
                isDisplayed: { type: 'boolean' },
                priority: { type: 'number' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const allRoles = await permissionService.getAllRoles();
      return allRoles;
    }
  );

  // 获取公开角色信息（无需登录）
  fastify.get(
    '/public',
    {
      schema: {
        tags: ['roles'],
        description: '获取公开角色信息（用于展示）',
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slug: { type: 'string' },
                name: { type: 'string' },
                color: { type: 'string' },
                icon: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const publicRoles = await db
        .select({
          slug: roles.slug,
          name: roles.name,
          color: roles.color,
          icon: roles.icon,
        })
        .from(roles)
        .where(eq(roles.isDisplayed, true))
        .orderBy(roles.priority);
      return publicRoles;
    }
  );

  // 创建角色
  fastify.post(
    '/',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '创建新角色',
        body: {
          type: 'object',
          required: ['slug', 'name'],
          properties: {
            slug: { type: 'string', minLength: 1, maxLength: 50 },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string' },
            color: { type: 'string' },
            icon: { type: 'string' },
            parentId: { type: ['number', 'null'] },
            isDefault: { type: 'boolean' },
            isDisplayed: { type: 'boolean' },
            priority: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { slug, name, description, color, icon, parentId, isDefault, isDisplayed, priority } = request.body;

      // 检查 slug 是否已存在
      const existing = await permissionService.getRoleBySlug(slug);
      if (existing) {
        return reply.code(400).send({ error: '角色标识已存在' });
      }

      // 检查父角色是否存在
      if (parentId) {
        const parentRole = await permissionService.getRoleById(parentId);
        if (!parentRole) {
          return reply.code(400).send({ error: '父角色不存在' });
        }
      }

      const [newRole] = await db
        .insert(roles)
        .values({
          slug,
          name,
          description,
          color,
          icon,
          parentId: parentId || null,
          isSystem: false,
          isDefault: isDefault || false,
          isDisplayed: isDisplayed !== false,
          priority: priority || 0,
        })
        .returning();

      return newRole;
    }
  );

  // 获取角色详情
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '获取角色详情',
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);

      if (!role) {
        return reply.code(404).send({ error: '角色不存在' });
      }

      // 获取角色的权限
      const rolePerms = await permissionService.getRolePermissions(id);

      return { ...role, permissions: rolePerms };
    }
  );

  // 更新角色
  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '更新角色',
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string' },
            color: { type: 'string' },
            icon: { type: 'string' },
            parentId: { type: ['number', 'null'] },
            isDefault: { type: 'boolean' },
            isDisplayed: { type: 'boolean' },
            priority: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updateData = { ...request.body };

      const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
      if (!role) {
        return reply.code(404).send({ error: '角色不存在' });
      }

      // 系统角色不允许修改 slug
      if (role.isSystem && updateData.slug) {
        delete updateData.slug;
      }

      // 检查是否设置了 parentId
      if ('parentId' in updateData) {
        // 检查是否形成循环继承
        if (updateData.parentId !== null) {
          const hasCircular = await permissionService.detectCircularInheritance(id, updateData.parentId);
          if (hasCircular) {
            return reply.code(400).send({ error: '不能形成循环继承关系' });
          }
          // 检查父角色是否存在
          const parentRole = await permissionService.getRoleById(updateData.parentId);
          if (!parentRole) {
            return reply.code(400).send({ error: '父角色不存在' });
          }
        }
      }

      const [updated] = await db
        .update(roles)
        .set(updateData)
        .where(eq(roles.id, id))
        .returning();

      return updated;
    }
  );

  // 删除角色
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '删除角色',
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
      if (!role) {
        return reply.code(404).send({ error: '角色不存在' });
      }

      if (role.isSystem) {
        return reply.code(400).send({ error: '系统角色不能删除' });
      }

      await db.delete(roles).where(eq(roles.id, id));

      return { success: true, message: '角色已删除' };
    }
  );

  // ============ 角色权限管理 ============

  // 获取角色权限
  fastify.get(
    '/:id/permissions',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '获取角色的权限列表',
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const perms = await permissionService.getRolePermissions(id);
      return perms;
    }
  );

  // 设置角色权限
  fastify.put(
    '/:id/permissions',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '设置角色的权限',
        body: {
          type: 'object',
          required: ['permissions'],
          properties: {
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['permissionId'],
                properties: {
                  permissionId: { type: 'number' },
                  conditions: { type: ['object', 'null'] },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { permissions: permissionConfigs } = request.body;

      const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
      if (!role) {
        return reply.code(404).send({ error: '角色不存在' });
      }

      await permissionService.setRolePermissions(id, permissionConfigs);

      return { success: true, message: '权限已更新' };
    }
  );

  // ============ 用户角色管理 ============

  // 获取用户的角色
  fastify.get(
    '/users/:userId/roles',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '获取用户的角色列表',
        params: {
          type: 'object',
          properties: {
            userId: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const userRolesList = await permissionService.getUserRoles(userId);
      return userRolesList;
    }
  );

  // 为用户分配角色
  fastify.post(
    '/users/:userId/roles',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '为用户分配角色',
        params: {
          type: 'object',
          properties: {
            userId: { type: 'number' },
          },
        },
        body: {
          type: 'object',
          required: ['roleId'],
          properties: {
            roleId: { type: 'number' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const { roleId, expiresAt } = request.body;

      // 检查用户是否存在
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      // 检查角色是否存在
      const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
      if (!role) {
        return reply.code(404).send({ error: '角色不存在' });
      }

      await permissionService.assignRoleToUser(userId, roleId, {
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        assignedBy: request.user.id,
      });

      // 同步更新 users.role 字段（向后兼容）
      // 使用最高优先级角色作为主角色
      const userRolesList = await permissionService.getUserRoles(userId);
      const primaryRole = userRolesList.sort((a, b) => b.priority - a.priority)[0];
      if (primaryRole) {
        await db.update(users).set({ role: primaryRole.slug }).where(eq(users.id, userId));
      }

      // 清除用户缓存
      await fastify.clearUserCache(userId);

      return { success: true, message: '角色已分配' };
    }
  );

  // 移除用户角色
  fastify.delete(
    '/users/:userId/roles/:roleId',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '移除用户的角色',
        params: {
          type: 'object',
          properties: {
            userId: { type: 'number' },
            roleId: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId, roleId } = request.params;

      await permissionService.removeRoleFromUser(userId, roleId);

      // 同步更新 users.role 字段（向后兼容）
      const userRolesList = await permissionService.getUserRoles(userId);
      const primaryRole = userRolesList.sort((a, b) => b.priority - a.priority)[0];
      await db
        .update(users)
        .set({ role: primaryRole ? primaryRole.slug : 'user' })
        .where(eq(users.id, userId));

      // 清除用户缓存
      await fastify.clearUserCache(userId);

      return { success: true, message: '角色已移除' };
    }
  );

  // ============ 权限列表 ============

  // 获取所有权限
  fastify.get(
    '/permissions',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '获取所有权限列表',
      },
    },
    async (request, reply) => {
      const allPermissions = await permissionService.getAllPermissions();

      // 按模块分组
      const grouped = {};
      for (const perm of allPermissions) {
        if (!grouped[perm.module]) {
          grouped[perm.module] = [];
        }
        grouped[perm.module].push(perm);
      }

      return { permissions: allPermissions, grouped };
    }
  );

  // 创建权限
  fastify.post(
    '/permissions',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '创建新权限',
        body: {
          type: 'object',
          required: ['slug', 'name', 'module', 'action'],
          properties: {
            slug: { type: 'string', minLength: 1, maxLength: 100 },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string' },
            module: { type: 'string', minLength: 1, maxLength: 50 },
            action: { type: 'string', minLength: 1, maxLength: 50 },
            resourceType: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { slug, name, description, module, action, resourceType } = request.body;

      // 检查 slug 是否已存在
      const [existing] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.slug, slug))
        .limit(1);

      if (existing) {
        return reply.code(400).send({ error: '权限标识已存在' });
      }

      const [newPermission] = await db
        .insert(permissions)
        .values({
          slug,
          name,
          description,
          module,
          action,
          resourceType,
          isSystem: false,
        })
        .returning();

      return newPermission;
    }
  );

  // 更新权限
  fastify.patch(
    '/permissions/:id',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '更新权限',
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updateData = request.body;

      const [permission] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.id, id))
        .limit(1);

      if (!permission) {
        return reply.code(404).send({ error: '权限不存在' });
      }

      // 系统权限不允许修改 slug、module、action
      if (permission.isSystem) {
        delete updateData.slug;
        delete updateData.module;
        delete updateData.action;
      }

      const [updated] = await db
        .update(permissions)
        .set(updateData)
        .where(eq(permissions.id, id))
        .returning();

      return updated;
    }
  );

  // 删除权限
  fastify.delete(
    '/permissions/:id',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '删除权限',
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [permission] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.id, id))
        .limit(1);

      if (!permission) {
        return reply.code(404).send({ error: '权限不存在' });
      }

      if (permission.isSystem) {
        return reply.code(400).send({ error: '系统权限不能删除' });
      }

      await db.delete(permissions).where(eq(permissions.id, id));

      return { success: true, message: '权限已删除' };
    }
  );
}
