/**
 * MarketDataProvider - 市场数据提供者
 * 
 * 功能：
 * - 统一的数据获取接口
 * - 多数据源聚合（实时+历史+财务）
 * - 智能数据源切换和降级
 * - 数据质量监控
 * - 请求限流和去重
 * - 基准指数数据支持（沪深300、中证500等）
 */

// ============================================================================
// 基准指数相关类型
// ============================================================================

export interface IndexData {
  symbol: string;            // 指数代码
  name: string;              // 指数名称
  price: number;             // 当前点位
  change: number;            // 涨跌幅数值
  changePercent: number;     // 涨跌幅百分比
  volume: number;            // 成交量
  turnover: number;          // 成交额
  timestamp: number;         // 时间戳
  open?: number;             // 开盘价
  high?: number;             // 最高价
  low?: number;              // 最低价
  preClose?: number;         // 前收盘价
}

export interface IndexQuoteResponse {
  success: boolean;
  data: IndexData[];
  error?: string;
  timestamp: string;
}

export interface BenchmarkComparison {
  timeFrame: string;
  stockReturn: number;
  benchmarks: {
    hs300: {
      symbol: string;
      return: number;
      returnPercent: string;
      outperform: boolean;
    };
    csi500: {
      symbol: string;
      return: number;
      returnPercent: string;
      outperform: boolean;
    };
  };
}

export interface FundamentalData {
  symbol: string;
  pe: number;           // 市盈率
  pb: number;           // 市净率
  roe: number;          // 净资产收益率
  roa: number;          // 总资产收益率
  eps: number;          // 每股收益
  bvps: number;         // 每股净资产
  revenue: number;      // 营业收入
  netProfit: number;    // 净利润
  grossMargin: number;  // 毛利率
  netMargin: number;    // 净利率
  debtRatio: number;    // 资产负债率
  currentRatio: number; // 流动比率
  marketCap: number;    // 市值
  totalShares: number;  // 总股本
  floatShares: number;  // 流通股本
}

import { getDataStreamManager, MarketData } from './DataStreamManager';
import { getHistoricalDataService, OHLCV, FinancialData, StockInfo } from './HistoricalDataService';
import { getCacheManager } from './CacheManager';
import apiClient from './ApiClient';

// ============================================================================
// Types
// ============================================================================

export interface DataSource {
  id: string;
  name: string;
  priority: number;         // 优先级（数字越小优先级越高）
  type: 'realtime' | 'historical' | 'financial' | 'fundamental';
  enabled: boolean;
  latency: number;         // 平均延迟（ms）
  reliability: number;     // 可靠性评分 0-1
  lastError?: string;
  // 新增字段
  lastSuccessTime?: number; // 最后成功时间
  consecutiveFailures: number; // 连续失败次数
  maxRetries: number;      // 最大重试次数
  cooldownPeriod: number;  // 冷却期（ms）
  weight: number;          // 负载均衡权重
  healthScore: number;     // 健康评分 0-100
  supportedSymbols?: string[]; // 支持的股票代码
  rateLimit: {
    requestsPerSecond: number;
    currentCount: number;
    resetTime: number;
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    avgResponseTime: number;
    lastMetricsUpdate: number;
  };
}

export interface QuoteData extends MarketData {
  // 扩展字段
  marketCap?: number;      // 市值
  pe?: number;             // 市盈率
  pb?: number;             // 市净率
  turnoverRate?: number;   // 换手率
  amplitude?: number;      // 振幅
  vwap?: number;           // 成交量加权平均价
  bid1?: number;           // 买一价
  ask1?: number;           // 卖一价
  floatShares?: number;    // 流通股本
  totalShares?: number;    // 总股本
}

export interface FundamentalData {
  symbol: string;
  companyName: string;
  
  // 估值指标
  valuation: {
    marketCap: number;        // 总市值
    floatMarketCap: number;   // 流通市值
    pe: number;               // 市盈率(TTM)
    pb: number;               // 市净率
    ps: number;               // 市销率
    peg: number;              // PEG比率
    ev: number;               // 企业价值
    evEbitda: number;         // EV/EBITDA
    dividendYield: number;    // 股息率
  };
  
  // 财务指标
  financials: {
    revenue: number;          // 营收(TTM)
    revenueGrowth: number;    // 营收增长率
    netIncome: number;        // 净利润(TTM)
    netIncomeGrowth: number;  // 净利润增长率
    eps: number;              // 每股收益(TTM)
    epsGrowth: number;        // EPS增长率
    bps: number;              // 每股净资产
    totalAssets: number;      // 总资产
    totalDebt: number;        // 总负债
    freeCashFlow: number;     // 自由现金流
    operatingMargin: number;  // 营业利润率
    netMargin: number;        // 净利润率
    assetTurnover: number;    // 总资产周转率
    debtToEquity: number;     // 负债权益比
  };
  
  // 盈利能力
  profitability: {
    roe: number;              // 净资产收益率
    roa: number;              // 总资产收益率
    roic: number;             // 投入资本回报率
    grossMargin: number;      // 毛利率
    operatingMargin: number;  // 营业利润率
    netMargin: number;        // 净利润率
    fcfMargin: number;        // 自由现金流利润率
  };
  
  // 成长性指标
  growth: {
    revenueGrowth1Y: number;  // 1年营收增长率
    revenueGrowth3Y: number;  // 3年营收增长率
    netIncomeGrowth1Y: number; // 1年净利润增长率
    netIncomeGrowth3Y: number; // 3年净利润增长率
    epsGrowth1Y: number;      // 1年EPS增长率
    epsGrowth3Y: number;      // 3年EPS增长率
    bookValueGrowth: number;  // 净资产增长率
  };
  
  // 安全性指标
  safety: {
    currentRatio: number;     // 流动比率
    quickRatio: number;       // 速动比率
    debtToAssets: number;     // 资产负债率
    interestCoverage: number; // 利息保障倍数
    altmanZScore: number;     // Altman Z-Score
  };
  
  // 股东回报
  shareholder: {
    dividendYield: number;    // 股息率
    payoutRatio: number;      // 派息比率
    buybackYield: number;     // 回购收益率
    totalReturn: number;      // 总股东回报率
  };
  
  // 更新时间
  lastUpdated: Date;
  quarter: string;            // 报告期（如"2024Q3"）
}

export interface DataQuality {
  completeness: number;    // 完整性 0-1
  freshness: number;       // 新鲜度 0-1（距离最新更新的时间）
  accuracy: number;        // 准确性 0-1
  consistency: number;     // 一致性 0-1
  overall: number;         // 综合评分 0-1
}

export interface DataRequest {
  symbols: string[];
  fields?: string[];       // 需要的字段
  source?: string;         // 指定数据源
  timeout?: number;        // 超时时间
  cache?: boolean;         // 是否使用缓存
  timeFrame?: string;      // 时间框架
}

export interface IndexHistoricalRequest {
  symbol: string;          // 指数代码
  startDate: string;       // 开始日期
  endDate: string;         // 结束日期
  period?: string;         // 数据周期（日/周/月）
}

export interface BatchRequest {
  requests: DataRequest[];
  parallel?: boolean;      // 是否并行请求
  maxConcurrency?: number; // 最大并发数
}

// ============================================================================
// Market Data Provider
// ============================================================================

export class MarketDataProvider {
  private dataSources: Map<string, DataSource> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map(); // 去重队列
  private rateLimiter: Map<string, number[]> = new Map(); // 限流器
  private maxRequestsPerSecond = 100;
  private baseURL: string;
  private indexCache: Map<string, { data: IndexData; timestamp: number }> = new Map();
  private readonly INDEX_CACHE_TTL = 60000; // 指数数据缓存时间（1分钟）
  private config = {
    enableRealData: true,
    enableAkShare: true,
  };
  
  // 动态数据源切换相关
  private failoverStrategies: Map<string, string[]> = new Map(); // 故障转移策略
  private loadBalancer: {
    strategy: 'round-robin' | 'weighted' | 'least-connections' | 'health-based';
    currentIndex: number;
    connectionCounts: Map<string, number>;
  } = {
    strategy: 'health-based',
    currentIndex: 0,
    connectionCounts: new Map()
  };
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private sourceSelectionCache: Map<string, { sourceId: string; timestamp: number }> = new Map();
  private readonly SOURCE_CACHE_TTL = 30000; // 数据源选择缓存30秒
  private offlineMode = false;

  // 常用指数代码映射
  private readonly MAJOR_INDICES = {
    'hs300': '000300.SH',      // 沪深300
    'csi500': '000905.SH',     // 中证500
    'sse50': '000016.SH',      // 上证50
    'szse100': '399330.SZ',    // 深证100
    'cybz': '399006.SZ',       // 创业板指
    'kcb50': '000688.SH',      // 科创50
    'szzs': '399001.SZ',       // 深证成指
    'sh000001': '000001.SH',   // 上证指数
  };

  constructor() {
    this.initializeDataSources();
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8004';
    if (typeof window !== 'undefined' && window.__ARTHERA_REAL_MODE__ === false) {
      this.offlineMode = true;
    }
  }

  private enableOfflineMode(reason?: string) {
    if (!this.offlineMode) {
      this.offlineMode = true;
      const detail = reason ? `: ${reason}` : '';
      console.warn(`[MarketDataProvider] Switching to offline mode${detail}`);
    }
  }

  async initialize(config: { enableRealData?: boolean; enableAkShare?: boolean } = {}): Promise<void> {
    this.config = {
      ...this.config,
      ...config,
    };

    if (!this.config.enableRealData) {
      const realtimeSource = this.dataSources.get('realtime-websocket');
      if (realtimeSource) {
        realtimeSource.enabled = false;
      }
      console.log('[MarketDataProvider] Running in mock mode (real data disabled)');
    }

    if (!this.config.enableAkShare) {
      const historicalApi = this.dataSources.get('historical-api');
      if (historicalApi) {
        historicalApi.enabled = false;
      }
    }
  }

  /**
   * 初始化数据源
   */
  private initializeDataSources(): void {
    const createDataSource = (config: Partial<DataSource> & { id: string; name: string; type: DataSource['type'] }): DataSource => {
      return {
        priority: 1,
        enabled: true,
        latency: 100,
        reliability: 0.95,
        consecutiveFailures: 0,
        maxRetries: 3,
        cooldownPeriod: 5000,
        weight: 1,
        healthScore: 100,
        rateLimit: {
          requestsPerSecond: 100,
          currentCount: 0,
          resetTime: Date.now() + 1000
        },
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          avgResponseTime: 0,
          lastMetricsUpdate: Date.now()
        },
        ...config
      };
    };

    this.dataSources.set('realtime-websocket', createDataSource({
      id: 'realtime-websocket',
      name: 'WebSocket实时数据',
      priority: 1,
      type: 'realtime',
      latency: 50,
      reliability: 0.98,
      weight: 3,
      rateLimit: {
        requestsPerSecond: 200,
        currentCount: 0,
        resetTime: Date.now() + 1000
      }
    }));

    this.dataSources.set('finnhub-api', createDataSource({
      id: 'finnhub-api',
      name: 'Finnhub API',
      priority: 2,
      type: 'realtime',
      latency: 150,
      reliability: 0.96,
      weight: 2,
      rateLimit: {
        requestsPerSecond: 60,
        currentCount: 0,
        resetTime: Date.now() + 1000
      }
    }));

    this.dataSources.set('tiingo-api', createDataSource({
      id: 'tiingo-api',
      name: 'Tiingo API',
      priority: 3,
      type: 'realtime',
      latency: 200,
      reliability: 0.94,
      weight: 2,
      rateLimit: {
        requestsPerSecond: 50,
        currentCount: 0,
        resetTime: Date.now() + 1000
      }
    }));

    this.dataSources.set('historical-cache', createDataSource({
      id: 'historical-cache',
      name: '历史数据缓存',
      priority: 1,
      type: 'historical',
      latency: 10,
      reliability: 1.0,
      weight: 5,
      rateLimit: {
        requestsPerSecond: 1000,
        currentCount: 0,
        resetTime: Date.now() + 1000
      }
    }));

    this.dataSources.set('historical-api', createDataSource({
      id: 'historical-api',
      name: '历史数据API',
      priority: 2,
      type: 'historical',
      latency: 200,
      reliability: 0.95,
      weight: 3,
      rateLimit: {
        requestsPerSecond: 100,
        currentCount: 0,
        resetTime: Date.now() + 1000
      }
    }));

    this.dataSources.set('financial-api', createDataSource({
      id: 'financial-api',
      name: '财务数据API',
      priority: 1,
      type: 'financial',
      latency: 300,
      reliability: 0.92,
      weight: 2,
      rateLimit: {
        requestsPerSecond: 30,
        currentCount: 0,
        resetTime: Date.now() + 1000
      }
    }));

    this.dataSources.set('mock-provider', createDataSource({
      id: 'mock-provider',
      name: 'Mock数据提供者',
      priority: 99,
      type: 'realtime',
      latency: 0,
      reliability: 1.0,
      weight: 1,
      rateLimit: {
        requestsPerSecond: 1000,
        currentCount: 0,
        resetTime: Date.now() + 1000
      }
    }));
    
    // 设置故障转移策略
    this.setupFailoverStrategies();
    
    // 启动健康检查
    this.startHealthCheck();
    
    // 启动指标收集
    this.startMetricsCollection();
  }
  
  /**
   * 设置故障转移策略
   */
  private setupFailoverStrategies(): void {
    // 实时数据故障转移链
    this.failoverStrategies.set('realtime', [
      'realtime-websocket',
      'finnhub-api', 
      'tiingo-api',
      'mock-provider'
    ]);
    
    // 历史数据故障转移链
    this.failoverStrategies.set('historical', [
      'historical-cache',
      'historical-api',
      'mock-provider'
    ]);
    
    // 财务数据故障转移链
    this.failoverStrategies.set('financial', [
      'financial-api',
      'mock-provider'
    ]);
  }
  
  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // 每30秒检查一次
  }
  
  /**
   * 启动指标收集
   */
  private startMetricsCollection(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }
    
    this.metricsCollectionInterval = setInterval(() => {
      this.updateHealthScores();
      this.resetRateLimitCounters();
    }, 5000); // 每5秒更新一次
  }

  /**
   * 获取实时行情数据
   */
  async getQuotes(symbols: string[]): Promise<Map<string, QuoteData>> {
    const cacheKey = `quotes-${symbols.join(',')}`;

    // 检查去重队列
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey)!;
    }

    // 限流检查
    if (!this.checkRateLimit('quotes')) {
      await this.delay(100);
    }

    const promise = this.fetchQuotesInternal(symbols);
    this.requestQueue.set(cacheKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  /**
   * 内部获取行情数据（增强版）
   */
  private async fetchQuotesInternal(symbols: string[]): Promise<Map<string, QuoteData>> {
    const quotes = new Map<string, QuoteData>();

    try {
      // 使用智能数据源选择器
      const selectedSources = await this.selectOptimalDataSources('realtime', symbols);
      
      for (const sourceId of selectedSources) {
        const missingSymbols = symbols.filter(s => !quotes.has(s));
        if (missingSymbols.length === 0) break;
        
        try {
          const sourceQuotes = await this.fetchFromDataSource(sourceId, missingSymbols, 'quotes');
          sourceQuotes.forEach((quote, symbol) => quotes.set(symbol, quote));
          
          // 记录成功指标
          this.recordDataSourceMetrics(sourceId, true, Date.now());
          
        } catch (error) {
          console.warn(`Data source ${sourceId} failed:`, error);
          
          // 记录失败指标
          this.recordDataSourceMetrics(sourceId, false, Date.now());
          
          // 处理数据源故障
          await this.handleDataSourceFailure(sourceId, error as Error);
        }
      }

      return quotes;
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      return quotes;
    }
  }
  
  /**
   * 从特定数据源获取数据
   */
  private async fetchFromDataSource(
    sourceId: string, 
    symbols: string[], 
    dataType: string
  ): Promise<Map<string, any>> {
    const source = this.dataSources.get(sourceId);
    if (!source || !source.enabled) {
      throw new Error(`Data source ${sourceId} not available`);
    }
    
    // 检查速率限制
    if (!this.checkSourceRateLimit(sourceId)) {
      throw new Error(`Rate limit exceeded for ${sourceId}`);
    }
    
    const startTime = Date.now();
    
    try {
      let result: Map<string, any>;
      
      switch (sourceId) {
        case 'realtime-websocket':
          result = await this.getQuotesFromWebSocket(symbols);
          break;
        case 'finnhub-api':
        case 'tiingo-api':
          result = await this.getQuotesFromAPI(symbols, sourceId);
          break;
        case 'historical-cache':
          result = await this.getQuotesFromCache(symbols);
          break;
        case 'mock-provider':
          result = await this.getQuotesFromMock(symbols);
          break;
        default:
          result = await this.getQuotesFromAPI(symbols, sourceId);
      }
      
      // 更新延迟指标
      const latency = Date.now() - startTime;
      this.updateSourceLatency(sourceId, latency);
      
      return result;
      
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateSourceLatency(sourceId, latency);
      throw error;
    }
  }
  
  /**
   * 智能数据源选择器
   */
  private async selectOptimalDataSources(
    dataType: string, 
    symbols: string[]
  ): Promise<string[]> {
    // 检查缓存
    const cacheKey = `${dataType}-${symbols.join(',')}`;
    const cached = this.sourceSelectionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.SOURCE_CACHE_TTL) {
      return [cached.sourceId];
    }
    
    const availableSources = Array.from(this.dataSources.values())
      .filter(source => 
        source.enabled && 
        source.type === dataType &&
        source.healthScore > 50 &&
        this.isSourceInCooldown(source.id) === false
      );
    
    if (availableSources.length === 0) {
      // 没有健康的数据源，使用故障转移链
      return this.failoverStrategies.get(dataType) || ['mock-provider'];
    }
    
    // 根据负载均衡策略选择数据源
    const selectedSources = this.selectByLoadBalancingStrategy(availableSources);
    
    // 缓存选择结果
    if (selectedSources.length > 0) {
      this.sourceSelectionCache.set(cacheKey, {
        sourceId: selectedSources[0],
        timestamp: Date.now()
      });
    }
    
    return selectedSources;
  }
  
  /**
   * 根据负载均衡策略选择数据源
   */
  private selectByLoadBalancingStrategy(sources: DataSource[]): string[] {
    switch (this.loadBalancer.strategy) {
      case 'health-based':
        return sources
          .sort((a, b) => b.healthScore - a.healthScore)
          .map(s => s.id);
          
      case 'weighted':
        return this.selectByWeight(sources);
        
      case 'least-connections':
        return sources
          .sort((a, b) => 
            (this.loadBalancer.connectionCounts.get(a.id) || 0) - 
            (this.loadBalancer.connectionCounts.get(b.id) || 0)
          )
          .map(s => s.id);
          
      case 'round-robin':
      default:
        return this.selectRoundRobin(sources);
    }
  }
  
  /**
   * 基于权重的选择
   */
  private selectByWeight(sources: DataSource[]): string[] {
    const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const source of sources) {
      currentWeight += source.weight;
      if (random <= currentWeight) {
        return [source.id, ...sources.filter(s => s.id !== source.id).map(s => s.id)];
      }
    }
    
    return sources.map(s => s.id);
  }
  
  /**
   * 轮询选择
   */
  private selectRoundRobin(sources: DataSource[]): string[] {
    if (sources.length === 0) return [];
    
    const selectedIndex = this.loadBalancer.currentIndex % sources.length;
    this.loadBalancer.currentIndex = (this.loadBalancer.currentIndex + 1) % sources.length;
    
    const selected = sources[selectedIndex];
    const others = sources.filter((_, index) => index !== selectedIndex);
    
    return [selected.id, ...others.map(s => s.id)];
  }

  /**
   * 从API获取行情数据（增强版）
   */
  private async getQuotesFromAPI(symbols: string[], sourceId?: string): Promise<Map<string, QuoteData>> {
    const quotes = new Map<string, QuoteData>();

    try {
      // 使用新的ApiClient获取批量实时行情
      const result = await apiClient.getRealtimeQuotes(symbols);
      
      if (result.success && Array.isArray(result.data)) {
        result.data.forEach((quoteData: any) => {
          const quote: QuoteData = {
            symbol: quoteData.symbol,
            name: quoteData.name || `股票${quoteData.symbol}`,
            timestamp: new Date(quoteData.timestamp).getTime(),
            price: quoteData.price || 0,
            open: quoteData.open || 0,
            high: quoteData.high || 0,
            low: quoteData.low || 0,
            close: quoteData.price || 0,
            volume: quoteData.volume || 0,
            amount: quoteData.amount || 0,
            change: quoteData.change || 0,
            changePercent: quoteData.change_percent || 0,
            // 扩展字段
            marketCap: quoteData.marketCap,
            pe: quoteData.pe,
            pb: quoteData.pb,
            turnoverRate: this.calculateTurnoverRate(quoteData.volume, quoteData.floatShares),
            amplitude: quoteData.amplitude || 0,
            vwap: quoteData.vwap || quoteData.price,
            bid1: quoteData.bid1 || quoteData.price * 0.999,
            ask1: quoteData.ask1 || quoteData.price * 1.001,
          };
          
          quotes.set(quote.symbol, quote);
        });
      }

      return quotes;
    } catch (error) {
      console.error(`Failed to fetch quotes from API (${sourceId}):`, error);
      throw error; // 重新抛出错误以便上层处理
    }
  }
  
  /**
   * 从WebSocket获取行情数据
   */
  private async getQuotesFromWebSocket(symbols: string[]): Promise<Map<string, QuoteData>> {
    const quotes = new Map<string, QuoteData>();
    
    try {
      const streamManager = getDataStreamManager();
      const realtimeData = streamManager.getCurrentData();

      symbols.forEach(symbol => {
        const data = realtimeData.get(symbol);
        if (data) {
          quotes.set(symbol, this.enrichQuoteData(data));
        }
      });
      
      return quotes;
    } catch (error) {
      console.error('Failed to fetch quotes from WebSocket:', error);
      throw error;
    }
  }
  
  /**
   * 从Mock数据源获取行情
   */
  private async getQuotesFromMock(symbols: string[]): Promise<Map<string, QuoteData>> {
    const quotes = new Map<string, QuoteData>();
    
    // 延迟模拟真实API
    await this.delay(Math.random() * 100);
    
    symbols.forEach(symbol => {
      const price = 10 + Math.random() * 90;
      const change = (Math.random() - 0.5) * 2;
      
      const quote: QuoteData = {
        symbol,
        name: `模拟股票${symbol}`,
        timestamp: Date.now(),
        price,
        open: price - change * 0.5,
        high: price + Math.abs(change) * 0.8,
        low: price - Math.abs(change) * 0.8,
        close: price,
        volume: Math.floor(Math.random() * 1000000),
        amount: Math.floor(Math.random() * 10000000),
        change,
        changePercent: (change / price) * 100,
        marketCap: Math.floor(Math.random() * 100000000000),
        pe: 10 + Math.random() * 30,
        pb: 1 + Math.random() * 5,
        turnoverRate: Math.random() * 10,
        amplitude: Math.abs(change) * 2,
        vwap: price,
        bid1: price * 0.999,
        ask1: price * 1.001,
      };
      
      quotes.set(symbol, quote);
    });
    
    return quotes;
  }

  /**
   * 计算换手率
   */
  private calculateTurnoverRate(volume: number, floatShares: number): number {
    if (!volume || !floatShares || floatShares <= 0) return 0;
    return (volume / floatShares) * 100;
  }

  /**
   * 从缓存获取行情
   */
  private async getQuotesFromCache(symbols: string[]): Promise<Map<string, QuoteData>> {
    const cache = getCacheManager();
    const quotes = new Map<string, QuoteData>();

    await Promise.all(
      symbols.map(async symbol => {
        const cached = await cache.get<QuoteData>('market-data', `quote-${symbol}`);
        if (cached) {
          quotes.set(symbol, cached);
        }
      })
    );

    return quotes;
  }

  /**
   * 丰富行情数据（添加计算字段）
   */
  private enrichQuoteData(data: MarketData): QuoteData {
    const enriched: QuoteData = { ...data };

    // 计算振幅
    if (data.high && data.low && data.open) {
      enriched.amplitude = ((data.high - data.low) / data.open) * 100;
    }

    // 计算换手率（需要流通股本数据，这里用模拟值）
    if (data.volume) {
      enriched.turnoverRate = (data.volume / 1000000000) * 100; // 简化计算
    }

    return enriched;
  }

  /**
   * 批量获取历史数据
   */
  async getBatchHistoricalData(
    requests: Array<{ symbol: string; period: string; limit?: number }>
  ): Promise<Map<string, OHLCV[]>> {
    const historicalService = getHistoricalDataService();
    const results = new Map<string, OHLCV[]>();

    // 并行请求所有数据
    const promises = requests.map(async req => {
      try {
        const response = await historicalService.getKlineData({
          symbol: req.symbol,
          period: req.period as any,
          limit: req.limit || 500,
        });
        return { symbol: req.symbol, data: response.data };
      } catch (error) {
        console.error(`Failed to get data for ${req.symbol}:`, error);
        return { symbol: req.symbol, data: [] };
      }
    });

    const responses = await Promise.all(promises);

    responses.forEach(({ symbol, data }) => {
      results.set(symbol, data);
    });

    return results;
  }

  /**
   * 获取股票基本信息
   */
  async getStockInfo(symbols: string[]): Promise<Map<string, StockInfo>> {
    const historicalService = getHistoricalDataService();
    const infos = new Map<string, StockInfo>();

    await Promise.all(
      symbols.map(async symbol => {
        const info = await historicalService.getStockInfo(symbol);
        if (info) {
          infos.set(symbol, info);
        }
      })
    );

    return infos;
  }

  /**
   * 搜索股票
   */
  async searchStocks(query: string, limit: number = 20): Promise<StockInfo[]> {
    try {
      // 使用ApiClient搜索股票
      const result = await apiClient.searchStocks(query, limit);
      
      if (result.success && Array.isArray(result.data)) {
        return result.data.map((stock: any) => ({
          symbol: stock.symbol,
          name: stock.name,
          exchange: stock.market || 'SH',
          sector: stock.sector || '其他',
          industry: stock.industry || '其他',
          marketCap: 50000000000, // 默认市值
          listedDate: '2020-01-01', // 默认上市日期
        }));
      }
    } catch (error) {
      console.error('股票搜索失败，使用本地数据:', error);
    }

    // 降级到本地模拟数据
    const stockDatabase: StockInfo[] = [
      {
        symbol: '600519',
        name: '贵州茅台',
        exchange: 'SH',
        sector: '食品饮料',
        industry: '白酒',
        marketCap: 2100000000000,
        listedDate: '2001-08-27',
      },
      {
        symbol: '300750',
        name: '宁德时代',
        exchange: 'SZ',
        sector: '电力设备',
        industry: '电池',
        marketCap: 1200000000000,
        listedDate: '2018-06-11',
      },
      {
        symbol: '000858',
        name: '五粮液',
        exchange: 'SZ',
        sector: '食品饮料',
        industry: '白酒',
        marketCap: 680000000000,
        listedDate: '1998-04-27',
      },
      {
        symbol: '600036',
        name: '招商银行',
        exchange: 'SH',
        sector: '银行',
        industry: '银行',
        marketCap: 1050000000000,
        listedDate: '2002-04-09',
      },
      {
        symbol: '002594',
        name: '比亚迪',
        exchange: 'SZ',
        sector: '汽车',
        industry: '新能源汽车',
        marketCap: 780000000000,
        listedDate: '2011-06-30',
      },
      {
        symbol: '601318',
        name: '中国平安',
        exchange: 'SH',
        sector: '非银金融',
        industry: '保险',
        marketCap: 920000000000,
        listedDate: '2007-03-01',
      },
      {
        symbol: '000333',
        name: '美的集团',
        exchange: 'SZ',
        sector: '家用电器',
        industry: '白色家电',
        marketCap: 520000000000,
        listedDate: '2013-09-18',
      },
      {
        symbol: '600276',
        name: '恒瑞医药',
        exchange: 'SH',
        sector: '医药生物',
        industry: '化学制药',
        marketCap: 310000000000,
        listedDate: '2000-10-18',
      },
    ];

    const lowerQuery = query.toLowerCase();

    // 搜索匹配
    const results = stockDatabase.filter(stock =>
      stock.symbol.includes(lowerQuery) ||
      stock.name.includes(query) ||
      stock.sector.includes(query) ||
      stock.industry.includes(query)
    );

    return results.slice(0, limit);
  }

  /**
   * 获取基本面数据
   */
  async getFundamentalData(symbol: string): Promise<FundamentalData | null> {
    try {
      // 使用ApiClient获取财务数据
      const result = await apiClient.getFinancialData(symbol);
      
      if (result.success && result.data) {
        // 将ApiClient返回的财务数据转换为FundamentalData格式
        const financialData = result.data;
        
        return {
          symbol,
          companyName: `公司${symbol}`,
          valuation: {
            marketCap: financialData.key_indicators['市盈率'] * 1000000000 || 50000000000,
            floatMarketCap: financialData.key_indicators['市净率'] * 800000000 || 30000000000,
            pe: financialData.key_indicators['市盈率'] || 25.0,
            pb: financialData.key_indicators['市净率'] || 3.5,
            ps: 2.8,
            peg: 1.5,
            ev: financialData.balance_sheet['总资产'] || 52000000000,
            evEbitda: 18.5,
            dividendYield: 2.5,
          },
          financials: {
            revenue: financialData.income_statement['营业收入'] || 10000000000,
            revenueGrowth: 8.5,
            netIncome: financialData.income_statement['净利润'] || 1200000000,
            netIncomeGrowth: 12.3,
            eps: 2.85,
            epsGrowth: 12.3,
            bps: 28.50,
            totalAssets: financialData.balance_sheet['总资产'] || 25000000000,
            totalDebt: financialData.balance_sheet['总负债'] || 8500000000,
            freeCashFlow: financialData.cash_flow['经营活动现金流'] || 1100000000,
            operatingMargin: 15.8,
            netMargin: 12.0,
            assetTurnover: 0.40,
            debtToEquity: 0.34,
          },
          profitability: {
            roe: financialData.key_indicators['净资产收益率'] || 10.0,
            roa: 4.8,
            roic: 8.5,
            grossMargin: 35.2,
            operatingMargin: 15.8,
            netMargin: 12.0,
            fcfMargin: 11.0,
          },
          growth: {
            revenueGrowth1Y: 8.5,
            revenueGrowth3Y: 12.2,
            netIncomeGrowth1Y: 12.3,
            netIncomeGrowth3Y: 15.8,
            epsGrowth1Y: 12.3,
            epsGrowth3Y: 15.8,
            bookValueGrowth: 8.9,
          },
          safety: {
            currentRatio: 1.5,
            quickRatio: 1.2,
            debtToAssets: 0.34,
            interestCoverage: 8.5,
            altmanZScore: 2.8,
          },
          shareholder: {
            dividendYield: 2.5,
            payoutRatio: 0.35,
            buybackYield: 0.5,
            totalReturn: 3.0,
          },
          lastUpdated: new Date(financialData.report_date),
          quarter: financialData.report_period,
        };
      }
    } catch (error) {
      console.warn('获取基本面数据失败，使用模拟数据:', error);
    }

    // 降级到模拟数据
    return this.generateMockFundamentalData(symbol);
  }

  /**
   * 生成模拟基本面数据
   */
  private generateMockFundamentalData(symbol: string): FundamentalData {
    // 根据股票代码生成不同的模拟数据
    const mockData: Record<string, Partial<FundamentalData>> = {
      '600519': {
        companyName: '贵州茅台',
        valuation: {
          marketCap: 2100000000000,
          floatMarketCap: 1260000000000,
          pe: 35.8,
          pb: 13.2,
          ps: 12.5,
          peg: 1.8,
          ev: 2200000000000,
          evEbitda: 25.3,
          dividendYield: 1.2,
        },
        financials: {
          revenue: 123500000000,
          revenueGrowth: 17.8,
          netIncome: 62800000000,
          netIncomeGrowth: 19.2,
          eps: 49.85,
          epsGrowth: 19.2,
          bps: 377.82,
          totalAssets: 215000000000,
          totalDebt: 12500000000,
          freeCashFlow: 58900000000,
          operatingMargin: 51.2,
          netMargin: 50.8,
          assetTurnover: 0.57,
          debtToEquity: 0.034,
        },
        profitability: {
          roe: 13.2,
          roa: 29.2,
          roic: 32.8,
          grossMargin: 91.8,
          operatingMargin: 51.2,
          netMargin: 50.8,
          fcfMargin: 47.7,
        },
        growth: {
          revenueGrowth1Y: 17.8,
          revenueGrowth3Y: 15.2,
          netIncomeGrowth1Y: 19.2,
          netIncomeGrowth3Y: 16.8,
          epsGrowth1Y: 19.2,
          epsGrowth3Y: 16.8,
          bookValueGrowth: 12.5,
        },
        safety: {
          currentRatio: 18.5,
          quickRatio: 17.8,
          debtToAssets: 0.058,
          interestCoverage: 145.2,
          altmanZScore: 8.9,
        },
        shareholder: {
          dividendYield: 1.2,
          payoutRatio: 0.51,
          buybackYield: 0,
          totalReturn: 1.2,
        },
      },
      '300750': {
        companyName: '宁德时代',
        valuation: {
          marketCap: 1200000000000,
          floatMarketCap: 720000000000,
          pe: 48.5,
          pb: 8.9,
          ps: 3.2,
          peg: 2.1,
          ev: 1150000000000,
          evEbitda: 35.8,
          dividendYield: 0.8,
        },
        financials: {
          revenue: 373200000000,
          revenueGrowth: 152.1,
          netIncome: 33200000000,
          netIncomeGrowth: 92.3,
          eps: 14.25,
          epsGrowth: 92.3,
          bps: 159.82,
          totalAssets: 565000000000,
          totalDebt: 89500000000,
          freeCashFlow: 28900000000,
          operatingMargin: 10.8,
          netMargin: 8.9,
          assetTurnover: 0.66,
          debtToEquity: 0.19,
        },
        profitability: {
          roe: 8.9,
          roa: 5.9,
          roic: 12.8,
          grossMargin: 21.9,
          operatingMargin: 10.8,
          netMargin: 8.9,
          fcfMargin: 7.7,
        },
        growth: {
          revenueGrowth1Y: 152.1,
          revenueGrowth3Y: 89.2,
          netIncomeGrowth1Y: 92.3,
          netIncomeGrowth3Y: 76.8,
          epsGrowth1Y: 92.3,
          epsGrowth3Y: 76.8,
          bookValueGrowth: 35.5,
        },
        safety: {
          currentRatio: 2.1,
          quickRatio: 1.8,
          debtToAssets: 0.158,
          interestCoverage: 12.5,
          altmanZScore: 5.2,
        },
        shareholder: {
          dividendYield: 0.8,
          payoutRatio: 0.12,
          buybackYield: 0,
          totalReturn: 0.8,
        },
      },
    };

    // 默认数据模板
    const defaultData: FundamentalData = {
      symbol,
      companyName: '未知公司',
      valuation: {
        marketCap: 50000000000,
        floatMarketCap: 30000000000,
        pe: 25.0,
        pb: 3.5,
        ps: 2.8,
        peg: 1.5,
        ev: 52000000000,
        evEbitda: 18.5,
        dividendYield: 2.5,
      },
      financials: {
        revenue: 10000000000,
        revenueGrowth: 8.5,
        netIncome: 1200000000,
        netIncomeGrowth: 12.3,
        eps: 2.85,
        epsGrowth: 12.3,
        bps: 28.50,
        totalAssets: 25000000000,
        totalDebt: 8500000000,
        freeCashFlow: 1100000000,
        operatingMargin: 15.8,
        netMargin: 12.0,
        assetTurnover: 0.40,
        debtToEquity: 0.34,
      },
      profitability: {
        roe: 10.0,
        roa: 4.8,
        roic: 8.5,
        grossMargin: 35.2,
        operatingMargin: 15.8,
        netMargin: 12.0,
        fcfMargin: 11.0,
      },
      growth: {
        revenueGrowth1Y: 8.5,
        revenueGrowth3Y: 12.2,
        netIncomeGrowth1Y: 12.3,
        netIncomeGrowth3Y: 15.8,
        epsGrowth1Y: 12.3,
        epsGrowth3Y: 15.8,
        bookValueGrowth: 8.9,
      },
      safety: {
        currentRatio: 1.5,
        quickRatio: 1.2,
        debtToAssets: 0.34,
        interestCoverage: 8.5,
        altmanZScore: 2.8,
      },
      shareholder: {
        dividendYield: 2.5,
        payoutRatio: 0.35,
        buybackYield: 0.5,
        totalReturn: 3.0,
      },
      lastUpdated: new Date(),
      quarter: '2024Q3',
    };

    // 如果有特定股票的模拟数据，则合并使用
    if (mockData[symbol]) {
      return {
        ...defaultData,
        ...mockData[symbol],
        symbol,
        lastUpdated: new Date(),
        quarter: '2024Q3',
      } as FundamentalData;
    }

    return defaultData;
  }

  /**
   * 评估数据质量
   */
  assessDataQuality(data: OHLCV[]): DataQuality {
    if (data.length === 0) {
      return {
        completeness: 0,
        freshness: 0,
        accuracy: 0,
        consistency: 0,
        overall: 0,
      };
    }

    // 1. 完整性：检查缺失值
    const completeCount = data.filter(d =>
      d.open > 0 && d.high > 0 && d.low > 0 && d.close > 0 && d.volume >= 0
    ).length;
    const completeness = completeCount / data.length;

    // 2. 新鲜度：最新数据时间
    const latestTimestamp = Math.max(...data.map(d => d.timestamp));
    const ageMs = Date.now() - latestTimestamp;
    const freshness = Math.max(0, 1 - ageMs / (24 * 60 * 60 * 1000)); // 1天内为1，之后递减

    // 3. 准确性：检查异常值
    let accuracyIssues = 0;
    data.forEach(d => {
      if (d.high < d.low) accuracyIssues++;
      if (d.close > d.high || d.close < d.low) accuracyIssues++;
      if (d.open > d.high || d.open < d.low) accuracyIssues++;
    });
    const accuracy = 1 - (accuracyIssues / data.length);

    // 4. 一致性：检查数据连续性
    let gapCount = 0;
    for (let i = 1; i < data.length; i++) {
      const timeDiff = data[i].timestamp - data[i - 1].timestamp;
      const expectedDiff = 24 * 60 * 60 * 1000; // 假设日线
      if (Math.abs(timeDiff - expectedDiff) > expectedDiff * 0.5) {
        gapCount++;
      }
    }
    const consistency = 1 - (gapCount / data.length);

    // 综合评分
    const overall = (completeness + freshness + accuracy + consistency) / 4;

    return {
      completeness,
      freshness,
      accuracy,
      consistency,
      overall,
    };
  }

  /**
   * 获取数据源状态
   */
  getDataSourcesStatus(): DataSource[] {
    return Array.from(this.dataSources.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * 更新数据源状态
   */
  updateDataSource(id: string, updates: Partial<DataSource>): void {
    const source = this.dataSources.get(id);
    if (source) {
      this.dataSources.set(id, { ...source, ...updates });
    }
  }

  /**
   * 切换数据源（增强版）
   */
  switchDataSource(type: DataSource['type'], sourceId: string, exclusive: boolean = false): void {
    const targetSource = this.dataSources.get(sourceId);
    if (!targetSource) {
      console.error(`Data source ${sourceId} not found`);
      return;
    }
    
    if (exclusive) {
      // 禁用同类型的其他数据源
      this.dataSources.forEach((source, id) => {
        if (source.type === type) {
          source.enabled = (id === sourceId);
        }
      });
    } else {
      // 只启用目标数据源
      targetSource.enabled = true;
    }
    
    // 清理数据源选择缓存
    this.clearSourceSelectionCache();
    
    console.log(`Switched to data source: ${sourceId}`);
  }
  
  /**
   * 设置负载均衡策略
   */
  setLoadBalancingStrategy(
    strategy: 'round-robin' | 'weighted' | 'least-connections' | 'health-based'
  ): void {
    this.loadBalancer.strategy = strategy;
    this.loadBalancer.currentIndex = 0;
    this.clearSourceSelectionCache();
    
    console.log(`Load balancing strategy set to: ${strategy}`);
  }
  
  /**
   * 动态调整数据源权重
   */
  adjustSourceWeight(sourceId: string, weight: number): void {
    const source = this.dataSources.get(sourceId);
    if (source) {
      source.weight = Math.max(0, weight);
      this.clearSourceSelectionCache();
      console.log(`Adjusted weight for ${sourceId} to ${weight}`);
    }
  }
  
  /**
   * 临时禁用数据源
   */
  disableSourceTemporarily(sourceId: string, duration: number = 60000): void {
    const source = this.dataSources.get(sourceId);
    if (source) {
      source.enabled = false;
      
      setTimeout(() => {
        source.enabled = true;
        console.log(`Re-enabled data source: ${sourceId}`);
      }, duration);
      
      console.log(`Temporarily disabled ${sourceId} for ${duration}ms`);
    }
  }

  /**
   * 限流检查
   */
  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const timestamps = this.rateLimiter.get(key) || [];

    // 清理1秒前的时间戳
    const recentTimestamps = timestamps.filter(t => now - t < 1000);

    if (recentTimestamps.length >= this.maxRequestsPerSecond) {
      return false;
    }

    recentTimestamps.push(now);
    this.rateLimiter.set(key, recentTimestamps);
    return true;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 订阅实时数据流
   */
  subscribeRealtime(
    symbols: string[],
    callback: (data: MarketData) => void
  ): () => void {
    const streamManager = getDataStreamManager();
    const subscriptionId = streamManager.subscribe(symbols, callback);

    return () => {
      streamManager.unsubscribe(subscriptionId);
    };
  }

  /**
   * 预热缓存（预加载常用数据）
   */
  async warmupCache(symbols: string[], periods: string[]): Promise<void> {
    const historicalService = getHistoricalDataService();
    
    const tasks = symbols.flatMap(symbol =>
      periods.map(period =>
        historicalService.getKlineData({
          symbol,
          period: period as any,
          limit: 500,
        })
      )
    );

    await Promise.allSettled(tasks);
    console.log(`Warmed up cache for ${symbols.length} symbols, ${periods.length} periods`);
  }

  /**
   * 获取数据源性能统计
   */
  getPerformanceStats(): Map<string, { avgLatency: number; successRate: number }> {
    const stats = new Map();

    this.dataSources.forEach((source, id) => {
      stats.set(id, {
        avgLatency: source.latency,
        successRate: source.reliability,
      });
    });

    return stats;
  }

  /**
   * 健康检查（增强版）
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    availableSources: number;
    sourceDetails: Array<{
      id: string;
      name: string;
      healthy: boolean;
      healthScore: number;
      latency: number;
      reliability: number;
      consecutiveFailures: number;
    }>;
  }> {
    const issues: string[] = [];
    let availableSources = 0;
    const sourceDetails: any[] = [];

    this.dataSources.forEach(source => {
      const isHealthy = source.enabled && 
                       source.healthScore > 50 && 
                       source.consecutiveFailures < 3;
      
      sourceDetails.push({
        id: source.id,
        name: source.name,
        healthy: isHealthy,
        healthScore: source.healthScore,
        latency: source.latency,
        reliability: source.reliability,
        consecutiveFailures: source.consecutiveFailures
      });
      
      if (isHealthy) {
        availableSources++;
      } else if (source.enabled) {
        if (source.healthScore <= 50) {
          issues.push(`${source.name} health score low: ${source.healthScore}`);
        }
        if (source.consecutiveFailures >= 3) {
          issues.push(`${source.name} has ${source.consecutiveFailures} consecutive failures`);
        }
        if (source.reliability <= 0.8) {
          issues.push(`${source.name} reliability low: ${source.reliability}`);
        }
      }
    });

    const healthy = availableSources >= 2 && issues.length === 0;

    return { healthy, issues, availableSources, sourceDetails };
  }
  
  // ============================================================================
  // 数据源管理辅助方法
  // ============================================================================
  
  /**
   * 执行健康检查
   */
  private async performHealthCheck(): void {
    if (this.offlineMode) {
      return;
    }
    for (const [sourceId, source] of this.dataSources.entries()) {
      if (!source.enabled) continue;
      
      try {
        // 执行简单的ping测试
        const startTime = Date.now();
        await this.pingDataSource(sourceId);
        const responseTime = Date.now() - startTime;
        
        // 更新健康指标
        this.updateSourceHealth(sourceId, true, responseTime);
        
      } catch (error) {
        this.updateSourceHealth(sourceId, false, 0);
        console.warn(`Health check failed for ${sourceId}:`, error);
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('offline') || message.includes('ERR_CONNECTION') || error instanceof TypeError) {
          this.enableOfflineMode(message);
          break;
        }
      }
    }
  }
  
  /**
   * Ping数据源
   */
  private async pingDataSource(sourceId: string): Promise<void> {
    if (this.offlineMode) {
      throw new Error('offline');
    }
    const source = this.dataSources.get(sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);
    
    switch (sourceId) {
      case 'realtime-websocket':
        // 检查WebSocket连接状态
        const streamManager = getDataStreamManager();
        if (!streamManager.isConnected()) {
          throw new Error('WebSocket not connected');
        }
        break;
        
      case 'historical-cache':
        // 检查缓存系统
        const cache = getCacheManager();
        await cache.get('market-data', 'health-check');
        break;
        
      default:
        // 对API数据源执行简单的HTTP检查
        const response = await fetch(`${this.baseURL}/api/health`, {
          method: 'GET',
          timeout: 5000
        } as RequestInit);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
    }
  }
  
  /**
   * 更新数据源健康状态
   */
  private updateSourceHealth(sourceId: string, success: boolean, responseTime: number): void {
    const source = this.dataSources.get(sourceId);
    if (!source) return;
    
    if (success) {
      source.consecutiveFailures = 0;
      source.lastSuccessTime = Date.now();
      source.latency = (source.latency + responseTime) / 2; // 移动平均
      source.healthScore = Math.min(100, source.healthScore + 2);
    } else {
      source.consecutiveFailures++;
      source.healthScore = Math.max(0, source.healthScore - 10);
    }
    
    // 更新可靠性评分
    const successRate = source.metrics.totalRequests > 0 ?
      source.metrics.successfulRequests / source.metrics.totalRequests : 0.5;
    source.reliability = successRate;
  }
  
  /**
   * 记录数据源指标
   */
  private recordDataSourceMetrics(sourceId: string, success: boolean, requestTime: number): void {
    const source = this.dataSources.get(sourceId);
    if (!source) return;
    
    source.metrics.totalRequests++;
    if (success) {
      source.metrics.successfulRequests++;
      source.consecutiveFailures = 0;
    } else {
      source.consecutiveFailures++;
    }
    
    // 更新平均响应时间
    const responseTime = Date.now() - requestTime;
    source.metrics.avgResponseTime = 
      (source.metrics.avgResponseTime + responseTime) / 2;
    
    source.metrics.lastMetricsUpdate = Date.now();
  }
  
  /**
   * 处理数据源故障
   */
  private async handleDataSourceFailure(sourceId: string, error: Error): Promise<void> {
    const source = this.dataSources.get(sourceId);
    if (!source) return;
    
    source.lastError = error.message;
    source.consecutiveFailures++;
    
    // 如果连续失败次数过多，临时禁用数据源
    if (source.consecutiveFailures >= source.maxRetries) {
      console.warn(`Temporarily disabling ${sourceId} due to consecutive failures`);
      this.disableSourceTemporarily(sourceId, source.cooldownPeriod);
    }
    
    // 降低健康评分
    source.healthScore = Math.max(0, source.healthScore - 15);
  }
  
  /**
   * 检查数据源是否在冷却期
   */
  private isSourceInCooldown(sourceId: string): boolean {
    const source = this.dataSources.get(sourceId);
    if (!source || source.enabled) return false;
    
    const timeSinceLastFailure = Date.now() - (source.lastSuccessTime || 0);
    return timeSinceLastFailure < source.cooldownPeriod;
  }
  
  /**
   * 检查数据源速率限制
   */
  private checkSourceRateLimit(sourceId: string): boolean {
    const source = this.dataSources.get(sourceId);
    if (!source) return false;
    
    const now = Date.now();
    
    // 重置计数器如果需要
    if (now >= source.rateLimit.resetTime) {
      source.rateLimit.currentCount = 0;
      source.rateLimit.resetTime = now + 1000; // 下一秒重置
    }
    
    // 检查是否超出限制
    if (source.rateLimit.currentCount >= source.rateLimit.requestsPerSecond) {
      return false;
    }
    
    source.rateLimit.currentCount++;
    return true;
  }
  
  /**
   * 更新延迟指标
   */
  private updateSourceLatency(sourceId: string, latency: number): void {
    const source = this.dataSources.get(sourceId);
    if (source) {
      source.latency = (source.latency + latency) / 2;
    }
  }
  
  /**
   * 更新健康评分
   */
  private updateHealthScores(): void {
    this.dataSources.forEach(source => {
      // 基于最近的表现调整健康评分
      const timeSinceUpdate = Date.now() - source.metrics.lastMetricsUpdate;
      
      if (timeSinceUpdate > 60000) { // 1分钟没有活动
        source.healthScore = Math.max(0, source.healthScore - 1);
      }
      
      // 基于连续失败次数调整
      if (source.consecutiveFailures > 0) {
        source.healthScore = Math.max(0, source.healthScore - source.consecutiveFailures);
      }
    });
  }
  
  /**
   * 重置速率限制计数器
   */
  private resetRateLimitCounters(): void {
    const now = Date.now();
    this.dataSources.forEach(source => {
      if (now >= source.rateLimit.resetTime) {
        source.rateLimit.currentCount = 0;
        source.rateLimit.resetTime = now + 1000;
      }
    });
  }
  
  /**
   * 清理数据源选择缓存
   */
  private clearSourceSelectionCache(): void {
    this.sourceSelectionCache.clear();
  }
  
  /**
   * 获取数据源性能报告
   */
  getDataSourcePerformanceReport(): Array<{
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    healthScore: number;
    reliability: number;
    latency: number;
    consecutiveFailures: number;
    totalRequests: number;
    successRate: string;
    lastError?: string;
  }> {
    return Array.from(this.dataSources.values()).map(source => ({
      id: source.id,
      name: source.name,
      type: source.type,
      enabled: source.enabled,
      healthScore: source.healthScore,
      reliability: source.reliability,
      latency: Math.round(source.latency),
      consecutiveFailures: source.consecutiveFailures,
      totalRequests: source.metrics.totalRequests,
      successRate: source.metrics.totalRequests > 0 ?
        `${((source.metrics.successfulRequests / source.metrics.totalRequests) * 100).toFixed(1)}%` :
        'N/A',
      lastError: source.lastError
    }));
  }
  
  // ============================================================================
  // 基准指数数据方法
  // ============================================================================
  
  /**
   * 获取指数实时数据
   * @param symbols 指数代码数组
   * @returns 指数数据
   */
  async getIndexQuotes(symbols: string[]): Promise<Record<string, IndexData>> {
    try {
      // 检查缓存
      const result: Record<string, IndexData> = {};
      const uncachedSymbols: string[] = [];
      
      for (const symbol of symbols) {
        const standardSymbol = this.standardizeIndexSymbol(symbol);
        const cached = this.getIndexFromCache(standardSymbol);
        if (cached) {
          result[symbol] = cached;
        } else {
          uncachedSymbols.push(standardSymbol);
        }
      }
      
      // 如果都在缓存中，直接返回
      if (uncachedSymbols.length === 0) {
        return result;
      }
      
      // 请求未缓存的数据
      const response = await fetch(`${this.baseURL}/api/v1/market/index/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols: uncachedSymbols }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiResult: IndexQuoteResponse = await response.json();
      
      if (apiResult.success && apiResult.data) {
        // 处理返回数据
        apiResult.data.forEach((indexData) => {
          // 缓存数据
          this.setIndexToCache(indexData.symbol, indexData);
          // 添加到结果
          const originalSymbol = symbols.find(s => 
            this.standardizeIndexSymbol(s) === indexData.symbol
          ) || indexData.symbol;
          result[originalSymbol] = indexData;
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching index quotes:', error);
      return {};
    }
  }
  
  /**
   * 获取指数历史数据
   * @param request 历史数据请求
   * @returns 指数历史数据
   */
  async getIndexHistoricalData(request: IndexHistoricalRequest): Promise<OHLCV[]> {
    try {
      const standardSymbol = this.standardizeIndexSymbol(request.symbol);
      
      const response = await fetch(`${this.baseURL}/api/v1/market/index/historical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: standardSymbol,
          start_date: request.startDate,
          end_date: request.endDate,
          period: request.period || 'daily',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // 转换为OHLCV格式
        return result.data.map((item: any) => ({
          timestamp: new Date(item.date).getTime(),
          open: parseFloat(item.open) || 0,
          high: parseFloat(item.high) || 0,
          low: parseFloat(item.low) || 0,
          close: parseFloat(item.close) || 0,
          volume: parseFloat(item.volume) || 0,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching index historical data:', error);
      return [];
    }
  }
  
  /**
   * 计算基准比较数据
   * @param stockSymbol 股票代码
   * @param timeFrame 时间框架
   * @param stockReturn 股票收益率
   * @returns 基准比较结果
   */
  async calculateBenchmarkComparison(
    stockSymbol: string,
    timeFrame: string,
    stockReturn: number
  ): Promise<BenchmarkComparison> {
    try {
      // 获取主要指数数据
      const indexSymbols = ['000300.SH', '000905.SH']; // 沪深300, 中证500
      const indexQuotes = await this.getIndexQuotes(indexSymbols);
      
      // 计算指数收益率（这里简化处理，实际需要根据时间框架计算）
      const hs300Data = indexQuotes['000300.SH'];
      const csi500Data = indexQuotes['000905.SH'];
      
      // 模拟收益率计算（实际应该基于历史数据）
      const hs300Return = this.getSimulatedIndexReturn(timeFrame, 'hs300');
      const csi500Return = this.getSimulatedIndexReturn(timeFrame, 'csi500');
      
      return {
        timeFrame,
        stockReturn,
        benchmarks: {
          hs300: {
            symbol: '000300.SH',
            return: hs300Return,
            returnPercent: this.formatPercent(hs300Return),
            outperform: stockReturn > hs300Return,
          },
          csi500: {
            symbol: '000905.SH',
            return: csi500Return,
            returnPercent: this.formatPercent(csi500Return),
            outperform: stockReturn > csi500Return,
          },
        },
      };
    } catch (error) {
      console.error('Error calculating benchmark comparison:', error);
      // 返回默认值
      return {
        timeFrame,
        stockReturn,
        benchmarks: {
          hs300: {
            symbol: '000300.SH',
            return: 0,
            returnPercent: '+0.00%',
            outperform: stockReturn > 0,
          },
          csi500: {
            symbol: '000905.SH',
            return: 0,
            returnPercent: '+0.00%',
            outperform: stockReturn > 0,
          },
        },
      };
    }
  }
  
  /**
   * 获取多个时间框架的基准比较数据
   * @param stockSymbol 股票代码
   * @param stockReturns 股票各时间框架收益率
   * @returns 各时间框架的基准比较
   */
  async getBenchmarkComparisonBatch(
    stockSymbol: string,
    stockReturns: Record<string, number>
  ): Promise<Record<string, BenchmarkComparison>> {
    const results: Record<string, BenchmarkComparison> = {};
    
    for (const [timeFrame, stockReturn] of Object.entries(stockReturns)) {
      results[timeFrame] = await this.calculateBenchmarkComparison(
        stockSymbol,
        timeFrame,
        stockReturn
      );
    }
    
    return results;
  }
  
  // ============================================================================
  // 辅助方法
  // ============================================================================
  
  /**
   * 标准化指数代码
   */
  private standardizeIndexSymbol(symbol: string): string {
    // 如果是简化名称，转换为标准代码
    return this.MAJOR_INDICES[symbol as keyof typeof this.MAJOR_INDICES] || symbol;
  }
  
  /**
   * 从缓存获取指数数据
   */
  private getIndexFromCache(symbol: string): IndexData | null {
    const cached = this.indexCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.INDEX_CACHE_TTL) {
      return cached.data;
    }
    if (cached) {
      this.indexCache.delete(symbol); // 清理过期缓存
    }
    return null;
  }
  
  /**
   * 将指数数据存入缓存
   */
  private setIndexToCache(symbol: string, data: IndexData): void {
    this.indexCache.set(symbol, {
      data,
      timestamp: Date.now(),
    });
  }
  
  /**
   * 获取模拟指数收益率（临时方法，实际应该使用真实数据计算）
   */
  private getSimulatedIndexReturn(timeFrame: string, indexType: 'hs300' | 'csi500'): number {
    // 模拟数据，实际应该从历史数据计算
    const baseReturns = {
      'hs300': {
        '1天': 0.0015,
        '5天': -0.0042,
        '1月': 0.0067,
        '6月': 0.1285,
        '年至今': 0.1423,
        '1年': 0.1167,
        '5年': 0.6542,
        '全部': 0.8976
      },
      'csi500': {
        '1天': -0.0008,
        '5天': -0.0051,
        '1月': 0.0091,
        '6月': 0.1376,
        '年至今': 0.1502,
        '1年': 0.1085,
        '5年': 0.7218,
        '全部': 1.1234
      }
    };
    
    return baseReturns[indexType][timeFrame as keyof typeof baseReturns.hs300] || 0;
  }
  
  /**
   * 格式化百分比
   */
  private formatPercent(value: number): string {
    const percent = value * 100;
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }
    
    this.sourceSelectionCache.clear();
    this.requestQueue.clear();
    this.rateLimiter.clear();
    
    console.log('MarketDataProvider cleaned up');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let marketDataProviderInstance: MarketDataProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (!marketDataProviderInstance) {
    marketDataProviderInstance = new MarketDataProvider();
  }
  return marketDataProviderInstance;
}

// ============================================================================
// React Hooks
// ============================================================================

import { useState, useEffect } from 'react';

export interface UseQuotesOptions {
  refreshInterval?: number;   // 刷新间隔（毫秒）
  enableRealtime?: boolean;   // 是否启用实时更新
  fields?: string[];          // 需要的字段
  cache?: boolean;            // 是否使用缓存
}

/**
 * Hook: 获取实时行情
 */
export function useQuotes(symbols: string[], options: UseQuotesOptions = {}) {
  const {
    refreshInterval = 5000,
    enableRealtime = true,
    cache = true
  } = options;

  const [data, setData] = useState<Record<string, QuoteData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    if (symbols.length === 0) {
      setData({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    let refreshTimer: NodeJS.Timeout | null = null;
    let unsubscribe: (() => void) | null = null;

    const fetchQuotes = async () => {
      if (cancelled) return;

      try {
        setError(null);
        const provider = getMarketDataProvider();
        const quotesMap = await provider.getQuotes(symbols);
        
        if (!cancelled) {
          const quotesObject: Record<string, QuoteData> = {};
          quotesMap.forEach((quote, symbol) => {
            quotesObject[symbol] = quote;
          });
          
          setData(quotesObject);
          setLoading(false);
          setLastUpdate(Date.now());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch quotes');
          setLoading(false);
        }
      }
    };

    // 初始获取
    fetchQuotes();

    // 设置定时刷新
    if (refreshInterval > 0) {
      refreshTimer = setInterval(fetchQuotes, refreshInterval);
    }

    // 订阅实时更新
    if (enableRealtime) {
      const provider = getMarketDataProvider();
      unsubscribe = provider.subscribeRealtime(symbols, (marketData) => {
        if (!cancelled) {
          setData(prev => ({
            ...prev,
            [marketData.symbol]: {
              ...prev[marketData.symbol],
              ...marketData,
              // 保留其他字段
              marketCap: prev[marketData.symbol]?.marketCap,
              pe: prev[marketData.symbol]?.pe,
              pb: prev[marketData.symbol]?.pb,
              turnoverRate: prev[marketData.symbol]?.turnoverRate,
              amplitude: prev[marketData.symbol]?.amplitude,
              vwap: prev[marketData.symbol]?.vwap,
              bid1: prev[marketData.symbol]?.bid1,
              ask1: prev[marketData.symbol]?.ask1,
            }
          }));
          setLastUpdate(Date.now());
        }
      });
    }

    return () => {
      cancelled = true;
      if (refreshTimer) clearInterval(refreshTimer);
      if (unsubscribe) unsubscribe();
    };
  }, [symbols.join(','), refreshInterval, enableRealtime]);

  return { 
    data, 
    loading, 
    error, 
    lastUpdate,
    refresh: () => {
      setLoading(true);
      // 触发重新获取
    }
  };
}

/**
 * Hook: 搜索股票
 */
export function useStockSearch(query: string, limit: number = 20) {
  const [results, setResults] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const search = async () => {
      const provider = getMarketDataProvider();
      const data = await provider.searchStocks(query, limit);
      
      if (!cancelled) {
        setResults(data);
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(search, 300); // 防抖

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query, limit]);

  return { results, loading };
}

export default MarketDataProvider;
