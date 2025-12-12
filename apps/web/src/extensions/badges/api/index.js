import apiClient from '../../../lib/api';

export const badgesApi = {
  // Get all available badges
  async getAll(params = {}) {
    return apiClient.get('/badges', params);
  },

  // Get user's badges
  async getUserBadges(userId) {
    return apiClient.get(`/badges/users/${userId}`);
  },

  // Admin API
  admin: {
    getAll(params = {}) {
      return apiClient.get('/badges/admin', params);
    },
    create(data) {
      return apiClient.post('/badges/admin', data);
    },
    update(id, data) {
      return apiClient.request(`/badges/admin/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete(id) {
      return apiClient.delete(`/badges/admin/${id}`);
    },
  },
};
