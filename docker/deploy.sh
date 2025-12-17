#!/bin/bash

# NodeBBS Docker 快速启动脚本
# 用于首次部署或快速重新部署
# 支持开发环境和生产环境

set -e

# 颜色定义
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 环境变量
ENVIRONMENT=""
COMPOSE_CMD=""

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 打印标题
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  NodeBBS Docker 部署脚本${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# 选择部署环境
select_environment() {
    echo ""
    print_info "请根据服务器配置选择部署环境:"
    echo ""
    echo "  1) 标准生产环境 (Production - 2C4G+) [推荐]"
    echo "     - 内存限制: API 768M, Web 768M, PostgreSQL 512M"
    echo "     - 完整的资源限制和日志管理"
    echo ""
    echo "  2) 低配环境 (Low Memory - 1C1G/1C2G)"
    echo "     - 内存限制: API 512M, Web 512M, PostgreSQL 256M"
    echo "     - 启动时间较长，适合小流量场景"
    echo ""
    echo "  3) 基础环境 (Basic - 用于测试)"
    echo "     - 无资源限制（仅用于本地测试，不推荐生产使用）"
    echo "     - 暴露所有服务端口便于调试"
    echo ""

    while true; do
        read -p "请选择 [1-3, 默认 1]: " -n 1 -r
        echo
        # 如果用户直接回车，默认选择 1
        if [ -z "$REPLY" ]; then
            REPLY=1
        fi
        case $REPLY in
            1)
                ENVIRONMENT="production"
                COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
                print_success "已选择: 标准生产环境 (2C4G+)"
                break
                ;;
            2)
                ENVIRONMENT="lowmem"
                COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.lowmem.yml"
                print_success "已选择: 低配环境 (1C1G/1C2G)"
                break
                ;;
            3)
                ENVIRONMENT="basic"
                COMPOSE_CMD="docker compose"
                print_success "已选择: 基础环境 (仅用于测试)"
                print_warning "注意: 此环境无资源限制，不推荐用于生产部署"
                break
                ;;
            *)
                print_error "无效选择，请输入 1-3"
                ;;
        esac
    done
    echo ""
}

# 检查 Docker 是否安装
check_docker() {
    print_info "检查 Docker 环境..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    print_success "Docker 环境检查通过"
}

# 初始化环境变量
init_env() {
    if [ ! -f .env ]; then
        print_info "创建环境变量文件..."
        cp .env.docker.example .env

        print_warning "请编辑 .env 文件，修改以下配置："
        print_warning "  - POSTGRES_PASSWORD (数据库密码)"
        print_warning "  - REDIS_PASSWORD (Redis 密码)"
        print_warning "  - JWT_SECRET (JWT 密钥，使用 openssl rand -base64 32 生成)"

        read -p "是否现在编辑 .env 文件? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-vi} .env
        else
            print_warning "请手动编辑 .env 文件后再继续"
            exit 0
        fi
    else
        print_info ".env 文件已存在，跳过创建"
    fi
}

# 检查环境变量
check_env() {
    print_info "检查环境变量配置..."

    source .env

    # 检查必要的配置
    warnings=0
    errors=0

    if [ "$POSTGRES_PASSWORD" = "your_secure_postgres_password_here" ] || [ "$POSTGRES_PASSWORD" = "postgres_password" ]; then
        if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "lowmem" ]; then
            print_error "生产环境必须修改 POSTGRES_PASSWORD"
            errors=$((errors + 1))
        else
            print_warning "建议修改 POSTGRES_PASSWORD"
            warnings=$((warnings + 1))
        fi
    fi

    if [ "$REDIS_PASSWORD" = "your_secure_redis_password_here" ] || [ "$REDIS_PASSWORD" = "redis_password" ]; then
        if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "lowmem" ]; then
            print_error "生产环境必须修改 REDIS_PASSWORD"
            errors=$((errors + 1))
        else
            print_warning "建议修改 REDIS_PASSWORD"
            warnings=$((warnings + 1))
        fi
    fi

    if [ "$JWT_SECRET" = "change-this-to-a-secure-random-string-in-production" ]; then
        if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "lowmem" ]; then
            print_error "生产环境必须修改 JWT_SECRET"
            errors=$((errors + 1))
        else
            print_warning "建议修改 JWT_SECRET"
            warnings=$((warnings + 1))
        fi
    fi

    # 生产环境额外检查
    if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "lowmem" ]; then
        if [ -z "$CORS_ORIGIN" ] || [ "$CORS_ORIGIN" = "*" ]; then
            print_warning "生产环境建议设置具体的 CORS_ORIGIN"
            warnings=$((warnings + 1))
        fi

        if [ -z "$APP_URL" ] || [ "$APP_URL" = "http://localhost:3100" ]; then
            print_warning "生产环境建议设置实际的 APP_URL"
            warnings=$((warnings + 1))
        fi
    fi

    if [ $errors -gt 0 ]; then
        print_error "发现 $errors 个配置错误，无法继续部署"
        exit 1
    fi

    if [ $warnings -gt 0 ]; then
        print_warning "发现 $warnings 个配置警告"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    else
        print_success "环境变量配置检查通过"
    fi
}

# 构建镜像
build_images() {
    print_info "构建 Docker 镜像..."
    $COMPOSE_CMD build --no-cache
    print_success "镜像构建完成"
}

# 启动服务
start_services() {
    print_info "启动服务..."
    $COMPOSE_CMD up -d
    print_success "服务已启动"
}

# 等待服务健康
wait_for_health() {
    print_info "等待服务启动..."

    # 等待数据库
    print_info "等待 PostgreSQL..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if $COMPOSE_CMD exec -T postgres pg_isready -U postgres &> /dev/null; then
            print_success "PostgreSQL 已就绪"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    # 等待 Redis
    print_info "等待 Redis..."
    sleep 5
    print_success "Redis 已就绪"

    # 等待 API
    print_info "等待 API 服务..."
    sleep 10
    print_success "API 服务已就绪"
}

# 初始化数据库
init_database() {
    print_info "初始化数据库..."

    read -p "是否推送数据库 schema? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        $COMPOSE_CMD exec api npm run db:push
        print_success "数据库 schema 推送完成"
    fi

    read -p "是否初始化种子数据? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        $COMPOSE_CMD exec api npm run seed
        print_success "种子数据初始化完成"
    fi
}

# 显示访问信息
show_info() {
    echo ""
    print_success "部署完成!"
    echo ""
    echo -e "${BLUE}部署环境: ${GREEN}${ENVIRONMENT}${NC}"
    echo ""
    echo -e "${GREEN}访问地址:${NC}"
    echo -e "  Web 前端: ${BLUE}http://localhost:${WEB_PORT:-3100}${NC}"
    echo -e "  API 文档: ${BLUE}http://localhost:${API_PORT:-7100}/docs${NC}"
    echo -e "  健康检查: ${BLUE}http://localhost:${API_PORT:-7100}/api${NC}"
    echo ""

    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${YELLOW}生产环境提示:${NC}"
        echo -e "  - 资源配置: API 768M, Web 768M (适合 2C4G+ 服务器)"
        echo -e "  - 数据库和 Redis 端口未暴露到主机（仅内部访问）"
        echo -e "  - 已启用资源限制和日志管理"
        echo -e "  - 建议配置反向代理 (nginx/caddy) 用于生产环境"
        echo ""
    elif [ "$ENVIRONMENT" = "lowmem" ]; then
        echo -e "${YELLOW}低配环境提示:${NC}"
        echo -e "  - 资源配置: API 512M, Web 512M (适合 1C1G/1C2G 服务器)"
        echo -e "  - 启动时间可能较长，请耐心等待"
        echo -e "  - 数据库和 Redis 端口未暴露到主机（仅内部访问）"
        echo -e "  - 适合个人项目和小流量场景"
        echo -e "  - 建议配置反向代理 (nginx/caddy) 用于生产环境"
        echo ""
    elif [ "$ENVIRONMENT" = "basic" ]; then
        echo -e "${YELLOW}基础环境提示:${NC}"
        echo -e "  - 无资源限制，仅用于本地测试"
        echo -e "  - 所有服务端口已暴露，便于调试"
        echo -e "  - ${RED}不推荐用于生产部署${NC}"
        echo ""
    fi

    echo -e "${GREEN}常用命令:${NC}"
    echo -e "  查看日志: ${BLUE}$COMPOSE_CMD logs -f${NC}"
    echo -e "  停止服务: ${BLUE}$COMPOSE_CMD down${NC}"
    echo -e "  重启服务: ${BLUE}$COMPOSE_CMD restart${NC}"
    echo -e "  查看状态: ${BLUE}$COMPOSE_CMD ps${NC}"
    echo ""
    echo -e "更多命令请参考: ${BLUE}make help${NC} 或查看 ${BLUE}DOCKER_DEPLOY.md${NC}"
    echo ""
}

# 主流程
main() {
    print_header

    select_environment
    check_docker
    init_env
    check_env

    read -p "是否继续部署? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "部署已取消"
        exit 0
    fi

    build_images
    start_services
    wait_for_health
    init_database
    show_info
}

# 运行主流程
main
