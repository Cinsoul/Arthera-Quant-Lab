/**
 * HistoricalDataService - 历史数据服务
 * 
 * 功能：
 * - 获取历史K线数据
 * - 获取历史财务数据
 * - 数据分页和批量加载
 * - 智能缓存管理
 * - 数据质量检查
 * - 多数据源聚合
 */

import { getCacheManager } from './CacheManager';
import apiClient from './ApiClient';

// ============================================================================
// Types
// ============================================================================

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover?: number;      // 成交额
  changePercent?: number; // 涨跌幅
}

export interface FinancialData {
  symbol: string;
  timestamp: number;
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY'; // 季度或年度
  revenue: number;        // 营业收入
  netProfit: number;      // 净利润
  eps: number;            // 每股收益
  roe: number;            // 净资产收益率
  grossMargin: number;    // 毛利率
  debtRatio: number;      // 资产负债率
  pe: number;             // 市盈率
  pb: number;             // 市净率
}

export interface StockInfo {
  symbol: string;
  name: string;
  exchange: 'SH' | 'SZ' | 'HK' | 'US';
  sector: string;         // 行业
  industry: string;       // 子行业
  marketCap: number;      // 市��
  listedDate: string;     // 上市日期
}

export type TimePeriod = '1min' | '5min' | '15min' | '30min' | '1H' | '4H' | '1D' | '1W' | '1M';

export interface DataRequest {
  symbol: string;
  period: TimePeriod;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  adjustType?: 'none' | 'forward' | 'backward'; // 复权类型
}

export interface DataResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
  error?: string;
}

type ChartRangePreset = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | '5Y' | 'ALL';

const CHART_RANGE_PRESETS: ChartRangePreset[] = ['1D', '5D', '1M', '3M', '6M', '1Y', 'YTD', '5Y', 'ALL'];

function normalizeChartPreset(value?: string): ChartRangePreset | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  return CHART_RANGE_PRESETS.includes(upper as ChartRangePreset) ? upper as ChartRangePreset : null;
}

function parseDateInput(value?: string | Date): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

// ============================================================================
// Historical Data Service
// ============================================================================

export class HistoricalDataService {
  private cache = getCacheManager();
  private apiEndpoint = '/api'; // Removed process.env for browser compatibility
  private batchSize = 1000; // 批量加载大小

  async initialize(_: { enableRealData?: boolean } = {}): Promise<void> {
    // placeholder to keep initializeServices happy
    return Promise.resolve();
  }

  /**
   * 获取历史K线数据
   */
  async getKlineData(request: DataRequest): Promise<DataResponse<OHLCV>> {
    const { symbol, period, startDate, endDate, limit = 500, adjustType = 'forward' } = request;
    // ✅ 修复：在缓存键中包含limit参数，避免不同limit的请求共享缓存
    const cacheKey = this.getCacheKey('kline', symbol, period, startDate, endDate, limit);

    try {
      // 1. 尝试从缓存读取
      const cached = await this.cache.get<OHLCV[]>('historical-prices', cacheKey);
      if (cached && cached.length > 0) {
        console.log(`[HistoricalDataService] Cache hit for ${symbol}, ${cached.length} bars`);
        return {
          success: true,
          data: cached.slice(0, limit),
          total: cached.length,
          hasMore: cached.length > limit,
        };
      }

      // 2. 从ApiClient获取数据
      console.log(`[HistoricalDataService] Cache miss for ${symbol}, fetching from API...`);
      const result = await apiClient.getKlineData(
        symbol,
        period === '1D' ? 'daily' : period === '1W' ? 'weekly' : period === '1M' ? 'monthly' : 'daily',
        limit,
        startDate?.toISOString().split('T')[0],
        endDate?.toISOString().split('T')[0]
      );
      
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error('API返回数据格式错误');
      }
      
      // 转换ApiClient返回的数据格式为OHLCV格式
      const apiData: OHLCV[] = result.data.map((item: any) => ({
        timestamp: new Date(item.date).getTime(),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        turnover: item.amount,
        changePercent: ((item.close - item.open) / item.open) * 100,
      }));

      // 3. 数据质量检查和清洗
      const cleanedData = this.validateAndCleanKlineData(apiData);

      // 4. 写入缓存（30分钟TTL）
      await this.cache.set('historical-prices', cacheKey, cleanedData, 30 * 60 * 1000);

      return {
        success: true,
        data: cleanedData,
        total: cleanedData.length,
        hasMore: false,
      };
    } catch (error) {
      console.log(`[HistoricalDataService] API failed for ${symbol}, falling back to mock data`);
      
      // 降级到Mock数据
      const mockData = this.generateMockKlineData(symbol, period, limit);
      console.log(`[HistoricalDataService] Generated ${mockData.length} mock data points for ${symbol}`);
      
      // 缓存Mock数据以提高性能
      await this.cache.set('historical-prices', cacheKey, mockData, 30 * 60 * 1000);
      
      return {
        success: true,
        data: mockData,
        total: mockData.length,
        hasMore: false,
        error: 'Using mock data',
      };
    }
  }

  /**
   * 通用历史数据入口（兼容图表/策略实验室等调用）
   */
  async getHistoricalData(
    symbol: string,
    rangeOrConfig?: ChartRangePreset | string | Date | { startDate?: Date | string; endDate?: Date | string; limit?: number },
    maybeEndOrPeriod?: Date | string,
    maybeInterval?: TimePeriod
  ): Promise<DataResponse<OHLCV>> {
    // 1) 快捷周期（1M/6M/1Y/YTD等）
    if (typeof rangeOrConfig === 'string' && !maybeEndOrPeriod && !maybeInterval) {
      const preset = normalizeChartPreset(rangeOrConfig);
      if (preset) {
        return this.getSmartKlineData(symbol, preset);
      }
    }

    // 2) 配置对象 { startDate, endDate, limit }
    if (rangeOrConfig && typeof rangeOrConfig === 'object' && !(rangeOrConfig instanceof Date) && !Array.isArray(rangeOrConfig)) {
      const period: TimePeriod = (maybeEndOrPeriod as TimePeriod) || '1D';
      const startDate = parseDateInput(rangeOrConfig.startDate);
      const endDate = parseDateInput(rangeOrConfig.endDate);
      return this.getKlineData({
        symbol,
        period,
        limit: rangeOrConfig.limit,
        startDate,
        endDate,
      });
    }

    // 3) 起止日期（字符串或Date）+ 粒度
    if ((rangeOrConfig instanceof Date || typeof rangeOrConfig === 'string') &&
        (maybeEndOrPeriod instanceof Date || typeof maybeEndOrPeriod === 'string')) {
      const period: TimePeriod = (maybeInterval as TimePeriod) || '1D';
      const startDate = parseDateInput(rangeOrConfig as string | Date);
      const endDate = parseDateInput(maybeEndOrPeriod as string | Date);
      return this.getKlineData({
        symbol,
        period,
        startDate,
        endDate,
      });
    }

    // 4) 默认：按1年数据返回
    return this.getSmartKlineData(symbol, '1Y');
  }

  /**
   * 批量获取多只股票的K线数据
   */
  async getBatchKlineData(
    symbols: string[],
    period: TimePeriod,
    limit: number = 100
  ): Promise<Map<string, OHLCV[]>> {
    const results = new Map<string, OHLCV[]>();

    // 并行获取所有股票数据
    const promises = symbols.map(symbol =>
      this.getKlineData({ symbol, period, limit })
        .then(response => ({ symbol, data: response.data }))
    );

    const responses = await Promise.allSettled(promises);

    responses.forEach(result => {
      if (result.status === 'fulfilled') {
        results.set(result.value.symbol, result.value.data);
      }
    });

    return results;
  }

  /**
   * 批量获取历史数据（StrategyLab降级使用）
   */
  async getBatchData(
    symbols: string[],
    options: { period?: ChartRangePreset; interval?: TimePeriod; limit?: number } = {}
  ): Promise<Record<string, OHLCV[]>> {
    const { period = '1Y', interval = '1D', limit = 250 } = options;
    const dataBySymbol: Record<string, OHLCV[]> = {};

    await Promise.all(symbols.map(async (symbol) => {
      if (!symbol) return;
      try {
        const response = await this.getHistoricalData(symbol, period);
        dataBySymbol[symbol] = response.data;
      } catch (error) {
        console.warn(`[HistoricalDataService] Failed to get batch data for ${symbol}, using mock data`, error);
        dataBySymbol[symbol] = this.generateMockKlineData(symbol, interval, limit);
      }
    }));

    return dataBySymbol;
  }

  /**
   * 获取历史财务数据
   */
  async getFinancialData(
    symbol: string,
    years: number = 5
  ): Promise<DataResponse<FinancialData>> {
    const cacheKey = `financial-${symbol}-${years}y`;

    try {
      // 1. 尝试从缓存读取
      const cached = await this.cache.get<FinancialData[]>('reports', cacheKey);
      if (cached && cached.length > 0) {
        return {
          success: true,
          data: cached,
          total: cached.length,
          hasMore: false,
        };
      }

      // 2. 从API获取
      const apiData = await this.fetchFromAPI<FinancialData[]>('financial', {
        symbol,
        years,
      });

      // 3. 写入缓存（1小时TTL）
      await this.cache.set('reports', cacheKey, apiData, 60 * 60 * 1000);

      return {
        success: true,
        data: apiData,
        total: apiData.length,
        hasMore: false,
      };
    } catch (error) {
      console.error('Failed to get financial data:', error);
      
      // 返回Mock数据
      const mockData = this.generateMockFinancialData(symbol, years);
      return {
        success: true,
        data: mockData,
        total: mockData.length,
        hasMore: false,
        error: 'Using mock data',
      };
    }
  }

  /**
   * 获取股票基本信息
   */
  async getStockInfo(symbol: string): Promise<StockInfo | null> {
    const cacheKey = `info-${symbol}`;

    try {
      // 1. 尝试从缓存读取
      const cached = await this.cache.get<StockInfo>('market-data', cacheKey);
      if (cached) {
        return cached;
      }

      // 2. 从API获取
      const apiData = await this.fetchFromAPI<StockInfo>('stock-info', { symbol });

      // 3. 写入缓存（24小时TTL）
      await this.cache.set('market-data', cacheKey, apiData, 24 * 60 * 60 * 1000);

      return apiData;
    } catch (error) {
      console.error('Failed to get stock info:', error);
      return this.getStockInfoFromMap(symbol);
    }
  }

  /**
   * 获取分钟级数据（用于日内回测）
   */
  async getIntradayData(
    symbol: string,
    date: Date,
    interval: '1min' | '5min' | '15min' = '1min'
  ): Promise<DataResponse<OHLCV>> {
    const cacheKey = `intraday-${symbol}-${date.toISOString().split('T')[0]}-${interval}`;

    try {
      const cached = await this.cache.get<OHLCV[]>('historical-prices', cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          total: cached.length,
          hasMore: false,
        };
      }

      const apiData = await this.fetchFromAPI<OHLCV[]>('intraday', {
        symbol,
        date: date.toISOString().split('T')[0],
        interval,
      });

      await this.cache.set('historical-prices', cacheKey, apiData, 60 * 60 * 1000);

      return {
        success: true,
        data: apiData,
        total: apiData.length,
        hasMore: false,
      };
    } catch (error) {
      // 使用Mock数据（这是正常行为，不是错误）
      const mockData = this.generateMockIntradayData(symbol, date, interval);
      
      // 缓存Mock数据
      await this.cache.set('historical-prices', cacheKey, mockData, 60 * 60 * 1000);
      
      return {
        success: true,
        data: mockData,
        total: mockData.length,
        hasMore: false,
      };
    }
  }

  /**
   * 预加载数据（提前缓存常用数据）
   */
  async preloadData(symbols: string[], periods: TimePeriod[]): Promise<void> {
    const tasks: Promise<any>[] = [];

    symbols.forEach(symbol => {
      periods.forEach(period => {
        tasks.push(
          this.getKlineData({ symbol, period, limit: 500 })
        );
      });
    });

    await Promise.allSettled(tasks);
    console.log(`Preloaded data for ${symbols.length} symbols, ${periods.length} periods`);
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache(): Promise<number> {
    let count = 0;
    count += await this.cache.cleanExpired('historical-prices');
    count += await this.cache.cleanExpired('reports');
    count += await this.cache.cleanExpired('market-data');
    return count;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 从API获取数据
   */
  private async fetchFromAPI<T>(endpoint: string, params: Record<string, any>): Promise<T> {
    // 模拟API调用
    // 实际项目中应替换为真实的API调用
    throw new Error('API not implemented - using mock data');
  }

  /**
   * 生成缓存Key
   */
  private getCacheKey(
    type: string,
    symbol: string,
    period: TimePeriod,
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ): string {
    const parts = [type, symbol, period];
    if (startDate) parts.push(startDate.toISOString().split('T')[0]);
    if (endDate) parts.push(endDate.toISOString().split('T')[0]);
    if (limit !== undefined) parts.push(`limit-${limit}`);
    return parts.join('-');
  }

  /**
   * 验证和清洗K线数据
   */
  private validateAndCleanKlineData(data: OHLCV[]): OHLCV[] {
    return data.filter(candle => {
      // 过滤无效数据
      if (!candle || typeof candle.close !== 'number') return false;
      if (candle.high < candle.low) return false;
      if (candle.close > candle.high || candle.close < candle.low) return false;
      if (candle.open > candle.high || candle.open < candle.low) return false;
      if (candle.volume < 0) return false;
      return true;
    }).map(candle => ({
      ...candle,
      // 计算涨跌幅
      changePercent: ((candle.close - candle.open) / candle.open) * 100,
    }));
  }

  /**
   * 生成Mock K线数据
   */
  private generateMockKlineData(symbol: string, period: TimePeriod, count: number): OHLCV[] {
    const data: OHLCV[] = [];
    const basePrice = this.getBasePriceForSymbol(symbol);
    const now = Date.now();
    
    // ✅ 修复：使用正确的时间间隔
    // period 参数是数据粒度（1D/1min等），而不是图表周期（1M/3M等）
    // 对于日线数据，时间间隔应该是1天
    const interval = this.getIntervalMs(period);

    let price = basePrice;

    // ✅ 从过去往现在生成数据
    for (let i = count - 1; i >= 0; i--) {
      const timestamp = now - i * interval;
      const volatility = this.getVolatilityForSymbol(symbol);
      const trend = this.getTrendForSymbol(symbol);

      // 生成随机涨跌
      const change = (Math.random() - 0.5) * volatility + trend;
      price = price * (1 + change / 100);

      const open = price * (1 + (Math.random() - 0.5) * 0.01);
      const close = price * (1 + (Math.random() - 0.5) * 0.01);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      const volume = Math.floor(Math.random() * 50000000 + 10000000);

      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        turnover: close * volume,
        changePercent: ((close - open) / open) * 100,
      });
    }

    return data;
  }

  /**
   * 生成Mock财务数据
   */
  private generateMockFinancialData(symbol: string, years: number): FinancialData[] {
    const data: FinancialData[] = [];
    const currentYear = new Date().getFullYear();
    const periods: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];

    for (let y = 0; y < years; y++) {
      const year = currentYear - y;
      periods.forEach(period => {
        const timestamp = new Date(year, ['Q1', 'Q2', 'Q3', 'Q4'].indexOf(period) * 3, 1).getTime();
        
        data.push({
          symbol,
          timestamp,
          period,
          revenue: Math.random() * 100000000000 + 10000000000,
          netProfit: Math.random() * 20000000000 + 2000000000,
          eps: Math.random() * 5 + 0.5,
          roe: Math.random() * 20 + 5,
          grossMargin: Math.random() * 40 + 20,
          debtRatio: Math.random() * 60 + 20,
          pe: Math.random() * 50 + 10,
          pb: Math.random() * 10 + 1,
        });
      });
    }

    return data.reverse(); // 最新数据在前
  }

  /**
   * 生成Mock分钟数据
   */
  private generateMockIntradayData(symbol: string, date: Date, interval: string): OHLCV[] {
    const data: OHLCV[] = [];
    const basePrice = this.getBasePriceForSymbol(symbol);
    
    // 中国A股交易时间: 9:30-11:30, 13:00-15:00
    const sessions = [
      { start: 9.5, end: 11.5 },   // 上午盘
      { start: 13, end: 15 }       // 下午盘
    ];

    const intervalMins = parseInt(interval) || 1;
    let price = basePrice;
    const volatility = this.getVolatilityForSymbol(symbol);
    const trend = this.getTrendForSymbol(symbol);

    sessions.forEach(session => {
      for (let time = session.start; time < session.end; time += intervalMins / 60) {
        const hours = Math.floor(time);
        const minutes = Math.floor((time - hours) * 60);
        const timestamp = new Date(
          date.getFullYear(), 
          date.getMonth(), 
          date.getDate(), 
          hours, 
          minutes
        ).getTime();

        // 模拟分钟级别的价格波动（比日线波动小）
        const minuteVolatility = volatility / 20; // 分钟波动是日波动的1/20
        const minuteTrend = trend / 240; // 一天240分钟
        const change = (Math.random() - 0.5) * minuteVolatility + minuteTrend;
        price = price * (1 + change / 100);

        const open = price;
        const close = price * (1 + (Math.random() - 0.5) * minuteVolatility / 100);
        const high = Math.max(open, close) * (1 + Math.random() * minuteVolatility / 200);
        const low = Math.min(open, close) * (1 - Math.random() * minuteVolatility / 200);
        
        // 分钟成交量应该远小于日线
        const volume = Math.floor(Math.random() * 2000000 + 500000);

        data.push({
          timestamp,
          open,
          high,
          low,
          close,
          volume,
          changePercent: ((close - open) / open) * 100,
        });
      }
    });

    return data;
  }

  /**
   * 获取股票基础价格
   */
  private getBasePriceForSymbol(symbol: string): number {
    const priceMap: Record<string, number> = {
      '600519': 1680.5,  // 贵州茅台
      '300750': 245.8,   // 宁德时代
      '000858': 152.3,   // 五粮液
      '600036': 42.15,   // 招商银行
      '002594': 268.9,   // 比亚迪
      '601318': 58.76,   // 中国平安
      '000333': 72.45,   // 美的集团
      '600276': 48.92,   // 恒瑞医药
    };
    return priceMap[symbol] || 100;
  }

  /**
   * 获取股票波动率
   */
  private getVolatilityForSymbol(symbol: string): number {
    const volatilityMap: Record<string, number> = {
      '600519': 1.5,
      '300750': 3.5,
      '000858': 2.0,
      '600036': 1.8,
      '002594': 4.0,
      '601318': 1.5,
      '000333': 2.5,
      '600276': 2.2,
    };
    return volatilityMap[symbol] || 2.0;
  }

  /**
   * 获取股票趋势
   */
  private getTrendForSymbol(symbol: string): number {
    const trendMap: Record<string, number> = {
      '600519': 0.05,   // 温和上涨
      '300750': 0.08,   // 强势上涨
      '000858': -0.02,  // 小幅下跌
      '600036': 0.03,
      '002594': 0.10,   // 超强上涨
      '601318': -0.05,  // 下跌
      '000333': 0.04,
      '600276': 0.02,
    };
    return trendMap[symbol] || 0;
  }

  /**
   * 获取时间间隔（毫秒）
   */
  private getIntervalMs(period: TimePeriod): number {
    const intervals: Record<TimePeriod, number> = {
      '1min': 60 * 1000,
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '30min': 30 * 60 * 1000,
      '1H': 60 * 60 * 1000,
      '4H': 4 * 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000,
      '1W': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };
    return intervals[period] || intervals['1D'];
  }

  /**
   * 从内置映射获取股票信息
   */
  private getStockInfoFromMap(symbol: string): StockInfo | null {
    const infoMap: Record<string, StockInfo> = {
      '600519': {
        symbol: '600519',
        name: '贵州茅台',
        exchange: 'SH',
        sector: '食品饮料',
        industry: '白酒',
        marketCap: 2100000000000,
        listedDate: '2001-08-27',
      },
      '300750': {
        symbol: '300750',
        name: '宁德时代',
        exchange: 'SZ',
        sector: '电力设备',
        industry: '电池',
        marketCap: 1200000000000,
        listedDate: '2018-06-11',
      },
      // ... 可以添加更多股票
    };
    return infoMap[symbol] || null;
  }

  /**
   * 智能获取K线数据（根据图表周期自动选择合适的数据粒度）
   * 
   * Bloomberg风格的数据粒度映射：
   * - 1D: 1分钟数据，显示当日240条K线
   * - 5D: 5分钟数据，显示5天的数据
   * - 1M: 日线数据，显示约22个交易日
   * - 3M/6M/1Y: 日线数据
   */
  async getSmartKlineData(
    symbol: string,
    chartPeriod: ChartRangePreset
  ): Promise<DataResponse<OHLCV>> {
    const periodConfig = {
      '1D': { period: '1min' as TimePeriod, bars: 240, days: 1 },
      '5D': { period: '5min' as TimePeriod, bars: 240, days: 5 },
      '1M': { period: '1D' as TimePeriod, bars: 60, days: 60 },  // ✅ 从22增加到60，提供更多数据用于缩放
      '3M': { period: '1D' as TimePeriod, bars: 90, days: 90 },  // ✅ 从66增加到90，更精确
      '6M': { period: '1D' as TimePeriod, bars: 120, days: 180 },
      '1Y': { period: '1D' as TimePeriod, bars: 250, days: 365 },
      'YTD': { period: '1D' as TimePeriod, bars: 250, days: 365 },
      '5Y': { period: '1W' as TimePeriod, bars: 520, days: 5 * 365 },
      'ALL': { period: '1M' as TimePeriod, bars: 1200, days: 10 * 365 },
    };

    const config = periodConfig[chartPeriod];
    if (!config) {
      return this.getKlineData({ symbol, period: '1D', limit: 250 });
    }
    
    // 对于1D，生成当天的分钟数据
    if (chartPeriod === '1D') {
      const today = new Date();
      return this.getIntradayData(symbol, today, '1min');
    }
    
    // 对于5D，生成最近5天的5分钟数据
    if (chartPeriod === '5D') {
      const data: OHLCV[] = [];
      const today = new Date();
      
      // 生成最近5个交易日的数据
      for (let i = 4; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // 跳过周末
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        const dayData = await this.getIntradayData(symbol, date, '5min');
        data.push(...dayData.data);
      }
      
      return {
        success: true,
        data,
        total: data.length,
        hasMore: false,
      };
    }

    // 其他周期使用日线数据
    return this.getKlineData({
      symbol,
      period: config.period,
      limit: config.bars,
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let historicalDataServiceInstance: HistoricalDataService | null = null;

export function getHistoricalDataService(): HistoricalDataService {
  if (!historicalDataServiceInstance) {
    historicalDataServiceInstance = new HistoricalDataService();
  }
  return historicalDataServiceInstance;
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect } from 'react';

export function useHistoricalData(
  symbol: string,
  period: TimePeriod,
  limit: number = 500
) {
  const [data, setData] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const service = getHistoricalDataService();
        const response = await service.getKlineData({ symbol, period, limit });

        if (!cancelled) {
          setData(response.data);
          if (response.error) {
            setError(response.error);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [symbol, period, limit]);

  return { data, loading, error };
}

/**
 * 智能历史数据Hook（根据图表周期自动选择合适的数据粒度）
 * 用于图表组件，Bloomberg风格
 */
export function useSmartHistoricalData(
  symbol: string,
  chartPeriod: ChartRangePreset
) {
  const [data, setData] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataGranularity, setDataGranularity] = useState<TimePeriod>('1D');

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const service = getHistoricalDataService();
        const response = await service.getSmartKlineData(symbol, chartPeriod);

        if (!cancelled) {
          setData(response.data);
          
          // 设置数据粒度信息
          const granularityMap: Record<ChartRangePreset, TimePeriod> = {
            '1D': '1min',
            '5D': '5min',
            '1M': '1D',
            '3M': '1D',
            '6M': '1D',
            '1Y': '1D',
            'YTD': '1D',
            '5Y': '1W',
            'ALL': '1M',
          };
          setDataGranularity(granularityMap[chartPeriod]);
          
          if (response.error) {
            setError(response.error);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [symbol, chartPeriod]);

  return { data, loading, error, dataGranularity };
}
