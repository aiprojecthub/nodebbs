import { getApiBaseUrl } from './api-url';

// API 客户端配置

class ApiClient {
  constructor() {
    this.baseURL = getApiBaseUrl();
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Cookie 自动处理认证，无需手动添加 Authorization 头

    const config = {
      ...options,
      headers,
      credentials: 'include', // 允许跨域请求携带 Cookie
    };

    try {
      const response = await fetch(url, config);

      // 处理 401 未授权
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('unauthorized'));
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'API 请求失败');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET 请求
  async get(endpoint, params) {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request(endpoint + queryString, {
      method: 'GET',
    });
  }

  // POST 请求
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data || {}),
      ...options,
      headers: { ...options.headers },
    });
  }

  // PUT 请求
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data || {}),
      ...options,
      headers: { ...options.headers },
    });
  }

  // PATCH 请求
  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data || {}),
      ...options,
      headers: { ...options.headers },
    });
  }

  // DELETE 请求
  async delete(endpoint, params) {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request(endpoint + queryString, {
      method: 'DELETE',
      body: JSON.stringify({}),
    });
  }
}

// 创建单例实例
const apiClient = new ApiClient();

// ============= 认证 API =============
export const authApi = {
  // 注册
  async register(data) {
    const { captchaToken, ...rest } = data;
    return apiClient.post('/auth/register', rest, {
      headers: captchaToken ? { 'x-captcha-token': captchaToken } : {},
    });
  },

  // 登录（支持用户名或邮箱）
  async login(identifier, password, captchaToken) {
    return apiClient.post('/auth/login', { identifier, password }, {
      headers: captchaToken ? { 'x-captcha-token': captchaToken } : {},
    });
  },

  // 登出
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('登出失败:', e);
    }
    // Cookie 会被后端清除，无需前端操作
  },

  // 获取当前用户
  async getCurrentUser() {
    return apiClient.get('/auth/me');
  },

  // 使用验证码重置密码
  async resetPassword(email, code, password) {
    return apiClient.post('/auth/reset-password', { email, code, password });
  },

  // 使用验证码验证邮箱
  async verifyEmail(code) {
    return apiClient.post('/auth/verify-email', { code });
  },

  // 发送验证码（统一接口）
  async sendCode(identifier, type) {
    return apiClient.post('/auth/send-code', { identifier, type });
  },

  // 校验验证码（仅校验，不参与业务逻辑）
  async verifyCode(identifier, code, type) {
    return apiClient.post('/auth/verify-code', { identifier, code, type });
  },

  // ============= 扫码登录 API =============
  // 生成扫码登录请求
  async generateQRLogin() {
    return apiClient.post('/auth/qr-login/generate');
  },

  // 查询扫码登录状态
  async getQRLoginStatus(requestId) {
    return apiClient.get(`/auth/qr-login/status/${requestId}`);
  },

  // App端确认扫码登录
  async confirmQRLogin(requestId) {
    return apiClient.post('/auth/qr-login/confirm', { requestId });
  },

  // 取消扫码登录请求
  async cancelQRLogin(requestId) {
    return apiClient.post('/auth/qr-login/cancel', { requestId });
  },

  // OAuth 相关
  // 获取 GitHub OAuth 授权链接
  async getGithubAuthUrl() {
    return apiClient.get('/oauth/github/connect');
  },

  // 获取 Google OAuth 授权链接
  async getGoogleAuthUrl() {
    return apiClient.get('/oauth/google/connect');
  },

  // 获取 Apple OAuth 授权链接
  async getAppleAuthUrl() {
    return apiClient.get('/oauth/apple/connect');
  },

  // GitHub OAuth 回调处理
  async githubCallback(code, state) {
    return apiClient.post('/oauth/github/callback', { code, state });
  },

  // Google OAuth 回调处理
  async googleCallback(code, state) {
    return apiClient.post('/oauth/google/callback', { code, state });
  },

  // Apple OAuth 回调处理
  async appleCallback(code, state) {
    return apiClient.post('/oauth/apple/callback', { code, state });
  },

  // ============= 微信登录 API =============
  // 获取微信开放平台授权链接（Web 扫码登录）
  async getWechatOpenAuthUrl() {
    return apiClient.get('/oauth/wechat_open/connect');
  },

  // 微信开放平台回调处理
  async wechatOpenCallback(code, state) {
    return apiClient.post('/oauth/wechat_open/callback', { code, state });
  },

  // 获取微信公众号授权链接（H5 网页授权）
  async getWechatMpAuthUrl() {
    return apiClient.get('/oauth/wechat_mp/connect');
  },

  // 微信公众号回调处理
  async wechatMpCallback(code, state) {
    return apiClient.post('/oauth/wechat_mp/callback', { code, state });
  },

  // 微信小程序登录
  async wechatMiniprogramLogin(code, userInfo = null) {
    return apiClient.post('/oauth/wechat_miniprogram/login', { code, userInfo });
  },

  // 获取关联的 OAuth 账号
  async getOAuthAccounts() {
    return apiClient.get('/oauth/accounts');
  },

  // 解除 OAuth 账号关联
  async unlinkOAuthAccount(provider) {
    return apiClient.delete(`/oauth/unlink/${provider}`);
  },
};

// ============= 用户 API =============
export const userApi = {
  // 创建用户（管理员）
  async createUser(data) {
    return apiClient.post('/users', data);
  },

  // 获取用户列表（管理员）
  async getList(params = {}) {
    return apiClient.get('/users', params);
  },

  // 获取用户资料
  async getProfile(username) {
    return apiClient.get(`/users/${username}`);
  },

  // 更新当前用户资料
  async updateProfile(data) {
    return apiClient.patch('/users/me', data);
  },

  // 更新用户信息（管理员）
  async updateUser(userId, data) {
    return apiClient.patch(`/users/${userId}`, data);
  },

  // 上传头像
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${apiClient.baseURL}/users/me/upload-avatar`;
    // const headers = {
    //   'Authorization': `Bearer ${apiClient.token}`,
    // };

    const response = await fetch(url, {
      method: 'POST',
      // headers, // Multipart form data 不需要手动设置 Content-Type? 需要验证 fetch 对 FormData 的处理
      // 这里只需要 credentials 用于认证
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.error || 'Upload failed');
    }

    return response.json();
  },

  // 修改密码
  async changePassword(currentPassword, newPassword) {
    return apiClient.post('/users/me/change-password', {
      currentPassword,
      newPassword,
    });
  },

  // 修改用户名
  async changeUsername(newUsername, password) {
    return apiClient.post('/users/me/change-username', {
      newUsername,
      password,
    });
  },

  // 修改邮箱 - 一次性提交所有验证信息
  async changeEmail(oldEmailCode, newEmail, newEmailCode, password) {
    return apiClient.post('/users/me/change-email', {
      oldEmailCode,
      newEmail,
      newEmailCode,
      password,
    });
  },

  // 关注用户
  async followUser(username) {
    return apiClient.post(`/users/${username}/follow`);
  },

  // 取消关注
  async unfollowUser(username) {
    return apiClient.delete(`/users/${username}/follow`);
  },

  // 获取粉丝列表
  async getFollowers(username, page = 1, limit = 20) {
    return apiClient.get(`/users/${username}/followers`, { page, limit });
  },

  // 获取关注列表
  async getFollowing(username, page = 1, limit = 20) {
    return apiClient.get(`/users/${username}/following`, { page, limit });
  },

  // 获取用户收藏列表
  async getBookmarks(username, params = {}) {
    return apiClient.get(`/users/${username}/bookmarks`, params);
  },

  // 删除用户（管理员）
  async deleteUser(userId, permanent = false) {
    return apiClient.delete(`/users/${userId}`, { permanent });
  },
};

// ============= 分类 API =============
export const categoryApi = {
  // 获取所有分类
  async getAll() {
    return apiClient.get('/categories');
  },

  // 获取单个分类
  async getBySlug(slug) {
    return apiClient.get(`/categories/${slug}`);
  },

  // 创建分类 (管理员)
  async create(data) {
    return apiClient.post('/categories', data);
  },

  // 更新分类 (管理员)
  async update(id, data) {
    return apiClient.patch(`/categories/${id}`, data);
  },

  // 删除分类 (管理员)
  async delete(id) {
    return apiClient.delete(`/categories/${id}`);
  },

  // 批量更新分类排序（管理员）
  async batchReorder(items) {
    return apiClient.patch('/categories/batch-reorder', { items });
  },
};

// ============= 主题 API =============
export const topicApi = {
  // 获取主题列表
  async getList(params = {}) {
    // params: { page, limit, categoryId, userId, tag, sort }
    return apiClient.get('/topics', params);
  },

  // 获取主题详情
  async getById(id) {
    return apiClient.get(`/topics/${id}`);
  },

  // 创建主题
  async create(data) {
    // data: { title, categoryId, content, tags }
    return apiClient.post('/topics', data);
  },

  // 更新主题
  async update(id, data) {
    return apiClient.patch(`/topics/${id}`, data);
  },

  // 删除主题
  async delete(id, permanent = false) {
    const query = permanent ? '?permanent=true' : '';
    return apiClient.delete(`/topics/${id}${query}`);
  },

  // 收藏主题
  async bookmark(id) {
    return apiClient.post(`/topics/${id}/bookmark`);
  },

  // 取消收藏
  async unbookmark(id) {
    return apiClient.delete(`/topics/${id}/bookmark`);
  },

  // 订阅话题
  async subscribe(id) {
    return apiClient.post(`/topics/${id}/subscribe`);
  },

  // 取消订阅
  async unsubscribe(id) {
    return apiClient.delete(`/topics/${id}/subscribe`);
  },
};

// ============= 帖子 API =============
export const postApi = {
  // 获取主题的所有帖子
  async getByTopic(topicId, page = 1, limit = 20) {
    return apiClient.get('/posts', { topicId, page, limit });
  },

  // 获取用户的所有回复
  async getByUser(userId, page = 1, limit = 20) {
    return apiClient.get('/posts', { userId, page, limit });
  },

  // 获取单个帖子
  async getById(id) {
    return apiClient.get(`/posts/${id}`);
  },

  // 创建帖子 (回复)
  async create(data) {
    // data: { topicId, content, replyToPostId }
    return apiClient.post('/posts', data);
  },

  // 更新帖子
  async update(id, content) {
    return apiClient.patch(`/posts/${id}`, { content });
  },

  // 删除帖子
  async delete(id, permanent = false) {
    const query = permanent ? '?permanent=true' : '';
    return apiClient.delete(`/posts/${id}${query}`);
  },

  // 点赞帖子
  async like(id) {
    return apiClient.post(`/posts/${id}/like`);
  },

  // 取消点赞
  async unlike(id) {
    return apiClient.delete(`/posts/${id}/like`);
  },

  // 管理员：获取所有回复列表（不传 topicId 和 userId 即为管理员模式）
  async getAdminList(params = {}) {
    return apiClient.get('/posts', params);
  },

  // 获取帖子在话题中的位置（用于跳转到指定楼层）
  async getPosition(postId, topicId, limit = 20) {
    return apiClient.get(`/posts/${postId}/position`, { topicId, limit });
  },
};

// ============= 标签 API =============
export const tagApi = {
  // 获取所有标签
  async getAll(search = '', limit = 50) {
    return apiClient.get('/tags', { search, limit });
  },

  // 获取标签详情
  async getBySlug(slug) {
    return apiClient.get(`/tags/${slug}`);
  },

  // 获取标签下的主题
  async getTopics(slug, page = 1, limit = 20) {
    return apiClient.get(`/tags/${slug}/topics`, { page, limit });
  },

  // 创建标签
  async create(data) {
    return apiClient.post('/tags', data);
  },

  // 更新标签（管理员）
  async update(id, data) {
    return apiClient.patch(`/tags/${id}`, data);
  },

  // 删除标签（管理员）
  async delete(id) {
    return apiClient.delete(`/tags/${id}`);
  },

  // 获取标签列表（带分页）
  async getList(params = {}) {
    return apiClient.get('/tags', params);
  },
};

// ============= 通知 API =============
export const notificationApi = {
  // 获取通知列表
  async getList(page = 1, limit = 20, unreadOnly = false) {
    return apiClient.get('/notifications', { page, limit, unreadOnly });
  },

  // 标记为已读
  async markAsRead(id) {
    return apiClient.patch(`/notifications/${id}/read`);
  },

  // 标记所有为已读
  async markAllAsRead() {
    return apiClient.post('/notifications/read-all');
  },

  // 删除通知
  async delete(id) {
    return apiClient.delete(`/notifications/${id}`);
  },

  // 删除所有已读通知
  async deleteAllRead() {
    return apiClient.delete('/notifications/read/all');
  },
};

// ============= 搜索 API =============
export const searchApi = {
  // 全局搜索
  async search(query, type = 'all', page = 1, limit = 20) {
    return apiClient.get('/search', { q: query, type, page, limit });
  },
};

// ============= 审核 API =============
export const moderationApi = {
  // 新的统一举报接口
  async createReport(reportType, targetId, reason) {
    return apiClient.post('/moderation/reports', { reportType, targetId, reason });
  },

  // 举报话题
  async reportTopic(topicId, reason) {
    return apiClient.post('/moderation/reports', { 
      reportType: 'topic', 
      targetId: topicId, 
      reason 
    });
  },

  // 举报回复
  async reportPost(postId, reason) {
    return apiClient.post('/moderation/reports', { 
      reportType: 'post', 
      targetId: postId, 
      reason 
    });
  },

  // 举报用户
  async reportUser(userId, reason) {
    return apiClient.post('/moderation/reports', { 
      reportType: 'user', 
      targetId: userId, 
      reason 
    });
  },

  // 获取举报列表 (版主/管理员)
  async getReports(reportType = 'all', status = 'pending', page = 1, limit = 20, search = '') {
    return apiClient.get('/moderation/reports', { reportType, status, page, limit, search });
  },

  // 处理举报 (版主/管理员)
  async resolveReport(id, action, note = '') {
    return apiClient.patch(`/moderation/reports/${id}/resolve`, { action, note });
  },

  // 封禁用户 (管理员)
  async banUser(id, options = {}) {
    return apiClient.post(`/moderation/users/${id}/ban`, options);
  },

  // 解封用户 (管理员)
  async unbanUser(id) {
    return apiClient.post(`/moderation/users/${id}/unban`);
  },

  // 修改用户角色 (管理员)
  async changeUserRole(id, role) {
    return apiClient.patch(`/moderation/users/${id}/role`, { role });
  },

  // 获取用户状态 (管理员/版主)
  async getUserStatus(id) {
    return apiClient.get(`/moderation/users/${id}/status`);
  },

  // ============= 内容审核 API =============
  // 获取待审核统计数据
  async getStat() {
    return apiClient.get('/moderation/stat');
  },

  // 获取待审核内容列表
  async getPending(type = 'all', page = 1, limit = 20) {
    return apiClient.get('/moderation/pending', { type, page, limit });
  },

  // 批准内容
  async approve(type, id) {
    return apiClient.post(`/moderation/approve/${type}/${id}`);
  },

  // 拒绝内容
  async reject(type, id) {
    return apiClient.post(`/moderation/reject/${type}/${id}`);
  },

  // 获取审核日志列表
  async getLogs(params = {}) {
    // params: { targetType, action, targetId, moderatorId, page, limit, search }
    return apiClient.get('/moderation/logs', params);
  },

  // 获取特定内容的审核日志
  async getLogsByTarget(targetType, targetId) {
    return apiClient.get(`/moderation/logs/${targetType}/${targetId}`);
  },
};

// ============= 系统 API =============
export const systemApi = {
  // 获取论坛统计
  async getStats() {
    return apiClient.get('/stats');
  },
};

// ============= 站内信 API =============
export const messageApi = {
  // 获取会话列表（按用户分组）
  async getConversations(page = 1, limit = 20) {
    return apiClient.get('/messages/conversations', { page, limit });
  },

  // 获取消息列表（旧接口，保留向后兼容）
  async getList(box = 'inbox', page = 1, limit = 20) {
    return apiClient.get('/messages', { box, page, limit });
  },

  // 获取单个消息
  async getById(id) {
    return apiClient.get(`/messages/${id}`);
  },

  // 获取和某个用户的会话记录
  async getConversation(userId, page = 1, limit = 20) {
    return apiClient.get(`/messages/conversation/${userId}`, { page, limit });
  },

  // 发送消息
  async send(data) {
    // data: { recipientId, subject, content }
    return apiClient.post('/messages', data);
  },

  // 删除消息
  async delete(id) {
    return apiClient.delete(`/messages/${id}`);
  },

  // 删除与某个用户的所有消息（会话）
  async deleteConversation(userId) {
    return apiClient.delete(`/messages/conversation/${userId}`);
  },

  // 标记为已读
  async markAsRead(id) {
    return apiClient.patch(`/messages/${id}/read`);
  },
};

// ============= 拉黑用户 API =============
export const blockedUsersApi = {
  // 获取拉黑列表
  async getList(page = 1, limit = 20) {
    return apiClient.get('/blocked-users', { page, limit });
  },

  // 拉黑用户
  async block(userId, reason = null) {
    return apiClient.post(`/blocked-users/${userId}`, { reason });
  },

  // 取消拉黑
  async unblock(userId) {
    return apiClient.delete(`/blocked-users/${userId}`);
  },

  // 检查是否拉黑
  async check(userId) {
    return apiClient.get(`/blocked-users/check/${userId}`);
  },
};

// ============= 系统配置 API =============
export const settingsApi = {
  // 获取所有系统配置
  async getAll() {
    return apiClient.get('/settings');
  },

  // 获取特定配置
  async get(key) {
    return apiClient.get(`/settings/${key}`);
  },

  // 更新配置（仅管理员）
  async update(key, value) {
    return apiClient.patch(`/settings/${key}`, { value });
  },
};

// ============= OAuth 配置 API =============
export const oauthConfigApi = {
  // 获取 OAuth 提供商配置
  // 公开：只返回已启用的提供商
  // 管理员：返回所有提供商（含完整配置）
  async getProviders() {
    return apiClient.get('/oauth/providers');
  },

  // 管理员：获取所有 OAuth 配置（已合并到 getProviders）
  async getAllProviders() {
    return apiClient.get('/oauth/providers');
  },

  // 管理员：更新 OAuth 配置
  async updateProvider(provider, data) {
    return apiClient.patch(`/oauth/providers/${provider}`, data);
  },

  // 管理员：测试 OAuth 配置
  async testProvider(provider) {
    return apiClient.post(`/oauth/providers/${provider}/test`);
  },
};

// ============= 邮件服务配置 API =============
export const emailConfigApi = {
  // 获取邮件服务提供商配置
  // 公开：只返回已启用的提供商
  // 管理员：返回所有提供商（含完整配置）
  async getProviders() {
    return apiClient.get('/message-providers/email');
  },

  // 管理员：获取所有邮件服务配置（已合并到 getProviders）
  async getAllProviders() {
    return apiClient.get('/message-providers/email');
  },

  // 管理员：更新邮件服务配置
  async updateProvider(provider, data) {
    return apiClient.patch(`/message-providers/email/${provider}`, data);
  },

  // 管理员：测试邮件服务配置
  async testProvider(provider, testEmail) {
    return apiClient.post(`/message-providers/email/${provider}/test`, { testEmail });
  },
};

// ============= 短信服务配置 API =============
export const smsConfigApi = {
  // 获取短信服务提供商配置
  async getProviders() {
    return apiClient.get('/message-providers/sms');
  },

  // 管理员：获取所有短信服务配置
  async getAllProviders() {
    return apiClient.get('/message-providers/sms');
  },

  // 管理员：更新短信服务配置
  async updateProvider(provider, data) {
    return apiClient.patch(`/message-providers/sms/${provider}`, data);
  },

  // 管理员：测试短信服务配置
  async testProvider(provider, testPhone) {
    return apiClient.post(`/message-providers/sms/${provider}/test`, { testPhone });
  },
};

// ============= CAPTCHA 配置 API =============
export const captchaConfigApi = {
  // 获取当前 CAPTCHA 配置（公开）
  async getConfig() {
    return apiClient.get('/captcha/config');
  },

  // 管理员：获取所有 CAPTCHA 提供商配置
  async getProviders() {
    return apiClient.get('/captcha/providers');
  },

  // 管理员：更新 CAPTCHA 提供商配置
  async updateProvider(provider, data) {
    return apiClient.request(`/captcha/providers/${provider}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ============= 管理后台 API =============
export const dashboardApi = {
  // 获取统计数据（仅管理员）
  async getStats() {
    return apiClient.get('/dashboard/stats');
  },
};

// ============= 通用上传 API =============
export const uploadApi = {
  async upload(file, type = 'common') {
    const formData = new FormData();
    formData.append('file', file);

    // 构建 URL，包含 type 参数
    const url = `${apiClient.baseURL}/upload?type=${type}`;

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include', // 携带 Cookie
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.error || '上传失败');
    }

    return response.json();
  },
};

// ============= 邀请码 API =============
export const invitationsApi = {
  // 生成邀请码
  async generate(data) {
    return apiClient.post('/invitations/generate', data);
  },

  // 获取我的邀请码列表
  async getMyCodes(params) {
    return apiClient.get('/invitations/my-codes', params);
  },

  // 验证邀请码
  async validate(code) {
    return apiClient.post('/invitations/validate', { code });
  },

  // 获取我的邀请配额
  async getMyQuota() {
    return apiClient.get('/invitations/my-quota');
  },

  // 管理员 API
  admin: {
    // 获取所有邀请码
    async getAll(params) {
      return apiClient.get('/invitations/all', params);
    },

    // 手动生成邀请码
    async generate(data) {
      return apiClient.post('/invitations/generate-admin', data);
    },

    // 禁用邀请码
    async disable(id) {
      return apiClient.patch(`/invitations/${id}/disable`);
    },

    // 恢复邀请码
    async enable(id) {
      return apiClient.patch(`/invitations/${id}/enable`);
    },

    // 获取统计数据
    async getStats() {
      return apiClient.get('/invitations/stats');
    },
  },



  // 邀请规则管理 API（管理员）
  rules: {
    // 获取所有规则
    async getAll() {
      return apiClient.get('/invitations/rules');
    },

    // 获取指定角色的规则
    async getByRole(role) {
      return apiClient.get(`/invitations/rules/${role}`);
    },

    // 创建或更新规则
    async upsert(role, data) {
      return apiClient.request(`/invitations/rules/${role}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    // 删除规则
    async delete(role) {
      return apiClient.delete(`/invitations/rules/${role}`);
    },

    // 切换规则启用状态
    async toggle(role) {
      return apiClient.patch(`/invitations/rules/${role}/toggle`);
    },
  },
};

// ============= RBAC 权限管理 API =============
export const rbacApi = {
  // 获取当前用户的权限信息
  async getMyPermissions() {
    return apiClient.get('/auth/me/permissions');
  },

  // 获取公开角色信息
  async getPublicRoles() {
    return apiClient.get('/roles/public');
  },

  // 获取 RBAC 配置（模块、操作定义）
  async getConfig() {
    return apiClient.get('/roles/config');
  },

  // 管理员 API
  admin: {
    // 获取所有角色
    async getRoles() {
      return apiClient.get('/roles');
    },

    // 创建角色
    async createRole(data) {
      return apiClient.post('/roles', data);
    },

    // 获取角色详情
    async getRole(id) {
      return apiClient.get(`/roles/${id}`);
    },

    // 更新角色
    async updateRole(id, data) {
      return apiClient.patch(`/roles/${id}`, data);
    },

    // 删除角色
    async deleteRole(id) {
      return apiClient.delete(`/roles/${id}`);
    },

    // 获取角色权限
    async getRolePermissions(id) {
      return apiClient.get(`/roles/${id}/permissions`);
    },

    // 设置角色权限
    async setRolePermissions(id, permissions) {
      return apiClient.request(`/roles/${id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      });
    },

    // 获取所有权限
    async getPermissions() {
      return apiClient.get('/roles/permissions');
    },

    // 创建权限
    async createPermission(data) {
      return apiClient.post('/roles/permissions', data);
    },

    // 更新权限
    async updatePermission(id, data) {
      return apiClient.patch(`/roles/permissions/${id}`, data);
    },

    // 删除权限
    async deletePermission(id) {
      return apiClient.delete(`/roles/permissions/${id}`);
    },

    // 获取用户角色
    async getUserRoles(userId) {
      return apiClient.get(`/roles/users/${userId}/roles`);
    },

    // 分配角色给用户
    async assignRole(userId, roleId, expiresAt = null) {
      return apiClient.post(`/roles/users/${userId}/roles`, { roleId, expiresAt });
    },

    // 移除用户角色
    async removeRole(userId, roleId) {
      return apiClient.delete(`/roles/users/${userId}/roles/${roleId}`);
    },
  },
};

// ============= 积分系统 API (Imported from Feature) =============
export { rewardsApi } from '../extensions/rewards/api';
export { shopApi } from '../extensions/shop/api';
export { ledgerApi } from '../extensions/ledger/api';

// ============= 广告系统 API =============
export { adsApi } from '../extensions/ads/api';

// 导出 API 客户端实例
export default apiClient;
