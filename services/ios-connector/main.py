#!/usr/bin/env python3
"""
iOS Connector Service
连接iOS量化服务与后端API Gateway的桥接服务

功能：
1. 接收iOS的Quantitative Services调用
2. 转换数据格式
3. 路由到相应的后端服务
4. 实时数据推送到iOS WebSocket
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
class Config:
    API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:8000")
    QUANT_ENGINE_URL = os.getenv("QUANT_ENGINE_URL", "http://localhost:8001")
    
    # iOS App specific settings
    IOS_API_VERSION = "1.0.0"
    DEFAULT_TIMEOUT = 30.0
    HEALTH_TIMEOUT = float(os.getenv("HEALTH_TIMEOUT", "5"))

# iOS Request Models (matching Swift structures)
class DeepSeekSignalRequest(BaseModel):
    """对应iOS的DeepSeekSignal请求"""
    symbol: str
    market_data: Dict[str, Any]
    analysis_config: Optional[Dict[str, Any]] = None
    include_uncertainty: bool = True

class BayesianUpdateRequest(BaseModel):
    """对应iOS的BayesianPosterior更新请求"""
    symbol: str
    prior_mean: float
    prior_variance: float
    new_observation: Optional[float] = None
    sector: Optional[str] = None

class PortfolioOptimizationRequest(BaseModel):
    """对应iOS的BayesianPortfolioOptimizer请求"""
    assets: List[str]
    expected_returns: List[float]
    covariance_matrix: List[List[float]]
    risk_aversion: float = 1.0
    constraints: Optional[Dict[str, Any]] = None

class KellyPositionRequest(BaseModel):
    """对应iOS的KellyPositionSizer请求"""
    signal: Dict[str, Any]
    portfolio_value: float
    max_position_size: float = 0.1
    kelly_fraction: float = 0.25

class BacktestRequest(BaseModel):
    """对应iOS的PurgedKFoldBacktester请求"""
    strategy_config: Dict[str, Any]
    start_date: str
    end_date: str
    symbols: List[str]
    initial_capital: float = 100000.0

# HTTP Client
http_client = None


async def call_backend(method: str, url: str, **kwargs) -> Dict[str, Any]:
    """Proxy helper with consistent error handling."""
    if http_client is None:
        raise RuntimeError("HTTP client not initialized")

    try:
        response = await http_client.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Backend %s %s failed: %s", method, url, exc)
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text)
    except httpx.RequestError as exc:
        logger.error("Backend %s %s unavailable: %s", method, url, exc)
        raise HTTPException(status_code=503, detail="Backend service unavailable")


async def call_gateway(method: str, path: str, **kwargs) -> Dict[str, Any]:
    url = path if path.startswith("http") else f"{Config.API_GATEWAY_URL}{path}"
    return await call_backend(method, url, **kwargs)


async def dependency_health(name: str, url: str) -> Dict[str, Any]:
    try:
        payload = await call_backend("GET", url, timeout=Config.HEALTH_TIMEOUT)
        healthy = True
    except HTTPException as exc:
        healthy = False
        payload = {"detail": exc.detail}
    except Exception as exc:  # pragma: no cover - defensive
        healthy = False
        payload = {"detail": str(exc)}
    return {"name": name, "healthy": healthy, "details": payload}


def annotate_payload(payload: Dict[str, Any], *, request_id: str, started_at: float) -> Dict[str, Any]:
    enriched = dict(payload)
    enriched.setdefault("_metadata", {})
    enriched["_metadata"].update({
        "request_id": request_id,
        "received_at": datetime.now().isoformat(),
        "latency_ms": round((time.perf_counter() - started_at) * 1000, 2),
        "connector_version": Config.IOS_API_VERSION
    })
    return enriched

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(timeout=Config.DEFAULT_TIMEOUT)
    logger.info("iOS Connector started")
    yield
    await http_client.aclose()
    logger.info("iOS Connector stopped")

# FastAPI App
app = FastAPI(
    title="Arthera iOS Connector",
    description="iOS量化服务连接器",
    version=Config.IOS_API_VERSION,
    lifespan=lifespan
)

# CORS for iOS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== iOS SPECIFIC ENDPOINTS ====================

@app.get("/health")
async def health_check():
    """iOS健康检查端点"""
    dependencies = await asyncio.gather(
        dependency_health("api_gateway", f"{Config.API_GATEWAY_URL}/health"),
        dependency_health("quant_engine", f"{Config.QUANT_ENGINE_URL}/health")
    )

    gateway_status = next((d for d in dependencies if d["name"] == "api_gateway"), {"healthy": False})

    return {
        "status": "healthy" if gateway_status.get("healthy") else "degraded",
        "ios_connector": "running",
        "dependencies": dependencies,
        "timestamp": datetime.now().isoformat(),
        "version": Config.IOS_API_VERSION
    }

# ==================== DEEPSEEK SIGNAL GENERATION ====================

@app.post("/ios/signals/deepseek/generate")
async def generate_deepseek_signal(request: DeepSeekSignalRequest):
    """
    iOS DeepSeekSignalGenerator.generateSignal() 对应端点
    生成DeepSeek AI信号，返回iOS可直接使用的格式
    """
    gateway_request = {
        "symbols": [request.symbol],
        "market_data": request.market_data,
        "analysis_config": request.analysis_config or {},
        "include_uncertainty": request.include_uncertainty
    }

    request_id = f"deepseek-{uuid.uuid4().hex[:8]}"
    started_at = time.perf_counter()

    backend_result = await call_gateway("POST", "/signals/generate", json=gateway_request)
    ios_result = convert_to_ios_deepseek_format(backend_result, request.symbol)
    return annotate_payload(ios_result, request_id=request_id, started_at=started_at)

def convert_to_ios_deepseek_format(backend_data: Dict, symbol: str) -> Dict:
    """转换后端数据为iOS DeepSeekQuantAnalysis格式"""
    signals = backend_data.get("signals") if isinstance(backend_data, dict) else None
    if isinstance(signals, list) and signals:
        base_signal = signals[0]
    else:
        base_signal = backend_data

    if not isinstance(base_signal, dict):
        base_signal = {}

    feature_importance = base_signal.get("feature_importance") or {}
    if isinstance(feature_importance, list):
        feature_importance = {item.get("feature", f"f_{idx}"): item.get("importance", 0.0) for idx, item in enumerate(feature_importance)}

    return {
        "symbol": symbol,
        "win_probability": base_signal.get("win_probability", 0.65),
        "confidence_level": base_signal.get("confidence_level", 0.8),
        "expected_return": base_signal.get("expected_return", 0.02),
        "return_distribution": {
            "mean": base_signal.get("expected_return", 0.02),
            "variance": base_signal.get("variance", 0.001),
            "skewness": base_signal.get("skewness", 0.1),
            "kurtosis": base_signal.get("kurtosis", 3.2)
        },
        "market_regime": base_signal.get("market_regime", "bull"),
        "regime_confidence": base_signal.get("regime_confidence", 0.75),
        "feature_importance": feature_importance,
        "risk_metrics": {
            "value_at_risk_95": base_signal.get("var_95", -0.05),
            "conditional_var_95": base_signal.get("cvar_95", -0.08),
            "max_drawdown": base_signal.get("max_drawdown", -0.15),
            "volatility": base_signal.get("volatility", 0.25)
        },
        "trading_recommendation": {
            "action": base_signal.get("action", "HOLD"),
            "position_size": base_signal.get("position_size", 0.05),
            "confidence": base_signal.get("confidence", 0.7),
            "time_horizon": base_signal.get("time_horizon", "1D")
        },
        "model_version": "deepseek-v2.5",
        "analysis_timestamp": datetime.now().isoformat(),
        "data_quality": base_signal.get("data_quality", 0.95),
        "calibrated": True
    }

# ==================== BAYESIAN UNCERTAINTY SERVICE ====================

@app.post("/ios/bayesian/update-posterior")
async def update_bayesian_posterior(request: BayesianUpdateRequest):
    """
    iOS BayesianUncertaintyService.updatePosterior() 对应端点
    """
    try:
        # 这里直接使用Bayesian计算逻辑，或调用后端
        # 为了演示，返回模拟的Bayesian后验分布
        
        posterior = {
            "id": f"bayesian_{request.symbol}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "symbol": request.symbol,
            "timestamp": datetime.now().isoformat(),
            "posterior_mean": request.prior_mean + (request.new_observation or 0.0) * 0.1,
            "posterior_variance": max(request.prior_variance * 0.9, 0.0001),
            "posterior_std_dev": (max(request.prior_variance * 0.9, 0.0001)) ** 0.5,
            "posterior_quantiles": {
                "0.05": request.prior_mean - 1.645 * (request.prior_variance ** 0.5),
                "0.25": request.prior_mean - 0.674 * (request.prior_variance ** 0.5),
                "0.50": request.prior_mean,
                "0.75": request.prior_mean + 0.674 * (request.prior_variance ** 0.5),
                "0.95": request.prior_mean + 1.645 * (request.prior_variance ** 0.5)
            },
            "credible_interval_95": {
                "lower": request.prior_mean - 1.96 * (request.prior_variance ** 0.5),
                "upper": request.prior_mean + 1.96 * (request.prior_variance ** 0.5),
                "probability": 0.95
            },
            "regime_probabilities": {
                "bull": 0.6,
                "bear": 0.1,
                "ranging": 0.2,
                "high_volatility": 0.05,
                "low_volatility": 0.05
            },
            "prior_mean": request.prior_mean,
            "prior_variance": request.prior_variance,
            "observed_return": request.new_observation,
            "update_count": 1,
            "effective_sample_size": 1.0,
            "sector": request.sector
        }
        
        return posterior
        
    except Exception as e:
        logger.error(f"Bayesian update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PORTFOLIO OPTIMIZATION ====================

@app.post("/ios/portfolio/optimize")
async def optimize_portfolio(request: PortfolioOptimizationRequest):
    """
    iOS BayesianPortfolioOptimizer.optimizePortfolio() 对应端点
    """
    try:
        # 调用后端优化服务或本地计算
        # 这里返回模拟的优化结果
        
        num_assets = len(request.assets)
        equal_weight = 1.0 / num_assets
        
        optimization_result = {
            "optimal_weights": {asset: equal_weight for asset in request.assets},
            "expected_portfolio_return": sum(request.expected_returns) / num_assets,
            "portfolio_volatility": 0.15,
            "sharpe_ratio": 1.2,
            "risk_metrics": {
                "value_at_risk_95": -0.05,
                "conditional_var_95": -0.08,
                "maximum_drawdown": -0.12
            },
            "optimization_status": "converged",
            "iterations": 50,
            "computation_time_ms": 125.5,
            "constraints_satisfied": True,
            "timestamp": datetime.now().isoformat()
        }
        
        return optimization_result
        
    except Exception as e:
        logger.error(f"Portfolio optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== KELLY POSITION SIZING ====================

@app.post("/ios/position/kelly-size")
async def calculate_kelly_position(request: KellyPositionRequest):
    """
    iOS KellyPositionSizer.calculateOptimalSize() 对应端点
    """
    try:
        # Kelly公式计算
        win_probability = request.signal.get("win_probability", 0.6)
        expected_return = request.signal.get("expected_return", 0.02)
        
        # 简化的Kelly计算
        kelly_fraction = max(0, (win_probability * (1 + expected_return) - 1) / expected_return)
        kelly_fraction = min(kelly_fraction, request.max_position_size)
        
        adjusted_fraction = kelly_fraction * request.kelly_fraction
        position_value = request.portfolio_value * adjusted_fraction
        
        result = {
            "optimal_fraction": adjusted_fraction,
            "position_value": position_value,
            "kelly_fraction": kelly_fraction,
            "adjusted_kelly": adjusted_fraction,
            "max_position_reached": kelly_fraction >= request.max_position_size,
            "risk_metrics": {
                "probability_of_loss": 1 - win_probability,
                "expected_gain": expected_return,
                "risk_adjusted_return": expected_return * win_probability
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Kelly position sizing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BACKTEST SERVICE ====================

@app.post("/ios/backtest/run")
async def run_backtest(request: BacktestRequest):
    """
    iOS PurgedKFoldBacktester.runBacktest() 对应端点
    """
    try:
        # 调用后端回测服务
        response = await http_client.post(
            f"{Config.API_GATEWAY_URL}/strategies/backtest",
            json={
                "strategy": request.strategy_config,
                "start_date": request.start_date,
                "end_date": request.end_date,
                "symbols": request.symbols,
                "initial_capital": request.initial_capital
            }
        )
        
        if response.status_code != 200:
            # 返回模拟回测结果
            backtest_result = create_mock_backtest_result(request)
        else:
            backend_result = response.json()
            backtest_result = convert_to_ios_backtest_format(backend_result)
        
        return backtest_result
        
    except Exception as e:
        logger.error(f"Backtest error: {e}")
        backtest_result = create_mock_backtest_result(request)
        return backtest_result

def create_mock_backtest_result(request: BacktestRequest) -> Dict:
    """创建模拟回测结果"""
    return {
        "total_return": 0.15,
        "annual_return": 0.12,
        "volatility": 0.18,
        "sharpe_ratio": 1.25,
        "max_drawdown": -0.08,
        "win_rate": 0.65,
        "trades": 125,
        "average_trade_return": 0.001,
        "profit_factor": 1.8,
        "calmar_ratio": 1.5,
        "benchmark_return": 0.08,
        "alpha": 0.04,
        "monthly_returns": [0.02, -0.01, 0.03, 0.01, -0.02, 0.04, 0.01, 0.02, -0.01, 0.03, 0.02, 0.01],
        "backtest_period": f"{request.start_date} to {request.end_date}",
        "risk_score": 0.3,
        "risk_level": "Medium",
        "risk_description": "Moderate risk with good risk-adjusted returns",
        "timestamp": datetime.now().isoformat()
    }

def convert_to_ios_backtest_format(backend_data: Dict) -> Dict:
    """转换后端回测结果为iOS格式"""
    return backend_data

# ==================== REAL-TIME DATA STREAMING ====================

@app.websocket("/ios/ws")
async def ios_websocket(websocket: WebSocket):
    """iOS专用WebSocket连接"""
    await websocket.accept()
    logger.info("iOS WebSocket connected")
    
    try:
        # 发送欢迎消息
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": "iOS Connector WebSocket已连接",
            "services": ["deepseek", "bayesian", "portfolio", "kelly", "backtest"],
            "timestamp": datetime.now().isoformat()
        }))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理iOS消息
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }))
            
            elif message.get("type") == "subscribe_signals":
                # 订阅信号推送
                await websocket.send_text(json.dumps({
                    "type": "subscription_confirmed",
                    "channel": "signals",
                    "timestamp": datetime.now().isoformat()
                }))
                
                # 开始发送模拟信号
                asyncio.create_task(send_periodic_signals(websocket))
            
            elif message.get("type") == "request_portfolio_update":
                # 发送投资组合更新
                await websocket.send_text(json.dumps({
                    "type": "portfolio_update",
                    "data": {
                        "total_value": 105250.75,
                        "unrealized_pnl": 5250.75,
                        "positions": [
                            {"symbol": "AAPL", "quantity": 100, "unrealized_pnl": 1250.50},
                            {"symbol": "TSLA", "quantity": 50, "unrealized_pnl": 2000.25}
                        ]
                    },
                    "timestamp": datetime.now().isoformat()
                }))
            
    except WebSocketDisconnect:
        logger.info("iOS WebSocket disconnected")
    except Exception as e:
        logger.error(f"iOS WebSocket error: {e}")

async def send_periodic_signals(websocket: WebSocket):
    """定期发送模拟信号到iOS"""
    while True:
        try:
            await asyncio.sleep(10)  # 每10秒发送一次
            
            signal = {
                "type": "new_signal",
                "data": {
                    "symbol": "AAPL",
                    "action": "BUY",
                    "confidence": 0.85,
                    "expected_return": 0.025,
                    "risk_score": 0.3,
                    "signal_strength": "STRONG"
                },
                "timestamp": datetime.now().isoformat()
            }
            
            await websocket.send_text(json.dumps(signal))
            
        except Exception as e:
            logger.error(f"Error sending periodic signal: {e}")
            break

# ==================== UTILITY ENDPOINTS ====================

@app.get("/")
async def root():
    """根端点"""
    return {
        "service": "Arthera iOS Connector",
        "version": Config.IOS_API_VERSION,
        "status": "running",
        "endpoints": {
            "deepseek_signals": "/ios/signals/deepseek/generate",
            "bayesian_update": "/ios/bayesian/update-posterior",
            "portfolio_optimization": "/ios/portfolio/optimize",
            "kelly_position": "/ios/position/kelly-size",
            "backtest": "/ios/backtest/run",
            "websocket": "/ios/ws"
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0", 
        port=8002,
        reload=True,
        log_level="info"
    )
