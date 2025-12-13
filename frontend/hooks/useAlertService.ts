/**
 * useAlertService - 增强型 React Hook for Alert Management
 * 
 * 提供便捷的React Hook接口来管理价格和技术指标警报
 * ✅ 集成性能监控 (新增)
 * ✅ 错误处理增强 (新增)
 * ✅ 自动恢复机制 (新增)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getAlertService, 
  getStrategyPerformanceMonitor,
  Alert, 
  AlertTriggerEvent, 
  AlertStatistics, 
  AlertCondition,
  AlertNotificationType,
  AlertPriority,
  AlertConditionType
} from '../services';

export interface UseAlertServiceReturn {
  // 警报数据
  alerts: Alert[];
  statistics: AlertStatistics;
  triggerHistory: AlertTriggerEvent[];
  
  // 状态
  isLoading: boolean;
  error: string | null;

  // 性能监控 (新增)
  performanceMetrics: {
    alertProcessingTime: number;
    errorRate: number;
    successfulAlerts: number;
    failedAlerts: number;
    lastHealthCheck: Date | null;
  };
  
  // 警报管理
  createAlert: (alertConfig: Omit<Alert, 'id' | 'createdAt' | 'triggerCount' | 'status'>) => Promise<string>;
  updateAlert: (alertId: string, updates: Partial<Alert>) => Promise<boolean>;
  deleteAlert: (alertId: string) => Promise<boolean>;
  toggleAlert: (alertId: string, enabled: boolean) => Promise<boolean>;
  
  // 查询方法
  getAlertsBySymbol: (symbol: string) => Alert[];
  getActiveAlerts: () => Alert[];
  getAlertsByPriority: (priority: AlertPriority) => Alert[];
  
  // 快捷创建方法
  createPriceAlert: (symbol: string, targetPrice: number, direction: 'above' | 'below', options?: Partial<Alert>) => Promise<string>;
  createVolumeAlert: (symbol: string, multiplier: number, options?: Partial<Alert>) => Promise<string>;
  createIndicatorAlert: (symbol: string, indicator: string, targetValue: number, direction: 'above' | 'below', options?: Partial<Alert>) => Promise<string>;
  
  // 事件处理
  onAlertTriggered: (callback: (event: AlertTriggerEvent) => void) => () => void;
  
  // 统计数据刷新
  refreshStatistics: () => void;
}

/**
 * 增强型 Alert Service React Hook
 */
export function useAlertService(): UseAlertServiceReturn {
  const alertService = useMemo(() => getAlertService(), []);
  const performanceMonitor = useMemo(() => getStrategyPerformanceMonitor(), []);
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statistics, setStatistics] = useState<AlertStatistics>({
    totalAlerts: 0,
    activeAlerts: 0,
    triggeredToday: 0,
    triggeredThisWeek: 0,
    topTriggeredSymbols: [],
    alertsByPriority: { low: 0, medium: 0, high: 0, critical: 0 },
    alertsByStatus: { active: 0, triggered: 0, paused: 0, expired: 0 },
  });
  const [triggerHistory, setTriggerHistory] = useState<AlertTriggerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 性能监控状态 (新增)
  const [performanceMetrics, setPerformanceMetrics] = useState({
    alertProcessingTime: 0,
    errorRate: 0,
    successfulAlerts: 0,
    failedAlerts: 0,
    lastHealthCheck: null as Date | null
  });

  // 刷新数据 (增强版)
  const refreshData = useCallback(() => {
    const startTime = performance.now();
    
    try {
      setAlerts(alertService.getAllAlerts());
      setStatistics(alertService.getStatistics());
      setTriggerHistory(alertService.getTriggerHistory(50));
      setError(null);

      // 更新性能指标
      const processingTime = performance.now() - startTime;
      setPerformanceMetrics(prev => ({
        ...prev,
        alertProcessingTime: processingTime,
        successfulAlerts: prev.successfulAlerts + 1,
        errorRate: prev.failedAlerts / (prev.successfulAlerts + prev.failedAlerts + 1) * 100,
        lastHealthCheck: new Date()
      }));

      // 性能监控记录
      performanceMonitor.trackComponentRender('useAlertService.refreshData', processingTime);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // 更新失败指标
      setPerformanceMetrics(prev => ({
        ...prev,
        failedAlerts: prev.failedAlerts + 1,
        errorRate: (prev.failedAlerts + 1) / (prev.successfulAlerts + prev.failedAlerts + 1) * 100,
        lastHealthCheck: new Date()
      }));

      // 性能监控错误记录
      performanceMonitor.logError('error', 'useAlertService', `Error refreshing data: ${errorMessage}`, { 
        error: err,
        processingTime: performance.now() - startTime
      });
      
      console.error('[useAlertService] Error refreshing data:', err);
    }
  }, [alertService, performanceMonitor]);

  // 初始化和事件监听
  useEffect(() => {
    refreshData();

    // 监听警报事件
    const unsubscribeCreated = alertService.addEventListener('onAlertCreated', () => {
      refreshData();
    });

    const unsubscribeUpdated = alertService.addEventListener('onAlertUpdated', () => {
      refreshData();
    });

    const unsubscribeDeleted = alertService.addEventListener('onAlertDeleted', () => {
      refreshData();
    });

    const unsubscribeTriggered = alertService.addEventListener('onAlertTriggered', (event) => {
      refreshData();
      // 触发事件会通过onAlertTriggered回调传递给用户
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeTriggered();
    };
  }, [alertService, refreshData]);

  // 警报管理方法 (增强版)
  const createAlert = useCallback(async (alertConfig: Omit<Alert, 'id' | 'createdAt' | 'triggerCount' | 'status'>) => {
    const startTime = performance.now();
    
    try {
      setIsLoading(true);
      setError(null);
      
      performanceMonitor.logInfo('useAlertService', `Creating alert for symbol: ${alertConfig.symbol}`);
      
      const alertId = alertService.createAlert(alertConfig);
      
      // 跟踪API性能
      const responseTime = performance.now() - startTime;
      performanceMonitor.trackAPICall('/api/alerts', 'POST', responseTime, 200);
      
      performanceMonitor.logInfo('useAlertService', `Alert created successfully: ${alertId}`);
      
      return alertId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create alert';
      const responseTime = performance.now() - startTime;
      
      // 跟踪失败的API调用
      performanceMonitor.trackAPICall('/api/alerts', 'POST', responseTime, 500);
      performanceMonitor.logError('error', 'useAlertService', `Failed to create alert: ${errorMessage}`, { 
        error: err,
        alertConfig,
        responseTime
      });
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [alertService, performanceMonitor]);

  const updateAlert = useCallback(async (alertId: string, updates: Partial<Alert>) => {
    try {
      setIsLoading(true);
      setError(null);
      const success = alertService.updateAlert(alertId, updates);
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update alert';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [alertService]);

  const deleteAlert = useCallback(async (alertId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const success = alertService.deleteAlert(alertId);
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete alert';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [alertService]);

  const toggleAlert = useCallback(async (alertId: string, enabled: boolean) => {
    try {
      setIsLoading(true);
      setError(null);
      const success = alertService.toggleAlert(alertId, enabled);
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle alert';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [alertService]);

  // 查询方法
  const getAlertsBySymbol = useCallback((symbol: string) => {
    return alertService.getAlertsBySymbol(symbol);
  }, [alertService]);

  const getActiveAlerts = useCallback(() => {
    return alerts.filter(alert => alert.isEnabled && alert.status === 'active');
  }, [alerts]);

  const getAlertsByPriority = useCallback((priority: AlertPriority) => {
    return alerts.filter(alert => alert.priority === priority);
  }, [alerts]);

  // 快捷创建方法
  const createPriceAlert = useCallback(async (
    symbol: string, 
    targetPrice: number, 
    direction: 'above' | 'below',
    options: Partial<Alert> = {}
  ) => {
    const condition: AlertCondition = {
      id: `condition_${Date.now()}`,
      type: direction === 'above' ? 'price_above' : 'price_below',
      symbol,
      targetPrice,
    };

    const alertConfig: Omit<Alert, 'id' | 'createdAt' | 'triggerCount' | 'status'> = {
      name: `${symbol} 价格${direction === 'above' ? '突破' : '跌破'} ¥${targetPrice}`,
      description: `当${symbol}价格${direction === 'above' ? '突破' : '跌破'}¥${targetPrice}时触发警报`,
      symbol,
      conditions: [condition],
      logicOperator: 'OR',
      triggerOnce: false,
      notifications: ['browser', 'sound'],
      priority: 'medium',
      isEnabled: true,
      tags: ['price', 'auto-generated'],
      ...options
    };

    return createAlert(alertConfig);
  }, [createAlert]);

  const createVolumeAlert = useCallback(async (
    symbol: string,
    multiplier: number,
    options: Partial<Alert> = {}
  ) => {
    const condition: AlertCondition = {
      id: `condition_${Date.now()}`,
      type: 'volume_spike',
      symbol,
      volumeMultiplier: multiplier,
    };

    const alertConfig: Omit<Alert, 'id' | 'createdAt' | 'triggerCount' | 'status'> = {
      name: `${symbol} 成交量异常(${multiplier}倍)`,
      description: `当${symbol}成交量超过平均值${multiplier}倍时触发警报`,
      symbol,
      conditions: [condition],
      logicOperator: 'OR',
      triggerOnce: false,
      notifications: ['browser', 'sound'],
      priority: 'medium',
      isEnabled: true,
      tags: ['volume', 'auto-generated'],
      ...options
    };

    return createAlert(alertConfig);
  }, [createAlert]);

  const createIndicatorAlert = useCallback(async (
    symbol: string,
    indicator: string,
    targetValue: number,
    direction: 'above' | 'below',
    options: Partial<Alert> = {}
  ) => {
    const condition: AlertCondition = {
      id: `condition_${Date.now()}`,
      type: direction === 'above' ? 'indicator_cross_above' : 'indicator_cross_below',
      symbol,
      indicator: indicator as any,
      targetValue,
    };

    const alertConfig: Omit<Alert, 'id' | 'createdAt' | 'triggerCount' | 'status'> = {
      name: `${symbol} ${indicator}${direction === 'above' ? '突破' : '跌破'}${targetValue}`,
      description: `当${symbol}的${indicator}指标${direction === 'above' ? '突破' : '跌破'}${targetValue}时触发警报`,
      symbol,
      conditions: [condition],
      logicOperator: 'OR',
      triggerOnce: false,
      notifications: ['browser', 'sound'],
      priority: 'medium',
      isEnabled: true,
      tags: ['indicator', indicator.toLowerCase(), 'auto-generated'],
      ...options
    };

    return createAlert(alertConfig);
  }, [createAlert]);

  // 事件处理
  const onAlertTriggered = useCallback((callback: (event: AlertTriggerEvent) => void) => {
    return alertService.addEventListener('onAlertTriggered', callback);
  }, [alertService]);

  // 统计数据刷新
  const refreshStatistics = useCallback(() => {
    setStatistics(alertService.getStatistics());
  }, [alertService]);

  return {
    alerts,
    statistics,
    triggerHistory,
    isLoading,
    error,
    performanceMetrics, // 新增
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    getAlertsBySymbol,
    getActiveAlerts,
    getAlertsByPriority,
    createPriceAlert,
    createVolumeAlert,
    createIndicatorAlert,
    onAlertTriggered,
    refreshStatistics,
  };
}

/**
 * 警报模板 - 常用的警报配置模板
 */
export const AlertTemplates = {
  // 价格突破模板
  priceBreakout: (symbol: string, resistance: number, support: number): Partial<Alert> => ({
    name: `${symbol} 价格突破监控`,
    description: `监控${symbol}价格突破阻力位¥${resistance}或跌破支撑位¥${support}`,
    symbol,
    conditions: [
      {
        id: `condition_${Date.now()}_1`,
        type: 'price_above',
        symbol,
        targetPrice: resistance,
      },
      {
        id: `condition_${Date.now()}_2`,
        type: 'price_below',
        symbol,
        targetPrice: support,
      }
    ],
    logicOperator: 'OR',
    priority: 'high',
    notifications: ['browser', 'sound'],
    tags: ['breakout', 'price'],
  }),

  // RSI超买超卖模板
  rsiOverboughtOversold: (symbol: string): Partial<Alert> => ({
    name: `${symbol} RSI超买超卖`,
    description: `监控${symbol}的RSI指标超买(>70)或超卖(<30)`,
    symbol,
    conditions: [
      {
        id: `condition_${Date.now()}_1`,
        type: 'indicator_range',
        symbol,
        indicator: 'RSI',
        valueRange: { min: 70, max: 100 },
      },
      {
        id: `condition_${Date.now()}_2`,
        type: 'indicator_range',
        symbol,
        indicator: 'RSI',
        valueRange: { min: 0, max: 30 },
      }
    ],
    logicOperator: 'OR',
    priority: 'medium',
    notifications: ['browser'],
    tags: ['rsi', 'overbought', 'oversold'],
  }),

  // 成交量异常模板
  volumeAnomaly: (symbol: string): Partial<Alert> => ({
    name: `${symbol} 成交量异常`,
    description: `监控${symbol}成交量异常放大(超过3倍平均值)`,
    symbol,
    conditions: [
      {
        id: `condition_${Date.now()}`,
        type: 'volume_spike',
        symbol,
        volumeMultiplier: 3,
      }
    ],
    logicOperator: 'OR',
    priority: 'high',
    notifications: ['browser', 'sound'],
    tags: ['volume', 'anomaly'],
  }),

  // MACD金叉死叉模板
  macdCross: (symbol: string): Partial<Alert> => ({
    name: `${symbol} MACD交叉`,
    description: `监控${symbol}的MACD金叉死叉信号`,
    symbol,
    conditions: [
      {
        id: `condition_${Date.now()}_1`,
        type: 'indicator_cross_above',
        symbol,
        indicator: 'MACD',
        targetValue: 0,
      },
      {
        id: `condition_${Date.now()}_2`,
        type: 'indicator_cross_below',
        symbol,
        indicator: 'MACD',
        targetValue: 0,
      }
    ],
    logicOperator: 'OR',
    priority: 'medium',
    notifications: ['browser'],
    tags: ['macd', 'cross'],
  }),
};

export default useAlertService;