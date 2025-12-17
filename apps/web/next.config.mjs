/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // 匹配所有域名
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  // 启用 standalone 输出模式，用于 Docker 部署
  output: 'standalone',
  // 代理逻辑已迁移至 src/proxy.js，以支持 Docker 运行时环境变量动态注入
};

export default nextConfig;
