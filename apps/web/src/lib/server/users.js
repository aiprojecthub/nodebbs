/**
 * 用户相关的服务端数据获取函数
 */
import { request } from '@/lib/server/api';

/**
 * 获取用户数据
 * @param {string} username - 用户名
 * @returns {Promise<object|null>} 用户数据
 */
export async function getUserData(username) {
  try {
    return await request(`/users/${username}`);
  } catch (error) {
    console.error('获取用户数据失败:', error);
    return null;
  }
}

/**
 * 获取用户发布的话题列表
 * @param {number} userId - 用户 ID
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @returns {Promise<{items: array, total: number}>}
 */
export async function getUserTopics(userId, page = 1, limit = 20) {
  try {
    const params = new URLSearchParams({
      userId: userId.toString(),
      page: page.toString(),
      limit: limit.toString(),
    });
    return await request(`/topics?${params}`);
  } catch (error) {
    console.error('获取用户话题失败:', error);
    return { items: [], total: 0 };
  }
}

/**
 * 获取用户发布的回复列表
 * @param {number} userId - 用户 ID
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @returns {Promise<{items: array, total: number}>}
 */
export async function getUserPosts(userId, page = 1, limit = 20) {
  try {
    const params = new URLSearchParams({
      userId: userId.toString(),
      page: page.toString(),
      limit: limit.toString(),
    });
    return await request(`/posts?${params}`);
  } catch (error) {
    console.error('获取用户回复失败:', error);
    return { items: [], total: 0 };
  }
}
