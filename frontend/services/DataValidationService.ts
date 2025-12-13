/**
 * DataValidationService - 数据验证服务
 * 
 * 功能：
 * - 数据完整性检查
 * - 数据质量评估
 * - 异常值检测
 * - 数据一致性验证
 * - 数据修复建议
 * - 数据健康监控
 */

import { OHLCV } from './HistoricalDataService';
import type { StrategyConfig, BacktestResult, Signal, Position, Trade } from './StrategyExecutionService';

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  score: number;             // 质量评分 0-100
  issues: ValidationIssue[];
  warnings: string[];
  summary: ValidationSummary;
}

export interface ValidationIssue {
  type: IssueType;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  field: string;
  index?: number;
  message: string;
  suggestion?: string;
  value?: any;
}

export type IssueType =
  | 'MISSING_VALUE'
  | 'INVALID_VALUE'
  | 'OUTLIER'
  | 'INCONSISTENCY'
  | 'DUPLICATE'
  | 'GAP'
  | 'RANGE_ERROR'
  | 'TYPE_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'PARAMETER_ERROR'
  | 'STRATEGY_ERROR'
  | 'PERFORMANCE_WARNING'
  | 'RISK_WARNING';

export interface ValidationSummary {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  criticalIssues: number;
  errors: number;
  warnings: number;
  completeness: number;      // 完整性 0-100
  accuracy: number;          // 准确性 0-100
  consistency: number;       // 一致性 0-100
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'range' | 'pattern' | 'custom' | 'strategy' | 'array';
  params?: any;
  validator?: (value: any) => boolean;
  message?: string;
}

export interface StrategyValidationResult extends ValidationResult {
  strategyConfig?: {
    valid: boolean;
    issues: ValidationIssue[];
    recommendations: string[];
  };
  performanceMetrics?: {
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    avgReturn: number;
    riskScore: number;
  };
}

export interface ParameterValidationConfig {
  required: boolean;
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  min?: number;
  max?: number;
  enum?: any[];
  pattern?: string;
  default?: any;
  description?: string;
}

export interface OutlierDetectionResult {
  index: number;
  value: number;
  zscore: number;
  isOutlier: boolean;
  severity: 'mild' | 'moderate' | 'extreme';
}

// ============================================================================
// Strategy Parameter Validation Rules
// ============================================================================

const STRATEGY_PARAMETER_RULES: Record<string, Record<string, ParameterValidationConfig>> = {
  'multi_factor': {
    factors: { required: true, type: 'array', description: 'Factor list' },
    factorWeights: { required: true, type: 'array', description: 'Factor weights' },
    rebalanceFrequency: { required: true, type: 'string', enum: ['daily', 'weekly', 'monthly', 'quarterly'] },
    maxPositionSize: { required: true, type: 'number', min: 0.01, max: 0.5 },
    stopLoss: { required: false, type: 'number', min: 0.01, max: 0.5 },
    takeProfit: { required: false, type: 'number', min: 0.01, max: 1.0 }
  },
  'momentum': {
    momentumWindow: { required: true, type: 'number', min: 5, max: 252 },
    qualityMetrics: { required: false, type: 'array', description: 'Quality metrics' },
    rebalanceFrequency: { required: true, type: 'string', enum: ['daily', 'weekly', 'monthly'] },
    maxPositionSize: { required: true, type: 'number', min: 0.01, max: 0.2 },
    stopLoss: { required: false, type: 'number', min: 0.05, max: 0.3 },
    takeProfit: { required: false, type: 'number', min: 0.1, max: 0.5 }
  },
  'risk_parity': {
    volatilityWindow: { required: true, type: 'number', min: 20, max: 252 },
    volatilityThreshold: { required: false, type: 'number', min: 0.1, max: 0.5 },
    rebalanceFrequency: { required: true, type: 'string', enum: ['monthly', 'quarterly', 'semi-annually'] },
    maxPositionSize: { required: true, type: 'number', min: 0.01, max: 0.1 },
    stopLoss: { required: false, type: 'number', min: 0.03, max: 0.15 },
    takeProfit: { required: false, type: 'number', min: 0.05, max: 0.25 }
  },
  'ml': {
    modelType: { required: true, type: 'string', enum: ['xgboost', 'lightgbm', 'random_forest', 'neural_network'] },
    features: { required: true, type: 'array', description: 'Feature list' },
    trainingPeriod: { required: true, type: 'number', min: 100, max: 1000 },
    retrainFrequency: { required: true, type: 'number', min: 7, max: 90 },
    predictionHorizon: { required: true, type: 'number', min: 1, max: 30 },
    confidenceThreshold: { required: true, type: 'number', min: 0.5, max: 0.95 }
  },
  'pairs_trading': {
    pairs: { required: true, type: 'array', description: 'Trading pairs' },
    lookbackPeriod: { required: true, type: 'number', min: 30, max: 252 },
    entryZScore: { required: true, type: 'number', min: 1.0, max: 3.0 },
    exitZScore: { required: true, type: 'number', min: 0.1, max: 1.0 },
    stopLossZScore: { required: true, type: 'number', min: 2.0, max: 5.0 },
    halfLife: { required: false, type: 'number', min: 5, max: 30 }
  },
  'quantitative': {
    volatilityWindow: { required: true, type: 'number', min: 10, max: 60 },
    alphaThreshold: { required: true, type: 'number', min: 0.01, max: 0.2 },
    rebalanceFrequency: { required: true, type: 'string', enum: ['daily', 'weekly', 'monthly'] },
    maxPositionSize: { required: true, type: 'number', min: 0.02, max: 0.15 },
    stopLoss: { required: false, type: 'number', min: 0.05, max: 0.25 },
    takeProfit: { required: false, type: 'number', min: 0.1, max: 0.4 }
  }
};

// ============================================================================
// Data Validation Service
// ============================================================================

export class DataValidationService {
  /**
   * 验证策略配置
   */
  validateStrategyConfig(config: StrategyConfig): StrategyValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 1. 基本配置验证
    const basicValidation = this.validateBasicStrategyConfig(config);
    issues.push(...basicValidation.issues);
    warnings.push(...basicValidation.warnings);

    // 2. 参数验证
    const paramValidation = this.validateStrategyParameters(config);
    issues.push(...paramValidation.issues);
    recommendations.push(...paramValidation.recommendations);

    // 3. 风险验证
    const riskValidation = this.validateRiskParameters(config);
    issues.push(...riskValidation.issues);
    warnings.push(...riskValidation.warnings);

    // 4. 性能期望验证
    const performanceValidation = this.validatePerformanceExpectations(config);
    issues.push(...performanceValidation.issues);
    recommendations.push(...performanceValidation.recommendations);

    // 计算质量评分
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
    const errors = issues.filter(i => i.severity === 'ERROR').length;
    const warningCount = issues.filter(i => i.severity === 'WARNING').length;
    
    const score = Math.max(0, 100 - (criticalIssues * 50) - (errors * 20) - (warningCount * 10));
    const valid = score >= 70;

    return {
      valid,
      score,
      issues,
      warnings,
      summary: {
        totalRecords: 1,
        validRecords: valid ? 1 : 0,
        invalidRecords: valid ? 0 : 1,
        criticalIssues,
        errors,
        warnings: warningCount,
        completeness: 100,
        accuracy: score,
        consistency: score
      },
      strategyConfig: {
        valid,
        issues,
        recommendations
      },
      performanceMetrics: this.calculateExpectedMetrics(config)
    };
  }

  /**
   * 验证回测结果
   */
  validateBacktestResult(result: BacktestResult): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];

    // 验证基本指标
    if (!result.summary) {
      issues.push({
        type: 'MISSING_VALUE',
        severity: 'CRITICAL',
        field: 'summary',
        message: 'Backtest summary is missing'
      });
      return this.createValidationResult(false, 0, issues, warnings);
    }

    // 验证收益率指标
    this.validateReturnMetrics(result.summary, issues);

    // 验证风险指标
    this.validateRiskMetrics(result.summary, issues);

    // 验证交易指标
    this.validateTradeMetrics(result.summary, issues, warnings);

    // 验证时间序列数据
    if (result.equity && result.equity.length > 0) {
      this.validateEquityCurve(result.equity, issues, warnings);
    }

    // 计算质量评分
    const score = this.calculateBacktestScore(result, issues);

    return this.createValidationResult(score >= 70, score, issues, warnings);
  }

  /**
   * 验证信号序列
   */
  validateSignals(signals: Signal[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];

    if (signals.length === 0) {
      return this.createValidationResult(false, 0, [{
        type: 'MISSING_VALUE',
        severity: 'CRITICAL',
        field: 'signals',
        message: 'No signals provided'
      }], []);
    }

    // 验证每个信号
    signals.forEach((signal, index) => {
      this.validateSignal(signal, index, issues);
    });

    // 验证信号序列的逻辑性
    this.validateSignalSequence(signals, issues, warnings);

    const score = Math.max(0, 100 - (issues.length * 10));
    return this.createValidationResult(score >= 70, score, issues, warnings);
  }

  /**
   * 验证持仓数据
   */
  validatePositions(positions: Position[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];

    positions.forEach((position, index) => {
      this.validatePosition(position, index, issues, warnings);
    });

    // 检查持仓集中度
    this.validatePositionConcentration(positions, warnings);

    const score = Math.max(0, 100 - (issues.length * 15));
    return this.createValidationResult(score >= 70, score, issues, warnings);
  }

  /**
   * 验证OHLCV数据
   */
  validateOHLCV(data: OHLCV[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];

    if (data.length === 0) {
      return {
        valid: false,
        score: 0,
        issues: [{
          type: 'MISSING_VALUE',
          severity: 'CRITICAL',
          field: 'data',
          message: 'No data provided',
        }],
        warnings: [],
        summary: this.createEmptySummary(),
      };
    }

    let validRecords = 0;

    // 逐条验证
    data.forEach((candle, index) => {
      const candleIssues = this.validateCandle(candle, index);
      issues.push(...candleIssues);
      
      if (candleIssues.length === 0) {
        validRecords++;
      }
    });

    // 检查时间序列连续性
    const gapIssues = this.checkTimeSeriesGaps(data);
    issues.push(...gapIssues);

    // 检查重复数据
    const duplicateIssues = this.checkDuplicates(data);
    issues.push(...duplicateIssues);

    // 异常值检测
    const outliers = this.detectOutliers(data.map(d => d.close));
    outliers.forEach(outlier => {
      if (outlier.isOutlier && outlier.severity !== 'mild') {
        issues.push({
          type: 'OUTLIER',
          severity: outlier.severity === 'extreme' ? 'ERROR' : 'WARNING',
          field: 'close',
          index: outlier.index,
          message: `Potential outlier detected (z-score: ${outlier.zscore.toFixed(2)})`,
          value: outlier.value,
        });
      }
    });

    // 检查价格跳空
    const jumpIssues = this.checkPriceJumps(data);
    issues.push(...jumpIssues);

    // 生成汇总
    const summary = this.generateSummary(data.length, validRecords, issues);
    
    // 计算质量评分
    const score = this.calculateQualityScore(summary);

    // 生成警告
    if (summary.completeness < 90) {
      warnings.push(`Data completeness is low (${summary.completeness.toFixed(1)}%)`);
    }
    if (summary.consistency < 85) {
      warnings.push(`Data consistency issues detected (${summary.consistency.toFixed(1)}%)`);
    }

    return {
      valid: score >= 70,
      score,
      issues,
      warnings,
      summary,
    };
  }

  /**
   * 验证单个K线
   */
  private validateCandle(candle: OHLCV, index: number): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 检查必填字段
    const requiredFields: Array<keyof OHLCV> = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
    requiredFields.forEach(field => {
      if (candle[field] === undefined || candle[field] === null) {
        issues.push({
          type: 'MISSING_VALUE',
          severity: 'CRITICAL',
          field,
          index,
          message: `Missing required field: ${field}`,
        });
      }
    });

    if (issues.length > 0) return issues; // 有缺失值，跳过后续检查

    // 检查价格逻辑关系
    if (candle.high < candle.low) {
      issues.push({
        type: 'INCONSISTENCY',
        severity: 'ERROR',
        field: 'high/low',
        index,
        message: `High (${candle.high}) is less than Low (${candle.low})`,
        suggestion: 'Swap high and low values',
      });
    }

    if (candle.close > candle.high) {
      issues.push({
        type: 'RANGE_ERROR',
        severity: 'ERROR',
        field: 'close',
        index,
        message: `Close (${candle.close}) exceeds High (${candle.high})`,
      });
    }

    if (candle.close < candle.low) {
      issues.push({
        type: 'RANGE_ERROR',
        severity: 'ERROR',
        field: 'close',
        index,
        message: `Close (${candle.close}) is below Low (${candle.low})`,
      });
    }

    if (candle.open > candle.high) {
      issues.push({
        type: 'RANGE_ERROR',
        severity: 'ERROR',
        field: 'open',
        index,
        message: `Open (${candle.open}) exceeds High (${candle.high})`,
      });
    }

    if (candle.open < candle.low) {
      issues.push({
        type: 'RANGE_ERROR',
        severity: 'ERROR',
        field: 'open',
        index,
        message: `Open (${candle.open}) is below Low (${candle.low})`,
      });
    }

    // 检查价格为正
    if (candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0) {
      issues.push({
        type: 'INVALID_VALUE',
        severity: 'ERROR',
        field: 'price',
        index,
        message: 'Price values must be positive',
      });
    }

    // 检查成交量
    if (candle.volume < 0) {
      issues.push({
        type: 'INVALID_VALUE',
        severity: 'ERROR',
        field: 'volume',
        index,
        message: 'Volume cannot be negative',
      });
    }

    // 检查时间戳
    if (candle.timestamp <= 0 || candle.timestamp > Date.now() + 86400000) {
      issues.push({
        type: 'INVALID_VALUE',
        severity: 'WARNING',
        field: 'timestamp',
        index,
        message: 'Timestamp is invalid or in the future',
      });
    }

    return issues;
  }

  /**
   * 检查时间序列间隙
   */
  private checkTimeSeriesGaps(data: OHLCV[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    if (data.length < 2) return issues;

    // 估算时间间隔
    const intervals: number[] = [];
    for (let i = 1; i < Math.min(10, data.length); i++) {
      intervals.push(data[i].timestamp - data[i - 1].timestamp);
    }
    const medianInterval = this.median(intervals);
    const toleranceMs = medianInterval * 1.5;

    // 检查间隙
    for (let i = 1; i < data.length; i++) {
      const interval = data[i].timestamp - data[i - 1].timestamp;
      
      if (interval > toleranceMs) {
        issues.push({
          type: 'GAP',
          severity: 'WARNING',
          field: 'timestamp',
          index: i,
          message: `Large time gap detected: ${this.formatDuration(interval)}`,
          suggestion: 'Check for missing data',
        });
      }

      if (interval <= 0) {
        issues.push({
          type: 'INCONSISTENCY',
          severity: 'ERROR',
          field: 'timestamp',
          index: i,
          message: 'Timestamps are not in ascending order',
        });
      }
    }

    return issues;
  }

  /**
   * 检查重复数据
   */
  private checkDuplicates(data: OHLCV[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seen = new Set<number>();

    data.forEach((candle, index) => {
      if (seen.has(candle.timestamp)) {
        issues.push({
          type: 'DUPLICATE',
          severity: 'WARNING',
          field: 'timestamp',
          index,
          message: `Duplicate timestamp detected: ${new Date(candle.timestamp).toISOString()}`,
          suggestion: 'Remove or merge duplicate records',
        });
      }
      seen.add(candle.timestamp);
    });

    return issues;
  }

  /**
   * 检查价格跳空
   */
  private checkPriceJumps(data: OHLCV[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (let i = 1; i < data.length; i++) {
      const prevClose = data[i - 1].close;
      const currentOpen = data[i].open;
      const gap = Math.abs((currentOpen - prevClose) / prevClose);

      // 如果跳空超过15%，发出警告
      if (gap > 0.15) {
        issues.push({
          type: 'OUTLIER',
          severity: 'WARNING',
          field: 'open',
          index: i,
          message: `Large price gap detected: ${(gap * 100).toFixed(2)}%`,
          value: currentOpen,
        });
      }
    }

    return issues;
  }

  /**
   * 异常值检测（Z-score方法）
   */
  detectOutliers(
    data: number[],
    threshold: number = 3
  ): OutlierDetectionResult[] {
    const results: OutlierDetectionResult[] = [];
    
    if (data.length < 3) return results;

    const mean = this.mean(data);
    const std = this.standardDeviation(data);

    if (std === 0) return results;

    data.forEach((value, index) => {
      const zscore = Math.abs((value - mean) / std);
      
      let severity: 'mild' | 'moderate' | 'extreme' = 'mild';
      if (zscore > 4) {
        severity = 'extreme';
      } else if (zscore > threshold) {
        severity = 'moderate';
      }

      results.push({
        index,
        value,
        zscore,
        isOutlier: zscore > threshold,
        severity,
      });
    });

    return results;
  }

  /**
   * 异常值检测（IQR方法）
   */
  detectOutliersIQR(data: number[]): OutlierDetectionResult[] {
    const results: OutlierDetectionResult[] = [];
    
    if (data.length < 4) return results;

    const sorted = [...data].sort((a, b) => a - b);
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    data.forEach((value, index) => {
      const isOutlier = value < lowerBound || value > upperBound;
      
      let severity: 'mild' | 'moderate' | 'extreme' = 'mild';
      const extremeLower = q1 - 3 * iqr;
      const extremeUpper = q3 + 3 * iqr;
      
      if (value < extremeLower || value > extremeUpper) {
        severity = 'extreme';
      } else if (isOutlier) {
        severity = 'moderate';
      }

      results.push({
        index,
        value,
        zscore: 0, // IQR方法不使用z-score
        isOutlier,
        severity,
      });
    });

    return results;
  }

  /**
   * 生成汇总
   */
  private generateSummary(
    totalRecords: number,
    validRecords: number,
    issues: ValidationIssue[]
  ): ValidationSummary {
    const invalidRecords = totalRecords - validRecords;
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
    const errors = issues.filter(i => i.severity === 'ERROR').length;
    const warnings = issues.filter(i => i.severity === 'WARNING').length;

    const completeness = totalRecords > 0 ? (validRecords / totalRecords) * 100 : 0;
    const accuracy = totalRecords > 0 ? ((totalRecords - errors - criticalIssues) / totalRecords) * 100 : 0;
    const consistency = totalRecords > 0 ? ((totalRecords - warnings) / totalRecords) * 100 : 0;

    return {
      totalRecords,
      validRecords,
      invalidRecords,
      criticalIssues,
      errors,
      warnings,
      completeness,
      accuracy,
      consistency,
    };
  }

  /**
   * 计算质量评分
   */
  private calculateQualityScore(summary: ValidationSummary): number {
    // 权重分配
    const weights = {
      completeness: 0.4,
      accuracy: 0.4,
      consistency: 0.2,
    };

    const score =
      summary.completeness * weights.completeness +
      summary.accuracy * weights.accuracy +
      summary.consistency * weights.consistency;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 创建空汇总
   */
  private createEmptySummary(): ValidationSummary {
    return {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      criticalIssues: 0,
      errors: 0,
      warnings: 0,
      completeness: 0,
      accuracy: 0,
      consistency: 0,
    };
  }

  /**
   * 自动修复数据
   */
  autoFix(data: OHLCV[]): { fixed: OHLCV[]; fixes: string[] } {
    const fixed = [...data];
    const fixes: string[] = [];

    fixed.forEach((candle, index) => {
      // 修复 high < low
      if (candle.high < candle.low) {
        [candle.high, candle.low] = [candle.low, candle.high];
        fixes.push(`[${index}] Swapped high and low`);
      }

      // 修复 close 超出 high/low 范围
      if (candle.close > candle.high) {
        candle.close = candle.high;
        fixes.push(`[${index}] Adjusted close to high`);
      }
      if (candle.close < candle.low) {
        candle.close = candle.low;
        fixes.push(`[${index}] Adjusted close to low`);
      }

      // 修复 open 超出 high/low 范围
      if (candle.open > candle.high) {
        candle.open = candle.high;
        fixes.push(`[${index}] Adjusted open to high`);
      }
      if (candle.open < candle.low) {
        candle.open = candle.low;
        fixes.push(`[${index}] Adjusted open to low`);
      }

      // 修复负数成交量
      if (candle.volume < 0) {
        candle.volume = 0;
        fixes.push(`[${index}] Set negative volume to 0`);
      }
    });

    return { fixed, fixes };
  }

  // ============================================================================
  // Strategy Validation Methods
  // ============================================================================

  private validateBasicStrategyConfig(config: StrategyConfig): { issues: ValidationIssue[]; warnings: string[] } {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];

    // 验证基本字段
    if (!config.name || config.name.trim().length === 0) {
      issues.push({
        type: 'CONFIGURATION_ERROR',
        severity: 'ERROR',
        field: 'name',
        message: 'Strategy name is required',
        suggestion: 'Provide a descriptive strategy name'
      });
    }

    if (config.initialCapital <= 0) {
      issues.push({
        type: 'CONFIGURATION_ERROR',
        severity: 'ERROR',
        field: 'initialCapital',
        message: 'Initial capital must be positive',
        value: config.initialCapital
      });
    }

    if (config.maxPositions <= 0 || config.maxPositions > 200) {
      issues.push({
        type: 'CONFIGURATION_ERROR',
        severity: 'WARNING',
        field: 'maxPositions',
        message: 'Max positions should be between 1-200',
        value: config.maxPositions
      });
    }

    if (config.commission < 0 || config.commission > 0.01) {
      issues.push({
        type: 'CONFIGURATION_ERROR',
        severity: 'WARNING',
        field: 'commission',
        message: 'Commission rate seems unusual (expected 0-1%)',
        value: config.commission
      });
    }

    if (config.slippage < 0 || config.slippage > 0.02) {
      issues.push({
        type: 'CONFIGURATION_ERROR',
        severity: 'WARNING',
        field: 'slippage',
        message: 'Slippage seems high (expected 0-2%)',
        value: config.slippage
      });
    }

    return { issues, warnings };
  }

  private validateStrategyParameters(config: StrategyConfig): { issues: ValidationIssue[]; recommendations: string[] } {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    const rules = STRATEGY_PARAMETER_RULES[config.strategyType];
    if (!rules) {
      issues.push({
        type: 'STRATEGY_ERROR',
        severity: 'WARNING',
        field: 'strategyType',
        message: `Unknown strategy type: ${config.strategyType}`,
        suggestion: 'Use a supported strategy type'
      });
      return { issues, recommendations };
    }

    // 验证每个参数
    Object.entries(rules).forEach(([param, rule]) => {
      const value = config.parameters[param];
      const validation = this.validateParameter(value, rule, param);
      issues.push(...validation.issues);
      if (validation.recommendation) {
        recommendations.push(validation.recommendation);
      }
    });

    // 检查参数组合的合理性
    this.validateParameterCombinations(config, issues, recommendations);

    return { issues, recommendations };
  }

  private validateParameter(value: any, rule: ParameterValidationConfig, paramName: string): { issues: ValidationIssue[]; recommendation?: string } {
    const issues: ValidationIssue[] = [];
    let recommendation: string | undefined;

    // 检查必填
    if (rule.required && (value === undefined || value === null)) {
      issues.push({
        type: 'PARAMETER_ERROR',
        severity: 'ERROR',
        field: paramName,
        message: `Required parameter ${paramName} is missing`,
        suggestion: rule.description ? `Set ${rule.description}` : `Provide ${paramName}`
      });
      return { issues, recommendation };
    }

    if (value === undefined || value === null) {
      return { issues, recommendation };
    }

    // 检查类型
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      issues.push({
        type: 'TYPE_ERROR',
        severity: 'ERROR',
        field: paramName,
        message: `Parameter ${paramName} should be ${rule.type}, got ${actualType}`,
        value: value
      });
      return { issues, recommendation };
    }

    // 检查数值范围
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        issues.push({
          type: 'RANGE_ERROR',
          severity: 'ERROR',
          field: paramName,
          message: `${paramName} (${value}) is below minimum (${rule.min})`,
          suggestion: `Set ${paramName} >= ${rule.min}`
        });
      }
      if (rule.max !== undefined && value > rule.max) {
        issues.push({
          type: 'RANGE_ERROR',
          severity: 'ERROR',
          field: paramName,
          message: `${paramName} (${value}) exceeds maximum (${rule.max})`,
          suggestion: `Set ${paramName} <= ${rule.max}`
        });
      }

      // 提供优化建议
      if (rule.min !== undefined && rule.max !== undefined) {
        const optimal = (rule.min + rule.max) / 2;
        if (Math.abs(value - optimal) > (rule.max - rule.min) * 0.3) {
          recommendation = `Consider setting ${paramName} closer to ${optimal.toFixed(2)} for optimal performance`;
        }
      }
    }

    // 检查枚举值
    if (rule.enum && !rule.enum.includes(value)) {
      issues.push({
        type: 'PARAMETER_ERROR',
        severity: 'ERROR',
        field: paramName,
        message: `${paramName} must be one of: ${rule.enum.join(', ')}`,
        value: value
      });
    }

    // 检查数组
    if (rule.type === 'array' && Array.isArray(value)) {
      if (value.length === 0) {
        issues.push({
          type: 'PARAMETER_ERROR',
          severity: 'WARNING',
          field: paramName,
          message: `${paramName} array is empty`,
          suggestion: `Add items to ${paramName}`
        });
      }
    }

    return { issues, recommendation };
  }

  private validateParameterCombinations(config: StrategyConfig, issues: ValidationIssue[], recommendations: string[]): void {
    const params = config.parameters;

    // 通用组合验证
    if (params.stopLoss && params.takeProfit) {
      const ratio = params.takeProfit / params.stopLoss;
      if (ratio < 1.5) {
        recommendations.push('Consider a risk-reward ratio of at least 1.5:1 (takeProfit/stopLoss >= 1.5)');
      }
    }

    // 特定策略类型的验证
    switch (config.strategyType) {
      case 'multi_factor':
        this.validateMultiFactorParams(params, issues, recommendations);
        break;
      case 'pairs_trading':
        this.validatePairsTradingParams(params, issues, recommendations);
        break;
      case 'ml':
        this.validateMLParams(params, issues, recommendations);
        break;
    }
  }

  private validateMultiFactorParams(params: any, issues: ValidationIssue[], recommendations: string[]): void {
    if (params.factors && params.factorWeights) {
      if (params.factors.length !== params.factorWeights.length) {
        issues.push({
          type: 'PARAMETER_ERROR',
          severity: 'ERROR',
          field: 'factorWeights',
          message: 'Factor weights array length must match factors array length'
        });
      }

      const weightSum = params.factorWeights.reduce((sum: number, w: number) => sum + w, 0);
      if (Math.abs(weightSum - 1.0) > 0.01) {
        issues.push({
          type: 'PARAMETER_ERROR',
          severity: 'WARNING',
          field: 'factorWeights',
          message: `Factor weights should sum to 1.0, got ${weightSum.toFixed(3)}`,
          suggestion: 'Normalize factor weights to sum to 1.0'
        });
      }
    }

    // 检查因子多样性
    if (params.factors && params.factors.length < 2) {
      recommendations.push('Multi-factor strategies work best with at least 2-3 factors');
    }
  }

  private validatePairsTradingParams(params: any, issues: ValidationIssue[], recommendations: string[]): void {
    if (params.entryZScore && params.exitZScore) {
      if (params.exitZScore >= params.entryZScore) {
        issues.push({
          type: 'PARAMETER_ERROR',
          severity: 'ERROR',
          field: 'exitZScore',
          message: 'Exit Z-score must be less than entry Z-score'
        });
      }
    }

    if (params.pairs && params.pairs.length < 2) {
      recommendations.push('Pairs trading strategies should have at least 2-3 pairs for diversification');
    }
  }

  private validateMLParams(params: any, issues: ValidationIssue[], recommendations: string[]): void {
    if (params.features && params.features.length < 3) {
      recommendations.push('ML strategies typically perform better with 5+ features');
    }

    if (params.trainingPeriod && params.retrainFrequency) {
      const ratio = params.trainingPeriod / params.retrainFrequency;
      if (ratio < 5) {
        recommendations.push('Training period should be at least 5x the retrain frequency for model stability');
      }
    }

    if (params.confidenceThreshold && params.confidenceThreshold > 0.9) {
      recommendations.push('Very high confidence thresholds may reduce trading opportunities significantly');
    }
  }

  private validateRiskParameters(config: StrategyConfig, issues: ValidationIssue[], warnings: string[]): { issues: ValidationIssue[]; warnings: string[] } {
    if (config.riskPerTrade > 0.05) {
      issues.push({
        type: 'RISK_WARNING',
        severity: 'WARNING',
        field: 'riskPerTrade',
        message: 'Risk per trade exceeds 5%, which is quite aggressive',
        value: config.riskPerTrade,
        suggestion: 'Consider reducing risk per trade to 1-2%'
      });
    }

    if (config.stopLoss && config.stopLoss > 0.2) {
      warnings.push('Stop loss > 20% may be too wide for most strategies');
    }

    if (config.maxPositions * config.riskPerTrade > 0.5) {
      issues.push({
        type: 'RISK_WARNING',
        severity: 'ERROR',
        field: 'riskPerTrade',
        message: 'Total portfolio risk exposure exceeds 50%',
        suggestion: 'Reduce either max positions or risk per trade'
      });
    }

    return { issues, warnings };
  }

  private validatePerformanceExpectations(config: StrategyConfig): { issues: ValidationIssue[]; recommendations: string[] } {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // 基于策略类型的性能期望验证
    const expectedMetrics = this.getExpectedMetricsForStrategy(config.strategyType);
    
    if (config.commission + config.slippage > expectedMetrics.minProfitMargin) {
      issues.push({
        type: 'PERFORMANCE_WARNING',
        severity: 'WARNING',
        field: 'commission',
        message: 'High transaction costs may erode strategy profitability',
        suggestion: 'Consider optimizing execution or using lower-cost brokers'
      });
    }

    // 基于rebalanceFrequency的建议
    if (config.rebalanceFrequency === 'daily' && (config.commission + config.slippage) > 0.002) {
      recommendations.push('Daily rebalancing with high transaction costs may hurt performance');
    }

    return { issues, recommendations };
  }

  private validateReturnMetrics(summary: any, issues: ValidationIssue[]): void {
    if (summary.totalReturn === undefined || summary.totalReturn === null) {
      issues.push({
        type: 'MISSING_VALUE',
        severity: 'ERROR',
        field: 'totalReturn',
        message: 'Total return is missing from backtest summary'
      });
    }

    if (summary.annualizedReturn !== undefined) {
      if (summary.annualizedReturn < -0.5 || summary.annualizedReturn > 1.0) {
        issues.push({
          type: 'PERFORMANCE_WARNING',
          severity: 'WARNING',
          field: 'annualizedReturn',
          message: `Unusual annualized return: ${(summary.annualizedReturn * 100).toFixed(1)}%`,
          value: summary.annualizedReturn
        });
      }
    }
  }

  private validateRiskMetrics(summary: any, issues: ValidationIssue[]): void {
    if (summary.maxDrawdown !== undefined && summary.maxDrawdown > 0.3) {
      issues.push({
        type: 'RISK_WARNING',
        severity: 'WARNING',
        field: 'maxDrawdown',
        message: `High maximum drawdown: ${(summary.maxDrawdown * 100).toFixed(1)}%`,
        suggestion: 'Consider risk management improvements'
      });
    }

    if (summary.volatility !== undefined && summary.volatility > 0.4) {
      issues.push({
        type: 'RISK_WARNING',
        severity: 'WARNING',
        field: 'volatility',
        message: `High volatility: ${(summary.volatility * 100).toFixed(1)}%`,
        value: summary.volatility
      });
    }

    if (summary.sharpeRatio !== undefined && summary.sharpeRatio < 0.5) {
      issues.push({
        type: 'PERFORMANCE_WARNING',
        severity: 'WARNING',
        field: 'sharpeRatio',
        message: `Low Sharpe ratio: ${summary.sharpeRatio.toFixed(2)}`,
        suggestion: 'Strategy may not adequately compensate for risk'
      });
    }
  }

  private validateTradeMetrics(summary: any, issues: ValidationIssue[], warnings: string[]): void {
    if (summary.totalTrades !== undefined && summary.totalTrades < 10) {
      warnings.push('Very few trades may indicate insufficient market exposure');
    }

    if (summary.winRate !== undefined) {
      if (summary.winRate < 0.3 || summary.winRate > 0.8) {
        issues.push({
          type: 'PERFORMANCE_WARNING',
          severity: 'WARNING',
          field: 'winRate',
          message: `Unusual win rate: ${(summary.winRate * 100).toFixed(1)}%`,
          value: summary.winRate
        });
      }
    }

    if (summary.avgWin && summary.avgLoss && summary.avgWin / Math.abs(summary.avgLoss) < 1.2) {
      warnings.push('Low win/loss ratio may indicate poor risk-reward management');
    }
  }

  private validateEquityCurve(equity: any[], issues: ValidationIssue[], warnings: string[]): void {
    // 检查权益曲线的连续性
    for (let i = 1; i < equity.length; i++) {
      if (equity[i].timestamp <= equity[i-1].timestamp) {
        issues.push({
          type: 'INCONSISTENCY',
          severity: 'ERROR',
          field: 'equity',
          index: i,
          message: 'Equity curve timestamps not in ascending order'
        });
      }
    }

    // 检查权益值的合理性
    const equityValues = equity.map(e => e.value).filter(v => v !== undefined);
    if (equityValues.length > 0) {
      const minEquity = Math.min(...equityValues);
      const maxEquity = Math.max(...equityValues);
      
      if (minEquity <= 0) {
        issues.push({
          type: 'PERFORMANCE_WARNING',
          severity: 'ERROR',
          field: 'equity',
          message: 'Equity curve shows account blowup (equity <= 0)',
          value: minEquity
        });
      }
      
      // 检查权益波动性
      const equityReturns = [];
      for (let i = 1; i < equityValues.length; i++) {
        equityReturns.push((equityValues[i] - equityValues[i-1]) / equityValues[i-1]);
      }
      
      if (equityReturns.length > 0) {
        const volatility = this.standardDeviation(equityReturns);
        if (volatility > 0.1) { // 日波动率超过10%
          warnings.push('High equity curve volatility detected');
        }
      }
    }
  }

  private validateSignal(signal: Signal, index: number, issues: ValidationIssue[]): void {
    if (!signal.symbol || signal.symbol.trim().length === 0) {
      issues.push({
        type: 'MISSING_VALUE',
        severity: 'ERROR',
        field: 'symbol',
        index,
        message: 'Signal symbol is required'
      });
    }

    if (!signal.type || !['BUY', 'SELL', 'HOLD'].includes(signal.type)) {
      issues.push({
        type: 'INVALID_VALUE',
        severity: 'ERROR',
        field: 'type',
        index,
        message: 'Signal type must be BUY, SELL, or HOLD',
        value: signal.type
      });
    }

    if (signal.price <= 0) {
      issues.push({
        type: 'INVALID_VALUE',
        severity: 'ERROR',
        field: 'price',
        index,
        message: 'Signal price must be positive',
        value: signal.price
      });
    }

    if (signal.confidence !== undefined && (signal.confidence < 0 || signal.confidence > 1)) {
      issues.push({
        type: 'RANGE_ERROR',
        severity: 'WARNING',
        field: 'confidence',
        index,
        message: 'Signal confidence should be between 0 and 1',
        value: signal.confidence
      });
    }
  }

  private validateSignalSequence(signals: Signal[], issues: ValidationIssue[], warnings: string[]): void {
    const symbolLastSignal: Record<string, SignalType> = {};
    
    signals.forEach((signal, index) => {
      const lastSignal = symbolLastSignal[signal.symbol];
      
      // 检查重复信号
      if (lastSignal === signal.type && signal.type !== 'HOLD') {
        warnings.push(`Consecutive ${signal.type} signals for ${signal.symbol} at index ${index}`);
      }
      
      symbolLastSignal[signal.symbol] = signal.type;
    });
    
    // 检查信号时间顺序
    for (let i = 1; i < signals.length; i++) {
      if (signals[i].timestamp < signals[i-1].timestamp) {
        issues.push({
          type: 'INCONSISTENCY',
          severity: 'ERROR',
          field: 'timestamp',
          index: i,
          message: 'Signals not in chronological order'
        });
      }
    }
  }

  private validatePosition(position: Position, index: number, issues: ValidationIssue[], warnings: string[]): void {
    if (!position.symbol) {
      issues.push({
        type: 'MISSING_VALUE',
        severity: 'ERROR',
        field: 'symbol',
        index,
        message: 'Position symbol is required'
      });
    }

    if (position.quantity <= 0) {
      issues.push({
        type: 'INVALID_VALUE',
        severity: 'ERROR',
        field: 'quantity',
        index,
        message: 'Position quantity must be positive',
        value: position.quantity
      });
    }

    if (position.avgPrice <= 0) {
      issues.push({
        type: 'INVALID_VALUE',
        severity: 'ERROR',
        field: 'avgPrice',
        index,
        message: 'Average price must be positive',
        value: position.avgPrice
      });
    }

    // 检查持仓价值与价格、数量的一致性
    const expectedValue = position.currentPrice * position.quantity;
    if (Math.abs(position.value - expectedValue) > expectedValue * 0.01) {
      issues.push({
        type: 'INCONSISTENCY',
        severity: 'WARNING',
        field: 'value',
        index,
        message: 'Position value inconsistent with price × quantity',
        suggestion: 'Recalculate position value'
      });
    }
  }

  private validatePositionConcentration(positions: Position[], warnings: string[]): void {
    if (positions.length === 0) return;
    
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    const maxPosition = Math.max(...positions.map(p => p.value));
    const concentration = maxPosition / totalValue;
    
    if (concentration > 0.3) {
      warnings.push(`High position concentration: ${(concentration * 100).toFixed(1)}% in single position`);
    }
    
    // 检查行业/板块集中度（如果有相关信息）
    const symbolCounts = new Map<string, number>();
    positions.forEach(p => {
      const sector = this.getSymbolSector(p.symbol);
      symbolCounts.set(sector, (symbolCounts.get(sector) || 0) + p.value);
    });
    
    symbolCounts.forEach((value, sector) => {
      const sectorConcentration = value / totalValue;
      if (sectorConcentration > 0.4) {
        warnings.push(`High sector concentration in ${sector}: ${(sectorConcentration * 100).toFixed(1)}%`);
      }
    });
  }

  private getSymbolSector(symbol: string): string {
    // 简化的行业分类逻辑
    if (symbol.includes('60')) return 'Technology';
    if (symbol.includes('00')) return 'Finance';
    return 'Other';
  }

  private calculateBacktestScore(result: any, issues: ValidationIssue[]): number {
    let score = 100;
    
    // 根据问题严重程度扣分
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'CRITICAL': score -= 50; break;
        case 'ERROR': score -= 20; break;
        case 'WARNING': score -= 10; break;
        default: score -= 5;
      }
    });
    
    // 基于性能指标调整
    if (result.summary?.sharpeRatio) {
      if (result.summary.sharpeRatio > 2) score += 10;
      else if (result.summary.sharpeRatio < 0.5) score -= 15;
    }
    
    if (result.summary?.maxDrawdown) {
      if (result.summary.maxDrawdown > 0.2) score -= 10;
      else if (result.summary.maxDrawdown < 0.05) score += 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateExpectedMetrics(config: StrategyConfig): {
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    avgReturn: number;
    riskScore: number;
  } {
    const baseMetrics = this.getExpectedMetricsForStrategy(config.strategyType);
    
    // 根据参数调整期望值
    let adjustedSharpe = baseMetrics.expectedSharpe;
    let adjustedDrawdown = baseMetrics.expectedDrawdown;
    let adjustedWinRate = baseMetrics.expectedWinRate;
    
    // 基于手续费和滑点调整
    const totalCost = config.commission + config.slippage;
    adjustedSharpe *= Math.max(0.5, 1 - totalCost * 50);
    
    // 基于风险控制调整
    if (config.stopLoss) {
      adjustedDrawdown *= Math.max(0.5, config.stopLoss * 2);
      adjustedWinRate *= 0.9; // 止损会降低胜率但控制回撤
    }
    
    return {
      sharpeRatio: adjustedSharpe,
      maxDrawdown: adjustedDrawdown,
      winRate: adjustedWinRate,
      avgReturn: baseMetrics.expectedReturn,
      riskScore: this.calculateRiskScore(config)
    };
  }

  private getExpectedMetricsForStrategy(strategyType: string): {
    expectedSharpe: number;
    expectedDrawdown: number;
    expectedWinRate: number;
    expectedReturn: number;
    minProfitMargin: number;
  } {
    const metrics: Record<string, any> = {
      'multi_factor': { expectedSharpe: 1.2, expectedDrawdown: 0.15, expectedWinRate: 0.55, expectedReturn: 0.12, minProfitMargin: 0.003 },
      'momentum': { expectedSharpe: 1.0, expectedDrawdown: 0.18, expectedWinRate: 0.48, expectedReturn: 0.15, minProfitMargin: 0.004 },
      'risk_parity': { expectedSharpe: 1.5, expectedDrawdown: 0.08, expectedWinRate: 0.58, expectedReturn: 0.08, minProfitMargin: 0.002 },
      'ml': { expectedSharpe: 1.3, expectedDrawdown: 0.12, expectedWinRate: 0.52, expectedReturn: 0.18, minProfitMargin: 0.005 },
      'pairs_trading': { expectedSharpe: 1.8, expectedDrawdown: 0.06, expectedWinRate: 0.65, expectedReturn: 0.10, minProfitMargin: 0.003 },
      'quantitative': { expectedSharpe: 1.1, expectedDrawdown: 0.16, expectedWinRate: 0.50, expectedReturn: 0.14, minProfitMargin: 0.004 }
    };
    
    return metrics[strategyType] || metrics['quantitative'];
  }

  private calculateRiskScore(config: StrategyConfig): number {
    let score = 50; // 中性风险
    
    // 基于配置调整风险评分
    score += (config.riskPerTrade - 0.02) * 1000; // 每增加1%风险，增加10分
    score += (config.maxPositions - 20) * 0.5; // 持仓数量影响
    
    if (config.stopLoss) {
      score -= config.stopLoss * 50; // 止损降低风险
    }
    
    if (config.enableDynamicHedging) {
      score -= 10; // 动态对冲降低风险
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private createValidationResult(valid: boolean, score: number, issues: ValidationIssue[], warnings: string[]): ValidationResult {
    return {
      valid,
      score,
      issues,
      warnings,
      summary: {
        totalRecords: 1,
        validRecords: valid ? 1 : 0,
        invalidRecords: valid ? 0 : 1,
        criticalIssues: issues.filter(i => i.severity === 'CRITICAL').length,
        errors: issues.filter(i => i.severity === 'ERROR').length,
        warnings: issues.filter(i => i.severity === 'WARNING').length,
        completeness: 100,
        accuracy: score,
        consistency: score
      }
    };
  }

  /**
   * 统计工具函数
   */
  private mean(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  private standardDeviation(data: number[]): number {
    const avg = this.mean(data);
    const squareDiffs = data.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  private median(data: number[]): number {
    if (data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let dataValidationServiceInstance: DataValidationService | null = null;

export function getDataValidationService(): DataValidationService {
  if (!dataValidationServiceInstance) {
    dataValidationServiceInstance = new DataValidationService();
  }
  return dataValidationServiceInstance;
}

export default DataValidationService;
