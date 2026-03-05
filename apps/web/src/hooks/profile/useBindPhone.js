'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { userApi, authApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 手机号绑定 Hook
 * 管理无手机号用户的手机号绑定流程（简化为2步，无需验证旧手机号）
 */
export function useBindPhone() {
  const { user, refreshUser } = useAuth();
  const { settings } = useSettings();

  // ===== 对话框状态 =====
  const [showDialog, setShowDialog] = useState(false);
  const [step, setStep] = useState(1);

  // ===== 表单状态 =====
  const [formData, setFormData] = useState({
    phone: '',
    code: '',
    password: '',
    codeSent: false,
  });

  // ===== 加载状态 =====
  const [loading, setLoading] = useState(false);

  // ===== 重置表单 =====
  const resetForm = useCallback(() => {
    setFormData({
      phone: '',
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
    if (!formData.phone.trim()) {
      toast.error('请输入手机号');
      return;
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('请输入有效的手机号');
      return;
    }

    setLoading(true);

    try {
      const result = await authApi.sendCode(formData.phone, 'phone_bind');

      toast.success(result.message || '验证码已发送');
      setFormData((prev) => ({ ...prev, codeSent: true }));
    } catch (err) {
      console.error('发送验证码失败:', err);
      toast.error(err.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  }, [formData.phone]);

  // ===== 提交绑定 =====
  const handleSubmit = useCallback(async () => {
    if (!formData.phone.trim()) {
      toast.error('请输入手机号');
      return;
    }

    if (!formData.code.trim()) {
      toast.error('请输入验证码');
      return;
    }

    if (settings.phone_change_requires_password?.value && user?.hasPassword && !formData.password) {
      toast.error('请输入当前密码');
      return;
    }

    setLoading(true);

    try {
      const result = await userApi.bindPhone(
        formData.phone,
        formData.code,
        formData.password
      );

      toast.success(result.message || '手机号绑定成功');
      closeDialog();
      refreshUser();
    } catch (err) {
      console.error('手机号绑定失败:', err);
      toast.error(err.message || '手机号绑定失败');
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
