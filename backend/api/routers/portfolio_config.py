"""
投资组合配置API路由
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import sys
import os
import json
from datetime import datetime

# 添加项目路径
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

# 简化的配置模型
class AssetConfig(BaseModel):
    initial_capital: float = 1000000.0
    cash_reserve: float = 0.1
    max_position_size: float = 0.2
    max_positions: int = 20

class TradingConfig(BaseModel):
    commission_rate: float = 0.0003
    slippage_rate: float = 0.001
    min_order_value: float = 1000.0

class RiskConfig(BaseModel):
    max_drawdown: float = 0.15
    var_confidence: float = 0.95
    max_correlation: float = 0.7

class BacktestConfig(BaseModel):
    start_date: str = "2023-01-01"
    end_date: str = "2024-12-31"
    benchmark: str = "000300"
    frequency: str = "daily"

router = APIRouter()

@router.get("/templates")
async def get_portfolio_templates():
    """获取投资组合模板列表"""
    try:
        
        templates = {
            "conservative": {
                "name": "稳健型组合",
                "description": "低风险，稳定收益，适合保守投资者",
                "risk_level": "低",
                "expected_return": "6-10%",
                "max_drawdown": "15%",
                "asset_config": {
                    "initial_capital": 1000000.0,
                    "cash_reserve": 0.2,
                    "max_position_size": 0.15,
                    "max_positions": 15
                },
                "stock_pools": ["blue_chips", "value"],
                "strategies": ["mean_reversion", "value_investing"]
            },
            "growth": {
                "name": "成长型组合", 
                "description": "中高风险，追求成长，适合积极投资者",
                "risk_level": "中高",
                "expected_return": "15-25%",
                "max_drawdown": "25%",
                "asset_config": {
                    "initial_capital": 500000.0,
                    "cash_reserve": 0.1,
                    "max_position_size": 0.25,
                    "max_positions": 10
                },
                "stock_pools": ["growth", "technology"],
                "strategies": ["momentum", "growth_investing"]
            },
            "balanced": {
                "name": "平衡型组合",
                "description": "风险收益平衡，适合大多数投资者",
                "risk_level": "中等",
                "expected_return": "10-18%", 
                "max_drawdown": "20%",
                "asset_config": {
                    "initial_capital": 2000000.0,
                    "cash_reserve": 0.15,
                    "max_position_size": 0.2,
                    "max_positions": 20
                },
                "stock_pools": ["blue_chips", "growth", "value"],
                "strategies": ["factor_investing", "tactical_allocation"]
            }
        }
        
        return {
            "success": True,
            "templates": templates,
            "total_count": len(templates)
        }
        
    except Exception as e:
        return {"success": False, "error": f"获取模板失败: {str(e)}"}

@router.get("/stock-pools")
async def get_stock_pools():
    """获取可用的股票池"""
    try:
        # 内置股票池定义
        stock_pools = {
            "blue_chips": {
                "name": "蓝筹股池",
                "description": "大盘蓝筹股，市值大，业绩稳定",
                "symbols": ["600519", "600036", "601318", "000858", "000333", "600276"],
                "symbol_count": 6,
                "max_stocks": 20,
                "filters": ["market_cap > 100B", "pe < 30"],
                "update_frequency": "weekly"
            },
            "growth": {
                "name": "成长股池",
                "description": "高成长性股票，适合追求高收益的投资者",
                "symbols": ["300750", "002594", "300059", "002415", "000661"],
                "symbol_count": 5,
                "max_stocks": 15,
                "filters": ["revenue_growth > 20%", "roe > 15%"],
                "update_frequency": "monthly"
            },
            "technology": {
                "name": "科技股池",
                "description": "科技行业龙头股票",
                "symbols": ["300750", "002415", "300059", "000066"],
                "symbol_count": 4,
                "max_stocks": 12,
                "filters": ["sector = 'technology'"],
                "update_frequency": "weekly"
            },
            "value": {
                "name": "价值股池",
                "description": "低估值价值股票",
                "symbols": ["600036", "601318", "000001", "000002"],
                "symbol_count": 4,
                "max_stocks": 18,
                "filters": ["pe < 15", "pb < 2"],
                "update_frequency": "monthly"
            }
        }
        
        return {
            "success": True,
            "stock_pools": stock_pools,
            "total_pools": len(stock_pools)
        }
        
    except Exception as e:
        return {"success": False, "error": f"获取股票池失败: {str(e)}"}

@router.post("/create")
async def create_portfolio_config(
    name: str,
    template: Optional[str] = None,
    asset_config: Optional[Dict[str, Any]] = None,
    trading_config: Optional[Dict[str, Any]] = None,
    risk_config: Optional[Dict[str, Any]] = None,
    backtest_config: Optional[Dict[str, Any]] = None,
    stock_pools: Optional[List[str]] = None,
    custom_stocks: Optional[List[str]] = None
):
    """创建新的投资组合配置"""
    try:
        # 使用模板配置
        if template:
            template_configs = {
                "conservative": {
                    "asset": {"initial_capital": 1000000.0, "cash_reserve": 0.2, "max_position_size": 0.15, "max_positions": 15},
                    "stock_pools": ["blue_chips", "value"]
                },
                "growth": {
                    "asset": {"initial_capital": 500000.0, "cash_reserve": 0.1, "max_position_size": 0.25, "max_positions": 10},
                    "stock_pools": ["growth", "technology"]
                },
                "balanced": {
                    "asset": {"initial_capital": 2000000.0, "cash_reserve": 0.15, "max_position_size": 0.2, "max_positions": 20},
                    "stock_pools": ["blue_chips", "growth", "value"]
                }
            }
            
            if template in template_configs:
                template_config = template_configs[template]
                asset_config = asset_config or template_config["asset"]
                stock_pools = stock_pools or template_config["stock_pools"]
        
        # 创建配置对象
        asset_cfg = AssetConfig(**asset_config) if asset_config else AssetConfig()
        trading_cfg = TradingConfig(**trading_config) if trading_config else TradingConfig()
        risk_cfg = RiskConfig(**risk_config) if risk_config else RiskConfig()
        backtest_cfg = BacktestConfig(**backtest_config) if backtest_config else BacktestConfig()
        
        # 创建配置
        config = {
            "name": name,
            "created_at": datetime.now().isoformat(),
            "asset": asset_cfg.dict(),
            "trading": trading_cfg.dict(),
            "risk": risk_cfg.dict(),
            "backtest": backtest_cfg.dict(),
            "stock_pools": stock_pools or [],
            "custom_stocks": custom_stocks or []
        }
        
        # 简化验证
        validation = {
            "valid": True,
            "warnings": [],
            "errors": []
        }
        
        # 模拟保存配置
        config_id = f"portfolio_{name.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}"
        
        return {
            "success": True,
            "config": config,
            "config_id": config_id,
            "validation": validation
        }
        
    except Exception as e:
        return {"success": False, "error": f"创建配置失败: {str(e)}"}

@router.get("/list")
async def list_portfolio_configs():
    """获取所有投资组合配置列表"""
    try:
        # 模拟配置列表
        config_details = [
            {
                "name": "稳健型组合",
                "meta": {
                    "created_at": "2024-01-01",
                    "updated_at": "2024-12-10",
                    "description": "低风险稳健投资组合"
                },
                "initial_capital": 1000000,
                "stock_pools": ["blue_chips", "value"],
                "max_positions": 15,
                "status": "active"
            },
            {
                "name": "成长型组合",
                "meta": {
                    "created_at": "2024-01-15",
                    "updated_at": "2024-12-10",
                    "description": "高成长性股票组合"
                },
                "initial_capital": 500000,
                "stock_pools": ["growth", "technology"],
                "max_positions": 10,
                "status": "active"
            },
            {
                "name": "平衡型组合",
                "meta": {
                    "created_at": "2024-02-01",
                    "updated_at": "2024-12-10",
                    "description": "风险收益平衡的投资组合"
                },
                "initial_capital": 2000000,
                "stock_pools": ["blue_chips", "growth", "value"],
                "max_positions": 20,
                "status": "active"
            }
        ]
        
        return {
            "success": True,
            "configs": config_details,
            "total_count": len(config_details)
        }
        
    except Exception as e:
        return {"success": False, "error": f"获取配置列表失败: {str(e)}"}

@router.get("/detail/{config_name}")
async def get_portfolio_config(config_name: str):
    """获取特定投资组合配置的详细信息"""
    try:
        # 模拟配置数据
        mock_configs = {
            "稳健型组合": {
                "name": "稳健型组合",
                "asset": {
                    "initial_capital": 1000000.0,
                    "cash_reserve": 0.2,
                    "max_position_size": 0.15,
                    "max_positions": 15
                },
                "stock_pools": ["blue_chips", "value"],
                "custom_stocks": ["600519", "600036"],
                "created_at": "2024-01-01T00:00:00"
            },
            "成长型组合": {
                "name": "成长型组合",
                "asset": {
                    "initial_capital": 500000.0,
                    "cash_reserve": 0.1,
                    "max_position_size": 0.25,
                    "max_positions": 10
                },
                "stock_pools": ["growth", "technology"],
                "custom_stocks": ["300750", "002594"],
                "created_at": "2024-01-15T00:00:00"
            },
            "平衡型组合": {
                "name": "平衡型组合",
                "asset": {
                    "initial_capital": 2000000.0,
                    "cash_reserve": 0.15,
                    "max_position_size": 0.2,
                    "max_positions": 20
                },
                "stock_pools": ["blue_chips", "growth", "value"],
                "custom_stocks": ["600519", "300750", "600036", "002594"],
                "created_at": "2024-02-01T00:00:00"
            }
        }
        
        config = mock_configs.get(config_name)
        if not config:
            return {"success": False, "error": f"配置未找到: {config_name}"}
        
        # 获取股票列表
        stocks = config.get("custom_stocks", [])
        
        # 股票池详细信息
        stock_pools_detail = {
            "blue_chips": {"name": "蓝筹股池", "description": "大盘蓝筹股", "symbol_count": 6, "symbols": ["600519", "600036", "601318"]},
            "growth": {"name": "成长股池", "description": "高成长性股票", "symbol_count": 5, "symbols": ["300750", "002594", "300059"]},
            "technology": {"name": "科技股池", "description": "科技行业龙头", "symbol_count": 4, "symbols": ["300750", "002415", "300059"]},
            "value": {"name": "价值股池", "description": "低估值价值股", "symbol_count": 4, "symbols": ["600036", "601318", "000001"]}
        }
        
        selected_pools = {k: v for k, v in stock_pools_detail.items() if k in config.get("stock_pools", [])}
        
        return {
            "success": True,
            "config": config,
            "stocks": stocks,
            "stock_count": len(stocks),
            "stock_pools_detail": selected_pools
        }
        
    except Exception as e:
        return {"success": False, "error": f"获取配置失败: {str(e)}"}

@router.post("/validate")
async def validate_portfolio_config(config: Dict[str, Any]):
    """验证投资组合配置的有效性"""
    try:
        # 简化验证逻辑
        errors = []
        warnings = []
        
        # 检查必要字段
        if not config.get("asset", {}).get("initial_capital"):
            errors.append("初始资金不能为空")
        
        if config.get("asset", {}).get("max_positions", 0) <= 0:
            errors.append("最大持仓数量必须大于0")
        
        if config.get("asset", {}).get("cash_reserve", 0) < 0 or config.get("asset", {}).get("cash_reserve", 0) > 1:
            warnings.append("现金储备比例应在0-1之间")
        
        validation = {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
        
        return {
            "success": True,
            "validation": validation
        }
        
    except Exception as e:
        return {"success": False, "error": f"验证配置失败: {str(e)}"}

@router.post("/backtest/{config_name}")
async def run_backtest_with_config(
    config_name: str,
    custom_params: Optional[Dict[str, Any]] = None
):
    """使用配置运行回测"""
    try:
        # 模拟配置数据
        mock_configs = {
            "稳健型组合": {
                "stocks": ["600519", "600036", "000858", "601318"],
                "initial_capital": 1000000,
                "expected_return": 12.5,
                "volatility": 15.2
            },
            "成长型组合": {
                "stocks": ["300750", "002594", "300059", "002415"],
                "initial_capital": 500000,
                "expected_return": 18.8,
                "volatility": 22.1
            },
            "平衡型组合": {
                "stocks": ["600519", "300750", "600036", "002594", "000858"],
                "initial_capital": 2000000,
                "expected_return": 15.3,
                "volatility": 18.7
            }
        }
        
        config = mock_configs.get(config_name)
        if not config:
            return {"success": False, "error": f"配置未找到: {config_name}"}
        
        # 模拟回测结果
        import random
        random.seed(hash(config_name))  # 保证结果一致性
        
        base_return = config["expected_return"]
        base_volatility = config["volatility"]
        
        mock_result = {
            "portfolio_name": config_name,
            "total_return": round(base_return + random.uniform(-3, 3), 2),
            "annual_return": round(base_return, 2),
            "volatility": round(base_volatility, 2),
            "sharpe_ratio": round(base_return / base_volatility, 3),
            "max_drawdown": round(base_volatility * 0.8, 2),
            "win_rate": round(50 + random.uniform(-10, 20), 1),
            "total_trades": random.randint(80, 200),
            "benchmark_return": 8.9,
            "excess_return": round(base_return - 8.9, 2),
            "start_date": "2023-01-01",
            "end_date": "2024-12-31",
            "initial_capital": config["initial_capital"],
            "final_value": round(config["initial_capital"] * (1 + base_return/100), 2),
            "stocks": config["stocks"]
        }
        
        return {
            "success": True,
            "result": mock_result,
            "config_name": config_name
        }
        
    except Exception as e:
        return {"success": False, "error": f"回测执行失败: {str(e)}"}

@router.delete("/delete/{config_name}")
async def delete_portfolio_config(config_name: str):
    """删除投资组合配置"""
    try:
        # 模拟删除操作
        allowed_configs = ["稳健型组合", "成长型组合", "平衡型组合"]
        
        if config_name not in allowed_configs:
            return {"success": False, "error": f"配置未找到: {config_name}"}
        
        return {
            "success": True,
            "message": f"配置 {config_name} 已删除"
        }
        
    except Exception as e:
        return {"success": False, "error": f"删除配置失败: {str(e)}"}

@router.post("/initialize-samples")
async def initialize_sample_configs():
    """初始化示例配置文件"""
    try:
        return {
            "success": True,
            "message": "示例配置文件已初始化",
            "configs": ["稳健型组合", "成长型组合", "平衡型组合"],
            "total_count": 3
        }
        
    except Exception as e:
        return {"success": False, "error": f"初始化失败: {str(e)}"}