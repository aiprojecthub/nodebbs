'use client';

import { useState, useCallback } from 'react';
import { useAdminList } from './useAdminList';
import { moderationApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 举报管理 Hook
 * 组合 useAdminList，添加举报处理逻辑
 */
export function useReportManagement() {
  const list = useAdminList({
    fetchFn: async (params) => {
      // moderationApi 使用位置参数
      return moderationApi.getReports(
        params.reportType || 'all',
        params.reportStatus || 'all',
        params.page,
        params.limit,
        params.search
      );
    },
    pageSize: 20,
    defaultFilters: { reportType: 'all', reportStatus: 'all' },
  });

  const { refreshList } = list;

  // ===== 处理对话框状态 =====
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolveAction, setResolveAction] = useState('resolve');
  const [resolving, setResolving] = useState(false);

  // ===== 详情对话框状态 =====
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailReport, setDetailReport] = useState(null);

  // ===== 处理举报 =====
  const handleResolve = useCallback(
    async (resolveNote) => {
      if (!selectedReport) return;

      setResolving(true);
      try {
        await moderationApi.resolveReport(
          selectedReport.id,
          resolveAction,
          resolveNote?.trim() || ''
        );
        toast.success(resolveAction === 'resolve' ? '举报已处理' : '举报已驳回');
        setResolveDialogOpen(false);
        setSelectedReport(null);
        refreshList();
      } catch (err) {
        console.error('处理举报失败:', err);
        toast.error(err.message || '处理失败');
      } finally {
        setResolving(false);
      }
    },
    [selectedReport, resolveAction, refreshList]
  );

  const openResolveDialog = useCallback((report, action) => {
    setSelectedReport(report);
    setResolveAction(action);
    setResolveDialogOpen(true);
  }, []);

  const openDetailDialog = useCallback((report) => {
    setDetailReport(report);
    setDetailDialogOpen(true);
  }, []);

  return {
    ...list,
    // 处理对话框
    resolveDialogOpen,
    setResolveDialogOpen,
    selectedReport,
    resolveAction,
    resolving,
    handleResolve,
    openResolveDialog,
    // 详情对话框
    detailDialogOpen,
    setDetailDialogOpen,
    detailReport,
    openDetailDialog,
  };
}
