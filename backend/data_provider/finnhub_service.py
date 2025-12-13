"""
Finnhub API集成服务
提供全球股票、外汇、加密货币实时和历史数据
"""

import aiohttp
import asyncio
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
import json

logger = logging.getLogger(__name__)

class FinnhubService:
    """
    Finnhub API数据服务
    支持：美股、加密货币、外汇、商品、指数
    """
    
    def __init__(self, api_key: str = None):
        if api_key is None:
            # 从配置管理器获取API密钥
            try:
                from .service_config_manager import get_service_config_manager
                config_manager = get_service_config_manager()
                self.api_key = config_manager.get_api_key('finnhub')
            except Exception:
                self.api_key = None
        else:
            self.api_key = api_key
            
        self.base_url = "https://finnhub.io/api/v1"
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
                "error": "Finnhub API密钥未配置，请在设置中配置API密钥",
                "requires_config": True
            }
        
        try:
            session = await self.get_session()
            
            # 添加API密钥到参数
            if params is None:
                params = {}
            params['token'] = self.api_key
            
            url = f"{self.base_url}/{endpoint}"
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return {"success": True, "data": data}
                elif response.status == 429:
                    return {"success": False, "error": "API请求频率超限"}
                else:
                    error_text = await response.text()
                    return {"success": False, "error": f"HTTP {response.status}: {error_text}"}
                    
        except Exception as e:
            logger.error(f"Finnhub API请求失败: {e}")
            return {"success": False, "error": str(e)}

    # ============================================================================
    # 美股数据
    # ============================================================================
    
    async def get_us_stock_quote(self, symbol: str) -> Dict[str, Any]:
        """获取美股实时报价"""
        result = await self._make_request("quote", {"symbol": symbol})
        
        if result["success"] and result["data"]:
            quote_data = result["data"]
            return {
                "success": True,
                "symbol": symbol,
                "data": {
                    "symbol": symbol,
                    "current_price": quote_data.get("c"),
                    "change": quote_data.get("d"),
                    "change_percent": quote_data.get("dp"),
                    "high": quote_data.get("h"),
                    "low": quote_data.get("l"),
                    "open": quote_data.get("o"),
                    "previous_close": quote_data.get("pc"),
                    "timestamp": datetime.fromtimestamp(quote_data.get("t", 0)).isoformat() if quote_data.get("t") else None
                },
                "source": "finnhub"
            }
        
        return result
    
    async def search_us_stocks(self, query: str) -> Dict[str, Any]:
        """搜索美股股票"""
        result = await self._make_request("search", {"q": query})
        
        if result["success"] and result["data"]:
            search_results = result["data"].get("result", [])
            stocks = []
            
            for item in search_results[:20]:  # 限制返回20个结果
                stocks.append({
                    "symbol": item.get("symbol"),
                    "description": item.get("description"),
                    "display_symbol": item.get("displaySymbol"),
                    "type": item.get("type")
                })
            
            return {
                "success": True,
                "query": query,
                "total_found": len(stocks),
                "data": stocks,
                "source": "finnhub"
            }
        
        return result
    
    async def get_us_stock_candles(self, symbol: str, resolution: str = "D", 
                                 days_back: int = 30) -> Dict[str, Any]:
        """
        获取美股K线数据
        resolution: 1, 5, 15, 30, 60, D, W, M
        """
        end_time = int(datetime.now().timestamp())
        start_time = int((datetime.now() - timedelta(days=days_back)).timestamp())
        
        params = {
            "symbol": symbol,
            "resolution": resolution,
            "from": start_time,
            "to": end_time
        }
        
        result = await self._make_request("stock/candle", params)
        
        if result["success"] and result["data"]:
            candle_data = result["data"]
            
            if candle_data.get("s") == "ok":
                # 构建K线数据
                timestamps = candle_data.get("t", [])
                opens = candle_data.get("o", [])
                highs = candle_data.get("h", [])
                lows = candle_data.get("l", [])
                closes = candle_data.get("c", [])
                volumes = candle_data.get("v", [])
                
                klines = []
                for i in range(len(timestamps)):
                    klines.append({
                        "timestamp": datetime.fromtimestamp(timestamps[i]).isoformat(),
                        "open": opens[i],
                        "high": highs[i],
                        "low": lows[i],
                        "close": closes[i],
                        "volume": volumes[i]
                    })
                
                return {
                    "success": True,
                    "symbol": symbol,
                    "resolution": resolution,
                    "data": klines,
                    "total_count": len(klines),
                    "source": "finnhub"
                }
        
        return {"success": False, "error": "无法获取K线数据"}

    # ============================================================================
    # 加密货币数据  
    # ============================================================================
    
    async def get_crypto_quote(self, symbol: str) -> Dict[str, Any]:
        """获取加密货币实时报价"""
        # Finnhub加密货币symbol格式：BINANCE:BTCUSDT
        if ":" not in symbol:
            symbol = f"BINANCE:{symbol}USDT"
            
        result = await self._make_request("quote", {"symbol": symbol})
        
        if result["success"] and result["data"]:
            quote_data = result["data"]
            return {
                "success": True,
                "symbol": symbol,
                "data": {
                    "symbol": symbol,
                    "current_price": quote_data.get("c"),
                    "change": quote_data.get("d"),
                    "change_percent": quote_data.get("dp"),
                    "high": quote_data.get("h"),
                    "low": quote_data.get("l"),
                    "open": quote_data.get("o"),
                    "previous_close": quote_data.get("pc"),
                    "timestamp": datetime.fromtimestamp(quote_data.get("t", 0)).isoformat() if quote_data.get("t") else None
                },
                "source": "finnhub"
            }
        
        return result
    
    async def get_crypto_exchanges(self) -> Dict[str, Any]:
        """获取支持的加密货币交易所"""
        result = await self._make_request("crypto/exchange")
        
        if result["success"]:
            exchanges = result["data"]
            return {
                "success": True,
                "exchanges": exchanges,
                "total_count": len(exchanges),
                "source": "finnhub"
            }
        
        return result
    
    async def get_crypto_symbols(self, exchange: str = "BINANCE") -> Dict[str, Any]:
        """获取交易所的加密货币交易对"""
        result = await self._make_request("crypto/symbol", {"exchange": exchange})
        
        if result["success"]:
            symbols = result["data"][:50]  # 限制返回50个
            
            crypto_data = []
            for symbol_info in symbols:
                crypto_data.append({
                    "symbol": symbol_info.get("symbol"),
                    "display_symbol": symbol_info.get("displaySymbol"),
                    "description": symbol_info.get("description")
                })
            
            return {
                "success": True,
                "exchange": exchange,
                "symbols": crypto_data,
                "total_count": len(crypto_data),
                "source": "finnhub"
            }
        
        return result

    # ============================================================================
    # 公司基本信息
    # ============================================================================
    
    async def get_company_profile(self, symbol: str) -> Dict[str, Any]:
        """获取公司基本信息"""
        result = await self._make_request("stock/profile2", {"symbol": symbol})
        
        if result["success"] and result["data"]:
            profile = result["data"]
            return {
                "success": True,
                "symbol": symbol,
                "data": {
                    "name": profile.get("name"),
                    "country": profile.get("country"),
                    "currency": profile.get("currency"),
                    "exchange": profile.get("exchange"),
                    "ipo": profile.get("ipo"),
                    "market_capitalization": profile.get("marketCapitalization"),
                    "outstanding_shares": profile.get("shareOutstanding"),
                    "industry": profile.get("finnhubIndustry"),
                    "logo": profile.get("logo"),
                    "phone": profile.get("phone"),
                    "weburl": profile.get("weburl"),
                    "ticker": profile.get("ticker")
                },
                "source": "finnhub"
            }
        
        return result
    
    # ============================================================================
    # 市场数据
    # ============================================================================
    
    async def get_market_news(self, category: str = "general", limit: int = 50) -> Dict[str, Any]:
        """
        获取市场新闻
        category: general, forex, crypto, merger
        """
        result = await self._make_request("news", {
            "category": category,
            "minId": 0
        })
        
        if result["success"] and result["data"]:
            news_items = result["data"][:limit]
            
            processed_news = []
            for item in news_items:
                processed_news.append({
                    "id": item.get("id"),
                    "category": item.get("category"),
                    "datetime": datetime.fromtimestamp(item.get("datetime", 0)).isoformat(),
                    "headline": item.get("headline"),
                    "image": item.get("image"),
                    "related": item.get("related"),
                    "source": item.get("source"),
                    "summary": item.get("summary"),
                    "url": item.get("url")
                })
            
            return {
                "success": True,
                "category": category,
                "news": processed_news,
                "total_count": len(processed_news),
                "source": "finnhub"
            }
        
        return result
    
    async def get_economic_calendar(self) -> Dict[str, Any]:
        """获取经济日历"""
        result = await self._make_request("calendar/economic")
        
        if result["success"]:
            events = result["data"].get("economicCalendar", [])
            
            processed_events = []
            for event in events[:20]:  # 限制20个事件
                processed_events.append({
                    "event": event.get("event"),
                    "time": event.get("time"),
                    "country": event.get("country"),
                    "unit": event.get("unit"),
                    "estimate": event.get("estimate"),
                    "previous": event.get("previous"),
                    "actual": event.get("actual"),
                    "impact": event.get("impact")
                })
            
            return {
                "success": True,
                "events": processed_events,
                "total_count": len(processed_events),
                "source": "finnhub"
            }
        
        return result

# 创建全局Finnhub服务实例
finnhub_service = None

def get_finnhub_service() -> FinnhubService:
    """获取Finnhub服务实例"""
    global finnhub_service
    if finnhub_service is None:
        finnhub_service = FinnhubService()
    return finnhub_service

async def close_finnhub_service():
    """关闭Finnhub服务"""
    global finnhub_service
    if finnhub_service:
        await finnhub_service.close()
        finnhub_service = None

# 测试函数
async def test_finnhub_service():
    """测试Finnhub API服务"""
    service = get_finnhub_service()
    
    print("🧪 测试Finnhub API服务...")
    
    # 测试美股报价
    print("\n1. 测试美股报价 (AAPL)...")
    quote_result = await service.get_us_stock_quote("AAPL")
    print(f"结果: {quote_result.get('success', False)}")
    if quote_result.get('success'):
        print(f"AAPL价格: ${quote_result['data']['current_price']}")
    
    # 测试股票搜索
    print("\n2. 测试股票搜索 (Apple)...")
    search_result = await service.search_us_stocks("Apple")
    print(f"搜索结果: {search_result.get('total_found', 0)}个")
    
    # 测试加密货币
    print("\n3. 测试加密货币报价 (BTC)...")
    crypto_result = await service.get_crypto_quote("BTC")
    print(f"结果: {crypto_result.get('success', False)}")
    
    # 测试市场新闻
    print("\n4. 测试市场新闻...")
    news_result = await service.get_market_news("general", 5)
    print(f"新闻数量: {news_result.get('total_count', 0)}")
    
    await service.close()
    print("\n✅ Finnhub API测试完成")

if __name__ == "__main__":
    asyncio.run(test_finnhub_service())