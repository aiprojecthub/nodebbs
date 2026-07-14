'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 个人资料信息 Hook
 * 管理头像上传、姓名、简介等基本信息状态。
 *
 * 内容审核开启时，字段修改进入"审核中"：线上值保持旧值，本 Hook 通过
 * PATCH 响应的 pendingFields + GET /me/pending-fields 回显"审核中"状态，
 * 输入框始终显示线上（旧）值，pending 新值由 UI 以角标提示。
 */
export function useProfileInfo() {
  const { user, refreshUser } = useAuth();

  // ===== 表单状态（始终反映线上/旧值）=====
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatar: '',
  });

  // ===== 待审字段：{ name?: {value}, bio?: {value}, avatar?: {value} } =====
  const [pending, setPending] = useState({});

  // ===== 加载状态 =====
  const [loading, setLoading] = useState(false);

  // ===== 同步用户数据到表单（仅在初始加载时）=====
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

  // ===== 加载本人待审字段（回显"审核中"）=====
  const loadPending = useCallback(async () => {
    try {
      const data = await userApi.getMyPendingFields();
      setPending(data || {});
    } catch (err) {
      // 待审回显失败不致命，忽略
      console.error('加载待审字段失败:', err);
    }
  }, []);

  useEffect(() => {
    if (user) loadPending();
  }, [user, loadPending]);

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

  // ===== 更新头像 =====
  const updateAvatar = useCallback(async (url) => {
    if (!url) return;

    const oldAvatar = user?.avatar || '';
    // 乐观更新（若待审再回退到旧值）
    setFormData((prev) => ({ ...prev, avatar: url }));

    try {
      const res = await userApi.updateProfile({ avatar: url });
      if (res?.pendingFields?.includes('avatar')) {
        // 待审：线上头像不变，回退输入显示、记 pending
        setFormData((prev) => ({ ...prev, avatar: oldAvatar }));
        setPending((prev) => ({ ...prev, avatar: { value: url } }));
        toast.success('头像已提交审核，通过后生效');
      } else {
        setPending((prev) => {
          const next = { ...prev };
          delete next.avatar;
          return next;
        });
        toast.success('头像已更新');
      }
      refreshUser();
    } catch (err) {
      console.error('更新头像失败:', err);
      toast.error(err.message || '更新头像失败');
      // 失败回滚
      setFormData((prev) => ({ ...prev, avatar: oldAvatar }));
    }
  }, [user, refreshUser]);

  // ===== 提交昵称/简介 =====
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('昵称不能为空');
      return;
    }

    setLoading(true);
    const submitted = { name: formData.name.trim(), bio: formData.bio.trim() };

    try {
      const res = await userApi.updateProfile(submitted);
      const pendingList = res?.pendingFields || [];

      // 待审字段：输入框回退到线上旧值 + 记 pending；已应用字段：清除 pending、保留新值
      setPending((prev) => {
        const next = { ...prev };
        for (const f of ['name', 'bio']) {
          if (pendingList.includes(f)) next[f] = { value: submitted[f] };
          else delete next[f];
        }
        return next;
      });
      setFormData((prev) => ({
        ...prev,
        name: pendingList.includes('name') ? (user?.name || '') : prev.name,
        bio: pendingList.includes('bio') ? (user?.bio || '') : prev.bio,
      }));

      toast.success(pendingList.length > 0 ? '已提交审核，通过后生效' : '个人资料更新成功');
      refreshUser();
    } catch (err) {
      console.error('更新资料失败:', err);
      toast.error(err.message || '更新失败');
    } finally {
      setLoading(false);
    }
  }, [formData, user, refreshUser]);

  return {
    // ===== 用户数据 =====
    /** 当前用户 */
    user,
    /** 表单数据（线上/旧值）*/
    formData,
    /** 待审字段 { name?, bio?, avatar?: { value } } */
    pending,

    // ===== 操作函数 =====
    /** 更新表单字段 */
    updateField,
    /** 重置表单 */
    resetForm,
    /** 更新头像 */
    updateAvatar,
    /** 提交表单 */
    handleSubmit,

    // ===== 加载状态 =====
    /** 表单提交中 */
    loading,
  };
}
