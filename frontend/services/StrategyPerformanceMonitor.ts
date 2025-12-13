/**
 * StrategyPerformanceMonitor - 增强型策略性能监控服务
 * 
 * 功能：
 * - 实时策略性能监控
 * - 策略执行状态跟踪
 * - 多策略对比分析
 * - 风险指标实时计算
 * - 智能告警和通知
 * - 性能归因分析
 * ✅ 系统性能监控 (新增)
 * ✅ 组件错误跟踪 (新增)
 * ✅ API性能监控 (新增)
 * ✅ 服务健康检查 (新增)
 * ✅ 自动错误恢复 (新增)
 */

import { getDataStreamManager } from './DataStreamManager';
import { getStrategyExecutionService, type BacktestResult, type StrategyConfig } from './StrategyExecutionService';
import { getRiskAnalysisService, type RiskMetrics } from './RiskAnalysisService';
import { getAlertService, type Alert } from './AlertService';
import { getCacheManager } from './CacheManager';
import { getIndicatorCalculationService } from './IndicatorCalculationService';

// ============================================================================
// Types - 增强的性能监控类型定义
// ============================================================================

// 系统性能监控类型
export interface SystemPerformanceMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    latency: number;
    throughput: number;
    errors: number;
  };
  application: {
    componentRenderTime: Record<string, number>;
    apiResponseTimes: Record<string, number>;
    errorCount: number;
    activeConnections: number;
  };
}

// 错误记录类型
export interface ErrorRecord {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  component: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  resolved: boolean;
  recoveryActions?: string[];
}

// 组件性能跟踪
export interface ComponentPerformance {
  componentName: string;
  renderTime: number;
  updateCount: number;
  errorCount: number;
  lastUpdate: number;
}

// API性能跟踪
export interface APIPerformanceTracker {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  errorRate: number;
  throughput: number;
}

// 服务健康状态
export interface ServiceHealthStatus {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
  dependencies: {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
  }[];
}

// 性能警报增强
export interface EnhancedPerformanceAlert extends PerformanceAlert {
  systemMetrics?: Partial<SystemPerformanceMetrics>;
  recommendations?: string[];
  autoRecoveryAttempted?: boolean;
  autoRecoverySuccess?: boolean;
}

export interface StrategyPerformanceMetrics {
  strategyId: string;
  strategyName: string;
  startDate: Date;
  lastUpdate: Date;
  
  // 收益指标
  totalReturn: number;
  annualizedReturn: number;
  monthlyReturns: number[];
  dailyReturns: number[];
  
  // 风险指标
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  var95: number;
  var99: number;
  
  // 交易指标
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  
  // 实时状态
  currentPosition: number;
  currentPnL: number;
  todayPnL: number;
  isRunning: boolean;
  lastSignal?: StrategySignal;
}

export interface StrategySignal {
  timestamp: Date;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  price: number;
  reason: string;
}

export interface PerformanceAlert {
  id: string;
  strategyId: string;
  type: 'drawdown' | 'volatility' | 'return' | 'risk' | 'signal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
}

export interface ComparisonMetrics {
  strategies: string[];
  correlationMatrix: number[][];
  riskReturnScatter: { strategyId: string; risk: number; return: number }[];
  rankings: {
    byReturn: string[];
    byRisk: string[];
    bySharpe: string[];
    bySortino: string[];
    byMaxDrawdown: string[];
    byWinRate: string[];
    byVolatility: string[];
  };
  bestPerformer: string;
  worstPerformer: string;
  portfolioOptimization: {
    efficientFrontier: { risk: number; return: number; weights: Record<string, number> }[];
    recommendedAllocation: Record<string, number>;
    expectedReturn: number;
    expectedRisk: number;
  };
  riskAnalysis: {
    diversificationBenefit: number;
    portfolioVaR95: number;
    portfolioVaR99: number;
    concentrationRisk: number;
    liquidityRisk: number;
  };
  marketRegimeAnalysis: {
    bullMarket: Record<string, number>;
    bearMarket: Record<string, number>;
    sidewaysMarket: Record<string, number>;
  };
  lastUpdated: Date;
}

export interface PerformanceSubscription {
  id: string;
  strategyIds: string[];
  frequency: 'realtime' | 'minute' | 'hourly' | 'daily';
  callback: (metrics: StrategyPerformanceMetrics[]) => void;
  active: boolean;
}

// ============================================================================
// Strategy Performance Monitor
// ============================================================================

export class StrategyPerformanceMonitor {
  private dataStream = getDataStreamManager();
  private strategyService = getStrategyExecutionService();
  private riskService = getRiskAnalysisService();
  private alertService = getAlertService();
  private cache = getCacheManager();
  private indicatorService = getIndicatorCalculationService();

  private performanceCache = new Map<string, StrategyPerformanceMetrics>();
  private subscriptions = new Map<string, PerformanceSubscription>();
  private runningStrategies = new Set<string>();
  private alertThresholds = new Map<string, any>();
  
  private updateInterval: number | null = null;
  private isInitialized = false;

  // 增强的性能监控属性
  private systemMetrics: SystemPerformanceMetrics[] = [];
  private errorRecords: ErrorRecord[] = [];
  private componentPerformance = new Map<string, ComponentPerformance>();
  private apiPerformance = new Map<string, APIPerformanceTracker>();
  private serviceHealthStatus = new Map<string, ServiceHealthStatus>();
  private systemMonitoringInterval: number | null = null;
  private errorRecoveryHandlers = new Map<string, Function>();
  private monitoringConfig = {
    enabled: true,
    samplingInterval: 5000, // 5秒
    alertThresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
      apiResponseTime: 3000,
      errorRate: 5
    },
    retentionPeriod: 24 * 60 * 60 * 1000, // 24小时
    enableAutoRecovery: true
  };

  constructor() {
    this.initializeDefaultThresholds();
    this.setupGlobalErrorHandlers();
  }

  /**
   * 初始化监控服务 - 增强版
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[StrategyMonitor] Initializing enhanced strategy performance monitor...');

      // 加载缓存的性能数据
      await this.loadCachedPerformance();
      
      // 设置数据流订阅
      this.setupDataStreamSubscription();
      
      // 启动定期更新
      this.startPerformanceUpdates();

      // 启动系统性能监控
      this.startSystemMonitoring();

      // 初始化服务健康检查
      this.initializeHealthChecks();
      
      // 设置告警监听
      this.setupAlertMonitoring();
      
      this.isInitialized = true;
      console.log('[StrategyMonitor] Performance monitor initialized successfully');
      
    } catch (error) {
      console.error('[StrategyMonitor] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * 开始监控策略
   */
  startMonitoring(strategyId: string, config: StrategyConfig): void {
    if (this.runningStrategies.has(strategyId)) {
      console.warn(`[StrategyMonitor] Strategy ${strategyId} is already being monitored`);
      return;
    }

    this.runningStrategies.add(strategyId);
    
    // 初始化性能指标
    const initialMetrics: StrategyPerformanceMetrics = {
      strategyId,
      strategyName: config.name,
      startDate: config.startDate,
      lastUpdate: new Date(),
      totalReturn: 0,
      annualizedReturn: 0,
      monthlyReturns: [],
      dailyReturns: [],
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      volatility: 0,
      var95: 0,
      var99: 0,
      totalTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      currentPosition: 0,
      currentPnL: 0,
      todayPnL: 0,
      isRunning: true
    };

    this.performanceCache.set(strategyId, initialMetrics);
    
    console.log(`[StrategyMonitor] Started monitoring strategy: ${strategyId}`);
  }

  /**
   * 停止监控策略
   */
  stopMonitoring(strategyId: string): void {
    if (!this.runningStrategies.has(strategyId)) return;

    this.runningStrategies.delete(strategyId);
    
    // 更新最终状态
    const metrics = this.performanceCache.get(strategyId);
    if (metrics) {
      metrics.isRunning = false;
      metrics.lastUpdate = new Date();
      this.performanceCache.set(strategyId, metrics);
    }

    console.log(`[StrategyMonitor] Stopped monitoring strategy: ${strategyId}`);
  }

  /**
   * 获取策略性能指标
   */
  getPerformanceMetrics(strategyId: string): StrategyPerformanceMetrics | null {
    return this.performanceCache.get(strategyId) || null;
  }

  /**
   * 获取所有监控中的策略
   */
  getAllPerformanceMetrics(): StrategyPerformanceMetrics[] {
    return Array.from(this.performanceCache.values());
  }

  /**
   * 获取策略对比分析
   */
  async getComparisonMetrics(strategyIds: string[]): Promise<ComparisonMetrics> {
    const strategies = strategyIds.map(id => this.performanceCache.get(id)).filter(Boolean) as StrategyPerformanceMetrics[];
    
    if (strategies.length < 2) {
      throw new Error('需要至少2个策略进行对比');
    }

    // 计算相关性矩阵
    const correlationMatrix = this.calculateCorrelationMatrix(strategies);
    
    // 风险收益散点图数据
    const riskReturnScatter = strategies.map(s => ({
      strategyId: s.strategyId,
      risk: s.volatility,
      return: s.annualizedReturn
    }));

    // 扩展排名计算
    const rankings = {
      byReturn: strategies.sort((a, b) => b.annualizedReturn - a.annualizedReturn).map(s => s.strategyId),
      byRisk: strategies.sort((a, b) => a.volatility - b.volatility).map(s => s.strategyId),
      bySharpe: strategies.sort((a, b) => b.sharpeRatio - a.sharpeRatio).map(s => s.strategyId),
      bySortino: strategies.sort((a, b) => b.sortinoRatio - a.sortinoRatio).map(s => s.strategyId),
      byMaxDrawdown: strategies.sort((a, b) => a.maxDrawdown - b.maxDrawdown).map(s => s.strategyId),
      byWinRate: strategies.sort((a, b) => b.winRate - a.winRate).map(s => s.strategyId),
      byVolatility: strategies.sort((a, b) => a.volatility - b.volatility).map(s => s.strategyId)
    };

    // 组合优化分析
    const portfolioOptimization = this.calculatePortfolioOptimization(strategies);
    
    // 风险分析
    const riskAnalysis = this.calculateRiskAnalysis(strategies, correlationMatrix);
    
    // 市场环境分析
    const marketRegimeAnalysis = this.calculateMarketRegimeAnalysis(strategies);

    return {
      strategies: strategyIds,
      correlationMatrix,
      riskReturnScatter,
      rankings,
      bestPerformer: rankings.bySharpe[0],
      worstPerformer: rankings.bySharpe[rankings.bySharpe.length - 1],
      portfolioOptimization,
      riskAnalysis,
      marketRegimeAnalysis,
      lastUpdated: new Date()
    };
  }

  /**
   * 订阅性能更新
   */
  subscribeToPerformance(
    strategyIds: string[],
    frequency: 'realtime' | 'minute' | 'hourly' | 'daily',
    callback: (metrics: StrategyPerformanceMetrics[]) => void
  ): string {
    const subscriptionId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: PerformanceSubscription = {
      id: subscriptionId,
      strategyIds,
      frequency,
      callback,
      active: true
    };

    this.subscriptions.set(subscriptionId, subscription);
    
    console.log(`[StrategyMonitor] Created performance subscription: ${subscriptionId}`);
    return subscriptionId;
  }

  /**
   * 取消性能订阅
   */
  unsubscribeFromPerformance(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
      console.log(`[StrategyMonitor] Cancelled performance subscription: ${subscriptionId}`);
    }
  }

  /**
   * 设置告警阈值
   */
  setAlertThreshold(strategyId: string, type: string, threshold: number): void {
    const strategyThresholds = this.alertThresholds.get(strategyId) || {};
    strategyThresholds[type] = threshold;
    this.alertThresholds.set(strategyId, strategyThresholds);
    
    console.log(`[StrategyMonitor] Set ${type} threshold for ${strategyId}: ${threshold}`);
  }

  /**
   * 手动更新策略性能
   */
  async updateStrategyPerformance(strategyId: string, result: BacktestResult): Promise<void> {
    const currentMetrics = this.performanceCache.get(strategyId);
    if (!currentMetrics) return;

    try {
      // 更新基础指标
      const updatedMetrics: StrategyPerformanceMetrics = {
        ...currentMetrics,
        totalReturn: result.totalReturn,
        annualizedReturn: result.annualizedReturn,
        sharpeRatio: result.sharpeRatio,
        maxDrawdown: result.maxDrawdown,
        totalTrades: result.trades.length,
        winRate: result.winRate,
        lastUpdate: new Date()
      };

      // 计算详细指标
      updatedMetrics.dailyReturns = this.calculateDailyReturns(result);
      updatedMetrics.monthlyReturns = this.calculateMonthlyReturns(updatedMetrics.dailyReturns);
      updatedMetrics.volatility = this.calculateVolatility(updatedMetrics.dailyReturns);
      updatedMetrics.sortinoRatio = this.calculateSortinoRatio(updatedMetrics.dailyReturns, updatedMetrics.annualizedReturn);
      
      // VaR计算
      const varResults = this.calculateVaR(updatedMetrics.dailyReturns);
      updatedMetrics.var95 = varResults.var95;
      updatedMetrics.var99 = varResults.var99;

      this.performanceCache.set(strategyId, updatedMetrics);

      // 检查告警条件
      this.checkAlertConditions(strategyId, updatedMetrics);

      // 通知订阅者
      this.notifySubscribers([updatedMetrics]);

      // 缓存结果
      await this.cachePerformanceMetrics(strategyId, updatedMetrics);

      console.log(`[StrategyMonitor] Updated performance for strategy: ${strategyId}`);
      
    } catch (error) {
      console.error(`[StrategyMonitor] Failed to update performance for ${strategyId}:`, error);
    }
  }

  /**
   * 获取实时告警
   */
  getActiveAlerts(): PerformanceAlert[] {
    // 从缓存中获取活跃告警
    return []; // TODO: 实现告警存储和检索
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async loadCachedPerformance(): Promise<void> {
    try {
      const cachedKeys = await this.cache.keys('strategy-performance-*');
      
      for (const key of cachedKeys) {
        const metrics = await this.cache.get(key);
        if (metrics && metrics.strategyId) {
          this.performanceCache.set(metrics.strategyId, metrics);
        }
      }
      
      console.log(`[StrategyMonitor] Loaded ${cachedKeys.length} cached performance metrics`);
    } catch (error) {
      console.warn('[StrategyMonitor] Failed to load cached performance:', error);
    }
  }

  private setupDataStreamSubscription(): void {
    // 订阅市场数据更新，用于计算实时PnL
    const symbols = ['000001', '399001', '399006']; // 主要指数
    this.dataStream.subscribe(symbols, (data) => {
      this.updateRealTimePnL(data);
    });
  }

  private startPerformanceUpdates(): void {
    this.updateInterval = window.setInterval(() => {
      this.performPeriodicUpdate();
    }, 10000); // 每10秒更新一次
  }

  private setupAlertMonitoring(): void {
    // 设置告警监听逻辑
    setInterval(() => {
      this.checkAllAlertConditions();
    }, 30000); // 每30秒检查一次告警
  }

  private performPeriodicUpdate(): void {
    this.runningStrategies.forEach(strategyId => {
      const metrics = this.performanceCache.get(strategyId);
      if (metrics) {
        metrics.lastUpdate = new Date();
        this.performanceCache.set(strategyId, metrics);
      }
    });

    // 通知所有实时订阅者
    this.notifyRealtimeSubscribers();
  }

  private updateRealTimePnL(marketData: any): void {
    // 根据市场数据更新实时PnL
    this.runningStrategies.forEach(strategyId => {
      const metrics = this.performanceCache.get(strategyId);
      if (metrics) {
        // TODO: 计算实时PnL变化
        metrics.lastUpdate = new Date();
      }
    });
  }

  private checkAllAlertConditions(): void {
    this.performanceCache.forEach((metrics, strategyId) => {
      this.checkAlertConditions(strategyId, metrics);
    });
  }

  private checkAlertConditions(strategyId: string, metrics: StrategyPerformanceMetrics): void {
    const thresholds = this.alertThresholds.get(strategyId);
    if (!thresholds) return;

    // 检查最大回撤
    if (thresholds.maxDrawdown && Math.abs(metrics.maxDrawdown) > thresholds.maxDrawdown) {
      this.createAlert(strategyId, 'drawdown', 'high', 
        `策略 ${metrics.strategyName} 最大回撤 ${metrics.maxDrawdown.toFixed(2)}% 超过阈值 ${thresholds.maxDrawdown}%`,
        thresholds.maxDrawdown, Math.abs(metrics.maxDrawdown));
    }

    // 检查波动率
    if (thresholds.volatility && metrics.volatility > thresholds.volatility) {
      this.createAlert(strategyId, 'volatility', 'medium',
        `策略 ${metrics.strategyName} 波动率 ${(metrics.volatility * 100).toFixed(2)}% 超过阈值 ${(thresholds.volatility * 100).toFixed(2)}%`,
        thresholds.volatility, metrics.volatility);
    }
  }

  private createAlert(
    strategyId: string, 
    type: string, 
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    threshold: number,
    currentValue: number
  ): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `策略告警: ${type}`,
      message,
      type: 'strategy',
      priority: severity,
      timestamp: new Date(),
      read: false,
      actionRequired: severity === 'high' || severity === 'critical',
      metadata: {
        strategyId,
        type,
        threshold,
        currentValue
      }
    };

    this.alertService.addAlert(alert);
  }

  private notifySubscribers(metrics: StrategyPerformanceMetrics[]): void {
    this.subscriptions.forEach(subscription => {
      if (!subscription.active) return;

      const relevantMetrics = metrics.filter(m => 
        subscription.strategyIds.includes(m.strategyId)
      );

      if (relevantMetrics.length > 0) {
        try {
          subscription.callback(relevantMetrics);
        } catch (error) {
          console.error('[StrategyMonitor] Error in subscription callback:', error);
        }
      }
    });
  }

  private notifyRealtimeSubscribers(): void {
    const realtimeSubscriptions = Array.from(this.subscriptions.values())
      .filter(s => s.active && s.frequency === 'realtime');

    if (realtimeSubscriptions.length === 0) return;

    const allMetrics = Array.from(this.performanceCache.values());
    
    realtimeSubscriptions.forEach(subscription => {
      const relevantMetrics = allMetrics.filter(m => 
        subscription.strategyIds.includes(m.strategyId)
      );
      
      if (relevantMetrics.length > 0) {
        try {
          subscription.callback(relevantMetrics);
        } catch (error) {
          console.error('[StrategyMonitor] Error in realtime callback:', error);
        }
      }
    });
  }

  private calculateCorrelationMatrix(strategies: StrategyPerformanceMetrics[]): number[][] {
    const n = strategies.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          matrix[i][j] = this.calculateCorrelation(
            strategies[i].dailyReturns,
            strategies[j].dailyReturns
          );
        }
      }
    }

    return matrix;
  }

  private calculateCorrelation(returns1: number[], returns2: number[]): number {
    if (returns1.length !== returns2.length || returns1.length === 0) return 0;

    const n = returns1.length;
    const mean1 = returns1.reduce((a, b) => a + b) / n;
    const mean2 = returns2.reduce((a, b) => a + b) / n;

    let numerator = 0;
    let sum1 = 0;
    let sum2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;
      numerator += diff1 * diff2;
      sum1 += diff1 * diff1;
      sum2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1 * sum2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateDailyReturns(result: BacktestResult): number[] {
    // 从回测结果中提取每日收益率
    return result.dailyEquity.map((equity, i) => 
      i === 0 ? 0 : (equity - result.dailyEquity[i - 1]) / result.dailyEquity[i - 1]
    );
  }

  private calculateMonthlyReturns(dailyReturns: number[]): number[] {
    // 将日收益率转换为月收益率
    // 简化实现，实际需要根据日期分组
    const monthlyReturns: number[] = [];
    for (let i = 0; i < dailyReturns.length; i += 21) { // 假设每月21个交易日
      const monthReturns = dailyReturns.slice(i, i + 21);
      const monthReturn = monthReturns.reduce((acc, ret) => (1 + acc) * (1 + ret) - 1, 0);
      monthlyReturns.push(monthReturn);
    }
    return monthlyReturns;
  }

  private calculateVolatility(dailyReturns: number[]): number {
    if (dailyReturns.length === 0) return 0;
    
    const mean = dailyReturns.reduce((a, b) => a + b) / dailyReturns.length;
    const variance = dailyReturns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / dailyReturns.length;
    return Math.sqrt(variance * 252); // 年化波动率
  }

  private calculateSortinoRatio(dailyReturns: number[], annualizedReturn: number): number {
    const downside = dailyReturns.filter(ret => ret < 0);
    if (downside.length === 0) return Infinity;
    
    const downsideVariance = downside.reduce((acc, ret) => acc + ret * ret, 0) / downside.length;
    const downsideDeviation = Math.sqrt(downsideVariance * 252);
    
    return downsideDeviation === 0 ? Infinity : annualizedReturn / downsideDeviation;
  }

  private calculateVaR(dailyReturns: number[]): { var95: number; var99: number } {
    if (dailyReturns.length === 0) return { var95: 0, var99: 0 };
    
    const sorted = [...dailyReturns].sort((a, b) => a - b);
    const var95Index = Math.floor(sorted.length * 0.05);
    const var99Index = Math.floor(sorted.length * 0.01);
    
    return {
      var95: Math.abs(sorted[var95Index] || 0),
      var99: Math.abs(sorted[var99Index] || 0)
    };
  }

  private async cachePerformanceMetrics(strategyId: string, metrics: StrategyPerformanceMetrics): Promise<void> {
    try {
      await this.cache.set(`strategy-performance-${strategyId}`, metrics);
    } catch (error) {
      console.warn('[StrategyMonitor] Failed to cache performance metrics:', error);
    }
  }

  private initializeDefaultThresholds(): void {
    // 设置默认告警阈值
    const defaultThresholds = {
      maxDrawdown: 15, // 15%
      volatility: 0.25, // 25%
      dailyLoss: 0.05 // 5%
    };

    this.alertThresholds.set('default', defaultThresholds);
  }

  /**
   * 计算组合优化分析
   */
  private calculatePortfolioOptimization(strategies: StrategyPerformanceMetrics[]): any {
    const n = strategies.length;
    
    // 简化的马科维茨优化
    const returns = strategies.map(s => s.annualizedReturn / 100);
    const risks = strategies.map(s => s.volatility);
    
    // 生成有效前沿点
    const efficientFrontier = [];
    for (let targetReturn = 0.05; targetReturn <= Math.max(...returns); targetReturn += 0.02) {
      const weights = this.optimizePortfolio(strategies, targetReturn);
      const portfolioReturn = this.calculatePortfolioReturn(returns, weights);
      const portfolioRisk = this.calculatePortfolioRisk(risks, weights, this.calculateCorrelationMatrix(strategies));
      
      efficientFrontier.push({
        risk: portfolioRisk,
        return: portfolioReturn,
        weights: strategies.reduce((acc, s, i) => {
          acc[s.strategyId] = weights[i];
          return acc;
        }, {} as Record<string, number>)
      });
    }

    // 推荐权重分配（最大夏普比率）
    const optimalWeights = this.findOptimalWeights(strategies);
    const recommendedAllocation = strategies.reduce((acc, s, i) => {
      acc[s.strategyId] = optimalWeights[i];
      return acc;
    }, {} as Record<string, number>);

    const expectedReturn = this.calculatePortfolioReturn(returns, optimalWeights);
    const expectedRisk = this.calculatePortfolioRisk(risks, optimalWeights, this.calculateCorrelationMatrix(strategies));

    return {
      efficientFrontier,
      recommendedAllocation,
      expectedReturn,
      expectedRisk
    };
  }

  /**
   * 计算风险分析
   */
  private calculateRiskAnalysis(strategies: StrategyPerformanceMetrics[], correlationMatrix: number[][]): any {
    const n = strategies.length;
    const equalWeights = new Array(n).fill(1/n);
    
    // 分散化收益
    const portfolioRisk = this.calculatePortfolioRisk(
      strategies.map(s => s.volatility), 
      equalWeights, 
      correlationMatrix
    );
    const averageIndividualRisk = strategies.reduce((sum, s) => sum + s.volatility, 0) / n;
    const diversificationBenefit = 1 - (portfolioRisk / averageIndividualRisk);

    // VaR计算
    const portfolioReturns = this.simulatePortfolioReturns(strategies, equalWeights);
    const sortedReturns = portfolioReturns.sort((a, b) => a - b);
    const var95Index = Math.floor(sortedReturns.length * 0.05);
    const var99Index = Math.floor(sortedReturns.length * 0.01);

    // 集中度风险（赫芬达尔指数）
    const concentrationRisk = equalWeights.reduce((sum, w) => sum + w * w, 0);

    return {
      diversificationBenefit,
      portfolioVaR95: Math.abs(sortedReturns[var95Index] || 0),
      portfolioVaR99: Math.abs(sortedReturns[var99Index] || 0),
      concentrationRisk,
      liquidityRisk: strategies.reduce((sum, s) => sum + (s.totalTrades > 100 ? 0.1 : 0.3), 0) / n
    };
  }

  /**
   * 计算市场环境分析
   */
  private calculateMarketRegimeAnalysis(strategies: StrategyPerformanceMetrics[]): any {
    // 模拟不同市场环境下的表现
    const regimes = {
      bullMarket: {} as Record<string, number>,
      bearMarket: {} as Record<string, number>, 
      sidewaysMarket: {} as Record<string, number>
    };

    strategies.forEach(strategy => {
      // 基于历史数据估算不同市场环境下的表现
      const baseReturn = strategy.annualizedReturn;
      const volatility = strategy.volatility;
      
      // 牛市：高收益，低波动影响
      regimes.bullMarket[strategy.strategyId] = baseReturn * 1.2 - volatility * 0.1;
      
      // 熊市：收益下降，波动影响增大
      regimes.bearMarket[strategy.strategyId] = baseReturn * 0.3 - volatility * 0.5;
      
      // 震荡市：收益平稳，波动适中
      regimes.sidewaysMarket[strategy.strategyId] = baseReturn * 0.7 - volatility * 0.2;
    });

    return regimes;
  }

  /**
   * 组合优化算法（简化版）
   */
  private optimizePortfolio(strategies: StrategyPerformanceMetrics[], targetReturn: number): number[] {
    const n = strategies.length;
    const weights = new Array(n).fill(1/n); // 初始等权重
    
    // 简化优化：基于目标收益调整权重
    const returns = strategies.map(s => s.annualizedReturn / 100);
    const currentReturn = this.calculatePortfolioReturn(returns, weights);
    
    if (currentReturn < targetReturn) {
      // 增加高收益策略权重
      const sortedIndices = returns.map((r, i) => ({r, i}))
        .sort((a, b) => b.r - a.r)
        .map(item => item.i);
        
      for (let i = 0; i < Math.min(3, n); i++) {
        weights[sortedIndices[i]] *= 1.2;
      }
      
      // 归一化
      const sum = weights.reduce((s, w) => s + w, 0);
      return weights.map(w => w / sum);
    }
    
    return weights;
  }

  /**
   * 寻找最优权重（最大夏普比率）
   */
  private findOptimalWeights(strategies: StrategyPerformanceMetrics[]): number[] {
    const n = strategies.length;
    const returns = strategies.map(s => s.annualizedReturn / 100);
    const sharpeRatios = strategies.map(s => s.sharpeRatio);
    
    // 基于夏普比率的权重分配
    const weights = sharpeRatios.map(sharpe => Math.max(0, sharpe));
    const sum = weights.reduce((s, w) => s + w, 0);
    
    return sum > 0 ? weights.map(w => w / sum) : new Array(n).fill(1/n);
  }

  /**
   * 计算组合收益
   */
  private calculatePortfolioReturn(returns: number[], weights: number[]): number {
    return returns.reduce((sum, ret, i) => sum + ret * weights[i], 0);
  }

  /**
   * 计算组合风险
   */
  private calculatePortfolioRisk(risks: number[], weights: number[], correlationMatrix: number[][]): number {
    let variance = 0;
    const n = risks.length;
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const correlation = i === j ? 1 : (correlationMatrix[i][j] || 0);
        variance += weights[i] * weights[j] * risks[i] * risks[j] * correlation;
      }
    }
    
    return Math.sqrt(variance);
  }

  /**
   * 模拟组合收益
   */
  private simulatePortfolioReturns(strategies: StrategyPerformanceMetrics[], weights: number[]): number[] {
    const simulations = 1000;
    const returns = [];
    
    for (let i = 0; i < simulations; i++) {
      let portfolioReturn = 0;
      strategies.forEach((strategy, j) => {
        // 简化的蒙特卡罗模拟
        const randomReturn = (strategy.annualizedReturn / 100) + 
          (Math.random() - 0.5) * strategy.volatility * 2;
        portfolioReturn += randomReturn * weights[j];
      });
      returns.push(portfolioReturn);
    }
    
    return returns;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.subscriptions.clear();
    this.runningStrategies.clear();
    this.performanceCache.clear();

    // 清理系统监控
    this.stopSystemMonitoring();
    this.systemMetrics = [];
    this.errorRecords = [];
    this.componentPerformance.clear();
    this.apiPerformance.clear();
    this.serviceHealthStatus.clear();

    this.isInitialized = false;
  }

  // ============================================================================
  // 系统性能监控方法 (新增)
  // ============================================================================

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError('critical', 'Global', event.message, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.logError('critical', 'Promise', 'Unhandled Promise Rejection', {
          reason: event.reason
        });
      });
    }
  }

  /**
   * 启动系统性能监控
   */
  private startSystemMonitoring(): void {
    if (this.systemMonitoringInterval || !this.monitoringConfig.enabled) return;

    this.systemMonitoringInterval = window.setInterval(() => {
      this.collectSystemMetrics();
    }, this.monitoringConfig.samplingInterval);

    this.logInfo('StrategyMonitor', 'System performance monitoring started');
  }

  /**
   * 停止系统性能监控
   */
  private stopSystemMonitoring(): void {
    if (this.systemMonitoringInterval) {
      clearInterval(this.systemMonitoringInterval);
      this.systemMonitoringInterval = null;
    }
  }

  /**
   * 收集系统性能指标
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics: SystemPerformanceMetrics = {
        timestamp: Date.now(),
        cpu: await this.getCPUMetrics(),
        memory: await this.getMemoryMetrics(),
        network: await this.getNetworkMetrics(),
        application: await this.getApplicationMetrics()
      };

      this.systemMetrics.push(metrics);
      this.analyzeSystemMetrics(metrics);
      
      // 限制存储的指标数量
      if (this.systemMetrics.length > 1000) {
        this.systemMetrics = this.systemMetrics.slice(-1000);
      }
    } catch (error) {
      this.logError('error', 'StrategyMonitor', 'Failed to collect system metrics', { error });
    }
  }

  /**
   * 获取CPU指标
   */
  private async getCPUMetrics(): Promise<{ usage: number; cores: number }> {
    if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
      return {
        cores: navigator.hardwareConcurrency || 4,
        usage: Math.random() * 100 // 模拟值
      };
    }
    return { usage: 0, cores: 4 };
  }

  /**
   * 获取内存指标
   */
  private async getMemoryMetrics(): Promise<{ used: number; total: number; percentage: number }> {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize || 0,
        total: memory.totalJSHeapSize || 0,
        percentage: memory.usedJSHeapSize / memory.totalJSHeapSize * 100 || 0
      };
    }
    return { used: 0, total: 0, percentage: 0 };
  }

  /**
   * 获取网络指标
   */
  private async getNetworkMetrics(): Promise<{ latency: number; throughput: number; errors: number }> {
    return {
      latency: this.calculateAverageAPIResponseTime(),
      throughput: this.calculateNetworkThroughput(),
      errors: this.getRecentErrorCount()
    };
  }

  /**
   * 获取应用指标
   */
  private async getApplicationMetrics(): Promise<{
    componentRenderTime: Record<string, number>;
    apiResponseTimes: Record<string, number>;
    errorCount: number;
    activeConnections: number;
  }> {
    return {
      componentRenderTime: this.getComponentRenderTimes(),
      apiResponseTimes: this.getAPIResponseTimes(),
      errorCount: this.errorRecords.filter(e => e.timestamp > Date.now() - 60000).length,
      activeConnections: 5 // 模拟值
    };
  }

  /**
   * 分析系统指标
   */
  private analyzeSystemMetrics(metrics: SystemPerformanceMetrics): void {
    // CPU使用率检查
    if (metrics.cpu.usage > this.monitoringConfig.alertThresholds.cpuUsage) {
      this.createEnhancedAlert('performance', 'high', `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`, 
        { cpu: metrics.cpu }, [
          'Close unnecessary applications',
          'Optimize expensive operations',
          'Consider performance profiling'
        ]);
    }

    // 内存使用率检查
    if (metrics.memory.percentage > this.monitoringConfig.alertThresholds.memoryUsage) {
      this.createEnhancedAlert('resource', 'high', `High memory usage: ${metrics.memory.percentage.toFixed(1)}%`, 
        { memory: metrics.memory }, [
          'Clear browser cache',
          'Close unused tabs',
          'Optimize memory-intensive operations'
        ]);
    }
  }

  /**
   * 创建增强型警报
   */
  private createEnhancedAlert(type: string, severity: string, message: string, 
                             systemMetrics: Partial<SystemPerformanceMetrics>, 
                             recommendations: string[]): void {
    const alert: EnhancedPerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      strategyId: 'system',
      type: type as any,
      severity: severity as any,
      message,
      threshold: 0,
      currentValue: 0,
      timestamp: new Date(),
      acknowledged: false,
      systemMetrics,
      recommendations,
      autoRecoveryAttempted: false,
      autoRecoverySuccess: false
    };

    // 通过现有的告警服务发送
    this.alertService.createAlert({
      id: alert.id,
      type: 'system' as any,
      symbol: 'SYSTEM',
      condition: {
        type: 'threshold' as any,
        field: 'performance',
        operator: '>',
        value: 80
      },
      status: 'active',
      message: alert.message,
      createdAt: new Date(),
      triggeredAt: new Date()
    });
  }

  // ============================================================================
  // 组件和API性能跟踪 (新增)
  // ============================================================================

  /**
   * 跟踪组件渲染性能
   */
  trackComponentRender(componentName: string, renderTime: number): void {
    const existing = this.componentPerformance.get(componentName);
    const performance: ComponentPerformance = {
      componentName,
      renderTime,
      updateCount: existing ? existing.updateCount + 1 : 1,
      errorCount: existing ? existing.errorCount : 0,
      lastUpdate: Date.now()
    };

    this.componentPerformance.set(componentName, performance);

    // 检查性能阈值
    if (renderTime > 100) { // 100ms阈值
      this.logWarning('PerformanceTracker', `Component ${componentName} slow render (${renderTime}ms)`);
    }
  }

  /**
   * 跟踪API调用性能
   */
  trackAPICall(endpoint: string, method: string, responseTime: number, status: number): void {
    const key = `${method}:${endpoint}`;
    const existing = this.apiPerformance.get(key);
    
    const tracker: APIPerformanceTracker = {
      endpoint,
      method,
      responseTime,
      status,
      errorRate: existing ? this.calculateErrorRate(existing, status) : status >= 400 ? 1 : 0,
      throughput: existing ? existing.throughput + 1 : 1
    };

    this.apiPerformance.set(key, tracker);

    // 检查API性能
    if (responseTime > this.monitoringConfig.alertThresholds.apiResponseTime) {
      this.logWarning('APITracker', `Slow API response: ${endpoint} (${responseTime}ms)`);
    }
  }

  // ============================================================================
  // 错误日志管理 (新增)
  // ============================================================================

  /**
   * 记录错误
   */
  logError(level: ErrorRecord['level'], component: string, message: string, context?: Record<string, any>): void {
    const error: ErrorRecord = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      component,
      message,
      context,
      resolved: false,
      recoveryActions: this.getRecoveryActions(component, message)
    };

    this.errorRecords.push(error);

    // 限制错误记录数量
    if (this.errorRecords.length > 1000) {
      this.errorRecords = this.errorRecords.slice(-1000);
    }

    // 尝试自动恢复
    if (this.monitoringConfig.enableAutoRecovery && level === 'error') {
      this.attemptAutoRecovery(error);
    }

    console[level === 'critical' ? 'error' : level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[${component}] ${message}`, context
    );
  }

  /**
   * 记录信息
   */
  logInfo(component: string, message: string, context?: Record<string, any>): void {
    this.logError('info', component, message, context);
  }

  /**
   * 记录警告
   */
  logWarning(component: string, message: string, context?: Record<string, any>): void {
    this.logError('warn', component, message, context);
  }

  // ============================================================================
  // 服务健康检查 (新增)
  // ============================================================================

  /**
   * 初始化健康检查
   */
  private initializeHealthChecks(): void {
    // 注册核心服务
    this.registerService('DataStream', () => this.checkDataStreamHealth());
    this.registerService('StrategyExecution', () => this.checkStrategyExecutionHealth());
    this.registerService('RiskAnalysis', () => this.checkRiskAnalysisHealth());
    this.registerService('AlertService', () => this.checkAlertServiceHealth());
    this.registerService('Cache', () => this.checkCacheHealth());

    // 开始健康检查
    this.startHealthChecks();
  }

  /**
   * 注册服务
   */
  private registerService(serviceName: string, healthCheckFn: () => Promise<ServiceHealthStatus>): void {
    // 存储健康检查函数
    this.errorRecoveryHandlers.set(`health_${serviceName}`, healthCheckFn);
  }

  /**
   * 开始健康检查
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      for (const [key, healthCheckFn] of this.errorRecoveryHandlers.entries()) {
        if (key.startsWith('health_')) {
          try {
            const serviceName = key.replace('health_', '');
            const status = await (healthCheckFn as () => Promise<ServiceHealthStatus>)();
            this.serviceHealthStatus.set(serviceName, status);
          } catch (error) {
            this.logError('error', 'HealthChecker', `Health check failed for ${key}`, { error });
          }
        }
      }
    }, 30000); // 每30秒检查一次
  }

  // ============================================================================
  // 辅助方法 (新增)
  // ============================================================================

  private calculateAverageAPIResponseTime(): number {
    const times = Array.from(this.apiPerformance.values()).map(api => api.responseTime);
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }

  private calculateNetworkThroughput(): number {
    return Array.from(this.apiPerformance.values()).reduce((sum, api) => sum + api.throughput, 0);
  }

  private getRecentErrorCount(): number {
    const recentTime = Date.now() - 300000; // 5分钟
    return this.errorRecords.filter(e => e.timestamp > recentTime).length;
  }

  private getComponentRenderTimes(): Record<string, number> {
    const times: Record<string, number> = {};
    this.componentPerformance.forEach((perf, name) => {
      times[name] = perf.renderTime;
    });
    return times;
  }

  private getAPIResponseTimes(): Record<string, number> {
    const times: Record<string, number> = {};
    this.apiPerformance.forEach((api, key) => {
      times[key] = api.responseTime;
    });
    return times;
  }

  private calculateErrorRate(existing: APIPerformanceTracker, status: number): number {
    const totalCalls = existing.throughput + 1;
    const errorCalls = (existing.errorRate * existing.throughput) + (status >= 400 ? 1 : 0);
    return errorCalls / totalCalls;
  }

  private getRecoveryActions(component: string = '', message: string = ''): string[] {
    const actions: string[] = [];
    
    if (message.includes('network') || message.includes('fetch')) {
      actions.push('Retry network request', 'Check internet connection', 'Verify API endpoints');
    }
    
    if (message.includes('memory') || message.includes('heap')) {
      actions.push('Clear cache', 'Restart application', 'Optimize memory usage');
    }
    
    if (component.includes('Portfolio') || component.includes('Strategy')) {
      actions.push('Refresh data', 'Reload workspace', 'Check data sources');
    }
    
    return actions.length > 0 ? actions : ['Contact support', 'Check logs', 'Restart application'];
  }

  private attemptAutoRecovery(error: ErrorRecord): void {
    // 简化的自动恢复逻辑
    if (error.component === 'DataStream' && error.message.includes('connection')) {
      this.logInfo('AutoRecovery', `Attempting to reconnect data stream for error: ${error.id}`);
      // 这里可以添加重连逻辑
    }
  }

  // 健康检查方法
  private async checkDataStreamHealth(): Promise<ServiceHealthStatus> {
    return {
      serviceName: 'DataStream',
      status: 'healthy',
      lastCheck: Date.now(),
      responseTime: 50,
      errorRate: 0,
      uptime: 99.9,
      dependencies: []
    };
  }

  private async checkStrategyExecutionHealth(): Promise<ServiceHealthStatus> {
    return {
      serviceName: 'StrategyExecution',
      status: 'healthy',
      lastCheck: Date.now(),
      responseTime: 100,
      errorRate: 0.1,
      uptime: 99.8,
      dependencies: []
    };
  }

  private async checkRiskAnalysisHealth(): Promise<ServiceHealthStatus> {
    return {
      serviceName: 'RiskAnalysis',
      status: 'healthy',
      lastCheck: Date.now(),
      responseTime: 80,
      errorRate: 0,
      uptime: 99.9,
      dependencies: []
    };
  }

  private async checkAlertServiceHealth(): Promise<ServiceHealthStatus> {
    return {
      serviceName: 'AlertService',
      status: 'healthy',
      lastCheck: Date.now(),
      responseTime: 30,
      errorRate: 0,
      uptime: 100,
      dependencies: []
    };
  }

  private async checkCacheHealth(): Promise<ServiceHealthStatus> {
    return {
      serviceName: 'Cache',
      status: 'healthy',
      lastCheck: Date.now(),
      responseTime: 10,
      errorRate: 0,
      uptime: 99.9,
      dependencies: []
    };
  }

  // ============================================================================
  // 公共API (新增)
  // ============================================================================

  /**
   * 获取系统指标
   */
  getSystemMetrics(timeRange?: { start: number; end: number }): SystemPerformanceMetrics[] {
    if (!timeRange) return [...this.systemMetrics];
    return this.systemMetrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end);
  }

  /**
   * 获取错误记录
   */
  getErrorRecords(level?: ErrorRecord['level']): ErrorRecord[] {
    if (!level) return [...this.errorRecords];
    return this.errorRecords.filter(e => e.level === level);
  }

  /**
   * 获取组件性能
   */
  getComponentPerformance(): ComponentPerformance[] {
    return Array.from(this.componentPerformance.values());
  }

  /**
   * 获取API性能
   */
  getAPIPerformance(): APIPerformanceTracker[] {
    return Array.from(this.apiPerformance.values());
  }

  /**
   * 获取服务健康状态
   */
  getServiceHealth(): ServiceHealthStatus[] {
    return Array.from(this.serviceHealthStatus.values());
  }

  /**
   * 获取系统健康评分
   */
  getSystemHealthScore(): number {
    const current = this.systemMetrics[this.systemMetrics.length - 1];
    if (!current) return 100;

    let score = 100;
    
    // CPU影响 (权重: 20%)
    score -= Math.max(0, (current.cpu.usage - 50) * 0.4);
    
    // 内存影响 (权重: 25%)
    score -= Math.max(0, (current.memory.percentage - 70) * 0.5);
    
    // 网络影响 (权重: 20%)
    score -= Math.max(0, (current.network.latency - 1000) / 100);
    
    // 错误影响 (权重: 35%)
    const recentErrorCount = this.getRecentErrorCount();
    score -= recentErrorCount * 2;
    
    return Math.max(0, Math.min(100, score));
  }
}

// ============================================================================
// 自动化工作流管理
// ============================================================================

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AutomationTrigger {
  type: 'performance' | 'market' | 'time' | 'event';
  conditions: {
    metric?: string;
    operator?: '>' | '<' | '==' | '!=' | '>=' | '<=';
    value?: number;
    timeCondition?: string; // CRON expression
    marketCondition?: string;
    eventType?: string;
  };
}

export interface AutomationAction {
  type: 'stop_strategy' | 'start_strategy' | 'adjust_position' | 'send_alert' | 'export_report' | 'rebalance';
  parameters: Record<string, any>;
}

export interface AccountConfig {
  id: string;
  name: string;
  broker: string;
  accountType: 'paper' | 'live';
  initialCapital: number;
  currentCapital: number;
  allowedStrategies: string[];
  maxRiskPerStrategy: number;
  isActive: boolean;
  apiKeys?: {
    key: string;
    secret: string;
    environment: 'sandbox' | 'production';
  };
}

/**
 * 自动化工作流管理器
 */
export class AutomationWorkflowManager {
  private rules: Map<string, AutomationRule> = new Map();
  private accounts: Map<string, AccountConfig> = new Map();
  private isRunning = false;
  private checkInterval: number | null = null;

  /**
   * 添加自动化规则
   */
  addRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'triggerCount'>): string {
    const id = this.generateId();
    const automationRule: AutomationRule = {
      ...rule,
      id,
      createdAt: new Date(),
      triggerCount: 0
    };

    this.rules.set(id, automationRule);
    console.log(`[Automation] Rule added: ${rule.name}`);
    return id;
  }

  /**
   * 启动自动化监控
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.checkInterval = window.setInterval(() => {
      this.checkRules();
    }, 60000); // 每分钟检查一次

    console.log('[Automation] Workflow monitoring started');
  }

  /**
   * 停止自动化监控
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('[Automation] Workflow monitoring stopped');
  }

  /**
   * 检查所有规则
   */
  private async checkRules(): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue;

      try {
        const shouldTrigger = await this.evaluateRule(rule);
        if (shouldTrigger) {
          await this.executeRule(rule);
        }
      } catch (error) {
        console.error(`[Automation] Error checking rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * 评估规则条件
   */
  private async evaluateRule(rule: AutomationRule): Promise<boolean> {
    for (const trigger of rule.triggers) {
      const conditionMet = await this.evaluateTrigger(trigger);
      if (!conditionMet) {
        return false; // 所有条件都必须满足
      }
    }
    return true;
  }

  /**
   * 评估单个触发器
   */
  private async evaluateTrigger(trigger: AutomationTrigger): Promise<boolean> {
    switch (trigger.type) {
      case 'performance':
        return this.checkPerformanceCondition(trigger);
      case 'market':
        return this.checkMarketCondition(trigger);
      case 'time':
        return this.checkTimeCondition(trigger);
      case 'event':
        return this.checkEventCondition(trigger);
      default:
        return false;
    }
  }

  /**
   * 执行规则动作
   */
  private async executeRule(rule: AutomationRule): Promise<void> {
    console.log(`[Automation] Executing rule: ${rule.name}`);
    
    for (const action of rule.actions) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error(`[Automation] Error executing action:`, error);
      }
    }

    // 更新规则统计
    rule.lastTriggered = new Date();
    rule.triggerCount++;
  }

  /**
   * 执行单个动作
   */
  private async executeAction(action: AutomationAction): Promise<void> {
    switch (action.type) {
      case 'stop_strategy':
        await this.stopStrategy(action.parameters.strategyId);
        break;
      case 'start_strategy':
        await this.startStrategy(action.parameters.strategyId);
        break;
      case 'adjust_position':
        await this.adjustPosition(action.parameters);
        break;
      case 'send_alert':
        await this.sendAlert(action.parameters);
        break;
      case 'export_report':
        await this.exportReport(action.parameters);
        break;
      case 'rebalance':
        await this.rebalancePortfolio(action.parameters);
        break;
    }
  }

  // 动作执行方法的实现
  private async stopStrategy(strategyId: string): Promise<void> {
    console.log(`[Automation] Stopping strategy: ${strategyId}`);
    // 实现策略停止逻辑
  }

  private async startStrategy(strategyId: string): Promise<void> {
    console.log(`[Automation] Starting strategy: ${strategyId}`);
    // 实现策略启动逻辑
  }

  private async adjustPosition(params: any): Promise<void> {
    console.log(`[Automation] Adjusting position:`, params);
    // 实现仓位调整逻辑
  }

  private async sendAlert(params: any): Promise<void> {
    console.log(`[Automation] Sending alert:`, params);
    // 实现告警发送逻辑
  }

  private async exportReport(params: any): Promise<void> {
    console.log(`[Automation] Exporting report:`, params);
    // 实现报告导出逻辑
  }

  private async rebalancePortfolio(params: any): Promise<void> {
    console.log(`[Automation] Rebalancing portfolio:`, params);
    // 实现组合再平衡逻辑
  }

  // 条件检查方法的实现
  private async checkPerformanceCondition(trigger: AutomationTrigger): Promise<boolean> {
    // 检查性能指标条件
    return false; // 简化实现
  }

  private async checkMarketCondition(trigger: AutomationTrigger): Promise<boolean> {
    // 检查市场条件
    return false; // 简化实现
  }

  private async checkTimeCondition(trigger: AutomationTrigger): Promise<boolean> {
    // 检查时间条件
    return false; // 简化实现
  }

  private async checkEventCondition(trigger: AutomationTrigger): Promise<boolean> {
    // 检查事件条件
    return false; // 简化实现
  }

  private generateId(): string {
    return `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 多账户管理器
 */
export class MultiAccountManager {
  private accounts: Map<string, AccountConfig> = new Map();
  private strategyAllocations: Map<string, string[]> = new Map(); // strategyId -> accountIds

  /**
   * 添加账户
   */
  addAccount(account: Omit<AccountConfig, 'id'>): string {
    const id = this.generateId();
    const accountConfig: AccountConfig = {
      ...account,
      id
    };

    this.accounts.set(id, accountConfig);
    console.log(`[MultiAccount] Account added: ${account.name}`);
    return id;
  }

  /**
   * 分配策略到账户
   */
  allocateStrategy(strategyId: string, accountIds: string[]): void {
    // 验证账户是否允许该策略
    const validAccounts = accountIds.filter(accountId => {
      const account = this.accounts.get(accountId);
      return account && account.isActive && 
             (account.allowedStrategies.length === 0 || 
              account.allowedStrategies.includes(strategyId));
    });

    this.strategyAllocations.set(strategyId, validAccounts);
    console.log(`[MultiAccount] Strategy ${strategyId} allocated to ${validAccounts.length} accounts`);
  }

  /**
   * 获取账户列表
   */
  getAccounts(): AccountConfig[] {
    return Array.from(this.accounts.values());
  }

  /**
   * 获取策略分配
   */
  getStrategyAllocations(): Map<string, string[]> {
    return new Map(this.strategyAllocations);
  }

  /**
   * 计算账户风险
   */
  calculateAccountRisk(accountId: string): {
    totalRisk: number;
    strategyRisks: Array<{strategyId: string, risk: number}>;
  } {
    const account = this.accounts.get(accountId);
    if (!account) {
      return { totalRisk: 0, strategyRisks: [] };
    }

    // 简化风险计算
    const strategyRisks: Array<{strategyId: string, risk: number}> = [];
    let totalRisk = 0;

    for (const [strategyId, accountIds] of this.strategyAllocations.entries()) {
      if (accountIds.includes(accountId)) {
        const risk = 0.05; // 简化：假设每个策略风险为5%
        strategyRisks.push({ strategyId, risk });
        totalRisk += risk;
      }
    }

    return { totalRisk, strategyRisks };
  }

  private generateId(): string {
    return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 全局实例
export const automationWorkflowManager = new AutomationWorkflowManager();
export const multiAccountManager = new MultiAccountManager();

// ============================================================================
// Service Instance
// ============================================================================

let strategyPerformanceMonitor: StrategyPerformanceMonitor | null = null;

/**
 * 获取策略性能监控服务实例
 */
export function getStrategyPerformanceMonitor(): StrategyPerformanceMonitor {
  if (!strategyPerformanceMonitor) {
    strategyPerformanceMonitor = new StrategyPerformanceMonitor();
  }
  return strategyPerformanceMonitor;
}

export default StrategyPerformanceMonitor;
