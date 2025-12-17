function isServer() {
  return typeof window === 'undefined';
}

function normalizeHost(host) {
  return host.replace(/\/+$/, '');
}

export function getApiHost() {
  if (isServer()) {
    // 服务端：优先使用运行时变量 SERVER_API_URL
    const host = process.env.SERVER_API_URL;
    if (!host) {
      throw new Error('SERVER_API_URL is not defined (server-side)');
    }
    return normalizeHost(host);
  }

  // 客户端：返回空字符串，使请求变为相对路径 (e.g., /api/users)
  // 这会触发 Next.js 的 rewrites 规则，将其代理到 SERVER_API_URL
  return '';
}

export function getApiPath() {
  return '/api';
}

export function getApiBaseUrl() {
  return `${getApiHost()}${getApiPath()}`;
}