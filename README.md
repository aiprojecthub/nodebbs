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
- **框架**: [Next.js 15](https://nextjs.org/) (支持 Turbopack)
- **UI 库**: React 19
- **样式**: Tailwind CSS 4
- **组件库**: Radix UI
- **表单处理**: React Hook Form
- **Markdown**: React Markdown (支持 GitHub 风格)
- **主题**: next-themes (支持深色/浅色模式)

### 开发与部署
- **单体仓库**: Turborepo
- **包管理器**: pnpm 9+
- **环境变量**: dotenvx
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx (生产环境)

## 🏗️ 系统架构

```
┌─────────────────────────────┐
│    Nginx (生产环境)          │
│  SSL/HTTPS + 反向代理        │
└─────────────┬───────────────┘
              │
      ┌───────┴────────┐
      │                │
┌─────▼─────┐    ┌────▼────┐
│    Web    │────▶│   API   │
│   :3100   │    │  :7100  │
└───────────┘    └──┬───┬──┘
                    │   │
          ┌─────────┘   └─────────┐
          │                       │
    ┌─────▼──────┐         ┌─────▼─────┐
    │ PostgreSQL │         │   Redis   │
    │   :5432    │         │   :6379   │
    └────────────┘         └───────────┘
```

| 服务 | 技术 | 端口 | 说明 |
|------|------|------|------|
| **web** | Next.js 15 | 3100 | 前端应用 |
| **api** | Fastify | 7100 | 后端 API 服务 |
| **postgres** | PostgreSQL 16 | 5432 | 主数据库 |
| **redis** | Redis 7 | 6379 | 缓存服务 |

## 🚀 快速开始

### 前置要求

- **Docker**: Docker Engine 20.10+
- **Docker Compose**: 2.0+
- **Make**: (可选，用于简化命令)

### 方式一：自动部署脚本（推荐）

```bash
# 运行自动部署脚本
./deploy.sh
```

该脚本会自动：
- 检查 Docker 环境
- 初始化 `.env` 文件
- 验证配置
- 构建镜像
- 启动服务
- 初始化数据库

### 方式二：使用 Makefile

```bash
# 初始化环境
make init

# 编辑 .env 文件（重要！）
vi .env

# 启动所有服务
make up

# 初始化数据库
make db-push
make seed

# 查看日志
make logs

# 检查服务健康
make health
```

### 方式三：使用 Docker Compose

```bash
# 1. 复制环境变量文件
cp .env.docker.example .env

# 2. 编辑配置
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

## 🌐 访问地址

部署完成后，访问以下地址：

- **Web 前端**: http://localhost:3100
- **API 文档**: http://localhost:7100/docs
- **API 健康检查**: http://localhost:7100/api

## 📝 常用命令

### 使用 Makefile（推荐）

```bash
make help              # 显示所有可用命令

# 容器管理
make up                # 启动所有服务
make down              # 停止所有服务
make restart           # 重启所有服务
make build             # 重新构建镜像
make ps                # 查看容器状态

# 日志
make logs              # 查看所有日志
make logs-api          # 查看 API 日志
make logs-web          # 查看 Web 日志

# 数据库操作
make db-push           # 推送数据库模式
make db-generate       # 生成迁移文件
make db-migrate        # 运行迁移
make db-studio         # 打开 Drizzle Studio
make seed              # 初始化种子数据
make seed-reset        # 重置并重新填充数据

# 容器访问
make exec-api          # 进入 API 容器
make exec-web          # 进入 Web 容器
make exec-db           # 进入 PostgreSQL
make exec-redis        # 进入 Redis

# 健康检查与清理
make health            # 检查服务健康状态
make clean             # 删除容器和网络
make clean-all         # 删除所有内容包括数据卷（危险！）
```

### 使用 Docker Compose

```bash
# 启动/停止
docker compose up -d
docker compose down
docker compose restart

# 日志
docker compose logs -f
docker compose logs -f api

# 重新构建
docker compose build --no-cache
docker compose up -d --build

# 状态
docker compose ps
```

## 🛠️ 开发环境设置（不使用 Docker）

### 前置要求
- Node.js >= 18
- pnpm >= 9.0.0
- PostgreSQL
- Redis

### 步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cd apps/api
cp .env.example .env
# 编辑 .env，配置数据库和 Redis 连接信息

cd ../web
cp .env.example .env
# 编辑 .env，配置 API 地址

# 3. 设置数据库
cd ../api
pnpm db:push:dev
pnpm seed

# 4. 启动开发服务器
cd ../..
pnpm dev

# API 将运行在 7100 端口
# Web 将运行在 3100 端口
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
│   │   ├── .dockerignore
│   │   └── package.json
│   └── web/                 # Next.js 前端
│       ├── app/             # Next.js App Router
│       ├── components/      # React 组件
│       ├── Dockerfile
│       ├── .dockerignore
│       └── package.json
├── packages/                # 共享包（未来）
├── scripts/                 # 部署脚本
├── docker-compose.yml       # Docker Compose 配置
├── docker-compose.prod.yml  # 生产环境配置
├── Makefile                 # 命令快捷方式
├── deploy.sh                # 自动部署脚本
├── nginx.conf.example       # Nginx 配置模板
├── .env.docker.example      # 环境变量模板
└── turbo.json               # Turborepo 配置
```

## 🚀 生产环境部署

### 1. 准备环境

```bash
# 克隆仓库
git clone <repository-url>
cd nodebbs

# 初始化环境
cp .env.docker.example .env
vi .env  # 配置生产环境设置
```

### 2. 配置 Nginx（推荐）

复制并修改 `nginx.conf.example`：

```bash
cp nginx.conf.example /etc/nginx/sites-available/nodebbs
# 编辑文件，配置域名和 SSL 证书
sudo ln -s /etc/nginx/sites-available/nodebbs /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
```

### 3. 使用 Docker 部署

```bash
# 使用部署脚本
./deploy.sh

# 或手动部署
docker compose -f docker-compose.prod.yml up -d
make db-push
make seed
```

### 4. 设置数据库备份

```bash
# 备份数据库
docker compose exec postgres pg_dump -U postgres nodebbs > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker compose exec -T postgres psql -U postgres nodebbs < backup_20241110.sql
```

## 🔍 故障排查

### 查看服务日志
```bash
make logs
docker compose logs -f [service_name]
```

### 检查服务健康状态
```bash
make health
docker compose ps
```

### 重启特定服务
```bash
docker compose restart api
docker compose restart web
```

### 数据库连接问题
```bash
# 检查数据库状态
docker compose exec postgres pg_isready

# 访问数据库
make exec-db
```

### Redis 连接问题
```bash
# 检查 Redis 状态
docker compose exec redis redis-cli ping

# 访问 Redis
make exec-redis
```

## 📚 文档

- [Docker 部署指南](./DOCKER_DEPLOY.md) - 详细的部署说明

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
- 查看 `/docs` 目录中的现有文档
- 查阅 `DOCKER_DEPLOY.md` 了解部署相关问题
