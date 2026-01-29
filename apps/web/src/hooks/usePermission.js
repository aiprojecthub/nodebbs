'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

/**
 * RBAC 权限检查 Hook
 * 提供权限检查方法和角色信息
 */
export function usePermission() {
  const { user } = useAuth();

  return useMemo(() => {
    // 基于 RBAC 的 isAdmin
    const isAdmin = user?.isAdmin || false;

    // RBAC 数据
    const userRoles = user?.userRoles || [];
    const permissions = user?.permissions || [];
    const displayRole = user?.displayRole || null;

    /**
     * 检查用户是否有指定权限
     * @param {string} slug - 权限标识
     * @returns {boolean}
     */
    const hasPermission = (slug) => {
      if (!user) return false;
      // 管理员拥有所有权限
      if (isAdmin) return true;
      return permissions.includes(slug);
    };

    /**
     * 检查用户是否有任一指定权限
     * @param {string[]} slugs - 权限标识列表
     * @returns {boolean}
     */
    const hasAnyPermission = (slugs) => {
      if (!user) return false;
      if (isAdmin) return true;
      return slugs.some(slug => permissions.includes(slug));
    };

    /**
     * 检查用户是否有所有指定权限
     * @param {string[]} slugs - 权限标识列表
     * @returns {boolean}
     */
    const hasAllPermissions = (slugs) => {
      if (!user) return false;
      if (isAdmin) return true;
      return slugs.every(slug => permissions.includes(slug));
    };

    /**
     * 检查用户是否有指定角色
     * @param {string} slug - 角色标识
     * @returns {boolean}
     */
    const hasRole = (slug) => {
      if (!user) return false;
      return userRoles.some(r => r.slug === slug);
    };

    /**
     * 检查用户是否有任一指定角色
     * @param {string[]} slugs - 角色标识列表
     * @returns {boolean}
     */
    const hasAnyRole = (slugs) => {
      if (!user) return false;
      return userRoles.some(r => slugs.includes(r.slug));
    };

    /**
     * 检查用户是否可以编辑话题
     * 依赖后端返回的 canEdit 字段，如果没有则基于权限判断
     * @param {Object} topic - 话题对象
     * @returns {boolean}
     */
    const canEditTopic = (topic) => {
      if (!user || !topic) return false;
      // 优先使用后端返回的权限标志
      if (topic.canEdit !== undefined) return topic.canEdit;
      // 管理员可以编辑所有话题
      if (isAdmin) return true;
      // 作者可以编辑自己的话题（如果有权限）
      if (topic.userId === user.id) {
        return hasPermission('topic.update');
      }
      return false;
    };

    /**
     * 检查用户是否可以删除话题
     * 依赖后端返回的 canDelete 字段，如果没有则基于权限判断
     * @param {Object} topic - 话题对象
     * @returns {boolean}
     */
    const canDeleteTopic = (topic) => {
      if (!user || !topic) return false;
      // 优先使用后端返回的权限标志
      if (topic.canDelete !== undefined) return topic.canDelete;
      // 管理员可以删除所有话题
      if (isAdmin) return true;
      // 作者可以删除自己的话题（如果有权限）
      if (topic.userId === user.id) {
        return hasPermission('topic.delete');
      }
      return false;
    };

    /**
     * 检查用户是否可以置顶话题
     * 依赖后端返回的 canPin 字段
     * @param {Object} topic - 话题对象（可选）
     * @returns {boolean}
     */
    const canPinTopic = (topic) => {
      if (!user) return false;
      // 优先使用后端返回的权限标志
      if (topic?.canPin !== undefined) return topic.canPin;
      return hasPermission('topic.pin');
    };

    /**
     * 检查用户是否可以关闭话题
     * 依赖后端返回的 canClose 字段
     * @param {Object} topic - 话题对象（可选）
     * @returns {boolean}
     */
    const canCloseTopic = (topic) => {
      if (!user) return false;
      // 优先使用后端返回的权限标志
      if (topic?.canClose !== undefined) return topic.canClose;
      return hasPermission('topic.close');
    };

    /**
     * 检查用户是否可以编辑帖子
     * 依赖后端返回的 canEdit 字段，如果没有则基于权限判断
     * @param {Object} post - 帖子对象
     * @returns {boolean}
     */
    const canEditPost = (post) => {
      if (!user || !post) return false;
      // 优先使用后端返回的权限标志
      if (post.canEdit !== undefined) return post.canEdit;
      // 管理员可以编辑所有帖子
      if (isAdmin) return true;
      // 作者可以编辑自己的帖子（如果有权限）
      if (post.userId === user.id) {
        return hasPermission('post.update');
      }
      return false;
    };

    /**
     * 检查用户是否可以删除帖子
     * 依赖后端返回的 canDelete 字段，如果没有则基于权限判断
     * @param {Object} post - 帖子对象
     * @returns {boolean}
     */
    const canDeletePost = (post) => {
      if (!user || !post) return false;
      // 优先使用后端返回的权限标志
      if (post.canDelete !== undefined) return post.canDelete;
      // 管理员可以删除所有帖子
      if (isAdmin) return true;
      // 作者可以删除自己的帖子（如果有权限）
      if (post.userId === user.id) {
        return hasPermission('post.delete');
      }
      return false;
    };

    /**
     * 检查用户是否可以管理用户（仅管理员）
     * @returns {boolean}
     */
    const canManageUser = () => {
      if (!user) return false;
      return isAdmin;
    };

    return {
      // 角色检查
      isAdmin,

      // RBAC 数据
      userRoles,
      permissions,
      displayRole,

      // 权限检查方法
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,

      // 话题权限
      canEditTopic,
      canDeleteTopic,
      canPinTopic,
      canCloseTopic,

      // 帖子权限
      canEditPost,
      canDeletePost,

      // 用户管理
      canManageUser,
    };
  }, [user]);
}
