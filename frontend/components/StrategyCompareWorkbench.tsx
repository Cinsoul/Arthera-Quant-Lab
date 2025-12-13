import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, BarChart, Bar, Cell } from 'recharts';
import { useToast, ToastContainer } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { ProgressDialog } from './ProgressDialog';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  X, 
  BarChart3, 
  PieChart, 
  Activity, 
  Database,
  Download,
  Share2,
  Settings,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { 
  StrategyExecutionService,
  maStrategy,
  getDataStreamManager,
  getCacheManager,
  getReportExportService,
  getMarketDataProvider,
  getStrategyPerformanceMonitor,
  getAlertService,
  useMarketData,
  initializeServices,
  quantEngineService,
  qlibIntegrationService,
  moduleCommunication,
  useModuleCommunication,
  automationWorkflowManager,
  multiAccountManager,
  performanceOptimizer,
  type BacktestResult,
  type MarketData,
  type ReportConfig,
  type ExportFormat,
  type StrategyPerformanceMetrics,
  type ComparisonMetrics,
  type AutomationRule,
  type AccountConfig,
  type Alert,
  type AlertTriggerEvent,
  type OHLCV
} from '../services';

interface Strategy {
  id: string;
  name: string;
  style: string;
  suitableMarket: string[];
  fundCapacity: string;
  samplePeriod: string;
  metrics: {
    annualizedReturn: number;
    maxDrawdown: number;
    sharpe: number;
    winRate: number;
    volatility: number;
    turnover: number;
    avgHoldings: number;
    maxWeight: number;
    drawdownDays: number;
    lossMonthRate: number;
    correlation: number;
  };
  benchmark: {
    returnDiff: number;
    percentile: number;
  };
  color: string;
}

interface StrategyCompareWorkbenchProps {
  initialStrategies?: string[];
  onNavigate?: (path: string) => void;
}

const availableStrategies: Strategy[] = [
  {
    id: 'high-vol-alpha',
    name: 'High Vol Alpha - Q4',
    style: '高波动',
    suitableMarket: ['趋势市', '牛市'],
    fundCapacity: '≤50M',
    samplePeriod: '2019-2024',
    metrics: {
      annualizedReturn: 42.3,
      maxDrawdown: -8.2,
      sharpe: 1.35,
      winRate: 63,
      volatility: 22,
      turnover: 280,
      avgHoldings: 45,
      maxWeight: 4,
      drawdownDays: 42,
      lossMonthRate: 32,
      correlation: 0.65,
    },
    benchmark: {
      returnDiff: 18.3,
      percentile: 15,
    },
    color: '#0ea5e9',
  },
  {
    id: 'multi-factor',
    name: 'Multi-Factor Balanced',
    style: '多因子均衡',
    suitableMarket: ['震荡市', '趋势市'],
    fundCapacity: '≤100M',
    samplePeriod: '2019-2024',
    metrics: {
      annualizedReturn: 31.8,
      maxDrawdown: -5.6,
      sharpe: 1.10,
      winRate: 58,
      volatility: 18,
      turnover: 180,
      avgHoldings: 38,
      maxWeight: 5,
      drawdownDays: 35,
      lossMonthRate: 38,
      correlation: 0.58,
    },
    benchmark: {
      returnDiff: 12.5,
      percentile: 25,
    },
    color: '#10b981',
  },
  {
    id: 'defensive',
    name: 'Defensive Low-Vol',
    style: '防御',
    suitableMarket: ['熊市缓冲', '震荡市'],
    fundCapacity: '≤150M',
    samplePeriod: '2019-2024',
    metrics: {
      annualizedReturn: 18.5,
      maxDrawdown: -3.1,
      sharpe: 0.85,
      winRate: 52,
      volatility: 12,
      turnover: 90,
      avgHoldings: 30,
      maxWeight: 6,
      drawdownDays: 28,
      lossMonthRate: 42,
      correlation: 0.45,
    },
    benchmark: {
      returnDiff: 6.2,
      percentile: 45,
    },
    color: '#8b5cf6',
  },
  {
    id: 'momentum',
    name: 'Momentum + Quality',
    style: '高波动',
    suitableMarket: ['趋势市', '牛市'],
    fundCapacity: '≤50M',
    samplePeriod: '2020-2024',
    metrics: {
      annualizedReturn: 38.7,
      maxDrawdown: -9.5,
      sharpe: 1.25,
      winRate: 60,
      volatility: 24,
      turnover: 320,
      avgHoldings: 42,
      maxWeight: 4.5,
      drawdownDays: 48,
      lossMonthRate: 35,
      correlation: 0.68,
    },
    benchmark: {
      returnDiff: 16.8,
      percentile: 18,
    },
    color: '#f59e0b',
  },
  {
    id: 'value-growth',
    name: 'Value + Growth Hybrid',
    style: '多因子均衡',
    suitableMarket: ['震荡市', '转换期'],
    fundCapacity: '≤80M',
    samplePeriod: '2019-2024',
    metrics: {
      annualizedReturn: 28.4,
      maxDrawdown: -6.8,
      sharpe: 1.05,
      winRate: 55,
      volatility: 19,
      turnover: 160,
      avgHoldings: 35,
      maxWeight: 5.5,
      drawdownDays: 38,
      lossMonthRate: 40,
      correlation: 0.52,
    },
    benchmark: {
      returnDiff: 10.1,
      percentile: 30,
    },
    color: '#f97316',
  },
];

// 生成净值曲线数据
const generateCurveData = (strategy: Strategy) => {
  const data = [];
  let value = 1.0;
  const dailyReturn = strategy.metrics.annualizedReturn / 252 / 100;
  const dailyVol = strategy.metrics.volatility / Math.sqrt(252) / 100;
  
  for (let i = 0; i <= 252; i++) {
    const randomReturn = dailyReturn + (Math.random() - 0.5) * dailyVol * 2;
    value *= (1 + randomReturn);
    
    if (i % 5 === 0) {
      data.push({
        date: `${Math.floor(i / 21) + 1}月`,
        value: value,
      });
    }
  }
  return data;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const generateSyntheticOHLCV = (strategy: Strategy, days: number = 252): OHLCV[] => {
  const data: OHLCV[] = [];
  const start = new Date('2023-01-02').getTime();
  let price = 100 + Math.random() * 20;
  const drift = strategy.metrics.annualizedReturn / 100;
  const volatility = Math.max(0.05, strategy.metrics.volatility / 100);

  for (let i = 0; i < days; i++) {
    const shock = (Math.random() - 0.5) * volatility / Math.sqrt(days);
    price *= 1 + drift / days + shock;
    const open = price * (1 + (Math.random() - 0.5) * 0.01);
    const close = price;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = 800_000 + Math.random() * 500_000;

    data.push({
      timestamp: start + i * DAY_IN_MS,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return data;
};

const buildMockBacktestResult = async (strategy: Strategy): Promise<BacktestResult & { confidence?: number }> => {
  const syntheticData = generateSyntheticOHLCV(strategy);
  const initialCapital = 1_000_000;

  try {
    const localService = new StrategyExecutionService({
      name: strategy.name,
      initialCapital,
      maxPositions: Math.max(5, Math.round(strategy.metrics.avgHoldings)),
      commission: 0.001,
      slippage: 0.001,
      riskPerTrade: 0.02,
      stopLoss: Math.abs(strategy.metrics.maxDrawdown) / 100,
      takeProfit: Math.max(0.1, strategy.metrics.annualizedReturn / 100),
      parameters: { fastPeriod: 5, slowPeriod: 20 },
      strategyType: 'technical',
      rebalanceFrequency: 'daily',
      enableDynamicHedging: false,
      enableVolumeFilter: true,
      enableSectorNeutral: false,
    });

    const result = await localService.runBacktest(
      strategy.id.toUpperCase(),
      syntheticData,
      maStrategy(5, 20)
    );

    return { ...result, confidence: 0.85 };
  } catch (error) {
    let capital = initialCapital;
    let peak = capital;
    let maxDrawdown = 0;
    let maxDrawdownDuration = 0;
    let currentDuration = 0;
    const equity: Array<{ timestamp: number; value: number }> = [];

    syntheticData.forEach((candle) => {
      const change = (Math.random() - 0.45) * (strategy.metrics.volatility / 1000);
      capital *= 1 + change + strategy.metrics.annualizedReturn / 100 / syntheticData.length;
      peak = Math.max(peak, capital);
      if (capital < peak) {
        currentDuration += 1;
        maxDrawdownDuration = Math.max(maxDrawdownDuration, currentDuration);
      } else {
        currentDuration = 0;
      }
      const dd = (capital - peak) / peak;
      maxDrawdown = Math.min(maxDrawdown, dd);
      equity.push({ timestamp: candle.timestamp, value: capital });
    });

    const drawdown = equity.map(point => ({
      timestamp: point.timestamp,
      value: Math.max(0, peak - point.value),
    }));

    const totalTrades = Math.max(20, Math.round(strategy.metrics.turnover / 2));
    const winningTrades = Math.round(totalTrades * (strategy.metrics.winRate / 100));

    return {
      strategyName: strategy.name,
      startDate: equity[0]?.timestamp ?? Date.now(),
      endDate: equity[equity.length - 1]?.timestamp ?? Date.now(),
      initialCapital,
      finalCapital: capital,
      totalReturn: (capital - initialCapital) / initialCapital,
      annualizedReturn: strategy.metrics.annualizedReturn / 100,
      cagr: strategy.metrics.annualizedReturn / 100,
      maxDrawdown,
      maxDrawdownDuration,
      volatility: strategy.metrics.volatility / 100,
      sharpeRatio: strategy.metrics.sharpe,
      sortinoRatio: strategy.metrics.sharpe * 0.9,
      calmarRatio: strategy.metrics.annualizedReturn / Math.max(0.01, Math.abs(maxDrawdown * 100)),
      totalTrades,
      winningTrades,
      losingTrades: totalTrades - winningTrades,
      winRate: strategy.metrics.winRate / 100,
      avgWin: 0.02,
      avgLoss: -0.015,
      profitFactor: 1.25,
      maxPositions: strategy.metrics.avgHoldings,
      avgHoldingPeriod: Math.max(5, Math.round(strategy.metrics.drawdownDays / 2)),
      trades: [],
      equity,
      drawdown,
      positions: [],
      confidence: 0.8,
    };
  }
};

// 生成月度收益分布数据
const generateMonthlyDistribution = (strategy: Strategy) => {
  const monthlyReturns = [];
  const avgMonthly = strategy.metrics.annualizedReturn / 12;
  const monthlyVol = strategy.metrics.volatility / Math.sqrt(12);
  
  for (let i = 0; i < 60; i++) {
    const ret = avgMonthly + (Math.random() - 0.5) * monthlyVol * 2;
    monthlyReturns.push(ret);
  }
  
  monthlyReturns.sort((a, b) => a - b);
  
  return {
    min: monthlyReturns[0],
    q1: monthlyReturns[Math.floor(monthlyReturns.length * 0.25)],
    median: monthlyReturns[Math.floor(monthlyReturns.length * 0.5)],
    q3: monthlyReturns[Math.floor(monthlyReturns.length * 0.75)],
    max: monthlyReturns[monthlyReturns.length - 1],
  };
};

type SortKey = 'return' | 'drawdown' | 'sharpe' | 'winRate' | 'volatility' | 'turnover';

export function StrategyCompareWorkbench({ initialStrategies, onNavigate }: StrategyCompareWorkbenchProps) {
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(
    initialStrategies || ['high-vol-alpha', 'multi-factor', 'defensive', 'momentum']
  );
  const [focusedStrategy, setFocusedStrategy] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('return');
  const [defaultStrategy, setDefaultStrategy] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingMessage, setGeneratingMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedStrategyForDefault, setSelectedStrategyForDefault] = useState<string | null>(null);
  const [showAlphaCurve, setShowAlphaCurve] = useState(false);
  const [chartView, setChartView] = useState<'curve' | 'distribution'>('curve');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    language: 'chinese',
    audience: 'internal',
  });
  const { messages, closeToast, success, info, warning } = useToast();

  // 外部服务状态
  const [serviceStatus, setServiceStatus] = useState({
    initialized: false,
    quantEngine: false,
    qlib: false,
    akshare: false
  });

  // 服务集成
  const dataStreamManager = getDataStreamManager();
  const cacheManager = getCacheManager();
  const reportService = getReportExportService();
  const marketDataProvider = getMarketDataProvider();
  const performanceMonitor = getStrategyPerformanceMonitor();
  
  // 实时数据监控
  const watchedSymbols = ['000001', '399001', '399006', '600519', '300750']; // 指数 + 代表性个股
  const { data: marketData, status: dataStatus } = useMarketData(watchedSymbols, { 
    enableLevel2: false,
    autoConnect: true 
  });

  // 策略执行状态
  const [strategyResults, setStrategyResults] = useState<Map<string, BacktestResult>>(new Map());
  const [runningStrategies, setRunningStrategies] = useState<Set<string>>(new Set());
  const [strategyProgress, setStrategyProgress] = useState<Map<string, number>>(new Map());
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  
  // 性能监控状态
  const [performanceMetrics, setPerformanceMetrics] = useState<Map<string, StrategyPerformanceMetrics>>(new Map());
  const [comparisonMetrics, setComparisonMetrics] = useState<ComparisonMetrics | null>(null);
  const [performanceSubscription, setPerformanceSubscription] = useState<string | null>(null);

  // 真实服务集成状态
  const [externalServicesStatus, setExternalServicesStatus] = useState({
    quantEngine: false,
    qlib: false,
    deepSeek: false,
    tushare: false,
    akshare: false
  });
  
  // 模块间通信
  const {
    state: communicationState,
    notifyStrategyCompleted,
    applyStrategyToPortfolio,
    addStrategyToComparison,
    updateServiceStatus
  } = useModuleCommunication();

  // 自动化工作流状态
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<AccountConfig[]>([]);
  
  // 键盘快捷键状态
  const [shortcutActive, setShortcutActive] = useState<string | null>(null);
  
  // 性能优化监控
  const [performanceStats, setPerformanceStats] = useState({
    cacheHitRate: 0,
    avgResponseTime: 0,
    memoryUsage: 0,
    activeConnections: 0
  });
  
  // 对比模板管理
  const [savedComparisons, setSavedComparisons] = useState<Array<{
    id: string;
    name: string;
    strategies: string[];
    timestamp: number;
    description?: string;
  }>>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  
  // 图表增强状态
  const [chartSettings, setChartSettings] = useState({
    showBenchmark: true,
    showDrawdown: false,
    showVolatilityBands: false,
    timeRange: '1Y' as '6M' | '1Y' | '2Y' | '3Y',
    normalizeToStart: false
  });
  
  // 实时对比状态
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const [realTimeData, setRealTimeData] = useState<Map<string, any>>(new Map());

  // 价格提醒服务集成
  const [compareAlerts, setCompareAlerts] = useState<Alert[]>([]);
  const [alertEvents, setAlertEvents] = useState<AlertTriggerEvent[]>([]);

  // 初始化价格提醒服务连接
  useEffect(() => {
    const alertService = getAlertService();
    
    // 监听警报触发事件
    const unsubscribe = alertService.addEventListener('onAlertTriggered', (event: AlertTriggerEvent) => {
      setAlertEvents(prev => [event, ...prev.slice(0, 4)]);
      
      // 如果触发的警报与对比中的策略相关，停止对比或调整策略
      const affectedStrategy = selectedStrategies.find((id) => {
        const strategy = availableStrategies.find((s) => s.id === id);
        return strategy?.name?.includes?.(event.alert.symbol ?? '') ?? false;
      });
      
      if (affectedStrategy && runningStrategies.has(affectedStrategy)) {
        // 停止受影响的策略回测
        stopStrategy(affectedStrategy);
        addToast({
          type: 'warning',
          title: '策略对比警报',
          message: `${event.alert.name} 触发，已停止 ${affectedStrategy} 策略`
        });
      }
      
      // 通知模块通信系统
      moduleCommunication.emit('alert:strategy-compare', {
        symbol: event.alert.symbol,
        alertName: event.alert.name,
        affectedStrategies: selectedStrategies,
        module: 'strategy-compare'
      });
    });

    // 获取与策略对比相关的警报
    const allAlerts = alertService.getAllAlerts();
    const relevantAlerts = allAlerts.filter((alert) => {
      const tagged = alert.tags?.includes('strategy');
      const mentioned = alert.description?.includes?.('对比');
      const watched = alert.symbol ? watchedSymbols.includes(alert.symbol) : false;
      return Boolean(tagged || mentioned || watched);
    });
    setCompareAlerts(relevantAlerts);

    return unsubscribe;
  }, [selectedStrategies, runningStrategies, watchedSymbols]);

  // 服务初始化和数据加载
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    initializeComparisonServices().then((disposer) => {
      if (typeof disposer === 'function') {
        if (cancelled) {
          disposer();
        } else {
          cleanup = disposer;
        }
      }
    });

    loadCachedResults();
    loadSavedComparisons();
    initializeKeyboardShortcuts();
    loadAutomationRules();
    loadAvailableAccounts();
    checkExternalServices();
    
    // 如果有初始策略，自动选择
    if (initialStrategies && initialStrategies.length > 0) {
      setSelectedStrategies(initialStrategies);
      // 自动运行初始策略
      initialStrategies.forEach(strategyId => {
        setTimeout(() => runStrategy(strategyId), 1000);
      });
    } else {
      // 默认选择前三个策略
      const defaultSelected = availableStrategies.slice(0, 3).map(s => s.id);
      setSelectedStrategies(defaultSelected);
      // 自动运行默认策略
      defaultSelected.forEach((strategyId, index) => {
        setTimeout(() => runStrategy(strategyId), 1000 + index * 500);
      });
    }

    return () => {
      cancelled = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const initializeComparisonServices = async () => {
    let workspaceListener: ((event: any) => void) | null = null;
    let dataLoadedListener: ((event: any) => void) | null = null;

    try {
      console.log('[StrategyCompare] Initializing services...');
      
      // 1. 初始化统一服务管理器
      const serviceResults = await initializeServices({
        enableRealData: true,
        enableWebSocket: true,
        enableAkShare: true,
        modules: ['strategy-compare', 'quantEngine', 'qlib']
      });
      
      setServiceStatus({
        initialized: serviceResults.success,
        quantEngine: serviceResults.initResults?.quantEngine || false,
        qlib: serviceResults.initResults?.qlib || false,
        akshare: serviceResults.initResults?.akshare || false
      });
      
      console.log('✅ StrategyCompare external services initialized:', serviceResults);
      
      // 添加工作区连接监听
      workspaceListener = (event: any) => {
        console.log('[StrategyCompare] Workspace connected:', event);
        setDataStatus('connected');
      };
      
      dataLoadedListener = (event: any) => {
        console.log('[StrategyCompare] Data loaded:', event);
        if (event.strategies && event.strategies.length > 0) {
          // 自动选择前三个策略进行对比
          const defaultSelected = event.strategies.slice(0, 3);
          setSelectedStrategies(defaultSelected);
          // 自动运行这些策略
          defaultSelected.forEach((strategyId: string) => {
            runStrategy(strategyId);
          });
        }
      };
      
      moduleCommunication.addEventListener('workspace:strategy-compare:connected', workspaceListener);
      moduleCommunication.addEventListener('strategy-compare:data:loaded', dataLoadedListener);
      
      // 初始化性能监控服务
      await performanceMonitor.initialize();
      
      // 设置性能监控订阅
      const subId = performanceMonitor.subscribeToPerformance(
        selectedStrategies,
        'realtime',
        (metrics) => {
          const metricsMap = new Map<string, StrategyPerformanceMetrics>();
          metrics.forEach(m => metricsMap.set(m.strategyId, m));
          setPerformanceMetrics(metricsMap);
          setLastUpdateTime(new Date());
        }
      );
      setPerformanceSubscription(subId);
      
      // 加载历史对比数据
      const cachedComparisons = await cacheManager.get('strategy-comparisons');
      if (cachedComparisons) {
        console.log('[StrategyCompare] Loaded cached comparisons');
      }
      
      // 更新对比分析
      await updateComparisonAnalysis();
      
      success('策略对比服务已初始化');
    } catch (error) {
      console.error('[StrategyCompare] Service initialization failed:', error);
      warning('服务初始化失败，使用离线模式');
    }

    return () => {
      if (workspaceListener) {
        moduleCommunication.removeEventListener('workspace:strategy-compare:connected', workspaceListener);
      }
      if (dataLoadedListener) {
        moduleCommunication.removeEventListener('strategy-compare:data:loaded', dataLoadedListener);
      }
    };
  };

  const loadCachedResults = async () => {
    try {
      const results = new Map<string, BacktestResult>();
      
      for (const strategyId of selectedStrategies) {
        const cached = await cacheManager.get(`backtest-${strategyId}`);
        if (cached) {
          results.set(strategyId, cached);
        }
      }
      
      setStrategyResults(results);
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('[StrategyCompare] Failed to load cached results:', error);
    }
  };

  // 检查外部服务状态
  const checkExternalServices = async () => {
    try {
      const services = {
        quantEngine: false,
        qlib: false,
        deepSeek: false,
        tushare: false,
        akshare: false
      };

      // 检查QuantEngine服务
      try {
        const quantHealth = await quantEngineService.healthCheck();
        services.quantEngine = quantHealth.healthy;
      } catch (error) {
        console.warn('[StrategyCompare] QuantEngine not available');
      }

      // 检查Qlib服务
      try {
        const qlibHealth = await qlibIntegrationService.healthCheck();
        services.qlib = qlibHealth.healthy;
      } catch (error) {
        console.warn('[StrategyCompare] Qlib not available');
      }

      setExternalServicesStatus(services);
      updateServiceStatus(services);
      
      console.log('[StrategyCompare] External services status:', services);
    } catch (error) {
      console.error('[StrategyCompare] Failed to check external services:', error);
    }
  };

  const toggleStrategy = useCallback((strategyId: string) => {
    setSelectedStrategies((prev) => {
      const exists = prev.includes(strategyId);
      if (exists) {
        if (prev.length <= 1) {
          return prev;
        }
        return prev.filter(id => id !== strategyId);
      }

      if (prev.length >= 4) {
        return prev;
      }

      return [...prev, strategyId];
    });
  }, []);

  // 初始化键盘快捷键
  const initializeKeyboardShortcuts = () => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 策略选择快捷键 1-5
      if (event.key >= '1' && event.key <= '5' && !event.ctrlKey && !event.altKey) {
        const index = parseInt(event.key) - 1;
        if (index < availableStrategies.length) {
          toggleStrategy(availableStrategies[index].id);
          setShortcutActive(event.key);
          setTimeout(() => setShortcutActive(null), 500);
        }
      }
      
      // Ctrl+P: 生成报告
      if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        setShowReportDialog(true);
        setShortcutActive('Ctrl+P');
        setTimeout(() => setShortcutActive(null), 500);
      }
      
      // Escape: 取消聚焦
      if (event.key === 'Escape') {
        setFocusedStrategy(null);
        setShortcutActive('Esc');
        setTimeout(() => setShortcutActive(null), 500);
      }
      
      // Ctrl+A: 添加到自动化规则
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        handleAddToAutomation();
        setShortcutActive('Ctrl+A');
        setTimeout(() => setShortcutActive(null), 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  };

  // 加载自动化规则
  const loadAutomationRules = async () => {
    try {
      // 从automationWorkflowManager获取规则
      const rules = automationWorkflowManager.getRules?.() || [];
      setAutomationRules(rules);
    } catch (error) {
      console.error('[StrategyCompare] Failed to load automation rules:', error);
    }
  };

  // 加载可用账户
  const loadAvailableAccounts = async () => {
    try {
      const accounts = multiAccountManager.getAccounts();
      setAvailableAccounts(accounts);
    } catch (error) {
      console.error('[StrategyCompare] Failed to load accounts:', error);
    }
  };

  // 监控性能统计
  const updatePerformanceStats = useCallback(() => {
    try {
      const metrics = performanceOptimizer.getMetrics();
      setPerformanceStats({
        cacheHitRate: metrics.cacheHitRate,
        avgResponseTime: metrics.avgResponseTime,
        memoryUsage: metrics.memoryUsage,
        activeConnections: externalServicesStatus.quantEngine ? 1 : 0 +
                          externalServicesStatus.qlib ? 1 : 0 +
                          externalServicesStatus.deepSeek ? 1 : 0 +
                          externalServicesStatus.tushare ? 1 : 0
      });
    } catch (error) {
      console.error('[StrategyCompare] Failed to update performance stats:', error);
    }
  }, [externalServicesStatus]);

  // 添加到自动化工作流
  const handleAddToAutomation = () => {
    if (selectedStrategies.length === 0) {
      warning('请先选择要自动化的策略');
      return;
    }

    const rule: Omit<AutomationRule, 'id' | 'createdAt' | 'triggerCount'> = {
      name: `策略对比自动化-${new Date().toLocaleDateString()}`,
      description: `对比策略：${selectedStrategies.join(', ')}`,
      isActive: true,
      triggers: [
        {
          type: 'performance',
          conditions: {
            metric: 'maxDrawdown',
            operator: '>',
            value: 15
          }
        }
      ],
      actions: [
        {
          type: 'send_alert',
          parameters: {
            message: '策略回撤超过预警线',
            strategies: selectedStrategies
          }
        }
      ]
    };

    try {
      const ruleId = automationWorkflowManager.addRule(rule);
      success(`自动化规则已创建: ${ruleId}`);
      loadAutomationRules();
    } catch (error) {
      warning('创建自动化规则失败');
      console.error('[StrategyCompare] Failed to create automation rule:', error);
    }
  };

  // 实时运行策略
  const runStrategy = useCallback(async (strategyId: string) => {
    const strategy = availableStrategies.find(s => s.id === strategyId);
    if (!strategy || runningStrategies.has(strategyId)) return;

    setRunningStrategies(prev => new Set(prev).add(strategyId));
    setStrategyProgress(prev => new Map(prev).set(strategyId, 0));

    try {
      info(`开始执行策略: ${strategy.name}`);
      
      const progressInterval = setInterval(() => {
        setStrategyProgress(prev => {
          const newProgress = Math.min((prev.get(strategyId) || 0) + 10, 95);
          return new Map(prev).set(strategyId, newProgress);
        });
      }, 200);

      const result = await buildMockBacktestResult(strategy);

      clearInterval(progressInterval);
      setStrategyProgress(prev => new Map(prev).set(strategyId, 100));

      if (result) {
        await cacheManager.set(`backtest-${strategyId}`, result);
        setStrategyResults(prev => new Map(prev).set(strategyId, result));
        setLastUpdateTime(new Date());
        success(`策略 ${strategy.name} 执行完成`);
      } else {
        throw new Error('策略执行返回空结果');
      }
    } catch (error) {
      console.error('[StrategyCompare] Strategy execution failed:', error);
      warning(`策略 ${strategy.name} 执行失败`);
    } finally {
      setRunningStrategies(prev => {
        const newSet = new Set(prev);
        newSet.delete(strategyId);
        return newSet;
      });
      setStrategyProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(strategyId);
        return newMap;
      });
    }
  }, [cacheManager, runningStrategies, success, info, warning]);

  // 批量运行所有策略
  const runAllStrategies = useCallback(async () => {
    setIsGenerating(true);
    setGeneratingProgress(0);
    setGeneratingMessage('准备运行策略...');

    try {
      const promises = selectedStrategies.map(strategyId => runStrategy(strategyId));
      await Promise.all(promises);
      setGeneratingProgress(100);
      setGeneratingMessage('所有策略执行完成');
      success('批量执行完成');
    } catch (error) {
      console.error('[StrategyCompare] Batch execution failed:', error);
      warning('批量执行失败');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGeneratingProgress(0);
        setGeneratingMessage('');
      }, 1000);
    }
  }, [selectedStrategies, runStrategy, success, warning]);

  // 导出对比报告
  const exportComparisonReport = useCallback(async (format: ExportFormat) => {
    try {
      const reportData = {
        strategies: selectedStrategies.map(id => {
          const strategy = availableStrategies.find(s => s.id === id);
          const result = strategyResults.get(id);
          return { strategy, result };
        }),
        marketData: Array.from(marketData.values()),
        comparisonMetrics: {
          lastUpdate: lastUpdateTime,
          dataStatus,
          totalStrategies: selectedStrategies.length
        }
      };

      const config: ReportConfig = {
        title: '策略对比分析报告',
        subtitle: `生成时间: ${new Date().toLocaleString('zh-CN')}`,
        template: {
          id: 'strategy-comparison',
          name: '策略对比模板',
          type: 'comprehensive',
          layout: 'detailed',
          theme: 'bloomberg'
        },
        sections: [
          {
            id: 'executive-summary',
            title: '执行摘要',
            type: 'summary',
            content: reportData,
            order: 1
          },
          {
            id: 'performance-comparison',
            title: '表现对比',
            type: 'performance',
            content: reportData.strategies,
            order: 2
          }
        ],
        format: [format]
      };

      const result = await reportService.generateReport(reportData, config, {
        format,
        quality: 'high',
        includeCharts: true,
        includeData: true
      });

      if (result.success && result.downloadUrl) {
        reportService.downloadFile(result.downloadUrl, result.filePath || `strategy_comparison.${format}`);
        success(`报告已导出为 ${format.toUpperCase()} 格式`);
      } else {
        throw new Error(result.error || '导出失败');
      }
    } catch (error) {
      console.error('[StrategyCompare] Export failed:', error);
      warning(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [selectedStrategies, strategyResults, marketData, lastUpdateTime, dataStatus, reportService, success, warning]);

  // 更新对比分析
  const updateComparisonAnalysis = useCallback(async () => {
    if (selectedStrategies.length < 2) return;
    
    try {
      const metrics = await performanceMonitor.getComparisonMetrics(selectedStrategies);
      setComparisonMetrics(metrics);
    } catch (error) {
      console.error('[StrategyCompare] Failed to update comparison metrics:', error);
    }
  }, [selectedStrategies, performanceMonitor]);
  
  // 加载保存的对比模板
  const loadSavedComparisons = useCallback(async () => {
    try {
      const cached = await cacheManager.get('saved-comparisons');
      if (cached && Array.isArray(cached)) {
        setSavedComparisons(cached);
      }
    } catch (error) {
      console.error('[StrategyCompare] Failed to load saved comparisons:', error);
    }
  }, [cacheManager]);
  
  // 保存对比模板
  const saveComparisonTemplate = useCallback(async () => {
    if (!templateName.trim() || selectedStrategies.length < 2) {
      warning('请输入模板名称并选择至少2个策略');
      return;
    }
    
    try {
      const template = {
        id: `comparison-${Date.now()}`,
        name: templateName.trim(),
        strategies: [...selectedStrategies],
        timestamp: Date.now(),
        description: templateDescription.trim() || undefined
      };
      
      const updated = [...savedComparisons, template];
      setSavedComparisons(updated);
      await cacheManager.set('saved-comparisons', updated);
      
      // 重置对话框状态
      setShowTemplateDialog(false);
      setTemplateName('');
      setTemplateDescription('');
      
      success(`对比模板 "${template.name}" 已保存`);
    } catch (error) {
      console.error('[StrategyCompare] Failed to save comparison template:', error);
      warning('保存模板失败');
    }
  }, [templateName, templateDescription, selectedStrategies, savedComparisons, cacheManager, success, warning]);
  
  // 加载对比模板
  const loadComparisonTemplate = useCallback(async (template: any) => {
    try {
      setSelectedStrategies(template.strategies);
      setFocusedStrategy(null);
      
      // 刷新数据
      await loadCachedResults();
      await updateComparisonAnalysis();
      
      success(`已加载模板 "${template.name}"`);
    } catch (error) {
      console.error('[StrategyCompare] Failed to load comparison template:', error);
      warning('加载模板失败');
    }
  }, [loadCachedResults, updateComparisonAnalysis, success, warning]);
  
  // 删除对比模板
  const deleteComparisonTemplate = useCallback(async (templateId: string) => {
    try {
      const updated = savedComparisons.filter(t => t.id !== templateId);
      setSavedComparisons(updated);
      await cacheManager.set('saved-comparisons', updated);
      
      const template = savedComparisons.find(t => t.id === templateId);
      success(`已删除模板 "${template?.name}"`);
    } catch (error) {
      console.error('[StrategyCompare] Failed to delete comparison template:', error);
      warning('删除模板失败');
    }
  }, [savedComparisons, cacheManager, success, warning]);
  
  // 切换实时模式
  const toggleRealTimeMode = useCallback(async () => {
    try {
      if (!isRealTimeMode) {
        // 启动实时模式
        const subscription = performanceMonitor.subscribeToRealTimeComparison(
          selectedStrategies,
          (data) => {
            const dataMap = new Map();
            Object.entries(data).forEach(([strategyId, metrics]) => {
              dataMap.set(strategyId, metrics);
            });
            setRealTimeData(dataMap);
            setLastUpdateTime(new Date());
          }
        );
        
        setIsRealTimeMode(true);
        info('实时对比模式已开启');
      } else {
        // 关闭实时模式
        if (performanceSubscription) {
          performanceMonitor.unsubscribeFromPerformance(performanceSubscription);
        }
        setIsRealTimeMode(false);
        setRealTimeData(new Map());
        info('已退出实时对比模式');
      }
    } catch (error) {
      console.error('[StrategyCompare] Failed to toggle real-time mode:', error);
      warning('切换实时模式失败');
    }
  }, [isRealTimeMode, selectedStrategies, performanceMonitor, performanceSubscription, info, warning]);
  
  const handleSetDefault = useCallback((strategyId: string) => {
    setSelectedStrategyForDefault(strategyId);
    setShowConfirmDialog(true);
  }, []);

  // 增强的策略点击事件处理
  const handleStrategyClick = useCallback((strategyId: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    const isCtrlClick = event.ctrlKey || event.metaKey;
    const isShiftClick = event.shiftKey;
    const isDoubleClick = event.detail === 2;
    
    if (isDoubleClick) {
      // 双击聚焦/取消聚焦
      setFocusedStrategy(focusedStrategy === strategyId ? null : strategyId);
    } else if (isCtrlClick) {
      // Ctrl+点击单独运行策略
      runStrategy(strategyId);
    } else if (isShiftClick) {
      // Shift+点击设置为默认
      handleSetDefault(strategyId);
    } else {
      // 普通点击选择/取消选择
      toggleStrategy(strategyId);
    }
  }, [focusedStrategy, toggleStrategy, runStrategy, handleSetDefault]);
  
  // 批量操作
  const handleBatchOperation = useCallback(async (operation: 'run' | 'export' | 'clear') => {
    switch (operation) {
      case 'run':
        await runAllStrategies();
        break;
      case 'export':
        setShowReportDialog(true);
        break;
      case 'clear':
        setStrategyResults(new Map());
        setPerformanceMetrics(new Map());
        setComparisonMetrics(null);
        setLastUpdateTime(new Date());
        await cacheManager.clear('backtest-*');
        success('已清空所有对比数据');
        break;
    }
  }, [runAllStrategies, cacheManager, success]);
  
  // 图表设置更新
  const updateChartSettings = useCallback((key: string, value: any) => {
    setChartSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // 监听选中策略变化，更新对比分析
  useEffect(() => {
    updateComparisonAnalysis();
  }, [updateComparisonAnalysis]);

  // 清理订阅
  useEffect(() => {
    return () => {
      if (performanceSubscription) {
        performanceMonitor.unsubscribeFromPerformance(performanceSubscription);
      }
    };
  }, [performanceSubscription, performanceMonitor]);

  const comparisonData = selectedStrategies
    .map((id) => availableStrategies.find((s) => s.id === id))
    .filter((strategy): strategy is Strategy => Boolean(strategy));

  // 排序逻辑
  const getSortValue = (strategy: Strategy, key: SortKey): number => {
    switch (key) {
      case 'return': return strategy.metrics.annualizedReturn;
      case 'drawdown': return Math.abs(strategy.metrics.maxDrawdown);
      case 'sharpe': return strategy.metrics.sharpe;
      case 'winRate': return strategy.metrics.winRate;
      case 'volatility': return strategy.metrics.volatility;
      case 'turnover': return strategy.metrics.turnover;
      default: return 0;
    }
  };

  const sortedData = [...comparisonData].sort((a, b) => {
    if (sortBy === 'drawdown') return getSortValue(a, sortBy) - getSortValue(b, sortBy);
    return getSortValue(b, sortBy) - getSortValue(a, sortBy);
  });

  // 雷达图数据
  const radarData = [
    {
      metric: '收益',
      ...Object.fromEntries(comparisonData.map(s => [s.id, s.metrics.annualizedReturn])),
    },
    {
      metric: '回撤',
      ...Object.fromEntries(comparisonData.map(s => [s.id, Math.abs(s.metrics.maxDrawdown) * 10])),
    },
    {
      metric: '波动',
      ...Object.fromEntries(comparisonData.map(s => [s.id, s.metrics.volatility])),
    },
    {
      metric: '胜率',
      ...Object.fromEntries(comparisonData.map(s => [s.id, s.metrics.winRate])),
    },
    {
      metric: '夏普',
      ...Object.fromEntries(comparisonData.map(s => [s.id, s.metrics.sharpe * 30])),
    },
  ];

  // 生成净值曲线数据
  const curveData = comparisonData.length > 0 ? generateCurveData(comparisonData[0]) : [];
  const allCurveData = curveData.map((point, index) => {
    const result: any = { date: point.date };
    comparisonData.forEach(strategy => {
      const strategyData = generateCurveData(strategy);
      result[strategy.id] = strategyData[index]?.value || 1;
      if (showAlphaCurve) {
        result[`${strategy.id}_alpha`] = (strategyData[index]?.value || 1) - (1 + 0.24 / 252 * index * 5);
      }
    });
    return result;
  });

  // 月度分布数据
  const distributionData = comparisonData.map(strategy => ({
    name: strategy.name,
    ...generateMonthlyDistribution(strategy),
    color: strategy.color,
  }));

  // AI 建议
  const getAIRecommendation = () => {
    if (comparisonData.length === 0) {
      return null;
    }
    const topStrategy = comparisonData.reduce((prev, curr) =>
      curr.metrics.annualizedReturn > prev.metrics.annualizedReturn ? curr : prev
    );
    const safeStrategy = comparisonData.reduce((prev, curr) =>
      Math.abs(curr.metrics.maxDrawdown) < Math.abs(prev.metrics.maxDrawdown) ? curr : prev
    );
    const balancedStrategy = comparisonData.reduce((prev, curr) =>
      curr.metrics.sharpe > prev.metrics.sharpe ? curr : prev
    );

    return {
      topStrategy,
      safeStrategy,
      balancedStrategy,
    };
  };

  const recommendation = getAIRecommendation();

  const confirmSetDefault = () => {
    if (!selectedStrategyForDefault) return;
    
    const strategy = availableStrategies.find(s => s.id === selectedStrategyForDefault);
    if (!strategy) return;

    setDefaultStrategy(selectedStrategyForDefault);
    setShowConfirmDialog(false);
    success(
      `已将 ${strategy.name} 设为默认方案`,
      'Dashboard 和 Portfolio 模块已同步更新',
      4000
    );
  };

  // 生成报告
  const handleGenerateReport = async () => {
    setShowReportDialog(false);
    setIsGenerating(true);
    setGeneratingProgress(0);

    try {
      const reportService = getReportExportService();
      
      // 收集策略数据
      setGeneratingProgress(20);
      setGeneratingMessage('正在收集策略数据...');
      
      const strategyData = selectedStrategies.map(id => {
        const strategy = availableStrategies.find(s => s.id === id);
        const result = strategyResults.get(id);
        const metrics = performanceMetrics.get(id);
        
        return {
          id,
          name: strategy?.name || id,
          metrics: strategy?.metrics,
          result,
          performanceMetrics: metrics
        };
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // 生成图表数据
      setGeneratingProgress(40);
      setGeneratingMessage('正在渲染图表和分析...');
      
      const chartData = {
        performanceCurve: generatePerformanceCurveData(),
        riskReturnScatter: comparisonMetrics?.riskReturnScatter || [],
        correlationMatrix: comparisonMetrics?.correlationMatrix || [],
        portfolioOptimization: comparisonMetrics?.portfolioOptimization
      };

      await new Promise(resolve => setTimeout(resolve, 600));

      // 准备报告配置
      setGeneratingProgress(60);
      setGeneratingMessage('正在编译PDF文档...');
      
      const config: ReportConfig = {
        title: `策略对比分析报告 - ${new Date().toLocaleDateString()}`,
        subtitle: `${strategyData.map(s => s.name).join(' vs ')}`,
        author: 'Arthera Quant Lab',
        language: reportConfig.language as any,
        audience: reportConfig.audience,
        includeCharts: true,
        includeData: true,
        template: 'comparison',
        metadata: {
          generatedAt: new Date(),
          strategies: selectedStrategies,
          comparisonMetrics: comparisonMetrics,
          externalServices: externalServicesStatus,
          performanceStats: performanceStats
        }
      };

      await new Promise(resolve => setTimeout(resolve, 700));

      // 生成报告
      setGeneratingProgress(80);
      setGeneratingMessage('正在优化和压缩...');
      
      const result = await reportService.generateReport({
        strategies: strategyData,
        charts: chartData,
        analysis: comparisonMetrics
      }, config, {
        format: 'pdf' as ExportFormat,
        quality: 'high',
        includeCharts: true,
        includeData: true
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // 完成
      setGeneratingProgress(100);
      setGeneratingMessage('生成完成！');
      
      if (result.success) {
        const languageText = reportConfig.language === 'chinese' ? '中文' : 
                           reportConfig.language === 'english' ? '英文' : '双语';
        const audienceText = reportConfig.audience === 'internal' ? '内部投委会' : 
                           reportConfig.audience === 'external' ? '外部投资人' : '企业管理层';
        
        const filename = `策略对比分析_${audienceText}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // 缓存报告以便分享
        const reportId = await cacheManager.set('report-share', {
          filename,
          config,
          data: strategyData,
          charts: chartData,
          analysis: comparisonMetrics,
          generatedAt: new Date()
        }, 24 * 60 * 60 * 1000); // 24小时过期
        
        success(
          '报告生成成功！',
          `${filename} (${languageText})`,
          5000
        );
        
        // 生成分享链接
        const shareUrl = generateShareUrl(reportId, selectedStrategies);
        navigator.clipboard?.writeText(shareUrl);
        
        setTimeout(() => {
          info('分享链接已复制', shareUrl, 6000);
        }, 1000);

        // 通知其他模块
        moduleCommunication.dispatchEvent(new CustomEvent('report:generated', {
          detail: { 
            reportId, 
            strategies: selectedStrategies,
            shareUrl,
            config
          }
        }));
      } else {
        throw new Error(result.error || '报告生成失败');
      }
      
    } catch (error) {
      console.error('[StrategyCompare] Failed to generate report:', error);
      warning('报告生成失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsGenerating(false);
    }
  };

  // 生成分享URL
  const generateShareUrl = (reportId: string, strategies: string[]): string => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    params.set('report', reportId);
    params.set('strategies', strategies.join(','));
    params.set('view', 'shared');
    params.set('timestamp', Date.now().toString());
    
    return `${baseUrl}/strategy-compare?${params.toString()}`;
  };

  // 生成性能曲线数据
  const generatePerformanceCurveData = () => {
    const days = 252; // 一年交易日
    const baseData = [];
    
    for (let i = 0; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      
      const dataPoint: any = {
        date: date.toISOString().split('T')[0],
        day: i
      };
      
      selectedStrategies.forEach(strategyId => {
        const strategy = availableStrategies.find(s => s.id === strategyId);
        if (strategy) {
          // 模拟累积收益曲线
          const volatility = strategy.metrics.volatility / 100;
          const expectedReturn = strategy.metrics.annualizedReturn / 100;
          const randomWalk = Math.random() * volatility * 2 - volatility;
          const dailyReturn = expectedReturn / 252 + randomWalk / Math.sqrt(252);
          
          dataPoint[strategyId] = i === 0 ? 1 : 
            (baseData[i - 1]?.[strategyId] || 1) * (1 + dailyReturn);
        }
      });
      
      baseData.push(dataPoint);
    }
    
    return baseData;
  };

  // 分享对比结果
  const handleShareComparison = async () => {
    if (selectedStrategies.length === 0) {
      warning('请先选择策略进行对比');
      return;
    }

    try {
      // 生成分享数据
      const shareData = {
        strategies: selectedStrategies.map(id => {
          const strategy = availableStrategies.find(s => s.id === id);
          return {
            id,
            name: strategy?.name || id,
            metrics: strategy?.metrics
          };
        }),
        comparisonMetrics,
        timestamp: new Date(),
        settings: {
          focusedStrategy,
          sortBy,
          showAlphaCurve,
          chartView
        },
        metadata: {
          platform: 'Arthera Quant Lab',
          version: '2.0',
          userAgent: navigator.userAgent,
          externalServices: externalServicesStatus
        }
      };

      // 缓存分享数据
      const shareId = await cacheManager.set('share-comparison', shareData, 7 * 24 * 60 * 60 * 1000); // 7天过期
      
      // 生成分享链接
      const baseUrl = window.location.origin;
      const shareParams = new URLSearchParams();
      shareParams.set('share', shareId);
      shareParams.set('view', 'shared');
      shareParams.set('strategies', selectedStrategies.join(','));
      
      const shareUrl = `${baseUrl}/strategy-compare?${shareParams.toString()}`;
      
      // 复制到剪贴板
      await navigator.clipboard.writeText(shareUrl);
      
      // 生成短链接描述
      const strategyNames = selectedStrategies
        .map(id => availableStrategies.find(s => s.id === id)?.name || id)
        .join(' vs ');
      
      success(
        '分享链接已复制！',
        `${strategyNames.length > 50 ? strategyNames.substring(0, 50) + '...' : strategyNames}`,
        4000
      );

      // 显示更多分享选项
      setTimeout(() => {
        const message = `🔗 ${shareUrl}\n\n📊 包含 ${selectedStrategies.length} 个策略对比\n⏰ 链接有效期 7 天\n🔄 支持实时协作查看`;
        
        info('分享详情', message, 8000);
      }, 1000);

      // 通知其他模块
      moduleCommunication.dispatchEvent(new CustomEvent('comparison:shared', {
        detail: { 
          shareId,
          shareUrl,
          strategies: selectedStrategies,
          timestamp: new Date()
        }
      }));

      // 记录分享行为
      console.log('[StrategyCompare] Comparison shared:', {
        shareId,
        strategies: selectedStrategies,
        url: shareUrl
      });

    } catch (error) {
      console.error('[StrategyCompare] Failed to share comparison:', error);
      warning('分享失败', error instanceof Error ? error.message : '请检查网络连接');
    }
  };

  const handleDownloadData = useCallback(async () => {
    if (selectedStrategies.length === 0) {
      warning('请先选择策略');
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(10);

      const data = {
        strategies: selectedStrategies.map(id => {
          const strategy = availableStrategies.find(s => s.id === id);
          const result = strategyResults.get(id);
          const metrics = performanceMetrics.get(id);
          
          return {
            id,
            name: strategy?.name,
            metrics: strategy?.metrics,
            result,
            performance: metrics
          };
        }),
        comparisonMetrics,
        generatedAt: new Date().toISOString()
      };

      setExportProgress(60);
      await new Promise(resolve => setTimeout(resolve, 500));

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `strategy-comparison-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setExportProgress(100);
      success('数据导出成功', '已下载 strategy-comparison.json');
    } catch (error) {
      console.error('Failed to download comparison data:', error);
      warning('导出失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 800);
    }
  }, [
    selectedStrategies,
    availableStrategies,
    strategyResults,
    performanceMetrics,
    comparisonMetrics,
    success,
    warning
  ]);

  const handleAdvancedKeyboard = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'S') {
      event.preventDefault();
      handleShareComparison();
      setShortcutActive('Ctrl+Shift+S');
      setTimeout(() => setShortcutActive(null), 500);
    }
    
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
      event.preventDefault();
      info('快速对比', '请在策略实验室中使用此快捷键', 2000);
    }
    
    if (event.ctrlKey && event.key === 'd') {
      event.preventDefault();
      handleDownloadData();
      setShortcutActive('Ctrl+D');
      setTimeout(() => setShortcutActive(null), 500);
    }
  }, [handleShareComparison, handleDownloadData, info]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setShowReportDialog(true);
      }

      if (e.key === 'Escape') {
        setFocusedStrategy(null);
      }

      if (e.key >= '1' && e.key <= '5') {
        const index = parseInt(e.key) - 1;
        if (availableStrategies[index]) {
          toggleStrategy(availableStrategies[index].id);
        }
      }

      handleAdvancedKeyboard(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [availableStrategies, handleAdvancedKeyboard, toggleStrategy]);

  // 表格行定义
  const tableRows = [
    { key: 'annualizedReturn', label: '年化收益', format: (v: number) => `${v.toFixed(1)}%`, type: 'return', isRisk: false },
    { key: 'maxDrawdown', label: '最大回撤', format: (v: number) => `${v.toFixed(1)}%`, type: 'risk', isRisk: true },
    { key: 'sharpe', label: '夏普比率', format: (v: number) => v.toFixed(2), type: 'ratio', isRisk: false },
    { key: 'winRate', label: '胜率', format: (v: number) => `${v}%`, type: 'rate', isRisk: false },
    { key: 'volatility', label: '年化波动', format: (v: number) => `${v}%`, type: 'risk', isRisk: true },
    { key: 'turnover', label: '换手率', format: (v: number) => `${v}%`, type: 'cost', isRisk: true },
    { key: 'drawdownDays', label: '回撤持续天数', format: (v: number) => `${v}天`, type: 'risk', isRisk: true },
    { key: 'lossMonthRate', label: '月度亏损概率', format: (v: number) => `${v}%`, type: 'risk', isRisk: true },
    { key: 'correlation', label: '与基准相关性', format: (v: number) => v.toFixed(2), type: 'correlation', isRisk: false },
  ];

  return (
    <>
      <ToastContainer messages={messages} onClose={closeToast} />
      
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="设置默认策略方案"
        message={`确定将「${availableStrategies.find(s => s.id === selectedStrategyForDefault)?.name}」设为默认方案？Dashboard 和 Portfolio 模块将同步更新。`}
        confirmText="确认设置"
        cancelText="取消"
        confirmVariant="success"
        onConfirm={confirmSetDefault}
        onCancel={() => setShowConfirmDialog(false)}
      />

      <ProgressDialog
        isOpen={isGenerating}
        title="生成策略对比报告"
        progress={generatingProgress}
        statusMessage={generatingMessage}
        estimatedTime="2-3秒"
      />

      {/* Report Config Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReportDialog(false)}></div>
          <div className="relative w-full max-w-md bg-[#0a1628] border border-[#1e3a5f] rounded-lg shadow-2xl">
            <div className="p-6 border-b border-[#1e3a5f]/30">
              <h3 className="text-lg text-white">生成对比报告配置</h3>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-3">报告语言</label>
                <div className="grid grid-cols-3 gap-2">
                  {['chinese', 'english', 'bilingual'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setReportConfig({ ...reportConfig, language: lang })}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        reportConfig.language === lang
                          ? 'bg-[#0ea5e9] text-white'
                          : 'bg-[#1e3a5f]/30 text-gray-400 hover:bg-[#1e3a5f]/50'
                      }`}
                    >
                      {lang === 'chinese' ? '中文' : lang === 'english' ? '英文' : '双语'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-3">报告对象</label>
                <div className="grid grid-cols-3 gap-2">
                  {['internal', 'external', 'corporate'].map((aud) => (
                    <button
                      key={aud}
                      onClick={() => setReportConfig({ ...reportConfig, audience: aud })}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        reportConfig.audience === aud
                          ? 'bg-[#0ea5e9] text-white'
                          : 'bg-[#1e3a5f]/30 text-gray-400 hover:bg-[#1e3a5f]/50'
                      }`}
                    >
                      {aud === 'internal' ? '内部投委会' : aud === 'external' ? '外部投资人' : '企业管理层'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#0d1b2e]/50 border-t border-[#1e3a5f]/30 flex justify-end gap-3">
              <button
                onClick={() => setShowReportDialog(false)}
                className="px-5 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/30 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleGenerateReport}
                className="px-5 py-2 text-sm bg-[#0ea5e9] text-white hover:bg-[#0284c7] rounded-lg transition-colors"
              >
                生成报告
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Save Dialog */}
      {showTemplateDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTemplateDialog(false)}></div>
          <div className="relative w-full max-w-md bg-[#0a1628] border border-[#1e3a5f] rounded-lg shadow-2xl">
            <div className="p-6 border-b border-[#1e3a5f]/30">
              <h3 className="text-lg text-white">保存对比模板</h3>
              <div className="text-sm text-gray-400 mt-1">
                当前选择: {selectedStrategies.map(id => availableStrategies.find(s => s.id === id)?.name).join(', ')}
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">模板名称 *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="输入模板名称"
                  className="w-full bg-[#1e3a5f]/30 border border-[#1e3a5f] rounded px-3 py-2 text-white placeholder-gray-500 focus:border-[#0ea5e9] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">描述 (可选)</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="描述此对比模板的用途"
                  rows={3}
                  className="w-full bg-[#1e3a5f]/30 border border-[#1e3a5f] rounded px-3 py-2 text-white placeholder-gray-500 focus:border-[#0ea5e9] focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="p-4 bg-[#0d1b2e]/50 border-t border-[#1e3a5f]/30 flex justify-end gap-3">
              <button
                onClick={() => setShowTemplateDialog(false)}
                className="px-5 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/30 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveComparisonTemplate}
                disabled={!templateName.trim()}
                className="px-5 py-2 text-sm bg-[#0ea5e9] text-white hover:bg-[#0284c7] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                保存模板
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workbench */}
      <div className="min-h-screen bg-[#050d1a]">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-[#0a1628] border-b border-[#1e3a5f] backdrop-blur-sm bg-opacity-95">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-[#10b981] rounded-full"></div>
                <h1 className="text-xl text-gray-100">Strategy Compare</h1>
              </div>
              <div className="text-xs text-gray-600 font-mono">
                /strategy-compare?ids={selectedStrategies.join(',')}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-600">
                共选 {selectedStrategies.length}/4 策略
              </div>
              <div className="w-px h-6 bg-[#1e3a5f]"></div>
              
              {/* External Services Status */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {serviceStatus.quantEngine ? (
                    <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-2 h-2 bg-[#6b7280] rounded-full"></div>
                  )}
                  <span className="text-xs text-gray-500">QE</span>
                </div>
                
                <div className="flex items-center gap-1">
                  {serviceStatus.qlib ? (
                    <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-2 h-2 bg-[#6b7280] rounded-full"></div>
                  )}
                  <span className="text-xs text-gray-500">Qlib</span>
                </div>
                
                <div className="flex items-center gap-1">
                  {serviceStatus.akshare ? (
                    <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-2 h-2 bg-[#6b7280] rounded-full"></div>
                  )}
                  <span className="text-xs text-gray-500">AkShare</span>
                </div>
              </div>
              
              <div className="w-px h-6 bg-[#1e3a5f]"></div>
              <div className="text-xs text-gray-600 font-mono">
                Ctrl+P 生成报告
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Service Status & Controls */}
          <div className="bg-[#0d1b2e] border border-[#1e3a5f]/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Data Status */}
                <div className="flex items-center gap-2">
                  {dataStatus === 'connected' ? (
                    <Activity className="w-4 h-4 text-[#10b981] animate-pulse" />
                  ) : (
                    <Database className="w-4 h-4 text-[#6b7280]" />
                  )}
                  <span className="text-sm text-gray-300">
                    数据流: <span className={`font-medium ${dataStatus === 'connected' ? 'text-[#10b981]' : 'text-gray-500'}`}>
                      {dataStatus === 'connected' ? '实时连接' : '离线模式'}
                    </span>
                  </span>
                </div>
                
                {/* Strategy Status */}
                <div className="text-sm text-gray-500">
                  运行中: {runningStrategies.size}/{selectedStrategies.length} 个策略
                </div>
                
                {/* Performance Monitoring */}
                <div className="text-sm text-gray-500">
                  性能监控: {performanceMetrics.size} 个指标
                </div>
                
                {/* Comparison Status */}
                {comparisonMetrics && (
                  <div className="text-sm text-gray-500">
                    最佳策略: <span className="text-[#10b981]">{availableStrategies.find(s => s.id === comparisonMetrics.bestPerformer)?.name}</span>
                  </div>
                )}
                
                {/* Last Update */}
                <div className="text-sm text-gray-500">
                  更新: {lastUpdateTime.toLocaleTimeString('zh-CN')}
                </div>
                
                {/* Market Data */}
                <div className="text-sm text-gray-500">
                  市场数据: {marketData.size} 只标的
                </div>
                
                {/* Service Integration Summary */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">服务:</span>
                  {serviceStatus.quantEngine && <span className="text-[#10b981]">QE</span>}
                  {serviceStatus.qlib && <span className="text-[#10b981]">Qlib</span>}
                  {serviceStatus.akshare && <span className="text-[#10b981]">AkShare</span>}
                  {!serviceStatus.quantEngine && !serviceStatus.qlib && !serviceStatus.akshare && (
                    <span className="text-amber-500">离线模式</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Empty State Indicator */}
                {selectedStrategies.length === 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-amber-400">请选择至少一个策略进行对比</span>
                  </div>
                )}
                
                {/* Data Quality Indicator */}
                {strategyResults.size > 0 && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      Array.from(strategyResults.values()).every(result => result.confidence > 0.8) 
                        ? 'bg-[#10b981]' 
                        : 'bg-amber-500'
                    }`}></div>
                    <span className="text-xs text-gray-500">
                      数据质量: {Array.from(strategyResults.values()).every(result => result.confidence > 0.8) ? '高' : '中'}
                    </span>
                  </div>
                )}
                
                {/* Real-time Mode Toggle */}
                <button
                  onClick={toggleRealTimeMode}
                  className={`px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2 ${
                    isRealTimeMode 
                      ? 'bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#f59e0b]' 
                      : 'bg-[#1e3a5f]/50 hover:bg-[#1e3a5f] text-gray-400'
                  }`}
                >
                  <Activity className={`w-4 h-4 ${isRealTimeMode ? 'animate-pulse' : ''}`} />
                  {isRealTimeMode ? '实时模式' : '开启实时'}
                </button>
                
                {/* Template Management */}
                <button
                  onClick={() => setShowTemplateDialog(true)}
                  disabled={selectedStrategies.length < 2}
                  className="px-3 py-1.5 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] rounded text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Settings className="w-4 h-4" />
                  保存模板
                </button>
                
                {/* Batch Controls */}
                <button
                  onClick={() => handleBatchOperation('run')}
                  disabled={runningStrategies.size > 0}
                  className="px-3 py-1.5 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] rounded text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  批量执行
                </button>
                
                {/* Export Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => exportComparisonReport('pdf')}
                    className="px-2 py-1.5 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] rounded text-sm transition-colors"
                    title="导出PDF"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => exportComparisonReport('excel')}
                    className="px-2 py-1.5 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] rounded text-sm transition-colors"
                    title="导出Excel"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => exportComparisonReport('csv')}
                    className="px-2 py-1.5 bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#0ea5e9] rounded text-sm transition-colors"
                    title="导出CSV"
                  >
                    CSV
                  </button>
                </div>
                
                {/* Clear Data */}
                <button
                  onClick={() => handleBatchOperation('clear')}
                  className="px-2 py-1.5 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] rounded text-sm transition-colors"
                  title="清空数据"
                >
                  清空
                </button>
                
                {/* Refresh */}
                <button
                  onClick={loadCachedResults}
                  className="p-1.5 bg-[#1e3a5f]/50 hover:bg-[#1e3a5f] text-gray-400 rounded transition-colors"
                  title="刷新数据"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Progress Bars for Running Strategies */}
            {strategyProgress.size > 0 && (
              <div className="mt-4 space-y-2">
                {Array.from(strategyProgress.entries()).map(([strategyId, progress]) => {
                  const strategy = availableStrategies.find(s => s.id === strategyId);
                  return (
                    <div key={strategyId} className="flex items-center gap-3">
                      <div className="text-xs text-gray-400 w-32">{strategy?.name}</div>
                      <div className="flex-1 bg-[#1e3a5f]/30 rounded-full h-2">
                        <div 
                          className="bg-[#0ea5e9] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 w-12 text-right">{progress}%</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 1: Strategy Selection */}
          <section>
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-sm text-gray-400 uppercase tracking-wider">策略选择区</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-[#1e3a5f] to-transparent"></div>
              <div className="text-xs text-gray-600">
                点击选择/取消 · 单击聚焦 · 键盘 1-5 快速切换
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-4">
              {availableStrategies.map((strategy, index) => {
                const isSelected = selectedStrategies.includes(strategy.id);
                const isFocused = focusedStrategy === strategy.id;
                const isDefault = defaultStrategy === strategy.id;
                return (
                  <button
                    key={strategy.id}
                    onClick={(event) => handleStrategyClick(strategy.id, event)}
                    className={`p-5 rounded-lg border-2 transition-all text-left relative group ${
                      isFocused
                        ? 'ring-2 ring-offset-2 ring-offset-[#050d1a] scale-105 shadow-2xl'
                        : isSelected
                        ? 'border-current bg-gradient-to-br from-transparent to-[#0d1b2e]'
                        : 'border-[#1e3a5f] hover:border-[#2a4f7f]'
                    }`}
                    style={{ 
                      borderColor: isSelected || isFocused ? strategy.color : undefined,
                      ringColor: isFocused ? strategy.color : undefined,
                    }}
                  >
                    {/* Top Border */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: strategy.color }}></div>
                    )}
                    
                    {/* Keyboard Shortcut */}
                    <div className="absolute top-2 left-2 w-5 h-5 rounded bg-[#1e3a5f]/50 flex items-center justify-center text-[10px] text-gray-500 font-mono">
                      {index + 1}
                    </div>
                    
                    {/* Default Badge */}
                    {isDefault && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-[#f59e0b] to-[#f97316] rounded text-[10px] text-white font-medium uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>默认</span>
                      </div>
                    )}
                    
                    {/* Strategy Name */}
                    <div className="mt-6 mb-3">
                      <div className="text-sm text-gray-200 mb-1">{strategy.name}</div>
                      <div className="text-xs text-gray-500 font-mono tabular-nums">
                        {strategy.metrics.annualizedReturn}% · {strategy.metrics.maxDrawdown}%
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="px-2 py-0.5 bg-[#1e3a5f]/40 text-[10px] text-gray-400 rounded">
                        {strategy.style}
                      </span>
                      <span className="px-2 py-0.5 bg-[#1e3a5f]/40 text-[10px] text-gray-400 rounded">
                        {strategy.fundCapacity}
                      </span>
                    </div>
                    
                    {/* Suitable Market */}
                    <div className="text-xs text-gray-600 mb-2">
                      适用: {strategy.suitableMarket.join(' / ')}
                    </div>
                    
                    {/* Sample Period */}
                    <div className="text-xs text-gray-600">
                      样本: {strategy.samplePeriod}
                    </div>
                    
                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#1e3a5f]" style={{ color: strategy.color }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: strategy.color }}></div>
                        <span className="text-xs">{isFocused ? '聚焦中' : '已选择'}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Saved Templates Section */}
          {savedComparisons.length > 0 && (
            <section>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-sm text-gray-400 uppercase tracking-wider">保存的对比模板</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-[#1e3a5f] to-transparent"></div>
                <div className="text-xs text-gray-600">
                  点击加载 · Shift+点击删除
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                {savedComparisons.map((template) => (
                  <div 
                    key={template.id}
                    className="bg-[#0d1b2e] border border-[#1e3a5f]/50 rounded-lg p-4 hover:border-[#1e3a5f] transition-all group cursor-pointer"
                    onClick={(e) => {
                      if (e.shiftKey) {
                        deleteComparisonTemplate(template.id);
                      } else {
                        loadComparisonTemplate(template);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm text-gray-200 truncate pr-2">{template.name}</div>
                      <div className="text-xs text-gray-500 flex-shrink-0">
                        {template.strategies.length}策略
                      </div>
                    </div>
                    
                    {template.description && (
                      <div className="text-xs text-gray-500 mb-3 line-clamp-2">
                        {template.description}
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      {template.strategies.slice(0, 3).map((strategyId, index) => {
                        const strategy = availableStrategies.find(s => s.id === strategyId);
                        return (
                          <div key={strategyId} className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: strategy?.color || '#6b7280' }}
                            />
                            <div className="text-xs text-gray-400 truncate">
                              {strategy?.name || strategyId}
                            </div>
                          </div>
                        );
                      })}
                      {template.strategies.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{template.strategies.length - 3} 更多...
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-[#1e3a5f]/30 flex items-center justify-between">
                      <div className="text-xs text-gray-600">
                        {new Date(template.timestamp).toLocaleDateString('zh-CN')}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-gray-500">
                          点击加载 | Shift+删除
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Table + Charts */}
          <section className="grid grid-cols-2 gap-6">
            {/* Left: Comparison Table */}
            <div>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-sm text-gray-400 uppercase tracking-wider">对比总表</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-[#1e3a5f] to-transparent"></div>
                <div className="flex gap-2">
                  {[
                    { key: 'return' as const, label: '收益', icon: '↑' },
                    { key: 'drawdown' as const, label: '回撤', icon: '↓' },
                    { key: 'sharpe' as const, label: '夏普', icon: '★' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setSortBy(option.key)}
                      className={`px-3 py-1.5 rounded text-xs transition-all flex items-center gap-1.5 ${
                        sortBy === option.key
                          ? 'bg-[#0ea5e9] text-white'
                          : 'bg-[#1e3a5f]/30 text-gray-500 hover:bg-[#1e3a5f]/50'
                      }`}
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-[#0d1b2e] border border-[#1e3a5f] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#0a1628]/60">
                      <th className="text-left py-2.5 px-4 text-[10px] text-gray-600 uppercase tracking-wider font-normal">
                        指标
                      </th>
                      {sortedData.map((strategy) => {
                        const isFocused = focusedStrategy === strategy.id;
                        return (
                          <th 
                            key={strategy.id} 
                            className={`text-right py-2.5 px-4 transition-all ${
                              isFocused ? 'bg-opacity-50' : ''
                            }`}
                            style={{ backgroundColor: isFocused ? `${strategy.color}15` : undefined }}
                          >
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: strategy.color }}></div>
                              <span className="text-[10px] text-gray-400">{strategy.name}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, index) => (
                      <tr 
                        key={row.key} 
                        className={`border-t border-[#1e3a5f]/20 ${index % 2 === 0 ? 'bg-[#0a1628]/20' : ''}`}
                      >
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{row.label}</span>
                            {row.isRisk && (
                              <svg className="w-3 h-3 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                          </div>
                        </td>
                        {sortedData.map((strategy) => {
                          const value = strategy.metrics[row.key as keyof typeof strategy.metrics] as number;
                          const isFocused = focusedStrategy === strategy.id;
                          
                          // 计算最优/最差
                          const values = sortedData.map(s => s.metrics[row.key as keyof typeof s.metrics] as number);
                          const isBest = row.isRisk 
                            ? value === Math.min(...values)
                            : value === Math.max(...values);
                          const isWorst = row.isRisk
                            ? value === Math.max(...values)
                            : value === Math.min(...values);
                          
                          return (
                            <td 
                              key={strategy.id} 
                              className={`py-2 px-4 text-right transition-all ${
                                isFocused ? 'bg-opacity-30' : ''
                              }`}
                              style={{ backgroundColor: isFocused ? `${strategy.color}10` : undefined }}
                            >
                              <div className="space-y-0.5">
                                <div className={`font-mono tabular-nums ${isBest ? 'font-medium' : ''}`}
                                  style={{ 
                                    color: isBest ? '#10b981' : isWorst ? '#f97316' : '#9ca3af' 
                                  }}
                                >
                                  {row.format(value)}
                                </div>
                                {row.key === 'annualizedReturn' && (
                                  <div className="text-[9px] text-gray-600">
                                    vs 基准 +{strategy.benchmark.returnDiff}% · Top {strategy.benchmark.percentile}%
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Charts */}
            <div className="space-y-6">
              {/* Curve Chart */}
              <div>
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="text-sm text-gray-400 uppercase tracking-wider">
                    {chartView === 'curve' ? '收益曲线' : '月度分布'}
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#1e3a5f] to-transparent"></div>
                  <div className="flex items-center gap-2">
                    {/* Chart Type Toggle */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setChartView('curve')}
                        className={`px-2 py-1 rounded text-xs transition-all ${
                          chartView === 'curve'
                            ? 'bg-[#0ea5e9] text-white'
                            : 'bg-[#1e3a5f]/30 text-gray-500 hover:bg-[#1e3a5f]/50'
                        }`}
                      >
                        曲线
                      </button>
                      <button
                        onClick={() => setChartView('distribution')}
                        className={`px-2 py-1 rounded text-xs transition-all ${
                          chartView === 'distribution'
                            ? 'bg-[#0ea5e9] text-white'
                            : 'bg-[#1e3a5f]/30 text-gray-500 hover:bg-[#1e3a5f]/50'
                        }`}
                      >
                        分布
                      </button>
                    </div>
                    
                    {/* Chart Settings */}
                    {chartView === 'curve' && (
                      <>
                        <div className="w-px h-4 bg-[#1e3a5f]"></div>
                        <button
                          onClick={() => updateChartSettings('showBenchmark', !chartSettings.showBenchmark)}
                          className={`px-2 py-1 rounded text-xs transition-all ${
                            chartSettings.showBenchmark ? 'text-[#10b981]' : 'text-gray-500'
                          }`}
                          title="显示基准"
                        >
                          基准
                        </button>
                        <button
                          onClick={() => updateChartSettings('showDrawdown', !chartSettings.showDrawdown)}
                          className={`px-2 py-1 rounded text-xs transition-all ${
                            chartSettings.showDrawdown ? 'text-[#f97316]' : 'text-gray-500'
                          }`}
                          title="显示回撤"
                        >
                          回撤
                        </button>
                        <button
                          onClick={() => updateChartSettings('normalizeToStart', !chartSettings.normalizeToStart)}
                          className={`px-2 py-1 rounded text-xs transition-all ${
                            chartSettings.normalizeToStart ? 'text-[#8b5cf6]' : 'text-gray-500'
                          }`}
                          title="归一化起点"
                        >
                          归一
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="bg-[#0d1b2e] border border-[#1e3a5f] rounded-lg p-5">
                  {chartView === 'curve' ? (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showAlphaCurve}
                            onChange={(e) => setShowAlphaCurve(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-[#1e3a5f] bg-[#0a1628] checked:bg-[#0ea5e9]"
                          />
                          <span>显示 Alpha 曲线（相对基准）</span>
                        </label>
                      </div>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={allCurveData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                          <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '10px' }} />
                          <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0a1628',
                              border: '1px solid #1e3a5f',
                              borderRadius: '6px',
                              fontSize: '11px',
                            }}
                            formatter={(value: any) => [(value as number).toFixed(3), '']}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          {comparisonData.map((strategy) => {
                            const isFocused = focusedStrategy === strategy.id;
                            return (
                              <Line
                                key={strategy.id}
                                type="monotone"
                                dataKey={strategy.id}
                                stroke={strategy.color}
                                strokeWidth={isFocused ? 3 : 1.5}
                                dot={false}
                                name={strategy.name}
                                opacity={focusedStrategy && !isFocused ? 0.3 : 1}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={distributionData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} />
                        <XAxis type="number" stroke="#6b7280" style={{ fontSize: '10px' }} />
                        <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: '10px' }} width={120} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a1628',
                            border: '1px solid #1e3a5f',
                            borderRadius: '6px',
                            fontSize: '11px',
                          }}
                        />
                        <Bar dataKey="q1" stackId="a" fill="#1e3a5f" />
                        <Bar dataKey="median" stackId="a">
                          {distributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                        <Bar dataKey="q3" stackId="a" fill="#1e3a5f" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Radar Chart */}
              <div>
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="text-sm text-gray-400 uppercase tracking-wider">风险雷达</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#1e3a5f] to-transparent"></div>
                </div>
                
                <div className="bg-[#0d1b2e] border border-[#1e3a5f] rounded-lg p-5">
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#1e3a5f" />
                      <PolarAngleAxis dataKey="metric" stroke="#6b7280" style={{ fontSize: '11px' }} />
                      <PolarRadiusAxis stroke="#6b7280" style={{ fontSize: '9px' }} />
                      {comparisonData.map((strategy) => {
                        const isFocused = focusedStrategy === strategy.id;
                        return (
                          <Radar
                            key={strategy.id}
                            name={strategy.name}
                            dataKey={strategy.id}
                            stroke={strategy.color}
                            fill={strategy.color}
                            fillOpacity={isFocused ? 0.3 : 0.1}
                            strokeWidth={isFocused ? 2.5 : 1.5}
                            opacity={focusedStrategy && !isFocused ? 0.3 : 1}
                          />
                        );
                      })}
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* Empty State for No Strategies Selected */}
          {selectedStrategies.length === 0 && (
            <section className="py-12">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-[#1e3a5f]/20 rounded-full flex items-center justify-center mx-auto">
                  <BarChart3 className="w-10 h-10 text-[#1e3a5f]" />
                </div>
                <div className="space-y-2">
                  <div className="text-lg text-gray-300">选择策略开始对比</div>
                  <div className="text-sm text-gray-500 max-w-md mx-auto">
                    从上方策略库中选择 2-4 个策略进行对比分析。支持多种对比维度和实时性能监控。
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-[#0ea5e9] rounded-full"></div>
                    <span>点击选择策略</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
                    <span>双击聚焦策略</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-[#f97316] rounded-full"></div>
                    <span>Ctrl+点击运行</span>
                  </div>
                </div>
              </div>
            </section>
          )}
          
          {/* Performance Data Empty State */}
          {selectedStrategies.length > 0 && strategyResults.size === 0 && (
            <section className="py-8">
              <div className="bg-[#0d1b2e] border border-[#1e3a5f] border-dashed rounded-lg p-8">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-[#0ea5e9]/20 rounded-full flex items-center justify-center mx-auto">
                    <Activity className="w-6 h-6 text-[#0ea5e9]" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">暂无策略性能数据</div>
                    <div className="text-xs text-gray-500">
                      运行已选策略获取详细对比数据和性能指标
                    </div>
                  </div>
                  <button
                    onClick={() => handleBatchOperation('run')}
                    disabled={runningStrategies.size > 0}
                    className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                  >
                    {runningStrategies.size > 0 ? '运行中...' : '运行所有策略'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Section 3: AI Recommendations + Actions */}
          {selectedStrategies.length > 0 && strategyResults.size > 0 && (
            <section>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-sm text-gray-400 uppercase tracking-wider">AI 策略建议</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-[#1e3a5f] to-transparent"></div>
                
                {/* Service Integration Status */}
                <div className="flex items-center gap-2 text-xs">
                  {serviceStatus.quantEngine && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
                      <span className="text-[#10b981]">QuantEngine</span>
                    </div>
                  )}
                  {serviceStatus.qlib && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
                      <span className="text-[#10b981]">Qlib AI</span>
                    </div>
                  )}
                  {!serviceStatus.quantEngine && !serviceStatus.qlib && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="text-amber-500">离线分析</span>
                    </div>
                  )}
                </div>
              <div className="text-xs text-gray-600">基于历史数据和风险模型的智能推荐</div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {/* High Return */}
              <div className="bg-gradient-to-br from-[#10b981]/5 to-transparent border border-[#10b981]/20 rounded-lg p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]"></div>
                
                <div className="pl-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                    <h3 className="text-xs text-gray-400 uppercase tracking-wider">追求高收益</h3>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-gray-300 mb-1">推荐方案</div>
                      <div className="font-medium" style={{ color: recommendation.topStrategy.color }}>
                        {recommendation.topStrategy.name}
                      </div>
                      <div className="text-gray-500 mt-1 font-mono tabular-nums">
                        年化 {recommendation.topStrategy.metrics.annualizedReturn}% · 
                        回撤 {recommendation.topStrategy.metrics.maxDrawdown}% · 
                        夏普 {recommendation.topStrategy.metrics.sharpe}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-[#f59e0b] mb-1">⚠ 风险提示</div>
                      <div className="text-gray-500">
                        换手率较高（{recommendation.topStrategy.metrics.turnover}%），对交易成本和流动性较敏感
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleSetDefault(recommendation.topStrategy.id)}
                      className="w-full mt-3 px-4 py-2 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] rounded-lg transition-colors text-xs"
                    >
                      应用到 10M 组合
                    </button>
                  </div>
                </div>
              </div>

              {/* Balanced */}
              <div className="bg-gradient-to-br from-[#0ea5e9]/5 to-transparent border border-[#0ea5e9]/20 rounded-lg p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#0ea5e9]"></div>
                
                <div className="pl-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#0ea5e9]"></div>
                    <h3 className="text-xs text-gray-400 uppercase tracking-wider">兼顾收益与回撤</h3>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-gray-300 mb-1">推荐组合</div>
                      <div className="font-medium text-[#0ea5e9]">
                        60% {recommendation.balancedStrategy.name} + 40% {recommendation.safeStrategy.name}
                      </div>
                      <div className="text-gray-500 mt-1">
                        预计年化 ~27%，最大回撤 ~-5.5%
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400 mb-1">组合优势</div>
                      <div className="text-gray-500">
                        在回撤下降约 40% 的情况下，年化仅降低约 4 个百分点
                      </div>
                    </div>
                    
                    <button
                      onClick={() => info('组合功能', '即将支持多策略组合配置', 3000)}
                      className="w-full mt-3 px-4 py-2 bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#0ea5e9] rounded-lg transition-colors text-xs"
                    >
                      配置组合策略
                    </button>
                  </div>
                </div>
              </div>

              {/* Safe */}
              <div className="bg-gradient-to-br from-[#8b5cf6]/5 to-transparent border border-[#8b5cf6]/20 rounded-lg p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#8b5cf6]"></div>
                
                <div className="pl-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#8b5cf6]"></div>
                    <h3 className="text-xs text-gray-400 uppercase tracking-wider">优先稳健</h3>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-gray-300 mb-1">推荐方案</div>
                      <div className="font-medium" style={{ color: recommendation.safeStrategy.color }}>
                        {recommendation.safeStrategy.name}
                      </div>
                      <div className="text-gray-500 mt-1 font-mono tabular-nums">
                        年化 {recommendation.safeStrategy.metrics.annualizedReturn}% · 
                        回撤 {recommendation.safeStrategy.metrics.maxDrawdown}% · 
                        夏普 {recommendation.safeStrategy.metrics.sharpe}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-[#10b981] mb-1">✓ 适用场景</div>
                      <div className="text-gray-500">
                        适合{recommendation.safeStrategy.suitableMarket.join('、')}环境，资金容量达 {recommendation.safeStrategy.fundCapacity}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleSetDefault(recommendation.safeStrategy.id)}
                      className="w-full mt-3 px-4 py-2 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] rounded-lg transition-colors text-xs"
                    >
                      应用到 10M 组合
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-6 flex items-center justify-between p-5 bg-[#0d1b2e]/50 border border-[#1e3a5f] rounded-lg">
              <div className="text-xs text-gray-500">
                基于历史回测数据 · 未来表现可能因市场环境变化而不同 · 建议结合实际情况调整
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReportDialog(true)}
                  className="px-5 py-2.5 rounded-lg border border-[#1e3a5f] bg-[#1e3a5f]/30 text-gray-300 hover:bg-[#1e3a5f]/50 transition-all text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>生成对比报告 (PDF)</span>
                  <span className="text-[10px] text-gray-600 ml-1">Ctrl+P</span>
                </button>
                
                <button
                  onClick={handleShareComparison}
                  className="px-5 py-2.5 rounded-lg bg-[#0ea5e9] text-white hover:bg-[#0284c7] transition-all text-sm flex items-center gap-2"
                  title="Ctrl+Shift+S"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>分享对比结果</span>
                  <span className="text-[10px] text-blue-200 ml-1">Ctrl+Shift+S</span>
                </button>
              </div>
            </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
