#!/bin/bash

# Arthera Quant Lab full stack launcher
set -euo pipefail

BACKEND_PORT=8004
QUANT_ENGINE_PORT=8003
QLIB_PORT=8005
TUSHARE_PORT=8010
FRONTEND_PORT=3000

# Prefer project-local uvicorn (from .venv) so the script works even when the
# global PATH doesn't expose the venv. Allows overriding via UVICORN_BIN.
VENV_DIR="$(pwd)/.venv"
DEFAULT_UVICORN="$VENV_DIR/bin/uvicorn"
DEFAULT_PYTHON="$VENV_DIR/bin/python"

if [[ -x "${UVICORN_BIN:-}" ]]; then
    UVICORN_CMD="$UVICORN_BIN"
elif [[ -x "$DEFAULT_UVICORN" ]]; then
    UVICORN_CMD="$DEFAULT_UVICORN"
elif [[ -x "$DEFAULT_PYTHON" ]]; then
    UVICORN_CMD="$DEFAULT_PYTHON -m uvicorn"
else
    UVICORN_CMD="$(command -v uvicorn || true)"
fi

if [[ -z "$UVICORN_CMD" ]]; then
    echo "❌ 未找到 uvicorn，可先激活虚拟环境或设置 UVICORN_BIN 指向 .venv/bin/uvicorn"
    exit 1
fi

SERVICES=()
PIDS=()

check_port() {
    local port=$1
    local name=$2
    if lsof -i:$port >/dev/null 2>&1; then
        echo "⚠️  端口 $port ($name) 被占用"
        read -p "是否强制释放端口 $port? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $(lsof -ti:$port) 2>/dev/null || true
            sleep 1
        else
            echo "❌ 启动被取消"
            exit 1
        fi
    else
        echo "✅ 端口 $port ($name) 可用"
    fi
}

start_service() {
    local cmd=$1
    local name=$2
    echo "🚀 启动 $name..."
    eval "$cmd" &
    local pid=$!
    SERVICES+=("$name")
    PIDS+=($pid)
}

stop_services() {
    echo "\n🛑 正在停止服务..."
    for pid in "${PIDS[@]}"; do
        kill $pid 2>/dev/null || true
    done
    wait 2>/dev/null || true
}

trap stop_services INT

echo "📋 检查端口可用性..."
check_port $FRONTEND_PORT "前端"
check_port $BACKEND_PORT "后端 API"
check_port $QUANT_ENGINE_PORT "QuantEngine"
check_port $QLIB_PORT "Qlib Worker"
check_port $TUSHARE_PORT "Tushare Proxy"

start_service "$UVICORN_CMD backend.api.main:app --host 0.0.0.0 --port $BACKEND_PORT" "后端 API"
start_service "$UVICORN_CMD backend.quant_engine.server:app --host 0.0.0.0 --port $QUANT_ENGINE_PORT" "QuantEngine 服务"
start_service "$UVICORN_CMD backend.qlib_worker.server:app --host 0.0.0.0 --port $QLIB_PORT" "Qlib Worker"
start_service "$UVICORN_CMD backend.tushare_proxy.server:app --host 0.0.0.0 --port $TUSHARE_PORT" "Tushare Proxy"
start_service "npm run dev" "前端"

echo "\n✅ 所有服务已启动"
echo "📱 前端:           http://localhost:$FRONTEND_PORT"
echo "🔧 后端 API:       http://localhost:$BACKEND_PORT"
echo "🤖 QuantEngine:    http://localhost:$QUANT_ENGINE_PORT"
echo "📊 Qlib Worker:    http://localhost:$QLIB_PORT"
echo "🛰️  Tushare Proxy: http://localhost:$TUSHARE_PORT"
echo "📚 API 文档:       http://localhost:$BACKEND_PORT/docs"
echo "\n按 Ctrl+C 停止所有服务"

wait
