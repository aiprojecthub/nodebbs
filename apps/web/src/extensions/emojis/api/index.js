import apiClient from '@/lib/api';

// ============= 表情包扩展 API =============
export const emojiApi = {
  // ============ 公开接口 ============
  
  /**
   * 获取所有表情分组及其包含的表情
   * @returns {Promise<Array>} 表情分组列表
   */
  getAll: () => apiClient.get('/emojis'),

  // ============ 管理接口 (Admin Only) ============
  admin: {
    /**
     * 获取所有表情分组列表 (不包含表情详情)
     * @returns {Promise<Array>} 分组列表
     */
    getGroups: () => apiClient.get('/emojis/admin/groups'),

    /**
     * 获取单个表情分组详情 (包含该分组下的所有表情)
     * @param {number} id - 分组 ID
     * @returns {Promise<Object>} 分组详情
     */
    getGroup: (id) => apiClient.get(`/emojis/admin/groups/${id}`),

    /**
     * 创建新的表情分组
     * @param {Object} data - 分组数据 { name, slug, size, isActive }
     * @returns {Promise<Object>} 创建的分组
     */
    createGroup: (data) => apiClient.post('/emojis/admin/groups', data),

    /**
     * 更新表情分组
     * @param {number} id - 分组 ID
     * @param {Object} data - 更新的数据 { name, slug, size, isActive }
     * @returns {Promise<Object>} 更新后的分组
     */
    updateGroup: (id, data) => apiClient.patch(`/emojis/admin/groups/${id}`, data),

    /**
     * 删除表情分组
     * @param {number} id - 分组 ID
     * @returns {Promise<void>}
     */
    deleteGroup: (id) => apiClient.delete(`/emojis/admin/groups/${id}`),

    /**
     * 批量更新分组排序
     * @param {Array<{id: number, order: number}>} items - 排序数组
     * @returns {Promise<void>}
     */
    batchReorderGroups: (items) => apiClient.patch('/emojis/admin/groups/batch-reorder', { items }),

    /**
     * 创建表情 (添加表情到分组)
     * @param {Object} data - 表情数据 { groupId, code, url }
     * @returns {Promise<Object>} 创建的表情
     */
    createEmoji: (data) => apiClient.post('/emojis/admin/emojis', data),

    /**
     * 删除表情
     * @param {number} id - 表情 ID
     * @returns {Promise<void>}
     */
    deleteEmoji: (id) => apiClient.delete(`/emojis/admin/emojis/${id}`),

    /**
     * 批量更新表情排序
     * @param {Array<{id: number, order: number, groupId: number}>} items - 排序数组
     * @returns {Promise<void>}
     */
    batchReorder: (items) => apiClient.patch('/emojis/admin/emojis/batch-reorder', { items }),
  },
};
