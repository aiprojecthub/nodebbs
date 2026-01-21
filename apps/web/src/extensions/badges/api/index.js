import apiClient from '../../../lib/api';

export const badgesApi = {
  // 获取所有可用勋章
  async getAll(params = {}) {
    return apiClient.get('/badges', params);
  },

  // 获取用户的勋章
  async getUserBadges(userId) {
    return apiClient.get(`/badges/users/${userId}`);
  },

  // 获取单个勋章
  async getById(id) {
    return apiClient.get(`/badges/${id}`);
  },

  // 更新用户勋章展示设置
  async updateDisplay(userBadgeId, data) {
    return apiClient.request(`/badges/user/${userBadgeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // 管理员 API
  admin: {
    // 获取所有勋章 (支持 include_inactive 参数)
    getAll(params = {}) {
      return apiClient.get('/badges', { ...params, include_inactive: true });
    },
    // 创建勋章 (Admin Only)
    create(data) {
      return apiClient.post('/badges', data);
    },
    // 更新勋章 (Admin Only)
    update(id, data) {
      return apiClient.request(`/badges/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    // 删除勋章 (Admin Only)
    delete(id) {
      return apiClient.delete(`/badges/${id}`);
    },
    
    // 纯管理操作 (保留 /admin 前缀)
    grant(data) {
      return apiClient.post('/badges/admin/grant', data);
    },
    revoke(data) {
      return apiClient.post('/badges/admin/revoke', data);
    },
  },
};
