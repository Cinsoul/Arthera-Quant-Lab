"""
依赖注入管理
"""

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from typing import AsyncGenerator
import logging
import os

from .config import settings, DATABASE_CONFIG, REDIS_CONFIG

logger = logging.getLogger(__name__)

# 数据库引擎 - 使用SQLite作为默认数据库
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./arthera_quant.db")

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

# 会话工厂
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Redis连接池
redis_pool = None

async def get_database():
    """获取数据库会话"""
    try:
        # 为了简化，返回一个Mock数据库对象
        class MockDB:
            async def ping(self):
                return True
            async def execute(self, query):
                return True
        return MockDB()
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return None

async def get_redis() -> redis.Redis:
    """获取Redis连接"""
    global redis_pool
    
    try:
        if redis_pool is None:
            # 尝试连接Redis，失败则使用内存缓存
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            redis_pool = redis.ConnectionPool.from_url(
                redis_url,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
            )
        
        return redis.Redis(connection_pool=redis_pool)
    except Exception as e:
        logger.warning(f"Redis connection failed, using mock: {e}")
        # 返回Mock Redis用于开发环境
        class MockRedis:
            async def ping(self):
                return True
            async def get(self, key):
                return None
            async def set(self, key, value, ex=None):
                return True
            async def delete(self, key):
                return True
            async def exists(self, key):
                return False
        return MockRedis()

async def get_cache_key(prefix: str, *args) -> str:
    """生成缓存键"""
    key_parts = [prefix] + [str(arg) for arg in args]
    return ":".join(key_parts)

class ServiceManager:
    """服务管理器 - 单例模式"""
    _instance = None
    _services = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def get_service(self, service_name: str):
        """获取服务实例"""
        if service_name not in self._services:
            await self._init_service(service_name)
        return self._services[service_name]
    
    async def _init_service(self, service_name: str):
        """初始化服务"""
        try:
            if service_name == "market_data":
                from ..data_provider.akshare_service import AkShareService
                self._services[service_name] = AkShareService()
                
            elif service_name == "quant_engine":
                from ..quant_engine.strategy_service import StrategyService
                self._services[service_name] = StrategyService()
                
            elif service_name == "portfolio":
                from ..quant_engine.portfolio_service import PortfolioService
                self._services[service_name] = PortfolioService()
                
            elif service_name == "risk_analysis":
                from ..quant_engine.risk_service import RiskService
                self._services[service_name] = RiskService()
                
            logger.info(f"Service {service_name} initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize service {service_name}: {e}")
            raise

# 全局服务管理器
service_manager = ServiceManager()

async def get_market_data_service():
    """获取市场数据服务"""
    return await service_manager.get_service("market_data")

async def get_quant_engine_service():
    """获取量化引擎服务"""
    return await service_manager.get_service("quant_engine")

async def get_portfolio_service():
    """获取组合管理服务"""
    return await service_manager.get_service("portfolio")

async def get_risk_analysis_service():
    """获取风险分析服务"""
    return await service_manager.get_service("risk_analysis")