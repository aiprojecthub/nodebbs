'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { toast } from 'sonner';

/**
 * 管理后台通用分页列表 Hook
 * 处理搜索、筛选、分页的公共逻辑
 *
 * @param {Object} options
 * @param {Function} options.fetchFn - async (params) => { items, total }
 * @param {number} [options.pageSize=20] - 每页条数
 * @param {Object} [options.defaultFilters={}] - 默认筛选值
 * @param {number} [options.debounceMs=500] - 搜索防抖延迟
 * @param {boolean} [options.fetchOnMount=true] - 是否挂载时自动请求
 */
export function useAdminList({
  fetchFn,
  pageSize = 20,
  defaultFilters = {},
  debounceMs = 500,
  fetchOnMount = true,
}) {
  // ===== 列表数据 =====
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // ===== 搜索 =====
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, debounceMs);

  // ===== 筛选 =====
  const [filters, setFilters] = useState(defaultFilters);

  // 防止首次渲染时 debouncedSearch 触发重置
  const isInitialMount = useRef(true);
  // 控制首次挂载是否自动请求（独立于搜索 effect）
  const hasFetched = useRef(false);
  // 用 ref 持有最新的 fetchFn，避免闭包捕获过时引用
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  // 搜索词变化时重置页码
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage((prev) => (prev !== 1 ? 1 : prev));
  }, [debouncedSearch]);

  // 数据请求
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 构建参数：排除值为 'all' 的筛选项
      const activeFilters = {};
      for (const [key, value] of Object.entries(filters)) {
        if (value !== 'all') {
          activeFilters[key] = value;
        }
      }

      const params = {
        page,
        limit: pageSize,
        ...(debouncedSearch?.trim() ? { search: debouncedSearch.trim() } : {}),
        ...activeFilters,
      };

      const data = await fetchFnRef.current(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('获取列表数据失败:', err);
      toast.error(err.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filters]);

  useEffect(() => {
    if (!fetchOnMount && !hasFetched.current) {
      hasFetched.current = true;
      return;
    }
    hasFetched.current = true;
    fetchData();
  }, [fetchData]);

  // ===== 筛选操作 =====
  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  // ===== 乐观更新辅助 =====
  const updateItem = useCallback((id, updates) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  const prependItem = useCallback((item) => {
    setItems((prev) => [item, ...prev]);
    setTotal((prev) => prev + 1);
  }, []);

  return {
    // 数据
    items,
    loading,
    page,
    total,
    search,
    debouncedSearch,
    filters,
    limit: pageSize,

    // 设置器
    setSearch,
    setPage,
    setFilter,
    setFilters,
    setItems,
    setTotal,

    // 乐观更新
    updateItem,
    removeItem,
    prependItem,

    // 动作
    refreshList: fetchData,
  };
}
