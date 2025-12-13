"""
数据提供者服务模块
集成多个专业级金融数据API：
- AkShare (A股数据)
- Finnhub (全球股票+加密货币)
- News API (全球财经新闻)
- Financial Modeling Prep (美股财务数据)
- Tiingo (历史数据+加密货币)
- 统一数据聚合服务
"""

from .akshare_service import AkShareService
from .enhanced_akshare_service import get_enhanced_akshare_service
from .finnhub_service import get_finnhub_service, FinnhubService
from .news_api_service import get_news_api_service, NewsAPIService
from .fmp_service import get_fmp_service, FMPService
from .tiingo_service import get_tiingo_service, TiingoService
from .databento_service import get_databento_service, DatabentoService
from .unified_data_service import get_unified_data_service, UnifiedDataService

__all__ = [
    # 原始服务
    "AkShareService",
    
    # 增强服务获取函数
    "get_enhanced_akshare_service",
    "get_finnhub_service", 
    "get_news_api_service",
    "get_fmp_service",
    "get_tiingo_service",
    "get_databento_service",
    
    # 服务类
    "FinnhubService",
    "NewsAPIService", 
    "FMPService",
    "TiingoService",
    "DatabentoService",
    
    # 统一聚合服务
    "get_unified_data_service",
    "UnifiedDataService"
]