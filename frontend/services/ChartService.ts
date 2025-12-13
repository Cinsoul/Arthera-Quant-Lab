/**
 * ChartService - 图表管理服务
 * 管理图表状态、绘图工具、指标等
 * 已集成DrawingEngine的专业画线工具
 */

export type ChartType = 'candlestick' | 'line' | 'area' | 'bar' | 'hollow-candlestick';
export type TimeInterval = '1' | '5' | '15' | '30' | '60' | '1D' | '1W' | '1M';

// 统一使用DrawingEngine的绘图工具类型
export type DrawingTool = 
  | 'select'      // 选择工具
  | 'trendline'   // 趋势线
  | 'horizontal'  // 水平线
  | 'ray'         // 射线
  | 'rectangle'   // 矩形
  | 'arrow'       // 箭头
  | 'fibonacci'   // 斐波那契回撤
  | 'text';       // 文本标注

export interface ChartSettings {
  symbol: string;
  interval: TimeInterval;
  chartType: ChartType;
  showVolume: boolean;
  showGrid: boolean;
  showCrosshair: boolean;
  showLegend: boolean;
  theme: 'dark' | 'light';
}

export interface TechnicalIndicator {
  id: string;
  name: string;
  type: 'overlay' | 'oscillator';
  visible: boolean;
  settings: Record<string, any>;
  color?: string;
}

// 简化的绘图对象（用于状态管理）
export interface DrawingObject {
  id: string;
  tool: DrawingTool;
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
  text?: string;
  timestamp?: number;
}

export interface ChartState {
  settings: ChartSettings;
  indicators: TechnicalIndicator[];
  drawings: DrawingObject[];
  isFullscreen: boolean;
  activeTool: DrawingTool;
  selectedDrawing: string | null;
}

class ChartServiceClass {
  private state: ChartState;
  private listeners: Set<(state: ChartState) => void> = new Set();

  constructor() {
    this.state = this.getDefaultState();
    this.loadFromLocalStorage();
  }

  private getDefaultState(): ChartState {
    return {
      settings: {
        symbol: '600519',
        interval: '1D',
        chartType: 'candlestick',
        showVolume: true,
        showGrid: true,
        showCrosshair: true,
        showLegend: true,
        theme: 'dark',
      },
      indicators: [
        {
          id: 'ma5',
          name: 'MA(5)',
          type: 'overlay',
          visible: true,
          settings: { period: 5 },
          color: '#f59e0b',
        },
        {
          id: 'ma10',
          name: 'MA(10)',
          type: 'overlay',
          visible: true,
          settings: { period: 10 },
          color: '#8b5cf6',
        },
        {
          id: 'ma20',
          name: 'MA(20)',
          type: 'overlay',
          visible: false,
          settings: { period: 20 },
          color: '#06b6d4',
        },
      ],
      drawings: [],
      isFullscreen: false,
      activeTool: 'select',  // 默认使用选择工具
      selectedDrawing: null,
    };
  }

  // 订阅状态变化
  subscribe(listener: (state: ChartState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 通知监听器
  private notify() {
    this.listeners.forEach(listener => listener(this.state));
    this.saveToLocalStorage();
  }

  // 获取当前状态
  getState(): ChartState {
    return { ...this.state };
  }

  // 更新设置
  updateSettings(partial: Partial<ChartSettings>) {
    this.state.settings = { ...this.state.settings, ...partial };
    this.notify();
  }

  // 设置股票代码
  setSymbol(symbol: string) {
    this.updateSettings({ symbol });
  }

  // 设置时间间隔
  setInterval(interval: TimeInterval) {
    this.updateSettings({ interval });
  }

  // 设置图表类型
  setChartType(chartType: ChartType) {
    this.updateSettings({ chartType });
  }

  // 切换全屏
  toggleFullscreen() {
    this.state.isFullscreen = !this.state.isFullscreen;
    this.notify();
  }

  // 设置全屏状态
  setFullscreen(isFullscreen: boolean) {
    this.state.isFullscreen = isFullscreen;
    this.notify();
  }

  // 激活绘图工具
  setActiveTool(tool: DrawingTool) {
    this.state.activeTool = tool;
    this.notify();
  }

  // 添加指标
  addIndicator(indicator: TechnicalIndicator) {
    this.state.indicators.push(indicator);
    this.notify();
  }

  // 移除指标
  removeIndicator(id: string) {
    this.state.indicators = this.state.indicators.filter(ind => ind.id !== id);
    this.notify();
  }

  // 切换指标可见性
  toggleIndicator(id: string) {
    const indicator = this.state.indicators.find(ind => ind.id === id);
    if (indicator) {
      indicator.visible = !indicator.visible;
      this.notify();
    }
  }

  // 更新指标设置
  updateIndicator(id: string, settings: Record<string, any>) {
    const indicator = this.state.indicators.find(ind => ind.id === id);
    if (indicator) {
      indicator.settings = { ...indicator.settings, ...settings };
      this.notify();
    }
  }

  // 添加绘图对象
  addDrawing(drawing: DrawingObject) {
    this.state.drawings.push(drawing);
    this.notify();
  }

  // 移除绘图对象
  removeDrawing(id: string) {
    this.state.drawings = this.state.drawings.filter(d => d.id !== id);
    this.notify();
  }

  // 清除所有绘图
  clearDrawings() {
    this.state.drawings = [];
    this.notify();
  }

  // 选择绘图对象
  selectDrawing(id: string | null) {
    this.state.selectedDrawing = id;
    this.notify();
  }

  // 更新绘图对象
  updateDrawing(id: string, updates: Partial<DrawingObject>) {
    const drawing = this.state.drawings.find(d => d.id === id);
    if (drawing) {
      Object.assign(drawing, updates);
      this.notify();
    }
  }

  // 保存到localStorage
  private saveToLocalStorage() {
    try {
      const data = {
        settings: this.state.settings,
        indicators: this.state.indicators,
        drawings: this.state.drawings,
      };
      localStorage.setItem('arthera-chart-state', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save chart state:', error);
    }
  }

  // 从localStorage加载
  private loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('arthera-chart-state');
      if (saved) {
        const data = JSON.parse(saved);
        this.state.settings = { ...this.state.settings, ...data.settings };
        this.state.indicators = data.indicators || this.state.indicators;
        this.state.drawings = data.drawings || [];
      }
    } catch (error) {
      console.error('Failed to load chart state:', error);
    }
  }

  // 重置为默认状态
  reset() {
    this.state = this.getDefaultState();
    this.notify();
  }

  // 导出配置
  exportConfig(): string {
    return JSON.stringify({
      settings: this.state.settings,
      indicators: this.state.indicators,
      drawings: this.state.drawings,
    }, null, 2);
  }

  // 导入配置
  importConfig(config: string) {
    try {
      const data = JSON.parse(config);
      this.state.settings = { ...this.state.settings, ...data.settings };
      this.state.indicators = data.indicators || this.state.indicators;
      this.state.drawings = data.drawings || [];
      this.notify();
    } catch (error) {
      console.error('Failed to import config:', error);
    }
  }
}

// 单例模式
export const ChartService = new ChartServiceClass();

// React Hook
import { useState, useEffect } from 'react';

export function useChartService() {
  const [state, setState] = useState<ChartState>(ChartService.getState());

  useEffect(() => {
    const unsubscribe = ChartService.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    state,
    setSymbol: ChartService.setSymbol.bind(ChartService),
    setInterval: ChartService.setInterval.bind(ChartService),
    setChartType: ChartService.setChartType.bind(ChartService),
    toggleFullscreen: ChartService.toggleFullscreen.bind(ChartService),
    setFullscreen: ChartService.setFullscreen.bind(ChartService),
    setActiveTool: ChartService.setActiveTool.bind(ChartService),
    addIndicator: ChartService.addIndicator.bind(ChartService),
    removeIndicator: ChartService.removeIndicator.bind(ChartService),
    toggleIndicator: ChartService.toggleIndicator.bind(ChartService),
    updateIndicator: ChartService.updateIndicator.bind(ChartService),
    addDrawing: ChartService.addDrawing.bind(ChartService),
    removeDrawing: ChartService.removeDrawing.bind(ChartService),
    clearDrawings: ChartService.clearDrawings.bind(ChartService),
    selectDrawing: ChartService.selectDrawing.bind(ChartService),
    updateDrawing: ChartService.updateDrawing.bind(ChartService),
    updateSettings: ChartService.updateSettings.bind(ChartService),
    reset: ChartService.reset.bind(ChartService),
    exportConfig: ChartService.exportConfig.bind(ChartService),
    importConfig: ChartService.importConfig.bind(ChartService),
  };
}