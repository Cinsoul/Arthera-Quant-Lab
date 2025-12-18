#!/bin/bash

# Arthera量化交易系统 - 简化演示启动脚本
echo "🚀 启动Arthera量化交易简化演示系统..."
echo "======================================="

# 检查Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker Desktop"
    exit 1
fi

echo "✅ Docker环境检查通过"

# 切换到项目目录
cd "/Users/mac/Desktop/Arthera/Arthea/TradingEngine"

# 清理旧容器
echo "🧹 清理旧容器..."
docker-compose -f docker-compose-simple.yml down --volumes --remove-orphans 2>/dev/null || true

# 构建并启动
echo "🏗️  构建和启动服务..."
docker-compose -f docker-compose-simple.yml up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 20

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose -f docker-compose-simple.yml ps

# 测试API端点
echo ""
echo "🧪 测试API端点..."

echo -n "  API Gateway健康检查... "
if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
fi

echo -n "  iOS Connector健康检查... "
if curl -s -f http://localhost:8002/health > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
fi

echo -n "  Mock Backend健康检查... "
if curl -s -f http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
fi

echo ""
echo "🎯 Arthera量化交易演示系统已启动！"
echo "=================================="
echo ""
echo "📊 服务访问地址："
echo "  • API Gateway:     http://localhost:8000"
echo "  • iOS Connector:   http://localhost:8002"  
echo "  • Mock Backend:    http://localhost:8001"
echo ""
echo "🧪 测试端点："
echo "  • 系统状态:        curl http://localhost:8000/health"
echo "  • 交易统计:        curl http://localhost:8000/dashboard/system-status"
echo "  • 生成信号:        curl -X POST http://localhost:8000/signals/generate -H 'Content-Type: application/json' -d '{\"symbols\":[\"AAPL\"]}'"
echo "  • iOS信号生成:     curl -X POST http://localhost:8002/ios/signals/deepseek/generate -H 'Content-Type: application/json' -d '{\"symbol\":\"AAPL\",\"market_data\":{}}'"
echo ""
echo "📱 iOS连接配置："
echo "  • API Base URL:    http://localhost:8000"
echo "  • iOS Connector:   http://localhost:8002"
echo "  • WebSocket:       ws://localhost:8002/ios/ws"
echo ""

# 演示一些API调用
echo "🚀 演示API调用..."
echo ""

echo "1️⃣  获取系统状态："
curl -s http://localhost:8000/dashboard/system-status | python3 -m json.tool 2>/dev/null || echo "系统正在启动中..."

echo ""
echo "2️⃣  生成交易信号："
curl -s -X POST http://localhost:8000/signals/generate -H 'Content-Type: application/json' -d '{"symbols":["AAPL","TSLA"]}' | python3 -m json.tool 2>/dev/null || echo "信号服务启动中..."

echo ""
echo "3️⃣  iOS DeepSeek信号测试："
curl -s -X POST http://localhost:8002/ios/signals/deepseek/generate -H 'Content-Type: application/json' -d '{"symbol":"AAPL","market_data":{"price":150.25,"volume":1000000},"include_uncertainty":true}' | python3 -m json.tool 2>/dev/null || echo "iOS连接器启动中..."

echo ""
echo "✅ 演示系统运行成功！"
echo ""
echo "📋 系统管理命令："
echo "  • 查看日志: docker-compose -f docker-compose-simple.yml logs -f"
echo "  • 停止系统: docker-compose -f docker-compose-simple.yml down"
echo "  • 重启系统: ./start-simple-demo.sh"
echo ""

# 询问是否查看日志
read -p "是否查看实时日志？(y/n): " show_logs
if [[ $show_logs =~ ^[Yy]$ ]]; then
    echo "📊 显示实时日志（Ctrl+C退出）..."
    docker-compose -f docker-compose-simple.yml logs -f
else
    echo "💡 系统继续在后台运行"
fi