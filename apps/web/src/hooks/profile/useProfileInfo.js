'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 个人资料信息 Hook
 * 管理头像上传、姓名、简介等基本信息状态
 */
export function useProfileInfo() {
  const { user, refreshUser } = useAuth();

  // ===== 表单状态 =====
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatar: '',
  });

  // ===== 加载状态 =====
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ===== 同步用户数据到表单（仅在初始加载时） =====
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user && !initialized) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
      setInitialized(true);
    }
  }, [user, initialized]);

  // ===== 更新表单字段 =====
  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ===== 重置表单 =====
  const resetForm = useCallback(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  // ===== 头像上传 =====
  const handleAvatarChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      const result = await userApi.uploadAvatar(file);
      setFormData((prev) => ({ ...prev, avatar: result.avatar }));
      toast.success('头像上传成功');
      setUploadingAvatar(false);
      refreshUser();
    } catch (err) {
      console.error('上传头像失败:', err);
      toast.error('上传头像失败：' + err.message);
      setUploadingAvatar(false);
    }
  }, [refreshUser]);

  // ===== 提交表单 =====
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('姓名不能为空');
      return;
    }

    setLoading(true);

    try {
      await userApi.updateProfile({
        name: formData.name.trim(),
        bio: formData.bio.trim(),
      });

      toast.success('个人资料更新成功');
      setLoading(false);
      refreshUser();
    } catch (err) {
      console.error('更新资料失败:', err);
      toast.error('更新失败：' + err.message);
      setLoading(false);
    }
  }, [formData, refreshUser]);

  return {
    // ===== 用户数据 =====
    /** 当前用户 */
    user,
    /** 表单数据 */
    formData,

    // ===== 操作函数 =====
    /** 更新表单字段 */
    updateField,
    /** 重置表单 */
    resetForm,
    /** 头像上传处理 */
    handleAvatarChange,
    /** 提交表单 */
    handleSubmit,

    // ===== 加载状态 =====
    /** 表单提交中 */
    loading,
    /** 头像上传中 */
    uploadingAvatar,
  };
}
