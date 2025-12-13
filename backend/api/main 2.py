"""
Arthera Quant Platform - FastAPI Gateway
Bloomberg级专业量化交易平台后端服务
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn
import logging
from typing import Dict, List
import json
import asyncio

from .routers import market, strategy, portfolio_config as portfolio, news
from .middleware.logging import LoggingMiddleware
from .dependencies import get_redis, get_database
from .config import settings

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI应用实例
app = FastAPI(
    title="Arthera Quant Platform API",
    description="Bloomberg级专业量化交易平台",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(LoggingMiddleware)

# WebSocket连接管理器
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)
        logger.info(f"Client {client_id} connected")

    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].remove(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        logger.info(f"Client {client_id} disconnected")

    async def send_personal_message(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            for connection in self.active_connections[client_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    pass

    async def broadcast(self, message: dict):
        for client_connections in self.active_connections.values():
            for connection in client_connections:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    pass

manager = ConnectionManager()

# 路由注册
app.include_router(market.router, prefix="/api/v1/market", tags=["market"])
app.include_router(news.router, prefix="/api/v1/news", tags=["news"])
app.include_router(strategy.router, prefix="/api/v1/strategy", tags=["strategy"])
app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["portfolio"])

@app.get("/")
async def root():
    return {
        "message": "Arthera Quant Platform API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """健康检查端点"""
    try:
        # 检查Redis连接
        redis = await get_redis()
        await redis.ping()
        
        # 检查数据库连接
        db = await get_database()
        if hasattr(db, 'ping'):
            await db.ping()
        
        return {
            "status": "healthy",
            "services": {
                "redis": "connected",
                "database": "connected",
                "api": "running"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket连接端点 - 实时数据推送"""
    await manager.connect(websocket, client_id)
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理订阅请求
            if message.get("action") == "subscribe":
                symbols = message.get("symbols", [])
                # TODO: 订阅实时行情
                await manager.send_personal_message({
                    "type": "subscription_confirmed",
                    "symbols": symbols
                }, client_id)
            
            # 处理取消订阅
            elif message.get("action") == "unsubscribe":
                symbols = message.get("symbols", [])
                # TODO: 取消订阅
                await manager.send_personal_message({
                    "type": "unsubscription_confirmed", 
                    "symbols": symbols
                }, client_id)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)

# 启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时初始化"""
    logger.info("Arthera Quant Platform API starting up...")
    
    # 启动实时数据推送任务
    asyncio.create_task(realtime_data_publisher())

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理"""
    logger.info("Arthera Quant Platform API shutting down...")

async def realtime_data_publisher():
    """实时数据推送任务"""
    while True:
        try:
            # TODO: 从数据源获取最新行情
            # 模拟实时数据
            sample_data = {
                "type": "market_data",
                "timestamp": asyncio.get_event_loop().time(),
                "data": {
                    "600519": {"price": 1680.50, "change": 1.23},
                    "300750": {"price": 245.80, "change": -0.85}
                }
            }
            
            await manager.broadcast(sample_data)
            await asyncio.sleep(1)  # 每秒推送一次
            
        except Exception as e:
            logger.error(f"Realtime data publisher error: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )