# NodeBBS

一个基于 Turborepo 单体仓库架构构建的现代化、高性能论坛平台。

简体中文 | [English](./README.en.md)

## 🏗️ 系统架构

| 服务 | 技术 | 端口 | 说明 |
|------|------|------|------|
| **web** | Next.js 16 | 3100 | 前端应用 |
| **api** | Fastify | 7100 | 后端 API 服务 |
| **postgres** | PostgreSQL 16 | 5432 | 主数据库 |
| **redis** | Redis 7 | 6379 | 缓存服务 |



## 🚀 快速开始

### 前置要求

- **Docker**: Docker Engine 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 22+


### 一键部署（推荐）

```bash
# 运行交互式部署工具
# 前置提醒：请先安装 CLI 工具
# npm install -g nodebbs (或者使用 npx nodebbs)
# 详情: https://www.npmjs.com/nodebbs

npx nodebbs
```

脚本支持三种环境选择：
- **标准生产环境** (2C4G+)
- **低配环境** (1C1G/1C2G)
- **基础环境** - 无资源限制


## 📝 常用命令

### 常用命令

```bash
$ nodebbs
? 选择命令:
❯ start         启动服务
  stop          停止服务
  restart       重启服务
  upgrade       升级服务
  status        查看服务状态
  logs          查看服务日志  [+]
  shell         进入容器终端  [+]
  db            数据库操作 (备份, 迁移, 种子数据等)  [+]
  pack          生成离线部署包
  clean         清理 Docker 缓存和残留资源
  help          显示帮助信息
  ❌ 退出

↑↓ navigate • ⏎ select
```

更多命令和详细说明，请访问 NodeBBS 命令行项目主页：
https://www.npmjs.com/nodebbs

## ✨ 功能预览

### 前台界面

<table>
  <tr>
    <td width="50%">
      <img src="./docs/screens/1.png" alt="论坛首页" />
      <p align="center"><b>论坛首页</b> - 话题列表、分类导航</p>
    </td>
    <td width="50%">
      <img src="./docs/screens/2.png" alt="话题详情" />
      <p align="center"><b>话题详情</b> - Markdown 支持、评论互动</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="./docs/screens/3.png" alt="个人设置" />
      <p align="center"><b>个人设置</b> - 资料编辑、头像上传</p>
    </td>
    <td width="50%">
      <img src="./docs/screens/4.png" alt="管理后台" />
      <p align="center"><b>管理后台</b> - 数据统计、内容管理</p>
    </td>
  </tr>
</table>

### 管理后台

<table>
  <tr>
    <td width="50%">
      <img src="./docs/screens/5.png" alt="注册设置" />
      <p align="center"><b>注册设置</b> - 注册模式配置</p>
    </td>
    <td width="50%">
      <img src="./docs/screens/6.png" alt="OAuth登录" />
      <p align="center"><b>OAuth 登录</b> - 第三方登录集成</p>
    </td>
  </tr>
</table>

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
pnpm db:push
pnpm seed

# 4. 启动开发服务器
cd ../..
pnpm dev

# API: 7100 端口 | Web: 3100 端口
```

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

