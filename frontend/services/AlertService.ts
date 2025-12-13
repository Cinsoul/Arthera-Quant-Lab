/**
 * AlertService - 价格和技术指标警报系统
 * 
 * 功能特性：
 * ✅ 价格突破警报：支持阻力位、支撑位、价格区间突破
 * ✅ 技术指标警报：RSI、MACD、KDJ、布林带等指标条件警报
 * ✅ 成交量异常警报：成交量暴增、地量等异常情况
 * ✅ 实时监控：基于WebSocket实时数据流触发警报
 * ✅ 智能通知：多种通知方式（浏览器通知、音效、邮件、微信）
 * ✅ 警报管理：创建、编辑、删除、启用/禁用警报规则
 */

import { getDataStreamManager, MarketData } from './DataStreamManager';
import { getIndicatorCalculationService, IndicatorType, IndicatorResult } from './IndicatorCalculationService';
import { getHistoricalDataService, OHLCV } from './HistoricalDataService';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AlertConditionType = 
  | 'price_above' | 'price_below' | 'price_range_break' | 'price_change_percent'
  | 'volume_spike' | 'volume_dry_up' | 'volume_above' | 'volume_below'
  | 'indicator_cross_above' | 'indicator_cross_below' | 'indicator_range'
  | 'indicator_divergence' | 'pattern_detected';

export type AlertNotificationType = 
  | 'browser' | 'sound' | 'popup' | 'email' | 'wechat' | 'webhook';

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'active' | 'triggered' | 'paused' | 'expired';

export interface AlertCondition {
  id: string;
  type: AlertConditionType;
  symbol: string;
  
  // 价格条件
  targetPrice?: number;
  priceRange?: { min: number; max: number };
  changePercent?: number;
  
  // 技术指标条件
  indicator?: IndicatorType;
  indicatorParams?: any;
  targetValue?: number;
  valueRange?: { min: number; max: number };
  crossDirection?: 'above' | 'below';
  
  // 成交量条件
  volumeMultiplier?: number; // 相对于平均成交量的倍数
  volumeThreshold?: number;  // 绝对成交量阈值
  
  // 时间条件
  timeFrame?: '1M' | '5M' | '15M' | '30M' | '1H' | '1D';
  duration?: number; // 条件持续时间（分钟）
}

export interface Alert {
  id: string;
  name: string;
  description: string;
  symbol: string;
  conditions: AlertCondition[];
  
  // 触发设置
  logicOperator: 'AND' | 'OR'; // 多条件逻辑关系
  triggerOnce: boolean;        // 是否只触发一次
  cooldownPeriod?: number;     // 冷却期（秒）
  
  // 通知设置
  notifications: AlertNotificationType[];
  soundFile?: string;
  emailRecipients?: string[];
  webhookUrl?: string;
  
  // 状态信息
  status: AlertStatus;
  priority: AlertPriority;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  
  // 有效期设置
  expiresAt?: Date;
  isEnabled: boolean;
  
  // 用户自定义
  tags: string[];
  color?: string;
}

export interface AlertTriggerEvent {
  alertId: string;
  alert: Alert;
  triggeredConditions: AlertCondition[];
  marketData: MarketData;
  indicatorValues?: { [key: string]: number };
  timestamp: Date;
  message: string;
}

export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  triggeredToday: number;
  triggeredThisWeek: number;
  topTriggeredSymbols: { symbol: string; count: number }[];
  alertsByPriority: { [key in AlertPriority]: number };
  alertsByStatus: { [key in AlertStatus]: number };
}

// ============================================================================
// Alert Service Implementation
// ============================================================================

export class AlertService {
  private alerts: Map<string, Alert> = new Map();
  private activeMonitors: Map<string, string[]> = new Map(); // symbol -> alertIds
  private triggerHistory: AlertTriggerEvent[] = [];
  private dataStreamManager = getDataStreamManager();
  private indicatorService = getIndicatorCalculationService();
  private historicalService = getHistoricalDataService();
  
  // 订阅管理
  private subscriptions: Map<string, string> = new Map(); // alertId -> subscriptionId
  private lastIndicatorValues: Map<string, Map<IndicatorType, number>> = new Map();
  
  // 通知设置
  private notificationPermission: boolean = false;
  private audioContext?: AudioContext;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  
  // 事件监听器
  private listeners: {
    onAlertTriggered: ((event: AlertTriggerEvent) => void)[];
    onAlertCreated: ((alert: Alert) => void)[];
    onAlertUpdated: ((alert: Alert) => void)[];
    onAlertDeleted: ((alertId: string) => void)[];
  } = {
    onAlertTriggered: [],
    onAlertCreated: [],
    onAlertUpdated: [],
    onAlertDeleted: [],
  };
  private initialized = false;

  constructor() {
    this.initializeNotifications();
    this.initializeAudio();
    this.loadAlertsFromStorage();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initializeNotifications();
    this.initializeAudio();
    this.loadAlertsFromStorage();
    this.initialized = true;
  }

  subscribe(listener: (event: AlertTriggerEvent) => void): () => void {
    return this.addEventListener('onAlertTriggered', listener);
  }

  // ============================================================================
  // Alert Management
  // ============================================================================

  /**
   * 创建新警报
   */
  createAlert(alertConfig: Omit<Alert, 'id' | 'createdAt' | 'triggerCount' | 'status'>): string {
    const alert: Alert = {
      ...alertConfig,
      id: this.generateAlertId(),
      createdAt: new Date(),
      triggerCount: 0,
      status: 'active',
    };

    this.alerts.set(alert.id, alert);
    this.startMonitoring(alert);
    this.saveAlertsToStorage();
    
    this.notifyListeners('onAlertCreated', alert);
    console.log(`[AlertService] Created alert: ${alert.name} for ${alert.symbol}`);
    
    return alert.id;
  }

  /**
   * 更新警报
   */
  updateAlert(alertId: string, updates: Partial<Alert>): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    // 停止旧的监控
    this.stopMonitoring(alertId);
    
    // 更新警报
    const updatedAlert = { ...alert, ...updates };
    this.alerts.set(alertId, updatedAlert);
    
    // 如果启用，重新开始监控
    if (updatedAlert.isEnabled && updatedAlert.status === 'active') {
      this.startMonitoring(updatedAlert);
    }
    
    this.saveAlertsToStorage();
    this.notifyListeners('onAlertUpdated', updatedAlert);
    
    console.log(`[AlertService] Updated alert: ${updatedAlert.name}`);
    return true;
  }

  /**
   * 删除警报
   */
  deleteAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    this.stopMonitoring(alertId);
    this.alerts.delete(alertId);
    this.saveAlertsToStorage();
    
    this.notifyListeners('onAlertDeleted', alertId);
    console.log(`[AlertService] Deleted alert: ${alert.name}`);
    
    return true;
  }

  /**
   * 获取警报
   */
  getAlert(alertId: string): Alert | null {
    return this.alerts.get(alertId) || null;
  }

  /**
   * 获取所有警报
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * 获取指定股票的警报
   */
  getAlertsBySymbol(symbol: string): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.symbol === symbol);
  }

  /**
   * 启用/禁用警报
   */
  toggleAlert(alertId: string, enabled: boolean): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    if (enabled) {
      alert.isEnabled = true;
      alert.status = 'active';
      this.startMonitoring(alert);
    } else {
      alert.isEnabled = false;
      alert.status = 'paused';
      this.stopMonitoring(alertId);
    }

    this.saveAlertsToStorage();
    this.notifyListeners('onAlertUpdated', alert);
    
    return true;
  }

  // ============================================================================
  // Monitoring & Evaluation
  // ============================================================================

  /**
   * 开始监控警报
   */
  private startMonitoring(alert: Alert): void {
    if (!alert.isEnabled || alert.status !== 'active') return;

    // 订阅实时数据
    const subscriptionId = this.dataStreamManager.subscribe(
      [alert.symbol],
      (marketData) => this.evaluateAlert(alert, marketData)
    );
    
    this.subscriptions.set(alert.id, subscriptionId);
    
    // 更新活跃监控映射
    if (!this.activeMonitors.has(alert.symbol)) {
      this.activeMonitors.set(alert.symbol, []);
    }
    this.activeMonitors.get(alert.symbol)!.push(alert.id);
    
    console.log(`[AlertService] Started monitoring: ${alert.name} (${alert.symbol})`);
  }

  /**
   * 停止监控警报
   */
  private stopMonitoring(alertId: string): void {
    const subscriptionId = this.subscriptions.get(alertId);
    if (subscriptionId) {
      this.dataStreamManager.unsubscribe(subscriptionId);
      this.subscriptions.delete(alertId);
    }
    
    // 从活跃监控中移除
    this.activeMonitors.forEach((alertIds, symbol) => {
      const index = alertIds.indexOf(alertId);
      if (index > -1) {
        alertIds.splice(index, 1);
        if (alertIds.length === 0) {
          this.activeMonitors.delete(symbol);
        }
      }
    });
    
    console.log(`[AlertService] Stopped monitoring alert: ${alertId}`);
  }

  /**
   * 评估警报条件
   */
  private async evaluateAlert(alert: Alert, marketData: MarketData): Promise<void> {
    try {
      // 检查冷却期
      if (this.isInCooldown(alert)) return;
      
      // 检查有效期
      if (alert.expiresAt && new Date() > alert.expiresAt) {
        alert.status = 'expired';
        this.stopMonitoring(alert.id);
        return;
      }
      
      const triggeredConditions: AlertCondition[] = [];
      const indicatorValues: { [key: string]: number } = {};
      
      // 评估每个条件
      for (const condition of alert.conditions) {
        const isTriggered = await this.evaluateCondition(condition, marketData, indicatorValues);
        if (isTriggered) {
          triggeredConditions.push(condition);
        }
      }
      
      // 判断是否触发警报
      const shouldTrigger = alert.logicOperator === 'AND' 
        ? triggeredConditions.length === alert.conditions.length
        : triggeredConditions.length > 0;
      
      if (shouldTrigger) {
        await this.triggerAlert(alert, triggeredConditions, marketData, indicatorValues);
      }
      
    } catch (error) {
      console.error(`[AlertService] Error evaluating alert ${alert.name}:`, error);
    }
  }

  /**
   * 评估单个条件
   */
  private async evaluateCondition(
    condition: AlertCondition,
    marketData: MarketData,
    indicatorValues: { [key: string]: number }
  ): Promise<boolean> {
    const { type, symbol } = condition;
    
    switch (type) {
      case 'price_above':
        return marketData.price > (condition.targetPrice || 0);
        
      case 'price_below':
        return marketData.price < (condition.targetPrice || 0);
        
      case 'price_range_break':
        const range = condition.priceRange;
        if (!range) return false;
        return marketData.price < range.min || marketData.price > range.max;
        
      case 'price_change_percent':
        return Math.abs(marketData.changePercent) >= (condition.changePercent || 0);
        
      case 'volume_spike':
        return await this.evaluateVolumeSpike(symbol, marketData, condition.volumeMultiplier || 2);
        
      case 'volume_above':
        return marketData.volume > (condition.volumeThreshold || 0);
        
      case 'volume_below':
        return marketData.volume < (condition.volumeThreshold || 0);
        
      case 'indicator_cross_above':
      case 'indicator_cross_below':
      case 'indicator_range':
        return await this.evaluateIndicatorCondition(condition, marketData, indicatorValues);
        
      default:
        console.warn(`[AlertService] Unknown condition type: ${type}`);
        return false;
    }
  }

  /**
   * 评估成交量异常
   */
  private async evaluateVolumeSpike(symbol: string, marketData: MarketData, multiplier: number): Promise<boolean> {
    try {
      // 获取最近20天的成交量数据计算平均值
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 20 * 24 * 60 * 60 * 1000);
      
      const historicalData = await this.historicalService.getHistoricalData(
        symbol,
        { startDate, endDate },
        '1D'
      );
      
      if (!historicalData.success || !historicalData.data || historicalData.data.length < 5) {
        return false;
      }
      
      const avgVolume = historicalData.data
        .slice(-20)
        .reduce((sum, item) => sum + item.volume, 0) / Math.min(20, historicalData.data.length);
      
      return marketData.volume > avgVolume * multiplier;
      
    } catch (error) {
      console.error(`[AlertService] Error evaluating volume spike:`, error);
      return false;
    }
  }

  /**
   * 评估技术指标条件
   */
  private async evaluateIndicatorCondition(
    condition: AlertCondition,
    marketData: MarketData,
    indicatorValues: { [key: string]: number }
  ): Promise<boolean> {
    try {
      const { indicator, targetValue, valueRange, crossDirection } = condition;
      if (!indicator) return false;
      
      // 获取历史数据用于指标计算
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 100 * 24 * 60 * 60 * 1000); // 100天数据
      
      const historicalData = await this.historicalService.getHistoricalData(
        condition.symbol,
        { startDate, endDate },
        condition.timeFrame || '1D'
      );
      
      if (!historicalData.success || !historicalData.data) {
        return false;
      }
      
      // 计算技术指标
      const indicatorResults = await this.indicatorService.calculate(
        indicator,
        historicalData.data,
        condition.indicatorParams || {}
      );
      
      if (!indicatorResults.success || !indicatorResults.data || indicatorResults.data.length === 0) {
        return false;
      }
      
      const latestResult = indicatorResults.data[indicatorResults.data.length - 1];
      const currentValue = latestResult.value;
      
      if (currentValue === null) return false;
      
      // 存储指标值
      indicatorValues[indicator] = currentValue;
      
      // 获取历史指标值用于交叉判断
      const symbol = condition.symbol;
      if (!this.lastIndicatorValues.has(symbol)) {
        this.lastIndicatorValues.set(symbol, new Map());
      }
      const lastValues = this.lastIndicatorValues.get(symbol)!;
      const lastValue = lastValues.get(indicator);
      lastValues.set(indicator, currentValue);
      
      switch (condition.type) {
        case 'indicator_cross_above':
          return lastValue !== undefined && 
                 targetValue !== undefined &&
                 lastValue <= targetValue && 
                 currentValue > targetValue;
                 
        case 'indicator_cross_below':
          return lastValue !== undefined && 
                 targetValue !== undefined &&
                 lastValue >= targetValue && 
                 currentValue < targetValue;
                 
        case 'indicator_range':
          if (!valueRange) return false;
          return currentValue < valueRange.min || currentValue > valueRange.max;
          
        default:
          return false;
      }
      
    } catch (error) {
      console.error(`[AlertService] Error evaluating indicator condition:`, error);
      return false;
    }
  }

  // ============================================================================
  // Alert Triggering & Notifications
  // ============================================================================

  /**
   * 触发警报
   */
  private async triggerAlert(
    alert: Alert,
    triggeredConditions: AlertCondition[],
    marketData: MarketData,
    indicatorValues: { [key: string]: number }
  ): Promise<void> {
    try {
      // 创建触发事件
      const triggerEvent: AlertTriggerEvent = {
        alertId: alert.id,
        alert,
        triggeredConditions,
        marketData,
        indicatorValues,
        timestamp: new Date(),
        message: this.generateAlertMessage(alert, triggeredConditions, marketData, indicatorValues),
      };
      
      // 更新警报状态
      alert.lastTriggered = triggerEvent.timestamp;
      alert.triggerCount++;
      
      // 如果设置为只触发一次，则禁用警报
      if (alert.triggerOnce) {
        alert.status = 'triggered';
        alert.isEnabled = false;
        this.stopMonitoring(alert.id);
      }
      
      // 保存历史记录
      this.triggerHistory.push(triggerEvent);
      if (this.triggerHistory.length > 1000) {
        this.triggerHistory = this.triggerHistory.slice(-1000); // 保留最近1000条
      }
      
      // 发送通知
      await this.sendNotifications(alert, triggerEvent);
      
      // 通知监听器
      this.notifyListeners('onAlertTriggered', triggerEvent);
      
      // 保存到存储
      this.saveAlertsToStorage();
      
      console.log(`[AlertService] Alert triggered: ${alert.name} - ${triggerEvent.message}`);
      
    } catch (error) {
      console.error(`[AlertService] Error triggering alert:`, error);
    }
  }

  /**
   * 生成警报消息
   */
  private generateAlertMessage(
    alert: Alert,
    triggeredConditions: AlertCondition[],
    marketData: MarketData,
    indicatorValues: { [key: string]: number }
  ): string {
    const symbol = alert.symbol;
    const price = marketData.price;
    const change = marketData.changePercent;
    
    let message = `【${symbol}】${alert.name}\n`;
    message += `当前价格: ¥${price.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%)\n`;
    
    triggeredConditions.forEach((condition, index) => {
      switch (condition.type) {
        case 'price_above':
          message += `• 价格突破上方阻力位 ¥${condition.targetPrice}\n`;
          break;
        case 'price_below':
          message += `• 价格跌破下方支撑位 ¥${condition.targetPrice}\n`;
          break;
        case 'volume_spike':
          message += `• 成交量异常放大 ${(marketData.volume / 10000).toFixed(0)}万\n`;
          break;
        case 'indicator_cross_above':
          message += `• ${condition.indicator} 指标突破上方 ${condition.targetValue}\n`;
          break;
        case 'indicator_cross_below':
          message += `• ${condition.indicator} 指标跌破下方 ${condition.targetValue}\n`;
          break;
        default:
          message += `• 条件${index + 1}已触发\n`;
      }
    });
    
    if (Object.keys(indicatorValues).length > 0) {
      message += '\n技术指标:\n';
      Object.entries(indicatorValues).forEach(([indicator, value]) => {
        message += `${indicator}: ${value.toFixed(2)} `;
      });
    }
    
    return message;
  }

  /**
   * 发送通知
   */
  private async sendNotifications(alert: Alert, triggerEvent: AlertTriggerEvent): Promise<void> {
    for (const notificationType of alert.notifications) {
      try {
        switch (notificationType) {
          case 'browser':
            await this.sendBrowserNotification(alert, triggerEvent);
            break;
          case 'sound':
            await this.playSoundNotification(alert.soundFile);
            break;
          case 'popup':
            // 这将通过事件监听器在UI中处理
            break;
          case 'email':
            // 这需要后端服务支持
            console.log(`[AlertService] Email notification not implemented`);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert, triggerEvent);
            break;
        }
      } catch (error) {
        console.error(`[AlertService] Error sending ${notificationType} notification:`, error);
      }
    }
  }

  /**
   * 发送浏览器通知
   */
  private async sendBrowserNotification(alert: Alert, triggerEvent: AlertTriggerEvent): Promise<void> {
    if (!this.notificationPermission || !('Notification' in window)) {
      return;
    }
    
    const notification = new Notification(`${alert.symbol} 价格警报`, {
      body: triggerEvent.message.replace(/\n/g, ' '),
      icon: '/favicon.ico',
      tag: alert.id,
      requireInteraction: alert.priority === 'critical',
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    // 自动关闭非关键通知
    if (alert.priority !== 'critical') {
      setTimeout(() => notification.close(), 5000);
    }
  }

  /**
   * 播放声音通知
   */
  private async playSoundNotification(soundFile?: string): Promise<void> {
    if (!this.audioContext) return;
    
    try {
      const defaultSound = 'alert-default';
      const soundKey = soundFile || defaultSound;
      
      let audioBuffer = this.soundBuffers.get(soundKey);
      if (!audioBuffer) {
        // 这里可以加载自定义音效文件
        // 目前使用程序生成的简单提示音
        audioBuffer = await this.generateBeepSound();
        this.soundBuffers.set(soundKey, audioBuffer);
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
      
    } catch (error) {
      console.error('[AlertService] Error playing sound:', error);
    }
  }

  /**
   * 发送Webhook通知
   */
  private async sendWebhookNotification(alert: Alert, triggerEvent: AlertTriggerEvent): Promise<void> {
    if (!alert.webhookUrl) return;
    
    const payload = {
      alertId: alert.id,
      alertName: alert.name,
      symbol: alert.symbol,
      message: triggerEvent.message,
      priority: alert.priority,
      timestamp: triggerEvent.timestamp.toISOString(),
      marketData: triggerEvent.marketData,
      indicatorValues: triggerEvent.indicatorValues,
    };
    
    try {
      await fetch(alert.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('[AlertService] Error sending webhook:', error);
    }
  }

  // ============================================================================
  // Statistics & History
  // ============================================================================

  /**
   * 获取警报统计
   */
  getStatistics(): AlertStatistics {
    const alerts = Array.from(this.alerts.values());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 统计今日和本周触发次数
    const triggeredToday = this.triggerHistory.filter(event => 
      event.timestamp >= today
    ).length;
    
    const triggeredThisWeek = this.triggerHistory.filter(event => 
      event.timestamp >= weekAgo
    ).length;
    
    // 统计按股票的触发次数
    const symbolCounts = new Map<string, number>();
    this.triggerHistory.forEach(event => {
      const symbol = event.alert.symbol;
      symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
    });
    
    const topTriggeredSymbols = Array.from(symbolCounts.entries())
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // 按优先级和状态统计
    const alertsByPriority: { [key in AlertPriority]: number } = { low: 0, medium: 0, high: 0, critical: 0 };
    const alertsByStatus: { [key in AlertStatus]: number } = { active: 0, triggered: 0, paused: 0, expired: 0 };
    
    alerts.forEach(alert => {
      alertsByPriority[alert.priority]++;
      alertsByStatus[alert.status]++;
    });
    
    return {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.isEnabled && a.status === 'active').length,
      triggeredToday,
      triggeredThisWeek,
      topTriggeredSymbols,
      alertsByPriority,
      alertsByStatus,
    };
  }

  /**
   * 获取触发历史
   */
  getTriggerHistory(limit: number = 100): AlertTriggerEvent[] {
    return this.triggerHistory
      .slice(-limit)
      .reverse(); // 最新的在前
  }

  /**
   * 清理过期警报
   */
  cleanupExpiredAlerts(): number {
    const now = new Date();
    let cleanedCount = 0;
    
    Array.from(this.alerts.values()).forEach(alert => {
      if (alert.expiresAt && now > alert.expiresAt) {
        alert.status = 'expired';
        this.stopMonitoring(alert.id);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      this.saveAlertsToStorage();
      console.log(`[AlertService] Cleaned up ${cleanedCount} expired alerts`);
    }
    
    return cleanedCount;
  }

  // ============================================================================
  // Event Listeners
  // ============================================================================

  /**
   * 添加事件监听器
   */
  addEventListener<K extends keyof typeof this.listeners>(
    eventType: K,
    listener: typeof this.listeners[K][0]
  ): () => void {
    this.listeners[eventType].push(listener);
    
    return () => {
      const index = this.listeners[eventType].indexOf(listener);
      if (index > -1) {
        this.listeners[eventType].splice(index, 1);
      }
    };
  }

  /**
   * 通知监听器
   */
  private notifyListeners<K extends keyof typeof this.listeners>(
    eventType: K,
    ...args: any[]
  ): void {
    this.listeners[eventType].forEach(listener => {
      try {
        (listener as any)(...args);
      } catch (error) {
        console.error(`[AlertService] Error in ${eventType} listener:`, error);
      }
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * 检查是否在冷却期
   */
  private isInCooldown(alert: Alert): boolean {
    if (!alert.cooldownPeriod || !alert.lastTriggered) return false;
    
    const cooldownMs = alert.cooldownPeriod * 1000;
    const timeSinceLastTrigger = Date.now() - alert.lastTriggered.getTime();
    
    return timeSinceLastTrigger < cooldownMs;
  }

  /**
   * 生成警报ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * 初始化通知权限
   */
  private async initializeNotifications(): Promise<void> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission === 'granted';
    }
  }

  /**
   * 初始化音频
   */
  private initializeAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('[AlertService] Audio context not available:', error);
    }
  }

  /**
   * 生成提示音
   */
  private async generateBeepSound(): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not available');
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2; // 200ms
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const time = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * 800 * time) * Math.exp(-time * 5);
    }
    
    return buffer;
  }

  /**
   * 保存警报到本地存储
   */
  private saveAlertsToStorage(): void {
    try {
      const alertsArray = Array.from(this.alerts.values());
      localStorage.setItem('arthera-alerts', JSON.stringify(alertsArray));
    } catch (error) {
      console.error('[AlertService] Error saving alerts to storage:', error);
    }
  }

  /**
   * 从本地存储加载警报
   */
  private loadAlertsFromStorage(): void {
    try {
      const stored = localStorage.getItem('arthera-alerts');
      if (stored) {
        const alertsArray: Alert[] = JSON.parse(stored);
        alertsArray.forEach(alert => {
          // 恢复Date对象
          alert.createdAt = new Date(alert.createdAt);
          if (alert.lastTriggered) {
            alert.lastTriggered = new Date(alert.lastTriggered);
          }
          if (alert.expiresAt) {
            alert.expiresAt = new Date(alert.expiresAt);
          }
          
          this.alerts.set(alert.id, alert);
          
          // 如果警报启用且状态为活跃，重新开始监控
          if (alert.isEnabled && alert.status === 'active') {
            this.startMonitoring(alert);
          }
        });
        
        console.log(`[AlertService] Loaded ${alertsArray.length} alerts from storage`);
      }
    } catch (error) {
      console.error('[AlertService] Error loading alerts from storage:', error);
    }
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    // 停止所有监控
    Array.from(this.subscriptions.keys()).forEach(alertId => {
      this.stopMonitoring(alertId);
    });
    
    // 关闭音频上下文
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    // 清理监听器
    Object.keys(this.listeners).forEach(key => {
      this.listeners[key as keyof typeof this.listeners].length = 0;
    });
    
    console.log('[AlertService] Service destroyed');
  }
}

// ============================================================================
// Global Instance & Exports
// ============================================================================

let globalAlertService: AlertService | null = null;

/**
 * 获取全局警报服务实例
 */
export function getAlertService(): AlertService {
  if (!globalAlertService) {
    globalAlertService = new AlertService();
    
    // 定期清理过期警报
    setInterval(() => {
      if (globalAlertService) {
        globalAlertService.cleanupExpiredAlerts();
      }
    }, 5 * 60 * 1000); // 每5分钟检查一次
  }
  return globalAlertService;
}

export default AlertService;
