"""
市场数据模型
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

class KlineData(BaseModel):
    """K线数据模型"""
    timestamp: datetime = Field(..., description="时间戳")
    open: float = Field(..., description="开盘价")
    high: float = Field(..., description="最高价") 
    low: float = Field(..., description="最低价")
    close: float = Field(..., description="收盘价")
    volume: int = Field(..., description="成交量")
    amount: Optional[float] = Field(None, description="成交额")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class QuoteData(BaseModel):
    """实时行情数据模型"""
    symbol: str = Field(..., description="股票代码")
    name: str = Field(..., description="股票名称")
    price: float = Field(..., description="当前价格")
    change: float = Field(..., description="涨跌额")
    change_percent: float = Field(..., description="涨跌幅(%)")
    volume: int = Field(..., description="成交量")
    amount: float = Field(..., description="成交额")
    high: float = Field(..., description="最高价")
    low: float = Field(..., description="最低价")
    open: float = Field(..., description="开盘价")
    pre_close: float = Field(..., description="昨收价")
    timestamp: datetime = Field(..., description="更新时间")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class StockInfo(BaseModel):
    """股票信息模型"""
    symbol: str = Field(..., description="股票代码")
    name: str = Field(..., description="股票名称")
    market: str = Field(..., description="市场 (SH/SZ)")
    industry: Optional[str] = Field(None, description="所属行业")
    sector: Optional[str] = Field(None, description="所属板块")
    list_date: Optional[datetime] = Field(None, description="上市日期")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.strftime("%Y-%m-%d") if v else None
        }

class MarketOverview(BaseModel):
    """市场概况模型"""
    date: datetime = Field(..., description="日期")
    shanghai_composite: QuoteData = Field(..., description="上证指数")
    shenzhen_composite: QuoteData = Field(..., description="深证成指")
    chinext: QuoteData = Field(..., description="创业板指")
    total_volume: int = Field(..., description="总成交量")
    total_amount: float = Field(..., description="总成交额")
    advancing_stocks: int = Field(..., description="上涨家数")
    declining_stocks: int = Field(..., description="下跌家数")
    unchanged_stocks: int = Field(..., description="平盘家数")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class KlineRequest(BaseModel):
    """K线数据请求模型"""
    symbol: str = Field(..., description="股票代码")
    period: str = Field("1D", description="时间周期")
    limit: int = Field(500, description="数据条数")
    start_date: Optional[str] = Field(None, description="开始日期")
    end_date: Optional[str] = Field(None, description="结束日期")

class QuoteRequest(BaseModel):
    """行情数据请求模型"""
    symbols: List[str] = Field(..., description="股票代码列表")

class SearchRequest(BaseModel):
    """股票搜索请求模型"""
    keyword: str = Field(..., description="搜索关键词")
    limit: int = Field(20, description="返回数量")
    
class IndexData(BaseModel):
    """指数数据模型"""
    code: str = Field(..., description="指数代码")
    name: str = Field(..., description="指数名称")
    value: float = Field(..., description="指数值")
    change: float = Field(..., description="涨跌点数")
    change_percent: float = Field(..., description="涨跌幅(%)")
    volume: int = Field(..., description="成交量")
    amount: float = Field(..., description="成交额")
    timestamp: datetime = Field(..., description="更新时间")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }