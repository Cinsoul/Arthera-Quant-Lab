"""
量化策略引擎
支持用户自定义策略和回测执行
"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class Position:
    """持仓信息"""
    symbol: str
    quantity: int
    price: float
    value: float
    weight: float
    entry_date: datetime
    entry_price: float
    pnl: float
    pnl_percent: float

@dataclass
class Trade:
    """交易记录"""
    symbol: str
    action: str  # buy/sell
    quantity: int
    price: float
    commission: float
    timestamp: datetime
    reason: str

@dataclass
class BacktestResult:
    """回测结果"""
    total_return: float
    annual_return: float
    volatility: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    profit_loss_ratio: float
    total_trades: int
    benchmark_return: float
    excess_return: float
    equity_curve: List[Dict]
    trades: List[Trade]
    positions: List[Position]
    risk_metrics: Dict[str, float]

class Portfolio:
    """投资组合管理"""
    
    def __init__(self, initial_capital: float, config: Dict[str, Any]):
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.positions: Dict[str, Position] = {}
        self.trades: List[Trade] = []
        self.config = config
        
        # 配置参数
        self.commission_rate = config.get("trading", {}).get("commission", 0.0003)
        self.max_position_size = config.get("asset", {}).get("max_position_size", 0.2)
        self.max_positions = config.get("asset", {}).get("max_positions", 20)
        
    def get_total_value(self, current_prices: Dict[str, float]) -> float:
        """获取组合总价值"""
        position_value = sum(
            pos.quantity * current_prices.get(pos.symbol, pos.price)
            for pos in self.positions.values()
        )
        return self.cash + position_value
    
    def get_position_weight(self, symbol: str, current_prices: Dict[str, float]) -> float:
        """获取单个股票的仓位权重"""
        if symbol not in self.positions:
            return 0.0
        
        total_value = self.get_total_value(current_prices)
        if total_value <= 0:
            return 0.0
            
        position_value = self.positions[symbol].quantity * current_prices.get(symbol, 0)
        return position_value / total_value
    
    def can_buy(self, symbol: str, quantity: int, price: float, current_prices: Dict[str, float]) -> bool:
        """检查是否可以买入"""
        trade_value = quantity * price
        commission = trade_value * self.commission_rate
        total_cost = trade_value + commission
        
        # 检查现金是否充足
        if self.cash < total_cost:
            return False
        
        # 检查是否超过最大持仓数量
        if symbol not in self.positions and len(self.positions) >= self.max_positions:
            return False
        
        # 检查是否超过最大仓位限制
        total_value = self.get_total_value(current_prices)
        position_weight = trade_value / total_value
        
        if symbol in self.positions:
            current_weight = self.get_position_weight(symbol, current_prices)
            position_weight += current_weight
        
        if position_weight > self.max_position_size:
            return False
        
        return True
    
    def buy(self, symbol: str, quantity: int, price: float, timestamp: datetime, reason: str = "") -> bool:
        """买入股票"""
        trade_value = quantity * price
        commission = trade_value * self.commission_rate
        total_cost = trade_value + commission
        
        if self.cash < total_cost:
            return False
        
        # 执行交易
        self.cash -= total_cost
        
        if symbol in self.positions:
            # 增加持仓
            pos = self.positions[symbol]
            total_quantity = pos.quantity + quantity
            total_cost_basis = pos.quantity * pos.entry_price + trade_value
            new_avg_price = total_cost_basis / total_quantity
            
            pos.quantity = total_quantity
            pos.entry_price = new_avg_price
            pos.value = total_quantity * price
        else:
            # 新建持仓
            self.positions[symbol] = Position(
                symbol=symbol,
                quantity=quantity,
                price=price,
                value=trade_value,
                weight=0.0,  # 稍后计算
                entry_date=timestamp,
                entry_price=price,
                pnl=0.0,
                pnl_percent=0.0
            )
        
        # 记录交易
        self.trades.append(Trade(
            symbol=symbol,
            action="buy",
            quantity=quantity,
            price=price,
            commission=commission,
            timestamp=timestamp,
            reason=reason
        ))
        
        return True
    
    def sell(self, symbol: str, quantity: int, price: float, timestamp: datetime, reason: str = "") -> bool:
        """卖出股票"""
        if symbol not in self.positions:
            return False
        
        pos = self.positions[symbol]
        if pos.quantity < quantity:
            return False
        
        # 执行交易
        trade_value = quantity * price
        commission = trade_value * self.commission_rate
        net_proceeds = trade_value - commission
        
        self.cash += net_proceeds
        
        # 更新持仓
        pos.quantity -= quantity
        pos.value = pos.quantity * price
        
        if pos.quantity == 0:
            del self.positions[symbol]
        
        # 记录交易
        self.trades.append(Trade(
            symbol=symbol,
            action="sell",
            quantity=quantity,
            price=price,
            commission=commission,
            timestamp=timestamp,
            reason=reason
        ))
        
        return True
    
    def update_positions(self, current_prices: Dict[str, float], timestamp: datetime):
        """更新持仓信息"""
        total_value = self.get_total_value(current_prices)
        
        for symbol, pos in self.positions.items():
            current_price = current_prices.get(symbol, pos.price)
            pos.price = current_price
            pos.value = pos.quantity * current_price
            pos.weight = pos.value / total_value if total_value > 0 else 0
            pos.pnl = (current_price - pos.entry_price) * pos.quantity
            pos.pnl_percent = (current_price - pos.entry_price) / pos.entry_price * 100

class StrategyEngine:
    """策略引擎"""
    
    def __init__(self):
        self.strategies: Dict[str, Callable] = {}
        self.register_default_strategies()
    
    def register_strategy(self, name: str, strategy_func: Callable):
        """注册策略函数"""
        self.strategies[name] = strategy_func
    
    def register_default_strategies(self):
        """注册默认策略"""
        
        def moving_average_crossover(data: Dict[str, pd.DataFrame], params: Dict[str, Any]) -> Dict[str, str]:
            """移动平均交叉策略"""
            signals = {}
            fast_period = params.get("fast_period", 5)
            slow_period = params.get("slow_period", 20)
            
            for symbol, df in data.items():
                if len(df) < slow_period:
                    signals[symbol] = "hold"
                    continue
                
                # 计算移动平均
                df['ma_fast'] = df['close'].rolling(fast_period).mean()
                df['ma_slow'] = df['close'].rolling(slow_period).mean()
                
                # 最新信号
                latest = df.iloc[-1]
                prev = df.iloc[-2] if len(df) > 1 else latest
                
                # 金叉买入，死叉卖出
                if (latest['ma_fast'] > latest['ma_slow'] and 
                    prev['ma_fast'] <= prev['ma_slow']):
                    signals[symbol] = "buy"
                elif (latest['ma_fast'] < latest['ma_slow'] and 
                      prev['ma_fast'] >= prev['ma_slow']):
                    signals[symbol] = "sell"
                else:
                    signals[symbol] = "hold"
            
            return signals
        
        def mean_reversion(data: Dict[str, pd.DataFrame], params: Dict[str, Any]) -> Dict[str, str]:
            """均值回归策略"""
            signals = {}
            lookback_period = params.get("lookback_period", 20)
            zscore_threshold = params.get("zscore_threshold", 2.0)
            
            for symbol, df in data.items():
                if len(df) < lookback_period:
                    signals[symbol] = "hold"
                    continue
                
                # 计算Z-score
                df['rolling_mean'] = df['close'].rolling(lookback_period).mean()
                df['rolling_std'] = df['close'].rolling(lookback_period).std()
                df['zscore'] = (df['close'] - df['rolling_mean']) / df['rolling_std']
                
                latest_zscore = df['zscore'].iloc[-1]
                
                # Z-score策略
                if latest_zscore < -zscore_threshold:
                    signals[symbol] = "buy"  # 超卖，买入
                elif latest_zscore > zscore_threshold:
                    signals[symbol] = "sell"  # 超买，卖出
                else:
                    signals[symbol] = "hold"
            
            return signals
        
        def momentum(data: Dict[str, pd.DataFrame], params: Dict[str, Any]) -> Dict[str, str]:
            """动量策略"""
            signals = {}
            momentum_period = params.get("momentum_period", 12)
            
            for symbol, df in data.items():
                if len(df) < momentum_period:
                    signals[symbol] = "hold"
                    continue
                
                # 计算动量
                df['momentum'] = df['close'].pct_change(momentum_period)
                latest_momentum = df['momentum'].iloc[-1]
                
                # 动量策略
                if latest_momentum > 0.1:  # 10%以上涨幅
                    signals[symbol] = "buy"
                elif latest_momentum < -0.1:  # 10%以上跌幅
                    signals[symbol] = "sell"
                else:
                    signals[symbol] = "hold"
            
            return signals
        
        # 注册策略
        self.register_strategy("moving_average_crossover", moving_average_crossover)
        self.register_strategy("mean_reversion", mean_reversion)
        self.register_strategy("momentum", momentum)
    
    async def run_backtest(
        self,
        strategy_name: str,
        symbols: List[str],
        data: Dict[str, pd.DataFrame],
        config: Dict[str, Any],
        strategy_params: Dict[str, Any] = None
    ) -> BacktestResult:
        """运行回测"""
        
        if strategy_name not in self.strategies:
            raise ValueError(f"未知策略: {strategy_name}")
        
        strategy_func = self.strategies[strategy_name]
        strategy_params = strategy_params or {}
        
        # 初始化组合
        initial_capital = config.get("asset", {}).get("initial_capital", 1000000)
        portfolio = Portfolio(initial_capital, config)
        
        # 获取数据的日期范围
        all_dates = set()
        for df in data.values():
            all_dates.update(df.index)
        trading_dates = sorted(list(all_dates))
        
        equity_curve = []
        daily_returns = []
        
        logger.info(f"开始回测策略 {strategy_name}，股票数量: {len(symbols)}，交易日数量: {len(trading_dates)}")
        
        for i, date in enumerate(trading_dates):
            # 获取当日数据
            current_data = {}
            current_prices = {}
            
            for symbol in symbols:
                if symbol in data and date in data[symbol].index:
                    # 获取到当前日期为止的历史数据
                    historical_data = data[symbol].loc[:date].copy()
                    current_data[symbol] = historical_data
                    current_prices[symbol] = data[symbol].loc[date, 'close']
            
            # 生成交易信号
            if len(current_data) > 0:
                signals = strategy_func(current_data, strategy_params)
                
                # 执行交易
                for symbol, signal in signals.items():
                    if signal == "buy" and symbol in current_prices:
                        # 计算买入数量（等权重）
                        target_weight = 1.0 / len(symbols)
                        portfolio_value = portfolio.get_total_value(current_prices)
                        target_value = portfolio_value * target_weight
                        quantity = int(target_value / current_prices[symbol] / 100) * 100  # 整手
                        
                        if quantity > 0 and portfolio.can_buy(symbol, quantity, current_prices[symbol], current_prices):
                            portfolio.buy(symbol, quantity, current_prices[symbol], date, f"{strategy_name}_buy")
                    
                    elif signal == "sell" and symbol in portfolio.positions:
                        # 卖出全部持仓
                        position = portfolio.positions[symbol]
                        portfolio.sell(symbol, position.quantity, current_prices[symbol], date, f"{strategy_name}_sell")
            
            # 更新持仓
            portfolio.update_positions(current_prices, date)
            
            # 记录权益曲线
            total_value = portfolio.get_total_value(current_prices)
            daily_return = (total_value - equity_curve[-1]["value"]) / equity_curve[-1]["value"] if equity_curve else 0
            
            equity_curve.append({
                "date": date.strftime("%Y-%m-%d"),
                "value": total_value,
                "cash": portfolio.cash,
                "position_value": total_value - portfolio.cash,
                "return": (total_value - initial_capital) / initial_capital * 100,
                "daily_return": daily_return * 100
            })
            
            if equity_curve:
                daily_returns.append(daily_return)
        
        # 计算绩效指标
        final_value = equity_curve[-1]["value"] if equity_curve else initial_capital
        total_return = (final_value - initial_capital) / initial_capital * 100
        
        # 计算年化收益率
        trading_days = len(equity_curve)
        years = trading_days / 252 if trading_days > 0 else 1
        annual_return = ((final_value / initial_capital) ** (1 / years) - 1) * 100 if years > 0 else 0
        
        # 计算波动率
        volatility = np.std(daily_returns) * np.sqrt(252) * 100 if daily_returns else 0
        
        # 计算夏普比率
        risk_free_rate = 0.03  # 假设无风险利率3%
        sharpe_ratio = (annual_return - risk_free_rate) / volatility if volatility > 0 else 0
        
        # 计算最大回撤
        peak = initial_capital
        max_drawdown = 0
        for point in equity_curve:
            if point["value"] > peak:
                peak = point["value"]
            drawdown = (peak - point["value"]) / peak * 100
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        
        # 计算胜率
        profitable_trades = [t for t in portfolio.trades if t.action == "sell"]  # 简化计算
        win_rate = 50.0  # 简化
        
        # 构造结果
        result = BacktestResult(
            total_return=total_return,
            annual_return=annual_return,
            volatility=volatility,
            sharpe_ratio=sharpe_ratio,
            max_drawdown=max_drawdown,
            win_rate=win_rate,
            profit_loss_ratio=1.5,  # 简化
            total_trades=len(portfolio.trades),
            benchmark_return=8.0,  # 简化
            excess_return=annual_return - 8.0,
            equity_curve=equity_curve,
            trades=portfolio.trades,
            positions=list(portfolio.positions.values()),
            risk_metrics={
                "volatility": volatility,
                "max_drawdown": max_drawdown,
                "sharpe_ratio": sharpe_ratio
            }
        )
        
        logger.info(f"回测完成: 总收益 {total_return:.2f}%, 年化收益 {annual_return:.2f}%, 夏普比率 {sharpe_ratio:.2f}")
        
        return result

# 全局策略引擎实例
strategy_engine = StrategyEngine()

def get_strategy_engine() -> StrategyEngine:
    """获取策略引擎实例"""
    return strategy_engine