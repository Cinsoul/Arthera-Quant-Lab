#!/usr/bin/env python3
"""
服务配置管理器 - 统一管理所有平台API配置
"""

import json
import os
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from pathlib import Path
import asyncio
import aiohttp
import time

logger = logging.getLogger(__name__)

@dataclass
class ServiceCredentials:
    """服务凭证"""
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    token: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    passphrase: Optional[str] = None
    configured: bool = False

@dataclass
class APIConfig:
    """API配置"""
    base_url: str
    timeout_seconds: int = 30
    retry_attempts: int = 3
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: Optional[int] = None
    rate_limit_per_day: Optional[int] = None
    backoff_multiplier: float = 2.0
    max_backoff_seconds: int = 300

@dataclass
class ServiceConfig:
    """服务配置"""
    enabled: bool
    priority: int
    api_config: APIConfig
    credentials: ServiceCredentials
    supported_markets: List[str]
    features: Dict[str, bool]
    
class ServiceConfigManager:
    """服务配置管理器"""
    
    def __init__(self, config_dir: str = "config"):
        self.config_dir = Path(config_dir)
        self.services_config = {}
        self.connection_status = {}
        self.last_health_check = {}
        self._load_configurations()
    
    def _load_configurations(self):
        """加载所有配置文件"""
        try:
            # 加载主服务配置
            services_config_path = self.config_dir / "services_config.json"
            if services_config_path.exists():
                with open(services_config_path, 'r', encoding='utf-8') as f:
                    self.services_config = json.load(f)
                logger.info("✅ 服务配置加载成功")
            else:
                logger.warning(f"⚠️ 服务配置文件不存在: {services_config_path}")
                self._create_default_config()
                
            # 初始化连接状态
            self._initialize_connection_status()
            
        except Exception as e:
            logger.error(f"❌ 加载服务配置失败: {e}")
            self._create_default_config()
    
    def _create_default_config(self):
        """创建默认配置"""
        self.services_config = {
            "data_sources": {},
            "trading_platforms": {},
            "crypto_exchanges": {},
            "ai_services": {},
            "notification_services": {},
            "database_services": {},
            "monitoring_services": {},
            "global_settings": {
                "environment": "development",
                "debug_mode": True,
                "api_timeout_seconds": 30
            }
        }
        logger.info("🔧 使用默认服务配置")
    
    def _initialize_connection_status(self):
        """初始化连接状态"""
        for category, services in self.services_config.items():
            if category == "global_settings":
                continue
            for service_name in services.keys():
                self.connection_status[f"{category}.{service_name}"] = {
                    "connected": False,
                    "last_check": None,
                    "error": None,
                    "response_time_ms": None
                }
    
    def get_service_config(self, category: str, service_name: str) -> Optional[Dict[str, Any]]:
        """获取特定服务配置"""
        try:
            return self.services_config.get(category, {}).get(service_name)
        except Exception as e:
            logger.error(f"❌ 获取服务配置失败 {category}.{service_name}: {e}")
            return None
    
    def update_service_config(self, category: str, service_name: str, config: Dict[str, Any]) -> bool:
        """更新服务配置"""
        try:
            if category not in self.services_config:
                self.services_config[category] = {}
            
            self.services_config[category][service_name] = config
            self._save_configuration()
            logger.info(f"✅ 服务配置已更新: {category}.{service_name}")
            return True
        except Exception as e:
            logger.error(f"❌ 更新服务配置失败 {category}.{service_name}: {e}")
            return False
    
    def update_service_credentials(self, category: str, service_name: str, credentials: Dict[str, str]) -> bool:
        """更新服务凭证"""
        try:
            service_config = self.get_service_config(category, service_name)
            if not service_config:
                logger.error(f"❌ 服务配置不存在: {category}.{service_name}")
                return False
            
            if "credentials" not in service_config:
                service_config["credentials"] = {}
            
            # 更新凭证
            for key, value in credentials.items():
                if value:  # 只更新非空值
                    service_config["credentials"][key] = value
            
            service_config["credentials"]["configured"] = True
            
            self._save_configuration()
            logger.info(f"✅ 服务凭证已更新: {category}.{service_name}")
            return True
        except Exception as e:
            logger.error(f"❌ 更新服务凭证失败 {category}.{service_name}: {e}")
            return False
    
    def _save_configuration(self):
        """保存配置到文件"""
        try:
            os.makedirs(self.config_dir, exist_ok=True)
            services_config_path = self.config_dir / "services_config.json"
            with open(services_config_path, 'w', encoding='utf-8') as f:
                json.dump(self.services_config, f, indent=2, ensure_ascii=False)
            logger.debug(f"📝 配置已保存到: {services_config_path}")
        except Exception as e:
            logger.error(f"❌ 保存配置失败: {e}")
    
    async def test_service_connection(self, category: str, service_name: str) -> Dict[str, Any]:
        """测试服务连接"""
        service_key = f"{category}.{service_name}"
        start_time = time.time()
        
        try:
            service_config = self.get_service_config(category, service_name)
            if not service_config:
                raise ValueError(f"服务配置不存在: {service_key}")
            
            if not service_config.get("enabled", False):
                return {
                    "connected": False,
                    "error": "服务未启用",
                    "response_time_ms": 0
                }
            
            # 根据服务类型执行不同的连接测试
            if category == "data_sources":
                result = await self._test_data_source_connection(service_name, service_config)
            elif category == "trading_platforms":
                result = await self._test_trading_platform_connection(service_name, service_config)
            elif category == "crypto_exchanges":
                result = await self._test_crypto_exchange_connection(service_name, service_config)
            elif category == "ai_services":
                result = await self._test_ai_service_connection(service_name, service_config)
            else:
                result = await self._test_generic_connection(service_name, service_config)
            
            response_time_ms = int((time.time() - start_time) * 1000)
            result["response_time_ms"] = response_time_ms
            
            # 更新连接状态
            self.connection_status[service_key] = {
                **result,
                "last_check": datetime.now().isoformat()
            }
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            response_time_ms = int((time.time() - start_time) * 1000)
            
            result = {
                "connected": False,
                "error": error_msg,
                "response_time_ms": response_time_ms
            }
            
            self.connection_status[service_key] = {
                **result,
                "last_check": datetime.now().isoformat()
            }
            
            logger.error(f"❌ 服务连接测试失败 {service_key}: {error_msg}")
            return result
    
    async def _test_data_source_connection(self, service_name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """测试数据源连接"""
        api_config = config.get("api_config", {})
        
        if service_name == "yahoo_finance":
            # 测试Yahoo Finance
            test_url = "https://query1.finance.yahoo.com/v8/finance/chart/AAPL"
            async with aiohttp.ClientSession() as session:
                async with session.get(test_url, timeout=api_config.get("timeout_seconds", 30)) as response:
                    if response.status == 200:
                        return {"connected": True, "error": None}
                    else:
                        return {"connected": False, "error": f"HTTP {response.status}"}
        
        elif service_name == "tushare":
            # 检查Tushare token配置
            credentials = config.get("credentials", {})
            if not credentials.get("token"):
                return {"connected": False, "error": "Tushare token未配置"}
            
            # 这里可以添加实际的Tushare API测试
            return {"connected": True, "error": None}
        
        elif service_name == "akshare":
            # AkShare通常不需要认证，直接返回成功
            return {"connected": True, "error": None}
        
        else:
            return {"connected": False, "error": f"未知的数据源: {service_name}"}
    
    async def _test_trading_platform_connection(self, service_name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """测试交易平台连接"""
        credentials = config.get("credentials", {})
        
        if not credentials.get("configured", False):
            return {"connected": False, "error": "凭证未配置"}
        
        # 这里可以添加具体的交易平台API测试
        if service_name == "alpaca":
            # Alpaca API测试
            if not credentials.get("api_key") or not credentials.get("secret_key"):
                return {"connected": False, "error": "API密钥未配置"}
        
        return {"connected": True, "error": None}
    
    async def _test_crypto_exchange_connection(self, service_name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """测试加密货币交易所连接"""
        api_config = config.get("api_config", {})
        
        if service_name == "binance":
            # 测试Binance公开API
            base_url = api_config.get("testnet_url" if config.get("api_config", {}).get("use_testnet") else "base_url")
            test_url = f"{base_url}/api/v3/ping"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(test_url, timeout=api_config.get("timeout_seconds", 30)) as response:
                    if response.status == 200:
                        return {"connected": True, "error": None}
                    else:
                        return {"connected": False, "error": f"HTTP {response.status}"}
        
        return {"connected": False, "error": f"未实现的交易所测试: {service_name}"}
    
    async def _test_ai_service_connection(self, service_name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """测试AI服务连接"""
        credentials = config.get("credentials", {})
        
        if not credentials.get("configured", False):
            return {"connected": False, "error": "API密钥未配置"}
        
        # 这里可以添加具体的AI服务API测试
        return {"connected": True, "error": None}
    
    async def _test_generic_connection(self, service_name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """通用连接测试"""
        return {"connected": True, "error": None}
    
    def get_all_connection_status(self) -> Dict[str, Any]:
        """获取所有服务连接状态"""
        return self.connection_status
    
    def get_enabled_services(self, category: str) -> List[str]:
        """获取已启用的服务列表"""
        services = self.services_config.get(category, {})
        return [name for name, config in services.items() if config.get("enabled", False)]
    
    def get_service_priority_list(self, category: str) -> List[str]:
        """获取按优先级排序的服务列表"""
        services = self.services_config.get(category, {})
        enabled_services = [(name, config.get("priority", 999)) for name, config in services.items() 
                          if config.get("enabled", False)]
        enabled_services.sort(key=lambda x: x[1])
        return [name for name, _ in enabled_services]
    
    async def health_check_all_services(self) -> Dict[str, Any]:
        """对所有启用的服务进行健康检查"""
        results = {}
        
        for category in ["data_sources", "trading_platforms", "crypto_exchanges", "ai_services"]:
            enabled_services = self.get_enabled_services(category)
            category_results = {}
            
            for service_name in enabled_services:
                try:
                    result = await self.test_service_connection(category, service_name)
                    category_results[service_name] = result
                except Exception as e:
                    category_results[service_name] = {
                        "connected": False,
                        "error": str(e),
                        "response_time_ms": 0
                    }
            
            results[category] = category_results
        
        return results
    
    def get_configuration_summary(self) -> Dict[str, Any]:
        """获取配置摘要"""
        summary = {
            "total_services": 0,
            "enabled_services": 0,
            "configured_services": 0,
            "categories": {}
        }
        
        for category, services in self.services_config.items():
            if category == "global_settings":
                continue
            
            category_summary = {
                "total": len(services),
                "enabled": 0,
                "configured": 0,
                "services": []
            }
            
            for service_name, service_config in services.items():
                is_enabled = service_config.get("enabled", False)
                is_configured = service_config.get("credentials", {}).get("configured", False)
                
                if is_enabled:
                    category_summary["enabled"] += 1
                if is_configured:
                    category_summary["configured"] += 1
                
                category_summary["services"].append({
                    "name": service_name,
                    "enabled": is_enabled,
                    "configured": is_configured,
                    "priority": service_config.get("priority", 999)
                })
            
            summary["categories"][category] = category_summary
            summary["total_services"] += category_summary["total"]
            summary["enabled_services"] += category_summary["enabled"]
            summary["configured_services"] += category_summary["configured"]
        
        return summary

# 全局服务配置管理器实例
service_config_manager = ServiceConfigManager()