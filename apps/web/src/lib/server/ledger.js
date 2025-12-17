import { request } from '@/lib/server/api';

/**
 * 检查特定货币是否已启用 (Server Side)
 * 使用后端公开接口 /api/ledger/active-currencies
 * @param {string} currencyCode - 货币代码 (默认 'credits')
 * @returns {Promise<boolean>}
 */
export async function isCurrencyActive(currencyCode = 'credits') {
    try {
        const activeCurrencies = await request('/ledger/active-currencies');
        if (!Array.isArray(activeCurrencies)) {
            return false;
        }
        return activeCurrencies.some(c => c.code === currencyCode);
    } catch (error) {
        console.error(`[Server] Failed to check status for currency ${currencyCode}`, error);
        return false;
    }
}
