'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { isCurrencyActive } from '@/extensions/ledger/utils/currency';

const ExtensionContext = createContext(null);

export function ExtensionProvider({ children, activeCurrencies }) {
  const initializeState = () => {
    if (activeCurrencies) {
      const creditsActive = Array.isArray(activeCurrencies) && 
        activeCurrencies.some(c => c.code === 'credits' && c.isActive);
      
      return {
        isRewardsEnabled: creditsActive,
        isWalletEnabled: creditsActive,
        isShopEnabled: creditsActive,
        loading: false,
      };
    }

    return {
      isRewardsEnabled: false,
      isWalletEnabled: false,
      isShopEnabled: false,
      loading: true,
    };
  };

  const [extensions, setExtensions] = useState(initializeState);

  useEffect(() => {
    // 如果没有服务器端数据，则客户端获取
    if (!activeCurrencies) {
      checkExtensions();
    }
  }, []);

  const checkExtensions = async () => {
    try {
      // 检查积分/钱包功能是否启用
      // 目前主要依赖 'credits' 货币是否存在
      const creditsActive = await isCurrencyActive('credits');
      
      setExtensions({
        isRewardsEnabled: creditsActive,
        isWalletEnabled: creditsActive,
        isShopEnabled: creditsActive,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to check extensions status:', error);
      setExtensions(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <ExtensionContext.Provider value={extensions}>
      {children}
    </ExtensionContext.Provider>
  );
}

export function useExtensions() {
  const context = useContext(ExtensionContext);
  if (!context) {
    throw new Error('useExtensions must be used within ExtensionProvider');
  }
  return context;
}
