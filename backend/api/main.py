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
from datetime import datetime

from ..reports.scheduler import get_report_scheduler

try:
    from .routers import market, strategy, portfolio_config as portfolio, news, reports
    from .settings_api import router as settings_router
    from .middleware.logging import LoggingMiddleware
    from .dependencies import get_redis, get_database
    from .config import settings
except ImportError:
    # 处理相对导入问题，使用绝对导入
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    
    try:
        from routers import market, strategy, portfolio_config as portfolio, news, reports
        from settings_api import router as settings_router
        from middleware.logging import LoggingMiddleware
        from dependencies import get_redis, get_database
        from config import settings
    except ImportError:
        # 如果还是失败，创建简化版本
        market = strategy = portfolio = news = None
        settings_router = None
        LoggingMiddleware = None
        get_redis = get_database = lambda: None
        settings = None

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
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
if LoggingMiddleware:
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
if market and hasattr(market, 'router'):
    app.include_router(market.router, prefix="/api/v1/market", tags=["market"])
if news and hasattr(news, 'router'):
    app.include_router(news.router, prefix="/api/v1/news", tags=["news"])
if strategy and hasattr(strategy, 'router'):
    app.include_router(strategy.router, prefix="/api/v1/strategy", tags=["strategy"])
if portfolio and hasattr(portfolio, 'router'):
    app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["portfolio"])
if reports and hasattr(reports, 'router'):
    app.include_router(reports.router)
if settings_router:
    app.include_router(settings_router, tags=["settings"])

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
        services_status = {"api": "running"}
        
        # 检查Redis连接
        if get_redis and callable(get_redis):
            try:
                redis = await get_redis()
                if hasattr(redis, 'ping'):
                    await redis.ping()
                services_status["redis"] = "connected"
            except Exception as e:
                logger.warning(f"Redis check failed: {e}")
                services_status["redis"] = "disconnected"
        
        # 检查数据库连接
        if get_database and callable(get_database):
            try:
                db = await get_database()
                if hasattr(db, 'ping'):
                    await db.ping()
                services_status["database"] = "connected"
            except Exception as e:
                logger.warning(f"Database check failed: {e}")
                services_status["database"] = "disconnected"
        
        return {
            "status": "healthy",
            "services": services_status,
            "websocket_connections": len(manager.active_connections)
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
    
    # 发送欢迎消息
    await manager.send_personal_message({
        "type": "welcome",
        "message": f"欢迎连接到Arthera Quant Platform! 客户端ID: {client_id}",
        "server_time": datetime.now().isoformat()
    }, client_id)
    
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            message = json.loads(data)
            message_type = message.get("type", message.get("action", "unknown"))
            
            logger.info(f"Received message from {client_id}: {message_type}")
            
            # 处理不同类型的消息
            if message_type in ["subscribe", "subscription"]:
                symbol = message.get("symbol") or message.get("symbols", [])
                if isinstance(symbol, str):
                    symbols = [symbol]
                else:
                    symbols = symbol if isinstance(symbol, list) else []
                
                # 确认订阅
                for sym in symbols:
                    await manager.send_personal_message({
                        "type": "subscription_confirmed",
                        "symbol": sym,
                        "message": f"已成功订阅 {sym}"
                    }, client_id)
                    
                logger.info(f"Client {client_id} subscribed to: {symbols}")
            
            elif message_type in ["unsubscribe", "unsubscription"]:
                symbol = message.get("symbol") or message.get("symbols", [])
                if isinstance(symbol, str):
                    symbols = [symbol]
                else:
                    symbols = symbol if isinstance(symbol, list) else []
                
                # 确认取消订阅
                for sym in symbols:
                    await manager.send_personal_message({
                        "type": "unsubscription_confirmed",
                        "symbol": sym,
                        "message": f"已取消订阅 {sym}"
                    }, client_id)
                    
                logger.info(f"Client {client_id} unsubscribed from: {symbols}")
                
            elif message_type == "ping":
                await manager.send_personal_message({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat(),
                    "message": "服务器响应正常"
                }, client_id)
                
            elif message_type == "get_stats":
                # 统计连接信息
                total_connections = len(manager.active_connections)
                subscriptions_info = {}
                for cid, connections in manager.active_connections.items():
                    subscriptions_info[cid] = len(connections)
                
                await manager.send_personal_message({
                    "type": "stats",
                    "data": {
                        "total_connections": total_connections,
                        "subscriptions": subscriptions_info,
                        "cached_symbols": 0,  # 可以扩展为真实的缓存统计
                        "server_uptime": "运行中"
                    }
                }, client_id)
                
            else:
                # 未知消息类型
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"未知消息类型: {message_type}",
                    "received_message": message
                }, client_id)
                
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
        manager.disconnect(websocket, client_id)
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
        manager.disconnect(websocket, client_id)

# 简化的API端点（当路由模块不可用时）
@app.get("/api/v1/market/quotes")
async def get_market_quotes(symbols: str = "600519,300750,000858"):
    """获取市场报价的简化版本"""
    import random
    from datetime import datetime
    
    symbol_list = symbols.split(',')
    quotes_data = {}
    
    stock_names = {
        "600519": "贵州茅台",
        "300750": "宁德时代", 
        "000858": "五粮液",
        "600036": "招商银行",
        "002594": "比亚迪"
    }
    
    for symbol in symbol_list:
        base_price = 100 + (hash(symbol) % 1000)
        change_percent = (random.random() - 0.5) * 4.0
        change = base_price * (change_percent / 100)
        current_price = base_price + change
        
        quotes_data[symbol] = {
            "symbol": symbol,
            "name": stock_names.get(symbol, f"股票{symbol}"),
            "price": round(current_price, 2),
            "change": round(change, 2),
            "changePercent": round(change_percent, 2),
            "volume": random.randint(100000, 5000000),
            "timestamp": datetime.now().isoformat()
        }
    
    return {
        "success": True,
        "data": quotes_data,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/market/realtime")
async def get_realtime_data(request: dict):
    """批量获取实时数据的简化版本"""
    import random
    from datetime import datetime
    
    symbols = request.get("symbols", [])
    quotes_data = []
    
    for symbol in symbols:
        base_price = 100 + (hash(symbol) % 1000)
        change_percent = (random.random() - 0.5) * 4.0
        change = base_price * (change_percent / 100)
        current_price = base_price + change
        
        quotes_data.append({
            "symbol": symbol,
            "name": f"股票{symbol}",
            "price": round(current_price, 2),
            "change": round(change, 2),
            "changePercent": round(change_percent, 2),
            "volume": random.randint(100000, 5000000),
            "timestamp": datetime.now().isoformat()
        })
    
    return {
        "success": True,
        "data": quotes_data,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/news/financial")
async def get_financial_news(limit: int = 20):
    """获取财经新闻的简化版本"""
    from datetime import datetime, timedelta
    
    news_templates = [
        "A股三大指数集体收涨，创业板指涨超1%",
        "央行：继续实施稳健货币政策，保持流动性合理充裕",
        "证监会：支持符合条件的企业在境内外上市",
        "沪深两市成交额突破万亿元",
        "北向资金净流入超百亿元"
    ]
    
    news_data = []
    for i, template in enumerate(news_templates[:limit]):
        news_data.append({
            "id": f"news_{i}",
            "title": template,
            "summary": f"这是关于{template}的详细报道摘要...",
            "publish_time": (datetime.now() - timedelta(hours=i)).isoformat(),
            "source": "财经网",
            "importance": "high" if i < 2 else "medium"
        })
    
    return {
        "success": True,
        "data": news_data,
        "total_count": len(news_data)
    }

# 启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时初始化"""
    logger.info("Arthera Quant Platform API starting up...")
    
    # 启动实时数据推送任务
    asyncio.create_task(realtime_data_publisher())

    # 启动报告调度器
    try:
        scheduler = get_report_scheduler()
        scheduler.start()
    except Exception as exc:
        logger.warning(f"Failed to start report scheduler: {exc}")

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理"""
    logger.info("Arthera Quant Platform API shutting down...")

async def realtime_data_publisher():
    """实时数据推送任务"""
    import random
    from datetime import datetime
    
    # 股票池数据
    stock_pool = {
        "AAPL": {"name": "Apple Inc.", "base_price": 180.00},
        "BTC": {"name": "Bitcoin", "base_price": 45000.00},
        "600519": {"name": "贵州茅台", "base_price": 1650.00},
        "300750": {"name": "宁德时代", "base_price": 245.00},
        "000858": {"name": "五粮液", "base_price": 150.00},
        "600036": {"name": "招商银行", "base_price": 41.00},
        "002594": {"name": "比亚迪", "base_price": 270.00},
        "601318": {"name": "中国平安", "base_price": 58.00}
    }
    
    logger.info("实时数据推送任务已启动")
    
    while True:
        try:
            # 只在有连接时推送数据
            if not manager.active_connections:
                await asyncio.sleep(2)
                continue
            
            # 为每个股票生成模拟数据
            for symbol, stock_info in stock_pool.items():
                # 生成价格波动 (-2% 到 +2%)
                change_percent = (random.random() - 0.5) * 4.0
                change = stock_info["base_price"] * (change_percent / 100)
                current_price = stock_info["base_price"] + change
                
                market_data = {
                    "type": "market_data",
                    "symbol": symbol,
                    "data": {
                        "name": stock_info["name"],
                        "price": round(current_price, 2),
                        "change": round(change, 2),
                        "changePercent": round(change_percent, 2),
                        "volume": random.randint(100000, 5000000),
                        "amount": random.randint(50000000, 500000000),
                        "high": round(current_price * (1 + random.random() * 0.02), 2),
                        "low": round(current_price * (1 - random.random() * 0.02), 2),
                        "open": round(stock_info["base_price"] * (1 + (random.random() - 0.5) * 0.01), 2),
                        "timestamp": datetime.now().isoformat(),
                        "source": "Arthera Mock Data"
                    }
                }
                
                # 广播市场数据
                await manager.broadcast(market_data)
            
            # 每2秒推送一次
            await asyncio.sleep(2)
            
        except Exception as e:
            logger.error(f"Realtime data publisher error: {e}")
            await asyncio.sleep(5)

# 添加缺失的API端点
@app.get("/api/v1/models")
async def get_models():
    """获取可用的量化模型列表"""
    return {
        "success": True,
        "data": [
            {
                "id": "alpha158",
                "name": "Alpha158 因子模型",
                "description": "基于158个Alpha因子的机器学习模型",
                "type": "factor_model",
                "status": "available",
                "last_updated": "2024-12-11"
            },
            {
                "id": "lightgbm_daily",
                "name": "LightGBM 日频模型",
                "description": "基于历史价格和技术指标的日频预测模型",
                "type": "ml_model",
                "status": "available",
                "last_updated": "2024-12-11"
            },
            {
                "id": "lstm_price",
                "name": "LSTM 价格预测",
                "description": "深度学习LSTM神经网络价格预测模型",
                "type": "deep_learning",
                "status": "training",
                "last_updated": "2024-12-10"
            }
        ]
    }

@app.get("/api/v1/datasets")
async def get_datasets():
    """获取可用的数据集列表"""
    return {
        "success": True,
        "data": [
            {
                "id": "a_share_daily",
                "name": "A股日频数据",
                "description": "A股市场日频OHLCV数据，包含前复权处理",
                "size": "150GB",
                "records": "2.5M+",
                "last_updated": "2024-12-11",
                "status": "active"
            },
            {
                "id": "a_share_minute",
                "name": "A股分钟数据",
                "description": "A股市场分钟级别高频数据",
                "size": "2.8TB",
                "records": "500M+",
                "last_updated": "2024-12-11",
                "status": "active"
            },
            {
                "id": "financial_reports",
                "name": "财务报表数据",
                "description": "上市公司财务报表和基本面数据",
                "size": "5.2GB",
                "records": "180K+",
                "last_updated": "2024-12-10",
                "status": "active"
            },
            {
                "id": "market_sentiment",
                "name": "市场情绪数据",
                "description": "新闻情绪、社交媒体情绪等替代数据",
                "size": "8.7GB",
                "records": "1.2M+",
                "last_updated": "2024-12-09",
                "status": "active"
            }
        ]
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8004,
        reload=True,
        log_level="info"
    )
