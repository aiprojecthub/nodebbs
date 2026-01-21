import apiClient from '../../../lib/api';

// ============= 广告系统 API =============
export const adsApi = {
  // 获取指定广告位的广告（用于前端展示）
  async getAdsBySlot(slotCode) {
    return apiClient.get(`/ads/display/${slotCode}`);
  },

  // 记录广告展示
  async recordImpression(adId) {
    return apiClient.post(`/ads/${adId}/impression`);
  },

  // 记录广告点击
  async recordClick(adId) {
    return apiClient.post(`/ads/${adId}/click`);
  },

  // 管理员 API (现在是统一的 RESTful 接口)
  admin: {
    // ============ 广告位管理 ============
    slots: {
      // 获取所有广告位 (支持 include_inactive 参数)
      async getAll(params = {}) {
        return apiClient.get('/ads/slots', { ...params, include_inactive: true });
      },

      // 获取单个广告位
      async getById(id) {
        return apiClient.get(`/ads/slots/${id}`);
      },

      // 创建广告位 (Admin Only)
      async create(data) {
        return apiClient.post('/ads/slots', data);
      },

      // 更新广告位 (Admin Only)
      async update(id, data) {
        return apiClient.patch(`/ads/slots/${id}`, data);
      },

      // 删除广告位 (Admin Only)
      async delete(id) {
        return apiClient.delete(`/ads/slots/${id}`);
      },
    },

    // ============ 广告管理 ============
    // 获取广告列表 (支持 include_inactive 参数)
    async getAds(params = {}) {
      return apiClient.get('/ads', { ...params, include_inactive: true });
    },

    // 获取单个广告
    async getAdById(id) {
      return apiClient.get(`/ads/${id}`);
    },

    // 创建广告 (Admin Only)
    async createAd(data) {
      return apiClient.post('/ads', data);
    },

    // 更新广告 (Admin Only)
    async updateAd(id, data) {
      return apiClient.patch(`/ads/${id}`, data);
    },

    // 删除广告 (Admin Only)
    async deleteAd(id) {
      return apiClient.delete(`/ads/${id}`);
    },
  },
};
