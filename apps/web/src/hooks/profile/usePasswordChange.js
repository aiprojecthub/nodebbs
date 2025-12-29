'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 密码修改 Hook
 * 管理密码修改表单状态和提交逻辑
 */
export function usePasswordChange() {
  const { user, checkAuth } = useAuth();

  // ===== 表单状态 =====
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // ===== 加载状态 =====
  const [changingPassword, setChangingPassword] = useState(false);

  // ===== 更新表单字段 =====
  const updateField = useCallback((field, value) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ===== 提交密码修改 =====
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('请填写所有密码字段');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('新密码长度至少为 6 位');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await userApi.changePassword(passwordData.currentPassword, passwordData.newPassword);

      if (res.error) {
        throw new Error(res.error);
      }

      toast.success('密码修改成功');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('修改密码失败:', err);
      toast.error('修改密码失败：' + err.message);
    } finally {
      setChangingPassword(false);
    }
  }, [passwordData]);

  return {
    // ===== 用户数据 =====
    /** 当前用户 */
    user,

    // ===== 表单数据 =====
    /** 密码表单数据 */
    passwordData,
    /** 更新表单字段 */
    updateField,

    // ===== 操作函数 =====
    /** 提交密码修改 */
    handleSubmit,
    /** 验证邮箱后的回调 */
    onEmailVerified: checkAuth,

    // ===== 加载状态 =====
    /** 密码修改中 */
    changingPassword,
  };
}
