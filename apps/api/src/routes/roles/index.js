/**
 * 角色管理 API
 * 仅管理员可访问
 */

import { eq } from 'drizzle-orm';
import db from '../../db/index.js';
import { roles, permissions, rolePermissions, userRoles, users } from '../../db/schema.js';
import { getPermissionService } from '../../services/permissionService.js';
import { getRbacConfig } from '../../config/rbac.js';

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
      return getRbacConfig();
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
                parentId: { type: ['number', 'null'] },
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

  // 获取角色权限（包含继承的权限）
  fastify.get(
    '/:id/permissions',
    {
      preHandler: [fastify.requireAdmin],
      schema: {
        tags: ['roles'],
        description: '获取角色的权限列表（包含继承的权限）',
        querystring: {
          type: 'object',
          properties: {
            includeInherited: { type: 'boolean', default: true },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { includeInherited = true } = request.query;

      // 获取直接权限
      const directPerms = await permissionService.getRolePermissions(id);

      if (!includeInherited) {
        return directPerms;
      }

      // 获取角色信息以检查是否有父角色
      const [role] = await db.select().from(roles).where(eq(roles.id, parseInt(id))).limit(1);
      if (!role) {
        return reply.code(404).send({ error: '角色不存在' });
      }

      // 如果没有父角色，直接返回直接权限
      if (!role.parentId) {
        return directPerms;
      }

      // 递归获取所有父角色的权限
      const getInheritedPermissions = async (parentId, visited = new Set()) => {
        if (!parentId || visited.has(parentId)) return [];
        visited.add(parentId);

        const parentPerms = await permissionService.getRolePermissions(parentId);

        // 获取父角色信息
        const [parentRole] = await db.select().from(roles).where(eq(roles.id, parentId)).limit(1);
        if (parentRole?.parentId) {
          const grandParentPerms = await getInheritedPermissions(parentRole.parentId, visited);
          return [...parentPerms, ...grandParentPerms];
        }
        return parentPerms;
      };

      const inheritedPerms = await getInheritedPermissions(role.parentId);

      // 标记继承来源，并去重（直接权限优先）
      const directPermIds = new Set(directPerms.map(p => p.id));
      const uniqueInheritedPerms = inheritedPerms
        .filter(p => !directPermIds.has(p.id))
        .map(p => ({ ...p, inherited: true }));

      // 合并返回：直接权限 + 继承权限
      return [
        ...directPerms.map(p => ({ ...p, inherited: false })),
        ...uniqueInheritedPerms,
      ];
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
