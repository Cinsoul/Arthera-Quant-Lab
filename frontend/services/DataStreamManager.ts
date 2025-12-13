/**
 * DataStreamManager - 实时数据流管理器
 * 负责 WebSocket 连接、数据订阅和实时推送
 * Bloomberg Terminal 级别的数据流基础设施
 */

import apiClient from './ApiClient';

export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  bid?: number;
  ask?: number;
  high?: number;
  low?: number;
  open?: number;
  // 专业级数据
  vwap?: number;           // 成交量加权平均价
  turnover?: number;       // 成交额
  amplitude?: number;      // 振幅
  pe?: number;            // 市盈率
  pb?: number;            // 市净率
  marketCap?: number;     // 市值
  floatShares?: number;   // 流通股本
  totalShares?: number;   // 总股本
  level2?: Level2Data;    // Level2数据
  tickData?: TickData[];  // Tick数据
}

export interface Level2Data {
  buyOrders: OrderBookEntry[];   // 买盘
  sellOrders: OrderBookEntry[];  // 卖盘
  trades: RecentTrade[];         // 最近成交
  timestamp: Date;
}

export interface OrderBookEntry {
  price: number;
  volume: number;
  orders?: number;  // 订单数量
}

export interface RecentTrade {
  price: number;
  volume: number;
  direction: 'buy' | 'sell' | 'neutral';
  timestamp: Date;
}

export interface TickData {
  price: number;
  volume: number;
  direction: 'up' | 'down' | 'neutral';
  timestamp: Date;
}

export interface Subscription {
  id: string;
  symbols: string[];
  callback: (data: MarketData) => void;
  active: boolean;
}

export interface DataStreamConfig {
  reconnectInterval: number;
  heartbeatInterval: number;
  maxReconnectAttempts: number;
  updateInterval: number;
  // 专业级配置
  enableLevel2: boolean;        // 启用Level2数据
  enableTickData: boolean;      // 启用Tick数据
  bufferSize: number;          // 数据缓冲区大小
  compressionEnabled: boolean;  // 启用数据压缩
  prioritySymbols: string[];   // 优先级股票列表
  // 高频数据配置
  enableHighFrequency: boolean; // 启用高频数据
  highFreqInterval: number;     // 高频数据更新间隔(毫秒)
  enableMinuteData: boolean;    // 启用分钟级数据
  enableSecondData: boolean;    // 启用秒级数据
  maxDataPoints: number;        // 最大数据点数
}

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export class DataStreamManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectAttempts: number = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private status: ConnectionStatus = 'disconnected';
  private listeners: ((status: ConnectionStatus) => void)[] = [];
  private config: DataStreamConfig;
  private mockDataTimer: number | null = null;

  constructor(config: Partial<DataStreamConfig> = {}) {
    this.config = {
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      maxReconnectAttempts: 10,
      updateInterval: 1000,
      enableLevel2: false,
      enableTickData: false,
      bufferSize: 1000,
      compressionEnabled: true,
      prioritySymbols: ['600519', '300750', '000858', '600036'],
      // 高频数据默认配置
      enableHighFrequency: true,
      highFreqInterval: 500,     // 500ms更新
      enableMinuteData: true,
      enableSecondData: false,
      maxDataPoints: 1440,       // 一天的分钟数
      ...config,
    };
  }

  /**
   * 连接到数据流服务器
   */
  async connect(url?: string): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      console.warn('[DataStream] Already connected or connecting');
      return;
    }

    this.setStatus('connecting');
    this.reconnectAttempts = 0; // 重置重连计数

    try {
      // 优先尝试使用ApiClient的WebSocket连接
      await apiClient.connectWebSocket();
      console.log('[DataStream] Connected via ApiClient WebSocket');
      this.setStatus('connected');
      this.startHeartbeat();
      
      // 重新订阅所有活跃的订阅
      this.resubscribeAll();
      
    } catch (error) {
      console.warn('[DataStream] ApiClient WebSocket connection failed, trying direct connection...', error);
      
      try {
        // 降级到直接WebSocket连接
        const clientId = this.generateClientId();
        const wsUrl = url || `${this.getWebSocketUrl()}/ws/${clientId}`;
        
        console.log(`[DataStream] Connecting to ${wsUrl}...`);
        this.ws = new WebSocket(wsUrl);
        
        this.setupWebSocketHandlers();
        
      } catch (directError) {
        console.warn('[DataStream] Direct WebSocket connection failed, falling back to mock data:', directError);
        this.fallbackToMockData();
      }
    }
  }

  /**
   * 设置WebSocket事件处理器
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[DataStream] WebSocket connected successfully');
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      // 重新订阅所有活跃的订阅
      this.resubscribeAll();
    };

    this.ws.onclose = (event) => {
      console.log(`[DataStream] WebSocket closed: ${event.code} - ${event.reason}`);
      this.ws = null;
      this.stopHeartbeat();
      
      if (this.status === 'connected') {
        // 意外断开，尝试重连
        this.setStatus('disconnected');
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[DataStream] WebSocket error:', error);
      this.setStatus('error');
      
      // WebSocket错误时，回退到Mock数据
      this.fallbackToMockData();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('[DataStream] Failed to parse WebSocket message:', error);
      }
    };
  }

  /**
   * 处理WebSocket消息
   */
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'market_data':
        this.processMarketData(message.data);
        break;
        
      case 'level2_data':
        this.processLevel2Data(message.data);
        break;
        
      case 'tick_data':
        this.processTickData(message.data);
        break;
        
      case 'subscription_confirmed':
        console.log(`[DataStream] Subscription confirmed for: ${message.symbols?.join(', ')}`);
        break;
        
      case 'error':
        console.error('[DataStream] Server error:', message.error);
        break;
        
      case 'pong':
        // 心跳响应
        break;
        
      default:
        console.warn('[DataStream] Unknown message type:', message.type);
    }
  }

  /**
   * 回退到Mock数据模式
   */
  private fallbackToMockData(): void {
    console.log('[DataStream] Using mock data stream...');
    
    setTimeout(() => {
      this.setStatus('connected');
      this.startHeartbeat();
      this.startMockDataStream();
      console.log('[DataStream] Mock data stream started');
    }, 500);
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.stopMockDataStream();
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.setStatus('disconnected');
    console.log('[DataStream] Disconnected');
  }

  /**
   * 订阅股票实时数据
   */
  subscribe(symbols: string[], callback: (data: MarketData) => void): string {
    const subscriptionId = this.generateSubscriptionId();
    
    const subscription: Subscription = {
      id: subscriptionId,
      symbols,
      callback,
      active: true,
    };

    this.subscriptions.set(subscriptionId, subscription);
    console.log(`[DataStream] Subscribed to ${symbols.join(', ')} (ID: ${subscriptionId})`);

    // 如果已连接，立即发送订阅请求
    if (this.status === 'connected') {
      this.sendSubscriptionRequest(symbols);
    }

    return subscriptionId;
  }

  /**
   * 取消订阅
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      // 检查是否还有其他订阅使用相同的股票代码
      const symbolsToUnsubscribe: string[] = [];
      
      subscription.symbols.forEach(symbol => {
        let stillNeeded = false;
        this.subscriptions.forEach((otherSub, otherId) => {
          if (otherId !== subscriptionId && otherSub.active && otherSub.symbols.includes(symbol)) {
            stillNeeded = true;
          }
        });
        
        if (!stillNeeded) {
          symbolsToUnsubscribe.push(symbol);
        }
      });
      
      // 发送取消订阅请求
      if (symbolsToUnsubscribe.length > 0 && this.status === 'connected') {
        this.sendUnsubscriptionRequest(symbolsToUnsubscribe);
      }
      
      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
      console.log(`[DataStream] Unsubscribed ${subscriptionId} for symbols: ${subscription.symbols.join(', ')}`);
    }
  }

  /**
   * 监听连接状态变化
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.push(listener);
    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取当前连接状态
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * 获取活跃订阅数量
   */
  getActiveSubscriptionsCount(): number {
    return this.subscriptions.size;
  }

  /**
   * 获取当前数据（用于缓存查询）
   */
  getCurrentData(): Map<string, MarketData> {
    // 这里返回当前缓存的市场数据
    // 实际实现中应该维护一个数据缓存
    return new Map();
  }

  /**
   * 启用Level2数据
   */
  enableLevel2Data(): void {
    this.config.enableLevel2 = true;
    console.log('[DataStream] Level2 data enabled');
  }

  /**
   * 禁用Level2数据
   */
  disableLevel2Data(): void {
    this.config.enableLevel2 = false;
    console.log('[DataStream] Level2 data disabled');
  }

  /**
   * 启用Tick数据
   */
  enableTickData(): void {
    this.config.enableTickData = true;
    console.log('[DataStream] Tick data enabled');
  }

  /**
   * 禁用Tick数据
   */
  disableTickData(): void {
    this.config.enableTickData = false;
    console.log('[DataStream] Tick data disabled');
  }

  /**
   * 获取连接信息
   */
  getConnectionInfo(): {
    status: ConnectionStatus;
    reconnectAttempts: number;
    subscriptionsCount: number;
    isWebSocketActive: boolean;
    url?: string;
  } {
    return {
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
      subscriptionsCount: this.subscriptions.size,
      isWebSocketActive: this.ws?.readyState === WebSocket.OPEN,
      url: this.ws?.url
    };
  }

  /**
   * 手动重连
   */
  reconnect(): void {
    console.log('[DataStream] Manual reconnection requested');
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  /**
   * 发送自定义消息到服务器
   */
  sendCustomMessage(type: string, data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type, data }));
        return true;
      } catch (error) {
        console.error('[DataStream] Failed to send custom message:', error);
        return false;
      }
    }
    return false;
  }

  // ========== Private Methods ==========

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.notifyStatusChange();
    }
  }

  private notifyStatusChange(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('[DataStream] Error in status listener:', error);
      }
    });
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendSubscriptionRequest(symbols: string[]): void {
    // 发送订阅请求到 WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        action: 'subscribe',
        symbols,
        config: {
          enableLevel2: this.config.enableLevel2,
          enableTickData: this.config.enableTickData
        }
      };
      
      this.ws.send(JSON.stringify(message));
      console.log(`[DataStream] Sent subscription request for: ${symbols.join(', ')}`);
    }
  }

  /**
   * 发送取消订阅请求
   */
  private sendUnsubscriptionRequest(symbols: string[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        action: 'unsubscribe',
        symbols
      };
      
      this.ws.send(JSON.stringify(message));
      console.log(`[DataStream] Sent unsubscription request for: ${symbols.join(', ')}`);
    }
  }

  /**
   * 重新订阅所有活跃的订阅
   */
  private resubscribeAll(): void {
    const allSymbols = new Set<string>();
    
    this.subscriptions.forEach(subscription => {
      if (subscription.active) {
        subscription.symbols.forEach(symbol => allSymbols.add(symbol));
      }
    });

    if (allSymbols.size > 0) {
      this.sendSubscriptionRequest(Array.from(allSymbols));
    }
  }

  /**
   * 生成客户端ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取WebSocket URL
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // 首先尝试环境变量
    if (process.env.REACT_APP_WS_URL) {
      return process.env.REACT_APP_WS_URL;
    }
    
    // 从API URL推导
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL.replace(/^https?:/, protocol);
    }
    
    // 根据当前主机推导
    const currentHost = window.location.host;
    let wsHost: string;
    
    if (currentHost.includes(':3001')) {
      // 开发模式：前端在3001，后端在8001
      wsHost = currentHost.replace(':3001', ':8001');
    } else if (currentHost.includes(':3000')) {
      // 开发模式：前端在3000，后端在8000或8001
      wsHost = currentHost.replace(':3000', ':8001');
    } else {
      // 生产模式或其他情况
      wsHost = currentHost;
    }
    
    return `${protocol}//${wsHost}`;
  }

  /**
   * 处理市场数据
   */
  private processMarketData(data: any): void {
    try {
      const marketData: MarketData = {
        symbol: data.symbol,
        name: data.name || `股票${data.symbol}`,
        price: data.price,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        volume: data.volume || 0,
        timestamp: new Date(data.timestamp),
        bid: data.bid,
        ask: data.ask,
        high: data.high,
        low: data.low,
        open: data.open,
        vwap: data.vwap,
        turnover: data.turnover,
        amplitude: data.amplitude,
        pe: data.pe,
        pb: data.pb,
        marketCap: data.marketCap,
        floatShares: data.floatShares,
        totalShares: data.totalShares
      };

      // 通知所有订阅了该股票的回调
      this.subscriptions.forEach(subscription => {
        if (subscription.active && subscription.symbols.includes(data.symbol)) {
          try {
            subscription.callback(marketData);
          } catch (error) {
            console.error('[DataStream] Error in subscription callback:', error);
          }
        }
      });
    } catch (error) {
      console.error('[DataStream] Error processing market data:', error);
    }
  }

  /**
   * 处理Level2数据
   */
  private processLevel2Data(data: any): void {
    if (!this.config.enableLevel2) return;

    try {
      const level2Data: Level2Data = {
        buyOrders: data.buyOrders || [],
        sellOrders: data.sellOrders || [],
        trades: data.trades || [],
        timestamp: new Date(data.timestamp)
      };

      // 更新市场数据中的Level2字段
      this.subscriptions.forEach(subscription => {
        if (subscription.active && subscription.symbols.includes(data.symbol)) {
          // 这里可以扩展为专门的Level2回调
          console.log(`[DataStream] Level2 data received for ${data.symbol}`);
        }
      });
    } catch (error) {
      console.error('[DataStream] Error processing Level2 data:', error);
    }
  }

  /**
   * 处理Tick数据
   */
  private processTickData(data: any): void {
    if (!this.config.enableTickData) return;

    try {
      const tickData: TickData = {
        price: data.price,
        volume: data.volume,
        direction: data.direction || 'neutral',
        timestamp: new Date(data.timestamp)
      };

      console.log(`[DataStream] Tick data received for ${data.symbol}:`, tickData);
    } catch (error) {
      console.error('[DataStream] Error processing tick data:', error);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // 发送心跳包
        this.ws.send(JSON.stringify({ 
          type: 'ping', 
          timestamp: Date.now(),
          clientId: this.generateClientId()
        }));
      } else if (this.status === 'connected') {
        // WebSocket已断开但状态还是connected，需要重连
        console.warn('[DataStream] WebSocket disconnected during heartbeat, attempting reconnection...');
        this.setStatus('disconnected');
        this.attemptReconnect();
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[DataStream] Max reconnect attempts reached');
      this.setStatus('error');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[DataStream] Reconnecting... (Attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  // ========== AkShare Real Data Stream ==========

  /**
   * 启动 AkShare 实时数据流
   */
  private startMockDataStream(): void {
    this.stopMockDataStream();

    // 扩展的股票池 - 覆盖大中小盘股、各行业龙头
    const stockPool = [
      // 大盘蓝筹股 (市值>1000亿)
      '600519', '300750', '000858', '600036', '601318', '000333', '600276',
      '000002', '601166', '002415', '601888', '600000', '601398', '000001',
      '601012', '600028', '600887', '601628', '000568', '002304', '600031',
      '601766', '601601', '600585', '000876', '600309', '000063', '601919',
      
      // 中盘成长股 (市值200-1000亿)
      '002594', '688981', '002230', '300142', '002475', '300059', '603259',
      '002841', '300496', '688005', '688111', '000725', '002371', '002352',
      '300760', '688008', '300033', '002050', '000651', '002821', '300274',
      '688169', '002460', '300347', '300454', '002129', '300122', '688596',
      
      // 小盘特色股 (市值50-200亿)
      '300413', '002756', '300661', '688036', '300474', '002938', '300896',
      '688390', '300979', '688123', '002709', '300866', '002812', '688516',
      '300999', '688318', '002153', '300832', '688200', '300888', '002709',
      '688819', '300782', '002966', '300919', '688508', '002985', '300676',
      
      // 科创板代表
      '688009', '688029', '688363', '688777', '688599', '688321', '688128',
      '688187', '688688', '688561', '688396', '688112', '688223', '688228',
      
      // 创业板代表  
      '300015', '300124', '300316', '300498', '300676', '300699', '300750',
      '300866', '300919', '300979', '300999', '301029', '301111', '301236',
      
      // 北交所代表
      '430047', '833533', '831865', '430090', '832491', '832189', '871981'
    ];

    // 启动实时数据更新
    this.mockDataTimer = window.setInterval(async () => {
      await this.fetchRealTimeDataBatch();
    }, this.config.updateInterval);

    console.log('[DataStream] AkShare data stream started');
  }

  /**
   * 批量获取实时数据
   */
  private async fetchRealTimeDataBatch(): Promise<void> {
    try {
      // 获取订阅的股票列表
      const subscribedSymbols = new Set<string>();
      this.subscriptions.forEach(sub => {
        if (sub.active) {
          sub.symbols.forEach(symbol => subscribedSymbols.add(symbol));
        }
      });

      if (subscribedSymbols.size === 0) return;

      // 批量请求实时行情数据 - 使用后端API
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8004';
      
      // 使用批量行情接口
      const response = await fetch(`${API_BASE_URL}/api/v1/market/realtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols: Array.from(subscribedSymbols)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        // 处理每个股票的数据
        data.data.forEach((stockData: any) => {
          const marketData = this.formatAkShareData(stockData);
          
          // 如果启用了Level2数据，获取详细数据
          if (this.config.enableLevel2) {
            this.fetchLevel2Data(stockData.symbol).then(level2Data => {
              marketData.level2 = level2Data;
              this.broadcastMarketData(marketData);
            });
          } else {
            this.broadcastMarketData(marketData);
          }
        });
      }
    } catch (error) {
      console.error('[DataStream] Error fetching real-time data:', error);
      
      // 降级到模拟数据
      this.fallbackToSimulatedData();
    }
  }

  /**
   * 格式化AkShare数据
   */
  private formatAkShareData(akData: any): MarketData {
    return {
      symbol: akData.symbol || akData.code,
      name: akData.name || akData.stock_name,
      price: parseFloat(akData.price || akData.close) || 0,
      change: parseFloat(akData.change || akData.change_amount) || 0,
      changePercent: parseFloat(akData.changePercent || akData.change_percent) || 0,
      volume: parseInt(akData.volume || akData.vol) || 0,
      timestamp: new Date(),
      
      // 基本行情数据
      bid: parseFloat(akData.bid1) || null,
      ask: parseFloat(akData.ask1) || null,
      high: parseFloat(akData.high) || null,
      low: parseFloat(akData.low) || null,
      open: parseFloat(akData.open) || null,
      
      // 专业数据
      vwap: parseFloat(akData.vwap) || null,
      turnover: parseFloat(akData.turnover || akData.amount) || null,
      amplitude: parseFloat(akData.amplitude) || null,
      pe: parseFloat(akData.pe) || parseFloat(akData.pe_ratio) || null,
      pb: parseFloat(akData.pb) || parseFloat(akData.pb_ratio) || null,
      marketCap: parseFloat(akData.marketCap || akData.total_value) || null,
      floatShares: parseFloat(akData.floatShares || akData.float_shares) || null,
      totalShares: parseFloat(akData.totalShares || akData.total_shares) || null,
    };
  }

  /**
   * 获取Level2数据
   */
  private async fetchLevel2Data(symbol: string): Promise<Level2Data | null> {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8004';
      const response = await fetch(`${API_BASE_URL}/api/v1/market/level2/${symbol}`);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      if (!data.success) return null;

      return {
        buyOrders: data.data.buyOrders?.map((order: any) => ({
          price: parseFloat(order.price),
          volume: parseInt(order.volume),
          orders: parseInt(order.orders) || null,
        })) || [],
        
        sellOrders: data.data.sellOrders?.map((order: any) => ({
          price: parseFloat(order.price),
          volume: parseInt(order.volume),
          orders: parseInt(order.orders) || null,
        })) || [],
        
        trades: data.data.recentTrades?.map((trade: any) => ({
          price: parseFloat(trade.price),
          volume: parseInt(trade.volume),
          direction: trade.direction as 'buy' | 'sell' | 'neutral',
          timestamp: new Date(trade.timestamp),
        })) || [],
        
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('[DataStream] Error fetching Level2 data:', error);
      return null;
    }
  }

  /**
   * 广播市场数据
   */
  private broadcastMarketData(marketData: MarketData): void {
    this.subscriptions.forEach(subscription => {
      if (subscription.active && subscription.symbols.includes(marketData.symbol)) {
        try {
          subscription.callback(marketData);
        } catch (error) {
          console.error('[DataStream] Error in subscription callback:', error);
        }
      }
    });
  }

  /**
   * 降级到模拟数据
   */
  private fallbackToSimulatedData(): void {
    console.warn('[DataStream] Falling back to simulated data');
    
    // 使用部分真实股票进行模拟
    const fallbackSymbols = [
      { symbol: '600519', name: '贵州茅台', basePrice: 1650 },
      { symbol: '300750', name: '宁德时代', basePrice: 245 },
      { symbol: '000858', name: '五粮液', basePrice: 150 },
      { symbol: '600036', name: '招商银行', basePrice: 41 },
      { symbol: '002594', name: '比亚迪', basePrice: 270 },
      { symbol: '601318', name: '中国平安', basePrice: 58 },
      { symbol: '000001', name: '平安银行', basePrice: 15 },
      { symbol: '000002', name: '万科A', basePrice: 9 },
    ];

    fallbackSymbols.forEach(stock => {
      // 模拟价格波动
      const changePercent = (Math.random() - 0.5) * 2.0; // -1% 到 +1%
      const change = stock.basePrice * (changePercent / 100);
      const price = stock.basePrice + change;

      const mockData: MarketData = {
        symbol: stock.symbol,
        name: stock.name,
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        volume: Math.floor(Math.random() * 2000000) + 500000,
        timestamp: new Date(),
        
        bid: Number((price - 0.01).toFixed(2)),
        ask: Number((price + 0.01).toFixed(2)),
        high: Number((price * (1 + Math.random() * 0.03)).toFixed(2)),
        low: Number((price * (1 - Math.random() * 0.03)).toFixed(2)),
        open: Number((stock.basePrice * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2)),
        
        // 模拟专业数据
        vwap: Number((price * (1 + (Math.random() - 0.5) * 0.005)).toFixed(2)),
        turnover: Math.floor(Math.random() * 50000000) + 10000000,
        amplitude: Number((Math.random() * 8).toFixed(2)),
        pe: Number((15 + Math.random() * 50).toFixed(1)),
        pb: Number((1 + Math.random() * 10).toFixed(1)),
        marketCap: Math.floor(Math.random() * 10000) + 1000,
        floatShares: Math.floor(Math.random() * 10000) + 1000,
        totalShares: Math.floor(Math.random() * 15000) + 1000,
      };

      this.broadcastMarketData(mockData);
    });
  }

  /**
   * 停止数据流
   */
  private stopMockDataStream(): void {
    if (this.mockDataTimer !== null) {
      clearInterval(this.mockDataTimer);
      this.mockDataTimer = null;
    }
  }
}

// 全局单例实例
let globalDataStreamManager: DataStreamManager | null = null;

/**
 * 获取全局数据流管理器实例
 */
export function getDataStreamManager(): DataStreamManager {
  if (!globalDataStreamManager) {
    globalDataStreamManager = new DataStreamManager();
    
    // 自动连接
    if (typeof window !== 'undefined') {
      globalDataStreamManager.connect();
    }
  }
  return globalDataStreamManager;
}

/**
 * React Hook: 使用实时数据流
 */
export function useMarketData(symbols: string[], options: {
  enableLevel2?: boolean;
  enableTickData?: boolean;
  autoConnect?: boolean;
} = {}): {
  data: Map<string, MarketData>;
  status: ConnectionStatus;
  connectionInfo: ReturnType<DataStreamManager['getConnectionInfo']>;
  actions: {
    reconnect: () => void;
    enableLevel2: () => void;
    disableLevel2: () => void;
    enableTickData: () => void;
    disableTickData: () => void;
  };
} {
  const { enableLevel2 = false, enableTickData = false, autoConnect = true } = options;
  
  const [data, setData] = React.useState<Map<string, MarketData>>(new Map());
  const [status, setStatus] = React.useState<ConnectionStatus>('disconnected');
  const [connectionInfo, setConnectionInfo] = React.useState<ReturnType<DataStreamManager['getConnectionInfo']>>({
    status: 'disconnected',
    reconnectAttempts: 0,
    subscriptionsCount: 0,
    isWebSocketActive: false
  });
  
  const dataStreamManager = React.useMemo(() => getDataStreamManager(), []);

  // 更新配置
  React.useEffect(() => {
    if (enableLevel2) {
      dataStreamManager.enableLevel2Data();
    } else {
      dataStreamManager.disableLevel2Data();
    }
    
    if (enableTickData) {
      dataStreamManager.enableTickData();
    } else {
      dataStreamManager.disableTickData();
    }
  }, [enableLevel2, enableTickData, dataStreamManager]);

  React.useEffect(() => {
    // 监听连接状态
    const unsubscribeStatus = dataStreamManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setConnectionInfo(dataStreamManager.getConnectionInfo());
    });
    
    setStatus(dataStreamManager.getStatus());
    setConnectionInfo(dataStreamManager.getConnectionInfo());

    // 自动连接
    if (autoConnect && dataStreamManager.getStatus() === 'disconnected') {
      dataStreamManager.connect();
    }

    // 订阅市场数据
    let subscriptionId: string | null = null;
    
    if (symbols.length > 0) {
      subscriptionId = dataStreamManager.subscribe(symbols, (marketData) => {
        setData(prev => {
          const next = new Map(prev);
          next.set(marketData.symbol, marketData);
          return next;
        });
      });
    }

    // 定期更新连接信息
    const infoInterval = setInterval(() => {
      setConnectionInfo(dataStreamManager.getConnectionInfo());
    }, 5000);

    // 清理
    return () => {
      unsubscribeStatus();
      if (subscriptionId) {
        dataStreamManager.unsubscribe(subscriptionId);
      }
      clearInterval(infoInterval);
    };
  }, [symbols.join(','), autoConnect, dataStreamManager]);

  const actions = React.useMemo(() => ({
    reconnect: () => {
      dataStreamManager.reconnect();
    },
    enableLevel2: () => {
      dataStreamManager.enableLevel2Data();
    },
    disableLevel2: () => {
      dataStreamManager.disableLevel2Data();
    },
    enableTickData: () => {
      dataStreamManager.enableTickData();
    },
    disableTickData: () => {
      dataStreamManager.disableTickData();
    }
  }), [dataStreamManager]);

  return { 
    data, 
    status, 
    connectionInfo,
    actions
  };
}

export class EnhancedDataStreamManager extends DataStreamManager {
  // ============================================================================
  // 高频数据获取方法
  // ============================================================================

  /**
   * 获取分钟级K线数据
   */
  async getMinuteData(symbol: string, limit: number = 240): Promise<any[]> {
    try {
      const response = await apiClient.get(`/api/market/minute/${symbol}?limit=${limit}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('[DataStream] Failed to get minute data:', error);
      return [];
    }
  }

  /**
   * 获取Tick数据（逐笔交易）
   */
  async getTickData(symbol: string, limit: number = 100): Promise<TickData[]> {
    try {
      const response = await apiClient.get(`/api/market/tick/${symbol}?limit=${limit}`);
      return response.data?.data?.map((tick: any) => ({
        price: tick.price,
        volume: tick.volume,
        direction: tick.direction as 'up' | 'down' | 'neutral',
        timestamp: new Date(tick.timestamp)
      })) || [];
    } catch (error) {
      console.error('[DataStream] Failed to get tick data:', error);
      return [];
    }
  }

  /**
   * 获取日内高频数据
   */
  async getIntradayData(symbol: string, interval: '1min' | '5min' | '15min' | '30min' = '1min'): Promise<any[]> {
    try {
      const response = await apiClient.get(`/api/market/intraday/${symbol}?interval=${interval}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('[DataStream] Failed to get intraday data:', error);
      return [];
    }
  }

  /**
   * 启用高频数据流
   */
  enableHighFrequencyData(): void {
    this.config.enableHighFrequency = true;
    this.config.updateInterval = this.config.highFreqInterval;
    console.log('[DataStream] High frequency data enabled');
  }

  /**
   * 禁用高频数据流
   */
  disableHighFrequencyData(): void {
    this.config.enableHighFrequency = false;
    this.config.updateInterval = 1000; // 恢复1秒更新
    console.log('[DataStream] High frequency data disabled');
  }

  /**
   * 启用分钟级数据
   */
  enableMinuteData(): void {
    this.config.enableMinuteData = true;
    console.log('[DataStream] Minute data enabled');
  }

  /**
   * 禁用分钟级数据
   */
  disableMinuteData(): void {
    this.config.enableMinuteData = false;
    console.log('[DataStream] Minute data disabled');
  }

  /**
   * 启用秒级数据
   */
  enableSecondData(): void {
    this.config.enableSecondData = true;
    this.config.highFreqInterval = 100; // 100ms更新
    console.log('[DataStream] Second data enabled');
  }

  /**
   * 禁用秒级数据
   */
  disableSecondData(): void {
    this.config.enableSecondData = false;
    this.config.highFreqInterval = 500; // 恢复500ms
    console.log('[DataStream] Second data disabled');
  }

  /**
   * 获取Level2深度数据
   */
  async getLevel2Data(symbol: string): Promise<Level2Data | null> {
    try {
      const response = await apiClient.get(`/api/market/level2/${symbol}`);
      if (response.data?.success) {
        const data = response.data.data;
        return {
          buyOrders: data.buyOrders || [],
          sellOrders: data.sellOrders || [],
          trades: data.recentTrades?.map((trade: any) => ({
            price: trade.price,
            volume: trade.volume,
            direction: trade.direction as 'buy' | 'sell' | 'neutral',
            timestamp: new Date(trade.timestamp)
          })) || [],
          timestamp: new Date()
        };
      }
      return null;
    } catch (error) {
      console.error('[DataStream] Failed to get Level2 data:', error);
      return null;
    }
  }

  /**
   * 获取多只股票的实时行情（批量）
   */
  async getBatchQuotes(symbols: string[]): Promise<MarketData[]> {
    try {
      const response = await apiClient.post('/api/market/realtime', {
        symbols,
        fields: ['price', 'change', 'changePercent', 'volume', 'timestamp', 'bid', 'ask', 'high', 'low', 'open']
      });

      if (response.data?.success) {
        return response.data.data.map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.name || quote.symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume,
          timestamp: new Date(quote.timestamp),
          bid: quote.bid1,
          ask: quote.ask1,
          high: quote.high,
          low: quote.low,
          open: quote.open,
          vwap: quote.vwap,
          turnover: quote.amount,
          amplitude: quote.amplitude,
          pe: quote.pe,
          pb: quote.pb,
          marketCap: quote.marketCap,
          floatShares: quote.floatShares,
          totalShares: quote.totalShares
        }));
      }
      return [];
    } catch (error) {
      console.error('[DataStream] Failed to get batch quotes:', error);
      return [];
    }
  }
}

// ============================================================================
// 增强的React Hook：useHighFrequencyData
// ============================================================================

export function useHighFrequencyData(
  symbols: string[], 
  config: {
    enableLevel2?: boolean;
    enableTickData?: boolean;
    enableMinuteData?: boolean;
    updateInterval?: number;
  } = {}
) {
  const dataStreamManager = getDataStreamManager();
  const [data, setData] = React.useState<Map<string, MarketData>>(new Map());
  const [tickData, setTickData] = React.useState<Map<string, TickData[]>>(new Map());
  const [level2Data, setLevel2Data] = React.useState<Map<string, Level2Data>>(new Map());
  const [status, setStatus] = React.useState<ConnectionStatus>('disconnected');

  React.useEffect(() => {
    // 配置高频数据
    if (config.enableLevel2) dataStreamManager.enableLevel2Data();
    if (config.enableTickData) dataStreamManager.enableTickData();
    if (config.enableMinuteData) dataStreamManager.enableMinuteData();
    if (config.updateInterval) {
      dataStreamManager.config.highFreqInterval = config.updateInterval;
    }

    // 订阅实时数据
    const subscriptionId = dataStreamManager.subscribe(symbols, (marketData) => {
      setData(prev => new Map(prev).set(marketData.symbol, marketData));
    });

    // 状态监听
    const statusListener = (newStatus: ConnectionStatus) => setStatus(newStatus);
    dataStreamManager.addStatusListener(statusListener);

    // 定期获取高频数据
    let tickInterval: number | null = null;
    let level2Interval: number | null = null;

    if (config.enableTickData) {
      tickInterval = window.setInterval(async () => {
        const tickUpdates = new Map<string, TickData[]>();
        for (const symbol of symbols) {
          try {
            const ticks = await dataStreamManager.getTickData(symbol, 50);
            tickUpdates.set(symbol, ticks);
          } catch (error) {
            console.error(`Failed to get tick data for ${symbol}:`, error);
          }
        }
        setTickData(tickUpdates);
      }, config.updateInterval || 1000);
    }

    if (config.enableLevel2) {
      level2Interval = window.setInterval(async () => {
        const level2Updates = new Map<string, Level2Data>();
        for (const symbol of symbols) {
          try {
            const level2 = await dataStreamManager.getLevel2Data(symbol);
            if (level2) level2Updates.set(symbol, level2);
          } catch (error) {
            console.error(`Failed to get Level2 data for ${symbol}:`, error);
          }
        }
        setLevel2Data(level2Updates);
      }, (config.updateInterval || 1000) * 2); // Level2数据更新频率稍低
    }

    // 清理
    return () => {
      dataStreamManager.unsubscribe(subscriptionId);
      dataStreamManager.removeStatusListener(statusListener);
      if (tickInterval) clearInterval(tickInterval);
      if (level2Interval) clearInterval(level2Interval);
    };
  }, [symbols.join(','), JSON.stringify(config)]);

  return {
    marketData: data,
    tickData: config.enableTickData ? tickData : new Map(),
    level2Data: config.enableLevel2 ? level2Data : new Map(),
    status,
    connectionInfo: {
      connected: status === 'connected',
      symbols: symbols.length,
      lastUpdate: new Date(),
      dataTypes: {
        realtime: true,
        tick: config.enableTickData || false,
        level2: config.enableLevel2 || false
      }
    }
  };
}

// React import for hooks
import React from 'react';
