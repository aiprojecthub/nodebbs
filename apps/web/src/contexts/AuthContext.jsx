'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import LoginDialog from '@/components/forum/LoginDialog';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  // 初始化时检查是否已登录
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    checkAuth();

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
  const checkAuth = async () => {
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
  };

  // 登录（支持用户名或邮箱）
  const login = async (identifier, password) => {
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
  };

  // 注册
  const register = async (data) => {
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
  };

  // 登出
  const logout = () => {
    authApi.logout();
    setUser(null);
    setError(null);
  };

  // 更新用户信息
  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
  };

  // 刷新用户信息
  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      return null;
    }
  };

  // 设置认证数据（用于扫码登录等外部认证成功后）
  const setAuthData = (token, userData) => {
    // 设置 token 到 apiClient 和 localStorage
    const { default: apiClient } = require('@/lib/api');
    apiClient.setToken(token);
    // 设置用户数据
    setUser(userData);
    // 关闭登录对话框
    setLoginDialogOpen(false);
  };

  // 登录对话框控制
  const openLoginDialog = () => setLoginDialogOpen(true);
  const closeLoginDialog = () => setLoginDialogOpen(false);

  const value = {
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
  };

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

