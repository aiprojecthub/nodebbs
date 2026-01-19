'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { adsApi } from '@/lib/api';

const AdsContext = createContext(null);

/**
 * 广告系统 Provider
 * @param {Object} props
 * @param {string[]} [props.preloadSlots] - 预加载的广告位代码列表
 * @param {React.ReactNode} props.children
 */
export function AdsProvider({ preloadSlots = [], children }) {
  // 存储各广告位的数据 { [slotCode]: { slot, ads, loading, error } }
  const [slotsData, setSlotsData] = useState({});
  // 已记录展示的广告 ID
  const impressionTracked = useRef(new Set());
  // 已请求过的广告位（防止重复请求）
  const requestedSlots = useRef(new Set());

  /**
   * 获取指定广告位的广告数据
   */
  const fetchSlotAds = useCallback(async (slotCode) => {
    if (!slotCode) return;

    // 标记已请求
    requestedSlots.current.add(slotCode);

    // 设置加载状态
    setSlotsData((prev) => ({
      ...prev,
      [slotCode]: {
        ...prev[slotCode],
        loading: true,
        error: null,
      },
    }));

    try {
      const result = await adsApi.getAdsBySlot(slotCode);

      setSlotsData((prev) => ({
        ...prev,
        [slotCode]: {
          slot: result.slot,
          ads: result.ads || [],
          loading: false,
          error: null,
        },
      }));

      // 记录广告展示
      if (result.ads && result.ads.length > 0) {
        result.ads.forEach((ad) => {
          if (!impressionTracked.current.has(ad.id)) {
            impressionTracked.current.add(ad.id);
            adsApi.recordImpression(ad.id).catch(() => {});
          }
        });
      }

      return result;
    } catch (error) {
      console.error(`获取广告位 ${slotCode} 失败:`, error);

      setSlotsData((prev) => ({
        ...prev,
        [slotCode]: {
          ...prev[slotCode],
          loading: false,
          error,
        },
      }));

      return null;
    }
  }, []);

  /**
   * 记录广告点击
   */
  const recordClick = useCallback((adId) => {
    if (adId) {
      adsApi.recordClick(adId).catch(() => {});
    }
  }, []);

  /**
   * 刷新指定广告位
   */
  const refreshSlot = useCallback((slotCode) => {
    return fetchSlotAds(slotCode);
  }, [fetchSlotAds]);

  /**
   * 刷新所有已加载的广告位
   */
  const refreshAll = useCallback(() => {
    const loadedSlots = Object.keys(slotsData);
    return Promise.all(loadedSlots.map(fetchSlotAds));
  }, [slotsData, fetchSlotAds]);

  // 预加载指定的广告位（仅在 mount 时执行一次）
  useEffect(() => {
    if (preloadSlots.length > 0) {
      preloadSlots.forEach((slotCode) => {
        if (!requestedSlots.current.has(slotCode)) {
          fetchSlotAds(slotCode);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // 仅在 mount 时执行

  /**
   * 检查广告位是否已请求
   */
  const isSlotRequested = useCallback((slotCode) => {
    return requestedSlots.current.has(slotCode);
  }, []);

  const value = {
    slotsData,
    fetchSlotAds,
    recordClick,
    refreshSlot,
    refreshAll,
    isSlotRequested,
  };

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

/**
 * 获取广告系统上下文
 */
export function useAdsContext() {
  const context = useContext(AdsContext);
  if (!context) {
    throw new Error('useAdsContext must be used within an AdsProvider');
  }
  return context;
}

/**
 * 获取指定广告位的广告数据
 * @param {string} slotCode - 广告位代码
 * @returns {{ slot: Object|null, ads: Array, loading: boolean, error: Error|null, refresh: Function, recordClick: Function }}
 */
export function useAds(slotCode) {
  const { slotsData, fetchSlotAds, recordClick, refreshSlot, isSlotRequested } = useAdsContext();

  const slotData = slotsData[slotCode] || {
    slot: null,
    ads: [],
    loading: false,
    error: null,
  };

  // 如果该广告位还没有数据，自动获取
  useEffect(() => {
    if (slotCode && !isSlotRequested(slotCode)) {
      fetchSlotAds(slotCode);
    }
  }, [slotCode, fetchSlotAds, isSlotRequested]);

  const refresh = useCallback(() => {
    return refreshSlot(slotCode);
  }, [refreshSlot, slotCode]);

  return {
    ...slotData,
    refresh,
    recordClick,
  };
}
