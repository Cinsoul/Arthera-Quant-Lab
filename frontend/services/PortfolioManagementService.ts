/**
 * PortfolioManagementService - 组合管理服务
 * 
 * 功能：
 * - 持仓管理
 * - 组合优化（马科维茨、Black-Litterman等）
 * - 资产配置
 * - 再平衡策略
 * - 绩效归因
 * - 持仓分析
 */

import { getRiskAnalysisService, BayesianRiskParams, BayesianPositionMetrics, DynamicStopLoss } from './RiskAnalysisService';
import { getQuantCalculationService } from './QuantCalculationService';

// ============================================================================
// Types
// ============================================================================

export interface AdvancedRiskMetrics {
  correlationMatrix: Map<string, Map<string, number>>;
  portfolioBeta: number;
  valueAtRisk95: number;
  valueAtRisk99: number;
  stressTestResults: StressTestScenario[];
  volatilityContribution: Array<{ symbol: string; contribution: number }>;
}

export interface StressTestScenario {
  name: string;
  description: string;
  impactPercent: number;
  impactValue: number;
  probability: string;
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;           // 平均成本
  currentPrice: number;
  marketValue: number;
  weight: number;            // 权重（百分比）
  pnl: number;              // 盈亏
  pnlPercent: number;       // 盈亏百分比
  dayChange: number;        // 当日涨跌
  dayChangePercent: number;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  
  cash: number;
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  
  holdings: Holding[];
  
  // 风险指标
  volatility?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
}

export interface OptimizationParams {
  method: 'min-variance' | 'max-sharpe' | 'risk-parity' | 'equal-weight';
  constraints?: {
    minWeight?: number;     // 最小权重
    maxWeight?: number;     // 最大权重
    targetReturn?: number;  // 目标收益率
    maxRisk?: number;       // 最大风险
  };
  riskFreeRate?: number;
}

export interface OptimizationResult {
  weights: Map<string, number>;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  allocation: Array<{ symbol: string; weight: number; value: number }>;
}

export interface RebalanceAction {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  currentValue: number;
  targetValue: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: number;           // 需要买入或卖出的金额
  shares: number;           // 需要买入或卖出的股数
}

export interface Attribution {
  symbol: string;
  weight: number;
  return: number;
  contribution: number;     // 对组合收益的贡献
  contributionPercent: number;
}

// 智能仓位管理相关类型
export interface IntelligentPositionConfig {
  enableBayesianControl: boolean;    // 启用贝叶斯控制
  riskBudget: number;                // 风险预算 (0-1)
  maxPositionSize: number;           // 最大单仓位比例 (0-1)
  kellyFractionLimit: number;        // Kelly比例限制 (0-1)
  rebalanceThreshold: number;        // 再平衡阈值 (0-1)
  volatilityLookback: number;        // 波动率回看期 (天数)
}

export interface PositionRecommendation {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'REDUCE';
  currentSize: number;
  recommendedSize: number;
  reason: string;
  confidence: number;                // 推荐置信度 (0-1)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  stopLoss?: number;
  takeProfit?: number;
}

export interface SmartRebalanceResult {
  actions: PositionRecommendation[];
  expectedImprovement: {
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
  };
  totalTurnover: number;             // 换手率
  implementationCost: number;        // 实施成本
}

export interface PortfolioTemplate {
  id: string;
  name: string;
  description: string;
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  holdings: Array<{
    symbol: string;
    name: string;
    targetWeight: number;
    sector?: string;
    reasoning?: string;
  }>;
  expectedReturn: number;
  expectedRisk: number;
  rebalanceFrequency: 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
  minimumInvestment: number;
  intelligentConfig?: IntelligentPositionConfig; // 智能仓位配置
}

// ============================================================================
// Portfolio Management Service
// ============================================================================

export class PortfolioManagementService {
  private riskService = getRiskAnalysisService();
  private quantService = getQuantCalculationService();
  private currentPortfolio: Portfolio | null = null;
  private readonly STORAGE_KEY = 'figma_make_portfolio_v1';
  private readonly TEMPLATES_STORAGE_KEY = 'figma_portfolio_templates_v1';
  private templates: PortfolioTemplate[] = [];
  private initialized = false;
  private lastInitOptions: { enableRealData?: boolean } | null = null;

  constructor() {
    // 尝试在初始化时加载
    if (typeof window !== 'undefined') {
      this.currentPortfolio = this.loadFromStorage();
      this.templates = this.loadTemplatesFromStorage();
      
      // 如果没有模板，创建默认模板
      if (this.templates.length === 0) {
        this.initializeDefaultTemplates();
      }
    }
  }

  /**
   * 初始化服务以与 initializeServices() 对接
   */
  async initialize(options: { enableRealData?: boolean } = {}) {
    // 如果已经初始化则直接返回，避免重复工作
    if (this.initialized) {
      this.lastInitOptions = { ...options };
      return { healthy: true, initialized: true, cached: true };
    }

    try {
      console.log('📈 [PortfolioService] Initializing portfolio management service...');

      // 确保本地组合和模板数据可用
      this.getCurrentPortfolio();
      if (this.templates.length === 0) {
        this.initializeDefaultTemplates();
      }

      // 根据需要可以在此处扩展更多初始化逻辑（如实时数据、API接入）
      this.initialized = true;
      this.lastInitOptions = { ...options };

      return { healthy: true, initialized: true };
    } catch (error) {
      console.error('❌ [PortfolioService] Initialization failed:', error);
      return {
        healthy: false,
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 从本地存储加载组合
   */
  private loadFromStorage(): Portfolio | null {
    try {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load portfolio from storage', e);
    }
    return null;
  }

  /**
   * 保存组合到本地存储
   */
  private saveToStorage(portfolio: Portfolio) {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(portfolio));
    } catch (e) {
      console.error('Failed to save portfolio to storage', e);
    }
  }

  /**
   * 获取当前组合（单例模式）
   */
  getCurrentPortfolio(): Portfolio {
    if (!this.currentPortfolio) {
      // 再次尝试加载（防止构造函数在非浏览器环境执行）
      this.currentPortfolio = this.loadFromStorage();
    }

    if (!this.currentPortfolio) {
      // 默认初始化一个组合
      this.currentPortfolio = this.createPortfolio('默认组合', 1000000);
      
      // 添加一些默认持仓
      this.currentPortfolio = this.addHolding(this.currentPortfolio, '600519', '贵州茅台', 100, 1650);
      this.currentPortfolio = this.addHolding(this.currentPortfolio, '300750', '宁德时代', 500, 210);
      this.currentPortfolio = this.addHolding(this.currentPortfolio, '000858', '五粮液', 1000, 150);
      this.currentPortfolio = this.addHolding(this.currentPortfolio, '600036', '招商银行', 5000, 32);
      
      // 保存默认组合
      this.saveToStorage(this.currentPortfolio);
    }
    return this.currentPortfolio;
  }

  /**
   * 更新组合配置
   */
  updateConfiguration(
    initialCash: number, 
    holdings: Array<{symbol: string, name: string, quantity: number, cost: number, price: number}>
  ): Portfolio {
    // 重置组合
    let portfolio = this.createPortfolio('我的组合', initialCash);
    
    // 批量添加持仓
    holdings.forEach(h => {
      // 扣除现金（按成本价）
      const cost = h.quantity * h.cost;
      // 允许现金扣减到负数（融资）或者仅做记录？这里假设只记录
      // 但为了保持逻辑一致，我们扣减现金
      
      if (portfolio.cash >= cost) {
        portfolio.cash -= cost;
      } else {
        // 如果现金不足，仍然添加持仓，但现金会变成负数（表示杠杆）
        portfolio.cash -= cost;
      }
      
      portfolio.holdings.push({
        symbol: h.symbol,
        name: h.name,
        quantity: h.quantity,
        avgCost: h.cost,
        currentPrice: h.price,
        marketValue: h.quantity * h.price,
        weight: 0, // 稍后计算
        pnl: (h.price - h.cost) * h.quantity,
        pnlPercent: h.cost > 0 ? ((h.price - h.cost) / h.cost) * 100 : 0,
        dayChange: 0,
        dayChangePercent: 0,
      });
    });

    // 重新计算指标
    portfolio = this.recalculatePortfolio(portfolio);
    
    this.currentPortfolio = portfolio;
    this.saveToStorage(portfolio);
    return portfolio;
  }

  /**
   * 创建新组合
   */
  createPortfolio(name: string, initialCash: number, description?: string): Portfolio {
    return {
      id: this.generateId(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cash: initialCash,
      totalValue: initialCash,
      totalCost: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      holdings: [],
    };
  }

  /**
   * 添加持仓
   */
  addHolding(
    portfolio: Portfolio,
    symbol: string,
    name: string,
    quantity: number,
    price: number
  ): Portfolio {
    const cost = quantity * price;
    
    if (portfolio.cash < cost) {
      throw new Error('Insufficient cash');
    }

    const existingIndex = portfolio.holdings.findIndex(h => h.symbol === symbol);

    if (existingIndex >= 0) {
      // 加仓
      const existing = portfolio.holdings[existingIndex];
      const newQuantity = existing.quantity + quantity;
      const newAvgCost = (existing.avgCost * existing.quantity + price * quantity) / newQuantity;

      portfolio.holdings[existingIndex] = {
        ...existing,
        quantity: newQuantity,
        avgCost: newAvgCost,
        currentPrice: price,
        marketValue: newQuantity * price,
      };
    } else {
      // 新增
      portfolio.holdings.push({
        symbol,
        name,
        quantity,
        avgCost: price,
        currentPrice: price,
        marketValue: cost,
        weight: 0,
        pnl: 0,
        pnlPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
      });
    }

    portfolio.cash -= cost;
    portfolio.updatedAt = Date.now();
    
    const updated = this.recalculatePortfolio(portfolio);
    if (this.currentPortfolio && updated.id === this.currentPortfolio.id) {
      this.saveToStorage(updated);
    }
    return updated;
  }

  /**
   * 减少持仓
   */
  reduceHolding(
    portfolio: Portfolio,
    symbol: string,
    quantity: number,
    price: number
  ): Portfolio {
    const existingIndex = portfolio.holdings.findIndex(h => h.symbol === symbol);

    if (existingIndex < 0) {
      throw new Error('Holding not found');
    }

    const holding = portfolio.holdings[existingIndex];

    if (holding.quantity < quantity) {
      throw new Error('Insufficient shares');
    }

    const proceeds = quantity * price;

    if (quantity >= holding.quantity) {
      // 全部卖出
      portfolio.holdings.splice(existingIndex, 1);
    } else {
      // 部分卖出
      portfolio.holdings[existingIndex] = {
        ...holding,
        quantity: holding.quantity - quantity,
        marketValue: (holding.quantity - quantity) * price,
        currentPrice: price,
      };
    }

    portfolio.cash += proceeds;
    portfolio.updatedAt = Date.now();

    const updated = this.recalculatePortfolio(portfolio);
    if (this.currentPortfolio && updated.id === this.currentPortfolio.id) {
      this.saveToStorage(updated);
    }
    return updated;
  }

  /**
   * 更新持仓价格
   */
  updatePrices(portfolio: Portfolio, prices: Map<string, number>): Portfolio {
    portfolio.holdings.forEach(holding => {
      const newPrice = prices.get(holding.symbol);
      if (newPrice !== undefined) {
        const oldPrice = holding.currentPrice;
        holding.currentPrice = newPrice;
        holding.marketValue = holding.quantity * newPrice;
        holding.dayChange = newPrice - oldPrice;
        holding.dayChangePercent = ((newPrice - oldPrice) / oldPrice) * 100;
      }
    });

    portfolio.updatedAt = Date.now();
    const updated = this.recalculatePortfolio(portfolio);
    if (this.currentPortfolio && updated.id === this.currentPortfolio.id) {
      this.saveToStorage(updated);
    }
    return updated;
  }

  /**
   * 重新计算组合指标
   */
  private recalculatePortfolio(portfolio: Portfolio): Portfolio {
    // 计算总市值和总成本
    let totalMarketValue = portfolio.cash;
    let totalCost = 0;

    portfolio.holdings.forEach(holding => {
      totalMarketValue += holding.marketValue;
      totalCost += holding.avgCost * holding.quantity;
      
      // 计算盈亏
      holding.pnl = holding.marketValue - (holding.avgCost * holding.quantity);
      holding.pnlPercent = ((holding.currentPrice - holding.avgCost) / holding.avgCost) * 100;
    });

    portfolio.totalValue = totalMarketValue;
    portfolio.totalCost = totalCost;
    portfolio.totalPnL = totalMarketValue - portfolio.cash - totalCost;
    portfolio.totalPnLPercent = totalCost > 0 ? (portfolio.totalPnL / totalCost) * 100 : 0;

    // 计算权重
    portfolio.holdings.forEach(holding => {
      holding.weight = (holding.marketValue / portfolio.totalValue) * 100;
    });

    return portfolio;
  }

  /**
   * 组合优化
   */
  optimizePortfolio(
    returns: Map<string, number[]>,
    params: OptimizationParams
  ): OptimizationResult {
    const symbols = Array.from(returns.keys());
    const n = symbols.length;

    let weights: Map<string, number>;

    switch (params.method) {
      case 'equal-weight':
        weights = this.equalWeightAllocation(symbols);
        break;

      case 'min-variance':
        weights = this.minimumVarianceAllocation(returns);
        break;

      case 'max-sharpe':
        weights = this.maxSharpeAllocation(returns, params.riskFreeRate || 0.03);
        break;

      case 'risk-parity':
        weights = this.riskParityAllocation(returns);
        break;

      default:
        weights = this.equalWeightAllocation(symbols);
    }

    // 应用权重约束
    if (params.constraints) {
      weights = this.applyConstraints(weights, params.constraints);
    }

    // 计算期望收益和风险
    const { expectedReturn, expectedRisk } = this.calculatePortfolioMetrics(weights, returns);
    const sharpeRatio = expectedRisk > 0
      ? (expectedReturn - (params.riskFreeRate || 0.03)) / expectedRisk
      : 0;

    // 生成配置明细
    const totalValue = 1000000; // 假设100万
    const allocation = Array.from(weights.entries()).map(([symbol, weight]) => ({
      symbol,
      weight,
      value: totalValue * weight,
    }));

    return {
      weights,
      expectedReturn,
      expectedRisk,
      sharpeRatio,
      allocation,
    };
  }

  /**
   * 等权重配置
   */
  private equalWeightAllocation(symbols: string[]): Map<string, number> {
    const weight = 1 / symbols.length;
    const weights = new Map<string, number>();
    symbols.forEach(symbol => weights.set(symbol, weight));
    return weights;
  }

  /**
   * 最小方差配置 - 马科维茨模型
   */
  private minimumVarianceAllocation(returns: Map<string, number[]>): Map<string, number> {
    const symbols = Array.from(returns.keys());
    const n = symbols.length;
    
    if (n <= 1) {
      return this.equalWeightAllocation(symbols);
    }

    // 计算协方差矩阵
    const covarianceMatrix = this.calculateCovarianceMatrix(returns);
    
    try {
      // 使用数值方法求解最小方差组合
      // min w^T * Sigma * w
      // s.t. sum(w) = 1, w >= 0
      
      const weights = this.solveMinVarianceProblem(covarianceMatrix, symbols);
      return weights;
    } catch (error) {
      console.warn('[Portfolio] Min variance optimization failed, using equal weight:', error);
      return this.equalWeightAllocation(symbols);
    }
  }

  /**
   * 最大夏普比率配置 - Markowitz优化
   */
  private maxSharpeAllocation(
    returns: Map<string, number[]>,
    riskFreeRate: number
  ): Map<string, number> {
    const symbols = Array.from(returns.keys());
    const n = symbols.length;
    
    if (n <= 1) {
      return this.equalWeightAllocation(symbols);
    }

    try {
      // 计算期望收益向量
      const expectedReturns = new Map<string, number>();
      symbols.forEach(symbol => {
        const assetReturns = returns.get(symbol) || [];
        const annualizedReturn = this.mean(assetReturns) * 252;
        expectedReturns.set(symbol, annualizedReturn);
      });

      // 计算协方差矩阵
      const covarianceMatrix = this.calculateCovarianceMatrix(returns);
      
      // 求解最大夏普比率组合
      // max (w^T * mu - rf) / sqrt(w^T * Sigma * w)
      const weights = this.solveMaxSharpeRatioProblem(expectedReturns, covarianceMatrix, riskFreeRate, symbols);
      return weights;
    } catch (error) {
      console.warn('[Portfolio] Max Sharpe optimization failed, using heuristic approach:', error);
      
      // 降级到启发式方法
      const sharpeRatios = new Map<string, number>();
      symbols.forEach(symbol => {
        const assetReturns = returns.get(symbol) || [];
        const avgReturn = this.mean(assetReturns) * 252;
        const volatility = this.standardDeviation(assetReturns) * Math.sqrt(252);
        const sharpe = volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;
        sharpeRatios.set(symbol, Math.max(0, sharpe));
      });

      // 归一化权重
      const totalSharpe = Array.from(sharpeRatios.values()).reduce((sum, s) => sum + s, 0);
      const weights = new Map<string, number>();

      if (totalSharpe > 0) {
        symbols.forEach(symbol => {
          weights.set(symbol, (sharpeRatios.get(symbol) || 0) / totalSharpe);
        });
      } else {
        return this.equalWeightAllocation(symbols);
      }

      return weights;
    }
  }

  /**
   * 风险平价配置 - Risk Parity Portfolio
   */
  private riskParityAllocation(returns: Map<string, number[]>): Map<string, number> {
    const symbols = Array.from(returns.keys());
    const n = symbols.length;
    
    if (n <= 1) {
      return this.equalWeightAllocation(symbols);
    }

    try {
      // 计算协方差矩阵
      const covarianceMatrix = this.calculateCovarianceMatrix(returns);
      
      // 风险平价：每个资产的边际风险贡献相等
      // RC_i = w_i * (Sigma * w)_i / (w^T * Sigma * w) = 1/n for all i
      
      const weights = this.solveRiskParityProblem(covarianceMatrix, symbols);
      return weights;
    } catch (error) {
      console.warn('[Portfolio] Risk parity optimization failed, using inverse volatility:', error);
      
      // 降级到逆波动率加权
      const invVolatilities = new Map<string, number>();
      symbols.forEach(symbol => {
        const assetReturns = returns.get(symbol) || [];
        const volatility = this.standardDeviation(assetReturns);
        invVolatilities.set(symbol, volatility > 0 ? 1 / volatility : 0);
      });

      // 归一化
      const totalInvVol = Array.from(invVolatilities.values()).reduce((sum, v) => sum + v, 0);
      const weights = new Map<string, number>();

      if (totalInvVol > 0) {
        symbols.forEach(symbol => {
          weights.set(symbol, (invVolatilities.get(symbol) || 0) / totalInvVol);
        });
      } else {
        return this.equalWeightAllocation(symbols);
      }

      return weights;
    }
  }

  /**
   * 应用权重约束
   */
  private applyConstraints(
    weights: Map<string, number>,
    constraints: NonNullable<OptimizationParams['constraints']>
  ): Map<string, number> {
    const adjusted = new Map(weights);
    const { minWeight = 0, maxWeight = 1 } = constraints;

    // 应用最小最大约束
    adjusted.forEach((weight, symbol) => {
      if (weight < minWeight) {
        adjusted.set(symbol, minWeight);
      } else if (weight > maxWeight) {
        adjusted.set(symbol, maxWeight);
      }
    });

    // 重新归一化
    const total = Array.from(adjusted.values()).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      adjusted.forEach((weight, symbol) => {
        adjusted.set(symbol, weight / total);
      });
    }

    return adjusted;
  }

  /**
   * 计算组合期望收益和风险
   */
  private calculatePortfolioMetrics(
    weights: Map<string, number>,
    returns: Map<string, number[]>
  ): { expectedReturn: number; expectedRisk: number } {
    const symbols = Array.from(weights.keys());
    
    // 计算期望收益
    let expectedReturn = 0;
    symbols.forEach(symbol => {
      const weight = weights.get(symbol) || 0;
      const assetReturns = returns.get(symbol) || [];
      const avgReturn = this.mean(assetReturns) * 252;
      expectedReturn += weight * avgReturn;
    });

    // 计算组合收益序列
    const firstReturns = returns.get(symbols[0]) || [];
    const portfolioReturns: number[] = Array(firstReturns.length).fill(0);

    symbols.forEach(symbol => {
      const weight = weights.get(symbol) || 0;
      const assetReturns = returns.get(symbol) || [];
      assetReturns.forEach((ret, i) => {
        portfolioReturns[i] += weight * ret;
      });
    });

    // 计算组合风险
    const expectedRisk = this.riskService['calculateVolatility'](portfolioReturns) * Math.sqrt(252);

    return { expectedReturn, expectedRisk };
  }

  /**
   * 生成再平衡方案
   */
  generateRebalancePlan(
    portfolio: Portfolio,
    targetWeights: Map<string, number>
  ): RebalanceAction[] {
    const actions: RebalanceAction[] = [];
    const totalValue = portfolio.totalValue;

    // 现有持仓
    portfolio.holdings.forEach(holding => {
      const currentWeight = holding.weight / 100;
      const targetWeight = targetWeights.get(holding.symbol) || 0;
      const currentValue = holding.marketValue;
      const targetValue = totalValue * targetWeight;
      const diff = targetValue - currentValue;

      if (Math.abs(diff) > 100) { // 忽略小额差异
        actions.push({
          symbol: holding.symbol,
          currentWeight,
          targetWeight,
          currentValue,
          targetValue,
          action: diff > 0 ? 'BUY' : 'SELL',
          amount: Math.abs(diff),
          shares: Math.abs(Math.floor(diff / holding.currentPrice)),
        });
      }
    });

    // 新增标的
    targetWeights.forEach((targetWeight, symbol) => {
      if (!portfolio.holdings.find(h => h.symbol === symbol)) {
        const targetValue = totalValue * targetWeight;
        
        if (targetValue > 100) {
          actions.push({
            symbol,
            currentWeight: 0,
            targetWeight,
            currentValue: 0,
            targetValue,
            action: 'BUY',
            amount: targetValue,
            shares: 0, // 需要外部提供价格
          });
        }
      }
    });

    return actions.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }

  /**
   * 绩效归因分析
   */
  performAttribution(
    portfolio: Portfolio,
    returns: Map<string, number[]>
  ): Attribution[] {
    const attribution: Attribution[] = [];

    portfolio.holdings.forEach(holding => {
      const weight = holding.weight / 100;
      const assetReturns = returns.get(holding.symbol) || [];
      const avgReturn = this.mean(assetReturns) * 252;
      const contribution = weight * avgReturn;
      
      attribution.push({
        symbol: holding.symbol,
        weight,
        return: avgReturn,
        contribution,
        contributionPercent: 0,
      });
    });

    // 计算贡献百分比
    const totalContribution = attribution.reduce((sum, a) => sum + a.contribution, 0);
    attribution.forEach(a => {
      a.contributionPercent = totalContribution !== 0 ? (a.contribution / totalContribution) * 100 : 0;
    });

    return attribution.sort((a, b) => b.contribution - a.contribution);
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `PORT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 执行深度量化分析
   * (模拟生成历史收益数据以展示功能)
   */
  async getAdvancedRiskAnalysis(portfolio: Portfolio): Promise<AdvancedRiskMetrics> {
    const symbols = portfolio.holdings.map(h => h.symbol);
    if (symbols.length === 0) {
      return this.getEmptyMetrics();
    }

    // 1. 模拟生成相关性数据 (实际项目中应从 MarketDataProvider 获取真实历史数据)
    // 为了演示效果，我们生成一些具有行业相关性的随机漫步数据
    const returnsMap = new Map<string, number[]>();
    const benchmarkReturns = this.generateRandomReturns(100, 0.0005, 0.012); // 基准收益

    symbols.forEach(symbol => {
      // 简单模拟：基于sector赋予一定的相关性
      // 这里简化处理，直接生成随机相关数据
      const correlation = 0.3 + Math.random() * 0.5; // 0.3 ~ 0.8 correlation with benchmark
      const vol = 0.01 + Math.random() * 0.02; // 1% ~ 3% daily vol
      const assetReturns = benchmarkReturns.map(r => r * correlation + this.generateNormalRandom(0, vol) * (1-correlation));
      returnsMap.set(symbol, assetReturns);
    });

    // 2. 计算相关性矩阵
    const correlationMatrix = this.quantService.calculateCorrelationMatrix(returnsMap);

    // 3. 计算组合Beta
    let weightedBeta = 0;
    const volatilityContribution: Array<{ symbol: string; contribution: number }> = [];
    
    portfolio.holdings.forEach(h => {
        const assetReturns = returnsMap.get(h.symbol) || [];
        const beta = this.quantService.calculateBeta(assetReturns, benchmarkReturns);
        const weight = h.weight / 100;
        weightedBeta += beta * weight;
        
        // 简化波动率贡献计算
        const std = this.quantService.stdDev(assetReturns);
        volatilityContribution.push({
            symbol: h.symbol,
            contribution: weight * std * beta // 近似值
        });
    });

    // 归一化波动率贡献
    const totalVolContrib = volatilityContribution.reduce((s, i) => s + i.contribution, 0);
    if (totalVolContrib > 0) {
        volatilityContribution.forEach(item => item.contribution = (item.contribution / totalVolContrib) * 100);
    }

    // 4. 计算 VaR
    // 假设组合日波动率为 1.2% (简化)
    const portfolioVol = 0.012; 
    const vaR95 = this.quantService.calculateParametricVaR(portfolio.totalValue, portfolioVol, 0.95);
    const vaR99 = this.quantService.calculateParametricVaR(portfolio.totalValue, portfolioVol, 0.99);

    // 5. 生成压力测试场景
    const stressTestResults: StressTestScenario[] = [
        {
            name: '2008 金融危机复现',
            description: '全球股市暴跌，流动性枯竭',
            impactPercent: -35.4 * weightedBeta, // 基于Beta调整影响
            impactValue: portfolio.totalValue * (-0.354 * weightedBeta),
            probability: '极低'
        },
        {
            name: '美联储加息 100bp',
            description: '利率曲线剧烈上移，成长股受挫',
            impactPercent: -8.5 * (weightedBeta > 1.1 ? 1.2 : 0.9),
            impactValue: portfolio.totalValue * (-0.085 * (weightedBeta > 1.1 ? 1.2 : 0.9)),
            probability: '中等'
        },
        {
            name: '新能源板块回调',
            description: '行业拥挤度过高引发踩踏',
            impactPercent: -12.0, // 假设这是一个行业特定冲击
            impactValue: portfolio.totalValue * -0.12, 
            probability: '高'
        },
        {
            name: '全面牛市爆发',
            description: '市场情绪亢奋，成交量突破',
            impactPercent: 15.0 * weightedBeta,
            impactValue: portfolio.totalValue * (0.15 * weightedBeta),
            probability: '中等'
        }
    ];

    return {
      correlationMatrix,
      portfolioBeta: weightedBeta,
      valueAtRisk95: vaR95,
      valueAtRisk99: vaR99,
      stressTestResults,
      volatilityContribution: volatilityContribution.sort((a,b) => b.contribution - a.contribution)
    };
  }

  private getEmptyMetrics(): AdvancedRiskMetrics {
    return {
      correlationMatrix: new Map(),
      portfolioBeta: 0,
      valueAtRisk95: 0,
      valueAtRisk99: 0,
      stressTestResults: [],
      volatilityContribution: []
    };
  }

  // 辅助函数：Box-Muller 变换生成正态分布随机数
  private generateNormalRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  private generateRandomReturns(count: number, mean: number, stdDev: number): number[] {
    const arr = [];
    for(let i=0; i<count; i++) {
        arr.push(this.generateNormalRandom(mean, stdDev));
    }
    return arr;
  }

  /**
   * 计算均值 - 增强空数据处理
   */
  private mean(data: number[]): number {
    // 检查数据有效性
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[PortfolioManagementService] mean: Invalid or empty data array');
      return 0;
    }
    
    // 过滤无效数据
    const validData = data.filter(x => typeof x === 'number' && !isNaN(x) && isFinite(x));
    if (validData.length === 0) {
      console.warn('[PortfolioManagementService] mean: No valid data points');
      return 0;
    }
    
    return validData.reduce((sum, x) => sum + x, 0) / validData.length;
  }

  /**
   * 计算标准差 - 增强空数据处理
   */
  private standardDeviation(data: number[]): number {
    // 检查数据有效性
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[PortfolioManagementService] standardDeviation: Invalid or empty data array');
      return 0;
    }
    
    // 过滤无效数据
    const validData = data.filter(x => typeof x === 'number' && !isNaN(x) && isFinite(x));
    if (validData.length <= 1) {
      return 0; // 数据点不足，标准差为0
    }
    
    const avg = this.mean(validData);
    const variance = validData.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0) / (validData.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * 计算协方差矩阵
   */
  private calculateCovarianceMatrix(returns: Map<string, number[]>): Map<string, Map<string, number>> {
    const symbols = Array.from(returns.keys());
    const n = symbols.length;
    const matrix = new Map<string, Map<string, number>>();

    // 初始化矩阵
    symbols.forEach(symbol1 => {
      matrix.set(symbol1, new Map<string, number>());
      symbols.forEach(symbol2 => {
        matrix.get(symbol1)!.set(symbol2, 0);
      });
    });

    // 计算协方差
    symbols.forEach(symbol1 => {
      symbols.forEach(symbol2 => {
        const returns1 = returns.get(symbol1) || [];
        const returns2 = returns.get(symbol2) || [];
        
        if (returns1.length === 0 || returns2.length === 0) {
          matrix.get(symbol1)!.set(symbol2, 0);
          return;
        }

        const covariance = this.calculateCovariance(returns1, returns2);
        matrix.get(symbol1)!.set(symbol2, covariance * 252); // 年化
      });
    });

    return matrix;
  }

  /**
   * 计算两个序列的协方差
   */
  private calculateCovariance(x: number[], y: number[]): number {
    const minLength = Math.min(x.length, y.length);
    if (minLength <= 1) return 0;

    const xSlice = x.slice(0, minLength);
    const ySlice = y.slice(0, minLength);
    
    const meanX = this.mean(xSlice);
    const meanY = this.mean(ySlice);

    let covariance = 0;
    for (let i = 0; i < minLength; i++) {
      covariance += (xSlice[i] - meanX) * (ySlice[i] - meanY);
    }

    return covariance / (minLength - 1);
  }

  /**
   * 求解最小方差问题
   * min w^T * Sigma * w
   * s.t. sum(w) = 1, w >= 0
   */
  private solveMinVarianceProblem(
    covarianceMatrix: Map<string, Map<string, number>>,
    symbols: string[]
  ): Map<string, number> {
    const n = symbols.length;
    
    // 使用简化的数值方法求解
    // 在实际应用中，应该使用专业的二次规划求解器
    
    // 初始化权重（等权重）
    let weights = new Map<string, number>();
    symbols.forEach(symbol => weights.set(symbol, 1 / n));

    // 迭代优化（简化梯度下降法）
    const maxIterations = 100;
    const learningRate = 0.01;

    for (let iter = 0; iter < maxIterations; iter++) {
      const gradients = this.calculateVarianceGradients(weights, covarianceMatrix, symbols);
      
      // 更新权重
      let weightSum = 0;
      symbols.forEach(symbol => {
        const currentWeight = weights.get(symbol) || 0;
        const gradient = gradients.get(symbol) || 0;
        const newWeight = Math.max(0, currentWeight - learningRate * gradient);
        weights.set(symbol, newWeight);
        weightSum += newWeight;
      });

      // 归一化权重
      if (weightSum > 0) {
        symbols.forEach(symbol => {
          const weight = weights.get(symbol) || 0;
          weights.set(symbol, weight / weightSum);
        });
      }
    }

    return weights;
  }

  /**
   * 计算组合方差对权重的梯度
   */
  private calculateVarianceGradients(
    weights: Map<string, number>,
    covarianceMatrix: Map<string, Map<string, number>>,
    symbols: string[]
  ): Map<string, number> {
    const gradients = new Map<string, number>();

    symbols.forEach(symbol1 => {
      let gradient = 0;
      symbols.forEach(symbol2 => {
        const weight2 = weights.get(symbol2) || 0;
        const covariance = covarianceMatrix.get(symbol1)?.get(symbol2) || 0;
        gradient += 2 * weight2 * covariance;
      });
      gradients.set(symbol1, gradient);
    });

    return gradients;
  }

  /**
   * 求解最大夏普比率问题
   */
  private solveMaxSharpeRatioProblem(
    expectedReturns: Map<string, number>,
    covarianceMatrix: Map<string, Map<string, number>>,
    riskFreeRate: number,
    symbols: string[]
  ): Map<string, number> {
    const n = symbols.length;
    
    // 初始化权重
    let weights = new Map<string, number>();
    symbols.forEach(symbol => weights.set(symbol, 1 / n));

    // 迭代优化最大夏普比率
    const maxIterations = 200;
    const learningRate = 0.005;
    let bestSharpeRatio = -Infinity;
    let bestWeights = new Map(weights);

    for (let iter = 0; iter < maxIterations; iter++) {
      // 计算当前夏普比率
      const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns);
      const portfolioRisk = this.calculatePortfolioRisk(weights, covarianceMatrix, symbols);
      const currentSharpeRatio = portfolioRisk > 0 ? (portfolioReturn - riskFreeRate) / portfolioRisk : 0;

      // 保存最佳权重
      if (currentSharpeRatio > bestSharpeRatio) {
        bestSharpeRatio = currentSharpeRatio;
        bestWeights = new Map(weights);
      }

      // 计算夏普比率梯度
      const gradients = this.calculateSharpeRatioGradients(weights, expectedReturns, covarianceMatrix, riskFreeRate, symbols);
      
      // 更新权重
      let weightSum = 0;
      symbols.forEach(symbol => {
        const currentWeight = weights.get(symbol) || 0;
        const gradient = gradients.get(symbol) || 0;
        const newWeight = Math.max(0, currentWeight + learningRate * gradient);
        weights.set(symbol, newWeight);
        weightSum += newWeight;
      });

      // 归一化权重
      if (weightSum > 0) {
        symbols.forEach(symbol => {
          const weight = weights.get(symbol) || 0;
          weights.set(symbol, weight / weightSum);
        });
      }
    }

    return bestWeights;
  }

  /**
   * 计算组合收益
   */
  private calculatePortfolioReturn(
    weights: Map<string, number>,
    expectedReturns: Map<string, number>
  ): number {
    let portfolioReturn = 0;
    weights.forEach((weight, symbol) => {
      const expectedReturn = expectedReturns.get(symbol) || 0;
      portfolioReturn += weight * expectedReturn;
    });
    return portfolioReturn;
  }

  /**
   * 计算组合风险（标准差）
   */
  private calculatePortfolioRisk(
    weights: Map<string, number>,
    covarianceMatrix: Map<string, Map<string, number>>,
    symbols: string[]
  ): number {
    let portfolioVariance = 0;
    
    symbols.forEach(symbol1 => {
      const weight1 = weights.get(symbol1) || 0;
      symbols.forEach(symbol2 => {
        const weight2 = weights.get(symbol2) || 0;
        const covariance = covarianceMatrix.get(symbol1)?.get(symbol2) || 0;
        portfolioVariance += weight1 * weight2 * covariance;
      });
    });

    return Math.sqrt(Math.max(0, portfolioVariance));
  }

  /**
   * 计算夏普比率对权重的梯度
   */
  private calculateSharpeRatioGradients(
    weights: Map<string, number>,
    expectedReturns: Map<string, number>,
    covarianceMatrix: Map<string, Map<string, number>>,
    riskFreeRate: number,
    symbols: string[]
  ): Map<string, number> {
    const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns);
    const portfolioRisk = this.calculatePortfolioRisk(weights, covarianceMatrix, symbols);
    const excessReturn = portfolioReturn - riskFreeRate;

    const gradients = new Map<string, number>();

    if (portfolioRisk === 0) {
      symbols.forEach(symbol => gradients.set(symbol, 0));
      return gradients;
    }

    symbols.forEach(symbol => {
      const expectedReturn = expectedReturns.get(symbol) || 0;
      
      // 计算风险对权重的偏导数
      let riskGradient = 0;
      symbols.forEach(symbol2 => {
        const weight2 = weights.get(symbol2) || 0;
        const covariance = covarianceMatrix.get(symbol)?.get(symbol2) || 0;
        riskGradient += 2 * weight2 * covariance;
      });
      riskGradient = riskGradient / (2 * portfolioRisk);

      // 夏普比率梯度 = (dR/dw * risk - excessReturn * d(risk)/dw) / risk^2
      const gradient = ((expectedReturn - riskFreeRate) * portfolioRisk - excessReturn * riskGradient) / (portfolioRisk * portfolioRisk);
      gradients.set(symbol, gradient);
    });

    return gradients;
  }

  /**
   * 求解风险平价问题
   * RC_i = w_i * (Sigma * w)_i / (w^T * Sigma * w) = 1/n for all i
   */
  private solveRiskParityProblem(
    covarianceMatrix: Map<string, Map<string, number>>,
    symbols: string[]
  ): Map<string, number> {
    const n = symbols.length;
    const targetRiskContribution = 1 / n;

    // 初始化权重
    let weights = new Map<string, number>();
    symbols.forEach(symbol => weights.set(symbol, 1 / n));

    // 迭代优化风险平价
    const maxIterations = 300;
    const learningRate = 0.01;

    for (let iter = 0; iter < maxIterations; iter++) {
      const riskContributions = this.calculateRiskContributions(weights, covarianceMatrix, symbols);
      
      // 更新权重以平衡风险贡献
      let weightSum = 0;
      symbols.forEach(symbol => {
        const currentWeight = weights.get(symbol) || 0;
        const currentRiskContrib = riskContributions.get(symbol) || 0;
        
        // 调整权重使风险贡献接近目标
        const error = currentRiskContrib - targetRiskContribution;
        const adjustment = -learningRate * error;
        const newWeight = Math.max(0.001, currentWeight + adjustment); // 最小权重0.1%
        
        weights.set(symbol, newWeight);
        weightSum += newWeight;
      });

      // 归一化权重
      if (weightSum > 0) {
        symbols.forEach(symbol => {
          const weight = weights.get(symbol) || 0;
          weights.set(symbol, weight / weightSum);
        });
      }
    }

    return weights;
  }

  /**
   * 计算各资产的风险贡献
   */
  private calculateRiskContributions(
    weights: Map<string, number>,
    covarianceMatrix: Map<string, Map<string, number>>,
    symbols: string[]
  ): Map<string, number> {
    const portfolioRisk = this.calculatePortfolioRisk(weights, covarianceMatrix, symbols);
    const riskContributions = new Map<string, number>();

    if (portfolioRisk === 0) {
      symbols.forEach(symbol => riskContributions.set(symbol, 1 / symbols.length));
      return riskContributions;
    }

    symbols.forEach(symbol1 => {
      const weight1 = weights.get(symbol1) || 0;
      
      // 计算边际风险贡献 (Sigma * w)_i
      let marginalRiskContrib = 0;
      symbols.forEach(symbol2 => {
        const weight2 = weights.get(symbol2) || 0;
        const covariance = covarianceMatrix.get(symbol1)?.get(symbol2) || 0;
        marginalRiskContrib += weight2 * covariance;
      });

      // 风险贡献 = w_i * (Sigma * w)_i / (w^T * Sigma * w)
      const riskContrib = (weight1 * marginalRiskContrib) / (portfolioRisk * portfolioRisk);
      riskContributions.set(symbol1, riskContrib);
    });

    return riskContributions;
  }

  /**
   * 组合再平衡
   */
  async rebalancePortfolio(portfolioId: string, config: {
    method: 'equal_weight' | 'market_cap' | 'min_variance' | 'risk_parity';
    constraints?: {
      maxWeight?: number;
      maxSectorWeight?: number;
      minCashRatio?: number;
    };
  }): Promise<RebalanceAction[]> {
    const portfolio = this.getCurrentPortfolio();
    
    // 生成目标权重
    const targetWeights = new Map<string, number>();
    
    if (config.method === 'equal_weight') {
      const equalWeight = 1 / portfolio.holdings.length;
      portfolio.holdings.forEach(holding => {
        targetWeights.set(holding.symbol, equalWeight);
      });
    } else if (config.method === 'market_cap') {
      // 按市值加权
      const totalMarketCap = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
      portfolio.holdings.forEach(holding => {
        targetWeights.set(holding.symbol, holding.marketValue / totalMarketCap);
      });
    }
    // 其他方法可以调用相应的优化算法
    
    // 应用约束
    if (config.constraints?.maxWeight) {
      targetWeights.forEach((weight, symbol) => {
        if (weight > config.constraints!.maxWeight!) {
          targetWeights.set(symbol, config.constraints!.maxWeight!);
        }
      });
      
      // 重新归一化
      const totalWeight = Array.from(targetWeights.values()).reduce((sum, w) => sum + w, 0);
      targetWeights.forEach((weight, symbol) => {
        targetWeights.set(symbol, weight / totalWeight);
      });
    }
    
    return this.generateRebalancePlan(portfolio, targetWeights);
  }

  // ============================================================================
  // 智能仓位管理方法
  // ============================================================================

  /**
   * 智能仓位推荐
   */
  generateIntelligentPositionRecommendations(
    portfolio: Portfolio,
    marketData: Map<string, { price: number; returns: number[]; volatility: number; fundamentalData?: any }>,
    config: IntelligentPositionConfig
  ): PositionRecommendation[] {
    const recommendations: PositionRecommendation[] = [];
    
    // 默认贝叶斯参数
    const bayesianParams: BayesianRiskParams = {
      priorMean: 0.0008, // 日均收益先验
      priorVariance: 0.0001,
      observationVariance: 0.0004,
      confidenceLevel: 0.95,
      updateFrequency: 60 // 1小时更新
    };

    portfolio.holdings.forEach(holding => {
      const market = marketData.get(holding.symbol);
      if (!market) return;

      // 计算贝叶斯位置指标 (包含基本面数据)
      const bayesianMetrics = this.riskService.calculateBayesianPositionMetrics(
        market.returns,
        market.price,
        portfolio.totalValue,
        bayesianParams,
        market.fundamentalData
      );

      // 计算动态止损
      const stopLoss = this.riskService.calculateDynamicStopLoss(
        market.price,
        holding.avgCost,
        market.returns,
        bayesianParams
      );

      const currentSize = holding.marketValue;
      const currentWeight = holding.weight / 100;

      // 智能仓位推荐逻辑
      let action: 'BUY' | 'SELL' | 'HOLD' | 'REDUCE' = 'HOLD';
      let recommendedSize = currentSize;
      let reason = '当前仓位合适';
      let confidence = 0.7;
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

      // 基于贝叶斯指标调整仓位
      if (config.enableBayesianControl) {
        const optimalWeight = bayesianMetrics.riskAdjustedSize / portfolio.totalValue;
        const sizeDifference = Math.abs(optimalWeight - currentWeight);

        if (sizeDifference > config.rebalanceThreshold) {
          if (optimalWeight > currentWeight) {
            action = 'BUY';
            recommendedSize = Math.min(
              bayesianMetrics.riskAdjustedSize,
              portfolio.totalValue * config.maxPositionSize
            );
            reason = '贝叶斯模型建议增加仓位';
            confidence = Math.min(0.9, bayesianMetrics.posteriorMean * 100);
          } else {
            action = 'REDUCE';
            recommendedSize = bayesianMetrics.riskAdjustedSize;
            reason = '贝叶斯模型建议减少仓位';
            confidence = 0.8;
          }
        }

        // 风险等级评估
        const riskScore = Math.sqrt(bayesianMetrics.posteriorVariance) / Math.abs(bayesianMetrics.posteriorMean);
        if (riskScore > 2) {
          riskLevel = 'CRITICAL';
          action = 'SELL';
          reason = '风险过高，建议清仓';
          confidence = 0.95;
        } else if (riskScore > 1.5) {
          riskLevel = 'HIGH';
        } else if (riskScore > 1) {
          riskLevel = 'MEDIUM';
        }
      }

      // Kelly公式验证
      if (bayesianMetrics.kellyFraction > config.kellyFractionLimit) {
        action = 'REDUCE';
        recommendedSize = Math.min(recommendedSize, portfolio.totalValue * config.kellyFractionLimit);
        reason += ' (Kelly比例过高)';
      }

      // 波动率控制
      if (market.volatility > 0.05) { // 日波动率超过5%
        riskLevel = 'HIGH';
        recommendedSize *= 0.8; // 减少20%仓位
        reason += ' (高波动率)';
      }

      recommendations.push({
        symbol: holding.symbol,
        action,
        currentSize,
        recommendedSize,
        reason,
        confidence,
        riskLevel,
        stopLoss: stopLoss.recommendedStop,
        takeProfit: market.price * 1.2 // 简单的止盈目标
      });
    });

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 智能再平衡
   */
  performSmartRebalance(
    portfolio: Portfolio,
    marketData: Map<string, { price: number; returns: number[]; volatility: number; fundamentalData?: any }>,
    config: IntelligentPositionConfig
  ): SmartRebalanceResult {
    const recommendations = this.generateIntelligentPositionRecommendations(portfolio, marketData, config);
    
    // 计算实施成本和换手率
    let totalTurnover = 0;
    let implementationCost = 0;
    
    recommendations.forEach(rec => {
      const turnover = Math.abs(rec.recommendedSize - rec.currentSize);
      totalTurnover += turnover;
      implementationCost += turnover * 0.003; // 假设0.3%的交易成本
    });

    const turnoverRate = totalTurnover / portfolio.totalValue;

    // 预期改进计算 (简化)
    const expectedImprovement = {
      sharpeRatio: 0.05, // 预期夏普比率改进
      maxDrawdown: -0.02, // 预期最大回撤减少
      volatility: -0.01 // 预期波动率降低
    };

    return {
      actions: recommendations,
      expectedImprovement,
      totalTurnover: turnoverRate,
      implementationCost
    };
  }

  /**
   * 风险预算分配
   */
  allocateRiskBudget(
    portfolio: Portfolio,
    targetRiskBudget: number,
    marketData: Map<string, { price: number; returns: number[]; volatility: number; fundamentalData?: any }>
  ): Map<string, number> {
    const riskAllocation = new Map<string, number>();
    
    // 计算各持仓的风险贡献
    let totalRiskContribution = 0;
    
    portfolio.holdings.forEach(holding => {
      const market = marketData.get(holding.symbol);
      if (!market) return;
      
      const weight = holding.weight / 100;
      const volatility = market.volatility;
      const riskContribution = weight * volatility;
      
      riskAllocation.set(holding.symbol, riskContribution);
      totalRiskContribution += riskContribution;
    });

    // 归一化风险预算分配
    if (totalRiskContribution > 0) {
      riskAllocation.forEach((risk, symbol) => {
        const normalizedRisk = (risk / totalRiskContribution) * targetRiskBudget;
        riskAllocation.set(symbol, normalizedRisk);
      });
    }

    return riskAllocation;
  }

  /**
   * 动态止损管理
   */
  manageDynamicStopLosses(
    portfolio: Portfolio,
    marketData: Map<string, { price: number; returns: number[]; volatility: number; fundamentalData?: any }>
  ): Map<string, DynamicStopLoss> {
    const stopLosses = new Map<string, DynamicStopLoss>();
    
    const bayesianParams: BayesianRiskParams = {
      priorMean: 0.0008,
      priorVariance: 0.0001,
      observationVariance: 0.0004,
      confidenceLevel: 0.95,
      updateFrequency: 60
    };

    portfolio.holdings.forEach(holding => {
      const market = marketData.get(holding.symbol);
      if (!market) return;

      const stopLoss = this.riskService.calculateDynamicStopLoss(
        market.price,
        holding.avgCost,
        market.returns,
        bayesianParams
      );

      stopLosses.set(holding.symbol, stopLoss);
    });

    return stopLosses;
  }

  /**
   * 组合压力测试
   */
  runPortfolioStressTest(
    portfolio: Portfolio,
    scenarios: Array<{ name: string; shockType: 'market' | 'volatility' | 'correlation'; magnitude: number }>
  ): Array<{ scenario: string; portfolioImpact: number; recommendations: string[] }> {
    const results: Array<{ scenario: string; portfolioImpact: number; recommendations: string[] }> = [];

    scenarios.forEach(scenario => {
      let portfolioImpact = 0;
      const recommendations: string[] = [];

      portfolio.holdings.forEach(holding => {
        const weight = holding.weight / 100;
        let assetImpact = 0;

        switch (scenario.shockType) {
          case 'market':
            assetImpact = scenario.magnitude / 100; // 直接价格冲击
            break;
          case 'volatility':
            assetImpact = (scenario.magnitude / 100) * 0.5; // 波动率冲击的简化影响
            break;
          case 'correlation':
            assetImpact = (scenario.magnitude / 100) * 0.3; // 相关性冲击的简化影响
            break;
        }

        portfolioImpact += weight * assetImpact;
      });

      // 生成建议
      if (Math.abs(portfolioImpact) > 0.1) {
        recommendations.push('考虑降低风险敞口');
      }
      if (Math.abs(portfolioImpact) > 0.15) {
        recommendations.push('建议增加对冲策略');
      }
      if (Math.abs(portfolioImpact) > 0.2) {
        recommendations.push('紧急风险控制，考虑减仓');
      }

      results.push({
        scenario: scenario.name,
        portfolioImpact,
        recommendations
      });
    });

    return results;
  }

  /**
   * 获取默认智能配置
   */
  getDefaultIntelligentConfig(riskProfile: 'conservative' | 'balanced' | 'aggressive'): IntelligentPositionConfig {
    const configs = {
      conservative: {
        enableBayesianControl: true,
        riskBudget: 0.08,
        maxPositionSize: 0.15,
        kellyFractionLimit: 0.1,
        rebalanceThreshold: 0.05,
        volatilityLookback: 60
      },
      balanced: {
        enableBayesianControl: true,
        riskBudget: 0.12,
        maxPositionSize: 0.20,
        kellyFractionLimit: 0.15,
        rebalanceThreshold: 0.08,
        volatilityLookback: 45
      },
      aggressive: {
        enableBayesianControl: true,
        riskBudget: 0.18,
        maxPositionSize: 0.25,
        kellyFractionLimit: 0.20,
        rebalanceThreshold: 0.10,
        volatilityLookback: 30
      }
    };

    return configs[riskProfile];
  }

  // ============================================================================
  // Portfolio Template Management
  // ============================================================================

  /**
   * 加载模板从本地存储
   */
  private loadTemplatesFromStorage(): PortfolioTemplate[] {
    try {
      if (typeof window === 'undefined') return [];
      const stored = localStorage.getItem(this.TEMPLATES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load portfolio templates from storage', e);
    }
    return [];
  }

  /**
   * 保存模板到本地存储
   */
  private saveTemplatesToStorage(templates: PortfolioTemplate[]) {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(this.TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
      console.error('Failed to save portfolio templates to storage', e);
    }
  }

  /**
   * 初始化默认模板
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: PortfolioTemplate[] = [
      {
        id: 'conservative-template',
        name: '稳健型组合',
        description: '适合风险偏好较低的投资者，以大盘蓝筹股和债券为主',
        riskProfile: 'conservative',
        holdings: [
          { symbol: '601318', name: '中国平安', targetWeight: 0.20, sector: '金融', reasoning: '保险龙头，分红稳定' },
          { symbol: '600519', name: '贵州茅台', targetWeight: 0.15, sector: '消费', reasoning: '消费龙头，长期价值投资' },
          { symbol: '600036', name: '招商银行', targetWeight: 0.15, sector: '金融', reasoning: '银行业龙头，ROE优秀' },
          { symbol: '000002', name: '万科A', targetWeight: 0.10, sector: '地产', reasoning: '地产龙头，管理层优秀' },
          { symbol: '600000', name: '浦发银行', targetWeight: 0.10, sector: '金融', reasoning: '股份制银行代表' },
          { symbol: '601166', name: '兴业银行', targetWeight: 0.10, sector: '金融', reasoning: '同业业务领先' },
          { symbol: '000858', name: '五粮液', targetWeight: 0.10, sector: '消费', reasoning: '白酒行业第二龙头' },
          { symbol: '601628', name: '中国人寿', targetWeight: 0.10, sector: '金融', reasoning: '保险业龙头企业' }
        ],
        expectedReturn: 0.08,
        expectedRisk: 0.12,
        rebalanceFrequency: 'quarterly',
        minimumInvestment: 100000
      },
      {
        id: 'balanced-template',
        name: '平衡型组合',
        description: '平衡风险与收益，涵盖各主要行业龙头股',
        riskProfile: 'balanced',
        holdings: [
          { symbol: '300750', name: '宁德时代', targetWeight: 0.20, sector: '新能源', reasoning: '全球动力电池龙头' },
          { symbol: '600519', name: '贵州茅台', targetWeight: 0.15, sector: '消费', reasoning: '白酒之王，品牌护城河深厚' },
          { symbol: '000858', name: '五粮液', targetWeight: 0.12, sector: '消费', reasoning: '白酒第二龙头' },
          { symbol: '002594', name: '比亚迪', targetWeight: 0.12, sector: '新能源', reasoning: '新能源汽车龙头' },
          { symbol: '600036', name: '招商银行', targetWeight: 0.10, sector: '金融', reasoning: '零售银行之王' },
          { symbol: '002415', name: '海康威视', targetWeight: 0.08, sector: '科技', reasoning: '安防监控龙头' },
          { symbol: '000333', name: '美的集团', targetWeight: 0.08, sector: '家电', reasoning: '白电龙头，全球化布局' },
          { symbol: '601012', name: '隆基绿能', targetWeight: 0.08, sector: '新能源', reasoning: '光伏硅片龙头' },
          { symbol: '688981', name: '中芯国际', targetWeight: 0.07, sector: '科技', reasoning: '国内芯片制造龙头' }
        ],
        expectedReturn: 0.12,
        expectedRisk: 0.18,
        rebalanceFrequency: 'quarterly',
        minimumInvestment: 200000
      },
      {
        id: 'aggressive-template',
        name: '成长型组合',
        description: '追求高收益，以成长股和科技股为主',
        riskProfile: 'aggressive',
        holdings: [
          { symbol: '300750', name: '宁德时代', targetWeight: 0.25, sector: '新能源', reasoning: '全球动力电池绝对龙头' },
          { symbol: '002594', name: '比亚迪', targetWeight: 0.20, sector: '新能源', reasoning: '新能源汽车领导者' },
          { symbol: '688981', name: '中芯国际', targetWeight: 0.15, sector: '科技', reasoning: '国产芯片希望之星' },
          { symbol: '300059', name: '东方财富', targetWeight: 0.10, sector: '金融科技', reasoning: '互联网券商龙头' },
          { symbol: '002230', name: '科大讯飞', targetWeight: 0.08, sector: '人工智能', reasoning: 'AI语音技术领先' },
          { symbol: '300142', name: '沃森生物', targetWeight: 0.07, sector: '医药', reasoning: '疫苗研发创新企业' },
          { symbol: '688005', name: '容百科技', targetWeight: 0.05, sector: '新材料', reasoning: '正极材料龙头' },
          { symbol: '688111', name: '金山办公', targetWeight: 0.05, sector: '软件', reasoning: '办公软件国产化' },
          { symbol: '300496', name: '中科创达', targetWeight: 0.05, sector: '软件', reasoning: '智能终端操作系统' }
        ],
        expectedReturn: 0.18,
        expectedRisk: 0.28,
        rebalanceFrequency: 'monthly',
        minimumInvestment: 300000
      }
    ];

    this.templates = defaultTemplates;
    this.saveTemplatesToStorage(defaultTemplates);
  }

  /**
   * 获取所有组合模板
   */
  getPortfolioTemplates(): PortfolioTemplate[] {
    return this.templates;
  }

  /**
   * 根据ID获取模板
   */
  getTemplateById(id: string): PortfolioTemplate | null {
    return this.templates.find(template => template.id === id) || null;
  }

  /**
   * 根据风险偏好获取模板
   */
  getTemplatesByRiskProfile(riskProfile: 'conservative' | 'balanced' | 'aggressive'): PortfolioTemplate[] {
    return this.templates.filter(template => template.riskProfile === riskProfile);
  }

  /**
   * 创建自定义模板
   */
  createCustomTemplate(template: Omit<PortfolioTemplate, 'id'>): PortfolioTemplate {
    const newTemplate: PortfolioTemplate = {
      ...template,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.templates.push(newTemplate);
    this.saveTemplatesToStorage(this.templates);
    return newTemplate;
  }

  /**
   * 从模板创建组合
   */
  createPortfolioFromTemplate(templateId: string, initialCash: number): Portfolio {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // 创建新组合
    let portfolio = this.createPortfolio(template.name, initialCash, template.description);

    // 根据模板配置添加持仓
    template.holdings.forEach(holding => {
      const targetValue = initialCash * holding.targetWeight;
      // 假设的股价（实际应该从市场数据获取）
      const estimatedPrice = this.getEstimatedPrice(holding.symbol);
      const quantity = Math.floor(targetValue / estimatedPrice / 100) * 100; // 整手买入
      
      if (quantity > 0) {
        try {
          portfolio = this.addHolding(portfolio, holding.symbol, holding.name, quantity, estimatedPrice);
        } catch (error) {
          console.warn(`Failed to add holding ${holding.symbol}:`, error);
        }
      }
    });

    this.currentPortfolio = portfolio;
    this.saveToStorage(portfolio);
    return portfolio;
  }

  /**
   * 获取股票估计价格（简化实现）
   */
  private getEstimatedPrice(symbol: string): number {
    // 这里应该从实时市场数据获取价格
    // 现在使用简化的估计价格
    const priceEstimates: { [key: string]: number } = {
      '600519': 1650, // 贵州茅台
      '300750': 245,  // 宁德时代
      '000858': 150,  // 五粮液
      '600036': 41,   // 招商银行
      '002594': 270,  // 比亚迪
      '601318': 58,   // 中国平安
      '000001': 15,   // 平安银行
      '000002': 9,    // 万科A
      '600000': 12,   // 浦发银行
      '601166': 20,   // 兴业银行
      '601628': 18,   // 中国人寿
      '002415': 45,   // 海康威视
      '000333': 65,   // 美的集团
      '601012': 25,   // 隆基绿能
      '688981': 58,   // 中芯国际
      '300059': 18,   // 东方财富
      '002230': 42,   // 科大讯飞
      '300142': 28,   // 沃森生物
      '688005': 85,   // 容百科技
      '688111': 320,  // 金山办公
      '300496': 95    // 中科创达
    };

    return priceEstimates[symbol] || 50; // 默认价格
  }

  /**
   * 应用模板权重到现有组合
   */
  applyTemplateToPortfolio(templateId: string, portfolio: Portfolio): OptimizationResult {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // 构建目标权重Map
    const targetWeights = new Map<string, number>();
    template.holdings.forEach(holding => {
      targetWeights.set(holding.symbol, holding.targetWeight);
    });

    // 生成配置结果
    const totalValue = portfolio.totalValue;
    const allocation = Array.from(targetWeights.entries()).map(([symbol, weight]) => ({
      symbol,
      weight,
      value: totalValue * weight,
    }));

    return {
      weights: targetWeights,
      expectedReturn: template.expectedReturn,
      expectedRisk: template.expectedRisk,
      sharpeRatio: template.expectedReturn / template.expectedRisk,
      allocation,
    };
  }
  
  /**
   * 添加事件监听器（兼容性方法）
   */
  addEventListener(event: string, listener: Function): Function {
    // 返回取消监听的函数
    return () => {};
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let portfolioManagementServiceInstance: PortfolioManagementService | null = null;

export function getPortfolioManagementService(): PortfolioManagementService {
  if (!portfolioManagementServiceInstance) {
    portfolioManagementServiceInstance = new PortfolioManagementService();
  }
  return portfolioManagementServiceInstance;
}

export default PortfolioManagementService;
