"""
策略管理API路由 - 集成真实数据源
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import sys
import os
import json
import numpy as np
import pandas as pd

# 添加项目路径
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from data_provider.unified_data_service import get_unified_data_service
from ..dependencies import get_redis

router = APIRouter()

@router.get("/test")
async def test_strategy():
    """策略服务测试"""
    return {"success": True, "message": "Strategy service is running"}

@router.get("/backtests")
async def list_backtests():
    """获取回测列表"""
    return {"success": True, "data": []}

# ============================================================================
# 统一数据服务集成端点 - 策略分析
# ============================================================================

@router.get("/unified/analysis/{symbol}")
async def unified_strategy_analysis(
    symbol: str,
    period: str = Query("1month", regex="^(1week|2weeks|1month|3months|6months|1year)$"),
    strategy_type: str = Query("momentum", regex="^(momentum|mean_reversion|breakout|trend_following)$"),
    redis = Depends(get_redis)
):
    """
    统一策略分析 - 基于真实数据的策略分析
    
    - **symbol**: 股票/加密货币代码
    - **period**: 分析周期
    - **strategy_type**: 策略类型
    """
    try:
        # 生成缓存键
        cache_key = f"unified_strategy_analysis:{symbol}:{period}:{strategy_type}"
        
        # 尝试从缓存获取 (30分钟缓存)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 获取统一数据服务
        unified_service = get_unified_data_service()
        
        # 计算历史数据天数
        days_mapping = {
            "1week": 7, "2weeks": 14, "1month": 30,
            "3months": 90, "6months": 180, "1year": 365
        }
        days = days_mapping.get(period, 30)
        
        # 获取历史价格数据
        historical_result = await unified_service.get_historical_data(
            symbol, days, "daily"
        )
        
        if not historical_result.get("success"):
            raise HTTPException(status_code=500, detail="无法获取历史数据")
        
        price_data = historical_result.get("data", [])
        if len(price_data) < 10:
            raise HTTPException(status_code=400, detail="历史数据不足，无法进行策略分析")
        
        # 执行策略分析
        analysis_result = perform_strategy_analysis(price_data, strategy_type, symbol)
        
        result = {
            "success": True,
            "symbol": symbol,
            "period": period,
            "strategy_type": strategy_type,
            "analysis": analysis_result,
            "data_points": len(price_data),
            "data_source": historical_result.get("source"),
            "timestamp": datetime.now().isoformat()
        }
        
        # 缓存结果 (30分钟)
        await redis.setex(cache_key, 1800, json.dumps(result, default=str))
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Strategy analysis failed: {str(e)}")

@router.post("/unified/backtest")
async def unified_backtest_strategy(
    symbol: str,
    strategy_config: Dict[str, Any],
    start_date: str = Query(..., description="开始日期 YYYY-MM-DD"),
    end_date: str = Query(..., description="结束日期 YYYY-MM-DD"),
    initial_capital: float = Query(10000.0, ge=1000.0),
    redis = Depends(get_redis)
):
    """
    统一策略回测 - 基于真实数据的策略回测
    
    - **symbol**: 交易标的
    - **strategy_config**: 策略配置参数
    - **start_date**: 回测开始日期
    - **end_date**: 回测结束日期  
    - **initial_capital**: 初始资金
    """
    try:
        # 生成缓存键
        cache_key = f"unified_backtest:{symbol}:{start_date}:{end_date}:{hash(str(strategy_config))}"
        
        # 尝试从缓存获取 (1小时缓存)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 获取统一数据服务
        unified_service = get_unified_data_service()
        
        # 计算回测天数
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        days = (end_dt - start_dt).days + 1
        
        if days < 1:
            raise HTTPException(status_code=400, detail="结束日期必须晚于开始日期")
        
        # 获取回测期间的历史数据
        historical_result = await unified_service.get_historical_data(
            symbol, days + 10, "daily"  # 多获取一些数据以防不足
        )
        
        if not historical_result.get("success"):
            raise HTTPException(status_code=500, detail="无法获取历史数据")
        
        # 执行策略回测
        backtest_result = execute_strategy_backtest(
            historical_result.get("data", []),
            strategy_config,
            initial_capital,
            start_date,
            end_date
        )
        
        result = {
            "success": True,
            "symbol": symbol,
            "backtest_period": {
                "start_date": start_date,
                "end_date": end_date,
                "total_days": days
            },
            "strategy_config": strategy_config,
            "initial_capital": initial_capital,
            "backtest_results": backtest_result,
            "data_source": historical_result.get("source"),
            "timestamp": datetime.now().isoformat()
        }
        
        # 缓存结果 (1小时)
        await redis.setex(cache_key, 3600, json.dumps(result, default=str))
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Strategy backtest failed: {str(e)}")

@router.get("/unified/signals/{symbol}")
async def unified_trading_signals(
    symbol: str,
    lookback_days: int = Query(30, ge=7, le=90),
    signal_types: str = Query("all", regex="^(all|technical|sentiment|momentum)$"),
    redis = Depends(get_redis)
):
    """
    统一交易信号 - 基于多数据源的交易信号生成
    
    - **symbol**: 交易标的
    - **lookback_days**: 回看天数
    - **signal_types**: 信号类型
    """
    try:
        # 生成缓存键
        cache_key = f"unified_trading_signals:{symbol}:{lookback_days}:{signal_types}"
        
        # 尝试从缓存获取 (15分钟缓存)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 获取统一数据服务
        unified_service = get_unified_data_service()
        
        # 获取价格数据用于技术分析
        historical_result = await unified_service.get_historical_data(
            symbol, lookback_days + 20, "daily"
        )
        
        signals = {}
        
        if historical_result.get("success"):
            price_data = historical_result.get("data", [])
            if len(price_data) >= 10:
                signals["technical"] = generate_technical_signals(price_data, symbol)
        
        # 获取新闻情绪信号
        if signal_types in ["all", "sentiment"]:
            try:
                news_result = await unified_service.get_stock_news(symbol, lookback_days)
                if news_result.get("success"):
                    news_data = news_result.get("news", [])
                    signals["sentiment"] = generate_sentiment_signals(news_data, symbol)
            except:
                signals["sentiment"] = {"signal": "neutral", "confidence": 0}
        
        # 生成综合信号
        combined_signal = combine_trading_signals(signals)
        
        result = {
            "success": True,
            "symbol": symbol,
            "lookback_days": lookback_days,
            "signal_types": signal_types,
            "signals": signals,
            "combined_signal": combined_signal,
            "data_sources": [historical_result.get("source")],
            "timestamp": datetime.now().isoformat()
        }
        
        # 缓存结果 (15分钟)
        await redis.setex(cache_key, 900, json.dumps(result, default=str))
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trading signals generation failed: {str(e)}")

# ============================================================================
# 策略分析辅助函数
# ============================================================================

def perform_strategy_analysis(price_data: List[Dict], strategy_type: str, symbol: str) -> Dict[str, Any]:
    """执行策略分析"""
    try:
        # 转换为DataFrame便于分析
        df = pd.DataFrame(price_data)
        df['date'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('date')
        df.reset_index(drop=True, inplace=True)
        
        # 计算基本指标
        df['returns'] = df['close'].pct_change()
        df['sma_20'] = df['close'].rolling(window=20).mean()
        df['sma_50'] = df['close'].rolling(window=50).mean()
        df['volatility'] = df['returns'].rolling(window=20).std()
        
        analysis = {
            "basic_stats": {
                "total_return": float((df['close'].iloc[-1] / df['close'].iloc[0] - 1) * 100),
                "volatility": float(df['returns'].std() * np.sqrt(252) * 100),
                "sharpe_ratio": calculate_sharpe_ratio(df['returns']),
                "max_drawdown": calculate_max_drawdown(df['close'])
            },
            "strategy_metrics": {}
        }
        
        # 根据策略类型计算特定指标
        if strategy_type == "momentum":
            analysis["strategy_metrics"] = analyze_momentum_strategy(df)
        elif strategy_type == "mean_reversion":
            analysis["strategy_metrics"] = analyze_mean_reversion_strategy(df)
        elif strategy_type == "breakout":
            analysis["strategy_metrics"] = analyze_breakout_strategy(df)
        elif strategy_type == "trend_following":
            analysis["strategy_metrics"] = analyze_trend_following_strategy(df)
        
        return analysis
        
    except Exception as e:
        return {"error": f"Strategy analysis failed: {str(e)}"}

def execute_strategy_backtest(price_data: List[Dict], strategy_config: Dict, 
                            initial_capital: float, start_date: str, end_date: str) -> Dict[str, Any]:
    """执行策略回测"""
    try:
        # 转换和过滤数据
        df = pd.DataFrame(price_data)
        df['date'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('date')
        
        # 过滤回测期间的数据
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
        df = df[(df['date'].dt.date >= start_dt) & (df['date'].dt.date <= end_dt)].reset_index(drop=True)
        
        if len(df) < 2:
            return {"error": "回测期间数据不足"}
        
        # 简单策略回测逻辑
        portfolio_value = initial_capital
        positions = 0
        trades = []
        portfolio_history = []
        
        strategy_type = strategy_config.get("type", "buy_and_hold")
        
        for i, row in df.iterrows():
            current_price = row['close']
            current_date = row['date'].strftime('%Y-%m-%d')
            
            # 简单买入持有策略示例
            if strategy_type == "buy_and_hold" and i == 0:
                # 首日买入
                positions = portfolio_value / current_price
                trades.append({
                    "date": current_date,
                    "type": "BUY",
                    "price": current_price,
                    "quantity": positions,
                    "value": portfolio_value
                })
            
            # 计算当前组合价值
            current_portfolio_value = positions * current_price
            portfolio_history.append({
                "date": current_date,
                "portfolio_value": current_portfolio_value,
                "price": current_price,
                "positions": positions
            })
        
        # 计算回测结果
        final_value = portfolio_history[-1]["portfolio_value"]
        total_return = (final_value / initial_capital - 1) * 100
        
        return {
            "performance": {
                "initial_capital": initial_capital,
                "final_value": final_value,
                "total_return": round(total_return, 2),
                "total_trades": len(trades),
                "trading_days": len(portfolio_history)
            },
            "trades": trades[:10],  # 限制返回的交易记录
            "portfolio_history": portfolio_history[-30:],  # 限制返回的历史记录
            "strategy_config": strategy_config
        }
        
    except Exception as e:
        return {"error": f"Backtest execution failed: {str(e)}"}

def generate_technical_signals(price_data: List[Dict], symbol: str) -> Dict[str, Any]:
    """生成技术分析信号"""
    try:
        df = pd.DataFrame(price_data)
        df['date'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('date').tail(50)  # 取最近50个交易日
        
        # 计算技术指标
        df['sma_20'] = df['close'].rolling(window=20).mean()
        df['ema_12'] = df['close'].ewm(span=12).mean()
        df['ema_26'] = df['close'].ewm(span=26).mean()
        df['rsi'] = calculate_rsi(df['close'], 14)
        
        latest = df.iloc[-1]
        
        # 生成信号
        signals = []
        
        # 移动平均线信号
        if latest['close'] > latest['sma_20']:
            signals.append({"type": "SMA", "signal": "bullish", "strength": 0.6})
        else:
            signals.append({"type": "SMA", "signal": "bearish", "strength": 0.6})
        
        # RSI信号
        if latest['rsi'] > 70:
            signals.append({"type": "RSI", "signal": "bearish", "strength": 0.8})
        elif latest['rsi'] < 30:
            signals.append({"type": "RSI", "signal": "bullish", "strength": 0.8})
        else:
            signals.append({"type": "RSI", "signal": "neutral", "strength": 0.3})
        
        # MACD信号
        macd = latest['ema_12'] - latest['ema_26']
        if macd > 0:
            signals.append({"type": "MACD", "signal": "bullish", "strength": 0.7})
        else:
            signals.append({"type": "MACD", "signal": "bearish", "strength": 0.7})
        
        # 综合技术信号
        bullish_count = sum(1 for s in signals if s["signal"] == "bullish")
        bearish_count = sum(1 for s in signals if s["signal"] == "bearish")
        
        if bullish_count > bearish_count:
            overall_signal = "bullish"
        elif bearish_count > bullish_count:
            overall_signal = "bearish"
        else:
            overall_signal = "neutral"
        
        return {
            "overall_signal": overall_signal,
            "confidence": round(max(bullish_count, bearish_count) / len(signals), 2),
            "individual_signals": signals,
            "current_price": float(latest['close']),
            "rsi": round(float(latest['rsi']), 2)
        }
        
    except Exception as e:
        return {"error": f"Technical analysis failed: {str(e)}"}

def generate_sentiment_signals(news_data: List[Dict], symbol: str) -> Dict[str, Any]:
    """基于新闻情绪生成信号"""
    try:
        if not news_data:
            return {"signal": "neutral", "confidence": 0, "news_count": 0}
        
        # 分析新闻情绪
        positive_count = 0
        negative_count = 0
        
        for news in news_data:
            sentiment = news.get("sentiment", "neutral")
            if sentiment == "positive":
                positive_count += 1
            elif sentiment == "negative":
                negative_count += 1
        
        total_news = len(news_data)
        positive_ratio = positive_count / total_news
        negative_ratio = negative_count / total_news
        
        if positive_ratio > 0.6:
            signal = "bullish"
            confidence = positive_ratio
        elif negative_ratio > 0.6:
            signal = "bearish"
            confidence = negative_ratio
        else:
            signal = "neutral"
            confidence = 0.5
        
        return {
            "signal": signal,
            "confidence": round(confidence, 2),
            "news_count": total_news,
            "positive_news": positive_count,
            "negative_news": negative_count,
            "sentiment_score": round(positive_ratio - negative_ratio, 2)
        }
        
    except Exception as e:
        return {"error": f"Sentiment analysis failed: {str(e)}"}

def combine_trading_signals(signals: Dict[str, Any]) -> Dict[str, Any]:
    """综合多个信号源"""
    try:
        signal_weights = {
            "technical": 0.6,
            "sentiment": 0.4
        }
        
        weighted_score = 0
        total_weight = 0
        signal_details = []
        
        for signal_type, weight in signal_weights.items():
            if signal_type in signals and "error" not in signals[signal_type]:
                signal_data = signals[signal_type]
                
                if signal_type == "technical":
                    signal_value = signal_data.get("overall_signal", "neutral")
                    confidence = signal_data.get("confidence", 0)
                else:
                    signal_value = signal_data.get("signal", "neutral")
                    confidence = signal_data.get("confidence", 0)
                
                # 转换信号为数值
                signal_score = {"bullish": 1, "neutral": 0, "bearish": -1}.get(signal_value, 0)
                
                weighted_score += signal_score * confidence * weight
                total_weight += weight
                
                signal_details.append({
                    "type": signal_type,
                    "signal": signal_value,
                    "confidence": confidence,
                    "weight": weight
                })
        
        if total_weight > 0:
            final_score = weighted_score / total_weight
        else:
            final_score = 0
        
        # 确定最终信号
        if final_score > 0.3:
            final_signal = "bullish"
        elif final_score < -0.3:
            final_signal = "bearish"
        else:
            final_signal = "neutral"
        
        return {
            "final_signal": final_signal,
            "signal_strength": round(abs(final_score), 2),
            "raw_score": round(final_score, 3),
            "signal_breakdown": signal_details,
            "recommendation": get_recommendation(final_signal, abs(final_score))
        }
        
    except Exception as e:
        return {"error": f"Signal combination failed: {str(e)}"}

# ============================================================================
# 技术分析辅助函数
# ============================================================================

def calculate_rsi(prices: pd.Series, window: int = 14) -> pd.Series:
    """计算RSI指标"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_sharpe_ratio(returns: pd.Series, risk_free_rate: float = 0.02) -> float:
    """计算夏普比率"""
    try:
        excess_returns = returns.mean() * 252 - risk_free_rate
        volatility = returns.std() * np.sqrt(252)
        return float(excess_returns / volatility) if volatility != 0 else 0
    except:
        return 0

def calculate_max_drawdown(prices: pd.Series) -> float:
    """计算最大回撤"""
    try:
        cumulative = (1 + prices.pct_change()).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative / running_max - 1)
        return float(drawdown.min() * 100)
    except:
        return 0

def analyze_momentum_strategy(df: pd.DataFrame) -> Dict[str, Any]:
    """动量策略分析"""
    df['momentum'] = df['close'].pct_change(20)  # 20日动量
    
    return {
        "current_momentum": float(df['momentum'].iloc[-1]) if not pd.isna(df['momentum'].iloc[-1]) else 0,
        "avg_momentum": float(df['momentum'].mean()) if not df['momentum'].isna().all() else 0,
        "momentum_signals": "bullish" if df['momentum'].iloc[-1] > 0 else "bearish"
    }

def analyze_mean_reversion_strategy(df: pd.DataFrame) -> Dict[str, Any]:
    """均值回归策略分析"""
    df['price_deviation'] = (df['close'] - df['sma_20']) / df['sma_20'] * 100
    
    return {
        "current_deviation": float(df['price_deviation'].iloc[-1]) if not pd.isna(df['price_deviation'].iloc[-1]) else 0,
        "avg_deviation": float(df['price_deviation'].mean()) if not df['price_deviation'].isna().all() else 0,
        "reversion_signal": "oversold" if df['price_deviation'].iloc[-1] < -5 else ("overbought" if df['price_deviation'].iloc[-1] > 5 else "neutral")
    }

def analyze_breakout_strategy(df: pd.DataFrame) -> Dict[str, Any]:
    """突破策略分析"""
    df['high_20'] = df['close'].rolling(window=20).max()
    df['low_20'] = df['close'].rolling(window=20).min()
    
    current_price = df['close'].iloc[-1]
    resistance = df['high_20'].iloc[-1]
    support = df['low_20'].iloc[-1]
    
    return {
        "resistance_level": float(resistance) if not pd.isna(resistance) else float(current_price),
        "support_level": float(support) if not pd.isna(support) else float(current_price),
        "breakout_signal": "upward" if current_price > resistance else ("downward" if current_price < support else "consolidation")
    }

def analyze_trend_following_strategy(df: pd.DataFrame) -> Dict[str, Any]:
    """趋势跟踪策略分析"""
    trend_strength = (df['sma_20'].iloc[-1] - df['sma_50'].iloc[-1]) / df['sma_50'].iloc[-1] * 100 if not pd.isna(df['sma_50'].iloc[-1]) else 0
    
    return {
        "trend_strength": float(trend_strength),
        "trend_direction": "uptrend" if trend_strength > 1 else ("downtrend" if trend_strength < -1 else "sideways"),
        "sma_20": float(df['sma_20'].iloc[-1]) if not pd.isna(df['sma_20'].iloc[-1]) else 0,
        "sma_50": float(df['sma_50'].iloc[-1]) if not pd.isna(df['sma_50'].iloc[-1]) else 0
    }

def get_recommendation(signal: str, strength: float) -> str:
    """获取交易建议"""
    if signal == "bullish":
        if strength > 0.7:
            return "Strong Buy"
        elif strength > 0.5:
            return "Buy"
        else:
            return "Weak Buy"
    elif signal == "bearish":
        if strength > 0.7:
            return "Strong Sell"
        elif strength > 0.5:
            return "Sell"
        else:
            return "Weak Sell"
    else:
        return "Hold"