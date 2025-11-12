# ============================================
# Turborepo Monorepo 多阶段构建 - Next.js Web
# ============================================
# 构建说明：
# 1. 必须从 monorepo 根目录构建
# 2. 使用 turbo prune 提取最小依赖集
# 3. 使用 --frozen-lockfile 确保构建可重复性
# 4. 支持 Next.js 构建时环境变量注入
# ============================================

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.21.0 --activate

# ============================================
# 阶段 1: 使用 turbo prune 提取依赖
# ============================================
FROM base AS pruner
WORKDIR /app

# 复制整个 monorepo（turbo prune 需要完整的 workspace 信息）
COPY . .

# 提取 nodebbs-web 应用及其依赖的最小子集
# --docker 选项会生成两个输出目录：
#   - out/json: 仅包含 package.json 文件（用于 Docker 层缓存优化）
#   - out/full: 包含完整的源代码和依赖
# 注意：使用 package.json 中的 "name" 字段值，不是目录名
RUN pnpm dlx turbo prune nodebbs-web --docker

# ============================================
# 阶段 2: 安装所有依赖（构建时需要）
# ============================================
FROM base AS deps
WORKDIR /app

# 复制 prune 阶段生成的 package.json 文件
# 这一层会被 Docker 缓存，除非依赖发生变化
COPY --from=pruner /app/out/json/ .

# 复制 lockfile 和 workspace 配置
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# 安装所有依赖（包括 devDependencies，构建时需要）
# 使用 --frozen-lockfile 确保构建可重复性
# pnpm 会自动处理 workspace 依赖，在根目录和各个包中创建 node_modules
RUN --mount=type=cache,id=pnpm,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --prefer-offline

# ============================================
# 阶段 3: 构建 Next.js 应用
# ============================================
FROM base AS builder
WORKDIR /app

# 声明构建参数（来自 docker-compose build args）
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL

# 导入为环境变量供 Next.js 构建时使用
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# 先复制已安装依赖的目录结构（包括所有 node_modules）
COPY --from=deps /app/ ./

# 再复制 prune 的完整源代码（会覆盖上面的源文件，但保留 node_modules）
COPY --from=pruner /app/out/full/ ./

# 构建应用（使用 turbo 在根目录构建）
# Next.js 会生成 standalone 输出到 apps/web/.next
RUN echo "🚧 Building Next.js with NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" && \
    pnpm turbo build --filter=nodebbs-web

# ============================================
# 阶段 4: 生产环境运行时（仅包含运行时文件）
# ============================================
FROM base AS runner
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100

# 创建非 root 用户（安全最佳实践）
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制 Next.js standalone 输出
# standalone 模式会自动包含所有必需的运行时依赖
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# 复制 public 静态文件到 standalone 期望的位置
# Next.js standalone 的 server.js 会在 apps/web/public 查找静态文件
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3100

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令（standalone 模式会生成 server.js）
CMD ["node", "apps/web/server.js"]
