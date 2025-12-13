/**
 * Enhanced Chart View State Manager
 * Bloomberg/TradingView标准的专业级缩放/平移/数据加载架构
 * 
 * 核心增强：
 * 1. 时间基础的缩放逻辑（而非barIndex）
 * 2. 多层级时间刻度：月>日期>小时>半小时
 * 3. 智能时间轴切换（1m/3m/6m自适应）
 * 4. Bloomberg级缩放平滑度
 * 5. 专业终端级时间导航
 * 6. 接近边缘 → 智能补数据
 */

import type { TimePeriod, TimeInterval } from './professionalAxisTypes';
import {
  calculateProfessionalTimeAxis,
  type TimeAxisResult,
  type CandleData,
} from './professionalAxisCalculator';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * K线数据结构
 */
export interface Bar {
  time: Date;         // 真实时间
  timestamp: number;  // 时间戳
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 增强视图状态（核心）
 */
export interface ViewState {
  // ========== 时间基础坐标 ==========
  timeRange: {
    startTime: number;      // 可见区间起始时间戳（毫秒）
    endTime: number;        // 可见区间结束时间戳（毫秒）
  };
  
  // ========== 数据加载范围 ==========
  loadedStart: number;      // 已加载数据起始index
  loadedEnd: number;        // 已加载数据结束index
  
  // ========== 时间周期和粒度 ==========
  timeframe: TimePeriod | 'Custom';    // 当前周期（手动缩放后变为Custom）
  currentInterval: TimeInterval;       // 当前K线间隔
  timeAxisLevel: 'year' | 'month' | 'day' | 'hour' | 'minute';  // 时间轴显示级别
  
  // ========== 画布信息 ==========
  widthPx: number;          // 画布宽度（像素）
  heightPx: number;         // 画布高度（像素）
  
  // ========== Y轴范围 ==========
  priceMin: number;         // 当前可见价格最小值
  priceMax: number;         // 当前可见价格最大值
  volumeMin: number;        // 当前可见成交量最小值
  volumeMax: number;        // 当前可见成交量最大值
  
  // ========== 专业级状态 ==========
  zoomLevel: number;        // 缩放级别（1.0为基准）
  visibleBars: number;      // 可见K线数量
  barWidth: number;         // 单根K线像素宽度
  pixelsPerMs: number;      // 每毫秒对应的像素数
}

/**
 * 数据加载回调
 */
export interface DataLoader {
  loadMoreLeft: (count: number) => Promise<Bar[]>;   // 往左加载历史数据
  loadMoreRight: (count: number) => Promise<Bar[]>;  // 往右加载最新数据
  onRangeChange?: (start: number, end: number) => void; // 可见区间变化回调
}

// ============================================================================
// 常量配置
// ============================================================================

/**
 * 各时间周期对应的时间跨度（毫秒）
 */
const TIME_SPANS: Record<TimePeriod, number> = {
  '1D': 24 * 60 * 60 * 1000,           // 1天
  '5D': 5 * 24 * 60 * 60 * 1000,       // 5天
  '1M': 30 * 24 * 60 * 60 * 1000,      // 30天
  '3M': 90 * 24 * 60 * 60 * 1000,      // 90天
  '6M': 180 * 24 * 60 * 60 * 1000,     // 180天
  '1Y': 365 * 24 * 60 * 60 * 1000,     // 365天
  'YTD': 365 * 24 * 60 * 60 * 1000,    // 动态计算
  '5Y': 5 * 365 * 24 * 60 * 60 * 1000, // 5年
  'ALL': 10 * 365 * 24 * 60 * 60 * 1000, // 10年
};

/**
 * 时间周期对应的最佳K线间隔
 */
const OPTIMAL_INTERVALS: Record<TimePeriod, TimeInterval> = {
  '1D': '5m',    // 1天用5分钟K线
  '5D': '15m',   // 5天用15分钟K线
  '1M': '1h',    // 1月用1小时K线
  '3M': '4h',    // 3月用4小时K线
  '6M': '1D',    // 6月用日K线
  '1Y': '1D',    // 1年用日K线
  'YTD': '1D',   // YTD用日K线
  '5Y': '1W',    // 5年用周K线
  'ALL': '1M',   // 全部用月K线
};

/**
 * 时间轴显示级别映射
 */
const TIME_AXIS_LEVELS: Record<TimePeriod, 'year' | 'month' | 'day' | 'hour' | 'minute'> = {
  '1D': 'minute',
  '5D': 'hour',
  '1M': 'day',
  '3M': 'day',
  '6M': 'month',
  '1Y': 'month',
  'YTD': 'month',
  '5Y': 'year',
  'ALL': 'year',
};

/**
 * 专业级缩放限制
 */
const MIN_TIME_SPAN = 5 * 60 * 1000;        // 最小5分钟时间跨度
const MAX_TIME_SPAN = 10 * 365 * 24 * 60 * 60 * 1000;  // 最大10年时间跨度
const MIN_VISIBLE_BARS = 20;                // 最少显示20根K线
const MAX_VISIBLE_BARS = 2000;              // 最多显示2000根K线

/**
 * Bloomberg级缩放参数
 */
const ZOOM_SENSITIVITY = 0.002;             // 缩放敏感度
const SMOOTH_ZOOM_FACTOR = 0.15;            // 平滑缩放系数
const PAN_MOMENTUM_DECAY = 0.92;            // 平移惯性衰减

/**
 * 数据加载触发边距
 */
const LOAD_MARGIN = 50;                     // 距离边缘50根就触发加载
const TIME_LOAD_MARGIN = 7 * 24 * 60 * 60 * 1000;  // 时间边距：7天

// ============================================================================
// ViewStateManager - 核心状态管理器
// ============================================================================

export class EnhancedChartViewStateManager {
  private state: ViewState;
  private data: Bar[];
  private loader?: DataLoader;
  private isLoading = false;
  
  // 专业级交互状态
  private momentum: { x: number; active: boolean } = { x: 0, active: false };
  private lastPanTime: number = 0;
  private smoothZoomTarget: number = 1;
  private animationFrameId: number | null = null;

  constructor(
    initialData: Bar[],
    canvasWidth: number,
    canvasHeight: number,
    loader?: DataLoader
  ) {
    this.data = initialData.sort((a, b) => a.timestamp - b.timestamp);  // 确保按时间排序
    this.loader = loader;

    // 计算初始时间范围
    const now = Date.now();
    const defaultSpan = TIME_SPANS['3M'];  // 默认3个月
    const lastDataTime = initialData.length > 0 ? 
      initialData[initialData.length - 1].timestamp : now;

    // 初始化增强状态
    this.state = {
      timeRange: {
        startTime: lastDataTime - defaultSpan,
        endTime: lastDataTime,
      },
      loadedStart: 0,
      loadedEnd: Math.max(0, initialData.length - 1),
      timeframe: '3M',
      currentInterval: '1D',
      timeAxisLevel: 'day',
      widthPx: canvasWidth,
      heightPx: canvasHeight,
      priceMin: 0,
      priceMax: 0,
      volumeMin: 0,
      volumeMax: 0,
      zoomLevel: 1.0,
      visibleBars: 0,
      barWidth: 0,
      pixelsPerMs: 0,
    };

    this.updateDerivedState();
    this.recomputeYAxis();
  }

  // ==========================================================================
  // 公共API
  // ==========================================================================

  /**
   * 获取当前状态（只读）
   */
  getState(): Readonly<ViewState> {
    return { ...this.state };
  }

  /**
   * 获取当前可见数据（基于时间范围）
   */
  getVisibleData(): Bar[] {
    const { startTime, endTime } = this.state.timeRange;
    return this.data.filter(bar => 
      bar.timestamp >= startTime && bar.timestamp <= endTime
    );
  }
  
  /**
   * 根据时间戳获取数据索引
   */
  private findDataIndex(timestamp: number): number {
    // 二分查找提高性能
    let left = 0;
    let right = this.data.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = this.data[mid].timestamp;
      
      if (midTime === timestamp) return mid;
      if (midTime < timestamp) left = mid + 1;
      else right = mid - 1;
    }
    
    return Math.max(0, Math.min(this.data.length - 1, left));
  }
  
  /**
   * 更新派生状态
   */
  private updateDerivedState(): void {
    const { startTime, endTime } = this.state.timeRange;
    const timeSpan = endTime - startTime;
    const visibleData = this.getVisibleData();
    
    this.state.visibleBars = visibleData.length;
    this.state.pixelsPerMs = this.state.widthPx / timeSpan;
    this.state.barWidth = this.state.visibleBars > 0 ? 
      this.state.widthPx / this.state.visibleBars : 10;
    
    // 动态调整时间轴级别
    this.adjustTimeAxisLevel(timeSpan);
  }
  
  /**
   * 动态调整时间轴显示级别
   */
  private adjustTimeAxisLevel(timeSpan: number): void {
    if (timeSpan <= 24 * 60 * 60 * 1000) {
      this.state.timeAxisLevel = 'minute';
    } else if (timeSpan <= 7 * 24 * 60 * 60 * 1000) {
      this.state.timeAxisLevel = 'hour';
    } else if (timeSpan <= 90 * 24 * 60 * 60 * 1000) {
      this.state.timeAxisLevel = 'day';
    } else if (timeSpan <= 365 * 24 * 60 * 60 * 1000) {
      this.state.timeAxisLevel = 'month';
    } else {
      this.state.timeAxisLevel = 'year';
    }
  }

  /**
   * 获取所有已加载数据
   */
  getAllData(): Bar[] {
    return [...this.data];
  }

  /**
   * 更新画布尺寸
   */
  setCanvasSize(width: number, height: number) {
    this.state.widthPx = width;
    this.state.heightPx = height;
  }

  /**
   * 更新数据（外部数据源变化时调用）
   */
  setData(newData: Bar[]) {
    this.data = newData;
    this.state.loadedStart = 0;
    this.state.loadedEnd = Math.max(0, newData.length - 1);
    
    // 确保可见区间在有效范围内
    this.clampVisibleRange();
    this.recomputeYAxis();
  }

  /**
   * 保证时间窗口与已加载数据保持一致
   */
  private clampVisibleRange() {
    if (this.data.length === 0) {
      const now = Date.now();
      this.state.timeRange = {
        startTime: now - TIME_SPANS['3M'],
        endTime: now,
      };
      this.state.visibleBars = 0;
      return;
    }

    let { startTime, endTime } = this.state.timeRange;
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      const lastTimestamp = this.data[this.data.length - 1].timestamp;
      endTime = lastTimestamp;
      startTime = lastTimestamp - TIME_SPANS['3M'];
    }

    if (endTime <= startTime) {
      endTime = startTime + MIN_TIME_SPAN;
    }

    let span = endTime - startTime;
    if (span < MIN_TIME_SPAN) {
      endTime = startTime + MIN_TIME_SPAN;
      span = MIN_TIME_SPAN;
    } else if (span > MAX_TIME_SPAN) {
      startTime = endTime - MAX_TIME_SPAN;
      span = MAX_TIME_SPAN;
    }

    const minTimestamp = this.data[0].timestamp;
    const maxTimestamp = this.data[this.data.length - 1].timestamp;

    if (startTime < minTimestamp) {
      const delta = minTimestamp - startTime;
      startTime += delta;
      endTime += delta;
    }

    if (endTime > maxTimestamp) {
      const delta = endTime - maxTimestamp;
      startTime -= delta;
      endTime -= delta;
      if (startTime < minTimestamp) {
        startTime = minTimestamp;
        endTime = Math.min(maxTimestamp, startTime + span);
      }
    }

    this.state.timeRange = { startTime, endTime };

    const visibleCount = this.getVisibleData().length;
    const constrainedCount = Math.min(Math.max(visibleCount, MIN_VISIBLE_BARS), MAX_VISIBLE_BARS);
    this.state.visibleBars = visibleCount === 0 ? 0 : constrainedCount;
    if (this.state.visibleBars > 0) {
      this.state.barWidth = this.state.widthPx / this.state.visibleBars;
    }
  }

  // ==========================================================================
  // Timeframe切换
  // ==========================================================================

  /**
   * 应用时间周期（点击1D/5D/1M等按钮）- 增强版
   */
  applyTimeframe(timeframe: TimePeriod): void {
    this.state.timeframe = timeframe;
    this.state.currentInterval = OPTIMAL_INTERVALS[timeframe];
    
    const now = Date.now();
    const timeSpan = TIME_SPANS[timeframe];
    
    if (timeframe === 'YTD') {
      // YTD: 从今年1月1日开始
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
      this.state.timeRange = {
        startTime: startOfYear,
        endTime: now,
      };
    } else {
      // 其他时间周期：从现在往前推算
      this.state.timeRange = {
        startTime: now - timeSpan,
        endTime: now,
      };
    }
    
    this.updateDerivedState();
    this.checkAndLoadData();
    this.recomputeYAxis();
    
    // 触发回调
    this.loader?.onRangeChange?.(
      this.findDataIndex(this.state.timeRange.startTime),
      this.findDataIndex(this.state.timeRange.endTime)
    );
    
    console.log('[Enhanced ChartViewState] Applied timeframe:', {
      timeframe,
      interval: this.state.currentInterval,
      timeSpan: timeSpan / (24 * 60 * 60 * 1000) + ' days',
      axisLevel: this.state.timeAxisLevel,
      visibleBars: this.state.visibleBars,
    });
  }

  // ==========================================================================
  // 缩放（Zoom）- TradingView标准
  // ==========================================================================

  /**
   * Bloomberg级精确缩放（基于时间戳）
   * @param mouseX 鼠标X坐标（0 ~ widthPx）
   * @param zoomFactor 缩放因子（>1放大，<1缩小）
   */
  zoomAt(mouseX: number, zoomFactor: number): boolean {
    // 1. 计算锚点的时间戳
    const anchorTime = this.xToTime(mouseX);
    
    // 2. 计算当前时间跨度
    const { startTime, endTime } = this.state.timeRange;
    const currentSpan = endTime - startTime;
    
    // 3. 计算新的时间跨度
    const newSpan = currentSpan / zoomFactor;
    
    // 4. 限制缩放范围
    const clampedSpan = Math.max(MIN_TIME_SPAN, Math.min(MAX_TIME_SPAN, newSpan));
    
    if (Math.abs(clampedSpan - currentSpan) < 1000) {
      return false;  // 变化太小，忽略
    }
    
    // 5. 计算锚点到两端的比例
    const leftRatio = (anchorTime - startTime) / currentSpan;
    const rightRatio = (endTime - anchorTime) / currentSpan;
    
    // 6. 按比例分配新的时间范围
    const newStartTime = anchorTime - clampedSpan * leftRatio;
    const newEndTime = anchorTime + clampedSpan * rightRatio;
    
    // 7. 应用新的时间范围
    return this.applyTimeRange(newStartTime, newEndTime);
  }
  
  /**
   * 屏幕X坐标转时间戳
   */
  private xToTime(x: number): number {
    const ratio = x / this.state.widthPx;
    const { startTime, endTime } = this.state.timeRange;
    return startTime + ratio * (endTime - startTime);
  }
  
  /**
   * 时间戳转屏幕X坐标
   */
  timeToX(timestamp: number): number {
    const { startTime, endTime } = this.state.timeRange;
    const ratio = (timestamp - startTime) / (endTime - startTime);
    return ratio * this.state.widthPx;
  }

  /**
   * 平滑滚轮缩放（Bloomberg级）
   * @param mouseX 鼠标X坐标
   * @param deltaY 滚轮增量（正数=缩小，负数=放大）
   */
  wheelZoom(mouseX: number, deltaY: number): boolean {
    const zoomFactor = Math.exp(-deltaY * ZOOM_SENSITIVITY);
    
    // 设置平滑缩放目标
    this.smoothZoomTarget *= zoomFactor;
    
    // 启动平滑动画
    this.startSmoothZoom(mouseX);
    
    return true;
  }
  
  /**
   * 平滑缩放动画
   */
  private startSmoothZoom(mouseX: number): void {
    if (this.animationFrameId !== null) return;
    
    const animate = () => {
      const currentZoom = this.state.zoomLevel;
      const targetZoom = this.smoothZoomTarget;
      
      if (Math.abs(targetZoom - currentZoom) < 0.001) {
        this.animationFrameId = null;
        return;
      }
      
      // 渐进式缩放
      const newZoom = currentZoom + (targetZoom - currentZoom) * SMOOTH_ZOOM_FACTOR;
      const zoomFactor = newZoom / currentZoom;
      
      if (this.zoomAt(mouseX, zoomFactor)) {
        this.state.zoomLevel = newZoom;
      }
      
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }

  // ==========================================================================
  // 平移（Pan）- TradingView标准
  // ==========================================================================

  private dragStartX = 0;
  private dragStartTimeRange: { startTime: number; endTime: number } = { startTime: 0, endTime: 0 };

  /**
   * 开始拖动
   */
  startPan(mouseX: number): void {
    this.dragStartX = mouseX;
    this.dragStartTimeRange = { ...this.state.timeRange };
    this.momentum.active = false;
    this.lastPanTime = performance.now();
  }

  /**
   * 拖动中（基于时间）
   */
  updatePan(mouseX: number): boolean {
    const dxPx = mouseX - this.dragStartX;
    const timeSpan = this.dragStartTimeRange.endTime - this.dragStartTimeRange.startTime;
    
    // 屏幕位移 → 时间位移
    const ratio = dxPx / this.state.widthPx;
    const timeOffset = -ratio * timeSpan;  // 向右拖 = 时间往前
    
    const newStartTime = this.dragStartTimeRange.startTime + timeOffset;
    const newEndTime = this.dragStartTimeRange.endTime + timeOffset;
    
    // 更新动量
    const currentTime = performance.now();
    if (currentTime - this.lastPanTime > 0) {
      this.momentum.x = timeOffset / (currentTime - this.lastPanTime);
      this.momentum.active = Math.abs(this.momentum.x) > 0.1;
    }
    this.lastPanTime = currentTime;
    
    return this.applyTimeRange(newStartTime, newEndTime);
  }

  /**
   * 结束拖动（添加惯性滚动）
   */
  endPan(): void {
    if (this.momentum.active && Math.abs(this.momentum.x) > 0.5) {
      this.startMomentumPan();
    }
  }
  
  /**
   * 惯性平移动画
   */
  private startMomentumPan(): void {
    const animate = () => {
      if (!this.momentum.active || Math.abs(this.momentum.x) < 0.1) {
        this.momentum.active = false;
        return;
      }
      
      const { startTime, endTime } = this.state.timeRange;
      const timeOffset = this.momentum.x * 16;  // 假设16ms每帧
      
      if (this.applyTimeRange(startTime + timeOffset, endTime + timeOffset)) {
        this.momentum.x *= PAN_MOMENTUM_DECAY;
        requestAnimationFrame(animate);
      } else {
        this.momentum.active = false;
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * 直接平移指定的时间量（用于键盘导航）
   * @param timeDelta 正数=向右（显示更新数据），负数=向左（显示更旧数据），单位毫秒
   */
  panByTime(timeDelta: number): boolean {
    const { startTime, endTime } = this.state.timeRange;
    return this.applyTimeRange(startTime + timeDelta, endTime + timeDelta);
  }

  // ==========================================================================
  // 内部辅助方法
  // ==========================================================================

  /**
   * 应用新的时间范围（核心方法）
   */
  private applyTimeRange(newStartTime: number, newEndTime: number): boolean {
    const newSpan = newEndTime - newStartTime;
    
    // 1. 限制时间跨度
    if (newSpan < MIN_TIME_SPAN || newSpan > MAX_TIME_SPAN) {
      return false;
    }
    
    // 2. 更新时间范围
    this.state.timeRange = {
      startTime: newStartTime,
      endTime: newEndTime,
    };
    
    // 3. 标记为Custom（手动操作）
    this.state.timeframe = 'Custom';
    
    // 4. 更新派生状态
    this.updateDerivedState();
    
    // 5. 检查是否需要补数据
    this.checkAndLoadData();
    
    // 6. 重算Y轴
    this.recomputeYAxis();
    
    // 7. 触发回调
    this.loader?.onRangeChange?.(
      this.findDataIndex(newStartTime),
      this.findDataIndex(newEndTime)
    );
    
    return true;
  }

  /**
   * 获取专业时间轴配置
   */
  getTimeAxisConfig(): TimeAxisResult {
    const visibleData = this.getVisibleData();
    if (visibleData.length === 0) {
      return {
        ticks: [],
        separators: [],
        interval: this.state.currentInterval,
        format: 'MM/DD',
      };
    }
    
    // 转换为CandleData格式
    const candleData: CandleData[] = visibleData.map(bar => ({
      timestamp: bar.timestamp,
      date: new Date(bar.timestamp).toISOString(),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));
    
    return calculateProfessionalTimeAxis(
      candleData,
      this.state.timeframe as TimePeriod,
      this.state.widthPx
    );
  }

  /**
   * 检查并触发数据加载（基于时间）
   */
  private async checkAndLoadData(): Promise<void> {
    if (this.isLoading || !this.loader) return;

    const { startTime, endTime } = this.state.timeRange;
    const loadedStartTime = this.data.length > 0 ? this.data[0].timestamp : Date.now();
    const loadedEndTime = this.data.length > 0 ? this.data[this.data.length - 1].timestamp : Date.now();

    // 往左补数据（历史数据）
    if (startTime < loadedStartTime + TIME_LOAD_MARGIN) {
      this.isLoading = true;
      try {
        const needTimeSpan = Math.max(TIME_LOAD_MARGIN, endTime - startTime);
        const newBars = await this.loader.loadMoreLeft(Math.ceil(needTimeSpan / (24 * 60 * 60 * 1000)));
        
        if (newBars && newBars.length > 0) {
          // 插入到前面并重新排序
          this.data = [...newBars, ...this.data].sort((a, b) => a.timestamp - b.timestamp);
          this.state.loadedStart = 0;
          this.state.loadedEnd = this.data.length - 1;
          
          console.log(`[Enhanced ChartViewState] Loaded ${newBars.length} bars to the left`);
        }
      } catch (error) {
        console.error('[Enhanced ChartViewState] Failed to load more data (left):', error);
      } finally {
        this.isLoading = false;
      }
    }

    // 往右补数据（实时更新场景）
    if (endTime > loadedEndTime - TIME_LOAD_MARGIN) {
      this.isLoading = true;
      try {
        const needTimeSpan = Math.max(TIME_LOAD_MARGIN, endTime - startTime);
        const newBars = await this.loader.loadMoreRight(Math.ceil(needTimeSpan / (24 * 60 * 60 * 1000)));
        
        if (newBars && newBars.length > 0) {
          // 追加到后面并重新排序
          this.data = [...this.data, ...newBars].sort((a, b) => a.timestamp - b.timestamp);
          this.state.loadedEnd = this.data.length - 1;
          
          console.log(`[Enhanced ChartViewState] Loaded ${newBars.length} bars to the right`);
        }
      } catch (error) {
        console.error('[Enhanced ChartViewState] Failed to load more data (right):', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  /**
   * 重新计算Y轴范围（只看当前可见区间）
   */
  private recomputeYAxis() {
    const visibleBars = this.getVisibleData();
    
    if (visibleBars.length === 0) {
      this.state.priceMin = 0;
      this.state.priceMax = 0;
      this.state.volumeMin = 0;
      this.state.volumeMax = 0;
      return;
    }

    // 计算价格范围（包含high和low）
    let priceMin = Infinity;
    let priceMax = -Infinity;
    let volumeMin = Infinity;
    let volumeMax = -Infinity;

    for (const bar of visibleBars) {
      priceMin = Math.min(priceMin, bar.low);
      priceMax = Math.max(priceMax, bar.high);
      volumeMin = Math.min(volumeMin, bar.volume);
      volumeMax = Math.max(volumeMax, bar.volume);
    }

    // Bloomberg标准：加5-10% padding
    const priceRange = priceMax - priceMin;
    const pricePadding = priceRange * 0.08;
    
    this.state.priceMin = priceMin - pricePadding;
    this.state.priceMax = priceMax + pricePadding;
    
    // 成交量：底部从0开始，顶部加10% padding
    this.state.volumeMin = 0;
    this.state.volumeMax = volumeMax * 1.1;

    console.log('[Enhanced ChartViewState] Y-axis recomputed:', {
      visibleBars: visibleBars.length,
      priceRange: [this.state.priceMin.toFixed(2), this.state.priceMax.toFixed(2)],
      volumeRange: [this.state.volumeMin, this.state.volumeMax],
      timeAxisLevel: this.state.timeAxisLevel,
      pixelsPerMs: this.state.pixelsPerMs.toFixed(6),
    });
  }

  /**
   * 销毁管理器（清理动画）
   */
  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.momentum.active = false;
  }

  /**
   * 根据X坐标获取数据索引
   */
  xToIndex(x: number): number {
    const timestamp = this.xToTime(x);
    return this.findDataIndex(timestamp);
  }
  
  /**
   * 获取当前时间轴状态总结
   */
  getTimeAxisSummary(): {
    timeframe: string;
    interval: TimeInterval;
    axisLevel: string;
    visibleSpan: string;
    zoomLevel: number;
  } {
    const { startTime, endTime } = this.state.timeRange;
    const spanMs = endTime - startTime;
    
    let visibleSpan: string;
    if (spanMs < 24 * 60 * 60 * 1000) {
      visibleSpan = `${Math.round(spanMs / (60 * 60 * 1000))}h`;
    } else if (spanMs < 30 * 24 * 60 * 60 * 1000) {
      visibleSpan = `${Math.round(spanMs / (24 * 60 * 60 * 1000))}d`;
    } else {
      visibleSpan = `${Math.round(spanMs / (30 * 24 * 60 * 60 * 1000))}m`;
    }
    
    return {
      timeframe: this.state.timeframe,
      interval: this.state.currentInterval,
      axisLevel: this.state.timeAxisLevel,
      visibleSpan,
      zoomLevel: this.state.zoomLevel,
    };
  }

  /**
   * 价格 → 屏幕Y坐标
   */
  priceToY(price: number): number {
    const ratio = (price - this.state.priceMin) / (this.state.priceMax - this.state.priceMin);
    return this.state.heightPx * (1 - ratio);  // Y轴翻转（屏幕坐标上小下大）
  }

  /**
   * 屏幕Y坐标 → 价格
   */
  yToPrice(y: number): number {
    const ratio = 1 - (y / this.state.heightPx);
    return this.state.priceMin + ratio * (this.state.priceMax - this.state.priceMin);
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建增强版ViewStateManager实例
 */
export function createEnhancedChartViewState(
  data: Bar[],
  canvasWidth: number,
  canvasHeight: number,
  loader?: DataLoader
): EnhancedChartViewStateManager {
  return new EnhancedChartViewStateManager(data, canvasWidth, canvasHeight, loader);
}

// 向后兼容
export function createChartViewState(
  data: Bar[],
  canvasWidth: number,
  canvasHeight: number,
  loader?: DataLoader
): EnhancedChartViewStateManager {
  return createEnhancedChartViewState(data, canvasWidth, canvasHeight, loader);
}

// 导出增强管理器类
export { EnhancedChartViewStateManager as ChartViewStateManager };
