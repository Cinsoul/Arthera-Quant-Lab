/**
 * Tushare 数据服务
 * 提供A股市场数据、基本面数据和宏观数据
 */

import { getEnvVar } from '../utils/env';

export interface TushareConfig {
  token: string;
  apiUrl: string;
  timeout: number;
}

export interface TushareRequest {
  api_name: string;
  token: string;
  params?: Record<string, any>;
  fields?: string;
}

export interface TushareResponse<T = any> {
  request_id: string;
  code: number;
  msg: string;
  data: {
    fields: string[];
    items: any[][];
    has_more: boolean;
  };
}

export interface StockBasic {
  ts_code: string;
  symbol: string;
  name: string;
  area: string;
  industry: string;
  market: string;
  list_date: string;
  is_hs: string;
}

export interface DailyBasic {
  ts_code: string;
  trade_date: string;
  close: number;
  turnover_rate: number;
  turnover_rate_f: number;
  volume_ratio: number;
  pe: number;
  pe_ttm: number;
  pb: number;
  ps: number;
  ps_ttm: number;
  total_share: number;
  float_share: number;
  free_share: number;
  total_mv: number;
  circ_mv: number;
}

export interface MarketData {
  ts_code: string;
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  pre_close: number;
  change: number;
  pct_chg: number;
  vol: number;
  amount: number;
}

export interface IndexData {
  ts_code: string;
  trade_date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  pre_close: number;
  change: number;
  pct_chg: number;
  vol: number;
  amount: number;
}

export interface FinanceData {
  ts_code: string;
  ann_date: string;
  f_ann_date: string;
  end_date: string;
  report_type: string;
  comp_type: string;
  basic_eps: number;
  diluted_eps: number;
  total_revenue: number;
  revenue: number;
  int_income: number;
  prem_earned: number;
  comm_income: number;
  n_commis_income: number;
  n_oth_income: number;
  n_oth_b_income: number;
  prem_income: number;
  out_prem: number;
  une_prem_reser: number;
  reins_income: number;
  n_sec_tb_income: number;
  n_sec_uw_income: number;
  n_asset_mg_income: number;
  oth_b_income: number;
  fv_value_chg_gain: number;
  invest_income: number;
  ass_invest_income: number;
  forex_gain: number;
  total_cogs: number;
  oper_cost: number;
}

class TushareDataService {
  private config: TushareConfig = {
    token: '',
    apiUrl: getEnvVar('VITE_TUSHARE_PROXY_URL', 'REACT_APP_TUSHARE_PROXY_URL', 'http://localhost:8010/api/v1/tushare')!,
    timeout: 30000
  };

  constructor() {
    // 从本地设置加载配置
    this.loadConfig();
    
    // 监听设置更新事件
    window.addEventListener('settings-updated', this.handleSettingsUpdate.bind(this));
  }

  /**
   * 从本地设置加载配置
   */
  private loadConfig() {
    try {
      const savedSettings = localStorage.getItem('arthera_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.tushareToken) {
          this.config.token = settings.tushareToken;
        }
      }
      
      // 如果没有配置token，使用默认token（仅用于演示）
      if (!this.config.token) {
        this.config.token = 'c24242421424214214';
      }
    } catch (error) {
      console.warn('[Tushare] Failed to load config from settings:', error);
      // 使用默认token
      this.config.token = 'c24242421424214214';
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<TushareConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 处理设置更新事件
   */
  private handleSettingsUpdate(event: Event) {
    const customEvent = event as CustomEvent;
    const settings = customEvent.detail;
    
    console.log('[Tushare] Settings updated, reloading configuration');
    this.loadConfig();
  }

  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly REQUEST_INTERVAL = 300; // 限制请求间隔300ms

  /**
   * 获取股票基本信息
   */
  async getStockBasic(): Promise<StockBasic[]> {
    try {
      const response = await this.makeRequest<StockBasic>({
        api_name: 'stock_basic',
        token: this.config.token,
        params: {
          exchange: '',
          list_status: 'L',
          fields: 'ts_code,symbol,name,area,industry,market,list_date,is_hs'
        }
      });

      return this.parseResponse(response);
    } catch (error) {
      console.error('[Tushare] Failed to get stock basic data:', error);
      return [];
    }
  }

  /**
   * 获取日线行情数据
   */
  async getDailyData(
    tsCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<MarketData[]> {
    try {
      await this.rateLimitDelay();

      const response = await this.makeRequest<MarketData>({
        api_name: 'daily',
        token: this.config.token,
        params: {
          ts_code: tsCode,
          start_date: startDate,
          end_date: endDate
        }
      });

      return this.parseResponse(response);
    } catch (error) {
      console.error(`[Tushare] Failed to get daily data for ${tsCode}:`, error);
      return this.generateMockDailyData(tsCode);
    }
  }

  /**
   * 获取每日基本面指标
   */
  async getDailyBasic(
    tsCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyBasic[]> {
    try {
      await this.rateLimitDelay();

      const response = await this.makeRequest<DailyBasic>({
        api_name: 'daily_basic',
        token: this.config.token,
        params: {
          ts_code: tsCode,
          start_date: startDate,
          end_date: endDate,
          fields: 'ts_code,trade_date,close,turnover_rate,turnover_rate_f,volume_ratio,pe,pe_ttm,pb,ps,ps_ttm,total_share,float_share,free_share,total_mv,circ_mv'
        }
      });

      return this.parseResponse(response);
    } catch (error) {
      console.error(`[Tushare] Failed to get daily basic data for ${tsCode}:`, error);
      return this.generateMockDailyBasic(tsCode);
    }
  }

  /**
   * 获取指数数据
   */
  async getIndexDaily(
    tsCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<IndexData[]> {
    try {
      await this.rateLimitDelay();

      const response = await this.makeRequest<IndexData>({
        api_name: 'index_daily',
        token: this.config.token,
        params: {
          ts_code: tsCode,
          start_date: startDate,
          end_date: endDate
        }
      });

      return this.parseResponse(response);
    } catch (error) {
      console.error(`[Tushare] Failed to get index data for ${tsCode}:`, error);
      return [];
    }
  }

  /**
   * 获取财务数据
   */
  async getFinanceData(
    tsCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<FinanceData[]> {
    try {
      await this.rateLimitDelay();

      const response = await this.makeRequest<FinanceData>({
        api_name: 'income',
        token: this.config.token,
        params: {
          ts_code: tsCode,
          start_date: startDate,
          end_date: endDate,
          report_type: '1',
          comp_type: '1'
        }
      });

      return this.parseResponse(response);
    } catch (error) {
      console.error(`[Tushare] Failed to get finance data for ${tsCode}:`, error);
      return [];
    }
  }

  /**
   * 获取实时行情（模拟）
   */
  async getRealTimeData(tsCodes: string[]): Promise<Map<string, MarketData>> {
    const realTimeMap = new Map<string, MarketData>();
    
    try {
      // 由于Tushare实时数据有限制，这里获取最新的日线数据作为实时数据
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
      
      for (const tsCode of tsCodes) {
        try {
          await this.rateLimitDelay();
          
          const data = await this.getDailyData(tsCode, yesterday, today);
          if (data && data.length > 0) {
            // 使用最新的数据作为实时数据
            realTimeMap.set(tsCode, data[data.length - 1]);
          }
        } catch (error) {
          console.warn(`[Tushare] Failed to get real-time data for ${tsCode}:`, error);
        }
      }
    } catch (error) {
      console.error('[Tushare] Failed to get real-time data:', error);
    }
    
    return realTimeMap;
  }

  /**
   * 获取热门股票列表
   */
  async getTopStocks(limit = 50): Promise<StockBasic[]> {
    try {
      const allStocks = await this.getStockBasic();
      
      // 过滤A股主板股票
      const mainBoardStocks = allStocks.filter(stock => 
        stock.market === '主板' && 
        stock.area !== '香港' &&
        !stock.ts_code.startsWith('688') && // 排除科创板
        !stock.ts_code.startsWith('300')    // 排除创业板
      );
      
      return mainBoardStocks.slice(0, limit);
    } catch (error) {
      console.error('[Tushare] Failed to get top stocks:', error);
      return [];
    }
  }

  /**
   * 获取行业板块数据
   */
  async getSectorData(): Promise<Array<{name: string, changePercent: number, volume: number}>> {
    try {
      // 主要指数代码
      const indices = [
        { code: '399001.SZ', name: '深证成指' },
        { code: '399006.SZ', name: '创业板指' },
        { code: '399300.SZ', name: '沪深300' },
        { code: '399905.SZ', name: '中证500' },
        { code: '399008.SZ', name: '中小板指' }
      ];
      
      const sectorData: Array<{name: string, changePercent: number, volume: number}> = [];
      
      for (const index of indices) {
        try {
          await this.rateLimitDelay();
          
          const data = await this.getIndexDaily(index.code);
          if (data && data.length > 0) {
            const latest = data[data.length - 1];
            sectorData.push({
              name: index.name,
              changePercent: latest.pct_chg || 0,
              volume: latest.vol || 0
            });
          }
        } catch (error) {
          console.warn(`[Tushare] Failed to get sector data for ${index.name}:`, error);
        }
      }
      
      return sectorData;
    } catch (error) {
      console.error('[Tushare] Failed to get sector data:', error);
      return [];
    }
  }

  /**
   * 发起API请求
   */
  private async makeRequest<T>(request: TushareRequest): Promise<TushareResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TushareResponse<T> = await response.json();
      
      if (data.code !== 0) {
        throw new Error(`Tushare API error: ${data.msg}`);
      }

      this.requestCount++;
      console.log(`[Tushare] Request completed: ${request.api_name} (${this.requestCount})`);
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * 解析API响应数据
   */
  private parseResponse<T>(response: TushareResponse<T>): T[] {
    const { fields, items } = response.data;
    
    if (!items || !fields) {
      return [];
    }

    return items.map(item => {
      const obj: any = {};
      fields.forEach((field, index) => {
        obj[field] = item[index];
      });
      return obj as T;
    });
  }

  private generateMockDailyData(tsCode: string, days: number = 90): MarketData[] {
    const result: MarketData[] = [];
    const start = new Date();
    start.setDate(start.getDate() - days);
    let price = 50 + Math.random() * 150;

    for (let i = 0; i < days; i++) {
      const tradeDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const change = (Math.random() - 0.45) * 0.03;
      price = Math.max(5, price * (1 + change));
      const preClose = price / (1 + change);
      result.push({
        ts_code: tsCode,
        trade_date: tradeDate.toISOString().split('T')[0].replace(/-/g, ''),
        open: preClose,
        high: price * (1 + Math.random() * 0.01),
        low: price * (1 - Math.random() * 0.01),
        close: price,
        pre_close: preClose,
        change: price - preClose,
        pct_chg: ((price - preClose) / preClose) * 100,
        vol: 120000 + Math.random() * 50000,
        amount: (price * 1000) + Math.random() * 500000,
      });
    }
    return result;
  }

  private generateMockDailyBasic(tsCode: string, days: number = 90): DailyBasic[] {
    const data: DailyBasic[] = [];
    const start = new Date();
    start.setDate(start.getDate() - days);
    let close = 50 + Math.random() * 150;

    for (let i = 0; i < days; i++) {
      const tradeDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const change = (Math.random() - 0.5) * 0.02;
      close = Math.max(5, close * (1 + change));

      data.push({
        ts_code: tsCode,
        trade_date: tradeDate.toISOString().split('T')[0].replace(/-/g, ''),
        close,
        turnover_rate: 1 + Math.random() * 3,
        turnover_rate_f: 1 + Math.random() * 3,
        volume_ratio: 0.8 + Math.random() * 0.4,
        pe: 10 + Math.random() * 20,
        pe_ttm: 10 + Math.random() * 20,
        pb: 1 + Math.random() * 4,
        ps: 2 + Math.random() * 2,
        ps_ttm: 2 + Math.random() * 2,
        total_share: 1e4 + Math.random() * 3e3,
        float_share: 0.8e4 + Math.random() * 2e3,
        free_share: 0.6e4 + Math.random() * 2e3,
        total_mv: close * 1e4,
        circ_mv: close * 0.8e4,
      });
    }
    return data;
  }

  /**
   * 请求频率限制
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.REQUEST_INTERVAL) {
      const delay = this.REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest({
        api_name: 'index_basic',
        token: this.config.token,
        params: {
          market: 'SSE'
        }
      });
      
      return response.code === 0 && response.data.items.length > 0;
    } catch (error) {
      console.error('[Tushare] Connection test failed:', error);
      return false;
    }
  }


  /**
   * 获取请求统计
   */
  getStats(): { requestCount: number; lastRequestTime: Date | null } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime ? new Date(this.lastRequestTime) : null
    };
  }
}

export const tushareDataService = new TushareDataService();
export default TushareDataService;
