'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Provider 列表管理 Hook
 * 管理 provider 列表的获取、编辑/测试状态、乐观更新
 *
 * @param {Object} options
 * @param {Function} options.fetchFn - async () => { items: Provider[] }
 * @param {string} [options.idField='provider'] - 唯一标识字段名
 * @param {boolean} [options.exclusiveEnable=false] - 启用时是否互斥（禁用其他）
 * @param {string} [options.errorMessage='获取配置失败'] - 获取失败提示
 */
export function useProviderSettings({
  fetchFn,
  idField = 'provider',
  exclusiveEnable = false,
  errorMessage = '获取配置失败',
}) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState(null);
  const [testingProvider, setTestingProvider] = useState(null);

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchFnRef.current();
      setProviders(data.items || []);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [errorMessage]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const updateProvider = useCallback(
    (id, updates) => {
      setProviders((prev) =>
        prev.map((p) => {
          if (exclusiveEnable && updates.isEnabled && p[idField] !== id) {
            return { ...p, isEnabled: false };
          }
          if (p[idField] === id) {
            return { ...p, ...updates };
          }
          return p;
        })
      );
    },
    [idField, exclusiveEnable]
  );

  return {
    providers,
    setProviders,
    loading,
    editingProvider,
    setEditingProvider,
    testingProvider,
    setTestingProvider,
    updateProvider,
    fetchProviders,
  };
}
