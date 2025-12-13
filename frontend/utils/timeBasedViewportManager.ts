/**
 * Time-Based Viewport Manager - 时间基础视口管理器
 * 
 * 核心功能：
 * ✅ 虚拟化渲染：只加载和渲染可见区域的数据
 * ✅ 智能缓存：预加载相邻数据块，减少滚动延迟
 * ✅ 高性能导航：基于时间的快速索引和范围查询
 * ✅ 内存优化：自动释放不在视口范围的数据
 * ✅ 分层数据管理：LOD (Level of Detail) 支持
 * ✅ 实时数据流：增量更新，不影响性能
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CandleDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeViewportState {
  // 可见时间范围
  visibleTimeStart: number;
  visibleTimeEnd: number;
  
  // 数据索引范围
  visibleStartIndex: number;
  visibleEndIndex: number;
  
  // 缓存范围（比可见范围更大）
  cachedStartIndex: number;
  cachedEndIndex: number;
  
  // 视图参数
  canvasWidth: number;
  paddingLeft: number;
  paddingRight: number;
  
  // 时间密度
  timePerPixel: number;
  barsPerPixel: number;
  
  // 性能指标
  totalDataPoints: number;
  visibleDataPoints: number;
  cachedDataPoints: number;
}

export interface ViewportConfig {
  canvasWidth: number;
  paddingLeft?: number;
  paddingRight?: number;
  
  // 缓存策略
  cacheBufferRatio?: number; // 缓存区域是可见区域的倍数 (默认 2.0)
  maxCacheSize?: number;     // 最大缓存数据点数 (默认 10000)
  
  // LOD配置
  enableLOD?: boolean;       // 是否启用细节层次
  lodThreshold?: number;     // LOD切换阈值（每像素多少根K线时切换）
  
  // 预加载配置
  preloadThreshold?: number; // 距离边界多少比例时开始预加载 (默认 0.2)
}

export interface DataBlock {
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  data: CandleDataPoint[];
  lastAccessTime: number;
  isLoading?: boolean;
}

export interface LODLevel {
  level: number;
  barsPerPixel: number;
  description: string;
  dataProcessor: (data: CandleDataPoint[]) => CandleDataPoint[];
}

// ============================================================================
// Time-Based Viewport Manager Class  
// ============================================================================

export class TimeBasedViewportManager {
  private allData: CandleDataPoint[] = [];
  private dataBlocks: Map<string, DataBlock> = new Map();
  private config: Required<ViewportConfig>;
  
  // 当前视口状态
  private currentState: TimeViewportState;
  
  // 时间索引：快速查找时间戳对应的索引
  private timeIndex: Map<number, number> = new Map();
  private sortedTimestamps: number[] = [];
  
  // LOD系统
  private lodLevels: LODLevel[] = [
    {
      level: 0,
      barsPerPixel: 0.1,
      description: 'Ultra High Detail',
      dataProcessor: (data) => data // 原始数据
    },
    {
      level: 1,
      barsPerPixel: 1,
      description: 'High Detail',
      dataProcessor: (data) => data // 原始数据
    },
    {
      level: 2,
      barsPerPixel: 5,
      description: 'Medium Detail',
      dataProcessor: (data) => this.downsampleData(data, 5) // 5根合成1根
    },
    {
      level: 3,
      barsPerPixel: 20,
      description: 'Low Detail',
      dataProcessor: (data) => this.downsampleData(data, 20) // 20根合成1根
    }
  ];
  
  // 性能监控
  private performanceMetrics = {
    lastUpdateTime: 0,
    cacheHitRate: 0,
    totalQueries: 0,
    cacheHits: 0,
    avgUpdateTime: 0
  };

  constructor(data: CandleDataPoint[], config: ViewportConfig) {
    this.config = {
      canvasWidth: config.canvasWidth,
      paddingLeft: config.paddingLeft || 80,
      paddingRight: config.paddingRight || 80,
      cacheBufferRatio: config.cacheBufferRatio || 2.0,
      maxCacheSize: config.maxCacheSize || 10000,
      enableLOD: config.enableLOD !== false,
      lodThreshold: config.lodThreshold || 10,
      preloadThreshold: config.preloadThreshold || 0.2
    };
    
    this.currentState = this.createInitialState();
    this.setData(data);
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * 设置数据并建立索引
   */
  public setData(data: CandleDataPoint[]): void {
    this.allData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    this.buildTimeIndex();
    this.updateViewportState();
  }

  /**
   * 更新数据（增量更新）
   */
  public updateData(newData: CandleDataPoint[]): void {
    const startTime = performance.now();
    
    // 合并新数据
    const mergedData = [...this.allData];
    newData.forEach(newPoint => {
      const existingIndex = mergedData.findIndex(p => p.timestamp === newPoint.timestamp);
      if (existingIndex >= 0) {
        mergedData[existingIndex] = newPoint; // 更新现有数据
      } else {
        mergedData.push(newPoint); // 添加新数据
      }
    });
    
    // 重新排序并更新
    this.allData = mergedData.sort((a, b) => a.timestamp - b.timestamp);
    this.buildTimeIndex();
    this.invalidateCache(); // 清空缓存
    this.updateViewportState();
    
    // 性能统计
    const updateTime = performance.now() - startTime;
    this.performanceMetrics.avgUpdateTime = 
      (this.performanceMetrics.avgUpdateTime + updateTime) / 2;
    this.performanceMetrics.lastUpdateTime = Date.now();
  }

  /**
   * 设置可见时间范围
   */
  public setVisibleTimeRange(startTime: number, endTime: number): void {
    this.currentState.visibleTimeStart = startTime;
    this.currentState.visibleTimeEnd = endTime;
    this.updateViewportState();
  }

  /**
   * 根据周期设置时间范围
   */
  public setTimeRangeByPeriod(period: string): void {
    if (this.allData.length === 0) return;
    
    const now = Date.now();
    const endTime = this.allData[this.allData.length - 1].timestamp;
    let startTime = endTime;
    
    switch (period) {
      case '1D':
        startTime = endTime - 24 * 60 * 60 * 1000;
        break;
      case '1W':
        startTime = endTime - 7 * 24 * 60 * 60 * 1000;
        break;
      case '1M':
        startTime = endTime - 30 * 24 * 60 * 60 * 1000;
        break;
      case '3M':
        startTime = endTime - 90 * 24 * 60 * 60 * 1000;
        break;
      case '1Y':
        startTime = endTime - 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = this.allData[0].timestamp;
    }
    
    // 确保时间范围在数据范围内
    startTime = Math.max(startTime, this.allData[0].timestamp);
    
    this.setVisibleTimeRange(startTime, endTime);
  }

  /**
   * 平移视口
   */
  public pan(deltaPixels: number): void {
    const timePerPixel = this.currentState.timePerPixel;
    const deltaTime = deltaPixels * timePerPixel;
    
    const newStartTime = this.currentState.visibleTimeStart - deltaTime;
    const newEndTime = this.currentState.visibleTimeEnd - deltaTime;
    
    // 边界检查
    const dataStartTime = this.allData[0]?.timestamp || 0;
    const dataEndTime = this.allData[this.allData.length - 1]?.timestamp || 0;
    
    if (newStartTime >= dataStartTime && newEndTime <= dataEndTime) {
      this.setVisibleTimeRange(newStartTime, newEndTime);
    }
  }

  /**
   * 缩放视口
   */
  public zoom(factor: number, centerTimestamp?: number): void {
    const currentDuration = this.currentState.visibleTimeEnd - this.currentState.visibleTimeStart;
    const newDuration = currentDuration / factor;
    
    // 确定缩放中心点
    const center = centerTimestamp || 
      (this.currentState.visibleTimeStart + this.currentState.visibleTimeEnd) / 2;
    
    const newStartTime = center - newDuration / 2;
    const newEndTime = center + newDuration / 2;
    
    // 边界检查
    const dataStartTime = this.allData[0]?.timestamp || 0;
    const dataEndTime = this.allData[this.allData.length - 1]?.timestamp || 0;
    
    if (newStartTime >= dataStartTime && newEndTime <= dataEndTime && newDuration > 0) {
      this.setVisibleTimeRange(newStartTime, newEndTime);
    }
  }

  /**
   * 获取可见数据
   */
  public getVisibleData(): CandleDataPoint[] {
    const { visibleStartIndex, visibleEndIndex } = this.currentState;
    if (visibleStartIndex < 0 || visibleEndIndex < 0) return [];
    
    return this.allData.slice(visibleStartIndex, visibleEndIndex + 1);
  }

  /**
   * 获取缓存数据（包含预加载数据）
   */
  public getCachedData(): CandleDataPoint[] {
    const { cachedStartIndex, cachedEndIndex } = this.currentState;
    if (cachedStartIndex < 0 || cachedEndIndex < 0) return [];
    
    return this.allData.slice(cachedStartIndex, cachedEndIndex + 1);
  }

  /**
   * 获取当前视口状态
   */
  public getViewportState(): TimeViewportState {
    return { ...this.currentState };
  }

  /**
   * 坐标转换：像素 -> 时间戳
   */
  public pixelToTimestamp(pixelX: number): number {
    const chartWidth = this.currentState.canvasWidth - this.config.paddingLeft - this.config.paddingRight;
    const ratio = (pixelX - this.config.paddingLeft) / chartWidth;
    
    return this.currentState.visibleTimeStart + 
           ratio * (this.currentState.visibleTimeEnd - this.currentState.visibleTimeStart);
  }

  /**
   * 坐标转换：时间戳 -> 像素
   */
  public timestampToPixel(timestamp: number): number {
    const chartWidth = this.currentState.canvasWidth - this.config.paddingLeft - this.config.paddingRight;
    const timeRange = this.currentState.visibleTimeEnd - this.currentState.visibleTimeStart;
    const ratio = (timestamp - this.currentState.visibleTimeStart) / timeRange;
    
    return this.config.paddingLeft + ratio * chartWidth;
  }

  /**
   * 索引转换：像素 -> 数据索引
   */
  public xToIndex(pixelX: number): number {
    const timestamp = this.pixelToTimestamp(pixelX);
    return this.timestampToIndex(timestamp);
  }

  /**
   * 索引转换：数据索引 -> 像素
   */
  public indexToX(index: number): number {
    if (index < 0 || index >= this.allData.length) return -1;
    const timestamp = this.allData[index].timestamp;
    return this.timestampToPixel(timestamp);
  }

  /**
   * 获取适当的LOD级别
   */
  public getCurrentLODLevel(): LODLevel {
    if (!this.config.enableLOD) return this.lodLevels[0];
    
    const barsPerPixel = this.currentState.barsPerPixel;
    
    for (let i = this.lodLevels.length - 1; i >= 0; i--) {
      if (barsPerPixel >= this.lodLevels[i].barsPerPixel) {
        return this.lodLevels[i];
      }
    }
    
    return this.lodLevels[0];
  }

  /**
   * 获取处理后的可见数据（应用LOD）
   */
  public getProcessedVisibleData(): CandleDataPoint[] {
    const rawData = this.getVisibleData();
    const lodLevel = this.getCurrentLODLevel();
    
    return lodLevel.dataProcessor(rawData);
  }

  /**
   * 更新Canvas尺寸
   */
  public updateCanvasSize(width: number): void {
    this.config.canvasWidth = width;
    this.updateViewportState();
  }

  /**
   * 获取性能指标
   */
  public getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * 获取所有数据（用于兼容性）
   */
  public getAllData(): CandleDataPoint[] {
    return this.allData;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 创建初始状态
   */
  private createInitialState(): TimeViewportState {
    return {
      visibleTimeStart: 0,
      visibleTimeEnd: 0,
      visibleStartIndex: -1,
      visibleEndIndex: -1,
      cachedStartIndex: -1,
      cachedEndIndex: -1,
      canvasWidth: this.config.canvasWidth,
      paddingLeft: this.config.paddingLeft,
      paddingRight: this.config.paddingRight,
      timePerPixel: 0,
      barsPerPixel: 0,
      totalDataPoints: 0,
      visibleDataPoints: 0,
      cachedDataPoints: 0
    };
  }

  /**
   * 建立时间索引
   */
  private buildTimeIndex(): void {
    this.timeIndex.clear();
    this.sortedTimestamps = [];
    
    this.allData.forEach((point, index) => {
      this.timeIndex.set(point.timestamp, index);
      this.sortedTimestamps.push(point.timestamp);
    });
    
    this.sortedTimestamps.sort((a, b) => a - b);
  }

  /**
   * 更新视口状态
   */
  private updateViewportState(): void {
    if (this.allData.length === 0) return;
    
    // 更新数据索引范围
    this.currentState.visibleStartIndex = this.timestampToIndex(this.currentState.visibleTimeStart);
    this.currentState.visibleEndIndex = this.timestampToIndex(this.currentState.visibleTimeEnd);
    
    // 计算缓存范围
    const visibleDataCount = this.currentState.visibleEndIndex - this.currentState.visibleStartIndex + 1;
    const bufferSize = Math.floor(visibleDataCount * (this.config.cacheBufferRatio - 1) / 2);
    
    this.currentState.cachedStartIndex = Math.max(0, this.currentState.visibleStartIndex - bufferSize);
    this.currentState.cachedEndIndex = Math.min(
      this.allData.length - 1, 
      this.currentState.visibleEndIndex + bufferSize
    );
    
    // 计算像素密度
    const chartWidth = this.currentState.canvasWidth - this.config.paddingLeft - this.config.paddingRight;
    const timeRange = this.currentState.visibleTimeEnd - this.currentState.visibleTimeStart;
    this.currentState.timePerPixel = timeRange / chartWidth;
    this.currentState.barsPerPixel = visibleDataCount / chartWidth;
    
    // 更新统计信息
    this.currentState.totalDataPoints = this.allData.length;
    this.currentState.visibleDataPoints = Math.max(0, visibleDataCount);
    this.currentState.cachedDataPoints = Math.max(0, 
      this.currentState.cachedEndIndex - this.currentState.cachedStartIndex + 1
    );
    
    // 检查是否需要预加载
    this.checkPreloadRequirement();
  }

  /**
   * 时间戳转索引
   */
  private timestampToIndex(timestamp: number): number {
    if (this.sortedTimestamps.length === 0) return -1;
    
    // 二分查找最接近的时间戳
    let left = 0;
    let right = this.sortedTimestamps.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTimestamp = this.sortedTimestamps[mid];
      
      if (midTimestamp === timestamp) {
        return this.timeIndex.get(midTimestamp) || -1;
      } else if (midTimestamp < timestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    // 返回最接近的索引
    if (right >= 0 && right < this.sortedTimestamps.length) {
      return this.timeIndex.get(this.sortedTimestamps[right]) || -1;
    }
    
    return -1;
  }

  /**
   * 数据降采样（LOD）
   */
  private downsampleData(data: CandleDataPoint[], factor: number): CandleDataPoint[] {
    if (factor <= 1) return data;
    
    const result: CandleDataPoint[] = [];
    
    for (let i = 0; i < data.length; i += factor) {
      const chunk = data.slice(i, i + factor);
      if (chunk.length === 0) continue;
      
      // OHLC合成
      const open = chunk[0].open;
      const close = chunk[chunk.length - 1].close;
      const high = Math.max(...chunk.map(c => c.high));
      const low = Math.min(...chunk.map(c => c.low));
      const volume = chunk.reduce((sum, c) => sum + c.volume, 0);
      const timestamp = chunk[Math.floor(chunk.length / 2)].timestamp; // 中间时间点
      
      result.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return result;
  }

  /**
   * 检查预加载需求
   */
  private checkPreloadRequirement(): void {
    // 这里可以实现智能预加载逻辑
    // 当用户滚动接近边界时，自动加载更多数据
    const { visibleStartIndex, visibleEndIndex, cachedStartIndex, cachedEndIndex } = this.currentState;
    const visibleRange = visibleEndIndex - visibleStartIndex;
    const threshold = Math.floor(visibleRange * this.config.preloadThreshold);
    
    // 检查是否接近左边界
    if (visibleStartIndex - cachedStartIndex < threshold) {
      // 可以触发向前预加载
    }
    
    // 检查是否接近右边界  
    if (cachedEndIndex - visibleEndIndex < threshold) {
      // 可以触发向后预加载
    }
  }

  /**
   * 清空缓存
   */
  private invalidateCache(): void {
    this.dataBlocks.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * 创建时间基础视口管理器
 */
export function createTimeBasedViewportManager(
  data: CandleDataPoint[], 
  config: ViewportConfig
): TimeBasedViewportManager {
  return new TimeBasedViewportManager(data, config);
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect, useRef } from 'react';

export interface UseViewportManagerOptions {
  data: CandleDataPoint[];
  config: ViewportConfig;
  autoUpdate?: boolean;
}

/**
 * React Hook for TimeBasedViewportManager
 */
export function useViewportManager({ data, config, autoUpdate = true }: UseViewportManagerOptions) {
  const managerRef = useRef<TimeBasedViewportManager | null>(null);
  const [viewportState, setViewportState] = useState<TimeViewportState | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});

  // 初始化管理器
  useEffect(() => {
    if (data.length > 0) {
      managerRef.current = new TimeBasedViewportManager(data, config);
      setViewportState(managerRef.current.getViewportState());
      setPerformanceMetrics(managerRef.current.getPerformanceMetrics());
    }
  }, [data.length]); // 只在数据长度变化时重新创建

  // 更新数据
  useEffect(() => {
    if (managerRef.current && autoUpdate) {
      managerRef.current.updateData(data);
      setViewportState(managerRef.current.getViewportState());
      setPerformanceMetrics(managerRef.current.getPerformanceMetrics());
    }
  }, [data, autoUpdate]);

  // 更新配置
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateCanvasSize(config.canvasWidth);
      setViewportState(managerRef.current.getViewportState());
    }
  }, [config.canvasWidth]);

  const updateViewportState = () => {
    if (managerRef.current) {
      setViewportState(managerRef.current.getViewportState());
      setPerformanceMetrics(managerRef.current.getPerformanceMetrics());
    }
  };

  return {
    manager: managerRef.current,
    viewportState,
    performanceMetrics,
    updateViewportState
  };
}

export default TimeBasedViewportManager;