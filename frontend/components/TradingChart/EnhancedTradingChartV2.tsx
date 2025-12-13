/**
 * EnhancedTradingChartV2 - Bloomberg/TradingView级专业图表系统
 * 
 * 最新升级 (Phase 3+ Interactive):
 * ✅ 专业级轴计算 (Nice Numbers + 智能间隔)
 * ✅ 实时价格线 (当前价水平线 + 闪烁动画)
 * ✅ X轴标签智能避让 (自动隐藏重叠)
 * ✅ 关键价位自动识别 (前高前低 + 支撑阻力 + VWAP)
 * ✅ Bloomberg级分隔线系统 (月/季/年)
 * ✅ 市场时间标记 (开盘/收盘)
 * ✅ 平移和缩放 (TradingView级交互)
 * ✅ DrawingEngine画线工具
 * ✅ 高性能渲染优化
 * ✅ 可配置调试模式
 */

// ============================================================================
// 开发模式配置 - Bloomberg Terminal专业级调试系统
// ============================================================================

const DEV_MODE = {
  // 调试日志开关（生产环境应设置为 false）
  enableDebugLogs: false,
  // 性能监控
  showPerformanceMetrics: false,
  // 渲染统计
  showRenderStats: false,
  // 可视化调试面板
  showDebugPanel: false,
};

// 专业级调试工具
const debug = {
  group: (label: string) => DEV_MODE.enableDebugLogs && console.group(label),
  groupEnd: () => DEV_MODE.enableDebugLogs && console.groupEnd(),
  log: (...args: any[]) => DEV_MODE.enableDebugLogs && console.log(...args),
  warn: (...args: any[]) => DEV_MODE.enableDebugLogs && console.warn(...args),
  error: (...args: any[]) => console.error(...args), // 错误总是显示
  time: (label: string) => DEV_MODE.showPerformanceMetrics && console.time(label),
  timeEnd: (label: string) => DEV_MODE.showPerformanceMetrics && console.timeEnd(label),
};

// Bloomberg Terminal风格：全局快捷键切换调试模式
// Ctrl+Shift+D: 切换调试日志
// Ctrl+Shift+P: 切换性能监控  
// Ctrl+Shift+V: 切换可视化调试面板
if (typeof window !== 'undefined') {
  // 注册全局快捷键监听器
  const handleDebugShortcuts = (e: KeyboardEvent) => {
    // Ctrl+Shift+D - 切换调试日志
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      DEV_MODE.enableDebugLogs = !DEV_MODE.enableDebugLogs;
      console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'color: #0EA5E9;');
      console.log(`%c📊 [Chart Debug] ${DEV_MODE.enableDebugLogs ? '✅ ENABLED' : '❌ DISABLED'}`, 
        `color: ${DEV_MODE.enableDebugLogs ? '#10B981' : '#EF4444'}; font-weight: bold; font-size: 14px;`);
      console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'color: #0EA5E9;');
      window.dispatchEvent(new CustomEvent('chart-debug-toggle'));
    }
    
    // Ctrl+Shift+P - 切换性能监控
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      DEV_MODE.showPerformanceMetrics = !DEV_MODE.showPerformanceMetrics;
      console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'color: #0EA5E9;');
      console.log(`%c⚡ [Chart Performance] ${DEV_MODE.showPerformanceMetrics ? '✅ ENABLED' : '❌ DISABLED'}`, 
        `color: ${DEV_MODE.showPerformanceMetrics ? '#10B981' : '#EF4444'}; font-weight: bold; font-size: 14px;`);
      console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'color: #0EA5E9;');
      window.dispatchEvent(new CustomEvent('chart-perf-toggle'));
    }
    
    // Ctrl+Shift+V - 切换可视化调试面板
    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
      e.preventDefault();
      DEV_MODE.showDebugPanel = !DEV_MODE.showDebugPanel;
      console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'color: #0EA5E9;');
      console.log(`%c👁️ [Debug Panel] ${DEV_MODE.showDebugPanel ? '✅ VISIBLE' : '❌ HIDDEN'}`, 
        `color: ${DEV_MODE.showDebugPanel ? '#10B981' : '#EF4444'}; font-weight: bold; font-size: 14px;`);
      console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'color: #0EA5E9;');
      window.dispatchEvent(new CustomEvent('chart-panel-toggle'));
    }
  };
  
  window.addEventListener('keydown', handleDebugShortcuts);
  
  // 控制台命令（向后兼容）
  (window as any).toggleChartDebug = () => {
    DEV_MODE.enableDebugLogs = !DEV_MODE.enableDebugLogs;
    console.log(`%c[Chart Debug] ${DEV_MODE.enableDebugLogs ? '✅ ENABLED' : '❌ DISABLED'}`, 
      `color: ${DEV_MODE.enableDebugLogs ? '#10B981' : '#EF4444'}; font-weight: bold; font-size: 14px;`);
    window.dispatchEvent(new CustomEvent('chart-debug-toggle'));
  };
  
  (window as any).toggleChartPerf = () => {
    DEV_MODE.showPerformanceMetrics = !DEV_MODE.showPerformanceMetrics;
    console.log(`%c[Chart Performance] ${DEV_MODE.showPerformanceMetrics ? '✅ ENABLED' : '❌ DISABLED'}`, 
      `color: ${DEV_MODE.showPerformanceMetrics ? '#10B981' : '#EF4444'}; font-weight: bold; font-size: 14px;`);
    window.dispatchEvent(new CustomEvent('chart-perf-toggle'));
  };
  
  (window as any).toggleDebugPanel = () => {
    DEV_MODE.showDebugPanel = !DEV_MODE.showDebugPanel;
    console.log(`%c[Debug Panel] ${DEV_MODE.showDebugPanel ? '✅ VISIBLE' : '❌ HIDDEN'}`, 
      `color: ${DEV_MODE.showDebugPanel ? '#10B981' : '#EF4444'}; font-weight: bold; font-size: 14px;`);
    window.dispatchEvent(new CustomEvent('chart-panel-toggle'));
  };
  
  // 显示可用命令
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #0EA5E9;');
  console.log('%c📊 Bloomberg Terminal - Chart Debug System', 'color: #0EA5E9; font-weight: bold; font-size: 14px;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #0EA5E9;');
  console.log('%c⌨️  Keyboard Shortcuts:', 'color: #94A3B8; font-weight: bold;');
  console.log('%c   Ctrl+Shift+D', 'color: #10B981; font-weight: bold;', '- Toggle debug logs');
  console.log('%c   Ctrl+Shift+P', 'color: #F59E0B; font-weight: bold;', '- Toggle performance metrics');
  console.log('%c   Ctrl+Shift+V', 'color: #8B5CF6; font-weight: bold;', '- Toggle debug panel');
  console.log('%c💻 Console Commands:', 'color: #94A3B8; font-weight: bold;');
  console.log('%c   window.toggleChartDebug()', 'color: #10B981; font-weight: bold;', '- Toggle debug logs');
  console.log('%c   window.toggleChartPerf()', 'color: #F59E0B; font-weight: bold;', '- Toggle performance metrics');
  console.log('%c   window.toggleDebugPanel()', 'color: #8B5CF6; font-weight: bold;', '- Toggle debug panel');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #0EA5E9;');
}

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  calculateProfessionalTimeAxis,
  calculateProfessionalPriceAxis,
  calculateProfessionalGrid,
  formatFullTime,
  formatPrice,
  formatVolume,
  type CandleData,
} from '../../utils/chartHelpers';
import { 
  detectKeyLevels, 
  filterKeyLevels,
  type KeyLevel,
  type KeyLevelDetectorConfig,
} from '../../utils/keyLevelDetector';
import {
  resolveCollisions,
  measureTextWidth,
  type LabelBox,
} from '../../utils/labelCollisionDetector';
import { 
  createChartViewState,
  type ChartViewStateManager,
  type Bar,
} from '../../utils/chartViewState';
import { DrawingEngineV2 } from './DrawingEngineV2';
import { DrawingToolId } from './DrawingTypes';
// 引入数据服务
import { 
  useSmartHistoricalData,
  getIndicatorCalculationService,
  type OHLCV,
} from '../../services';
// 引入图表类型图标
import {
  BarsIcon,
  CandlestickIcon,
  HollowCandlesIcon,
  LineIcon,
  LineMarkersIcon,
  StepLineIcon,
  AreaIcon,
  BaselineIcon,
} from './ChartTypeIcons';
// 引入绘图工具图标
import {
  SelectIcon,
  TrendLineIcon,
  RayIcon,
  InfoLineIcon,
  ExtendedLineIcon,
  TrendAngleIcon,
  HorizontalLineIcon,
  HorizontalRayIcon,
  VerticalLineIcon,
  CrossLineIcon,
  ParallelChannelIcon,
  RegressionTrendIcon,
  FlatTopBottomIcon,
  DisjointChannelIcon,
  PitchforkIcon,
  SchiffPitchforkIcon,
  ModifiedSchiffPitchforkIcon,
  InsidePitchforkIcon,
  DotIcon,
  ArrowIcon,
  TextIcon,
  RectangleIcon,
  FibonacciIcon,
  MagicIcon,
  EraserIcon,
} from './DrawingToolIcons';

// 中国市场标准配色 - Bloomberg/TradingView优化版
const CHINA_COLORS = {
  up: '#EF4444',    // 红涨
  down: '#10B981',  // 绿跌
  neutral: '#64748B', // 中性（涨跌幅<0.1%）
  gridMajor: '#1E3A5F40',  // ✅ 淡化主网格线（原#1E3A5F → 40% alpha）
  gridMinor: '#1E3A5F1A',  // ✅ 淡化次网格线（原33% → 10% alpha）
  separator: '#0EA5E980',  // ✅ 分隔线半透明
  text: '#94A3B8',
  textDim: '#64748B',
  currentPriceUp: '#EF4444',
  currentPriceDown: '#10B981',
  crosshair: '#94A3B8',    // 十字光标颜色
  maLine: 0.7,             // MA线透明度
};

export type TimePeriod = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'YTD';
export type ChartType = 'candlestick' | 'hollow-candles' | 'bars' | 'line' | 'line-markers' | 'step-line' | 'area' | 'baseline';
export type CoordinateMode = 'linear' | 'log' | 'percentage';
export type ChartMode = 'compact' | 'full';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface EnhancedTradingChartProps {
  symbol?: string;
  data?: OHLCV[];
  period?: TimePeriod;
  chartType?: ChartType;
  coordinateMode?: CoordinateMode;
  mode?: ChartMode; // 新增：图表模式
  showVolume?: boolean;
  showGrid?: boolean;
  showKeyLevels?: boolean;
  showCurrentPrice?: boolean;
  showSeparators?: boolean;
  showMarketTimes?: boolean;
  showMA?: boolean;
  enableDrawing?: boolean;
  showControls?: boolean; // 新增：是否显示控制栏
  showTooltip?: boolean; // 新增：是否显示悬停提示
  showIndicators?: boolean; // 新增：是否显示功能指示器
  height?: number;
  onPeriodChange?: (period: TimePeriod) => void;
  onChartTypeChange?: (type: ChartType) => void;
  onClose?: () => void; // 新增：关闭回调
  className?: string;
}

export function EnhancedTradingChart({
  symbol = '600519',
  data,
  period = '1M',
  chartType = 'candlestick',
  coordinateMode = 'linear',
  mode = 'full', // 默认为完整模式
  showVolume = true,
  showGrid = true,
  showKeyLevels = true,
  showCurrentPrice = true,
  showSeparators = true,
  showMarketTimes = false,
  showMA = false,
  enableDrawing = false,
  showControls = true, // 默认显示控制栏
  showTooltip = true, // 默认显示提示
  showIndicators = true, // 默认显示指示器
  height,
  onPeriodChange,
  onChartTypeChange,
  onClose,
  className = '',
}: EnhancedTradingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingEngineRef = useRef<DrawingEngineV2 | null>(null);
  const viewportManagerRef = useRef<ChartViewStateManager | null>(null);
  const renderChartRef = useRef<(() => void) | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false); // Canvas准备状态
  
  const [hoveredIndex, setHoveredIndex] = useState<number>(-1);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(period);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(chartType);
  const [selectedDrawingTool, setSelectedDrawingTool] = useState<DrawingToolId>('select');
  const [isAnimating, setIsAnimating] = useState(true);
  const [viewportState, setViewportState] = useState<ReturnType<ChartViewStateManager['getState']> | null>(null);
  const [maData, setMaData] = useState<{ ma5: number[]; ma10: number[]; ma20: number[] } | null>(null);
  const [isDragging, setIsDragging] = useState(false); // ✅ 添加拖动状态
  const [dragStartX, setDragStartX] = useState(0); // 拖动起始X坐标
  const [dragStartY, setDragStartY] = useState(0); // 拖动起始Y坐标
  const [isPanning, setIsPanning] = useState(false); // 是否正在平移
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null); // ✅ 十字光标位置
  const [showIndicatorSelector, setShowIndicatorSelector] = useState(false); // 指标选择器弹窗
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set(['MA'])); // 已激活的指标
  const [showChartTypeSelector, setShowChartTypeSelector] = useState(false); // 图表类型选择器弹窗
  const [expandedToolCategory, setExpandedToolCategory] = useState<string | null>(null); // 绘图工具类别面板
  
  // ========== 调试模式状态 ==========
  const [debugMode, setDebugMode] = useState(DEV_MODE.showDebugPanel);
  const [perfMetrics, setPerfMetrics] = useState({
    renderTime: 0,
    fps: 0,
    frameCount: 0,
    lastFrameTime: 0,
    drawCalls: 0,
  });
  const lastRenderTime = useRef<number>(0);
  const frameCounter = useRef<number>(0);
  
  // ========== 技术指标数据状态 ==========
  const [indicatorData, setIndicatorData] = useState<{
    ma5?: number[];
    ma10?: number[];
    ma20?: number[];
    ema5?: number[];
    ema10?: number[];
    ema20?: number[];
    macd?: { dif: number[]; dea: number[]; histogram: number[] };
    boll?: { upper: number[]; middle: number[]; lower: number[] };
    rsi?: number[];
    kdj?: { k: number[]; d: number[]; j: number[] };
    atr?: number[];
    vol?: number[];
    obv?: number[];
    vrsi?: number[];
  }>({});

  // ✅ 适配层：将新的ViewState转换为组件期望的格式
  const adaptedViewportState = useMemo(() => {
    if (!viewportState) return null;
    
    return {
      ...viewportState,
      startIndex: Math.floor(viewportState.visibleStart),
      endIndex: Math.ceil(viewportState.visibleEnd),
      visibleBars: Math.ceil(viewportState.visibleEnd - viewportState.visibleStart),
      barWidth: viewportState.widthPx / Math.ceil(viewportState.visibleEnd - viewportState.visibleStart),
    };
  }, [viewportState]);

  // 使用智能历史数据Hook - 根据图表周期自动选择正确的数据粒度
  const { data: serviceData, loading, error, dataGranularity } = useSmartHistoricalData(
    symbol,
    selectedPeriod
  );

  // 生成或使用传入的数据 - 使用useMemo缓存避免无限循环
  const chartData: CandleData[] = useMemo(() => {
    if (data) {
      return data.map(d => ({
        timestamp: d.timestamp,
        date: new Date(d.timestamp).toLocaleDateString(),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));
    }
    
    if (serviceData && serviceData.length > 0) {
      return serviceData.map(d => ({
        timestamp: d.timestamp,
        date: new Date(d.timestamp).toLocaleDateString(),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));
    }
    
    return [];
  }, [data, serviceData]);

  // ========== 监听调试模式切换事件 ==========
  useEffect(() => {
    const handleDebugToggle = () => {
      setDebugMode(DEV_MODE.showDebugPanel);
    };
    
    window.addEventListener('chart-panel-toggle', handleDebugToggle);
    
    return () => {
      window.removeEventListener('chart-panel-toggle', handleDebugToggle);
    };
  }, []);

  // Debug logging
  useEffect(() => {
    debug.log('[EnhancedTradingChart] Data status:', {
      symbol,
      selectedPeriod,
      dataGranularity,
      loading,
      error,
      hasExternalData: !!data,
      externalDataLength: data?.length || 0,
      serviceDataLength: serviceData?.length || 0,
      chartDataLength: chartData.length,
    });
  }, [symbol, selectedPeriod, dataGranularity, loading, error, data?.length, serviceData?.length, chartData.length]);

  // ========== 优化的技术指标计算系统 ==========
  const calculateIndicatorsAsync = useCallback(async (data: CandleData[], indicators: Set<string>) => {
    if (data.length === 0) return {};

    const indicatorService = getIndicatorCalculationService();
    const startTime = performance.now();
    
    debug.time('[Indicators] Calculation');
    
    // 预处理数据
    const closePrices = data.map(d => d.close);
    const ohlcvData = data.map(d => ({
      timestamp: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));

    const newData: typeof indicatorData = {};

    try {
      // 批量计算指标 - 优化性能
      const indicatorPromises: Promise<void>[] = [];

      // MA - 移动平均线
      if (indicators.has('MA')) {
        indicatorPromises.push(
          Promise.resolve().then(() => {
            newData.ma5 = indicatorService.calculateMA(closePrices, 5);
            newData.ma10 = indicatorService.calculateMA(closePrices, 10);
            newData.ma20 = indicatorService.calculateMA(closePrices, 20);
          })
        );
      }

      // EMA - 指数移动平均
      if (indicators.has('EMA')) {
        indicatorPromises.push(
          Promise.resolve().then(() => {
            newData.ema5 = indicatorService.calculateEMAArray(closePrices, 5);
            newData.ema10 = indicatorService.calculateEMAArray(closePrices, 10);
            newData.ema20 = indicatorService.calculateEMAArray(closePrices, 20);
          })
        );
      }

      // MACD - 并行计算
      if (indicators.has('MACD')) {
        indicatorPromises.push(
          Promise.resolve().then(() => {
            const macdResult = indicatorService.calculate('MACD', ohlcvData, {
              fastPeriod: 12,
              slowPeriod: 26,
              signalPeriod: 9
            });
            newData.macd = {
              dif: macdResult.map(r => r.macd ?? NaN),
              dea: macdResult.map(r => r.signal ?? NaN),
              histogram: macdResult.map(r => r.histogram ?? NaN),
            };
          })
        );
      }

      // BOLL - 布林带
      if (indicators.has('BOLL')) {
        indicatorPromises.push(
          Promise.resolve().then(() => {
            const bollResult = indicatorService.calculate('BBANDS', ohlcvData, {
              period: 20,
              multiplier: 2
            });
            newData.boll = {
              upper: bollResult.map(r => r.upper ?? NaN),
              middle: bollResult.map(r => r.middle ?? NaN),
              lower: bollResult.map(r => r.lower ?? NaN),
            };
          })
        );
      }

      // RSI
      if (indicators.has('RSI')) {
        indicatorPromises.push(
          Promise.resolve().then(() => {
            const rsiResult = indicatorService.calculate('RSI', ohlcvData, { period: 14 });
            newData.rsi = rsiResult.map(r => r.value ?? NaN);
          })
        );
      }

      // KDJ (使用Stochastic)
      if (indicators.has('KDJ')) {
        indicatorPromises.push(
          Promise.resolve().then(() => {
            const kdjResult = indicatorService.calculate('STOCH', ohlcvData, {
              period: 9,
              smoothK: 3,
              smoothD: 3
            });
            newData.kdj = {
              k: kdjResult.map(r => r.k ?? NaN),
              d: kdjResult.map(r => r.d ?? NaN),
              j: kdjResult.map(r => {
                const k = r.k ?? 0;
                const d = r.d ?? 0;
                return 3 * k - 2 * d;
              }),
            };
          })
        );
      }

      // ATR
      if (indicators.has('ATR')) {
        indicatorPromises.push(
          Promise.resolve().then(() => {
            const atrResult = indicatorService.calculate('ATR', ohlcvData, { period: 14 });
            newData.atr = atrResult.map(r => r.value ?? NaN);
          })
        );
      }

      // VOL - 成交量 (快速操作，无需异步)
      if (indicators.has('VOL')) {
        newData.vol = data.map(d => d.volume);
      }

      // OBV - 能量潮
      if (indicators.has('OBV')) {
        indicatorPromises.push(
          Promise.resolve().then(() => {
            const obvResult = indicatorService.calculate('OBV', ohlcvData);
            newData.obv = obvResult.map(r => r.value ?? NaN);
          })
        );
      }

      // VRSI - 量相对强弱
      if (indicators.has('VRSI')) {
        indicatorPromises.push(
          Promise.resolve().then(() => {
            const volumeData = ohlcvData.map(d => ({ ...d, close: d.volume }));
            const vrsiResult = indicatorService.calculate('RSI', volumeData, { period: 14 });
            newData.vrsi = vrsiResult.map(r => r.value ?? NaN);
          })
        );
      }

      // 等待所有指标计算完成
      await Promise.all(indicatorPromises);

      debug.timeEnd('[Indicators] Calculation');
      
      const calculationTime = performance.now() - startTime;
      debug.log(`[Indicators] Calculated ${indicators.size} indicators in ${calculationTime.toFixed(2)}ms`, {
        dataPoints: data.length,
        indicators: Array.from(indicators),
        performance: {
          calculationTime,
          indicatorsPerSecond: (indicators.size / calculationTime * 1000).toFixed(2)
        }
      });

      return newData;
    } catch (err) {
      console.error('Failed to calculate indicators:', err);
      return {};
    }
  }, []);

  // 使用useMemo缓存指标计算，避免重复计算
  const memoizedIndicatorData = useMemo(() => {
    return chartData;
  }, [chartData]);

  // 指标计算效果 - 使用防抖和缓存优化
  useEffect(() => {
    if (chartData.length === 0) {
      setIndicatorData({});
      setMaData(null);
      return;
    }

    let isCancelled = false;
    
    const calculateIndicators = async () => {
      try {
        const newData = await calculateIndicatorsAsync(chartData, activeIndicators);
        
        if (!isCancelled) {
          setIndicatorData(newData);
          
          // 保持向后兼容
          if (activeIndicators.has('MA') && newData.ma5 && newData.ma10 && newData.ma20) {
            setMaData({ 
              ma5: newData.ma5, 
              ma10: newData.ma10, 
              ma20: newData.ma20 
            });
          } else if (!activeIndicators.has('MA')) {
            setMaData(null);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Indicator calculation failed:', err);
          setIndicatorData({});
          setMaData(null);
        }
      }
    };

    calculateIndicators();

    return () => {
      isCancelled = true;
    };
  }, [memoizedIndicatorData, activeIndicators, calculateIndicatorsAsync]);

  // 初始化ViewportManager
  useEffect(() => {
    const canvas = canvasRef.current;
    
    // ✅ 数据为空时，清空ViewportManager
    if (chartData.length === 0) {
      if (viewportManagerRef.current) {
        console.log('[EnhancedTradingChart] Clearing viewport (no data)');
        viewportManagerRef.current = null;
        setViewportState(null);
      }
      return;
    }
    
    // ✅ 没有canvas时跳过
    if (!canvas) return;
    
    // ✅ 如果已存在ViewportManager，不重复创建
    if (viewportManagerRef.current) {
      console.log('[EnhancedTradingChart] ViewportManager already exists, skipping recreation');
      return;
    }

    // ✅ 创建新的ChartViewStateManager
    console.log('[EnhancedTradingChart] Creating new ChartViewStateManager:', {
      dataLength: chartData.length,
      selectedPeriod,
    });
    
    const rect = canvas.getBoundingClientRect();
    
    // 转换数据格式为Bar[]
    const bars: Bar[] = chartData.map(d => ({
      time: new Date(d.timestamp),
      timestamp: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));
    
    viewportManagerRef.current = createChartViewState(
      bars,
      rect.width,
      rect.height
    );
    
    // 初始化时应用period设置
    viewportManagerRef.current.applyTimeframe(selectedPeriod);
    const initialState = viewportManagerRef.current.getState();
    
    console.log('[EnhancedTradingChart] Initial viewport state:', {
      visibleStart: initialState.visibleStart,
      visibleEnd: initialState.visibleEnd,
      priceMin: initialState.priceMin,
      priceMax: initialState.priceMax,
      dataLength: chartData.length,
    });
    
    setViewportState(initialState);
  }, [chartData.length, selectedPeriod]);

  // 更新ViewportManager画布尺寸（数据变化时）
  useEffect(() => {
    if (!viewportManagerRef.current) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      viewportManagerRef.current.setCanvasSize(rect.width, rect.height);
    }
    
    // 数据变化时更新ViewState中的数据
    const bars: Bar[] = chartData.map(d => ({
      time: new Date(d.timestamp),
      timestamp: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));
    
    viewportManagerRef.current.setData(bars);
    setViewportState(viewportManagerRef.current.getState());
  }, [chartData]);

  // 当时间周期变化时，更新可见范围
  useEffect(() => {
    if (!viewportManagerRef.current || chartData.length === 0) return;

    console.log('[EnhancedTradingChart] Period changed, applying timeframe:', {
      selectedPeriod,
      chartDataLength: chartData.length,
    });

    // 应用时间周期
    viewportManagerRef.current.applyTimeframe(selectedPeriod);
    const newState = viewportManagerRef.current.getState();
    
    console.log('[EnhancedTradingChart] New viewport state after timeframe:', {
      visibleStart: newState.visibleStart,
      visibleEnd: newState.visibleEnd,
      timeframe: newState.timeframe,
    });
    
    setViewportState(newState);
  }, [selectedPeriod, chartData.length]);

  // 检测canvas是否准备就绪
  useEffect(() => {
    if (canvasRef.current && !isCanvasReady) {
      setIsCanvasReady(true);
      debug.log('✅ Canvas is ready');
    }
  }, [isCanvasReady]);

  // 初始化DrawingEngine V2（始终初始化，不依赖enableDrawing）
  useEffect(() => {
    if (isCanvasReady && canvasRef.current && !drawingEngineRef.current) {
      debug.log('🎨 Initializing DrawingEngine V2...');
      drawingEngineRef.current = new DrawingEngineV2();
      drawingEngineRef.current.setCanvas(canvasRef.current);
      debug.log('✅ DrawingEngine V2 initialized');
      
      // 监听绘图事件，触发重绘
      const handleDrawingChange = () => {
        if (renderChartRef.current) {
          renderChartRef.current();
        }
      };
      
      drawingEngineRef.current.on('needsRender', handleDrawingChange);
      
      // ✅ 初始化后立即触发一次渲染，确保坐标转换函数被正确设置
      if (renderChartRef.current) {
        debug.log('🎨 Triggering initial render for DrawingEngine...');
        renderChartRef.current();
      }
      
      return () => {
        if (drawingEngineRef.current) {
          debug.log('🧹 Cleaning up DrawingEngine V2');
          drawingEngineRef.current.off('needsRender', handleDrawingChange);
          drawingEngineRef.current.destroy();
          drawingEngineRef.current = null;
        }
      };
    }
  }, [isCanvasReady]); // 依赖于canvas准备状态

  // 切换画线工具
  useEffect(() => {
    debug.group('🎨 Drawing Tool Changed');
    debug.log('Tool Selected:', selectedDrawingTool);
    debug.log('Canvas Ready:', isCanvasReady);
    debug.log('DrawingEngine exists:', !!drawingEngineRef.current);
    
    if (drawingEngineRef.current) {
      drawingEngineRef.current.setTool(selectedDrawingTool);
      debug.log('✅ Tool set successfully');
    } else if (isCanvasReady) {
      // Canvas已准备但DrawingEngine未初始化，这是一个真正的错误
      debug.error('❌ DrawingEngine not initialized despite canvas being ready');
    } else {
      // Canvas还未准备好，这是正常情况，等待初始化
      debug.log('⏳ Waiting for canvas to be ready...');
    }
    debug.groupEnd();
  }, [selectedDrawingTool, isCanvasReady]);

  // 键盘事件处理（绘图工具）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (drawingEngineRef.current) {
        const handled = drawingEngineRef.current.handleKeyDown(e);
        if (handled) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 点击外部关闭工具面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // 检查是否点击了工具栏外部
      if (expandedToolCategory && !target.closest('[data-tool-panel]')) {
        setExpandedToolCategory(null);
      }
    };

    if (expandedToolCategory) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedToolCategory]);

  // 性能监控
  const performanceMetrics = useRef({
    renderCount: 0,
    lastRenderTime: 0,
    fps: 0,
    avgRenderTime: 0,
    renderTimes: [] as number[],
  });

  // 渲染图表
  const renderChart = useCallback(() => {
    const renderStartTime = performance.now();
    debug.time('Chart Render');
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 高分辨率支持
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const chartHeight = rect.height || height || 600; // 从容器获取高度，fallback到prop或默认值

    canvas.width = width * dpr;
    canvas.height = chartHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${chartHeight}px`;
    ctx.scale(dpr, dpr);

    // 清空画布
    ctx.fillStyle = '#0A1929';
    ctx.fillRect(0, 0, width, chartHeight);

    // ✅ TradingView标准布局 - 主图表+技术指标共用X轴
    const padding = { 
      top: 15,        // 顶部留白
      right: 70,      // 右侧价格轴
      bottom: 40,     // 底部X轴（统一）
      left: 10        // 左侧最小边距
    };
    const chartWidth = width - padding.left - padding.right;
    
    // ✅ 检查是否需要显示子图表（成交量指标区域）
    const hasVolumeIndicators = activeIndicators.has('VOL') || activeIndicators.has('OBV') || activeIndicators.has('VRSI');
    
    // ✅ 检查是否需要显示振荡器指标（RSI, MACD, KDJ等）
    const hasOscillatorIndicators = activeIndicators.has('RSI') || activeIndicators.has('MACD') || activeIndicators.has('KDJ') || activeIndicators.has('ATR');
    
    // ✅ 动态分配高度：主图表、成交量指标、振荡器指标
    const totalChartHeight = chartHeight - padding.top - padding.bottom;
    
    let mainChartRatio = 1.0;
    let volumeIndicatorRatio = 0.0;
    let oscillatorIndicatorRatio = 0.0;
    
    if (hasVolumeIndicators && hasOscillatorIndicators) {
      // 主图表50%，成交量指标25%，振荡器指标25%
      mainChartRatio = 0.50;
      volumeIndicatorRatio = 0.25;
      oscillatorIndicatorRatio = 0.25;
    } else if (hasVolumeIndicators) {
      // 主图表70%，成交量指标30%
      mainChartRatio = 0.70;
      volumeIndicatorRatio = 0.30;
    } else if (hasOscillatorIndicators) {
      // 主图表70%，振荡器指标30%
      mainChartRatio = 0.70;
      oscillatorIndicatorRatio = 0.30;
    }
    
    const mainChartHeight = totalChartHeight * mainChartRatio;
    const volumeChartHeight = totalChartHeight * volumeIndicatorRatio;
    const oscillatorChartHeight = totalChartHeight * oscillatorIndicatorRatio;
    
    // 子图表之间的间隔
    const subChartGap = 8;
    
    // 各子图表的Y坐标起点
    const mainChartY = padding.top;
    let currentY = mainChartY + mainChartHeight;
    
    const volumeChartY = hasVolumeIndicators 
      ? (currentY += subChartGap, currentY - subChartGap)
      : 0;
    
    if (hasVolumeIndicators) {
      currentY += volumeChartHeight;
    }
    
    const oscillatorChartY = hasOscillatorIndicators 
      ? (currentY += subChartGap, currentY - subChartGap)
      : 0;

    if (chartData.length === 0) return;

    // ========== 获取可见数据范围（ViewportManager） ==========
    // ✅ 修复：使用visibleStart/visibleEnd而不是startIndex/endIndex
    const hasViewportState = viewportManagerRef.current && viewportState;
    
    // 钳制索引到有效范围内（从visibleStart/visibleEnd转换）
    const clampedStartIndex = hasViewportState 
      ? Math.max(0, Math.min(Math.floor(viewportState.visibleStart), chartData.length - 1))
      : 0;
    const clampedEndIndex = hasViewportState
      ? Math.max(0, Math.min(Math.ceil(viewportState.visibleEnd), chartData.length - 1))
      : chartData.length - 1;
    
    // 验证钳制后的索引是否有效
    const hasValidViewport = hasViewportState && 
                            clampedStartIndex <= clampedEndIndex &&
                            clampedEndIndex < chartData.length;
    
    const visibleData = hasValidViewport
      ? chartData.slice(clampedStartIndex, clampedEndIndex + 1)
      : chartData;
    
    const visibleStartIndex = hasValidViewport
      ? clampedStartIndex 
      : 0;
    
    debug.log('Visible data calculation:', {
      hasValidViewport,
      viewportManagerExists: !!viewportManagerRef.current,
      viewportStateExists: !!viewportState,
      visibleStart: viewportState?.visibleStart,
      visibleEnd: viewportState?.visibleEnd,
      clampedStartIndex,
      clampedEndIndex,
      chartDataLength: chartData.length,
      visibleDataLength: visibleData.length,
    });

    // 如果可见数据为空，提前返回
    if (visibleData.length === 0) {
      console.warn('[EnhancedTradingChart] No visible data to render');
      return;
    }

    // 计算时间范围用于X坐标映射
    const timeStart = visibleData[0].timestamp;
    const timeEnd = visibleData[visibleData.length - 1].timestamp;
    const timeSpan = timeEnd - timeStart || 1; // 避免除以0
    
    // 时间戳转X坐标的函数 - 优化版本（精确映射）
    const timeToX = (timestamp: number): number => {
      // 使用线性插值获得精确的X坐标
      // ✅ 移除边界限制，允许绘图延伸到可视区域外
      // if (timestamp <= timeStart) return padding.left;
      // if (timestamp >= timeEnd) return padding.left + chartWidth;
      
      const ratio = (timestamp - timeStart) / timeSpan;
      return padding.left + ratio * chartWidth;
    };
    
    // 时间戳转数据索引的函数（用于查找最接近的K线）
    const timestampToDataIndex = (timestamp: number): number => {
      // 二分查找最接近的数据点
      let left = 0;
      let right = visibleData.length - 1;
      let closest = 0;
      let minDiff = Math.abs(visibleData[0].timestamp - timestamp);
      
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const diff = Math.abs(visibleData[mid].timestamp - timestamp);
        
        if (diff < minDiff) {
          minDiff = diff;
          closest = mid;
        }
        
        if (visibleData[mid].timestamp < timestamp) {
          left = mid + 1;
        } else if (visibleData[mid].timestamp > timestamp) {
          right = mid - 1;
        } else {
          return mid; // 精确匹配
        }
      }
      
      return closest;
    };

    // ========== 专业级轴计算 ==========
    // 重要：传入完整chartData和可见范围，而不是visibleData
    const timeAxis = calculateProfessionalTimeAxis(
      chartData, 
      selectedPeriod, 
      chartWidth,
      { start: clampedStartIndex, end: clampedEndIndex }
    );
    const priceAxis = calculateProfessionalPriceAxis(visibleData, mainChartHeight, coordinateMode);
    const grid = calculateProfessionalGrid(visibleData, chartWidth, mainChartHeight, selectedPeriod);

    const { niceMin: minPrice, niceMax: maxPrice } = priceAxis;
    const priceScale = mainChartHeight / (maxPrice - minPrice);

    // ========== 设置绘图引擎的坐标转换函数 ==========
    if (drawingEngineRef.current) {
      const worldToScreen = (p: { t: number; p: number }) => {
        // t 是 timestamp，p 是 price
        const x = timeToX(p.t);
        const y = padding.top + ((maxPrice - p.p) / (maxPrice - minPrice)) * mainChartHeight;
        return { x, y };
      };
      
      const screenToWorld = (x: number, y: number) => {
        // 反向计算
        const ratio = (x - padding.left) / chartWidth;
        const t = timeStart + ratio * timeSpan;
        const p = maxPrice - ((y - padding.top) / mainChartHeight) * (maxPrice - minPrice);
        return { t: Math.round(t), p };
      };
      
      drawingEngineRef.current.setCoordinateTransform(worldToScreen, screenToWorld);
      drawingEngineRef.current.setPaneId('price');
    }

    // ========== 绘制Bloomberg级网格 ==========
    if (showGrid) {
      // 水平网格线（价格）
      priceAxis.ticks.forEach(tick => {
        const y = padding.top + ((maxPrice - tick.value) / (maxPrice - minPrice)) * mainChartHeight;
        
        ctx.strokeStyle = tick.type === 'major' ? grid.majorColor : grid.minorColor;
        ctx.lineWidth = tick.type === 'major' ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      });

      // 垂直网格线（时间） - 直接使用时间戳转X坐标
      timeAxis.ticks.forEach(tick => {
        const x = timeToX(tick.timestamp);
        
        // 只绘制在图表范围内的网格线
        if (x >= padding.left && x <= padding.left + chartWidth) {
          ctx.strokeStyle = tick.type === 'major' ? grid.majorColor : grid.minorColor;
          ctx.lineWidth = tick.type === 'major' ? 1 : 0.5;
          ctx.beginPath();
          ctx.moveTo(x, padding.top);
          ctx.lineTo(x, padding.top + mainChartHeight);
          ctx.stroke();
        }
      });
    }

    // ========== Bloomberg分隔线系统 ==========
    if (showSeparators && timeAxis.separators.length > 0) {
      timeAxis.separators.forEach(timestamp => {
        const dataIndex = visibleData.findIndex(d => Math.abs(d.timestamp - timestamp) < 86400000);
        if (dataIndex === -1) return;
        
        const candle = visibleData[dataIndex];
        const x = timeToX(candle.timestamp);
        
        ctx.strokeStyle = grid.separatorColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + mainChartHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // ========== 绘制边框 ==========
    ctx.strokeStyle = '#1E3A5F';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding.left, padding.top, chartWidth, mainChartHeight);

    // ========== 🎯 TradingView级裁剪区域（防止元素超出界） ==========
    ctx.save(); // 保存当前状态
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartWidth, mainChartHeight);
    ctx.clip(); // 应用裁剪区域

    // ========== 绘制主图（K线/柱状图/线图/面积图等） ==========
    // 计算K线/柱状图宽度
    const candleWidth = viewportState?.barWidth 
      ? Math.max(viewportState.barWidth - 2, 1)
      : Math.max(chartWidth / visibleData.length - 2, 1);

    // 实心蜡烛图
    if (selectedChartType === 'candlestick') {
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const openY = padding.top + (maxPrice - candle.open) * priceScale;
        const closeY = padding.top + (maxPrice - candle.close) * priceScale;
        const highY = padding.top + (maxPrice - candle.high) * priceScale;
        const lowY = padding.top + (maxPrice - candle.low) * priceScale;

        const isGreen = candle.close >= candle.open;
        ctx.strokeStyle = isGreen ? CHINA_COLORS.up : CHINA_COLORS.down;
        ctx.fillStyle = isGreen ? CHINA_COLORS.up : CHINA_COLORS.down;

        // 影线
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.lineWidth = 1;
        ctx.stroke();

        // 实体
        const bodyHeight = Math.abs(closeY - openY);
        const bodyY = Math.min(openY, closeY);
        
        if (bodyHeight < 1) {
          // Doji 十字星
          ctx.beginPath();
          ctx.moveTo(x - candleWidth / 2, bodyY);
          ctx.lineTo(x + candleWidth / 2, bodyY);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
        }

        // 悬停效果
        const globalIndex = visibleStartIndex + i;
        if (globalIndex === hoveredIndex) {
          ctx.strokeStyle = '#0EA5E9';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - candleWidth / 2 - 2, bodyY - 2, candleWidth + 4, bodyHeight + 4);
        }
      });
    } 
    // 空心蜡烛图
    else if (selectedChartType === 'hollow-candles') {
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const openY = padding.top + (maxPrice - candle.open) * priceScale;
        const closeY = padding.top + (maxPrice - candle.close) * priceScale;
        const highY = padding.top + (maxPrice - candle.high) * priceScale;
        const lowY = padding.top + (maxPrice - candle.low) * priceScale;

        const isUp = candle.close >= candle.open;
        const color = isUp ? CHINA_COLORS.up : CHINA_COLORS.down;
        
        // 影线
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.lineWidth = 1;
        ctx.stroke();

        // 空心实体
        const bodyHeight = Math.abs(closeY - openY);
        const bodyY = Math.min(openY, closeY);
        
        if (bodyHeight < 1) {
          ctx.beginPath();
          ctx.moveTo(x - candleWidth / 2, bodyY);
          ctx.lineTo(x + candleWidth / 2, bodyY);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
        }

        const globalIndex = visibleStartIndex + i;
        if (globalIndex === hoveredIndex) {
          ctx.strokeStyle = '#0EA5E9';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - candleWidth / 2 - 2, bodyY - 2, candleWidth + 4, bodyHeight + 4);
        }
      });
    }
    // 柱状图 (OHLC Bars)
    else if (selectedChartType === 'bars') {
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const openY = padding.top + (maxPrice - candle.open) * priceScale;
        const closeY = padding.top + (maxPrice - candle.close) * priceScale;
        const highY = padding.top + (maxPrice - candle.high) * priceScale;
        const lowY = padding.top + (maxPrice - candle.low) * priceScale;

        const isUp = candle.close >= candle.open;
        ctx.strokeStyle = isUp ? CHINA_COLORS.up : CHINA_COLORS.down;
        ctx.lineWidth = 1;

        // 高低线
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // 开盘横线（左）
        ctx.beginPath();
        ctx.moveTo(x - candleWidth / 2, openY);
        ctx.lineTo(x, openY);
        ctx.stroke();

        // 收盘横线（右）
        ctx.beginPath();
        ctx.moveTo(x, closeY);
        ctx.lineTo(x + candleWidth / 2, closeY);
        ctx.stroke();
      });
    }
    // 折线图
    else if (selectedChartType === 'line') {
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }
    // 带标记的折线图
    else if (selectedChartType === 'line-markers') {
      // 绘制线
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // 绘制标记点
      ctx.fillStyle = '#0EA5E9';
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    // 阶梯线图
    else if (selectedChartType === 'step-line') {
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = timeToX(visibleData[i - 1].timestamp);
          ctx.lineTo(x, padding.top + (maxPrice - visibleData[i - 1].close) * priceScale);
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }
    // 面积图
    else if (selectedChartType === 'area') {
      // 填充区域
      ctx.fillStyle = 'rgba(14, 165, 233, 0.2)';
      ctx.beginPath();
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(padding.left + chartWidth, padding.top + mainChartHeight);
      ctx.lineTo(padding.left, padding.top + mainChartHeight);
      ctx.closePath();
      ctx.fill();

      // 绘制边界线
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }
    // 基线图
    else if (selectedChartType === 'baseline') {
      // 计算基线（可以是第一个收盘价或平均价）
      const baseline = visibleData[0]?.close || 0;
      const baselineY = padding.top + (maxPrice - baseline) * priceScale;

      // 绘制上涨区域（绿色）
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      let inUpRegion = false;
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        
        if (candle.close >= baseline) {
          if (!inUpRegion) {
            ctx.moveTo(x, baselineY);
            inUpRegion = true;
          }
          ctx.lineTo(x, y);
        } else {
          if (inUpRegion) {
            ctx.lineTo(x, baselineY);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            inUpRegion = false;
          }
        }
      });
      if (inUpRegion) {
        const lastX = timeToX(visibleData[visibleData.length - 1].timestamp);
        ctx.lineTo(lastX, baselineY);
        ctx.closePath();
        ctx.fill();
      }

      // 绘制下跌区域（红色）
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.beginPath();
      let inDownRegion = false;
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        
        if (candle.close < baseline) {
          if (!inDownRegion) {
            ctx.moveTo(x, baselineY);
            inDownRegion = true;
          }
          ctx.lineTo(x, y);
        } else {
          if (inDownRegion) {
            ctx.lineTo(x, baselineY);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            inDownRegion = false;
          }
        }
      });
      if (inDownRegion) {
        const lastX = timeToX(visibleData[visibleData.length - 1].timestamp);
        ctx.lineTo(lastX, baselineY);
        ctx.closePath();
        ctx.fill();
      }

      // 绘制价格线
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      visibleData.forEach((candle, i) => {
        const x = timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // 绘制基线
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, baselineY);
      ctx.lineTo(padding.left + chartWidth, baselineY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 恢复裁剪区域
    ctx.restore();

    // ========== 绘制主图表技术指标（MA/EMA/BOLL） ==========
    ctx.save(); // 保存当前状态
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartWidth, mainChartHeight);
    ctx.clip(); // 应用裁剪区域

    const visibleStartIdx = clampedStartIndex;

    // 绘制MA均线 - 增强版高质量渲染
    if ((showMA || activeIndicators.has('MA')) && (maData || indicatorData.ma5) && visibleData.length > 0) {
      const maColors = {
        ma5: '#F59E0B',   // 橙色 - MA5
        ma10: '#10B981',  // 绿色 - MA10  
        ma20: '#8B5CF6',  // 紫色 - MA20
      };

      const visibleStartIdx = clampedStartIndex;

      // 高质量渲染函数
      const drawMALine = (data: number[], color: string, lineWidth: number, alpha: number) => {
        if (!data || data.length === 0) return;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = alpha;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 抗锯齿优化
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.beginPath();
        let hasFirstPoint = false;
        
        visibleData.forEach((candle, i) => {
          const globalIdx = visibleStartIdx + i;
          if (globalIdx < data.length && !isNaN(data[globalIdx]) && data[globalIdx] > 0) {
            const x = Math.round(timeToX(candle.timestamp) * 2) / 2; // 子像素对齐
            const y = Math.round((padding.top + (maxPrice - data[globalIdx]) * priceScale) * 2) / 2;
            
            if (!hasFirstPoint) {
              ctx.moveTo(x, y);
              hasFirstPoint = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        
        if (hasFirstPoint) {
          ctx.stroke();
        }
        ctx.restore();
      };

      // 绘制不同周期的MA线，使用不同的线宽和透明度
      if (maData?.ma5 || indicatorData.ma5) {
        drawMALine(maData?.ma5 || indicatorData.ma5!, maColors.ma5, 1.6, 0.85);
      }
      
      if (maData?.ma10 || indicatorData.ma10) {
        drawMALine(maData?.ma10 || indicatorData.ma10!, maColors.ma10, 1.8, 0.80);
      }
      
      if (maData?.ma20 || indicatorData.ma20) {
        drawMALine(maData?.ma20 || indicatorData.ma20!, maColors.ma20, 2.0, 0.75);
      }
    }

    // 绘制EMA均线 - 增强版高质量渲染
    if (activeIndicators.has('EMA') && indicatorData.ema5 && visibleData.length > 0) {
      const emaColors = {
        ema5: '#FCD34D',   // 金色
        ema10: '#F97316',  // 橙色
        ema20: '#EC4899',  // 粉色
      };

      // 复用高质量渲染函数
      const drawEMALine = (data: number[], color: string, lineWidth: number, alpha: number) => {
        if (!data || data.length === 0) return;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = alpha;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // EMA使用虚线样式以区分MA
        ctx.setLineDash([3, 2]);
        
        // 抗锯齿优化
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.beginPath();
        let hasFirstPoint = false;
        
        visibleData.forEach((candle, i) => {
          const globalIdx = visibleStartIdx + i;
          if (globalIdx < data.length && !isNaN(data[globalIdx]) && data[globalIdx] > 0) {
            const x = Math.round(timeToX(candle.timestamp) * 2) / 2; // 子像素对齐
            const y = Math.round((padding.top + (maxPrice - data[globalIdx]) * priceScale) * 2) / 2;
            
            if (!hasFirstPoint) {
              ctx.moveTo(x, y);
              hasFirstPoint = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        
        if (hasFirstPoint) {
          ctx.stroke();
        }
        ctx.setLineDash([]); // 重置线型
        ctx.restore();
      };

      // 绘制不同周期的EMA线
      if (indicatorData.ema5) {
        drawEMALine(indicatorData.ema5, emaColors.ema5, 1.5, 0.85);
      }
      
      if (indicatorData.ema10) {
        drawEMALine(indicatorData.ema10, emaColors.ema10, 1.6, 0.80);
      }
      
      if (indicatorData.ema20) {
        drawEMALine(indicatorData.ema20, emaColors.ema20, 1.8, 0.75);
      }
    }

    // 绘制布林带BOLL - 增强版高质量渲染
    if (activeIndicators.has('BOLL') && indicatorData.boll && visibleData.length > 0) {
      const bollColors = {
        upper: '#EF4444',      // 红色（上轨）
        middle: '#3B82F6',     // 蓝色（中轨）
        lower: '#10B981',      // 绿色（下轨）
        fill: 'rgba(59, 130, 246, 0.08)', // 填充区域颜色
      };

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 先绘制填充区域
      if (indicatorData.boll.upper.length > 0 && indicatorData.boll.lower.length > 0) {
        ctx.fillStyle = bollColors.fill;
        ctx.beginPath();
        
        let firstPoint = true;
        const validPoints: { x: number; upperY: number; lowerY: number }[] = [];
        
        // 收集有效点
        visibleData.forEach((candle, i) => {
          const globalIdx = visibleStartIdx + i;
          const upper = indicatorData.boll!.upper[globalIdx];
          const lower = indicatorData.boll!.lower[globalIdx];
          
          if (!isNaN(upper) && !isNaN(lower) && upper > 0 && lower > 0) {
            const x = Math.round(timeToX(candle.timestamp) * 2) / 2;
            const upperY = Math.round((padding.top + (maxPrice - upper) * priceScale) * 2) / 2;
            const lowerY = Math.round((padding.top + (maxPrice - lower) * priceScale) * 2) / 2;
            validPoints.push({ x, upperY, lowerY });
          }
        });
        
        // 绘制填充区域
        if (validPoints.length > 1) {
          // 上轨线
          ctx.moveTo(validPoints[0].x, validPoints[0].upperY);
          for (let i = 1; i < validPoints.length; i++) {
            ctx.lineTo(validPoints[i].x, validPoints[i].upperY);
          }
          // 下轨线（反向）
          for (let i = validPoints.length - 1; i >= 0; i--) {
            ctx.lineTo(validPoints[i].x, validPoints[i].lowerY);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      // 通用线条绘制函数
      const drawBollLine = (data: number[], color: string, lineWidth: number, alpha: number, isDashed = false) => {
        if (!data || data.length === 0) return;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = alpha;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (isDashed) {
          ctx.setLineDash([5, 3]);
        }
        
        ctx.beginPath();
        let hasFirstPoint = false;
        
        visibleData.forEach((candle, i) => {
          const globalIdx = visibleStartIdx + i;
          if (globalIdx < data.length && !isNaN(data[globalIdx]) && data[globalIdx] > 0) {
            const x = Math.round(timeToX(candle.timestamp) * 2) / 2;
            const y = Math.round((padding.top + (maxPrice - data[globalIdx]) * priceScale) * 2) / 2;
            
            if (!hasFirstPoint) {
              ctx.moveTo(x, y);
              hasFirstPoint = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        
        if (hasFirstPoint) {
          ctx.stroke();
        }
        
        if (isDashed) {
          ctx.setLineDash([]);
        }
      };

      // 绘制中轨（实线，最粗）
      if (indicatorData.boll.middle) {
        drawBollLine(indicatorData.boll.middle, bollColors.middle, 1.8, 0.8);
      }
      
      // 绘制上轨（虚线）
      if (indicatorData.boll.upper) {
        drawBollLine(indicatorData.boll.upper, bollColors.upper, 1.4, 0.7, true);
      }
      
      // 绘制下轨（虚线）
      if (indicatorData.boll.lower) {
        drawBollLine(indicatorData.boll.lower, bollColors.lower, 1.4, 0.7, true);
      }

      ctx.restore();
    }

    // 恢复裁剪区域
    ctx.restore();

    // ========== 绘制主图表指标图例 - 增强版 ==========
    if (visibleData.length > 0 && ((showMA && maData) || activeIndicators.has('MA') || activeIndicators.has('EMA') || activeIndicators.has('BOLL'))) {
      ctx.save();
      
      let offsetX = 0;
      const legendX = padding.left + 12;
      const legendY = padding.top + 15;
      const legendSpacing = 65;
      
      // 绘制半透明背景
      const legendBgHeight = 22;
      const totalWidth = calculateLegendWidth();
      ctx.fillStyle = 'rgba(10, 25, 41, 0.85)';
      ctx.roundRect(legendX - 8, legendY - 16, totalWidth + 16, legendBgHeight, 6);
      ctx.fill();
      
      ctx.font = '11px \"SF Mono\", monospace';
      ctx.textAlign = 'left';

      // MA图例 - 带数值显示
      if ((showMA || activeIndicators.has('MA')) && (maData || indicatorData.ma5)) {
        const currentIdx = Math.max(0, chartData.length - 1);
        
        drawLegendItem('MA5', '#F59E0B', offsetX, getCurrentValue(maData?.ma5 || indicatorData.ma5, currentIdx));
        offsetX += legendSpacing;
        
        drawLegendItem('MA10', '#10B981', offsetX, getCurrentValue(maData?.ma10 || indicatorData.ma10, currentIdx));
        offsetX += legendSpacing;
        
        drawLegendItem('MA20', '#8B5CF6', offsetX, getCurrentValue(maData?.ma20 || indicatorData.ma20, currentIdx));
        offsetX += legendSpacing;
      }

      // EMA图例 - 带数值显示
      if (activeIndicators.has('EMA') && indicatorData.ema5) {
        const currentIdx = Math.max(0, chartData.length - 1);
        
        drawLegendItem('EMA5', '#FCD34D', offsetX, getCurrentValue(indicatorData.ema5, currentIdx), true);
        offsetX += legendSpacing;
        
        if (indicatorData.ema10) {
          drawLegendItem('EMA10', '#F97316', offsetX, getCurrentValue(indicatorData.ema10, currentIdx), true);
          offsetX += legendSpacing;
        }
        
        if (indicatorData.ema20) {
          drawLegendItem('EMA20', '#EC4899', offsetX, getCurrentValue(indicatorData.ema20, currentIdx), true);
          offsetX += legendSpacing;
        }
      }

      // BOLL图例 - 带数值显示
      if (activeIndicators.has('BOLL') && indicatorData.boll) {
        const currentIdx = Math.max(0, chartData.length - 1);
        const middle = getCurrentValue(indicatorData.boll.middle, currentIdx);
        
        drawLegendItem('BOLL', '#3B82F6', offsetX, middle);
      }
      
      // 辅助函数：计算图例总宽度
      function calculateLegendWidth(): number {
        let width = 0;
        let itemCount = 0;
        
        if ((showMA || activeIndicators.has('MA')) && (maData || indicatorData.ma5)) {
          itemCount += 3; // MA5, MA10, MA20
        }
        if (activeIndicators.has('EMA') && indicatorData.ema5) {
          itemCount += [indicatorData.ema5, indicatorData.ema10, indicatorData.ema20].filter(Boolean).length;
        }
        if (activeIndicators.has('BOLL') && indicatorData.boll) {
          itemCount += 1;
        }
        
        return itemCount * legendSpacing - 10;
      }
      
      // 辅助函数：获取当前值
      function getCurrentValue(data: number[] | undefined, index: number): number | null {
        if (!data || index < 0 || index >= data.length) return null;
        const value = data[index];
        return isNaN(value) ? null : value;
      }
      
      // 辅助函数：绘制图例项
      function drawLegendItem(label: string, color: string, x: number, value: number | null, isDashed = false) {
        // 绘制颜色指示线
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        if (isDashed) {
          ctx.setLineDash([3, 2]);
        }
        
        ctx.beginPath();
        ctx.moveTo(legendX + x, legendY - 4);
        ctx.lineTo(legendX + x + 12, legendY - 4);
        ctx.stroke();
        
        if (isDashed) {
          ctx.setLineDash([]);
        }
        
        // 绘制标签
        ctx.fillStyle = color;
        ctx.fillText(label, legendX + x + 16, legendY);
        
        // 绘制数值
        if (value !== null) {
          ctx.fillStyle = '#9CA3AF';
          ctx.font = '10px \"SF Mono\", monospace';
          const valueText = value.toFixed(2);
          ctx.fillText(valueText, legendX + x + 16, legendY + 10);
        }
        
        ctx.font = '11px \"SF Mono\", monospace'; // 恢复字体
      }
      
      ctx.restore();
    }

    // ========== 关键价位自动识别 ==========
    if (showKeyLevels) {
      const keyLevels = detectKeyLevels(visibleData, {
        enableSwingPoints: true,
        enableSupportResistance: true,
        enableRoundNumbers: true,
        enableVWAP: true,
        swingWindow: 10,
        touchThreshold: 0.005,
        minTouchCount: 2,
      });

      // 过滤并绘制关键价位（排除当前价格，单独绘制）
      const filteredLevels = filterKeyLevels(keyLevels, {
        minStrength: 0.3,
        maxCount: 10,
      }).filter(level => level.type !== 'current_price');

      filteredLevels.forEach(level => {
        const y = padding.top + ((maxPrice - level.price) / (maxPrice - minPrice)) * mainChartHeight;
        
        // ✅ 绘制水平线 - 更淡的颜色
        ctx.strokeStyle = level.color || CHINA_COLORS.separator;
        ctx.lineWidth = level.type === 'vwap' ? 1.5 : 0.8;  // ✅ 降低线宽
        ctx.globalAlpha = 0.15 + level.strength * 0.2;  // ✅ 降低透明度（原0.3-0.7 → 0.15-0.35）
        
        if (level.type === 'support' || level.type === 'resistance') {
          ctx.setLineDash([10, 5]);
        } else if (level.type === 'round_number') {
          ctx.setLineDash([2, 2]);
        }
        
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        
        // 绘制标签
        if (level.label) {
          ctx.fillStyle = level.color || CHINA_COLORS.text;
          ctx.font = '10px \"SF Mono\", monospace';
          ctx.textAlign = 'left';
          // ✅ 移动到右侧 pill格式
          const labelText = level.label.replace('支撑', 'S').replace('前低', 'PL').replace('前高', 'PH').replace('阻力', 'R');
          ctx.font = '9px \\\"SF Mono\\\", monospace';
          const textWidth = ctx.measureText(labelText).width;
          const pillX = width - padding.right + 5;
          const pillY = y - 10;
          const pillWidth = textWidth + 12;
          const pillHeight = 16;
          
          ctx.fillStyle = (level.color || CHINA_COLORS.separator) + '40';
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 3);
          ctx.fill();
          
          ctx.fillStyle = level.color || CHINA_COLORS.text;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, pillX + 6, pillY + pillHeight / 2);
        }
      });
    }

    // ========== 实时价格线 (Current Price Line) ==========
    if (showCurrentPrice && visibleData.length > 0) {
      const currentPrice = visibleData[visibleData.length - 1].close;
      const prevClose = visibleData.length > 1 ? visibleData[visibleData.length - 2].close : currentPrice;
      const isUp = currentPrice >= prevClose;
      const priceColor = isUp ? CHINA_COLORS.currentPriceUp : CHINA_COLORS.currentPriceDown;
      
      const y = padding.top + ((maxPrice - currentPrice) / (maxPrice - minPrice)) * mainChartHeight;
      
      // 闪烁动画
      const opacity = isAnimating ? 0.6 + 0.4 * Math.sin(Date.now() / 300) : 1;
      ctx.globalAlpha = opacity;
      
      // 绘制价格线
      ctx.strokeStyle = priceColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // 绘制价格标签背景
      const priceLabel = currentPrice.toFixed(2);
      ctx.font = 'bold 12px \"SF Mono\", monospace';
      const labelWidth = ctx.measureText(priceLabel).width + 16;
      const labelHeight = 20;
      
      ctx.fillStyle = priceColor;
      ctx.fillRect(width - padding.right + 2, y - labelHeight / 2, labelWidth, labelHeight);
      
      // 绘制价格文本
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceLabel, width - padding.right + 10, y);
      
      // 绘制三角形指示器
      ctx.fillStyle = priceColor;
      ctx.beginPath();
      ctx.moveTo(width - padding.right, y);
      ctx.lineTo(width - padding.right + 6, y - 4);
      ctx.lineTo(width - padding.right + 6, y + 4);
      ctx.closePath();
      ctx.fill();
      
      ctx.globalAlpha = 1;
    }

    // ========== X轴标签智能避让 ==========
    const xAxisLabels: LabelBox[] = timeAxis.ticks.map(tick => {
      // 直接使用时间戳转X坐标，不需要查找数据点
      const x = timeToX(tick.timestamp);
      const font = tick.type === 'major' ? '12px \"SF Mono\", monospace' : '10px \"SF Mono\", monospace';
      const textWidth = measureTextWidth(tick.label, font, ctx);
      
      return {
        x: x - textWidth / 2,
        y: chartHeight - padding.bottom + 15,
        width: textWidth,
        height: 14,
        text: tick.label,
        priority: tick.type === 'major' ? 1 : 0.5,
        isMajor: tick.type === 'major',
        metadata: tick,
      };
    }).filter(label => {
      // 过滤掉超出图表范围的标签
      const x = timeToX(label.metadata.timestamp);
      return x >= padding.left && x <= padding.left + chartWidth;
    }) as LabelBox[];

    // 使用更宽松的碰撞检测，确保显示足够的标签
    const { visibleLabels } = resolveCollisions(xAxisLabels, 4);

    // 绘制X轴刻度和标签
    visibleLabels.forEach(label => {
      const tick = label.metadata;
      const x = timeToX(tick.timestamp);
      
      // 刻度线
      ctx.strokeStyle = tick.type === 'major' ? CHINA_COLORS.textDim : '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, chartHeight - padding.bottom);
      ctx.lineTo(x, chartHeight - padding.bottom + (tick.type === 'major' ? 8 : 4));
      ctx.stroke();
      
      // 标签
      ctx.fillStyle = tick.type === 'major' ? CHINA_COLORS.text : CHINA_COLORS.textDim;
      ctx.font = tick.type === 'major' ? '12px \"SF Mono\", monospace' : '10px \"SF Mono\", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label.text, x, chartHeight - padding.bottom + 10);
      
      // 市场时间标记
      if (showMarketTimes) {
        if (tick.isMarketOpen) {
          ctx.fillStyle = '#10B981';
          ctx.fillText('▲', x, chartHeight - padding.bottom + 26);
        }
        if (tick.isMarketClose) {
          ctx.fillStyle = '#EF4444';
          ctx.fillText('▼', x, chartHeight - padding.bottom + 26);
        }
      }
    });

    // 绘制Y轴刻度和标签
    priceAxis.ticks.forEach(tick => {
      const y = padding.top + ((maxPrice - tick.value) / (maxPrice - minPrice)) * mainChartHeight;
      
      // 刻度线
      ctx.strokeStyle = tick.type === 'major' ? CHINA_COLORS.textDim : '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width - padding.right, y);
      ctx.lineTo(width - padding.right + (tick.type === 'major' ? 8 : 4), y);
      ctx.stroke();
      
      // 标签
      ctx.fillStyle = tick.type === 'major' ? CHINA_COLORS.text : CHINA_COLORS.textDim;
      ctx.font = '11px \"SF Mono\", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tick.label, width - padding.right + 15, y);
      
      // 整数标记
      if (tick.isRoundNumber) {
        ctx.fillStyle = CHINA_COLORS.separator;
        ctx.beginPath();
        ctx.arc(width - padding.right + 8, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // ========== 绘制成交量/子图表指标 ==========
    // hasVolumeIndicators 已在前面定义
    
    if (hasVolumeIndicators && volumeChartHeight > 0) {
      // 绘制边框
      ctx.strokeStyle = '#1E3A5F';
      ctx.lineWidth = 1;
      ctx.strokeRect(padding.left, volumeChartY, chartWidth, volumeChartHeight);

      // 绘制VOL成交量柱状图（只在技术指标中勾选时显示）
      if (activeIndicators.has('VOL')) {
        const volumes = visibleData.map(d => d.volume);
        const maxVolume = Math.max(...volumes);

        visibleData.forEach((candle) => {
          const x = timeToX(candle.timestamp);
          const volumeBarHeight = (candle.volume / maxVolume) * volumeChartHeight;
          
          const changePercent = Math.abs((candle.close - candle.open) / candle.open);
          const isUp = candle.close >= candle.open;
          const isNeutral = changePercent < 0.001;
          
          if (isNeutral) {
            ctx.fillStyle = CHINA_COLORS.neutral + '60';
          } else {
            ctx.fillStyle = isUp ? CHINA_COLORS.up + '70' : CHINA_COLORS.down + '70';
          }
          
          ctx.fillRect(
            x - candleWidth / 2, 
            volumeChartY + volumeChartHeight - volumeBarHeight, 
            candleWidth, 
            volumeBarHeight
          );
        });

        ctx.fillStyle = CHINA_COLORS.textDim;
        ctx.font = '10px "SF Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('VOL', padding.left + 5, volumeChartY + 5);
      }

      // 绘制OBV指标线
      if (activeIndicators.has('OBV') && indicatorData.obv) {
        const obvValues = visibleData.map((candle, i) => {
          const globalIdx = clampedStartIndex + i;
          return indicatorData.obv![globalIdx];
        }).filter(v => !isNaN(v));

        if (obvValues.length > 0) {
          const minOBV = Math.min(...obvValues);
          const maxOBV = Math.max(...obvValues);
          const obvScale = volumeChartHeight / (maxOBV - minOBV || 1);

          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          let firstPoint = true;
          visibleData.forEach((candle, i) => {
            const globalIdx = clampedStartIndex + i;
            if (globalIdx < indicatorData.obv!.length && !isNaN(indicatorData.obv![globalIdx])) {
              const x = timeToX(candle.timestamp);
              const y = volumeChartY + volumeChartHeight - (indicatorData.obv![globalIdx] - minOBV) * obvScale;
              if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
              } else {
                ctx.lineTo(x, y);
              }
            }
          });
          ctx.stroke();

          ctx.fillStyle = '#3B82F6';
          ctx.font = '10px "SF Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('OBV', padding.left + 40, volumeChartY + 5);
        }
      }

      // 绘制VRSI指标线
      if (activeIndicators.has('VRSI') && indicatorData.vrsi) {
        const vrsiScale = volumeChartHeight / 100; // VRSI范围0-100

        // 绘制参考线
        ctx.strokeStyle = '#64748B40';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 2]);
        // 70线（超买）
        ctx.beginPath();
        ctx.moveTo(padding.left, volumeChartY + (100 - 70) * vrsiScale);
        ctx.lineTo(padding.left + chartWidth, volumeChartY + (100 - 70) * vrsiScale);
        ctx.stroke();
        // 30线（超卖）
        ctx.beginPath();
        ctx.moveTo(padding.left, volumeChartY + (100 - 30) * vrsiScale);
        ctx.lineTo(padding.left + chartWidth, volumeChartY + (100 - 30) * vrsiScale);
        ctx.stroke();
        ctx.setLineDash([]);

        // 绘制VRSI线
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let firstPoint = true;
        visibleData.forEach((candle, i) => {
          const globalIdx = clampedStartIndex + i;
          if (globalIdx < indicatorData.vrsi!.length && !isNaN(indicatorData.vrsi![globalIdx])) {
            const x = timeToX(candle.timestamp);
            const y = volumeChartY + (100 - indicatorData.vrsi![globalIdx]) * vrsiScale;
            if (firstPoint) {
              ctx.moveTo(x, y);
              firstPoint = false;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();

        ctx.fillStyle = '#EC4899';
        ctx.font = '10px "SF Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('VRSI', padding.left + 80, volumeChartY + 5);
      }
    }

    // ========== 绘制振荡器指标 (MACD, RSI, KDJ, ATR) ==========
    if (hasOscillatorIndicators && oscillatorChartHeight > 0) {
      ctx.save();
      
      // 绘制边框
      ctx.strokeStyle = '#1E3A5F';
      ctx.lineWidth = 1;
      ctx.strokeRect(padding.left, oscillatorChartY, chartWidth, oscillatorChartHeight);

      // 绘制MACD指标
      if (activeIndicators.has('MACD') && indicatorData.macd) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(padding.left, oscillatorChartY, chartWidth, oscillatorChartHeight);
        ctx.clip();

        const { dif, dea, histogram } = indicatorData.macd;
        
        // 计算MACD值域
        const allValues = [
          ...dif.filter(v => !isNaN(v)),
          ...dea.filter(v => !isNaN(v)),
          ...histogram.filter(v => !isNaN(v))
        ];
        
        if (allValues.length > 0) {
          const maxValue = Math.max(...allValues);
          const minValue = Math.min(...allValues);
          const valueRange = maxValue - minValue || 1;
          const macdScale = oscillatorChartHeight / valueRange;
          const zeroY = oscillatorChartY + oscillatorChartHeight - (0 - minValue) * macdScale;

          // 绘制零轴线
          ctx.strokeStyle = '#64748B40';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(padding.left, zeroY);
          ctx.lineTo(padding.left + chartWidth, zeroY);
          ctx.stroke();
          ctx.setLineDash([]);

          // 绘制MACD柱状图（Histogram）
          visibleData.forEach((candle, i) => {
            const globalIdx = clampedStartIndex + i;
            if (globalIdx < histogram.length && !isNaN(histogram[globalIdx])) {
              const x = timeToX(candle.timestamp);
              const histValue = histogram[globalIdx];
              const histHeight = Math.abs(histValue * macdScale);
              const histY = histValue >= 0 
                ? zeroY - histHeight
                : zeroY;
              
              ctx.fillStyle = histValue >= 0 ? '#10B981AA' : '#EF4444AA';
              ctx.fillRect(
                x - candleWidth / 3,
                histY,
                candleWidth * 2 / 3,
                histHeight
              );
            }
          });

          // 绘制DIF线（MACD快线）
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 1.8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          let firstDifPoint = true;
          
          visibleData.forEach((candle, i) => {
            const globalIdx = clampedStartIndex + i;
            if (globalIdx < dif.length && !isNaN(dif[globalIdx])) {
              const x = Math.round(timeToX(candle.timestamp) * 2) / 2;
              const y = Math.round((oscillatorChartY + oscillatorChartHeight - (dif[globalIdx] - minValue) * macdScale) * 2) / 2;
              
              if (firstDifPoint) {
                ctx.moveTo(x, y);
                firstDifPoint = false;
              } else {
                ctx.lineTo(x, y);
              }
            }
          });
          ctx.stroke();

          // 绘制DEA线（MACD信号线）
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          let firstDeaPoint = true;
          
          visibleData.forEach((candle, i) => {
            const globalIdx = clampedStartIndex + i;
            if (globalIdx < dea.length && !isNaN(dea[globalIdx])) {
              const x = Math.round(timeToX(candle.timestamp) * 2) / 2;
              const y = Math.round((oscillatorChartY + oscillatorChartHeight - (dea[globalIdx] - minValue) * macdScale) * 2) / 2;
              
              if (firstDeaPoint) {
                ctx.moveTo(x, y);
                firstDeaPoint = false;
              } else {
                ctx.lineTo(x, y);
              }
            }
          });
          ctx.stroke();
          ctx.setLineDash([]);

          // MACD图例
          ctx.fillStyle = '#3B82F6';
          ctx.font = '10px "SF Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('MACD(12,26,9)', padding.left + 5, oscillatorChartY + 5);
          
          ctx.fillStyle = '#F59E0B';
          ctx.fillText('DIF', padding.left + 90, oscillatorChartY + 5);
          
          ctx.fillStyle = '#F59E0B';
          ctx.fillText('DEA', padding.left + 120, oscillatorChartY + 5);
        }
        
        ctx.restore();
      }

      // 绘制RSI指标
      if (activeIndicators.has('RSI') && indicatorData.rsi && !activeIndicators.has('MACD')) {
        const rsiScale = oscillatorChartHeight / 100; // RSI范围0-100
        
        // 绘制参考线
        ctx.strokeStyle = '#64748B30';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 2]);
        
        // 70线（超买）
        const oversoldY = oscillatorChartY + (100 - 70) * rsiScale;
        ctx.beginPath();
        ctx.moveTo(padding.left, oversoldY);
        ctx.lineTo(padding.left + chartWidth, oversoldY);
        ctx.stroke();
        
        // 50线（中位）
        const midY = oscillatorChartY + (100 - 50) * rsiScale;
        ctx.beginPath();
        ctx.moveTo(padding.left, midY);
        ctx.lineTo(padding.left + chartWidth, midY);
        ctx.stroke();
        
        // 30线（超卖）
        const overboughtY = oscillatorChartY + (100 - 30) * rsiScale;
        ctx.beginPath();
        ctx.moveTo(padding.left, overboughtY);
        ctx.lineTo(padding.left + chartWidth, overboughtY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 绘制RSI线
        ctx.strokeStyle = '#8B5CF6';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        let firstRsiPoint = true;
        
        visibleData.forEach((candle, i) => {
          const globalIdx = clampedStartIndex + i;
          if (globalIdx < indicatorData.rsi!.length && !isNaN(indicatorData.rsi![globalIdx])) {
            const x = Math.round(timeToX(candle.timestamp) * 2) / 2;
            const y = Math.round((oscillatorChartY + (100 - indicatorData.rsi![globalIdx]) * rsiScale) * 2) / 2;
            
            if (firstRsiPoint) {
              ctx.moveTo(x, y);
              firstRsiPoint = false;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();

        // RSI图例
        ctx.fillStyle = '#8B5CF6';
        ctx.font = '10px "SF Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('RSI(14)', padding.left + 5, oscillatorChartY + 5);
      }
      
      ctx.restore();
    }

    // ========== 十字光标系统 (Crosshair) ==========
    if (crosshairPos && showTooltip) {
      const { x, y } = crosshairPos;
      
      // 绘制竖线（贯穿价格+成交量）
      ctx.strokeStyle = CHINA_COLORS.crosshair + '60';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, chartHeight - padding.bottom);
      ctx.stroke();
      
      // 绘制横线（仅在主图表内）
      if (y >= padding.top && y <= padding.top + mainChartHeight) {
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      
      // ✅ X轴时间标签（底部白底pill）
      const timestamp = visibleData[0].timestamp + ((x - padding.left) / chartWidth) * timeSpan;
      const timeLabel = new Date(timestamp).toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      ctx.font = '11px "SF Mono", monospace';
      const timeLabelWidth = ctx.measureText(timeLabel).width;
      const timePillX = x - timeLabelWidth / 2 - 6;
      const timePillY = chartHeight - padding.bottom + 2;
      const timePillWidth = timeLabelWidth + 12;
      const timePillHeight = 18;
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(timePillX, timePillY, timePillWidth, timePillHeight);
      ctx.strokeStyle = CHINA_COLORS.crosshair;
      ctx.lineWidth = 1;
      ctx.strokeRect(timePillX, timePillY, timePillWidth, timePillHeight);
      
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(timeLabel, x, timePillY + timePillHeight / 2);
      
      // ✅ Y轴价格标签（右侧���底pill）- 仅在主图表内
      if (y >= padding.top && y <= padding.top + mainChartHeight) {
        const price = maxPrice - ((y - padding.top) / mainChartHeight) * (maxPrice - minPrice);
        const priceLabel = formatPrice(price);
        const priceLabelWidth = ctx.measureText(priceLabel).width;
        const pricePillX = width - padding.right + 2;
        const pricePillY = y - 9;
        const pricePillWidth = priceLabelWidth + 12;
        const pricePillHeight = 18;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(pricePillX, pricePillY, pricePillWidth, pricePillHeight);
        ctx.strokeStyle = CHINA_COLORS.crosshair;
        ctx.lineWidth = 1;
        ctx.strokeRect(pricePillX, pricePillY, pricePillWidth, pricePillHeight);
        
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(priceLabel, pricePillX + 6, pricePillY + pricePillHeight / 2);
      }
    }

    // ========== 绘制Hover Tooltip ==========
    if (showTooltip && hoveredIndex >= 0 && hoveredIndex < chartData.length && crosshairPos) {
      const candle = chartData[hoveredIndex];
      
      // ✅ 自适应Tooltip位置 - 根据鼠标位置避免遮挡
      const mouseX = crosshairPos.x;
      const mouseY = crosshairPos.y;
      const tooltipMargin = 15;
      
      // Compact模式使���简化的tooltip
      if (mode === 'compact') {
        const tooltipWidth = 220;
        const tooltipHeight = 90;
        
        // ✅ 智能定位：鼠标在左半侧时显示在右侧，反之亦然
        const tooltipX = mouseX < width / 2 
          ? mouseX + tooltipMargin 
          : mouseX - tooltipWidth - tooltipMargin;
        const tooltipY = Math.max(tooltipMargin, Math.min(mouseY - tooltipHeight / 2, chartHeight - tooltipHeight - tooltipMargin));

        ctx.fillStyle = 'rgba(13, 27, 46, 0.95)';
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        ctx.strokeStyle = '#1E3A5F';
        ctx.lineWidth = 1;
        ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        const isUp = candle.close >= candle.open;
        const changePercent = ((candle.close - candle.open) / candle.open * 100).toFixed(2);

        ctx.font = '10px "SF Mono", monospace';
        ctx.textAlign = 'left';

        const lines = [
          { label: '时间', value: formatFullTime(candle.timestamp, selectedPeriod), color: CHINA_COLORS.text },
          { label: '收盘', value: formatPrice(candle.close), color: isUp ? CHINA_COLORS.up : CHINA_COLORS.down },
          { label: '涨跌', value: `${isUp ? '+' : ''}${changePercent}%`, color: isUp ? CHINA_COLORS.up : CHINA_COLORS.down },
        ];

        lines.forEach((line, i) => {
          ctx.fillStyle = CHINA_COLORS.textDim;
          ctx.fillText(line.label, tooltipX + 10, tooltipY + 20 + i * 18);
          
          ctx.fillStyle = line.color;
          ctx.fillText(line.value, tooltipX + 70, tooltipY + 20 + i * 18);
        });
      } else {
        // Full模式使用完整tooltip
        const tooltipWidth = 260;  // ✅ 缩小宽度（从280→260）
        const tooltipHeight = 140;
        
        // ✅ 智能定位：鼠标在左半侧时显示在右侧，反之亦然
        const tooltipX = mouseX < width / 2 
          ? mouseX + tooltipMargin 
          : mouseX - tooltipWidth - tooltipMargin;
        const tooltipY = Math.max(tooltipMargin, Math.min(mouseY - tooltipHeight / 2, chartHeight - tooltipHeight - tooltipMargin));

        ctx.fillStyle = 'rgba(13, 27, 46, 0.95)';
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        ctx.strokeStyle = '#1E3A5F';
        ctx.lineWidth = 1;
        ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        const isUp = candle.close >= candle.open;
        const changePercent = ((candle.close - candle.open) / candle.open * 100).toFixed(2);

        ctx.font = '11px "SF Mono", monospace';
        ctx.textAlign = 'left';

        const lines = [
          { label: '时间', value: formatFullTime(candle.timestamp, selectedPeriod), color: CHINA_COLORS.text },
          { label: '开盘', value: formatPrice(candle.open), color: CHINA_COLORS.text },
          { label: '最高', value: formatPrice(candle.high), color: CHINA_COLORS.up },
          { label: '最低', value: formatPrice(candle.low), color: CHINA_COLORS.down },
          { label: '收盘', value: formatPrice(candle.close), color: isUp ? CHINA_COLORS.up : CHINA_COLORS.down },
          { label: '涨跌', value: `${isUp ? '+' : ''}${changePercent}%`, color: isUp ? CHINA_COLORS.up : CHINA_COLORS.down },
          { label: '成交量', value: formatVolume(candle.volume), color: CHINA_COLORS.text },
        ];

        lines.forEach((line, i) => {
          ctx.fillStyle = CHINA_COLORS.textDim;
          ctx.fillText(line.label, tooltipX + 15, tooltipY + 25 + i * 18);
          
          ctx.fillStyle = line.color;
          ctx.fillText(line.value, tooltipX + 90, tooltipY + 25 + i * 18);
        });
      }
    }

    // 绘制画线工具的图形
    if (drawingEngineRef.current) {
      drawingEngineRef.current.render(ctx);
    }

    // ========== 性能统计 ==========
    debug.timeEnd('Chart Render');
    const renderTime = performance.now() - renderStartTime;
    
    // 更新性能指标
    if (DEV_MODE.showPerformanceMetrics || DEV_MODE.showDebugPanel) {
      frameCounter.current++;
      const now = performance.now();
      const deltaTime = now - lastRenderTime.current;
      lastRenderTime.current = now;
      
      setPerfMetrics(prev => ({
        renderTime: renderTime,
        fps: deltaTime > 0 ? Math.round(1000 / deltaTime) : 0,
        frameCount: frameCounter.current,
        lastFrameTime: deltaTime,
        drawCalls: 1, // 简化：每次renderChart算1次绘制调用
      }));
    }

  }, [chartData, selectedPeriod, selectedChartType, coordinateMode, mode, showVolume, showGrid, showKeyLevels, showCurrentPrice, showSeparators, showMarketTimes, showMA, maData, showTooltip, hoveredIndex, isAnimating, height, viewportState, indicatorData, activeIndicators]);

  // 更新 renderChart ref
  useEffect(() => {
    renderChartRef.current = renderChart;
  }, [renderChart]);

  // 渲染循环（用于实时价格线动画）
  useEffect(() => {
    if (!showCurrentPrice || !isAnimating) return;
    
    const animationFrame = requestAnimationFrame(() => {
      renderChart();
    });
    
    return () => cancelAnimationFrame(animationFrame);
  }, [renderChart, showCurrentPrice, isAnimating]);

  // 初始渲染和窗口调整
  useEffect(() => {
    renderChart();
    
    const canvas = canvasRef.current;
    const handleResize = () => renderChart();
    
    // 监听窗口resize
    window.addEventListener('resize', handleResize);
    
    // 监听canvas容器resize
    let resizeObserver: ResizeObserver | null = null;
    if (canvas) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(canvas);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver && canvas) {
        resizeObserver.unobserve(canvas);
        resizeObserver.disconnect();
      }
    };
  }, [renderChart]);

  // 鼠标移动处理
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const viewportManager = viewportManagerRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // ✅ 修复：Padding必须与renderChart中的定义保持一致
    const padding = { left: 10, right: 70 };
    const chartWidth = rect.width - padding.left - padding.right;

    // 让DrawingEngine处理绘图
    if (drawingEngineRef.current) {
      const shouldBlock = drawingEngineRef.current.handleMouseMove(x, y);
      if (shouldBlock) {
        console.log('[Chart] handleMouseMove - DrawingEngine blocking interaction (drawing in progress)');
        console.log('[Chart] → Skipping pan and hover updates');
        return; // DrawingEngine正在处理，阻止其他交互
      }
      console.log('[Chart] handleMouseMove - DrawingEngine returned FALSE, continuing with normal interactions');
    }

    // ✅ 只在拖动时更新平移
    if (isDragging && viewportManager) {
      console.log('[Chart] handleMouseMove - Pan mode active (isDragging = true)');
      viewportManager.updatePan(x);
      setViewportState(viewportManager.getState());
      // 拖动时不需要更新hover，直接返回
      return;
    }

    // ✅ 处理Hover（使用adaptedViewportState）
    if (adaptedViewportState) {
      const relativeX = x - padding.left;
      const visibleWidth = chartWidth;
      const relativeIndex = Math.round((relativeX / visibleWidth) * (adaptedViewportState.visibleBars - 1));
      const globalIndex = adaptedViewportState.startIndex + relativeIndex;
      
      if (globalIndex >= 0 && globalIndex < chartData.length) {
        setHoveredIndex(globalIndex);
      } else {
        setHoveredIndex(-1);
      }
    } else {
      // 没有viewport时，按比例计算hover索引
      const index = Math.round(((x - padding.left) / chartWidth) * (chartData.length - 1));
      
      if (index >= 0 && index < chartData.length) {
        setHoveredIndex(index);
      } else {
        setHoveredIndex(-1);
      }
    }

    // ✅ 更新十字光标位置
    if (showTooltip) {
      setCrosshairPos({ x, y: e.clientY - rect.top });
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(-1);
    viewportManagerRef.current?.endPan();
    setCrosshairPos(null); // ✅ 清除十字光标位置
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const viewportManager = viewportManagerRef.current;
    if (!canvas || !viewportManager) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    debug.group('🖱️ Mouse Down Event');
    debug.log('Position:', { x, y });
    debug.log('Current Tool:', selectedDrawingTool);
    debug.log('DrawingEngine:', drawingEngineRef.current ? 'Ready' : 'Not initialized');

    // 让DrawingEngine处理绘图工具
    if (drawingEngineRef.current) {
      drawingEngineRef.current.handleMouseDown(x, y, e.button);
    }
    
    // ✅ 如果不是select工具，阻止图表平移（无论DrawingEngine是否就绪）
    if (selectedDrawingTool !== 'select') {
      debug.log('🚫 Drawing tool active - blocking pan interaction');
      debug.groupEnd();
      return; // 直接返回，不设置 isDragging
    }
    
    debug.groupEnd();
    
    // ✅ 只有在 select 工具时才会执行到这里
    debug.log('Enabling pan mode');
    viewportManager.startPan(x);
    setIsDragging(true);
    setDragStartX(x);
    setDragStartY(y);
    setIsPanning(true);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && drawingEngineRef.current) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      drawingEngineRef.current.handleMouseUp(x, y);
    }
    
    viewportManagerRef.current?.endPan();
    setIsDragging(false);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const viewportManager = viewportManagerRef.current;
    if (!canvas || !viewportManager) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // ========== TradingView标准触控板手势 ==========
    // 主要方向判断
    const absDeltaX = Math.abs(e.deltaX);
    const absDeltaY = Math.abs(e.deltaY);
    const isHorizontalScroll = absDeltaX > absDeltaY;
    const isShiftPressed = e.shiftKey;
    
    console.log('[handleWheel] Gesture detected:', {
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      isHorizontalScroll,
      isShiftPressed,
      mouseX: x,
    });
    
    // ========== 手势行为映射 ==========
    // 正常情况：横向滚动=平移，纵向滚动=缩放
    // Shift情况：行为反转
    const shouldPan = (isHorizontalScroll && !isShiftPressed) || (!isHorizontalScroll && isShiftPressed);
    
    if (shouldPan) {
      // ========== 平移模式 ==========
      // 使用deltaX（或deltaY如果按了Shift）
      const panDelta = isShiftPressed ? e.deltaY : e.deltaX;
      
      // 计算平移量（像素 → barIndex）
      const currentState = viewportManager.getState();
      const visibleBars = currentState.visibleEnd - currentState.visibleStart;
      const pixelsPerBar = currentState.widthPx / visibleBars;
      const barsDelta = panDelta / pixelsPerBar;
      
      // ✅ 使用新的panBy() API - 直接平移
      viewportManager.panBy(barsDelta);
      
      console.log('[handleWheel] Pan applied:', {
        panDelta,
        barsDelta,
        pixelsPerBar,
      });
      
    } else {
      // ========== 缩放模式 ==========
      // 使用deltaY（或deltaX如果按了Shift）
      const zoomDelta = isShiftPressed ? e.deltaX : e.deltaY;
      
      // ✅ 使用新的wheelZoom API
      viewportManager.wheelZoom(x, zoomDelta);
      
      console.log('[handleWheel] Zoom applied:', {
        zoomDelta,
        mouseX: x,
      });
    }
    
    // 更新state
    const newState = viewportManager.getState();
    
    console.log('[handleWheel] New state:', {
      visibleStart: newState.visibleStart,
      visibleEnd: newState.visibleEnd,
      priceMin: newState.priceMin,
      priceMax: newState.priceMax,
    });
    
    setViewportState(newState);
  };

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setSelectedPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const handleChartTypeChange = (newType: ChartType) => {
    setSelectedChartType(newType);
    onChartTypeChange?.(newType);
  };

  const periods: TimePeriod[] = ['1D', '5D', '1M', '3M', '6M', '1Y', 'YTD'];
  
  // 图表类型分类
  interface ChartTypeCategory {
    category: string;
    types: { id: ChartType; label: string; IconComponent: React.ComponentType<{ className?: string; size?: number }> }[];
  }

  const chartTypeCategories: ChartTypeCategory[] = [
    {
      category: '主图一',
      types: [
        { id: 'bars', label: '柱状图', IconComponent: BarsIcon },
        { id: 'candlestick', label: '蜡烛图', IconComponent: CandlestickIcon },
        { id: 'hollow-candles', label: '空心蜡烛', IconComponent: HollowCandlesIcon },
      ]
    },
    {
      category: '主图二',
      types: [
        { id: 'line', label: '折线图', IconComponent: LineIcon },
        { id: 'line-markers', label: '标记线图', IconComponent: LineMarkersIcon },
        { id: 'step-line', label: '阶梯线图', IconComponent: StepLineIcon },
      ]
    },
    {
      category: '主图三',
      types: [
        { id: 'area', label: '面积图', IconComponent: AreaIcon },
        { id: 'baseline', label: '基线图', IconComponent: BaselineIcon },
      ]
    },
  ];

  // 绘图工具分类
  interface DrawingToolCategory {
    category: string;
    shortcut?: string;
    tools: {
      id: DrawingToolId;
      label: string;
      IconComponent: React.ComponentType<{ className?: string; size?: number }>;
      shortcut?: string;
    }[];
  }

  const drawingToolCategories: DrawingToolCategory[] = [
    {
      category: 'SELECTOR',
      tools: [
        { id: 'select', label: '选择', IconComponent: SelectIcon },
      ]
    },
    {
      category: 'LINES',
      tools: [
        { id: 'trendline', label: '趋势线', IconComponent: TrendLineIcon, shortcut: '⌘T' },
        { id: 'ray', label: '射线', IconComponent: RayIcon },
        { id: 'hline', label: '水平线', IconComponent: HorizontalLineIcon, shortcut: '⌘H' },
        { id: 'vline', label: '垂直线', IconComponent: VerticalLineIcon, shortcut: '⌘V' },
        { id: 'arrow', label: '箭头', IconComponent: ArrowIcon },
      ]
    },
    {
      category: 'SHAPES',
      tools: [
        { id: 'rect', label: '矩形', IconComponent: RectangleIcon },
      ]
    },
    {
      category: 'FIBONACCI',
      tools: [
        { id: 'fib', label: '斐波那契回撤', IconComponent: FibonacciIcon, shortcut: '⌘F' },
      ]
    },
    {
      category: 'CHANNELS',
      tools: [
        { id: 'parallel', label: '平行通道', IconComponent: ParallelChannelIcon },
      ]
    },
    {
      category: 'PITCHFORKS',
      tools: [
        { id: 'pitchfork', label: '安德鲁音叉', IconComponent: PitchforkIcon },
      ]
    },
    {
      category: 'OTHERS',
      tools: [
        { id: 'text', label: '文本标注', IconComponent: TextIcon, shortcut: '⌘N' },
      ]
    },
  ];

  // ========== 技术指标数据库 ==========
  interface TechnicalIndicator {
    id: string;
    name: string;
    category: string;
    description: string;
    popular?: boolean;
  }

  const technicalIndicators: TechnicalIndicator[] = [
    // 趋势指标
    { id: 'MA', name: '移动平均线 MA', category: '趋势指标', description: '简单移动平均线，显示价格趋势', popular: true },
    { id: 'EMA', name: '指数移动平均 EMA', category: '趋势指标', description: '对近期价格赋予更高权重的均线' },
    { id: 'MACD', name: 'MACD 指标', category: '趋势指标', description: '移动平均收敛发散，判断趋势强度', popular: true },
    { id: 'BOLL', name: '布林带 BOLL', category: '趋势指标', description: '价格波动区间，识别超买超卖', popular: true },
    { id: 'SAR', name: '抛物线转向 SAR', category: '趋势指标', description: '判断趋势反转点位' },
    
    // 动量指标
    { id: 'RSI', name: '相对强弱指标 RSI', category: '动量指标', description: '衡量价格变动速度和幅度', popular: true },
    { id: 'KDJ', name: 'KDJ 随机指标', category: '动量指标', description: '中国市场常用超买超卖指标', popular: true },
    { id: 'CCI', name: '顺势指标 CCI', category: '动量指标', description: '衡量价格偏离移动平均的程度' },
    { id: 'WR', name: '威廉指标 WR', category: '动量指标', description: '衡量超买超卖水平' },
    { id: 'ROC', name: '变动率指标 ROC', category: '动量指标', description: '价格变化速度' },
    
    // 成交量指标
    { id: 'VOL', name: '成交量 Volume', category: '成交量指标', description: '显示市场交易活跃度', popular: true },
    { id: 'OBV', name: '能量潮 OBV', category: '成交量指标', description: '累积成交量变化' },
    { id: 'VRSI', name: '量相对强弱 VRSI', category: '成交量指标', description: '基于成交量的RSI' },
    
    // 波动率指标
    { id: 'ATR', name: '真实波幅 ATR', category: '波动率指标', description: '衡量市场波动程度' },
    { id: 'STD', name: '标准差 STD', category: '波动率指标', description: '价格波动统计量' },
  ];

  const indicatorCategories = ['全部', '趋势指标', '动量指标', '成交量指标', '波动率指标'];
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');

  // 切换指标的函数
  const toggleIndicator = (indicatorId: string) => {
    const newSet = new Set(activeIndicators);
    if (newSet.has(indicatorId)) {
      newSet.delete(indicatorId);
    } else {
      newSet.add(indicatorId);
    }
    setActiveIndicators(newSet);
  };

  // 过滤指标列表
  const filteredIndicators = technicalIndicators.filter(ind => {
    const matchCategory = selectedCategory === '全部' || ind.category === selectedCategory;
    const matchSearch = searchQuery === '' || 
      ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div ref={containerRef} className={`relative h-full flex flex-col ${className}`}>
      {/* TradingView风格顶部工具栏 */}
      {showControls && (
        <div className="flex items-center justify-between mb-3 px-3 py-2 bg-[#0D1B2E]/60 border border-[#1E3A5F]/40 rounded">
          {/* 左侧：股票信息 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-500">SYMBOL</span>
              <span className="text-sm font-mono text-white">{symbol}</span>
            </div>
            
            {/* 周期选择 - TradingView风格 */}
            <div className="flex gap-1">
              {periods.map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    selectedPeriod === p
                      ? 'bg-[#0ea5e9] text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 右侧：功能按钮 */}
          <div className="flex items-center gap-2">
            {/* 图表类型按钮 */}
            <button
              onClick={() => setShowChartTypeSelector(true)}
              className="px-3 py-1 rounded text-xs font-mono text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40 transition-colors border-r border-[#1E3A5F] pr-3"
            >
              图表类型
            </button>

            {/* 指标按钮 */}
            <button
              onClick={() => setShowIndicatorSelector(true)}
              className="px-3 py-1 rounded text-xs font-mono text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40 transition-colors"
            >
              技术指标
            </button>

            {/* 关闭按钮 */}
            {onClose && (
              <button
                onClick={onClose}
                className="px-2 py-1 text-xs font-mono text-gray-400 hover:text-[#f97316] transition-colors"
                title="退出全屏 (ESC)"
              >
                ✕ 关闭
              </button>
            )}
          </div>
        </div>
      )}

      {/* 主图表容器 - TradingView布局 */}
      <div className="relative flex flex-1 min-h-0">
        {/* 左侧绘图工具栏 - TradingView专业风格（分类展开面板） */}
        {enableDrawing && (
          <div className="flex" data-tool-panel>
            {/* 主工具列 */}
            <div className="flex flex-col bg-[#0A1929] border-r border-[#1E3A5F]/50" style={{ width: '48px' }}>
              {drawingToolCategories.map((category, catIndex) => {
                // 获取该类别的第一个工具作为代表图标
                const RepresentativeIcon = category.tools[0].IconComponent;
                const isCategoryActive = category.tools.some(t => t.id === selectedDrawingTool);
                const isCategoryExpanded = expandedToolCategory === category.category;
                
                return (
                  <div key={catIndex} className="relative">
                    <button
                      onClick={() => {
                        if (category.category === 'SELECTOR') {
                          setSelectedDrawingTool('select');
                          setExpandedToolCategory(null);
                        } else {
                          setExpandedToolCategory(isCategoryExpanded ? null : category.category);
                        }
                      }}
                      className={`w-12 h-12 flex items-center justify-center transition-all group ${
                        isCategoryActive
                          ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]'
                          : 'text-gray-400 hover:text-white hover:bg-[#1e3a5f]/50'
                      } ${isCategoryExpanded ? 'bg-[#1e3a5f]/70 text-white' : ''}`}
                      title={category.category}
                    >
                      <RepresentativeIcon 
                        size={22} 
                        className={`transition-transform ${isCategoryExpanded ? '' : 'group-hover:scale-110'}`}
                      />
                    </button>
                    {/* 激活指示条 */}
                    {isCategoryExpanded && (
                      <div className="absolute left-full top-0 w-0.5 h-full bg-[#0ea5e9]" />
                    )}
                    {/* 分隔线 */}
                    {catIndex === 0 && (
                      <div className="h-px bg-[#1E3A5F]/30 mx-2" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* 展开的工具面板 */}
            {expandedToolCategory && (
              <div 
                className="absolute left-12 top-0 bottom-0 bg-[#0d1b2e]/95 backdrop-blur-sm border-r border-[#1E3A5F]/60 shadow-2xl z-50 overflow-y-auto"
                style={{ width: '240px' }}
              >
                {drawingToolCategories
                  .filter(cat => cat.category === expandedToolCategory)
                  .map((category) => (
                    <div key={category.category} className="py-3 px-2">
                      {/* 类别标题 */}
                      <div className="px-3 py-2 mb-2">
                        <h3 className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">
                          {category.category}
                        </h3>
                      </div>

                      {/* 工具列表 */}
                      <div className="space-y-0.5">
                        {category.tools.map((tool) => {
                          const IconComponent = tool.IconComponent;
                          const isSelected = selectedDrawingTool === tool.id;

                          return (
                            <button
                              key={tool.id}
                              onClick={() => {
                                setSelectedDrawingTool(tool.id);
                                // 选中后关闭面板
                                setExpandedToolCategory(null);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group ${
                                isSelected
                                  ? 'bg-[#0ea5e9] text-white shadow-md'
                                  : 'text-gray-300 hover:text-white hover:bg-[#1e3a5f]/70'
                              }`}
                            >
                              <div className={`flex-shrink-0 ${isSelected ? '' : 'group-hover:scale-110 transition-transform'}`}>
                                <IconComponent size={18} />
                              </div>
                              <span className="flex-1 text-left text-[13px] font-mono">{tool.label}</span>
                              {tool.shortcut && (
                                <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                                  isSelected ? 'text-white/70' : 'text-gray-500'
                                }`}>
                                  {tool.shortcut}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* 图表区域容器 */}
        <div className="flex-1 h-full min-h-0">
          {/* 加载状态 */}
          {loading && chartData.length === 0 && (
            <div 
              className="h-full flex items-center justify-center bg-[#0A1929] rounded border border-[#1E3A5F]/40"
            >
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-[#1E3A5F] border-t-[#0ea5e9] rounded-full animate-spin mb-3"></div>
                <div className="text-sm font-mono text-gray-400">Loading chart data for {symbol}...</div>
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {!loading && error && chartData.length === 0 && (
            <div 
              className="h-full flex items-center justify-center bg-[#0A1929] rounded border border-[#EF4444]/40"
            >
              <div className="text-center max-w-md px-6">
                <div className="text-[#EF4444] text-2xl mb-3">⚠</div>
                <div className="text-sm font-mono text-gray-300 mb-2">Failed to load chart data</div>
                <div className="text-xs font-mono text-gray-500">{error}</div>
              </div>
            </div>
          )}

          {/* 空数据状态 */}
          {!loading && !error && chartData.length === 0 && (
            <div 
              className="h-full flex items-center justify-center bg-[#0A1929] rounded border border-[#1E3A5F]/40"
            >
              <div className="text-center">
                <div className="text-gray-500 text-4xl mb-3">📊</div>
                <div className="text-sm font-mono text-gray-400">No data available for {symbol}</div>
                <div className="text-xs font-mono text-gray-500 mt-2">Period: {selectedPeriod}</div>
              </div>
            </div>
          )}

          {/* 图表画布 */}
          {chartData.length > 0 && (
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              className="w-full h-full cursor-crosshair"
            />
          )}
        </div>
      </div>

      {/* ========== 图表类型选择器弹窗 ========== */}
      {showChartTypeSelector && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowChartTypeSelector(false)}
        >
          <div 
            className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg w-[400px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E3A5F]">
              <div>
                <h3 className="text-base font-mono text-white">图表类型</h3>
                <p className="text-xs font-mono text-gray-500 mt-1">选择主图显示方式</p>
              </div>
              <button
                onClick={() => setShowChartTypeSelector(false)}
                className="text-gray-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* 图表类型列表 */}
            <div className="flex-1 overflow-y-auto max-h-[500px]">
              {chartTypeCategories.map((category, catIndex) => (
                <div key={catIndex} className="border-b border-[#1E3A5F]/30 last:border-b-0">
                  {/* 分类标题 */}
                  <div className="px-5 py-3 bg-[#0A1628]">
                    <h4 className="text-xs font-mono text-gray-400 uppercase">{category.category}</h4>
                  </div>
                  
                  {/* 类型列表 */}
                  <div className="py-2">
                    {category.types.map((type) => {
                      const IconComponent = type.IconComponent;
                      return (
                        <button
                          key={type.id}
                          onClick={() => {
                            handleChartTypeChange(type.id);
                            setShowChartTypeSelector(false);
                          }}
                          className={`w-full px-5 py-3 flex items-center gap-3 transition-colors ${
                            selectedChartType === type.id
                              ? 'bg-[#1E3A5F]/60 text-white'
                              : 'text-gray-300 hover:bg-[#1E3A5F]/30'
                          }`}
                        >
                          <div className="w-8 h-8 flex items-center justify-center">
                            <IconComponent size={28} />
                          </div>
                          <span className="text-sm font-mono">{type.label}</span>
                          {selectedChartType === type.id && (
                            <span className="ml-auto text-[#0EA5E9]">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== 技术指标选择器弹窗 ========== */}
      {showIndicatorSelector && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowIndicatorSelector(false)}
        >
          <div 
            className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg w-[700px] max-h-[600px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E3A5F]">
              <div>
                <h3 className="text-base font-mono text-white">技术指标</h3>
                <p className="text-xs font-mono text-gray-500 mt-1">选择要显示的技术指标</p>
              </div>
              <button
                onClick={() => setShowIndicatorSelector(false)}
                className="text-gray-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* 搜索栏 */}
            <div className="px-5 py-4 border-b border-[#1E3A5F]/40">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索指标... (例如: MA, MACD, RSI)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0A1929] border border-[#1E3A5F]/60 rounded text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#0ea5e9]"
                />
                <span className="absolute right-3 top-2.5 text-gray-500 text-sm">🔍</span>
              </div>
            </div>

            {/* 分类导航 */}
            <div className="px-5 py-3 border-b border-[#1E3A5F]/40 overflow-x-auto">
              <div className="flex gap-2">
                {indicatorCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#0ea5e9] text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 指标列表 */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-2">
                {filteredIndicators.map(indicator => {
                  const isActive = activeIndicators.has(indicator.id);
                  return (
                    <div
                      key={indicator.id}
                      onClick={() => toggleIndicator(indicator.id)}
                      className={`p-3 rounded border cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#0ea5e9]/10 border-[#0ea5e9] hover:bg-[#0ea5e9]/20'
                          : 'bg-[#0A1929]/40 border-[#1E3A5F]/40 hover:border-[#1E3A5F] hover:bg-[#0A1929]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-mono ${
                              isActive ? 'text-[#0ea5e9]' : 'text-white'
                            }`}>
                              {indicator.name}
                            </span>
                            {indicator.popular && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-mono rounded">
                                热门
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-gray-500 mt-1">
                            {indicator.description}
                          </p>
                        </div>
                        <div className={`ml-3 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? 'bg-[#0ea5e9] border-[#0ea5e9]'
                            : 'bg-transparent border-gray-600'
                        }`}>
                          {isActive && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 无结果提示 */}
                {filteredIndicators.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500 text-4xl mb-3">🔍</div>
                    <div className="text-sm font-mono text-gray-400">未找到匹配的指标</div>
                    <div className="text-xs font-mono text-gray-600 mt-1">请尝试其他搜索词或分类</div>
                  </div>
                )}
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="px-5 py-4 border-t border-[#1E3A5F]/40 flex items-center justify-between">
              <div className="text-xs font-mono text-gray-500">
                已选择 {activeIndicators.size} 个指标
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveIndicators(new Set())}
                  className="px-4 py-2 rounded text-xs font-mono text-gray-400 hover:text-white hover:bg-[#1e3a5f]/40 transition-colors"
                >
                  清空全部
                </button>
                <button
                  onClick={() => setShowIndicatorSelector(false)}
                  className="px-4 py-2 rounded text-xs font-mono bg-[#0ea5e9] text-white hover:bg-[#0ea5e9]/80 transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ========== Bloomberg Terminal风格调试面板 ========== */}
      {debugMode && (
        <div className="absolute top-4 right-4 w-80 bg-[#0D1B2E]/95 border border-[#0EA5E9]/40 rounded-lg shadow-2xl backdrop-blur-sm z-[9999]">
          {/* 面板头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3A5F]/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#0EA5E9] rounded-full animate-pulse"></div>
              <span className="font-mono text-xs text-[#0EA5E9] tracking-wider">DEBUG PANEL</span>
            </div>
            <button
              onClick={() => {
                DEV_MODE.showDebugPanel = false;
                setDebugMode(false);
                window.dispatchEvent(new CustomEvent('chart-panel-toggle'));
              }}
              className="text-gray-400 hover:text-white text-xs font-mono"
            >
              ✕
            </button>
          </div>
          
          {/* 面板内容 */}
          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
            {/* 性能指标 */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-[#64748B] tracking-wider uppercase">Performance Metrics</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">FPS</span>
                  <span className={`text-xs font-mono ${perfMetrics.fps >= 50 ? 'text-[#10B981]' : perfMetrics.fps >= 30 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                    {perfMetrics.fps.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Render Time</span>
                  <span className="text-xs font-mono text-white">{perfMetrics.renderTime.toFixed(2)}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Frame Count</span>
                  <span className="text-xs font-mono text-white">{perfMetrics.frameCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Draw Calls</span>
                  <span className="text-xs font-mono text-white">{perfMetrics.drawCalls}</span>
                </div>
              </div>
            </div>
            
            {/* 分隔线 */}
            <div className="border-t border-[#1E3A5F]/40"></div>
            
            {/* 视图状态 */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-[#64748B] tracking-wider uppercase">Viewport State</div>
              <div className="space-y-1.5">
                {viewportState && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-gray-400">Visible Range</span>
                      <span className="text-xs font-mono text-white">
                        {Math.floor(viewportState.visibleStart)} - {Math.ceil(viewportState.visibleEnd)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-gray-400">Visible Bars</span>
                      <span className="text-xs font-mono text-white">
                        {Math.ceil(viewportState.visibleEnd - viewportState.visibleStart)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-gray-400">Bar Width</span>
                      <span className="text-xs font-mono text-white">
                        {(viewportState.widthPx / Math.ceil(viewportState.visibleEnd - viewportState.visibleStart)).toFixed(2)}px
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-gray-400">Zoom Level</span>
                      <span className="text-xs font-mono text-white">
                        {((chartData.length / Math.ceil(viewportState.visibleEnd - viewportState.visibleStart)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* 分隔线 */}
            <div className="border-t border-[#1E3A5F]/40"></div>
            
            {/* 数据统计 */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-[#64748B] tracking-wider uppercase">Data Statistics</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Total Bars</span>
                  <span className="text-xs font-mono text-white">{chartData.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Data Granularity</span>
                  <span className="text-xs font-mono text-white">{dataGranularity || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Symbol</span>
                  <span className="text-xs font-mono text-[#0EA5E9]">{symbol || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Period</span>
                  <span className="text-xs font-mono text-white">{selectedPeriod}</span>
                </div>
              </div>
            </div>
            
            {/* 分隔线 */}
            <div className="border-t border-[#1E3A5F]/40"></div>
            
            {/* 交互状态 */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-[#64748B] tracking-wider uppercase">Interaction State</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Chart Type</span>
                  <span className="text-xs font-mono text-white">{selectedChartType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Drawing Tool</span>
                  <span className="text-xs font-mono text-[#8B5CF6]">{selectedDrawingTool}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Crosshair</span>
                  <span className="text-xs font-mono text-white">{crosshairPos ? 'ON' : 'OFF'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Drawing Count</span>
                  <span className="text-xs font-mono text-white">
                    {drawingEngineRef.current?.getObjects().length || 0}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 分隔线 */}
            <div className="border-t border-[#1E3A5F]/40"></div>
            
            {/* 技术指标 */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-[#64748B] tracking-wider uppercase">Active Indicators</div>
              <div className="space-y-1">
                {activeIndicators.size > 0 ? (
                  Array.from(activeIndicators).map((id) => (
                    <div key={id} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#10B981] rounded-full"></div>
                      <span className="text-xs font-mono text-gray-300">{id.toUpperCase()}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs font-mono text-gray-500">None</span>
                )}
              </div>
            </div>
            
            {/* 分隔线 */}
            <div className="border-t border-[#1E3A5F]/40"></div>
            
            {/* Canvas信息 */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-[#64748B] tracking-wider uppercase">Canvas Info</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Width</span>
                  <span className="text-xs font-mono text-white">{canvasRef.current?.width || 0}px</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Height</span>
                  <span className="text-xs font-mono text-white">{canvasRef.current?.height || 0}px</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">Device Pixel Ratio</span>
                  <span className="text-xs font-mono text-white">{window.devicePixelRatio}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 面板底部提示 */}
          <div className="px-4 py-2 border-t border-[#1E3A5F]/40 bg-[#0D1B2E]/60">
            <div className="text-[10px] font-mono text-gray-500 text-center">
              Press <span className="text-[#0EA5E9]">Ctrl+Shift+V</span> to toggle
            </div>
          </div>
        </div>
      )}
    </div>
  );
}