import { userEnricher } from './userEnricher.js';
import { getPermissionService } from './permissionService.js';

/**
 * RBAC 用户增强器
 * 为用户添加 displayRole（展示角色）
 * 复用 permissionService 的缓存机制
 */
export default function registerRbacEnricher(fastify) {
  /**
   * 从角色列表中提取展示角色
   */
  const extractDisplayRole = (userRolesList) => {
    const displayRole = userRolesList
      .filter(r => r.isDisplayed)
      .sort((a, b) => b.priority - a.priority)[0] || null;

    return displayRole ? {
      slug: displayRole.slug,
      name: displayRole.name,
      color: displayRole.color,
      icon: displayRole.icon,
    } : null;
  };

  /**
   * 为单个用户补充展示角色信息
   */
  const enrichUser = async (user) => {
    if (!user || !user.id) return;

    try {
      const permissionService = getPermissionService();
      const userRolesList = await permissionService.getUserRoles(user.id);
      user.displayRole = extractDisplayRole(userRolesList);
    } catch (err) {
      console.error(`[RBAC增强] 补充用户 ${user.id} 的角色信息失败:`, err);
      user.displayRole = null;
    }
  };

  /**
   * 为多个用户批量补充展示角色信息
   */
  const enrichUsers = async (users) => {
    if (!users || users.length === 0) return;

    const permissionService = getPermissionService();

    // 并行获取所有用户的角色（每个用户独立缓存）
    await Promise.all(
      users.map(async (user) => {
        if (!user.id) {
          user.displayRole = null;
          return;
        }

        try {
          const userRolesList = await permissionService.getUserRoles(user.id);
          user.displayRole = extractDisplayRole(userRolesList);
        } catch (err) {
          console.error(`[RBAC增强] 补充用户 ${user.id} 的角色信息失败:`, err);
          user.displayRole = null;
        }
      })
    );
  };

  userEnricher.register('rbac', enrichUser);
  userEnricher.registerBatch('rbac', enrichUsers);
}
