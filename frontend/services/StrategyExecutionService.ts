/**
 * StrategyExecutionService - 增强型策略执行服务
 * 
 * 功能：
 * - 策略回测引擎
 * - 信号生成和执行
 * - 持仓管理
 * - 绩效计算
 * - 事件驱动架构
 * - 滑点和手续费模拟
 * ✅ 高级量化策略 (新增)
 * ✅ 机器学习策略 (新增)
 * ✅ 多因子模型 (新增)
 * ✅ 组合优化算法 (新增)
 * ✅ 风险平价策略 (新增)
 * ✅ 动态对冲机制 (新增)
 */

import { OHLCV } from './HistoricalDataService';

// ============================================================================
// Types
// ============================================================================

export type SignalType = 'BUY' | 'SELL' | 'HOLD';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'PARTIAL' | 'CANCELLED' | 'REJECTED';
export type PositionSide = 'LONG' | 'SHORT';

export interface Signal {
  timestamp: number;
  symbol: string;
  type: SignalType;
  price: number;
  quantity?: number;
  reason?: string;
  confidence?: number; // 0-1
}

export interface Order {
  id: string;
  timestamp: number;
  symbol: string;
  type: OrderType;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;          // 限价单的价格
  filledQuantity: number;
  avgFilledPrice: number;
  status: OrderStatus;
  commission: number;     // 手续费
  slippage: number;       // 滑点
}

export interface Position {
  symbol: string;
  side: PositionSide;
  quantity: number;
  avgPrice: number;       // 平均持仓成本
  currentPrice: number;
  unrealizedPnL: number;  // 未实现盈亏
  unrealizedPnLPercent: number;
  value: number;          // 持仓市值
  openTimestamp: number;
  lastUpdateTimestamp: number;
}

export interface Trade {
  id: string;
  timestamp: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  value: number;
  commission: number;
  pnl?: number;           // 平仓时的已实现盈亏
}

export interface StrategyConfig {
  name: string;
  initialCapital: number;
  maxPositions: number;   // 最大持仓数量
  commission: number;     // 手续费率
  slippage: number;       // 滑点（百分比）
  riskPerTrade: number;   // 每笔交易风险（百分比）
  stopLoss?: number;      // 止损百分比
  takeProfit?: number;    // 止盈百分比
  parameters: Record<string, any>; // 策略参数

  // 高级策略配置 (新增)
  strategyType: 'technical' | 'fundamental' | 'quantitative' | 'ml' | 'multi_factor' | 'risk_parity' | 'mean_reversion' | 'momentum' | 'pairs_trading' | 'arbitrage';
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  enableDynamicHedging: boolean;
  enableVolumeFilter: boolean;
  enableSectorNeutral: boolean;
  
  // 多因子模型配置
  factorConfig?: {
    enabledFactors: string[];
    factorWeights: Record<string, number>;
    factorDecayRate: number;
    lookbackPeriod: number;
  };
  
  // 机器学习配置
  mlConfig?: {
    modelType: 'xgboost' | 'lightgbm' | 'neural_network' | 'random_forest';
    features: string[];
    trainingPeriod: number;
    retrainFrequency: number;
    crossValidationFolds: number;
  };
  
  // 风险管理增强
  riskConfig?: {
    enableVaR: boolean;
    varConfidence: number;
    enableStressTest: boolean;
    correlationThreshold: number;
    sectorConcentrationLimit: number;
    liquidity: {
      minVolume: number;
      maxSpread: number;
      liquidityScore: number;
    };
  };
}

export interface BacktestResult {
  strategyName: string;
  startDate: number;
  endDate: number;
  initialCapital: number;
  finalCapital: number;
  
  // 收益指标
  totalReturn: number;          // 总收益率
  annualizedReturn: number;     // 年化收益率
  cagr: number;                 // 复合年化增长率
  
  // 风险指标
  maxDrawdown: number;          // 最大回撤
  maxDrawdownDuration: number;  // 最大回撤持续时间（天）
  volatility: number;           // 波动率
  sharpeRatio: number;          // 夏普比率
  sortinoRatio: number;         // 索提诺比率
  calmarRatio: number;          // 卡玛比率
  
  // 交易统计
  totalTrades: number;          // 总交易次数
  winningTrades: number;        // 盈利交易数
  losingTrades: number;         // 亏损交易数
  winRate: number;              // 胜率
  avgWin: number;               // 平均盈利
  avgLoss: number;              // 平均亏损
  profitFactor: number;         // 盈亏比
  
  // 持仓统计
  maxPositions: number;         // 最大持仓数
  avgHoldingPeriod: number;     // 平均持仓时间（天）
  
  // 详细数据
  trades: Trade[];
  equity: Array<{ timestamp: number; value: number }>;
  drawdown: Array<{ timestamp: number; value: number }>;
  positions: Position[];

  // 高级分析指标 (新增)
  attribution?: {
    factorExposure: Record<string, number>;
    sectorAllocation: Record<string, number>;
    styleAnalysis: Record<string, number>;
    alphaDecomposition: {
      selection: number;
      timing: number;
      interaction: number;
    };
  };
  
  // 风险分解
  riskDecomposition?: {
    systematicRisk: number;
    specificRisk: number;
    factorRisk: Record<string, number>;
    trackingError: number;
    informationRatio: number;
  };
  
  // 市场环境分析
  environmentAnalysis?: {
    bullMarketReturn: number;
    bearMarketReturn: number;
    sidewaysMarketReturn: number;
    volatilityRegime: 'low' | 'medium' | 'high';
    marketCorrelation: number;
  };
  
  // 流动性分析
  liquidityMetrics?: {
    avgDailyVolume: number;
    liquidityRatio: number;
    impactCost: number;
    turnoverRate: number;
  };
}

export interface StrategySignalGenerator {
  (data: OHLCV[], params: Record<string, any>): Signal[];
}

// ============================================================================
// Strategy Execution Service
// ============================================================================

export class StrategyExecutionService {
  private config: StrategyConfig;
  private cash: number;
  private positions: Map<string, Position> = new Map();
  private orders: Order[] = [];
  private trades: Trade[] = [];
  private equity: Array<{ timestamp: number; value: number }> = [];
  private orderIdCounter = 0;
  private tradeIdCounter = 0;

  constructor(config: StrategyConfig) {
    this.config = config;
    this.cash = config.initialCapital;
  }

  /**
   * 初始化策略执行服务（后端可扩展，当前前端保持幂等）
   */
  async initialize(_: { enableRealData?: boolean } = {}): Promise<void> {
    // 前端本地实现无需额外初始化，但保持异步接口与后端一致
    return Promise.resolve();
  }

  /**
   * 运行回测
   */
  async runBacktest(
    symbol: string,
    data: OHLCV[],
    signalGenerator: StrategySignalGenerator
  ): Promise<BacktestResult> {
    // 重置状态
    this.reset();

    // 生成信号
    const signals = signalGenerator(data, this.config.parameters);

    // 按时间顺序执行信号
    signals.sort((a, b) => a.timestamp - b.timestamp);

    for (const signal of signals) {
      const candle = data.find(d => d.timestamp === signal.timestamp);
      if (!candle) continue;

      // 更新持仓价格
      this.updatePositions(candle);

      // 执行信号
      if (signal.type === 'BUY') {
        await this.executeBuy(signal, candle);
      } else if (signal.type === 'SELL') {
        await this.executeSell(signal, candle);
      }

      // 记录权益曲线
      this.recordEquity(candle.timestamp);

      // 检查止损止盈
      this.checkStopLossTakeProfit(candle);
    }

    // 平仓所有持仓
    const lastCandle = data[data.length - 1];
    this.closeAllPositions(lastCandle);

    // 计算绩效指标
    return this.calculatePerformance(data[0].timestamp, lastCandle.timestamp);
  }

  /**
   * 执行买入
   */
  private async executeBuy(signal: Signal, candle: OHLCV): Promise<void> {
    const { symbol, price } = signal;

    // 计算可买入数量
    const availableCash = this.cash * this.config.riskPerTrade;
    const quantity = signal.quantity || Math.floor(availableCash / price);

    if (quantity <= 0 || this.cash < quantity * price) {
      return; // 资金不足
    }

    // 检查最大持仓限制
    if (this.positions.size >= this.config.maxPositions) {
      return;
    }

    // 创建订单
    const order = this.createOrder({
      symbol,
      type: 'MARKET',
      side: 'BUY',
      quantity,
      price: candle.close,
    });

    // 模拟成交
    this.fillOrder(order, candle);
  }

  /**
   * 执行卖出
   */
  private async executeSell(signal: Signal, candle: OHLCV): Promise<void> {
    const position = this.positions.get(signal.symbol);
    if (!position) return; // 没有持仓

    // 创建订单
    const order = this.createOrder({
      symbol: signal.symbol,
      type: 'MARKET',
      side: 'SELL',
      quantity: signal.quantity || position.quantity,
      price: candle.close,
    });

    // 模拟成交
    this.fillOrder(order, candle);
  }

  /**
   * 创建订单
   */
  private createOrder(params: {
    symbol: string;
    type: OrderType;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
  }): Order {
    return {
      id: `ORDER-${++this.orderIdCounter}`,
      timestamp: Date.now(),
      ...params,
      filledQuantity: 0,
      avgFilledPrice: 0,
      status: 'PENDING',
      commission: 0,
      slippage: 0,
    };
  }

  /**
   * 模拟订单成交
   */
  private fillOrder(order: Order, candle: OHLCV): void {
    // 计算滑点
    const slippageAmount = order.price * this.config.slippage;
    const executionPrice = order.side === 'BUY'
      ? order.price + slippageAmount
      : order.price - slippageAmount;

    // 计算手续费
    const commission = order.quantity * executionPrice * this.config.commission;

    // 更新订单状态
    order.filledQuantity = order.quantity;
    order.avgFilledPrice = executionPrice;
    order.status = 'FILLED';
    order.commission = commission;
    order.slippage = slippageAmount;

    this.orders.push(order);

    // 创建交易记录
    const trade: Trade = {
      id: `TRADE-${++this.tradeIdCounter}`,
      timestamp: candle.timestamp,
      symbol: order.symbol,
      side: order.side,
      quantity: order.filledQuantity,
      price: executionPrice,
      value: order.filledQuantity * executionPrice,
      commission,
    };

    // 更新持仓和现金
    if (order.side === 'BUY') {
      this.openPosition(order.symbol, order.filledQuantity, executionPrice, candle.timestamp);
      this.cash -= (trade.value + commission);
    } else {
      const pnl = this.closePosition(order.symbol, order.filledQuantity, executionPrice);
      trade.pnl = pnl;
      this.cash += (trade.value - commission);
    }

    this.trades.push(trade);
  }

  /**
   * 开仓
   */
  private openPosition(symbol: string, quantity: number, price: number, timestamp: number): void {
    const existing = this.positions.get(symbol);

    if (existing) {
      // 加仓
      const totalQuantity = existing.quantity + quantity;
      const avgPrice = (existing.avgPrice * existing.quantity + price * quantity) / totalQuantity;
      
      existing.quantity = totalQuantity;
      existing.avgPrice = avgPrice;
      existing.lastUpdateTimestamp = timestamp;
    } else {
      // 新开仓
      this.positions.set(symbol, {
        symbol,
        side: 'LONG',
        quantity,
        avgPrice: price,
        currentPrice: price,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        value: quantity * price,
        openTimestamp: timestamp,
        lastUpdateTimestamp: timestamp,
      });
    }
  }

  /**
   * 平仓
   */
  private closePosition(symbol: string, quantity: number, price: number): number {
    const position = this.positions.get(symbol);
    if (!position) return 0;

    // 计算已实现盈亏
    const pnl = (price - position.avgPrice) * quantity;

    if (quantity >= position.quantity) {
      // 全部平仓
      this.positions.delete(symbol);
    } else {
      // 部分平仓
      position.quantity -= quantity;
      position.value = position.quantity * position.currentPrice;
    }

    return pnl;
  }

  /**
   * 更新持仓价格
   */
  private updatePositions(candle: OHLCV): void {
    this.positions.forEach(position => {
      if (position.symbol === candle.close.toString()) {
        position.currentPrice = candle.close;
        position.unrealizedPnL = (candle.close - position.avgPrice) * position.quantity;
        position.unrealizedPnLPercent = (position.unrealizedPnL / (position.avgPrice * position.quantity)) * 100;
        position.value = position.quantity * candle.close;
        position.lastUpdateTimestamp = candle.timestamp;
      }
    });
  }

  /**
   * 检查止损止盈
   */
  private checkStopLossTakeProfit(candle: OHLCV): void {
    this.positions.forEach(position => {
      const pnlPercent = position.unrealizedPnLPercent;

      // 止损
      if (this.config.stopLoss && pnlPercent <= -this.config.stopLoss) {
        const order = this.createOrder({
          symbol: position.symbol,
          type: 'MARKET',
          side: 'SELL',
          quantity: position.quantity,
          price: candle.close,
        });
        this.fillOrder(order, candle);
      }

      // 止盈
      if (this.config.takeProfit && pnlPercent >= this.config.takeProfit) {
        const order = this.createOrder({
          symbol: position.symbol,
          type: 'MARKET',
          side: 'SELL',
          quantity: position.quantity,
          price: candle.close,
        });
        this.fillOrder(order, candle);
      }
    });
  }

  /**
   * 平仓所有持仓
   */
  private closeAllPositions(candle: OHLCV): void {
    const positions = Array.from(this.positions.values());
    
    positions.forEach(position => {
      const order = this.createOrder({
        symbol: position.symbol,
        type: 'MARKET',
        side: 'SELL',
        quantity: position.quantity,
        price: candle.close,
      });
      this.fillOrder(order, candle);
    });
  }

  /**
   * 记录权益曲线
   */
  private recordEquity(timestamp: number): void {
    const positionsValue = Array.from(this.positions.values())
      .reduce((sum, pos) => sum + pos.value, 0);
    
    const totalValue = this.cash + positionsValue;

    this.equity.push({ timestamp, value: totalValue });
  }

  /**
   * 计算绩效指标
   */
  private calculatePerformance(startDate: number, endDate: number): BacktestResult {
    const finalCapital = this.equity[this.equity.length - 1]?.value || this.config.initialCapital;
    const days = (endDate - startDate) / (24 * 60 * 60 * 1000);
    const years = days / 365;

    // 收益指标
    const totalReturn = ((finalCapital - this.config.initialCapital) / this.config.initialCapital) * 100;
    const annualizedReturn = years > 0 ? (Math.pow(finalCapital / this.config.initialCapital, 1 / years) - 1) * 100 : 0;
    const cagr = annualizedReturn;

    // 计算回撤
    const { maxDrawdown, maxDrawdownDuration } = this.calculateDrawdown();

    // 计算波动率
    const returns = this.calculateDailyReturns();
    const volatility = this.calculateVolatility(returns) * Math.sqrt(252); // 年化波动率

    // 夏普比率
    const riskFreeRate = 0.03; // 假设无风险利率3%
    const sharpeRatio = volatility > 0 ? (annualizedReturn / 100 - riskFreeRate) / volatility : 0;

    // 索提诺比率
    const downsideReturns = returns.filter(r => r < 0);
    const downsideVolatility = this.calculateVolatility(downsideReturns) * Math.sqrt(252);
    const sortinoRatio = downsideVolatility > 0 ? (annualizedReturn / 100 - riskFreeRate) / downsideVolatility : 0;

    // 卡玛比率
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

    // 交易统计
    const winningTrades = this.trades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = this.trades.filter(t => (t.pnl || 0) < 0);
    const winRate = this.trades.length > 0 ? (winningTrades.length / this.trades.length) * 100 : 0;
    
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length
      : 0;
    
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length)
      : 0;
    
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    // 持仓统计
    const holdingPeriods = this.calculateHoldingPeriods();
    const avgHoldingPeriod = holdingPeriods.length > 0
      ? holdingPeriods.reduce((sum, p) => sum + p, 0) / holdingPeriods.length
      : 0;

    return {
      strategyName: this.config.name,
      startDate,
      endDate,
      initialCapital: this.config.initialCapital,
      finalCapital,
      totalReturn,
      annualizedReturn,
      cagr,
      maxDrawdown,
      maxDrawdownDuration,
      volatility,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      maxPositions: this.config.maxPositions,
      avgHoldingPeriod,
      trades: this.trades,
      equity: this.equity,
      drawdown: this.calculateDrawdownSeries(),
      positions: Array.from(this.positions.values()),
    };
  }

  /**
   * 计算回撤
   */
  private calculateDrawdown(): { maxDrawdown: number; maxDrawdownDuration: number } {
    let maxDrawdown = 0;
    let maxDrawdownDuration = 0;
    let peak = this.equity[0]?.value || this.config.initialCapital;
    let drawdownStart = 0;

    this.equity.forEach((point, index) => {
      if (point.value > peak) {
        peak = point.value;
        drawdownStart = index;
      } else {
        const drawdown = ((peak - point.value) / peak) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
          maxDrawdownDuration = index - drawdownStart;
        }
      }
    });

    // 转换为天数
    if (this.equity.length > 1) {
      const timePerPoint = (this.equity[this.equity.length - 1].timestamp - this.equity[0].timestamp) / this.equity.length;
      maxDrawdownDuration = Math.floor((maxDrawdownDuration * timePerPoint) / (24 * 60 * 60 * 1000));
    }

    return { maxDrawdown, maxDrawdownDuration };
  }

  /**
   * 计算回撤序列
   */
  private calculateDrawdownSeries(): Array<{ timestamp: number; value: number }> {
    const drawdown: Array<{ timestamp: number; value: number }> = [];
    let peak = this.equity[0]?.value || this.config.initialCapital;

    this.equity.forEach(point => {
      if (point.value > peak) {
        peak = point.value;
      }
      const dd = ((peak - point.value) / peak) * 100;
      drawdown.push({ timestamp: point.timestamp, value: -dd });
    });

    return drawdown;
  }

  /**
   * 计算每日收益率
   */
  private calculateDailyReturns(): number[] {
    const returns: number[] = [];

    for (let i = 1; i < this.equity.length; i++) {
      const ret = (this.equity[i].value - this.equity[i - 1].value) / this.equity[i - 1].value;
      returns.push(ret);
    }

    return returns;
  }

  /**
   * 计算波动率
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * 计算持仓周期
   */
  private calculateHoldingPeriods(): number[] {
    const periods: number[] = [];
    const buyTrades = new Map<string, number>();

    this.trades.forEach(trade => {
      if (trade.side === 'BUY') {
        buyTrades.set(trade.symbol, trade.timestamp);
      } else if (trade.side === 'SELL') {
        const buyTime = buyTrades.get(trade.symbol);
        if (buyTime) {
          const period = (trade.timestamp - buyTime) / (24 * 60 * 60 * 1000);
          periods.push(period);
        }
      }
    });

    return periods;
  }

  /**
   * 重置状态
   */
  private reset(): void {
    this.cash = this.config.initialCapital;
    this.positions.clear();
    this.orders = [];
    this.trades = [];
    this.equity = [];
    this.orderIdCounter = 0;
    this.tradeIdCounter = 0;
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      cash: this.cash,
      positions: Array.from(this.positions.values()),
      equity: this.getTotalEquity(),
    };
  }

  /**
   * 获取总权益
   */
  private getTotalEquity(): number {
    const positionsValue = Array.from(this.positions.values())
      .reduce((sum, pos) => sum + pos.value, 0);
    return this.cash + positionsValue;
  }
  
  /**
   * 获取回测结果列表
   */
  async getBacktestResults(options?: { limit?: number }): Promise<BacktestResult[]> {
    // 模拟返回最近的回测结果
    const mockResults: BacktestResult[] = [
      {
        strategyId: 'high-vol-alpha',
        strategyName: 'High Vol Alpha Combo',
        startDate: '2024-01-01',
        endDate: '2024-12-09',
        initialCapital: 10000000,
        finalCapital: 14234567,
        totalReturn: 0.423,
        annualizedReturn: 0.52,
        sharpeRatio: 2.15,
        maxDrawdown: 0.12,
        winRate: 0.65,
        totalTrades: 156,
        profits: [],
        positions: [],
        metrics: {
          volatility: 0.18,
          beta: 1.15,
          alpha: 0.32,
          sortino: 2.45
        }
      },
      {
        strategyId: 'multi-factor',
        strategyName: 'Multi-Factor Balanced',
        startDate: '2024-01-01',
        endDate: '2024-12-09',
        initialCapital: 10000000,
        finalCapital: 12850000,
        totalReturn: 0.285,
        annualizedReturn: 0.35,
        sharpeRatio: 1.85,
        maxDrawdown: 0.08,
        winRate: 0.72,
        totalTrades: 98,
        profits: [],
        positions: [],
        metrics: {
          volatility: 0.15,
          beta: 0.95,
          alpha: 0.25,
          sortino: 2.15
        }
      }
    ];
    
    const limit = options?.limit || 10;
    return mockResults.slice(0, limit);
  }
  
  /**
   * 获取正在运行的策略
   */
  async getRunningStrategies(): Promise<any[]> {
    // 模拟返回运行中的策略
    return [];
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
// Preset Strategy Signal Generators
// ============================================================================

/**
 * MA双均线策略
 */
export function maStrategy(fastPeriod: number = 5, slowPeriod: number = 20): StrategySignalGenerator {
  return (data: OHLCV[], params: Record<string, any>) => {
    const signals: Signal[] = [];
    const fast = params.fastPeriod || fastPeriod;
    const slow = params.slowPeriod || slowPeriod;

    for (let i = slow; i < data.length; i++) {
      const fastMA = data.slice(i - fast, i).reduce((sum, d) => sum + d.close, 0) / fast;
      const slowMA = data.slice(i - slow, i).reduce((sum, d) => sum + d.close, 0) / slow;
      const prevFastMA = data.slice(i - fast - 1, i - 1).reduce((sum, d) => sum + d.close, 0) / fast;
      const prevSlowMA = data.slice(i - slow - 1, i - 1).reduce((sum, d) => sum + d.close, 0) / slow;

      // 金叉买入
      if (prevFastMA <= prevSlowMA && fastMA > slowMA) {
        signals.push({
          timestamp: data[i].timestamp,
          symbol: 'STOCK',
          type: 'BUY',
          price: data[i].close,
          reason: `MA金叉 (${fast}/${slow})`,
        });
      }

      // 死叉卖出
      if (prevFastMA >= prevSlowMA && fastMA < slowMA) {
        signals.push({
          timestamp: data[i].timestamp,
          symbol: 'STOCK',
          type: 'SELL',
          price: data[i].close,
          reason: `MA死叉 (${fast}/${slow})`,
        });
      }
    }

    return signals;
  };
}

/**
 * AI驱动的量化策略 - DeepSeek信号生成器
 * 结合技术分析和AI市场分析
 */
export function aiDeepSeekStrategy(
  config: {
    rsiPeriod?: number;
    maShortPeriod?: number;
    maLongPeriod?: number;
    useAI?: boolean;
    minConfidence?: number;
  } = {}
): StrategySignalGenerator {
  const {
    rsiPeriod = 14,
    maShortPeriod = 5,
    maLongPeriod = 20,
    useAI = true,
    minConfidence = 0.6
  } = config;

  return (data: OHLCV[], params: Record<string, any>) => {
    const signals: Signal[] = [];
    
    // 如果数据不足，返回空信号
    if (data.length < Math.max(rsiPeriod, maLongPeriod)) {
      return signals;
    }

    for (let i = Math.max(rsiPeriod, maLongPeriod); i < data.length; i++) {
      const current = data[i];
      const prev = data[i - 1];
      
      // 1. 技术指标计算
      const rsi = calculateRSI(data.slice(i - rsiPeriod, i + 1));
      const maShort = calculateSMA(data.slice(i - maShortPeriod, i + 1));
      const maLong = calculateSMA(data.slice(i - maLongPeriod, i + 1));
      const prevMAShort = calculateSMA(data.slice(i - maShortPeriod - 1, i));
      const prevMALong = calculateSMA(data.slice(i - maLongPeriod - 1, i));
      
      // 2. 技术信号判断
      const isBullishMA = prevMAShort <= prevMALong && maShort > maLong; // 金叉
      const isBearishMA = prevMAShort >= prevMALong && maShort < maLong; // 死叉
      const isOversold = rsi < 30;
      const isOverbought = rsi > 70;
      const isPriceAboveMA = current.close > maLong;
      const isPriceBelowMA = current.close < maLong;
      
      // 3. 基础技术信号
      let technicalSignal: SignalType = 'HOLD';
      let technicalConfidence = 0.5;
      let technicalReason = '';
      
      // 买入信号组合
      if ((isBullishMA && isOversold) || (isBullishMA && isPriceAboveMA)) {
        technicalSignal = 'BUY';
        technicalConfidence = isBullishMA && isOversold ? 0.8 : 0.6;
        technicalReason = `技术买入: MA金叉${isOversold ? ' + RSI超卖' : ''}`;
      }
      // 卖出信号组合  
      else if ((isBearishMA && isOverbought) || (isBearishMA && isPriceBelowMA)) {
        technicalSignal = 'SELL';
        technicalConfidence = isBearishMA && isOverbought ? 0.8 : 0.6;
        technicalReason = `技术卖出: MA死叉${isOverbought ? ' + RSI超买' : ''}`;
      }
      
      // 4. 如果启用AI增强，调整信号（这里先模拟，实际应调用DeepSeek服务）
      let finalSignal = technicalSignal;
      let finalConfidence = technicalConfidence;
      let finalReason = technicalReason;
      
      if (useAI && technicalSignal !== 'HOLD') {
        // 模拟AI信号调整（实际应用中会调用DeepSeek服务）
        const aiSignalStrength = simulateAISignal(data.slice(Math.max(0, i - 10), i + 1));
        
        // AI信号与技术信号的融合
        if (technicalSignal === 'BUY' && aiSignalStrength > 0.3) {
          finalConfidence = Math.min(0.95, technicalConfidence + aiSignalStrength * 0.3);
          finalReason += ` | AI增强: +${Math.round(aiSignalStrength * 100)}%`;
        } else if (technicalSignal === 'SELL' && aiSignalStrength < -0.3) {
          finalConfidence = Math.min(0.95, technicalConfidence + Math.abs(aiSignalStrength) * 0.3);
          finalReason += ` | AI增强: ${Math.round(aiSignalStrength * 100)}%`;
        } else if (Math.abs(aiSignalStrength) > 0.5) {
          // AI信号很强，可能覆盖技术信号
          finalSignal = aiSignalStrength > 0 ? 'BUY' : 'SELL';
          finalConfidence = Math.abs(aiSignalStrength);
          finalReason = `AI主导信号: ${aiSignalStrength > 0 ? '看涨' : '看跌'} (${Math.round(Math.abs(aiSignalStrength) * 100)}%)`;
        }
      }
      
      // 5. 输出满足最小置信度的信号
      if (finalSignal !== 'HOLD' && finalConfidence >= minConfidence) {
        signals.push({
          timestamp: current.timestamp,
          symbol: 'STOCK',
          type: finalSignal,
          price: current.close,
          confidence: finalConfidence,
          reason: finalReason,
        });
      }
    }

    return signals;
  };
}

/**
 * Tushare数据驱动的基本面策略
 * 结合技术分析和基本面数据
 */
export function tushareBasicStrategy(
  config: {
    peThreshold?: number;
    pbThreshold?: number;
    roeThreshold?: number;
    useVolume?: boolean;
  } = {}
): StrategySignalGenerator {
  const {
    peThreshold = 25,
    pbThreshold = 3,
    roeThreshold = 10,
    useVolume = true
  } = config;

  return (data: OHLCV[], params: Record<string, any>) => {
    const signals: Signal[] = [];
    
    if (data.length < 20) return signals;

    // 模拟基本面数据（实际应用中从Tushare获取）
    const fundamentals = simulateFundamentalData();
    
    for (let i = 10; i < data.length; i++) {
      const current = data[i];
      const ma20 = calculateSMA(data.slice(i - 20, i + 1));
      const volumeRatio = current.volume / (data.slice(i - 5, i).reduce((sum, d) => sum + d.volume, 0) / 5);
      
      // 基本面筛选
      const isValueStock = fundamentals.pe < peThreshold && fundamentals.pb < pbThreshold;
      const isQualityStock = fundamentals.roe > roeThreshold;
      const hasVolumeSupport = useVolume ? volumeRatio > 1.5 : true;
      
      // 技术位置确认
      const isPriceAboveMA = current.close > ma20;
      const isPriceBelowMA = current.close < ma20;
      
      // 买入信号：低估值 + 质量好 + 技术向上
      if (isValueStock && isQualityStock && isPriceAboveMA && hasVolumeSupport) {
        signals.push({
          timestamp: current.timestamp,
          symbol: 'STOCK',
          type: 'BUY',
          price: current.close,
          confidence: 0.75,
          reason: `基本面买入: PE=${fundamentals.pe}, PB=${fundamentals.pb}, ROE=${fundamentals.roe}%`,
        });
      }
      
      // 卖出信号：高估值 + 技术向下
      else if ((!isValueStock || !isQualityStock) && isPriceBelowMA) {
        signals.push({
          timestamp: current.timestamp,
          symbol: 'STOCK',
          type: 'SELL',
          price: current.close,
          confidence: 0.65,
          reason: `基本面卖出: 估值偏高或质量下降`,
        });
      }
    }

    return signals;
  };
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 计算RSI指标
 */
function calculateRSI(data: OHLCV[], period: number = 14): number {
  if (data.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  
  return 100 - (100 / (1 + rs));
}

/**
 * 计算简单移动平均线
 */
function calculateSMA(data: OHLCV[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, d) => sum + d.close, 0) / data.length;
}

/**
 * 模拟AI信号强度（实际应用中会调用DeepSeek API）
 */
function simulateAISignal(recentData: OHLCV[]): number {
  // 这里是简化的模拟逻辑，实际应用中会：
  // 1. 构建市场数据输入
  // 2. 调用DeepSeek API进行分析
  // 3. 解析AI的市场判断
  
  const priceChange = (recentData[recentData.length - 1].close - recentData[0].close) / recentData[0].close;
  const volatility = calculateVolatility(recentData);
  const trend = calculateTrend(recentData);
  
  // 简化的AI信号逻辑
  let aiSignal = 0;
  
  // 趋势因子
  aiSignal += trend * 0.4;
  
  // 动量因子
  if (priceChange > 0.02) aiSignal += 0.3;
  if (priceChange < -0.02) aiSignal -= 0.3;
  
  // 波动性调整
  if (volatility > 0.3) aiSignal *= 0.7; // 高波动性降低信心
  
  // 添加一些随机性模拟市场情绪
  aiSignal += (Math.random() - 0.5) * 0.2;
  
  return Math.max(-1, Math.min(1, aiSignal));
}

/**
 * 计算波动性
 */
function calculateVolatility(data: OHLCV[]): number {
  if (data.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < data.length; i++) {
    returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
  }
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

/**
 * 计算趋势强度
 */
function calculateTrend(data: OHLCV[]): number {
  if (data.length < 3) return 0;
  
  const start = data[0].close;
  const end = data[data.length - 1].close;
  const mid = data[Math.floor(data.length / 2)].close;
  
  // 简单趋势计算
  const overallTrend = (end - start) / start;
  const consistency = Math.abs(mid - (start + end) / 2) / start;
  
  // 趋势越一致，信号越强
  return overallTrend * (1 - consistency);
}

/**
 * 模拟基本面数据
 */
function simulateFundamentalData() {
  return {
    pe: 15 + Math.random() * 20,    // PE在15-35之间
    pb: 1 + Math.random() * 4,      // PB在1-5之间
    roe: 5 + Math.random() * 20,    // ROE在5%-25%之间
    revenue_growth: -10 + Math.random() * 40, // 营收增长-10%到30%
  };
}

// ============================================================================
// 策略模板管理
// ============================================================================

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  isPublic: boolean;
  rating: number;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
  
  // 策略配置
  config: StrategyConfig;
  
  // 回测结果（可选）
  backtestResults?: BacktestResult;
  
  // 策略代码/逻辑
  signalGenerator?: StrategySignalGenerator;
}

export interface StrategyCollection {
  id: string;
  name: string;
  description: string;
  strategies: string[]; // Strategy IDs
  author: string;
  isPublic: boolean;
  createdAt: Date;
}

/**
 * 策略模板管理器
 */
export class StrategyTemplateManager {
  private templates: Map<string, StrategyTemplate> = new Map();
  private collections: Map<string, StrategyCollection> = new Map();

  /**
   * 保存策略模板
   */
  async saveTemplate(template: Omit<StrategyTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateId();
    const strategyTemplate: StrategyTemplate = {
      ...template,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      rating: 0,
      downloads: 0
    };

    this.templates.set(id, strategyTemplate);
    
    // 保存到本地存储
    try {
      const saved = JSON.parse(localStorage.getItem('strategy_templates') || '{}');
      saved[id] = {
        ...strategyTemplate,
        signalGenerator: undefined // 函数无法序列化，实际使用中需要其他方案
      };
      localStorage.setItem('strategy_templates', JSON.stringify(saved));
    } catch (error) {
      console.warn('Failed to save template to localStorage:', error);
    }

    return id;
  }

  /**
   * 获取策略模板
   */
  getTemplate(id: string): StrategyTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * 搜索策略模板
   */
  searchTemplates(query: {
    keyword?: string;
    category?: string;
    tags?: string[];
    author?: string;
    minRating?: number;
  }): StrategyTemplate[] {
    const results: StrategyTemplate[] = [];
    
    for (const template of this.templates.values()) {
      let matches = true;
      
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        if (!template.name.toLowerCase().includes(keyword) &&
            !template.description.toLowerCase().includes(keyword)) {
          matches = false;
        }
      }
      
      if (query.category && template.category !== query.category) {
        matches = false;
      }
      
      if (query.tags && !query.tags.some(tag => template.tags.includes(tag))) {
        matches = false;
      }
      
      if (query.author && template.author !== query.author) {
        matches = false;
      }
      
      if (query.minRating && template.rating < query.minRating) {
        matches = false;
      }
      
      if (matches) {
        results.push(template);
      }
    }
    
    return results;
  }

  /**
   * 导入策略模板
   */
  async importTemplate(templateData: StrategyTemplate): Promise<string> {
    const id = this.generateId();
    const importedTemplate: StrategyTemplate = {
      ...templateData,
      id,
      name: `${templateData.name} (导入)`,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(id, importedTemplate);
    return id;
  }

  /**
   * 创建策略集合
   */
  createCollection(collection: Omit<StrategyCollection, 'id' | 'createdAt'>): string {
    const id = this.generateId();
    const strategyCollection: StrategyCollection = {
      ...collection,
      id,
      createdAt: new Date()
    };

    this.collections.set(id, strategyCollection);
    return id;
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): StrategyTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 获取模板分类
   */
  getCategories(): Array<{name: string, count: number}> {
    const categories: Map<string, number> = new Map();
    
    for (const template of this.templates.values()) {
      const count = categories.get(template.category) || 0;
      categories.set(template.category, count + 1);
    }
    
    return Array.from(categories.entries()).map(([name, count]) => ({ name, count }));
  }

  /**
   * 加载本地保存的模板
   */
  loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('strategy_templates');
      if (saved) {
        const templates = JSON.parse(saved);
        for (const [id, template] of Object.entries(templates)) {
          this.templates.set(id, template as StrategyTemplate);
        }
      }
    } catch (error) {
      console.warn('Failed to load templates from localStorage:', error);
    }
  }

  private generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 全局策略模板管理器实例
export const strategyTemplateManager = new StrategyTemplateManager();

// ============================================================================
// 高级策略生成器 (新增)
// ============================================================================

/**
 * 多因子模型策略生成器
 */
export function createMultiFactorStrategy(config: {
  factors: Array<{
    name: string;
    weight: number;
    lookback: number;
    function: (data: OHLCV[], index: number) => number;
  }>;
  rebalanceFrequency: number; // 重新平衡频率（天）
  neutralization: boolean; // 是否市场中性
  decayRate: number; // 因子衰减率
}): StrategySignalGenerator {
  const { factors, rebalanceFrequency, neutralization, decayRate } = config;

  return (data: OHLCV[], params: Record<string, any>) => {
    const signals: Signal[] = [];
    
    if (data.length < 252) return signals; // 需要至少一年数据

    for (let i = 252; i < data.length; i += rebalanceFrequency) {
      const currentTime = data[i].timestamp;
      
      // 计算各因子暴露度
      const factorScores = factors.map(factor => {
        const lookbackData = data.slice(i - factor.lookback, i + 1);
        const rawScore = factor.function(lookbackData, factor.lookback);
        
        // 应用因子衰减
        const timeDecay = Math.exp(-decayRate * (currentTime - lookbackData[0].timestamp) / (1000 * 60 * 60 * 24));
        return {
          name: factor.name,
          score: rawScore * factor.weight * timeDecay,
          weight: factor.weight
        };
      });

      // 综合因子得分
      const compositeScore = factorScores.reduce((sum, factor) => sum + factor.score, 0);
      const normalizedScore = compositeScore / factorScores.length;
      
      // 生成信号
      let signal: SignalType = 'HOLD';
      let confidence = Math.abs(normalizedScore);
      
      if (normalizedScore > 0.6) {
        signal = 'BUY';
      } else if (normalizedScore < -0.6) {
        signal = 'SELL';
      }

      if (signal !== 'HOLD') {
        signals.push({
          timestamp: currentTime,
          symbol: params.symbol || 'PORTFOLIO',
          type: signal,
          price: data[i].close,
          confidence,
          reason: `多因子信号 (得分: ${normalizedScore.toFixed(3)})`
        });
      }
    }

    return signals;
  };
}

/**
 * 机器学习策略生成器
 */
export function createMLStrategy(config: {
  modelType: 'xgboost' | 'lightgbm' | 'neural_network' | 'random_forest';
  features: string[];
  trainingPeriod: number; // 训练周期（天）
  retrainFrequency: number; // 重新训练频率（天）
  predictionHorizon: number; // 预测视野（天）
  confidenceThreshold: number;
}): StrategySignalGenerator {
  const { modelType, features, trainingPeriod, retrainFrequency, predictionHorizon, confidenceThreshold } = config;
  
  return (data: OHLCV[], params: Record<string, any>) => {
    const signals: Signal[] = [];
    
    if (data.length < trainingPeriod + predictionHorizon) return signals;

    for (let i = trainingPeriod; i < data.length; i += retrainFrequency) {
      const trainingData = data.slice(i - trainingPeriod, i);
      const currentData = data[i];
      
      // 特征提取
      const featureVector = extractFeatures(trainingData, features);
      
      // 模拟机器学习预测（在实际应用中这里会调用真实的ML模型）
      const prediction = simulateMLPrediction(modelType, featureVector, predictionHorizon);
      
      if (prediction.confidence > confidenceThreshold) {
        const signal: Signal = {
          timestamp: currentData.timestamp,
          symbol: params.symbol || 'ML_PORTFOLIO',
          type: prediction.direction > 0 ? 'BUY' : 'SELL',
          price: currentData.close,
          confidence: prediction.confidence,
          reason: `ML预测 (${modelType}): ${prediction.direction > 0 ? '上涨' : '下跌'} ${predictionHorizon}天, 置信度: ${(prediction.confidence * 100).toFixed(1)}%`
        };
        signals.push(signal);
      }
    }

    return signals;
  };
}

/**
 * 风险平价策略生成器
 */
export function createRiskParityStrategy(config: {
  universe: string[]; // 股票池
  lookbackPeriod: number; // 协方差矩阵计算周期
  rebalanceFrequency: number; // 重新平衡频率
  riskBudget: Record<string, number>; // 风险预算分配
  minWeight: number; // 最小权重
  maxWeight: number; // 最大权重
}): StrategySignalGenerator {
  const { universe, lookbackPeriod, rebalanceFrequency, riskBudget, minWeight, maxWeight } = config;

  return (data: OHLCV[], params: Record<string, any>) => {
    const signals: Signal[] = [];
    
    if (data.length < lookbackPeriod) return signals;

    for (let i = lookbackPeriod; i < data.length; i += rebalanceFrequency) {
      const historicalData = data.slice(i - lookbackPeriod, i + 1);
      const currentData = data[i];
      
      // 计算历史收益率协方差矩阵
      const returns = calculateReturns(historicalData);
      const covarianceMatrix = calculateCovarianceMatrix(returns);
      
      // 风险平价权重优化
      const optimalWeights = optimizeRiskParity(covarianceMatrix, riskBudget, minWeight, maxWeight);
      
      // 为每个资产生成重新平衡信号
      universe.forEach((symbol, index) => {
        const targetWeight = optimalWeights[index];
        
        if (targetWeight > minWeight) {
          signals.push({
            timestamp: currentData.timestamp,
            symbol,
            type: 'BUY',
            price: currentData.close,
            quantity: targetWeight, // 这里用权重代替数量，后续会转换
            confidence: 0.8,
            reason: `风险平价重平衡: 目标权重 ${(targetWeight * 100).toFixed(2)}%`
          });
        }
      });
    }

    return signals;
  };
}

/**
 * 动态对冲策略生成器
 */
export function createDynamicHedgingStrategy(config: {
  hedgeRatio: number; // 对冲比例
  rebalanceThreshold: number; // 重新平衡阈值
  hedgeInstrument: string; // 对冲工具（如指数期货）
  enableBetaAdjustment: boolean; // 是否启用Beta调整
  maxHedgeRatio: number; // 最大对冲比例
}): StrategySignalGenerator {
  const { hedgeRatio, rebalanceThreshold, hedgeInstrument, enableBetaAdjustment, maxHedgeRatio } = config;

  return (data: OHLCV[], params: Record<string, any>) => {
    const signals: Signal[] = [];
    
    if (data.length < 60) return signals; // 需要至少60天数据计算Beta

    for (let i = 60; i < data.length; i++) {
      const currentData = data[i];
      const historicalData = data.slice(i - 60, i + 1);
      
      // 计算投资组合Beta（如果启用Beta调整）
      let adjustedHedgeRatio = hedgeRatio;
      if (enableBetaAdjustment) {
        const beta = calculatePortfolioBeta(historicalData, params.benchmarkData || historicalData);
        adjustedHedgeRatio = Math.min(hedgeRatio * beta, maxHedgeRatio);
      }
      
      // 计算当前对冲头寸偏离度
      const currentHedgePosition = params.currentHedgePosition || 0;
      const targetHedgePosition = -adjustedHedgeRatio * (params.portfolioValue || 1000000);
      const deviation = Math.abs(currentHedgePosition - targetHedgePosition) / Math.abs(targetHedgePosition);
      
      // 如果偏离超过阈值，生成重新平衡信号
      if (deviation > rebalanceThreshold) {
        const requiredAdjustment = targetHedgePosition - currentHedgePosition;
        
        signals.push({
          timestamp: currentData.timestamp,
          symbol: hedgeInstrument,
          type: requiredAdjustment > 0 ? 'BUY' : 'SELL',
          price: currentData.close,
          quantity: Math.abs(requiredAdjustment),
          confidence: 0.9,
          reason: `动态对冲调整: 目标头寸 ${targetHedgePosition.toFixed(0)}, 当前 ${currentHedgePosition.toFixed(0)}, 调整 ${requiredAdjustment.toFixed(0)}`
        });
      }
    }

    return signals;
  };
}

/**
 * 配对交易策略生成器
 */
export function createPairsTradingStrategy(config: {
  pairs: Array<{ stock1: string; stock2: string; }>;
  lookbackPeriod: number;
  entryZScore: number; // 入场Z分数阈值
  exitZScore: number; // 出场Z分数阈值
  stopLossZScore: number; // 止损Z分数阈值
  halfLife: number; // 均值回归半衰期（天）
}): StrategySignalGenerator {
  const { pairs, lookbackPeriod, entryZScore, exitZScore, stopLossZScore, halfLife } = config;

  return (data: OHLCV[], params: Record<string, any>) => {
    const signals: Signal[] = [];
    
    if (data.length < lookbackPeriod + halfLife) return signals;

    pairs.forEach(pair => {
      for (let i = lookbackPeriod; i < data.length; i++) {
        const currentData = data[i];
        const historicalData = data.slice(i - lookbackPeriod, i + 1);
        
        // 计算价格比率和Z分数
        const priceRatios = historicalData.map(d => d.close); // 简化：假设数据已经是比率
        const mean = priceRatios.reduce((sum, ratio) => sum + ratio, 0) / priceRatios.length;
        const std = Math.sqrt(priceRatios.reduce((sum, ratio) => sum + Math.pow(ratio - mean, 2), 0) / priceRatios.length);
        const currentRatio = currentData.close;
        const zScore = (currentRatio - mean) / std;
        
        // 应用均值回归调整
        const meanReversionFactor = Math.exp(-Math.log(2) / halfLife);
        const adjustedZScore = zScore * meanReversionFactor;
        
        // 生成交易信号
        if (Math.abs(adjustedZScore) > entryZScore) {
          // 入场信号
          const direction = adjustedZScore > 0 ? 'SELL' : 'BUY'; // Z分数高时卖出股票1买入股票2
          
          signals.push({
            timestamp: currentData.timestamp,
            symbol: pair.stock1,
            type: direction,
            price: currentData.close,
            confidence: Math.min(Math.abs(adjustedZScore) / entryZScore, 1.0),
            reason: `配对交易入场: ${pair.stock1}/${pair.stock2}, Z分数: ${adjustedZScore.toFixed(2)}`
          });
          
          // 对冲头寸
          signals.push({
            timestamp: currentData.timestamp,
            symbol: pair.stock2,
            type: direction === 'SELL' ? 'BUY' : 'SELL',
            price: currentData.close,
            confidence: Math.min(Math.abs(adjustedZScore) / entryZScore, 1.0),
            reason: `配对交易对冲: ${pair.stock1}/${pair.stock2}, Z分数: ${adjustedZScore.toFixed(2)}`
          });
        } else if (Math.abs(adjustedZScore) < exitZScore) {
          // 平仓信号
          signals.push({
            timestamp: currentData.timestamp,
            symbol: `${pair.stock1}_${pair.stock2}_PAIR`,
            type: 'HOLD', // 特殊信号表示平仓
            price: currentData.close,
            confidence: 0.8,
            reason: `配对交易平仓: Z分数回归至 ${adjustedZScore.toFixed(2)}`
          });
        }
      }
    });

    return signals;
  };
}

// ============================================================================
// 辅助函数 (新增)
// ============================================================================

/**
 * 提取机器学习特征
 */
function extractFeatures(data: OHLCV[], features: string[]): number[] {
  const featureVector: number[] = [];
  
  features.forEach(feature => {
    switch (feature) {
      case 'rsi':
        featureVector.push(calculateRSI(data));
        break;
      case 'macd':
        featureVector.push(calculateMACD(data));
        break;
      case 'bollinger_position':
        featureVector.push(calculateBollingerPosition(data));
        break;
      case 'volume_ratio':
        featureVector.push(calculateVolumeRatio(data));
        break;
      case 'price_momentum':
        featureVector.push(calculatePriceMomentum(data));
        break;
      default:
        featureVector.push(0);
    }
  });
  
  return featureVector;
}

/**
 * 模拟机器学习预测
 */
function simulateMLPrediction(modelType: string, features: number[], horizon: number): { direction: number; confidence: number } {
  // 简化的ML预测模拟
  const featureSum = features.reduce((sum, f) => sum + f, 0);
  const normalizedSum = featureSum / features.length;
  
  let direction = normalizedSum > 0 ? 1 : -1;
  let confidence = Math.min(Math.abs(normalizedSum), 1.0);
  
  // 不同模型的调整
  switch (modelType) {
    case 'xgboost':
      confidence *= 0.9; // XGBoost通常更保守
      break;
    case 'neural_network':
      confidence *= 1.1; // 神经网络可能过度自信
      confidence = Math.min(confidence, 1.0);
      break;
    case 'random_forest':
      confidence *= 0.85; // 随机森林比较稳定
      break;
  }
  
  return { direction, confidence };
}

/**
 * 计算收益率序列
 */
function calculateReturns(data: OHLCV[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    returns.push((data[i].close - data[i-1].close) / data[i-1].close);
  }
  return returns;
}

/**
 * 计算协方差矩阵
 */
function calculateCovarianceMatrix(returns: number[]): number[][] {
  const n = returns.length;
  const mean = returns.reduce((sum, r) => sum + r, 0) / n;
  
  // 简化：假设单资产情况，返回1x1矩阵
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1);
  return [[variance]];
}

/**
 * 风险平价权重优化
 */
function optimizeRiskParity(covMatrix: number[][], riskBudget: Record<string, number>, minWeight: number, maxWeight: number): number[] {
  // 简化的风险平价计算
  // 在实际应用中，这里会使用更复杂的优化算法
  const n = covMatrix.length;
  const weights = new Array(n).fill(1/n);
  
  // 应用约束
  return weights.map(w => Math.max(minWeight, Math.min(maxWeight, w)));
}

/**
 * 计算投资组合Beta
 */
function calculatePortfolioBeta(portfolioData: OHLCV[], benchmarkData: OHLCV[]): number {
  if (portfolioData.length !== benchmarkData.length) return 1.0;
  
  const portfolioReturns = calculateReturns(portfolioData);
  const benchmarkReturns = calculateReturns(benchmarkData);
  
  const covariance = portfolioReturns.reduce((sum, pr, i) => {
    return sum + (pr - portfolioReturns.reduce((s, r) => s + r, 0) / portfolioReturns.length) * 
                  (benchmarkReturns[i] - benchmarkReturns.reduce((s, r) => s + r, 0) / benchmarkReturns.length);
  }, 0) / (portfolioReturns.length - 1);
  
  const benchmarkVariance = benchmarkReturns.reduce((sum, br) => {
    const mean = benchmarkReturns.reduce((s, r) => s + r, 0) / benchmarkReturns.length;
    return sum + Math.pow(br - mean, 2);
  }, 0) / (benchmarkReturns.length - 1);
  
  return benchmarkVariance === 0 ? 1.0 : covariance / benchmarkVariance;
}

/**
 * 计算MACD
 */
function calculateMACD(data: OHLCV[]): number {
  if (data.length < 26) return 0;
  
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  return ema12 - ema26;
}

/**
 * 计算EMA
 */
function calculateEMA(data: OHLCV[], period: number): number {
  if (data.length === 0) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = data[0].close;
  
  for (let i = 1; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
  }
  
  return ema;
}

/**
 * 计算布林带位置
 */
function calculateBollingerPosition(data: OHLCV[]): number {
  if (data.length < 20) return 0;
  
  const prices = data.slice(-20).map(d => d.close);
  const sma = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const std = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / prices.length);
  
  const currentPrice = data[data.length - 1].close;
  const upperBand = sma + (2 * std);
  const lowerBand = sma - (2 * std);
  
  // 返回在布林带中的相对位置 (-1到1)
  return (currentPrice - lowerBand) / (upperBand - lowerBand) * 2 - 1;
}

/**
 * 计算成交量比率
 */
function calculateVolumeRatio(data: OHLCV[]): number {
  if (data.length < 20) return 1;
  
  const recentVolume = data.slice(-5).reduce((sum, d) => sum + d.volume, 0) / 5;
  const avgVolume = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
  
  return avgVolume === 0 ? 1 : recentVolume / avgVolume;
}

/**
 * 计算价格动量
 */
function calculatePriceMomentum(data: OHLCV[]): number {
  if (data.length < 20) return 0;
  
  const currentPrice = data[data.length - 1].close;
  const pastPrice = data[data.length - 20].close;
  
  return pastPrice === 0 ? 0 : (currentPrice - pastPrice) / pastPrice;
}

// ============================================================================
// Service Instance
// ============================================================================

let strategyExecutionService: StrategyExecutionService | null = null;

/**
 * 获取策略执行服务实例
 */
export function getStrategyExecutionService(config?: StrategyConfig): StrategyExecutionService {
  if (!strategyExecutionService && config) {
    strategyExecutionService = new StrategyExecutionService(config);
  } else if (!strategyExecutionService) {
    // 使用默认配置
    const defaultConfig: StrategyConfig = {
      name: 'Default Strategy',
      initialCapital: 1000000,
      maxPositions: 10,
      commission: 0.001,
      slippage: 0.001,
      riskPerTrade: 0.02,
      stopLoss: 0.05,
      takeProfit: 0.15,
      parameters: {},
      strategyType: 'technical',
      rebalanceFrequency: 'daily',
      enableDynamicHedging: false,
      enableVolumeFilter: true,
      enableSectorNeutral: false
    };
    strategyExecutionService = new StrategyExecutionService(defaultConfig);
  }
  return strategyExecutionService;
}

export default StrategyExecutionService;
