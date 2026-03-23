'use client';

import { useCallback } from 'react';
import { useAdminList } from './useAdminList';
import { postApi } from '@/lib/api';
import { confirm } from '@/components/common/ConfirmPopover';
import { toast } from 'sonner';

/**
 * 回复管理 Hook
 * 组合 useAdminList，添加删除操作
 */
export function usePostManagement() {
  const list = useAdminList({
    fetchFn: async (params) => {
      const apiParams = { ...params, dashboard: true };

      // 状态过滤映射
      if (params.statusFilter === 'deleted') {
        apiParams.isDeleted = true;
      } else if (params.statusFilter && params.statusFilter !== 'all') {
        apiParams.approvalStatus = params.statusFilter;
      }
      delete apiParams.statusFilter;

      return postApi.getAdminList(apiParams);
    },
    pageSize: 20,
    defaultFilters: { statusFilter: 'all' },
  });

  const { removeItem, updateItem, filters } = list;

  // ===== 删除操作 =====
  const handleDeleteClick = useCallback(
    async (e, post, type) => {
      const isHard = type === 'hard';
      const confirmed = await confirm(e, {
        title: isHard ? '确认彻底删除？' : '确认删除？',
        description: isHard
          ? '此操作将彻底删除该回复，包括所有点赞和相关数据。此操作不可恢复！'
          : '此操作将逻辑删除该回复。删除后回复将不再显示，但数据仍保留在数据库中。',
        confirmText: '确认删除',
        variant: isHard ? 'destructive' : 'default',
      });

      if (!confirmed) return;

      try {
        await postApi.delete(post.id, isHard);
        toast.success(isHard ? '回复已彻底删除' : '回复已删除');

        if (isHard) {
          removeItem(post.id);
        } else {
          // 逻辑删除：根据筛选条件决定移除还是更新
          const currentFilter = filters.statusFilter;
          if (currentFilter !== 'all' && currentFilter !== 'deleted') {
            removeItem(post.id);
          } else {
            updateItem(post.id, { isDeleted: true });
          }
        }
      } catch (err) {
        console.error('删除失败:', err);
        toast.error(err.message || '删除失败');
      }
    },
    [removeItem, updateItem, filters]
  );

  return {
    ...list,
    handleDeleteClick,
  };
}
