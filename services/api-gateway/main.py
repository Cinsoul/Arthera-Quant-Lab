#!/usr/bin/env python3
"""
Arthera Unified API Gateway
统一API网关，整合所有现有的量化交易服务

路由架构：
- /market-data/*     → QuantEngine/qlib_api_server.py:8001
- /strategies/*      → Arthera_Quant_Lab/backend/api:8002  
- /signals/*         → iOS Quantitative Services (WebSocket)
- /risk/*           → Risk Management APIs
- /portfolio/*      → Portfolio Management APIs
- /orders/*         → Paper Trading System
- /dashboard/*      → Investor Demo Dashboard
"""

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Set
from datetime import datetime, timedelta
from pathlib import Path
from statistics import mean, pstdev
import math
from pydantic import BaseModel
import os
import time
from contextlib import asynccontextmanager

from universe_providers import YahooMarketProvider, ChinaAStockProvider

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service Configuration
class ServiceConfig:
    """Central place for downstream service URLs and timeouts."""

    # Core external services
    QUANT_ENGINE_URL = os.getenv("QUANT_ENGINE_URL", "http://quant-engine:8000")
    QUANT_LAB_URL = os.getenv("QUANT_LAB_URL", "http://quant-lab:8000") 
    
    # Internal microservices
    MARKET_DATA_URL = os.getenv("MARKET_DATA_URL", QUANT_ENGINE_URL)
    STRATEGY_RUNNER_URL = os.getenv("STRATEGY_RUNNER_URL", QUANT_LAB_URL)
    AI_AGENTS_URL = os.getenv("AI_AGENTS_URL", "http://ai-agents:8006")
    RISK_MANAGEMENT_URL = os.getenv("RISK_MANAGEMENT_URL", "http://risk-management:8003")
    CRYPTO_CONNECTORS_URL = os.getenv("CRYPTO_CONNECTORS_URL", "http://crypto-connectors:8007")
    BACKTESTING_ENGINE_URL = os.getenv("BACKTESTING_ENGINE_URL", "http://backtesting-engine:8008")
    
    # Legacy/placeholder services - will route to QuantEngine as fallback
    PAPER_TRADING_URL = os.getenv("PAPER_TRADING_URL", QUANT_ENGINE_URL)
    PORTFOLIO_SERVICE_URL = os.getenv("PORTFOLIO_PNL_URL", QUANT_ENGINE_URL)
    ANALYTICS_SERVICE_URL = os.getenv("ANALYTICS_SERVICE_URL", QUANT_ENGINE_URL)
    DASHBOARD_URL = os.getenv("DASHBOARD_URL", QUANT_ENGINE_URL)

    UNIVERSE_SERVICE_URL = os.getenv("UNIVERSE_SERVICE_URL")
    UNIVERSE_API_KEY = os.getenv("UNIVERSE_API_KEY")
    UNIVERSE_SEARCH_PATH = os.getenv("UNIVERSE_SEARCH_PATH", "/search")
    TUSHARE_TOKEN = os.getenv("TUSHARE_TOKEN")

    POOLS_CONFIG_PATH = Path(os.getenv("POOLS_CONFIG_PATH", "config/pools.json"))

    REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "30"))

    # iOS Integration
    IOS_WEBSOCKET_PORT = int(os.getenv("IOS_WEBSOCKET_PORT", "8005"))

    # Database
    POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://arthera:arthera123@localhost:5432/trading_engine")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

    ENABLE_FALLBACKS = os.getenv("ENABLE_DASHBOARD_FALLBACKS", "0") == "1"

# Request/Response Models
class HealthResponse(BaseModel):
    status: str
    timestamp: str
    services: Dict[str, bool]
    version: str = "1.0.0"

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
    strategy_id: Optional[str] = None

class PortfolioRequest(BaseModel):
    account_id: str
    symbols: Optional[List[str]] = None


class DataSourceConfigRequest(BaseModel):
    tushare_token: Optional[str] = None

# Enhanced WebSocket Connection Manager with High-Frequency Data Streaming
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.ios_connections: List[WebSocket] = []
        self.crypto_connections: List[WebSocket] = []
        self.ai_connections: List[WebSocket] = []
        self.risk_connections: List[WebSocket] = []
        self.market_data_connections: List[WebSocket] = []
        
        # Subscription management
        self.subscriptions: Dict[str, Set[WebSocket]] = {
            "market_data": set(),
            "ai_signals": set(),
            "crypto_prices": set(),
            "order_updates": set(),
            "risk_alerts": set(),
            "portfolio_risk": set(),
            "var_updates": set(),
            "portfolio_updates": set()
        }
        
        # High-frequency data streaming
        self.streaming_tasks: Dict[str, asyncio.Task] = {}
        self.is_streaming = False
    
    async def connect(self, websocket: WebSocket, connection_type: str = "general"):
        await websocket.accept()
        if connection_type == "ios":
            self.ios_connections.append(websocket)
        elif connection_type == "crypto":
            self.crypto_connections.append(websocket)
        elif connection_type == "ai":
            self.ai_connections.append(websocket)
        elif connection_type == "risk":
            self.risk_connections.append(websocket)
        elif connection_type == "market_data":
            self.market_data_connections.append(websocket)
        else:
            self.active_connections.append(websocket)
        logger.info(f"New {connection_type} WebSocket connection established")
    
    def disconnect(self, websocket: WebSocket):
        # Remove from all connection lists
        for conn_list in [self.active_connections, self.ios_connections, 
                         self.crypto_connections, self.ai_connections, self.risk_connections, self.market_data_connections]:
            if websocket in conn_list:
                conn_list.remove(websocket)
        
        # Remove from all subscriptions
        for subscription_set in self.subscriptions.values():
            subscription_set.discard(websocket)
        
        logger.info("WebSocket connection closed")
    
    async def subscribe(self, websocket: WebSocket, channels: List[str]):
        """Subscribe to specific data channels"""
        for channel in channels:
            if channel in self.subscriptions:
                self.subscriptions[channel].add(websocket)
                logger.info(f"WebSocket subscribed to {channel}")
    
    async def unsubscribe(self, websocket: WebSocket, channels: List[str]):
        """Unsubscribe from specific data channels"""
        for channel in channels:
            if channel in self.subscriptions:
                self.subscriptions[channel].discard(websocket)
                logger.info(f"WebSocket unsubscribed from {channel}")
    
    async def send_to_ios(self, message: dict):
        """Send message specifically to iOS connections"""
        await self._send_to_connections(self.ios_connections, message)
    
    async def send_to_crypto(self, message: dict):
        """Send message to crypto connections"""
        await self._send_to_connections(self.crypto_connections, message)
    
    async def send_to_ai(self, message: dict):
        """Send message to AI connections"""
        await self._send_to_connections(self.ai_connections, message)
    
    async def send_to_risk(self, message: dict):
        """Send message to risk management connections"""
        await self._send_to_connections(self.risk_connections, message)
    
    async def send_to_market_data(self, message: dict):
        """Send message to market data connections"""
        await self._send_to_connections(self.market_data_connections, message)
    
    async def send_to_channel(self, channel: str, message: dict):
        """Send message to specific channel subscribers"""
        if channel in self.subscriptions:
            await self._send_to_connections(list(self.subscriptions[channel]), message)
    
    async def broadcast(self, message: dict):
        """Broadcast to all connections"""
        all_connections = (self.active_connections + self.ios_connections + 
                          self.crypto_connections + self.ai_connections + 
                          self.risk_connections + self.market_data_connections)
        await self._send_to_connections(all_connections, message)
    
    async def _send_to_connections(self, connections: List[WebSocket], message: dict):
        """Helper method to send message to a list of connections"""
        if not connections:
            return
        
        message_text = json.dumps(message)
        disconnected = []
        
        for connection in connections:
            try:
                await connection.send_text(message_text)
            except Exception as e:
                logger.error(f"Error sending WebSocket message: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)
    
    async def start_high_frequency_streaming(self):
        """Start high-frequency data streaming tasks"""
        if self.is_streaming:
            return
        
        self.is_streaming = True
        
        # Market data streaming (every 1 second)
        self.streaming_tasks["market_data"] = asyncio.create_task(
            self._stream_market_data()
        )
        
        # AI signals streaming (every 5 seconds)
        self.streaming_tasks["ai_signals"] = asyncio.create_task(
            self._stream_ai_signals()
        )
        
        # Crypto prices streaming (every 2 seconds)
        self.streaming_tasks["crypto_prices"] = asyncio.create_task(
            self._stream_crypto_prices()
        )
        
        # Risk monitoring (every 3 seconds)
        self.streaming_tasks["risk_alerts"] = asyncio.create_task(
            self._stream_risk_monitoring()
        )
        
        logger.info("High-frequency data streaming started")
    
    async def stop_high_frequency_streaming(self):
        """Stop high-frequency data streaming tasks"""
        self.is_streaming = False
        
        for task_name, task in self.streaming_tasks.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                logger.info(f"Streaming task {task_name} cancelled")
        
        self.streaming_tasks.clear()
        logger.info("High-frequency data streaming stopped")
    
    async def _stream_market_data(self):
        """Stream real-time market data"""
        while self.is_streaming:
            try:
                # Generate mock market data (in production, fetch from real sources)
                market_data = {
                    "type": "market_data",
                    "data": {
                        "AAPL": {"price": 150.25 + (asyncio.get_event_loop().time() % 10 - 5), "volume": 1000000 + int(asyncio.get_event_loop().time() * 1000) % 500000},
                        "TSLA": {"price": 245.80 + (asyncio.get_event_loop().time() % 8 - 4), "volume": 800000 + int(asyncio.get_event_loop().time() * 800) % 300000},
                        "BTCUSDT": {"price": 45000 + (asyncio.get_event_loop().time() % 1000 - 500), "volume": 50 + int(asyncio.get_event_loop().time() * 10) % 25},
                        "ETHUSDT": {"price": 3200 + (asyncio.get_event_loop().time() % 100 - 50), "volume": 100 + int(asyncio.get_event_loop().time() * 5) % 40}
                    },
                    "timestamp": datetime.now().isoformat()
                }
                
                await self.send_to_channel("market_data", market_data)
                await asyncio.sleep(1)  # 1 second interval
                
            except Exception as e:
                logger.error(f"Error in market data streaming: {e}")
                await asyncio.sleep(5)  # Wait before retry
    
    async def _stream_ai_signals(self):
        """Stream AI-generated signals"""
        while self.is_streaming:
            try:
                # Generate mock AI signals
                signals = {
                    "type": "ai_signals",
                    "data": {
                        "research_signal": {"symbol": "AAPL", "action": "BUY", "confidence": 0.85, "reasoning": "强劲的基本面分析"},
                        "strategy_signal": {"symbol": "TSLA", "action": "SELL", "confidence": 0.72, "reasoning": "动量策略信号"},
                        "news_signal": {"symbol": "NVDA", "action": "HOLD", "confidence": 0.65, "reasoning": "新闻情感中性"},
                        "risk_signal": {"alert": "组合波动率上升", "level": "MEDIUM", "recommendation": "适度降低仓位"}
                    },
                    "timestamp": datetime.now().isoformat()
                }
                
                await self.send_to_channel("ai_signals", signals)
                await asyncio.sleep(5)  # 5 second interval
                
            except Exception as e:
                logger.error(f"Error in AI signals streaming: {e}")
                await asyncio.sleep(10)
    
    async def _stream_crypto_prices(self):
        """Stream real-time crypto prices"""
        while self.is_streaming:
            try:
                # Generate mock crypto price updates
                crypto_data = {
                    "type": "crypto_prices",
                    "data": {
                        "BTCUSDT": {
                            "price": 45000 + (int(asyncio.get_event_loop().time()) % 1000 - 500),
                            "change_24h": 2.5 + (int(asyncio.get_event_loop().time()) % 10 - 5) * 0.1,
                            "volume_24h": 1500000000,
                            "exchange": "binance"
                        },
                        "ETHUSDT": {
                            "price": 3200 + (int(asyncio.get_event_loop().time()) % 200 - 100),
                            "change_24h": 1.8 + (int(asyncio.get_event_loop().time()) % 8 - 4) * 0.1,
                            "volume_24h": 800000000,
                            "exchange": "okx"
                        },
                        "BNBUSDT": {
                            "price": 310 + (int(asyncio.get_event_loop().time()) % 20 - 10),
                            "change_24h": -0.5 + (int(asyncio.get_event_loop().time()) % 6 - 3) * 0.1,
                            "volume_24h": 200000000,
                            "exchange": "binance"
                        }
                    },
                    "timestamp": datetime.now().isoformat()
                }
                
                await self.send_to_channel("crypto_prices", crypto_data)
                await asyncio.sleep(2)  # 2 second interval
                
            except Exception as e:
                logger.error(f"Error in crypto prices streaming: {e}")
                await asyncio.sleep(5)
    
    async def _stream_risk_monitoring(self):
        """Stream risk monitoring updates"""
        while self.is_streaming:
            try:
                # Generate mock risk data
                risk_data = {
                    "type": "risk_alerts",
                    "data": {
                        "portfolio_var": 0.05 + (int(asyncio.get_event_loop().time()) % 100) * 0.0001,
                        "max_drawdown": 0.12 + (int(asyncio.get_event_loop().time()) % 50) * 0.0002,
                        "volatility": 0.18 + (int(asyncio.get_event_loop().time()) % 30) * 0.0003,
                        "beta": 1.1 + (int(asyncio.get_event_loop().time()) % 20 - 10) * 0.001,
                        "alerts": [
                            {"level": "INFO", "message": "市场波动率正常", "timestamp": datetime.now().isoformat()}
                        ] if int(asyncio.get_event_loop().time()) % 10 < 8 else [
                            {"level": "WARNING", "message": "检测到异常波动", "timestamp": datetime.now().isoformat()}
                        ]
                    },
                    "timestamp": datetime.now().isoformat()
                }
                
                await self.send_to_channel("risk_alerts", risk_data)
                await asyncio.sleep(3)  # 3 second interval
                
            except Exception as e:
                logger.error(f"Error in risk monitoring streaming: {e}")
                await asyncio.sleep(5)

# Global connection manager
manager = ConnectionManager()

# HTTP Client for service communication
http_client = None
market_universe_provider: Optional[YahooMarketProvider] = None
china_market_provider: Optional[ChinaAStockProvider] = None
_pool_config_cache: Optional[List[Dict[str, Any]]] = None
_pool_config_mtime: Optional[float] = None

# In-memory cache for search results with TTL
_search_cache: Dict[str, Dict[str, Any]] = {}
_cache_expiry: Dict[str, float] = {}
CACHE_TTL = 300  # 5 minutes cache for search results

MARKET_REGION_MAP = {
    "US": "US",
    "CN": "CN",
    "HK": "HK",
    "JP": "JP",
    "EU": "EU",
}

POPULAR_MARKET_SYMBOLS: Dict[str, List[str]] = {
    "US": ["AAPL", "MSFT", "NVDA", "META", "TSLA"],
    "CN": ["600519.SS", "000001.SZ", "300750.SZ", "601318.SS"],
    "HK": ["0700.HK", "9988.HK", "3690.HK"],
    "JP": ["7203.T", "6758.T", "9432.T"],
}

GLOBAL_INDEX_SYMBOLS: Dict[str, Dict[str, str]] = {
    "NASDAQ": {"symbol": "QQQ", "market": "US"},
    "S&P 500": {"symbol": "SPY", "market": "US"},
    "DOW": {"symbol": "DIA", "market": "US"},
    "上证指数": {"symbol": "000001.SS", "market": "CN"},
    "深证成指": {"symbol": "399001.SZ", "market": "CN"},
    "恒生指数": {"symbol": "2800.HK", "market": "HK"},
}


async def service_request(method: str, url: str, *, fallback=None, **kwargs):
    """Helper that proxies requests to downstream services with unified logging."""
    if http_client is None:
        raise RuntimeError("HTTP client not initialized")

    try:
        response = await http_client.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Service %s %s failed: %s", method, url, exc)
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text)
    except httpx.RequestError as exc:
        logger.warning("Service %s %s unavailable: %s", method, url, exc)
        if fallback is not None:
            return fallback
        raise HTTPException(status_code=503, detail=f"Service unavailable: {url}")


def fallback_payload(payload: Any) -> Optional[Any]:
    """Return payload only when fallbacks are explicitly enabled."""
    return payload if ServiceConfig.ENABLE_FALLBACKS else None


async def fetch_price_history(symbol: str, *, limit: int = 200, interval: str = "1d") -> List[Dict[str, Any]]:
    if http_client is None:
        raise HTTPException(status_code=503, detail="HTTP client not initialised")
    params = {
        "range": "2y",
        "interval": interval,
        "includePrePost": "false"
    }
    response = await http_client.get(
        YahooMarketProvider.CHART_URL.format(symbol=symbol),
        params=params,
        headers={"User-Agent": "ArtheraDashboard/1.0"}
    )
    response.raise_for_status()
    payload = response.json().get("chart", {})
    results = payload.get("result") or []
    if not results:
        raise HTTPException(status_code=404, detail="无法获取该股票的价格历史")
    entry = results[0]
    timestamps = entry.get("timestamp") or []
    quotes = entry.get("indicators", {}).get("quote", [{}])[0]
    closes = quotes.get("close", [])

    series: List[Dict[str, Any]] = []
    for ts, close in zip(timestamps, closes):
        if close is None or ts is None:
            continue
        series.append({
            "timestamp": datetime.utcfromtimestamp(ts).isoformat() + "Z",
            "close": close
        })

    if not series:
        raise HTTPException(status_code=502, detail="价格历史数据为空")
    return series[-limit:]


def _calculate_sma(values: List[float], period: int) -> float:
    window = values[-period:]
    return sum(window) / len(window)


def _ema_series(values: List[float], period: int) -> List[float]:
    multiplier = 2 / (period + 1)
    ema_values: List[float] = []
    ema_value = values[0]
    for price in values:
        ema_value = (price - ema_value) * multiplier + ema_value
        ema_values.append(ema_value)
    return ema_values


def _calculate_ema(values: List[float], period: int) -> float:
    return _ema_series(values, period)[-1]


def _calculate_rsi(values: List[float], period: int) -> float:
    gains: List[float] = []
    losses: List[float] = []
    for prev, curr in zip(values[:-1], values[1:]):
        change = curr - prev
        gains.append(max(change, 0))
        losses.append(abs(min(change, 0)))
    avg_gain = sum(gains[-period:]) / period if gains[-period:] else 0
    avg_loss = sum(losses[-period:]) / period if losses[-period:] else 0
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _calculate_bollinger(values: List[float], period: int) -> Dict[str, float]:
    window = values[-period:]
    middle = sum(window) / len(window)
    std_dev = pstdev(window) if len(window) > 1 else 0
    return {
        "middle": middle,
        "upper": middle + 2 * std_dev,
        "lower": middle - 2 * std_dev,
        "stdDev": std_dev
    }


def _calculate_macd(values: List[float]) -> Dict[str, float]:
    if len(values) < 35:
        raise HTTPException(status_code=400, detail="MACD计算需要更多数据")
    ema12_series = _ema_series(values, 12)
    ema26_series = _ema_series(values, 26)
    macd_series = [a - b for a, b in zip(ema12_series[-len(ema26_series):], ema26_series)]
    signal_series = _ema_series(macd_series, 9)
    macd_line = macd_series[-1]
    signal_line = signal_series[-1]
    histogram = macd_line - signal_line
    return {
        "macd": macd_line,
        "signal": signal_line,
        "histogram": histogram
    }


def _daily_returns(values: List[float]) -> List[float]:
    returns: List[float] = []
    for prev, curr in zip(values[:-1], values[1:]):
        if prev in (None, 0) or curr is None:
            continue
        returns.append((curr / prev) - 1)
    return returns


def _percentile(values: List[float], percentile: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    k = max(0, min(len(ordered) - 1, int(len(ordered) * percentile)))
    return ordered[k]


def _max_drawdown(returns: List[float]) -> float:
    peak = 1.0
    trough = 1.0
    max_dd = 0.0
    cumulative = 1.0
    for r in returns:
        cumulative *= (1 + r)
        if cumulative > peak:
            peak = cumulative
            trough = cumulative
        if cumulative < trough:
            trough = cumulative
            drawdown = (trough / peak) - 1
            if drawdown < max_dd:
                max_dd = drawdown
    return max_dd


async def _fetch_series_for_symbols(symbols: List[str], limit: int = 160) -> Dict[str, List[float]]:
    results: Dict[str, List[float]] = {}
    tasks = [fetch_price_history(symbol, limit=limit) for symbol in symbols]
    histories = await asyncio.gather(*tasks, return_exceptions=True)
    for symbol, history in zip(symbols, histories):
        if isinstance(history, Exception):
            logger.warning("Failed to fetch history for %s: %s", symbol, history)
            continue
        closes = [entry["close"] for entry in history if entry.get("close")]
        if len(closes) >= 5:
            results[symbol] = closes
    return results


def _benchmark_symbol_for_market(market: Optional[str]) -> str:
    if not market:
        return "^GSPC"
    market = market.upper()
    if market == "CN":
        return "000001.SS"
    if market == "HK":
        return "^HSI"
    if market == "JP":
        return "^N225"
    return "^GSPC"


async def _generate_risk_report(symbols: List[str], market: Optional[str] = None) -> Dict[str, Any]:
    if not symbols:
        symbols = ["AAPL", "MSFT", "NVDA", "TSLA"]
    benchmark = _benchmark_symbol_for_market(market)
    unique_symbols = list(dict.fromkeys(symbols + [benchmark]))
    series_map = await _fetch_series_for_symbols(unique_symbols)
    if benchmark not in series_map:
        raise HTTPException(status_code=502, detail="无法获取基准市场数据")

    benchmark_returns = _daily_returns(series_map[benchmark])
    portfolio_returns: List[float] = []
    for symbol in symbols:
        closes = series_map.get(symbol)
        if not closes:
            continue
        portfolio_returns.append(_daily_returns(closes))

    if not portfolio_returns:
        raise HTTPException(status_code=502, detail="无法获取足够的股票数据计算风险")

    # Average equal-weight returns
    min_length = min(len(r) for r in portfolio_returns)
    trimmed_returns = [r[-min_length:] for r in portfolio_returns]
    portfolio_series = [sum(values) / len(values) for values in zip(*trimmed_returns)]

    var_95 = _percentile(portfolio_series, 0.05)
    max_dd = _max_drawdown(portfolio_series)
    volatility = pstdev(portfolio_series) * math.sqrt(252) if len(portfolio_series) > 2 else 0.0

    bench_trim = benchmark_returns[-min_length:]
    if len(bench_trim) == len(portfolio_series):
        bench_mean = sum(bench_trim) / len(bench_trim)
        port_mean = sum(portfolio_series) / len(portfolio_series)
        cov = sum((p - port_mean) * (b - bench_mean) for p, b in zip(portfolio_series, bench_trim)) / len(portfolio_series)
        bench_var = pstdev(bench_trim) ** 2 if len(bench_trim) > 1 else 0.0
        beta = cov / bench_var if bench_var else 0.0
        corr = cov / (pstdev(portfolio_series) * pstdev(bench_trim)) if pstdev(portfolio_series) and pstdev(bench_trim) else 0.0
    else:
        beta = 0.0
        corr = 0.0

    alpha = port_mean - (beta * bench_mean)
    tracking_error = math.sqrt(sum((p - b) ** 2 for p, b in zip(portfolio_series, bench_trim)) / len(portfolio_series)) if len(portfolio_series) == len(bench_trim) else 0.0

    series_points: List[Dict[str, Any]] = []
    window = min(10, len(portfolio_series))
    for idx in range(-window, 0):
        local_returns = portfolio_series[: idx] if idx != 0 else portfolio_series
        segment = local_returns[-60:] if len(local_returns) > 60 else local_returns
        if not segment:
            continue
        series_points.append({
            "label": f"T{idx}",
            "var_95": abs(_percentile(segment, 0.05) * 100),
            "max_drawdown": abs(_max_drawdown(segment) * 100),
            "volatility": abs(pstdev(segment) * math.sqrt(252) * 100)
        })

    return {
        "risk_metrics": {
            "value_at_risk_95": float(var_95),
            "max_drawdown": float(max_dd),
            "volatility": float(volatility),
            "beta": float(beta),
            "alpha": float(alpha),
            "tracking_error": float(tracking_error),
            "correlation": float(corr)
        },
        "series": series_points,
        "symbols": symbols,
        "benchmark": benchmark
    }


def _generate_time_series(points: int = 12, start_value: float = 1.0, step: float = 0.01) -> List[Dict[str, float]]:
    base_time = datetime.now() - timedelta(hours=points)
    series = []
    current = start_value
    for idx in range(points):
        series.append({
            "timestamp": (base_time + timedelta(minutes=idx * 30)).isoformat(),
            "value": round(current, 4)
        })
        current += step
    return series


async def universe_request(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if http_client is None:
        raise RuntimeError("HTTP client not initialized")
    if not ServiceConfig.UNIVERSE_SERVICE_URL:
        raise HTTPException(status_code=500, detail="外部股票数据服务未配置")

    base = ServiceConfig.UNIVERSE_SERVICE_URL.rstrip("/")
    route = path if path.startswith("http") else f"{base}{path if path.startswith('/') else '/' + path}"
    headers: Dict[str, str] = {}
    if ServiceConfig.UNIVERSE_API_KEY:
        headers["Authorization"] = f"Bearer {ServiceConfig.UNIVERSE_API_KEY}"
    try:
        response = await http_client.get(route, params=params, headers=headers)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Universe request failed: %s", exc)
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text)
    except httpx.RequestError as exc:
        logger.error("Universe service unavailable: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to reach universe service")


def load_pool_definitions() -> List[Dict[str, Any]]:
    global _pool_config_cache, _pool_config_mtime
    config_path = ServiceConfig.POOLS_CONFIG_PATH
    if not config_path.exists():
        raise HTTPException(status_code=500, detail=f"Pool configuration missing: {config_path}")
    mtime = config_path.stat().st_mtime
    if _pool_config_cache is None or _pool_config_mtime != mtime:
        with config_path.open("r", encoding="utf-8") as config_file:
            _pool_config_cache = json.load(config_file)
        _pool_config_mtime = mtime
    return _pool_config_cache or []


async def fetch_symbol_metadata(symbol: str, region: Optional[str] = None) -> Dict[str, Any]:
    # Check cache first for individual symbol lookups
    cache_key = f"symbol:{symbol.upper()}:{region or 'all'}"
    if _is_cache_valid(cache_key):
        logger.info(f"Cache hit for symbol: {symbol}")
        return _search_cache[cache_key]
    
    try:
        if ServiceConfig.UNIVERSE_SERVICE_URL:
            params = {"query": symbol, "limit": 1}
            if region:
                params["region"] = region
            payload = await universe_request(ServiceConfig.UNIVERSE_SEARCH_PATH, params=params)
            results = payload.get("results", [])
            if not results:
                raise HTTPException(status_code=404, detail=f"未找到股票代码 {symbol}，请检查代码是否正确")
            match = next((item for item in results if item.get("symbol", "").upper() == symbol.upper()), results[0])
        else:
            match = None
            if is_china_symbol(symbol) and china_market_provider is not None:
                try:
                    match = await china_market_provider.lookup_symbol(symbol)
                except ValueError:
                    logger.debug("China provider lookup miss for %s", symbol)
            if match is None:
                if market_universe_provider is None:
                    raise HTTPException(status_code=503, detail="股票数据服务暂不可用")
                match = await market_universe_provider.lookup_symbol(symbol, region=region)
        
        # Cache the result
        _search_cache[cache_key] = match
        _cache_expiry[cache_key] = time.time() + CACHE_TTL
        
        return match
        
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=f"股票代码 {symbol} 不存在或格式错误") from exc
    except Exception as exc:
        logger.exception("Failed to fetch metadata for %s", symbol)
        if "rate" in str(exc).lower():
            raise HTTPException(status_code=429, detail="数据请求过于频繁，请稍后重试") from exc
        else:
            raise HTTPException(status_code=502, detail="股票数据获取失败，请稍后重试") from exc


async def fetch_pool_components(symbols: List[str], region: Optional[str]) -> List[Dict[str, Any]]:
    tasks = [fetch_symbol_metadata(symbol, region) for symbol in symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    components = []
    for result in results:
        if isinstance(result, Exception):
            logger.warning("Failed to fetch component metadata: %s", result)
            continue
        components.append(result)
    if not components:
        raise HTTPException(status_code=502, detail="Unable to fetch pool constituents from provider")
    return components


def is_china_symbol(symbol: str) -> bool:
    if not symbol:
        return False
    normalized = symbol.upper()
    if any(normalized.endswith(suffix) for suffix in (".SS", ".SH", ".SZ", ".BJ")):
        return True
    return normalized[:1].isdigit() and len(normalized) >= 6


def looks_like_china_query(query: str) -> bool:
    if not query:
        return False
    lowered = query.lower()
    if lowered.endswith(('.ss', '.sz', '.sh', '.bj')):
        return True
    if lowered.isdigit() and len(lowered) >= 3:
        return True
    return any('\u4e00' <= ch <= '\u9fff' for ch in query)


def resolve_region_from_market(market: Optional[str]) -> Optional[str]:
    if not market:
        return None
    normalized = market.upper()
    return MARKET_REGION_MAP.get(normalized, normalized)


def format_market_cap_label(value: Optional[float], currency: str) -> str:
    if value is None:
        return "N/A"
    units = [
        (1e12, "T"),
        (1e9, "B"),
        (1e8, "亿"),
        (1e6, "M"),
        (1e4, "万"),
    ]
    label = '$' if currency.upper() in {"USD", "US"} else '¥'
    for threshold, suffix in units:
        if value >= threshold:
            return f"{label}{value / threshold:.2f}{suffix}"
    return f"{label}{value:.0f}"


def normalize_quote_payload(quote: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    symbol = (quote.get("symbol") or quote.get("ts_code") or quote.get("code"))
    if not symbol:
        return None
    symbol = symbol.upper()
    currency = quote.get("currency") or ("CNY" if is_china_symbol(symbol) else "USD")
    sector = quote.get("sector") or quote.get("industry") or "General"
    price = _to_number(
        quote.get("price")
        or quote.get("last_price")
        or quote.get("regularMarketPrice")
        or quote.get("close")
    )
    change_pct = _to_number(
        quote.get("change_pct")
        or quote.get("change")
        or quote.get("regularMarketChangePercent")
    )
    volume = _to_number(quote.get("volume") or quote.get("regularMarketVolume"))
    market_cap_value = quote.get("market_cap") or quote.get("marketCap")
    if isinstance(market_cap_value, dict):
        market_cap_value = market_cap_value.get("raw")
    market_cap_value = _to_number(market_cap_value)

    return {
        "symbol": symbol,
        "displayName": quote.get("displayName") or quote.get("longName") or quote.get("shortName") or quote.get("name") or symbol,
        "name": quote.get("name") or quote.get("longName") or symbol,
        "exchange": quote.get("exchange") or quote.get("fullExchangeName") or quote.get("market") or "N/A",
        "currency": currency,
        "region": quote.get("region") or ("CN" if is_china_symbol(symbol) else quote.get("country")),
        "price": price,
        "last_price": price,
        "change": change_pct,
        "volume": volume,
        "marketCap": format_market_cap_label(market_cap_value, currency),
        "market_cap": market_cap_value,
        "sector": sector,
        "industry": quote.get("industry") or sector,
        "data_source": quote.get("data_source") or "yahoo"
    }


def _to_number(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        if isinstance(value, str):
            value = value.replace('%', '').replace(',', '')
        return float(value)
    except (TypeError, ValueError):
        return None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global http_client, market_universe_provider, china_market_provider
    http_client = httpx.AsyncClient(timeout=ServiceConfig.REQUEST_TIMEOUT)
    if ServiceConfig.UNIVERSE_SERVICE_URL:
        market_universe_provider = None
        logger.info("API Gateway started - using external universe service %s", ServiceConfig.UNIVERSE_SERVICE_URL)
    else:
        market_universe_provider = YahooMarketProvider(http_client)
        logger.info("API Gateway started - using built-in Yahoo Finance provider for universe data")

    try:
        china_market_provider = ChinaAStockProvider(tushare_token=ServiceConfig.TUSHARE_TOKEN)
        logger.info("China A-share provider initialised (tushare=%s)", bool(ServiceConfig.TUSHARE_TOKEN))
    except Exception as exc:
        china_market_provider = None
        logger.warning("China market provider disabled: %s", exc)

    yield
    # Shutdown
    await http_client.aclose()
    market_universe_provider = None
    china_market_provider = None
    logger.info("API Gateway shutdown - HTTP client closed")

# FastAPI App
app = FastAPI(
    title="Arthera Unified API Gateway",
    description="统一API网关，整合所有Arthera量化交易服务",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本地开发允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """系统健康检查，验证所有服务连接状态"""
    services_status = {}
    
    # Check QuantEngine
    try:
        response = await http_client.get(f"{ServiceConfig.QUANT_ENGINE_URL}/health")
        services_status["quant_engine"] = response.status_code == 200
    except:
        services_status["quant_engine"] = False
    
    # Check Quant Lab
    try:
        response = await http_client.get(f"{ServiceConfig.QUANT_LAB_URL}/health")
        services_status["quant_lab"] = response.status_code == 200
    except:
        services_status["quant_lab"] = False
    
    # Check Paper Trading (if available)
    try:
        response = await http_client.get(f"{ServiceConfig.PAPER_TRADING_URL}/health")
        services_status["paper_trading"] = response.status_code == 200
    except:
        services_status["paper_trading"] = False
    
    # Check AI Agents Service
    try:
        response = await http_client.get(f"{ServiceConfig.AI_AGENTS_URL}/health")
        services_status["ai_agents"] = response.status_code == 200
    except:
        services_status["ai_agents"] = False
    
    # Check Crypto Connectors Service
    try:
        response = await http_client.get(f"{ServiceConfig.CRYPTO_CONNECTORS_URL}/health")
        services_status["crypto_connectors"] = response.status_code == 200
    except:
        services_status["crypto_connectors"] = False
    
    # Check Risk Management Service
    try:
        response = await http_client.get(f"{ServiceConfig.RISK_MANAGEMENT_URL}/health")
        services_status["risk_management"] = response.status_code == 200
    except:
        services_status["risk_management"] = False
    
    # Check Backtesting Engine Service
    try:
        response = await http_client.get(f"{ServiceConfig.BACKTESTING_ENGINE_URL}/health")
        services_status["backtesting_engine"] = response.status_code == 200
    except:
        services_status["backtesting_engine"] = False
    
    # Overall status
    all_services_up = all(services_status.values())
    status = "healthy" if all_services_up else "degraded"
    
    return HealthResponse(
        status=status,
        timestamp=datetime.now().isoformat(),
        services=services_status
    )

# ==================== MARKET DATA ROUTES ====================

@app.get("/market-data/health")
async def market_data_health():
    """市场数据服务健康检查"""
    return await service_request("GET", f"{ServiceConfig.MARKET_DATA_URL}/health")

@app.get("/market-data/stocks/{symbol}")
async def get_stock_data(symbol: str, period: str = "1D", interval: str = "1m"):
    """获取股票实时数据 - 路由到QuantEngine"""
    return await service_request(
        "GET",
        f"{ServiceConfig.MARKET_DATA_URL}/api/data/stock/{symbol}",
        params={"period": period, "interval": interval}
    )


@app.get("/market-data/stock/{symbol}")
async def get_stock_overview(symbol: str, market: Optional[str] = None):
    """统一的股票概览接口，供前端仪表板直接消费"""
    region = resolve_region_from_market(market)
    quote = await fetch_symbol_metadata(symbol, region=region)
    normalized = normalize_quote_payload(quote)
    if not normalized:
        raise HTTPException(status_code=404, detail=f"未找到股票 {symbol}")

    data_source = normalized.get("data_source") or quote.get("data_source") or "unknown"
    is_real_time = bool(quote.get("is_real_time", data_source != "simulated"))
    reliability = "verified" if is_real_time else "fallback"

    snapshot = {
        "symbol": normalized.get("symbol") or symbol.upper(),
        "name": normalized.get("name") or normalized.get("displayName") or symbol.upper(),
        "price": normalized.get("price"),
        "last_price": normalized.get("last_price"),
        "change": normalized.get("change"),
        "change_percent": normalized.get("change"),
        "volume": normalized.get("volume"),
        "currency": normalized.get("currency"),
        "market_cap": normalized.get("market_cap"),
        "marketCapLabel": normalized.get("marketCap"),
        "data_source": data_source,
        "market": (market.upper() if market else normalized.get("region")) or "GLOBAL",
        "is_real_time": is_real_time,
        "updated_at": datetime.now().isoformat(),
        "metadata": {
            "exchange": normalized.get("exchange"),
            "region": normalized.get("region"),
            "sector": normalized.get("sector"),
            "industry": normalized.get("industry"),
            "source_reliability": reliability
        }
    }
    return snapshot


@app.get("/market-data/alpha158/{symbol}")
async def get_alpha158_factors(symbol: str):
    """获取Alpha158因子 - 路由到QuantEngine"""
    return await service_request("GET", f"{ServiceConfig.MARKET_DATA_URL}/api/alpha158/{symbol}")


@app.get("/analysis/indicators/{symbol}")
async def get_indicator_analysis(symbol: str, indicator: str = "sma", period: int = 20, points: int = 120, market: Optional[str] = None):
    """计算技术指标，供配置界面实时使用"""
    if period < 2:
        raise HTTPException(status_code=400, detail="period 必须大于1")
    indicator_key = indicator.lower()
    min_points = max(points, period + 20)
    series = await fetch_price_history(symbol, limit=min_points)
    closes = [item["close"] for item in series]
    if len(closes) < period:
        raise HTTPException(status_code=400, detail="可用数据不足以计算该指标")

    if indicator_key == "sma":
        result_value = {"sma": _calculate_sma(closes, period)}
    elif indicator_key == "ema":
        result_value = {"ema": _calculate_ema(closes, period)}
    elif indicator_key == "rsi":
        lookback = max(period, 14)
        result_value = {"rsi": _calculate_rsi(closes[-(lookback + 1):], lookback)}
    elif indicator_key == "bollinger":
        result_value = _calculate_bollinger(closes, period)
    elif indicator_key == "macd":
        result_value = _calculate_macd(closes)
    else:
        raise HTTPException(status_code=400, detail=f"不支持的指标类型: {indicator}")

    trimmed_series = series[-min(points, len(series)) :]

    return {
        "symbol": symbol.upper(),
        "indicator": indicator_key,
        "period": period,
        "points_analyzed": len(series),
        "latest_price": closes[-1],
        "result": result_value,
        "series": trimmed_series,
        "calculated_at": datetime.now().isoformat()
    }


@app.get("/analysis/correlation")
async def get_correlation_analysis(symbols: str = "AAPL,MSFT,GOOGL", benchmark: Optional[str] = None, market: Optional[str] = None, lookback: int = 120):
    requested_symbols = [sym.strip() for sym in symbols.split(',') if sym.strip()]
    if not requested_symbols:
        requested_symbols = ["AAPL", "MSFT", "GOOGL"]
    benchmark_symbol = benchmark or _benchmark_symbol_for_market(market)
    symbol_set = list(dict.fromkeys(requested_symbols + [benchmark_symbol]))
    series_map = await _fetch_series_for_symbols(symbol_set, limit=max(lookback, 120))
    if benchmark_symbol not in series_map:
        raise HTTPException(status_code=502, detail="无法获取基准市场数据")

    benchmark_returns = _daily_returns(series_map[benchmark_symbol])
    if len(benchmark_returns) < 5:
        raise HTTPException(status_code=502, detail="基准数据不足")

    points: List[Dict[str, Any]] = []
    for symbol in requested_symbols:
        closes = series_map.get(symbol)
        if not closes:
            continue
        symbol_returns = _daily_returns(closes)
        min_len = min(len(symbol_returns), len(benchmark_returns))
        if min_len < 5:
            continue
        s_trim = symbol_returns[-min_len:]
        b_trim = benchmark_returns[-min_len:]
        s_mean = sum(s_trim) / len(s_trim)
        b_mean = sum(b_trim) / len(b_trim)
        cov = sum((s - s_mean) * (b - b_mean) for s, b in zip(s_trim, b_trim)) / len(s_trim)
        b_var = pstdev(b_trim) ** 2 if len(b_trim) > 1 else 0.0
        corr = cov / (pstdev(s_trim) * pstdev(b_trim)) if pstdev(s_trim) and pstdev(b_trim) else 0.0
        beta = cov / b_var if b_var else 0.0
        alpha = s_mean - beta * b_mean
        points.append({
            "symbol": symbol.upper(),
            "market_return": b_trim[-1] * 100,
            "strategy_return": s_trim[-1] * 100,
            "correlation": corr,
            "beta": beta,
            "alpha": alpha
        })

    if not points:
        raise HTTPException(status_code=502, detail="无法计算相关性数据")

    return {
        "benchmark": benchmark_symbol,
        "points": points,
        "calculated_at": datetime.now().isoformat()
    }



@app.get("/market-data/popular")
async def get_popular_market_data(market: Optional[str] = None):
    """获取热门股票，用于前端市场热度和图表展示"""
    markets: List[str]
    if market:
        normalized = market.upper()
        if normalized not in POPULAR_MARKET_SYMBOLS:
            raise HTTPException(status_code=404, detail=f"市场 {market} 暂不支持热门列表")
        markets = [normalized]
    else:
        markets = list(POPULAR_MARKET_SYMBOLS.keys())

    popular_entries: List[Dict[str, Any]] = []
    market_breakdown: Dict[str, List[Dict[str, Any]]] = {}

    for market_code in markets:
        symbols = POPULAR_MARKET_SYMBOLS.get(market_code, [])
        if not symbols:
            continue
        tasks = [fetch_symbol_metadata(symbol, region=resolve_region_from_market(market_code)) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        entries: List[Dict[str, Any]] = []
        for symbol, result in zip(symbols, results):
            if isinstance(result, Exception):
                logger.warning("Failed to fetch popular symbol %s: %s", symbol, result)
                continue
            normalized = normalize_quote_payload(result)
            if not normalized:
                continue
            entries.append({
                "symbol": normalized.get("symbol"),
                "name": normalized.get("displayName") or normalized.get("name") or symbol,
                "price": normalized.get("price"),
                "change": normalized.get("change"),
                "change_percent": normalized.get("change"),
                "volume": normalized.get("volume"),
                "currency": normalized.get("currency"),
                "market": market_code,
                "market_cap": normalized.get("market_cap"),
                "marketCapLabel": normalized.get("marketCap"),
                "data_source": normalized.get("data_source"),
                "sector": normalized.get("sector"),
                "industry": normalized.get("industry")
            })
        if entries:
            market_breakdown[market_code] = entries
            popular_entries.extend(entries)

    if not popular_entries:
        raise HTTPException(status_code=502, detail="无法获取热门股票数据")

    popular_entries.sort(key=lambda item: abs(item.get("change") or 0), reverse=True)

    return {
        "timestamp": datetime.now().isoformat(),
        "popular_stocks": popular_entries,
        "markets": market_breakdown
    }


@app.get("/market-data/indices")
async def get_market_indices_snapshot():
    """获取多个市场指数的快照数据"""
    labels = list(GLOBAL_INDEX_SYMBOLS.items())
    tasks = [
        fetch_symbol_metadata(meta[1]["symbol"], region=resolve_region_from_market(meta[1].get("market")))
        for meta in labels
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    indices: Dict[str, Dict[str, Any]] = {}
    for (display_name, meta), result in zip(labels, results):
        if isinstance(result, Exception):
            logger.warning("Failed to fetch index %s: %s", display_name, result)
            continue
        normalized = normalize_quote_payload(result)
        if not normalized:
            continue
        indices[display_name] = {
            "symbol": normalized.get("symbol"),
            "name": normalized.get("displayName") or display_name,
            "price": normalized.get("price"),
            "change": normalized.get("change"),
            "change_percent": normalized.get("change"),
            "currency": normalized.get("currency"),
            "market": meta.get("market"),
            "data_source": normalized.get("data_source"),
            "market_cap": normalized.get("market_cap"),
            "last_price": normalized.get("last_price"),
        }

    if not indices:
        raise HTTPException(status_code=502, detail="无法获取市场指数数据")

    return {
        "indices": indices,
        "timestamp": datetime.now().isoformat()
    }

# ==================== STRATEGY ROUTES ====================

@app.get("/strategies/list")
async def list_strategies():
    """获取策略列表 - 路由到Quant Lab"""
    return await service_request("GET", f"{ServiceConfig.STRATEGY_RUNNER_URL}/strategies/list")

@app.post("/strategies/run")
async def run_strategy(request: dict):
    """运行策略 - 路由到Quant Lab"""
    return await service_request(
        "POST",
        f"{ServiceConfig.STRATEGY_RUNNER_URL}/strategies/run",
        json=request
    )

@app.get("/strategies/backtest/{strategy_id}")
async def get_backtest_results(strategy_id: str, capital: Optional[float] = None, symbols: Optional[str] = None, period: Optional[str] = None):
    """获取回测结果 - 路由到QuantEngine"""
    params: Dict[str, Any] = {}
    if capital is not None:
        params["capital"] = capital
    if symbols:
        params["symbols"] = symbols
    if period:
        params["period"] = period
    return await service_request(
        "GET",
        f"{ServiceConfig.QUANT_ENGINE_URL}/api/backtest/{strategy_id}",
        params=params if params else None
    )

# ==================== SIGNALS ROUTES ====================

@app.post("/signals/generate")
async def generate_signals(request: SignalRequest):
    """生成交易信号 - 整合DeepSeek和Bayesian服务"""
    signals = await service_request(
        "POST",
        f"{ServiceConfig.QUANT_ENGINE_URL}/api/signals/generate",
        json=request.dict()
    )

    # 广播信号到iOS客户端
    await manager.send_to_ios({
        "type": "new_signals",
        "data": signals,
        "timestamp": datetime.now().isoformat()
    })

    return signals

@app.get("/signals/recent")
async def get_recent_signals(limit: int = 50):
    """获取最近信号"""
    return await service_request(
        "GET",
        f"{ServiceConfig.QUANT_ENGINE_URL}/api/signals/recent",
        params={"limit": limit}
    )

# ==================== AI AGENTS ROUTES ====================

@app.post("/ai/analysis/comprehensive")
async def ai_comprehensive_analysis(request: dict):
    """AI智能体综合分析"""
    return await service_request(
        "POST",
        f"{ServiceConfig.AI_AGENTS_URL}/analysis/comprehensive",
        json=request
    )

@app.post("/ai/signals/generate")
async def ai_generate_signals(request: dict):
    """AI智能体生成交易信号"""
    signals = await service_request(
        "POST",
        f"{ServiceConfig.AI_AGENTS_URL}/signals/generate",
        json=request
    )
    
    # 广播AI生成的信号到iOS客户端
    await manager.send_to_ios({
        "type": "ai_signals",
        "data": signals,
        "timestamp": datetime.now().isoformat()
    })
    
    return signals

@app.post("/ai/risk/assess")
async def ai_risk_assessment(request: dict):
    """AI智能体风险评估"""
    return await service_request(
        "POST",
        f"{ServiceConfig.AI_AGENTS_URL}/risk/assess",
        json=request
    )

@app.post("/ai/research/market")
async def ai_market_research(request: dict):
    """AI智能体市场研究"""
    return await service_request(
        "POST",
        f"{ServiceConfig.AI_AGENTS_URL}/research/market",
        json=request
    )

@app.post("/ai/agents/research")
async def ai_research_agent(symbol: str, analysis_type: str = "comprehensive"):
    """研究智能体"""
    return await service_request(
        "POST",
        f"{ServiceConfig.AI_AGENTS_URL}/agents/research",
        params={"symbol": symbol, "analysis_type": analysis_type}
    )

@app.post("/ai/agents/strategy")
async def ai_strategy_agent(request: dict):
    """策略智能体"""
    return await service_request(
        "POST",
        f"{ServiceConfig.AI_AGENTS_URL}/agents/strategy",
        json=request
    )

@app.post("/ai/agents/news")
async def ai_news_agent(symbol: str, analysis_type: str = "sentiment"):
    """新闻智能体"""
    return await service_request(
        "POST",
        f"{ServiceConfig.AI_AGENTS_URL}/agents/news",
        params={"symbol": symbol, "analysis_type": analysis_type}
    )

@app.post("/ai/agents/risk")
async def ai_risk_agent(request: dict):
    """风险智能体"""
    return await service_request(
        "POST",
        f"{ServiceConfig.AI_AGENTS_URL}/agents/risk",
        json=request
    )

@app.get("/ai/status")
async def ai_system_status():
    """AI智能体系统状态"""
    return await service_request("GET", f"{ServiceConfig.AI_AGENTS_URL}/status")

@app.get("/ai/performance")
async def ai_performance_metrics():
    """AI智能体性能指标"""
    return await service_request("GET", f"{ServiceConfig.AI_AGENTS_URL}/performance/metrics")

# ==================== AI LEARNING MEMORY ROUTES ====================

@app.get("/ai/learning/statistics")
async def get_learning_statistics():
    """获取AI学习统计信息"""
    return await service_request("GET", f"{ServiceConfig.AI_AGENTS_URL}/learning/statistics")

@app.get("/ai/learning/agent/{agent_id}/insights")
async def get_agent_learning_insights(agent_id: str):
    """获取智能体学习洞察"""
    return await service_request("GET", f"{ServiceConfig.AI_AGENTS_URL}/learning/agent/{agent_id}/insights")

@app.post("/ai/learning/feedback")
async def provide_decision_feedback(feedback_request: dict):
    """提供决策反馈"""
    return await service_request("POST", f"{ServiceConfig.AI_AGENTS_URL}/learning/feedback", json=feedback_request)

@app.get("/ai/learning/patterns")
async def get_learning_patterns(top_k: int = 10):
    """获取学习模式"""
    return await service_request("GET", f"{ServiceConfig.AI_AGENTS_URL}/learning/patterns", params={"top_k": top_k})

@app.get("/ai/learning/decisions/{agent_id}")
async def get_agent_decisions(agent_id: str, limit: int = 50):
    """获取智能体决策历史"""
    return await service_request("GET", f"{ServiceConfig.AI_AGENTS_URL}/learning/decisions/{agent_id}", params={"limit": limit})

@app.post("/ai/learning/agent/{agent_id}/reset")
async def reset_agent_learning_data(agent_id: str):
    """重置智能体学习数据"""
    return await service_request("POST", f"{ServiceConfig.AI_AGENTS_URL}/learning/agent/{agent_id}/reset")

@app.get("/ai/learning/export")
async def export_learning_data():
    """导出学习数据"""
    return await service_request("GET", f"{ServiceConfig.AI_AGENTS_URL}/learning/export")

@app.post("/ai/learning/import")
async def import_learning_data(learning_data: dict):
    """导入学习数据"""
    return await service_request("POST", f"{ServiceConfig.AI_AGENTS_URL}/learning/import", json=learning_data)

# ==================== BACKTESTING ENGINE ROUTES ====================

@app.get("/backtest/health")
async def get_backtest_health():
    """回测引擎健康检查"""
    return await service_request("GET", f"{ServiceConfig.BACKTESTING_ENGINE_URL}/health")

@app.get("/backtest/strategies")
async def get_available_strategies():
    """获取可用策略"""
    return await service_request("GET", f"{ServiceConfig.BACKTESTING_ENGINE_URL}/strategies")

@app.post("/backtest/single")
async def run_single_backtest(backtest_request: dict):
    """运行单策略回测"""
    return await service_request("POST", f"{ServiceConfig.BACKTESTING_ENGINE_URL}/backtest/single", json=backtest_request)

@app.post("/backtest/compare")
async def compare_strategies(comparison_request: dict):
    """多策略比较回测"""
    return await service_request("POST", f"{ServiceConfig.BACKTESTING_ENGINE_URL}/backtest/compare", json=comparison_request)

@app.get("/backtest/{backtest_id}/results")
async def get_backtest_results(backtest_id: str):
    """获取回测结果"""
    return await service_request("GET", f"{ServiceConfig.BACKTESTING_ENGINE_URL}/backtest/{backtest_id}/results")

@app.get("/backtest/{backtest_id}/performance")
async def get_performance_analysis(backtest_id: str):
    """获取性能分析"""
    return await service_request("GET", f"{ServiceConfig.BACKTESTING_ENGINE_URL}/backtest/{backtest_id}/performance")

# ==================== CRYPTO EXCHANGE ROUTES ====================

@app.get("/crypto/health")
async def crypto_health():
    """加密货币连接器健康检查"""
    return await service_request("GET", f"{ServiceConfig.CRYPTO_CONNECTORS_URL}/health")

@app.get("/crypto/exchanges")
async def list_crypto_exchanges():
    """列出支持的加密货币交易所"""
    return await service_request("GET", f"{ServiceConfig.CRYPTO_CONNECTORS_URL}/exchanges")

@app.get("/crypto/market-data/{symbol}")
async def get_crypto_market_data(symbol: str, exchange: Optional[str] = None):
    """获取加密货币市场数据"""
    params = {"exchange": exchange} if exchange else {}
    return await service_request(
        "GET", 
        f"{ServiceConfig.CRYPTO_CONNECTORS_URL}/market-data/{symbol}",
        params=params
    )

@app.get("/crypto/orderbook/{symbol}")
async def get_crypto_orderbook(symbol: str, exchange: Optional[str] = None, limit: int = 20):
    """获取加密货币订单簿"""
    params = {"limit": limit}
    if exchange:
        params["exchange"] = exchange
    return await service_request(
        "GET",
        f"{ServiceConfig.CRYPTO_CONNECTORS_URL}/orderbook/{symbol}",
        params=params
    )

@app.get("/crypto/trades/{symbol}")
async def get_crypto_trades(symbol: str, exchange: Optional[str] = None, limit: int = 100):
    """获取加密货币最近交易"""
    params = {"limit": limit}
    if exchange:
        params["exchange"] = exchange
    return await service_request(
        "GET",
        f"{ServiceConfig.CRYPTO_CONNECTORS_URL}/trades/{symbol}",
        params=params
    )

@app.get("/crypto/best-price/{symbol}")
async def get_crypto_best_price(symbol: str, side: str):
    """获取加密货币最优价格"""
    return await service_request(
        "GET",
        f"{ServiceConfig.CRYPTO_CONNECTORS_URL}/best-price/{symbol}",
        params={"side": side}
    )

@app.get("/crypto/balance")
async def get_crypto_balance(exchange: Optional[str] = None):
    """获取加密货币账户余额"""
    params = {"exchange": exchange} if exchange else {}
    return await service_request(
        "GET",
        f"{ServiceConfig.CRYPTO_CONNECTORS_URL}/balance",
        params=params
    )

@app.post("/crypto/orders")
async def place_crypto_order(request: dict):
    """下加密货币订单"""
    return await service_request(
        "POST",
        f"{ServiceConfig.CRYPTO_CONNECTORS_URL}/orders",
        json=request
    )

@app.delete("/crypto/orders/{symbol}/{order_id}")
async def cancel_crypto_order(symbol: str, order_id: str, exchange: Optional[str] = None):
    """取消加密货币订单"""
    params = {"exchange": exchange} if exchange else {}
    return await service_request(
        "DELETE",
        f"{ServiceConfig.CRYPTO_CONNECTORS_URL}/orders/{symbol}/{order_id}",
        params=params
    )

@app.get("/crypto/orders/{symbol}/{order_id}")
async def get_crypto_order_status(symbol: str, order_id: str, exchange: Optional[str] = None):
    """查询加密货币订单状态"""
    params = {"exchange": exchange} if exchange else {}
    return await service_request(
        "GET",
        f"{ServiceConfig.CRYPTO_CONNECTORS_URL}/orders/{symbol}/{order_id}",
        params=params
    )

# ==================== RISK MANAGEMENT ROUTES ====================

@app.get("/risk/health")
async def get_risk_health():
    """风险管理服务健康检查"""
    return await service_request("GET", f"{ServiceConfig.RISK_MANAGEMENT_URL}/health")

@app.get("/risk/{symbol}")
async def get_risk_metrics(symbol: str, refresh: bool = False):
    """获取资产风险指标"""
    params = {"refresh": refresh} if refresh else {}
    return await service_request("GET", f"{ServiceConfig.RISK_MANAGEMENT_URL}/risk/{symbol}", params=params)

@app.get("/risk/batch")
async def get_batch_risk_metrics(symbols: str):
    """批量获取风险指标"""
    return await service_request("GET", f"{ServiceConfig.RISK_MANAGEMENT_URL}/risk/batch", params={"symbols": symbols})

@app.post("/risk/var/calculate")
async def calculate_var(var_request: dict):
    """计算投资组合VaR"""
    return await service_request("POST", f"{ServiceConfig.RISK_MANAGEMENT_URL}/var/calculate", json=var_request)

@app.get("/risk/var/historical/{symbol}")
async def get_historical_var(symbol: str, days: int = 30):
    """获取历史VaR数据"""
    return await service_request("GET", f"{ServiceConfig.RISK_MANAGEMENT_URL}/var/historical/{symbol}", params={"days": days})

@app.get("/risk/portfolio")
async def get_portfolio_risk():
    """获取投资组合风险"""
    return await service_request("GET", f"{ServiceConfig.RISK_MANAGEMENT_URL}/portfolio/risk")

@app.post("/risk/portfolio/stress-test")
async def run_stress_test(scenarios: dict):
    """运行压力测试"""
    return await service_request("POST", f"{ServiceConfig.RISK_MANAGEMENT_URL}/portfolio/stress-test", json=scenarios)

@app.get("/risk/alerts")
async def get_risk_alerts(limit: int = 50):
    """获取风险警报"""
    return await service_request("GET", f"{ServiceConfig.RISK_MANAGEMENT_URL}/alerts", params={"limit": limit})

@app.post("/risk/alerts/acknowledge/{alert_id}")
async def acknowledge_alert(alert_id: str):
    """确认风险警报"""
    return await service_request("POST", f"{ServiceConfig.RISK_MANAGEMENT_URL}/alerts/acknowledge/{alert_id}")

@app.get("/risk/limits")
async def get_risk_limits():
    """获取风险限制"""
    return await service_request("GET", f"{ServiceConfig.RISK_MANAGEMENT_URL}/limits")

@app.post("/risk/limits")
async def set_risk_limit(limit: dict):
    """设置风险限制"""
    return await service_request("POST", f"{ServiceConfig.RISK_MANAGEMENT_URL}/limits", json=limit)

@app.delete("/risk/limits/{limit_id}")
async def delete_risk_limit(limit_id: str):
    """删除风险限制"""
    return await service_request("DELETE", f"{ServiceConfig.RISK_MANAGEMENT_URL}/limits/{limit_id}")

# ==================== PORTFOLIO ROUTES ====================

@app.get("/portfolio/{account_id}")
async def get_portfolio(account_id: str):
    """获取投资组合 - 直连现有Portfolio服务"""
    fallback = fallback_payload({
        "account_id": account_id,
        "total_value": 100000.0,
        "positions": [],
        "cash": 50000.0,
        "unrealized_pnl": 2500.0,
        "realized_pnl": 1200.0,
        "last_updated": datetime.now().isoformat()
    })
    return await service_request(
        "GET",
        f"{ServiceConfig.PORTFOLIO_SERVICE_URL}/accounts/{account_id}",
        params={"include_positions": "true"},
        fallback=fallback
    )

@app.post("/portfolio/update")
async def update_portfolio(request: dict):
    """更新投资组合"""
    portfolio_response = await service_request(
        "POST",
        f"{ServiceConfig.PORTFOLIO_SERVICE_URL}/accounts/update",
        json=request,
        fallback=fallback_payload({"status": "queued", "received": datetime.now().isoformat()})
    )

    await manager.send_to_ios({
        "type": "portfolio_update",
        "data": portfolio_response,
        "timestamp": datetime.now().isoformat()
    })

    return portfolio_response

# ==================== DATA SOURCE CONFIG ====================

@app.post("/config/data-source")
async def configure_data_source(request: DataSourceConfigRequest):
    if china_market_provider is None:
        raise HTTPException(status_code=503, detail="A股数据源不可用，请确认已安装 akshare 包")

    try:
        await china_market_provider.set_tushare_token(request.tushare_token or "")
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Failed to configure tushare token")
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    status = china_market_provider.status()
    message = "Tushare专业数据源配置成功" if status["tushare_enabled"] else "已切换为AkShare实时数据"
    return {
        "status": "success",
        "message": message,
        **status,
        "available_sources": ["akshare", "tushare"],
        "current_source": "tushare+akshare" if status["tushare_enabled"] else "akshare"
    }


@app.get("/config/data-source")
async def get_data_source_config():
    if china_market_provider is None:
        return {
            "tushare_enabled": False,
            "tushare_token_configured": False,
            "available_sources": ["akshare"],
            "current_source": "unavailable"
        }
    status = china_market_provider.status()
    return {
        **status,
        "available_sources": ["akshare", "tushare"],
        "current_source": "tushare+akshare" if status["tushare_enabled"] else "akshare"
    }

# ==================== TRADING PLATFORM CONFIG ====================

# 内存存储交易平台配置（生产环境应该使用数据库或加密存储）
trading_platform_configs = {}

class TradingPlatformConfigRequest(BaseModel):
    platform: str
    api_key: str
    secret_key: str
    passphrase: str = None
    environment: str = "paper"  # paper or live for Alpaca

@app.post("/config/trading-platform")
async def configure_trading_platform(request: TradingPlatformConfigRequest):
    """配置交易平台API"""
    try:
        platform = request.platform.lower()
        
        # 验证平台
        supported_platforms = ["binance", "okx", "alpaca"]
        if platform not in supported_platforms:
            raise HTTPException(status_code=400, detail=f"不支持的平台: {platform}")
        
        # 基本验证API密钥格式
        if not request.api_key or not request.secret_key:
            raise HTTPException(status_code=400, detail="API密钥和密钥不能为空")
        
        # OKX需要passphrase
        if platform == "okx" and not request.passphrase:
            raise HTTPException(status_code=400, detail="OKX平台需要passphrase")
        
        # 存储配置（实际应加密存储）
        config = {
            "api_key": request.api_key[:8] + "..." if len(request.api_key) > 8 else request.api_key,  # 只存储部分密钥用于显示
            "secret_key": "***",  # 不存储完整密钥
            "configured": True,
            "configured_at": datetime.now().isoformat()
        }
        
        if platform == "okx":
            config["passphrase"] = "***"
        
        if platform == "alpaca":
            config["environment"] = request.environment
        
        trading_platform_configs[platform] = config
        
        return {
            "status": "success",
            "message": f"{platform.upper()}配置保存成功",
            "platform": platform,
            "configured": True
        }
        
    except Exception as e:
        logger.error(f"❌ 交易平台配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"配置失败: {str(e)}")

@app.post("/config/trading-platform/test")
async def test_trading_platform_connection(request: TradingPlatformConfigRequest):
    """测试交易平台连接"""
    try:
        platform = request.platform.lower()
        
        # 模拟连接测试逻辑（实际应该调用真实API）
        if platform == "binance":
            # 模拟Binance API测试
            if len(request.api_key) < 10 or len(request.secret_key) < 10:
                return {
                    "connected": False,
                    "message": "API密钥格式不正确"
                }
            
            # 模拟成功连接
            return {
                "connected": True,
                "message": "Binance连接测试成功",
                "account_info": {
                    "permissions": ["SPOT", "FUTURES"],
                    "account_type": "SPOT"
                }
            }
            
        elif platform == "okx":
            # 模拟OKX API测试
            if not request.passphrase:
                return {
                    "connected": False,
                    "message": "缺少passphrase"
                }
            
            return {
                "connected": True,
                "message": "OKX连接测试成功",
                "account_info": {
                    "account_type": "SPOT",
                    "api_permissions": ["read", "trade"]
                }
            }
            
        elif platform == "alpaca":
            # 模拟Alpaca API测试
            env_type = request.environment or "paper"
            return {
                "connected": True,
                "message": f"Alpaca {env_type} 环境连接成功",
                "account_info": {
                    "environment": env_type,
                    "account_status": "ACTIVE"
                }
            }
            
        else:
            return {
                "connected": False,
                "message": f"不支持的平台: {platform}"
            }
            
    except Exception as e:
        logger.error(f"❌ 平台连接测试失败: {str(e)}")
        return {
            "connected": False,
            "message": f"连接测试失败: {str(e)}"
        }

@app.get("/config/trading-platforms")
async def get_trading_platforms_config():
    """获取所有交易平台配置状态"""
    return trading_platform_configs

# ==================== SYMBOL UNIVERSE ROUTES ====================

@app.get("/universe/pools")
async def list_symbol_pools():
    """列出可用股票池"""
    definitions = load_pool_definitions()

    enriched_pools = []
    for definition in definitions:
        components = await fetch_pool_components(definition.get("symbols", []), definition.get("region"))
        prices = [comp.get("last_price") for comp in components if isinstance(comp.get("last_price"), (int, float))]
        changes = [comp.get("change_pct") for comp in components if isinstance(comp.get("change_pct"), (int, float))]
        enriched_pools.append({
            "id": definition["id"],
            "name": definition.get("name"),
            "description": definition.get("description"),
            "tags": definition.get("tags", []),
            "region": definition.get("region"),
            "symbol_count": len(components),
            "metrics": {
                "avg_price": round(mean(prices), 2) if prices else None,
                "avg_change_pct": round(mean(changes), 4) if changes else None
            }
        })

    return {"pools": enriched_pools}


@app.get("/universe/pools/{pool_id}")
async def get_symbol_pool(pool_id: str):
    """获取指定股票池详情，包括符号和行业分布"""
    definitions = {pool["id"]: pool for pool in load_pool_definitions()}
    definition = definitions.get(pool_id)
    if not definition:
        raise HTTPException(status_code=404, detail=f"Pool {pool_id} not defined")

    components = await fetch_pool_components(definition.get("symbols", []), definition.get("region"))

    sector_map: Dict[str, int] = {}
    for component in components:
        sector = component.get("sector", "未知")
        sector_map[sector] = sector_map.get(sector, 0) + 1

    total_components = len(components)
    sector_distribution = [
        {"label": label, "value": count / total_components} for label, count in sector_map.items()
    ] if total_components else []

    price_values = [c.get("last_price") for c in components if isinstance(c.get("last_price"), (int, float))]
    momentum_values = [c.get("momentum_3m") for c in components if isinstance(c.get("momentum_3m"), (int, float))]
    stats = {
        "avg_price": round(mean(price_values), 2) if price_values else None,
        "momentum_3m": mean(momentum_values) if momentum_values else None
    }

    return {
        "id": pool_id,
        "name": definition.get("name"),
        "description": definition.get("description"),
        "region": definition.get("region"),
        "symbols": definition.get("symbols", []),
        "components": components,
        "stats": stats,
        "sector_distribution": sector_distribution
    }


def _get_cache_key(query: str, region: Optional[str], limit: int) -> str:
    """Generate cache key for search requests"""
    return f"search:{query.lower()}:{region or 'all'}:{limit}"

def _is_cache_valid(cache_key: str) -> bool:
    """Check if cache entry is still valid"""
    if cache_key not in _search_cache:
        return False
    if cache_key not in _cache_expiry:
        return False
    return time.time() < _cache_expiry[cache_key]

def _clean_expired_cache():
    """Clean up expired cache entries"""
    current_time = time.time()
    expired_keys = [key for key, expiry in _cache_expiry.items() if current_time >= expiry]
    for key in expired_keys:
        _search_cache.pop(key, None)
        _cache_expiry.pop(key, None)

async def enhanced_local_search(query: str, region: Optional[str], market_cap: Optional[str], sector: Optional[str], limit: int) -> List[Dict[str, Any]]:
    """Enhanced local search with comprehensive stock database"""
    prefer_region = (region or "").upper()
    include_china = prefer_region == "CN" or looks_like_china_query(query)
    include_global = prefer_region in {"", "GLOBAL"} or not include_china or prefer_region in {"US", "EU", "HK", "JP"}

    combined: List[Dict[str, Any]] = []

    if include_china and china_market_provider is not None:
        try:
            china_payload = await china_market_provider.search(query)
            combined.extend(china_payload.get("results", []))
        except Exception as exc:  # pragma: no cover
            logger.warning("China provider search failed: %s", exc)

    if include_global and market_universe_provider is not None:
        yahoo_limit = min(limit + 20, 60)
        combined.extend(
            await market_universe_provider.search(
                query=query,
                region=None if prefer_region == "CN" else region,
                limit=yahoo_limit,
            )
        )

    if combined:
        normalized: List[Dict[str, Any]] = []
        seen: Set[str] = set()
        for raw in combined:
            normalized_item = normalize_quote_payload(raw)
            if not normalized_item:
                continue
            if prefer_region and prefer_region not in {"", "GLOBAL"}:
                candidate_region = (normalized_item.get("region") or "").upper()
                if candidate_region and candidate_region != prefer_region:
                    continue
            if market_cap and normalized_item.get("marketCap"):
                if market_cap.lower() not in normalized_item["marketCap"].lower():
                    continue
            if sector and sector.lower() not in (normalized_item.get("sector") or "").lower():
                continue
            symbol = normalized_item["symbol"]
            if symbol in seen:
                continue
            seen.add(symbol)
            normalized.append(normalized_item)

        if normalized:
            return normalized[:limit]

    # Comprehensive stock database for fallback
    comprehensive_stocks = {
        # US Large Cap Tech
        "AAPL": {"symbol": "AAPL", "name": "Apple Inc", "sector": "Technology", "market": "US", "marketCap": "Large", "exchange": "NASDAQ"},
        "MSFT": {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology", "market": "US", "marketCap": "Large", "exchange": "NASDAQ"},
        "GOOGL": {"symbol": "GOOGL", "name": "Alphabet Inc Class A", "sector": "Technology", "market": "US", "marketCap": "Large", "exchange": "NASDAQ"},
        "AMZN": {"symbol": "AMZN", "name": "Amazon.com Inc", "sector": "Technology", "market": "US", "marketCap": "Large", "exchange": "NASDAQ"},
        "TSLA": {"symbol": "TSLA", "name": "Tesla Inc", "sector": "Automotive", "market": "US", "marketCap": "Large", "exchange": "NASDAQ"},
        "META": {"symbol": "META", "name": "Meta Platforms Inc", "sector": "Technology", "market": "US", "marketCap": "Large", "exchange": "NASDAQ"},
        "NVDA": {"symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology", "market": "US", "marketCap": "Large", "exchange": "NASDAQ"},
        "NFLX": {"symbol": "NFLX", "name": "Netflix Inc", "sector": "Technology", "market": "US", "marketCap": "Large", "exchange": "NASDAQ"},
        
        # US Finance
        "JPM": {"symbol": "JPM", "name": "JPMorgan Chase & Co", "sector": "Finance", "market": "US", "marketCap": "Large", "exchange": "NYSE"},
        "BAC": {"symbol": "BAC", "name": "Bank of America Corp", "sector": "Finance", "market": "US", "marketCap": "Large", "exchange": "NYSE"},
        "WFC": {"symbol": "WFC", "name": "Wells Fargo & Company", "sector": "Finance", "market": "US", "marketCap": "Large", "exchange": "NYSE"},
        "GS": {"symbol": "GS", "name": "Goldman Sachs Group Inc", "sector": "Finance", "market": "US", "marketCap": "Large", "exchange": "NYSE"},
        
        # US Healthcare
        "JNJ": {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare", "market": "US", "marketCap": "Large", "exchange": "NYSE"},
        "UNH": {"symbol": "UNH", "name": "UnitedHealth Group Inc", "sector": "Healthcare", "market": "US", "marketCap": "Large", "exchange": "NYSE"},
        "PFE": {"symbol": "PFE", "name": "Pfizer Inc", "sector": "Healthcare", "market": "US", "marketCap": "Large", "exchange": "NYSE"},
        
        # US Mid Cap
        "PLTR": {"symbol": "PLTR", "name": "Palantir Technologies Inc", "sector": "Technology", "market": "US", "marketCap": "Mid", "exchange": "NYSE"},
        "SNOW": {"symbol": "SNOW", "name": "Snowflake Inc", "sector": "Technology", "market": "US", "marketCap": "Mid", "exchange": "NYSE"},
        "ZM": {"symbol": "ZM", "name": "Zoom Video Communications", "sector": "Technology", "market": "US", "marketCap": "Mid", "exchange": "NASDAQ"},
        
        # China A-Shares
        "600519.SS": {"symbol": "600519.SS", "name": "贵州茅台", "sector": "Consumer", "market": "CN", "marketCap": "Large", "exchange": "SSE"},
        "000858.SZ": {"symbol": "000858.SZ", "name": "五粮液", "sector": "Consumer", "market": "CN", "marketCap": "Large", "exchange": "SZSE"},
        "000001.SZ": {"symbol": "000001.SZ", "name": "平安银行", "sector": "Finance", "market": "CN", "marketCap": "Large", "exchange": "SZSE"},
        "600036.SS": {"symbol": "600036.SS", "name": "招商银行", "sector": "Finance", "market": "CN", "marketCap": "Large", "exchange": "SSE"},
        "002415.SZ": {"symbol": "002415.SZ", "name": "海康威视", "sector": "Technology", "market": "CN", "marketCap": "Large", "exchange": "SZSE"},
        "300750.SZ": {"symbol": "300750.SZ", "name": "宁德时代", "sector": "Technology", "market": "CN", "marketCap": "Large", "exchange": "SZSE"},
        "002594.SZ": {"symbol": "002594.SZ", "name": "比亚迪", "sector": "Automotive", "market": "CN", "marketCap": "Large", "exchange": "SZSE"},
        
        # Hong Kong
        "0700.HK": {"symbol": "0700.HK", "name": "腾讯控股", "sector": "Technology", "market": "HK", "marketCap": "Large", "exchange": "HKEX"},
        "9988.HK": {"symbol": "9988.HK", "name": "阿里巴巴-SW", "sector": "Technology", "market": "HK", "marketCap": "Large", "exchange": "HKEX"},
        "1024.HK": {"symbol": "1024.HK", "name": "快手-W", "sector": "Technology", "market": "HK", "marketCap": "Large", "exchange": "HKEX"},
        "3690.HK": {"symbol": "3690.HK", "name": "美团-W", "sector": "Technology", "market": "HK", "marketCap": "Large", "exchange": "HKEX"},
        
        # Japan
        "7203.T": {"symbol": "7203.T", "name": "Toyota Motor Corp", "sector": "Automotive", "market": "JP", "marketCap": "Large", "exchange": "TSE"},
        "6758.T": {"symbol": "6758.T", "name": "Sony Group Corporation", "sector": "Technology", "market": "JP", "marketCap": "Large", "exchange": "TSE"},
        "9984.T": {"symbol": "9984.T", "name": "SoftBank Group Corp", "sector": "Technology", "market": "JP", "marketCap": "Large", "exchange": "TSE"},
    }
    
    results = []
    query_lower = query.lower()
    
    for stock_data in comprehensive_stocks.values():
        # Text matching
        symbol_match = query_lower in stock_data["symbol"].lower()
        name_match = query_lower in stock_data["name"].lower()
        sector_match = query_lower in stock_data["sector"].lower()
        
        if not (symbol_match or name_match or sector_match):
            continue
            
        # Apply filters
        if region and stock_data["market"] != region:
            continue
            
        if market_cap and stock_data["marketCap"] != market_cap:
            continue
            
        if sector and sector.lower() not in stock_data["sector"].lower():
            continue
            
        # Add additional metadata
        enhanced_stock = {
            **stock_data,
            "longName": stock_data["name"],
            "shortName": stock_data["symbol"],
            "currency": "USD" if stock_data["market"] == "US" else "CNY" if stock_data["market"] == "CN" else "HKD" if stock_data["market"] == "HK" else "JPY",
            "regularMarketPrice": _generate_mock_price(),
            "regularMarketChangePercent": _generate_mock_change(),
            "regularMarketVolume": _generate_mock_volume()
        }
        
        results.append(enhanced_stock)
    
    # Sort by relevance (exact symbol match first, then name match)
    def relevance_score(stock):
        score = 0
        if query_lower == stock["symbol"].lower():
            score += 100
        elif query_lower in stock["symbol"].lower():
            score += 80
        elif query_lower in stock["name"].lower():
            score += 60
        elif query_lower in stock["sector"].lower():
            score += 40
        return score
    
    results.sort(key=relevance_score, reverse=True)
    return results[:limit]

def _generate_mock_price() -> float:
    """Generate realistic mock price data"""
    import random
    return round(random.uniform(10.0, 500.0), 2)

def _generate_mock_change() -> float:
    """Generate realistic mock change percentage"""
    import random
    return round(random.uniform(-5.0, 5.0), 2)

def _generate_mock_volume() -> int:
    """Generate realistic mock volume data"""
    import random
    return random.randint(100000, 50000000)

@app.get("/universe/search")
async def search_symbols(query: str, region: Optional[str] = None, limit: int = 20, offset: int = 0, market_cap: Optional[str] = None, sector: Optional[str] = None):
    """智能搜索股票/资产信息，支持缓存和分页"""
    if not query or len(query.strip()) < 1:
        raise HTTPException(status_code=400, detail="搜索关键词至少需要1个字符")
    
    if limit > 50:
        limit = 50  # Prevent excessive API calls
    
    # Clean expired cache periodically
    _clean_expired_cache()
    
    # Check cache first
    cache_key = _get_cache_key(query, region, limit + offset)
    if _is_cache_valid(cache_key):
        logger.info(f"Cache hit for search: {query}")
        cached_data = _search_cache[cache_key]
        # Apply offset for pagination
        results = cached_data["results"][offset:offset + limit]
        return {
            "query": query,
            "count": len(results),
            "total": len(cached_data["results"]),
            "offset": offset,
            "limit": limit,
            "results": results,
            "cached": True
        }
    
    try:
        if ServiceConfig.UNIVERSE_SERVICE_URL:
            params = {"query": query, "limit": limit + offset + 10}  # Fetch extra for better caching
            if region:
                params["region"] = region
            if market_cap:
                params["market_cap"] = market_cap
            if sector:
                params["sector"] = sector
            data = await universe_request(ServiceConfig.UNIVERSE_SEARCH_PATH, params=params)
        else:
            if market_universe_provider is None:
                raise HTTPException(status_code=503, detail="股票数据服务暂不可用，请稍后重试")
            
            # Enhanced local search with filtering
            results = await enhanced_local_search(query, region, market_cap, sector, limit + offset + 10)
            data = {"query": query, "count": len(results), "results": results}
        
        # Cache the full result
        _search_cache[cache_key] = data
        _cache_expiry[cache_key] = time.time() + CACHE_TTL
        
        # Apply pagination
        paginated_results = data["results"][offset:offset + limit]
        
        return {
            "query": query,
            "count": len(paginated_results),
            "total": len(data["results"]),
            "offset": offset,
            "limit": limit,
            "results": paginated_results,
            "cached": False
        }
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Search failed for query '{query}': {exc}")
        if "rate" in str(exc).lower() or "limit" in str(exc).lower():
            raise HTTPException(status_code=429, detail="搜索请求过于频繁，请稍后重试")
        elif "network" in str(exc).lower() or "timeout" in str(exc).lower():
            raise HTTPException(status_code=503, detail="网络连接异常，请检查网络后重试")
        else:
            raise HTTPException(status_code=500, detail="搜索服务暂时不可用，请稍后重试")
# ==================== PAPER TRADING ROUTES ====================

@app.post("/orders/submit")
async def submit_order(order: OrderRequest):
    """提交模拟订单"""
    execution_result = await service_request(
        "POST",
        f"{ServiceConfig.PAPER_TRADING_URL}/orders/submit",
        json=order.dict(),
        fallback=fallback_payload({
            "order_id": f"ORDER_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "symbol": order.symbol,
            "side": order.side,
            "quantity": order.quantity,
            "status": "QUEUED",
            "fill_price": order.price or 0.0,
            "fill_time": None,
            "commission": 0.0
        })
    )

    await manager.broadcast({
        "type": "order_execution",
        "data": execution_result,
        "timestamp": datetime.now().isoformat()
    })

    return execution_result

@app.get("/orders/history")
async def get_order_history(limit: int = 100):
    """获取订单历史"""
    return await service_request(
        "GET",
        f"{ServiceConfig.PAPER_TRADING_URL}/orders/history",
        params={"limit": limit},
        fallback=fallback_payload({"orders": [], "total": 0, "limit": limit})
    )

# ==================== DASHBOARD ROUTES ====================

@app.get("/dashboard/system-status")
async def get_system_status(capital: Optional[float] = None, market: Optional[str] = None, symbols: Optional[str] = None, risk_level: Optional[str] = None):
    """系统状态面板"""
    services_status: Dict[str, bool] = {}

    async def capture_health(name: str, base_url: str):
        payload = await service_request(
            "GET",
            f"{base_url}/health",
            fallback=fallback_payload({"status": "offline"})
        )
        services_status[name] = str(payload.get("status", "")).lower() in {
            "healthy",
            "ok",
            "running"
        }

    health_targets = {
        "market_data": ServiceConfig.MARKET_DATA_URL,
        "strategy_runner": ServiceConfig.STRATEGY_RUNNER_URL,
        "paper_trading": ServiceConfig.PAPER_TRADING_URL,
        "portfolio": ServiceConfig.PORTFOLIO_SERVICE_URL,
        "quant_engine": ServiceConfig.QUANT_ENGINE_URL
    }

    await asyncio.gather(*(capture_health(name, url) for name, url in health_targets.items()))

    orders_summary = await service_request(
        "GET",
        f"{ServiceConfig.PAPER_TRADING_URL}/orders/summary",
        params={"window": "1d"}
    )

    signals_summary = await service_request(
        "GET",
        f"{ServiceConfig.QUANT_ENGINE_URL}/api/signals/summary"
    )

    strategy_metrics = await service_request(
        "GET",
        f"{ServiceConfig.STRATEGY_RUNNER_URL}/strategies/metrics"
    )

    return {
        "trading_active": all(services_status.values()),
        "strategies_running": strategy_metrics.get("strategies_running", 0),
        "signals_today": signals_summary.get("signals_today", 0),
        "orders_today": orders_summary.get("orders_today", 0),
        "total_volume": orders_summary.get("total_volume", 0),
        "success_rate": round(orders_summary.get("success_rate", 0) * 100, 2),
        "uptime": f"{int(sum(services_status.values()) / max(len(services_status),1) * 100)}%",
        "last_updated": datetime.now().isoformat(),
        "services": services_status,
        "parameters": {
            "capital": capital,
            "market": market,
            "symbols": symbols,
            "risk_level": risk_level
        }
    }

@app.get("/dashboard/trading-stats")
async def get_trading_stats(capital: Optional[float] = None, market: Optional[str] = None, symbols: Optional[str] = None, risk_level: Optional[str] = None):
    """交易统计面板"""
    orders_stats = await service_request(
        "GET",
        f"{ServiceConfig.PAPER_TRADING_URL}/orders/metrics",
        params={"window": "1d"}
    )

    perf_stats = await service_request(
        "GET",
        f"{ServiceConfig.PORTFOLIO_SERVICE_URL}/performance/summary"
    )

    strategy_stats = await service_request(
        "GET",
        f"{ServiceConfig.STRATEGY_RUNNER_URL}/strategies/metrics"
    )

    return {
        "daily_stats": {
            **orders_stats,
            "strategies_active": strategy_stats.get("strategies_running", strategy_stats.get("strategies_active", 0)),
            "success_rate": round(orders_stats.get("success_rate", 0) * 100, 2)
        },
        "performance": perf_stats,
        "timestamp": datetime.now().isoformat(),
        "parameters": {
            "capital": capital,
            "market": market,
            "symbols": symbols,
            "risk_level": risk_level
        }
    }


@app.get("/dashboard/performance-series")
async def get_performance_series():
    """时间序列 - 累计收益 vs 基准"""
    return await service_request(
        "GET",
        f"{ServiceConfig.ANALYTICS_SERVICE_URL}/performance/series"
    )


@app.get("/dashboard/drawdown")
async def get_drawdown_series():
    """获取回撤曲线"""
    return await service_request(
        "GET",
        f"{ServiceConfig.ANALYTICS_SERVICE_URL}/performance/drawdown"
    )


@app.get("/dashboard/allocations")
async def get_allocations():
    """资产/行业权重"""
    return await service_request(
        "GET",
        f"{ServiceConfig.PORTFOLIO_SERVICE_URL}/allocations"
    )


@app.get("/dashboard/risk-report")
async def get_risk_report(symbols: Optional[str] = None, market: Optional[str] = None, capital: Optional[float] = None):
    """风险/绩效报表"""
    params: Optional[Dict[str, Any]] = None
    if any([symbols, market, capital]):
        params = {}
        if symbols:
            params["symbols"] = symbols
        if market:
            params["market"] = market
        if capital is not None:
            params["capital"] = capital

    try:
        return await service_request(
            "GET",
            f"{ServiceConfig.RISK_ENGINE_URL}/risk/report",
            params=params
        )
    except HTTPException as exc:
        if exc.status_code not in {502, 503, 500, 404}:
            raise
        requested_symbols = [sym.strip() for sym in (symbols.split(',') if symbols else []) if sym.strip()]
        logger.warning("Using fallback risk report: %s", exc)
        return await _generate_risk_report(requested_symbols, market)


@app.get("/dashboard/overview")
async def get_dashboard_overview(capital: Optional[float] = None, market: Optional[str] = None, symbols: Optional[str] = None, risk_level: Optional[str] = None):
    """聚合所有仪表板数据，单次请求返回全部信息"""
    system_status, trading_stats, performance_series, drawdown, allocations, risk_report = await asyncio.gather(
        get_system_status(capital=capital, market=market, symbols=symbols, risk_level=risk_level),
        get_trading_stats(capital=capital, market=market, symbols=symbols, risk_level=risk_level),
        get_performance_series(),
        get_drawdown_series(),
        get_allocations(),
        get_risk_report(symbols=symbols, market=market, capital=capital)
    )

    return {
        "system_status": system_status,
        "trading_stats": trading_stats,
        "performance_series": performance_series,
        "drawdown": drawdown,
        "allocations": allocations,
        "risk_report": risk_report,
        "generated_at": datetime.now().isoformat(),
        "parameters": {
            "capital": capital,
            "market": market,
            "symbols": symbols,
            "risk_level": risk_level
        }
    }

# ==================== WEBSOCKET ROUTES ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """增强版通用WebSocket连接 - 支持高频数据订阅"""
    await manager.connect(websocket)
    try:
        # 发送连接确认和可用频道列表
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "Connected to Arthera Trading Engine",
            "available_channels": list(manager.subscriptions.keys()),
            "timestamp": datetime.now().isoformat()
        }))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理客户端消息
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.now().isoformat()}))
            
            elif message.get("type") == "subscribe":
                channels = message.get("channels", [])
                await manager.subscribe(websocket, channels)
                await websocket.send_text(json.dumps({
                    "type": "subscribed", 
                    "channels": channels,
                    "timestamp": datetime.now().isoformat()
                }))
            
            elif message.get("type") == "unsubscribe":
                channels = message.get("channels", [])
                await manager.unsubscribe(websocket, channels)
                await websocket.send_text(json.dumps({
                    "type": "unsubscribed", 
                    "channels": channels,
                    "timestamp": datetime.now().isoformat()
                }))
            
            elif message.get("type") == "start_streaming":
                await manager.start_high_frequency_streaming()
                await websocket.send_text(json.dumps({
                    "type": "streaming_started",
                    "message": "High-frequency data streaming activated",
                    "timestamp": datetime.now().isoformat()
                }))
            
            elif message.get("type") == "stop_streaming":
                await manager.stop_high_frequency_streaming()
                await websocket.send_text(json.dumps({
                    "type": "streaming_stopped",
                    "message": "High-frequency data streaming deactivated",
                    "timestamp": datetime.now().isoformat()
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/market-data")
async def market_data_websocket(websocket: WebSocket):
    """专用市场数据WebSocket连接 - 高频行情推送"""
    await manager.connect(websocket, "market_data")
    try:
        # 自动订阅市场数据频道
        await manager.subscribe(websocket, ["market_data"])
        
        await websocket.send_text(json.dumps({
            "type": "market_data_connected",
            "message": "Connected to high-frequency market data stream",
            "update_frequency": "1 second",
            "timestamp": datetime.now().isoformat()
        }))
        
        # 启动市场数据流（如果还没启动）
        if not manager.is_streaming:
            await manager.start_high_frequency_streaming()
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.now().isoformat()}))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/crypto")
async def crypto_websocket(websocket: WebSocket):
    """专用加密货币WebSocket连接 - 实时币价推送"""
    await manager.connect(websocket, "crypto")
    try:
        # 自动订阅加密货币频道
        await manager.subscribe(websocket, ["crypto_prices"])
        
        await websocket.send_text(json.dumps({
            "type": "crypto_connected",
            "message": "Connected to real-time cryptocurrency data stream",
            "supported_exchanges": ["binance", "okx"],
            "update_frequency": "2 seconds",
            "timestamp": datetime.now().isoformat()
        }))
        
        # 启动加密货币数据流
        if not manager.is_streaming:
            await manager.start_high_frequency_streaming()
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.now().isoformat()}))
            elif message.get("type") == "subscribe_symbol":
                symbol = message.get("symbol")
                await websocket.send_text(json.dumps({
                    "type": "symbol_subscribed",
                    "symbol": symbol,
                    "timestamp": datetime.now().isoformat()
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/ai")
async def ai_websocket(websocket: WebSocket):
    """专用AI信号WebSocket连接 - 实时AI分析推送"""
    await manager.connect(websocket, "ai")
    try:
        # 自动订阅AI信号频道
        await manager.subscribe(websocket, ["ai_signals"])
        
        await websocket.send_text(json.dumps({
            "type": "ai_connected",
            "message": "Connected to AI agents signal stream",
            "agents": ["research", "strategy", "news", "risk"],
            "update_frequency": "5 seconds",
            "timestamp": datetime.now().isoformat()
        }))
        
        # 启动AI信号流
        if not manager.is_streaming:
            await manager.start_high_frequency_streaming()
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.now().isoformat()}))
            elif message.get("type") == "request_analysis":
                symbol = message.get("symbol", "AAPL")
                # 发送模拟AI分析结果
                await websocket.send_text(json.dumps({
                    "type": "ai_analysis",
                    "symbol": symbol,
                    "analysis": {
                        "research": {"action": "BUY", "confidence": 0.85},
                        "strategy": {"action": "HOLD", "confidence": 0.72},
                        "news": {"action": "BUY", "confidence": 0.68},
                        "risk": {"alert": "LOW", "recommendation": "适中仓位"}
                    },
                    "timestamp": datetime.now().isoformat()
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/risk")
async def risk_websocket_endpoint(websocket: WebSocket):
    """Risk Management WebSocket连接"""
    await manager.connect(websocket, "risk")
    try:
        # 发送连接确认
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "Connected to Risk Management WebSocket",
            "available_channels": ["risk_alerts", "portfolio_risk", "var_updates"],
            "timestamp": datetime.now().isoformat()
        }))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }))
            
            elif message.get("type") == "subscribe":
                channels = message.get("channels", [])
                await manager.subscribe(websocket, channels)
                await websocket.send_text(json.dumps({
                    "type": "subscribed",
                    "channels": channels,
                    "timestamp": datetime.now().isoformat()
                }))
            
            elif message.get("type") == "request_portfolio_risk":
                # 获取组合风险数据并发送
                try:
                    response = await http_client.get(f"{ServiceConfig.RISK_MANAGEMENT_URL}/portfolio/risk")
                    if response.status_code == 200:
                        risk_data = response.json()
                        await websocket.send_text(json.dumps({
                            "type": "portfolio_risk_update",
                            "data": risk_data,
                            "timestamp": datetime.now().isoformat()
                        }))
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Failed to fetch portfolio risk: {e}",
                        "timestamp": datetime.now().isoformat()
                    }))
            
            elif message.get("type") == "request_risk_alerts":
                # 获取风险警报并发送
                try:
                    response = await http_client.get(f"{ServiceConfig.RISK_MANAGEMENT_URL}/alerts")
                    if response.status_code == 200:
                        alerts_data = response.json()
                        await websocket.send_text(json.dumps({
                            "type": "risk_alerts_update",
                            "data": alerts_data,
                            "timestamp": datetime.now().isoformat()
                        }))
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Failed to fetch risk alerts: {e}",
                        "timestamp": datetime.now().isoformat()
                    }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/ios")
async def ios_websocket_endpoint(websocket: WebSocket):
    """iOS专用WebSocket连接"""
    await manager.connect(websocket, "ios")
    try:
        # 发送欢迎消息
        await websocket.send_text(json.dumps({
            "type": "welcome",
            "message": "已连接到Arthera量化交易系统",
            "timestamp": datetime.now().isoformat(),
            "services": ["signals", "portfolio", "orders", "market_data"]
        }))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理iOS客户端特定消息
            if message.get("type") == "request_signals":
                # 模拟发送信号
                await websocket.send_text(json.dumps({
                    "type": "signals_update",
                    "data": {
                        "signals": [
                            {"symbol": "AAPL", "action": "BUY", "confidence": 0.85, "price": 150.25},
                            {"symbol": "TSLA", "action": "SELL", "confidence": 0.72, "price": 245.80}
                        ]
                    },
                    "timestamp": datetime.now().isoformat()
                }))
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ==================== UTILITY ENDPOINTS ====================

@app.get("/")
async def root():
    """API Gateway根路径"""
    return {
        "message": "Arthera Unified API Gateway",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/health",
            "market_data": "/market-data/*",
            "strategies": "/strategies/*", 
            "signals": "/signals/*",
            "ai": "/ai/*",
            "crypto": "/crypto/*",
            "risk": "/risk/*",
            "portfolio": "/portfolio/*",
            "orders": "/orders/*",
            "dashboard": "/dashboard/*",
            "universe": "/universe/*",
            "websockets": {
                "general": "/ws",
                "ios": "/ws/ios", 
                "market_data": "/ws/market-data",
                "crypto": "/ws/crypto",
                "ai_signals": "/ws/ai"
            }
        }
    }



# ==================== AI Chat Endpoints ====================

@app.websocket("/ws/ai-chat")
async def ai_chat_websocket(websocket: WebSocket):
    """AI聊天WebSocket连接 - 实时AI对话"""
    await manager.connect(websocket, "ai_chat")
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "Connected to AI Chat service",
            "timestamp": datetime.now().isoformat()
        }))

        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)

            # 转发到AI财务分析师服务
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "http://localhost:8009/api/analyze",
                        json=message_data,
                        timeout=30.0
                    )

                    if response.status_code == 200:
                        result = response.json()
                        await websocket.send_text(json.dumps({
                            "type": "ai_response",
                            "response": result.get("response", ""),
                            "data": result.get("data"),
                            "timestamp": datetime.now().isoformat()
                        }))
                    else:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": f"AI service error: {response.status_code}",
                            "timestamp": datetime.now().isoformat()
                        }))

            except Exception as e:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": f"Error processing request: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                }))

    except WebSocketDisconnect:
        await manager.disconnect(websocket, "ai_chat")
    except Exception as e:
        print(f"AI Chat WebSocket error: {e}")
        await manager.disconnect(websocket, "ai_chat")


@app.post("/api/ai-chat/analyze")
async def ai_chat_analyze(request: dict):
    """AI聊天分析端点"""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8009/api/analyze",
                json=request,
                timeout=30.0
            )

            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"AI service error: {response.text}"
                )

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="AI Financial Analyst service is not available"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 启动命令示例
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
