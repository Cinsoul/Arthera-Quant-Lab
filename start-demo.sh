#!/bin/bash

# Arthera量化交易系统 - 投资者演示启动脚本
# 一键启动完整的量化交易演示系统

if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo "⚠️  未找到 .env，建议运行 scripts/bootstrap.sh 初始化环境"
fi

echo "🚀 启动Arthera量化交易演示系统..."
echo "=================================="

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker Desktop"
    exit 1
fi

# 检查Docker Compose是否可用
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose未安装"
    exit 1
fi

echo "✅ Docker环境检查通过"

# 创建必要的目录
echo "📁 创建必要的目录结构..."
mkdir -p logs
mkdir -p data/postgres
mkdir -p data/redis

# 设置环境变量
export COMPOSE_PROJECT_NAME=arthera_trading
export POSTGRES_PASSWORD=arthera123
export DEMO_MODE=true

echo "🔧 配置环境变量完成"

# 清理旧容器（如果存在）
echo "🧹 清理旧容器..."
docker-compose down --volumes --remove-orphans 2>/dev/null || true

# 构建和启动服务
echo "🏗️  构建服务镜像..."
docker-compose build --parallel

echo "🚀 启动服务容器..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 健康检查
echo "🔍 检查服务健康状态..."

check_service() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    
    echo -n "  检查 $service_name... "
    
    for i in {1..30}; do
        if curl -s -f "http://localhost:$port$endpoint" > /dev/null 2>&1; then
            echo "✅ 正常"
            return 0
        fi
        sleep 1
    done
    
    echo "❌ 失败"
    return 1
}

# 检查各个服务
check_service "API Gateway" 8000 "/health"
check_service "iOS Connector" 8002 "/health"
check_service "AI Agents" 8006 "/health"
check_service "Crypto Connectors" 8007 "/health"
check_service "Risk Management" 8003 "/health"
check_service "Backtesting Engine" 8008 "/health"

# 显示系统状态
echo ""
echo "🎯 Arthera量化交易演示系统已启动！"
echo "=================================="
echo ""
echo "📊 服务访问地址："
echo "  • API Gateway:     http://localhost:8000"
echo "  • iOS Connector:   http://localhost:8002"
echo "  • AI Agents:       http://localhost:8006"
echo "  • Crypto Connect:  http://localhost:8007"
echo "  • Risk Management: http://localhost:8003"
echo "  • Backtesting:     http://localhost:8008"
echo "  • 系统仪表板:      http://localhost:8000/dashboard/system-status"
echo "  • 交易统计:        http://localhost:8000/dashboard/trading-stats"
echo ""
echo "📱 iOS连接配置："
echo "  • API Base URL:    http://localhost:8000"
echo "  • iOS Connector:   http://localhost:8002"
echo "  • WebSocket:       ws://localhost:8002/ios/ws"
echo ""
echo "🔍 监控和管理："
echo "  • 服务日志:        docker-compose logs -f"
echo "  • 停止系统:        docker-compose down"
echo "  • 重启系统:        ./start-demo.sh"
echo ""

# 显示实时日志选项
echo "📋 查看实时日志请选择："
echo "  1. 全部服务日志"
echo "  2. API Gateway日志" 
echo "  3. iOS Connector日志"
echo "  4. AI Agents日志"
echo "  5. Crypto Connectors日志"
echo "  6. Risk Management日志"
echo "  7. Backtesting Engine日志"
echo "  8. 退出（系统继续运行）"
echo ""
read -p "请选择 [1-8]: " choice

case $choice in
    1)
        echo "📊 显示全部服务日志（Ctrl+C退出）..."
        docker-compose logs -f
        ;;
    2)
        echo "🌐 显示API Gateway日志（Ctrl+C退出）..."
        docker-compose logs -f api-gateway
        ;;
    3)
        echo "📱 显示iOS Connector日志（Ctrl+C退出）..."
        docker-compose logs -f ios-connector
        ;;
    4)
        echo "🤖 显示AI Agents日志（Ctrl+C退出）..."
        docker-compose logs -f ai-agents
        ;;
    5)
        echo "₿ 显示Crypto Connectors日志（Ctrl+C退出）..."
        docker-compose logs -f crypto-connectors
        ;;
    6)
        echo "⚠️ 显示Risk Management日志（Ctrl+C退出）..."
        docker-compose logs -f risk-management
        ;;
    7)
        echo "📈 显示Backtesting Engine日志（Ctrl+C退出）..."
        docker-compose logs -f backtesting-engine
        ;;
    8)
        echo "✅ 演示系统继续在后台运行"
        echo "💡 提示：使用 'docker-compose down' 停止系统"
        ;;
    *)
        echo "无效选择，系统继续运行"
        ;;
esac

echo ""
echo "🎉 Arthera量化交易演示系统运行中！"
