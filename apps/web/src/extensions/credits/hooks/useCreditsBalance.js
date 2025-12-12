import { useState, useEffect, useCallback } from 'react';
import { creditsApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 获取和管理用户积分余额的 Hook
 * @returns {Object} { balance, loading, error, refetch }
 */
export function useCreditsBalance() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await creditsApi.getBalance();
      setBalance(data);
    } catch (err) {
      console.error('获取积分余额失败:', err);
      setError(err);
      toast.error('获取积分余额失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance,
  };
}
