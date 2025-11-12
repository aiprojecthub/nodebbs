# ============================================
# Turborepo Monorepo 多阶段构建 - API 服务
# ============================================
# 构建说明：
# 1. 必须从 monorepo 根目录构建
# 2. 使用 turbo prune 提取最小依赖集
# 3. 使用 --frozen-lockfile 确保构建可重复性
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

# 提取 nodebbs-api 应用及其依赖的最小子集
# --docker 选项会生成两个输出目录：
#   - out/json: 仅包含 package.json 文件（用于 Docker 层缓存优化）
#   - out/full: 包含完整的源代码和依赖
# 注意：使用 package.json 中的 "name" 字段值，不是目录名
RUN pnpm dlx turbo prune nodebbs-api --docker

# ============================================
# 阶段 2: 安装生产依赖
# ============================================
FROM base AS deps
WORKDIR /app

# 复制 prune 阶段生成的 package.json 文件
# 这一层会被 Docker 缓存，除非依赖发生变化
COPY --from=pruner /app/out/json/ .

# 复制 lockfile 和 workspace 配置
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# 安装依赖 - 使用 --frozen-lockfile 确保构建可重复性
# --prefer-offline: 优先使用缓存，加速构建
# --prod: 仅安装生产依赖
RUN --mount=type=cache,id=pnpm,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --prefer-offline --prod

# ============================================
# 阶段 3: 生产环境运行时
# ============================================
FROM base AS runner
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=7100

# 创建非 root 用户（安全最佳实践）
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastify

# 复制依赖（仅生产依赖）
COPY --from=deps --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=fastify:nodejs /app/apps/api/node_modules ./apps/api/node_modules

# 复制应用代码（从 prune 的完整输出）
COPY --from=pruner --chown=fastify:nodejs /app/out/full/apps/api ./apps/api
COPY --from=pruner --chown=fastify:nodejs /app/out/full/apps/api/package.json ./apps/api/package.json

# 创建上传目录
RUN mkdir -p /app/apps/api/uploads && \
    chown -R fastify:nodejs /app/apps/api/uploads

# 切换工作目录到 api 应用
WORKDIR /app/apps/api

# 切换到非 root 用户
USER fastify

# 暴露端口
EXPOSE 7100

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7100/api', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令
CMD ["node", "src/app.js"]
