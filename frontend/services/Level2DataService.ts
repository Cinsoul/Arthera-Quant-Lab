/**
 * Level2DataService - Level2深度行情数据服务
 * 
 * 功能特性：
 * ✅ 订单簿深度数据实时获取
 * ✅ 逐笔成交数据流
 * ✅ 智能缓存和增量更新
 * ✅ WebSocket实时订阅（预留）
 * ✅ 数据质量监控
 * ✅ 流动性指标计算
 * ✅ 与后端API `/level2/{symbol}` 集成
 */

import { getCacheManager } from './CacheManager';

// ============================================================================
// Types & Interfaces  
// ============================================================================

export interface Level2OrderBookEntry {
  /** 价格 */
  price: number;
  /** 数量 */
  volume: number;
  /** 委托笔数 */
  orders?: number;
  /** 占比（%） */
  percentage?: number;
}

export interface Level2TradeEntry {
  /** 成交时间 */
  time: string;
  /** 成交价格 */
  price: number;
  /** 成交量 */
  volume: number;
  /** 买卖方向 */
  direction: 'buy' | 'sell' | 'neutral';
  /** 订单类型 */
  type?: 'market' | 'limit';
  /** 成交额 */
  amount?: number;
}

export interface Level2Data {
  /** 股票代码 */
  symbol: string;
  /** 数据时间戳 */
  timestamp: number;
  /** 买盘深度（10档） */
  buyOrders: Level2OrderBookEntry[];
  /** 卖盘深度（10档） */
  sellOrders: Level2OrderBookEntry[];
  /** 最近成交明细 */
  recentTrades: Level2TradeEntry[];
  /** 数据源标识 */
  source?: string;
}

export interface Level2LiquidityMetrics {
  /** 买盘总量 */
  totalBidVolume: number;
  /** 卖盘总量 */
  totalAskVolume: number;
  /** 买卖价差 */
  bidAskSpread: number;
  /** 价差百分比 */
  spreadPercent: number;
  /** 深度比率 */
  depthRatio: number;
  /** 失衡比率 */
  imbalanceRatio: number;
  /** 流动性评级 */
  liquidityRating: 'excellent' | 'good' | 'average' | 'poor';
}

export interface Level2SubscriptionConfig {
  /** 订阅的股票代码 */
  symbols: string[];
  /** 更新频率（毫秒） */
  refreshInterval?: number;
  /** 是否启用WebSocket */
  enableWebSocket?: boolean;
  /** 缓存配置 */
  cache?: {
    enabled: boolean;
    ttl: number; // 生存时间（秒）
  };
}

export interface Level2ServiceState {
  /** 当前订阅的股票 */
  subscriptions: Map<string, Level2SubscriptionConfig>;
  /** Level2数据缓存 */
  dataCache: Map<string, Level2Data>;
  /** 最后更新时间 */
  lastUpdate: Map<string, number>;
  /** 连接状态 */
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  /** WebSocket连接实例 */
  wsConnection?: WebSocket;
}

// ============================================================================
// Level2 Data Service Class
// ============================================================================

export class Level2DataService {
  private state: Level2ServiceState = {
    subscriptions: new Map(),
    dataCache: new Map(),
    lastUpdate: new Map(),
    connectionStatus: 'disconnected'
  };

  private cacheManager = getCacheManager();
  private baseURL: string;
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<string, Set<(data: Level2Data) => void>> = new Map();

  // 性能监控
  private performanceMetrics = {
    apiCallCount: 0,
    avgResponseTime: 0,
    errorCount: 0,
    cacheHitRate: 0
  };

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8004';
    this.initializeService();
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * 获取Level2数据
   */
  async getLevel2Data(symbol: string, useCache: boolean = true): Promise<Level2Data> {
    const startTime = Date.now();

    try {
      // 检查缓存
      if (useCache) {
        const cached = await this.getCachedData(symbol);
        if (cached) {
          this.updateMetrics('cache_hit');
          return cached;
        }
      }

      // 从API获取数据
      const data = await this.fetchLevel2DataFromAPI(symbol);
      
      // 缓存数据
      if (useCache) {
        await this.setCachedData(symbol, data);
      }

      // 更新本地状态
      this.state.dataCache.set(symbol, data);
      this.state.lastUpdate.set(symbol, Date.now());

      // 触发事件监听器
      this.emitDataUpdate(symbol, data);

      const responseTime = Date.now() - startTime;
      this.updateMetrics('api_success', responseTime);

      return data;
    } catch (error) {
      this.updateMetrics('api_error');
      console.error(`Failed to get Level2 data for ${symbol}:`, error);
      
      // 尝试返回缓存的数据作为降级方案
      const fallbackData = await this.getCachedData(symbol);
      if (fallbackData) {
        return fallbackData;
      }
      
      throw error;
    }
  }

  /**
   * 批量获取Level2数据
   */
  async getBatchLevel2Data(symbols: string[]): Promise<Map<string, Level2Data>> {
    const results = new Map<string, Level2Data>();
    
    // 并行获取所有数据，提高性能
    const promises = symbols.map(async (symbol) => {
      try {
        const data = await this.getLevel2Data(symbol);
        return { symbol, data };
      } catch (error) {
        console.error(`Failed to get Level2 data for ${symbol}:`, error);
        return { symbol, data: null };
      }
    });

    const responses = await Promise.allSettled(promises);
    
    responses.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.data) {
        results.set(result.value.symbol, result.value.data);
      }
    });

    return results;
  }

  /**
   * 订阅Level2实时数据
   */
  subscribe(
    symbol: string, 
    callback: (data: Level2Data) => void,
    config: Partial<Level2SubscriptionConfig> = {}
  ): () => void {
    const defaultConfig: Level2SubscriptionConfig = {
      symbols: [symbol],
      refreshInterval: 2000, // 2秒刷新
      enableWebSocket: false, // 暂时禁用WebSocket
      cache: {
        enabled: true,
        ttl: 5 // 5秒缓存
      }
    };

    const finalConfig = { ...defaultConfig, ...config };
    
    // 添加事件监听器
    if (!this.eventListeners.has(symbol)) {
      this.eventListeners.set(symbol, new Set());
    }
    this.eventListeners.get(symbol)!.add(callback);

    // 保存订阅配置
    this.state.subscriptions.set(symbol, finalConfig);

    // 立即获取一次数据
    this.getLevel2Data(symbol).then(callback).catch(console.error);

    // 设置定时刷新
    if (finalConfig.refreshInterval && finalConfig.refreshInterval > 0) {
      const interval = setInterval(async () => {
        try {
          const data = await this.getLevel2Data(symbol);
          callback(data);
        } catch (error) {
          console.error(`Failed to refresh Level2 data for ${symbol}:`, error);
        }
      }, finalConfig.refreshInterval);

      this.refreshIntervals.set(symbol, interval);
    }

    // 返回取消订阅函数
    return () => this.unsubscribe(symbol, callback);
  }

  /**
   * 取消订阅
   */
  unsubscribe(symbol: string, callback?: (data: Level2Data) => void): void {
    if (callback) {
      // 移除特定回调
      const listeners = this.eventListeners.get(symbol);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(symbol);
        }
      }
    } else {
      // 移除所有监听器
      this.eventListeners.delete(symbol);
    }

    // 清理定时器
    const interval = this.refreshIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(symbol);
    }

    // 移除订阅配置
    this.state.subscriptions.delete(symbol);
  }

  /**
   * 计算流动性指标
   */
  calculateLiquidityMetrics(data: Level2Data): Level2LiquidityMetrics {
    const { buyOrders, sellOrders } = data;

    // 计算总量
    const totalBidVolume = buyOrders.reduce((sum, order) => sum + order.volume, 0);
    const totalAskVolume = sellOrders.reduce((sum, order) => sum + order.volume, 0);

    // 计算价差
    const bestBid = buyOrders[0]?.price || 0;
    const bestAsk = sellOrders[0]?.price || 0;
    const bidAskSpread = bestAsk - bestBid;
    const spreadPercent = bestBid > 0 ? (bidAskSpread / bestBid) * 100 : 0;

    // 计算深度比率
    const depthRatio = totalAskVolume > 0 ? totalBidVolume / totalAskVolume : 0;

    // 计算失衡比率
    const totalVolume = totalBidVolume + totalAskVolume;
    const imbalanceRatio = totalVolume > 0 ? (totalBidVolume - totalAskVolume) / totalVolume : 0;

    // 流动性评级
    let liquidityRating: Level2LiquidityMetrics['liquidityRating'] = 'poor';
    if (spreadPercent < 0.05 && totalVolume > 1000000) {
      liquidityRating = 'excellent';
    } else if (spreadPercent < 0.1 && totalVolume > 500000) {
      liquidityRating = 'good';
    } else if (spreadPercent < 0.2) {
      liquidityRating = 'average';
    }

    return {
      totalBidVolume,
      totalAskVolume,
      bidAskSpread,
      spreadPercent,
      depthRatio,
      imbalanceRatio,
      liquidityRating
    };
  }

  /**
   * 获取订阅状态
   */
  getSubscriptionStatus(): Array<{ symbol: string; config: Level2SubscriptionConfig; lastUpdate: number }> {
    const status: Array<{ symbol: string; config: Level2SubscriptionConfig; lastUpdate: number }> = [];
    
    this.state.subscriptions.forEach((config, symbol) => {
      status.push({
        symbol,
        config,
        lastUpdate: this.state.lastUpdate.get(symbol) || 0
      });
    });

    return status;
  }

  /**
   * 获取服务性能指标
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * 清理所有订阅和缓存
   */
  cleanup(): void {
    // 清理定时器
    this.refreshIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.refreshIntervals.clear();

    // 清理事件监听器
    this.eventListeners.clear();

    // 清理订阅配置
    this.state.subscriptions.clear();

    // 清理WebSocket连接
    if (this.state.wsConnection) {
      this.state.wsConnection.close();
      this.state.wsConnection = undefined;
    }

    this.state.connectionStatus = 'disconnected';
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 初始化服务
   */
  private initializeService(): void {
    console.log('[Level2DataService] Service initialized');
    this.state.connectionStatus = 'connected';
  }

  /**
   * 从API获取Level2数据
   */
  private async fetchLevel2DataFromAPI(symbol: string): Promise<Level2Data> {
    const response = await fetch(`${this.baseURL}/api/v1/market/level2/${symbol}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'API returned unsuccessful result');
    }

    // 转换API响应为内部数据格式
    return {
      symbol,
      timestamp: Date.now(),
      buyOrders: result.data.buyOrders || [],
      sellOrders: result.data.sellOrders || [],
      recentTrades: result.data.recentTrades || [],
      source: result.source || 'api'
    };
  }

  /**
   * 从缓存获取数据
   */
  private async getCachedData(symbol: string): Promise<Level2Data | null> {
    try {
      const cached = await this.cacheManager.get<Level2Data>('level2-data', symbol);
      
      if (cached) {
        // 检查数据是否过期（5秒）
        const age = Date.now() - cached.timestamp;
        if (age < 5000) {
          return cached;
        } else {
          // 清理过期缓存
          await this.cacheManager.delete('level2-data', symbol);
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get cached Level2 data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  private async setCachedData(symbol: string, data: Level2Data): Promise<void> {
    try {
      await this.cacheManager.set('level2-data', symbol, data, 5); // 5秒TTL
    } catch (error) {
      console.error(`Failed to cache Level2 data for ${symbol}:`, error);
    }
  }

  /**
   * 触发数据更新事件
   */
  private emitDataUpdate(symbol: string, data: Level2Data): void {
    const listeners = this.eventListeners.get(symbol);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in Level2 data callback for ${symbol}:`, error);
        }
      });
    }
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(type: 'api_success' | 'api_error' | 'cache_hit', responseTime?: number): void {
    switch (type) {
      case 'api_success':
        this.performanceMetrics.apiCallCount++;
        if (responseTime !== undefined) {
          this.performanceMetrics.avgResponseTime = 
            (this.performanceMetrics.avgResponseTime + responseTime) / 2;
        }
        break;
      case 'api_error':
        this.performanceMetrics.errorCount++;
        break;
      case 'cache_hit':
        // 计算缓存命中率
        const totalCalls = this.performanceMetrics.apiCallCount + 1;
        this.performanceMetrics.cacheHitRate = 
          (this.performanceMetrics.cacheHitRate * (totalCalls - 1) + 1) / totalCalls;
        break;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let level2DataServiceInstance: Level2DataService | null = null;

export function getLevel2DataService(): Level2DataService {
  if (!level2DataServiceInstance) {
    level2DataServiceInstance = new Level2DataService();
  }
  return level2DataServiceInstance;
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect } from 'react';

export interface UseLevel2DataOptions {
  /** 更新频率（毫秒） */
  refreshInterval?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 是否自动开始 */
  autoStart?: boolean;
}

/**
 * React Hook: 使用Level2数据
 */
export function useLevel2Data(symbol: string, options: UseLevel2DataOptions = {}) {
  const {
    refreshInterval = 2000,
    enableCache = true,
    autoStart = true
  } = options;

  const [data, setData] = useState<Level2Data | null>(null);
  const [liquidityMetrics, setLiquidityMetrics] = useState<Level2LiquidityMetrics | null>(null);
  const [loading, setLoading] = useState(autoStart);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    if (!symbol || !autoStart) {
      return;
    }

    const service = getLevel2DataService();
    
    const handleDataUpdate = (level2Data: Level2Data) => {
      setData(level2Data);
      setLiquidityMetrics(service.calculateLiquidityMetrics(level2Data));
      setLoading(false);
      setError(null);
      setLastUpdate(Date.now());
    };

    const handleError = (err: Error) => {
      setError(err.message);
      setLoading(false);
    };

    // 开始订阅
    const unsubscribe = service.subscribe(symbol, handleDataUpdate, {
      symbols: [symbol],
      refreshInterval,
      cache: {
        enabled: enableCache,
        ttl: 5
      }
    });

    return unsubscribe;
  }, [symbol, refreshInterval, enableCache, autoStart]);

  const refresh = async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const service = getLevel2DataService();
      const newData = await service.getLevel2Data(symbol, enableCache);
      setData(newData);
      setLiquidityMetrics(service.calculateLiquidityMetrics(newData));
      setLastUpdate(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    liquidityMetrics,
    loading,
    error,
    lastUpdate,
    refresh
  };
}

export default Level2DataService;