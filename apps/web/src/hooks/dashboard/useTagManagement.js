'use client';

import { useState, useCallback } from 'react';
import { useAdminList } from './useAdminList';
import { tagApi } from '@/lib/api';
import { confirm } from '@/components/common/ConfirmPopover';
import { toast } from 'sonner';

/**
 * 标签管理 Hook
 * 组合 useAdminList，添加标签 CRUD 操作
 */
export function useTagManagement() {
  const list = useAdminList({
    fetchFn: (params) => tagApi.getList(params),
    pageSize: 50,
  });

  // ===== 表单状态 =====
  const [showDialog, setShowDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // ===== 表单操作 =====
  const resetForm = useCallback(() => {
    setFormData({ name: '', description: '' });
    setSelectedTag(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetForm();
    setIsEdit(false);
    setShowDialog(true);
  }, [resetForm]);

  const openEditDialog = useCallback((tag) => {
    setSelectedTag(tag);
    setFormData({
      name: tag.name,
      slug: tag.slug,
      description: tag.description || '',
    });
    setIsEdit(true);
    setShowDialog(true);
  }, []);

  // ===== 提交 =====
  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error('请输入标签名称');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        const updatedTag = await tagApi.update(selectedTag.id, formData);
        list.updateItem(selectedTag.id, updatedTag);
        toast.success('标签更新成功');
      } else {
        const newTag = await tagApi.create(formData);
        list.prependItem(newTag);
        toast.success('标签创建成功');
      }
      setShowDialog(false);
      resetForm();
    } catch (err) {
      console.error(`${isEdit ? '更新' : '创建'}标签失败:`, err);
      toast.error(err.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  }, [formData, isEdit, selectedTag, list, resetForm]);

  // ===== 删除 =====
  const handleDeleteClick = useCallback(
    async (e, tag) => {
      const confirmed = await confirm(e, {
        title: '确认删除？',
        description: (
          <>
            确定要删除标签 &quot;{tag.name}&quot; 吗？此操作不可撤销。
            {tag.topicCount > 0 && (
              <span className='block mt-2 text-orange-600'>
                注意：该标签被 {tag.topicCount} 个话题使用。
              </span>
            )}
          </>
        ),
        confirmText: '删除',
        variant: 'destructive',
      });

      if (!confirmed) return;

      setSubmitting(true);
      try {
        await tagApi.delete(tag.id);
        list.removeItem(tag.id);
        toast.success('标签删除成功');
        setSelectedTag(null);
      } catch (err) {
        console.error('删除标签失败:', err);
        toast.error(err.message || '删除失败');
      } finally {
        setSubmitting(false);
      }
    },
    [list]
  );

  return {
    ...list,
    // 表单状态
    showDialog,
    setShowDialog,
    isEdit,
    selectedTag,
    submitting,
    formData,
    setFormData,
    // 操作
    openCreateDialog,
    openEditDialog,
    handleSubmit,
    handleDeleteClick,
  };
}
