/**
 * DataTransformService - 数据转换服务
 * 
 * 功能：
 * - K线数据格式转换
 * - 时间序列重采样（1min→5min→1D等）
 * - 复权价格计算
 * - 数据标准化和归一化
 * - CSV/JSON格式互转
 * - TradingView格式转换
 */

import { OHLCV } from './HistoricalDataService';

// ============================================================================
// Types
// ============================================================================

export interface TimeSeriesData {
  timestamp: number;
  value: number;
}

export interface ResampleConfig {
  method: 'last' | 'mean' | 'sum' | 'max' | 'min' | 'first';
  fillMethod?: 'forward' | 'backward' | 'linear' | 'zero';
}

export interface NormalizeConfig {
  method: 'minmax' | 'zscore' | 'decimal' | 'log';
  range?: [number, number]; // for minmax
}

export interface TradingViewBar {
  time: number;           // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CSVRow {
  [key: string]: string | number;
}

// ============================================================================
// Data Transform Service
// ============================================================================

export class DataTransformService {
  /**
   * OHLCV数据重采样（时间粒度转换）
   * 例如：1min → 5min, 1D → 1W
   */
  resampleOHLCV(
    data: OHLCV[],
    targetInterval: number // milliseconds
  ): OHLCV[] {
    if (data.length === 0) return [];

    const resampled: OHLCV[] = [];
    let currentBucket: OHLCV[] = [];
    let bucketStartTime = data[0].timestamp;

    data.forEach((candle, index) => {
      // 检查是否需要开始新的bucket
      if (candle.timestamp >= bucketStartTime + targetInterval) {
        if (currentBucket.length > 0) {
          resampled.push(this.aggregateOHLCV(currentBucket, bucketStartTime));
        }
        currentBucket = [];
        bucketStartTime = Math.floor(candle.timestamp / targetInterval) * targetInterval;
      }

      currentBucket.push(candle);

      // 最后一根K线
      if (index === data.length - 1 && currentBucket.length > 0) {
        resampled.push(this.aggregateOHLCV(currentBucket, bucketStartTime));
      }
    });

    return resampled;
  }

  /**
   * 聚合多根K线为一根
   */
  private aggregateOHLCV(candles: OHLCV[], timestamp: number): OHLCV {
    const open = candles[0].open;
    const close = candles[candles.length - 1].close;
    const high = Math.max(...candles.map(c => c.high));
    const low = Math.min(...candles.map(c => c.low));
    const volume = candles.reduce((sum, c) => sum + c.volume, 0);
    const turnover = candles.reduce((sum, c) => sum + (c.turnover || 0), 0);

    return {
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      turnover,
      changePercent: ((close - open) / open) * 100,
    };
  }

  /**
   * 计算前复权价格
   */
  adjustForward(
    data: OHLCV[],
    dividends: Array<{ date: number; ratio: number }> = []
  ): OHLCV[] {
    if (dividends.length === 0) return data;

    const adjusted = [...data];
    let cumulativeFactor = 1;

    // 从最新到最旧
    for (let i = adjusted.length - 1; i >= 0; i--) {
      const candle = adjusted[i];
      
      // 检查是否有分红
      const dividend = dividends.find(d => d.date === candle.timestamp);
      if (dividend) {
        cumulativeFactor *= (1 - dividend.ratio);
      }

      // 应用复权因子
      adjusted[i] = {
        ...candle,
        open: candle.open * cumulativeFactor,
        high: candle.high * cumulativeFactor,
        low: candle.low * cumulativeFactor,
        close: candle.close * cumulativeFactor,
      };
    }

    return adjusted;
  }

  /**
   * 计算后复权价格
   */
  adjustBackward(
    data: OHLCV[],
    dividends: Array<{ date: number; ratio: number }> = []
  ): OHLCV[] {
    if (dividends.length === 0) return data;

    const adjusted = [...data];
    let cumulativeFactor = 1;

    // 从最旧到最新
    for (let i = 0; i < adjusted.length; i++) {
      const candle = adjusted[i];

      // 应用复权因子
      adjusted[i] = {
        ...candle,
        open: candle.open * cumulativeFactor,
        high: candle.high * cumulativeFactor,
        low: candle.low * cumulativeFactor,
        close: candle.close * cumulativeFactor,
      };

      // 检查是否有分红
      const dividend = dividends.find(d => d.date === candle.timestamp);
      if (dividend) {
        cumulativeFactor *= (1 + dividend.ratio);
      }
    }

    return adjusted;
  }

  /**
   * 提取收盘价序列
   */
  extractClosePrices(data: OHLCV[]): number[] {
    return data.map(candle => candle.close);
  }

  /**
   * 提取成交量序列
   */
  extractVolumes(data: OHLCV[]): number[] {
    return data.map(candle => candle.volume);
  }

  /**
   * 提取时间戳序列
   */
  extractTimestamps(data: OHLCV[]): number[] {
    return data.map(candle => candle.timestamp);
  }

  /**
   * 时间序列数据标准化
   */
  normalize(data: number[], config: NormalizeConfig): number[] {
    const { method, range = [0, 1] } = config;

    switch (method) {
      case 'minmax': {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const [targetMin, targetMax] = range;
        
        if (max === min) return data.map(() => (targetMin + targetMax) / 2);
        
        return data.map(value => 
          ((value - min) / (max - min)) * (targetMax - targetMin) + targetMin
        );
      }

      case 'zscore': {
        const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
        const std = Math.sqrt(variance);
        
        if (std === 0) return data.map(() => 0);
        
        return data.map(value => (value - mean) / std);
      }

      case 'decimal': {
        const maxAbs = Math.max(...data.map(Math.abs));
        if (maxAbs === 0) return data;
        
        return data.map(value => value / maxAbs);
      }

      case 'log': {
        return data.map(value => Math.log(Math.max(value, 1e-10)));
      }

      default:
        return data;
    }
  }

  /**
   * 计算收益率序列
   */
  calculateReturns(prices: number[], method: 'simple' | 'log' = 'simple'): number[] {
    const returns: number[] = [0]; // 第一个值设为0

    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1];
      const currentPrice = prices[i];

      if (method === 'simple') {
        returns.push((currentPrice - prevPrice) / prevPrice);
      } else {
        returns.push(Math.log(currentPrice / prevPrice));
      }
    }

    return returns;
  }

  /**
   * 计算累计收益率
   */
  calculateCumulativeReturns(returns: number[]): number[] {
    const cumulative: number[] = [];
    let product = 1;

    returns.forEach(ret => {
      product *= (1 + ret);
      cumulative.push(product - 1);
    });

    return cumulative;
  }

  /**
   * 填充缺失值
   */
  fillMissing(data: number[], method: 'forward' | 'backward' | 'linear' | 'zero' = 'forward'): number[] {
    const filled = [...data];

    switch (method) {
      case 'forward': {
        let lastValid = filled[0];
        for (let i = 0; i < filled.length; i++) {
          if (isNaN(filled[i]) || filled[i] === null || filled[i] === undefined) {
            filled[i] = lastValid;
          } else {
            lastValid = filled[i];
          }
        }
        break;
      }

      case 'backward': {
        let lastValid = filled[filled.length - 1];
        for (let i = filled.length - 1; i >= 0; i--) {
          if (isNaN(filled[i]) || filled[i] === null || filled[i] === undefined) {
            filled[i] = lastValid;
          } else {
            lastValid = filled[i];
          }
        }
        break;
      }

      case 'linear': {
        for (let i = 0; i < filled.length; i++) {
          if (isNaN(filled[i]) || filled[i] === null || filled[i] === undefined) {
            // 找到前后有效值
            let prevIdx = i - 1;
            let nextIdx = i + 1;

            while (prevIdx >= 0 && (isNaN(filled[prevIdx]) || filled[prevIdx] === null)) {
              prevIdx--;
            }
            while (nextIdx < filled.length && (isNaN(filled[nextIdx]) || filled[nextIdx] === null)) {
              nextIdx++;
            }

            if (prevIdx >= 0 && nextIdx < filled.length) {
              const prevVal = filled[prevIdx];
              const nextVal = filled[nextIdx];
              const ratio = (i - prevIdx) / (nextIdx - prevIdx);
              filled[i] = prevVal + (nextVal - prevVal) * ratio;
            } else if (prevIdx >= 0) {
              filled[i] = filled[prevIdx];
            } else if (nextIdx < filled.length) {
              filled[i] = filled[nextIdx];
            }
          }
        }
        break;
      }

      case 'zero': {
        for (let i = 0; i < filled.length; i++) {
          if (isNaN(filled[i]) || filled[i] === null || filled[i] === undefined) {
            filled[i] = 0;
          }
        }
        break;
      }
    }

    return filled;
  }

  /**
   * 转换为TradingView格式
   */
  toTradingViewFormat(data: OHLCV[]): TradingViewBar[] {
    return data.map(candle => ({
      time: Math.floor(candle.timestamp / 1000), // 转换为秒
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));
  }

  /**
   * 从TradingView格式转换
   */
  fromTradingViewFormat(data: TradingViewBar[]): OHLCV[] {
    return data.map(bar => ({
      timestamp: bar.time * 1000, // 转换为毫秒
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume || 0,
      changePercent: ((bar.close - bar.open) / bar.open) * 100,
    }));
  }

  /**
   * 转换为CSV格式
   */
  toCSV(data: OHLCV[], includeHeader: boolean = true): string {
    const headers = ['timestamp', 'date', 'open', 'high', 'low', 'close', 'volume', 'changePercent'];
    const rows: string[] = [];

    if (includeHeader) {
      rows.push(headers.join(','));
    }

    data.forEach(candle => {
      const date = new Date(candle.timestamp).toISOString();
      const row = [
        candle.timestamp,
        date,
        candle.open.toFixed(2),
        candle.high.toFixed(2),
        candle.low.toFixed(2),
        candle.close.toFixed(2),
        candle.volume,
        (candle.changePercent || 0).toFixed(2),
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * 从CSV格式解析
   */
  fromCSV(csv: string, hasHeader: boolean = true): OHLCV[] {
    const lines = csv.trim().split('\n');
    const data: OHLCV[] = [];

    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',');
      
      if (parts.length >= 7) {
        data.push({
          timestamp: parseInt(parts[0]),
          open: parseFloat(parts[2]),
          high: parseFloat(parts[3]),
          low: parseFloat(parts[4]),
          close: parseFloat(parts[5]),
          volume: parseInt(parts[6]),
          changePercent: parts.length > 7 ? parseFloat(parts[7]) : undefined,
        });
      }
    }

    return data;
  }

  /**
   * 转换为JSON格式
   */
  toJSON(data: OHLCV[], pretty: boolean = false): string {
    return JSON.stringify(data, null, pretty ? 2 : 0);
  }

  /**
   * 从JSON格式解析
   */
  fromJSON(json: string): OHLCV[] {
    try {
      return JSON.parse(json);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return [];
    }
  }

  /**
   * 数据降采样（减少数据点数量以提升渲染性能）
   */
  downsample(data: OHLCV[], targetPoints: number): OHLCV[] {
    if (data.length <= targetPoints) return data;

    const result: OHLCV[] = [];
    const step = data.length / targetPoints;

    for (let i = 0; i < targetPoints; i++) {
      const startIdx = Math.floor(i * step);
      const endIdx = Math.min(Math.floor((i + 1) * step), data.length);
      const slice = data.slice(startIdx, endIdx);

      if (slice.length > 0) {
        result.push(this.aggregateOHLCV(slice, slice[0].timestamp));
      }
    }

    return result;
  }

  /**
   * 计算移动窗口统计
   */
  rollingWindow<T>(
    data: number[],
    windowSize: number,
    operation: (window: number[]) => number
  ): number[] {
    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < windowSize - 1) {
        result.push(NaN);
      } else {
        const window = data.slice(i - windowSize + 1, i + 1);
        result.push(operation(window));
      }
    }

    return result;
  }

  /**
   * 计算百分位数
   */
  percentile(data: number[], p: number): number {
    const sorted = [...data].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * 数据对齐（按时间戳对齐多个数据序列）
   */
  alignTimeSeries(
    series: Array<{ timestamp: number; value: number }[]>
  ): Map<number, number[]> {
    const aligned = new Map<number, number[]>();

    // 收集所有时间戳
    const allTimestamps = new Set<number>();
    series.forEach(s => s.forEach(point => allTimestamps.add(point.timestamp)));

    // 对每个时间戳，收集所有序列的值
    allTimestamps.forEach(timestamp => {
      const values: number[] = [];
      series.forEach(s => {
        const point = s.find(p => p.timestamp === timestamp);
        values.push(point ? point.value : NaN);
      });
      aligned.set(timestamp, values);
    });

    return aligned;
  }

  /**
   * 计算差分（用于平稳化时间序列）
   */
  diff(data: number[], order: number = 1): number[] {
    let result = [...data];

    for (let i = 0; i < order; i++) {
      const temp: number[] = [];
      for (let j = 1; j < result.length; j++) {
        temp.push(result[j] - result[j - 1]);
      }
      result = temp;
    }

    return result;
  }

  /**
   * 滑动平均平滑
   */
  smooth(data: number[], windowSize: number): number[] {
    return this.rollingWindow(data, windowSize, window => {
      return window.reduce((sum, val) => sum + val, 0) / window.length;
    });
  }

  /**
   * 指数加权移动平均（EMA）
   */
  ema(data: number[], alpha: number = 0.3): number[] {
    if (data.length === 0) return [];

    const result: number[] = [data[0]];

    for (let i = 1; i < data.length; i++) {
      result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
    }

    return result;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let dataTransformServiceInstance: DataTransformService | null = null;

export function getDataTransformService(): DataTransformService {
  if (!dataTransformServiceInstance) {
    dataTransformServiceInstance = new DataTransformService();
  }
  return dataTransformServiceInstance;
}

export default DataTransformService;
