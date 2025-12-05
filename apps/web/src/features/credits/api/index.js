import apiClient from '../../../lib/api';

// ============= 积分系统 API =============
export const creditsApi = {
  // 获取积分系统状态
  async getStatus() {
    return apiClient.get('/credits/status');
  },

  // 获取当前用户积分余额
  async getBalance() {
    return apiClient.get('/credits/balance');
  },

  // 每日签到
  async checkIn() {
    return apiClient.post('/credits/check-in');
  },

  // 获取交易记录
  async getTransactions(params = {}) {
    return apiClient.get('/credits/transactions', params);
  },

  // 打赏帖子
  async reward(postId, amount, message) {
    return apiClient.post('/credits/reward', { postId, amount, message });
  },

  // 获取帖子的打赏列表
  async getPostRewards(postId, params = {}) {
    return apiClient.get(`/credits/rewards/${postId}`, params);
  },

  // 获取积分排行榜
  async getRanking(params = {}) {
    return apiClient.get('/credits/rank', params);
  },

  // 管理员 API
  admin: {
    // 获取积分系统统计
    async getStats() {
      return apiClient.get('/credits/admin/stats');
    },

    // 获取所有交易记录
    async getTransactions(params = {}) {
      return apiClient.get('/credits/admin/transactions', params);
    },

    // 手动发放积分
    async grant(userId, amount, description) {
      return apiClient.post('/credits/admin/grant', { userId, amount, description });
    },

    // 手动扣除积分
    async deduct(userId, amount, description) {
      return apiClient.post('/credits/admin/deduct', { userId, amount, description });
    },

    // 获取积分配置
    async getConfig() {
      return apiClient.get('/credits/admin/config');
    },

    // 更新积分配置
    async updateConfig(key, value) {
      return apiClient.request(`/credits/admin/config/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      });
    },
  },
};

// ============= 商城系统 API =============
export const shopApi = {
  // 获取商城商品列表
  async getItems(params = {}) {
    return apiClient.get('/shop/items', params);
  },

  // 购买商品
  async buyItem(itemId) {
    return apiClient.post(`/shop/items/${itemId}/buy`);
  },

  // 获取我的商品列表
  async getMyItems(params = {}) {
    return apiClient.get('/shop/my-items', params);
  },

  // 获取指定用户装备的物品
  async getUserEquippedItems(userId) {
    return apiClient.get(`/shop/users/${userId}/equipped-items`);
  },

  // 装备商品
  async equipItem(userItemId) {
    return apiClient.post(`/shop/my-items/${userItemId}/equip`);
  },

  // 卸下商品
  async unequipItem(userItemId) {
    return apiClient.post(`/shop/my-items/${userItemId}/unequip`);
  },

  // 管理员 API
  admin: {
    // 获取所有商品（含下架）
    async getItems(params = {}) {
      return apiClient.get('/shop/admin/items', params);
    },

    // 创建商品
    async createItem(data) {
      return apiClient.post('/shop/admin/items', data);
    },

    // 更新商品
    async updateItem(itemId, data) {
      return apiClient.request(`/shop/admin/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    // 删除商品
    async deleteItem(itemId) {
      return apiClient.delete(`/shop/admin/items/${itemId}`);
    },
  },
};
