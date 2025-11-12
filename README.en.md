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
- **Framework**: [Next.js 15](https://nextjs.org/) with Turbopack
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI
- **Form Handling**: React Hook Form
- **Markdown**: React Markdown with GitHub Flavored Markdown
- **Theme**: next-themes (dark/light mode)

### Development & Deployment
- **Monorepo**: Turborepo
- **Package Manager**: pnpm 9+
- **Environment Variables**: dotenvx
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (production)

## 🏗️ Architecture

```
┌─────────────────────────────┐
│    Nginx (Production)       │
│  SSL/HTTPS + Reverse Proxy  │
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

| Service | Technology | Port | Description |
|---------|-----------|------|-------------|
| **web** | Next.js 15 | 3100 | Frontend application |
| **api** | Fastify | 7100 | Backend API service |
| **postgres** | PostgreSQL 16 | 5432 | Main database |
| **redis** | Redis 7 | 6379 | Cache service |

## 🚀 Quick Start

### Prerequisites

- **Docker**: Docker Engine 20.10+
- **Docker Compose**: 2.0+
- **Make**: (optional, for simplified commands)

### Method 1: Auto Deploy Script (Recommended)

```bash
# Run the automated deployment script
./deploy.sh
```

The script will:
- Check Docker environment
- Initialize `.env` file
- Validate configuration
- Build images
- Start services
- Initialize database

### Method 2: Using Makefile

```bash
# Initialize environment
make init

# Edit .env file (IMPORTANT!)
vi .env

# Start all services
make up

# Initialize database
make db-push
make seed

# View logs
make logs

# Check service health
make health
```

### Method 3: Using Docker Compose

```bash
# 1. Copy environment file
cp .env.docker.example .env

# 2. Edit configuration
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

## 🌐 Access Points

After deployment, access:

- **Web Frontend**: http://localhost:3100
- **API Documentation**: http://localhost:7100/docs
- **API Health Check**: http://localhost:7100/api

## 📝 Common Commands

### Using Makefile (Recommended)

```bash
make help              # Show all available commands

# Container Management
make up                # Start all services
make down              # Stop all services
make restart           # Restart all services
make build             # Rebuild images
make ps                # Show container status

# Logs
make logs              # View all logs
make logs-api          # View API logs
make logs-web          # View Web logs

# Database Operations
make db-push           # Push database schema
make db-generate       # Generate migrations
make db-migrate        # Run migrations
make db-studio         # Open Drizzle Studio
make seed              # Initialize seed data
make seed-reset        # Reset and reseed data

# Container Access
make exec-api          # Enter API container
make exec-web          # Enter Web container
make exec-db           # Enter PostgreSQL
make exec-redis        # Enter Redis

# Health & Cleanup
make health            # Check service health
make clean             # Remove containers and networks
make clean-all         # Remove everything including volumes (DANGER!)
```

### Using Docker Compose

```bash
# Start/Stop
docker compose up -d
docker compose down
docker compose restart

# Logs
docker compose logs -f
docker compose logs -f api

# Rebuild
docker compose build --no-cache
docker compose up -d --build

# Status
docker compose ps
```

## 🛠️ Development Setup (Without Docker)

### Prerequisites
- Node.js >= 18
- pnpm >= 9.0.0
- PostgreSQL
- Redis

### Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cd apps/api
cp .env.example .env
# Edit .env with your database and Redis credentials

cd ../web
cp .env.example .env
# Edit .env with API URL

# 3. Setup database
cd ../api
pnpm db:push:dev
pnpm seed

# 4. Start development servers
cd ../..
pnpm dev

# API will run on port 7100
# Web will run on port 3100
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
│   │   ├── .dockerignore
│   │   └── package.json
│   └── web/                 # Next.js frontend
│       ├── app/             # Next.js App Router
│       ├── components/      # React components
│       ├── Dockerfile
│       ├── .dockerignore
│       └── package.json
├── packages/                # Shared packages (future)
├── scripts/                 # Deployment scripts
├── docker-compose.yml       # Docker Compose config
├── docker-compose.prod.yml  # Production config
├── Makefile                 # Command shortcuts
├── deploy.sh                # Auto deployment script
├── nginx.conf.example       # Nginx configuration template
├── .env.docker.example      # Environment variables template
└── turbo.json               # Turborepo configuration
```

## 🚀 Production Deployment

### 1. Prepare Environment

```bash
# Clone repository
git clone <repository-url>
cd nodebbs

# Initialize environment
cp .env.docker.example .env
vi .env  # Configure production settings
```

### 2. Configure Nginx (Recommended)

Copy and modify `nginx.conf.example`:

```bash
cp nginx.conf.example /etc/nginx/sites-available/nodebbs
# Edit the file with your domain and SSL certificates
sudo ln -s /etc/nginx/sites-available/nodebbs /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
```

### 3. Deploy with Docker

```bash
# Using deployment script
./deploy.sh

# Or manually
docker compose -f docker-compose.prod.yml up -d
make db-push
make seed
```

### 4. Setup Database Backups

```bash
# Backup database
docker compose exec postgres pg_dump -U postgres nodebbs > backup_$(date +%Y%m%d).sql

# Restore database
docker compose exec -T postgres psql -U postgres nodebbs < backup_20241110.sql
```

## 🔍 Troubleshooting

### View Service Logs
```bash
make logs
docker compose logs -f [service_name]
```

### Check Service Health
```bash
make health
docker compose ps
```

### Restart Specific Service
```bash
docker compose restart api
docker compose restart web
```

### Database Connection Issues
```bash
# Check database status
docker compose exec postgres pg_isready

# Access database
make exec-db
```

### Redis Connection Issues
```bash
# Check Redis status
docker compose exec redis redis-cli ping

# Access Redis
make exec-redis
```

## 📚 Documentation

- [Docker Deployment Guide](./DOCKER_DEPLOY.md) - Detailed deployment instructions

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
- Check existing documentation in `/docs`
- Review `DOCKER_DEPLOY.md` for deployment issues
