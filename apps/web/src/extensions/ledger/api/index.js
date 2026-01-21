import apiClient from '../../../lib/api';
import { DEFAULT_CURRENCY_CODE } from '../constants';

export const ledgerApi = {
  // 获取当前用户的所有账户余额（钱包视图）
  async getAccounts() {
    return apiClient.get('/ledger/accounts');
  },

  // 获取所有活跃货币（公开）
  async getActiveCurrencies() {
    return apiClient.get('/ledger/active-currencies');
  },

  // 获取统计信息（管理员全局/用户个人）
  async getStats(params = {}) {
      // params: { currency, userId }
      return apiClient.get('/ledger/stats', params);
  },

  // 获取用户交易历史（统一接口）
  async getTransactions(params = {}) {
    // params: { page, limit, currency, userId }
    return apiClient.get('/ledger/transactions', params);
  },

  // 获取单个货币余额
  async getBalance(currency = DEFAULT_CURRENCY_CODE, userId) {
    const params = { currency };
    if (userId) {
      params.userId = userId;
    }
    return apiClient.get('/ledger/balance', params);
  },

  // 获取所有货币 (支持 RESTful: GET /ledger/currencies)
  async getCurrencies() {
    return apiClient.get('/ledger/currencies');
  },

  // 创建或更新货币 (Admin Only: POST /ledger/currencies)
  async upsertCurrency(data) {
    return apiClient.post('/ledger/currencies', data);
  },

  // 管理员 API
  admin: {
      // 保留纯管理操作 (保留 /admin 前缀)
      async operation(data) {
          return apiClient.post('/ledger/admin/operation', data);
      }
  }
};
