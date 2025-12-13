"""
统一数据聚合服务
整合所有数据源API，提供统一的数据访问接口
支持：AkShare(A股)、Finnhub(全球股票+加密货币)、News API(新闻)、FMP(美股财务)、Tiingo(历史数据)
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
import json

from .enhanced_akshare_service import get_enhanced_akshare_service
from .finnhub_service import get_finnhub_service
from .news_api_service import get_news_api_service
from .fmp_service import get_fmp_service
from .tiingo_service import get_tiingo_service
from .databento_service import get_databento_service

logger = logging.getLogger(__name__)

class UnifiedDataService:
    """
    统一数据聚合服务
    
    功能覆盖：
    - A股数据 (AkShare)
    - 美股数据 (Finnhub, FMP, Tiingo)  
    - 全球股票 (Finnhub, Tiingo)
    - 加密货币 (Finnhub, Tiingo)
    - 财经新闻 (News API, Finnhub)
    - 财务数据 (FMP)
    - 技术分析 (集成各源数据)
    """
    
    def __init__(self):
        self.akshare = get_enhanced_akshare_service()
        self.finnhub = get_finnhub_service() 
        self.news_api = get_news_api_service()
        self.fmp = get_fmp_service()
        self.tiingo = get_tiingo_service()
        self.databento = get_databento_service()
        
        # 数据源优先级配置
        self.source_priority = {
            "a_stock_quotes": ["akshare"],  # A股实时行情
            "us_stock_quotes": ["databento", "finnhub", "tiingo", "fmp"],  # 美股实时行情
            "crypto_quotes": ["finnhub", "tiingo"],  # 加密货币行情
            "financial_data": ["fmp", "akshare"],  # 财务数据
            "news": ["news_api", "finnhub"],  # 新闻数据
            "historical_data": ["databento", "tiingo", "finnhub", "akshare"],  # 历史数据
            "level2_data": ["databento"],  # Level2深度数据
            "tick_data": ["databento"]  # 逐笔成交数据
        }

    # ============================================================================
    # 股票搜索和基本信息
    # ============================================================================
    
    async def search_stocks(self, query: str, market: str = "auto", limit: int = 20) -> Dict[str, Any]:
        """
        统一股票搜索
        market: auto, a_stock, us_stock, global
        """
        results = []
        
        if market in ["auto", "a_stock"]:
            # A股搜索
            try:
                a_stock_result = await self.akshare.search_stocks(query, limit)
                if a_stock_result.get("success"):
                    for stock in a_stock_result.get("data", []):
                        stock["market_type"] = "A_STOCK"
                        stock["source"] = "akshare"
                        results.append(stock)
            except Exception as e:
                logger.warning(f"A股搜索失败: {e}")
        
        if market in ["auto", "us_stock", "global"]:
            # 美股搜索
            search_tasks = []
            
            # Finnhub美股搜索
            search_tasks.append(self._search_finnhub_stocks(query, limit))
            
            # FMP搜索
            search_tasks.append(self._search_fmp_stocks(query, limit))
            
            # Tiingo搜索
            search_tasks.append(self._search_tiingo_stocks(query, limit))
            
            # 并发执行搜索
            search_results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            for result in search_results:
                if not isinstance(result, Exception) and result.get("success"):
                    for stock in result.get("data", []):
                        stock["market_type"] = "US_STOCK"
                        results.append(stock)
        
        # 去重和排序
        unique_results = self._deduplicate_stocks(results)
        
        return {
            "success": True,
            "query": query,
            "market": market,
            "total_found": len(unique_results),
            "data": unique_results[:limit],
            "sources_used": list(set([r.get("source", "") for r in unique_results]))
        }
    
    async def get_stock_profile(self, symbol: str, market: str = "auto") -> Dict[str, Any]:
        """获取股票详细信息"""
        profiles = []
        
        if market in ["auto", "a_stock"] and self._is_a_stock(symbol):
            # A股信息
            try:
                a_profile = await self.akshare.get_stock_basic_info(symbol)
                if a_profile.get("success"):
                    a_profile["market_type"] = "A_STOCK" 
                    profiles.append(a_profile)
            except Exception as e:
                logger.warning(f"A股信息获取失败: {e}")
        
        if market in ["auto", "us_stock", "global"]:
            # 美股信息 - 并发获取
            profile_tasks = [
                self.finnhub.get_company_profile(symbol),
                self.fmp.get_company_profile(symbol),
                self.tiingo.get_stock_metadata(symbol)
            ]
            
            profile_results = await asyncio.gather(*profile_tasks, return_exceptions=True)
            
            for result in profile_results:
                if not isinstance(result, Exception) and result.get("success"):
                    result["market_type"] = "US_STOCK"
                    profiles.append(result)
        
        # 合并数据
        if profiles:
            merged_profile = self._merge_profiles(profiles)
            return {
                "success": True,
                "symbol": symbol,
                "data": merged_profile,
                "sources": [p.get("source", "") for p in profiles]
            }
        
        return {"success": False, "error": f"无法找到股票 {symbol} 的信息"}

    # ============================================================================
    # 实时行情数据
    # ============================================================================
    
    async def get_realtime_quote(self, symbol: str, market: str = "auto") -> Dict[str, Any]:
        """获取实时行情"""
        quotes = []
        
        if market in ["auto", "a_stock"] and self._is_a_stock(symbol):
            # A股实时行情
            try:
                a_quote = await self.akshare.get_realtime_quote(symbol)
                if a_quote.get("success"):
                    a_quote["market_type"] = "A_STOCK"
                    quotes.append(a_quote)
            except Exception as e:
                logger.warning(f"A股行情获取失败: {e}")
        
        if market in ["auto", "us_stock", "global"]:
            # 美股实时行情
            try:
                us_quote = await self.finnhub.get_us_stock_quote(symbol)
                if us_quote.get("success"):
                    us_quote["market_type"] = "US_STOCK"
                    quotes.append(us_quote)
            except Exception as e:
                logger.warning(f"美股行情获取失败: {e}")
        
        # 返回最佳数据
        if quotes:
            best_quote = self._select_best_quote(quotes)
            return {
                "success": True,
                "symbol": symbol,
                "data": best_quote["data"],
                "market_type": best_quote["market_type"],
                "source": best_quote.get("source", ""),
                "timestamp": datetime.now().isoformat()
            }
        
        return {"success": False, "error": f"无法获取 {symbol} 的实时行情"}
    
    async def get_batch_quotes(self, symbols: List[str], market: str = "auto") -> Dict[str, Any]:
        """批量获取实时行情"""
        # 按市场分组
        a_stocks = []
        us_stocks = []
        
        for symbol in symbols:
            if self._is_a_stock(symbol):
                a_stocks.append(symbol)
            else:
                us_stocks.append(symbol)
        
        # 并发获取
        tasks = []
        if a_stocks and market in ["auto", "a_stock"]:
            tasks.append(self._get_a_stock_batch_quotes(a_stocks))
        
        if us_stocks and market in ["auto", "us_stock", "global"]:
            tasks.append(self._get_us_stock_batch_quotes(us_stocks))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 合并结果
        all_quotes = []
        for result in results:
            if not isinstance(result, Exception) and result.get("success"):
                all_quotes.extend(result.get("quotes", []))
        
        return {
            "success": True,
            "symbols": symbols,
            "total_count": len(all_quotes),
            "quotes": all_quotes,
            "timestamp": datetime.now().isoformat()
        }

    # ============================================================================
    # 历史数据
    # ============================================================================
    
    async def get_historical_data(self, symbol: str, period: str = "daily", 
                                days_back: int = 30, market: str = "auto") -> Dict[str, Any]:
        """获取历史K线数据"""
        historical_data = []
        
        if market in ["auto", "a_stock"] and self._is_a_stock(symbol):
            # A股历史数据
            try:
                a_data = await self.akshare.get_stock_historical_data(
                    symbol, period, days_back
                )
                if a_data.get("success"):
                    a_data["market_type"] = "A_STOCK"
                    historical_data.append(a_data)
            except Exception as e:
                logger.warning(f"A股历史数据获取失败: {e}")
        
        if market in ["auto", "us_stock", "global"]:
            # 美股历史数据 - 优先使用Tiingo
            try:
                end_date = datetime.now().strftime("%Y-%m-%d")
                start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
                
                us_data = await self.tiingo.get_stock_prices(
                    symbol, start_date, end_date, period
                )
                if us_data.get("success"):
                    us_data["market_type"] = "US_STOCK"
                    historical_data.append(us_data)
                else:
                    # 回退到Finnhub
                    us_data = await self.finnhub.get_us_stock_candles(
                        symbol, "D" if period == "daily" else "60", days_back
                    )
                    if us_data.get("success"):
                        us_data["market_type"] = "US_STOCK"
                        historical_data.append(us_data)
                        
            except Exception as e:
                logger.warning(f"美股历史数据获取失败: {e}")
        
        # 返回最佳数据
        if historical_data:
            best_data = historical_data[0]  # 取第一个成功的结果
            return {
                "success": True,
                "symbol": symbol,
                "period": period,
                "days_back": days_back,
                "market_type": best_data["market_type"],
                "data": best_data.get("data", []),
                "source": best_data.get("source", ""),
                "total_count": len(best_data.get("data", []))
            }
        
        return {"success": False, "error": f"无法获取 {symbol} 的历史数据"}

    # ============================================================================
    # 加密货币数据
    # ============================================================================
    
    async def get_crypto_quote(self, symbol: str) -> Dict[str, Any]:
        """获取加密货币实时行情"""
        crypto_quotes = []
        
        # Finnhub加密货币
        try:
            finnhub_quote = await self.finnhub.get_crypto_quote(symbol)
            if finnhub_quote.get("success"):
                crypto_quotes.append(finnhub_quote)
        except Exception as e:
            logger.warning(f"Finnhub加密货币行情获取失败: {e}")
        
        # Tiingo加密货币
        try:
            tiingo_quote = await self.tiingo.get_crypto_prices(symbol)
            if tiingo_quote.get("success"):
                crypto_quotes.append(tiingo_quote)
        except Exception as e:
            logger.warning(f"Tiingo加密货币行情获取失败: {e}")
        
        if crypto_quotes:
            # 选择最佳数据源
            best_quote = crypto_quotes[0]
            return {
                "success": True,
                "symbol": symbol,
                "market_type": "CRYPTO",
                "data": best_quote.get("data", {}),
                "source": best_quote.get("source", ""),
                "timestamp": datetime.now().isoformat()
            }
        
        return {"success": False, "error": f"无法获取 {symbol} 的加密货币行情"}
    
    async def get_supported_cryptocurrencies(self) -> Dict[str, Any]:
        """获取支持的加密货币列表"""
        crypto_lists = []
        
        # Finnhub加密货币列表
        try:
            finnhub_list = await self.finnhub.get_crypto_symbols("BINANCE")
            if finnhub_list.get("success"):
                crypto_lists.append(finnhub_list)
        except Exception as e:
            logger.warning(f"Finnhub加密货币列表获取失败: {e}")
        
        # Tiingo加密货币列表
        try:
            tiingo_list = await self.tiingo.get_crypto_metadata()
            if tiingo_list.get("success"):
                crypto_lists.append(tiingo_list)
        except Exception as e:
            logger.warning(f"Tiingo加密货币列表获取失败: {e}")
        
        # 合并列表
        all_cryptos = []
        for crypto_list in crypto_lists:
            symbols = crypto_list.get("symbols", []) or crypto_list.get("cryptocurrencies", [])
            for crypto in symbols:
                all_cryptos.append({
                    "symbol": crypto.get("symbol") or crypto.get("ticker"),
                    "name": crypto.get("description") or crypto.get("name"),
                    "source": crypto_list.get("source", "")
                })
        
        # 去重
        unique_cryptos = self._deduplicate_cryptos(all_cryptos)
        
        return {
            "success": True,
            "cryptocurrencies": unique_cryptos,
            "total_count": len(unique_cryptos),
            "sources": list(set([c.get("source", "") for c in all_cryptos]))
        }

    # ============================================================================
    # 财经新闻
    # ============================================================================
    
    async def get_market_news(self, category: str = "general", limit: int = 50) -> Dict[str, Any]:
        """获取市场新闻"""
        news_sources = []
        
        # News API新闻
        try:
            news_api_result = await self.news_api.get_business_headlines("us", limit // 2)
            if news_api_result.get("success"):
                news_sources.append(news_api_result)
        except Exception as e:
            logger.warning(f"News API新闻获取失败: {e}")
        
        # Finnhub新闻
        try:
            finnhub_result = await self.finnhub.get_market_news(category, limit // 2)
            if finnhub_result.get("success"):
                news_sources.append(finnhub_result)
        except Exception as e:
            logger.warning(f"Finnhub新闻获取失败: {e}")
        
        # 合并新闻
        all_news = []
        for source in news_sources:
            articles = source.get("articles", []) or source.get("news", [])
            for article in articles:
                article["source_api"] = source.get("source", "")
                all_news.append(article)
        
        # 按时间排序
        all_news.sort(key=lambda x: x.get("published_at", "") or x.get("datetime", ""), reverse=True)
        
        return {
            "success": True,
            "category": category,
            "total_news": len(all_news),
            "news": all_news[:limit],
            "sources": list(set([n.get("source_api", "") for n in all_news]))
        }
    
    async def get_stock_news(self, symbol: str, days_back: int = 7) -> Dict[str, Any]:
        """获取特定股票的新闻"""
        stock_news = []
        
        # News API股票新闻
        try:
            news_api_result = await self.news_api.get_stock_news(symbol, days_back, 20)
            if news_api_result.get("success"):
                stock_news.extend(news_api_result.get("articles", []))
        except Exception as e:
            logger.warning(f"News API股票新闻获取失败: {e}")
        
        # Tiingo股票新闻
        try:
            tiingo_result = await self.tiingo.get_news([symbol], limit=20)
            if tiingo_result.get("success"):
                stock_news.extend(tiingo_result.get("news", []))
        except Exception as e:
            logger.warning(f"Tiingo股票新闻获取失败: {e}")
        
        # 去重和排序
        unique_news = self._deduplicate_news(stock_news)
        unique_news.sort(key=lambda x: x.get("published_at", "") or x.get("published_date", ""), reverse=True)
        
        return {
            "success": True,
            "symbol": symbol,
            "days_back": days_back,
            "total_news": len(unique_news),
            "news": unique_news,
            "timestamp": datetime.now().isoformat()
        }

    # ============================================================================
    # 财务数据
    # ============================================================================
    
    async def get_financial_statements(self, symbol: str, statement_type: str = "income", 
                                     period: str = "annual", limit: int = 5) -> Dict[str, Any]:
        """
        获取财务报表
        statement_type: income, balance, cash_flow
        """
        # 主要使用FMP获取美股财务数据
        if statement_type == "income":
            result = await self.fmp.get_income_statement(symbol, period, limit)
        elif statement_type == "balance":
            result = await self.fmp.get_balance_sheet(symbol, period, limit)
        else:
            # 对于现金流表，如果FMP不支持，可以添加其他数据源
            result = {"success": False, "error": "现金流表功能待实现"}
        
        if result.get("success"):
            result["market_type"] = "US_STOCK"
            return result
        
        # 如果是A股，尝试AkShare
        if self._is_a_stock(symbol):
            try:
                a_result = await self.akshare.get_financial_data(symbol)
                if a_result.get("success"):
                    a_result["market_type"] = "A_STOCK"
                    return a_result
            except Exception as e:
                logger.warning(f"A股财务数据获取失败: {e}")
        
        return {"success": False, "error": f"无法获取 {symbol} 的财务报表"}
    
    async def get_key_metrics(self, symbol: str, period: str = "annual", limit: int = 5) -> Dict[str, Any]:
        """获取关键财务指标"""
        # 使用FMP获取关键指标
        result = await self.fmp.get_key_metrics(symbol, period, limit)
        
        if result.get("success"):
            result["market_type"] = "US_STOCK"
            return result
        
        return {"success": False, "error": f"无法获取 {symbol} 的关键指标"}
    
    async def screen_stocks(self, criteria: Dict[str, Any]) -> Dict[str, Any]:
        """股票筛选"""
        # 使用FMP的股票筛选功能
        result = await self.fmp.screen_stocks(**criteria)
        
        if result.get("success"):
            return {
                "success": True,
                "criteria": criteria,
                "stocks": result.get("stocks", []),
                "total_count": result.get("total_count", 0),
                "source": "fmp"
            }
        
        return {"success": False, "error": "股票筛选失败"}

    # ============================================================================
    # 工具方法
    # ============================================================================
    
    def _is_a_stock(self, symbol: str) -> bool:
        """判断是否为A股股票代码"""
        if not symbol or len(symbol) != 6:
            return False
        
        # A股代码规则
        a_stock_prefixes = ['000', '001', '002', '003', '300', '301', '600', '601', '603', '605', '688', '689']
        return any(symbol.startswith(prefix) for prefix in a_stock_prefixes)
    
    def _deduplicate_stocks(self, stocks: List[Dict]) -> List[Dict]:
        """股票去重"""
        seen_symbols = set()
        unique_stocks = []
        
        for stock in stocks:
            symbol = stock.get("symbol", "")
            if symbol and symbol not in seen_symbols:
                seen_symbols.add(symbol)
                unique_stocks.append(stock)
        
        return unique_stocks
    
    def _deduplicate_cryptos(self, cryptos: List[Dict]) -> List[Dict]:
        """加密货币去重"""
        seen_symbols = set()
        unique_cryptos = []
        
        for crypto in cryptos:
            symbol = crypto.get("symbol", "")
            if symbol and symbol not in seen_symbols:
                seen_symbols.add(symbol)
                unique_cryptos.append(crypto)
        
        return unique_cryptos
    
    def _deduplicate_news(self, news_list: List[Dict]) -> List[Dict]:
        """新闻去重"""
        seen_urls = set()
        unique_news = []
        
        for news in news_list:
            url = news.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_news.append(news)
        
        return unique_news
    
    def _merge_profiles(self, profiles: List[Dict]) -> Dict[str, Any]:
        """合并股票档案信息"""
        merged = {}
        
        for profile in profiles:
            data = profile.get("data", {})
            for key, value in data.items():
                if value and key not in merged:
                    merged[key] = value
        
        return merged
    
    def _select_best_quote(self, quotes: List[Dict]) -> Dict[str, Any]:
        """选择最佳行情数据"""
        # 简单策略：返回第一个成功的数据
        return quotes[0] if quotes else {}
    
    async def _search_finnhub_stocks(self, query: str, limit: int) -> Dict[str, Any]:
        """Finnhub股票搜索"""
        try:
            result = await self.finnhub.search_us_stocks(query)
            if result.get("success"):
                for stock in result.get("data", []):
                    stock["source"] = "finnhub"
            return result
        except Exception as e:
            logger.warning(f"Finnhub搜索失败: {e}")
            return {"success": False, "data": []}
    
    async def _search_fmp_stocks(self, query: str, limit: int) -> Dict[str, Any]:
        """FMP股票搜索"""
        try:
            result = await self.fmp.search_stocks(query, limit)
            if result.get("success"):
                for stock in result.get("data", []):
                    stock["source"] = "fmp"
            return result
        except Exception as e:
            logger.warning(f"FMP搜索失败: {e}")
            return {"success": False, "data": []}
    
    async def _search_tiingo_stocks(self, query: str, limit: int) -> Dict[str, Any]:
        """Tiingo股票搜索"""
        try:
            result = await self.tiingo.search_stocks(query, limit)
            if result.get("success"):
                for stock in result.get("data", []):
                    stock["source"] = "tiingo"
            return result
        except Exception as e:
            logger.warning(f"Tiingo搜索失败: {e}")
            return {"success": False, "data": []}
    
    async def _get_a_stock_batch_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """A股批量行情"""
        try:
            result = await self.akshare.get_realtime_quotes(symbols)
            if result.get("success"):
                quotes = []
                for quote in result.get("data", []):
                    quote["market_type"] = "A_STOCK"
                    quote["source"] = "akshare"
                    quotes.append(quote)
                return {"success": True, "quotes": quotes}
        except Exception as e:
            logger.warning(f"A股批量行情获取失败: {e}")
        
        return {"success": False, "quotes": []}
    
    async def _get_us_stock_batch_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """美股批量行情"""
        quotes = []
        
        # 使用Tiingo批量获取
        try:
            result = await self.tiingo.get_latest_prices(symbols)
            if result.get("success"):
                for price in result.get("prices", []):
                    price["market_type"] = "US_STOCK"
                    price["source"] = "tiingo"
                    quotes.append(price)
        except Exception as e:
            logger.warning(f"Tiingo批量行情获取失败: {e}")
        
        return {"success": True, "quotes": quotes}
    
    # ============================================================================
    # 专业级高频数据 (Databento)
    # ============================================================================
    
    async def get_level2_data(
        self, 
        symbol: str, 
        dataset: str = "XNAS.ITCH",
        start_time: str = None,
        end_time: str = None,
        levels: int = 10
    ) -> Dict[str, Any]:
        """
        获取Level2深度数据
        
        Args:
            symbol: 股票代码
            dataset: 数据集 (XNAS.ITCH, XNYS.TRADES等)
            start_time: 开始时间
            end_time: 结束时间
            levels: 深度档位数量
        """
        try:
            result = await self.databento.get_level2_data(
                dataset=dataset,
                symbols=[symbol],
                start=start_time,
                end=end_time,
                levels=levels
            )
            
            if result.get("success"):
                return {
                    "success": True,
                    "symbol": symbol,
                    "level2_data": result.get("level2_data", {}),
                    "levels": levels,
                    "dataset": dataset,
                    "source": "databento",
                    "data_type": "level2",
                    "timestamp": datetime.now().isoformat()
                }
            
            return result
            
        except Exception as e:
            logger.error(f"获取Level2数据失败 ({symbol}): {e}")
            return {
                "success": False,
                "error": str(e),
                "symbol": symbol,
                "attempted_source": "databento"
            }
    
    async def get_tick_data(
        self, 
        symbol: str, 
        dataset: str = "XNAS.ITCH",
        start_time: str = None,
        end_time: str = None
    ) -> Dict[str, Any]:
        """
        获取逐笔成交数据
        
        Args:
            symbol: 股票代码
            dataset: 数据集
            start_time: 开始时间
            end_time: 结束时间
        """
        try:
            result = await self.databento.get_historical_trades(
                dataset=dataset,
                symbols=[symbol],
                start=start_time,
                end=end_time
            )
            
            if result.get("success"):
                return {
                    "success": True,
                    "symbol": symbol,
                    "tick_data": result.get("symbol_data", {}),
                    "dataset": dataset,
                    "source": "databento",
                    "data_type": "tick",
                    "timestamp": datetime.now().isoformat()
                }
            
            return result
            
        except Exception as e:
            logger.error(f"获取Tick数据失败 ({symbol}): {e}")
            return {
                "success": False,
                "error": str(e),
                "symbol": symbol,
                "attempted_source": "databento"
            }
    
    async def get_volume_profile(
        self, 
        symbol: str, 
        dataset: str = "XNAS.ITCH",
        start_time: str = None,
        end_time: str = None
    ) -> Dict[str, Any]:
        """
        获取成交量分布数据
        
        Args:
            symbol: 股票代码
            dataset: 数据集
            start_time: 开始时间
            end_time: 结束时间
        """
        try:
            result = await self.databento.get_volume_profile(
                dataset=dataset,
                symbol=symbol,
                start=start_time,
                end=end_time
            )
            
            if result.get("success"):
                return {
                    "success": True,
                    "symbol": symbol,
                    "volume_profile": result.get("volume_profile", {}),
                    "dataset": dataset,
                    "source": "databento",
                    "data_type": "volume_profile",
                    "timestamp": datetime.now().isoformat()
                }
            
            return result
            
        except Exception as e:
            logger.error(f"获取成交量分布失败 ({symbol}): {e}")
            return {
                "success": False,
                "error": str(e),
                "symbol": symbol,
                "attempted_source": "databento"
            }
    
    async def close(self):
        """关闭所有服务连接"""
        await self.finnhub.close()
        await self.news_api.close()
        await self.fmp.close()
        await self.tiingo.close()
        await self.databento.close()

# 创建全局统一服务实例
unified_service = None

def get_unified_data_service() -> UnifiedDataService:
    """获取统一数据服务实例"""
    global unified_service
    if unified_service is None:
        unified_service = UnifiedDataService()
    return unified_service

async def close_unified_service():
    """关闭统一数据服务"""
    global unified_service
    if unified_service:
        await unified_service.close()
        unified_service = None

# 测试函数
async def test_unified_service():
    """测试统一数据服务"""
    service = get_unified_data_service()
    
    print("🧪 测试统一数据服务...")
    
    # 测试股票搜索
    print("\n1. 测试股票搜索...")
    search_result = await service.search_stocks("Apple", "auto", 5)
    print(f"搜索结果: {search_result.get('success', False)}")
    if search_result.get('success'):
        print(f"找到 {search_result.get('total_found', 0)} 只股票")
        sources = search_result.get('sources_used', [])
        print(f"使用数据源: {sources}")
    
    # 测试A股搜索
    print("\n2. 测试A股搜索...")
    a_search_result = await service.search_stocks("600519", "a_stock", 5)
    print(f"A股搜索结果: {a_search_result.get('success', False)}")
    
    # 测试实时行情
    print("\n3. 测试实时行情 (AAPL)...")
    quote_result = await service.get_realtime_quote("AAPL")
    print(f"行情结果: {quote_result.get('success', False)}")
    if quote_result.get('success'):
        print(f"市场类型: {quote_result.get('market_type')}")
        print(f"数据源: {quote_result.get('source')}")
    
    # 测试新闻
    print("\n4. 测试市场新闻...")
    news_result = await service.get_market_news("general", 5)
    print(f"新闻结果: {news_result.get('success', False)}")
    if news_result.get('success'):
        print(f"新闻数量: {news_result.get('total_news', 0)}")
        sources = news_result.get('sources', [])
        print(f"新闻源: {sources}")
    
    # 测试加密货币
    print("\n5. 测试加密货币...")
    crypto_result = await service.get_crypto_quote("BTC")
    print(f"加密货币结果: {crypto_result.get('success', False)}")
    
    await service.close()
    print("\n✅ 统一数据服务测试完成")

if __name__ == "__main__":
    asyncio.run(test_unified_service())