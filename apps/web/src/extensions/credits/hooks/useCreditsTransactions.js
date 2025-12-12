import { useState, useEffect, useCallback } from 'react';
import { creditsApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 带有分页的获取积分交易记录的 Hook
 * @param {Object} options - { page, limit, userId, username }
 * @returns {Object} { transactions, total, loading, error, refetch }
 */
export function useCreditsTransactions(options = {}) {
  const { page = 1, limit = 20, userId, username } = options;
  
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (userId) params.userId = userId;
      if (username) params.username = username;

      const data = await creditsApi.getTransactions(params);
      setTransactions(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('获取交易记录失败:', err);
      setError(err);
      toast.error('获取交易记录失败');
    } finally {
      setLoading(false);
    }
  }, [page, limit, userId, username]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    total,
    loading,
    error,
    refetch: fetchTransactions,
  };
}
