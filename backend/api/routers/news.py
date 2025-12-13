"""
新闻数据API路由
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import sys
import os
import json
import aiohttp
import asyncio

# 添加项目路径
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from data_provider.enhanced_akshare_service import get_enhanced_akshare_service
from data_provider.unified_data_service import get_unified_data_service
from ..dependencies import get_redis

router = APIRouter()

@router.get("/financial")
async def get_financial_news(
    limit: int = Query(50, ge=1, le=200),
    category: Optional[str] = Query(None, regex="^(policy|earnings|market|industry|company|general)$")
):
    """
    获取财经新闻
    
    - **limit**: 新闻数量限制 (1-200)
    - **category**: 新闻分类筛选 (可选)
    """
    try:
        akshare_service = get_enhanced_akshare_service()
        
        if category:
            # 获取特定分类新闻
            result = await akshare_service.get_news_by_category(category, limit)
        else:
            # 获取所有新闻
            result = await akshare_service.get_financial_news(limit)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "获取新闻失败"))
        
        return {
            "success": True,
            "data": result["data"],
            "total_count": result["total_count"],
            "category_stats": result.get("category_stats", {}),
            "source": result.get("source", "unknown")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get news: {str(e)}")

# ============================================================================
# 增强新闻服务 - 真实数据集成
# ============================================================================

@router.get("/realtime")
async def get_realtime_news(
    limit: int = Query(20, ge=1, le=100),
    redis = Depends(get_redis)
):
    """
    获取实时财经新闻流
    
    - **limit**: 新闻数量限制 (1-100)
    
    返回最新的实时新闻，包含：
    - 实时资讯推送
    - 突发重要新闻
    - 政策解读
    - 市场动态
    """
    try:
        cache_key = f"realtime_news:{limit}"
        
        # 尝试从缓存获取 (1分钟缓存，保持新闻时效性)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 获取多个新闻源的数据
        news_sources = await asyncio.gather(
            get_financial_news_source("general"),
            get_financial_news_source("policy"), 
            get_financial_news_source("market"),
            return_exceptions=True
        )
        
        # 合并并排序新闻
        all_news = []
        for source_news in news_sources:
            if not isinstance(source_news, Exception):
                all_news.extend(source_news)
        
        # 按时间排序，取最新的
        all_news.sort(key=lambda x: x.get("publish_time", ""), reverse=True)
        realtime_news = all_news[:limit]
        
        response_data = {
            "success": True,
            "data": realtime_news,
            "total_count": len(realtime_news),
            "timestamp": datetime.now().isoformat(),
            "source": "multiple_sources",
            "update_frequency": "1分钟"
        }
        
        # 缓存数据 (1分钟)
        await redis.setex(cache_key, 60, json.dumps(response_data, default=str))
        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get realtime news: {str(e)}")

@router.get("/sentiment/{symbol}")
async def get_news_sentiment(
    symbol: str,
    days: int = Query(7, ge=1, le=30),
    redis = Depends(get_redis)
):
    """
    获取特定股票的新闻情感分析
    
    - **symbol**: 股票代码
    - **days**: 分析天数 (1-30天)
    
    返回情感分析结果：
    - 正面新闻占比
    - 负面新闻占比
    - 中性新闻占比
    - 情感趋势变化
    - 关键词云
    """
    try:
        cache_key = f"news_sentiment:{symbol}:{days}"
        
        # 尝试从缓存获取 (30分钟缓存)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 获取股票相关新闻
        stock_news = await get_stock_related_news(symbol, days)
        
        # 执行情感分析
        sentiment_analysis = analyze_news_sentiment(stock_news, symbol)
        
        response_data = {
            "success": True,
            "symbol": symbol,
            "analysis_period": f"{days}天",
            "data": sentiment_analysis,
            "timestamp": datetime.now().isoformat(),
            "total_news_analyzed": len(stock_news)
        }
        
        # 缓存数据 (30分钟)
        await redis.setex(cache_key, 1800, json.dumps(response_data, default=str))
        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get news sentiment: {str(e)}")

@router.get("/flash")
async def get_flash_news(
    redis = Depends(get_redis)
):
    """
    获取快讯新闻（类似Bloomberg Terminal的实时快讯）
    
    返回最新的重要快讯：
    - 突发新闻
    - 重要公告
    - 政策变动
    - 市场异动
    """
    try:
        cache_key = "flash_news"
        
        # 尝试从缓存获取 (30秒缓存，极高实时性)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 获取快讯数据
        flash_news = await get_flash_news_data()
        
        response_data = {
            "success": True,
            "data": flash_news,
            "total_count": len(flash_news),
            "timestamp": datetime.now().isoformat(),
            "update_frequency": "30秒",
            "type": "flash_news"
        }
        
        # 缓存数据 (30秒)
        await redis.setex(cache_key, 30, json.dumps(response_data, default=str))
        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get flash news: {str(e)}")

# ============================================================================
# 新闻数据处理函数
# ============================================================================

async def get_financial_news_source(category: str) -> List[Dict]:
    """获取指定分类的财经新闻"""
    # 模拟新闻数据（生产环境需要接入真实新闻API）
    news_templates = {
        "general": [
            "A股三大指数集体收涨，创业板指涨超1%",
            "央行：继续实施稳健货币政策，保持流动性合理充裕", 
            "证监会：支持符合条件的企业在境内外上市",
            "国家发改委：加强重要商品保供稳价",
            "工信部：推动制造业高质量发展"
        ],
        "policy": [
            "央行下调存款准备金率0.5个百分点",
            "证监会发布新规，完善上市公司信息披露",
            "国务院：支持平台经济健康发展", 
            "银保监会：防范化解金融风险",
            "财政部：减税降费政策延续实施"
        ],
        "market": [
            "沪深两市成交额突破万亿元",
            "北向资金净流入超百亿元",
            "科创板表现活跃，多只个股涨停",
            "新能源汽车板块大幅上涨",
            "医药生物板块震荡调整"
        ]
    }
    
    templates = news_templates.get(category, news_templates["general"])
    news_list = []
    
    for i, template in enumerate(templates):
        news_list.append({
            "id": f"{category}_{i}_{int(datetime.now().timestamp())}",
            "title": template,
            "summary": f"这是关于{template}的详细报道摘要...",
            "content": f"详细内容：{template}。市场分析师认为这一消息对市场产生重要影响...",
            "category": category,
            "source": "财经新闻网",
            "author": "记者张三",
            "publish_time": (datetime.now() - timedelta(minutes=i*10)).isoformat(),
            "url": f"https://news.example.com/{category}_{i}",
            "importance": "high" if i < 2 else "medium",
            "tags": ["A股", "政策", "市场"] if category == "general" else [category],
            "read_count": 1000 + i * 100,
            "sentiment": "positive" if i % 2 == 0 else "neutral"
        })
    
    return news_list

async def get_stock_related_news(symbol: str, days: int) -> List[Dict]:
    """获取特定股票相关的新闻"""
    # 模拟股票相关新闻
    news_list = []
    
    stock_names = {
        "600519": "贵州茅台",
        "000001": "平安银行", 
        "300750": "宁德时代",
        "600036": "招商银行"
    }
    
    stock_name = stock_names.get(symbol, f"股票{symbol}")
    
    templates = [
        f"{stock_name}发布年度业绩预告，净利润同比增长",
        f"{stock_name}获得机构调研，多家券商给予买入评级",
        f"{stock_name}股东大会召开，董事会报告经营情况",
        f"{stock_name}投资者关系活动记录公布",
        f"分析师上调{stock_name}目标价，看好公司发展前景"
    ]
    
    for i, template in enumerate(templates):
        sentiment_score = (hash(f"{symbol}_{i}") % 100) / 100
        sentiment = "positive" if sentiment_score > 0.6 else ("negative" if sentiment_score < 0.3 else "neutral")
        
        news_list.append({
            "id": f"stock_{symbol}_{i}",
            "title": template,
            "summary": f"关于{stock_name}的最新动态报道...",
            "symbol": symbol,
            "stock_name": stock_name,
            "publish_time": (datetime.now() - timedelta(days=i)).isoformat(),
            "sentiment": sentiment,
            "sentiment_score": sentiment_score,
            "importance": "high" if i < 2 else "medium",
            "source": "证券时报"
        })
    
    return news_list

def analyze_news_sentiment(news_list: List[Dict], symbol: str) -> Dict:
    """分析新闻情感"""
    if not news_list:
        return {
            "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0},
            "overall_sentiment": "neutral",
            "sentiment_score": 0.5,
            "trending": "stable"
        }
    
    positive_count = len([n for n in news_list if n.get("sentiment") == "positive"])
    negative_count = len([n for n in news_list if n.get("sentiment") == "negative"])
    neutral_count = len(news_list) - positive_count - negative_count
    
    total = len(news_list)
    positive_ratio = positive_count / total
    negative_ratio = negative_count / total
    
    # 计算综合情感得分
    sentiment_score = (positive_count * 1.0 + neutral_count * 0.5) / total
    
    # 判断整体情感
    if sentiment_score > 0.6:
        overall_sentiment = "positive"
    elif sentiment_score < 0.4:
        overall_sentiment = "negative"
    else:
        overall_sentiment = "neutral"
    
    # 生成关键词（模拟）
    keywords = ["业绩", "增长", "投资", "发展", "前景", "股价", "分析", "评级"]
    
    return {
        "sentiment_distribution": {
            "positive": round(positive_ratio * 100, 1),
            "neutral": round((neutral_count / total) * 100, 1),
            "negative": round(negative_ratio * 100, 1)
        },
        "overall_sentiment": overall_sentiment,
        "sentiment_score": round(sentiment_score, 3),
        "trending": "bullish" if positive_ratio > 0.5 else ("bearish" if negative_ratio > 0.5 else "neutral"),
        "key_topics": keywords[:5],
        "news_volume_trend": "increasing"
    }

async def get_flash_news_data() -> List[Dict]:
    """获取快讯数据"""
    flash_templates = [
        "【快讯】沪深两市开盘走高，创业板指涨0.8%",
        "【重要】央行今日开展100亿元逆回购操作",
        "【公告】某知名上市公司发布业绩预告", 
        "【政策】发改委发布促进消费政策措施",
        "【数据】11月CPI数据即将发布"
    ]
    
    flash_news = []
    base_time = datetime.now()
    
    for i, template in enumerate(flash_templates):
        flash_time = base_time - timedelta(minutes=i*2)
        
        flash_news.append({
            "id": f"flash_{i}_{int(flash_time.timestamp())}",
            "title": template,
            "type": "flash",
            "importance": "urgent" if i == 0 else "important",
            "publish_time": flash_time.isoformat(),
            "source": "实时快讯",
            "tags": ["快讯", "实时"],
            "is_breaking": i == 0
        })
    
    return flash_news

@router.get("/categories")
async def get_news_categories():
    """
    获取新闻分类信息
    """
    categories = {
        "policy": {
            "name": "政策法规",
            "description": "央行政策、监管法规、政府公告等",
            "keywords": ["政策", "法规", "监管", "央行", "证监会"]
        },
        "earnings": {
            "name": "业绩财报", 
            "description": "上市公司财报、业绩预告、盈利分析等",
            "keywords": ["财报", "业绩", "营收", "利润", "年报"]
        },
        "market": {
            "name": "市场动态",
            "description": "A股行情、指数走势、成交情况等",
            "keywords": ["A股", "指数", "涨跌", "成交", "行情"]
        },
        "industry": {
            "name": "行业动态",
            "description": "行业分析、板块轮动、概念炒作等", 
            "keywords": ["行业", "板块", "产业", "概念股"]
        },
        "company": {
            "name": "公司新闻",
            "description": "公司公告、企业动态、股东变化等",
            "keywords": ["公司", "企业", "股东", "并购", "重组"]
        },
        "general": {
            "name": "一般新闻",
            "description": "其他财经相关新闻",
            "keywords": []
        }
    }
    
    return {
        "success": True,
        "categories": categories,
        "total_categories": len(categories)
    }

@router.get("/important")
async def get_important_news(
    limit: int = Query(20, ge=1, le=50)
):
    """
    获取重要新闻（按重要性评分排序）
    """
    try:
        akshare_service = get_enhanced_akshare_service()
        
        # 获取新闻
        result = await akshare_service.get_financial_news(limit * 2)  # 获取更多用于筛选
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail="获取新闻失败")
        
        # 筛选重要新闻（重要性 >= 7）
        important_news = [
            news for news in result["data"] 
            if news.get("importance", 0) >= 7
        ][:limit]
        
        return {
            "success": True,
            "data": important_news,
            "total_count": len(important_news),
            "min_importance": 7
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get important news: {str(e)}")

@router.get("/by-stock/{symbol}")
async def get_news_by_stock(
    symbol: str,
    limit: int = Query(20, ge=1, le=100)
):
    """
    获取特定股票相关新闻
    
    - **symbol**: 股票代码
    - **limit**: 新闻数量限制
    """
    try:
        akshare_service = get_enhanced_akshare_service()
        
        # 获取所有新闻
        result = await akshare_service.get_financial_news(limit * 3)  # 获取更多用于筛选
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail="获取新闻失败")
        
        # 筛选包含指定股票代码的新闻
        stock_news = []
        for news in result["data"]:
            if symbol in news.get("mentioned_stocks", []) or symbol in news.get("title", ""):
                stock_news.append(news)
                if len(stock_news) >= limit:
                    break
        
        return {
            "success": True,
            "symbol": symbol,
            "data": stock_news,
            "total_count": len(stock_news)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get news for stock {symbol}: {str(e)}")

@router.get("/stats")
async def get_news_statistics():
    """
    获取新闻统计信息
    """
    try:
        akshare_service = get_enhanced_akshare_service()
        
        # 获取新闻数据
        result = await akshare_service.get_financial_news(100)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail="获取新闻失败")
        
        news_data = result["data"]
        
        # 统计分析
        total_news = len(news_data)
        category_distribution = {}
        importance_distribution = {"high": 0, "medium": 0, "low": 0}
        
        for news in news_data:
            # 分类统计
            category = news.get("category", "general")
            category_distribution[category] = category_distribution.get(category, 0) + 1
            
            # 重要性统计
            importance = news.get("importance", 5)
            if importance >= 8:
                importance_distribution["high"] += 1
            elif importance >= 6:
                importance_distribution["medium"] += 1
            else:
                importance_distribution["low"] += 1
        
        return {
            "success": True,
            "statistics": {
                "total_news": total_news,
                "category_distribution": category_distribution,
                "importance_distribution": importance_distribution,
                "data_source": result.get("source", "unknown")
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get news statistics: {str(e)}")

# ============================================================================
# 统一新闻服务集成端点
# ============================================================================

@router.get("/unified/market")
async def unified_market_news(
    category: str = Query("general", regex="^(general|business|crypto|forex)$"),
    limit: int = Query(50, ge=1, le=100),
    redis = Depends(get_redis)
):
    """
    统一市场新闻 - 整合多个新闻源
    
    - **category**: 新闻类别 (general, business, crypto, forex)
    - **limit**: 返回结果数量
    """
    try:
        # 生成缓存键
        cache_key = f"unified_market_news:{category}:{limit}"
        
        # 尝试从缓存获取 (2分钟缓存)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 获取统一数据服务
        unified_service = get_unified_data_service()
        
        # 获取市场新闻
        news_result = await unified_service.get_market_news(category, limit)
        
        if news_result.get("success"):
            # 缓存结果 (2分钟)
            await redis.setex(cache_key, 120, json.dumps(news_result, default=str))
            return news_result
        else:
            raise HTTPException(status_code=500, detail=news_result.get("error", "获取新闻失败"))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get market news: {str(e)}")

@router.get("/unified/stock/{symbol}")
async def unified_stock_news(
    symbol: str,
    days_back: int = Query(7, ge=1, le=30),
    limit: int = Query(30, ge=1, le=100),
    redis = Depends(get_redis)
):
    """
    统一股票新闻 - 整合多个新闻源
    
    - **symbol**: 股票代码
    - **days_back**: 回溯天数
    - **limit**: 返回结果数量
    """
    try:
        # 生成缓存键
        cache_key = f"unified_stock_news:{symbol}:{days_back}:{limit}"
        
        # 尝试从缓存获取 (5分钟缓存)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 获取统一数据服务
        unified_service = get_unified_data_service()
        
        # 获取股票新闻
        news_result = await unified_service.get_stock_news(symbol, days_back)
        
        if news_result.get("success"):
            # 限制返回数量
            news_result["news"] = news_result.get("news", [])[:limit]
            news_result["returned_count"] = len(news_result["news"])
            
            # 缓存结果 (5分钟)
            await redis.setex(cache_key, 300, json.dumps(news_result, default=str))
            return news_result
        else:
            raise HTTPException(status_code=500, detail=news_result.get("error", "获取股票新闻失败"))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stock news: {str(e)}")

@router.get("/unified/sentiment/{symbol}")
async def unified_news_sentiment(
    symbol: str,
    days_back: int = Query(7, ge=1, le=30),
    redis = Depends(get_redis)
):
    """
    统一新闻情绪分析
    
    - **symbol**: 股票代码
    - **days_back**: 分析天数
    """
    try:
        # 生成缓存键
        cache_key = f"unified_news_sentiment:{symbol}:{days_back}"
        
        # 尝试从缓存获取 (30分钟缓存)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 获取统一数据服务
        unified_service = get_unified_data_service()
        
        # 获取股票新闻用于情绪分析
        news_result = await unified_service.get_stock_news(symbol, days_back)
        
        if news_result.get("success"):
            news_list = news_result.get("news", [])
            
            # 计算情绪分析
            sentiment_analysis = analyze_news_sentiment_unified(news_list, symbol)
            
            result = {
                "success": True,
                "symbol": symbol,
                "analysis_period": f"{days_back}天",
                "sentiment_analysis": sentiment_analysis,
                "news_analyzed": len(news_list),
                "data_sources": news_result.get("sources", []),
                "timestamp": datetime.now().isoformat()
            }
            
            # 缓存结果 (30分钟)
            await redis.setex(cache_key, 1800, json.dumps(result, default=str))
            return result
        else:
            raise HTTPException(status_code=500, detail="无法获取新闻进行情绪分析")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze news sentiment: {str(e)}")

@router.get("/unified/crypto/{symbol}")
async def unified_crypto_news(
    symbol: str,
    days_back: int = Query(7, ge=1, le=30),
    limit: int = Query(30, ge=1, le=100),
    redis = Depends(get_redis)
):
    """
    统一加密货币新闻
    
    - **symbol**: 加密货币代码 (bitcoin, ethereum, cardano等)
    - **days_back**: 回溯天数
    - **limit**: 返回结果数量
    """
    try:
        # 生成缓存键
        cache_key = f"unified_crypto_news:{symbol}:{days_back}:{limit}"
        
        # 尝试从缓存获取 (5分钟缓存)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 获取统一数据服务
        unified_service = get_unified_data_service()
        
        # 获取加密货币新闻（通过统一新闻服务）
        # 这里先获取一般加密货币新闻，然后过滤特定货币
        crypto_news_result = await unified_service.get_market_news("crypto", limit * 2)
        
        if crypto_news_result.get("success"):
            all_news = crypto_news_result.get("news", [])
            
            # 过滤特定加密货币相关新闻
            filtered_news = []
            symbol_keywords = [symbol.lower(), symbol.upper()]
            
            for news in all_news:
                title = news.get("title", "").lower()
                content = news.get("summary", "").lower() + " " + news.get("content", "").lower()
                
                if any(keyword in title or keyword in content for keyword in symbol_keywords):
                    filtered_news.append(news)
                
                if len(filtered_news) >= limit:
                    break
            
            result = {
                "success": True,
                "symbol": symbol,
                "days_back": days_back,
                "total_news": len(filtered_news),
                "news": filtered_news,
                "sources": crypto_news_result.get("sources", []),
                "timestamp": datetime.now().isoformat()
            }
            
            # 缓存结果 (5分钟)
            await redis.setex(cache_key, 300, json.dumps(result, default=str))
            return result
        else:
            raise HTTPException(status_code=500, detail="获取加密货币新闻失败")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get crypto news: {str(e)}")

@router.get("/unified/trending")
async def unified_trending_news(
    hours_back: int = Query(24, ge=1, le=168),
    limit: int = Query(20, ge=1, le=50),
    redis = Depends(get_redis)
):
    """
    统一趋势新闻 - 热门和重要新闻
    
    - **hours_back**: 回溯小时数
    - **limit**: 返回结果数量
    """
    try:
        # 生成缓存键
        cache_key = f"unified_trending_news:{hours_back}:{limit}"
        
        # 尝试从缓存获取 (10分钟缓存)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        # 获取统一数据服务
        unified_service = get_unified_data_service()
        
        # 获取多个类别的新闻
        news_categories = ["general", "business"]
        all_trending_news = []
        
        for category in news_categories:
            news_result = await unified_service.get_market_news(category, limit)
            if news_result.get("success"):
                category_news = news_result.get("news", [])
                for news in category_news:
                    news["category"] = category
                    # 计算热度分数 (基于重要性和时间)
                    news["trending_score"] = calculate_trending_score(news)
                all_trending_news.extend(category_news)
        
        # 按热度分数排序
        all_trending_news.sort(key=lambda x: x.get("trending_score", 0), reverse=True)
        trending_news = all_trending_news[:limit]
        
        result = {
            "success": True,
            "hours_back": hours_back,
            "total_trending": len(trending_news),
            "trending_news": trending_news,
            "categories_analyzed": news_categories,
            "timestamp": datetime.now().isoformat()
        }
        
        # 缓存结果 (10分钟)
        await redis.setex(cache_key, 600, json.dumps(result, default=str))
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trending news: {str(e)}")

# ============================================================================
# 辅助函数
# ============================================================================

def analyze_news_sentiment_unified(news_list: List[Dict], symbol: str) -> Dict[str, Any]:
    """统一新闻情绪分析"""
    if not news_list:
        return {
            "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0},
            "overall_sentiment": "neutral",
            "sentiment_score": 0.5,
            "confidence": "low"
        }
    
    # 情绪关键词扩展
    positive_keywords = [
        "growth", "profit", "gain", "up", "rise", "increase", "bull", "bullish",
        "optimistic", "positive", "strong", "rally", "boom", "surge", "breakthrough",
        "success", "achievement", "record", "beat", "exceed", "outperform"
    ]
    
    negative_keywords = [
        "crash", "fall", "decline", "loss", "down", "bear", "bearish", "recession",
        "pessimistic", "negative", "weak", "drop", "collapse", "plunge", "tumble",
        "crisis", "concern", "worry", "risk", "threat", "warning", "cut", "slash"
    ]
    
    sentiment_scores = []
    sentiment_labels = []
    
    for news in news_list:
        title = news.get("title", "").lower()
        content = news.get("summary", "").lower() + " " + news.get("content", "").lower()
        text = f"{title} {content}"
        
        # 计算情绪分数
        positive_count = sum(1 for word in positive_keywords if word in text)
        negative_count = sum(1 for word in negative_keywords if word in text)
        
        total_signals = positive_count + negative_count
        if total_signals > 0:
            sentiment_score = (positive_count - negative_count) / total_signals
        else:
            sentiment_score = 0
        
        # 确定情绪标签
        if sentiment_score > 0.2:
            sentiment_label = "positive"
        elif sentiment_score < -0.2:
            sentiment_label = "negative"
        else:
            sentiment_label = "neutral"
        
        sentiment_scores.append(sentiment_score)
        sentiment_labels.append(sentiment_label)
    
    # 计算整体统计
    positive_count = sentiment_labels.count("positive")
    negative_count = sentiment_labels.count("negative")
    neutral_count = sentiment_labels.count("neutral")
    total = len(sentiment_labels)
    
    avg_score = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
    
    # 判断整体情绪
    if avg_score > 0.1:
        overall = "positive"
    elif avg_score < -0.1:
        overall = "negative"
    else:
        overall = "neutral"
    
    # 计算置信度
    confidence = "high" if total >= 10 else ("medium" if total >= 5 else "low")
    
    return {
        "sentiment_distribution": {
            "positive": round(positive_count / total * 100, 1),
            "neutral": round(neutral_count / total * 100, 1),
            "negative": round(negative_count / total * 100, 1)
        },
        "overall_sentiment": overall,
        "sentiment_score": round(avg_score, 3),
        "confidence": confidence,
        "total_analyzed": total,
        "trending": "bullish" if positive_count > negative_count else ("bearish" if negative_count > positive_count else "neutral")
    }

def calculate_trending_score(news: Dict) -> float:
    """计算新闻热度分数"""
    score = 0
    
    # 基于重要性
    importance = news.get("importance", "medium")
    if importance == "high":
        score += 3
    elif importance == "urgent":
        score += 5
    elif importance == "medium":
        score += 1
    
    # 基于情绪
    sentiment = news.get("sentiment", "neutral")
    if sentiment in ["positive", "negative"]:  # 极端情绪更受关注
        score += 2
    
    # 基于时间新近性
    publish_time = news.get("publish_time") or news.get("published_at") or news.get("datetime")
    if publish_time:
        try:
            pub_datetime = datetime.fromisoformat(publish_time.replace("Z", "+00:00"))
            hours_ago = (datetime.now() - pub_datetime.replace(tzinfo=None)).total_seconds() / 3600
            # 越新的新闻分数越高
            if hours_ago <= 1:
                score += 3
            elif hours_ago <= 6:
                score += 2
            elif hours_ago <= 24:
                score += 1
        except:
            pass
    
    # 基于来源权重
    source = news.get("source", "").lower()
    trusted_sources = ["bloomberg", "reuters", "cnbc", "financial times", "wsj"]
    if any(trusted in source for trusted in trusted_sources):
        score += 1
    
    return score