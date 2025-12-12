import { useState, useCallback } from 'react';
import { shopApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 处理物品装备/卸下操作的 Hook
 * @returns {Object} { equip, unequip, actioning, actioningItemId }
 */
export function useItemActions() {
  const [actioningItemId, setActioningItemId] = useState(null);

  const equip = useCallback(async (userItemId, onSuccess) => {
    setActioningItemId(userItemId);
    try {
      await shopApi.equipItem(userItemId);
      toast.success('装备成功');
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error('装备失败:', err);
      toast.error(err.message || '装备失败');
    } finally {
      setActioningItemId(null);
    }
  }, []);

  const unequip = useCallback(async (userItemId, onSuccess) => {
    setActioningItemId(userItemId);
    try {
      await shopApi.unequipItem(userItemId);
      toast.success('卸下成功');
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error('卸下失败:', err);
      toast.error(err.message || '卸下失败');
    } finally {
      setActioningItemId(null);
    }
  }, []);

  return {
    equip,
    unequip,
    actioning: actioningItemId !== null,
    actioningItemId,
  };
}
