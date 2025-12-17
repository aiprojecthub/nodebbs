// SSR请求专用
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '../api-url';

export const request = async (endpoint, options = {}) => {
  const baseURL = getApiBaseUrl();
  const url = `${baseURL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const cks = await cookies();
  const token = cks.get('auth_token')?.value;
  if (token) {
    // headers['Authorization'] = `Bearer ${token}`;
    headers['Cookie'] = `auth_token=${token}`;
  }

  try {
    const defaultCache = options.method && options.method !== 'GET' ? 'no-store' : undefined;

    const response = await fetch(url, {
      ...options,
      // 对于 GET 请求使用默认缓存策略，让 Next.js 自动去重同一渲染周期内的相同请求
      // 对于其他请求（POST/PUT/DELETE）使用 no-store
      cache: options.cache ?? defaultCache,
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch');
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
};

// 获取当前登录用户 (SSR专用)
// 优化：只有在存在 auth_token cookie 时才发请求
export const getCurrentUser = async () => {
  const cookieStore = await cookies();
  const hasToken = cookieStore.has('auth_token');

  if (!hasToken) {
    return null;
  }

  return request('/auth/me');
};
