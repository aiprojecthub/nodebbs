# NodeBBS

一个基于 Turborepo 单体仓库架构构建的现代化、高性能论坛平台。

简体中文 | [English](./README.en.md)

## 📋 技术栈

### 后端 (API)
- **框架**: [Fastify](https://fastify.dev/) - 高性能 Node.js Web 框架
- **数据库**: PostgreSQL 16 + [Drizzle ORM](https://orm.drizzle.team/)
- **身份验证**: JWT + OAuth2
- **缓存**: Redis 7
- **邮件服务**: Nodemailer
- **API 文档**: Swagger/OpenAPI
- **进程管理**: PM2

### 前端 (Web)
- **框架**: [Next.js 16](https://nextjs.org/) (支持 Turbopack)
- **UI 库**: React 19
- **样式**: Tailwind CSS 4
- **组件库**: Radix UI
- **表单处理**: React Hook Form
- **Markdown**: React Markdown (支持 GitHub 风格)
- **主题**: next-themes (支持深色/浅色模式)

### 开发与部署
- **单体仓库**: Turborepo
- **包管理器**: pnpm 10+
- **环境变量**: dotenvx
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx (生产环境)

## 🏗️ 系统架构

| 服务 | 技术 | 端口 | 说明 |
|------|------|------|------|
| **web** | Next.js 16 | 3100 | 前端应用 |
| **api** | Fastify | 7100 | 后端 API 服务 |
| **postgres** | PostgreSQL 16 | 5432 | 主数据库 |
| **redis** | Redis 7 | 6379 | 缓存服务 |

详细架构图和服务依赖关系请参考 [Docker 部署指南](./DOCKER_DEPLOY.md#系统架构)。

## 🚀 快速开始

### 前置要求

- **Docker**: Docker Engine 20.10+
- **Docker Compose**: 2.0+
- **Make**: (可选，用于简化命令)

### 一键部署（推荐）

```bash
# 运行自动部署脚本
./deploy.sh
```

脚本支持三种环境配置：
- **标准生产环境** (2C4G+) - 内存配置 API 768M, Web 768M
- **低配环境** (1C1G/1C2G) - 内存配置 API 512M, Web 512M
- **基础环境** (测试用) - 无资源限制

详细部署步骤和配置说明请参考 [Docker 部署指南](./DOCKER_DEPLOY.md#快速开始)。

### 手动部署

```bash
# 1. 复制环境变量文件
cp .env.docker.example .env

# 2. 编辑配置（重要！）
vi .env

# 3. 启动服务
docker compose up -d

# 4. 初始化数据库
docker compose exec api npm run db:push
docker compose exec api npm run seed
```

## 🔐 安全配置

**重要提醒**：部署前，请在 `.env` 文件中修改以下配置：

```bash
# 生成安全的 JWT 密钥
openssl rand -base64 32

# 必须修改的配置：
POSTGRES_PASSWORD=your_secure_postgres_password
REDIS_PASSWORD=your_secure_redis_password
JWT_SECRET=generated_secure_jwt_secret
CORS_ORIGIN=https://yourdomain.com  # 生产环境
```

完整环境变量说明请参考 [Docker 部署指南](./DOCKER_DEPLOY.md#环境配置)。

## 🌐 访问地址

部署完成后，访问以下地址：

- **Web 前端**: http://localhost:3100
- **API 文档**: http://localhost:7100/docs
- **API 健康检查**: http://localhost:7100/api

## 📝 常用命令

### 使用 Makefile（推荐）

```bash
make help              # 显示所有可用命令
make up                # 启动所有服务
make down              # 停止所有服务
make logs              # 查看所有日志
make db-push           # 推送数据库模式
make seed              # 初始化种子数据
make health            # 检查服务健康状态

# 生产环境
ENV=prod make up       # 启动生产环境服务
```

### 使用 Docker Compose

```bash
docker compose up -d           # 启动服务
docker compose down            # 停止服务
docker compose logs -f         # 查看日志
docker compose ps              # 查看状态
```

完整命令列表请参考 [Docker 部署指南](./DOCKER_DEPLOY.md#常用命令)。

## 🛠️ 开发环境设置（不使用 Docker）

### 前置要求
- Node.js >= 22
- pnpm >= 10.0.0
- PostgreSQL
- Redis

### 步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cd apps/api && cp .env.example .env
cd ../web && cp .env.example .env

# 3. 设置数据库
cd ../api
pnpm db:push:dev
pnpm seed

# 4. 启动开发服务器
cd ../..
pnpm dev

# API: 7100 端口 | Web: 3100 端口
```

## 📦 项目结构

```
nodebbs/
├── apps/
│   ├── api/                 # Fastify 后端
│   │   ├── src/
│   │   │   ├── routes/      # API 路由
│   │   │   ├── plugins/     # Fastify 插件
│   │   │   ├── db/          # 数据库模式
│   │   │   └── utils/       # 工具函数
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                 # Next.js 前端
│       ├── app/             # Next.js App Router
│       ├── components/      # React 组件
│       ├── Dockerfile
│       └── package.json
├── packages/                # 共享包（未来）
├── scripts/                 # 部署脚本
├── docker-compose.yml       # Docker Compose 基础配置
├── docker-compose.prod.yml  # 标准生产环境配置
├── docker-compose.lowmem.yml # 低配环境配置
├── Makefile                 # 命令快捷方式
├── deploy.sh                # 自动部署脚本
├── nginx.conf.example       # Nginx 配置模板
├── .env.docker.example      # 环境变量模板
└── turbo.json               # Turborepo 配置
```

## 🚀 生产环境部署

### 快速部署

```bash
./deploy.sh
# 选择：1) 标准生产环境 或 2) 低配环境
```

### 部署建议

1. **配置 Nginx 反向代理** - 提供 SSL/HTTPS 支持
2. **设置数据库备份** - 定期备份数据
3. **配置防火墙** - 只开放必要端口
4. **监控服务健康** - 使用 `make health` 检查

详细的生产环境配置（Nginx、SSL、防火墙、监控等）请参考 [Docker 部署指南](./DOCKER_DEPLOY.md#生产环境部署docker-compose)。

### 数据库备份

```bash
# 备份
docker compose exec postgres pg_dump -U postgres nodebbs > backup_$(date +%Y%m%d).sql

# 恢复
docker compose exec -T postgres psql -U postgres nodebbs < backup.sql
```

## 🔍 故障排查

遇到问题时，请参考 [Docker 部署指南 - 故障排查](./DOCKER_DEPLOY.md#故障排查) 获取详细的解决方案。

常用诊断命令：

```bash
make health                    # 检查服务健康
docker compose logs -f api     # 查看 API 日志
docker compose ps              # 查看容器状态
```

## 📚 文档

- **[Docker 部署指南](./DOCKER_DEPLOY.md)** - 完整的部署说明、配置详解、故障排查

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 📄 许可证

MIT

## 🐛 支持

如有问题：
- 在 GitHub 上提交 issue
- 查看 [Docker 部署指南](./DOCKER_DEPLOY.md) 了解部署相关问题
