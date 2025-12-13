"""
TwelveData API集成服务
提供实时和历史金融数据，支持股票、外汇、加密货币、ETF
"""

import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class TwelveDataService:
    """
    TwelveData API数据服务
    提供：股票、外汇、加密货币、ETF、指数数据
    """
    
    def __init__(self, api_key: str = None):
        if api_key is None:
            # 从配置管理器获取API密钥
            try:
                from .service_config_manager import get_service_config_manager
                config_manager = get_service_config_manager()
                self.api_key = config_manager.get_api_key('twelve_data')
            except Exception:
                self.api_key = None
        else:
            self.api_key = api_key
            
        self.base_url = "https://api.twelvedata.com"
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
    
    async def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """统一API请求方法"""
        try:
            session = await self.get_session()
            
            if params is None:
                params = {}
            params['apikey'] = self.api_key
            
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
            logger.error(f"TwelveData API请求失败: {e}")
            return {"success": False, "error": str(e)}

    # ============================================================================
    # 股票数据
    # ============================================================================
    
    async def get_real_time_quote(self, symbol: str, exchange: str = None) -> Dict[str, Any]:
        """获取实时报价 - 别名方法"""
        return await self.get_quote(symbol, exchange)

    async def get_real_time_price(self, symbol: str, exchange: str = None) -> Dict[str, Any]:
        """获取实时价格"""
        params = {"symbol": symbol}
        if exchange:
            params["exchange"] = exchange
            
        result = await self._make_request("price", params)
        
        if result["success"] and result["data"]:
            price_data = result["data"]
            return {
                "success": True,
                "symbol": symbol,
                "data": {
                    "symbol": symbol,
                    "price": float(price_data.get("price", 0)),
                    "exchange": exchange,
                    "currency": "USD",
                    "timestamp": datetime.now().isoformat()
                },
                "source": "twelvedata"
            }
        
        return result
    
    async def get_time_series(self, symbol: str, interval: str = "1day", 
                            outputsize: int = 30, exchange: str = None) -> Dict[str, Any]:
        """
        获取时间序列数据
        interval: 1min, 5min, 15min, 30min, 45min, 1h, 2h, 4h, 1day, 1week, 1month
        """
        params = {
            "symbol": symbol,
            "interval": interval,
            "outputsize": outputsize
        }
        if exchange:
            params["exchange"] = exchange
            
        result = await self._make_request("time_series", params)
        
        if result["success"] and result["data"]:
            ts_data = result["data"]
            
            if "values" in ts_data:
                processed_data = []
                for item in ts_data["values"]:
                    processed_data.append({
                        "datetime": item.get("datetime"),
                        "open": float(item.get("open", 0)),
                        "high": float(item.get("high", 0)),
                        "low": float(item.get("low", 0)),
                        "close": float(item.get("close", 0)),
                        "volume": int(item.get("volume", 0))
                    })
                
                return {
                    "success": True,
                    "symbol": symbol,
                    "interval": interval,
                    "data": processed_data,
                    "meta": ts_data.get("meta", {}),
                    "source": "twelvedata"
                }
        
        return {"success": False, "error": "无法获取时间序列数据"}
    
    async def get_quote(self, symbol: str, exchange: str = None) -> Dict[str, Any]:
        """获取详细报价"""
        params = {"symbol": symbol}
        if exchange:
            params["exchange"] = exchange
            
        result = await self._make_request("quote", params)
        
        if result["success"] and result["data"]:
            quote_data = result["data"]
            return {
                "success": True,
                "symbol": symbol,
                "data": {
                    "symbol": quote_data.get("symbol"),
                    "name": quote_data.get("name"),
                    "exchange": quote_data.get("exchange"),
                    "mic_code": quote_data.get("mic_code"),
                    "currency": quote_data.get("currency"),
                    "datetime": quote_data.get("datetime"),
                    "timestamp": int(quote_data.get("timestamp", 0)),
                    "open": float(quote_data.get("open", 0)),
                    "high": float(quote_data.get("high", 0)),
                    "low": float(quote_data.get("low", 0)),
                    "close": float(quote_data.get("close", 0)),
                    "volume": int(quote_data.get("volume", 0)),
                    "previous_close": float(quote_data.get("previous_close", 0)),
                    "change": float(quote_data.get("change", 0)),
                    "percent_change": float(quote_data.get("percent_change", 0)),
                    "fifty_two_week": quote_data.get("fifty_two_week", {}),
                    "is_market_open": quote_data.get("is_market_open"),
                    "extended_change": float(quote_data.get("extended_change", 0)),
                    "extended_percent_change": float(quote_data.get("extended_percent_change", 0))
                },
                "source": "twelvedata"
            }
        
        return result

    # ============================================================================
    # 加密货币数据
    # ============================================================================
    
    async def get_crypto_quote(self, symbol: str, market: str = "Binance") -> Dict[str, Any]:
        """获取加密货币报价"""
        params = {
            "symbol": f"{symbol}/USD",
            "exchange": market
        }
        
        result = await self._make_request("quote", params)
        
        if result["success"] and result["data"]:
            crypto_data = result["data"]
            return {
                "success": True,
                "symbol": symbol,
                "data": {
                    "symbol": symbol,
                    "market": market,
                    "price": float(crypto_data.get("close", 0)),
                    "change": float(crypto_data.get("change", 0)),
                    "percent_change": float(crypto_data.get("percent_change", 0)),
                    "high": float(crypto_data.get("high", 0)),
                    "low": float(crypto_data.get("low", 0)),
                    "volume": float(crypto_data.get("volume", 0)),
                    "timestamp": crypto_data.get("datetime"),
                    "market_type": "CRYPTO"
                },
                "source": "twelvedata"
            }
        
        return result

    # ============================================================================
    # 技术指标
    # ============================================================================
    
    async def get_technical_indicator(self, symbol: str, indicator: str, 
                                    interval: str = "1day", **kwargs) -> Dict[str, Any]:
        """
        获取技术指标
        indicator: SMA, EMA, RSI, MACD, BBANDS, etc.
        """
        params = {
            "symbol": symbol,
            "interval": interval,
            **kwargs
        }
        
        result = await self._make_request(indicator.lower(), params)
        
        if result["success"] and result["data"]:
            indicator_data = result["data"]
            
            if "values" in indicator_data:
                return {
                    "success": True,
                    "symbol": symbol,
                    "indicator": indicator,
                    "interval": interval,
                    "data": indicator_data["values"],
                    "meta": indicator_data.get("meta", {}),
                    "source": "twelvedata"
                }
        
        return {"success": False, "error": f"无法获取{indicator}指标"}

# 创建全局服务实例
twelvedata_service = None

def get_twelvedata_service() -> TwelveDataService:
    """获取TwelveData服务实例"""
    global twelvedata_service
    if twelvedata_service is None:
        twelvedata_service = TwelveDataService()
    return twelvedata_service

async def close_twelvedata_service():
    """关闭TwelveData服务"""
    global twelvedata_service
    if twelvedata_service:
        await twelvedata_service.close()
        twelvedata_service = None