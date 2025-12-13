/**
 * IndicatorEngine - 技术指标引擎
 * 
 * 功能：
 * - 20+核心技术指标
 * - 指标计算优化
 * - 缓存机制
 * - 参数配置
 */

import { OHLCV } from '../TradingChart';

// ============================================================================
// Types
// ============================================================================

export interface IndicatorConfig {
  id: string;
  name: string;
  type: 'overlay' | 'separate';  // 叠加在主图 or 独立窗口
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'fundamental' | 'quantitative' | 'risk';
  inputs: IndicatorInput[];
  plots: IndicatorPlot[];
  level?: 'basic' | 'professional' | 'institutional';
  description?: string;
  requirements?: string[];
}

export interface IndicatorInput {
  name: string;
  label: string;
  type: 'number' | 'select' | 'color' | 'boolean';
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: any; label: string }>;
}

export interface IndicatorPlot {
  name: string;
  color: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  plotType?: 'line' | 'histogram' | 'area';
}

export interface IndicatorResult {
  time: number;
  [key: string]: number | null;
}

// ============================================================================
// Indicator Engine
// ============================================================================

export class IndicatorEngine {
  private cache: Map<string, IndicatorResult[]> = new Map();
  private fundamentalCache: Map<string, number> = new Map();
  private quantitativeCache: Map<string, number> = new Map();

  /**
   * 计算指标
   */
  calculate(
    indicatorId: string,
    data: OHLCV[],
    params: Record<string, any>
  ): IndicatorResult[] {
    const cacheKey = this.getCacheKey(indicatorId, params);
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 计算指标
    let result: IndicatorResult[] = [];

    switch (indicatorId) {
      // 趋势指标
      case 'MA':
        result = this.calculateMA(data, params);
        break;
      case 'EMA':
        result = this.calculateEMA(data, params);
        break;
      case 'WMA':
        result = this.calculateWMA(data, params);
        break;
      case 'HMA':
        result = this.calculateHMA(data, params);
        break;
      case 'MACD':
        result = this.calculateMACD(data, params);
        break;
      case 'ADX':
        result = this.calculateADX(data, params);
        break;
      case 'DMI':
        result = this.calculateDMI(data, params);
        break;
      case 'PSAR':
        result = this.calculatePSAR(data, params);
        break;

      // 动量指标
      case 'RSI':
        result = this.calculateRSI(data, params);
        break;
      case 'KDJ':
        result = this.calculateKDJ(data, params);
        break;
      case 'STOCH':
        result = this.calculateStochastic(data, params);
        break;
      case 'WILLIAMS':
        result = this.calculateWilliamsR(data, params);
        break;
      case 'CCI':
        result = this.calculateCCI(data, params);
        break;
      case 'ROC':
        result = this.calculateROC(data, params);
        break;
      case 'MOM':
        result = this.calculateMomentum(data, params);
        break;

      // 波动率指标
      case 'BOLL':
        result = this.calculateBollingerBands(data, params);
        break;
      case 'ATR':
        result = this.calculateATR(data, params);
        break;
      case 'KELTNER':
        result = this.calculateKeltnerChannel(data, params);
        break;
      case 'DONCHIAN':
        result = this.calculateDonchianChannel(data, params);
        break;
      case 'STDDEV':
        result = this.calculateStandardDeviation(data, params);
        break;

      // 成交量指标
      case 'OBV':
        result = this.calculateOBV(data, params);
        break;
      case 'VWAP':
        result = this.calculateVWAP(data, params);
        break;
      case 'MFI':
        result = this.calculateMFI(data, params);
        break;
      case 'AD':
        result = this.calculateAD(data, params);
        break;
      case 'CHAIKIN':
        result = this.calculateChaikinOscillator(data, params);
        break;
      case 'VOLUME_PROFILE':
        result = this.calculateVolumeProfile(data, params);
        break;

      // 市场强度指标
      case 'AROON':
        result = this.calculateAroon(data, params);
        break;
      case 'TRIX':
        result = this.calculateTRIX(data, params);
        break;
      case 'ULTOSC':
        result = this.calculateUltimateOscillator(data, params);
        break;

      default:
        throw new Error(`Unknown indicator: ${indicatorId}`);
    }

    // 缓存结果
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * 计算基本面指标
   */
  calculateFundamental(
    type: 'PE' | 'PB' | 'ROE' | 'ROA' | 'DEBT_EQUITY' | 'EPS_GROWTH',
    data: any
  ): number {
    const cacheKey = `fundamental_${type}_${JSON.stringify(data)}`;
    
    if (this.fundamentalCache.has(cacheKey)) {
      return this.fundamentalCache.get(cacheKey)!;
    }

    let result = 0;

    switch (type) {
      case 'PE':
        result = data.eps > 0 ? data.price / data.eps : 0;
        break;
      case 'PB':
        result = data.bookValue > 0 ? data.price / data.bookValue : 0;
        break;
      case 'ROE':
        result = data.equity > 0 ? (data.netIncome / data.equity) * 100 : 0;
        break;
      case 'ROA':
        result = data.assets > 0 ? (data.netIncome / data.assets) * 100 : 0;
        break;
      case 'DEBT_EQUITY':
        result = data.equity > 0 ? data.debt / data.equity : 0;
        break;
      case 'EPS_GROWTH':
        result = data.previousEps > 0 ? ((data.currentEps - data.previousEps) / data.previousEps) * 100 : 0;
        break;
    }

    this.fundamentalCache.set(cacheKey, result);
    return result;
  }

  /**
   * 计算量化指标
   */
  calculateQuantitative(
    type: 'SHARPE' | 'SORTINO' | 'CALMAR' | 'ALPHA' | 'BETA' | 'MAX_DRAWDOWN' | 'VAR',
    data: any
  ): number {
    const cacheKey = `quant_${type}_${JSON.stringify(data)}`;
    
    if (this.quantitativeCache.has(cacheKey)) {
      return this.quantitativeCache.get(cacheKey)!;
    }

    let result = 0;

    switch (type) {
      case 'SHARPE':
        result = this.calculateSharpeRatio(data.returns, data.riskFreeRate || 0.02);
        break;
      case 'SORTINO':
        result = this.calculateSortinoRatio(data.returns, data.riskFreeRate || 0.02);
        break;
      case 'CALMAR':
        result = this.calculateCalmarRatio(data.returns, data.maxDrawdown);
        break;
      case 'ALPHA':
        result = this.calculateAlpha(data.portfolioReturns, data.marketReturns, data.riskFreeRate || 0.02, data.beta);
        break;
      case 'BETA':
        result = this.calculateBeta(data.assetReturns, data.marketReturns);
        break;
      case 'MAX_DRAWDOWN':
        result = this.calculateMaxDrawdown(data.prices);
        break;
      case 'VAR':
        result = this.calculateVaR(data.returns, data.confidence || 0.05);
        break;
    }

    this.quantitativeCache.set(cacheKey, result);
    return result;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }

  private getCacheKey(indicatorId: string, params: Record<string, any>): string {
    return `${indicatorId}_${JSON.stringify(params)}`;
  }

  // ==========================================================================
  // MA - 移动平均线
  // ==========================================================================

  private calculateMA(data: OHLCV[], params: {
    period?: number;
    source?: 'open' | 'high' | 'low' | 'close';
  }): IndicatorResult[] {
    const period = params.period || 20;
    const source = params.source || 'close';
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, MA: null });
        continue;
      }

      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j][source];
      }

      result.push({
        time: data[i].time,
        MA: sum / period,
      });
    }

    return result;
  }

  // ==========================================================================
  // EMA - 指数移动平均线
  // ==========================================================================

  private calculateEMA(data: OHLCV[], params: {
    period?: number;
    source?: 'open' | 'high' | 'low' | 'close';
  }): IndicatorResult[] {
    const period = params.period || 20;
    const source = params.source || 'close';
    const multiplier = 2 / (period + 1);
    const result: IndicatorResult[] = [];

    // 第一个EMA = SMA
    let ema = 0;
    for (let i = 0; i < period; i++) {
      ema += data[i][source];
    }
    ema /= period;

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, EMA: null });
        continue;
      }

      if (i === period - 1) {
        result.push({ time: data[i].time, EMA: ema });
      } else {
        ema = (data[i][source] - ema) * multiplier + ema;
        result.push({ time: data[i].time, EMA: ema });
      }
    }

    return result;
  }

  // ==========================================================================
  // MACD - 指数平滑移动平均线
  // ==========================================================================

  private calculateMACD(data: OHLCV[], params: {
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
  }): IndicatorResult[] {
    const fastPeriod = params.fastPeriod || 12;
    const slowPeriod = params.slowPeriod || 26;
    const signalPeriod = params.signalPeriod || 9;

    // 计算快慢EMA
    const fastEMA = this.calculateEMA(data, { period: fastPeriod, source: 'close' });
    const slowEMA = this.calculateEMA(data, { period: slowPeriod, source: 'close' });

    // 计算MACD线
    const macdLine: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (fastEMA[i].EMA !== null && slowEMA[i].EMA !== null) {
        macdLine.push(fastEMA[i].EMA! - slowEMA[i].EMA!);
      } else {
        macdLine.push(0);
      }
    }

    // 计算Signal线（MACD的EMA）
    const signalLine = this.calculateEMAFromArray(macdLine, signalPeriod);

    // 组合结果
    const result: IndicatorResult[] = [];
    for (let i = 0; i < data.length; i++) {
      const macd = macdLine[i];
      const signal = signalLine[i];
      const histogram = macd - signal;

      result.push({
        time: data[i].time,
        MACD: macd,
        Signal: signal,
        Histogram: histogram,
      });
    }

    return result;
  }

  private calculateEMAFromArray(values: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const result: number[] = [];

    // 第一个EMA = SMA
    let ema = 0;
    for (let i = 0; i < period && i < values.length; i++) {
      ema += values[i];
    }
    ema /= Math.min(period, values.length);

    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(0);
        continue;
      }

      if (i === period - 1) {
        result.push(ema);
      } else {
        ema = (values[i] - ema) * multiplier + ema;
        result.push(ema);
      }
    }

    return result;
  }

  // ==========================================================================
  // RSI - 相对强弱指标
  // ==========================================================================

  private calculateRSI(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 14;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push({ time: data[i].time, RSI: null });
        continue;
      }

      let gains = 0;
      let losses = 0;

      for (let j = 1; j <= period; j++) {
        const change = data[i - j + 1].close - data[i - j].close;
        if (change > 0) {
          gains += change;
        } else {
          losses -= change;
        }
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      result.push({
        time: data[i].time,
        RSI: rsi,
      });
    }

    return result;
  }

  // ==========================================================================
  // Bollinger Bands - 布林带
  // ==========================================================================

  private calculateBollingerBands(data: OHLCV[], params: {
    period?: number;
    stdDev?: number;
  }): IndicatorResult[] {
    const period = params.period || 20;
    const stdDevMultiplier = params.stdDev || 2;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({
          time: data[i].time,
          Middle: null,
          Upper: null,
          Lower: null,
        });
        continue;
      }

      // 计算MA
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      const middle = sum / period;

      // 计算标准差
      let variance = 0;
      for (let j = 0; j < period; j++) {
        variance += Math.pow(data[i - j].close - middle, 2);
      }
      const stdDev = Math.sqrt(variance / period);

      result.push({
        time: data[i].time,
        Middle: middle,
        Upper: middle + stdDevMultiplier * stdDev,
        Lower: middle - stdDevMultiplier * stdDev,
      });
    }

    return result;
  }

  // ==========================================================================
  // KDJ - 随机指标
  // ==========================================================================

  private calculateKDJ(data: OHLCV[], params: {
    period?: number;
    signalPeriod?: number;
  }): IndicatorResult[] {
    const period = params.period || 9;
    const signalPeriod = params.signalPeriod || 3;
    const result: IndicatorResult[] = [];

    let k = 50;
    let d = 50;

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({
          time: data[i].time,
          K: null,
          D: null,
          J: null,
        });
        continue;
      }

      // 计算最高价和最低价
      let highest = -Infinity;
      let lowest = Infinity;
      for (let j = 0; j < period; j++) {
        highest = Math.max(highest, data[i - j].high);
        lowest = Math.min(lowest, data[i - j].low);
      }

      // 计算RSV
      const rsv = highest === lowest ? 50 : ((data[i].close - lowest) / (highest - lowest)) * 100;

      // 计算K、D
      k = (k * (signalPeriod - 1) + rsv) / signalPeriod;
      d = (d * (signalPeriod - 1) + k) / signalPeriod;
      const j = 3 * k - 2 * d;

      result.push({
        time: data[i].time,
        K: k,
        D: d,
        J: j,
      });
    }

    return result;
  }

  // ==========================================================================
  // ATR - 真实波幅
  // ==========================================================================

  private calculateATR(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 14;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        result.push({
          time: data[i].time,
          ATR: null,
        });
        continue;
      }

      // 计算真实波幅
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );

      if (i < period) {
        result.push({
          time: data[i].time,
          ATR: null,
        });
        continue;
      }

      // 计算ATR（TR的移动平均）
      let atrSum = 0;
      for (let j = 0; j < period; j++) {
        const prevTr = Math.max(
          data[i - j].high - data[i - j].low,
          i - j > 0 ? Math.abs(data[i - j].high - data[i - j - 1].close) : 0,
          i - j > 0 ? Math.abs(data[i - j].low - data[i - j - 1].close) : 0
        );
        atrSum += prevTr;
      }

      result.push({
        time: data[i].time,
        ATR: atrSum / period,
      });
    }

    return result;
  }

  // ==========================================================================
  // 新增专业级技术指标计算方法
  // ==========================================================================

  private calculateWMA(data: OHLCV[], params: {
    period?: number;
    source?: 'open' | 'high' | 'low' | 'close';
  }): IndicatorResult[] {
    const period = params.period || 20;
    const source = params.source || 'close';
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, WMA: null });
        continue;
      }

      let weightedSum = 0;
      let weightSum = 0;

      for (let j = 0; j < period; j++) {
        const weight = period - j;
        weightedSum += data[i - j][source] * weight;
        weightSum += weight;
      }

      result.push({
        time: data[i].time,
        WMA: weightedSum / weightSum,
      });
    }

    return result;
  }

  private calculateHMA(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 20;
    const halfPeriod = Math.floor(period / 2);
    const sqrtPeriod = Math.floor(Math.sqrt(period));

    // 计算WMA(n/2) * 2 - WMA(n)
    const wma1 = this.calculateWMA(data, { period: halfPeriod });
    const wma2 = this.calculateWMA(data, { period });

    const rawData: OHLCV[] = [];
    for (let i = 0; i < data.length; i++) {
      const val1 = wma1[i]?.WMA;
      const val2 = wma2[i]?.WMA;
      
      rawData.push({
        ...data[i],
        close: val1 !== null && val2 !== null ? val1 * 2 - val2 : 0
      });
    }

    // 对结果计算WMA(sqrt(n))
    return this.calculateWMA(rawData, { period: sqrtPeriod }).map((r, i) => ({
      time: data[i].time,
      HMA: r.WMA
    }));
  }

  private calculateADX(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 14;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period + 1) {
        result.push({ time: data[i].time, ADX: null, PDI: null, MDI: null });
        continue;
      }

      // 简化ADX计算
      let avgTR = 0;
      let avgPlusDM = 0;
      let avgMinusDM = 0;

      for (let j = 1; j <= period; j++) {
        const high = data[i - j + 1].high;
        const low = data[i - j + 1].low;
        const prevHigh = data[i - j].high;
        const prevLow = data[i - j].low;
        const prevClose = data[i - j].close;

        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        const plusDM = high - prevHigh > prevLow - low && high - prevHigh > 0 ? high - prevHigh : 0;
        const minusDM = prevLow - low > high - prevHigh && prevLow - low > 0 ? prevLow - low : 0;

        avgTR += tr;
        avgPlusDM += plusDM;
        avgMinusDM += minusDM;
      }

      avgTR /= period;
      avgPlusDM /= period;
      avgMinusDM /= period;

      const pdi = avgTR > 0 ? (avgPlusDM / avgTR) * 100 : 0;
      const mdi = avgTR > 0 ? (avgMinusDM / avgTR) * 100 : 0;
      const dx = pdi + mdi > 0 ? Math.abs(pdi - mdi) / (pdi + mdi) * 100 : 0;

      result.push({
        time: data[i].time,
        ADX: dx, // 简化版本
        PDI: pdi,
        MDI: mdi,
      });
    }

    return result;
  }

  private calculateStochastic(data: OHLCV[], params: {
    kPeriod?: number;
    dPeriod?: number;
  }): IndicatorResult[] {
    const kPeriod = params.kPeriod || 14;
    const dPeriod = params.dPeriod || 3;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < kPeriod - 1) {
        result.push({ time: data[i].time, K: null, D: null });
        continue;
      }

      let highest = -Infinity;
      let lowest = Infinity;

      for (let j = 0; j < kPeriod; j++) {
        highest = Math.max(highest, data[i - j].high);
        lowest = Math.min(lowest, data[i - j].low);
      }

      const k = highest === lowest ? 50 : ((data[i].close - lowest) / (highest - lowest)) * 100;

      result.push({
        time: data[i].time,
        K: k,
        D: null, // 需要对K值计算移动平均
      });
    }

    // 计算D线
    for (let i = dPeriod - 1; i < result.length; i++) {
      let sum = 0;
      for (let j = 0; j < dPeriod; j++) {
        sum += result[i - j].K || 0;
      }
      result[i].D = sum / dPeriod;
    }

    return result;
  }

  private calculateCCI(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 20;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, CCI: null });
        continue;
      }

      // 计算典型价格
      const typicalPrices: number[] = [];
      for (let j = 0; j < period; j++) {
        const tp = (data[i - j].high + data[i - j].low + data[i - j].close) / 3;
        typicalPrices.push(tp);
      }

      // 计算SMA
      const sma = typicalPrices.reduce((a, b) => a + b) / period;

      // 计算平均偏差
      const avgDev = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;

      const cci = avgDev > 0 ? (typicalPrices[0] - sma) / (0.015 * avgDev) : 0;

      result.push({
        time: data[i].time,
        CCI: cci,
      });
    }

    return result;
  }

  private calculateMFI(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 14;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push({ time: data[i].time, MFI: null });
        continue;
      }

      let positiveFlow = 0;
      let negativeFlow = 0;

      for (let j = 1; j <= period; j++) {
        const currentTP = (data[i - j + 1].high + data[i - j + 1].low + data[i - j + 1].close) / 3;
        const prevTP = (data[i - j].high + data[i - j].low + data[i - j].close) / 3;
        const rawMoneyFlow = currentTP * data[i - j + 1].volume;

        if (currentTP > prevTP) {
          positiveFlow += rawMoneyFlow;
        } else if (currentTP < prevTP) {
          negativeFlow += rawMoneyFlow;
        }
      }

      const mfi = negativeFlow > 0 ? 100 - (100 / (1 + positiveFlow / negativeFlow)) : 100;

      result.push({
        time: data[i].time,
        MFI: mfi,
      });
    }

    return result;
  }

  private calculateOBV(data: OHLCV[], params: Record<string, any> = {}): IndicatorResult[] {
    const result: IndicatorResult[] = [];
    let obv = 0;

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        obv = data[i].volume;
      } else {
        if (data[i].close > data[i - 1].close) {
          obv += data[i].volume;
        } else if (data[i].close < data[i - 1].close) {
          obv -= data[i].volume;
        }
      }

      result.push({
        time: data[i].time,
        OBV: obv,
      });
    }

    return result;
  }

  private calculateVWAP(data: OHLCV[], params: Record<string, any> = {}): IndicatorResult[] {
    const result: IndicatorResult[] = [];
    let cumPrice = 0;
    let cumVolume = 0;

    for (let i = 0; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      cumPrice += typicalPrice * data[i].volume;
      cumVolume += data[i].volume;

      result.push({
        time: data[i].time,
        VWAP: cumVolume > 0 ? cumPrice / cumVolume : null,
      });
    }

    return result;
  }

  // ==========================================================================
  // 量化指标计算方法
  // ==========================================================================

  private calculateSharpeRatio(returns: number[], riskFreeRate: number): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252); // 年化波动率
    
    return volatility > 0 ? (avgReturn * 252 - riskFreeRate) / volatility : 0;
  }

  private calculateSortinoRatio(returns: number[], riskFreeRate: number): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const downwardReturns = returns.filter(r => r < 0);
    
    if (downwardReturns.length === 0) return Infinity;
    
    const downwardVariance = downwardReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downwardReturns.length;
    const downwardVolatility = Math.sqrt(downwardVariance * 252);
    
    return downwardVolatility > 0 ? (avgReturn * 252 - riskFreeRate) / downwardVolatility : 0;
  }

  private calculateCalmarRatio(returns: number[], maxDrawdown: number): number {
    if (returns.length === 0 || maxDrawdown === 0) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const annualizedReturn = avgReturn * 252;
    
    return annualizedReturn / Math.abs(maxDrawdown);
  }

  private calculateAlpha(portfolioReturns: number[], marketReturns: number[], riskFreeRate: number, beta: number): number {
    if (portfolioReturns.length === 0 || marketReturns.length === 0) return 0;
    
    const portfolioAvg = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length * 252;
    const marketAvg = marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length * 252;
    
    return portfolioAvg - (riskFreeRate + beta * (marketAvg - riskFreeRate));
  }

  private calculateBeta(assetReturns: number[], marketReturns: number[]): number {
    if (assetReturns.length !== marketReturns.length || assetReturns.length === 0) return 0;
    
    const assetMean = assetReturns.reduce((a, b) => a + b, 0) / assetReturns.length;
    const marketMean = marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length;
    
    let covariance = 0;
    let marketVariance = 0;
    
    for (let i = 0; i < assetReturns.length; i++) {
      covariance += (assetReturns[i] - assetMean) * (marketReturns[i] - marketMean);
      marketVariance += Math.pow(marketReturns[i] - marketMean, 2);
    }
    
    return marketVariance > 0 ? covariance / marketVariance : 0;
  }

  private calculateMaxDrawdown(prices: number[]): number {
    if (prices.length === 0) return 0;
    
    let maxDrawdown = 0;
    let peak = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > peak) {
        peak = prices[i];
      } else {
        const drawdown = (peak - prices[i]) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
    
    return maxDrawdown;
  }

  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * confidence);
    
    return index < sortedReturns.length ? Math.abs(sortedReturns[index]) : 0;
  }

  // ==========================================================================
  // 其他新增指标
  // ==========================================================================

  private calculateDMI(data: OHLCV[], params: { period?: number }): IndicatorResult[] {
    // DMI = ADX的组成部分，返回+DI和-DI
    return this.calculateADX(data, params);
  }

  private calculatePSAR(data: OHLCV[], params: {
    acceleration?: number;
    maximum?: number;
  }): IndicatorResult[] {
    const acceleration = params.acceleration || 0.02;
    const maximum = params.maximum || 0.2;
    const result: IndicatorResult[] = [];

    // PSAR计算较复杂，这里提供简化版本
    let psar = data[0].low;
    let trend = 1; // 1为上升趋势，-1为下降趋势
    let af = acceleration;
    let ep = data[0].high; // 极值点

    for (let i = 0; i < data.length; i++) {
      result.push({
        time: data[i].time,
        PSAR: psar,
      });

      if (i < data.length - 1) {
        // 更新PSAR（简化计算）
        if (trend === 1) {
          psar = psar + af * (ep - psar);
          if (data[i + 1].high > ep) {
            ep = data[i + 1].high;
            af = Math.min(af + acceleration, maximum);
          }
          if (data[i + 1].low < psar) {
            trend = -1;
            psar = ep;
            ep = data[i + 1].low;
            af = acceleration;
          }
        } else {
          psar = psar - af * (psar - ep);
          if (data[i + 1].low < ep) {
            ep = data[i + 1].low;
            af = Math.min(af + acceleration, maximum);
          }
          if (data[i + 1].high > psar) {
            trend = 1;
            psar = ep;
            ep = data[i + 1].high;
            af = acceleration;
          }
        }
      }
    }

    return result;
  }

  private calculateWilliamsR(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 14;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, WilliamsR: null });
        continue;
      }

      let highest = -Infinity;
      let lowest = Infinity;

      for (let j = 0; j < period; j++) {
        highest = Math.max(highest, data[i - j].high);
        lowest = Math.min(lowest, data[i - j].low);
      }

      const williamsR = highest === lowest ? -50 : ((highest - data[i].close) / (highest - lowest)) * -100;

      result.push({
        time: data[i].time,
        WilliamsR: williamsR,
      });
    }

    return result;
  }

  private calculateROC(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 10;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push({ time: data[i].time, ROC: null });
        continue;
      }

      const currentPrice = data[i].close;
      const previousPrice = data[i - period].close;
      const roc = previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;

      result.push({
        time: data[i].time,
        ROC: roc,
      });
    }

    return result;
  }

  private calculateMomentum(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 10;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push({ time: data[i].time, Momentum: null });
        continue;
      }

      const momentum = data[i].close - data[i - period].close;

      result.push({
        time: data[i].time,
        Momentum: momentum,
      });
    }

    return result;
  }

  private calculateKeltnerChannel(data: OHLCV[], params: {
    period?: number;
    atrPeriod?: number;
    multiplier?: number;
  }): IndicatorResult[] {
    const period = params.period || 20;
    const atrPeriod = params.atrPeriod || 10;
    const multiplier = params.multiplier || 2;

    const ema = this.calculateEMA(data, { period });
    const atr = this.calculateATR(data, { period: atrPeriod });
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      const middle = ema[i].EMA;
      const atrValue = atr[i].ATR;

      result.push({
        time: data[i].time,
        Middle: middle,
        Upper: middle && atrValue ? middle + multiplier * atrValue : null,
        Lower: middle && atrValue ? middle - multiplier * atrValue : null,
      });
    }

    return result;
  }

  private calculateDonchianChannel(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 20;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, Upper: null, Lower: null, Middle: null });
        continue;
      }

      let highest = -Infinity;
      let lowest = Infinity;

      for (let j = 0; j < period; j++) {
        highest = Math.max(highest, data[i - j].high);
        lowest = Math.min(lowest, data[i - j].low);
      }

      result.push({
        time: data[i].time,
        Upper: highest,
        Lower: lowest,
        Middle: (highest + lowest) / 2,
      });
    }

    return result;
  }

  private calculateStandardDeviation(data: OHLCV[], params: {
    period?: number;
    source?: 'open' | 'high' | 'low' | 'close';
  }): IndicatorResult[] {
    const period = params.period || 20;
    const source = params.source || 'close';
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, StdDev: null });
        continue;
      }

      // 计算平均值
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j][source];
      }
      const mean = sum / period;

      // 计算标准差
      let variance = 0;
      for (let j = 0; j < period; j++) {
        variance += Math.pow(data[i - j][source] - mean, 2);
      }
      const stdDev = Math.sqrt(variance / period);

      result.push({
        time: data[i].time,
        StdDev: stdDev,
      });
    }

    return result;
  }

  private calculateAD(data: OHLCV[], params: Record<string, any> = {}): IndicatorResult[] {
    const result: IndicatorResult[] = [];
    let ad = 0;

    for (let i = 0; i < data.length; i++) {
      const clv = data[i].high !== data[i].low ? 
        ((data[i].close - data[i].low) - (data[i].high - data[i].close)) / (data[i].high - data[i].low) : 0;
      
      ad += clv * data[i].volume;

      result.push({
        time: data[i].time,
        AD: ad,
      });
    }

    return result;
  }

  private calculateChaikinOscillator(data: OHLCV[], params: {
    fastPeriod?: number;
    slowPeriod?: number;
  }): IndicatorResult[] {
    const fastPeriod = params.fastPeriod || 3;
    const slowPeriod = params.slowPeriod || 10;

    const ad = this.calculateAD(data);
    
    // 将AD数据转换为OHLCV格式以计算EMA
    const adData = ad.map((item, i) => ({
      ...data[i],
      close: item.AD || 0
    }));

    const fastEMA = this.calculateEMA(adData, { period: fastPeriod });
    const slowEMA = this.calculateEMA(adData, { period: slowPeriod });

    const result: IndicatorResult[] = [];
    for (let i = 0; i < data.length; i++) {
      const fast = fastEMA[i].EMA;
      const slow = slowEMA[i].EMA;

      result.push({
        time: data[i].time,
        Chaikin: fast && slow ? fast - slow : null,
      });
    }

    return result;
  }

  private calculateVolumeProfile(data: OHLCV[], params: {
    bins?: number;
  }): IndicatorResult[] {
    const bins = params.bins || 24;
    const result: IndicatorResult[] = [];

    if (data.length === 0) return result;

    // 找出价格范围
    let minPrice = Math.min(...data.map(d => d.low));
    let maxPrice = Math.max(...data.map(d => d.high));
    const priceStep = (maxPrice - minPrice) / bins;

    // 初始化价格区间
    const volumeProfile = Array(bins).fill(0);

    // 分配成交量到各价格区间
    for (const bar of data) {
      const typicalPrice = (bar.high + bar.low + bar.close) / 3;
      const binIndex = Math.min(Math.floor((typicalPrice - minPrice) / priceStep), bins - 1);
      volumeProfile[binIndex] += bar.volume;
    }

    // 返回成交量分布结果
    for (let i = 0; i < data.length; i++) {
      result.push({
        time: data[i].time,
        VolumeProfile: volumeProfile, // 简化返回整个分布数组
      });
    }

    return result;
  }

  private calculateAroon(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 14;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, AroonUp: null, AroonDown: null });
        continue;
      }

      // 找到最高价和最低价的位置
      let highestIndex = i;
      let lowestIndex = i;

      for (let j = 0; j < period; j++) {
        if (data[i - j].high > data[highestIndex].high) {
          highestIndex = i - j;
        }
        if (data[i - j].low < data[lowestIndex].low) {
          lowestIndex = i - j;
        }
      }

      const aroonUp = ((period - (i - highestIndex)) / period) * 100;
      const aroonDown = ((period - (i - lowestIndex)) / period) * 100;

      result.push({
        time: data[i].time,
        AroonUp: aroonUp,
        AroonDown: aroonDown,
      });
    }

    return result;
  }

  private calculateTRIX(data: OHLCV[], params: {
    period?: number;
  }): IndicatorResult[] {
    const period = params.period || 14;
    
    // 三重EMA
    const ema1 = this.calculateEMA(data, { period });
    const ema1Data = ema1.map((item, i) => ({
      ...data[i],
      close: item.EMA || 0
    }));
    
    const ema2 = this.calculateEMA(ema1Data, { period });
    const ema2Data = ema2.map((item, i) => ({
      ...data[i],
      close: item.EMA || 0
    }));
    
    const ema3 = this.calculateEMA(ema2Data, { period });

    const result: IndicatorResult[] = [];
    for (let i = 1; i < data.length; i++) {
      const current = ema3[i].EMA;
      const previous = ema3[i - 1].EMA;

      const trix = previous && previous !== 0 && current ? 
        ((current - previous) / previous) * 10000 : null;

      result.push({
        time: data[i].time,
        TRIX: trix,
      });
    }

    // 第一个值为null
    result.unshift({ time: data[0].time, TRIX: null });

    return result;
  }

  private calculateUltimateOscillator(data: OHLCV[], params: {
    period1?: number;
    period2?: number;
    period3?: number;
  }): IndicatorResult[] {
    const period1 = params.period1 || 7;
    const period2 = params.period2 || 14;
    const period3 = params.period3 || 28;
    const result: IndicatorResult[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < Math.max(period1, period2, period3) - 1) {
        result.push({ time: data[i].time, UltOsc: null });
        continue;
      }

      // 计算三个周期的平均值
      const calculateAvg = (period: number) => {
        let sumBP = 0;
        let sumTR = 0;

        for (let j = 0; j < period; j++) {
          const idx = i - j;
          if (idx <= 0) continue;

          const currentLow = data[idx].low;
          const prevClose = data[idx - 1].close;
          const truelow = Math.min(currentLow, prevClose);
          const bp = data[idx].close - truelow;
          
          const tr = Math.max(
            data[idx].high - data[idx].low,
            Math.abs(data[idx].high - prevClose),
            Math.abs(data[idx].low - prevClose)
          );

          sumBP += bp;
          sumTR += tr;
        }

        return sumTR > 0 ? sumBP / sumTR : 0;
      };

      const avg1 = calculateAvg(period1);
      const avg2 = calculateAvg(period2);
      const avg3 = calculateAvg(period3);

      const ultOsc = ((4 * avg1) + (2 * avg2) + avg3) / 7 * 100;

      result.push({
        time: data[i].time,
        UltOsc: ultOsc,
      });
    }

    return result;
  }
}

// ============================================================================
// Indicator Configs
// ============================================================================

export const INDICATOR_CONFIGS: Record<string, IndicatorConfig> = {
  MA: {
    id: 'MA',
    name: '移动平均线',
    type: 'overlay',
    category: 'trend',
    inputs: [
      {
        name: 'period',
        label: '周期',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        step: 1,
      },
      {
        name: 'source',
        label: '数据源',
        type: 'select',
        default: 'close',
        options: [
          { value: 'open', label: '开盘价' },
          { value: 'high', label: '最高价' },
          { value: 'low', label: '最低价' },
          { value: 'close', label: '收盘价' },
        ],
      },
    ],
    plots: [
      {
        name: 'MA',
        color: '#2196F3',
        lineWidth: 2,
        plotType: 'line',
      },
    ],
  },

  EMA: {
    id: 'EMA',
    name: '指数移动平均',
    type: 'overlay',
    category: 'trend',
    inputs: [
      {
        name: 'period',
        label: '周期',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
      },
    ],
    plots: [
      {
        name: 'EMA',
        color: '#FF6B00',
        lineWidth: 2,
        plotType: 'line',
      },
    ],
  },

  MACD: {
    id: 'MACD',
    name: 'MACD',
    type: 'separate',
    category: 'momentum',
    inputs: [
      { name: 'fastPeriod', label: '快线周期', type: 'number', default: 12 },
      { name: 'slowPeriod', label: '慢线周期', type: 'number', default: 26 },
      { name: 'signalPeriod', label: '信号线周期', type: 'number', default: 9 },
    ],
    plots: [
      { name: 'MACD', color: '#2196F3', lineWidth: 2, plotType: 'line' },
      { name: 'Signal', color: '#FF6B00', lineWidth: 2, plotType: 'line' },
      { name: 'Histogram', color: '#26A69A', plotType: 'histogram' },
    ],
  },

  RSI: {
    id: 'RSI',
    name: 'RSI',
    type: 'separate',
    category: 'momentum',
    inputs: [
      { name: 'period', label: '周期', type: 'number', default: 14, min: 1, max: 100 },
    ],
    plots: [
      { name: 'RSI', color: '#9C27B0', lineWidth: 2, plotType: 'line' },
    ],
  },

  BOLL: {
    id: 'BOLL',
    name: '布林带',
    type: 'overlay',
    category: 'volatility',
    inputs: [
      { name: 'period', label: '周期', type: 'number', default: 20 },
      { name: 'stdDev', label: '标准差倍数', type: 'number', default: 2, min: 0.5, max: 5, step: 0.5 },
    ],
    plots: [
      { name: 'Middle', color: '#2196F3', lineWidth: 1, plotType: 'line' },
      { name: 'Upper', color: '#EF5350', lineWidth: 1, plotType: 'line', lineStyle: 'dashed' },
      { name: 'Lower', color: '#26A69A', lineWidth: 1, plotType: 'line', lineStyle: 'dashed' },
    ],
  },

  KDJ: {
    id: 'KDJ',
    name: 'KDJ',
    type: 'separate',
    category: 'momentum',
    inputs: [
      { name: 'period', label: '周期', type: 'number', default: 9 },
      { name: 'signalPeriod', label: '信号周期', type: 'number', default: 3 },
    ],
    plots: [
      { name: 'K', color: '#2196F3', lineWidth: 2, plotType: 'line' },
      { name: 'D', color: '#FF6B00', lineWidth: 2, plotType: 'line' },
      { name: 'J', color: '#9C27B0', lineWidth: 2, plotType: 'line' },
    ],
  },

  ATR: {
    id: 'ATR',
    name: 'ATR',
    type: 'separate',
    category: 'volatility',
    inputs: [
      { name: 'period', label: '周期', type: 'number', default: 14 },
    ],
    plots: [
      { name: 'ATR', color: '#00BCD4', lineWidth: 2, plotType: 'line' },
    ],
  },
};

// ============================================================================
// Export
// ============================================================================

export const indicatorEngine = new IndicatorEngine();
