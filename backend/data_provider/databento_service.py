"""
Databento API集成服务
提供专业级高频市场数据，支持Level1、Level2、Tick数据
"""

import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class DatabentoService:
    """
    Databento API数据服务
    提供：Level1/Level2行情、历史数据、实时数据流
    """
    
    def __init__(self, api_key: str = None):
        if api_key is None:
            # 从配置管理器获取API密钥
            try:
                from .service_config_manager import get_service_config_manager
                config_manager = get_service_config_manager()
                self.api_key = config_manager.get_api_key('databento')
            except Exception:
                self.api_key = None
        else:
            self.api_key = api_key
            
        self.base_url = "https://hist.databento.com/v0"
        self.live_url = "https://live.databento.com/v0"
        self.session = None
        
    async def get_session(self):
        """获取HTTP会话"""
        if self.session is None:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            self.session = aiohttp.ClientSession(headers=headers)
        return self.session
    
    async def close(self):
        """关闭会话"""
        if self.session:
            await self.session.close()
    
    async def _make_request(self, endpoint: str, params: Dict = None, use_live: bool = False) -> Dict:
        """统一API请求方法"""
        try:
            session = await self.get_session()
            
            base_url = self.live_url if use_live else self.base_url
            url = f"{base_url}/{endpoint}"
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return {"success": True, "data": data}
                elif response.status == 401:
                    return {"success": False, "error": "API认证失败"}
                elif response.status == 429:
                    return {"success": False, "error": "API请求频率超限"}
                else:
                    error_text = await response.text()
                    return {"success": False, "error": f"HTTP {response.status}: {error_text}"}
                    
        except Exception as e:
            logger.error(f"Databento API请求失败: {e}")
            return {"success": False, "error": str(e)}

    # ============================================================================
    # 历史数据
    # ============================================================================
    
    async def get_historical_trades(
        self, 
        dataset: str = "XNAS.ITCH", 
        symbols: List[str] = None,
        start: str = None,
        end: str = None,
        schema: str = "trades"
    ) -> Dict[str, Any]:
        """
        获取历史成交数据
        dataset: XNAS.ITCH (纳斯达克), XNYS.TRADES (纽交所) 等
        """
        params = {
            "dataset": dataset,
            "schema": schema,
            "start": start or (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "end": end or datetime.now().strftime("%Y-%m-%d"),
            "symbols": ",".join(symbols) if symbols else "AAPL,MSFT,TSLA"
        }
        
        result = await self._make_request("timeseries.get_range", params)
        
        if result["success"] and result["data"]:
            return {
                "success": True,
                "symbol_data": self._process_historical_trades(result["data"]),
                "dataset": dataset,
                "schema": schema,
                "source": "databento"
            }
        
        return result
    
    async def get_historical_quotes(
        self, 
        dataset: str = "XNAS.ITCH", 
        symbols: List[str] = None,
        start: str = None,
        end: str = None
    ) -> Dict[str, Any]:
        """获取历史报价数据 (Level1)"""
        params = {
            "dataset": dataset,
            "schema": "mbp-1",  # Market by Price Level 1
            "start": start or (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "end": end or datetime.now().strftime("%Y-%m-%d"),
            "symbols": ",".join(symbols) if symbols else "AAPL,MSFT,TSLA"
        }
        
        result = await self._make_request("timeseries.get_range", params)
        
        if result["success"] and result["data"]:
            return {
                "success": True,
                "quote_data": self._process_historical_quotes(result["data"]),
                "dataset": dataset,
                "source": "databento"
            }
        
        return result
    
    async def get_level2_data(
        self, 
        dataset: str = "XNAS.ITCH", 
        symbols: List[str] = None,
        start: str = None,
        end: str = None,
        levels: int = 10
    ) -> Dict[str, Any]:
        """获取Level2深度数据"""
        params = {
            "dataset": dataset,
            "schema": f"mbp-{levels}",  # Market by Price with specified levels
            "start": start or (datetime.now() - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S"),
            "end": end or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "symbols": ",".join(symbols) if symbols else "AAPL,MSFT,TSLA"
        }
        
        result = await self._make_request("timeseries.get_range", params)
        
        if result["success"] and result["data"]:
            return {
                "success": True,
                "level2_data": self._process_level2_data(result["data"]),
                "levels": levels,
                "dataset": dataset,
                "source": "databento"
            }
        
        return result

    # ============================================================================
    # 实时数据流
    # ============================================================================
    
    async def start_live_stream(
        self, 
        dataset: str = "XNAS.ITCH",
        schema: str = "trades",
        symbols: List[str] = None,
        callback = None
    ) -> Dict[str, Any]:
        """启动实时数据流"""
        try:
            # 注意：实际的实时数据流需要WebSocket连接
            # 这里提供REST API的实时数据获取方法
            params = {
                "dataset": dataset,
                "schema": schema,
                "symbols": ",".join(symbols) if symbols else "AAPL,MSFT,TSLA",
                "start": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            result = await self._make_request("live", params, use_live=True)
            
            if result["success"] and callback:
                # 处理实时数据并调用回调
                await self._process_live_data(result["data"], callback)
            
            return {
                "success": True,
                "stream_started": True,
                "dataset": dataset,
                "schema": schema,
                "symbols": symbols,
                "source": "databento"
            }
            
        except Exception as e:
            logger.error(f"启动实时数据流失败: {e}")
            return {"success": False, "error": str(e)}

    # ============================================================================
    # 市场状态和元数据
    # ============================================================================
    
    async def get_market_status(self, dataset: str = "XNAS.ITCH") -> Dict[str, Any]:
        """获取市场状态"""
        try:
            result = await self._make_request(f"metadata.get_dataset_condition", {"dataset": dataset})
            
            if result["success"]:
                return {
                    "success": True,
                    "market_status": result["data"],
                    "dataset": dataset,
                    "source": "databento"
                }
            
            return result
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_available_symbols(self, dataset: str = "XNAS.ITCH") -> Dict[str, Any]:
        """获取可用股票列表"""
        try:
            result = await self._make_request(f"symbology.resolve", {"dataset": dataset})
            
            if result["success"]:
                return {
                    "success": True,
                    "symbols": result["data"],
                    "dataset": dataset,
                    "total_symbols": len(result["data"]) if result["data"] else 0,
                    "source": "databento"
                }
            
            return result
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ============================================================================
    # 技术分析数据
    # ============================================================================
    
    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        """获取实时报价 - 兼容方法"""
        try:
            result = await self.get_historical_quotes(
                dataset="XNAS.ITCH",
                symbols=[symbol],
                start=(datetime.now() - timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S"),
                end=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            )
            
            if result.get("success") and result.get("quote_data"):
                quotes = result["quote_data"]
                if symbol in quotes and len(quotes[symbol]) > 0:
                    latest_quote = quotes[symbol][-1]  # 最新报价
                    return {
                        "success": True,
                        "symbol": symbol,
                        "data": {
                            "symbol": symbol,
                            "bid_price": latest_quote.get("bid_price", 0),
                            "ask_price": latest_quote.get("ask_price", 0),
                            "bid_size": latest_quote.get("bid_size", 0),
                            "ask_size": latest_quote.get("ask_size", 0),
                            "timestamp": latest_quote.get("timestamp"),
                            "market_type": "PROFESSIONAL_DATA"
                        },
                        "source": "databento"
                    }
            
            return {"success": False, "error": f"无法获取{symbol}的报价"}
            
        except Exception as e:
            logger.error(f"Databento报价获取失败: {e}")
            return {"success": False, "error": str(e)}

    async def get_ohlcv_data(
        self, 
        dataset: str = "XNAS.ITCH",
        symbols: List[str] = None,
        start: str = None,
        end: str = None,
        resolution: str = "1m"  # 1m, 5m, 15m, 1h, 1d
    ) -> Dict[str, Any]:
        """获取OHLCV数据"""
        params = {
            "dataset": dataset,
            "schema": "ohlcv-1m" if resolution == "1m" else f"ohlcv-{resolution}",
            "start": start or (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "end": end or datetime.now().strftime("%Y-%m-%d"),
            "symbols": ",".join(symbols) if symbols else "AAPL,MSFT,TSLA"
        }
        
        result = await self._make_request("timeseries.get_range", params)
        
        if result["success"] and result["data"]:
            return {
                "success": True,
                "ohlcv_data": self._process_ohlcv_data(result["data"]),
                "resolution": resolution,
                "dataset": dataset,
                "source": "databento"
            }
        
        return result
    
    async def get_volume_profile(
        self, 
        dataset: str = "XNAS.ITCH",
        symbol: str = "AAPL",
        start: str = None,
        end: str = None
    ) -> Dict[str, Any]:
        """获取成交量分布数据"""
        try:
            # 通过trades数据计算成交量分布
            trades_result = await self.get_historical_trades(
                dataset=dataset,
                symbols=[symbol],
                start=start,
                end=end
            )
            
            if trades_result["success"]:
                volume_profile = self._calculate_volume_profile(trades_result["symbol_data"])
                
                return {
                    "success": True,
                    "symbol": symbol,
                    "volume_profile": volume_profile,
                    "dataset": dataset,
                    "source": "databento"
                }
            
            return trades_result
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ============================================================================
    # 数据处理方法
    # ============================================================================
    
    def _process_historical_trades(self, raw_data: Any) -> Dict[str, Any]:
        """处理历史成交数据"""
        processed_data = {}
        
        try:
            if isinstance(raw_data, list):
                for trade in raw_data:
                    symbol = trade.get("instrument_id") or trade.get("symbol", "UNKNOWN")
                    
                    if symbol not in processed_data:
                        processed_data[symbol] = []
                    
                    processed_data[symbol].append({
                        "timestamp": trade.get("ts_event"),
                        "price": float(trade.get("price", 0)) / 1e9,  # Databento使用纳秒精度
                        "size": int(trade.get("size", 0)),
                        "side": trade.get("side"),  # 1=买, 2=卖
                        "trade_id": trade.get("sequence")
                    })
            
            return processed_data
            
        except Exception as e:
            logger.error(f"处理历史成交数据失败: {e}")
            return {}
    
    def _process_historical_quotes(self, raw_data: Any) -> Dict[str, Any]:
        """处理历史报价数据"""
        processed_data = {}
        
        try:
            if isinstance(raw_data, list):
                for quote in raw_data:
                    symbol = quote.get("instrument_id") or quote.get("symbol", "UNKNOWN")
                    
                    if symbol not in processed_data:
                        processed_data[symbol] = []
                    
                    processed_data[symbol].append({
                        "timestamp": quote.get("ts_event"),
                        "bid_price": float(quote.get("bid_px_00", 0)) / 1e9,
                        "bid_size": int(quote.get("bid_sz_00", 0)),
                        "ask_price": float(quote.get("ask_px_00", 0)) / 1e9,
                        "ask_size": int(quote.get("ask_sz_00", 0))
                    })
            
            return processed_data
            
        except Exception as e:
            logger.error(f"处理历史报价数据失败: {e}")
            return {}
    
    def _process_level2_data(self, raw_data: Any) -> Dict[str, Any]:
        """处理Level2数据"""
        processed_data = {}
        
        try:
            if isinstance(raw_data, list):
                for l2_data in raw_data:
                    symbol = l2_data.get("instrument_id") or l2_data.get("symbol", "UNKNOWN")
                    
                    if symbol not in processed_data:
                        processed_data[symbol] = []
                    
                    # 构建买卖盘深度
                    bids = []
                    asks = []
                    
                    # 处理多档报价 (假设最多10档)
                    for i in range(10):
                        bid_price = l2_data.get(f"bid_px_{i:02d}")
                        bid_size = l2_data.get(f"bid_sz_{i:02d}")
                        ask_price = l2_data.get(f"ask_px_{i:02d}")
                        ask_size = l2_data.get(f"ask_sz_{i:02d}")
                        
                        if bid_price and bid_size:
                            bids.append({
                                "price": float(bid_price) / 1e9,
                                "size": int(bid_size)
                            })
                        
                        if ask_price and ask_size:
                            asks.append({
                                "price": float(ask_price) / 1e9,
                                "size": int(ask_size)
                            })
                    
                    processed_data[symbol].append({
                        "timestamp": l2_data.get("ts_event"),
                        "bids": bids,
                        "asks": asks,
                        "sequence": l2_data.get("sequence")
                    })
            
            return processed_data
            
        except Exception as e:
            logger.error(f"处理Level2数据失败: {e}")
            return {}
    
    def _process_ohlcv_data(self, raw_data: Any) -> Dict[str, Any]:
        """处理OHLCV数据"""
        processed_data = {}
        
        try:
            if isinstance(raw_data, list):
                for bar in raw_data:
                    symbol = bar.get("instrument_id") or bar.get("symbol", "UNKNOWN")
                    
                    if symbol not in processed_data:
                        processed_data[symbol] = []
                    
                    processed_data[symbol].append({
                        "timestamp": bar.get("ts_event"),
                        "open": float(bar.get("open", 0)) / 1e9,
                        "high": float(bar.get("high", 0)) / 1e9,
                        "low": float(bar.get("low", 0)) / 1e9,
                        "close": float(bar.get("close", 0)) / 1e9,
                        "volume": int(bar.get("volume", 0))
                    })
            
            return processed_data
            
        except Exception as e:
            logger.error(f"处理OHLCV数据失败: {e}")
            return {}
    
    def _calculate_volume_profile(self, trades_data: Dict) -> Dict[str, Any]:
        """计算成交量分布"""
        try:
            volume_profile = {}
            
            for symbol, trades in trades_data.items():
                price_volume = {}
                total_volume = 0
                
                for trade in trades:
                    price = round(trade["price"], 2)  # 价格精度到分
                    volume = trade["size"]
                    
                    if price in price_volume:
                        price_volume[price] += volume
                    else:
                        price_volume[price] = volume
                    
                    total_volume += volume
                
                # 转换为百分比并排序
                volume_profile[symbol] = {
                    "price_levels": [
                        {
                            "price": price,
                            "volume": volume,
                            "percentage": round((volume / total_volume) * 100, 2)
                        }
                        for price, volume in sorted(price_volume.items(), key=lambda x: -x[1])[:20]  # Top 20
                    ],
                    "total_volume": total_volume
                }
            
            return volume_profile
            
        except Exception as e:
            logger.error(f"计算成交量分布失败: {e}")
            return {}
    
    async def _process_live_data(self, live_data: Any, callback) -> None:
        """处理实时数据"""
        try:
            if callback and live_data:
                # 根据数据类型调用相应的处理方法
                if isinstance(live_data, list):
                    for data_point in live_data:
                        await callback(data_point)
                else:
                    await callback(live_data)
                    
        except Exception as e:
            logger.error(f"处理实时数据失败: {e}")

# 创建全局服务实例
databento_service = None

def get_databento_service() -> DatabentoService:
    """获取Databento服务实例"""
    global databento_service
    if databento_service is None:
        databento_service = DatabentoService()
    return databento_service

async def close_databento_service():
    """关闭Databento服务"""
    global databento_service
    if databento_service:
        await databento_service.close()
        databento_service = None