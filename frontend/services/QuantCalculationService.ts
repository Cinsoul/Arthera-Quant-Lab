/**
 * QuantCalculationService - 专业量化计算引擎
 * 
 * 功能：
 * - 基础统计（均值、方差、标准差）
 * - 收益率计算（简单收益率、对数收益率、累计收益率）
 * - 波动率计算（历史波动率、年化波动率）
 * - 协方差与相关性矩阵计算
 * - 风险指标（VaR, CVaR, 最大回撤）
 * - 回归分析（Beta, Alpha）
 * - 时间序列分析（不同时间框架的收益率）
 */

// ============================================================================
// Types
// ============================================================================

export interface ReturnCalculation {
  totalReturn: number;
  totalReturnPercent: string;
  annualizedReturn: number;
  annualizedReturnPercent: string;
  cumulativeReturn: number;
  volatility: number;
  volatilityPercent: string;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: string;
}

export interface TimeFrameReturns {
  '1天': ReturnCalculation;
  '5天': ReturnCalculation;
  '1月': ReturnCalculation;
  '6月': ReturnCalculation;
  '年至今': ReturnCalculation;
  '1年': ReturnCalculation;
  '5年': ReturnCalculation;
  '全部': ReturnCalculation;
}

export interface PriceData {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface BenchmarkData {
  symbol: string;
  returns: ReturnCalculation;
}

export interface ComparisonResult {
  stock: ReturnCalculation;
  benchmarks: {
    hs300: BenchmarkData;
    csi500: BenchmarkData;
    [key: string]: BenchmarkData;
  };
  outperform: {
    vs_hs300: boolean;
    vs_csi500: boolean;
  };
}

export class QuantCalculationService {
  private readonly TRADING_DAYS_PER_YEAR = 252; // A股年交易日数
  private readonly RISK_FREE_RATE = 0.025; // 无风险利率(2.5%)
  
  // ============================================================================
  // 收益率计算方法
  // ============================================================================
  
  /**
   * 计算简单收益率
   * @param startPrice 起始价格
   * @param endPrice 结束价格
   * @returns 收益率 (小数形式，如 0.15 表示 15%)
   */
  calculateSimpleReturn(startPrice: number, endPrice: number): number {
    if (startPrice <= 0) return 0;
    return (endPrice - startPrice) / startPrice;
  }
  
  /**
   * 计算对数收益率数组
   * @param prices 价格数组
   * @returns 对数收益率数组
   */
  calculateLogReturns(prices: number[]): number[] {
    if (prices.length < 2) return [];
    
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0 && prices[i] > 0) {
        returns.push(Math.log(prices[i] / prices[i - 1]));
      }
    }
    return returns;
  }
  
  /**
   * 计算历史波动率
   * @param prices 价格数组
   * @param annualized 是否年化
   * @returns 波动率 (小数形式)
   */
  calculateHistoricalVolatility(prices: number[], annualized: boolean = true): number {
    const logReturns = this.calculateLogReturns(prices);
    if (logReturns.length === 0) return 0;
    
    const volatility = this.stdDev(logReturns);
    return annualized ? volatility * Math.sqrt(this.TRADING_DAYS_PER_YEAR) : volatility;
  }
  
  /**
   * 计算夏普比率
   * @param returns 收益率数组
   * @param riskFreeRate 无风险利率 (年化)
   * @returns 夏普比率
   */
  calculateSharpeRatio(returns: number[], riskFreeRate: number = this.RISK_FREE_RATE): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = this.mean(returns) * this.TRADING_DAYS_PER_YEAR; // 年化收益
    const volatility = this.stdDev(returns) * Math.sqrt(this.TRADING_DAYS_PER_YEAR); // 年化波动率
    
    if (volatility === 0) return 0;
    return (avgReturn - riskFreeRate) / volatility;
  }
  
  /**
   * 根据价格数据计算完整的收益率指标
   * @param priceData 价格数据数组
   * @param periodDays 期间天数（用于年化计算）
   * @returns 收益率计算结果
   */
  calculateReturnsFromPrices(priceData: PriceData[], periodDays: number): ReturnCalculation {
    if (priceData.length < 2) {
      return this.getZeroReturns();
    }
    
    // 按时间排序
    const sortedData = [...priceData].sort((a, b) => a.timestamp - b.timestamp);
    const prices = sortedData.map(d => d.price);
    
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    
    // 总收益率
    const totalReturn = this.calculateSimpleReturn(startPrice, endPrice);
    
    // 年化收益率
    const yearFraction = periodDays / 365;
    const annualizedReturn = yearFraction > 0 ? Math.pow(1 + totalReturn, 1 / yearFraction) - 1 : totalReturn;
    
    // 累计收益率（复利）
    const cumulativeReturn = totalReturn;
    
    // 波动率
    const volatility = this.calculateHistoricalVolatility(prices, true);
    
    // 最大回撤
    const maxDrawdown = this.calculateMaxDrawdown(prices);
    
    // 夏普比率
    const logReturns = this.calculateLogReturns(prices);
    const sharpeRatio = this.calculateSharpeRatio(logReturns);
    
    return {
      totalReturn,
      totalReturnPercent: this.formatPercent(totalReturn),
      annualizedReturn,
      annualizedReturnPercent: this.formatPercent(annualizedReturn),
      cumulativeReturn,
      volatility,
      volatilityPercent: this.formatPercent(volatility),
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent: this.formatPercent(maxDrawdown),
    };
  }
  
  /**
   * 计算不同时间框架的收益率
   * @param allPriceData 全部价格数据
   * @param symbol 股票代码
   * @returns 各时间框架的收益率
   */
  calculateTimeFrameReturns(allPriceData: PriceData[], symbol: string): TimeFrameReturns {
    const now = Date.now();
    const results = {} as TimeFrameReturns;
    
    // 时间框架定义（毫秒）
    const timeFrames = {
      '1天': 1 * 24 * 60 * 60 * 1000,
      '5天': 5 * 24 * 60 * 60 * 1000,
      '1月': 30 * 24 * 60 * 60 * 1000,
      '6月': 6 * 30 * 24 * 60 * 60 * 1000,
      '年至今': this.getYTDPeriod(),
      '1年': 365 * 24 * 60 * 60 * 1000,
      '5年': 5 * 365 * 24 * 60 * 60 * 1000,
      '全部': 0, // 特殊处理
    };
    
    Object.entries(timeFrames).forEach(([timeFrame, periodMs]) => {
      let filteredData: PriceData[];
      let periodDays: number;
      
      if (timeFrame === '全部') {
        // 使用全部数据
        filteredData = allPriceData;
        const totalPeriodMs = allPriceData.length > 0 ? 
          allPriceData[allPriceData.length - 1].timestamp - allPriceData[0].timestamp : 0;
        periodDays = totalPeriodMs / (24 * 60 * 60 * 1000);
      } else {
        // 筛选指定时间范围的数据
        const startTime = now - periodMs;
        filteredData = allPriceData.filter(d => d.timestamp >= startTime);
        periodDays = periodMs / (24 * 60 * 60 * 1000);
      }
      
      results[timeFrame as keyof TimeFrameReturns] = this.calculateReturnsFromPrices(filteredData, periodDays);
    });
    
    return results;
  }
  
  /**
   * 计算与基准指数的比较
   * @param stockReturns 股票收益率
   * @param benchmarkReturns 基准收益率数据
   * @returns 比较结果
   */
  calculateBenchmarkComparison(
    stockReturns: ReturnCalculation,
    benchmarkReturns: { hs300: ReturnCalculation; csi500: ReturnCalculation }
  ): ComparisonResult {
    return {
      stock: stockReturns,
      benchmarks: {
        hs300: {
          symbol: '000300.SH',
          returns: benchmarkReturns.hs300,
        },
        csi500: {
          symbol: '000905.SH',
          returns: benchmarkReturns.csi500,
        },
      },
      outperform: {
        vs_hs300: stockReturns.totalReturn > benchmarkReturns.hs300.totalReturn,
        vs_csi500: stockReturns.totalReturn > benchmarkReturns.csi500.totalReturn,
      },
    };
  }
  
  // ============================================================================
  // 辅助方法
  // ============================================================================
  
  /**
   * 获取年初至今的时间跨度（毫秒）
   */
  private getYTDPeriod(): number {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return now.getTime() - yearStart.getTime();
  }
  
  /**
   * 格式化百分比显示
   * @param value 小数值
   * @param precision 精度
   * @returns 格式化的百分比字符串
   */
  private formatPercent(value: number, precision: number = 2): string {
    const percent = value * 100;
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(precision)}%`;
  }
  
  /**
   * 获取零收益率对象（用于异常情况）
   */
  private getZeroReturns(): ReturnCalculation {
    return {
      totalReturn: 0,
      totalReturnPercent: '+0.00%',
      annualizedReturn: 0,
      annualizedReturnPercent: '+0.00%',
      cumulativeReturn: 0,
      volatility: 0,
      volatilityPercent: '+0.00%',
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: '+0.00%',
    };
  }
  
  // ============================================================================
  // 原有方法保持不变
  // ============================================================================
  
  /**
   * 计算均值
   */
  mean(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  }

  /**
   * 计算标准差 (Population)
   */
  stdDev(data: number[]): number {
    if (data.length < 2) return 0;
    const m = this.mean(data);
    const variance = data.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * 计算协方差
   */
  covariance(dataA: number[], dataB: number[]): number {
    if (dataA.length !== dataB.length || dataA.length === 0) return 0;
    const meanA = this.mean(dataA);
    const meanB = this.mean(dataB);
    let sum = 0;
    for (let i = 0; i < dataA.length; i++) {
      sum += (dataA[i] - meanA) * (dataB[i] - meanB);
    }
    return sum / dataA.length;
  }

  /**
   * 计算皮尔逊相关系数
   */
  correlation(dataA: number[], dataB: number[]): number {
    const cov = this.covariance(dataA, dataB);
    const stdA = this.stdDev(dataA);
    const stdB = this.stdDev(dataB);
    if (stdA === 0 || stdB === 0) return 0;
    return cov / (stdA * stdB);
  }

  /**
   * 生成相关性矩阵
   */
  calculateCorrelationMatrix(dataset: Map<string, number[]>): Map<string, Map<string, number>> {
    const keys = Array.from(dataset.keys());
    const matrix = new Map<string, Map<string, number>>();

    keys.forEach(rowKey => {
      const rowMap = new Map<string, number>();
      keys.forEach(colKey => {
        if (rowKey === colKey) {
          rowMap.set(colKey, 1.0);
        } else {
          // 对称矩阵优化：如果已经计算过 (B, A)，直接取值
          if (matrix.has(colKey) && matrix.get(colKey)!.has(rowKey)) {
            rowMap.set(colKey, matrix.get(colKey)!.get(rowKey)!);
          } else {
            const dataA = dataset.get(rowKey) || [];
            const dataB = dataset.get(colKey) || [];
            const corr = this.correlation(dataA, dataB);
            rowMap.set(colKey, corr);
          }
        }
      });
      matrix.set(rowKey, rowMap);
    });

    return matrix;
  }

  /**
   * 计算参数法 VaR (Value at Risk)
   * @param value 组合总价值
   * @param volatility 组合波动率
   * @param confidenceLevel 置信度 (e.g., 0.95, 0.99)
   * @param days 时间跨度
   */
  calculateParametricVaR(value: number, volatility: number, confidenceLevel: number = 0.95, days: number = 1): number {
    // Z-score map
    const zScores: Record<number, number> = {
      0.90: 1.282,
      0.95: 1.645,
      0.99: 2.326
    };
    const z = zScores[confidenceLevel] || 1.645;
    return value * volatility * z * Math.sqrt(days);
  }

  /**
   * 计算最大回撤
   */
  calculateMaxDrawdown(prices: number[]): number {
    let maxPrice = 0;
    let maxDrawdown = 0;

    for (const price of prices) {
      if (price > maxPrice) {
        maxPrice = price;
      }
      const drawdown = (maxPrice - price) / maxPrice;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    return maxDrawdown * -1; // 返回负数表示跌幅
  }

  /**
   * 线性回归计算 Beta
   */
  calculateBeta(assetReturns: number[], benchmarkReturns: number[]): number {
    const cov = this.covariance(assetReturns, benchmarkReturns);
    const varBenchmark = Math.pow(this.stdDev(benchmarkReturns), 2);
    return varBenchmark === 0 ? 1 : cov / varBenchmark;
  }
  
  /**
   * 计算Alpha（Jensen's Alpha）
   * @param assetReturns 资产收益率
   * @param benchmarkReturns 基准收益率
   * @param riskFreeRate 无风险利率
   * @returns Alpha值
   */
  calculateAlpha(assetReturns: number[], benchmarkReturns: number[], riskFreeRate: number = this.RISK_FREE_RATE): number {
    if (assetReturns.length === 0 || benchmarkReturns.length === 0) return 0;
    
    const assetReturn = this.mean(assetReturns) * this.TRADING_DAYS_PER_YEAR;
    const benchmarkReturn = this.mean(benchmarkReturns) * this.TRADING_DAYS_PER_YEAR;
    const beta = this.calculateBeta(assetReturns, benchmarkReturns);
    
    return assetReturn - riskFreeRate - beta * (benchmarkReturn - riskFreeRate);
  }
  
  /**
   * 计算信息比率 (Information Ratio)
   * @param assetReturns 资产收益率
   * @param benchmarkReturns 基准收益率
   * @returns 信息比率
   */
  calculateInformationRatio(assetReturns: number[], benchmarkReturns: number[]): number {
    if (assetReturns.length !== benchmarkReturns.length || assetReturns.length === 0) return 0;
    
    const excessReturns = assetReturns.map((ret, i) => ret - benchmarkReturns[i]);
    const meanExcessReturn = this.mean(excessReturns) * this.TRADING_DAYS_PER_YEAR;
    const trackingError = this.stdDev(excessReturns) * Math.sqrt(this.TRADING_DAYS_PER_YEAR);
    
    return trackingError === 0 ? 0 : meanExcessReturn / trackingError;
  }

  // ============================================================================
  // 成交量分析方法
  // ============================================================================

  /**
   * 计算成交量加权平均价格 (VWAP)
   * @param volumeData 成交量数据数组
   * @returns VWAP价格
   */
  calculateVWAP(volumeData: VolumeData[]): number {
    if (volumeData.length === 0) return 0;
    
    let totalVolumeValue = 0;
    let totalVolume = 0;
    
    for (const data of volumeData) {
      if (data.volume > 0) {
        totalVolumeValue += data.price * data.volume;
        totalVolume += data.volume;
      }
    }
    
    return totalVolume > 0 ? totalVolumeValue / totalVolume : 0;
  }

  /**
   * 计算成交量趋势
   * @param volumeData 成交量数据数组
   * @returns 趋势方向
   */
  calculateVolumeTrend(volumeData: VolumeData[]): 'increasing' | 'decreasing' | 'stable' {
    if (volumeData.length < 10) return 'stable';
    
    const volumes = volumeData.map(d => d.volume);
    const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
    const secondHalf = volumes.slice(Math.floor(volumes.length / 2));
    
    const firstAvg = this.mean(firstHalf);
    const secondAvg = this.mean(secondHalf);
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (changePercent > 15) return 'increasing';
    if (changePercent < -15) return 'decreasing';
    return 'stable';
  }

  /**
   * 计算基尼系数（用于成交量集中度）
   * @param values 数值数组
   * @returns 基尼系数 (0-1)
   */
  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sortedValues = [...values].sort((a, b) => a - b);
    const n = sortedValues.length;
    const total = sortedValues.reduce((sum, val) => sum + val, 0);
    
    if (total === 0) return 0;
    
    let cumSum = 0;
    let giniSum = 0;
    
    for (let i = 0; i < n; i++) {
      cumSum += sortedValues[i];
      giniSum += (2 * (i + 1) - n - 1) * sortedValues[i];
    }
    
    return giniSum / (n * total);
  }

  /**
   * 计算综合成交量分析
   * @param volumeData 成交量数据数组
   * @returns 成交量分析结果
   */
  calculateVolumeAnalysis(volumeData: VolumeData[]): VolumeAnalysis {
    if (volumeData.length === 0) {
      return {
        totalVolume: 0,
        avgVolume: 0,
        volumeVolatility: 0,
        vwap: 0,
        volumeTrend: 'stable',
        relativeVolume: 1,
        volumeConcentration: 0,
      };
    }

    const volumes = volumeData.map(d => d.volume).filter(v => v > 0);
    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
    const avgVolume = totalVolume / volumes.length;
    
    // 成交量波动率
    const volumeVolatility = volumes.length > 1 ? this.stdDev(volumes) / this.mean(volumes) : 0;
    
    // VWAP
    const vwap = this.calculateVWAP(volumeData);
    
    // 成交量趋势
    const volumeTrend = this.calculateVolumeTrend(volumeData);
    
    // 相对成交量比率（最近vs历史平均）
    let relativeVolume = 1;
    if (volumes.length >= 20) {
      const recent = volumes.slice(-5);
      const historical = volumes.slice(0, -5);
      const recentAvg = this.mean(recent);
      const historicalAvg = this.mean(historical);
      relativeVolume = historicalAvg > 0 ? recentAvg / historicalAvg : 1;
    }
    
    // 成交量集中度
    const volumeConcentration = this.calculateGiniCoefficient(volumes);

    return {
      totalVolume,
      avgVolume,
      volumeVolatility,
      vwap,
      volumeTrend,
      relativeVolume,
      volumeConcentration,
    };
  }

  /**
   * 计算流动性评分
   * @param turnoverRate 换手率
   * @param avgTurnover 平均成交额
   * @param volumeVolatility 成交量波动率
   * @returns 流动性评分 (0-100)
   */
  private calculateLiquidityScore(
    turnoverRate: number, 
    avgTurnover: number, 
    volumeVolatility: number
  ): number {
    // 基础评分：基于换手率
    let score = Math.min(turnoverRate * 10, 40); // 最高40分
    
    // 成交额加分：基于平均成交额
    if (avgTurnover > 1e8) score += 20; // 1亿以上+20分
    else if (avgTurnover > 1e7) score += 15; // 1千万以上+15分
    else if (avgTurnover > 1e6) score += 10; // 100万以上+10分
    else score += 5; // 其他+5分
    
    // 稳定性加分：成交量波动率越低越好
    const volatilityScore = Math.max(0, 40 - volumeVolatility * 100);
    score += volatilityScore;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * 计算换手率分析
   * @param volumeData 成交量数据数组
   * @param totalShares 总股本
   * @returns 换手率分析结果
   */
  calculateTurnoverAnalysis(volumeData: VolumeData[], totalShares: number = 1e8): TurnoverAnalysis {
    if (volumeData.length === 0) {
      return {
        totalTurnover: 0,
        avgTurnover: 0,
        turnoverRate: 0,
        liquidityScore: 0,
        marketImpact: 0,
        turnoverTrend: 'stable',
      };
    }

    const turnovers = volumeData.map(d => d.turnover).filter(t => t > 0);
    const volumes = volumeData.map(d => d.volume).filter(v => v > 0);
    
    const totalTurnover = turnovers.reduce((sum, turnover) => sum + turnover, 0);
    const avgTurnover = totalTurnover / turnovers.length;
    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
    
    // 换手率计算
    const turnoverRate = totalVolume / totalShares;
    
    // 成交量波动率（用于流动性评分）
    const volumeVolatility = volumes.length > 1 ? this.stdDev(volumes) / this.mean(volumes) : 0;
    
    // 流动性评分
    const liquidityScore = this.calculateLiquidityScore(turnoverRate, avgTurnover, volumeVolatility);
    
    // 市场冲击成本估算（简化模型）
    const marketImpact = Math.min(0.1, 1 / Math.sqrt(avgTurnover / 1e6)); // 基于成交额的简化模型
    
    // 换手趋势
    const turnoverTrend = this.calculateVolumeTrend(volumeData); // 复用成交量趋势逻辑

    return {
      totalTurnover,
      avgTurnover,
      turnoverRate,
      liquidityScore,
      marketImpact,
      turnoverTrend,
    };
  }

  /**
   * 计算综合成交量质量评估
   * @param volumeData 成交量数据数组
   * @param totalShares 总股本
   * @returns 包含成交量和换手率分析的综合结果
   */
  calculateVolumeQualityAssessment(volumeData: VolumeData[], totalShares: number = 1e8): {
    volume: VolumeAnalysis;
    turnover: TurnoverAnalysis;
    overallQuality: number; // 综合质量评分 (0-100)
  } {
    const volumeAnalysis = this.calculateVolumeAnalysis(volumeData);
    const turnoverAnalysis = this.calculateTurnoverAnalysis(volumeData, totalShares);
    
    // 综合质量评分
    let overallQuality = 0;
    
    // VWAP准确性权重: 30%
    const vwapScore = volumeAnalysis.vwap > 0 ? 30 : 0;
    
    // 流动性权重: 40%
    const liquidityScore = (turnoverAnalysis.liquidityScore / 100) * 40;
    
    // 成交量稳定性权重: 30%
    const stabilityScore = Math.max(0, 30 - volumeAnalysis.volumeVolatility * 100);
    
    overallQuality = vwapScore + liquidityScore + stabilityScore;
    
    return {
      volume: volumeAnalysis,
      turnover: turnoverAnalysis,
      overallQuality: Math.min(100, Math.max(0, overallQuality)),
    };
  }

  // ============================================================================
  // 技术指标计算方法
  // ============================================================================

  /**
   * 计算简单移动平均线 (SMA)
   * @param data 价格数据数组
   * @param period 周期
   * @returns SMA数组
   */
  calculateSMA(data: number[], period: number): number[] {
    if (data.length < period) return [];
    
    const sma: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      sma.push(this.mean(slice));
    }
    return sma;
  }

  /**
   * 计算指数移动平均线 (EMA)
   * @param data 价格数据数组
   * @param period 周期
   * @returns EMA数组
   */
  calculateEMA(data: number[], period: number): number[] {
    if (data.length === 0) return [];
    
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // 第一个EMA值使用SMA
    ema.push(data[0]);
    
    for (let i = 1; i < data.length; i++) {
      const value = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
      ema.push(value);
    }
    
    return ema;
  }

  /**
   * 计算相对强弱指标 (RSI)
   * @param prices 价格数组
   * @param period 计算周期 (默认14)
   * @returns RSI数据数组
   */
  calculateRSI(prices: number[], period: number = 14): RSIData[] {
    if (prices.length < period + 1) return [];
    
    const gains: number[] = [];
    const losses: number[] = [];
    const rsiData: RSIData[] = [];
    
    // 计算价格变动
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }
    
    // 计算初始平均收益和损失
    let avgGain = this.mean(gains.slice(0, period));
    let avgLoss = this.mean(losses.slice(0, period));
    
    // 计算RSI
    for (let i = period; i < gains.length; i++) {
      // Wilder的平滑方法
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      let signal: 'overbought' | 'oversold' | 'neutral';
      if (rsi >= 70) signal = 'overbought';
      else if (rsi <= 30) signal = 'oversold';
      else signal = 'neutral';
      
      rsiData.push({
        timestamp: Date.now() - (gains.length - i) * 24 * 60 * 60 * 1000, // 模拟时间戳
        rsi,
        signal
      });
    }
    
    return rsiData;
  }

  /**
   * 计算MACD指标
   * @param prices 价格数组
   * @param fastPeriod 快线周期 (默认12)
   * @param slowPeriod 慢线周期 (默认26)
   * @param signalPeriod 信号线周期 (默认9)
   * @returns MACD数据数组
   */
  calculateMACD(
    prices: number[], 
    fastPeriod: number = 12, 
    slowPeriod: number = 26, 
    signalPeriod: number = 9
  ): MACDData[] {
    if (prices.length < slowPeriod) return [];
    
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    if (fastEMA.length < slowPeriod || slowEMA.length < slowPeriod) return [];
    
    // 计算MACD线
    const macdLine: number[] = [];
    const startIndex = slowPeriod - 1;
    
    for (let i = startIndex; i < fastEMA.length; i++) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
    
    // 计算信号线 (MACD的EMA)
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    
    // 计算柱状图 (MACD - Signal)
    const macdData: MACDData[] = [];
    const signalStartIndex = signalPeriod - 1;
    
    for (let i = signalStartIndex; i < macdLine.length; i++) {
      const macd = macdLine[i];
      const signal = signalLine[i - signalStartIndex];
      const histogram = macd - signal;
      
      // 判断交叉信号
      let crossover: 'bullish' | 'bearish' | 'none' = 'none';
      if (i > signalStartIndex) {
        const prevMacd = macdLine[i - 1];
        const prevSignal = signalLine[i - signalStartIndex - 1];
        
        if (prevMacd <= prevSignal && macd > signal) {
          crossover = 'bullish'; // 金叉
        } else if (prevMacd >= prevSignal && macd < signal) {
          crossover = 'bearish'; // 死叉
        }
      }
      
      macdData.push({
        timestamp: Date.now() - (macdLine.length - i) * 24 * 60 * 60 * 1000, // 模拟时间戳
        macd,
        signal,
        histogram,
        crossover
      });
    }
    
    return macdData;
  }

  /**
   * 计算KDJ指标
   * @param highs 最高价数组
   * @param lows 最低价数组
   * @param closes 收盘价数组
   * @param period K值计算周期 (默认9)
   * @param kPeriod K值平滑周期 (默认3)
   * @param dPeriod D值平滑周期 (默认3)
   * @returns KDJ数据数组
   */
  calculateKDJ(
    highs: number[], 
    lows: number[], 
    closes: number[], 
    period: number = 9,
    kPeriod: number = 3,
    dPeriod: number = 3
  ): KDJData[] {
    if (highs.length < period || highs.length !== lows.length || highs.length !== closes.length) {
      return [];
    }
    
    const rsvData: number[] = [];
    const kdjData: KDJData[] = [];
    
    // 计算RSV (Raw Stochastic Value)
    for (let i = period - 1; i < closes.length; i++) {
      const periodHighs = highs.slice(i - period + 1, i + 1);
      const periodLows = lows.slice(i - period + 1, i + 1);
      
      const highestHigh = Math.max(...periodHighs);
      const lowestLow = Math.min(...periodLows);
      
      const rsv = lowestLow === highestHigh ? 0 : 
        ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      
      rsvData.push(rsv);
    }
    
    // 计算K值 (RSV的移动平均)
    let k = 50; // 初始K值
    let d = 50; // 初始D值
    
    for (let i = 0; i < rsvData.length; i++) {
      // K值计算 (平滑)
      k = (2 / 3) * k + (1 / 3) * rsvData[i];
      
      // D值计算 (K值的平滑)
      d = (2 / 3) * d + (1 / 3) * k;
      
      // J值计算
      const j = 3 * k - 2 * d;
      
      // 判断信号
      let signal: 'overbought' | 'oversold' | 'neutral';
      if (k >= 80 && d >= 80) signal = 'overbought';
      else if (k <= 20 && d <= 20) signal = 'oversold';
      else signal = 'neutral';
      
      kdjData.push({
        timestamp: Date.now() - (rsvData.length - i) * 24 * 60 * 60 * 1000, // 模拟时间戳
        k,
        d,
        j,
        signal
      });
    }
    
    return kdjData;
  }

  /**
   * 计算综合技术指标
   * @param priceData 价格数据数组
   * @returns 综合技术指标结果
   */
  calculateTechnicalIndicators(priceData: PriceData[]): TechnicalIndicators {
    if (priceData.length === 0) {
      return {
        rsi: [],
        macd: [],
        kdj: [],
        sma: [],
        ema: []
      };
    }

    // 按时间排序
    const sortedData = [...priceData].sort((a, b) => a.timestamp - b.timestamp);
    const prices = sortedData.map(d => d.price);
    
    // 为KDJ计算模拟高低价 (简化实现)
    const highs = prices.map(p => p * 1.02); // 假设高价比收盘价高2%
    const lows = prices.map(p => p * 0.98);  // 假设低价比收盘价低2%
    
    return {
      rsi: this.calculateRSI(prices, 14),
      macd: this.calculateMACD(prices, 12, 26, 9),
      kdj: this.calculateKDJ(highs, lows, prices, 9, 3, 3),
      sma: [
        { period: 5, values: this.calculateSMA(prices, 5) },
        { period: 10, values: this.calculateSMA(prices, 10) },
        { period: 20, values: this.calculateSMA(prices, 20) },
        { period: 60, values: this.calculateSMA(prices, 60) },
      ],
      ema: [
        { period: 12, values: this.calculateEMA(prices, 12) },
        { period: 26, values: this.calculateEMA(prices, 26) },
        { period: 50, values: this.calculateEMA(prices, 50) },
      ]
    };
  }
}

// Singleton
let instance: QuantCalculationService | null = null;
export function getQuantCalculationService(): QuantCalculationService {
  if (!instance) {
    instance = new QuantCalculationService();
  }
  return instance;
}

export default QuantCalculationService;

// ============================================================================
// 成交量分析相关类型
// ============================================================================

export interface VolumeData {
  timestamp: number;
  volume: number;
  turnover: number;
  price: number;
}

export interface VolumeAnalysis {
  totalVolume: number;
  avgVolume: number;
  volumeVolatility: number;
  vwap: number; // 成交量加权平均价
  volumeTrend: 'increasing' | 'decreasing' | 'stable';
  relativeVolume: number; // 相对成交量比率
  volumeConcentration: number; // 成交量集中度 (基于基尼系数)
}

export interface TurnoverAnalysis {
  totalTurnover: number;
  avgTurnover: number;
  turnoverRate: number; // 换手率
  liquidityScore: number; // 流动性评分 (0-100)
  marketImpact: number; // 市场冲击成本估算
  turnoverTrend: 'increasing' | 'decreasing' | 'stable';
}

// ============================================================================
// 技术指标相关类型
// ============================================================================

export interface RSIData {
  timestamp: number;
  rsi: number;
  signal: 'overbought' | 'oversold' | 'neutral';
}

export interface MACDData {
  timestamp: number;
  macd: number;
  signal: number;
  histogram: number;
  crossover: 'bullish' | 'bearish' | 'none';
}

export interface KDJData {
  timestamp: number;
  k: number;
  d: number;
  j: number;
  signal: 'overbought' | 'oversold' | 'neutral';
}

export interface TechnicalIndicators {
  rsi: RSIData[];
  macd: MACDData[];
  kdj: KDJData[];
  sma: { period: number; values: number[] }[];
  ema: { period: number; values: number[] }[];
}
