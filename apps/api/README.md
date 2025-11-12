# API 后台项目

## 项目技术栈

- **框架**: Fastify 5
- **数据库**: PostgreSQL
- **ORM**: Drizzle ORM
- **缓存**: Redis (ioredis)
- **认证**: JWT (@fastify/jwt)
- **文件上传**: Multipart (@fastify/multipart)
- **图片处理**: IPX
- **文档**: Swagger UI
- **日志**: Pino
- **环境变量**: @dotenvx/dotenvx
- **密码加密**: bcryptjs

## 开发

1. **安装依赖**
```bash
pnpm install
```

2. **配置环境变量**
```bash
# 生成 JWT 密钥
openssl rand -base64 32

# 在 .env 文件中配置数据库和 Redis 连接信息
```

3. **初始化数据库**
```bash
pnpm run db:push
```

4. **启动开发服务器**
```bash
pnpm run dev
```

5. **数据库管理工具**
```bash
pnpm run db:studio
```

## 部署

1. **配置生产环境变量**
```bash
# 在 .env.production 文件中配置
```

2. **推送数据库结构**
```bash
pnpm run db:push
```

3. **启动生产环境**
```bash
pnpm run prod
```

使用 PM2 进行进程管理，配置文件：`ecosystem.config.cjs`
