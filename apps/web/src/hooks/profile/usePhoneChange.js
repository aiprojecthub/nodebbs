'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { userApi, authApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 手机号修改 Hook
 * 管理手机号修改多步骤流程、验证码发送和提交逻辑
 */
export function usePhoneChange() {
  const { user, refreshUser } = useAuth();
  const { settings } = useSettings();

  // ===== 对话框状态 =====
  const [showDialog, setShowDialog] = useState(false);
  const [step, setStep] = useState(1);

  // ===== 表单状态 =====
  const [formData, setFormData] = useState({
    oldPhoneCode: '',
    newPhone: '',
    newPhoneCode: '',
    password: '',
    oldPhoneCodeSent: false,
    newPhoneCodeSent: false,
  });

  // ===== 加载状态 =====
  const [loading, setLoading] = useState(false);

  // ===== 更新表单 =====
  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ===== 重置表单 =====
  const resetForm = useCallback(() => {
    setFormData({
      oldPhoneCode: '',
      newPhone: '',
      newPhoneCode: '',
      password: '',
      oldPhoneCodeSent: false,
      newPhoneCodeSent: false,
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

  // ===== 发送旧手机号验证码 =====
  const sendOldPhoneCode = useCallback(async () => {
    setLoading(true);

    try {
      const result = await authApi.sendCode(user.phone, 'phone_change_old');

      toast.success(result.message || '验证码已发送到当前手机号');
      setFormData((prev) => ({ ...prev, oldPhoneCodeSent: true }));
    } catch (err) {
      console.error('发送验证码失败:', err);
      toast.error(err.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  }, [user?.phone]);

  // ===== 发送新手机号验证码 =====
  const sendNewPhoneCode = useCallback(async () => {
    if (!formData.newPhone.trim()) {
      toast.error('请输入新手机号');
      return;
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(formData.newPhone)) {
      toast.error('请输入有效的手机号');
      return;
    }

    setLoading(true);

    try {
      const result = await authApi.sendCode(formData.newPhone, 'phone_change_new');

      toast.success(result.message || '验证码已发送到新手机号');
      setFormData((prev) => ({ ...prev, newPhoneCodeSent: true }));
    } catch (err) {
      console.error('发送验证码失败:', err);
      toast.error(err.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  }, [formData.newPhone]);

  // ===== 提交手机号修改 =====
  const handleSubmit = useCallback(async () => {
    if (!formData.oldPhoneCode.trim()) {
      toast.error('请输入旧手机号验证码');
      return;
    }

    if (!formData.newPhone.trim()) {
      toast.error('请输入新手机号');
      return;
    }

    if (!formData.newPhoneCode.trim()) {
      toast.error('请输入新手机号验证码');
      return;
    }

    if (settings.phone_change_requires_password?.value && user?.hasPassword && !formData.password) {
      toast.error('请输入当前密码');
      return;
    }

    setLoading(true);

    try {
      const result = await userApi.changePhone(
        formData.oldPhoneCode,
        formData.newPhone,
        formData.newPhoneCode,
        formData.password
      );

      toast.success(result.message || '手机号修改成功');
      closeDialog();
      refreshUser();
    } catch (err) {
      console.error('手机号修改失败:', err);
      toast.error(err.message || '手机号修改失败');
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
    updateField,
    setFormData,
    sendOldPhoneCode,
    sendNewPhoneCode,
    handleSubmit,
    loading,
  };
}
