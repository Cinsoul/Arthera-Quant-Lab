/**
 * RiskAnalysisService - 风险分析服务
 * 
 * 功能：
 * - VaR（Value at Risk）计算
 * - CVaR（Conditional VaR）计算
 * - 波动率分析
 * - Beta系数计算
 * - 相关性分析
 * - 压力测试
 * - 风险归因
 */

import { OHLCV } from './HistoricalDataService';

// ============================================================================
// Types
// ============================================================================

export interface RiskMetrics {
  // 波动性指标
  volatility: number;          // 波动率（年化）
  downsideVolatility: number;  // 下行波动率
  
  // 风险价值
  var95: number;               // 95% VaR
  var99: number;               // 99% VaR
  cvar95: number;              // 95% CVaR
  cvar99: number;              // 99% CVaR
  
  // 市场风险
  beta: number;                // Beta系数
  alpha: number;               // Alpha系数
  correlation: number;         // 与市场相关系数
  
  // 回撤指标
  maxDrawdown: number;
  currentDrawdown: number;
  drawdownDuration: number;    // 回撤持续天数
  
  // 其他风险指标
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio: number;
  treynorRatio: number;
}

export interface StressTestScenario {
  name: string;
  description: string;
  shockType: 'price' | 'volatility' | 'correlation';
  magnitude: number;           // 冲击幅度（百分比）
}

export interface StressTestResult {
  scenario: StressTestScenario;
  originalValue: number;
  stressedValue: number;
  loss: number;
  lossPercent: number;
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];          // 相关系数矩阵
}

export interface RiskContribution {
  symbol: string;
  weight: number;              // 权重
  volatility: number;          // 个股波动率
  contribution: number;        // 对组合风险的贡献
  contributionPercent: number;
}

// 贝叶斯风险控制类型
export interface BayesianRiskParams {
  priorMean: number;           // 先验均值
  priorVariance: number;       // 先验方差
  observationVariance: number; // 观测方差
  confidenceLevel: number;     // 置信水平
  updateFrequency: number;     // 更新频率（分钟）
}

export interface BayesianPositionMetrics {
  optimalSize: number;         // 最优仓位大小
  kellyFraction: number;       // Kelly比例
  bayesianAlpha: number;       // 贝叶斯Alpha
  posteriorMean: number;       // 后验均值
  posteriorVariance: number;   // 后验方差
  confidenceInterval: [number, number]; // 置信区间
  riskAdjustedSize: number;    // 风险调整后仓位
  maxDrawdownLimit: number;    // 最大回撤限制
}

export interface DynamicStopLoss {
  initialStop: number;         // 初始止损
  trailingStop: number;        // 跟踪止损
  volatilityStop: number;      // 波动率止损
  bayesianStop: number;        // 贝叶斯止损
  recommendedStop: number;     // 推荐止损
}

// 机构级风险管理新增类型
export interface LiquidityRisk {
  averageDailyVolume: number;  // 平均日成交量
  liquidityRatio: number;      // 流动性比率
  bidAskSpread: number;        // 买卖价差
  impactCost: number;          // 市场冲击成本
  liquidationDays: number;     // 预估清仓天数
}

export interface ConcentrationRisk {
  top5Holdings: number;        // 前5大持仓占比
  top10Holdings: number;       // 前10大持仓占比
  sectorConcentration: { [sector: string]: number };  // 行业集中度
  herfindahlIndex: number;     // 赫芬达尔指数
}

export interface OperationalRisk {
  keyPersonRisk: number;       // 关键人员风险
  systemDowntimeRisk: number;  // 系统宕机风险
  modelRisk: number;          // 模型风险
  complianceRisk: number;     // 合规风险
  dataQualityRisk: number;    // 数据质量风险
}

export interface InstitutionalRiskMetrics extends RiskMetrics {
  // 流动性风险
  liquidityRisk: LiquidityRisk;
  
  // 集中度风险
  concentrationRisk: ConcentrationRisk;
  
  // 操作风险
  operationalRisk: OperationalRisk;
  
  // 信用风险
  counterpartyRisk: number;
  
  // ESG风险
  esgRisk: {
    environmental: number;
    social: number;
    governance: number;
    composite: number;
  };
  
  // 监管资本要求
  regulatoryCapital: {
    var: number;             // VaR资本要求
    stressedVar: number;     // 压力VaR
    incrementalRisk: number; // 增量风险
    comprehensiveRisk: number; // 综合风险
  };
}

// ============================================================================
// Risk Analysis Service
// ============================================================================

export class RiskAnalysisService {
  async initialize(_: { enableRealData?: boolean } = {}): Promise<void> {
    // Risk analysis calculations are synchronous; nothing to initialize.
    return Promise.resolve();
  }

  /**
   * 计算完整风险指标
   */
  calculateRiskMetrics(
    returns: number[],
    benchmarkReturns?: number[],
    riskFreeRate: number = 0.03
  ): RiskMetrics {
    const sanitizedReturns = this.sanitizeSeries(returns);
    const sanitizedBenchmark = this.sanitizeSeries(benchmarkReturns);

    if (sanitizedReturns.length === 0) {
      return this.createEmptyRiskMetrics();
    }

    // 波动率
    const volatility = this.calculateVolatility(sanitizedReturns) * Math.sqrt(252);
    const downsideReturns = sanitizedReturns.filter(r => r < 0);
    const downsideVolatility = this.calculateVolatility(downsideReturns) * Math.sqrt(252);

    // VaR & CVaR
    const var95 = this.calculateVaR(sanitizedReturns, 0.95);
    const var99 = this.calculateVaR(sanitizedReturns, 0.99);
    const cvar95 = this.calculateCVaR(sanitizedReturns, 0.95);
    const cvar99 = this.calculateCVaR(sanitizedReturns, 0.99);

    // Beta & Alpha
    let beta = 0;
    let alpha = 0;
    let correlation = 0;
    if (sanitizedBenchmark.length === sanitizedReturns.length && sanitizedBenchmark.length > 0) {
      beta = this.calculateBeta(sanitizedReturns, sanitizedBenchmark);
      const avgReturn = this.mean(sanitizedReturns) * 252;
      const avgBenchmark = this.mean(sanitizedBenchmark) * 252;
      alpha = avgReturn - (riskFreeRate + beta * (avgBenchmark - riskFreeRate));
      correlation = this.calculateCorrelation(sanitizedReturns, sanitizedBenchmark);
    }

    // 回撤
    const cumReturns = this.calculateCumulativeReturns(sanitizedReturns);
    const { maxDrawdown, currentDrawdown, drawdownDuration } = this.calculateDrawdown(cumReturns);

    // 夏普比率
    const avgReturn = this.mean(sanitizedReturns) * 252;
    const sharpeRatio = volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;

    // 索提诺比率
    const sortinoRatio = downsideVolatility > 0 ? (avgReturn - riskFreeRate) / downsideVolatility : 0;

    // 卡玛比率
    const calmarRatio = maxDrawdown > 0 ? avgReturn / (maxDrawdown / 100) : 0;

    // 信息比率
    let informationRatio = 0;
    if (sanitizedBenchmark.length === sanitizedReturns.length && sanitizedBenchmark.length > 0) {
      const excessReturns = sanitizedReturns.map((r, i) => r - (sanitizedBenchmark[i] || 0));
      const trackingError = this.calculateVolatility(excessReturns) * Math.sqrt(252);
      informationRatio = trackingError > 0 ? (avgReturn - this.mean(sanitizedBenchmark) * 252) / trackingError : 0;
    }

    // 特雷诺比率
    const treynorRatio = beta !== 0 ? (avgReturn - riskFreeRate) / beta : 0;

    return {
      volatility,
      downsideVolatility,
      var95,
      var99,
      cvar95,
      cvar99,
      beta,
      alpha,
      correlation,
      maxDrawdown,
      currentDrawdown,
      drawdownDuration,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      informationRatio,
      treynorRatio,
    };
  }

  /**
   * 计算VaR（历史模拟法）
   */
  calculateVaR(returns: number[], confidence: number = 0.95): number {
    if (returns.length === 0) return 0;

    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    
    return Math.abs(sorted[index] || 0) * 100; // 转换为百分比
  }

  /**
   * 计算CVaR（条件VaR/期望损失）
   */
  calculateCVaR(returns: number[], confidence: number = 0.95): number {
    if (returns.length === 0) return 0;

    const var_ = -this.calculateVaR(returns, confidence) / 100;
    const tailLosses = returns.filter(r => r <= var_);
    
    if (tailLosses.length === 0) return 0;

    const cvar = this.mean(tailLosses);
    return Math.abs(cvar) * 100; // 转换为百分比
  }

  /**
   * 计算VaR（参数法 - 假设正态分布）
   */
  calculateParametricVaR(returns: number[], confidence: number = 0.95): number {
    const mean = this.mean(returns);
    const std = this.calculateVolatility(returns);
    
    // 根据置信度获取Z分数
    const zScore = this.getZScore(confidence);
    
    // VaR = mean - zScore * std
    const var_ = -(mean - zScore * std);
    
    return var_ * 100; // 转换为百分比
  }

  /**
   * 计算VaR（蒙特卡洛法）
   */
  calculateMonteCarloVaR(
    returns: number[],
    confidence: number = 0.95,
    simulations: number = 10000
  ): number {
    const mean = this.mean(returns);
    const std = this.calculateVolatility(returns);
    
    // 生成模拟收益
    const simulatedReturns: number[] = [];
    for (let i = 0; i < simulations; i++) {
      const randomReturn = this.normalRandom(mean, std);
      simulatedReturns.push(randomReturn);
    }

    // 计算VaR
    return this.calculateVaR(simulatedReturns, confidence);
  }

  /**
   * 计算Beta系数
   */
  calculateBeta(assetReturns: number[], marketReturns: number[]): number {
    if (assetReturns.length !== marketReturns.length || assetReturns.length === 0) {
      return 0;
    }

    const covariance = this.calculateCovariance(assetReturns, marketReturns);
    const marketVariance = this.calculateVariance(marketReturns);

    return marketVariance !== 0 ? covariance / marketVariance : 0;
  }

  /**
   * 计算相关系数
   */
  calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const covariance = this.calculateCovariance(x, y);
    const stdX = this.calculateVolatility(x);
    const stdY = this.calculateVolatility(y);

    return (stdX !== 0 && stdY !== 0) ? covariance / (stdX * stdY) : 0;
  }

  /**
   * 计算相关系数矩阵
   */
  calculateCorrelationMatrix(returns: Map<string, number[]>): CorrelationMatrix {
    const symbols = Array.from(returns.keys());
    const n = symbols.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          const returnsI = returns.get(symbols[i]) || [];
          const returnsJ = returns.get(symbols[j]) || [];
          matrix[i][j] = this.calculateCorrelation(returnsI, returnsJ);
        }
      }
    }

    return { symbols, matrix };
  }

  /**
   * 压力测试
   */
  runStressTest(
    portfolioValue: number,
    positions: Map<string, number>,
    scenarios: StressTestScenario[]
  ): StressTestResult[] {
    return scenarios.map(scenario => {
      let stressedValue = portfolioValue;

      if (scenario.shockType === 'price') {
        // 价格冲击：所有资产价格下跌
        const shockFactor = 1 - scenario.magnitude / 100;
        stressedValue = portfolioValue * shockFactor;
      } else if (scenario.shockType === 'volatility') {
        // 波动率冲击：假设损失与波动率成正比
        const shockFactor = scenario.magnitude / 100;
        stressedValue = portfolioValue * (1 - shockFactor);
      }

      const loss = portfolioValue - stressedValue;
      const lossPercent = (loss / portfolioValue) * 100;

      return {
        scenario,
        originalValue: portfolioValue,
        stressedValue,
        loss,
        lossPercent,
      };
    });
  }

  /**
   * 计算风险贡献度
   */
  calculateRiskContribution(
    weights: Map<string, number>,
    returns: Map<string, number[]>
  ): RiskContribution[] {
    const symbols = Array.from(weights.keys());
    const contributions: RiskContribution[] = [];

    // 计算组合总波动率
    const portfolioReturns = this.calculatePortfolioReturns(weights, returns);
    const portfolioVol = this.calculateVolatility(portfolioReturns) * Math.sqrt(252);

    symbols.forEach(symbol => {
      const weight = weights.get(symbol) || 0;
      const assetReturns = returns.get(symbol) || [];
      const assetVol = this.calculateVolatility(assetReturns) * Math.sqrt(252);

      // 边际风险贡献 = weight * beta * portfolio_vol
      const beta = this.calculateBeta(assetReturns, portfolioReturns);
      const contribution = weight * beta * portfolioVol;
      const contributionPercent = portfolioVol !== 0 ? (contribution / portfolioVol) * 100 : 0;

      contributions.push({
        symbol,
        weight,
        volatility: assetVol,
        contribution,
        contributionPercent,
      });
    });

    return contributions.sort((a, b) => b.contribution - a.contribution);
  }

  /**
   * 计算组合收益率
   */
  private calculatePortfolioReturns(
    weights: Map<string, number>,
    returns: Map<string, number[]>
  ): number[] {
    const symbols = Array.from(weights.keys());
    if (symbols.length === 0) return [];

    const firstReturns = returns.get(symbols[0]) || [];
    const portfolioReturns: number[] = Array(firstReturns.length).fill(0);

    symbols.forEach(symbol => {
      const weight = weights.get(symbol) || 0;
      const assetReturns = returns.get(symbol) || [];

      assetReturns.forEach((ret, i) => {
        portfolioReturns[i] += weight * ret;
      });
    });

    return portfolioReturns;
  }

  /**
   * 计算波动率
   */
  private calculateVolatility(returns: number[]): number {
    const valid = this.sanitizeSeries(returns);
    if (valid.length === 0) return 0;

    const mean = this.mean(valid);
    const variance = valid.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / valid.length;
    
    return Math.sqrt(variance);
  }

  /**
   * 计算方差
   */
  private calculateVariance(data: number[]): number {
    // 检查数据有效性
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[RiskAnalysisService] calculateVariance: Invalid or empty data array');
      return 0;
    }
    
    // 过滤无效数据
    const validData = data.filter(x => typeof x === 'number' && !isNaN(x) && isFinite(x));
    if (validData.length === 0) {
      console.warn('[RiskAnalysisService] calculateVariance: No valid data points');
      return 0;
    }
    
    if (validData.length === 1) {
      return 0; // 只有一个数据点时，方差为0
    }
    
    const mean = this.mean(validData);
    return validData.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / validData.length;
  }

  /**
   * 计算协方差
   */
  private calculateCovariance(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const meanX = this.mean(x);
    const meanY = this.mean(y);

    let sum = 0;
    for (let i = 0; i < x.length; i++) {
      sum += (x[i] - meanX) * (y[i] - meanY);
    }

    return sum / x.length;
  }

  /**
   * 计算均值 - 增强空数据处理
   */
  private mean(data: number[]): number {
    // 检查数据有效性
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[RiskAnalysisService] mean: Invalid or empty data array');
      return 0;
    }
    
    // 过滤无效数据
    const validData = data.filter(x => typeof x === 'number' && !isNaN(x) && isFinite(x));
    if (validData.length === 0) {
      console.warn('[RiskAnalysisService] mean: No valid data points');
      return 0;
    }
    
    return validData.reduce((sum, x) => sum + x, 0) / validData.length;
  }

  /**
   * 计算累计收益
   */
  private calculateCumulativeReturns(returns: number[]): number[] {
    const safeReturns = this.sanitizeSeries(returns);
    const cumReturns: number[] = [];
    let cum = 1;

    safeReturns.forEach(ret => {
      cum *= (1 + ret);
      cumReturns.push(cum - 1);
    });

    return cumReturns;
  }

  private sanitizeSeries(data?: number[]): number[] {
    if (!Array.isArray(data)) {
      return [];
    }
    return data.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value));
  }

  private createEmptyRiskMetrics(): RiskMetrics {
    return {
      volatility: 0,
      downsideVolatility: 0,
      var95: 0,
      var99: 0,
      cvar95: 0,
      cvar99: 0,
      beta: 0,
      alpha: 0,
      correlation: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      drawdownDuration: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      informationRatio: 0,
      treynorRatio: 0,
    };
  }

  /**
   * 计算回撤
   */
  private calculateDrawdown(cumReturns: number[]): {
    maxDrawdown: number;
    currentDrawdown: number;
    drawdownDuration: number;
  } {
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let peak = 0;
    let drawdownStart = 0;
    let maxDrawdownDuration = 0;

    cumReturns.forEach((ret, i) => {
      const value = 1 + ret;
      
      if (value > peak) {
        peak = value;
        drawdownStart = i;
      }

      const drawdown = ((peak - value) / peak) * 100;
      currentDrawdown = drawdown;

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownDuration = i - drawdownStart;
      }
    });

    return {
      maxDrawdown,
      currentDrawdown,
      drawdownDuration: maxDrawdownDuration,
    };
  }

  /**
   * 获取正态分布的Z分数
   */
  private getZScore(confidence: number): number {
    // 常用置信度对应的Z分数
    const zScores: Record<number, number> = {
      0.90: 1.28,
      0.95: 1.645,
      0.99: 2.33,
    };

    return zScores[confidence] || 1.96; // 默认95%
  }

  /**
   * 生成正态分布随机数（Box-Muller变换）
   */
  private normalRandom(mean: number = 0, std: number = 1): number {
    const u1 = Math.random();
    const u2 = Math.random();
    
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    return mean + z0 * std;
  }

  // ============================================================================
  // 贝叶斯风险控制方法
  // ============================================================================

  /**
   * 计算贝叶斯位置管理指标 (增强版 - 支持基本面数据)
   */
  calculateBayesianPositionMetrics(
    returns: number[],
    currentPrice: number,
    portfolioValue: number,
    params: BayesianRiskParams,
    fundamentalData?: { pe?: number; pb?: number; roe?: number; grossMargin?: number }
  ): BayesianPositionMetrics {
    if (returns.length === 0) {
      return this.getEmptyBayesianMetrics();
    }

    // 计算观测统计量
    const observedMean = this.mean(returns);
    const observedVariance = this.calculateVariance(returns);
    const n = returns.length;

    // 贝叶斯更新：后验分布参数
    const precisionPrior = 1 / params.priorVariance;
    const precisionObservation = n / params.observationVariance;
    const precisionPosterior = precisionPrior + precisionObservation;

    let adjustedPriorMean = params.priorMean;
    
    // 基本面调整：如果有基本面数据，调整先验均值
    if (fundamentalData) {
      let fundamentalScore = 0;
      let factorCount = 0;
      
      // PE估值调整 (低PE更有利)
      if (fundamentalData.pe && fundamentalData.pe > 0) {
        const peScore = fundamentalData.pe < 15 ? 0.2 : fundamentalData.pe < 25 ? 0.1 : fundamentalData.pe > 50 ? -0.1 : 0;
        fundamentalScore += peScore;
        factorCount++;
      }
      
      // PB估值调整 (低PB更有利)
      if (fundamentalData.pb && fundamentalData.pb > 0) {
        const pbScore = fundamentalData.pb < 1.5 ? 0.15 : fundamentalData.pb < 3 ? 0.05 : fundamentalData.pb > 5 ? -0.05 : 0;
        fundamentalScore += pbScore;
        factorCount++;
      }
      
      // ROE盈利能力调整 (高ROE更有利)
      if (fundamentalData.roe && fundamentalData.roe > 0) {
        const roeScore = fundamentalData.roe > 20 ? 0.2 : fundamentalData.roe > 15 ? 0.1 : fundamentalData.roe < 5 ? -0.1 : 0;
        fundamentalScore += roeScore;
        factorCount++;
      }
      
      // 毛利率调整
      if (fundamentalData.grossMargin && fundamentalData.grossMargin > 0) {
        const marginScore = fundamentalData.grossMargin > 40 ? 0.1 : fundamentalData.grossMargin > 25 ? 0.05 : fundamentalData.grossMargin < 10 ? -0.05 : 0;
        fundamentalScore += marginScore;
        factorCount++;
      }
      
      // 应用基本面调整 (权重为30%)
      if (factorCount > 0) {
        const avgFundamentalScore = (fundamentalScore / factorCount) / 252; // 转换为日度
        adjustedPriorMean = params.priorMean * 0.7 + avgFundamentalScore * 0.3;
      }
    }

    const posteriorMean = (precisionPrior * adjustedPriorMean + precisionObservation * observedMean) / precisionPosterior;
    const posteriorVariance = 1 / precisionPosterior;

    // 置信区间计算
    const zScore = this.getZScore(params.confidenceLevel);
    const posteriorStd = Math.sqrt(posteriorVariance);
    const confidenceInterval: [number, number] = [
      posteriorMean - zScore * posteriorStd,
      posteriorMean + zScore * posteriorStd
    ];

    // Kelly比例计算
    const kellyFraction = this.calculateKellyFraction(posteriorMean, observedVariance);

    // 贝叶斯Alpha (超额收益的概率)
    const benchmarkReturn = 0.03 / 252; // 假设3%年化无风险利率
    const bayesianAlpha = posteriorMean - benchmarkReturn;

    // 最优仓位计算 - 结合Kelly公式和贝叶斯更新
    const riskBudget = 0.02; // 2%的风险预算
    const optimalSize = Math.min(
      kellyFraction * portfolioValue,
      (riskBudget * portfolioValue) / Math.sqrt(observedVariance)
    );

    // 风险调整后仓位 - 考虑置信度
    const confidenceAdjustment = Math.max(0.5, params.confidenceLevel);
    const riskAdjustedSize = optimalSize * confidenceAdjustment;

    // 最大回撤限制
    const maxDrawdownLimit = portfolioValue * 0.15; // 15%最大回撤限制

    return {
      optimalSize,
      kellyFraction,
      bayesianAlpha,
      posteriorMean,
      posteriorVariance,
      confidenceInterval,
      riskAdjustedSize: Math.min(riskAdjustedSize, maxDrawdownLimit),
      maxDrawdownLimit
    };
  }

  /**
   * 计算Kelly比例
   */
  private calculateKellyFraction(expectedReturn: number, variance: number): number {
    if (variance <= 0) return 0;
    
    // Kelly公式: f* = (bp - q) / b
    // 简化版本: f* = μ / σ²
    const kellyFraction = expectedReturn / variance;
    
    // 限制Kelly比例在合理范围内 (0-25%)
    return Math.max(0, Math.min(0.25, kellyFraction));
  }

  /**
   * 动态止损计算
   */
  calculateDynamicStopLoss(
    currentPrice: number,
    entryPrice: number,
    returns: number[],
    params: BayesianRiskParams
  ): DynamicStopLoss {
    // 初始止损 - 基于ATR
    const volatility = this.calculateVolatility(returns);
    const atr = volatility * currentPrice;
    const initialStop = entryPrice - (atr * 2);

    // 跟踪止损 - 动态调整
    const priceChange = currentPrice - entryPrice;
    const trailingStop = currentPrice - (atr * 1.5);

    // 波动率止损 - 基于波动率突破
    const volatilityThreshold = volatility * 2;
    const volatilityStop = currentPrice * (1 - volatilityThreshold);

    // 贝叶斯止损 - 基于后验分布
    const bayesianMetrics = this.calculateBayesianPositionMetrics(
      returns, currentPrice, 1000000, params
    );
    const bayesianStop = currentPrice * (1 - Math.sqrt(bayesianMetrics.posteriorVariance) * 2);

    // 推荐止损 - 取最保守的止损
    const recommendedStop = Math.max(
      initialStop,
      Math.max(trailingStop, Math.max(volatilityStop, bayesianStop))
    );

    return {
      initialStop,
      trailingStop,
      volatilityStop,
      bayesianStop,
      recommendedStop
    };
  }

  /**
   * 贝叶斯风险监控
   */
  monitorBayesianRisk(
    currentPositions: Map<string, { size: number; price: number; returns: number[] }>,
    params: BayesianRiskParams
  ): { symbol: string; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; recommendation: string }[] {
    const riskAssessments: { symbol: string; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; recommendation: string }[] = [];

    currentPositions.forEach((position, symbol) => {
      const metrics = this.calculateBayesianPositionMetrics(
        position.returns,
        position.price,
        position.size,
        params
      );

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      let recommendation = '继续持有，风险可控';

      // 风险等级评估
      const posteriorStd = Math.sqrt(metrics.posteriorVariance);
      const riskScore = posteriorStd / metrics.posteriorMean;

      if (riskScore > 2) {
        riskLevel = 'CRITICAL';
        recommendation = '立即减仓或清仓，风险过高';
      } else if (riskScore > 1.5) {
        riskLevel = 'HIGH';
        recommendation = '考虑减仓，加强监控';
      } else if (riskScore > 1) {
        riskLevel = 'MEDIUM';
        recommendation = '保持谨慎，设置止损';
      }

      // 检查仓位是否超过推荐大小
      if (position.size > metrics.riskAdjustedSize * 1.2) {
        riskLevel = 'HIGH';
        recommendation = '仓位过大，建议减仓';
      }

      riskAssessments.push({
        symbol,
        riskLevel,
        recommendation
      });
    });

    return riskAssessments;
  }

  /**
   * 获取空的贝叶斯指标
   */
  private getEmptyBayesianMetrics(): BayesianPositionMetrics {
    return {
      optimalSize: 0,
      kellyFraction: 0,
      bayesianAlpha: 0,
      posteriorMean: 0,
      posteriorVariance: 0,
      confidenceInterval: [0, 0],
      riskAdjustedSize: 0,
      maxDrawdownLimit: 0
    };
  }

  /**
   * 组合级别贝叶斯风险评估
   */
  assessPortfolioBayesianRisk(
    holdings: Array<{ symbol: string; weight: number; returns: number[]; price: number }>,
    portfolioReturns: number[],
    params: BayesianRiskParams
  ): {
    portfolioRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    concentrationRisk: number;
    bayesianVaR: number;
    diversificationBenefit: number;
    recommendations: string[];
  } {
    // 组合级贝叶斯指标
    const portfolioMetrics = this.calculateBayesianPositionMetrics(
      portfolioReturns,
      1, // 组合净值
      1000000, // 假设组合规模
      params
    );

    // 集中度风险 - 检查仓位集中度
    const weights = holdings.map(h => h.weight);
    const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);
    const concentrationRisk = herfindahlIndex;

    // 贝叶斯VaR计算
    const posteriorStd = Math.sqrt(portfolioMetrics.posteriorVariance);
    const bayesianVaR = portfolioMetrics.posteriorMean - this.getZScore(0.95) * posteriorStd;

    // 多样化效益计算
    const individualRisks = holdings.map(h => this.calculateVolatility(h.returns));
    const weightedIndividualRisk = weights.reduce((sum, w, i) => sum + w * individualRisks[i], 0);
    const portfolioRisk = this.calculateVolatility(portfolioReturns);
    const diversificationBenefit = 1 - (portfolioRisk / weightedIndividualRisk);

    // 风险等级评估
    let portfolioRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    const recommendations: string[] = [];

    if (concentrationRisk > 0.5) {
      portfolioRiskLevel = 'HIGH';
      recommendations.push('组合过度集中，建议增加分散化');
    }

    if (Math.abs(bayesianVaR) > 0.15) {
      portfolioRiskLevel = 'HIGH';
      recommendations.push('组合VaR过高，考虑降低风险敞口');
    }

    if (diversificationBenefit < 0.2) {
      portfolioRiskLevel = 'MEDIUM';
      recommendations.push('多样化效益较低，考虑调整资产配置');
    }

    if (posteriorStd > 0.03) {
      portfolioRiskLevel = 'HIGH';
      recommendations.push('组合波动率过高，建议降低杠杆');
    }

    return {
      portfolioRiskLevel,
      concentrationRisk,
      bayesianVaR,
      diversificationBenefit,
      recommendations
    };
  }

  // ============================================================================
  // 机构级风险管理方法
  // ============================================================================

  /**
   * 计算机构级风险指标
   */
  calculateInstitutionalRiskMetrics(
    returns: number[],
    marketData: { [symbol: string]: any },
    portfolioData: { weights: Map<string, number>, sectors: Map<string, string> },
    benchmarkReturns?: number[]
  ): InstitutionalRiskMetrics {
    // 获取基础风险指标
    const baseMetrics = this.calculateRiskMetrics(returns, benchmarkReturns);

    // 计算流动性风险
    const liquidityRisk = this.calculateLiquidityRisk(marketData, portfolioData);

    // 计算集中度风险
    const concentrationRisk = this.calculateConcentrationRisk(portfolioData);

    // 计算操作风险
    const operationalRisk = this.calculateOperationalRisk();

    // 计算信用风险
    const counterpartyRisk = this.calculateCounterpartyRisk(portfolioData);

    // 计算ESG风险
    const esgRisk = this.calculateESGRisk(portfolioData);

    // 计算监管资本要求
    const regulatoryCapital = this.calculateRegulatoryCapital(baseMetrics, portfolioData);

    return {
      ...baseMetrics,
      liquidityRisk,
      concentrationRisk,
      operationalRisk,
      counterpartyRisk,
      esgRisk,
      regulatoryCapital,
    };
  }

  /**
   * 计算流动性风险
   */
  private calculateLiquidityRisk(
    marketData: { [symbol: string]: any },
    portfolioData: { weights: Map<string, number> }
  ): LiquidityRisk {
    let totalADV = 0;
    let weightedSpread = 0;
    let totalWeight = 0;
    let maxLiquidationDays = 0;

    portfolioData.weights.forEach((weight, symbol) => {
      const data = marketData[symbol] || {};
      const adv = data.averageDailyVolume || 1000000;
      const spread = data.bidAskSpread || 0.001;
      const position = weight * 100000000; // 假设1亿组合规模

      totalADV += weight * adv;
      weightedSpread += weight * spread;
      totalWeight += weight;

      // 计算清仓天数（假设不超过日成交量的20%）
      const liquidationDays = Math.ceil(position / (adv * 0.2));
      maxLiquidationDays = Math.max(maxLiquidationDays, liquidationDays);
    });

    const averageDailyVolume = totalADV;
    const liquidityRatio = totalADV / (totalWeight * 100000000); // ADV/组合规模
    const bidAskSpread = totalWeight > 0 ? weightedSpread / totalWeight : 0;
    const impactCost = bidAskSpread * 2; // 简化的冲击成本估算

    return {
      averageDailyVolume,
      liquidityRatio,
      bidAskSpread,
      impactCost,
      liquidationDays: maxLiquidationDays,
    };
  }

  /**
   * 计算集中度风险
   */
  private calculateConcentrationRisk(
    portfolioData: { weights: Map<string, number>, sectors: Map<string, string> }
  ): ConcentrationRisk {
    const weights = Array.from(portfolioData.weights.values()).sort((a, b) => b - a);
    
    const top5Holdings = weights.slice(0, 5).reduce((sum, w) => sum + w, 0);
    const top10Holdings = weights.slice(0, 10).reduce((sum, w) => sum + w, 0);

    // 计算行业集中度
    const sectorConcentration: { [sector: string]: number } = {};
    portfolioData.weights.forEach((weight, symbol) => {
      const sector = portfolioData.sectors.get(symbol) || '其他';
      sectorConcentration[sector] = (sectorConcentration[sector] || 0) + weight;
    });

    // 赫芬达尔指数
    const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);

    return {
      top5Holdings,
      top10Holdings,
      sectorConcentration,
      herfindahlIndex,
    };
  }

  /**
   * 计算操作风险
   */
  private calculateOperationalRisk(): OperationalRisk {
    // 简化的操作风险评估（实际应用中需要更复杂的模型）
    return {
      keyPersonRisk: 0.15,      // 15%的关键人员风险
      systemDowntimeRisk: 0.05, // 5%的系统风险
      modelRisk: 0.10,          // 10%的模型风险
      complianceRisk: 0.08,     // 8%的合规风险
      dataQualityRisk: 0.12,    // 12%的数据质量风险
    };
  }

  /**
   * 计算交易对手风险
   */
  private calculateCounterpartyRisk(
    portfolioData: { weights: Map<string, number> }
  ): number {
    // 简化的交易对手风险评估
    const totalExposure = Array.from(portfolioData.weights.values()).reduce((sum, w) => sum + w, 0);
    const averageRating = 0.02; // 假设平均信用评级对应2%的风险
    
    return totalExposure * averageRating;
  }

  /**
   * 计算ESG风险
   */
  private calculateESGRisk(
    portfolioData: { weights: Map<string, number> }
  ): { environmental: number; social: number; governance: number; composite: number } {
    // 简化的ESG风险评估（实际应用中需要第三方ESG数据）
    const environmental = 0.15; // 环境风险
    const social = 0.12;        // 社会风险
    const governance = 0.08;    // 治理风险
    const composite = (environmental + social + governance) / 3;

    return {
      environmental,
      social,
      governance,
      composite,
    };
  }

  /**
   * 计算监管资本要求
   */
  private calculateRegulatoryCapital(
    riskMetrics: RiskMetrics,
    portfolioData: { weights: Map<string, number> }
  ): { var: number; stressedVar: number; incrementalRisk: number; comprehensiveRisk: number } {
    const portfolioValue = 100000000; // 1亿组合

    // VaR资本要求（巴塞尔协议）
    const varCapital = Math.max(riskMetrics.var99 * portfolioValue, riskMetrics.var95 * portfolioValue * 3);

    // 压力VaR（基于2007-2008金融危机数据）
    const stressedVar = varCapital * 1.5;

    // 增量风险（违约和评级迁移）
    const incrementalRisk = portfolioValue * 0.08;

    // 综合风险（压力测试）
    const comprehensiveRisk = Math.max(varCapital, stressedVar) + incrementalRisk;

    return {
      var: varCapital,
      stressedVar,
      incrementalRisk,
      comprehensiveRisk,
    };
  }

  /**
   * 高级压力测试 - 多因子冲击
   */
  performAdvancedStressTest(
    portfolioData: { weights: Map<string, number>, returns: Map<string, number[]> },
    scenarios: StressTestScenario[]
  ): { scenario: StressTestScenario; results: StressTestResult[] }[] {
    return scenarios.map(scenario => {
      const results: StressTestResult[] = [];
      const portfolioReturns = this.calculatePortfolioReturns(portfolioData.weights, portfolioData.returns);
      const originalValue = 100000000; // 1亿基准

      portfolioData.weights.forEach((weight, symbol) => {
        const assetReturns = portfolioData.returns.get(symbol) || [];
        const originalAssetValue = weight * originalValue;

        let stressedValue = originalAssetValue;
        
        switch (scenario.shockType) {
          case 'price':
            stressedValue = originalAssetValue * (1 - scenario.magnitude / 100);
            break;
          case 'volatility':
            const vol = this.calculateVolatility(assetReturns);
            const stressedVol = vol * (1 + scenario.magnitude / 100);
            stressedValue = originalAssetValue * (1 - stressedVol);
            break;
        }

        const loss = originalAssetValue - stressedValue;
        const lossPercent = (loss / originalAssetValue) * 100;

        results.push({
          scenario,
          originalValue: originalAssetValue,
          stressedValue,
          loss,
          lossPercent,
        });
      });

      return { scenario, results };
    });
  }

  /**
   * 预设压力测试场景
   */
  static getPresetScenarios(): StressTestScenario[] {
    return [
      {
        name: '市场崩盘',
        description: '市场整体下跌30%',
        shockType: 'price',
        magnitude: 30,
      },
      {
        name: '温和衰退',
        description: '市场下跌15%',
        shockType: 'price',
        magnitude: 15,
      },
      {
        name: '波动率飙升',
        description: '波动率增加50%',
        shockType: 'volatility',
        magnitude: 50,
      },
      {
        name: '黑天鹅事件',
        description: '市场暴跌40%',
        shockType: 'price',
        magnitude: 40,
      },
      {
        name: '金融危机',
        description: '市场下跌50%',
        shockType: 'price',
        magnitude: 50,
      },
      {
        name: '流动性危机',
        description: '买卖价差扩大200%',
        shockType: 'volatility',
        magnitude: 200,
      },
      {
        name: '监管冲击',
        description: '特定行业下跌25%',
        shockType: 'price',
        magnitude: 25,
      },
    ];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let riskAnalysisServiceInstance: RiskAnalysisService | null = null;

export function getRiskAnalysisService(): RiskAnalysisService {
  if (!riskAnalysisServiceInstance) {
    riskAnalysisServiceInstance = new RiskAnalysisService();
  }
  return riskAnalysisServiceInstance;
}

export default RiskAnalysisService;
