"""
用户资产组合配置管理
允许用户自定义资产配置、股票池和回测参数
"""

import json
import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta

@dataclass
class AssetConfig:
    """资产配置"""
    initial_capital: float = 1000000.0  # 初始资金
    cash_reserve: float = 0.1           # 现金保留比例
    max_position_size: float = 0.2      # 单个股票最大仓位
    min_position_size: float = 0.01     # 单个股票最小仓位
    max_positions: int = 20             # 最大持仓数量
    leverage: float = 1.0               # 杠杆倍数

@dataclass  
class TradingConfig:
    """交易配置"""
    commission: float = 0.0003          # 手续费率
    slippage: float = 0.001             # 滑点
    min_trade_amount: float = 1000.0    # 最小交易金额
    trade_timing: str = "close"         # 交易时机 (open/close/vwap)
    allow_short: bool = False           # 是否允许做空
    allow_margin: bool = False          # 是否允许融资融券

@dataclass
class RiskConfig:
    """风险控制配置"""
    stop_loss: Optional[float] = None   # 止损比例
    take_profit: Optional[float] = None # 止盈比例
    max_drawdown: float = 0.2           # 最大回撤限制
    var_confidence: float = 0.95        # VaR置信度
    concentration_limit: float = 0.4    # 行业集中度限制
    correlation_limit: float = 0.8      # 相关性限制

@dataclass
class BacktestConfig:
    """回测配置"""
    start_date: str = "2023-01-01"
    end_date: str = "2024-12-31"
    benchmark: str = "000300"           # 基准指数
    frequency: str = "daily"            # 回测频率
    rebalance_frequency: str = "monthly" # 再平衡频率
    warm_up_period: int = 252           # 预热期（交易日）

@dataclass
class StockPool:
    """股票池配置"""
    name: str
    description: str
    symbols: List[str]
    filters: Dict[str, Any]
    max_stocks: int = 50
    update_frequency: str = "monthly"

class PortfolioConfigManager:
    """投资组合配置管理器"""
    
    def __init__(self, config_dir: str = "config/portfolios"):
        self.config_dir = config_dir
        self.ensure_config_dir()
        self.default_stock_pools = self._create_default_stock_pools()
        
    def ensure_config_dir(self):
        """确保配置目录存在"""
        os.makedirs(self.config_dir, exist_ok=True)
        
    def _create_default_stock_pools(self) -> Dict[str, StockPool]:
        """创建默认股票池"""
        return {
            "blue_chips": StockPool(
                name="蓝筹股票池",
                description="大盘蓝筹股，适合稳健投资",
                symbols=[
                    "600519", "600036", "000858", "600276", "601318",
                    "000333", "000001", "002594", "600900", "600585"
                ],
                filters={
                    "market_cap_min": 500_000_000_000,  # 5000亿市值
                    "pe_max": 30,
                    "roe_min": 0.15
                },
                max_stocks=20
            ),
            "growth": StockPool(
                name="成长股票池", 
                description="高成长性股票，适合积极投资",
                symbols=[
                    "300750", "002594", "300059", "002415", "300274",
                    "688981", "688599", "002460", "300142", "300015"
                ],
                filters={
                    "revenue_growth_min": 0.20,  # 营收增长20%+
                    "profit_growth_min": 0.25,   # 利润增长25%+
                    "pe_max": 50
                },
                max_stocks=30
            ),
            "value": StockPool(
                name="价值股票池",
                description="低估值股票，适合价值投资",
                symbols=[
                    "601398", "601988", "600000", "600036", "000001",
                    "000002", "600048", "601166", "600016", "600030"
                ],
                filters={
                    "pe_max": 15,
                    "pb_max": 2.0,
                    "dividend_yield_min": 0.03
                },
                max_stocks=25
            ),
            "technology": StockPool(
                name="科技股票池",
                description="科技创新股票，适合主题投资", 
                symbols=[
                    "300750", "002415", "300059", "688981", "688599",
                    "002460", "300142", "300015", "002241", "300496"
                ],
                filters={
                    "sector": ["软件", "电子", "通信", "计算机"],
                    "rd_ratio_min": 0.05  # 研发投入占比5%+
                },
                max_stocks=40
            ),
            "custom": StockPool(
                name="自定义股票池",
                description="用户自定义股票组合",
                symbols=[],
                filters={},
                max_stocks=100
            )
        }
    
    def create_portfolio_config(
        self,
        name: str,
        asset_config: AssetConfig = None,
        trading_config: TradingConfig = None,
        risk_config: RiskConfig = None,
        backtest_config: BacktestConfig = None,
        stock_pools: List[str] = None
    ) -> Dict[str, Any]:
        """创建投资组合配置"""
        
        config = {
            "meta": {
                "name": name,
                "created_at": datetime.now().isoformat(),
                "version": "1.0",
                "description": f"投资组合配置: {name}"
            },
            "asset": asdict(asset_config or AssetConfig()),
            "trading": asdict(trading_config or TradingConfig()),
            "risk": asdict(risk_config or RiskConfig()),
            "backtest": asdict(backtest_config or BacktestConfig()),
            "stock_pools": stock_pools or ["blue_chips"],
            "custom_stocks": [],
            "strategies": []
        }
        
        return config
    
    def save_portfolio_config(self, config: Dict[str, Any]) -> str:
        """保存投资组合配置"""
        name = config["meta"]["name"]
        filename = f"{name.lower().replace(' ', '_')}.json"
        filepath = os.path.join(self.config_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        
        return filepath
    
    def load_portfolio_config(self, name: str) -> Dict[str, Any]:
        """加载投资组合配置"""
        filename = f"{name.lower().replace(' ', '_')}.json"
        filepath = os.path.join(self.config_dir, filename)
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"配置文件不存在: {filepath}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def list_portfolio_configs(self) -> List[str]:
        """列出所有投资组合配置"""
        configs = []
        for filename in os.listdir(self.config_dir):
            if filename.endswith('.json'):
                name = filename[:-5].replace('_', ' ').title()
                configs.append(name)
        return configs
    
    def get_stock_pool(self, pool_name: str) -> StockPool:
        """获取股票池"""
        if pool_name not in self.default_stock_pools:
            raise ValueError(f"未知的股票池: {pool_name}")
        return self.default_stock_pools[pool_name]
    
    def get_portfolio_stocks(self, config: Dict[str, Any]) -> List[str]:
        """获取投资组合的股票列表"""
        all_stocks = set()
        
        # 添加股票池中的股票
        for pool_name in config.get("stock_pools", []):
            if pool_name in self.default_stock_pools:
                pool = self.default_stock_pools[pool_name]
                all_stocks.update(pool.symbols)
        
        # 添加自定义股票
        custom_stocks = config.get("custom_stocks", [])
        all_stocks.update(custom_stocks)
        
        return list(all_stocks)
    
    def validate_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """验证配置的有效性"""
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # 检查资产配置
        asset = config.get("asset", {})
        if asset.get("initial_capital", 0) <= 0:
            validation_result["errors"].append("初始资金必须大于0")
            validation_result["valid"] = False
        
        if asset.get("max_position_size", 0) > 1.0:
            validation_result["errors"].append("单个股票最大仓位不能超过100%")
            validation_result["valid"] = False
        
        # 检查股票池
        stock_pools = config.get("stock_pools", [])
        for pool_name in stock_pools:
            if pool_name not in self.default_stock_pools:
                validation_result["warnings"].append(f"未知股票池: {pool_name}")
        
        # 检查日期配置
        backtest = config.get("backtest", {})
        try:
            start_date = datetime.strptime(backtest.get("start_date", ""), "%Y-%m-%d")
            end_date = datetime.strptime(backtest.get("end_date", ""), "%Y-%m-%d")
            if start_date >= end_date:
                validation_result["errors"].append("开始日期必须早于结束日期")
                validation_result["valid"] = False
        except ValueError:
            validation_result["errors"].append("日期格式错误，应为 YYYY-MM-DD")
            validation_result["valid"] = False
        
        return validation_result
    
    def create_sample_configs(self):
        """创建示例配置文件"""
        
        # 1. 稳健型配置
        conservative_config = self.create_portfolio_config(
            name="稳健型组合",
            asset_config=AssetConfig(
                initial_capital=1000000.0,
                cash_reserve=0.2,
                max_position_size=0.15,
                max_positions=15
            ),
            risk_config=RiskConfig(
                stop_loss=0.1,
                max_drawdown=0.15,
                concentration_limit=0.3
            ),
            stock_pools=["blue_chips", "value"]
        )
        
        # 2. 成长型配置
        growth_config = self.create_portfolio_config(
            name="成长型组合",
            asset_config=AssetConfig(
                initial_capital=500000.0,
                cash_reserve=0.1,
                max_position_size=0.25,
                max_positions=10
            ),
            risk_config=RiskConfig(
                stop_loss=0.15,
                max_drawdown=0.25,
                concentration_limit=0.5
            ),
            stock_pools=["growth", "technology"]
        )
        
        # 3. 平衡型配置
        balanced_config = self.create_portfolio_config(
            name="平衡型组合",
            asset_config=AssetConfig(
                initial_capital=2000000.0,
                cash_reserve=0.15,
                max_position_size=0.2,
                max_positions=20
            ),
            risk_config=RiskConfig(
                stop_loss=0.12,
                max_drawdown=0.2,
                concentration_limit=0.4
            ),
            stock_pools=["blue_chips", "growth", "value"]
        )
        
        # 保存配置
        configs = [conservative_config, growth_config, balanced_config]
        for config in configs:
            self.save_portfolio_config(config)
        
        print(f"✅ 已创建 {len(configs)} 个示例配置文件")

# 全局配置管理器实例
portfolio_manager = PortfolioConfigManager()

def get_portfolio_manager() -> PortfolioConfigManager:
    """获取投资组合配置管理器"""
    return portfolio_manager