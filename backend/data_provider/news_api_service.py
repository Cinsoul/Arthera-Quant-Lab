"""
News API集成服务
提供全球财经新闻、市场资讯数据
"""

import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class NewsAPIService:
    """
    News API数据服务
    提供：全球新闻、财经资讯、特定来源新闻
    """
    
    def __init__(self, api_key: str = None):
        if api_key is None:
            # 从配置管理器获取API密钥
            try:
                from .service_config_manager import get_service_config_manager
                config_manager = get_service_config_manager()
                self.api_key = config_manager.get_api_key('news_api')
            except Exception:
                self.api_key = None
        else:
            self.api_key = api_key
            
        self.base_url = "https://newsapi.org/v2"
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
            
            # 设置请求头
            headers = {
                'X-API-Key': self.api_key,
                'User-Agent': 'Arthera-Quant-Lab/1.0'
            }
            
            url = f"{self.base_url}/{endpoint}"
            
            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return {"success": True, "data": data}
                elif response.status == 429:
                    return {"success": False, "error": "API请求频率超限"}
                else:
                    error_text = await response.text()
                    return {"success": False, "error": f"HTTP {response.status}: {error_text}"}
                    
        except Exception as e:
            logger.error(f"News API请求失败: {e}")
            return {"success": False, "error": str(e)}

    # ============================================================================
    # 财经新闻
    # ============================================================================
    
    async def get_financial_news(self, limit: int = 50) -> Dict[str, Any]:
        """获取财经新闻"""
        try:
            # 使用商业头条作为财经新闻
            result = await self.get_business_headlines(country="us", page_size=limit)
            
            if result.get("success"):
                articles = result.get("articles", [])
                
                # 转换为统一格式
                news_items = []
                for article in articles:
                    news_items.append({
                        "title": article.get("title", ""),
                        "content": article.get("description", ""),
                        "url": article.get("url", ""),
                        "publishedAt": article.get("publishedAt", ""),
                        "source": article.get("source", {}).get("name", "NewsAPI"),
                        "category": "business"
                    })
                
                return {
                    "success": True,
                    "news": news_items[:limit],
                    "total": len(news_items),
                    "source": "newsapi"
                }
            
            return {"success": False, "error": "无法获取财经新闻"}
            
        except Exception as e:
            logger.error(f"NewsAPI财经新闻获取失败: {e}")
            return {"success": False, "error": str(e)}

    async def get_business_headlines(self, country: str = "us", page_size: int = 50) -> Dict[str, Any]:
        """获取商业财经头条新闻"""
        params = {
            "country": country,
            "category": "business",
            "pageSize": min(page_size, 100)  # API限制最多100条
        }
        
        result = await self._make_request("top-headlines", params)
        
        if result["success"] and result["data"]:
            news_data = result["data"]
            articles = news_data.get("articles", [])
            
            processed_news = []
            for article in articles:
                processed_news.append({
                    "source": article.get("source", {}).get("name"),
                    "author": article.get("author"),
                    "title": article.get("title"),
                    "description": article.get("description"),
                    "url": article.get("url"),
                    "url_to_image": article.get("urlToImage"),
                    "published_at": article.get("publishedAt"),
                    "content": article.get("content"),
                    "category": "business"
                })
            
            return {
                "success": True,
                "country": country,
                "category": "business",
                "total_results": news_data.get("totalResults", 0),
                "articles": processed_news,
                "source": "newsapi"
            }
        
        return result
    
    async def search_financial_news(self, query: str, days_back: int = 7, 
                                  page_size: int = 50) -> Dict[str, Any]:
        """搜索财经相关新闻"""
        # 计算日期范围
        from_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        
        params = {
            "q": query,
            "searchIn": "title,description",
            "from": from_date,
            "sortBy": "publishedAt",
            "pageSize": min(page_size, 100),
            "language": "en"
        }
        
        result = await self._make_request("everything", params)
        
        if result["success"] and result["data"]:
            news_data = result["data"]
            articles = news_data.get("articles", [])
            
            processed_news = []
            for article in articles:
                processed_news.append({
                    "source": article.get("source", {}).get("name"),
                    "author": article.get("author"),
                    "title": article.get("title"),
                    "description": article.get("description"),
                    "url": article.get("url"),
                    "url_to_image": article.get("urlToImage"),
                    "published_at": article.get("publishedAt"),
                    "content": article.get("content"),
                    "relevance_score": self._calculate_relevance(article, query)
                })
            
            # 按相关性排序
            processed_news.sort(key=lambda x: x["relevance_score"], reverse=True)
            
            return {
                "success": True,
                "query": query,
                "date_range": f"{days_back} days",
                "total_results": news_data.get("totalResults", 0),
                "articles": processed_news,
                "source": "newsapi"
            }
        
        return result
    
    async def get_financial_sources_news(self, sources: List[str], 
                                       page_size: int = 50) -> Dict[str, Any]:
        """获取特定财经媒体的新闻"""
        # 默认财经媒体源
        if not sources:
            sources = [
                "bloomberg", "reuters", "cnbc", "the-wall-street-journal",
                "financial-times", "fortune", "business-insider"
            ]
        
        sources_str = ",".join(sources)
        
        params = {
            "sources": sources_str,
            "sortBy": "publishedAt",
            "pageSize": min(page_size, 100)
        }
        
        result = await self._make_request("everything", params)
        
        if result["success"] and result["data"]:
            news_data = result["data"]
            articles = news_data.get("articles", [])
            
            processed_news = []
            for article in articles:
                processed_news.append({
                    "source": article.get("source", {}).get("name"),
                    "author": article.get("author"),
                    "title": article.get("title"),
                    "description": article.get("description"),
                    "url": article.get("url"),
                    "url_to_image": article.get("urlToImage"),
                    "published_at": article.get("publishedAt"),
                    "content": article.get("content"),
                    "category": "financial"
                })
            
            return {
                "success": True,
                "sources": sources,
                "total_results": news_data.get("totalResults", 0),
                "articles": processed_news,
                "source": "newsapi"
            }
        
        return result

    # ============================================================================
    # 股票相关新闻
    # ============================================================================
    
    async def get_stock_news(self, symbol: str, days_back: int = 7, 
                           page_size: int = 30) -> Dict[str, Any]:
        """获取特定股票相关新闻"""
        # 构建搜索查询
        queries = [
            f'"{symbol}"',  # 精确匹配股票代码
            f"{symbol} stock",  # 股票相关
            f"{symbol} earnings",  # 财报相关
            f"{symbol} price"  # 价格相关
        ]
        
        all_articles = []
        
        for query in queries:
            result = await self.search_financial_news(query, days_back, page_size // len(queries))
            if result.get("success") and result.get("articles"):
                all_articles.extend(result["articles"])
        
        # 去重（基于URL）
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            url = article.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_articles.append(article)
        
        # 按发布时间排序
        unique_articles.sort(key=lambda x: x.get("published_at", ""), reverse=True)
        
        return {
            "success": True,
            "symbol": symbol,
            "date_range": f"{days_back} days",
            "total_results": len(unique_articles),
            "articles": unique_articles[:page_size],
            "source": "newsapi"
        }
    
    async def get_crypto_news(self, crypto_symbol: str = "bitcoin", 
                            days_back: int = 7, page_size: int = 30) -> Dict[str, Any]:
        """获取加密货币相关新闻"""
        # 加密货币相关查询
        crypto_queries = [
            crypto_symbol,
            f"{crypto_symbol} price",
            f"{crypto_symbol} crypto",
            f"{crypto_symbol} cryptocurrency"
        ]
        
        all_articles = []
        
        for query in crypto_queries:
            result = await self.search_financial_news(query, days_back, page_size // len(crypto_queries))
            if result.get("success") and result.get("articles"):
                all_articles.extend(result["articles"])
        
        # 去重和排序
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            url = article.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_articles.append(article)
        
        unique_articles.sort(key=lambda x: x.get("published_at", ""), reverse=True)
        
        return {
            "success": True,
            "crypto_symbol": crypto_symbol,
            "date_range": f"{days_back} days",
            "total_results": len(unique_articles),
            "articles": unique_articles[:page_size],
            "source": "newsapi"
        }

    # ============================================================================
    # 市场情绪分析
    # ============================================================================
    
    async def get_market_sentiment_news(self, days_back: int = 3, 
                                      page_size: int = 50) -> Dict[str, Any]:
        """获取市场情绪相关新闻"""
        sentiment_keywords = [
            "market crash", "market rally", "bull market", "bear market",
            "recession", "economic growth", "inflation", "fed rate",
            "market volatility", "investor sentiment"
        ]
        
        all_articles = []
        
        for keyword in sentiment_keywords[:5]:  # 限制查询数量
            result = await self.search_financial_news(keyword, days_back, 10)
            if result.get("success") and result.get("articles"):
                all_articles.extend(result["articles"])
        
        # 去重和情绪分析
        seen_urls = set()
        analyzed_articles = []
        
        for article in all_articles:
            url = article.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                
                # 简单情绪分析
                sentiment = self._analyze_sentiment(article)
                article["sentiment"] = sentiment
                analyzed_articles.append(article)
        
        # 按情绪分数排序
        analyzed_articles.sort(key=lambda x: abs(x.get("sentiment", {}).get("score", 0)), reverse=True)
        
        return {
            "success": True,
            "analysis_period": f"{days_back} days",
            "total_results": len(analyzed_articles),
            "articles": analyzed_articles[:page_size],
            "sentiment_summary": self._calculate_sentiment_summary(analyzed_articles),
            "source": "newsapi"
        }

    # ============================================================================
    # 工具方法
    # ============================================================================
    
    def _calculate_relevance(self, article: Dict, query: str) -> float:
        """计算新闻与查询的相关性分数"""
        score = 0
        query_lower = query.lower()
        
        title = article.get("title", "").lower()
        description = article.get("description", "").lower()
        
        # 标题匹配权重更高
        if query_lower in title:
            score += 2
        
        # 描述匹配
        if query_lower in description:
            score += 1
        
        # 来源可信度
        source_name = article.get("source", {}).get("name", "").lower()
        trusted_sources = ["bloomberg", "reuters", "cnbc", "wsj", "financial times"]
        if any(trusted in source_name for trusted in trusted_sources):
            score += 0.5
        
        return score
    
    def _analyze_sentiment(self, article: Dict) -> Dict[str, Any]:
        """简单的新闻情绪分析"""
        text = f"{article.get('title', '')} {article.get('description', '')}".lower()
        
        # 正面词汇
        positive_words = [
            "growth", "profit", "gain", "up", "rise", "increase", "bull", 
            "optimistic", "positive", "strong", "rally", "boom"
        ]
        
        # 负面词汇  
        negative_words = [
            "crash", "fall", "decline", "loss", "down", "bear", "recession",
            "pessimistic", "negative", "weak", "drop", "collapse"
        ]
        
        positive_score = sum(1 for word in positive_words if word in text)
        negative_score = sum(1 for word in negative_words if word in text)
        
        # 计算情绪分数 (-1 to 1)
        total_score = positive_score + negative_score
        if total_score > 0:
            sentiment_score = (positive_score - negative_score) / total_score
        else:
            sentiment_score = 0
        
        # 确定情绪类别
        if sentiment_score > 0.2:
            sentiment_label = "positive"
        elif sentiment_score < -0.2:
            sentiment_label = "negative"
        else:
            sentiment_label = "neutral"
        
        return {
            "label": sentiment_label,
            "score": round(sentiment_score, 3),
            "positive_signals": positive_score,
            "negative_signals": negative_score
        }
    
    def _calculate_sentiment_summary(self, articles: List[Dict]) -> Dict[str, Any]:
        """计算新闻整体情绪摘要"""
        if not articles:
            return {"overall": "neutral", "distribution": {}}
        
        sentiments = [article.get("sentiment", {}) for article in articles]
        labels = [s.get("label", "neutral") for s in sentiments]
        scores = [s.get("score", 0) for s in sentiments]
        
        # 情绪分布
        distribution = {
            "positive": labels.count("positive"),
            "negative": labels.count("negative"), 
            "neutral": labels.count("neutral")
        }
        
        # 总体情绪
        avg_score = sum(scores) / len(scores) if scores else 0
        
        if avg_score > 0.1:
            overall = "positive"
        elif avg_score < -0.1:
            overall = "negative"
        else:
            overall = "neutral"
        
        return {
            "overall": overall,
            "average_score": round(avg_score, 3),
            "distribution": distribution,
            "total_articles": len(articles)
        }

# 创建全局News API服务实例
news_api_service = None

def get_news_api_service() -> NewsAPIService:
    """获取News API服务实例"""
    global news_api_service
    if news_api_service is None:
        news_api_service = NewsAPIService()
    return news_api_service

async def close_news_api_service():
    """关闭News API服务"""
    global news_api_service
    if news_api_service:
        await news_api_service.close()
        news_api_service = None

# 测试函数
async def test_news_api_service():
    """测试News API服务"""
    service = get_news_api_service()
    
    print("🧪 测试News API服务...")
    
    # 测试商业头条
    print("\n1. 测试商业头条...")
    headlines_result = await service.get_business_headlines("us", 5)
    print(f"结果: {headlines_result.get('success', False)}")
    if headlines_result.get('success'):
        print(f"头条数量: {len(headlines_result.get('articles', []))}")
    
    # 测试股票新闻
    print("\n2. 测试股票新闻 (AAPL)...")
    stock_news_result = await service.get_stock_news("AAPL", 3, 5)
    print(f"结果: {stock_news_result.get('success', False)}")
    if stock_news_result.get('success'):
        print(f"AAPL新闻数量: {len(stock_news_result.get('articles', []))}")
    
    # 测试加密货币新闻
    print("\n3. 测试加密货币新闻...")
    crypto_news_result = await service.get_crypto_news("bitcoin", 3, 5)
    print(f"结果: {crypto_news_result.get('success', False)}")
    
    # 测试市场情绪
    print("\n4. 测试市场情绪分析...")
    sentiment_result = await service.get_market_sentiment_news(2, 10)
    print(f"结果: {sentiment_result.get('success', False)}")
    if sentiment_result.get('success'):
        summary = sentiment_result.get('sentiment_summary', {})
        print(f"整体情绪: {summary.get('overall', 'unknown')}")
    
    await service.close()
    print("\n✅ News API测试完成")

if __name__ == "__main__":
    asyncio.run(test_news_api_service())