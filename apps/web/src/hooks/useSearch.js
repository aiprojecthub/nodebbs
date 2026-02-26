import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchApi } from '@/lib/api';

/**
 * 搜索逻辑 Hook
 *
 * 设计说明：
 * - 懒加载：初始只请求当前 Tab（默认话题），切换 Tab 时按需加载
 * - AbortController 防止竞态条件
 * - 不预请求所有类型，不显示计数
 */
export function useSearch() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('s') || '';
  const typeParam = searchParams.get('type') || 'topics';

  // 有搜索关键词时初始为 loading，避免首帧闪烁"暂无话题"
  const [loading, setLoading] = useState(!!searchQuery);
  const [searchType, setSearchType] = useState(typeParam);
  // 按类型缓存已加载的结果，避免切换 Tab 时重复请求
  const [cache, setCache] = useState({});
  const abortControllerRef = useRef(null);

  // 当前类型的搜索结果
  const currentResults = cache[searchType] || { items: [], total: 0, page: 1, limit: 20 };

  /**
   * 加载指定类型的数据
   */
  const loadData = useCallback(async (type, page = 1, forceReload = false) => {
    const q = searchQuery.trim();
    if (!q) return;

    // 如果已有缓存且不是翻页/强制刷新，跳过
    if (!forceReload && page === 1 && cache[type]?.items?.length > 0) return;

    // 取消之前的请求
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const data = await searchApi.search(q, type, page, 20);
      if (controller.signal.aborted) return;

      setCache((prev) => ({
        ...prev,
        [type]: data,
      }));
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('搜索失败:', error);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // 搜索关键词改变时：清空缓存，加载当前 Tab
  useEffect(() => {
    setCache({});
    if (searchQuery.trim()) {
      loadData(searchType, 1, true);
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // 切换 Tab 时：按需加载（有缓存则跳过）
  const handleTypeChange = useCallback((type) => {
    setSearchType(type);
    loadData(type);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData]);

  /**
   * 加载特定类型的分页
   */
  const loadTypePage = useCallback((type, page) => {
    loadData(type, page, true);
  }, [loadData]);

  return {
    /** 搜索关键词 */
    searchQuery,
    /** 当前搜索类型 */
    searchType,
    /** 切换搜索类型 */
    setSearchType: handleTypeChange,
    /** 加载状态 */
    loading,
    /** 当前类型的搜索结果 */
    searchResults: currentResults,
    /** 加载特定类型的分页 */
    loadTypePage,
  };
}
