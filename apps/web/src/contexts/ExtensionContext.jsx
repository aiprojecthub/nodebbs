'use client';

import { createContext, useContext, useMemo } from 'react';
import { DEFAULT_CURRENCY_CODE } from '@/extensions/ledger/constants';

const ExtensionContext = createContext(null);

// 重新导出常量，保持向后兼容
export { DEFAULT_CURRENCY_CODE };

export function ExtensionProvider({ children, activeCurrencies = [] }) {
  // 直接使用 SSR 传递的数据，不进行客户端请求
  const extensions = useMemo(() => {
    const defaultCurrency = activeCurrencies.find(
      c => c.code === DEFAULT_CURRENCY_CODE && c.isActive
    );

    return {
      isRewardsEnabled: !!defaultCurrency,
      isWalletEnabled: !!defaultCurrency,
      isShopEnabled: !!defaultCurrency,
      currencies: activeCurrencies,
      defaultCurrency: defaultCurrency || null,
      loading: false,
    };
  }, [activeCurrencies]);

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

/**
 * 获取货币名称的 hook
 * @param {string} code - 货币 code，默认为 'credits'
 * @returns {string} 货币名称，如果找不到则返回 code
 */
export function useCurrencyName(code = DEFAULT_CURRENCY_CODE) {
  const { currencies, defaultCurrency } = useExtensions();

  return useMemo(() => {
    // 如果是默认货币，直接使用缓存的 defaultCurrency
    if (code === DEFAULT_CURRENCY_CODE && defaultCurrency) {
      return defaultCurrency.name;
    }
    // 否则从列表中查找
    const currency = currencies.find(c => c.code === code);
    return currency?.name || code;
  }, [code, currencies, defaultCurrency]);
}

/**
 * 获取默认货币名称（简便方法）
 * @returns {string} 默认货币名称
 */
export function useDefaultCurrencyName() {
  return useCurrencyName(DEFAULT_CURRENCY_CODE);
}
