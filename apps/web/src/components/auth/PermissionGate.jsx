'use client';

import { usePermission } from '@/hooks/usePermission';

/**
 * 权限门控组件
 * 根据用户权限决定是否渲染子组件
 *
 * @example
 * // 检查单个权限
 * <PermissionGate permission="topic.pin">
 *   <PinButton />
 * </PermissionGate>
 *
 * @example
 * // 检查多个权限（满足任一即可）
 * <PermissionGate permissions={['topic.pin', 'topic.close']} any>
 *   <ModeratorActions />
 * </PermissionGate>
 *
 * @example
 * // 检查角色
 * <PermissionGate role="admin">
 *   <AdminPanel />
 * </PermissionGate>
 *
 * @example
 * // 使用 fallback
 * <PermissionGate permission="topic.pin" fallback={<span>无权限</span>}>
 *   <PinButton />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  permission,       // 单个权限
  permissions,      // 多个权限
  role,             // 单个角色
  roles,            // 多个角色
  any = false,      // true: 满足任一条件即可, false: 需要满足所有条件
  fallback = null,  // 无权限时显示的内容
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole } = usePermission();

  let hasAccess = false;

  // 检查权限
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = any ? hasAnyPermission(permissions) : hasAllPermissions(permissions);
  }

  // 检查角色
  if (role) {
    const roleAccess = hasRole(role);
    // 如果之前已经有权限，根据 any 决定是否叠加
    if (permission || permissions) {
      hasAccess = any ? (hasAccess || roleAccess) : (hasAccess && roleAccess);
    } else {
      hasAccess = roleAccess;
    }
  } else if (roles) {
    const roleAccess = hasAnyRole(roles);
    if (permission || permissions) {
      hasAccess = any ? (hasAccess || roleAccess) : (hasAccess && roleAccess);
    } else {
      hasAccess = roleAccess;
    }
  }

  // 如果没有指定任何条件，默认不显示
  if (!permission && !permissions && !role && !roles) {
    return fallback;
  }

  return hasAccess ? children : fallback;
}

/**
 * 管理员权限门控
 */
export function AdminGate({ children, fallback = null }) {
  return (
    <PermissionGate role="admin" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export default PermissionGate;
