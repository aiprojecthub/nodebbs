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

For detailed architecture diagrams and service dependencies, see [Docker Deployment Guide](./DOCKER_DEPLOY.md#系统架构).

## 🚀 Quick Start

### Prerequisites

- **Docker**: Docker Engine 20.10+
- **Docker Compose**: 2.0+
- **Make**: (optional, for simplified commands)

### One-Click Deployment (Recommended)

```bash
# Run the automated deployment script
./deploy.sh
```

The script supports three environment configurations:
- **Standard Production** (2C4G+) - Memory: API 768M, Web 768M
- **Low Memory** (1C1G/1C2G) - Memory: API 512M, Web 512M
- **Basic** (for testing) - No resource limits

For detailed deployment steps and configuration, see [Docker Deployment Guide](./DOCKER_DEPLOY.md#快速开始).

### Manual Deployment

```bash
# 1. Copy environment file
cp .env.docker.example .env

# 2. Edit configuration (IMPORTANT!)
vi .env

# 3. Start services
docker compose up -d

# 4. Initialize database
docker compose exec api npm run db:push
docker compose exec api npm run seed
```

## 🔐 Security Configuration

**IMPORTANT**: Before deploying, modify these values in `.env`:

```bash
# Generate secure JWT secret
openssl rand -base64 32

# Required changes:
POSTGRES_PASSWORD=your_secure_postgres_password
REDIS_PASSWORD=your_secure_redis_password
JWT_SECRET=generated_secure_jwt_secret
CORS_ORIGIN=https://yourdomain.com  # Production only
```

For complete environment variable documentation, see [Docker Deployment Guide](./DOCKER_DEPLOY.md#环境配置).

## 🌐 Access Points

After deployment, access:

- **Web Frontend**: http://localhost:3100
- **API Documentation**: http://localhost:7100/docs
- **API Health Check**: http://localhost:7100/api

## 📝 Common Commands

### Using Makefile (Recommended)

```bash
make help              # Show all available commands
make up                # Start all services
make down              # Stop all services
make logs              # View all logs
make db-push           # Push database schema
make seed              # Initialize seed data
make health            # Check service health

# Production environment
ENV=prod make up       # Start production services
```

### Using Docker Compose

```bash
docker compose up -d           # Start services
docker compose down            # Stop services
docker compose logs -f         # View logs
docker compose ps              # Show status
```

For complete command reference, see [Docker Deployment Guide](./DOCKER_DEPLOY.md#常用命令).

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
pnpm db:push:dev
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

## 🚀 Production Deployment

### Quick Deploy

```bash
./deploy.sh
# Select: 1) Standard Production or 2) Low Memory
```

### Deployment Recommendations

1. **Configure Nginx reverse proxy** - Provide SSL/HTTPS support
2. **Setup database backups** - Regular data backups
3. **Configure firewall** - Only open necessary ports
4. **Monitor service health** - Use `make health` to check

For detailed production configuration (Nginx, SSL, firewall, monitoring, etc.), see [Docker Deployment Guide](./DOCKER_DEPLOY.md#生产环境部署docker-compose).

### Database Backup

```bash
# Backup
docker compose exec postgres pg_dump -U postgres nodebbs > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U postgres nodebbs < backup.sql
```

## 🔍 Troubleshooting

For issues, see [Docker Deployment Guide - Troubleshooting](./DOCKER_DEPLOY.md#故障排查) for detailed solutions.

Common diagnostic commands:

```bash
make health                    # Check service health
docker compose logs -f api     # View API logs
docker compose ps              # Show container status
```

## 📚 Documentation

- **[Docker Deployment Guide](./DOCKER_DEPLOY.md)** - Complete deployment instructions, configuration details, troubleshooting

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
- Check [Docker Deployment Guide](./DOCKER_DEPLOY.md) for deployment issues
