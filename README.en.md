# NodeBBS

A modern, high-performance forum platform built with Turborepo monorepo architecture.

[简体中文](./README.md) | English

## 📋 Tech Stack

### Backend (API)
- **Framework**: [Fastify](https://fastify.dev/) - High-performance Node.js web framework
- **Database**: PostgreSQL 16 with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: JWT + OAuth2
- **Cache**: Redis 7
- **Email**: Nodemailer
- **API Documentation**: Swagger/OpenAPI
- **Process Management**: PM2

### Frontend (Web)
- **Framework**: [Next.js 16](https://nextjs.org/) with Turbopack
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI
- **Form Handling**: React Hook Form
- **Markdown**: React Markdown with GitHub Flavored Markdown
- **Theme**: next-themes (dark/light mode)

### Development & Deployment
- **Monorepo**: Turborepo
- **Package Manager**: pnpm 10+
- **Environment Variables**: dotenvx
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (production)

## 🏗️ Architecture

| Service | Technology | Port | Description |
|---------|-----------|------|-------------|
| **web** | Next.js 16 | 3100 | Frontend application |
| **api** | Fastify | 7100 | Backend API service |
| **postgres** | PostgreSQL 16 | 5432 | Main database |
| **redis** | Redis 7 | 6379 | Cache service |



## 🚀 Quick Start

### Prerequisites

- **Docker**: Docker Engine 20.10+
- **Docker Compose**: 2.0+


### One-Click Deployment (Recommended)

```bash
# Run the interactive deployment tool
# Prerequisite: Please install CLI tool first
# npm install -g nodebbs (or use npx nodebbs)
# Details: https://www.npmjs.com/nodebbs

npx nodebbs
```

The script supports three environment configurations:
- **Standard Production** (2C4G+) - Memory: API 768M, Web 768M
- **Low Memory** (1C1G/1C2G) - Memory: API 512M, Web 512M
- **Basic** (for testing) - No resource limits









## 🌐 Access Points

After deployment, access:

- **Web Frontend**: http://localhost:3100
- **API Documentation**: http://localhost:7100/docs
- **API Health Check**: http://localhost:7100/api

## 📝 Common Commands

### Common Commands

```bash
$ nodebbs
? Select command:
❯ start         Start deployment
  stop          Stop services
  restart       Restart all services (force recreate)
  upgrade       Upgrade services (pull latest images or rebuild)
  status        Check service status
  logs          View logs  [+]
  shell         Enter container shell  [+]
  db            Database operations (backup, migrate, seed, etc.)  [+]
  pack          Generate offline deployment package
  clean         Clean Docker cache and residual resources
  help          Show help
  ❌ Exit
```

For more commands and detailed instructions, please visit the NodeBBS CLI project homepage:
https://www.npmjs.com/nodebbs

## 🛠️ Development Setup (Without Docker)

### Prerequisites
- Node.js >= 22
- pnpm >= 10.0.0
- PostgreSQL
- Redis

### Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cd apps/api && cp .env.example .env
cd ../web && cp .env.example .env

# 3. Setup database
cd ../api
pnpm db:push
pnpm seed

# 4. Start development servers
cd ../..
pnpm dev

# API: port 7100 | Web: port 3100
```

## 📦 Project Structure

```
nodebbs/
├── apps/
│   ├── api/                 # Fastify backend
│   │   ├── src/
│   │   │   ├── routes/      # API routes
│   │   │   ├── plugins/     # Fastify plugins
│   │   │   ├── db/          # Database schemas
│   │   │   └── utils/       # Utilities
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                 # Next.js frontend
│       ├── app/             # Next.js App Router
│       ├── components/      # React components
│       ├── Dockerfile
│       └── package.json
├── packages/                # Shared packages (future)
├── scripts/                 # Deployment scripts
├── docker-compose.yml       # Docker Compose base config
├── docker-compose.prod.yml  # Standard production config
├── docker-compose.lowmem.yml # Low memory config
├── Makefile                 # Command shortcuts
├── deploy.sh                # Auto deployment script
├── nginx.conf.example       # Nginx configuration template
├── .env.docker.example      # Environment variables template
└── turbo.json               # Turborepo configuration
```





## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT

## 🐛 Support

For issues and questions:
- Open an issue on GitHub

