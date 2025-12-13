"""
Tiingo API集成服务
提供美股、加密货币历史数据和EOD价格数据
"""

import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class TiingoService:
    """
    Tiingo API数据服务
    提供：美股历史数据、EOD数据、加密货币数据、实时价格
    """
    
    def __init__(self, api_key: str = None):
        if api_key is None:
            # 从环境变量或配置管理器获取API密钥
            try:
                from .service_config_manager import get_service_config_manager
                config_manager = get_service_config_manager()
                self.api_key = config_manager.get_api_key('tiingo')
            except Exception:
                self.api_key = None
        else:
            self.api_key = api_key
            
        self.base_url = "https://api.tiingo.com/tiingo"
        self.session = None
        
    async def get_session(self):
        """获取HTTP会话"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close(self):
        """关闭会话"""
        if self.session:
            await self.session.close()
    
    def is_configured(self) -> bool:
        """检查服务是否已正确配置"""
        return self.api_key is not None and self.api_key.strip() != ""
    
    async def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """统一API请求方法"""
        # 检查API密钥配置
        if not self.is_configured():
            return {
                "success": False, 
                "error": "Tiingo API密钥未配置，请在设置中配置API密钥",
                "requires_config": True
            }
        
        try:
            session = await self.get_session()
            
            # 设置请求头
            headers = {
                'Authorization': f'Token {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            url = f"{self.base_url}/{endpoint}"
            
            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return {"success": True, "data": data}
                elif response.status == 401:
                    return {"success": False, "error": "API密钥无效，请检查Tiingo API密钥"}
                elif response.status == 429:
                    return {"success": False, "error": "API请求频率超限，请稍后重试"}
                else:
                    error_text = await response.text()
                    return {"success": False, "error": f"HTTP {response.status}: {error_text}"}
                    
        except Exception as e:
            logger.error(f"Tiingo API请求失败: {e}")
            return {"success": False, "error": str(e)}

    # ============================================================================
    # 股票基本信息和元数据
    # ============================================================================
    
    async def get_stock_metadata(self, symbol: str) -> Dict[str, Any]:
        """获取股票元数据"""
        endpoint = f"daily/{symbol}"
        
        result = await self._make_request(endpoint)
        
        if result["success"] and result["data"]:
            metadata = result["data"]
            
            return {
                "success": True,
                "symbol": symbol,
                "data": {
                    "ticker": metadata.get("ticker"),
                    "name": metadata.get("name"),
                    "description": metadata.get("description"),
                    "start_date": metadata.get("startDate"),
                    "end_date": metadata.get("endDate"),
                    "exchange_code": metadata.get("exchangeCode")
                },
                "source": "tiingo"
            }
        
        return {"success": False, "error": "无法获取股票元数据"}
    
    async def search_stocks(self, query: str, limit: int = 20) -> Dict[str, Any]:
        """搜索股票 (使用通用搜索)"""
        # Tiingo没有专门的搜索API，这里提供一些常见股票的模拟搜索
        common_stocks = {
            "apple": [{"symbol": "AAPL", "name": "Apple Inc"}],
            "microsoft": [{"symbol": "MSFT", "name": "Microsoft Corporation"}],
            "google": [{"symbol": "GOOGL", "name": "Alphabet Inc Class A"}, 
                      {"symbol": "GOOG", "name": "Alphabet Inc Class C"}],
            "amazon": [{"symbol": "AMZN", "name": "Amazon.com Inc"}],
            "tesla": [{"symbol": "TSLA", "name": "Tesla Inc"}],
            "meta": [{"symbol": "META", "name": "Meta Platforms Inc"}],
            "netflix": [{"symbol": "NFLX", "name": "Netflix Inc"}],
            "nvidia": [{"symbol": "NVDA", "name": "NVIDIA Corporation"}],
            "berkshire": [{"symbol": "BRK.A", "name": "Berkshire Hathaway Inc Class A"}],
            "johnson": [{"symbol": "JNJ", "name": "Johnson & Johnson"}],
            "jpmorgan": [{"symbol": "JPM", "name": "JPMorgan Chase & Co"}],
            "visa": [{"symbol": "V", "name": "Visa Inc"}],
            "walmart": [{"symbol": "WMT", "name": "Walmart Inc"}],
            "disney": [{"symbol": "DIS", "name": "The Walt Disney Company"}],
            "coca": [{"symbol": "KO", "name": "The Coca-Cola Company"}],
            "intel": [{"symbol": "INTC", "name": "Intel Corporation"}],
            "ibm": [{"symbol": "IBM", "name": "International Business Machines Corporation"}],
            "oracle": [{"symbol": "ORCL", "name": "Oracle Corporation"}],
            "salesforce": [{"symbol": "CRM", "name": "Salesforce Inc"}],
            "adobe": [{"symbol": "ADBE", "name": "Adobe Inc"}]
        }
        
        query_lower = query.lower()
        results = []
        
        for key, stocks in common_stocks.items():
            if query_lower in key or any(query_lower in stock["symbol"].lower() for stock in stocks):
                results.extend(stocks)
        
        # 如果没有匹配结果，尝试直接验证symbol
        if not results and len(query) <= 5:
            metadata_result = await self.get_stock_metadata(query.upper())
            if metadata_result.get("success"):
                results.append({
                    "symbol": query.upper(),
                    "name": metadata_result["data"].get("name", "Unknown Company")
                })
        
        return {
            "success": True,
            "query": query,
            "total_found": len(results),
            "data": results[:limit],
            "source": "tiingo"
        }

    # ============================================================================
    # 历史价格数据
    # ============================================================================
    
    async def get_stock_price(self, symbol: str) -> Dict[str, Any]:
        """获取单个股票当前价格 - 别名方法"""
        return await self.get_latest_price(symbol)

    async def get_stock_prices(self, symbol: str, start_date: str = None, 
                             end_date: str = None, frequency: str = "daily") -> Dict[str, Any]:
        """
        获取股票历史价格
        frequency: daily, weekly, monthly, annually
        """
        endpoint = f"daily/{symbol}/prices"
        
        # 默认获取最近30天数据
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        
        params = {
            "startDate": start_date,
            "endDate": end_date,
            "format": "json",
            "resampleFreq": frequency
        }
        
        result = await self._make_request(endpoint, params)
        
        if result["success"] and result["data"]:
            price_data = result["data"]
            
            processed_prices = []
            for item in price_data:
                processed_prices.append({
                    "date": item.get("date"),
                    "open": item.get("open"),
                    "high": item.get("high"),
                    "low": item.get("low"),
                    "close": item.get("close"),
                    "volume": item.get("volume"),
                    "adj_open": item.get("adjOpen"),
                    "adj_high": item.get("adjHigh"),
                    "adj_low": item.get("adjLow"),
                    "adj_close": item.get("adjClose"),
                    "adj_volume": item.get("adjVolume"),
                    "dividend_cash": item.get("divCash"),
                    "split_factor": item.get("splitFactor")
                })
            
            return {
                "success": True,
                "symbol": symbol,
                "start_date": start_date,
                "end_date": end_date,
                "frequency": frequency,
                "prices": processed_prices,
                "total_count": len(processed_prices),
                "source": "tiingo"
            }
        
        return {"success": False, "error": "无法获取股票价格数据"}
    
    async def get_latest_prices(self, symbols: List[str]) -> Dict[str, Any]:
        """获取最新价格（批量）"""
        # Tiingo支持批量查询
        symbols_str = ",".join(symbols)
        endpoint = f"daily/{symbols_str}/prices"
        
        params = {
            "format": "json"
        }
        
        result = await self._make_request(endpoint, params)
        
        if result["success"] and result["data"]:
            price_data = result["data"]
            
            # 处理单个symbol和多个symbols的响应格式差异
            if isinstance(price_data, dict):
                price_data = [price_data]
            
            processed_prices = []
            for ticker_data in price_data:
                if isinstance(ticker_data, list) and len(ticker_data) > 0:
                    # 取最新的价格数据
                    latest = ticker_data[-1] if ticker_data else {}
                else:
                    latest = ticker_data
                
                processed_prices.append({
                    "symbol": latest.get("ticker", ""),
                    "date": latest.get("date"),
                    "open": latest.get("open"),
                    "high": latest.get("high"),
                    "low": latest.get("low"),
                    "close": latest.get("close"),
                    "volume": latest.get("volume"),
                    "adj_close": latest.get("adjClose")
                })
            
            return {
                "success": True,
                "symbols": symbols,
                "prices": processed_prices,
                "total_count": len(processed_prices),
                "source": "tiingo"
            }
        
        return {"success": False, "error": "无法获取最新价格"}

    # ============================================================================
    # 加密货币数据
    # ============================================================================
    
    async def get_crypto_metadata(self, symbol: str = None) -> Dict[str, Any]:
        """获取加密货币元数据"""
        if symbol:
            endpoint = f"crypto/{symbol}"
        else:
            endpoint = "crypto"
        
        # 使用crypto API
        crypto_url = f"https://api.tiingo.com/tiingo/{endpoint}"
        
        try:
            session = await self.get_session()
            headers = {
                'Authorization': f'Token {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            async with session.get(crypto_url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if symbol:
                        # 单个加密货币
                        if data:
                            crypto_info = data[0] if isinstance(data, list) else data
                            return {
                                "success": True,
                                "symbol": symbol,
                                "data": {
                                    "ticker": crypto_info.get("ticker"),
                                    "name": crypto_info.get("name"),
                                    "description": crypto_info.get("description"),
                                    "base_currency": crypto_info.get("baseCurrency"),
                                    "quote_currency": crypto_info.get("quoteCurrency")
                                },
                                "source": "tiingo"
                            }
                    else:
                        # 所有加密货币列表
                        crypto_list = []
                        for crypto in data[:50]:  # 限制50个
                            crypto_list.append({
                                "ticker": crypto.get("ticker"),
                                "name": crypto.get("name"),
                                "base_currency": crypto.get("baseCurrency"),
                                "quote_currency": crypto.get("quoteCurrency")
                            })
                        
                        return {
                            "success": True,
                            "cryptocurrencies": crypto_list,
                            "total_count": len(crypto_list),
                            "source": "tiingo"
                        }
                
        except Exception as e:
            logger.error(f"加密货币元数据请求失败: {e}")
        
        return {"success": False, "error": "无法获取加密货币元数据"}
    
    async def get_crypto_prices(self, symbol: str, start_date: str = None,
                              end_date: str = None, frequency: str = "1Day") -> Dict[str, Any]:
        """
        获取加密货币历史价格
        frequency: 1min, 5min, 15min, 30min, 1hour, 4hour, 1Day
        """
        endpoint = f"crypto/prices"
        
        # 默认获取最近7天数据
        if not start_date:
            start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        
        params = {
            "tickers": symbol,
            "startDate": start_date,
            "endDate": end_date,
            "resampleFreq": frequency
        }
        
        # 使用crypto价格API
        crypto_url = f"https://api.tiingo.com/tiingo/{endpoint}"
        
        try:
            session = await self.get_session()
            headers = {
                'Authorization': f'Token {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            async with session.get(crypto_url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    processed_prices = []
                    for item in data:
                        price_info = item.get("priceData", [])
                        for price in price_info:
                            processed_prices.append({
                                "date": price.get("date"),
                                "open": price.get("open"),
                                "high": price.get("high"),
                                "low": price.get("low"),
                                "close": price.get("close"),
                                "volume": price.get("volume"),
                                "volume_notional": price.get("volumeNotional")
                            })
                    
                    return {
                        "success": True,
                        "symbol": symbol,
                        "start_date": start_date,
                        "end_date": end_date,
                        "frequency": frequency,
                        "prices": processed_prices,
                        "total_count": len(processed_prices),
                        "source": "tiingo"
                    }
                
        except Exception as e:
            logger.error(f"加密货币价格请求失败: {e}")
        
        return {"success": False, "error": "无法获取加密货币价格"}
    
    async def get_crypto_top_level(self) -> Dict[str, Any]:
        """获取加密货币实时价格摘要"""
        endpoint = "crypto/top"
        crypto_url = f"https://api.tiingo.com/tiingo/{endpoint}"
        
        try:
            session = await self.get_session()
            headers = {
                'Authorization': f'Token {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            async with session.get(crypto_url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    processed_data = []
                    for crypto in data[:20]:  # 限制前20名
                        top_info = crypto.get("topOfBookData", [])
                        if top_info:
                            latest = top_info[0]
                            processed_data.append({
                                "ticker": crypto.get("ticker"),
                                "base_currency": crypto.get("baseCurrency"),
                                "quote_currency": crypto.get("quoteCurrency"),
                                "last_price": latest.get("lastPrice"),
                                "bid_size": latest.get("bidSize"),
                                "bid_price": latest.get("bidPrice"),
                                "ask_size": latest.get("askSize"), 
                                "ask_price": latest.get("askPrice"),
                                "mid_price": latest.get("midPrice"),
                                "last_size_notional": latest.get("lastSizeNotional"),
                                "last_size": latest.get("lastSize"),
                                "timestamp": latest.get("timestamp")
                            })
                    
                    return {
                        "success": True,
                        "top_cryptocurrencies": processed_data,
                        "total_count": len(processed_data),
                        "source": "tiingo"
                    }
                
        except Exception as e:
            logger.error(f"加密货币Top数据请求失败: {e}")
        
        return {"success": False, "error": "无法获取加密货币Top数据"}

    # ============================================================================
    # 新闻数据
    # ============================================================================
    
    async def get_news(self, symbols: List[str] = None, tags: List[str] = None,
                      sources: List[str] = None, limit: int = 50,
                      offset: int = 0) -> Dict[str, Any]:
        """获取新闻数据"""
        endpoint = "news"
        
        params = {
            "limit": limit,
            "offset": offset
        }
        
        if symbols:
            params["tickers"] = ",".join(symbols)
        if tags:
            params["tags"] = ",".join(tags)
        if sources:
            params["sources"] = ",".join(sources)
        
        result = await self._make_request(endpoint, params)
        
        if result["success"] and result["data"]:
            news_data = result["data"]
            
            processed_news = []
            for article in news_data:
                processed_news.append({
                    "id": article.get("id"),
                    "title": article.get("title"),
                    "url": article.get("url"),
                    "description": article.get("description"),
                    "published_date": article.get("publishedDate"),
                    "crawler_name": article.get("crawlDate"),
                    "source": article.get("source"),
                    "tags": article.get("tags", []),
                    "tickers": article.get("tickers", [])
                })
            
            return {
                "success": True,
                "symbols": symbols,
                "tags": tags,
                "sources": sources,
                "news": processed_news,
                "total_count": len(processed_news),
                "source": "tiingo"
            }
        
        return {"success": False, "error": "无法获取新闻数据"}

# 创建全局Tiingo服务实例
tiingo_service = None

def get_tiingo_service() -> TiingoService:
    """获取Tiingo服务实例"""
    global tiingo_service
    if tiingo_service is None:
        tiingo_service = TiingoService()
    return tiingo_service

async def close_tiingo_service():
    """关闭Tiingo服务"""
    global tiingo_service
    if tiingo_service:
        await tiingo_service.close()
        tiingo_service = None

# 测试函数
async def test_tiingo_service():
    """测试Tiingo API服务"""
    service = get_tiingo_service()
    
    print("🧪 测试Tiingo API服务...")
    
    # 测试股票元数据
    print("\n1. 测试股票元数据 (AAPL)...")
    metadata_result = await service.get_stock_metadata("AAPL")
    print(f"结果: {metadata_result.get('success', False)}")
    if metadata_result.get('success'):
        data = metadata_result['data']
        print(f"股票名称: {data.get('name')}")
        print(f"交易所: {data.get('exchange_code')}")
    
    # 测试历史价格
    print("\n2. 测试历史价格 (AAPL)...")
    prices_result = await service.get_stock_prices("AAPL", frequency="daily")
    print(f"结果: {prices_result.get('success', False)}")
    if prices_result.get('success'):
        prices = prices_result.get('prices', [])
        print(f"价格数据点数: {len(prices)}")
        if prices:
            latest = prices[-1]
            print(f"最新价格: ${latest.get('close')}")
    
    # 测试批量最新价格
    print("\n3. 测试批量最新价格...")
    latest_result = await service.get_latest_prices(["AAPL", "MSFT", "GOOGL"])
    print(f"结果: {latest_result.get('success', False)}")
    if latest_result.get('success'):
        print(f"获取了 {latest_result.get('total_count', 0)} 只股票价格")
    
    # 测试加密货币元数据
    print("\n4. 测试加密货币元数据...")
    crypto_meta_result = await service.get_crypto_metadata()
    print(f"结果: {crypto_meta_result.get('success', False)}")
    if crypto_meta_result.get('success'):
        cryptos = crypto_meta_result.get('cryptocurrencies', [])
        print(f"支持的加密货币数量: {len(cryptos)}")
    
    # 测试新闻
    print("\n5. 测试新闻...")
    news_result = await service.get_news(symbols=["AAPL"], limit=5)
    print(f"结果: {news_result.get('success', False)}")
    if news_result.get('success'):
        print(f"新闻数量: {news_result.get('total_count', 0)}")
    
    await service.close()
    print("\n✅ Tiingo API测试完成")

if __name__ == "__main__":
    asyncio.run(test_tiingo_service())