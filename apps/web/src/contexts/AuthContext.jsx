'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi } from '@/lib/api';
import LoginDialog from '@/components/auth/LoginDialog';

const AuthContext = createContext(null);

export function AuthProvider({ children, initialUser }) {
  // 如果 initialUser 被传递（无论是 null 还是对象），说明服务端已经检查过了
  // 我们直接使用该状态，且不需要 loading
  const isHydrated = initialUser !== undefined;
  
  const [user, setUser] = useState(initialUser || null);
  const [loading, setLoading] = useState(!isHydrated);
  const [error, setError] = useState(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  // 初始化检查
  useEffect(() => {
    // 如果已经由服务端 Hydrate，且有用户，则不需要再次检查
    // 如果没有 Hydrate (SPA 导航/降级情况)，或者想双重确认，可以检查
    // 这里我们选择：只有当未 Hydrate 时才检查
    if (!isHydrated) {
      checkAuth();
    }
    
    // 监听未授权事件
    const handleUnauthorized = () => {
      setUser(null);
      setError('登录已过期，请重新登录');
      // 自动打开登录对话框
      setLoginDialogOpen(true);
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  // 检查认证状态
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (err) {
      setUser(null);
      // 静默失败，用户未登录是正常状态
    } finally {
      setLoading(false);
    }
  }, []);

  // 登录（支持用户名或邮箱）
  const login = useCallback(async (identifier, password) => {
    try {
      setError(null);
      const response = await authApi.login(identifier, password);
      setUser(response.user);
      // 登录成功后关闭对话框
      setLoginDialogOpen(false);
      return { success: true, user: response.user };
    } catch (err) {
      setError(err.message || '登录失败');
      return { success: false, error: err.message };
    }
  }, []);

  // 注册
  const register = useCallback(async (data) => {
    try {
      setError(null);
      const response = await authApi.register(data);
      setUser(response.user);
      // 注册成功后关闭对话框
      setLoginDialogOpen(false);
      return { success: true, user: response.user };
    } catch (err) {
      setError(err.message || '注册失败');
      return { success: false, error: err.message };
    }
  }, []);

  // 登出
  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setError(null);
  }, []);

  // 更新用户信息
  const updateUser = useCallback((userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      return null;
    }
  }, []);

  // 设置认证数据（用于扫码登录等外部认证成功后）
  const setAuthData = useCallback((userData) => {
    // 设置用户数据
    setUser(userData);
    // 关闭登录对话框
    setLoginDialogOpen(false);
  }, []);

  // 登录对话框控制
  const openLoginDialog = useCallback(() => setLoginDialogOpen(true), []);
  const closeLoginDialog = useCallback(() => setLoginDialogOpen(false), []);

  const value = useMemo(() => ({
    // 认证相关
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    checkAuth,
    refreshUser,
    setAuthData,
    // 登录对话框相关
    openLoginDialog,
    closeLoginDialog,
  }), [user, loading, error, login, register, logout, updateUser, checkAuth, refreshUser, setAuthData, openLoginDialog, closeLoginDialog]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </AuthContext.Provider>
  );
}

// Hook 来使用认证上下文
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

