import { request } from '@/lib/server/api';
import { DEFAULT_CURRENCY_CODE } from '@/extensions/ledger/constants';

/**
 * 获取活跃货币列表 (Server Side)
 * @returns {Promise<Array>}
 */
export async function getActiveCurrencies() {
    try {
        const activeCurrencies = await request('/ledger/active-currencies');
        return Array.isArray(activeCurrencies) ? activeCurrencies : [];
    } catch (error) {
        console.error('[Server] Failed to fetch active currencies', error);
        return [];
    }
}

/**
 * 获取默认货币名称 (Server Side)
 * @returns {Promise<string>} 货币名称，如果获取失败则返回 '积分'
 */
export async function getDefaultCurrencyName() {
    try {
        const currencies = await getActiveCurrencies();
        const defaultCurrency = currencies.find(c => c.code === DEFAULT_CURRENCY_CODE);
        return defaultCurrency?.name || '积分';
    } catch (error) {
        console.error('[Server] Failed to get default currency name', error);
        return '积分';
    }
}

/**
 * 检查特定货币是否已启用 (Server Side)
 * 使用后端公开接口 /api/ledger/active-currencies
 * @param {string} currencyCode - 货币代码 (默认 'credits')
 * @returns {Promise<boolean>}
 */
export async function isCurrencyActive(currencyCode = DEFAULT_CURRENCY_CODE) {
    try {
        const activeCurrencies = await getActiveCurrencies();
        return activeCurrencies.some(c => c.code === currencyCode);
    } catch (error) {
        console.error(`[Server] Failed to check status for currency ${currencyCode}`, error);
        return false;
    }
}
