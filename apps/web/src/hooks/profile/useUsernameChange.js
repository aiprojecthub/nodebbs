'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { userApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 用户名修改 Hook
 * 管理用户名修改表单、限制信息和提交逻辑
 */
export function useUsernameChange() {
  const { user, refreshUser } = useAuth();
  const { settings } = useSettings();

  // ===== 对话框状态 =====
  const [showDialog, setShowDialog] = useState(false);

  // ===== 表单状态 =====
  const [formData, setFormData] = useState({
    newUsername: '',
    password: '',
  });

  // ===== 加载状态 =====
  const [loading, setLoading] = useState(false);

  // ===== 更新表单 =====
  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ===== 重置表单 =====
  const resetForm = useCallback(() => {
    setFormData({ newUsername: '', password: '' });
  }, []);

  // ===== 打开对话框 =====
  const openDialog = useCallback(() => {
    setShowDialog(true);
  }, []);

  // ===== 关闭对话框 =====
  const closeDialog = useCallback(() => {
    setShowDialog(false);
    resetForm();
  }, [resetForm]);

  // ===== 提交用户名修改 =====
  const handleSubmit = useCallback(async () => {
    if (!formData.newUsername.trim()) {
      toast.error('请输入新用户名');
      return;
    }

    if (settings.username_change_requires_password?.value && !formData.password) {
      toast.error('请输入当前密码');
      return;
    }

    setLoading(true);

    try {
      const result = await userApi.changeUsername(formData.newUsername, formData.password);

      toast.success(result.message || '用户名修改成功');
      closeDialog();
      refreshUser();
    } catch (err) {
      console.error('修改用户名失败:', err);
      toast.error(err.message || '修改用户名失败');
    } finally {
      setLoading(false);
    }
  }, [formData, settings, closeDialog, refreshUser]);

  // ===== 计算用户名修改限制信息 =====
  const usernameInfo = useMemo(() => {
    if (!user) return null;

    const cooldownDays = settings.username_change_cooldown_days?.value || 30;
    const changeLimit = settings.username_change_limit?.value || 3;
    const changeCount = user.usernameChangeCount || 0;
    const lastChangedAt = user.usernameChangedAt;

    let canChange = true;
    let nextAvailable = null;
    let remainingChanges = changeLimit > 0 ? changeLimit - changeCount : -1;

    if (changeLimit > 0 && changeCount >= changeLimit) {
      canChange = false;
    }

    if (lastChangedAt && cooldownDays > 0) {
      const lastChange = new Date(lastChangedAt);
      const now = new Date();
      const daysSince = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));

      if (daysSince < cooldownDays) {
        canChange = false;
        nextAvailable = new Date(lastChange);
        nextAvailable.setDate(nextAvailable.getDate() + cooldownDays);
      }
    }

    return { canChange, nextAvailable, remainingChanges, cooldownDays };
  }, [user, settings]);

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
    /** 提交用户名修改 */
    handleSubmit,

    // ===== 限制信息 =====
    /** 用户名修改限制信息 */
    usernameInfo,

    // ===== 加载状态 =====
    /** 用户名修改中 */
    loading,
  };
}
