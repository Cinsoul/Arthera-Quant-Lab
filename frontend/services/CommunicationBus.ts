/**
 * ModuleCommunicationBus - 模块间通信总线
 * 独立文件以避免循环依赖并保持实现一致
 */

// 模块间通信和状态管理
// ============================================================================

// 数据传输优化接口
interface DataTransferConfig {
  compression: boolean;
  batchSize: number;
  debounceMs: number;
  priority: 'high' | 'normal' | 'low';
  cacheKey?: string;
  ttl?: number; // Time to live in seconds
}

interface QueuedEvent {
  type: string;
  data: any;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
  retries: number;
  config?: DataTransferConfig;
}

/**
 * 增强的模块间通信事件总线 - 支持数据传输优化
 */
class ModuleCommunicationBus extends EventTarget {
  private state: {
    currentStrategy: any;
    currentPortfolio: any;
    currentStockSelection: any;
    serviceStatus: Record<string, boolean>;
    comparisonState: {
      selectedStrategies: string[];
      activeComparison: boolean;
      sharedReports: any[];
    };
    labState: {
      activeStrategy: any;
      backtestInProgress: boolean;
      lastResults: any;
    };
    navigationState: {
      currentModule: string;
      parameters: Record<string, any>;
    };
  } = {
    currentStrategy: null,
    currentPortfolio: null,
    currentStockSelection: null,
    serviceStatus: {},
    comparisonState: {
      selectedStrategies: [],
      activeComparison: false,
      sharedReports: []
    },
    labState: {
      activeStrategy: null,
      backtestInProgress: false,
      lastResults: null
    },
    navigationState: {
      currentModule: 'dashboard',
      parameters: {}
    }
  };

  // 数据传输优化私有属性
  private eventQueue: QueuedEvent[] = [];
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private dataCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private compressionEnabled = true;
  private maxRetries = 3;

  constructor() {
    super();
    this.startQueueProcessor();
    this.startCacheCleanup();
  }

  /**
   * 优化的事件发送 - 支持批处理、缓存和压缩
   */
  private dispatchOptimizedEvent(type: string, data: any, config?: DataTransferConfig) {
    const defaultConfig: DataTransferConfig = {
      compression: this.compressionEnabled,
      batchSize: 10,
      debounceMs: 100,
      priority: 'normal'
    };

    const eventConfig = { ...defaultConfig, ...config };

    // 检查缓存
    if (eventConfig.cacheKey) {
      const cached = this.dataCache.get(eventConfig.cacheKey);
      if (cached && (Date.now() - cached.timestamp) < (cached.ttl * 1000)) {
        // 使用缓存数据
        this.dispatchEvent(new CustomEvent(type, { detail: cached.data }));
        return;
      }
    }

    // 创建队列事件
    const queuedEvent: QueuedEvent = {
      type,
      data: this.compressData(data, eventConfig.compression),
      timestamp: Date.now(),
      priority: eventConfig.priority,
      retries: 0,
      config: eventConfig
    };

    // 添加到队列
    this.eventQueue.push(queuedEvent);
    this.sortEventQueue();

    // 设置批处理定时器
    if (!this.batchTimers.has(type)) {
      const timer = setTimeout(() => {
        this.processBatch(type);
        this.batchTimers.delete(type);
      }, eventConfig.debounceMs);
      this.batchTimers.set(type, timer);
    }
  }

  /**
   * 数据压缩
   */
  private compressData(data: any, enabled: boolean): any {
    if (!enabled || !data) return data;
    
    try {
      // 简化的压缩逻辑 - 移除不必要的字段
      if (typeof data === 'object') {
        const compressed = { ...data };
        
        // 移除大型数组中的重复数据
        if (Array.isArray(compressed.performanceHistory) && compressed.performanceHistory.length > 100) {
          compressed.performanceHistory = compressed.performanceHistory.slice(-50); // 保留最近50个点
        }
        
        // 移除调试信息
        delete compressed.debug;
        delete compressed.trace;
        delete compressed.metadata?.verbose;
        
        return compressed;
      }
      return data;
    } catch (error) {
      console.warn('[ModuleCommunication] Data compression failed:', error);
      return data;
    }
  }

  /**
   * 队列排序 - 按优先级排序
   */
  private sortEventQueue() {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    this.eventQueue.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * 批量处理事件
   */
  private processBatch(eventType: string) {
    const events = this.eventQueue.filter(e => e.type === eventType);
    this.eventQueue = this.eventQueue.filter(e => e.type !== eventType);

    if (events.length === 0) return;

    try {
      if (events.length === 1) {
        // 单个事件直接发送
        const event = events[0];
        this.dispatchEvent(new CustomEvent(event.type, { detail: event.data }));
        this.updateCache(event);
      } else {
        // 批量事件合并发送
        const batchData = {
          batch: true,
          events: events.map(e => e.data),
          count: events.length,
          timestamp: Date.now()
        };
        
        this.dispatchEvent(new CustomEvent(eventType, { detail: batchData }));
        
        // 缓存最后一个事件
        if (events.length > 0) {
          this.updateCache(events[events.length - 1]);
        }
      }
    } catch (error) {
      console.error('[ModuleCommunication] Batch processing failed:', error);
      // 重新加入队列并增加重试次数
      events.forEach(event => {
        if (event.retries < this.maxRetries) {
          event.retries++;
          this.eventQueue.push(event);
        }
      });
    }
  }

  /**
   * 更新缓存
   */
  private updateCache(event: QueuedEvent) {
    if (event.config?.cacheKey && event.config?.ttl) {
      this.dataCache.set(event.config.cacheKey, {
        data: event.data,
        timestamp: Date.now(),
        ttl: event.config.ttl
      });
    }
  }

  /**
   * 队列处理器
   */
  private startQueueProcessor() {
    setInterval(() => {
      if (this.eventQueue.length === 0) return;

      // 处理高优先级事件
      const highPriorityEvents = this.eventQueue.filter(e => e.priority === 'high');
      if (highPriorityEvents.length > 0) {
        highPriorityEvents.forEach(event => {
          try {
            this.dispatchEvent(new CustomEvent(event.type, { detail: event.data }));
            this.updateCache(event);
          } catch (error) {
            console.error('[ModuleCommunication] High priority event failed:', error);
          }
        });
        this.eventQueue = this.eventQueue.filter(e => e.priority !== 'high');
      }

      // 清理过期的队列事件
      const now = Date.now();
      this.eventQueue = this.eventQueue.filter(e => (now - e.timestamp) < 30000); // 30秒超时
    }, 50); // 每50ms处理一次
  }

  /**
   * 缓存清理
   */
  private startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.dataCache.entries()) {
        if ((now - value.timestamp) > (value.ttl * 1000)) {
          this.dataCache.delete(key);
        }
      }
    }, 60000); // 每分钟清理一次缓存
  }

  /**
   * 策略实验室 -> 首页仪表板：策略完成通知
   */
  notifyStrategyCompleted(strategyResult: any) {
    this.state.currentStrategy = strategyResult;
    this.dispatchOptimizedEvent('strategy:completed', { strategy: strategyResult }, {
      compression: true,
      batchSize: 1,
      debounceMs: 50,
      priority: 'high',
      cacheKey: `strategy:completed:${strategyResult.id}`,
      ttl: 300 // 5分钟缓存
    });
    console.log('📈 Strategy completed, notifying dashboard with optimization');
  }

  /**
   * 策略实验室 -> 组合体验：应用策略到组合
   */
  applyStrategyToPortfolio(strategyResult: any, portfolioConfig?: any) {
    this.dispatchOptimizedEvent('strategy:apply-to-portfolio', { 
      strategy: strategyResult, 
      config: portfolioConfig 
    }, {
      compression: true,
      batchSize: 5,
      debounceMs: 200,
      priority: 'normal',
      cacheKey: `portfolio:strategy:${strategyResult.id}`,
      ttl: 600 // 10分钟缓存
    });
    console.log('🔄 Applying strategy to portfolio with optimization');
  }

  /**
   * 选股器 -> 策略实验室：导入选股结果
   */
  importStockSelection(stockSelection: any) {
    this.state.currentStockSelection = stockSelection;
    this.dispatchOptimizedEvent('stocks:selection-changed', { 
      selection: stockSelection 
    }, {
      compression: true,
      batchSize: 3,
      debounceMs: 300,
      priority: 'normal',
      cacheKey: `stocks:selection:${Date.now()}`,
      ttl: 1800 // 30分钟缓存
    });
    console.log('📋 Stock selection imported to strategy lab with optimization');
  }

  /**
   * 策略实验室 -> 策略对比：添加策略到对比
   */
  addStrategyToComparison(strategyResult: any) {
    this.dispatchEvent(new CustomEvent('strategy:add-to-comparison', { 
      detail: { strategy: strategyResult } 
    }));
    console.log('⚖️ Strategy added to comparison');
  }

  /**
   * 获取当前状态
   */
  getCurrentState() {
    return { ...this.state };
  }

  /**
   * 更新服务状态
   */
  updateServiceStatus(serviceStatus: Record<string, boolean>) {
    this.state.serviceStatus = { ...this.state.serviceStatus, ...serviceStatus };
    this.dispatchEvent(new CustomEvent('services:status-updated', { 
      detail: { status: this.state.serviceStatus } 
    }));
  }

  /**
   * 策略实验室 -> 策略对比：同步策略数据
   */
  syncStrategyToComparison(strategyData: any) {
    this.state.comparisonState.selectedStrategies = [
      ...this.state.comparisonState.selectedStrategies.filter(id => id !== strategyData.id),
      strategyData.id
    ];
    this.dispatchEvent(new CustomEvent('comparison:strategy-synced', {
      detail: { strategy: strategyData, comparisonState: this.state.comparisonState }
    }));
    console.log('🔄 Strategy synced to comparison:', strategyData.id);
  }

  /**
   * 策略对比 -> 策略实验室：请求策略详情
   */
  requestStrategyDetails(strategyId: string) {
    this.dispatchEvent(new CustomEvent('lab:strategy-details-requested', {
      detail: { strategyId, requestTime: Date.now() }
    }));
    console.log('📋 Strategy details requested for:', strategyId);
  }

  /**
   * 策略实验室 -> 策略对比：提供策略详情
   */
  provideStrategyDetails(strategyId: string, details: any) {
    this.dispatchEvent(new CustomEvent('comparison:strategy-details-provided', {
      detail: { strategyId, details, timestamp: Date.now() }
    }));
    console.log('📤 Strategy details provided for:', strategyId);
  }

  /**
   * 更新对比状态
   */
  updateComparisonState(updates: Partial<typeof this.state.comparisonState>) {
    this.state.comparisonState = { ...this.state.comparisonState, ...updates };
    this.dispatchEvent(new CustomEvent('comparison:state-updated', {
      detail: { comparisonState: this.state.comparisonState }
    }));
  }

  /**
   * 更新实验室状态
   */
  updateLabState(updates: Partial<typeof this.state.labState>) {
    this.state.labState = { ...this.state.labState, ...updates };
    this.dispatchEvent(new CustomEvent('lab:state-updated', {
      detail: { labState: this.state.labState }
    }));
  }

  /**
   * 模块导航同步
   */
  updateNavigationState(module: string, parameters: Record<string, any> = {}) {
    this.state.navigationState = {
      currentModule: module,
      parameters: { ...this.state.navigationState.parameters, ...parameters }
    };
    this.dispatchEvent(new CustomEvent('navigation:state-updated', {
      detail: { navigationState: this.state.navigationState }
    }));
    console.log(`🧭 Navigation updated: ${module}`, parameters);
  }

  /**
   * 策略对比报告共享
   */
  shareComparisonReport(reportData: any) {
    this.state.comparisonState.sharedReports.push({
      ...reportData,
      id: `report_${Date.now()}`,
      createdAt: new Date(),
      shared: true
    });
    this.dispatchEvent(new CustomEvent('comparison:report-shared', {
      detail: { report: reportData, sharedReports: this.state.comparisonState.sharedReports }
    }));
    console.log('📊 Comparison report shared:', reportData.title);
  }

  /**
   * 获取传输性能指标
   */
  getPerformanceMetrics() {
    return {
      queueSize: this.eventQueue.length,
      cacheSize: this.dataCache.size,
      activeBatches: this.batchTimers.size,
      compressionEnabled: this.compressionEnabled,
      totalEvents: this.eventQueue.reduce((sum, e) => sum + e.retries + 1, 0),
      highPriorityEvents: this.eventQueue.filter(e => e.priority === 'high').length,
      cacheHitRatio: this.calculateCacheHitRatio()
    };
  }

  /**
   * 计算缓存命中率
   */
  private calculateCacheHitRatio(): number {
    // 简化的命中率计算
    const totalCacheRequests = 100; // 示例值
    const cacheHits = Math.min(this.dataCache.size * 2, totalCacheRequests);
    return totalCacheRequests > 0 ? (cacheHits / totalCacheRequests) * 100 : 0;
  }

  /**
   * 调整传输配置
   */
  configureTransfer(options: {
    compression?: boolean;
    maxRetries?: number;
    queueProcessingInterval?: number;
    cacheCleanupInterval?: number;
  }) {
    if (options.compression !== undefined) {
      this.compressionEnabled = options.compression;
    }
    if (options.maxRetries !== undefined) {
      this.maxRetries = options.maxRetries;
    }
    console.log('📊 Transfer configuration updated:', options);
  }

  /**
   * 强制处理所有队列事件
   */
  flushQueue() {
    const queueSize = this.eventQueue.length;
    
    // 清理所有定时器
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();

    // 按类型批量处理所有事件
    const eventTypes = [...new Set(this.eventQueue.map(e => e.type))];
    eventTypes.forEach(type => this.processBatch(type));

    console.log(`🚀 Flushed ${queueSize} events from queue`);
  }

  /**
   * 清理缓存
   */
  clearCache() {
    const cacheSize = this.dataCache.size;
    this.dataCache.clear();
    console.log(`🧹 Cleared ${cacheSize} cache entries`);
  }

  /**
   * 高优先级事件发送（跳过队列）
   */
  dispatchUrgentEvent(type: string, data: any) {
    try {
      this.dispatchEvent(new CustomEvent(type, { detail: data }));
      console.log(`⚡ Urgent event dispatched: ${type}`);
    } catch (error) {
      console.error('[ModuleCommunication] Urgent event failed:', error);
    }
  }

  /**
   * Emit方法 - 兼容其他事件发射器接口
   */
  emit(eventType: string, data?: any) {
    try {
      this.dispatchEvent(new CustomEvent(eventType, { detail: data }));
      console.log(`📡 Event emitted: ${eventType}`);
    } catch (error) {
      console.error(`[ModuleCommunication] Emit failed for ${eventType}:`, error);
    }
  }

  /**
   * 清除状态
   */
  clearState() {
    this.state = {
      currentStrategy: null,
      currentPortfolio: null,
      currentStockSelection: null,
      serviceStatus: {},
      comparisonState: {
        selectedStrategies: [],
        activeComparison: false,
        sharedReports: []
      },
      labState: {
        activeStrategy: null,
        backtestInProgress: false,
        lastResults: null
      },
      navigationState: {
        currentModule: 'dashboard',
        parameters: {}
      }
    };
    this.dispatchEvent(new CustomEvent('state:cleared'));
  }
}

const globalScope: any = typeof globalThis !== 'undefined'
  ? globalThis
  : (typeof window !== 'undefined' ? window : {});

const existingBus: ModuleCommunicationBus | undefined = globalScope.__moduleCommunication;
export const moduleCommunication: ModuleCommunicationBus = existingBus || new ModuleCommunicationBus();

if (!existingBus) {
  globalScope.__moduleCommunication = moduleCommunication;
}

export default moduleCommunication;
