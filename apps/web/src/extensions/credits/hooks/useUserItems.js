import { useState, useEffect, useCallback } from 'react';
import { shopApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 获取用户已购买物品的 Hook
 * @param {Object} options - { type }
 * @returns {Object} { items, loading, error, refetch }
 */
export function useUserItems(options = {}) {
  const { type } = options;
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (type && type !== 'all') params.type = type;

      const data = await shopApi.getMyItems(params);
      setItems(data.items || []);
    } catch (err) {
      console.error('获取我的道具失败:', err);
      setError(err);
      toast.error('获取我的道具失败');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
  };
}
