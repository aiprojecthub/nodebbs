# NodeBBS Docker Compose Makefile
# 简化 Docker Compose 操作的命令集

.PHONY: help init up down restart logs build clean db-push db-migrate db-studio seed

# 默认目标
.DEFAULT_GOAL := help

# 颜色输出
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## 显示帮助信息
	@echo "$(BLUE)NodeBBS Docker Compose 命令$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "使用方法: make $(GREEN)<target>$(NC)\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ 初始化

init: ## 初始化项目（复制环境变量文件）
	@echo "$(BLUE)初始化 Docker 环境...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.docker.example .env; \
		echo "$(GREEN)已创建 .env 文件，请修改其中的配置$(NC)"; \
		echo "$(YELLOW)重要: 请修改数据库密码、Redis 密码和 JWT 密钥!$(NC)"; \
	else \
		echo "$(YELLOW).env 文件已存在，跳过创建$(NC)"; \
	fi

##@ 容器管理

up: ## 启动所有服务
	@echo "$(BLUE)启动所有服务...$(NC)"
	docker compose up -d
	@echo "$(GREEN)服务已启动!$(NC)"
	@echo "$(GREEN)Web: http://localhost:3100$(NC)"
	@echo "$(GREEN)API: http://localhost:7100$(NC)"

down: ## 停止所有服务
	@echo "$(BLUE)停止所有服务...$(NC)"
	docker compose down
	@echo "$(GREEN)服务已停止$(NC)"

restart: ## 重启所有服务
	@echo "$(BLUE)重启所有服务...$(NC)"
	docker compose restart
	@echo "$(GREEN)服务已重启$(NC)"

build: ## 重新构建镜像
	@echo "$(BLUE)重新构建镜像...$(NC)"
	docker compose build --no-cache
	@echo "$(GREEN)镜像构建完成$(NC)"

rebuild: ## 重新构建并启动
	@echo "$(BLUE)重新构建并启动服务...$(NC)"
	docker compose up -d --build
	@echo "$(GREEN)服务已重新构建并启动$(NC)"

##@ 日志管理

logs: ## 查看所有服务日志
	docker compose logs -f

logs-api: ## 查看 API 日志
	docker compose logs -f api

logs-web: ## 查看 Web 日志
	docker compose logs -f web

logs-db: ## 查看数据库日志
	docker compose logs -f postgres

logs-redis: ## 查看 Redis 日志
	docker compose logs -f redis

##@ 数据库操作

db-push: ## 推送数据库 schema (开发环境)
	@echo "$(BLUE)推送数据库 schema...$(NC)"
	docker compose exec api npm run db:push
	@echo "$(GREEN)Schema 推送完成$(NC)"

db-push-prod: ## 推送数据库 schema (生产环境)
	@echo "$(BLUE)推送数据库 schema (生产环境)...$(NC)"
	docker compose exec api npm run db:push
	@echo "$(GREEN)Schema 推送完成$(NC)"

db-generate: ## 生成数据库迁移文件
	@echo "$(BLUE)生成数据库迁移...$(NC)"
	docker compose exec api npm run db:generate

db-migrate: ## 执行数据库迁移
	@echo "$(BLUE)执行数据库迁移...$(NC)"
	docker compose exec api npm run db:migrate

db-studio: ## 打开 Drizzle Studio
	@echo "$(BLUE)启动 Drizzle Studio...$(NC)"
	docker compose exec api npm run db:studio

seed: ## 初始化数据库数据
	@echo "$(BLUE)初始化数据库数据...$(NC)"
	docker compose exec api npm run seed
	@echo "$(GREEN)数据初始化完成$(NC)"

seed-reset: ## 重置并重新初始化数据
	@echo "$(YELLOW)警告: 这将清空数据库并重新初始化!$(NC)"
	@read -p "确认继续? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose exec api npm run seed:reset; \
		echo "$(GREEN)数据重置完成$(NC)"; \
	fi

##@ 清理

clean: ## 停止并删除所有容器、网络
	@echo "$(YELLOW)停止并删除所有容器和网络...$(NC)"
	docker compose down
	@echo "$(GREEN)清理完成$(NC)"

clean-all: ## 停止并删除所有容器、网络和数据卷 (危险!)
	@echo "$(RED)警告: 这将删除所有数据!$(NC)"
	@read -p "确认继续? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		echo "$(GREEN)所有数据已清理$(NC)"; \
	fi

##@ 工具

ps: ## 查看容器状态
	docker compose ps

exec-api: ## 进入 API 容器
	docker compose exec api sh

exec-web: ## 进入 Web 容器
	docker compose exec web sh

exec-db: ## 进入数据库容器
	docker compose exec postgres psql -U postgres -d nodebbs

exec-redis: ## 进入 Redis 容器
	docker compose exec redis redis-cli

health: ## 检查服务健康状态
	@echo "$(BLUE)检查服务健康状态...$(NC)"
	@docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
