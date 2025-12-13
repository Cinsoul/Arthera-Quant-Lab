#!/usr/bin/env python3

"""
数据源服务配置状态检查脚本
检查所有已配置的数据源服务和API密钥
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

import os
import asyncio
from backend.data_provider.finnhub_service import FinnhubService
from backend.data_provider.fmp_service import FMPService  
from backend.data_provider.news_api_service import NewsAPIService
from backend.data_provider.tiingo_service import TiingoService
from backend.data_provider.twelvedata_service import TwelveDataService
from backend.data_provider.enhanced_akshare_service import EnhancedAkShareService
from backend.data_provider.databento_service import DatabentoService

async def check_service_config():
    """检查所有数据源服务配置"""
    print("🔍 检查所有数据源服务配置状态...\n")
    
    services = {
        "Finnhub": {
            "class": FinnhubService,
            "test_method": "get_us_stock_quote",
            "test_symbol": "AAPL",
            "description": "全球股票、加密货币、外汇数据"
        },
        "FMP": {
            "class": FMPService,
            "test_method": "get_company_quote",
            "test_symbol": "AAPL", 
            "description": "美股财务数据和实时报价"
        },
        "News API": {
            "class": NewsAPIService,
            "test_method": "get_financial_news",
            "test_symbol": None,
            "description": "全球财经新闻"
        },
        "Tiingo": {
            "class": TiingoService,
            "test_method": "get_stock_prices",
            "test_symbol": "AAPL",
            "description": "历史股票数据和实时价格"
        },
        "TwelveData": {
            "class": TwelveDataService,
            "test_method": "get_real_time_quote",
            "test_symbol": "AAPL",
            "description": "实时和历史金融数据"
        },
        "AKShare": {
            "class": EnhancedAkShareService,
            "test_method": "get_realtime_quote",
            "test_symbol": "600519",
            "description": "A股和中国金融数据"
        },
        "Databento": {
            "class": DatabentoService,
            "test_method": "get_level2_data",
            "test_symbol": "AAPL",
            "description": "专业级别的Level2数据"
        }
    }
    
    for service_name, config in services.items():
        print(f"📡 {service_name}")
        print(f"   描述: {config['description']}")
        
        try:
            # 初始化服务
            service = config["class"]()
            
            # 检查API密钥
            if hasattr(service, 'api_key'):
                api_key = service.api_key
                if api_key and api_key != "YOUR_API_KEY" and api_key != "YOUR_DATABENTO_API_KEY":
                    key_preview = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else api_key
                    print(f"   ✅ API密钥: {key_preview}")
                else:
                    print(f"   ❌ API密钥: 未配置或使用默认值")
                    continue
            else:
                print(f"   ✅ 免费服务: 无需API密钥")
            
            # 测试服务连接
            if config["test_method"]:
                try:
                    method = getattr(service, config["test_method"])
                    if config["test_symbol"]:
                        if service_name == "News API":
                            result = await method(limit=1)
                        else:
                            result = await method(config["test_symbol"])
                    else:
                        result = await method()
                    
                    if result and result.get("success"):
                        print(f"   ✅ 连接测试: 成功")
                        print(f"   📊 数据源: {result.get('source', 'unknown')}")
                    else:
                        print(f"   ⚠️  连接测试: 返回数据但可能是模拟数据")
                        print(f"   📊 数据源: {result.get('source', 'unknown')}")
                except Exception as e:
                    print(f"   ❌ 连接测试: 失败 - {str(e)[:50]}...")
            
            # 关闭服务连接
            if hasattr(service, 'close'):
                await service.close()
                
        except Exception as e:
            print(f"   ❌ 服务初始化失败: {str(e)[:50]}...")
        
        print()

def check_api_keys_summary():
    """检查API密钥配置摘要"""
    print("🔑 API密钥配置摘要:")
    
    env_map = {
        "Finnhub": "FINNHUB_API_KEY",
        "FMP": "FMP_API_KEY",
        "News API": "NEWSAPI_API_KEY",
        "Tiingo": "TIINGO_API_KEY",
        "TwelveData": "TWELVEDATA_API_KEY",
        "AKShare": None,
        "Databento": "DATABENTO_API_KEY",
        "FRED": "FRED_API_KEY",
        "AlphaVantage": "ALPHAVANTAGE_API_KEY",
        "Quandl": "QUANDL_API_KEY"
    }

    for service, env_var in env_map.items():
        if env_var is None:
            print(f"   ✅ {service}: 免费服务 / 无需密钥")
            continue

        key = os.getenv(env_var)
        if key:
            preview = f"***{key[-4:]}" if len(key) >= 4 else "***"
            print(f"   ✅ {service}: {preview} (来自 {env_var})")
        else:
            print(f"   ❌ {service}: 未配置 (设置 {env_var})")
    
    print()

if __name__ == "__main__":
    print("🚀 数据源服务配置检查工具\n")
    
    check_api_keys_summary()
    
    try:
        asyncio.run(check_service_config())
        print("✅ 检查完成!")
    except Exception as e:
        print(f"❌ 检查失败: {e}")
        import traceback
        traceback.print_exc()
