"""
策略相关的数据模型
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class BacktestRequest(BaseModel):
    """回测请求模型"""
    strategy_id: str = Field(..., description="策略ID")
    symbols: List[str] = Field(..., description="股票代码列表")
    start_date: str = Field(..., description="开始日期 YYYY-MM-DD")
    end_date: str = Field(..., description="结束日期 YYYY-MM-DD")
    initial_capital: float = Field(default=1000000.0, description="初始资金")
    config: Dict[str, Any] = Field(default_factory=dict, description="策略配置参数")

class BacktestResult(BaseModel):
    """回测结果模型"""
    total_return: float = Field(..., description="总收益率 (%)")
    annual_return: float = Field(..., description="年化收益率 (%)")
    volatility: float = Field(..., description="波动率 (%)")
    sharpe_ratio: float = Field(..., description="夏普比率")
    max_drawdown: float = Field(..., description="最大回撤 (%)")
    win_rate: float = Field(..., description="胜率 (%)")
    profit_loss_ratio: float = Field(..., description="盈亏比")
    total_trades: int = Field(..., description="总交易次数")
    benchmark_return: float = Field(..., description="基准收益率 (%)")
    excess_return: float = Field(..., description="超额收益 (%)")

class BacktestResponse(BaseModel):
    """回测响应模型"""
    backtest_id: str = Field(..., description="回测ID")
    status: str = Field(..., description="状态: running/completed/failed")
    result: Optional[BacktestResult] = Field(None, description="回测结果")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")

class StrategyConfig(BaseModel):
    """策略配置模型"""
    name: str = Field(..., description="策略名称")
    description: str = Field(..., description="策略描述")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="策略参数")
    
class AssetConfig(BaseModel):
    """资产配置模型"""
    initial_capital: float = Field(default=1000000.0, description="初始资金")
    cash_reserve: float = Field(default=0.1, description="现金保留比例")
    max_position_size: float = Field(default=0.2, description="单个股票最大仓位")
    min_position_size: float = Field(default=0.01, description="单个股票最小仓位")
    max_positions: int = Field(default=20, description="最大持仓数量")
    leverage: float = Field(default=1.0, description="杠杆倍数")

class TradingConfig(BaseModel):
    """交易配置模型"""
    commission: float = Field(default=0.0003, description="手续费率")
    slippage: float = Field(default=0.001, description="滑点")
    min_trade_amount: float = Field(default=1000.0, description="最小交易金额")
    trade_timing: str = Field(default="close", description="交易时机")
    allow_short: bool = Field(default=False, description="是否允许做空")
    allow_margin: bool = Field(default=False, description="是否允许融资融券")

class RiskConfig(BaseModel):
    """风险控制配置模型"""
    stop_loss: Optional[float] = Field(None, description="止损比例")
    take_profit: Optional[float] = Field(None, description="止盈比例")
    max_drawdown: float = Field(default=0.2, description="最大回撤限制")
    var_confidence: float = Field(default=0.95, description="VaR置信度")
    concentration_limit: float = Field(default=0.4, description="行业集中度限制")
    correlation_limit: float = Field(default=0.8, description="相关性限制")

class PortfolioConfig(BaseModel):
    """投资组合配置模型"""
    name: str = Field(..., description="组合名称")
    asset_config: AssetConfig = Field(default_factory=AssetConfig, description="资产配置")
    trading_config: TradingConfig = Field(default_factory=TradingConfig, description="交易配置")
    risk_config: RiskConfig = Field(default_factory=RiskConfig, description="风险配置")
    stock_pools: List[str] = Field(default_factory=list, description="股票池")
    custom_stocks: List[str] = Field(default_factory=list, description="自定义股票")
    strategies: List[str] = Field(default_factory=list, description="策略列表")

class UserConfigRequest(BaseModel):
    """用户配置请求模型"""
    portfolio_config: PortfolioConfig = Field(..., description="投资组合配置")
    backtest_config: Dict[str, Any] = Field(default_factory=dict, description="回测配置")