"""
配置管理
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    """应用配置"""
    
    # 基础配置
    APP_NAME: str = "Arthera Quant Platform"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # 数据库配置
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://localhost:5432/arthera_quant")
    
    # Redis配置
    REDIS_URL: str = "redis://localhost:6379"
    
    # JWT配置
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24小时
    
    # 固定端口配置
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8002
    
    # CORS配置 - 固定端口
    CORS_ORIGINS: list = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ]
    
    # 数据源配置
    AKSHARE_TOKEN: Optional[str] = None
    QUANTENGINE_LICENSE: Optional[str] = None
    
    # 缓存配置
    CACHE_TTL_MARKET_DATA: int = 30  # 30秒
    CACHE_TTL_HISTORICAL_DATA: int = 3600  # 1小时
    CACHE_TTL_STRATEGY_RESULTS: int = 1800  # 30分钟
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # 任务队列配置
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # WebSocket配置
    WS_HEARTBEAT_INTERVAL: int = 30  # 30秒
    WS_MAX_CONNECTIONS_PER_CLIENT: int = 5
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# 全局设置实例
settings = Settings()

# 数据库配置
DATABASE_CONFIG = {
    "echo": settings.DEBUG,
    "pool_size": 5,
    "max_overflow": 10,
    "pool_timeout": 30,
    "pool_recycle": 1800,
}

# Redis配置
REDIS_CONFIG = {
    "decode_responses": True,
    "socket_timeout": 5,
    "socket_connect_timeout": 5,
    "retry_on_timeout": True,
}

# Celery配置
CELERY_CONFIG = {
    "broker_url": settings.CELERY_BROKER_URL,
    "result_backend": settings.CELERY_RESULT_BACKEND,
    "task_serializer": "json",
    "accept_content": ["json"],
    "result_serializer": "json",
    "timezone": "Asia/Shanghai",
    "enable_utc": True,
    "task_track_started": True,
    "task_time_limit": 30 * 60,  # 30分钟
    "task_soft_time_limit": 25 * 60,  # 25分钟
}