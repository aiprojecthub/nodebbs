#!/bin/bash

# NodeBBS Docker 快速启动脚本
# 用于首次部署或快速重新部署

set -e

# 颜色定义
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

    if [ "$POSTGRES_PASSWORD" = "your_secure_postgres_password_here" ]; then
        print_warning "请修改 POSTGRES_PASSWORD"
        warnings=$((warnings + 1))
    fi

    if [ "$REDIS_PASSWORD" = "your_secure_redis_password_here" ]; then
        print_warning "请修改 REDIS_PASSWORD"
        warnings=$((warnings + 1))
    fi

    if [ "$JWT_SECRET" = "change-this-to-a-secure-random-string-in-production" ]; then
        print_warning "请修改 JWT_SECRET"
        warnings=$((warnings + 1))
    fi

    if [ $warnings -gt 0 ]; then
        print_error "发现 $warnings 个配置警告，请修改 .env 文件"
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
    docker compose build --no-cache
    print_success "镜像构建完成"
}

# 启动服务
start_services() {
    print_info "启动服务..."
    docker compose up -d
    print_success "服务已启动"
}

# 等待服务健康
wait_for_health() {
    print_info "等待服务启动..."

    # 等待数据库
    print_info "等待 PostgreSQL..."
    timeout=30
    while [ $timeout -gt 0 ]; do
        if docker compose exec -T postgres pg_isready -U postgres &> /dev/null; then
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
        docker compose exec api npm run db:push
        print_success "数据库 schema 推送完成"
    fi

    read -p "是否初始化种子数据? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose exec api npm run seed
        print_success "种子数据初始化完成"
    fi
}

# 显示访问信息
show_info() {
    echo ""
    print_success "部署完成!"
    echo ""
    echo -e "${GREEN}访问地址:${NC}"
    echo -e "  Web 前端: ${BLUE}http://localhost:${WEB_PORT:-3100}${NC}"
    echo -e "  API 文档: ${BLUE}http://localhost:${API_PORT:-7100}/docs${NC}"
    echo -e "  健康检查: ${BLUE}http://localhost:${API_PORT:-7100}/api${NC}"
    echo ""
    echo -e "${GREEN}常用命令:${NC}"
    echo -e "  查看日志: ${BLUE}docker compose logs -f${NC}"
    echo -e "  停止服务: ${BLUE}docker compose down${NC}"
    echo -e "  重启服务: ${BLUE}docker compose restart${NC}"
    echo -e "  查看状态: ${BLUE}docker compose ps${NC}"
    echo ""
    echo -e "更多命令请参考: ${BLUE}make help${NC} 或查看 ${BLUE}DOCKER_DEPLOY.md${NC}"
    echo ""
}

# 主流程
main() {
    print_header

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
