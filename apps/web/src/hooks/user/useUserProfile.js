'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 用户个人资料交互 Hook
 * 管理关注状态、粉丝/关注数和内容访问权限
 */
export function useUserProfile({
  user,
  initialFollowerCount = 0,
  initialFollowingCount = 0,
  initialIsFollowing = false,
}) {
  const { user: currentUser, isAuthenticated, openLoginDialog, loading: authLoading } = useAuth();
  
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);

  /**
   * 处理关注状态变化
   */
  const handleFollowChange = useCallback((newIsFollowing) => {
    setIsFollowing(newIsFollowing);
    // 更新粉丝数
    setFollowerCount((prev) => (newIsFollowing ? prev + 1 : prev - 1));
  }, []);

  /**
   * 检查是否可以查看用户内容
   */
  const canViewContent = useMemo(() => {
    const visibility = user?.contentVisibility || 'everyone';

    // 如果是用户自己，总是可以查看
    if (currentUser && currentUser.id === user?.id) {
      return true;
    }

    switch (visibility) {
      case 'everyone':
        return true;
      case 'authenticated':
        return isAuthenticated;
      case 'private':
        return false;
      default:
        return true;
    }
  }, [user?.contentVisibility, user?.id, currentUser, isAuthenticated]);

  /**
   * 获取访问限制信息
   */
  const accessMessage = useMemo(() => {
    const visibility = user?.contentVisibility || 'everyone';

    switch (visibility) {
      case 'authenticated':
        return {
          title: '需要登录',
          description: '该用户设置了仅登录用户可查看其内容',
          showLoginButton: true,
        };
      case 'private':
        return {
          title: '内容已隐藏',
          description: '该用户设置了仅自己可查看其内容',
          showLoginButton: false,
        };
      default:
        return null;
    }
  }, [user?.contentVisibility]);

  /**
   * 是否需要等待认证状态加载
   */
  const needsAuthCheck = user?.contentVisibility && user.contentVisibility !== 'everyone';

  return {
    // ===== 用户基本信息 =====
    /** 用户名 */
    username: user?.username,

    // ===== 关注相关 =====
    /** 粉丝数量 */
    followerCount,
    /** 关注数量 */
    followingCount,
    /** 当前用户是否已关注该用户 */
    isFollowing,
    /** 关注状态变化回调 */
    handleFollowChange,

    // ===== 内容访问权限 =====
    /** 是否可以查看用户内容 */
    canViewContent,
    /** 访问限制提示信息（无权限时显示） */
    accessMessage,
    /** 是否需要检查认证状态（内容非公开时为 true） */
    needsAuthCheck,
    /** 认证状态加载中 */
    authLoading,
    /** 打开登录对话框 */
    openLoginDialog,
  };
}
