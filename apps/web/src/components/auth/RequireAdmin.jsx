'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '../common/Loading';

/**
 * 认证守卫组件
 * 用于保护需要管理员才能访问的页面
 */
export default function RequireAdmin({ children }) {
  const { user, isAuthenticated, loading, openLoginDialog } = useAuth();

  const router = useRouter();

  useEffect(() => {
    if (!loading && (!isAuthenticated || !user?.isAdmin)) {
      router.push('/');
    }
  }, [user, isAuthenticated, loading, router]);

  // 加载状态
  if (loading) {
    return <Loading variant='overlay' />;
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return null;
  }

  // 已登录，显示内容
  return <>{children}</>;
}
