'use client';

import { useState, useEffect, useCallback } from 'react';
import { invitationsApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 邀请码页面 Hook
 * 管理邀请码列表、配额、生成等状态和逻辑
 */
export function useInvitations() {
  // ===== 列表状态 =====
  const [codes, setCodes] = useState([]);
  const [stats, setStats] = useState(null);
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');

  // ===== 生成对话框状态 =====
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    note: '',
    count: 1,
  });

  // ===== 加载邀请码列表 =====
  const loadCodes = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pageSize,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      };
      const data = await invitationsApi.getMyCodes(params);
      setCodes(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load invitation codes:', error);
      toast.error('加载邀请码失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  // ===== 加载配额信息 =====
  const loadQuota = useCallback(async () => {
    try {
      const data = await invitationsApi.getMyQuota();
      setQuota(data.quota);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load quota:', error);
      // if (error.message && error.message.includes('禁用')) {
      //   toast.error(error.message);
      // }
    }
  }, []);

  // ===== 初始加载 =====
  useEffect(() => {
    loadQuota();
  }, [loadQuota]);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  // ===== 生成邀请码 =====
  const handleGenerate = useCallback(async () => {
    try {
      setGenerating(true);

      if (generateForm.count < 1) {
        toast.error('生成数量至少为 1');
        return;
      }

      if (quota && generateForm.count > quota.todayRemaining) {
        toast.error(`生成数量不能超过今日剩余次数（${quota.todayRemaining}）`);
        return;
      }

      const result = await invitationsApi.generate(generateForm);

      const count = result.count || result.codes?.length || 1;
      toast.success(`成功生成 ${count} 个邀请码！`);
      setIsGenerateDialogOpen(false);
      setGenerateForm({ note: '', count: 1 });
      setPage(1);
      loadCodes();
      loadQuota();
    } catch (error) {
      console.error('Failed to generate invitation code:', error);
      toast.error(error.message || '生成邀请码失败');
    } finally {
      setGenerating(false);
    }
  }, [generateForm, quota, loadCodes, loadQuota]);

  // ===== 更新生成表单 =====
  const updateGenerateForm = useCallback((field, value) => {
    setGenerateForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ===== 工具函数：获取状态标签样式 =====
  const getStatusBadgeProps = useCallback((status) => {
    const badges = {
      active: { label: '活跃', className: 'bg-green-100 text-green-800' },
      used: { label: '已使用', className: 'bg-gray-100 text-gray-800' },
      expired: { label: '已过期', className: 'bg-red-100 text-red-800' },
      disabled: { label: '已禁用', className: 'bg-yellow-100 text-yellow-800' },
    };
    return badges[status] || badges.active;
  }, []);

  // ===== 工具函数：格式化日期 =====
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // ===== 派生状态 =====
  /** 是否可以生成邀请码 */
  const canGenerate = quota && quota.todayRemaining > 0;

  return {
    // ===== 列表数据 =====
    /** 邀请码列表 */
    codes,
    /** 统计信息 */
    stats,
    /** 配额信息 */
    quota,
    /** 加载中 */
    loading,
    /** 当前页 */
    page,
    /** 每页数量 */
    pageSize,
    /** 总数 */
    total,
    /** 状态筛选 */
    statusFilter,
    /** 设置页码 */
    setPage,
    /** 设置状态筛选 */
    setStatusFilter,

    // ===== 生成对话框 =====
    /** 生成对话框打开状态 */
    isGenerateDialogOpen,
    /** 设置生成对话框状态 */
    setIsGenerateDialogOpen,
    /** 生成中 */
    generating,
    /** 生成表单数据 */
    generateForm,
    /** 更新生成表单 */
    updateGenerateForm,
    /** 执行生成 */
    handleGenerate,

    // ===== 工具函数 =====
    /** 获取状态标签属性 */
    getStatusBadgeProps,
    /** 格式化日期 */
    formatDate,

    // ===== 派生状态 =====
    /** 是否可以生成 */
    canGenerate,
  };
}
