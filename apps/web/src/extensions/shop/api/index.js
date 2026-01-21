import apiClient from '../../../lib/api';

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

  // 赠送商品
  async giftItem(itemId, receiverId, message) {
    return apiClient.post(`/shop/items/${itemId}/gift`, { receiverId, message });
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
    // 获取所有商品 (支持 include_inactive 参数)
    async getItems(params = {}) {
      return apiClient.get('/shop/items', { ...params, include_inactive: true });
    },

    // 创建商品 (Admin Only)
    async createItem(data) {
      return apiClient.post('/shop/items', data);
    },

    // 更新商品 (Admin Only)
    async updateItem(itemId, data) {
      return apiClient.request(`/shop/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    // 删除商品 (Admin Only)
    async deleteItem(itemId) {
      return apiClient.delete(`/shop/items/${itemId}`);
    },
  },
};
