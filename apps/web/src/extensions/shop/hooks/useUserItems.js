import { useState, useEffect, useCallback } from 'react';
import { shopApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 获取用户已购买物品的 Hook
 * @param {Object} options - { type }
 * @returns {Object} { items, loading, error, refetch, setItemEquipped, setItemEquippedWithUnequipSameType }
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

  // 设置单个物品的装备状态（用于卸下后的更新）
  const setItemEquipped = useCallback((itemId, isEquipped) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, isEquipped } : item
      )
    );
  }, []);

  // 设置物品装备状态并处理同类型互斥（用于装备后的更新）
  // 装备新物品时，将同类型的其他物品标记为未装备
  const setItemEquippedWithUnequipSameType = useCallback((itemId, itemType) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          return { ...item, isEquipped: true };
        }
        // 如果是同类型且已装备，则标记为未装备
        if (item.itemType === itemType && item.isEquipped) {
          return { ...item, isEquipped: false };
        }
        return item;
      })
    );
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    setItems,
    loading,
    error,
    refetch: fetchItems,
    setItemEquipped,
    setItemEquippedWithUnequipSameType,
  };
}
