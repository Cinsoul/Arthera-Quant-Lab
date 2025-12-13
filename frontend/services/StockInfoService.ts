/**
 * 股票信息服务 - 与后端AkShare服务集成
 * 获取真实的股票基本信息、上市时间等数据
 */

import { getEnvVar } from '../utils/env';

// ============================================================================
// Types
// ============================================================================

export interface StockBasicInfo {
  symbol: string;
  name: string;
  list_date: string;
  industry?: string;
  sector?: string;
  listing_price?: string;
  market?: string;
  total_shares?: string;
  market_cap?: string;
  pe_ratio?: string;
  pb_ratio?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  source?: string;
}

export interface TimeRangeCalculation {
  symbol: string;
  startTime: number;
  endTime: number;
  totalReturn: string;
  totalVolume: string;
  volatility: string;
  listingPrice: number;
  currentPrice: number;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  sector: string;
  market: string;
  price: number;
  change_percent: number;
}

export interface StockSearchResponse {
  success: boolean;
  keyword: string;
  data: StockSearchResult[];
  total_count: number;
  error?: string;
}

export interface StockListResult {
  symbol: string;
  name: string;
  sector: string;
  market: string;
  price: number;
  change_percent: number;
}

export interface StockListResponse {
  success: boolean;
  market: string;
  data: StockListResult[];
  total_count: number;
  error?: string;
}

// ============================================================================
// Stock Info Service
// ============================================================================

export class StockInfoService {
  private baseURL: string;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private initialized = false;
  private lastInitOptions: { enableRealData?: boolean; enableAkShare?: boolean } | null = null;
  private offlineMode = false;
  private readonly fallbackBasicInfo: Record<string, StockBasicInfo> = {
    '600519': { symbol: '600519', name: '贵州茅台', list_date: '2001-08-27', industry: '白酒', sector: '食品饮料', market: 'SH', listing_price: '31.39' },
    '300750': { symbol: '300750', name: '宁德时代', list_date: '2018-06-11', industry: '电池', sector: '电力设备', market: 'SZ', listing_price: '25.14' },
    '000858': { symbol: '000858', name: '五粮液', list_date: '1998-04-27', industry: '白酒', sector: '食品饮料', market: 'SZ', listing_price: '8.31' },
    '600036': { symbol: '600036', name: '招商银行', list_date: '2002-04-09', industry: '银行', sector: '金融', market: 'SH', listing_price: '6.99' },
    '002594': { symbol: '002594', name: '比亚迪', list_date: '2011-06-30', industry: '汽车', sector: '新能源', market: 'SZ', listing_price: '18.00' },
    '601318': { symbol: '601318', name: '中国平安', list_date: '2007-03-01', industry: '保险', sector: '金融', market: 'SH', listing_price: '33.80' },
    '000333': { symbol: '000333', name: '美的集团', list_date: '2013-09-18', industry: '家电', sector: '制造业', market: 'SZ', listing_price: '13.50' },
    '600276': { symbol: '600276', name: '恒瑞医药', list_date: '2000-10-18', industry: '医药', sector: '生物医药', market: 'SH', listing_price: '10.50' },
  };

  constructor() {
    const envValue = getEnvVar('VITE_API_BASE_URL', 'REACT_APP_API_URL');
    if (envValue) {
      this.baseURL = envValue.replace(/\/$/, '');
    } else if (typeof window !== 'undefined') {
      this.baseURL = window.location.origin;
    } else {
      this.baseURL = '';
    }
    if (!this.baseURL) {
      this.offlineMode = true;
    }
  }

  private enableOfflineMode(reason?: string) {
    if (!this.offlineMode) {
      this.offlineMode = true;
      const details = reason ? `: ${reason}` : '';
      console.warn(`⚠️ [StockInfo] Switching to offline mode${details}`);
    }
  }

  private isRealModeEnabled(): boolean {
    if (this.offlineMode) {
      return false;
    }
    if (typeof window !== 'undefined' && window.__ARTHERA_REAL_MODE__ === false) {
      return false;
    }
    return !!this.baseURL;
  }

  private getFallbackBasicInfo(symbol: string): StockBasicInfo {
    if (!(symbol in this.fallbackBasicInfo)) {
      this.fallbackBasicInfo[symbol] = {
        symbol,
        name: symbol,
        list_date: '2010-01-01',
        market: symbol.startsWith('6') ? 'SH' : 'SZ'
      };
    }
    return this.fallbackBasicInfo[symbol];
  }

  async initialize(options: { enableRealData?: boolean; enableAkShare?: boolean } = {}) {
    if (this.initialized) {
      this.lastInitOptions = { ...options };
      return { healthy: true, initialized: true, cached: true };
    }

    try {
      console.log('📚 [StockInfo] Initializing stock info service...');

      // 如果没有可用的后端URL，继续使用本地模拟模式
      if (!this.baseURL) {
        console.warn('⚠️ [StockInfo] No API base URL configured, running in offline mode');
      }

      // 预加载缓存结构，避免后续调用报错
      this.cache.clear();

      this.initialized = true;
      this.lastInitOptions = { ...options };

      return { healthy: true, initialized: true };
    } catch (error) {
      console.error('❌ [StockInfo] Initialization failed:', error);
      return {
        healthy: false,
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private buildUrl(path: string): string {
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    return this.baseURL ? `${this.baseURL}${path}` : path;
  }

  /**
   * 获取股票基本信息
   */
  async getStockBasicInfo(symbol: string): Promise<StockBasicInfo | null> {
    const cached = this.getFromCache(`basic_info_${symbol}`);
    if (cached) {
      return cached;
    }

    if (!this.isRealModeEnabled()) {
      const fallback = this.getFallbackBasicInfo(symbol);
      this.setToCache(`basic_info_${symbol}`, fallback, 3600000);
      return fallback;
    }

    try {
      const response = await fetch(this.buildUrl(`/api/v1/market/stock_basic_info/${symbol}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<StockBasicInfo> = await response.json();
      
      if (result.success && result.data) {
        this.setToCache(`basic_info_${symbol}`, result.data, 3600000);
        return result.data;
      }

      return this.getFallbackBasicInfo(symbol);
    } catch (error) {
      this.enableOfflineMode(error instanceof Error ? error.message : 'network error');
      const fallback = this.getFallbackBasicInfo(symbol);
      this.setToCache(`basic_info_${symbol}`, fallback, 3600000);
      return fallback;
    }
  }

  /**
   * 批量获取股票基本信息
   */
  async getBatchStockBasicInfo(symbols: string[]): Promise<Map<string, StockBasicInfo>> {
    const results = new Map<string, StockBasicInfo>();
    const uncachedSymbols: string[] = [];

    for (const symbol of symbols) {
      const cached = this.getFromCache(`basic_info_${symbol}`);
      if (cached) {
        results.set(symbol, cached);
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    if (uncachedSymbols.length === 0) {
      return results;
    }

    if (!this.isRealModeEnabled()) {
      uncachedSymbols.forEach(symbol => {
        const fallback = this.getFallbackBasicInfo(symbol);
        this.setToCache(`basic_info_${symbol}`, fallback, 3600000);
        results.set(symbol, fallback);
      });
      return results;
    }

    try {
      const response = await fetch(this.buildUrl('/api/v1/market/stock_basic_info_batch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uncachedSymbols),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<Record<string, StockBasicInfo>> = await response.json();
      
      if (result.success && result.data) {
        Object.entries(result.data).forEach(([symbol, info]) => {
          if (info && typeof info === 'object' && 'symbol' in info) {
            results.set(symbol, info);
            this.setToCache(`basic_info_${symbol}`, info, 3600000);
          }
        });
      }

      return results;
    } catch (error) {
      this.enableOfflineMode(error instanceof Error ? error.message : 'network error');
      uncachedSymbols.forEach(symbol => {
        const fallback = this.getFallbackBasicInfo(symbol);
        this.setToCache(`basic_info_${symbol}`, fallback, 3600000);
        results.set(symbol, fallback);
      });
      return results;
    }
  }

  /**
   * 获取股票上市时间
   */
  async getStockListingDate(symbol: string): Promise<Date | null> {
    try {
      const basicInfo = await this.getStockBasicInfo(symbol);
      if (basicInfo && basicInfo.list_date) {
        return new Date(basicInfo.list_date);
      }
    } catch (error) {
      console.error(`Error getting listing date for ${symbol}:`, error);
    }

    const fallback = this.getFallbackBasicInfo(symbol);
    return new Date(fallback.list_date || '2010-01-01');
  }

  /**
   * 计算股票全部时间区域的收益数据
   */
  async calculateAllTimeRangeData(symbol: string): Promise<TimeRangeCalculation | null> {
    try {
      // 获取基本信息
      const basicInfo = await this.getStockBasicInfo(symbol);
      if (!basicInfo || !basicInfo.list_date) {
        return null;
      }

      // 获取历史数据 (这里应该调用历史数据API)
      const historicalData = await this.getHistoricalPriceData(symbol, basicInfo.list_date);
      if (!historicalData) {
        return null;
      }

      // 计算统计数据
      const listingDate = new Date(basicInfo.list_date);
      const listingPrice = parseFloat(basicInfo.listing_price || '0');
      const currentPrice = historicalData.currentPrice;
      
      const totalReturnPercent = listingPrice > 0 
        ? ((currentPrice - listingPrice) / listingPrice * 100)
        : 0;

      return {
        symbol,
        startTime: listingDate.getTime(),
        endTime: Date.now(),
        totalReturn: totalReturnPercent >= 0 ? `+${totalReturnPercent.toFixed(2)}%` : `${totalReturnPercent.toFixed(2)}%`,
        totalVolume: historicalData.totalVolume,
        volatility: historicalData.volatility,
        listingPrice,
        currentPrice
      };

    } catch (error) {
      console.error(`Error calculating all-time range data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 获取历史价格数据（简化版本，用于计算收益率）
   */
  private async getHistoricalPriceData(symbol: string, startDate: string): Promise<{
    currentPrice: number;
    totalVolume: string;
    volatility: string;
  } | null> {
    try {
      // 这里应该调用真实的历史数据API
      // 目前返回模拟计算结果
      const response = await fetch(`${this.baseURL}/api/v1/market/quote/${symbol}`);
      const quoteResult = await response.json();
      
      if (quoteResult.success && quoteResult.data) {
        const currentPrice = quoteResult.data.price || 0;
        
        // 模拟计算总成交额和波动率
        const listingYears = (Date.now() - new Date(startDate).getTime()) / (365 * 24 * 60 * 60 * 1000);
        const totalVolumeValue = listingYears * 2.1 * 1e12; // 模拟总成交额
        const volatilityValue = Math.min(45, 15 + listingYears * 1.2); // 模拟波动率

        return {
          currentPrice,
          totalVolume: this.formatVolume(totalVolumeValue),
          volatility: `${volatilityValue.toFixed(1)}%`
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching historical price data:', error);
      return null;
    }
  }

  /**
   * 格式化交易量显示
   */
  private formatVolume(volume: number): string {
    if (volume >= 1e12) {
      return `${(volume / 1e12).toFixed(1)}万亿`;
    } else if (volume >= 1e8) {
      return `${(volume / 1e8).toFixed(1)}亿`;
    } else if (volume >= 1e4) {
      return `${(volume / 1e4).toFixed(1)}万`;
    } else {
      return volume.toString();
    }
  }

  /**
   * 缓存管理
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.data as T;
    }
    if (cached) {
      this.cache.delete(key); // 清理过期缓存
    }
    return null;
  }

  private setToCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 清理缓存
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * 搜索股票
   */
  async searchStocks(keyword: string, limit: number = 20): Promise<StockSearchResult[]> {
    try {
      // 检查缓存
      const cacheKey = `search_${keyword}_${limit}`;
      const cached = this.getFromCache<StockSearchResult[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await fetch(`${this.baseURL}/api/v1/market/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: StockSearchResponse = await response.json();
      
      if (result.success) {
        const searchResults = result.data || [];
        // 缓存数据 (30分钟)
        this.setToCache(cacheKey, searchResults, 1800000);
        return searchResults;
      } else {
        console.error(`Stock search failed:`, result.error);
        return [];
      }
    } catch (error) {
      console.error(`Error searching stocks with keyword "${keyword}":`, error);
      return [];
    }
  }

  /**
   * 获取股票列表
   */
  async getStockList(market: 'all' | 'sh' | 'sz' = 'all', limit: number = 100): Promise<StockListResult[]> {
    try {
      // 检查缓存
      const cacheKey = `stock_list_${market}_${limit}`;
      const cached = this.getFromCache<StockListResult[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await fetch(`${this.baseURL}/api/v1/market/stocks/list?market=${market}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: StockListResponse = await response.json();
      
      if (result.success) {
        const stockList = result.data || [];
        // 缓存数据 (2小时)
        this.setToCache(cacheKey, stockList, 7200000);
        return stockList;
      } else {
        console.error(`Get stock list failed:`, result.error);
        return [];
      }
    } catch (error) {
      console.error(`Error getting stock list (market: ${market}):`, error);
      return [];
    }
  }

  /**
   * 获取热门股票列表
   */
  async getPopularStocks(count: number = 20): Promise<StockListResult[]> {
    try {
      // 检查缓存
      const cacheKey = `popular_stocks_${count}`;
      const cached = this.getFromCache<StockListResult[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await fetch(`${this.baseURL}/api/v1/market/stocks/popular?count=${count}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: StockListResponse = await response.json();
      
      if (result.success) {
        const popularStocks = result.data || [];
        // 缓存数据 (30分钟)
        this.setToCache(cacheKey, popularStocks, 1800000);
        return popularStocks;
      } else {
        console.error(`Get popular stocks failed:`, result.error);
        return [];
      }
    } catch (error) {
      console.error(`Error getting popular stocks:`, error);
      return [];
    }
  }

  /**
   * 检查API连接状态
   */
  async checkAPIHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let stockInfoServiceInstance: StockInfoService | null = null;

export function getStockInfoService(): StockInfoService {
  if (!stockInfoServiceInstance) {
    stockInfoServiceInstance = new StockInfoService();
  }
  return stockInfoServiceInstance;
}

// ============================================================================
// React Hooks
// ============================================================================

import { useState, useEffect } from 'react';

/**
 * Hook: 获取股票基本信息
 */
export function useStockBasicInfo(symbol: string) {
  const [data, setData] = useState<StockBasicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const service = getStockInfoService();
        const result = await service.getStockBasicInfo(symbol);

        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return { data, loading, error };
}

/**
 * Hook: 获取股票全时间区域数据
 */
export function useStockAllTimeData(symbol: string) {
  const [data, setData] = useState<TimeRangeCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const service = getStockInfoService();
        const result = await service.calculateAllTimeRangeData(symbol);

        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return { data, loading, error };
}

/**
 * Hook: 股票搜索
 */
export function useStockSearch(keyword: string, limit: number = 20) {
  const [data, setData] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!keyword || keyword.trim().length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const searchStocks = async () => {
      setLoading(true);
      setError(null);

      try {
        const service = getStockInfoService();
        const results = await service.searchStocks(keyword.trim(), limit);

        if (!cancelled) {
          setData(results);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Search failed');
          setData([]);
          setLoading(false);
        }
      }
    };

    // 防抖处理：延迟300ms执行搜索
    const debounceTimer = setTimeout(searchStocks, 300);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [keyword, limit]);

  return { data, loading, error };
}

/**
 * Hook: 获取股票列表
 */
export function useStockList(market: 'all' | 'sh' | 'sz' = 'all', limit: number = 100) {
  const [data, setData] = useState<StockListResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStockList = async () => {
      setLoading(true);
      setError(null);

      try {
        const service = getStockInfoService();
        const results = await service.getStockList(market, limit);

        if (!cancelled) {
          setData(results);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch stock list');
          setData([]);
          setLoading(false);
        }
      }
    };

    fetchStockList();

    return () => {
      cancelled = true;
    };
  }, [market, limit]);

  return { data, loading, error };
}

/**
 * Hook: 获取热门股票列表
 */
export function usePopularStocks(count: number = 20) {
  const [data, setData] = useState<StockListResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPopularStocks = async () => {
      setLoading(true);
      setError(null);

      try {
        const service = getStockInfoService();
        const results = await service.getPopularStocks(count);

        if (!cancelled) {
          setData(results);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch popular stocks');
          setData([]);
          setLoading(false);
        }
      }
    };

    fetchPopularStocks();

    return () => {
      cancelled = true;
    };
  }, [count]);

  return { data, loading, error };
}

export default StockInfoService;
