#!/usr/bin/env python3
"""
服务健康监控系统 - 全面监控各个组件和服务的连接状态
"""

import asyncio
import aiohttp
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
import yfinance as yf
import akshare as ak
import tushare as ts
import time
import requests
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class HealthStatus:
    """健康状态"""
    service_name: str
    category: str
    is_healthy: bool
    response_time_ms: float
    last_check: str
    error_message: Optional[str] = None
    additional_info: Dict[str, Any] = None

@dataclass
class ServiceEndpoint:
    """服务端点配置"""
    name: str
    category: str
    endpoint_type: str  # api, websocket, database
    url: str
    timeout_seconds: int = 30
    test_payload: Optional[Dict] = None
    headers: Optional[Dict] = None

class ServiceHealthMonitor:
    """服务健康监控器"""
    
    def __init__(self):
        self.health_status: Dict[str, HealthStatus] = {}
        self.check_intervals = {
            "critical": 30,    # 关键服务30秒检查一次
            "important": 60,   # 重要服务1分钟检查一次
            "optional": 300    # 可选服务5分钟检查一次
        }
        self.service_endpoints = self._initialize_service_endpoints()
        
    def _initialize_service_endpoints(self) -> Dict[str, ServiceEndpoint]:
        """初始化服务端点"""
        endpoints = {
            # 数据源服务
            "yahoo_finance": ServiceEndpoint(
                name="Yahoo Finance",
                category="data_sources",
                endpoint_type="api",
                url="https://query1.finance.yahoo.com/v8/finance/chart/AAPL",
                timeout_seconds=10
            ),
            "yahoo_finance_search": ServiceEndpoint(
                name="Yahoo Finance Search",
                category="data_sources",
                endpoint_type="api",
                url="https://query1.finance.yahoo.com/v1/finance/search",
                timeout_seconds=10,
                test_payload={"q": "AAPL"}
            ),
            "binance_api": ServiceEndpoint(
                name="Binance API",
                category="crypto_exchanges",
                endpoint_type="api",
                url="https://api.binance.com/api/v3/ping",
                timeout_seconds=5
            ),
            "binance_ticker": ServiceEndpoint(
                name="Binance Ticker",
                category="crypto_exchanges", 
                endpoint_type="api",
                url="https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
                timeout_seconds=10
            ),
            "kraken_api": ServiceEndpoint(
                name="Kraken API",
                category="crypto_exchanges",
                endpoint_type="api",
                url="https://api.kraken.com/0/public/Time",
                timeout_seconds=10
            ),
            "coinmarketcap": ServiceEndpoint(
                name="CoinMarketCap",
                category="crypto_exchanges",
                endpoint_type="api",
                url="https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest",
                timeout_seconds=15,
                headers={"X-CMC_PRO_API_KEY": "demo"}  # 需要真实API密钥
            ),
            "deepseek_api": ServiceEndpoint(
                name="DeepSeek AI",
                category="ai_services",
                endpoint_type="api",
                url="https://api.deepseek.com/v1/models",
                timeout_seconds=15,
                headers={"Authorization": "Bearer demo"}  # 需要真实API密钥
            ),
            "openai_api": ServiceEndpoint(
                name="OpenAI API",
                category="ai_services", 
                endpoint_type="api",
                url="https://api.openai.com/v1/models",
                timeout_seconds=15,
                headers={"Authorization": "Bearer demo"}  # 需要真实API密钥
            )
        }
        return endpoints
        
    async def check_service_health(self, service_name: str) -> HealthStatus:
        """检查单个服务健康状态"""
        start_time = time.time()
        
        if service_name not in self.service_endpoints:
            return HealthStatus(
                service_name=service_name,
                category="unknown",
                is_healthy=False,
                response_time_ms=0,
                last_check=datetime.now().isoformat(),
                error_message="服务端点未配置"
            )
            
        endpoint = self.service_endpoints[service_name]
        
        try:
            if endpoint.endpoint_type == "api":
                return await self._check_api_health(endpoint)
            elif endpoint.endpoint_type == "websocket":
                return await self._check_websocket_health(endpoint)
            elif endpoint.endpoint_type == "database":
                return await self._check_database_health(endpoint)
            else:
                return await self._check_generic_health(endpoint)
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            logger.error(f"❌ {endpoint.name} 健康检查失败: {str(e)}")
            
            return HealthStatus(
                service_name=service_name,
                category=endpoint.category,
                is_healthy=False,
                response_time_ms=response_time,
                last_check=datetime.now().isoformat(),
                error_message=str(e)
            )
    
    async def _check_api_health(self, endpoint: ServiceEndpoint) -> HealthStatus:
        """检查API服务健康状态"""
        start_time = time.time()
        
        try:
            timeout = aiohttp.ClientTimeout(total=endpoint.timeout_seconds)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                
                # 准备请求参数
                kwargs = {}
                if endpoint.headers:
                    kwargs['headers'] = endpoint.headers
                if endpoint.test_payload:
                    if "search" in endpoint.url:
                        kwargs['params'] = endpoint.test_payload
                    else:
                        kwargs['json'] = endpoint.test_payload
                
                async with session.get(endpoint.url, **kwargs) as response:
                    response_time = (time.time() - start_time) * 1000
                    
                    # 检查响应状态
                    is_healthy = 200 <= response.status < 400
                    error_message = None if is_healthy else f"HTTP {response.status}"
                    
                    # 获取响应内容（用于额外信息）
                    additional_info = {}
                    try:
                        if response.content_type == 'application/json':
                            content = await response.json()
                            if isinstance(content, dict) and len(content) > 0:
                                # 提取有用的信息
                                if "serverTime" in content:
                                    additional_info["server_time"] = content["serverTime"]
                                elif "data" in content:
                                    additional_info["data_available"] = True
                                elif "result" in content:
                                    additional_info["has_results"] = len(content["result"]) > 0
                    except Exception:
                        pass  # 忽略解析错误
                    
                    status = HealthStatus(
                        service_name=endpoint.name,
                        category=endpoint.category,
                        is_healthy=is_healthy,
                        response_time_ms=response_time,
                        last_check=datetime.now().isoformat(),
                        error_message=error_message,
                        additional_info=additional_info
                    )
                    
                    if is_healthy:
                        logger.info(f"✅ {endpoint.name} 健康 - {response_time:.1f}ms")
                    else:
                        logger.warning(f"⚠️ {endpoint.name} 不健康 - {error_message}")
                    
                    return status
                    
        except asyncio.TimeoutError:
            response_time = endpoint.timeout_seconds * 1000
            return HealthStatus(
                service_name=endpoint.name,
                category=endpoint.category,
                is_healthy=False,
                response_time_ms=response_time,
                last_check=datetime.now().isoformat(),
                error_message="请求超时"
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthStatus(
                service_name=endpoint.name,
                category=endpoint.category,
                is_healthy=False,
                response_time_ms=response_time,
                last_check=datetime.now().isoformat(),
                error_message=str(e)
            )
    
    async def _check_websocket_health(self, endpoint: ServiceEndpoint) -> HealthStatus:
        """检查WebSocket服务健康状态"""
        # TODO: 实现WebSocket健康检查
        pass
    
    async def _check_database_health(self, endpoint: ServiceEndpoint) -> HealthStatus:
        """检查数据库服务健康状态"""
        # TODO: 实现数据库健康检查
        pass
    
    async def _check_generic_health(self, endpoint: ServiceEndpoint) -> HealthStatus:
        """通用健康检查"""
        return await self._check_api_health(endpoint)
    
    async def check_data_sources_health(self) -> Dict[str, HealthStatus]:
        """检查数据源健康状态"""
        results = {}
        
        # 检查AKShare
        try:
            start_time = time.time()
            # 简单测试AKShare功能
            stock_info = ak.stock_zh_a_spot_em()
            response_time = (time.time() - start_time) * 1000
            
            results["akshare"] = HealthStatus(
                service_name="AKShare",
                category="data_sources",
                is_healthy=stock_info is not None and not stock_info.empty,
                response_time_ms=response_time,
                last_check=datetime.now().isoformat(),
                additional_info={"data_rows": len(stock_info) if stock_info is not None else 0}
            )
            logger.info(f"✅ AKShare 健康检查完成 - {len(stock_info)}条数据")
        except Exception as e:
            results["akshare"] = HealthStatus(
                service_name="AKShare",
                category="data_sources",
                is_healthy=False,
                response_time_ms=0,
                last_check=datetime.now().isoformat(),
                error_message=str(e)
            )
            logger.error(f"❌ AKShare 健康检查失败: {str(e)}")
        
        # 检查Yahoo Finance
        try:
            start_time = time.time()
            ticker = yf.Ticker("AAPL")
            info = ticker.info
            response_time = (time.time() - start_time) * 1000
            
            results["yfinance"] = HealthStatus(
                service_name="Yahoo Finance",
                category="data_sources", 
                is_healthy=info is not None and 'symbol' in info,
                response_time_ms=response_time,
                last_check=datetime.now().isoformat(),
                additional_info={"symbol": info.get('symbol', 'N/A') if info else None}
            )
            logger.info(f"✅ Yahoo Finance 健康检查完成")
        except Exception as e:
            results["yfinance"] = HealthStatus(
                service_name="Yahoo Finance",
                category="data_sources",
                is_healthy=False,
                response_time_ms=0,
                last_check=datetime.now().isoformat(),
                error_message=str(e)
            )
            logger.error(f"❌ Yahoo Finance 健康检查失败: {str(e)}")
        
        return results
    
    async def check_ml_models_health(self, models_dir: str) -> Dict[str, HealthStatus]:
        """检查ML模型健康状态"""
        results = {}
        models_path = Path(models_dir)
        
        if not models_path.exists():
            results["models_directory"] = HealthStatus(
                service_name="ML Models Directory",
                category="ml_services",
                is_healthy=False,
                response_time_ms=0,
                last_check=datetime.now().isoformat(),
                error_message="模型目录不存在"
            )
            return results
        
        try:
            # 查找LightGBM模型文件
            model_files = list(models_path.glob("*lightgbm*.pkl")) + \
                         list(models_path.glob("*lightgbm*.joblib")) + \
                         list(models_path.glob("*lightgbm*.txt"))
            
            start_time = time.time()
            loaded_models = 0
            
            for model_file in model_files:
                try:
                    # 尝试加载模型
                    import lightgbm as lgb
                    import joblib
                    
                    if model_file.suffix == '.txt':
                        model = lgb.Booster(model_file=str(model_file))
                    else:
                        model = joblib.load(model_file)
                    
                    if model is not None:
                        loaded_models += 1
                        
                except Exception as e:
                    logger.warning(f"⚠️ 模型加载失败 {model_file.name}: {e}")
                    continue
            
            response_time = (time.time() - start_time) * 1000
            
            results["lightgbm_models"] = HealthStatus(
                service_name="LightGBM Models",
                category="ml_services",
                is_healthy=loaded_models > 0,
                response_time_ms=response_time,
                last_check=datetime.now().isoformat(),
                additional_info={
                    "total_models": len(model_files),
                    "loaded_models": loaded_models,
                    "models_directory": str(models_path)
                }
            )
            
            logger.info(f"✅ ML模型健康检查完成 - {loaded_models}/{len(model_files)}个模型可用")
            
        except Exception as e:
            results["lightgbm_models"] = HealthStatus(
                service_name="LightGBM Models",
                category="ml_services",
                is_healthy=False,
                response_time_ms=0,
                last_check=datetime.now().isoformat(),
                error_message=str(e)
            )
            logger.error(f"❌ ML模型健康检查失败: {str(e)}")
        
        return results
    
    async def comprehensive_health_check(self) -> Dict[str, Any]:
        """全面健康检查"""
        logger.info("🔄 开始全面健康检查...")
        start_time = time.time()
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "unknown",
            "total_services": 0,
            "healthy_services": 0,
            "unhealthy_services": 0,
            "average_response_time": 0,
            "categories": {}
        }
        
        # 检查所有API端点
        api_tasks = []
        for service_name in self.service_endpoints.keys():
            api_tasks.append(self.check_service_health(service_name))
        
        api_results = await asyncio.gather(*api_tasks, return_exceptions=True)
        
        # 检查数据源
        data_source_results = await self.check_data_sources_health()
        
        # 检查ML模型
        ml_model_results = await self.check_ml_models_health("/Users/mac/Desktop/Arthera/MLModelTrainingTool")
        
        # 汇总所有结果
        all_results = {}
        
        # 处理API结果
        for i, result in enumerate(api_results):
            if isinstance(result, HealthStatus):
                service_name = list(self.service_endpoints.keys())[i]
                all_results[service_name] = result
                self.health_status[service_name] = result
        
        # 添加数据源结果
        all_results.update(data_source_results)
        
        # 添加ML模型结果
        all_results.update(ml_model_results)
        
        # 计算总体统计
        total_services = len(all_results)
        healthy_services = sum(1 for status in all_results.values() if status.is_healthy)
        unhealthy_services = total_services - healthy_services
        
        # 计算平均响应时间（只计算健康服务）
        healthy_response_times = [
            status.response_time_ms for status in all_results.values()
            if status.is_healthy and status.response_time_ms > 0
        ]
        avg_response_time = sum(healthy_response_times) / len(healthy_response_times) if healthy_response_times else 0
        
        # 按类别分组
        categories = {}
        for status in all_results.values():
            if status.category not in categories:
                categories[status.category] = {
                    "total": 0,
                    "healthy": 0,
                    "services": {}
                }
            categories[status.category]["total"] += 1
            if status.is_healthy:
                categories[status.category]["healthy"] += 1
            categories[status.category]["services"][status.service_name] = asdict(status)
        
        # 确定总体状态
        health_percentage = (healthy_services / total_services) * 100 if total_services > 0 else 0
        if health_percentage >= 90:
            overall_status = "excellent"
        elif health_percentage >= 75:
            overall_status = "good"
        elif health_percentage >= 50:
            overall_status = "warning"
        else:
            overall_status = "critical"
        
        results.update({
            "overall_status": overall_status,
            "health_percentage": round(health_percentage, 1),
            "total_services": total_services,
            "healthy_services": healthy_services,
            "unhealthy_services": unhealthy_services,
            "average_response_time": round(avg_response_time, 1),
            "categories": categories,
            "check_duration_ms": round((time.time() - start_time) * 1000, 1)
        })
        
        logger.info(f"✅ 全面健康检查完成 - {healthy_services}/{total_services} 服务健康 ({health_percentage:.1f}%)")
        
        return results
    
    def get_health_summary(self) -> Dict[str, Any]:
        """获取健康状态摘要"""
        if not self.health_status:
            return {
                "status": "no_data",
                "message": "尚未进行健康检查",
                "last_check": None
            }
        
        healthy_count = sum(1 for status in self.health_status.values() if status.is_healthy)
        total_count = len(self.health_status)
        health_percentage = (healthy_count / total_count) * 100 if total_count > 0 else 0
        
        return {
            "status": "healthy" if health_percentage >= 75 else "warning" if health_percentage >= 50 else "critical",
            "health_percentage": round(health_percentage, 1),
            "healthy_services": healthy_count,
            "total_services": total_count,
            "last_check": max(status.last_check for status in self.health_status.values()) if self.health_status else None
        }

# 全局健康监控实例
health_monitor = ServiceHealthMonitor()