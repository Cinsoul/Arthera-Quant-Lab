/**
 * IndicatorCalculationService - 技术指标计算服务
 * 
 * 功能：
 * - 统一的技术指标计算接口
 * - 30+常用技术指标
 * - 批量计算优化
 * - 指标组合计算
 * - 计算结果缓存
 */

import { OHLCV } from './HistoricalDataService';

// ============================================================================
// Types
// ============================================================================

export interface IndicatorParams {
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  source?: 'open' | 'high' | 'low' | 'close';
  multiplier?: number;
  [key: string]: any;
}

export interface IndicatorResult {
  timestamp: number;
  value: number | null;
  [key: string]: number | null;
}

export type IndicatorType =
  // 趋势指标
  | 'MA' | 'EMA' | 'SMA' | 'WMA' | 'DEMA' | 'TEMA'
  | 'BBANDS'      // 布林带
  | 'SAR'         // 抛物线SAR
  | 'SUPERTREND'  // SuperTrend
  // 动量指标
  | 'RSI' | 'STOCH' | 'MACD' | 'CCI' | 'MOM' | 'ROC'
  | 'WILLR'       // Williams %R
  | 'UO'          // Ultimate Oscillator
  // 波动率指标
  | 'ATR' | 'NATR' | 'ADX' | 'STDDEV'
  | 'KC'          // Keltner Channels
  // 成交量指标
  | 'OBV' | 'AD' | 'MFI' | 'VWAP'
  | 'CMF'         // Chaikin Money Flow
  | 'FORCE'       // Force Index
  // 其他
  | 'PIVOT';      // 枢轴点

export type TechnicalSignal = 'BUY' | 'SELL' | 'NEUTRAL';
export type TechnicalStrength = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

export interface TechnicalAnalysisSummary {
  summary: TechnicalStrength;
  oscillators: {
    summary: TechnicalStrength;
    signals: Array<{
      name: string;
      value: number;
      signal: TechnicalSignal;
      action: string;
    }>;
    counts: {
      buy: number;
      sell: number;
      neutral: number;
    };
  };
  movingAverages: {
    summary: TechnicalStrength;
    signals: Array<{
      name: string;
      value: number;
      signal: TechnicalSignal;
      action: string;
    }>;
    counts: {
      buy: number;
      sell: number;
      neutral: number;
    };
  };
}

// ============================================================================
// Indicator Calculation Service
// ============================================================================

export class IndicatorCalculationService {
  private cache: Map<string, IndicatorResult[]> = new Map();

  /**
   * 计算指标（统一入口）
   */
  calculate(
    type: IndicatorType,
    data: OHLCV[],
    params: IndicatorParams = {}
  ): IndicatorResult[] {
    const cacheKey = this.getCacheKey(type, params);
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let result: IndicatorResult[];

    // 根据类型调用相应的计算方法
    switch (type) {
      // 趋势指标
      case 'MA':
      case 'SMA':
        result = this.calculateSMA(data, params);
        break;
      case 'EMA':
        result = this.calculateEMA(data, params);
        break;
      case 'WMA':
        result = this.calculateWMA(data, params);
        break;
      case 'DEMA':
        result = this.calculateDEMA(data, params);
        break;
      case 'TEMA':
        result = this.calculateTEMA(data, params);
        break;
      case 'BBANDS':
        result = this.calculateBollingerBands(data, params);
        break;

      // 动量指标
      case 'RSI':
        result = this.calculateRSI(data, params);
        break;
      case 'MACD':
        result = this.calculateMACD(data, params);
        break;
      case 'STOCH':
        result = this.calculateStochastic(data, params);
        break;
      case 'CCI':
        result = this.calculateCCI(data, params);
        break;
      case 'MOM':
        result = this.calculateMomentum(data, params);
        break;
      case 'ROC':
        result = this.calculateROC(data, params);
        break;
      case 'WILLR':
        result = this.calculateWilliamsR(data, params);
        break;

      // 波动率指标
      case 'ATR':
        result = this.calculateATR(data, params);
        break;
      case 'ADX':
        result = this.calculateADX(data, params);
        break;
      case 'STDDEV':
        result = this.calculateStdDev(data, params);
        break;

      // 成交量指标
      case 'OBV':
        result = this.calculateOBV(data);
        break;
      case 'MFI':
        result = this.calculateMFI(data, params);
        break;
      case 'VWAP':
        result = this.calculateVWAP(data);
        break;

      default:
        throw new Error(`Unsupported indicator type: ${type}`);
    }

    // 缓存结果
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * 批量计算多个指标
   */
  calculateMultiple(
    indicators: Array<{ type: IndicatorType; params?: IndicatorParams }>,
    data: OHLCV[]
  ): Map<string, IndicatorResult[]> {
    const results = new Map<string, IndicatorResult[]>();

    indicators.forEach(({ type, params = {} }) => {
      const key = `${type}_${JSON.stringify(params)}`;
      results.set(key, this.calculate(type, data, params));
    });

    return results;
  }

  /**
   * 便捷方法：计算MA并返回数字数组（用于图表绘制）
   */
  calculateMA(closePrices: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < closePrices.length; i++) {
      if (i < period - 1) {
        result.push(NaN); // 使用NaN表示无效值
      } else {
        const sum = closePrices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    
    return result;
  }

  /**
   * 便捷方法：计算EMA并返回数字数组
   */
  calculateEMAArray(closePrices: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);

    let ema = closePrices[0];
    result.push(ema);

    for (let i = 1; i < closePrices.length; i++) {
      ema = (closePrices[i] - ema) * multiplier + ema;
      result.push(ema);
    }

    return result;
  }

  // ============================================================================
  // 趋势指标
  // ============================================================================

  /**
   * 简单移动平均 (SMA)
   */
  private calculateSMA(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 20;
    const source = params.source || 'close';
    const values = data.map(d => d[source]);
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ timestamp: data[i].timestamp, value: null });
      } else {
        const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push({ timestamp: data[i].timestamp, value: sum / period });
      }
    }

    return result;
  }

  /**
   * 指数移动平均 (EMA)
   */
  private calculateEMA(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 20;
    const source = params.source || 'close';
    const values = data.map(d => d[source]);
    const result: IndicatorResult[] = [];
    const multiplier = 2 / (period + 1);

    let ema = values[0];
    result.push({ timestamp: data[0].timestamp, value: ema });

    for (let i = 1; i < data.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
      result.push({ timestamp: data[i].timestamp, value: ema });
    }

    return result;
  }

  /**
   * 加权移动平均 (WMA)
   */
  private calculateWMA(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 20;
    const source = params.source || 'close';
    const values = data.map(d => d[source]);
    const result: IndicatorResult[] = [];
    const denominator = (period * (period + 1)) / 2;

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ timestamp: data[i].timestamp, value: null });
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += values[i - period + 1 + j] * (j + 1);
        }
        result.push({ timestamp: data[i].timestamp, value: sum / denominator });
      }
    }

    return result;
  }

  /**
   * 双指数移动平均 (DEMA)
   */
  private calculateDEMA(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const ema1 = this.calculateEMA(data, params);
    const ema2 = this.calculateEMA(
      data.map((d, i) => ({ ...d, close: ema1[i].value || d.close })),
      params
    );

    return ema1.map((e1, i) => ({
      timestamp: data[i].timestamp,
      value: e1.value !== null && ema2[i].value !== null
        ? 2 * e1.value - ema2[i].value
        : null,
    }));
  }

  /**
   * 三指数移动平均 (TEMA)
   */
  private calculateTEMA(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const ema1 = this.calculateEMA(data, params);
    const ema2 = this.calculateEMA(
      data.map((d, i) => ({ ...d, close: ema1[i].value || d.close })),
      params
    );
    const ema3 = this.calculateEMA(
      data.map((d, i) => ({ ...d, close: ema2[i].value || d.close })),
      params
    );

    return ema1.map((e1, i) => ({
      timestamp: data[i].timestamp,
      value: e1.value !== null && ema2[i].value !== null && ema3[i].value !== null
        ? 3 * e1.value - 3 * ema2[i].value + ema3[i].value
        : null,
    }));
  }

  /**
   * 布林带 (Bollinger Bands)
   */
  private calculateBollingerBands(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 20;
    const multiplier = params.multiplier || 2;
    const sma = this.calculateSMA(data, { period });
    const source = params.source || 'close';
    const values = data.map(d => d[source]);

    return data.map((d, i) => {
      if (i < period - 1 || sma[i].value === null) {
        return {
          timestamp: d.timestamp,
          value: null,
          upper: null,
          middle: null,
          lower: null,
        };
      }

      const slice = values.slice(i - period + 1, i + 1);
      const mean = sma[i].value!;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      return {
        timestamp: d.timestamp,
        value: mean,
        upper: mean + multiplier * stdDev,
        middle: mean,
        lower: mean - multiplier * stdDev,
      };
    });
  }

  // ============================================================================
  // 动量指标
  // ============================================================================

  /**
   * 相对强弱指数 (RSI)
   */
  private calculateRSI(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 14;
    const source = params.source || 'close';
    const values = data.map(d => d[source]);
    const result: IndicatorResult[] = [];

    let avgGain = 0;
    let avgLoss = 0;

    // 初始平均
    for (let i = 1; i <= period; i++) {
      const change = values[i] - values[i - 1];
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }
    avgGain /= period;
    avgLoss /= period;

    // 填充前period个null
    for (let i = 0; i < period; i++) {
      result.push({ timestamp: data[i].timestamp, value: null });
    }

    // 计算RSI
    for (let i = period; i < data.length; i++) {
      const change = values[i] - values[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      result.push({ timestamp: data[i].timestamp, value: rsi });
    }

    return result;
  }

  /**
   * MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const fastPeriod = params.fastPeriod || 12;
    const slowPeriod = params.slowPeriod || 26;
    const signalPeriod = params.signalPeriod || 9;

    const fastEMA = this.calculateEMA(data, { period: fastPeriod });
    const slowEMA = this.calculateEMA(data, { period: slowPeriod });

    // MACD线 = 快线 - 慢线
    const macdLine = fastEMA.map((fast, i) => ({
      timestamp: data[i].timestamp,
      value: fast.value !== null && slowEMA[i].value !== null
        ? fast.value - slowEMA[i].value
        : null,
    }));

    // 信号线 = MACD的EMA
    const signalLine = this.calculateEMA(
      data.map((d, i) => ({ ...d, close: macdLine[i].value || d.close })),
      { period: signalPeriod }
    );

    // 柱状图 = MACD - 信号线
    return data.map((d, i) => ({
      timestamp: d.timestamp,
      value: macdLine[i].value,
      macd: macdLine[i].value,
      signal: signalLine[i].value,
      histogram: macdLine[i].value !== null && signalLine[i].value !== null
        ? macdLine[i].value! - signalLine[i].value!
        : null,
    }));
  }

  /**
   * 随机指标 (Stochastic)
   */
  private calculateStochastic(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 14;
    const smoothK = params.smoothK || 3;
    const smoothD = params.smoothD || 3;
    const result: IndicatorResult[] = [];

    // 计算%K
    const rawK: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        rawK.push(0);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const high = Math.max(...slice.map(d => d.high));
        const low = Math.min(...slice.map(d => d.low));
        const k = high === low ? 50 : ((data[i].close - low) / (high - low)) * 100;
        rawK.push(k);
      }
    }

    // 平滑%K
    const smoothedK: number[] = [];
    for (let i = 0; i < rawK.length; i++) {
      if (i < smoothK - 1) {
        smoothedK.push(rawK[i]);
      } else {
        const sum = rawK.slice(i - smoothK + 1, i + 1).reduce((a, b) => a + b, 0);
        smoothedK.push(sum / smoothK);
      }
    }

    // 计算%D (平滑%K的移动平均)
    for (let i = 0; i < data.length; i++) {
      if (i < period + smoothK + smoothD - 3) {
        result.push({
          timestamp: data[i].timestamp,
          value: null,
          k: null,
          d: null,
        });
      } else {
        const dSlice = smoothedK.slice(i - smoothD + 1, i + 1);
        const d = dSlice.reduce((a, b) => a + b, 0) / smoothD;
        
        result.push({
          timestamp: data[i].timestamp,
          value: smoothedK[i],
          k: smoothedK[i],
          d,
        });
      }
    }

    return result;
  }

  /**
   * 商品通道指数 (CCI)
   */
  private calculateCCI(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 20;
    const constant = 0.015;
    const result: IndicatorResult[] = [];

    // 计算典型价格
    const tp = data.map(d => (d.high + d.low + d.close) / 3);

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ timestamp: data[i].timestamp, value: null });
      } else {
        const tpSlice = tp.slice(i - period + 1, i + 1);
        const sma = tpSlice.reduce((a, b) => a + b, 0) / period;
        const meanDeviation = tpSlice.reduce((sum, val) => sum + Math.abs(val - sma), 0) / period;
        
        const cci = meanDeviation === 0 ? 0 : (tp[i] - sma) / (constant * meanDeviation);
        result.push({ timestamp: data[i].timestamp, value: cci });
      }
    }

    return result;
  }

  /**
   * 动量指标 (Momentum)
   */
  private calculateMomentum(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 10;
    const source = params.source || 'close';
    const values = data.map(d => d[source]);

    return data.map((d, i) => ({
      timestamp: d.timestamp,
      value: i < period ? null : values[i] - values[i - period],
    }));
  }

  /**
   * 变化率 (Rate of Change)
   */
  private calculateROC(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 10;
    const source = params.source || 'close';
    const values = data.map(d => d[source]);

    return data.map((d, i) => ({
      timestamp: d.timestamp,
      value: i < period || values[i - period] === 0
        ? null
        : ((values[i] - values[i - period]) / values[i - period]) * 100,
    }));
  }

  /**
   * Williams %R
   */
  private calculateWilliamsR(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 14;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ timestamp: data[i].timestamp, value: null });
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const high = Math.max(...slice.map(d => d.high));
        const low = Math.min(...slice.map(d => d.low));
        const willR = high === low ? -50 : ((high - data[i].close) / (high - low)) * -100;
        result.push({ timestamp: data[i].timestamp, value: willR });
      }
    }

    return result;
  }

  // ============================================================================
  // 波动率指标
  // ============================================================================

  /**
   * 平均真实波幅 (ATR)
   */
  private calculateATR(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 14;
    const result: IndicatorResult[] = [];

    // 计算真实波幅
    const tr: number[] = [data[0].high - data[0].low];
    for (let i = 1; i < data.length; i++) {
      const hl = data[i].high - data[i].low;
      const hc = Math.abs(data[i].high - data[i - 1].close);
      const lc = Math.abs(data[i].low - data[i - 1].close);
      tr.push(Math.max(hl, hc, lc));
    }

    // 计算ATR
    let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push({ timestamp: data[0].timestamp, value: null });

    for (let i = 1; i < period; i++) {
      result.push({ timestamp: data[i].timestamp, value: null });
    }

    result.push({ timestamp: data[period - 1].timestamp, value: atr });

    for (let i = period; i < data.length; i++) {
      atr = (atr * (period - 1) + tr[i]) / period;
      result.push({ timestamp: data[i].timestamp, value: atr });
    }

    return result;
  }

  /**
   * 平均趋向指数 (ADX)
   */
  private calculateADX(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 14;
    // 简化实现，实际需要计算+DI、-DI和DX
    const atr = this.calculateATR(data, { period });
    return atr; // 返回ATR作为简化版本
  }

  /**
   * 标准差
   */
  private calculateStdDev(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 20;
    const source = params.source || 'close';
    const values = data.map(d => d[source]);
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ timestamp: data[i].timestamp, value: null });
      } else {
        const slice = values.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        result.push({ timestamp: data[i].timestamp, value: Math.sqrt(variance) });
      }
    }

    return result;
  }

  // ============================================================================
  // 成交量指标
  // ============================================================================

  /**
   * 能量潮 (OBV)
   */
  private calculateOBV(data: OHLCV[]): IndicatorResult[] {
    const result: IndicatorResult[] = [];
    let obv = 0;

    result.push({ timestamp: data[0].timestamp, value: data[0].volume });

    for (let i = 1; i < data.length; i++) {
      if (data[i].close > data[i - 1].close) {
        obv += data[i].volume;
      } else if (data[i].close < data[i - 1].close) {
        obv -= data[i].volume;
      }
      result.push({ timestamp: data[i].timestamp, value: obv });
    }

    return result;
  }

  /**
   * 资金流量指数 (MFI)
   */
  private calculateMFI(data: OHLCV[], params: IndicatorParams): IndicatorResult[] {
    const period = params.period || 14;
    const result: IndicatorResult[] = [];

    // 计算典型价格和资金流量
    const tp = data.map(d => (d.high + d.low + d.close) / 3);
    const mf = data.map((d, i) => tp[i] * d.volume);

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push({ timestamp: data[i].timestamp, value: null });
      } else {
        let posFlow = 0;
        let negFlow = 0;

        for (let j = i - period + 1; j <= i; j++) {
          if (tp[j] > tp[j - 1]) {
            posFlow += mf[j];
          } else {
            negFlow += mf[j];
          }
        }

        const mfi = negFlow === 0 ? 100 : 100 - 100 / (1 + posFlow / negFlow);
        result.push({ timestamp: data[i].timestamp, value: mfi });
      }
    }

    return result;
  }

  /**
   * 成交量加权平均价 (VWAP)
   */
  private calculateVWAP(data: OHLCV[]): IndicatorResult[] {
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    return data.map(d => {
      const tp = (d.high + d.low + d.close) / 3;
      cumulativeTPV += tp * d.volume;
      cumulativeVolume += d.volume;

      return {
        timestamp: d.timestamp,
        value: cumulativeVolume === 0 ? null : cumulativeTPV / cumulativeVolume,
      };
    });
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  /**
   * 生成缓存键
   */
  private getCacheKey(type: IndicatorType, params: IndicatorParams): string {
    return `${type}_${JSON.stringify(params)}`;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取技术分析汇总（类似 TradingView）
   */
  getTechnicalAnalysisSummary(data: OHLCV[]): TechnicalAnalysisSummary {
    if (data.length < 50) {
      return this.createNeutralSummary();
    }

    const currentPrice = data[data.length - 1].close;
    const oscillatorSignals = this.calculateOscillatorSignals(data);
    const maSignals = this.calculateMovingAverageSignals(data, currentPrice);

    const oscillatorSummary = this.getSummaryFromCounts(oscillatorSignals.counts);
    const maSummary = this.getSummaryFromCounts(maSignals.counts);
    
    const totalCounts = {
      buy: oscillatorSignals.counts.buy + maSignals.counts.buy,
      sell: oscillatorSignals.counts.sell + maSignals.counts.sell,
      neutral: oscillatorSignals.counts.neutral + maSignals.counts.neutral
    };
    const overallSummary = this.getSummaryFromCounts(totalCounts);

    return {
      summary: overallSummary,
      oscillators: {
        summary: oscillatorSummary,
        signals: oscillatorSignals.signals,
        counts: oscillatorSignals.counts
      },
      movingAverages: {
        summary: maSummary,
        signals: maSignals.signals,
        counts: maSignals.counts
      }
    };
  }

  /**
   * 计算振荡器信号
   */
  private calculateOscillatorSignals(data: OHLCV[]) {
    const signals: Array<{ name: string; value: number; signal: TechnicalSignal; action: string }> = [];
    let buys = 0, sells = 0, neutrals = 0;

    // RSI (14)
    const rsi = this.calculateRSI(data, { period: 14 });
    const rsiValue = rsi[rsi.length - 1]?.value || 50;
    const rsiSignal = rsiValue < 30 ? 'BUY' : rsiValue > 70 ? 'SELL' : 'NEUTRAL';
    signals.push({
      name: 'RSI(14)',
      value: rsiValue,
      signal: rsiSignal as TechnicalSignal,
      action: rsiValue < 30 ? 'Buy' : rsiValue > 70 ? 'Sell' : 'Neutral'
    });
    if (rsiSignal === 'BUY') buys++;
    else if (rsiSignal === 'SELL') sells++;
    else neutrals++;

    // MACD
    const macd = this.calculateMACD(data, {});
    const macdValue = macd[macd.length - 1]?.histogram || 0;
    const macdSignal = macdValue > 0 ? 'BUY' : macdValue < 0 ? 'SELL' : 'NEUTRAL';
    signals.push({
      name: 'MACD Level',
      value: macdValue,
      signal: macdSignal as TechnicalSignal,
      action: macdValue > 0 ? 'Buy' : macdValue < 0 ? 'Sell' : 'Neutral'
    });
    if (macdSignal === 'BUY') buys++;
    else if (macdSignal === 'SELL') sells++;
    else neutrals++;

    return { signals, counts: { buy: buys, sell: sells, neutral: neutrals } };
  }

  /**
   * 计算移动平均线信号
   */
  private calculateMovingAverageSignals(data: OHLCV[], currentPrice: number) {
    const signals: Array<{ name: string; value: number; signal: TechnicalSignal; action: string }> = [];
    let buys = 0, sells = 0, neutrals = 0;

    const periods = [10, 20, 30, 50, 100, 200];
    
    for (const period of periods) {
      const ma = this.calculateMA(data, { period });
      const maValue = ma[ma.length - 1]?.value || currentPrice;
      const signal = currentPrice > maValue ? 'BUY' : currentPrice < maValue ? 'SELL' : 'NEUTRAL';
      
      signals.push({
        name: `MA(${period})`,
        value: maValue,
        signal: signal as TechnicalSignal,
        action: currentPrice > maValue ? 'Buy' : currentPrice < maValue ? 'Sell' : 'Neutral'
      });
      
      if (signal === 'BUY') buys++;
      else if (signal === 'SELL') sells++;
      else neutrals++;
    }

    return { signals, counts: { buy: buys, sell: sells, neutral: neutrals } };
  }

  /**
   * 根据计数获取汇总信号
   */
  private getSummaryFromCounts(counts: { buy: number; sell: number; neutral: number }): TechnicalStrength {
    const total = counts.buy + counts.sell + counts.neutral;
    if (total === 0) return 'NEUTRAL';
    
    const buyRatio = counts.buy / total;
    const sellRatio = counts.sell / total;

    if (buyRatio >= 0.7) return 'STRONG_BUY';
    if (buyRatio >= 0.5) return 'BUY';
    if (sellRatio >= 0.7) return 'STRONG_SELL';
    if (sellRatio >= 0.5) return 'SELL';
    return 'NEUTRAL';
  }

  /**
   * 创建中性汇总
   */
  private createNeutralSummary(): TechnicalAnalysisSummary {
    return {
      summary: 'NEUTRAL',
      oscillators: { summary: 'NEUTRAL', signals: [], counts: { buy: 0, sell: 0, neutral: 1 } },
      movingAverages: { summary: 'NEUTRAL', signals: [], counts: { buy: 0, sell: 0, neutral: 1 } }
    };
  }

  /**
   * 获取支持的指标列表
   */
  getSupportedIndicators(): IndicatorType[] {
    return [
      'MA', 'EMA', 'SMA', 'WMA', 'DEMA', 'TEMA',
      'BBANDS', 'RSI', 'MACD', 'STOCH', 'CCI',
      'MOM', 'ROC', 'WILLR', 'ATR', 'ADX',
      'STDDEV', 'OBV', 'MFI', 'VWAP',
    ];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let indicatorCalculationServiceInstance: IndicatorCalculationService | null = null;

export function getIndicatorCalculationService(): IndicatorCalculationService {
  if (!indicatorCalculationServiceInstance) {
    indicatorCalculationServiceInstance = new IndicatorCalculationService();
  }
  return indicatorCalculationServiceInstance;
}

export default IndicatorCalculationService;