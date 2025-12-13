"""
AkShare数据服务
提供股票数据和新闻数据获取与分类功能
"""

import akshare as ak
import pandas as pd
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import re

# 设置日志
logger = logging.getLogger(__name__)

class NewsCategory:
    """新闻分类枚举"""
    MARKET = "market"           # 市场动态
    POLICY = "policy"           # 政策法规
    EARNINGS = "earnings"       # 业绩财报
    INDUSTRY = "industry"       # 行业动态
    COMPANY = "company"         # 公司新闻
    MACRO = "macro"             # 宏观经济
    INTERNATIONAL = "international"  # 国际市场
    ALERT = "alert"             # 重要提醒
    GENERAL = "general"         # 一般新闻

class StockDataService:
    """股票数据服务"""
    
    def __init__(self):
        self.session = None
        self._stock_cache = {}
        self._cache_time = {}
        
    async def get_stock_data(self, symbol: str, period: str = "daily", adjust: str = "", limit: int = 500) -> Dict[str, Any]:
        """
        获取股票历史数据
        
        Args:
            symbol: 股票代码
            period: 周期 (daily, weekly, monthly)
            adjust: 复权类型 (qfq前复权, hfq后复权, 空字符串不复权)
            limit: 数据条数限制
        """
        try:
            logger.info(f"获取股票数据: {symbol}, 周期: {period}")
            
            # 运行在线程池中以避免阻塞
            df = await self._run_in_executor(
                ak.stock_zh_a_hist,
                symbol=symbol,
                period=period,
                adjust=adjust,
                start_date=(datetime.now() - timedelta(days=365*2)).strftime("%Y%m%d"),
                end_date=datetime.now().strftime("%Y%m%d")
            )
            
            if df.empty:
                logger.warning(f"未获取到股票数据: {symbol}")
                return {"success": False, "data": [], "message": "未获取到数据"}
            
            # 数据清洗和格式化
            df = df.tail(limit) if limit > 0 else df
            
            data_list = []
            for _, row in df.iterrows():
                try:
                    data_point = {
                        "date": row['日期'].strftime("%Y-%m-%d") if pd.notna(row['日期']) else None,
                        "open": float(row['开盘']) if pd.notna(row['开盘']) else 0,
                        "high": float(row['最高']) if pd.notna(row['最高']) else 0,
                        "low": float(row['最低']) if pd.notna(row['最低']) else 0,
                        "close": float(row['收盘']) if pd.notna(row['收盘']) else 0,
                        "volume": int(row['成交量']) if pd.notna(row['成交量']) else 0,
                        "amount": float(row['成交额']) if pd.notna(row['成交额']) else 0
                    }
                    data_list.append(data_point)
                except Exception as e:
                    logger.warning(f"数据行处理错误: {e}")
                    continue
            
            logger.info(f"成功获取 {len(data_list)} 条股票数据")
            return {
                "success": True,
                "symbol": symbol,
                "period": period,
                "data": data_list,
                "total_count": len(data_list)
            }
            
        except Exception as e:
            logger.error(f"获取股票数据失败 {symbol}: {e}")
            return {"success": False, "data": [], "message": str(e)}
    
    async def get_realtime_data(self, symbols: List[str]) -> Dict[str, Any]:
        """
        获取实时行情数据
        
        Args:
            symbols: 股票代码列表
        """
        try:
            logger.info(f"获取实时行情: {symbols}")
            
            # 获取A股实时行情
            df = await self._run_in_executor(ak.stock_zh_a_spot_em)
            
            if df.empty:
                return {"success": False, "data": {}, "message": "未获取到实时数据"}
            
            result_data = {}
            
            for symbol in symbols:
                # 查找匹配的股票
                stock_data = df[df['代码'] == symbol]
                
                if not stock_data.empty:
                    row = stock_data.iloc[0]
                    try:
                        result_data[symbol] = {
                            "symbol": symbol,
                            "name": str(row['名称']),
                            "price": float(row['最新价']) if pd.notna(row['最新价']) else 0,
                            "change": float(row['涨跌额']) if pd.notna(row['涨跌额']) else 0,
                            "change_percent": float(row['涨跌幅']) if pd.notna(row['涨跌幅']) else 0,
                            "volume": int(row['成交量']) if pd.notna(row['成交量']) else 0,
                            "amount": float(row['成交额']) if pd.notna(row['成交额']) else 0,
                            "high": float(row['最高']) if pd.notna(row['最高']) else 0,
                            "low": float(row['最低']) if pd.notna(row['最低']) else 0,
                            "open": float(row['今开']) if pd.notna(row['今开']) else 0,
                            "pre_close": float(row['昨收']) if pd.notna(row['昨收']) else 0,
                            "timestamp": datetime.now().isoformat()
                        }
                    except Exception as e:
                        logger.warning(f"处理实时数据错误 {symbol}: {e}")
                        continue
                else:
                    logger.warning(f"未找到股票实时数据: {symbol}")
            
            logger.info(f"成功获取 {len(result_data)} 只股票实时数据")
            return {
                "success": True,
                "data": result_data,
                "total_count": len(result_data)
            }
            
        except Exception as e:
            logger.error(f"获取实时数据失败: {e}")
            return {"success": False, "data": {}, "message": str(e)}
    
    async def search_stocks(self, keyword: str, limit: int = 20) -> Dict[str, Any]:
        """
        搜索股票
        
        Args:
            keyword: 搜索关键词
            limit: 返回数量限制
        """
        try:
            logger.info(f"搜索股票: {keyword}")
            
            # 获取股票列表
            df = await self._run_in_executor(ak.stock_zh_a_spot_em)
            
            if df.empty:
                return {"success": False, "data": [], "message": "获取股票列表失败"}
            
            # 搜索匹配
            keyword_lower = keyword.lower()
            matched_stocks = []
            
            for _, row in df.iterrows():
                try:
                    symbol = str(row['代码'])
                    name = str(row['名称'])
                    
                    # 检查是否匹配
                    if (keyword_lower in symbol.lower() or 
                        keyword in name or 
                        keyword_lower in name.lower()):
                        
                        stock_info = {
                            "symbol": symbol,
                            "name": name,
                            "market": "SH" if symbol.startswith(('60', '68', '00')) else "SZ",
                            "price": float(row['最新价']) if pd.notna(row['最新价']) else 0,
                            "change_percent": float(row['涨跌幅']) if pd.notna(row['涨跌幅']) else 0
                        }
                        matched_stocks.append(stock_info)
                        
                        if len(matched_stocks) >= limit:
                            break
                            
                except Exception as e:
                    logger.warning(f"处理搜索结果错误: {e}")
                    continue
            
            logger.info(f"搜索到 {len(matched_stocks)} 只股票")
            return {
                "success": True,
                "keyword": keyword,
                "data": matched_stocks,
                "total_count": len(matched_stocks)
            }
            
        except Exception as e:
            logger.error(f"股票搜索失败: {e}")
            return {"success": False, "data": [], "message": str(e)}
    
    async def _run_in_executor(self, func, *args, **kwargs):
        """在执行器中运行同步函数"""
        loop = asyncio.get_event_loop()
        import functools
        partial_func = functools.partial(func, *args, **kwargs)
        return await loop.run_in_executor(None, partial_func)

class NewsDataService:
    """新闻数据服务"""
    
    def __init__(self):
        # 新闻分类关键词映射
        self.category_keywords = {
            NewsCategory.POLICY: [
                "政策", "法规", "监管", "央行", "证监会", "银保监会", "发改委", 
                "财政部", "国务院", "政府", "法律", "规定", "通知", "公告"
            ],
            NewsCategory.EARNINGS: [
                "财报", "业绩", "营收", "利润", "季报", "年报", "中报", 
                "净利", "营业收入", "毛利率", "净资产", "每股收益"
            ],
            NewsCategory.INDUSTRY: [
                "行业", "板块", "产业", "芯片", "新能源", "医药", "汽车", 
                "地产", "金融", "科技", "5G", "人工智能", "新材料"
            ],
            NewsCategory.COMPANY: [
                "公司", "企业", "股东", "董事", "高管", "并购", "重组", 
                "增发", "配股", "分红", "回购", "股权", "投资"
            ],
            NewsCategory.MACRO: [
                "GDP", "CPI", "PMI", "通胀", "就业", "汇率", "利率", 
                "货币政策", "财政政策", "经济", "增长", "消费"
            ],
            NewsCategory.INTERNATIONAL: [
                "美股", "港股", "欧股", "美联储", "美元", "国际", 
                "全球", "海外", "外资", "MSCI", "富时"
            ],
            NewsCategory.MARKET: [
                "A股", "上证", "深证", "创业板", "科创板", "新三板", 
                "指数", "涨跌", "成交", "资金", "北向", "南向"
            ]
        }
    
    async def get_financial_news(self, limit: int = 50) -> Dict[str, Any]:
        """
        获取财经新闻并进行分类
        
        Args:
            limit: 新闻数量限制
        """
        try:
            logger.info(f"获取财经新闻, 限制数量: {limit}")
            
            # 获取财经新闻
            df = await self._run_in_executor(ak.stock_news_em)
            
            if df.empty:
                logger.warning("未获取到新闻数据")
                return {"success": False, "data": [], "message": "未获取到新闻数据"}
            
            news_list = []
            df = df.head(limit)
            
            for _, row in df.iterrows():
                try:
                    title = str(row.get('新闻标题', ''))
                    content = str(row.get('新闻内容', '')) 
                    time_str = str(row.get('发布时间', ''))
                    source = str(row.get('新闻来源', ''))
                    
                    # 分类新闻
                    category = self._classify_news(title, content)
                    
                    # 提取相关股票代码
                    mentioned_stocks = self._extract_stock_codes(title + " " + content)
                    
                    news_item = {
                        "id": f"news_{hash(title)}",
                        "title": title,
                        "content": content[:500] + "..." if len(content) > 500 else content,
                        "source": source,
                        "publish_time": time_str,
                        "category": category,
                        "mentioned_stocks": mentioned_stocks,
                        "importance": self._calculate_importance(title, content, category)
                    }
                    
                    news_list.append(news_item)
                    
                except Exception as e:
                    logger.warning(f"处理新闻项错误: {e}")
                    continue
            
            # 按重要性和时间排序
            news_list.sort(key=lambda x: (x['importance'], x['publish_time']), reverse=True)
            
            # 按分类统计
            category_stats = {}
            for news in news_list:
                cat = news['category']
                category_stats[cat] = category_stats.get(cat, 0) + 1
            
            logger.info(f"成功获取并分类 {len(news_list)} 条新闻")
            return {
                "success": True,
                "data": news_list,
                "total_count": len(news_list),
                "category_stats": category_stats,
                "fetch_time": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"获取新闻失败: {e}")
            return {"success": False, "data": [], "message": str(e)}
    
    def _classify_news(self, title: str, content: str) -> str:
        """
        新闻智能分类
        
        Args:
            title: 新闻标题
            content: 新闻内容
            
        Returns:
            新闻分类
        """
        text = (title + " " + content).lower()
        
        # 计算每个类别的匹配分数
        category_scores = {}
        
        for category, keywords in self.category_keywords.items():
            score = 0
            for keyword in keywords:
                # 标题匹配权重更高
                if keyword in title:
                    score += 3
                if keyword in content:
                    score += 1
            category_scores[category] = score
        
        # 返回得分最高的分类
        if category_scores:
            best_category = max(category_scores, key=category_scores.get)
            if category_scores[best_category] > 0:
                return best_category
        
        return NewsCategory.GENERAL
    
    def _extract_stock_codes(self, text: str) -> List[str]:
        """
        从文本中提取股票代码
        
        Args:
            text: 文本内容
            
        Returns:
            股票代码列表
        """
        # 匹配6位数字的股票代码
        pattern = r'\b[0-9]{6}\b'
        codes = re.findall(pattern, text)
        
        # 过滤有效的股票代码前缀
        valid_codes = []
        for code in codes:
            if (code.startswith(('00', '30', '60', '68', '83', '87', '40', '43', '50')) and
                code not in valid_codes):  # 避免重复
                valid_codes.append(code)
        
        return valid_codes[:5]  # 最多返回5个相关股票
    
    def _calculate_importance(self, title: str, content: str, category: str) -> int:
        """
        计算新闻重要性评分
        
        Args:
            title: 标题
            content: 内容  
            category: 分类
            
        Returns:
            重要性评分 (1-10)
        """
        importance = 5  # 基础分
        
        # 重要关键词加分
        high_importance_words = [
            "重大", "紧急", "突发", "首次", "历史", "创新高", "跌停", 
            "涨停", "暴跌", "暴涨", "监管", "调查", "处罚", "停牌"
        ]
        
        text = title + " " + content
        for word in high_importance_words:
            if word in text:
                importance += 1
        
        # 特定分类加权
        if category in [NewsCategory.POLICY, NewsCategory.ALERT]:
            importance += 2
        elif category in [NewsCategory.EARNINGS, NewsCategory.MACRO]:
            importance += 1
        
        return min(importance, 10)  # 最高10分
    
    async def get_news_by_category(self, category: str, limit: int = 20) -> Dict[str, Any]:
        """
        按分类获取新闻
        
        Args:
            category: 新闻分类
            limit: 数量限制
        """
        all_news = await self.get_financial_news(limit * 3)  # 获取更多数据用于筛选
        
        if not all_news['success']:
            return all_news
        
        # 筛选指定分类的新闻
        filtered_news = [
            news for news in all_news['data'] 
            if news['category'] == category
        ][:limit]
        
        return {
            "success": True,
            "category": category,
            "data": filtered_news,
            "total_count": len(filtered_news)
        }
    
    async def _run_in_executor(self, func, *args, **kwargs):
        """在执行器中运行同步函数"""
        loop = asyncio.get_event_loop()
        import functools
        partial_func = functools.partial(func, *args, **kwargs)
        return await loop.run_in_executor(None, partial_func)

class AkShareService:
    """AkShare统一服务接口"""
    
    def __init__(self):
        self.stock_service = StockDataService()
        self.news_service = NewsDataService()
    
    # 股票数据接口
    async def get_stock_data(self, symbol: str, **kwargs) -> Dict[str, Any]:
        """获取股票历史数据"""
        return await self.stock_service.get_stock_data(symbol, **kwargs)
    
    async def get_realtime_data(self, symbols: List[str]) -> Dict[str, Any]:
        """获取实时行情"""
        return await self.stock_service.get_realtime_data(symbols)
    
    async def search_stocks(self, keyword: str, limit: int = 20) -> Dict[str, Any]:
        """搜索股票"""
        return await self.stock_service.search_stocks(keyword, limit)
    
    # 新闻数据接口
    async def get_financial_news(self, limit: int = 50) -> Dict[str, Any]:
        """获取财经新闻"""
        return await self.news_service.get_financial_news(limit)
    
    async def get_news_by_category(self, category: str, limit: int = 20) -> Dict[str, Any]:
        """按分类获取新闻"""
        return await self.news_service.get_news_by_category(category, limit)
    
    async def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        try:
            # 测试股票数据获取
            stock_test = await self.get_realtime_data(['000001'])
            
            # 测试新闻获取
            news_test = await self.get_financial_news(limit=5)
            
            return {
                "success": True,
                "stock_service": stock_test['success'],
                "news_service": news_test['success'],
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

# 全局服务实例
_akshare_service = None

def get_akshare_service() -> AkShareService:
    """获取AkShare服务实例"""
    global _akshare_service
    if _akshare_service is None:
        _akshare_service = AkShareService()
    return _akshare_service