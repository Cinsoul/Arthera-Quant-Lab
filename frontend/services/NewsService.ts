/**
 * 新闻数据服务
 * 集成后端新闻API，提供前端新闻数据获取和管理
 */

import { getDataStreamManager } from './DataStreamManager';
import { getEnvFlag } from '../utils/env';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  source: string;
  timestamp: Date;
  category: 'market' | 'policy' | 'earnings' | 'industry' | 'company' | 'general';
  sentiment: 'positive' | 'negative' | 'neutral';
  relatedStocks?: string[];
  mentionedStocks?: string[];
  keywords?: string[];
  importance: number; // 1-10
  url?: string;
}

export interface NewsSearchOptions {
  category?: string;
  searchTerm?: string;
  stockSymbol?: string;
  importance?: 'high' | 'medium' | 'low';
  limit?: number;
  offset?: number;
}

export interface NewsCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
}

export interface NewsStatistics {
  totalNews: number;
  categoryDistribution: Record<string, number>;
  importanceDistribution: Record<string, number>;
  dataSource: string;
}

class NewsService {
  private baseURL: string;
  private dataManager: DataStreamManager;
  private newsCache: Map<string, NewsItem[]> = new Map();
  private lastUpdate: Date | null = null;
  private readonly apiEnabled = getEnvFlag('VITE_ENABLE_NEWS_API', 'REACT_APP_ENABLE_NEWS_API', false);

  constructor() {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8004';
    this.baseURL = `${API_BASE_URL}/api/v1/news`;
    this.dataManager = getDataStreamManager();
    
    // Pre-populate cache with mock data on initialization
    this.initializeMockData();
  }

  private async initializeMockData(): Promise<void> {
    try {
      const mockResult = await this.getMockNews({ limit: 100 });
      this.newsCache.set('financial_news_', mockResult.data);
      this.lastUpdate = new Date();
      console.log('[NewsService] Initialized with mock data');
    } catch (error) {
      console.warn('[NewsService] Failed to initialize mock data:', error);
    }
  }

  /**
   * 获取财经新闻列表
   */
  async getFinancialNews(options: NewsSearchOptions = {}): Promise<{
    success: boolean;
    data: NewsItem[];
    totalCount: number;
    categoryStats?: Record<string, number>;
  }> {
    if (!this.apiEnabled) {
      return this.getMockNews(options);
    }
    try {
      const params = new URLSearchParams();
      
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.category) params.append('category', options.category);

      const cacheKey = `financial_news_${params.toString()}`;
      
      // 检查缓存
      if (this.newsCache.has(cacheKey) && this.lastUpdate && 
          Date.now() - this.lastUpdate.getTime() < 30000) { // 30秒缓存
        return {
          success: true,
          data: this.newsCache.get(cacheKey)!,
          totalCount: this.newsCache.get(cacheKey)!.length
        };
      }

      const response = await fetch(`${this.baseURL}/financial?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // 转换数据格式
        const newsItems = result.data.map((item: any) => this.transformNewsItem(item));
        
        // 更新缓存
        this.newsCache.set(cacheKey, newsItems);
        this.lastUpdate = new Date();
        
        return {
          success: true,
          data: newsItems,
          totalCount: result.total_count || newsItems.length,
          categoryStats: result.category_stats
        };
      } else {
        throw new Error(result.error || '获取新闻失败');
      }
    } catch (error) {
      console.error('获取财经新闻失败:', error);
      
      // 返回模拟数据作为降级方案
      return this.getMockNews(options);
    }
  }

  /**
   * 获取重要新闻
   */
  async getImportantNews(limit: number = 20): Promise<{
    success: boolean;
    data: NewsItem[];
  }> {
    if (!this.apiEnabled) {
      const mockResult = await this.getMockNews({ importance: 'high', limit });
      return {
        success: true,
        data: mockResult.data.filter(item => this.getImportanceLevel(item.importance) === 'high')
      };
    }
    try {
      const response = await fetch(`${this.baseURL}/important?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const newsItems = result.data.map((item: any) => this.transformNewsItem(item));
        
        return {
          success: true,
          data: newsItems
        };
      } else {
        throw new Error(result.error || '获取重要新闻失败');
      }
    } catch (error) {
      console.error('获取重要新闻失败:', error);
      
      // 返回模拟数据
      const mockResult = await this.getMockNews({ importance: 'high', limit });
      return {
        success: true,
        data: mockResult.data.filter(item => this.getImportanceLevel(item.importance) === 'high')
      };
    }
  }

  /**
   * 根据股票代码获取相关新闻
   */
  async getNewsByStock(symbol: string, limit: number = 20): Promise<{
    success: boolean;
    data: NewsItem[];
    symbol: string;
  }> {
    if (!this.apiEnabled) {
      const mockResult = await this.getMockNews({ stockSymbol: symbol, limit });
      return {
        success: true,
        data: mockResult.data.filter(item =>
          item.relatedStocks?.includes(symbol) ||
          item.mentionedStocks?.includes(symbol)
        ),
        symbol
      };
    }
    try {
      const response = await fetch(`${this.baseURL}/by-stock/${symbol}?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const newsItems = result.data.map((item: any) => this.transformNewsItem(item));
        
        return {
          success: true,
          data: newsItems,
          symbol: result.symbol
        };
      } else {
        throw new Error(result.error || '获取股票新闻失败');
      }
    } catch (error) {
      console.error('获取股票新闻失败:', error);
      
      // 返回模拟数据
      const mockResult = await this.getMockNews({ stockSymbol: symbol, limit });
      return {
        success: true,
        data: mockResult.data.filter(item => 
          item.relatedStocks?.includes(symbol) || 
          item.mentionedStocks?.includes(symbol)
        ),
        symbol
      };
    }
  }

  /**
   * 获取新闻分类信息
   */
  async getNewsCategories(): Promise<{
    success: boolean;
    categories: Record<string, NewsCategory>;
  }> {
    if (!this.apiEnabled) {
      return {
        success: true,
        categories: {
          market: { id: 'market', name: '市场动态', description: '股市行情和指数变化', keywords: ['A股', '指数', '涨跌'] },
          policy: { id: 'policy', name: '政策法规', description: '央行政策和监管措施', keywords: ['政策', '央行', '监管'] },
          earnings: { id: 'earnings', name: '业绩财报', description: '上市公司财务报告', keywords: ['财报', '业绩', '营收'] },
          industry: { id: 'industry', name: '行业动态', description: '各行业发展动态', keywords: ['行业', '板块', '产业'] },
          company: { id: 'company', name: '公司新闻', description: '企业公告和动态', keywords: ['公司', '企业', '公告'] },
          general: { id: 'general', name: '综合新闻', description: '其他财经新闻', keywords: [] }
        }
      };
    }
    try {
      const response = await fetch(`${this.baseURL}/categories`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          categories: result.categories
        };
      } else {
        throw new Error(result.error || '获取新闻分类失败');
      }
    } catch (error) {
      console.error('获取新闻分类失败:', error);
      
      // 返回默认分类
      return {
        success: true,
        categories: {
          market: { id: 'market', name: '市场动态', description: '股市行情和指数变化', keywords: ['A股', '指数', '涨跌'] },
          policy: { id: 'policy', name: '政策法规', description: '央行政策和监管措施', keywords: ['政策', '央行', '监管'] },
          earnings: { id: 'earnings', name: '业绩财报', description: '上市公司财务报告', keywords: ['财报', '业绩', '营收'] },
          industry: { id: 'industry', name: '行业动态', description: '各行业发展动态', keywords: ['行业', '板块', '产业'] },
          company: { id: 'company', name: '公司新闻', description: '企业公告和动态', keywords: ['公司', '企业', '公告'] },
          general: { id: 'general', name: '综合新闻', description: '其他财经新闻', keywords: [] }
        }
      };
    }
  }

  /**
   * 获取新闻统计信息
   */
  async getNewsStatistics(): Promise<{
    success: boolean;
    statistics: NewsStatistics;
  }> {
    if (!this.apiEnabled) {
      return {
        success: true,
        statistics: {
          totalNews: 100,
          categoryDistribution: {
            market: 25,
            policy: 15,
            earnings: 20,
            industry: 20,
            company: 15,
            general: 5
          },
          importanceDistribution: {
            high: 20,
            medium: 50,
            low: 30
          },
          dataSource: 'mock_data'
        }
      };
    }
    try {
      const response = await fetch(`${this.baseURL}/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          statistics: result.statistics
        };
      } else {
        throw new Error(result.error || '获取新闻统计失败');
      }
    } catch (error) {
      console.error('获取新闻统计失败:', error);
      
      // 返回模拟统计
      return {
        success: true,
        statistics: {
          totalNews: 100,
          categoryDistribution: {
            market: 25,
            policy: 15,
            earnings: 20,
            industry: 20,
            company: 15,
            general: 5
          },
          importanceDistribution: {
            high: 20,
            medium: 50,
            low: 30
          },
          dataSource: 'mock_data'
        }
      };
    }
  }

  /**
   * 搜索新闻
   */
  async searchNews(options: NewsSearchOptions): Promise<{
    success: boolean;
    data: NewsItem[];
    totalCount: number;
  }> {
    // 获取所有新闻然后进行客户端筛选
    const allNews = await this.getFinancialNews({ limit: 200 });
    
    if (!allNews.success) {
      return { success: false, data: [], totalCount: 0 };
    }

    let filteredNews = allNews.data;

    // 按分类筛选
    if (options.category && options.category !== 'all') {
      filteredNews = filteredNews.filter(item => item.category === options.category);
    }

    // 按搜索词筛选
    if (options.searchTerm) {
      const term = options.searchTerm.toLowerCase();
      filteredNews = filteredNews.filter(item => 
        item.title.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        (item.keywords && item.keywords.some(k => k.toLowerCase().includes(term)))
      );
    }

    // 按股票代码筛选
    if (options.stockSymbol) {
      const symbol = options.stockSymbol.toUpperCase();
      filteredNews = filteredNews.filter(item =>
        item.relatedStocks?.includes(symbol) ||
        item.mentionedStocks?.includes(symbol) ||
        item.title.includes(symbol)
      );
    }

    // 按重要性筛选
    if (options.importance) {
      filteredNews = filteredNews.filter(item => 
        this.getImportanceLevel(item.importance) === options.importance
      );
    }

    // 分页处理
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    const paginatedNews = filteredNews.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedNews,
      totalCount: filteredNews.length
    };
  }

  /**
   * 转换后端数据格式为前端格式
   */
  private transformNewsItem(backendItem: any): NewsItem {
    return {
      id: backendItem.id || `news_${Date.now()}_${Math.random()}`,
      title: backendItem.title || '',
      summary: backendItem.content || backendItem.summary || '',
      content: backendItem.content,
      source: backendItem.source || '未知来源',
      timestamp: new Date(backendItem.publish_time || backendItem.timestamp || Date.now()),
      category: this.mapCategory(backendItem.category),
      sentiment: this.mapSentiment(backendItem.sentiment),
      relatedStocks: backendItem.related_stocks || [],
      mentionedStocks: backendItem.mentioned_stocks || [],
      keywords: backendItem.keywords || [],
      importance: backendItem.importance || 5,
      url: backendItem.url
    };
  }

  /**
   * 映射分类
   */
  private mapCategory(category: string): NewsItem['category'] {
    const categoryMap: Record<string, NewsItem['category']> = {
      '政策法规': 'policy',
      '业绩财报': 'earnings', 
      '市场动态': 'market',
      '行业动态': 'industry',
      '公司新闻': 'company'
    };
    
    return categoryMap[category] || 'general';
  }

  /**
   * 映射情感倾向
   */
  private mapSentiment(sentiment: any): NewsItem['sentiment'] {
    if (sentiment > 0.1) return 'positive';
    if (sentiment < -0.1) return 'negative';
    return 'neutral';
  }

  /**
   * 获取重要性级别
   */
  private getImportanceLevel(importance: number): 'high' | 'medium' | 'low' {
    if (importance >= 8) return 'high';
    if (importance >= 6) return 'medium';
    return 'low';
  }

  /**
   * 获取统一市场新闻 - 使用统一API
   */
  async getUnifiedMarketNews(
    category: string = 'general', 
    limit: number = 50
  ): Promise<{
    success: boolean;
    data: NewsItem[];
    totalCount: number;
  }> {
    if (!this.apiEnabled) {
      return this.getMockNews({ category, limit });
    }
    try {
      const response = await fetch(
        `${this.baseURL}/unified/market?category=${category}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const newsItems = result.news?.map((item: any) => this.transformUnifiedNewsItem(item)) || [];
        
        return {
          success: true,
          data: newsItems,
          totalCount: result.total_news || newsItems.length
        };
      } else {
        throw new Error(result.error || '获取市场新闻失败');
      }
    } catch (error) {
      console.error('获取统一市场新闻失败:', error);
      return this.getMockNews({ category, limit });
    }
  }

  /**
   * 获取统一股票新闻
   */
  async getUnifiedStockNews(
    symbol: string, 
    daysBack: number = 7, 
    limit: number = 30
  ): Promise<{
    success: boolean;
    data: NewsItem[];
    symbol: string;
  }> {
    if (!this.apiEnabled) {
      return {
        success: true,
        data: [],
        symbol
      };
    }
    try {
      const response = await fetch(
        `${this.baseURL}/unified/stock/${symbol}?days_back=${daysBack}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const newsItems = result.news?.map((item: any) => this.transformUnifiedNewsItem(item)) || [];
        
        return {
          success: true,
          data: newsItems,
          symbol: result.symbol || symbol
        };
      } else {
        throw new Error(result.error || '获取股票新闻失败');
      }
    } catch (error) {
      console.error('获取统一股票新闻失败:', error);
      return {
        success: true,
        data: [],
        symbol
      };
    }
  }

  /**
   * 获取统一新闻情绪分析
   */
  async getUnifiedNewsSentiment(
    symbol: string, 
    daysBack: number = 7
  ): Promise<{
    success: boolean;
    sentiment: {
      sentiment_distribution: Record<string, number>;
      overall_sentiment: string;
      sentiment_score: number;
      confidence: string;
      total_analyzed: number;
    };
    symbol: string;
  }> {
    if (!this.apiEnabled) {
      return {
        success: false,
        sentiment: {
          sentiment_distribution: { positive: 33, neutral: 34, negative: 33 },
          overall_sentiment: 'neutral',
          sentiment_score: 0.5,
          confidence: 'low',
          total_analyzed: 0
        },
        symbol
      };
    }
    try {
      const response = await fetch(
        `${this.baseURL}/unified/sentiment/${symbol}?days_back=${daysBack}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          sentiment: result.sentiment_analysis,
          symbol: result.symbol
        };
      } else {
        throw new Error(result.error || '获取情绪分析失败');
      }
    } catch (error) {
      console.error('获取统一新闻情绪分析失败:', error);
      return {
        success: false,
        sentiment: {
          sentiment_distribution: { positive: 33, neutral: 34, negative: 33 },
          overall_sentiment: 'neutral',
          sentiment_score: 0.5,
          confidence: 'low',
          total_analyzed: 0
        },
        symbol
      };
    }
  }

  /**
   * 获取统一加密货币新闻
   */
  async getUnifiedCryptoNews(
    symbol: string, 
    daysBack: number = 7, 
    limit: number = 30
  ): Promise<{
    success: boolean;
    data: NewsItem[];
    symbol: string;
  }> {
    if (!this.apiEnabled) {
      return {
        success: true,
        data: [],
        symbol
      };
    }
    try {
      const response = await fetch(
        `${this.baseURL}/unified/crypto/${symbol}?days_back=${daysBack}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const newsItems = result.news?.map((item: any) => this.transformUnifiedNewsItem(item)) || [];
        
        return {
          success: true,
          data: newsItems,
          symbol: result.symbol || symbol
        };
      } else {
        throw new Error(result.error || '获取加密货币新闻失败');
      }
    } catch (error) {
      console.error('获取统一加密货币新闻失败:', error);
      return {
        success: true,
        data: [],
        symbol
      };
    }
  }

  /**
   * 获取统一热门新闻
   */
  async getUnifiedTrendingNews(
    hoursBack: number = 24, 
    limit: number = 20
  ): Promise<{
    success: boolean;
    data: NewsItem[];
    totalCount: number;
  }> {
    if (!this.apiEnabled) {
      return this.getMockNews({ importance: 'high', limit });
    }
    try {
      const response = await fetch(
        `${this.baseURL}/unified/trending?hours_back=${hoursBack}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const newsItems = result.trending_news?.map((item: any) => this.transformUnifiedNewsItem(item)) || [];
        
        return {
          success: true,
          data: newsItems,
          totalCount: result.total_trending || newsItems.length
        };
      } else {
        throw new Error(result.error || '获取热门新闻失败');
      }
    } catch (error) {
      console.error('获取统一热门新闻失败:', error);
      return this.getMockNews({ importance: 'high', limit });
    }
  }

  /**
   * 转换统一API数据格式
   */
  private transformUnifiedNewsItem(unifiedItem: any): NewsItem {
    return {
      id: unifiedItem.id || unifiedItem.url || `news_${Date.now()}_${Math.random()}`,
      title: unifiedItem.title || unifiedItem.headline || '',
      summary: unifiedItem.summary || unifiedItem.description || unifiedItem.content?.substring(0, 200) || '',
      content: unifiedItem.content,
      source: unifiedItem.source || unifiedItem.provider || '未知来源',
      timestamp: new Date(unifiedItem.published_at || unifiedItem.datetime || unifiedItem.timestamp || Date.now()),
      category: this.mapUnifiedCategory(unifiedItem.category),
      sentiment: this.mapUnifiedSentiment(unifiedItem.sentiment),
      relatedStocks: unifiedItem.related_stocks || unifiedItem.symbols || [],
      mentionedStocks: unifiedItem.mentioned_stocks || [],
      keywords: unifiedItem.keywords || unifiedItem.tags || [],
      importance: this.mapUnifiedImportance(unifiedItem.importance || unifiedItem.trending_score),
      url: unifiedItem.url || unifiedItem.link
    };
  }

  /**
   * 映射统一API分类
   */
  private mapUnifiedCategory(category: string): NewsItem['category'] {
    const categoryMap: Record<string, NewsItem['category']> = {
      'business': 'market',
      'crypto': 'market',
      'forex': 'market',
      'general': 'general',
      'policy': 'policy',
      'earnings': 'earnings',
      'industry': 'industry',
      'company': 'company'
    };
    
    return categoryMap[category?.toLowerCase()] || 'general';
  }

  /**
   * 映射统一API情感
   */
  private mapUnifiedSentiment(sentiment: any): NewsItem['sentiment'] {
    if (typeof sentiment === 'string') {
      if (sentiment.toLowerCase().includes('positive') || sentiment.toLowerCase().includes('bullish')) {
        return 'positive';
      }
      if (sentiment.toLowerCase().includes('negative') || sentiment.toLowerCase().includes('bearish')) {
        return 'negative';
      }
      return 'neutral';
    }
    
    if (typeof sentiment === 'number') {
      if (sentiment > 0.1) return 'positive';
      if (sentiment < -0.1) return 'negative';
      return 'neutral';
    }
    
    return 'neutral';
  }

  /**
   * 映射统一API重要性
   */
  private mapUnifiedImportance(importance: any): number {
    if (typeof importance === 'number') {
      if (importance > 10) return Math.min(10, Math.round(importance / 10)); // 归一化到1-10
      return Math.max(1, Math.min(10, Math.round(importance)));
    }
    
    if (typeof importance === 'string') {
      const importanceMap: Record<string, number> = {
        'urgent': 10,
        'high': 8,
        'important': 7,
        'medium': 5,
        'low': 3,
        'normal': 5
      };
      return importanceMap[importance.toLowerCase()] || 5;
    }
    
    return 5; // 默认中等重要性
  }

  /**
   * 获取模拟新闻数据
   */
  private async getMockNews(options: NewsSearchOptions = {}): Promise<{
    success: boolean;
    data: NewsItem[];
    totalCount: number;
  }> {
    const mockNews: NewsItem[] = [
      {
        id: 'mock_1',
        title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
        summary: '中国人民银行决定于2024年12月15日下调金融机构存款准备金率0.5个百分点，此次降准将释放长期资金约1万亿元。',
        source: '新华社',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        category: 'policy',
        sentiment: 'positive',
        importance: 9,
        keywords: ['央行', '降准', '货币政策', '流动性'],
        mentionedStocks: ['000001', '600036']
      },
      {
        id: 'mock_2',
        title: '贵州茅台Q4业绩超预期，营收同比增长18%',
        summary: '贵州茅台发布业绩快报，第四季度营收达420亿元，净利润同比增长22%，超出市场预期。',
        source: '财联社',
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        category: 'earnings',
        sentiment: 'positive',
        relatedStocks: ['600519'],
        importance: 8,
        keywords: ['业绩', '财报', '营收增长', '白酒'],
        mentionedStocks: ['600519']
      },
      // ... 更多模拟数据
    ];

    // 应用筛选逻辑
    let filteredNews = mockNews;
    
    if (options.category && options.category !== 'all') {
      filteredNews = filteredNews.filter(item => item.category === options.category);
    }
    
    if (options.importance) {
      filteredNews = filteredNews.filter(item => 
        this.getImportanceLevel(item.importance) === options.importance
      );
    }

    const limit = options.limit || 20;
    const result = filteredNews.slice(0, limit);

    return {
      success: true,
      data: result,
      totalCount: filteredNews.length
    };
  }
}

// 单例实例
export const newsService = new NewsService();
export default newsService;
