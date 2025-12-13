/**
 * Chart Helper Functions - K线图辅助函数
 * TradingView标准优化版本 + Bloomberg级轴计算集成
 */

import {
  calculateProfessionalTimeAxis as calcProfessionalTimeAxis,
  calculatePriceAxis,
  calculateGridLines,
  type TimeAxisResult,
  type PriceAxisResult,
  type GridConfig,
  type TimePeriod,
} from './professionalAxisCalculator';

export interface CandleData {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// 专业级轴计算接口（导出给组件使用）
// ============================================================================

/**
 * 计算专业级X轴配置
 * Bloomberg/TradingView标准
 */
export function calculateProfessionalTimeAxis(
  data: CandleData[],
  period: string,
  canvasWidth: number,
  visibleRange?: { start: number; end: number }
): TimeAxisResult {
  if (!data || data.length === 0) {
    return {
      ticks: [],
      separators: [],
      interval: '1D' as const,
      format: 'MM/DD',
    };
  }
  
  // 直接传递数据和可见范围给底层函数
  return calcProfessionalTimeAxis(
    data,
    period as TimePeriod,
    canvasWidth,
    visibleRange
  );
}

/**
 * 计算专业级Y轴配置
 * Bloomberg/TradingView标准
 */
export function calculateProfessionalPriceAxis(
  data: CandleData[],
  canvasHeight: number,
  mode: 'linear' | 'log' | 'percentage' = 'linear'
): PriceAxisResult {
  if (!data || data.length === 0) {
    return {
      ticks: [],
      min: 0,
      max: 100,
      step: 10,
      decimals: 2,
      niceMin: 0,
      niceMax: 100,
    };
  }
  
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const dataMin = Math.min(...lows);
  const dataMax = Math.max(...highs);
  
  return calculatePriceAxis(
    dataMin,
    dataMax,
    canvasHeight,
    50, // 最小刻度间距50px
    mode
  );
}

/**
 * 计算专业级网格配置
 * Bloomberg标准
 */
export function calculateProfessionalGrid(
  data: CandleData[],
  canvasWidth: number,
  canvasHeight: number,
  period: string
): GridConfig {
  const priceAxis = calculateProfessionalPriceAxis(data, canvasHeight);
  const timeAxis = calculateProfessionalTimeAxis(data, period, canvasWidth);
  
  return calculateGridLines(priceAxis, timeAxis);
}

// ============================================================================
// 向后兼容的旧函数（保留以支持现有代码）
// ============================================================================

/**
 * 时间格式化 - 根据时间周期智能选择格式（优化版）
 * 
 * 目标：5-9个主刻度，清晰的时间节奏感
 */
export function formatTimeAxis(
  timestamp: number,
  period: string,
  index: number,
  dataLength: number
): string {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();

  // 计算显示间隔（确保5-9个刻度）
  const targetTicks = 7;
  const interval = Math.max(Math.floor(dataLength / targetTicks), 1);

  switch (period) {
    case '1D': // 日内 - 显示小时:分钟
      if (index % interval === 0 || index === dataLength - 1) {
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }
      return '';

    case '5D': // 5天 - 显示月-日
      if (index % interval === 0 || index === dataLength - 1) {
        return `${month}-${String(day).padStart(2, '0')}`;
      }
      return '';

    case '1M': // 1个月 - 显示月-日
      if (index % Math.max(Math.floor(dataLength / 6), 1) === 0 || index === dataLength - 1) {
        return `${month}-${String(day).padStart(2, '0')}`;
      }
      return '';

    case '3M': // 3个月 - 显示月-日
      if (index % Math.max(Math.floor(dataLength / 7), 1) === 0 || index === dataLength - 1) {
        return `${month}-${String(day).padStart(2, '0')}`;
      }
      return '';

    case '6M': // 6个月 - 显示月份
      if (index % Math.max(Math.floor(dataLength / 7), 1) === 0 || index === dataLength - 1) {
        return `${date.getFullYear()}-${String(month).padStart(2, '0')}`;
      }
      return '';

    case '1Y': // 1年 - 显示月份
      if (index % Math.max(Math.floor(dataLength / 8), 1) === 0 || index === dataLength - 1) {
        return `${String(month).padStart(2, '0')}月`;
      }
      return '';

    case 'YTD': // YTD - 显示月份
      if (index % Math.max(Math.floor(dataLength / 8), 1) === 0 || index === dataLength - 1) {
        return `${String(month).padStart(2, '0')}月`;
      }
      return '';

    default:
      return `${month}-${day}`;
  }
}

/**
 * 完整时间格式化 - 用于Tooltip
 */
export function formatFullTime(timestamp: number, period: string): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  if (period === '1D' || period === '5D') {
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
  return `${year}-${month}-${day}`;
}

/**
 * 价格格式化
 */
export function formatPrice(value: number): string {
  if (value >= 1000) {
    return value.toFixed(1);
  } else if (value >= 100) {
    return value.toFixed(2);
  } else if (value >= 10) {
    return value.toFixed(2);
  } else {
    return value.toFixed(3);
  }
}

/**
 * 成交量格式化
 */
export function formatVolume(value: number): string {
  if (value >= 1e8) {
    return (value / 1e8).toFixed(2) + '亿';
  } else if (value >= 1e4) {
    return (value / 1e4).toFixed(1) + '万';
  } else {
    return value.toFixed(0);
  }
}

/**
 * 计算价格范围（带10%留白）
 */
export function calculatePriceRange(data: CandleData[]): [number, number] {
  if (!data || data.length === 0) return [0, 100];

  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const padding = (max - min) * 0.1;

  return [min - padding, max + padding];
}

/**
 * 计算成交量范围
 */
export function calculateVolumeRange(data: CandleData[]): [number, number] {
  if (!data || data.length === 0) return [0, 1000000];

  const volumes = data.map(d => d.volume);
  const max = Math.max(...volumes);

  return [0, max * 1.2];
}

/**
 * 计算移动平均线
 */
export function calculateMA(data: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }

  return result;
}

/**
 * 生成真实感的K线数据
 * 
 * 优化逻辑：
 * - 1D/5D：生成分钟K线（更密集）
 * - 1M/3M：生成日K线（标准密度）
 * - 6M/1Y/YTD：生成日K线但适当增加
 * - 长期：可以生成周K或月K
 */
export function generateRealisticKlineData(
  symbol: string,
  period: string,
  basePrice: number = 100
): CandleData[] {
  const now = Date.now();
  let dataPoints = 0;
  let interval = 0;

  // 根据周期确定K线粒度和数量（优化后）
  switch (period) {
    case '1D':
      dataPoints = 240;  // 240分钟（4小时交易）
      interval = 60 * 1000;  // 1分钟K
      break;
    case '5D':
      dataPoints = 240 * 5;  // 5天的分钟数
      interval = 60 * 1000;  // 1分钟K
      break;
    case '1M':
      dataPoints = 20;  // 20个交易日
      interval = 24 * 60 * 60 * 1000;  // 日K
      break;
    case '3M':
      dataPoints = 60;  // 60个交易日
      interval = 24 * 60 * 60 * 1000;  // 日K
      break;
    case '6M':
      dataPoints = 120;  // 120个交易日
      interval = 24 * 60 * 60 * 1000;  // 日K
      break;
    case '1Y':
      dataPoints = 240;  // 240个交易日
      interval = 24 * 60 * 60 * 1000;  // 日K
      break;
    case 'YTD':
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
      const daysSinceYearStart = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
      dataPoints = Math.max(daysSinceYearStart, 1);
      interval = 24 * 60 * 60 * 1000;  // 日K
      break;
    default:
      dataPoints = 30;
      interval = 24 * 60 * 60 * 1000;
  }

  const data: CandleData[] = [];
  let currentPrice = basePrice;

  // 根据symbol生成不同的趋势
  const trendFactor = (symbol.charCodeAt(0) % 10) / 10 - 0.5;
  const volatility = 0.02 + (symbol.charCodeAt(1) % 10) / 100;

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = now - (dataPoints - i - 1) * interval;

    // 模拟真实的价格波动
    const trend = trendFactor * 0.001;
    const randomWalk = (Math.random() - 0.5) * volatility;
    const priceChange = currentPrice * (trend + randomWalk);

    const open = currentPrice;
    const close = open + priceChange;

    // 生成高低价
    const highLowRange = Math.abs(priceChange) * (1 + Math.random());
    const high = Math.max(open, close) + highLowRange * Math.random();
    const low = Math.min(open, close) - highLowRange * Math.random();

    // 生成成交量（有一定相关性）
    const baseVolume = 1000000 + Math.random() * 5000000;
    const volumeMultiplier = 1 + Math.abs(priceChange / currentPrice) * 10;
    const volume = Math.floor(baseVolume * volumeMultiplier);

    data.push({
      timestamp,
      date: formatTimeAxis(timestamp, period, i, dataPoints),
      open: Math.max(open, 0.01),
      high: Math.max(high, 0.01),
      low: Math.max(low, 0.01),
      close: Math.max(close, 0.01),
      volume,
    });

    currentPrice = close;
  }

  return data;
}

/**
 * 根据股票代码获取基准价格
 */
export function getBasePriceForSymbol(symbol: string): number {
  const codeNum = parseInt(symbol.slice(0, 6)) || 0;

  if (symbol.startsWith('300')) {
    return 50 + (codeNum % 100);
  } else if (symbol.startsWith('688')) {
    return 80 + (codeNum % 200);
  } else if (symbol.startsWith('000') || symbol.startsWith('001')) {
    return 20 + (codeNum % 50);
  } else if (symbol.startsWith('600') || symbol.startsWith('601')) {
    return 15 + (codeNum % 40);
  } else {
    return 30 + (codeNum % 70);
  }
}