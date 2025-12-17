import { NextResponse } from 'next/server';

// Next.js 16 uses proxy.ts instead of middleware.ts
export function proxy(request) {
  const { pathname } = request.nextUrl;

  // 获取运行时环境变量
  // 在 Docker 环境中，这会读取 docker-compose 传入的 SERVER_API_URL (e.g., http://api:7100)
  const apiUrl = process.env.SERVER_API_URL || 'http://localhost:7100';

  // 处理 API 代理
  if (
    pathname.startsWith('/api') || 
    pathname.startsWith('/uploads') || 
    pathname.startsWith('/docs/json')
  ) {
    // 构建目标 URL
    const destinationUrl = new URL(pathname, apiUrl);
    destinationUrl.search = request.nextUrl.search;
    
    // console.log(`[Proxy] ${pathname} -> ${destinationUrl.toString()}`);
    // console.log(`[Proxy] DEBUG: SERVER_API_URL=${apiUrl}, Proxy Target=${destinationUrl.toString()}`);

    return NextResponse.rewrite(destinationUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  // 匹配需要代理的路径
  matcher: [
    '/api/:path*',
    '/uploads/:path*',
    '/docs/json',
  ],
};
