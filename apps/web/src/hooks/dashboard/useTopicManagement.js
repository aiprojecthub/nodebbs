'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAdminList } from './useAdminList';
import { topicApi } from '@/lib/api';
import { confirm } from '@/components/common/ConfirmPopover';
import { toast } from 'sonner';

/**
 * 话题管理 Hook
 * 组合 useAdminList，添加置顶/关闭/删除/批量删除操作
 */
export function useTopicManagement() {
  const list = useAdminList({
    fetchFn: async (params) => {
      const apiParams = { ...params, dashboard: true };

      // 状态过滤映射
      const sf = params.statusFilter;
      if (sf === 'deleted') {
        apiParams.isDeleted = true;
      } else if (sf === 'pinned') {
        apiParams.isPinned = true;
      } else if (sf === 'closed') {
        apiParams.isClosed = true;
      } else if (sf === 'pending') {
        apiParams.approvalStatus = 'pending';
      } else if (sf === 'rejected') {
        apiParams.approvalStatus = 'rejected';
      }
      delete apiParams.statusFilter;

      return topicApi.getList(apiParams);
    },
    pageSize: 20,
    defaultFilters: { statusFilter: 'all' },
  });

  const { removeItem, updateItem, filters, debouncedSearch, refreshList } = list;

  // ===== 批量选择 =====
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  // 筛选条件变化时清空选择
  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedSearch, filters.statusFilter]);

  // ===== 置顶 =====
  const handleTogglePin = useCallback(
    async (topicId, isPinned) => {
      try {
        await topicApi.update(topicId, { isPinned: !isPinned });
        toast.success(isPinned ? '已取消置顶' : '已置顶');

        if (filters.statusFilter === 'pinned' && isPinned) {
          removeItem(topicId);
        } else {
          updateItem(topicId, { isPinned: !isPinned });
        }
      } catch (err) {
        toast.error(err.message || '操作失败');
      }
    },
    [filters, removeItem, updateItem]
  );

  // ===== 关闭/开启 =====
  const handleToggleClosed = useCallback(
    async (topicId, isClosed) => {
      try {
        await topicApi.update(topicId, { isClosed: !isClosed });
        toast.success(isClosed ? '已重新开启' : '已关闭');

        if (filters.statusFilter === 'closed' && isClosed) {
          removeItem(topicId);
        } else {
          updateItem(topicId, { isClosed: !isClosed });
        }
      } catch (err) {
        toast.error(err.message || '操作失败');
      }
    },
    [filters, removeItem, updateItem]
  );

  // ===== 删除 =====
  const handleDeleteClick = useCallback(
    async (e, topic, type) => {
      const isHard = type === 'hard';
      const confirmed = await confirm(e, {
        title: isHard ? '确认彻底删除？' : '确认删除？',
        description: isHard
          ? `此操作将彻底删除话题 "${topic.title}"，包括所有回复和相关数据。此操作不可恢复！`
          : `此操作将逻辑删除话题 "${topic.title}"。删除后话题将不再显示，但数据仍保留在数据库中。`,
        confirmText: '确认删除',
        variant: isHard ? 'destructive' : 'default',
      });

      if (!confirmed) return;

      try {
        await topicApi.delete(topic.id, isHard);
        toast.success(isHard ? '话题已彻底删除' : '话题已删除');

        if (isHard) {
          removeItem(topic.id);
        } else {
          const sf = filters.statusFilter;
          if (sf !== 'all' && sf !== 'deleted') {
            removeItem(topic.id);
          } else {
            updateItem(topic.id, { isDeleted: true });
          }
        }
      } catch (err) {
        console.error('删除失败:', err);
        toast.error(err.message || '删除失败');
      }
    },
    [filters, removeItem, updateItem]
  );

  // ===== 批量删除 =====
  const handleBatchDelete = useCallback(
    async (ids, e) => {
      const count = ids.size;
      const confirmed = await confirm(e, {
        title: `确认批量删除 ${count} 个话题？`,
        description: '删除后话题将不再显示，但数据仍保留在数据库中。',
        confirmText: '确认删除',
        variant: 'destructive',
      });
      if (!confirmed) return;

      setBatchDeleting(true);
      try {
        const result = await topicApi.batchDelete([...ids]);
        toast.success(`已删除 ${result.count} 个话题`);
        setSelectedIds(new Set());
        refreshList();
      } catch (err) {
        toast.error(err.message || '批量删除失败');
      } finally {
        setBatchDeleting(false);
      }
    },
    [refreshList]
  );

  return {
    ...list,
    selectedIds,
    setSelectedIds,
    batchDeleting,
    handleTogglePin,
    handleToggleClosed,
    handleDeleteClick,
    handleBatchDelete,
  };
}
