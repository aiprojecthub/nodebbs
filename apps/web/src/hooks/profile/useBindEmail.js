'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { userApi, authApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 邮箱绑定 Hook
 * 管理无邮箱用户的邮箱绑定流程（简化为2步，无需验证旧邮箱）
 */
export function useBindEmail() {
  const { user, refreshUser } = useAuth();
  const { settings } = useSettings();

  // ===== 对话框状态 =====
  const [showDialog, setShowDialog] = useState(false);
  const [step, setStep] = useState(1);

  // ===== 表单状态 =====
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    password: '',
    codeSent: false,
  });

  // ===== 加载状态 =====
  const [loading, setLoading] = useState(false);

  // ===== 重置表单 =====
  const resetForm = useCallback(() => {
    setFormData({
      email: '',
      code: '',
      password: '',
      codeSent: false,
    });
    setStep(1);
  }, []);

  // ===== 打开对话框 =====
  const openDialog = useCallback(() => {
    setShowDialog(true);
    resetForm();
  }, [resetForm]);

  // ===== 关闭对话框 =====
  const closeDialog = useCallback(() => {
    setShowDialog(false);
    resetForm();
  }, [resetForm]);

  // ===== 发送验证码 =====
  const sendCode = useCallback(async () => {
    if (!formData.email.trim()) {
      toast.error('请输入邮箱地址');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);

    try {
      const result = await authApi.sendCode(formData.email, 'email_bind');

      toast.success(result.message || '验证码已发送');
      setFormData((prev) => ({ ...prev, codeSent: true }));
    } catch (err) {
      console.error('发送验证码失败:', err);
      toast.error(err.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  }, [formData.email]);

  // ===== 提交绑定 =====
  const handleSubmit = useCallback(async () => {
    if (!formData.email.trim()) {
      toast.error('请输入邮箱地址');
      return;
    }

    if (!formData.code.trim()) {
      toast.error('请输入验证码');
      return;
    }

    if (settings.email_change_requires_password?.value && user?.hasPassword && !formData.password) {
      toast.error('请输入当前密码');
      return;
    }

    setLoading(true);

    try {
      const result = await userApi.bindEmail(
        formData.email,
        formData.code,
        formData.password
      );

      toast.success(result.message || '邮箱绑定成功');
      closeDialog();
      refreshUser();
    } catch (err) {
      console.error('邮箱绑定失败:', err);
      toast.error(err.message || '邮箱绑定失败');
    } finally {
      setLoading(false);
    }
  }, [formData, settings, user, closeDialog, refreshUser]);

  return {
    user,
    settings,
    showDialog,
    setShowDialog,
    step,
    setStep,
    openDialog,
    closeDialog,
    formData,
    setFormData,
    sendCode,
    handleSubmit,
    loading,
  };
}
