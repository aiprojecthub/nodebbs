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
        const error = new Error(data.message || data.error || 'API 请求失败');
        error.status = response.status;
        error.resetTime = data.resetTime;
        throw error;
      }

      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  }

  buildQueryString(params) {
    if (!params) {
      return '';
    }

    const filteredEntries = Object.entries(params).filter(([, value]) => (
      value !== undefined && value !== null
    ));

    if (filteredEntries.length === 0) {
      return '';
    }

    return `?${new URLSearchParams(filteredEntries).toString()}`;
  }

  // GET 请求
  async get(endpoint, params) {
    const queryString = this.buildQueryString(params);
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
    const queryString = this.buildQueryString(params);
    return this.request(endpoint + queryString, {
      method: 'DELETE',
      body: JSON.stringify({}),
    });
  }
}

// 创建单例实例
export const apiClient = new ApiClient();

// 论坛模块 API 已拆至 @/modules/forum/api；此处 re-export 保持旧导入路径兼容。
// 新代码请直接 import from '@/modules/forum/api'。
export { categoryApi, topicApi, postApi, tagApi, searchApi } from '@/modules/forum/api';

function encodePageSlug(slug) {
  return String(slug || '')
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

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
  async sendCode(identifier, type, captchaToken) {
    return apiClient.post('/auth/send-code', { identifier, type }, {
      headers: captchaToken ? { 'x-captcha-token': captchaToken } : {},
    });
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

  // ============= 手机号登录 API =============
  // 手机号验证码登录（密码登录复用 /auth/login）
  async phoneLoginByCode(phone, code) {
    return apiClient.post('/auth/phone-login', { phone, code });
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

  // ============= 三方账号关联 =============
  // 获取关联的 OAuth 账号及可解绑状态
  async getOAuthAccounts() {
    return apiClient.get('/oauth/accounts');
  },

  // 发起关联：获取授权链接（需登录）
  async getOAuthLinkUrl(provider) {
    return apiClient.get(`/oauth/${provider}/link/connect`);
  },

  // 关联回调：用 code 换取三方身份并绑定到当前账号
  async linkOAuthCallback(provider, code, state) {
    return apiClient.post(`/oauth/${provider}/link/callback`, { code, state });
  },

  // 解除 OAuth 账号关联（用 POST：密码不能出现在 query string 里）
  async unlinkOAuthAccount(provider, password) {
    return apiClient.post(`/oauth/unlink/${provider}`, { password });
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

  // 当前用户待审核的资料字段（昵称/简介/头像）
  async getMyPendingFields() {
    return apiClient.get('/users/me/pending-fields');
  },

  // 更新用户信息（管理员）
  async updateUser(userId, data) {
    return apiClient.patch(`/users/${userId}`, data);
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

  // 绑定邮箱（无邮箱用户）
  async bindEmail(email, code, password) {
    return apiClient.post('/users/me/bind-email', {
      email,
      code,
      password,
    });
  },

  // 修改手机号 - 一次性提交所有验证信息
  async changePhone(oldPhoneCode, newPhone, newPhoneCode, password) {
    return apiClient.post('/users/me/change-phone', {
      oldPhoneCode,
      newPhone,
      newPhoneCode,
      password,
    });
  },

  // 绑定手机号（无手机号用户）
  async bindPhone(phone, code, password) {
    return apiClient.post('/users/me/bind-phone', {
      phone,
      code,
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

  // 更新用户角色（管理员）
  async updateUserRoles(userId, roleIds) {
    return apiClient.request(`/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roleIds }),
    });
  },

  // 用户自助注销
  async requestDeletion(data) {
    return apiClient.post('/users/me/request-deletion', data);
  },

  // 恢复待注销用户（管理员）
  async restoreUser(userId) {
    return apiClient.post(`/users/${userId}/restore`);
  },

  // 匿名化用户（管理员）
  async anonymizeUser(userId) {
    return apiClient.post(`/users/${userId}/anonymize`);
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

  // ============= 通用审核队列（P1）=============
  // 获取统一审核队列
  async getQueue(type = 'all', status = 'pending', page = 1, limit = 20) {
    return apiClient.get('/moderation/queue', { type, status, page, limit });
  },

  // 审核队列各类型待审计数（含已注册类型列表）
  async getQueueStat() {
    return apiClient.get('/moderation/queue/stat');
  },

  // 通过一个审核项
  async approveItem(id) {
    return apiClient.post(`/moderation/queue/${id}/approve`);
  },

  // 驳回一个审核项
  async rejectItem(id, reason) {
    return apiClient.post(`/moderation/queue/${id}/reject`, { reason });
  },

  // 读取内容审核配置
  async getModerationConfig() {
    return apiClient.get('/moderation/config');
  },

  // 保存内容审核配置
  async setModerationConfig(config) {
    return apiClient.put('/moderation/config', config);
  },
};

// ============= 操作日志 API =============
export const oplogApi = {
  // 获取操作日志列表
  async getLogs(params = {}) {
    return apiClient.get('/oplogs', params);
  },

  // 获取特定内容的操作日志
  async getLogsByTarget(targetType, targetId) {
    return apiClient.get(`/oplogs/${targetType}/${targetId}`);
  },
};

// ============= 系统 API =============
export const systemApi = {
  // 获取论坛统计
  async getStats() {
    return apiClient.get('/stats');
  },
};

// ============= 会话 API =============
export const conversationApi = {
  // 获取会话列表
  async getList(page = 1, limit = 20) {
    return apiClient.get('/conversations', { page, limit });
  },

  // 获取未读总数
  async getUnreadCount() {
    return apiClient.get('/conversations/unread-count');
  },

  // 获取与某用户的消息记录（cursor 分页）
  async getMessages(userId, cursor, limit = 20) {
    const params = { limit, cursor: cursor || '1' };
    return apiClient.get(`/conversations/${userId}`, params);
  },

  // 向某用户发送消息（自动创建会话）
  async send(userId, { content }) {
    return apiClient.post(`/conversations/${userId}`, { content });
  },

  // 标记该会话所有消息已读
  async markAsRead(userId) {
    return apiClient.post(`/conversations/${userId}/read`);
  },

  // 删除与某用户的会话
  async deleteConversation(userId) {
    return apiClient.delete(`/conversations/${userId}`);
  },

  // 删除单条消息
  async deleteMessage(messageId) {
    return apiClient.delete(`/conversations/messages/${messageId}`);
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
  // 获取已启用的 OAuth 提供商（公开）
  // 仅返回已启用项，与调用者身份无关；登录 / 注册入口使用
  async getProviders() {
    return apiClient.get('/oauth/providers');
  },

  // 管理员：获取所有 OAuth 提供商（含完整配置，需要 dashboard.settings 权限）
  async getAllProviders() {
    return apiClient.get('/oauth/providers/all');
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

// ============= 存储服务配置 API =============
export const storageConfigApi = {
  // 管理员：获取所有存储服务配置
  async getAllProviders() {
    return apiClient.get('/storage-providers');
  },

  // 管理员：更新存储服务配置
  async updateProvider(slug, data) {
    return apiClient.patch(`/storage-providers/${slug}`, data);
  },

  // 管理员：测试存储服务连接
  async testProvider(slug) {
    return apiClient.post(`/storage-providers/${slug}/test`);
  },

  // 管理员：创建存储服务商
  async createProvider(data) {
    return apiClient.post('/storage-providers', data);
  },

  // 管理员：删除存储服务商
  async deleteProvider(slug) {
    return apiClient.delete(`/storage-providers/${slug}`);
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

// ============= 页面管理 API =============
export const pagesApi = {
  async getBySlug(slug) {
    return apiClient.get(`/pages/${encodePageSlug(slug)}`);
  },

  admin: {
    async getList(params = {}) {
      return apiClient.get('/pages/admin', params);
    },

    async getById(id) {
      return apiClient.get(`/pages/admin/${id}`);
    },

    async create(data) {
      return apiClient.post('/pages/admin', data);
    },

    async update(id, data) {
      return apiClient.patch(`/pages/admin/${id}`, data);
    },

    async delete(id) {
      return apiClient.delete(`/pages/admin/${id}`);
    },
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
function getImageDimensions(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      return resolve({ width: null, height: null });
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    img.src = url;
  });
}

export const uploadApi = {
  async upload(file, category = 'assets') {
    // 1. 尝试获取预签名 URL
    try {
      const presignResult = await apiClient.post('/upload/presign', {
        filename: file.name,
        mimetype: file.type,
        size: file.size,
        category,
      });

      if (presignResult.mode === 'presigned') {
        // 2. 客户端直传到云存储
        const putResponse = await fetch(presignResult.uploadUrl, {
          method: 'PUT',
          headers: presignResult.headers || {},
          body: file,
        });

        if (!putResponse.ok) {
          throw new Error('直传上传失败');
        }

        // 3. 提取图片宽高
        const { width, height } = await getImageDimensions(file);

        // 4. 确认上传完成
        return apiClient.post('/upload/confirm', {
          key: presignResult.key,
          filename: presignResult.filename,
          originalName: file.name,
          mimetype: file.type,
          size: file.size,
          category,
          provider: presignResult.provider,
          width,
          height,
        });
      }
    } catch (err) {
      // presign 失败，降级到服务端上传
      console.warn('Presign failed, falling back to server upload:', err.message);
    }

    // 降级：服务端上传
    const formData = new FormData();
    formData.append('file', file);

    const url = `${apiClient.baseURL}/upload?category=${category}`;

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.error || '上传失败');
    }

    return response.json();
  },
};

// ============= 文件管理 API =============
export const filesApi = {
  // 获取文件列表（管理员）
  async getList(params) {
    return apiClient.get('/files', params);
  },

  // 删除文件（管理员）
  async delete(id) {
    return apiClient.delete(`/files/${id}`);
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
  },
};

// ============= RBAC 权限管理 API =============
export const rbacApi = {
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

// ============ 表情包管理 API =============
export { emojiApi } from '../extensions/emojis/api';



// ============= 广告系统 API =============
export { adsApi } from '../extensions/ads/api';

// ============= Webhook 配置 API =============
export const webhookConfigApi = {
  // 测试 Webhook 连接
  async testWebhook(url, secret) {
    return apiClient.post('/settings/webhook/test', { url, secret });
  },
};

// 导出 API 客户端实例
export default apiClient;
