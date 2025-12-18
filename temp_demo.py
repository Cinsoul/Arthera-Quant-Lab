#!/usr/bin/env python3
"""
Arthera量化交易演示服务器
简化版本，无需Docker即可运行演示
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import random
import threading
import time
import aiohttp
import requests
import yfinance as yf
from dataclasses import dataclass
import akshare as ak
import tushare as ts
import asyncio
import logging

# FastAPI应用
app = FastAPI(
    title="Arthera量化交易演示系统",
    description="本地演示版本 - 展示量化交易能力",
    version="1.0.0-demo"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务
app.mount("/static", StaticFiles(directory="static"), name="static")

# WebSocket连接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                pass

manager = ConnectionManager()

# ==================== 真实市场数据服务 ====================

@dataclass
class MarketData:
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: int
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    timestamp: str = ""
    market: str = "US"
    data_source: str = "yahoo"
    is_real_time: bool = True

class RealMarketDataService:
    """真实市场数据服务 - 集成多个数据源"""
    
    def __init__(self):
        self.cache = {}
        self.cache_timeout = 60  # 缓存60秒
        self.tushare_token = None  # 用户配置的tushare token
        self.ts_pro = None
        
    async def get_stock_data(self, symbol: str, market: str = "US") -> MarketData:
        """获取股票实时数据"""
        cache_key = f"{symbol}_{market}"
        
        # 检查缓存
        if cache_key in self.cache:
            data, timestamp = self.cache[cache_key]
            if (datetime.now() - timestamp).seconds < self.cache_timeout:
                return data
        
        try:
            if market.upper() == "CN":
                # A股数据 - 使用新浪财经API
                data = await self._get_china_stock_data(symbol)
            else:
                # 美股等其他市场 - 使用Yahoo Finance
                data = await self._get_yahoo_finance_data(symbol)
            
            # 缓存数据
            self.cache[cache_key] = (data, datetime.now())
            return data
            
        except Exception as e:
            print(f"获取{symbol}数据失败: {e}")
            # 返回模拟数据作为fallback
            return self._generate_fallback_data(symbol)
    
    def set_tushare_token(self, token: str):
        """设置tushare token"""
        self.tushare_token = token
        if token:
            try:
                ts.set_token(token)
                self.ts_pro = ts.pro_api()
                print(f"✅ Tushare token配置成功")
            except Exception as e:
                print(f"❌ Tushare token配置失败: {e}")
                self.ts_pro = None
    
    async def _get_china_stock_data(self, symbol: str) -> MarketData:
        """获取A股数据 - 优先使用akshare和tushare"""
        try:
            # 方法1: 尝试使用akshare获取实时数据
            data = await self._get_akshare_data(symbol)
            if data:
                return data
        except Exception as e:
            print(f"AkShare获取{symbol}失败: {e}")
        
        try:
            # 方法2: 尝试使用tushare获取数据(如果有token)
            if self.ts_pro:
                data = await self._get_tushare_data(symbol)
                if data:
                    return data
        except Exception as e:
            print(f"Tushare获取{symbol}失败: {e}")
        
        try:
            # 方法3: 回退到新浪财经API
            data = await self._get_sina_data(symbol)
            if data:
                return data
        except Exception as e:
            print(f"新浪财经获取{symbol}失败: {e}")
        
        # 如果所有方法都失败，返回fallback
        return self._generate_fallback_data(symbol)
    
    async def _get_akshare_data(self, symbol: str) -> Optional[MarketData]:
        """使用akshare获取A股实时数据"""
        try:
            # 转换股票代码格式
            ak_symbol = symbol.replace('.SS', '').replace('.SZ', '')
            
            # 获取实时数据
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(None, ak.stock_zh_a_spot_em)
            
            # 查找对应股票
            stock_data = df[df['代码'] == ak_symbol]
            if not stock_data.empty:
                row = stock_data.iloc[0]
                current_price = float(row['最新价'])
                change_percent = float(row['涨跌幅'])
                change = float(row['涨跌额'])
                volume = int(float(row['成交量']))
                
                return MarketData(
                    symbol=symbol,
                    price=current_price,
                    change=change,
                    change_percent=change_percent,
                    volume=volume,
                    timestamp=datetime.now().isoformat()
                )
        except Exception as e:
            print(f"AkShare数据解析错误: {e}")
            return None
        
        return None
    
    async def _get_tushare_data(self, symbol: str) -> Optional[MarketData]:
        """使用tushare获取A股数据"""
        try:
            # 转换股票代码格式 (如 000001.SZ -> 000001.SZ)
            ts_symbol = symbol
            
            # 获取实时数据
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(
                None, 
                lambda: self.ts_pro.daily(ts_code=ts_symbol, trade_date=datetime.now().strftime('%Y%m%d'))
            )
            
            if not df.empty:
                row = df.iloc[0]
                current_price = float(row['close'])
                
                # 获取前一日数据计算涨跌
                yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y%m%d')
                df_prev = await loop.run_in_executor(
                    None,
                    lambda: self.ts_pro.daily(ts_code=ts_symbol, trade_date=yesterday)
                )
                
                if not df_prev.empty:
                    prev_close = float(df_prev.iloc[0]['close'])
                    change = current_price - prev_close
                    change_percent = (change / prev_close) * 100
                else:
                    change = float(row['change']) if 'change' in row else 0
                    change_percent = float(row['pct_chg']) if 'pct_chg' in row else 0
                
                volume = int(float(row['vol']) * 100)  # tushare单位是手，转换为股
                
                return MarketData(
                    symbol=symbol,
                    price=current_price,
                    change=change,
                    change_percent=change_percent,
                    volume=volume,
                    timestamp=datetime.now().isoformat()
                )
        except Exception as e:
            print(f"Tushare数据解析错误: {e}")
            return None
        
        return None
    
    async def _get_sina_data(self, symbol: str) -> Optional[MarketData]:
        """使用新浪财经API获取A股数据（回退方案）"""
        sina_url = f"https://hq.sinajs.cn/list={symbol}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(sina_url) as response:
                text = await response.text()
                
        if "var hq_str_" in text:
            data_str = text.split('"')[1]
            data_parts = data_str.split(',')
            
            if len(data_parts) > 10:
                current_price = float(data_parts[3])
                yesterday_close = float(data_parts[2])
                change = current_price - yesterday_close
                change_percent = (change / yesterday_close) * 100 if yesterday_close > 0 else 0
                volume = int(data_parts[8]) if data_parts[8] else 0
                
                return MarketData(
                    symbol=symbol,
                    price=current_price,
                    change=change,
                    change_percent=change_percent,
                    volume=volume,
                    timestamp=datetime.now().isoformat()
                )
        
        return None
    
    async def _get_yahoo_finance_data(self, symbol: str) -> MarketData:
        """获取Yahoo Finance数据 - 增强版"""
        try:
            loop = asyncio.get_event_loop()
            
            # 异步获取数据
            ticker = await loop.run_in_executor(None, yf.Ticker, symbol)
            hist = await loop.run_in_executor(None, lambda: ticker.history(period="2d"))
            info = await loop.run_in_executor(None, lambda: ticker.info)
            
            if len(hist) >= 1:
                current_price = hist['Close'].iloc[-1]
                if len(hist) >= 2:
                    yesterday_price = hist['Close'].iloc[-2]
                    change = current_price - yesterday_price
                    change_percent = (change / yesterday_price) * 100
                else:
                    change = 0
                    change_percent = 0
                
                volume = int(hist['Volume'].iloc[-1])
                
                # 获取更多财务信息
                market_cap = info.get('marketCap')
                pe_ratio = info.get('trailingPE')
                pb_ratio = info.get('priceToBook')
                dividend_yield = info.get('dividendYield')
                
                # 数据质量检查
                if pe_ratio and (pe_ratio < 0 or pe_ratio > 1000):
                    pe_ratio = None
                
                return MarketData(
                    symbol=symbol,
                    price=round(float(current_price), 2),
                    change=round(float(change), 2),
                    change_percent=round(float(change_percent), 2),
                    volume=volume,
                    market_cap=market_cap,
                    pe_ratio=round(float(pe_ratio), 2) if pe_ratio else None,
                    timestamp=datetime.now().isoformat(),
                    market="US",
                    data_source="yahoo",
                    is_real_time=True
                )
        except Exception as e:
            print(f"Yahoo Finance API错误 {symbol}: {e}")
        
        return self._generate_fallback_data(symbol)
    
    def _generate_fallback_data(self, symbol: str) -> MarketData:
        """生成fallback数据"""
        base_price = 150 if symbol.startswith('A') else 100
        price = base_price + random.uniform(-20, 20)
        change = random.uniform(-5, 5)
        
        return MarketData(
            symbol=symbol,
            price=round(price, 2),
            change=round(change, 2),
            change_percent=round((change / price) * 100, 2),
            volume=random.randint(100000, 10000000),
            timestamp=datetime.now().isoformat()
        )
    
    async def get_market_indices(self) -> Dict[str, MarketData]:
        """获取主要市场指数"""
        indices = {
            "上证指数": "000001.SS",
            "深证成指": "399001.SZ", 
            "创业板指": "399006.SZ",
            "恒生指数": "^HSI",
            "纳斯达克": "^IXIC",
            "标普500": "^GSPC",
            "道琼斯": "^DJI"
        }
        
        results = {}
        for name, symbol in indices.items():
            try:
                market = "CN" if symbol.endswith(('.SS', '.SZ')) else "US"
                data = await self.get_stock_data(symbol, market)
                results[name] = data
            except:
                continue
        
        return results
    
    async def get_popular_a_stocks(self) -> List[Dict]:
        """获取热门A股列表"""
        try:
            loop = asyncio.get_event_loop()
            # 使用akshare获取热门股票
            df = await loop.run_in_executor(None, ak.stock_zh_a_spot_em)
            
            # 取前20只活跃股票
            popular_stocks = []
            for _, row in df.head(20).iterrows():
                symbol_suffix = ".SS" if row['代码'].startswith(('60', '68')) else ".SZ"
                popular_stocks.append({
                    "symbol": row['代码'] + symbol_suffix,
                    "name": row['名称'],
                    "price": float(row['最新价']),
                    "change_percent": float(row['涨跌幅'])
                })
            return popular_stocks
        except Exception as e:
            print(f"获取热门A股失败: {e}")
            # 返回默认列表
            return [
                {"symbol": "600519.SS", "name": "贵州茅台", "price": 1680.0, "change_percent": 1.2},
                {"symbol": "000858.SZ", "name": "五粮液", "price": 128.5, "change_percent": 2.1},
                {"symbol": "000001.SZ", "name": "平安银行", "price": 12.8, "change_percent": -0.5}
            ]
    
    async def search_stocks(self, query: str, market: str = "ALL") -> List[Dict]:
        """搜索股票"""
        # 简化的股票搜索功能
        stock_db = {
            "AAPL": {"name": "苹果公司", "market": "US"},
            "TSLA": {"name": "特斯拉", "market": "US"},
            "NVDA": {"name": "英伟达", "market": "US"},
            "MSFT": {"name": "微软", "market": "US"},
            "GOOGL": {"name": "谷歌", "market": "US"},
            "000001.SZ": {"name": "平安银行", "market": "CN"},
            "000002.SZ": {"name": "万科A", "market": "CN"},
            "600036.SS": {"name": "招商银行", "market": "CN"},
            "600519.SS": {"name": "贵州茅台", "market": "CN"},
            "000858.SZ": {"name": "五粮液", "market": "CN"},
        }
        
        results = []
        query_lower = query.lower()
        
        for symbol, info in stock_db.items():
            if (query_lower in symbol.lower() or 
                query_lower in info["name"] or
                (market != "ALL" and info["market"] != market)):
                results.append({
                    "symbol": symbol,
                    "name": info["name"],
                    "market": info["market"]
                })
        
        return results[:10]  # 返回最多10个结果

# 创建全局市场数据服务实例
market_data_service = RealMarketDataService()

# 全局状态
class SystemState:
    def __init__(self):
        self.trading_active = True
        self.strategies_running = 8
        self.signals_today = 0
        self.orders_today = 0
        self.total_volume = 0
        self.success_rate = 85.0
        self.active_positions = {}
        self.recent_signals = []
        self.recent_orders = []
        
    def update_stats(self):
        """更新实时统计数据"""
        self.signals_today += random.randint(1, 5)
        self.orders_today += random.randint(1, 3)
        self.total_volume += random.randint(10000, 100000)
        self.success_rate = max(75.0, min(95.0, self.success_rate + random.uniform(-1, 1)))

system_state = SystemState()

# 模型定义
class SignalRequest(BaseModel):
    symbols: List[str]
    timeframe: Optional[str] = "1D"
    strategy_config: Optional[Dict] = None

class OrderRequest(BaseModel):
    symbol: str
    side: str  # "BUY" or "SELL"
    quantity: float
    order_type: str = "MARKET"
    price: Optional[float] = None

class ConfigRequest(BaseModel):
    tushare_token: Optional[str] = None
    data_source: Optional[str] = "akshare"  # "akshare", "tushare", "sina"

class AIConfigRequest(BaseModel):
    api_key: str
    model: str = "deepseek-v2.5"
    temperature: float = 0.3
    max_tokens: int = 1000

class AITestRequest(BaseModel):
    api_key: str
    model: str = "deepseek-v2.5"

# ==================== 配置管理 ====================

@app.post("/config/data-source")
async def configure_data_source(config: ConfigRequest):
    """配置数据源设置"""
    try:
        if config.tushare_token:
            market_data_service.set_tushare_token(config.tushare_token)
            
        return {
            "status": "success",
            "message": "数据源配置成功",
            "config": {
                "tushare_enabled": bool(market_data_service.ts_pro),
                "data_source": config.data_source
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"配置失败: {str(e)}")

@app.get("/config/data-source")
async def get_data_source_config():
    """获取当前数据源配置"""
    return {
        "tushare_enabled": bool(market_data_service.ts_pro),
        "tushare_token_configured": bool(market_data_service.tushare_token),
        "available_sources": ["akshare", "tushare", "sina"],
        "current_source": "multi" if market_data_service.ts_pro else "akshare+sina"
    }

# ==================== AI配置管理 ====================

@app.post("/api/ai/test-connection")
async def test_ai_connection(request: AITestRequest):
    """测试DeepSeek API连接"""
    try:
        # 模拟API连接测试
        # 在实际环境中，这里应该真实调用DeepSeek API
        
        # 检查API密钥格式是否合理
        if len(request.api_key) < 10:
            return {
                "success": False,
                "message": "API密钥格式不正确，长度过短"
            }
        
        if not request.api_key.startswith(('sk-', 'sk_')):
            return {
                "success": False, 
                "message": "API密钥格式不正确，应以 'sk-' 开头"
            }
        
        # 模拟网络延迟
        await asyncio.sleep(1)
        
        # 模拟成功响应
        return {
            "success": True,
            "message": f"成功连接到 {request.model}",
            "model": request.model,
            "status": "connected",
            "latency_ms": random.randint(100, 500)
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"连接失败: {str(e)}"
        }

@app.post("/api/ai/configure")
async def configure_ai_model(request: AIConfigRequest):
    """配置AI模型设置"""
    try:
        # 在实际应用中，这里会保存配置到数据库或配置文件
        # 目前我们只是验证配置并返回成功状态
        
        ai_config = {
            "model": request.model,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "configured_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        return {
            "status": "success",
            "message": "AI模型配置成功",
            "config": ai_config
        }
        
    except Exception as e:
        return {
            "status": "error", 
            "message": f"配置失败: {str(e)}"
        }

@app.get("/api/ai/status")
async def get_ai_status():
    """获取AI服务状态"""
    return {
        "status": "active",
        "available_models": [
            {"id": "deepseek-chat", "name": "DeepSeek Chat", "description": "通用对话模型"},
            {"id": "deepseek-coder", "name": "DeepSeek Coder", "description": "代码生成模型"},
            {"id": "deepseek-v2.5", "name": "DeepSeek V2.5", "description": "推荐使用的均衡模型"},
            {"id": "deepseek-v3", "name": "DeepSeek V3", "description": "最新版本，性能最强"}
        ],
        "current_model": "deepseek-v2.5",
        "signals_generated_today": random.randint(50, 200),
        "last_signal_time": datetime.now().isoformat(),
        "api_calls_today": random.randint(100, 500),
        "success_rate": round(random.uniform(0.85, 0.98), 3)
    }

@app.post("/api/ai/generate-signal")
async def generate_ai_signal(request: dict):
    """使用AI模型生成智能交易信号"""
    try:
        symbol = request.get("symbol", "AAPL")
        strategy = request.get("strategy", "momentum")
        
        # 模拟AI信号生成过程
        await asyncio.sleep(random.uniform(0.5, 2.0))  # 模拟AI处理时间
        
        # 生成智能信号
        signal_strength = random.uniform(0.6, 0.95)
        price_target = random.uniform(100, 200)
        
        ai_signal = {
            "symbol": symbol,
            "timestamp": datetime.now().isoformat(),
            "action": random.choice(["BUY", "SELL", "HOLD"]),
            "confidence": round(signal_strength, 3),
            "price_target": round(price_target, 2),
            "strategy": strategy,
            "reasoning": f"基于AI模型分析，{symbol}显示{random.choice(['强劲上涨', '谨慎看跌', '横盘整理'])}趋势",
            "risk_score": round(random.uniform(0.1, 0.4), 3),
            "time_horizon": random.choice(["1D", "3D", "1W", "2W"]),
            "model_used": "deepseek-v2.5",
            "analysis_factors": [
                "技术指标分析",
                "基本面评估", 
                "市场情绪分析",
                "量价关系研判"
            ]
        }
        
        return {
            "success": True,
            "signal": ai_signal,
            "processing_time_ms": random.randint(500, 2000)
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"AI信号生成失败: {str(e)}"
        }

# ==================== 健康检查 ====================

@app.get("/health")
async def health_check():
    """系统健康检查"""
    return {
        "status": "healthy",
        "service": "arthera-demo",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0-demo",
        "uptime": "运行中",
        "services": {
            "api_gateway": True,
            "signal_generator": True,
            "portfolio_manager": True,
            "risk_engine": True
        }
    }

# ==================== 仪表板 ====================

@app.get("/dashboard/system-status")
async def get_system_status():
    """系统运行状态"""
    return {
        "trading_active": system_state.trading_active,
        "strategies_running": system_state.strategies_running,
        "signals_today": system_state.signals_today,
        "orders_today": system_state.orders_today,
        "total_volume": system_state.total_volume,
        "success_rate": round(system_state.success_rate, 2),
        "uptime": "99.8%",
        "last_updated": datetime.now().isoformat(),
        "system_load": {
            "cpu_percent": random.uniform(5, 15),
            "memory_percent": random.uniform(20, 40),
            "disk_usage": random.uniform(30, 50)
        }
    }

@app.get("/dashboard/trading-stats")
async def get_trading_stats():
    """详细交易统计"""
    return {
        "daily_stats": {
            "orders_generated": system_state.signals_today,
            "trades_executed": system_state.orders_today,
            "total_volume": system_state.total_volume,
            "success_rate": round(system_state.success_rate, 2),
            "avg_slippage": round(random.uniform(0.001, 0.003), 4),
            "strategies_active": system_state.strategies_running
        },
        "performance": {
            "sharpe_ratio": round(random.uniform(1.8, 2.5), 2),
            "max_drawdown": round(random.uniform(-0.05, -0.12), 3),
            "win_rate": round(random.uniform(0.60, 0.75), 3),
            "profit_factor": round(random.uniform(1.5, 2.2), 2),
            "annual_return": round(random.uniform(0.08, 0.18), 3)
        },
        "risk_metrics": {
            "var_95": round(random.uniform(-0.03, -0.06), 3),
            "volatility": round(random.uniform(0.15, 0.25), 3),
            "beta": round(random.uniform(0.8, 1.2), 2),
            "alpha": round(random.uniform(0.02, 0.08), 3)
        },
        "timestamp": datetime.now().isoformat()
    }

# ==================== 信号生成 ====================

@app.post("/signals/generate")
async def generate_signals(request: SignalRequest):
    """生成交易信号 - 基于真实市场数据"""
    signals = []
    
    for symbol in request.symbols:
        # 获取真实市场数据
        market = "CN" if any(x in symbol for x in ['.SS', '.SZ', 'SH', 'SZ']) else "US"
        market_data = await market_data_service.get_stock_data(symbol, market)
        
        # 基于真实数据生成信号
        price_momentum = market_data.change_percent / 100
        volatility_factor = abs(price_momentum) * 2
        volume_factor = min(market_data.volume / 1000000, 2.0)  # 标准化交易量
        
        # AI策略决策逻辑
        if price_momentum > 0.02 and volatility_factor < 0.5:
            action = "BUY"
            confidence = 0.75 + random.uniform(0, 0.2)
        elif price_momentum < -0.02 and volatility_factor < 0.3:
            action = "SELL" 
            confidence = 0.70 + random.uniform(0, 0.25)
        else:
            action = "HOLD"
            confidence = 0.60 + random.uniform(0, 0.15)
        
        # 价格目标计算
        if action == "BUY":
            price_target = market_data.price * (1 + random.uniform(0.05, 0.15))
        elif action == "SELL":
            price_target = market_data.price * (1 - random.uniform(0.05, 0.12))
        else:
            price_target = market_data.price * (1 + random.uniform(-0.03, 0.03))
        
        signal = {
            "symbol": symbol,
            "action": action,
            "confidence": round(confidence, 3),
            "expected_return": round(price_momentum + random.uniform(-0.02, 0.02), 4),
            "risk_score": round(volatility_factor, 2),
            "price_target": round(price_target, 2),
            "current_price": market_data.price,
            "price_change": market_data.change,
            "price_change_percent": market_data.change_percent,
            "volume": market_data.volume,
            "time_horizon": request.timeframe or "1D",
            "strategy": random.choice([
                "DeepSeek Alpha", 
                "Bayesian Momentum", 
                "Kelly Optimizer",
                "Risk Parity",
                "Mean Reversion"
            ]),
            "timestamp": datetime.now().isoformat(),
            "features": {
                "momentum": round(price_momentum, 3),
                "volatility": round(volatility_factor, 3),
                "volume_ratio": round(volume_factor, 2),
                "technical_score": round(min(confidence * 100, 95), 1)
            },
            "market_data": {
                "price": market_data.price,
                "change": market_data.change,
                "change_percent": market_data.change_percent,
                "volume": market_data.volume,
                "market_cap": market_data.market_cap,
                "pe_ratio": market_data.pe_ratio
            }
        }
        signals.append(signal)
    
    # 更新统计
    system_state.signals_today += len(signals)
    system_state.recent_signals.extend(signals)
    if len(system_state.recent_signals) > 50:
        system_state.recent_signals = system_state.recent_signals[-50:]
    
    # 广播新信号到WebSocket客户端
    asyncio.create_task(manager.broadcast({
        "type": "new_signals",
        "data": signals,
        "timestamp": datetime.now().isoformat()
    }))
    
    return {
        "signals": signals,
        "total_count": len(signals),
        "timestamp": datetime.now().isoformat(),
        "strategy_summary": {
            "active_strategies": system_state.strategies_running,
            "signal_strength": "STRONG" if len([s for s in signals if s["confidence"] > 0.8]) > 0 else "MODERATE"
        }
    }

@app.get("/signals/recent")
async def get_recent_signals(limit: int = 20):
    """获取最近信号"""
    recent = system_state.recent_signals[-limit:] if system_state.recent_signals else []
    return {
        "signals": recent,
        "count": len(recent),
        "last_updated": datetime.now().isoformat()
    }

# ==================== 策略管理 ====================

@app.get("/strategies/list")
async def list_strategies():
    """策略列表"""
    strategies = [
        {
            "id": "deepseek_alpha",
            "name": "DeepSeek Alpha",
            "status": "ACTIVE",
            "daily_return": round(random.uniform(-0.02, 0.05), 4),
            "sharpe_ratio": round(random.uniform(1.2, 2.8), 2),
            "positions": random.randint(5, 15),
            "last_signal": (datetime.now() - timedelta(minutes=random.randint(1, 30))).isoformat()
        },
        {
            "id": "bayesian_momentum",
            "name": "Bayesian Momentum",
            "status": "ACTIVE",
            "daily_return": round(random.uniform(-0.01, 0.03), 4),
            "sharpe_ratio": round(random.uniform(1.0, 2.2), 2),
            "positions": random.randint(3, 12),
            "last_signal": (datetime.now() - timedelta(minutes=random.randint(1, 45))).isoformat()
        },
        {
            "id": "kelly_optimizer",
            "name": "Kelly Portfolio Optimizer",
            "status": "ACTIVE",
            "daily_return": round(random.uniform(-0.015, 0.04), 4),
            "sharpe_ratio": round(random.uniform(1.5, 2.5), 2),
            "positions": random.randint(8, 20),
            "last_signal": (datetime.now() - timedelta(minutes=random.randint(1, 20))).isoformat()
        },
        {
            "id": "risk_parity",
            "name": "Risk Parity",
            "status": "ACTIVE",
            "daily_return": round(random.uniform(-0.005, 0.025), 4),
            "sharpe_ratio": round(random.uniform(1.1, 1.9), 2),
            "positions": random.randint(10, 25),
            "last_signal": (datetime.now() - timedelta(minutes=random.randint(1, 60))).isoformat()
        }
    ]
    
    return {
        "strategies": strategies,
        "total_active": len([s for s in strategies if s["status"] == "ACTIVE"]),
        "total_positions": sum(s["positions"] for s in strategies),
        "avg_sharpe": round(sum(s["sharpe_ratio"] for s in strategies) / len(strategies), 2)
    }

# ==================== 订单管理 ====================

@app.post("/orders/submit")
async def submit_order(order: OrderRequest):
    """提交模拟订单"""
    order_id = f"ORD_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}"
    
    # 模拟订单执行
    fill_price = order.price if order.price else round(random.uniform(100, 300), 2)
    slippage = random.uniform(0.001, 0.005)
    
    if order.side == "BUY":
        fill_price *= (1 + slippage)
    else:
        fill_price *= (1 - slippage)
    
    execution = {
        "order_id": order_id,
        "symbol": order.symbol,
        "side": order.side,
        "quantity": order.quantity,
        "order_type": order.order_type,
        "status": "FILLED",
        "fill_price": round(fill_price, 2),
        "fill_quantity": order.quantity,
        "fill_time": datetime.now().isoformat(),
        "commission": round(max(1.0, order.quantity * fill_price * 0.001), 2),
        "slippage": round(slippage * 100, 3),
        "execution_venue": "DEMO_EXCHANGE"
    }
    
    # 更新统计
    system_state.orders_today += 1
    system_state.total_volume += int(order.quantity * fill_price)
    system_state.recent_orders.append(execution)
    if len(system_state.recent_orders) > 100:
        system_state.recent_orders = system_state.recent_orders[-100:]
    
    # 广播新订单到WebSocket客户端
    asyncio.create_task(manager.broadcast({
        "type": "new_order",
        "data": execution,
        "timestamp": datetime.now().isoformat()
    }))
    
    return execution

@app.get("/orders/history")
async def get_order_history(limit: int = 50):
    """订单历史"""
    recent = system_state.recent_orders[-limit:] if system_state.recent_orders else []
    
    return {
        "orders": recent,
        "count": len(recent),
        "total_volume_today": system_state.total_volume,
        "avg_fill_time_ms": round(random.uniform(50, 200), 1),
        "last_updated": datetime.now().isoformat()
    }

# ==================== 真实市场数据API ====================

@app.get("/market-data/stock/{symbol}")
async def get_stock_realtime_data(symbol: str, market: str = "US"):
    """获取股票实时数据"""
    try:
        data = await market_data_service.get_stock_data(symbol, market)
        return {
            "symbol": data.symbol,
            "price": data.price,
            "change": data.change,
            "change_percent": data.change_percent,
            "volume": data.volume,
            "market_cap": data.market_cap,
            "pe_ratio": data.pe_ratio,
            "timestamp": data.timestamp,
            "market": data.market,
            "data_source": data.data_source,
            "is_real_time": data.is_real_time,
            "metadata": {
                "data_quality": "high" if data.is_real_time else "simulated",
                "source_reliability": "verified" if data.data_source in ["yahoo", "tushare"] else "fallback",
                "last_updated": data.timestamp
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取{symbol}数据失败: {str(e)}")

@app.get("/market-data/indices")
async def get_market_indices():
    """获取主要市场指数"""
    try:
        indices = await market_data_service.get_market_indices()
        return {
            "indices": {
                name: {
                    "symbol": data.symbol,
                    "price": data.price,
                    "change": data.change,
                    "change_percent": data.change_percent,
                    "timestamp": data.timestamp
                } for name, data in indices.items()
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取指数数据失败: {str(e)}")

@app.get("/market-data/search/{query}")
async def search_stocks(query: str, market: str = "ALL"):
    """搜索股票"""
    try:
        results = await market_data_service.search_stocks(query, market)
        return {
            "query": query,
            "results": results,
            "count": len(results),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"股票搜索失败: {str(e)}")

@app.get("/market-data/popular")
async def get_popular_stocks():
    """获取热门股票数据"""
    popular_stocks = {
        "US": ["AAPL", "TSLA", "NVDA", "MSFT", "GOOGL", "AMZN", "META"],
        "CN": ["600519.SS", "000858.SZ", "600036.SS", "000001.SZ", "000002.SZ"]
    }
    
    results = {"US": [], "CN": []}
    
    try:
        # 获取美股数据
        for symbol in popular_stocks["US"]:
            data = await market_data_service.get_stock_data(symbol, "US")
            results["US"].append({
                "symbol": data.symbol,
                "price": data.price,
                "change": data.change,
                "change_percent": data.change_percent,
                "volume": data.volume,
                "market_cap": data.market_cap
            })
        
        # 获取A股数据
        for symbol in popular_stocks["CN"]:
            data = await market_data_service.get_stock_data(symbol, "CN")
            results["CN"].append({
                "symbol": data.symbol,
                "price": data.price,
                "change": data.change,
                "change_percent": data.change_percent,
                "volume": data.volume
            })
            
        return {
            "popular_stocks": results,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取热门股票失败: {str(e)}")

@app.get("/market-data/portfolio-summary")
async def get_enhanced_portfolio_summary():
    """增强版投资组合摘要 - 基于真实数据"""
    try:
        # 获取组合中股票的真实数据
        portfolio_symbols = ["AAPL", "TSLA", "NVDA", "600519.SS", "000858.SZ"]
        positions = []
        total_value = 0
        total_pnl = 0
        
        for symbol in portfolio_symbols:
            market = "CN" if any(x in symbol for x in ['.SS', '.SZ']) else "US"
            data = await market_data_service.get_stock_data(symbol, market)
            
            quantity = random.randint(50, 200)
            avg_price = data.price * (1 + random.uniform(-0.1, 0.05))  # 模拟买入价
            current_value = data.price * quantity
            unrealized_pnl = (data.price - avg_price) * quantity
            
            positions.append({
                "symbol": symbol,
                "name": symbol,  # 可以从stock_db获取中文名
                "quantity": quantity,
                "avg_price": round(avg_price, 2),
                "current_price": data.price,
                "current_value": round(current_value, 2),
                "unrealized_pnl": round(unrealized_pnl, 2),
                "change_percent": data.change_percent,
                "market": market,
                "weight": 0  # 稍后计算
            })
            
            total_value += current_value
            total_pnl += unrealized_pnl
        
        # 计算权重
        for position in positions:
            position["weight"] = round(position["current_value"] / total_value, 3)
        
        cash = random.uniform(10000, 50000)
        total_equity = total_value + cash
        
        return {
            "total_value": round(total_value, 2),
            "cash": round(cash, 2),
            "total_equity": round(total_equity, 2),
            "unrealized_pnl": round(total_pnl, 2),
            "realized_pnl_today": round(random.uniform(-200, 800), 2),
            "day_change_percent": round((total_pnl / total_value) * 100, 2),
            "positions": positions,
            "position_count": len(positions),
            "diversification_score": round(random.uniform(0.7, 0.9), 2),
            "market_exposure": {
                "US_market": round(sum(p["current_value"] for p in positions if p["market"] == "US") / total_value, 2),
                "CN_market": round(sum(p["current_value"] for p in positions if p["market"] == "CN") / total_value, 2)
            },
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取组合数据失败: {str(e)}")

# ==================== 投资组合 ====================

@app.get("/portfolio/summary")
async def get_portfolio_summary():
    """投资组合摘要"""
    positions = [
        {
            "symbol": "AAPL",
            "quantity": random.randint(50, 200),
            "avg_price": round(random.uniform(140, 160), 2),
            "current_price": round(random.uniform(145, 165), 2),
            "unrealized_pnl": round(random.uniform(-500, 1500), 2),
            "weight": round(random.uniform(0.15, 0.25), 3)
        },
        {
            "symbol": "TSLA",
            "quantity": random.randint(20, 100),
            "avg_price": round(random.uniform(200, 250), 2),
            "current_price": round(random.uniform(210, 260), 2),
            "unrealized_pnl": round(random.uniform(-800, 2000), 2),
            "weight": round(random.uniform(0.10, 0.20), 3)
        },
        {
            "symbol": "NVDA",
            "quantity": random.randint(10, 50),
            "avg_price": round(random.uniform(400, 500), 2),
            "current_price": round(random.uniform(420, 520), 2),
            "unrealized_pnl": round(random.uniform(-1000, 3000), 2),
            "weight": round(random.uniform(0.08, 0.18), 3)
        }
    ]
    
    total_value = sum(pos["quantity"] * pos["current_price"] for pos in positions)
    total_pnl = sum(pos["unrealized_pnl"] for pos in positions)
    
    return {
        "total_value": round(total_value, 2),
        "cash": round(random.uniform(10000, 50000), 2),
        "total_equity": round(total_value + random.uniform(10000, 50000), 2),
        "unrealized_pnl": round(total_pnl, 2),
        "realized_pnl_today": round(random.uniform(-200, 800), 2),
        "day_change_percent": round(random.uniform(-2, 5), 2),
        "positions": positions,
        "position_count": len(positions),
        "diversification_score": round(random.uniform(0.7, 0.9), 2),
        "last_updated": datetime.now().isoformat()
    }

# ==================== iOS专用端点 ====================

@app.post("/ios/signals/deepseek/generate")
async def ios_generate_deepseek_signal(request: dict):
    """iOS DeepSeek信号生成"""
    symbol = request.get("symbol", "AAPL")
    
    result = {
        "win_probability": round(random.uniform(0.55, 0.85), 3),
        "confidence_level": round(random.uniform(0.7, 0.95), 3),
        "expected_return": round(random.uniform(-0.05, 0.08), 4),
        "return_distribution": {
            "mean": round(random.uniform(-0.02, 0.05), 4),
            "variance": round(random.uniform(0.0005, 0.002), 6),
            "skewness": round(random.uniform(-0.5, 0.5), 3),
            "kurtosis": round(random.uniform(2.5, 4.0), 2)
        },
        "market_regime": random.choice(["bull", "bear", "ranging", "high_volatility"]),
        "regime_confidence": round(random.uniform(0.6, 0.9), 3),
        "feature_importance": {
            "momentum": round(random.uniform(0.1, 0.4), 3),
            "volatility": round(random.uniform(0.1, 0.3), 3),
            "volume": round(random.uniform(0.05, 0.2), 3),
            "sentiment": round(random.uniform(0.05, 0.25), 3)
        },
        "risk_metrics": {
            "value_at_risk_95": round(random.uniform(-0.08, -0.03), 4),
            "conditional_var_95": round(random.uniform(-0.12, -0.05), 4),
            "max_drawdown": round(random.uniform(-0.20, -0.10), 4),
            "volatility": round(random.uniform(0.15, 0.35), 3)
        },
        "trading_recommendation": {
            "action": random.choice(["BUY", "SELL", "HOLD"]),
            "position_size": round(random.uniform(0.02, 0.08), 3),
            "confidence": round(random.uniform(0.6, 0.9), 3),
            "time_horizon": "1D"
        },
        "model_version": "deepseek-v2.5",
        "analysis_timestamp": datetime.now().isoformat(),
        "data_quality": round(random.uniform(0.85, 0.98), 3),
        "calibrated": True
    }
    
    system_state.signals_today += 1
    return result

@app.post("/ios/bayesian/update-posterior")
async def ios_update_bayesian_posterior(request: dict):
    """iOS Bayesian后验更新"""
    symbol = request.get("symbol", "AAPL")
    prior_mean = request.get("prior_mean", 0.02)
    prior_variance = request.get("prior_variance", 0.001)
    
    # 模拟Bayesian更新
    posterior_mean = prior_mean * random.uniform(0.8, 1.2)
    posterior_variance = prior_variance * random.uniform(0.7, 0.95)
    
    return {
        "id": f"bayesian_{symbol}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "symbol": symbol,
        "timestamp": datetime.now().isoformat(),
        "posterior_mean": round(posterior_mean, 6),
        "posterior_variance": round(posterior_variance, 8),
        "posterior_std_dev": round(posterior_variance ** 0.5, 6),
        "posterior_quantiles": {
            "0.05": round(posterior_mean - 1.645 * (posterior_variance ** 0.5), 6),
            "0.25": round(posterior_mean - 0.674 * (posterior_variance ** 0.5), 6),
            "0.50": round(posterior_mean, 6),
            "0.75": round(posterior_mean + 0.674 * (posterior_variance ** 0.5), 6),
            "0.95": round(posterior_mean + 1.645 * (posterior_variance ** 0.5), 6)
        },
        "credible_interval_95": {
            "lower": round(posterior_mean - 1.96 * (posterior_variance ** 0.5), 6),
            "upper": round(posterior_mean + 1.96 * (posterior_variance ** 0.5), 6),
            "probability": 0.95
        },
        "regime_probabilities": {
            "bull": round(random.uniform(0.4, 0.7), 3),
            "bear": round(random.uniform(0.05, 0.2), 3),
            "ranging": round(random.uniform(0.1, 0.3), 3),
            "high_volatility": round(random.uniform(0.02, 0.1), 3)
        },
        "update_count": random.randint(1, 10),
        "effective_sample_size": round(random.uniform(5, 20), 1)
    }

# ==================== WebSocket实时推送 ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket实时数据推送"""
    await manager.connect(websocket)
    try:
        # 发送欢迎消息
        await websocket.send_text(json.dumps({
            "type": "welcome",
            "message": "连接到Arthera量化交易系统",
            "timestamp": datetime.now().isoformat()
        }))
        
        while True:
            # 等待客户端消息
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }))
            elif message.get("type") == "subscribe":
                await websocket.send_text(json.dumps({
                    "type": "subscribed",
                    "channels": message.get("channels", []),
                    "timestamp": datetime.now().isoformat()
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ==================== 主界面和API路由 ====================

from fastapi.responses import HTMLResponse

@app.get("/", response_class=HTMLResponse)
async def main_dashboard():
    """主界面 - 投资者演示Dashboard"""
    try:
        # 尝试多个可能的路径
        paths = ["index.html", "static/index.html", "./index.html"]
        for path in paths:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return f.read()
            except FileNotFoundError:
                continue
        raise FileNotFoundError("index.html not found in any expected location")
    except FileNotFoundError:
        return HTMLResponse("""
        <html>
            <head><title>Arthera量化交易系统</title></head>
            <body>
                <h1>Arthera量化交易演示系统</h1>
                <p>主界面文件未找到，请访问 <a href="/docs">API文档</a></p>
                <p>或访问以下端点：</p>
                <ul>
                    <li><a href="/dashboard/system-status">系统状态</a></li>
                    <li><a href="/dashboard/trading-stats">交易统计</a></li>
                    <li><a href="/health">健康检查</a></li>
                </ul>
            </body>
        </html>
        """)

@app.get("/{filename}")
async def serve_html_files(filename: str):
    """服务HTML文件"""
    if filename.endswith('.html'):
        try:
            with open(filename, "r", encoding="utf-8") as f:
                return HTMLResponse(f.read())
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail=f"文件 {filename} 未找到")
    else:
        raise HTTPException(status_code=404, detail="只支持HTML文件")

@app.get("/api")
async def api_info():
    """API信息"""
    return {
        "service": "Arthera量化交易演示系统",
        "version": "1.0.0-demo",
        "status": "运行中",
        "description": "本地演示版本，展示量化交易系统完整功能",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/health",
            "dashboard": "/dashboard/*",
            "signals": "/signals/*",
            "strategies": "/strategies/*",
            "orders": "/orders/*",
            "portfolio": "/portfolio/*",
            "ios": "/ios/*",
            "websocket": "/ws"
        },
        "demo_features": [
            "实时信号生成",
            "策略执行模拟", 
            "订单管理系统",
            "投资组合分析",
            "风险控制",
            "iOS集成支持",
            "Web界面Dashboard",
            "WebSocket实时推送"
        ]
    }

# ==================== 后台任务 ====================

def background_updater():
    """后台更新任务"""
    while True:
        time.sleep(5)  # 每5秒更新一次
        old_volume = system_state.total_volume
        old_signals = system_state.signals_today
        
        system_state.update_stats()
        
        # 广播更新到WebSocket客户端
        asyncio.run(broadcast_system_update(old_volume, old_signals))

async def broadcast_system_update(old_volume, old_signals):
    """向所有WebSocket客户端广播系统更新"""
    update_data = {
        "type": "system_update",
        "data": {
            "trading_active": system_state.trading_active,
            "strategies_running": system_state.strategies_running,
            "signals_today": system_state.signals_today,
            "orders_today": system_state.orders_today,
            "total_volume": system_state.total_volume,
            "success_rate": round(system_state.success_rate, 2),
            "volume_change": system_state.total_volume - old_volume,
            "new_signals": system_state.signals_today - old_signals
        },
        "timestamp": datetime.now().isoformat()
    }
    
    await manager.broadcast(update_data)

# 启动后台任务
threading.Thread(target=background_updater, daemon=True).start()

# ==================== 启动服务器 ====================

if __name__ == "__main__":
    print("🚀 启动Arthera量化交易演示系统...")
    print("=" * 50)
    print("📊 服务访问地址:")
    print("  • 主页:           http://localhost:8000")
    print("  • 系统状态:       http://localhost:8000/dashboard/system-status")
    print("  • 交易统计:       http://localhost:8000/dashboard/trading-stats")
    print("  • API文档:        http://localhost:8000/docs")
    print("=" * 50)
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8001,
        log_level="info"
    )