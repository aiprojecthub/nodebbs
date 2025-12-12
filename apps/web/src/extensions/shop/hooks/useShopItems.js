import { useState, useEffect, useCallback } from 'react';
import { shopApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 带有筛选功能的获取商品列表 Hook
 * @param {Object} options - { type, page, limit, isAdmin }
 * @returns {Object} { items, total, loading, error, refetch }
 */
export function useShopItems(options = {}) {
  const { type, page = 1, limit = 20, isAdmin = false } = options;
  
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (type && type !== 'all') params.type = type;

      const api = isAdmin ? shopApi.admin : shopApi;
      const data = await api.getItems(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('获取商品列表失败:', err);
      setError(err);
      toast.error('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  }, [type, page, limit, isAdmin]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    total,
    loading,
    error,
    refetch: fetchItems,
  };
}
