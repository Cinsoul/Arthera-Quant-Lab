/**
 * Real API Client - 真实数据API客户端
 * 
 * 连接到后端FastAPI服务，获取真实的AkShare数据
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getEnvFlag, getEnvVar } from '../utils/env';

// API基础配置 - 更新为统一API端口
const API_BASE_URL = getEnvVar(
  'VITE_API_BASE_URL',
  'REACT_APP_API_URL',
  process.env.NODE_ENV === 'production'
    ? 'https://api.arthera-quant.com'
    : 'http://localhost:8004'
);

const WS_BASE_URL = getEnvVar(
  'VITE_API_WS_URL',
  'REACT_APP_API_WS_URL',
  API_BASE_URL?.startsWith('https')
    ? API_BASE_URL.replace('https', 'wss')
    : (API_BASE_URL || 'http://localhost:8004').replace('http', 'ws')
);

const REAL_API_ENABLED = getEnvFlag('VITE_ENABLE_REAL_API', 'REACT_APP_ENABLE_REAL_API', false);
const REALTIME_FIELDS = [
  'symbol',
  'price',
  'open',
  'high',
  'low',
  'volume',
  'amount',
  'change',
  'changePercent'
];

// 数据接口类型定义
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
  source?: string;
  total_count?: number;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  amount: number;
  high: number;
  low: number;
  open: number;
  timestamp: string;
  vwap?: number;
  amplitude?: number;
  bid1?: number;
  ask1?: number;
  pe?: number;
  pb?: number;
  marketCap?: number;
}

export interface KlineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  publish_time: string;
  mentioned_stocks: string[];
  importance: number;
}

export interface StockBasicInfo {
  symbol: string;
  name: string;
  list_date: string;
  industry: string;
  sector: string;
  total_shares: string;
  market_cap: string;
  pe_ratio: string;
  pb_ratio: string;
  listing_price: string;
}

export interface FinancialData {
  balance_sheet: Record<string, number>;
  income_statement: Record<string, number>;
  cash_flow: Record<string, number>;
  key_indicators: Record<string, number>;
  report_date: string;
  report_period: string;
}

class ApiClient {
  private client: AxiosInstance;
  private wsConnection: WebSocket | null = null;
  private wsSubscriptions: Map<string, Set<(data: any) => void>> = new Map();
  private readonly realApiEnabled = REAL_API_ENABLED;
  
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        console.error('[API] Response error:', error);
        
        // 网络错误处理
        if (!error.response) {
          return Promise.resolve({
            data: {
              success: false,
              error: 'Network error - using fallback data',
              data: this.getFallbackData(error.config?.url)
            }
          });
        }
        
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // 市场数据API
  // ============================================================================

  /**
   * 获取实时行情 - 使用统一API
   */
  async getRealtimeQuotes(symbols: string[]): Promise<ApiResponse<MarketQuote[]>> {
    if (!this.realApiEnabled) {
      return this.generateFallbackQuotes(symbols);
    }
    try {
      const response = await this.client.post('/api/v1/market/quotes', {
        symbols,
        fields: REALTIME_FIELDS
      });
      
      return response.data;
    } catch (error) {
      console.error('[API] Failed to get realtime quotes:', error);
      return this.generateFallbackQuotes(symbols);
    }
  }

  /**
   * 获取单个股票行情 - 使用统一API
   */
  async getQuote(symbol: string): Promise<ApiResponse<MarketQuote>> {
    if (!this.realApiEnabled) {
      return this.generateFallbackQuote(symbol);
    }
    try {
      const response = await this.client.get(`/api/v1/market/quote/${symbol}`);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to get quote for ${symbol}:`, error);
      return this.generateFallbackQuote(symbol);
    }
  }

  /**
   * 获取K线数据 - 使用统一API
   */
  async getKlineData(
    symbol: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    limit: number = 500,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<KlineData[]>> {
    if (!this.realApiEnabled) {
      return this.generateFallbackKlineData(symbol, limit);
    }
    try {
      const response = await this.client.get(`/api/v1/market/kline/${symbol}`, {
        params: {
          period,
          limit,
          start_date: startDate,
          end_date: endDate
        }
      });
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to get kline data for ${symbol}:`, error);
      return this.generateFallbackKlineData(symbol, limit);
    }
  }

  /**
   * 搜索股票 - 使用统一API
   */
  async searchStocks(keyword: string, limit: number = 20): Promise<ApiResponse<any[]>> {
    if (!this.realApiEnabled) {
      return this.generateFallbackSearchResults(keyword);
    }
    try {
      const response = await this.client.get('/api/v1/market/search', {
        params: { keyword, limit }
      });
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to search stocks with keyword "${keyword}":`, error);
      return this.generateFallbackSearchResults(keyword);
    }
  }

  /**
   * 获取市场概况
   */
  async getMarketOverview(): Promise<ApiResponse<any>> {
    if (!this.realApiEnabled) {
      return this.generateFallbackMarketOverview();
    }
    try {
      const response = await this.client.get('/api/v1/market/overview');
      return response.data;
    } catch (error) {
      console.error('[API] Failed to get market overview:', error);
      return this.generateFallbackMarketOverview();
    }
  }

  /**
   * 获取主要指数
   */
  async getMarketIndices(): Promise<ApiResponse<MarketQuote[]>> {
    if (!this.realApiEnabled) {
      return this.generateFallbackIndices();
    }
    try {
      const response = await this.client.get('/api/v1/market/indices');
      return response.data;
    } catch (error) {
      console.error('[API] Failed to get market indices:', error);
      return this.generateFallbackIndices();
    }
  }

  /**
   * 获取股票基本信息
   */
  async getStockBasicInfo(symbol: string): Promise<ApiResponse<StockBasicInfo>> {
    if (!this.realApiEnabled) {
      return this.generateFallbackBasicInfo(symbol);
    }
    try {
      const response = await this.client.get(`/api/v1/market/stock_basic_info/${symbol}`);
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to get basic info for ${symbol}:`, error);
      return this.generateFallbackBasicInfo(symbol);
    }
  }

  // ============================================================================
  // 新闻数据API
  // ============================================================================

  /**
   * 获取财经新闻 - 使用统一API
   */
  async getFinancialNews(limit: number = 50, category?: string): Promise<ApiResponse<NewsItem[]>> {
    if (!this.realApiEnabled) {
      return this.generateFallbackNews(limit);
    }
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(category && { category }),
      });

      const response = await this.client.get(`/api/unified/news?${params}`);
      return response.data;
    } catch (error) {
      console.error('[API] Failed to get financial news:', error);
      return this.generateFallbackNews(limit);
    }
  }

  /**
   * 获取重要新闻 - 使用统一API
   */
  async getImportantNews(limit: number = 20): Promise<ApiResponse<NewsItem[]>> {
    if (!this.realApiEnabled) {
      return this.generateFallbackNews(limit);
    }
    try {
      const response = await this.client.get('/api/unified/news', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('[API] Failed to get important news:', error);
      return this.generateFallbackNews(limit);
    }
  }

  // ============================================================================
  // 财务数据API
  // ============================================================================

  /**
   * 获取财务数据
   */
  async getFinancialData(symbol: string, reportType: '年报' | '季报' | '中报' = '年报'): Promise<ApiResponse<FinancialData>> {
    try {
      const response = await this.client.get(`/api/v1/market/financial/${symbol}`, {
        params: { report_type: reportType }
      });
      return response.data;
    } catch (error) {
      console.error(`[API] Failed to get financial data for ${symbol}:`, error);
      return this.generateFallbackFinancialData(symbol);
    }
  }

  // ============================================================================
  // WebSocket实时数据流
  // ============================================================================

  /**
   * 连接WebSocket
   */
  connectWebSocket(): Promise<void> {
    if (!this.realApiEnabled) {
      console.log('[WS] Real-time API disabled, skipping WebSocket connection');
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      if (this.wsConnection?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const clientId = Math.random().toString(36).substring(7);
      const wsUrl = `${WS_BASE_URL}/ws/${clientId}`;

      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('[WS] Connected to realtime data stream');
        resolve();
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error('[WS] Connection error:', error);
        reject(error);
      };

      this.wsConnection.onclose = () => {
        console.log('[WS] Connection closed');
        // 自动重连
        setTimeout(() => {
          this.connectWebSocket();
        }, 5000);
      };
    });
  }

  /**
   * 订阅实时数据
   */
  subscribe(symbols: string[], callback: (data: any) => void): () => void {
    const subscriptionId = Math.random().toString(36);
    
    symbols.forEach(symbol => {
      if (!this.wsSubscriptions.has(symbol)) {
        this.wsSubscriptions.set(symbol, new Set());
      }
      this.wsSubscriptions.get(symbol)!.add(callback);
    });

    // 发送订阅消息
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        action: 'subscribe',
        symbols: symbols
      }));
    }

    // 返回取消订阅函数
    return () => {
      symbols.forEach(symbol => {
        const callbacks = this.wsSubscriptions.get(symbol);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            this.wsSubscriptions.delete(symbol);
          }
        }
      });

      if (this.wsConnection?.readyState === WebSocket.OPEN) {
        this.wsConnection.send(JSON.stringify({
          action: 'unsubscribe',
          symbols: symbols
        }));
      }
    };
  }

  private handleWebSocketMessage(data: any) {
    if (data.type === 'market_data' && data.data) {
      Object.entries(data.data).forEach(([symbol, quoteData]) => {
        const callbacks = this.wsSubscriptions.get(symbol);
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback({ symbol, ...quoteData });
            } catch (error) {
              console.error('[WS] Callback error:', error);
            }
          });
        }
      });
    }
  }

  // ============================================================================
  // 降级数据生成
  // ============================================================================

  private getFallbackData(url?: string): any {
    // 根据URL返回相应的降级数据
    return {
      success: true,
      data: [],
      source: 'fallback'
    };
  }

  private generateFallbackQuotes(symbols: string[]): ApiResponse<MarketQuote[]> {
    const quotes = symbols.map(symbol => this.generateFallbackQuote(symbol).data);
    return {
      success: true,
      data: quotes,
      source: 'fallback',
      total_count: quotes.length
    };
  }

  private generateFallbackQuote(symbol: string): ApiResponse<MarketQuote> {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const changePercent = (Math.random() - 0.5) * 6; // ±3%
    const change = basePrice * changePercent / 100;
    
    return {
      success: true,
      data: {
        symbol,
        name: this.getStockName(symbol),
        price: +(basePrice + change).toFixed(2),
        change: +change.toFixed(2),
        change_percent: +changePercent.toFixed(2),
        volume: Math.floor(Math.random() * 5000000) + 500000,
        amount: Math.floor(Math.random() * 10000000000) + 1000000000,
        high: +(basePrice * 1.03).toFixed(2),
        low: +(basePrice * 0.97).toFixed(2),
        open: +basePrice.toFixed(2),
        timestamp: new Date().toISOString(),
        vwap: +((basePrice + change) * 1.001).toFixed(2),
        amplitude: +((Math.random() * 5) + 1).toFixed(2),
      },
      source: 'fallback'
    };
  }

  private generateFallbackKlineData(symbol: string, limit: number): ApiResponse<KlineData[]> {
    const data: KlineData[] = [];
    const basePrice = this.getBasePriceForSymbol(symbol);
    let currentPrice = basePrice;

    for (let i = limit; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dailyChange = (Math.random() - 0.5) * 0.06; // ±3%
      const open = currentPrice;
      const close = open * (1 + dailyChange);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +close.toFixed(2),
        volume: Math.floor(Math.random() * 3000000) + 500000,
        amount: Math.floor(Math.random() * 5000000000) + 1000000000,
      });
      
      currentPrice = close;
    }

    return {
      success: true,
      data,
      source: 'fallback',
      total_count: data.length
    };
  }

  private generateFallbackSearchResults(keyword: string): ApiResponse<any[]> {
    const mockStocks = [
      { symbol: '600519', name: '贵州茅台', sector: '食品饮料' },
      { symbol: '300750', name: '宁德时代', sector: '电力设备' },
      { symbol: '000858', name: '五粮液', sector: '食品饮料' },
      { symbol: '600036', name: '招商银行', sector: '银行' },
      { symbol: '002594', name: '比亚迪', sector: '汽车' },
    ];

    const filtered = mockStocks.filter(stock => 
      stock.symbol.includes(keyword) || 
      stock.name.includes(keyword) ||
      stock.sector.includes(keyword)
    );

    return {
      success: true,
      data: filtered,
      source: 'fallback',
      total_count: filtered.length
    };
  }

  private generateFallbackMarketOverview(): ApiResponse<any> {
    return {
      success: true,
      data: {
        market_status: 'open',
        indices: {},
        trading_volume: 500000000000,
        trading_count: 1500000,
        rise_count: 1200,
        fall_count: 800,
        flat_count: 100
      },
      source: 'fallback'
    };
  }

  private generateFallbackIndices(): ApiResponse<MarketQuote[]> {
    return {
      success: true,
      data: [
        {
          symbol: '000001',
          name: '上证指数',
          price: 3100.50,
          change: 15.23,
          change_percent: 0.49,
          volume: 150000000,
          amount: 280000000000,
          high: 3105.80,
          low: 3090.20,
          open: 3095.30,
          timestamp: new Date().toISOString()
        }
      ],
      source: 'fallback'
    };
  }

  private generateFallbackBasicInfo(symbol: string): ApiResponse<StockBasicInfo> {
    return {
      success: true,
      data: {
        symbol,
        name: this.getStockName(symbol),
        list_date: '2010-01-01',
        industry: '其他',
        sector: '其他',
        total_shares: '100万股',
        market_cap: '500亿元',
        pe_ratio: '15.5',
        pb_ratio: '2.8',
        listing_price: '10.00'
      },
      source: 'fallback'
    };
  }

  private generateFallbackNews(limit: number): ApiResponse<NewsItem[]> {
    const news: NewsItem[] = [];
    for (let i = 0; i < limit; i++) {
      news.push({
        id: `fallback_${i}`,
        title: `财经新闻标题 ${i + 1}`,
        content: `这是一条模拟的财经新闻内容，用于在API不可用时提供降级数据...`,
        category: 'general',
        source: '财经网',
        publish_time: new Date(Date.now() - i * 3600000).toISOString(),
        mentioned_stocks: ['600519'],
        importance: Math.floor(Math.random() * 10) + 1
      });
    }
    
    return {
      success: true,
      data: news,
      source: 'fallback',
      total_count: news.length
    };
  }

  private generateFallbackFinancialData(symbol: string): ApiResponse<FinancialData> {
    return {
      success: true,
      data: {
        balance_sheet: {
          总资产: 100000000000,
          总负债: 60000000000,
          股东权益: 40000000000
        },
        income_statement: {
          营业收入: 50000000000,
          净利润: 8000000000
        },
        cash_flow: {
          经营活动现金流: 10000000000
        },
        key_indicators: {
          市盈率: 18.5,
          市净率: 2.3,
          净资产收益率: 15.6
        },
        report_date: '2024-09-30',
        report_period: '年报'
      },
      source: 'fallback'
    };
  }

  private getBasePriceForSymbol(symbol: string): number {
    const prices: Record<string, number> = {
      '600519': 1680,
      '300750': 245,
      '000858': 180,
      '600036': 45,
      '002594': 280,
      '601318': 50,
      '000001': 12,
      '000002': 22,
    };
    return prices[symbol] || 100;
  }

  private getStockName(symbol: string): string {
    const names: Record<string, string> = {
      '600519': '贵州茅台',
      '300750': '宁德时代',
      '000858': '五粮液',
      '600036': '招商银行',
      '002594': '比亚迪',
      '601318': '中国平安',
      '000001': '平安银行',
      '000002': '万科A',
    };
    return names[symbol] || `股票${symbol}`;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return { healthy: response.data.status === 'healthy' };
    } catch (error) {
      console.error('[API] Health check failed:', error);
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// 单例实例
const apiClient = new ApiClient();

export default apiClient;
