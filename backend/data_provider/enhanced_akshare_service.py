"""
增强的AkShare数据服务
支持真实数据获取和模拟数据备份，确保服务稳定性
"""

import akshare as ak
import pandas as pd
import asyncio
import json
import random
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class StockData:
    """股票数据结构"""
    symbol: str
    name: str
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    amount: float

@dataclass  
class NewsData:
    """新闻数据结构"""
    id: str
    title: str
    content: str
    category: str
    source: str
    publish_time: str
    mentioned_stocks: List[str]
    importance: int

class EnhancedAkShareService:
    """增强的AkShare数据服务"""
    
    def __init__(self, force_real_data: bool = True):
        self.use_mock_data = not force_real_data  # 优先使用真实数据
        self.force_real_data = force_real_data
        self.force_real_news = True  # 强制新闻使用真实数据
        self._initialize_mock_data()
        
    def _initialize_mock_data(self):
        """初始化模拟数据"""
        # 主要股票列表
        self.mock_stocks = [
            {"symbol": "000001", "name": "平安银行", "sector": "银行", "market": "SZ"},
            {"symbol": "000002", "name": "万科A", "sector": "房地产", "market": "SZ"},
            {"symbol": "600519", "name": "贵州茅台", "sector": "食品饮料", "market": "SH"},
            {"symbol": "600036", "name": "招商银行", "sector": "银行", "market": "SH"},
            {"symbol": "000858", "name": "五粮液", "sector": "食品饮料", "market": "SZ"},
            {"symbol": "300750", "name": "宁德时代", "sector": "电力设备", "market": "SZ"},
            {"symbol": "002594", "name": "比亚迪", "sector": "汽车", "market": "SZ"},
            {"symbol": "601318", "name": "中国平安", "sector": "保险", "market": "SH"},
            {"symbol": "000333", "name": "美的集团", "sector": "家用电器", "market": "SZ"},
            {"symbol": "600276", "name": "恒瑞医药", "sector": "医药生物", "market": "SH"},
        ]
        
        # 新闻模板
        self.mock_news_templates = [
            {
                "title": "{stock}发布2024年三季报：净利润同比增长{percent}%",
                "category": "earnings",
                "importance": 8
            },
            {
                "title": "央行降准{percent}个BP，{sector}板块迎来政策利好",
                "category": "policy", 
                "importance": 9
            },
            {
                "title": "{sector}行业景气度回升，相关概念股集体上涨",
                "category": "industry",
                "importance": 7
            },
            {
                "title": "A股三大指数收涨，{stock}等权重股表现强势",
                "category": "market",
                "importance": 6
            },
            {
                "title": "{stock}获机构调研，业绩增长前景被看好",
                "category": "company",
                "importance": 5
            }
        ]

    async def get_stock_historical_data(
        self, 
        symbol: str, 
        period: str = "daily",
        limit: int = 500,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        获取股票历史数据（支持真实数据和模拟数据）
        """
        try:
            logger.info(f"获取股票历史数据: {symbol}")
            
            # 强制使用真实数据模式
            if self.force_real_data:
                try:
                    real_data = await self._fetch_real_historical_data(
                        symbol, period, limit, start_date, end_date
                    )
                    if real_data["success"]:
                        logger.info(f"成功获取真实历史数据: {symbol}")
                        return real_data
                    else:
                        logger.error(f"真实数据获取失败: {symbol}")
                        # 即使失败也不切换到模拟数据，返回错误
                        return {"success": False, "error": "无法获取真实数据"}
                except Exception as e:
                    logger.error(f"真实数据获取异常: {e}")
                    return {"success": False, "error": str(e)}
            
            # 可选的模拟数据模式（仅在明确禁用真实数据时使用）
            if not self.use_mock_data:
                try:
                    real_data = await self._fetch_real_historical_data(
                        symbol, period, limit, start_date, end_date
                    )
                    if real_data["success"]:
                        logger.info(f"成功获取真实历史数据: {symbol}")
                        return real_data
                except Exception as e:
                    logger.warning(f"真实数据获取失败，切换到模拟数据: {e}")
                    self.use_mock_data = True
            
            # 使用模拟数据
            mock_data = self._generate_mock_historical_data(symbol, limit)
            logger.info(f"使用模拟历史数据: {symbol}")
            return mock_data
            
        except Exception as e:
            logger.error(f"获取历史数据失败: {e}")
            return {"success": False, "error": str(e)}

    async def _fetch_real_historical_data(
        self, symbol: str, period: str, limit: int, 
        start_date: Optional[str], end_date: Optional[str]
    ) -> Dict[str, Any]:
        """获取真实历史数据"""
        
        def fetch_data():
            return ak.stock_zh_a_hist(
                symbol=symbol,
                period=period,
                adjust="qfq",  # 前复权
                start_date=start_date or (datetime.now() - timedelta(days=365)).strftime("%Y%m%d"),
                end_date=end_date or datetime.now().strftime("%Y%m%d")
            )
        
        # 在线程池中执行
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(None, fetch_data)
        
        if df.empty:
            raise ValueError("未获取到数据")
        
        # 转换数据格式
        df = df.tail(limit)
        data_list = []
        
        for _, row in df.iterrows():
            data_list.append({
                "date": row['日期'].strftime("%Y-%m-%d"),
                "open": float(row['开盘']),
                "high": float(row['最高']),
                "low": float(row['最低']),
                "close": float(row['收盘']),
                "volume": int(row['成交量']),
                "amount": float(row['成交额'])
            })
        
        return {
            "success": True,
            "symbol": symbol,
            "data": data_list,
            "source": "akshare_real"
        }

    def _generate_mock_historical_data(self, symbol: str, limit: int = 500) -> Dict[str, Any]:
        """生成模拟历史数据"""
        
        # 基础价格（根据股票代码设定）
        base_prices = {
            "600519": 1680.0,  # 贵州茅台
            "000001": 12.5,    # 平安银行
            "300750": 245.0,   # 宁德时代
            "002594": 280.0,   # 比亚迪
            "601318": 45.0,    # 中国平安
        }
        
        base_price = base_prices.get(symbol, 100.0)
        
        data_list = []
        current_price = base_price
        
        for i in range(limit):
            # 生成日期
            date = (datetime.now() - timedelta(days=limit-i)).strftime("%Y-%m-%d")
            
            # 模拟价格波动
            daily_change = random.uniform(-0.08, 0.08)  # ±8%的日波动
            open_price = current_price * (1 + random.uniform(-0.02, 0.02))
            close_price = current_price * (1 + daily_change)
            high_price = max(open_price, close_price) * (1 + random.uniform(0, 0.03))
            low_price = min(open_price, close_price) * (1 - random.uniform(0, 0.03))
            
            # 成交量
            base_volume = 1000000
            volume = int(base_volume * random.uniform(0.5, 2.0))
            amount = volume * (high_price + low_price) / 2
            
            data_list.append({
                "date": date,
                "open": round(open_price, 2),
                "high": round(high_price, 2),
                "low": round(low_price, 2),
                "close": round(close_price, 2),
                "volume": volume,
                "amount": round(amount, 2)
            })
            
            current_price = close_price
        
        return {
            "success": True,
            "symbol": symbol,
            "data": data_list,
            "source": "mock_data"
        }

    async def get_realtime_quote(self, symbol: str) -> Dict[str, Any]:
        """获取单个股票实时行情"""
        result = await self.get_realtime_quotes([symbol])
        if result.get("success") and result.get("quotes"):
            quotes = result["quotes"]
            if quotes and symbol in quotes:
                return {
                    "success": True,
                    "data": quotes[symbol],
                    "source": result.get("source", "akshare")
                }
        return {"success": False, "error": f"无法获取{symbol}的实时行情"}

    async def get_realtime_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """获取实时行情数据"""
        try:
            logger.info(f"获取实时行情: {symbols}")
            
            # 首先尝试真实数据
            if not self.use_mock_data:
                try:
                    real_quotes = await self._fetch_real_quotes(symbols)
                    if real_quotes["success"]:
                        return real_quotes
                except Exception as e:
                    logger.warning(f"实时数据获取失败，使用模拟数据: {e}")
                    self.use_mock_data = True
            
            # 使用模拟数据
            return self._generate_mock_quotes(symbols)
            
        except Exception as e:
            logger.error(f"获取实时行情失败: {e}")
            return {"success": False, "error": str(e)}

    async def _fetch_real_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """获取真实实时行情"""
        
        def fetch_quotes():
            return ak.stock_zh_a_spot_em()
        
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(None, fetch_quotes)
        
        quotes = {}
        for symbol in symbols:
            stock_data = df[df['代码'] == symbol]
            if not stock_data.empty:
                row = stock_data.iloc[0]
                quotes[symbol] = {
                    "symbol": symbol,
                    "name": row['名称'],
                    "price": float(row['最新价']),
                    "change": float(row['涨跌额']),
                    "change_percent": float(row['涨跌幅']),
                    "volume": int(row['成交量']),
                    "amount": float(row['成交额']),
                    "high": float(row['最高']),
                    "low": float(row['最低']),
                    "open": float(row['今开']),
                    "timestamp": datetime.now().isoformat()
                }
        
        return {
            "success": True,
            "quotes": quotes,
            "source": "akshare_real"
        }

    def _generate_mock_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """生成模拟实时行情"""
        
        quotes = {}
        
        for symbol in symbols:
            # 查找股票信息
            stock_info = next((s for s in self.mock_stocks if s["symbol"] == symbol), None)
            if not stock_info:
                stock_info = {"symbol": symbol, "name": f"股票{symbol}", "sector": "其他"}
            
            # 生成模拟价格
            base_price = 100.0
            if symbol == "600519":
                base_price = 1680.0
            elif symbol == "000001":
                base_price = 12.5
            elif symbol == "300750":
                base_price = 245.0
            
            change_percent = random.uniform(-5, 5)
            current_price = base_price * (1 + change_percent / 100)
            change_amount = current_price - base_price
            
            quotes[symbol] = {
                "symbol": symbol,
                "name": stock_info["name"],
                "price": round(current_price, 2),
                "change": round(change_amount, 2),
                "change_percent": round(change_percent, 2),
                "volume": random.randint(500000, 5000000),
                "amount": random.randint(1000000000, 10000000000),
                "high": round(current_price * 1.05, 2),
                "low": round(current_price * 0.95, 2),
                "open": round(base_price, 2),
                "timestamp": datetime.now().isoformat()
            }
        
        return {
            "success": True,
            "quotes": quotes,
            "source": "mock_data"
        }

    async def get_financial_news(self, limit: int = 50) -> Dict[str, Any]:
        """获取财经新闻并进行分类"""
        try:
            logger.info(f"获取财经新闻，数量限制: {limit}")
            
            # 强制优先使用真实新闻
            if self.force_real_news or not self.use_mock_data:
                try:
                    real_news = await self._fetch_real_news(limit)
                    if real_news["success"]:
                        logger.info(f"成功获取真实新闻数据: {len(real_news['data'])}条")
                        return real_news
                except Exception as e:
                    logger.warning(f"真实新闻获取失败，使用模拟数据: {e}")
                    # 即使失败，也记录错误但继续使用模拟数据
            
            # 使用模拟新闻（仅在真实数据完全无法获取时）
            logger.info(f"使用模拟新闻数据: {limit}条")
            return self._generate_mock_news(limit)
            
        except Exception as e:
            logger.error(f"获取新闻失败: {e}")
            return {"success": False, "error": str(e)}

    async def _fetch_real_news(self, limit: int) -> Dict[str, Any]:
        """获取真实新闻数据"""
        
        def fetch_news():
            return ak.stock_news_em()
        
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(None, fetch_news)
        
        news_list = []
        for i, (_, row) in enumerate(df.head(limit).iterrows()):
            title = str(row.get('新闻标题', ''))
            content = str(row.get('新闻内容', ''))
            
            news_item = {
                "id": f"news_{i}",
                "title": title,
                "content": content[:300] + "..." if len(content) > 300 else content,
                "category": self._classify_news(title, content),
                "source": str(row.get('新闻来源', '')),
                "publish_time": str(row.get('发布时间', '')),
                "mentioned_stocks": self._extract_stock_codes(title + " " + content),
                "importance": self._calculate_importance(title, content)
            }
            news_list.append(news_item)
        
        return {
            "success": True,
            "data": news_list,
            "total_count": len(news_list),
            "source": "akshare_real"
        }

    def _generate_mock_news(self, limit: int) -> Dict[str, Any]:
        """生成模拟新闻数据"""
        
        news_list = []
        
        for i in range(limit):
            # 随机选择新闻模板
            template = random.choice(self.mock_news_templates)
            stock_info = random.choice(self.mock_stocks)
            
            # 填充模板
            title = template["title"].format(
                stock=stock_info["name"],
                sector=stock_info["sector"],
                percent=random.randint(5, 25)
            )
            
            # 生成内容
            content = f"根据最新消息，{title.lower()}。这一消息引起了市场的广泛关注，相关概念股纷纷上涨。分析师认为，这将对{stock_info['sector']}行业产生积极影响..."
            
            # 生成时间
            publish_time = (datetime.now() - timedelta(hours=random.randint(0, 24))).strftime("%Y-%m-%d %H:%M:%S")
            
            news_item = {
                "id": f"mock_news_{i}",
                "title": title,
                "content": content,
                "category": template["category"],
                "source": "财经网",
                "publish_time": publish_time,
                "mentioned_stocks": [stock_info["symbol"]],
                "importance": template["importance"]
            }
            news_list.append(news_item)
        
        # 按重要性排序
        news_list.sort(key=lambda x: x["importance"], reverse=True)
        
        # 统计分类
        category_stats = {}
        for news in news_list:
            cat = news["category"]
            category_stats[cat] = category_stats.get(cat, 0) + 1
        
        return {
            "success": True,
            "data": news_list,
            "total_count": len(news_list),
            "category_stats": category_stats,
            "source": "mock_data"
        }

    def _classify_news(self, title: str, content: str) -> str:
        """新闻分类"""
        text = (title + " " + content).lower()
        
        keywords = {
            "policy": ["政策", "法规", "监管", "央行", "证监会"],
            "earnings": ["财报", "业绩", "营收", "利润", "年报"],
            "market": ["A股", "指数", "涨跌", "成交", "行情"],
            "industry": ["行业", "板块", "产业", "概念股"],
            "company": ["公司", "企业", "股东", "并购", "重组"]
        }
        
        for category, words in keywords.items():
            if any(word in text for word in words):
                return category
        
        return "general"

    def _extract_stock_codes(self, text: str) -> List[str]:
        """提取股票代码"""
        pattern = r'\b[0-9]{6}\b'
        codes = re.findall(pattern, text)
        return [code for code in codes if code.startswith(('00', '30', '60', '68'))][:3]

    def _calculate_importance(self, title: str, content: str = "") -> int:
        """计算新闻重要性"""
        text = title + " " + content
        importance = 5
        
        high_words = ["重大", "突发", "首次", "历史", "涨停", "跌停", "暴涨", "暴跌"]
        for word in high_words:
            if word in text:
                importance += 2
        
        return min(importance, 10)

    async def search_stocks(self, keyword: str, limit: int = 20) -> Dict[str, Any]:
        """搜索股票"""
        try:
            logger.info(f"搜索股票: {keyword}")
            
            # 首先尝试获取真实数据
            if not self.use_mock_data:
                try:
                    real_search_results = await self._search_real_stocks(keyword, limit)
                    if real_search_results["success"]:
                        return real_search_results
                except Exception as e:
                    logger.warning(f"真实股票搜索失败，使用模拟数据: {e}")
            
            # 回退到模拟数据搜索
            return self._search_mock_stocks(keyword, limit)
            
        except Exception as e:
            logger.error(f"股票搜索失败: {e}")
            return {"success": False, "error": str(e)}

    async def _search_real_stocks(self, keyword: str, limit: int = 20) -> Dict[str, Any]:
        """使用真实AkShare数据搜索股票"""
        try:
            # 使用AkShare股票基本信息接口
            stock_info_df = await asyncio.to_thread(ak.stock_info_sz_name_code)
            
            # 搜索匹配的股票
            results = []
            keyword_lower = keyword.lower()
            
            for _, row in stock_info_df.iterrows():
                symbol = row.get('证券代码', '')
                name = row.get('证券简称', '')
                
                # 检查是否匹配关键字
                if (keyword_lower in symbol.lower() or 
                    keyword in name):
                    
                    # 获取当前价格（模拟）
                    base_price = random.uniform(10, 200)
                    change_percent = random.uniform(-5, 5)
                    
                    results.append({
                        "symbol": symbol,
                        "name": name,
                        "sector": "其他",  # AkShare基础接口不提供行业信息
                        "market": "SZ" if symbol.startswith(('000', '002', '300')) else "SH",
                        "price": round(base_price, 2),
                        "change_percent": round(change_percent, 2)
                    })
                    
                    if len(results) >= limit:
                        break
            
            return {
                "success": True,
                "keyword": keyword,
                "data": results,
                "total_count": len(results)
            }
            
        except Exception as e:
            logger.error(f"真实股票搜索失败: {e}")
            raise e

    def _search_mock_stocks(self, keyword: str, limit: int = 20) -> Dict[str, Any]:
        """在模拟数据中搜索股票"""
        try:
            results = []
            keyword_lower = keyword.lower()
            
            for stock in self.mock_stocks:
                if (keyword_lower in stock["symbol"].lower() or 
                    keyword in stock["name"] or
                    keyword in stock["sector"]):
                    
                    # 生成模拟价格数据
                    base_price = 100.0
                    change_percent = random.uniform(-3, 3)
                    
                    results.append({
                        "symbol": stock["symbol"],
                        "name": stock["name"],
                        "sector": stock["sector"],
                        "market": stock["market"],
                        "price": round(base_price * (1 + change_percent/100), 2),
                        "change_percent": round(change_percent, 2)
                    })
                    
                    if len(results) >= limit:
                        break
            
            return {
                "success": True,
                "keyword": keyword,
                "data": results,
                "total_count": len(results)
            }
            
        except Exception as e:
            logger.error(f"模拟股票搜索失败: {e}")
            return {"success": False, "error": str(e)}

    async def get_stock_list(self, market: str = "all", limit: int = 100) -> Dict[str, Any]:
        """获取股票列表"""
        try:
            logger.info(f"获取股票列表: market={market}, limit={limit}")
            
            # 首先尝试获取真实数据
            if not self.use_mock_data:
                try:
                    real_list = await self._get_real_stock_list(market, limit)
                    if real_list["success"]:
                        return real_list
                except Exception as e:
                    logger.warning(f"真实股票列表获取失败，使用模拟数据: {e}")
            
            # 回退到模拟数据
            return self._get_mock_stock_list(market, limit)
            
        except Exception as e:
            logger.error(f"股票列表获取失败: {e}")
            return {"success": False, "error": str(e)}

    async def _get_real_stock_list(self, market: str = "all", limit: int = 100) -> Dict[str, Any]:
        """获取真实股票列表"""
        try:
            results = []
            
            # 获取沪深两市股票列表
            if market in ["all", "sh"]:
                sh_stocks = await asyncio.to_thread(ak.stock_info_sh_name_code)
                for _, row in sh_stocks.head(limit // 2 if market == "all" else limit).iterrows():
                    symbol = row.get('证券代码', '')
                    name = row.get('证券简称', '')
                    
                    results.append({
                        "symbol": symbol,
                        "name": name,
                        "market": "SH",
                        "sector": "其他",
                        "price": round(random.uniform(10, 200), 2),
                        "change_percent": round(random.uniform(-5, 5), 2)
                    })
            
            if market in ["all", "sz"]:
                sz_stocks = await asyncio.to_thread(ak.stock_info_sz_name_code)
                sz_limit = limit // 2 if market == "all" else limit
                for _, row in sz_stocks.head(sz_limit).iterrows():
                    symbol = row.get('证券代码', '')
                    name = row.get('证券简称', '')
                    
                    results.append({
                        "symbol": symbol,
                        "name": name,
                        "market": "SZ",
                        "sector": "其他",
                        "price": round(random.uniform(10, 200), 2),
                        "change_percent": round(random.uniform(-5, 5), 2)
                    })
            
            return {
                "success": True,
                "market": market,
                "data": results[:limit],
                "total_count": len(results)
            }
            
        except Exception as e:
            logger.error(f"真实股票列表获取失败: {e}")
            raise e

    def _get_mock_stock_list(self, market: str = "all", limit: int = 100) -> Dict[str, Any]:
        """获取模拟股票列表"""
        try:
            results = []
            
            # 筛选市场
            filtered_stocks = self.mock_stocks
            if market != "all":
                filtered_stocks = [s for s in self.mock_stocks if s["market"].lower() == market.lower()]
            
            # 生成列表数据
            for stock in filtered_stocks[:limit]:
                base_price = 100.0
                change_percent = random.uniform(-3, 3)
                
                results.append({
                    "symbol": stock["symbol"],
                    "name": stock["name"],
                    "sector": stock["sector"],
                    "market": stock["market"],
                    "price": round(base_price * (1 + change_percent/100), 2),
                    "change_percent": round(change_percent, 2)
                })
            
            return {
                "success": True,
                "market": market,
                "data": results,
                "total_count": len(results)
            }
            
        except Exception as e:
            logger.error(f"模拟股票列表获取失败: {e}")
            return {"success": False, "error": str(e)}

    async def health_check(self) -> Dict[str, Any]:
        """服务健康检查"""
        try:
            # 测试各项功能
            stock_test = await self.get_realtime_quotes(["000001"])
            news_test = await self.get_financial_news(limit=5)
            
            return {
                "success": True,
                "stock_service": stock_test["success"],
                "news_service": news_test["success"],
                "using_mock_data": self.use_mock_data,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_stock_basic_info(self, symbol: str) -> Dict[str, Any]:
        """获取股票基本信息（包含上市时间）"""
        try:
            logger.info(f"获取股票基本信息: {symbol}")
            
            # 首先尝试获取真实数据
            if not self.use_mock_data:
                try:
                    real_info = await self._fetch_real_stock_info(symbol)
                    if real_info["success"]:
                        return real_info
                except Exception as e:
                    logger.warning(f"真实数据获取失败，使用模拟数据: {e}")
            
            # 使用模拟数据
            return self._generate_mock_stock_info(symbol)
            
        except Exception as e:
            logger.error(f"获取股票基本信息失败: {e}")
            return {"success": False, "error": str(e)}
    
    async def _fetch_real_stock_info(self, symbol: str) -> Dict[str, Any]:
        """获取真实股票基本信息"""
        
        def fetch_stock_info():
            return ak.stock_individual_info_em(symbol=symbol)
        
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(None, fetch_stock_info)
        
        if df.empty:
            raise ValueError("未获取到股票信息")
        
        # 解析数据
        info_dict = {}
        for _, row in df.iterrows():
            info_dict[row['item']] = row['value']
        
        # 提取关键信息
        basic_info = {
            "symbol": symbol,
            "name": info_dict.get("股票简称", ""),
            "list_date": info_dict.get("上市时间", ""),
            "industry": info_dict.get("行业", ""),
            "sector": info_dict.get("板块", ""),
            "total_shares": info_dict.get("总股本", ""),
            "market_cap": info_dict.get("总市值", ""),
            "pe_ratio": info_dict.get("市盈率(动)", ""),
            "pb_ratio": info_dict.get("市净率", ""),
            "listing_price": info_dict.get("发行价", ""),
        }
        
        return {
            "success": True,
            "symbol": symbol,
            "data": basic_info,
            "source": "akshare_real"
        }
    
    def _generate_mock_stock_info(self, symbol: str) -> Dict[str, Any]:
        """生成模拟股票基本信息"""
        
        # 股票上市时间和基本信息数据库
        stock_info_db = {
            "600519": {
                "name": "贵州茅台",
                "list_date": "2001-08-27",
                "industry": "食品饮料",
                "sector": "白酒",
                "listing_price": "34.51",
                "market": "SH"
            },
            "300750": {
                "name": "宁德时代", 
                "list_date": "2018-06-11",
                "industry": "电力设备",
                "sector": "电池",
                "listing_price": "25.14",
                "market": "SZ"
            },
            "000858": {
                "name": "五粮液",
                "list_date": "1998-04-27",
                "industry": "食品饮料", 
                "sector": "白酒",
                "listing_price": "18.38",
                "market": "SZ"
            },
            "600036": {
                "name": "招商银行",
                "list_date": "2002-04-09",
                "industry": "银行",
                "sector": "银行",
                "listing_price": "12.83",
                "market": "SH"
            },
            "002594": {
                "name": "比亚迪",
                "list_date": "2011-06-30",
                "industry": "汽车",
                "sector": "新能源汽车",
                "listing_price": "30.00",
                "market": "SZ"
            },
            "601318": {
                "name": "中国平安",
                "list_date": "2007-03-01",
                "industry": "非银金融",
                "sector": "保险",
                "listing_price": "39.99",
                "market": "SH"
            },
            "000333": {
                "name": "美的集团",
                "list_date": "2013-09-18",
                "industry": "家用电器",
                "sector": "白色家电", 
                "listing_price": "42.96",
                "market": "SZ"
            },
            "600276": {
                "name": "恒瑞医药",
                "list_date": "2000-10-18",
                "industry": "医药生物",
                "sector": "化学制药",
                "listing_price": "25.18",
                "market": "SH"
            }
        }
        
        # 获取股票信息，如果没有则使用默认值
        stock_data = stock_info_db.get(symbol, {
            "name": f"股票{symbol}",
            "list_date": "2010-01-01",
            "industry": "其他",
            "sector": "其他",
            "listing_price": "10.00",
            "market": "SH" if symbol.startswith(('6', '90')) else "SZ"
        })
        
        basic_info = {
            "symbol": symbol,
            "name": stock_data["name"],
            "list_date": stock_data["list_date"],
            "industry": stock_data["industry"],
            "sector": stock_data["sector"],
            "listing_price": stock_data["listing_price"],
            "market": stock_data["market"],
            "total_shares": f"{random.randint(100, 2000)}万股",
            "market_cap": f"{random.randint(500, 5000)}亿元",
            "pe_ratio": f"{random.randint(10, 50)}.{random.randint(10, 99)}",
            "pb_ratio": f"{random.randint(1, 10)}.{random.randint(10, 99)}",
        }
        
        return {
            "success": True,
            "symbol": symbol,
            "data": basic_info,
            "source": "mock_data"
        }

    async def get_financial_data(self, symbol: str, report_type: str = "年报") -> Dict[str, Any]:
        """获取股票财务数据（资产负债表、利润表、现金流量表）"""
        try:
            logger.info(f"获取财务数据: {symbol}, 报告类型: {report_type}")
            
            # 首先尝试获取真实数据
            if not self.use_mock_data:
                try:
                    real_financial_data = await self._fetch_real_financial_data(symbol, report_type)
                    if real_financial_data["success"]:
                        return real_financial_data
                except Exception as e:
                    logger.warning(f"真实财务数据获取失败，使用模拟数据: {e}")
            
            # 使用模拟数据
            return self._generate_mock_financial_data(symbol, report_type)
            
        except Exception as e:
            logger.error(f"获取财务数据失败: {e}")
            return {"success": False, "error": str(e)}

    async def _fetch_real_financial_data(self, symbol: str, report_type: str) -> Dict[str, Any]:
        """获取真实财务数据"""
        
        def fetch_financial():
            # 根据报告类型选择接口
            if report_type == "年报":
                # 获取年报数据
                balance_sheet = ak.stock_financial_abstract_ths(symbol=symbol, indicator="资产负债表")
                income_statement = ak.stock_financial_abstract_ths(symbol=symbol, indicator="利润表") 
                cash_flow = ak.stock_financial_abstract_ths(symbol=symbol, indicator="现金流量表")
                
                return {
                    "balance_sheet": balance_sheet,
                    "income_statement": income_statement,
                    "cash_flow": cash_flow
                }
            else:
                # 季报数据
                return ak.stock_financial_abstract_ths(symbol=symbol, indicator="主要指标")
        
        loop = asyncio.get_event_loop()
        financial_data = await loop.run_in_executor(None, fetch_financial)
        
        # 转换数据格式
        formatted_data = {}
        
        if isinstance(financial_data, dict):
            for table_name, df in financial_data.items():
                if not df.empty:
                    # 取最近的财务数据
                    latest_data = df.iloc[0].to_dict()
                    formatted_data[table_name] = latest_data
        else:
            # 单个数据框
            if not financial_data.empty:
                formatted_data["main_indicators"] = financial_data.iloc[0].to_dict()
        
        return {
            "success": True,
            "symbol": symbol,
            "report_type": report_type,
            "data": formatted_data,
            "source": "akshare_real"
        }

    def _generate_mock_financial_data(self, symbol: str, report_type: str) -> Dict[str, Any]:
        """生成模拟财务数据"""
        
        # 基于股票代码生成不同规模的财务数据
        if symbol in ["600519", "000858"]:  # 大盘股
            revenue_base = random.randint(800, 1200) * 100000000  # 800-1200亿
            assets_base = random.randint(1000, 1500) * 100000000  # 1000-1500亿
        elif symbol in ["300750", "002594"]:  # 中大盘股
            revenue_base = random.randint(300, 600) * 100000000   # 300-600亿
            assets_base = random.randint(400, 800) * 100000000    # 400-800亿
        else:  # 其他股票
            revenue_base = random.randint(50, 200) * 100000000    # 50-200亿
            assets_base = random.randint(100, 300) * 100000000    # 100-300亿
        
        # 资产负债表
        balance_sheet = {
            "总资产": assets_base,
            "总负债": assets_base * random.uniform(0.3, 0.6),
            "股东权益": assets_base * random.uniform(0.4, 0.7),
            "流动资产": assets_base * random.uniform(0.3, 0.5),
            "固定资产": assets_base * random.uniform(0.2, 0.4),
            "流动负债": assets_base * random.uniform(0.2, 0.35),
            "长期负债": assets_base * random.uniform(0.1, 0.25),
        }
        
        # 利润表
        income_statement = {
            "营业收入": revenue_base,
            "营业成本": revenue_base * random.uniform(0.6, 0.8),
            "营业利润": revenue_base * random.uniform(0.15, 0.25),
            "净利润": revenue_base * random.uniform(0.1, 0.2),
            "每股收益": round(random.uniform(0.5, 3.0), 2),
            "销售毛利率": round(random.uniform(20, 40), 2),
            "销售净利率": round(random.uniform(8, 20), 2),
        }
        
        # 现金流量表
        cash_flow = {
            "经营活动现金流": revenue_base * random.uniform(0.1, 0.25),
            "投资活动现金流": -revenue_base * random.uniform(0.05, 0.15),
            "筹资活动现金流": revenue_base * random.uniform(-0.1, 0.1),
            "现金及现金等价物净增加额": revenue_base * random.uniform(0.02, 0.08),
        }
        
        # 主要财务指标
        key_indicators = {
            "市盈率": round(random.uniform(15, 35), 2),
            "市净率": round(random.uniform(1.5, 4.0), 2),
            "净资产收益率": round(random.uniform(8, 20), 2),
            "总资产周转率": round(random.uniform(0.5, 1.2), 2),
            "资产负债率": round(balance_sheet["总负债"] / balance_sheet["总资产"] * 100, 2),
            "流动比率": round(balance_sheet["流动资产"] / balance_sheet["流动负债"], 2),
        }
        
        financial_data = {
            "balance_sheet": balance_sheet,
            "income_statement": income_statement, 
            "cash_flow": cash_flow,
            "key_indicators": key_indicators,
            "report_date": (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d"),
            "report_period": report_type
        }
        
        return {
            "success": True,
            "symbol": symbol,
            "report_type": report_type,
            "data": financial_data,
            "source": "mock_data"
        }

    async def get_financial_indicators(self, symbol: str) -> Dict[str, Any]:
        """获取股票财务指标分析"""
        try:
            logger.info(f"获取财务指标: {symbol}")
            
            # 首先尝试获取真实数据
            if not self.use_mock_data:
                try:
                    real_indicators = await self._fetch_real_financial_indicators(symbol)
                    if real_indicators["success"]:
                        return real_indicators
                except Exception as e:
                    logger.warning(f"真实财务指标获取失败，使用模拟数据: {e}")
            
            # 使用模拟数据
            return self._generate_mock_financial_indicators(symbol)
            
        except Exception as e:
            logger.error(f"获取财务指标失败: {e}")
            return {"success": False, "error": str(e)}

    async def _fetch_real_financial_indicators(self, symbol: str) -> Dict[str, Any]:
        """获取真实财务指标"""
        
        def fetch_indicators():
            # 获取主要财务指标
            return ak.stock_financial_analysis_indicator(symbol=symbol)
        
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(None, fetch_indicators)
        
        if df.empty:
            raise ValueError("未获取到财务指标数据")
        
        # 取最近一期数据
        latest_indicators = df.iloc[0].to_dict()
        
        # 计算趋势（对比前几期）
        trends = {}
        if len(df) >= 2:
            current = df.iloc[0]
            previous = df.iloc[1]
            
            for col in df.columns:
                if col != "报告期":
                    try:
                        curr_val = float(current[col])
                        prev_val = float(previous[col])
                        if prev_val != 0:
                            change_rate = ((curr_val - prev_val) / prev_val) * 100
                            trends[col] = {
                                "current": curr_val,
                                "previous": prev_val,
                                "change_rate": round(change_rate, 2),
                                "trend": "上升" if change_rate > 0 else "下降"
                            }
                    except (ValueError, TypeError):
                        continue
        
        return {
            "success": True,
            "symbol": symbol,
            "data": {
                "latest_indicators": latest_indicators,
                "trends": trends,
                "analysis_date": datetime.now().strftime("%Y-%m-%d")
            },
            "source": "akshare_real"
        }

    def _generate_mock_financial_indicators(self, symbol: str) -> Dict[str, Any]:
        """生成模拟财务指标"""
        
        # 生成基础指标
        indicators = {
            # 盈利能力
            "净资产收益率": round(random.uniform(8, 25), 2),
            "总资产净利率": round(random.uniform(3, 15), 2),
            "销售毛利率": round(random.uniform(15, 45), 2),
            "销售净利率": round(random.uniform(5, 25), 2),
            
            # 成长能力
            "营业收入增长率": round(random.uniform(-10, 30), 2),
            "净利润增长率": round(random.uniform(-15, 40), 2),
            "总资产增长率": round(random.uniform(0, 20), 2),
            
            # 偿债能力
            "资产负债率": round(random.uniform(20, 60), 2),
            "流动比率": round(random.uniform(1.0, 3.0), 2),
            "速动比率": round(random.uniform(0.8, 2.5), 2),
            "利息保障倍数": round(random.uniform(5, 20), 1),
            
            # 运营能力
            "总资产周转率": round(random.uniform(0.3, 1.5), 2),
            "存货周转率": round(random.uniform(2, 12), 2),
            "应收账款周转率": round(random.uniform(3, 15), 2),
            
            # 估值指标
            "市盈率": round(random.uniform(10, 50), 2),
            "市净率": round(random.uniform(0.8, 5.0), 2),
            "市销率": round(random.uniform(1, 10), 2),
        }
        
        # 生成趋势分析
        trends = {}
        for key, value in indicators.items():
            change_rate = random.uniform(-20, 20)
            trends[key] = {
                "current": value,
                "previous": round(value * (1 - change_rate/100), 2),
                "change_rate": round(change_rate, 2),
                "trend": "上升" if change_rate > 0 else "下降",
                "evaluation": self._evaluate_indicator(key, value, change_rate)
            }
        
        # 综合评分
        profitability_score = self._calculate_profitability_score(indicators)
        growth_score = self._calculate_growth_score(trends)
        debt_score = self._calculate_debt_score(indicators)
        efficiency_score = self._calculate_efficiency_score(indicators)
        
        overall_score = round((profitability_score + growth_score + debt_score + efficiency_score) / 4, 1)
        
        return {
            "success": True,
            "symbol": symbol,
            "data": {
                "latest_indicators": indicators,
                "trends": trends,
                "scores": {
                    "盈利能力": profitability_score,
                    "成长能力": growth_score,
                    "偿债能力": debt_score,
                    "运营能力": efficiency_score,
                    "综合评分": overall_score
                },
                "analysis_date": datetime.now().strftime("%Y-%m-%d"),
                "evaluation": self._get_overall_evaluation(overall_score)
            },
            "source": "mock_data"
        }

    def _evaluate_indicator(self, indicator_name: str, value: float, change_rate: float) -> str:
        """评价单个指标"""
        evaluations = {
            "净资产收益率": "优秀" if value > 15 else "良好" if value > 8 else "一般",
            "营业收入增长率": "优秀" if value > 15 else "良好" if value > 5 else "需关注",
            "资产负债率": "安全" if value < 40 else "适中" if value < 60 else "偏高",
            "流动比率": "充足" if value > 2 else "适中" if value > 1.2 else "偏低"
        }
        return evaluations.get(indicator_name, "正常")

    def _calculate_profitability_score(self, indicators: Dict[str, float]) -> float:
        """计算盈利能力得分"""
        roe = indicators.get("净资产收益率", 10)
        roa = indicators.get("总资产净利率", 5)
        npm = indicators.get("销售净利率", 10)
        
        roe_score = min(roe / 20 * 100, 100)
        roa_score = min(roa / 10 * 100, 100)
        npm_score = min(npm / 20 * 100, 100)
        
        return round((roe_score + roa_score + npm_score) / 3, 1)

    def _calculate_growth_score(self, trends: Dict[str, Any]) -> float:
        """计算成长能力得分"""
        revenue_growth = trends.get("营业收入增长率", {}).get("change_rate", 0)
        profit_growth = trends.get("净利润增长率", {}).get("change_rate", 0)
        
        revenue_score = max(0, min(100, 50 + revenue_growth * 2))
        profit_score = max(0, min(100, 50 + profit_growth * 1.5))
        
        return round((revenue_score + profit_score) / 2, 1)

    def _calculate_debt_score(self, indicators: Dict[str, float]) -> float:
        """计算偿债能力得分"""
        debt_ratio = indicators.get("资产负债率", 50)
        current_ratio = indicators.get("流动比率", 1.5)
        
        debt_score = max(0, 100 - debt_ratio * 1.5)
        liquidity_score = min(100, current_ratio * 50)
        
        return round((debt_score + liquidity_score) / 2, 1)

    def _calculate_efficiency_score(self, indicators: Dict[str, float]) -> float:
        """计算运营能力得分"""
        total_asset_turnover = indicators.get("总资产周转率", 0.8)
        inventory_turnover = indicators.get("存货周转率", 6)
        
        asset_score = min(100, total_asset_turnover * 80)
        inventory_score = min(100, inventory_turnover * 10)
        
        return round((asset_score + inventory_score) / 2, 1)

    def _get_overall_evaluation(self, score: float) -> str:
        """获取综合评价"""
        if score >= 80:
            return "财务状况优秀，各项指标表现良好"
        elif score >= 60:
            return "财务状况良好，部分指标有提升空间"
        elif score >= 40:
            return "财务状况一般，需要关注风险指标"
        else:
            return "财务状况较差，存在一定风险"

    async def get_news_by_category(self, category: str, limit: int = 50) -> Dict[str, Any]:
        """根据分类获取新闻"""
        try:
            logger.info(f"获取{category}类新闻，数量限制: {limit}")
            
            # 首先获取所有新闻
            all_news_result = await self.get_financial_news(limit * 2)  # 获取更多用于筛选
            
            if not all_news_result["success"]:
                return all_news_result
            
            # 筛选指定分类的新闻
            filtered_news = [
                news for news in all_news_result["data"] 
                if news.get("category") == category
            ][:limit]
            
            return {
                "success": True,
                "category": category,
                "data": filtered_news,
                "total_count": len(filtered_news),
                "source": all_news_result.get("source", "unknown")
            }
            
        except Exception as e:
            logger.error(f"获取分类新闻失败: {e}")
            return {"success": False, "error": str(e)}

# 单例服务
_service_instance = None

def get_enhanced_akshare_service() -> EnhancedAkShareService:
    """获取增强的AkShare服务实例"""
    global _service_instance
    if _service_instance is None:
        _service_instance = EnhancedAkShareService()
    return _service_instance