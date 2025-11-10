# NodeBBS

一个基于 Turborepo 单体仓库架构构建的现代化、高性能论坛平台。

[English](./README.md) | 简体中文

## 技术栈

### 后端 (API)
- **框架**: [Fastify](https://fastify.dev/) - 高性能 Node.js Web 框架
- **数据库**: PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- **身份验证**: JWT + OAuth2
- **缓存**: Redis (通过 ioredis)
- **邮件服务**: Nodemailer
- **API 文档**: Swagger/OpenAPI
- **进程管理**: PM2

### 前端 (Web)
- **框架**: [Next.js 15](https://nextjs.org/) (支持 Turbopack)
- **UI 库**: React 19
- **样式**: Tailwind CSS 4
- **组件库**: Radix UI
- **表单处理**: React Hook Form
- **Markdown**: React Markdown (支持 GitHub 风格)
- **主题**: next-themes (支持深色/浅色模式)

### 开发工具
- **单体仓库**: Turborepo
- **包管理器**: pnpm
- **环境变量**: dotenvx
- **部署**: Docker + Docker Compose + Nginx

## 项目结构

```
nodebbs/
   apps/
      api/          # Fastify 后端 API
      web/          # Next.js 前端应用
   packages/         # 共享包（即将推出）
   scripts/          # 部署和实用脚本
   turbo.json        # Turborepo 配置
```

## 前置要求

- Node.js >= 18
- pnpm >= 9.0.0
- PostgreSQL (生产环境)
- Redis (缓存)

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 环境配置

#### API 配置
在 `apps/api/` 目录下创建 `.env` 文件：

```shell
cd apps/api
cp .env.example .env
```

#### Web 配置
在 `apps/web/` 目录下创建 `.env` 文件：

```shell
cd apps/web
cp .env.example .env
```

### 3. 数据库设置

```bash
cd apps/api

# 推送数据库模式
pnpm db:push:dev

# 运行迁移
pnpm db:migrate

# 填充初始数据
pnpm seed

# 打开 Drizzle Studio（可选）
pnpm db:studio
```

### 4. 开发

启动开发服务器：

```bash
# 从项目根目录 - 同时运行 API 和 Web
pnpm dev

# 或者单独运行
cd apps/api && pnpm dev  # API 运行在 7100 端口
cd apps/web && pnpm dev  # Web 运行在 3100 端口
```

应用将在以下地址运行：
- API: http://localhost:7100
- Web: http://localhost:3100
- API 文档: http://localhost:7100/docs

## 生产构建

```bash
# 构建所有应用
pnpm build

# 或者单独构建
cd apps/api && pnpm build
cd apps/web && pnpm build
```

## Docker 部署

### 开发环境

```bash
# 启动所有服务（PostgreSQL、Redis、API、Web）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 生产环境

```bash
# 构建并启动生产服务
docker-compose -f docker-compose.prod.yml up -d

# 初始化数据库
make db-push # 推送 schema
make seed # 初始化数据

# 查看生产日志
docker-compose -f docker-compose.prod.yml logs -f
```

更多部署命令请查看 `Makefile`。

## 可用脚本

### 根目录
- `pnpm dev` - 启动所有应用的开发服务器
- `pnpm build` - 构建所有应用的生产版本

### API (apps/api)
- `pnpm dev` - 以开发模式启动 API（支持热重载）
- `pnpm prod` - 使用 PM2 以生产模式启动 API
- `pnpm db:push:dev` - 推送数据库模式变更
- `pnpm db:generate` - 生成迁移文件
- `pnpm db:migrate` - 运行迁移
- `pnpm db:studio` - 打开 Drizzle Studio
- `pnpm seed` - 填充初始数据
- `pnpm seed:reset` - 重置并重新填充数据库

### Web (apps/web)
- `pnpm dev` - 以开发模式启动 Next.js
- `pnpm build` - 构建 Next.js 生产版本
- `pnpm start` - 启动生产服务器
- `pnpm prod` - 使用 PM2 启动
- `pnpm lint` - 运行 ESLint

## 功能特性

- 用户认证和授权（JWT + OAuth2）
- 速率限制和安全中间件
- RESTful API（自动生成文档）
- 图片优化和 CDN 支持（ipx）
- 邮件通知
- Redis 缓存以提升性能
- 响应式 UI（支持深色/浅色主题）
- Markdown 内容支持
- 实时更新能力

## API 文档

API 服务器运行后，访问 http://localhost:7100/docs 查看交互式 Swagger UI 文档。

## 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 许可证

MIT

## 支持

如有问题，请在 GitHub 上提交 issue。
