'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { userApi, authApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 邮箱修改 Hook
 * 管理邮箱修改多步骤流程、验证码发送和提交逻辑
 */
export function useEmailChange() {
  const { user, refreshUser } = useAuth();
  const { settings } = useSettings();

  // ===== 对话框状态 =====
  const [showDialog, setShowDialog] = useState(false);
  const [step, setStep] = useState(1);

  // ===== 表单状态 =====
  const [formData, setFormData] = useState({
    oldEmailCode: '',
    newEmail: '',
    newEmailCode: '',
    password: '',
    oldEmailCodeSent: false,
    newEmailCodeSent: false,
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
      oldEmailCode: '',
      newEmail: '',
      newEmailCode: '',
      password: '',
      oldEmailCodeSent: false,
      newEmailCodeSent: false,
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

  // ===== 发送旧邮箱验证码 =====
  const sendOldEmailCode = useCallback(async () => {
    setLoading(true);

    try {
      const result = await authApi.sendCode(user.email, 'email_change_old');

      toast.success(result.message || '验证码已发送到当前邮箱');
      setFormData((prev) => ({ ...prev, oldEmailCodeSent: true }));
    } catch (err) {
      console.error('发送验证码失败:', err);
      toast.error(err.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // ===== 发送新邮箱验证码 =====
  const sendNewEmailCode = useCallback(async () => {
    if (!formData.newEmail.trim()) {
      toast.error('请输入新邮箱地址');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.newEmail)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);

    try {
      const result = await authApi.sendCode(formData.newEmail, 'email_change_new');

      toast.success(result.message || '验证码已发送到新邮箱');
      setFormData((prev) => ({ ...prev, newEmailCodeSent: true }));
    } catch (err) {
      console.error('发送验证码失败:', err);
      toast.error(err.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  }, [formData.newEmail]);

  // ===== 提交邮箱修改 =====
  const handleSubmit = useCallback(async () => {
    if (!formData.oldEmailCode.trim()) {
      toast.error('请输入旧邮箱验证码');
      return;
    }

    if (!formData.newEmail.trim()) {
      toast.error('请输入新邮箱地址');
      return;
    }

    if (!formData.newEmailCode.trim()) {
      toast.error('请输入新邮箱验证码');
      return;
    }

    if (settings.email_change_requires_password?.value && !formData.password) {
      toast.error('请输入当前密码');
      return;
    }

    setLoading(true);

    try {
      const result = await userApi.changeEmail(
        formData.oldEmailCode,
        formData.newEmail,
        formData.newEmailCode,
        formData.password
      );

      toast.success(result.message || '邮箱修改成功');
      closeDialog();
      refreshUser();
    } catch (err) {
      console.error('邮箱修改失败:', err);
      toast.error(err.message || '邮箱修改失败');
    } finally {
      setLoading(false);
    }
  }, [formData, settings, closeDialog, refreshUser]);

  return {
    // ===== 用户和设置 =====
    /** 当前用户 */
    user,
    /** 系统设置 */
    settings,

    // ===== 对话框状态 =====
    /** 对话框是否显示 */
    showDialog,
    /** 设置对话框显示状态 */
    setShowDialog,
    /** 当前步骤 */
    step,
    /** 设置步骤 */
    setStep,
    /** 打开对话框 */
    openDialog,
    /** 关闭对话框 */
    closeDialog,

    // ===== 表单数据 =====
    /** 表单数据 */
    formData,
    /** 更新表单字段 */
    updateField,
    /** 设置完整表单数据 */
    setFormData,

    // ===== 操作函数 =====
    /** 发送旧邮箱验证码 */
    sendOldEmailCode,
    /** 发送新邮箱验证码 */
    sendNewEmailCode,
    /** 提交邮箱修改 */
    handleSubmit,

    // ===== 加载状态 =====
    /** 邮箱修改中 */
    loading,
  };
}
