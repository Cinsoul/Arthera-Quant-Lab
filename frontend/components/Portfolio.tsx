import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { TrendingUp, Shield, Activity, Droplets, Layers, Settings, Plus, Trash2, Search, RefreshCw, Zap, Target, AlertTriangle, Download, Share2, Database, Play, Pause, RotateCcw, Bell, TrendingDown } from 'lucide-react';
import { 
  getPortfolioManagementService, 
  getMarketDataProvider,
  getStrategyExecutionService,
  getStrategyPerformanceMonitor,
  getRiskAnalysisService,
  getReportExportService,
  getAlertService,
  getCacheManager,
  getWorkspaceService,
  useMarketData,
  initializeServices,
  quantEngineService,
  qlibIntegrationService,
  tushareDataService,
  deepSeekSignalService,
  moduleCommunication,
  useModuleCommunication,
  configManager,
  type Portfolio as PortfolioType,
  type PortfolioTemplate,
  type OptimizationResult,
  type AdvancedRiskMetrics,
  type StrategyPerformanceMetrics,
  type RiskMetrics,
  type BacktestResult,
  type StrategyConfig,
  type MarketData,
  type Alert,
  type ExportFormat,
  type QlibModel,
  type Alpha158Factor,
  type RiskAssessment,
  type BayesianRiskParams,
  type BayesianPositionMetrics,
  type PositionRecommendation,
  type IntelligentPositionConfig,
  type SmartRebalanceResult,
  type MarketSignal,
  type MarketAnalysis,
  type DeepSeekConfig,
  type ModuleConnection,
  StockInfoService
} from '../services';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { cn } from './ui/utils';
import { Skeleton } from './ui/skeleton';
import { StrategyControlBar } from './figma/StrategyControlBar';
import { addDays, subYears, startOfYear } from 'date-fns';
import { useToast } from './Toast';

// ... (existing mock data) ...
const portfolioPerformanceMock = [
  { date: '2024-01', value: 10.00, benchmark: 10.00 },
  { date: '2024-02', value: 10.35, benchmark: 10.12 },
  { date: '2024-03', value: 10.82, benchmark: 10.18 },
  { date: '2024-04', value: 10.65, benchmark: 10.05 },
  { date: '2024-05', value: 11.23, benchmark: 10.32 },
  { date: '2024-06', value: 11.85, benchmark: 10.52 },
  { date: '2024-07', value: 11.58, benchmark: 10.45 },
  { date: '2024-08', value: 12.24, benchmark: 10.65 },
  { date: '2024-09', value: 12.84, benchmark: 10.85 },
  { date: '2024-10', value: 13.52, benchmark: 11.05 },
  { date: '2024-11', value: 14.25, benchmark: 11.25 },
  { date: '2024-12', value: 14.80, benchmark: 11.42 },
];
// ... rest of mocks
const healthRadarMock = [
  { metric: '收益', current: 85, target: 80 },
  { metric: '风险控制', current: 78, target: 75 },
  { metric: '集中度', current: 72, target: 70 },
  { metric: '流动性', current: 88, target: 85 },
  { metric: '风格平衡', current: 68, target: 65 },
];

const pnlSimulation = [
  { scenario: '当前价格', pnl: 0, probability: '当前' },
  { scenario: '+1%', pnl: 148, probability: '30%' },
  { scenario: '+3%', pnl: 444, probability: '15%' },
  { scenario: '+5%', pnl: 740, probability: '8%' },
  { scenario: '-1%', pnl: -148, probability: '28%' },
  { scenario: '-3%', pnl: -444, probability: '12%' },
  { scenario: '-5%', pnl: -740, probability: '7%' },
];

export function Portfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioType | null>(null);
  const [activeTab, setActiveTab] = useState<'backtest' | 'realtime' | 'quant' | 'bayesian'>('backtest');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [quantMetrics, setQuantMetrics] = useState<AdvancedRiskMetrics | null>(null);
  const [loadingQuant, setLoadingQuant] = useState(false);

  // Service Integration State
  const [performanceMetrics, setPerformanceMetrics] = useState<StrategyPerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // 价格提醒服务集成
  const [portfolioAlerts, setPortfolioAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertTriggerEvent[]>([]);

  // 初始化价格提醒服务连接
  useEffect(() => {
    const alertService = getAlertService();
    
    // 监听警报触发事件
    const unsubscribe = alertService.addEventListener('onAlertTriggered', (event: AlertTriggerEvent) => {
      setAlertHistory(prev => [event, ...prev.slice(0, 9)]);
      
      // 检查触发的警报是否与当前组合相关
      if (portfolio && portfolio.holdings.some(holding => holding.symbol === event.alert.symbol)) {
        // 如果是持仓股票的警报，可能需要调整持仓
        const affectedHolding = portfolio.holdings.find(h => h.symbol === event.alert.symbol);
        
        if (affectedHolding && event.alert.priority === 'critical') {
          // 对于严重警报，可以考虑风险控制
          console.log(`组合中 ${event.alert.symbol} 触发严重警报，建议关注风险`);
        }
      }
      
      // 通知模块通信系统
      moduleCommunication.emit('alert:portfolio', {
        symbol: event.alert.symbol,
        alertName: event.alert.name,
        portfolioId: portfolio?.id,
        module: 'portfolio'
      });
    });

    // 获取与组合相关的警报
    const allAlerts = alertService.getAllAlerts();
    const portfolioRelatedAlerts = allAlerts.filter(alert => 
      portfolio?.holdings.some(holding => holding.symbol === alert.symbol) ||
      alert.tags?.includes('portfolio')
    );
    setPortfolioAlerts(portfolioRelatedAlerts);

    return unsubscribe;
  }, [portfolio]);
  const [exportProgress, setExportProgress] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  // 外部服务状态
  const [serviceStatus, setServiceStatus] = useState({
    initialized: false,
    quantEngine: false,
    qlib: false,
    akshare: false,
    tushare: false,
    deepSeek: false
  });
  const [availableModels, setAvailableModels] = useState<QlibModel[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [portfolioFactors, setPortfolioFactors] = useState<Alpha158Factor[]>([]);

  // 贝叶斯风险控制状态
  const [bayesianMetrics, setBayesianMetrics] = useState<Map<string, BayesianPositionMetrics>>(new Map());
  const [positionRecommendations, setPositionRecommendations] = useState<PositionRecommendation[]>([]);
  const [intelligentConfig, setIntelligentConfig] = useState<IntelligentPositionConfig | null>(null);
  const [smartRebalanceResult, setSmartRebalanceResult] = useState<SmartRebalanceResult | null>(null);
  const [bayesianEnabled, setBayesianEnabled] = useState(true);

  // DeepSeek AI信号状态
  const [aiSignals, setAiSignals] = useState<MarketSignal[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);
  const [loadingAiSignals, setLoadingAiSignals] = useState(false);
  const [aiSignalsEnabled, setAiSignalsEnabled] = useState(true);

  // 模块间通信集成
  const {
    state: communicationState,
    applyStrategyToPortfolio,
    updateNavigationState,
    syncStrategyToComparison
  } = useModuleCommunication();

  // 配置管理状态
  const [portfolioConfig, setPortfolioConfig] = useState<any>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // 工作区服务集成状态
  const [workspaceService] = useState(() => getWorkspaceService());
  const [workspaceConnected, setWorkspaceConnected] = useState(false);
  const [realTimePortfolios, setRealTimePortfolios] = useState<PortfolioType[]>([]);
  const [enhancedPerformanceData, setEnhancedPerformanceData] = useState(portfolioPerformanceMock);

  // 实时数据集成
  const portfolioSymbols = ['600519', '300750', '000858', '600036', '002594', '601318', '000001', '000002'];
  const { data: realtimeData, status: dataStatus } = useMarketData(portfolioSymbols, { 
    enableLevel2: false,
    autoConnect: true 
  });
  
  // 生成增强的性能数据
  const generateEnhancedPerformanceData = useCallback(async (portfolio: PortfolioType) => {
    try {
      if (!portfolio || !portfolio.performanceHistory) {
        return portfolioPerformanceMock;
      }
      
      // 使用真实的组合历史性能数据
      return portfolio.performanceHistory.map((point: any, index: number) => ({
        date: point.date || `2024-${String(index + 1).padStart(2, '0')}`,
        value: point.portfolioValue || (10 + index * 0.4),
        benchmark: point.benchmarkValue || (10 + index * 0.12),
        pnl: point.dailyPnL || 0,
        return: point.dailyReturn || 0
      }));
    } catch (error) {
      console.error('Error generating enhanced performance data:', error);
      return portfolioPerformanceMock;
    }
  }, []);

  // Strategy Control State
  const [mode, setMode] = useState("backtest");
  const [strategy, setStrategy] = useState("high_vol_alpha");
  const [benchmark, setBenchmark] = useState("csi300");
  const [timeFrame, setTimeFrame] = useState<'YTD' | '1Y' | '3Y' | 'Custom'>('1Y');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subYears(new Date(), 1),
    to: new Date()
  });

  // Handle TimeFrame Changes
  const handleTimeFrameChange = (tf: 'YTD' | '1Y' | '3Y' | 'Custom') => {
    setTimeFrame(tf);
    const today = new Date();
    let from = dateRange.from;
    
    switch (tf) {
        case 'YTD': from = startOfYear(today); break;
        case '1Y': from = subYears(today, 1); break;
        case '3Y': from = subYears(today, 3); break;
        default: break; // Custom keeps existing or manual set
    }
    setDateRange({ from, to: today });
    refreshQuantMetrics(); // Trigger reload
  };

  const handleBenchmarkChange = (val: string) => {
    setBenchmark(val);
    refreshQuantMetrics();
  };

  // 辅助函数：转换股票代码为Tushare格式
  const convertToTushareCode = (symbol: string): string => {
    // 移除任何可能的后缀
    const cleanSymbol = symbol.replace(/\.(SH|SZ|BJ)$/i, '');
    
    // 根据股票代码判断交易所
    if (cleanSymbol.startsWith('6') || cleanSymbol.startsWith('9')) {
      return `${cleanSymbol}.SH`; // 上海证券交易所
    } else if (cleanSymbol.startsWith('0') || cleanSymbol.startsWith('2') || cleanSymbol.startsWith('3')) {
      return `${cleanSymbol}.SZ`; // 深圳证券交易所
    } else if (cleanSymbol.startsWith('4') || cleanSymbol.startsWith('8')) {
      return `${cleanSymbol}.BJ`; // 北京证券交易所
    }
    
    // 默认返回原代码加上.SH
    return `${cleanSymbol}.SH`;
  };

  // 贝叶斯风险控制初始化
  const initializeBayesianAnalysis = useCallback(async (portfolio: PortfolioType, portfolioService: any) => {
    try {
      console.log('[Portfolio] Initializing Bayesian risk analysis...');
      
      // 获取真实市场数据，优先使用Tushare，然后是其他数据源
      const marketData = new Map();
      
      for (const holding of portfolio.holdings) {
        let price = holding.currentPrice;
        let returns: number[] = [];
        let volatility = 0.02;
        let fundamentalData = undefined;

        try {
          // 尝试从Tushare获取真实数据
          if (serviceStatus.tushare) {
            console.log(`[Bayesian] Fetching real data for ${holding.symbol} from Tushare...`);
            
            // 将股票代码转换为Tushare格式 (例如: 600519 -> 600519.SH)
            const tsCode = convertToTushareCode(holding.symbol);
            
            // 获取过去60个交易日的数据
            const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const startDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
            
            const [dailyData, dailyBasicData] = await Promise.all([
              tushareDataService.getDailyData(tsCode, startDate, endDate),
              tushareDataService.getDailyBasic(tsCode, endDate, endDate) // 获取最新基本面数据
            ]);
            
            if (dailyData.length > 1) {
              // 计算日收益率
              returns = [];
              for (let i = 1; i < dailyData.length; i++) {
                const prevClose = dailyData[i-1].close;
                const currentClose = dailyData[i].close;
                const dailyReturn = (currentClose - prevClose) / prevClose;
                returns.push(dailyReturn);
              }
              
              // 使用最新价格
              price = dailyData[dailyData.length - 1].close;
              
              // 计算历史波动率
              if (returns.length > 0) {
                const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
                const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
                volatility = Math.sqrt(variance);
              }
              
              // 获取基本面数据
              if (dailyBasicData.length > 0) {
                const latest = dailyBasicData[0];
                fundamentalData = {
                  pe: latest.pe,
                  pb: latest.pb,
                  roe: latest.total_share ? latest.total_mv / latest.total_share : undefined,
                  grossMargin: latest.turnover_rate // 简化处理
                };
              }
              
              console.log(`✅ [Bayesian] Got ${returns.length} days of data + fundamentals for ${holding.symbol}`);
            } else {
              throw new Error('Insufficient data from Tushare');
            }
          } else {
            throw new Error('Tushare service not available');
          }
        } catch (error) {
          // 回退到模拟数据
          console.warn(`[Bayesian] Failed to get real data for ${holding.symbol}, using simulated data:`, error);
          returns = Array.from({length: 60}, () => (Math.random() - 0.5) * 0.04);
          volatility = Math.random() * 0.03 + 0.01;
        }

        marketData.set(holding.symbol, {
          price,
          returns,
          volatility,
          fundamentalData // 添加基本面数据
        });
      }

      if (!intelligentConfig) return;

      // 生成智能仓位推荐
      const recommendations = portfolioService.generateIntelligentPositionRecommendations(
        portfolio,
        mockMarketData,
        intelligentConfig
      );
      setPositionRecommendations(recommendations);

      // 执行智能再平衡分析
      const rebalanceResult = portfolioService.performSmartRebalance(
        portfolio,
        mockMarketData,
        intelligentConfig
      );
      setSmartRebalanceResult(rebalanceResult);

      console.log('✅ Bayesian analysis initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Bayesian analysis:', error);
    }
  }, [intelligentConfig, bayesianEnabled]);

  // DeepSeek AI信号生成
  const generateFallbackSignals = (portfolio: PortfolioType): MarketSignal[] =>
    portfolio.holdings.map((holding) => {
      const currentPrice = holding.currentPrice ?? holding.avgCost ?? 0;
      const positionSize = holding.marketValue ?? currentPrice * (holding.quantity ?? 0);
      return {
        symbol: holding.symbol,
        signal: 'HOLD' as const,
        confidence: 0.55,
        expectedReturn: 0,
        timeHorizon: '短期',
        reasoning: 'AI服务暂不可用，建议保持当前仓位',
        riskLevel: 'MEDIUM' as const,
        entryPrice: currentPrice || undefined,
        stopLoss: currentPrice ? currentPrice * 0.95 : undefined,
        takeProfit: currentPrice ? currentPrice * 1.05 : undefined,
        positionSize: positionSize || currentPrice * 100,
        timestamp: new Date()
      };
    });

  const fetchAiSignals = useCallback(async (portfolio: PortfolioType) => {
    if (!aiSignalsEnabled) return;
    
    try {
      console.log('[Portfolio] Fetching DeepSeek AI signals...');
      setLoadingAiSignals(true);

      // 获取组合持仓的股票代码
      const symbols = portfolio.holdings.map(holding => holding.symbol);
      
      // 构建市场数据映射（用于AI分析）
      const marketDataMap = new Map();
      
      // 尝试从Tushare获取真实数据
      for (const symbol of symbols) {
        try {
          const tsCode = convertToTushareCode(symbol);
          const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
          
          const [dailyData, dailyBasic] = await Promise.all([
            tushareDataService.getDailyData(tsCode, startDate, endDate),
            tushareDataService.getDailyBasic(tsCode, endDate, endDate)
          ]);
          
          if (dailyData.length > 0) {
            const latest = dailyData[dailyData.length - 1];
            const prev = dailyData[dailyData.length - 2];
            const changePercent = prev ? ((latest.close - prev.close) / prev.close) * 100 : 0;
            
            // 计算技术指标（简化版）
            const prices = dailyData.slice(-20).map(d => d.close);
            const ma20 = prices.reduce((sum, price) => sum + price, 0) / prices.length;
            
            marketDataMap.set(symbol, {
              price: latest.close,
              changePercent,
              volume: latest.vol,
              ma20,
              rsi: 50 + Math.random() * 30, // 简化版RSI
              macd: Math.random() - 0.5, // 简化版MACD
              fundamentalData: dailyBasic.length > 0 ? {
                pe: dailyBasic[0].pe,
                pb: dailyBasic[0].pb,
                roe: dailyBasic[0].turnover_rate
              } : undefined
            });
          }
        } catch (error) {
          console.warn(`Failed to get data for ${symbol}:`, error);
          // 使用模拟数据作为后备
          marketDataMap.set(symbol, {
            price: 50 + Math.random() * 100,
            changePercent: (Math.random() - 0.5) * 10,
            volume: Math.random() * 1000000,
            ma20: 50 + Math.random() * 100,
            rsi: 30 + Math.random() * 40,
            macd: (Math.random() - 0.5) * 2
          });
        }
      }

      // 生成AI信号
      let signals: MarketSignal[];
      if (serviceStatus.deepSeek) {
        try {
          signals = await deepSeekSignalService.generateBatchSignals(symbols, marketDataMap);
        } catch (signalError) {
          console.warn('[Portfolio] DeepSeek signals unavailable, using fallback:', signalError);
          signals = generateFallbackSignals(portfolio);
        }
      } else {
        signals = generateFallbackSignals(portfolio);
      }
      setAiSignals(signals);

      // 生成市场整体分析
      const sectorData = [
        { name: '科技', changePercent: Math.random() * 4 - 2 },
        { name: '医药', changePercent: Math.random() * 4 - 2 },
        { name: '消费', changePercent: Math.random() * 4 - 2 },
        { name: '金融', changePercent: Math.random() * 4 - 2 },
      ];
      
      const marketOverview = {
        sh: { price: 3200, changePercent: Math.random() * 2 - 1 },
        sz: { price: 11000, changePercent: Math.random() * 2 - 1 },
        cy: { price: 2300, changePercent: Math.random() * 2 - 1 }
      };

      if (serviceStatus.deepSeek) {
        try {
          const analysis = await deepSeekSignalService.generateMarketAnalysis(marketOverview, sectorData);
          setMarketAnalysis(analysis);
        } catch (analysisError) {
          console.warn('[Portfolio] DeepSeek market analysis unavailable, using fallback:', analysisError);
          setMarketAnalysis({
            summary: 'AI分析暂不可用，使用历史表现估计',
            opportunities: [],
            risks: []
          } as any);
        }
      } else {
        setMarketAnalysis({
          summary: 'AI分析未启用，使用历史表现估计',
          opportunities: [],
          risks: []
        } as any);
      }

      console.log('✅ AI signals processed:', { signals: signals.length, deepSeek: serviceStatus.deepSeek });
    } catch (error) {
      console.error('❌ Failed to fetch AI signals:', error);
      setAiSignals(generateFallbackSignals(portfolio));
    } finally {
      setLoadingAiSignals(false);
    }
  }, [aiSignalsEnabled, serviceStatus.deepSeek]);

  // AI信号定时更新
  useEffect(() => {
    if (aiSignalsEnabled && portfolio && serviceStatus.initialized) {
      fetchAiSignals(portfolio);
      
      // 每30分钟更新一次AI信号
      const interval = setInterval(() => {
        fetchAiSignals(portfolio);
      }, 30 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [portfolio, aiSignalsEnabled, serviceStatus.initialized, fetchAiSignals]);

  // Initialize services and portfolio
  useEffect(() => {
    let isCancelled = false;
    
    const bootstrapServices = async () => {
      try {
        console.log('[Portfolio] Starting service initialization...');
        if (!isCancelled) {
          setConnectionStatus('connecting');
        }
        
        // 1. 初始化统一服务管理器
        const serviceResults = await initializeServices({
          enableRealData: true,
          enableWebSocket: true,
          enableAkShare: true,
          modules: ['portfolio', 'quantEngine', 'qlib']
        });
        
        if (!isCancelled) {
          setServiceStatus({
            initialized: serviceResults.success,
            quantEngine: serviceResults.initResults?.quantEngine || false,
            qlib: serviceResults.initResults?.qlib || false,
            akshare: serviceResults.initResults?.akshare || false,
            tushare: serviceResults.initResults?.tushare || false,
            deepSeek: serviceResults.initResults?.deepSeek || false
          });
        }

        // 2. 如果Qlib可用，获取可用模型
        if (serviceResults.initResults?.qlib && !isCancelled) {
          try {
            const models = await qlibIntegrationService.getTrainedModels();
            setAvailableModels(models);
            console.log('✅ Loaded Qlib models for Portfolio:', models.length);
          } catch (error) {
            console.error('Failed to get Qlib models:', error);
          }
        }
        
        console.log('✅ Portfolio external services initialized:', serviceResults);
        
        // 3. Initialize core services one by one with error tracking and cancellation checks
        console.log('[Portfolio] Getting portfolio service...');
        const portfolioService = getPortfolioManagementService();
        if (isCancelled) return;
        
        console.log('[Portfolio] Getting strategy monitor...');
        const strategyMonitor = getStrategyPerformanceMonitor();
        if (isCancelled) return;
        
        console.log('[Portfolio] Getting alert service...');
        const alertService = getAlertService();
        if (isCancelled) return;
        
        console.log('[Portfolio] Getting cache manager...');
        const cacheManager = getCacheManager();
        if (isCancelled) return;
        
        // Initialize strategy monitor if not already done
        console.log('[Portfolio] Initializing strategy monitor...');
        try {
          await strategyMonitor.initialize();
          if (isCancelled) return;
        } catch (monitorError) {
          console.warn('[Portfolio] Strategy monitor initialization failed, continuing without it:', monitorError);
        }
        
        // Get current portfolio
        console.log('[Portfolio] Getting current portfolio...');
        const current = portfolioService.getCurrentPortfolio();
        console.log('[Portfolio] Current portfolio:', current);
        if (!isCancelled) {
          setPortfolio(current);
          
          // Initialize intelligent position config based on risk profile
          const defaultConfig = portfolioService.getDefaultIntelligentConfig('balanced');
          setIntelligentConfig(defaultConfig);
          
          // Initialize Bayesian analysis if enabled
          if (bayesianEnabled && current) {
            initializeBayesianAnalysis(current, portfolioService);
          }
        }
        
        // Load cached alerts with error handling
        try {
          let cachedAlerts: Alert[] = [];
          if (typeof (alertService as any).getAlerts === 'function') {
            cachedAlerts = await (alertService as any).getAlerts({ type: 'portfolio' });
          } else {
            cachedAlerts = alertService.getAllAlerts().filter(alert => alert.tags?.includes('portfolio'));
          }
          if (!isCancelled) {
            setAlerts(cachedAlerts.slice(0, 5));
          }
        } catch (alertError) {
          console.warn('[Portfolio] Failed to load alerts, continuing without them:', alertError);
        }
        
        // Setup performance monitoring for portfolio strategies
        if (current && current.strategies?.length > 0 && !isCancelled) {
          try {
            const subscription = strategyMonitor.subscribeToPerformance(
              current.strategies.map(s => s.id),
              'realtime',
              (metrics) => {
                if (metrics.length > 0 && !isCancelled) {
                  setPerformanceMetrics(metrics[0]); // Use first strategy for demo
                }
              }
            );
            
            // Store subscription ID for cleanup
            await cacheManager.set('portfolio-perf-subscription', 'active', subscription);
          } catch (perfError) {
            console.warn('[Portfolio] Failed to setup performance monitoring:', perfError);
          }
        }
        
        // Initial fetch of quant metrics
        if (current && !isCancelled) {
          setLoadingQuant(true);
          try {
            const data = await portfolioService.getAdvancedRiskAnalysis(current);
            if (!isCancelled) {
              setQuantMetrics(data);
            }
          } catch (quantError) {
            console.warn('[Portfolio] Failed to load quant metrics:', quantError);
          } finally {
            if (!isCancelled) {
              setLoadingQuant(false);
            }
          }
        }
        
        if (!isCancelled) {
          setConnectionStatus('connected');
          console.log('[Portfolio] Services initialized successfully');
        }
        
      } catch (error) {
        console.error('[Portfolio] Service initialization failed:', error);
        if (!isCancelled) {
          setConnectionStatus('disconnected');
        }
        
        // 设置默认组合数据，确保组件能正常显示
        const defaultPortfolio: PortfolioType = {
          id: 'default-portfolio',
          name: '默认组合',
          description: '系统默认组合',
          totalValue: 1000000,
          cash: 200000,
          positions: [
            {
              symbol: '600519',
              name: '贵州茅台',
              quantity: 100,
              averageCost: 1800,
              currentPrice: 1850,
              marketValue: 185000,
              unrealizedPnL: 5000,
              weight: 0.185,
            },
            {
              symbol: '000858',
              name: '五粮液',
              quantity: 200,
              averageCost: 120,
              currentPrice: 125,
              marketValue: 25000,
              unrealizedPnL: 1000,
              weight: 0.025,
            }
          ],
          performance: {
            totalReturn: 0.08,
            dailyReturn: 0.012,
            volatility: 0.18,
            sharpeRatio: 0.85,
            maxDrawdown: 0.05,
            beta: 0.95,
          },
          lastUpdated: new Date()
        };
        setPortfolio(defaultPortfolio);
      }
    };

    bootstrapServices();
    
    // Cleanup on unmount
    return () => {
      isCancelled = true;
      
      const cleanup = async () => {
        try {
          const cacheManager = getCacheManager();
          const strategyMonitor = getStrategyPerformanceMonitor();
          
          const subscriptionId = await cacheManager.get('portfolio-perf-subscription', 'active');
          if (subscriptionId) {
            strategyMonitor.unsubscribeFromPerformance(subscriptionId);
            cacheManager.delete('portfolio-perf-subscription', 'active');
          }
        } catch (cleanupError) {
          console.warn('[Portfolio] Cleanup failed:', cleanupError);
        }
      };
      cleanup();
    };
  }, []);

  // 工作区服务连接和组合数据同步
  useEffect(() => {
    // 定义事件监听器在外层作用域
    let workspaceListener: any;
    let portfolioListener: any;
    let dataLoadedListener: any;
    
    const connectToWorkspace = async () => {
      try {
        // 监听工作区事件
        const handleWorkspacePortfolioData = (data: any) => {
          console.log('[Portfolio] Received workspace portfolio data:', data);
          
          // 更新组合配置
          if (data.portfolioId && data.realTimeUpdate) {
            setWorkspaceConnected(true);
            // 触发组合数据刷新
            loadPortfolioData();
          }
        };

        // 监听模块通信事件
        workspaceListener = (event: any) => handleWorkspacePortfolioData(event.detail);
        portfolioListener = (event: any) => {
          // 处理组合更新事件
          const data = event.detail;
          if (data.event && data.event.portfolio) {
            setPortfolio(data.event.portfolio);
            setRealTimePortfolios(prev => {
              const updated = prev.filter(p => p.id !== data.event.portfolio.id);
              return [data.event.portfolio, ...updated];
            });
          }
        };
        
        moduleCommunication.addEventListener('workspace:portfolio:connected', workspaceListener);
        moduleCommunication.addEventListener('data:portfolio:updated', portfolioListener);
        
        // 监听组合数据加载事件
        dataLoadedListener = (event: any) => {
          console.log('📊 Received portfolio data:', event);
          if (event.portfolioId && event.assets) {
            const mockPortfolio: PortfolioType = {
              id: event.portfolioId,
              name: '量化策略组合',
              assets: event.assets,
              totalValue: event.assets.reduce((sum: number, a: any) => sum + (a.shares * a.avgCost), 0),
              cash: 1000000,
              performanceHistory: portfolioPerformanceMock
            };
            setPortfolio(mockPortfolio);
            setRealTimePortfolios([mockPortfolio]);
          }
        };
        moduleCommunication.addEventListener('portfolio:data:loaded', dataLoadedListener);

        // 获取实时组合数据
        const cacheManager = getCacheManager();
        const portfolioService = getPortfolioManagementService();
        
        // 尝试从缓存获取，如果失败则获取实时数据
        let currentPortfolio = await cacheManager.get('portfolio-current', 'snapshot');
        if (!currentPortfolio) {
          currentPortfolio = portfolioService.getCurrentPortfolio();
          await cacheManager.set('portfolio-current', 'snapshot', currentPortfolio, 60); // 缓存60秒
        }
        
        if (currentPortfolio) {
          setRealTimePortfolios([currentPortfolio]);
          // 设置主要组合
          if (!portfolio) {
            setPortfolio(currentPortfolio);
          }
          
          // 生成增强的性能数据
          const enhancedData = await generateEnhancedPerformanceData(currentPortfolio);
          setEnhancedPerformanceData(enhancedData);
        }

        // 获取组合相关的实时指标
        if (portfolio) {
          const riskService = getRiskAnalysisService();
          const riskMetrics = await riskService.calculateRiskMetrics(portfolio.id);
          
          if (riskMetrics) {
            setQuantMetrics({
              ...quantMetrics,
              sharpeRatio: riskMetrics.sharpeRatio,
              beta: riskMetrics.beta,
              maxDrawdown: riskMetrics.maxDrawdown,
              volatility: riskMetrics.volatility
            });
          }
        }

        console.log('✅ Portfolio connected to workspace services with real data');
        
      } catch (error) {
        console.error('❌ Portfolio workspace connection failed:', error);
      }
    };

    // 组合数据加载函数
    const loadPortfolioData = async () => {
      try {
        const portfolioService = getPortfolioManagementService();
        const currentPortfolio = portfolioService.getCurrentPortfolio();
        
        if (currentPortfolio) {
          setRealTimePortfolios([currentPortfolio]);
          if (!portfolio) {
            setPortfolio(currentPortfolio);
          }
        } else {
          // 如果没有真实数据，使用模拟数据
          const mockPortfolio: PortfolioType = {
            id: 'default',
            name: '量化策略组合',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assets: [
              { symbol: '600519', shares: 1000, avgCost: 1680.5 },
              { symbol: '300750', shares: 500, avgCost: 345.2 },
              { symbol: '000858', shares: 2000, avgCost: 85.6 }
            ],
            totalValue: 5682456.78,
            cash: 1000000
          };
          setRealTimePortfolios([mockPortfolio]);
          setPortfolio(mockPortfolio);
        }
      } catch (error) {
        console.error('Failed to load portfolio data:', error);
      }
    };

    connectToWorkspace();
    
    // 设置定时刷新组合数据
    const refreshInterval = setInterval(() => {
      if (workspaceConnected && portfolio) {
        loadPortfolioData();
      }
    }, 30000); // 每30秒刷新一次组合数据

    return () => {
      if (workspaceListener) {
        moduleCommunication.removeEventListener('workspace:portfolio:connected', workspaceListener);
      }
      if (portfolioListener) {
        moduleCommunication.removeEventListener('data:portfolio:updated', portfolioListener);
      }
      if (dataLoadedListener) {
        moduleCommunication.removeEventListener('portfolio:data:loaded', dataLoadedListener);
      }
      clearInterval(refreshInterval);
    };
  }, [workspaceConnected, portfolio]);

  // 配置管理 - 加载和保存组合配置
  useEffect(() => {
    const loadPortfolioConfig = async () => {
      try {
        const savedConfig = await configManager.loadConfig('portfolio_settings', {
          activeTab: 'backtest',
          bayesianEnabled: true,
          aiSignalsEnabled: true,
          autoRefresh: true,
          refreshInterval: 5000
        });
        
        setPortfolioConfig(savedConfig);
        setActiveTab(savedConfig.activeTab || 'backtest');
        setBayesianEnabled(savedConfig.bayesianEnabled !== false);
        setAiSignalsEnabled(savedConfig.aiSignalsEnabled !== false);
        setConfigLoaded(true);
        
        console.log('📁 Portfolio configuration loaded:', savedConfig);
      } catch (error) {
        console.error('Failed to load portfolio configuration:', error);
        setConfigLoaded(true);
      }
    };

    loadPortfolioConfig();
  }, []);

  // 模块间通信监听
  useEffect(() => {
    // 监听来自策略实验室的策略应用请求
    const handleStrategyApplied = (event: CustomEvent) => {
      const { strategy, config } = event.detail;
      console.log('🔄 Portfolio received strategy from Lab:', strategy);
      
      if (portfolio && strategy) {
        // 更新组合配置
        setStrategy(strategy.id || strategy.name);
        
        // 如果有具体配置，应用到组合
        if (config) {
          // 这里可以根据策略配置更新组合设置
          console.log('📋 Applying strategy config to portfolio:', config);
        }

        // 通知用户
        console.log(`✅ 策略 ${strategy.name} 已应用到组合`);
      }
    };

    // 监听来自策略对比的策略选择
    const handleComparisonStrategySelected = (event: CustomEvent) => {
      const { strategy } = event.detail;
      console.log('⚖️ Portfolio received strategy from Comparison:', strategy);
      
      if (strategy) {
        setStrategy(strategy.id);
        console.log(`📊 选择对比策略 ${strategy.name} 应用到组合`);
      }
    };

    // 监听导航状态更新
    const handleNavigationUpdate = (event: CustomEvent) => {
      const { navigationState } = event.detail;
      if (navigationState.currentModule === 'portfolio') {
        updateNavigationState('portfolio', {
          portfolioId: portfolio?.id,
          activeTab,
          lastAccess: Date.now()
        });
      }
    };

    moduleCommunication.addEventListener('strategy:apply-to-portfolio', handleStrategyApplied);
    moduleCommunication.addEventListener('comparison:strategy-synced', handleComparisonStrategySelected);
    moduleCommunication.addEventListener('navigation:state-updated', handleNavigationUpdate);

    return () => {
      moduleCommunication.removeEventListener('strategy:apply-to-portfolio', handleStrategyApplied);
      moduleCommunication.removeEventListener('comparison:strategy-synced', handleComparisonStrategySelected);
      moduleCommunication.removeEventListener('navigation:state-updated', handleNavigationUpdate);
    };
  }, [portfolio, activeTab, strategy]);

  // 配置保存 - 当配置改变时自动保存
  useEffect(() => {
    if (configLoaded && portfolioConfig) {
      const saveConfig = async () => {
        try {
          const updatedConfig = {
            ...portfolioConfig,
            activeTab,
            bayesianEnabled,
            aiSignalsEnabled,
            lastUpdated: Date.now()
          };
          
          await configManager.saveConfig('portfolio_settings', updatedConfig);
          setPortfolioConfig(updatedConfig);
        } catch (error) {
          console.error('Failed to save portfolio configuration:', error);
        }
      };

      const timeoutId = setTimeout(saveConfig, 1000); // 防抖保存
      return () => clearTimeout(timeoutId);
    }
  }, [configLoaded, portfolioConfig, activeTab, bayesianEnabled, aiSignalsEnabled]);

  // Export functionality
  const handleExportReport = async (format: ExportFormat) => {
    if (!portfolio) return;
    
    try {
      setIsExporting(true);
      setExportProgress(0);
      
      const reportService = getReportExportService();
      const alertService = getAlertService();
      
      // Progress simulation
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 20, 90));
      }, 300);
      
      const reportConfig: ReportConfig = {
        title: `Portfolio Report - ${portfolio.name}`,
        portfolioId: portfolio.id,
        includeCharts: true,
        includeRiskAnalysis: true,
        includeHoldings: true,
        timeRange: {
          start: dateRange.from,
          end: dateRange.to
        },
        metadata: {
          generatedBy: 'Portfolio Management System',
          timestamp: new Date(),
          version: '1.0'
        }
      };
      
      const result = await reportService.generateReport(reportConfig);
      await reportService.downloadFile(result.filePath, `portfolio-${portfolio.name.replace(/\s+/g, '-').toLowerCase()}.${format}`);
      
      // 通知报告中心有新的组合报告
      moduleCommunication.dispatchEvent(new CustomEvent('portfolio:report-requested', {
        detail: {
          portfolio: {
            id: portfolio.id,
            name: portfolio.name,
            reportConfig: reportConfig,
            result: result
          }
        }
      }));
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      // Create success alert
      alertService.addAlert({
        id: `export-${Date.now()}`,
        title: 'Report Export Successful',
        message: `Portfolio report exported as ${format.toUpperCase()}`,
        type: 'info',
        priority: 'low',
        timestamp: new Date(),
        read: false,
        actionRequired: false
      });
      
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
      
    } catch (error) {
      console.error('[Portfolio] Export failed:', error);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const refreshQuantMetrics = async () => {
    if (!portfolio) return;
    setLoadingQuant(true);
    
    try {
      // 1. 如果QuantEngine可用，使用其风险评估服务
      if (serviceStatus.quantEngine) {
        console.log('🧮 Using QuantEngine for portfolio risk assessment...');
        
        // 构建组合权重映射
        const portfolioWeights: Record<string, number> = {};
        let totalValue = 0;
        portfolio.holdings.forEach(holding => {
          totalValue += holding.marketValue;
        });
        portfolio.holdings.forEach(holding => {
          portfolioWeights[holding.symbol] = holding.marketValue / totalValue;
        });
        
        try {
          const riskAssess = await quantEngineService.assessRisk(portfolioWeights);
          setRiskAssessment(riskAssess);
          
          // 获取Alpha158因子
          const symbols = portfolio.holdings.map(h => h.symbol).slice(0, 5); // 限制数量
          const factors = await quantEngineService.calculateAlpha158Factors(
            symbols,
            '2024-11-01',
            '2024-12-10'
          );
          
          // 汇总因子
          const allFactors = Object.values(factors).flat();
          setPortfolioFactors(allFactors);
          
          console.log('✅ QuantEngine risk assessment completed');
        } catch (error) {
          console.error('QuantEngine risk assessment failed, using local:', error);
          // 降级到本地服务
          await useLocalRiskAnalysis();
        }
      } else {
        // 使用本地风险分析
        await useLocalRiskAnalysis();
      }
      
      async function useLocalRiskAnalysis() {
        const service = getPortfolioManagementService();
        // Simulate network delay for realism
        setTimeout(() => {
          service.getAdvancedRiskAnalysis(portfolio).then(data => {
            setQuantMetrics(data);
            setLoadingQuant(false);
          });
        }, 600);
      }
      
    } catch (error) {
      console.error('Portfolio risk analysis failed:', error);
      setLoadingQuant(false);
    }
  };

  // Portfolio rebalancing functionality
  const handleRebalancePortfolio = async () => {
    if (!portfolio) return;
    
    try {
      const portfolioService = getPortfolioManagementService();
      const alertService = getAlertService();
      
      // Simulate rebalancing process
      const rebalanceActions = await portfolioService.rebalancePortfolio(portfolio.id, {
        method: 'equal_weight',
        constraints: {
          maxWeight: 0.05,
          maxSectorWeight: 0.25
        }
      });
      
      // Update portfolio state
      const updatedPortfolio = portfolioService.getCurrentPortfolio();
      setPortfolio(updatedPortfolio);
      
      // Create rebalance alert
      alertService.addAlert({
        id: `rebalance-${Date.now()}`,
        title: 'Portfolio Rebalanced',
        message: `${rebalanceActions.length} positions adjusted`,
        type: 'info',
        priority: 'medium',
        timestamp: new Date(),
        read: false,
        actionRequired: false
      });
      
      refreshQuantMetrics();
      
    } catch (error) {
      console.error('[Portfolio] Rebalancing failed:', error);
    }
  };

  const refreshPortfolio = () => {
    const service = getPortfolioManagementService();
    const current = service.getCurrentPortfolio();
    setPortfolio(current);
    refreshQuantMetrics();
  };

  // ... (Sector calculation remains the same)
  const sectorExposure = useMemo(() => {
    if (!portfolio) return [];
    const sectorMap: Record<string, number> = {};
    let totalValue = 0;
    portfolio.holdings.forEach(h => {
      let sector = '其他';
      if (['600519', '000858'].includes(h.symbol)) sector = '食品饮料';
      else if (['300750', '002594', '601012'].includes(h.symbol)) sector = '电力设备';
      else if (['600036', '601398', '601288'].includes(h.symbol)) sector = '银行';
      else if (['601318'].includes(h.symbol)) sector = '非银金融';
      sectorMap[sector] = (sectorMap[sector] || 0) + h.marketValue;
      totalValue += h.marketValue;
    });
    return Object.entries(sectorMap).map(([name, value]) => ({
      name,
      weight: parseFloat(((value / totalValue) * 100).toFixed(1)),
      limit: 25.0
    })).sort((a, b) => b.weight - a.weight);
  }, [portfolio]);

  if (!portfolio) return <div>Loading...</div>;

  if (!portfolio) {
    return (
      <div className="p-6 text-gray-400 bg-[#0a1628] min-h-[400px]">
        正在初始化组合数据...
      </div>
    );
  }

  return (
    <div className="space-y-0">
        {/* Top Control Bar */}
        <div className="mb-6 rounded-lg overflow-hidden border border-[#1a2942]">
            <StrategyControlBar 
                currentMode={mode}
                onModeChange={setMode}
                dateRange={dateRange}
                onDateRangeChange={(range) => setDateRange(range as any)}
                currentStrategy={strategy}
                onStrategyChange={setStrategy}
                benchmark={benchmark}
                onBenchmarkChange={handleBenchmarkChange}
                timeFrame={timeFrame}
                onTimeFrameChange={handleTimeFrameChange}
            />
        </div>

      {/* Configuration Dialog */}
      <PortfolioConfigDialog  
        open={isConfigOpen} 
        onOpenChange={setIsConfigOpen} 
        currentPortfolio={portfolio}
        onSave={() => {
          refreshPortfolio();
          setIsConfigOpen(false);
        }}
      />

      {/* Portfolio Overview */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg text-gray-100 mb-2 flex items-center gap-2">
                组合表现 
                {portfolio.totalValue > 10000000 && <span className="text-xs bg-[#F97316] text-black px-1.5 rounded font-bold">PRO</span>}
                {/* Service Status Indicators */}
                <div className="flex items-center gap-2 ml-4">
                  {connectionStatus === 'connected' ? (
                    <Activity className="w-4 h-4 text-[#10b981] animate-pulse" />
                  ) : connectionStatus === 'connecting' ? (
                    <RefreshCw className="w-4 h-4 text-[#f59e0b] animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#f97316]" />
                  )}
                  <span className={`text-xs ${
                    connectionStatus === 'connected' ? 'text-[#10b981]' : 
                    connectionStatus === 'connecting' ? 'text-[#f59e0b]' : 'text-[#f97316]'
                  }`}>
                    {connectionStatus === 'connected' ? '实时' : 
                     connectionStatus === 'connecting' ? '连接中' : '离线'}
                  </span>
                  {dataStatus === 'connected' && (
                    <>
                      <span className="text-gray-600">|</span>
                      <Database className="w-3 h-3 text-[#0ea5e9]" />
                      <span className="text-xs text-[#0ea5e9]">{realtimeData.size} 数据源</span>
                    </>
                  )}
                  {workspaceConnected && (
                    <>
                      <span className="text-gray-600">|</span>
                      <Zap className="w-3 h-3 text-[#8b5cf6]" />
                      <span className="text-xs text-[#8b5cf6]">工作区同步</span>
                    </>
                  )}
                </div>
            </h2>
            <div className="text-sm text-gray-500">{portfolio.name} · {new Date(portfolio.updatedAt).toLocaleDateString()}</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">现金余额</div>
              <div className="text-lg text-gray-400">¥{(portfolio.cash / 10000).toFixed(2)}万</div>
            </div>
            <div className="w-px h-12 bg-[#1a2942]"></div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">当前权益</div>
              <div className="text-2xl text-[#10b981]">¥{(portfolio.totalValue / 10000).toFixed(2)}万</div>
            </div>
            <div className="w-px h-12 bg-[#1a2942]"></div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">总盈亏</div>
              <div className={`text-2xl ${portfolio.totalPnL >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'}`}>
                {portfolio.totalPnL >= 0 ? '+' : ''}{portfolio.totalPnLPercent.toFixed(2)}%
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Export Dropdown */}
              <div className="relative group">
                <Button 
                  variant="outline" 
                  className="bg-[#1a2942] border-[#2a3f5f] hover:bg-[#2a3f5f] text-gray-300 gap-2"
                  disabled={isExporting}
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? `导出中 ${exportProgress}%` : '导出报告'}
                </Button>
                <div className="absolute right-0 top-full mt-1 bg-[#0d1b2e] border border-[#1a2942] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-2 space-y-1 min-w-32">
                    <button onClick={() => handleExportReport('pdf')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#1a2942] rounded">
                      PDF 报告
                    </button>
                    <button onClick={() => handleExportReport('excel')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#1a2942] rounded">
                      Excel 表格
                    </button>
                    <button onClick={() => handleExportReport('csv')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#1a2942] rounded">
                      CSV 数据
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Rebalance Button */}
              <Button 
                onClick={handleRebalancePortfolio}
                variant="outline" 
                className="bg-[#0ea5e9]/10 border-[#0ea5e9] hover:bg-[#0ea5e9]/20 text-[#0ea5e9] gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重新平衡
              </Button>
              
              {/* Config Button */}
              <Button 
                onClick={() => setIsConfigOpen(true)}
                variant="outline" 
                className="bg-[#1a2942] border-[#2a3f5f] hover:bg-[#2a3f5f] text-gray-300 gap-2"
              >
                <Settings className="w-4 h-4" />
                配置组合
              </Button>
              
              {/* Alert Bell */}
              {alerts.length > 0 && (
                <Button 
                  variant="outline" 
                  className="bg-[#f97316]/10 border-[#f97316] hover:bg-[#f97316]/20 text-[#f97316] gap-2 relative"
                >
                  <Bell className="w-4 h-4" />
                  {alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#f97316] text-black text-xs rounded-full flex items-center justify-center font-bold">
                      {alerts.length}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4">
          <MetricCard icon={TrendingUp} label="日涨跌" value={`${portfolio.totalPnL >= 0 ? '+' : ''}${(portfolio.totalPnL / 10000).toFixed(2)}万`} color={portfolio.totalPnL >= 0 ? "text-[#10b981]" : "text-[#f97316]"} />
          <MetricCard icon={Shield} label="VaR (95%)" value={quantMetrics ? `-¥${(quantMetrics.valueAtRisk95 / 10000).toFixed(2)}万` : 'Calculating...'} color="text-[#f97316]" />
          <MetricCard icon={Activity} label="Beta" value={quantMetrics?.portfolioBeta?.toFixed(2) ?? '-'} color="text-gray-400" />
          <MetricCard icon={Droplets} label="仓位" value={`${((portfolio.totalValue - portfolio.cash) / portfolio.totalValue * 100).toFixed(1)}%`} color="text-[#0ea5e9]" />
          <MetricCard icon={Layers} label="持仓数量" value={`${portfolio.holdings.length} 只`} color="text-gray-200" />
          <MetricCard 
            icon={Shield} 
            label="夏普比率" 
            value={performanceMetrics?.sharpeRatio?.toFixed(2) ?? "2.18"} 
            color={performanceMetrics && performanceMetrics.sharpeRatio > 1 ? "text-[#10b981]" : "text-[#0ea5e9]"} 
          />
        </div>
        
        {/* Active Alerts Bar */}
        {alerts.length > 0 && (
          <div className="mt-4 p-3 bg-[#1a2942]/50 border border-[#f97316]/30 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-[#f97316] flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-200">活跃提醒 ({alerts.length})</div>
                <div className="text-xs text-gray-400 truncate">
                  {alerts[0].message} {alerts.length > 1 && `+ ${alerts.length - 1} more`}
                </div>
              </div>
              <button className="text-xs text-[#0ea5e9] hover:text-[#0284c7]">
                查看全部
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Tabs */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg min-h-[500px]">
        <div className="flex border-b border-[#1a2942]">
          <button
            onClick={() => setActiveTab('backtest')}
            className={`px-6 py-3 text-sm transition-colors ${
              activeTab === 'backtest'
                ? 'text-[#0ea5e9] border-b-2 border-[#0ea5e9]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            组合概览
          </button>
          <button
            onClick={() => setActiveTab('quant')}
            className={`px-6 py-3 text-sm transition-colors ${
              activeTab === 'quant'
                ? 'text-[#0ea5e9] border-b-2 border-[#0ea5e9]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" /> 量化深度分析
            </span>
          </button>
          <button
            onClick={() => setActiveTab('realtime')}
            className={`px-6 py-3 text-sm transition-colors ${
              activeTab === 'realtime'
                ? 'text-[#0ea5e9] border-b-2 border-[#0ea5e9]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-1">
              <Play className="w-3 h-3" /> 实时盈亏模拟
              {dataStatus === 'connected' && (
                <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse ml-1"></span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('bayesian')}
            className={`px-6 py-3 text-sm transition-colors ${
              activeTab === 'bayesian'
                ? 'text-[#0ea5e9] border-b-2 border-[#0ea5e9]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" /> 智能仓位管理
              {bayesianEnabled && (
                <span className="w-2 h-2 bg-[#f59e0b] rounded-full animate-pulse ml-1"></span>
              )}
            </span>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'backtest' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Portfolio Health Radar */}
              <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                <h3 className="text-sm text-gray-400 mb-4">组合健康度雷达</h3>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={healthRadarMock}>
                      <PolarGrid stroke="#1a2942" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Radar name="当前表现" dataKey="current" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
                      <Radar name="目标水平" dataKey="target" stroke="#64748b" fill="#64748b" fillOpacity={0.1} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0d1b2e',
                          border: '1px solid #1a2942',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stock Exposure */}
              <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                <h3 className="text-sm text-gray-400 mb-4">持仓明细 (Top 10)</h3>
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                  {portfolio.holdings.sort((a, b) => b.weight - a.weight).slice(0, 10).map((stock, idx) => (
                    <div key={stock.symbol} className="flex items-center gap-3">
                      <div className="text-xs text-gray-600 w-6">{idx + 1}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300">{stock.name}</span>
                            <span className="text-gray-600">·</span>
                            <span className="text-gray-600 text-xs">{stock.symbol}</span>
                          </div>
                          <span className="text-gray-400">{stock.weight.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1a2942] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${stock.weight >= 10.0 ? 'bg-[#f97316]' : 'bg-[#0ea5e9]'}`}
                            style={{ width: `${Math.min((stock.weight / 10.0) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end w-20">
                          <span className={`text-xs ${stock.pnl >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'}`}>
                              {stock.pnl >= 0 ? '+' : ''}{stock.pnlPercent.toFixed(1)}%
                          </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Net Value Chart */}
              <div className="col-span-2 bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                <h3 className="text-sm text-gray-400 mb-4">净值走势回测</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={enhancedPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2942" />
                    <XAxis dataKey="date" stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0d1b2e',
                        border: '1px solid #1a2942',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={false} name="组合净值" />
                    <Line type="monotone" dataKey="benchmark" stroke="#64748b" strokeWidth={1.5} dot={false} name="基准" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'quant' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Service Integration Status */}
              <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h4 className="text-sm text-gray-400">量化分析服务状态</h4>
                    <div className="flex items-center gap-3 text-xs">
                      {serviceStatus.quantEngine ? (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                          <span className="text-[#10b981]">QuantEngine</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#6b7280] rounded-full"></div>
                          <span className="text-gray-500">QuantEngine 离线</span>
                        </div>
                      )}
                      {serviceStatus.qlib ? (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                          <span className="text-[#10b981]">Qlib AI</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#6b7280] rounded-full"></div>
                          <span className="text-gray-500">Qlib 离线</span>
                        </div>
                      )}
                      {serviceStatus.tushare ? (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
                          <span className="text-[#10b981]">Tushare 数据</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#6b7280] rounded-full"></div>
                          <span className="text-gray-500">模拟数据</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    最后更新: {new Date().toLocaleTimeString('zh-CN')}
                  </div>
                </div>
              </div>
              
                {loadingQuant ? (
                    <div className="grid grid-cols-2 gap-6">
                        <Skeleton className="h-[300px] w-full bg-[#1A2942] rounded-lg" />
                        <Skeleton className="h-[300px] w-full bg-[#1A2942] rounded-lg" />
                        <Skeleton className="h-[200px] w-full col-span-2 bg-[#1A2942] rounded-lg" />
                    </div>
                ) : quantMetrics ? (
                    <>
                    <div className="grid grid-cols-12 gap-6">
                        {/* Risk Metrics Summary */}
                        <div className="col-span-12 grid grid-cols-4 gap-4">
                             <div className="bg-[#1A2942]/30 p-4 rounded-lg border border-[#2A3F5F]">
                                <div className="text-xs text-gray-500 mb-1">VaR (95% Confidence)</div>
                                <div className="text-xl text-[#F97316] font-mono">
                                    ¥{(quantMetrics.valueAtRisk95 / 1000).toFixed(0)}k
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">Daily Value at Risk</div>
                             </div>
                             <div className="bg-[#1A2942]/30 p-4 rounded-lg border border-[#2A3F5F]">
                                <div className="text-xs text-gray-500 mb-1">Portfolio Beta</div>
                                <div className="text-xl text-[#0EA5E9] font-mono">
                                    {quantMetrics.portfolioBeta?.toFixed(2) ?? '--'}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">Market Sensitivity</div>
                             </div>
                             <div className="bg-[#1A2942]/30 p-4 rounded-lg border border-[#2A3F5F]">
                                <div className="text-xs text-gray-500 mb-1">Max Drawdown (Est)</div>
                                <div className="text-xl text-[#F97316] font-mono">
                                    -12.4%
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">Based on Monte Carlo</div>
                             </div>
                             <div className="bg-[#1A2942]/30 p-4 rounded-lg border border-[#2A3F5F]">
                                <div className="text-xs text-gray-500 mb-1">Diversity Score</div>
                                <div className="text-xl text-[#10B981] font-mono">
                                    7.8/10
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">Concentration Risk</div>
                             </div>
                        </div>

                        {/* Correlation Matrix */}
                        <div className="col-span-7 bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                            <h3 className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                                <Target className="w-4 h-4" /> 资产相关性矩阵
                            </h3>
                            <div className="overflow-x-auto">
                                <CorrelationMatrix metrics={quantMetrics} />
                            </div>
                        </div>

                        {/* Volatility Contribution */}
                        <div className="col-span-5 bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                            <h3 className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                                <Zap className="w-4 h-4" /> 波动率贡献分解
                            </h3>
                            <div className="space-y-3">
                                {quantMetrics.volatilityContribution.slice(0, 8).map((item, idx) => (
                                    <div key={item.symbol} className="flex items-center gap-3 text-xs">
                                        <div className="w-12 text-gray-500">{item.symbol}</div>
                                        <div className="flex-1 h-2 bg-[#1A2942] rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#0EA5E9]" 
                                                style={{width: `${item.contribution}%`}}
                                            />
                                        </div>
                                        <div className="w-10 text-right text-gray-300">{item.contribution.toFixed(1)}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stress Testing */}
                    <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm text-gray-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-[#F97316]" /> 极端情景压力测试
                            </h3>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleExportReport('pdf')} 
                                    className="px-3 py-1 bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#0ea5e9] rounded text-xs transition-colors"
                                >
                                    <Download className="w-3 h-3 inline mr-1" />
                                    风险报告
                                </button>
                                <button 
                                    onClick={refreshQuantMetrics} 
                                    className="px-3 py-1 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-400 rounded text-xs transition-colors"
                                >
                                    <RefreshCw className="w-3 h-3 inline mr-1" />
                                    重新计算
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {quantMetrics.stressTestResults.map((scenario) => (
                                <div key={scenario.name} className="bg-[#1A2942]/50 rounded border border-[#2A3F5F] p-4 flex flex-col justify-between hover:bg-[#1A2942] transition-colors group">
                                    <div>
                                        <div className="text-sm text-gray-200 font-medium mb-1">{scenario.name}</div>
                                        <div className="text-xs text-gray-500 mb-3 h-8">{scenario.description}</div>
                                    </div>
                                    <div>
                                        <div className="flex items-end justify-between mb-1">
                                            <span className="text-xs text-gray-500">组合净值影响</span>
                                            <span className="text-sm font-bold text-[#F97316]">{scenario.impactPercent.toFixed(2)}%</span>
                                        </div>
                                        <div className="w-full bg-[#0D1B2E] h-1.5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#F97316] transition-all group-hover:bg-[#dc2626]" 
                                                style={{ width: `${Math.min(Math.abs(scenario.impactPercent) * 2, 100)}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-right text-[10px] text-gray-600 mt-1">
                                            损失: ¥{Math.abs(scenario.impactValue / 10000).toFixed(1)}万
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-500 mt-1">
                                            概率: {scenario.probability || '5%'} | 持续: {scenario.duration || '1-2个月'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Advanced Risk Analytics */}
                    <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                        <h3 className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4" /> 高级风险分析
                        </h3>
                        <div className="grid grid-cols-3 gap-6">
                            {/* Risk Concentration */}
                            <div className="space-y-3">
                                <h4 className="text-xs text-gray-500 mb-3">风险集中度分析</h4>
                                {sectorExposure.slice(0, 4).map((sector, idx) => (
                                    <div key={sector.name} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400">{sector.name}</span>
                                            <span className={`${sector.weight > sector.limit ? 'text-[#f97316]' : 'text-gray-300'}`}>
                                                {sector.weight.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-[#1A2942] rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all ${
                                                    sector.weight > sector.limit ? 'bg-[#f97316]' : 'bg-[#0ea5e9]'
                                                }`}
                                                style={{ width: `${Math.min(sector.weight / sector.limit * 100, 100)}%` }}
                                            />
                                        </div>
                                        {sector.weight > sector.limit && (
                                            <div className="text-[10px] text-[#f97316]">超出限制 {sector.limit}%</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            {/* Liquidity Analysis */}
                            <div className="space-y-3">
                                <h4 className="text-xs text-gray-500 mb-3">流动性分析</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">高流动性 (&gt;100M日均)</span>
                                        <span className="text-[#10b981]">65.2%</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">中等流动性 (50-100M)</span>
                                        <span className="text-[#0ea5e9]">28.1%</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">低流动性 (&lt;50M)</span>
                                        <span className="text-[#f97316]">6.7%</span>
                                    </div>
                                </div>
                                <div className="mt-3 p-2 bg-[#1A2942]/50 rounded text-[10px] text-gray-500">
                                    清仓时间估算: 2-3个交易日
                                </div>
                            </div>
                            
                            {/* Factor Exposure */}
                            <div className="space-y-3">
                                <h4 className="text-xs text-gray-500 mb-3">因子暴露度</h4>
                                {[
                                    { factor: '价值因子', exposure: 0.15, target: 0.1 },
                                    { factor: '成长因子', exposure: 0.32, target: 0.25 },
                                    { factor: '质量因子', exposure: 0.22, target: 0.2 },
                                    { factor: '动量因子', exposure: 0.18, target: 0.15 }
                                ].map((item) => (
                                    <div key={item.factor} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400">{item.factor}</span>
                                            <span className={`${
                                                Math.abs(item.exposure) > Math.abs(item.target) * 1.5 ? 'text-[#f97316]' : 'text-gray-300'
                                            }`}>
                                                {item.exposure > 0 ? '+' : ''}{(item.exposure * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-[#1A2942] rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${
                                                    Math.abs(item.exposure) > Math.abs(item.target) * 1.5 
                                                    ? 'bg-[#f97316]' : 'bg-[#0ea5e9]'
                                                }`}
                                                style={{ width: `${Math.min(Math.abs(item.exposure) * 200, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    </>
                ) : (
                    <div className="text-center text-gray-500 py-20">
                        <div className="mb-4">
                            <Database className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                            <div>暂无数据</div>
                        </div>
                        <button 
                            onClick={refreshQuantMetrics}
                            className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded transition-colors"
                        >
                            加载量化分析
                        </button>
                    </div>
                )}
            </div>
          )}

          {activeTab === 'realtime' && (
            <div className="space-y-6">
              {/* Enhanced Service Status Header */}
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-[#0ea5e9]" />
                    <span className="text-sm text-gray-300">数据流状态</span>
                  </div>
                  <div className={`text-lg font-mono ${
                    dataStatus === 'connected' ? 'text-[#10b981]' : 'text-[#f97316]'
                  }`}>
                    {dataStatus === 'connected' ? '实时连接' : '离线'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {dataStatus === 'connected' ? `${realtimeData.size}/${portfolioSymbols.length} 数据源` : '连接中断'}
                  </div>
                </div>
                
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-[#0ea5e9]" />
                    <span className="text-sm text-gray-300">策略监控</span>
                  </div>
                  <div className={`text-lg font-mono ${
                    connectionStatus === 'connected' ? 'text-[#10b981]' : 'text-[#f97316]'
                  }`}>
                    {connectionStatus === 'connected' ? '运行中' : '已停止'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    高波动Alpha策略
                  </div>
                </div>
                
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-[#0ea5e9]" />
                    <span className="text-sm text-gray-300">量化引擎</span>
                  </div>
                  <div className={`text-lg font-mono ${
                    serviceStatus.quantEngine ? 'text-[#10b981]' : 'text-[#6b7280]'
                  }`}>
                    {serviceStatus.quantEngine ? '已连接' : '离线'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {serviceStatus.quantEngine ? `QuantEngine + Alpha158` : '本地分析'}
                  </div>
                </div>
                
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-[#0ea5e9]" />
                    <span className="text-sm text-gray-300">Qlib平台</span>
                  </div>
                  <div className={`text-lg font-mono ${
                    serviceStatus.qlib ? 'text-[#10b981]' : 'text-[#6b7280]'
                  }`}>
                    {serviceStatus.qlib ? '已连接' : '离线'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {serviceStatus.qlib ? `${availableModels.length} 模型可用` : '本地模型'}
                  </div>
                </div>
                
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4 text-[#0ea5e9]" />
                    <span className="text-sm text-gray-300">风险监控</span>
                  </div>
                  <div className={`text-lg font-mono ${
                    alerts.length > 0 ? 'text-[#f97316]' : 'text-[#10b981]'
                  }`}>
                    {alerts.length > 0 ? `${alerts.length} 告警` : '正常'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {alerts.length > 0 ? '需要关注' : 'VaR 范围内'}
                  </div>
                </div>
                
                <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-[#0ea5e9]" />
                    <span className="text-sm text-gray-300">Tushare数据</span>
                  </div>
                  <div className={`text-lg font-mono ${
                    serviceStatus.tushare ? 'text-[#10b981]' : 'text-[#6b7280]'
                  }`}>
                    {serviceStatus.tushare ? '已连接' : '离线'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {serviceStatus.tushare ? 'A股实时数据' : '使用备用数据'}
                  </div>
                </div>
              </div>

              {/* Real-time Performance Metrics */}
              {performanceMetrics && (
                <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                  <h3 className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> 实时策略表现
                  </h3>
                  <div className="grid grid-cols-6 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">总收益</div>
                      <div className={`text-lg font-mono ${
                        performanceMetrics.totalReturn >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'
                      }`}>
                        {performanceMetrics.totalReturn >= 0 ? '+' : ''}{(performanceMetrics.totalReturn * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">当日盈亏</div>
                      <div className={`text-lg font-mono ${
                        performanceMetrics.todayPnL >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'
                      }`}>
                        {performanceMetrics.todayPnL >= 0 ? '+' : ''}¥{(performanceMetrics.todayPnL / 1000).toFixed(1)}k
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">夏普比率</div>
                      <div className={`text-lg font-mono ${
                        performanceMetrics.sharpeRatio > 1 ? 'text-[#10b981]' : 'text-[#0ea5e9]'
                      }`}>
                        {performanceMetrics.sharpeRatio.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">最大回撤</div>
                      <div className="text-lg font-mono text-[#f97316]">
                        {(performanceMetrics.maxDrawdown * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">胜率</div>
                      <div className="text-lg font-mono text-[#0ea5e9]">
                        {(performanceMetrics.winRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">交易次数</div>
                      <div className="text-lg font-mono text-gray-300">
                        {performanceMetrics.totalTrades}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Real-time Holdings Monitor */}
              <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                <h3 className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> 持仓实时监控
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {portfolio.holdings.slice(0, 8).map((stock) => {
                    const liveData = realtimeData.get(stock.symbol);
                    const isConnected = dataStatus === 'connected' && liveData;
                    
                    return (
                      <div key={stock.symbol} className="flex items-center gap-3 p-2 bg-[#1a2942]/30 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-gray-300">{stock.name}</span>
                            <span className="text-xs text-gray-600">{stock.symbol}</span>
                            {isConnected && (
                              <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse"></span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-gray-500">持仓: {stock.quantity}</span>
                            <span className="text-gray-500">成本: ¥{stock.avgCost.toFixed(2)}</span>
                            <span className="text-gray-500">现价: ¥{(liveData?.price || stock.currentPrice).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-mono ${
                            stock.pnl >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'
                          }`}>
                            {stock.pnl >= 0 ? '+' : ''}{stock.pnlPercent.toFixed(2)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            ¥{(stock.marketValue / 1000).toFixed(1)}k
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scenario Analysis Warning */}
              <div className="p-4 bg-[#f97316]/10 border border-[#f97316]/30 rounded text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <div className="text-[#f97316] mt-0.5">⚠</div>
                  <div>
                    <span className="text-[#f97316]">模拟场景：</span> 
                    以下为基于当前持仓的价格波动影响模拟，非实际交易盈亏。实时数据来源: {dataStatus === 'connected' ? '已连接' : '模拟数据'}
                  </div>
                </div>
              </div>

              {/* Enhanced PnL Simulation */}
              <div>
                <h3 className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" /> 价格波动对组合影响 (PnL 模拟)
                </h3>
                <div className="grid grid-cols-7 gap-3">
                  {pnlSimulation.map((item) => (
                    <div
                      key={item.scenario}
                      className={`p-4 rounded text-center transition-all hover:scale-105 ${
                        item.pnl === 0
                          ? 'bg-[#1a2942] border border-[#2a3f5f]'
                          : item.pnl > 0
                          ? 'bg-[#10b981]/10 border border-[#10b981]/30'
                          : 'bg-[#f97316]/10 border border-[#f97316]/30'
                      }`}
                    >
                      <div className="text-xs text-gray-500 mb-2">{item.scenario}</div>
                      <div
                        className={`text-lg mb-1 font-mono ${
                          item.pnl === 0
                            ? 'text-gray-300'
                            : item.pnl > 0
                            ? 'text-[#10b981]'
                            : 'text-[#f97316]'
                        }`}
                      >
                        {item.pnl > 0 ? '+' : ''}
                        {item.pnl === 0 ? '0' : `${item.pnl}K`}
                      </div>
                      <div className="text-xs text-gray-600">{item.probability}</div>
                    </div>
                  ))}
                </div>
                {dataStatus === 'connected' && (
                  <div className="mt-3 text-xs text-gray-500 text-center">
                    基于实时市场数据计算 · 更新频率: 实时
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 贝叶斯风险控制标签页 */}
          {activeTab === 'bayesian' && (
            <div className="space-y-6">
              {/* 贝叶斯控制状态栏 */}
              <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 ${bayesianEnabled ? 'text-[#10b981]' : 'text-[#6b7280]'}`}>
                      <Zap className="w-5 h-5" />
                      <span className="font-medium">贝叶斯风险控制</span>
                      {bayesianEnabled && (
                        <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-400">
                        {bayesianEnabled ? '智能仓位管理已启用' : '智能仓位管理已禁用'}
                      </div>
                      {bayesianEnabled && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">数据源:</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              serviceStatus.tushare ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                            }`}>
                              {serviceStatus.tushare ? 'Tushare实时数据' : '模拟数据'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">AI分析:</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              aiSignalsEnabled && serviceStatus.deepSeek ? 'bg-[#0ea5e9]/20 text-[#0ea5e9]' : 
                              aiSignalsEnabled ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-[#6b7280]/20 text-[#6b7280]'
                            }`}>
                              {aiSignalsEnabled && serviceStatus.deepSeek ? 'DeepSeek已连接' : 
                               aiSignalsEnabled ? 'DeepSeek离线' : 'AI已禁用'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setBayesianEnabled(!bayesianEnabled)}
                    className={`px-4 py-2 rounded text-sm transition-colors ${
                      bayesianEnabled 
                        ? 'bg-[#10b981] text-white hover:bg-[#059669]'
                        : 'bg-[#2a3f5f] text-gray-400 hover:bg-[#374151]'
                    }`}
                  >
                    {bayesianEnabled ? '禁用' : '启用'}
                  </button>
                </div>
              </div>

              {bayesianEnabled && (
                <>
                  {/* 智能仓位推荐 */}
                  {positionRecommendations.length > 0 && (
                    <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                      <h3 className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4" /> 智能仓位推荐
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                        {positionRecommendations.map((rec, index) => (
                          <div 
                            key={`${rec.symbol}-${index}`}
                            className={`p-4 rounded-lg border ${
                              rec.riskLevel === 'CRITICAL' ? 'border-[#dc2626] bg-[#dc2626]/10' :
                              rec.riskLevel === 'HIGH' ? 'border-[#f97316] bg-[#f97316]/10' :
                              rec.riskLevel === 'MEDIUM' ? 'border-[#f59e0b] bg-[#f59e0b]/10' :
                              'border-[#10b981] bg-[#10b981]/10'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-200">{rec.symbol}</span>
                                  <span 
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      rec.action === 'BUY' ? 'bg-[#10b981] text-white' :
                                      rec.action === 'SELL' ? 'bg-[#dc2626] text-white' :
                                      rec.action === 'REDUCE' ? 'bg-[#f97316] text-white' :
                                      'bg-[#6b7280] text-white'
                                    }`}
                                  >
                                    {rec.action}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    rec.riskLevel === 'CRITICAL' ? 'bg-[#dc2626] text-white' :
                                    rec.riskLevel === 'HIGH' ? 'bg-[#f97316] text-white' :
                                    rec.riskLevel === 'MEDIUM' ? 'bg-[#f59e0b] text-white' :
                                    'bg-[#10b981] text-white'
                                  }`}>
                                    {rec.riskLevel}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 mb-2">{rec.reason}</div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-gray-500">当前仓位: </span>
                                    <span className="text-gray-300">¥{rec.currentSize ? (rec.currentSize / 1000).toFixed(1) : '--'}k</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">建议仓位: </span>
                                    <span className="text-gray-300">¥{rec.recommendedSize ? (rec.recommendedSize / 1000).toFixed(1) : '--'}k</span>
                                  </div>
                                  {rec.stopLoss && (
                                    <div>
                                      <span className="text-gray-500">止损价: </span>
                                      <span className="text-[#dc2626]">¥{rec.stopLoss?.toFixed?.(2) ?? '--'}</span>
                                    </div>
                                  )}
                                  {rec.takeProfit && (
                                    <div>
                                      <span className="text-gray-500">止盈价: </span>
                                      <span className="text-[#10b981]">¥{rec.takeProfit?.toFixed?.(2) ?? '--'}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-400">置信度</div>
                                <div className="text-lg font-mono text-[#0ea5e9]">
                                  {(rec.confidence * 100).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <div className="w-full bg-[#1a2942] rounded-full h-2">
                              <div 
                                className="bg-[#0ea5e9] h-2 rounded-full transition-all duration-300"
                                style={{ width: `${rec.confidence * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DeepSeek AI信号分析 */}
                  <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm text-gray-400 flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#0ea5e9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        DeepSeek AI 信号分析
                        {loadingAiSignals && (
                          <div className="w-4 h-4 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">AI分析:</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          aiSignalsEnabled ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#6b7280]/20 text-[#6b7280]'
                        }`}>
                          {aiSignalsEnabled ? '已启用' : '已禁用'}
                        </span>
                        <button
                          onClick={() => setAiSignalsEnabled(!aiSignalsEnabled)}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            aiSignalsEnabled 
                              ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                              : 'bg-[#10b981] text-white hover:bg-[#059669]'
                          }`}
                        >
                          {aiSignalsEnabled ? '禁用' : '启用'}
                        </button>
                      </div>
                    </div>

                    {aiSignalsEnabled && (
                      <div className="space-y-4">
                        {/* 市场整体分析 */}
                        {marketAnalysis && (
                          <div className="bg-[#1a2942]/30 p-4 rounded-lg border border-[#2a3f5f]">
                            <h4 className="text-sm font-medium text-gray-200 mb-3">市场整体分析</h4>
                            <div className="grid grid-cols-4 gap-4 mb-4">
                              <div className="text-center">
                                <div className="text-xs text-gray-500">市场状态</div>
                                <div className={`text-sm font-medium ${
                                  marketAnalysis.marketRegime === 'BULL' ? 'text-[#10b981]' :
                                  marketAnalysis.marketRegime === 'BEAR' ? 'text-[#dc2626]' :
                                  marketAnalysis.marketRegime === 'VOLATILE' ? 'text-[#f97316]' :
                                  'text-[#0ea5e9]'
                                }`}>
                                  {marketAnalysis.marketRegime === 'BULL' ? '牛市' :
                                   marketAnalysis.marketRegime === 'BEAR' ? '熊市' :
                                   marketAnalysis.marketRegime === 'VOLATILE' ? '震荡' : '横盘'}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500">置信度</div>
                                <div className="text-sm font-medium text-[#0ea5e9]">
                                  {(marketAnalysis.regimeConfidence * 100).toFixed(0)}%
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500">风险情绪</div>
                                <div className={`text-sm font-medium ${
                                  marketAnalysis.riskSentiment > 0.2 ? 'text-[#10b981]' :
                                  marketAnalysis.riskSentiment < -0.2 ? 'text-[#dc2626]' : 'text-[#f59e0b]'
                                }`}>
                                  {marketAnalysis.riskSentiment > 0.2 ? '乐观' :
                                   marketAnalysis.riskSentiment < -0.2 ? '悲观' : '中性'}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500">波动预期</div>
                                <div className="text-sm font-medium text-gray-300">
                                  {(marketAnalysis.volatilityForecast * 100).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">
                              <span className="font-medium">关键因素:</span>
                              {marketAnalysis.keyFactors.slice(0, 3).join(' • ')}
                            </div>
                          </div>
                        )}

                        {/* AI交易信号 */}
                        <div className="space-y-3">
                          {aiSignals.length > 0 ? (
                            aiSignals.map((signal, index) => (
                              <div 
                                key={`${signal.symbol}-${index}`}
                                className={`p-4 rounded-lg border ${
                                  signal.signal === 'BUY' ? 'border-[#10b981] bg-[#10b981]/10' :
                                  signal.signal === 'SELL' ? 'border-[#dc2626] bg-[#dc2626]/10' :
                                  'border-[#6b7280] bg-[#6b7280]/10'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-200">{signal.symbol}</span>
                                    <span 
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        signal.signal === 'BUY' ? 'bg-[#10b981] text-white' :
                                        signal.signal === 'SELL' ? 'bg-[#dc2626] text-white' :
                                        'bg-[#6b7280] text-white'
                                      }`}
                                    >
                                      {signal.signal === 'BUY' ? '买入' : signal.signal === 'SELL' ? '卖出' : '持有'}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      signal.riskLevel === 'HIGH' ? 'bg-[#dc2626] text-white' :
                                      signal.riskLevel === 'MEDIUM' ? 'bg-[#f59e0b] text-white' :
                                      'bg-[#10b981] text-white'
                                    }`}>
                                      {signal.riskLevel === 'HIGH' ? '高风险' : 
                                       signal.riskLevel === 'MEDIUM' ? '中风险' : '低风险'}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded bg-[#0ea5e9]/20 text-[#0ea5e9]">
                                      {signal.timeHorizon}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500">AI置信度</div>
                                    <div className="text-sm font-mono text-[#0ea5e9]">
                                      {(signal.confidence * 100).toFixed(0)}%
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400 mb-2">
                                  <span className="font-medium">分析理由:</span> {signal.reasoning}
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-xs">
                                  <div>
                                    <span className="text-gray-500">预期收益:</span>
                                    <span className={`ml-1 ${signal.expectedReturn >= 0 ? 'text-[#10b981]' : 'text-[#dc2626]'}`}>
                                      {signal.expectedReturn >= 0 ? '+' : ''}{(signal.expectedReturn * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  {signal.entryPrice && (
                                    <div>
                                      <span className="text-gray-500">建议入场:</span>
                                      <span className="text-gray-300 ml-1">¥{signal.entryPrice?.toFixed?.(2) ?? '--'}</span>
                                    </div>
                                  )}
                                  {signal.stopLoss && (
                                    <div>
                                      <span className="text-gray-500">止损价:</span>
                                      <span className="text-[#dc2626] ml-1">¥{signal.stopLoss?.toFixed?.(2) ?? '--'}</span>
                                    </div>
                                  )}
                                  {signal.takeProfit && (
                                    <div>
                                      <span className="text-gray-500">止盈价:</span>
                                      <span className="text-[#10b981] ml-1">¥{signal.takeProfit?.toFixed?.(2) ?? '--'}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3">
                                  <div className="w-full bg-[#1a2942] rounded-full h-1.5">
                                    <div 
                                      className={`h-1.5 rounded-full transition-all duration-300 ${
                                        signal.signal === 'BUY' ? 'bg-[#10b981]' :
                                        signal.signal === 'SELL' ? 'bg-[#dc2626]' : 'bg-[#6b7280]'
                                      }`}
                                      style={{ width: `${signal.confidence * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              {loadingAiSignals ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-6 h-6 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
                                  <span>AI正在分析市场数据...</span>
                                </div>
                              ) : (
                                '暂无AI信号数据'
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 智能再平衡分析 */}
                  {smartRebalanceResult && (
                    <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                      <h3 className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> 智能再平衡分析
                      </h3>
                      
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-3 bg-[#1a2942]/30 rounded">
                          <div className="text-xs text-gray-500 mb-1">预期夏普比率改进</div>
                          <div className="text-lg font-mono text-[#10b981]">
                            +{(smartRebalanceResult.expectedImprovement.sharpeRatio * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div className="text-center p-3 bg-[#1a2942]/30 rounded">
                          <div className="text-xs text-gray-500 mb-1">最大回撤减少</div>
                          <div className="text-lg font-mono text-[#10b981]">
                            {(smartRebalanceResult.expectedImprovement.maxDrawdown * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div className="text-center p-3 bg-[#1a2942]/30 rounded">
                          <div className="text-xs text-gray-500 mb-1">换手率</div>
                          <div className="text-lg font-mono text-[#f59e0b]">
                            {(smartRebalanceResult.totalTurnover * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-center p-3 bg-[#1a2942]/30 rounded">
                          <div className="text-xs text-gray-500 mb-1">实施成本</div>
                          <div className="text-lg font-mono text-[#f97316]">
                            ¥{(smartRebalanceResult.implementationCost / 1000).toFixed(1)}k
                          </div>
                        </div>
                      </div>

                      <button 
                        className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white py-3 rounded-lg font-medium transition-colors"
                        onClick={() => {
                          // 这里应该触发实际的再平衡操作
                          console.log('执行智能再平衡', smartRebalanceResult);
                        }}
                      >
                        执行智能再平衡
                      </button>
                    </div>
                  )}

                  {/* 风险配置面板 */}
                  {intelligentConfig && (
                    <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                      <h3 className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4" /> 贝叶斯风险参数
                      </h3>
                      
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <label className="text-xs text-gray-400 block mb-2">风险预算</label>
                          <div className="text-sm text-gray-300">{(intelligentConfig.riskBudget * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-2">最大仓位</label>
                          <div className="text-sm text-gray-300">{(intelligentConfig.maxPositionSize * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-2">Kelly限制</label>
                          <div className="text-sm text-gray-300">{(intelligentConfig.kellyFractionLimit * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-2">再平衡阈值</label>
                          <div className="text-sm text-gray-300">{(intelligentConfig.rebalanceThreshold * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-2">波动率回看期</label>
                          <div className="text-sm text-gray-300">{intelligentConfig.volatilityLookback}天</div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-2">贝叶斯控制</label>
                          <div className="text-sm text-gray-300">{intelligentConfig.enableBayesianControl ? '启用' : '禁用'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!bayesianEnabled && (
                <div className="text-center py-12 text-gray-500">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg mb-2">贝叶斯风险控制已禁用</div>
                  <div className="text-sm">启用后可获得智能仓位管理和风险控制建议</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function CorrelationMatrix({ metrics }: { metrics: AdvancedRiskMetrics }) {
    const symbols = Array.from(metrics.correlationMatrix.keys());
    // Only show top 8 for UI cleanliness if too many
    const displaySymbols = symbols.slice(0, 8); 

    const getColor = (val: number) => {
        if (val === 1) return '#2A3F5F'; // Self
        if (val > 0.7) return '#DC2626'; // High correlation (Red)
        if (val > 0.4) return '#F97316'; // Medium (Orange)
        if (val > 0) return '#10B981';   // Low (Green)
        return '#0EA5E9'; // Negative (Blue)
    };

    return (
        <div className="inline-block min-w-full">
            <div className="grid" style={{ gridTemplateColumns: `40px repeat(${displaySymbols.length}, 1fr)` }}>
                {/* Header Row */}
                <div className="h-8"></div>
                {displaySymbols.map(s => (
                    <div key={s} className="h-8 flex items-center justify-center text-[10px] text-gray-500 font-mono -rotate-45 origin-bottom-left translate-x-2">
                        {s}
                    </div>
                ))}

                {/* Rows */}
                {displaySymbols.map(rowSymbol => (
                    <React.Fragment key={rowSymbol}>
                        <div className="h-8 flex items-center justify-end pr-2 text-[10px] text-gray-500 font-mono">
                            {rowSymbol}
                        </div>
                        {displaySymbols.map(colSymbol => {
                            const val = metrics.correlationMatrix.get(rowSymbol)?.get(colSymbol) || 0;
                            return (
                                <div 
                                    key={`${rowSymbol}-${colSymbol}`} 
                                    className="h-8 border border-[#0d1b2e] flex items-center justify-center text-[10px] transition-all hover:scale-110 hover:z-10 cursor-default group relative"
                                    style={{ backgroundColor: getColor(val), opacity: Math.abs(val) > 0.3 ? 0.8 : 0.3 }}
                                >
                                    <span className="opacity-0 group-hover:opacity-100 font-bold text-white drop-shadow-md">
                                        {val.toFixed(2)}
                                    </span>
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <div className="bg-[#1a2942]/30 rounded p-3 border border-[#1a2942]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-gray-500" />
        <div className="text-xs text-gray-500">{label}</div>
      </div>
      <div className={`text-lg ${color}`}>{value}</div>
    </div>
  );
}

// ... (PortfolioConfigDialog remains roughly the same, reusing existing code block logic)
interface PortfolioConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPortfolio: PortfolioType;
  onSave: () => void;
}

// 组合配置接口
interface PortfolioConfigFormData {
  name: string;
  description: string;
  initialCash: number;
  holdings: Array<{
    symbol: string;
    name: string;
    quantity: number;
    cost: number;
    price: number;
  }>;
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  rebalanceFrequency: 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
  maxPositionSize: number;
  minCashRatio: number;
}

function PortfolioConfigDialog({ open, onOpenChange, currentPortfolio, onSave }: PortfolioConfigDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'manual' | 'template' | 'advanced'>('manual');
  const portfolioService = getPortfolioManagementService();
  
  // 组合配置状态
  const [formData, setFormData] = useState<PortfolioConfigFormData>({
    name: currentPortfolio.name,
    description: currentPortfolio.description || '',
    initialCash: currentPortfolio.totalValue,
    holdings: currentPortfolio.holdings.map(h => ({
      symbol: h.symbol,
      name: h.name,
      quantity: h.quantity,
      cost: h.avgCost,
      price: h.currentPrice
    })),
    riskTolerance: 'balanced',
    rebalanceFrequency: 'quarterly',
    maxPositionSize: 20,
    minCashRatio: 5
  });
  
  // 模板相关状态
  const [availableTemplates, setAvailableTemplates] = useState<PortfolioTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  
  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [newStock, setNewStock] = useState({ symbol: '', name: '', quantity: '100', cost: '', price: '' });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 初始化模板数据
  useEffect(() => {
    const templates = portfolioService.getPortfolioTemplates();
    setAvailableTemplates(templates);
  }, [portfolioService]);

  // 搜索股票
  useEffect(() => {
    if (searchQuery.length > 1) {
      const provider = getMarketDataProvider();
      provider.searchStocks(searchQuery).then(setSearchResults);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // 添加股票到持仓
  const handleAddStock = () => {
    if (newStock.symbol && newStock.quantity && newStock.cost) {
      const newHolding = {
        symbol: newStock.symbol,
        name: newStock.name || newStock.symbol,
        quantity: Number(newStock.quantity),
        cost: Number(newStock.cost),
        price: Number(newStock.price) || Number(newStock.cost)
      };
      
      setFormData(prev => ({
        ...prev,
        holdings: [...prev.holdings, newHolding]
      }));
      
      setNewStock({ symbol: '', name: '', quantity: '100', cost: '', price: '' });
      setSearchQuery('');
    }
  };

  // 移除股票持仓
  const handleRemoveStock = (index: number) => {
    setFormData(prev => ({
      ...prev,
      holdings: prev.holdings.filter((_, i) => i !== index)
    }));
  };

  // 应用投资组合模板
  const handleApplyTemplate = async (templateId: string) => {
    try {
      const newPortfolio = portfolioService.createPortfolioFromTemplate(templateId, formData.initialCash);
      const template = portfolioService.getTemplateById(templateId);
      
      if (template) {
        setFormData(prev => ({
          ...prev,
          name: template.name,
          description: template.description,
          holdings: newPortfolio.holdings.map(h => ({
            symbol: h.symbol,
            name: h.name,
            quantity: h.quantity,
            cost: h.avgCost,
            price: h.currentPrice
          })),
          riskTolerance: template.riskProfile,
          rebalanceFrequency: template.rebalanceFrequency
        }));
        setSelectedTemplate(templateId);
      }
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  // 优化组合配置
  const handleOptimizePortfolio = async () => {
    setIsOptimizing(true);
    try {
      // 模拟收益数据生成（实际应用中应从历史数据服务获取）
      const returns = new Map<string, number[]>();
      formData.holdings.forEach(holding => {
        // 生成模拟的日收益率数据
        const dailyReturns = Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.04);
        returns.set(holding.symbol, dailyReturns);
      });

      const optimizationParams = {
        method: formData.riskTolerance === 'conservative' ? 'min-variance' as const :
                formData.riskTolerance === 'aggressive' ? 'max-sharpe' as const : 'risk-parity' as const,
        constraints: {
          maxWeight: formData.maxPositionSize / 100,
          minWeight: 0.02, // 最小2%
        },
        riskFreeRate: 0.03
      };

      const result = portfolioService.optimizePortfolio(returns, optimizationParams);
      setOptimizationResult(result);

      // 更新持仓权重
      const optimizedHoldings = formData.holdings.map(holding => {
        const weight = result.weights.get(holding.symbol) || 0;
        const targetValue = formData.initialCash * weight;
        const quantity = Math.floor(targetValue / holding.price / 100) * 100; // 整手
        
        return {
          ...holding,
          quantity
        };
      });

      setFormData(prev => ({
        ...prev,
        holdings: optimizedHoldings
      }));
    } catch (error) {
      console.error('Portfolio optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // 保存配置并同步到其他模块
  const handleSave = async () => {
    try {
      // 保存基本配置
      const updatedPortfolio = portfolioService.updateConfiguration(
        formData.initialCash, 
        formData.holdings
      );

      // 保存高级配置到本地存储
      const advancedConfig = {
        name: formData.name,
        description: formData.description,
        riskTolerance: formData.riskTolerance,
        rebalanceFrequency: formData.rebalanceFrequency,
        maxPositionSize: formData.maxPositionSize,
        minCashRatio: formData.minCashRatio,
        template: selectedTemplate
      };

      localStorage.setItem('portfolio_advanced_config', JSON.stringify(advancedConfig));

      // 构建完整的Portfolio配置对象
      const fullPortfolioConfig = {
        ...updatedPortfolio,
        ...advancedConfig,
        holdings: formData.holdings,
        totalValue: formData.initialCash,
        updatedAt: new Date(),
        // 添加资产配置元数据
        assetConfig: {
          stocks: formData.holdings.map(h => ({
            symbol: h.symbol,
            name: h.name,
            quantity: h.quantity,
            cost: h.cost,
            currentPrice: h.price,
            weight: (h.quantity * h.price) / formData.initialCash
          })),
          cash: formData.initialCash - formData.holdings.reduce((sum, h) => sum + (h.quantity * h.cost), 0),
          totalStocks: formData.holdings.length,
          sectors: await extractSectors(formData.holdings),
          riskMetrics: {
            concentration: calculateConcentration(formData.holdings, formData.initialCash),
            diversification: formData.holdings.length,
            maxPositionWeight: Math.max(...formData.holdings.map(h => (h.quantity * h.price) / formData.initialCash))
          }
        }
      };

      // 同步Portfolio配置到其他模块
      moduleCommunication.syncPortfolioConfig(fullPortfolioConfig);
      
      // 发送更新事件到 StrategyLab
      moduleCommunication.portfolioToStrategyLab({
        portfolioId: updatedPortfolio.id,
        portfolioConfig: fullPortfolioConfig,
        stocks: formData.holdings.map(h => h.symbol),
        riskTolerance: formData.riskTolerance,
        capital: formData.initialCash
      });

      // 发送更新事件到 Dashboard
      moduleCommunication.notifyPortfolioUpdated(fullPortfolioConfig);

      // 发送更新事件到 StockPicker (用于约束选股条件)
      moduleCommunication.portfolioToStockPicker({
        currentHoldings: formData.holdings.map(h => h.symbol),
        maxPositions: Math.floor(100 / formData.maxPositionSize), // 根据最大仓位计算可持有数量
        excludeSectors: [], // 可以根据风险偏好排除某些行业
        targetSectors: await extractSectors(formData.holdings),
        riskConstraints: {
          maxVolatility: formData.riskTolerance === 'conservative' ? 0.15 : 
                         formData.riskTolerance === 'aggressive' ? 0.35 : 0.25,
          minLiquidity: 1000000, // 最小日成交额
          maxConcentration: formData.maxPositionSize / 100
        }
      });

      // 保存配置到 ConfigManager 以便持久化
      configManager.saveConfig('portfolio', fullPortfolioConfig);

      onSave();
      
      // 显示成功提示
      toast({
        title: "配置保存成功",
        description: "投资组合配置已更新并同步到所有相关模块",
        type: "success",
        duration: 3000
      });

      console.log('[Portfolio] Configuration saved and synced to all modules:', fullPortfolioConfig);
    } catch (error) {
      console.error('Failed to save portfolio configuration:', error);
      toast({
        title: "保存失败",
        description: "无法保存投资组合配置，请重试",
        type: "error",
        duration: 3000
      });
    }
  };

  // 辅助函数：提取行业信息
  const extractSectors = async (holdings: any[]): Promise<string[]> => {
    try {
      // 获取股票信息服务实例
      const stockInfoService = new (await import('../services')).StockInfoService();
      
      // 批量获取股票基本信息
      const symbols = holdings.map(h => h.symbol);
      const stockInfoMap = await stockInfoService.getBatchStockBasicInfo(symbols);
      
      // 提取所有独特的行业
      const sectors = new Set<string>();
      const industries = new Set<string>();
      
      holdings.forEach(h => {
        const stockInfo = stockInfoMap.get(h.symbol);
        if (stockInfo) {
          // 优先使用 sector（板块），如果没有则使用 industry（行业）
          if (stockInfo.sector) {
            sectors.add(stockInfo.sector);
          } else if (stockInfo.industry) {
            industries.add(stockInfo.industry);
          }
        }
      });
      
      // 合并板块和行业信息
      const allSectors = [...Array.from(sectors), ...Array.from(industries)];
      
      // 如果没有获取到任何行业信息，使用基于股票代码的默认分类
      if (allSectors.length === 0) {
        holdings.forEach(h => {
          // 基于股票代码的备用分类逻辑
          if (h.symbol.startsWith('600') || h.symbol.startsWith('601')) {
            sectors.add('主板-金融');
          } else if (h.symbol.startsWith('000') || h.symbol.startsWith('002')) {
            sectors.add('主板-综合');
          } else if (h.symbol.startsWith('300')) {
            sectors.add('创业板');
          } else if (h.symbol.startsWith('688')) {
            sectors.add('科创板');
          } else if (h.symbol.startsWith('8') || h.symbol.startsWith('4')) {
            sectors.add('新三板');
          } else {
            sectors.add('其他');
          }
        });
        return Array.from(sectors);
      }
      
      return allSectors;
    } catch (error) {
      console.error('Failed to fetch stock sectors:', error);
      
      // 发生错误时使用备用分类
      const sectors = new Set<string>();
      holdings.forEach(h => {
        if (h.symbol.startsWith('600') || h.symbol.startsWith('601')) {
          sectors.add('主板-金融');
        } else if (h.symbol.startsWith('000') || h.symbol.startsWith('002')) {
          sectors.add('主板-综合');
        } else if (h.symbol.startsWith('300')) {
          sectors.add('创业板');
        } else if (h.symbol.startsWith('688')) {
          sectors.add('科创板');
        } else {
          sectors.add('其他');
        }
      });
      return Array.from(sectors);
    }
  };

  // 辅助函数：计算持仓集中度
  const calculateConcentration = (holdings: any[], totalValue: number): number => {
    if (holdings.length === 0) return 0;
    const weights = holdings.map(h => (h.quantity * h.price) / totalValue);
    return Math.max(...weights);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0D1B2E] border border-[#1E3A5F] text-white max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>配置投资组合</DialogTitle>
          <DialogDescription className="text-gray-400">
            手动配置、使用模板或进行高级设置来管理您的投资组合。
          </DialogDescription>
        </DialogHeader>
        
        {/* 标签页导航 */}
        <div className="flex border-b border-[#1E3A5F]">
          {[
            { id: 'manual', label: '手动配置', icon: Settings },
            { id: 'template', label: '组合模板', icon: Layers },
            { id: 'advanced', label: '高级设置', icon: Target }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#0EA5E9] border-b-2 border-[#0EA5E9]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 py-4 custom-scrollbar">
          {/* 手动配置标签页 */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400">组合名称</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-[#1A2942] border-[#2A3F5F] text-white"
                    placeholder="我的投资组合"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">初始资金 (总资产)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">¥</span>
                    <Input 
                      type="number" 
                      value={formData.initialCash.toString()} 
                      onChange={e => setFormData(prev => ({ ...prev, initialCash: Number(e.target.value) }))}
                      className="bg-[#1A2942] border-[#2A3F5F] pl-7 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400">组合描述</Label>
                <Input 
                  value={formData.description} 
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-[#1A2942] border-[#2A3F5F] text-white"
                  placeholder="描述您的投资策略和目标"
                />
              </div>

              {/* 添加持仓股票 */}
              <div className="space-y-3 p-4 bg-[#1A2942]/50 rounded-lg border border-[#2A3F5F]">
                <Label className="text-[#0EA5E9] font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" /> 添加持仓
                </Label>
            
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-4 space-y-1">
                <Label className="text-xs text-gray-500">搜索股票</Label>
                <div className="relative">
                    <Input 
                        placeholder="代码/名称" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-[#0D1B2E] border-[#2A3F5F] text-xs h-8"
                    />
                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-[#0D1B2E] border border-[#2A3F5F] z-50 max-h-40 overflow-y-auto mt-1 rounded shadow-lg">
                            {searchResults.map(s => (
                                <div 
                                    key={s.symbol}
                                    className="px-3 py-2 hover:bg-[#1A2942] cursor-pointer text-xs flex justify-between"
                                    onClick={() => {
                                        setNewStock({...newStock, symbol: s.symbol, name: s.name});
                                        setSearchQuery(`${s.name} (${s.symbol})`);
                                        setSearchResults([]);
                                    }}
                                >
                                    <span>{s.name}</span>
                                    <span className="text-gray-500">{s.symbol}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
              </div>
              
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-gray-500">数量 (股)</Label>
                <Input 
                    type="number" 
                    value={newStock.quantity}
                    onChange={e => setNewStock({...newStock, quantity: e.target.value})}
                    className="bg-[#0D1B2E] border-[#2A3F5F] text-xs h-8"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-gray-500">成本价</Label>
                <Input 
                    type="number" 
                    value={newStock.cost}
                    onChange={e => setNewStock({...newStock, cost: e.target.value})}
                    className="bg-[#0D1B2E] border-[#2A3F5F] text-xs h-8"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-gray-500">现价 (可选)</Label>
                <Input 
                    type="number" 
                    value={newStock.price}
                    onChange={e => setNewStock({...newStock, price: e.target.value})}
                    placeholder={newStock.cost}
                    className="bg-[#0D1B2E] border-[#2A3F5F] text-xs h-8"
                />
              </div>

              <div className="col-span-2">
                <Button onClick={handleAddStock} size="sm" className="w-full bg-[#0EA5E9] hover:bg-[#0EA5E9]/80 h-8">
                    添加
                </Button>
              </div>
            </div>
          </div>

          {/* 3. Holdings List */}
          <div className="space-y-2">
            <Label className="text-gray-400">当前持仓 ({formData.holdings.length})</Label>
            <div className="border border-[#2A3F5F] rounded-lg overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                <Table>
                    <TableHeader className="bg-[#1A2942] sticky top-0">
                        <TableRow className="border-b-[#2A3F5F]">
                            <TableHead className="text-gray-400 h-9">标的</TableHead>
                            <TableHead className="text-gray-400 h-9 text-right">数量</TableHead>
                            <TableHead className="text-gray-400 h-9 text-right">成本</TableHead>
                            <TableHead className="text-gray-400 h-9 text-right">现价</TableHead>
                            <TableHead className="text-gray-400 h-9 w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {formData.holdings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-gray-500 py-4">无持仓</TableCell>
                            </TableRow>
                        ) : (
                            formData.holdings.map((h, i) => (
                                <TableRow key={i} className="border-b-[#2A3F5F] hover:bg-[#1A2942]/50">
                                    <TableCell className="py-2">
                                        <div className="flex flex-col">
                                            <span className="text-gray-200">{h.name}</span>
                                            <span className="text-xs text-gray-500">{h.symbol}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-2">{h.quantity}</TableCell>
                                    <TableCell className="text-right py-2">{h.cost}</TableCell>
                                    <TableCell className="text-right py-2 text-[#0EA5E9]">{h.price}</TableCell>
                                    <TableCell className="py-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-gray-500 hover:text-red-400"
                                            onClick={() => handleRemoveStock(i)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
              </div>
            </div>
            </div>
          )}

          {/* 组合模板标签页 */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-400">
                选择预设的投资组合模板，快速构建符合您风险偏好的组合配置。
              </div>
              
              <div className="grid gap-4">
                {availableTemplates.map((template) => (
                  <div 
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedTemplate === template.id
                        ? 'border-[#0EA5E9] bg-[#0EA5E9]/10'
                        : 'border-[#2A3F5F] hover:border-[#0EA5E9]/50'
                    }`}
                    onClick={() => handleApplyTemplate(template.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-200">{template.name}</h4>
                        <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-1 rounded ${
                          template.riskProfile === 'conservative' ? 'bg-green-500/20 text-green-400' :
                          template.riskProfile === 'balanced' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {template.riskProfile === 'conservative' ? '稳健型' :
                           template.riskProfile === 'balanced' ? '平衡型' : '成长型'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                      <div>
                        <span className="text-gray-500">目标收益:</span>
                        <span className="text-[#0EA5E9] ml-1">{(template.expectedReturn * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">预期风险:</span>
                        <span className="text-orange-400 ml-1">{(template.expectedRisk * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">持仓构成:</div>
                      <div className="flex flex-wrap gap-1">
                        {template.holdings.slice(0, 4).map((holding) => (
                          <span 
                            key={holding.symbol}
                            className="text-xs bg-[#1A2942] px-2 py-1 rounded"
                          >
                            {holding.name} {(holding.targetWeight * 100).toFixed(0)}%
                          </span>
                        ))}
                        {template.holdings.length > 4 && (
                          <span className="text-xs text-gray-500">
                            +{template.holdings.length - 4}更多...
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {selectedTemplate === template.id && (
                      <div className="mt-3 pt-3 border-t border-[#2A3F5F]">
                        <Button 
                          size="sm"
                          className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/80 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyTemplate(template.id);
                          }}
                        >
                          应用此模板
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 高级设置标签页 */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="text-sm text-gray-400">
                配置高级参数以自定义您的组合管理策略。
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {/* 风险管理 */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-200 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#0EA5E9]" />
                    风险管理
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-400 text-xs">风险偏好</Label>
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        {[
                          { value: 'conservative', label: '稳健' },
                          { value: 'balanced', label: '平衡' },
                          { value: 'aggressive', label: '激进' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setFormData(prev => ({ ...prev, riskTolerance: option.value as any }))}
                            className={`p-2 text-xs rounded transition-colors ${
                              formData.riskTolerance === option.value
                                ? 'bg-[#0EA5E9] text-white'
                                : 'bg-[#1A2942] text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-400 text-xs">单一持仓最大比例</Label>
                      <div className="mt-1 relative">
                        <Input 
                          type="number"
                          value={formData.maxPositionSize.toString()}
                          onChange={e => setFormData(prev => ({ ...prev, maxPositionSize: Number(e.target.value) }))}
                          className="bg-[#1A2942] border-[#2A3F5F] text-white text-sm pr-8"
                          min="1"
                          max="50"
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500 text-xs">%</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-400 text-xs">最低现金比例</Label>
                      <div className="mt-1 relative">
                        <Input 
                          type="number"
                          value={formData.minCashRatio.toString()}
                          onChange={e => setFormData(prev => ({ ...prev, minCashRatio: Number(e.target.value) }))}
                          className="bg-[#1A2942] border-[#2A3F5F] text-white text-sm pr-8"
                          min="0"
                          max="50"
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500 text-xs">%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 再平衡策略 */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-200 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#0EA5E9]" />
                    再平衡策略
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-400 text-xs">再平衡频率</Label>
                      <div className="mt-1 space-y-2">
                        {[
                          { value: 'monthly', label: '每月' },
                          { value: 'quarterly', label: '每季度' },
                          { value: 'semi-annually', label: '半年' },
                          { value: 'annually', label: '每年' }
                        ].map((option) => (
                          <label 
                            key={option.value}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="rebalance"
                              value={option.value}
                              checked={formData.rebalanceFrequency === option.value}
                              onChange={e => setFormData(prev => ({ ...prev, rebalanceFrequency: e.target.value as any }))}
                              className="text-[#0EA5E9]"
                            />
                            <span className="text-sm text-gray-300">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOptimizePortfolio}
                        disabled={isOptimizing}
                        className="w-full border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#0EA5E9] hover:text-white disabled:opacity-50"
                      >
                        {isOptimizing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            优化中...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            智能优化组合
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 预览当前配置 */}
              <div className="p-4 bg-[#1A2942]/50 rounded-lg border border-[#2A3F5F]">
                <h5 className="text-sm font-medium text-gray-200 mb-3">配置预览</h5>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">风险偏好:</span>
                    <span className="text-gray-300 ml-1">
                      {formData.riskTolerance === 'conservative' ? '稳健型' :
                       formData.riskTolerance === 'balanced' ? '平衡型' : '激进型'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">再平衡频率:</span>
                    <span className="text-gray-300 ml-1">
                      {formData.rebalanceFrequency === 'monthly' ? '每月' :
                       formData.rebalanceFrequency === 'quarterly' ? '每季度' :
                       formData.rebalanceFrequency === 'semi-annually' ? '半年' : '每年'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">最大持仓:</span>
                    <span className="text-gray-300 ml-1">{formData.maxPositionSize}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">现金比例:</span>
                    <span className="text-gray-300 ml-1">{formData.minCashRatio}%</span>
                  </div>
                </div>
              </div>

              {/* 优化结果显示 */}
              {optimizationResult && (
                <div className="p-4 bg-[#1A2942]/50 rounded-lg border border-[#0EA5E9]/30">
                  <h5 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#0EA5E9]" />
                    优化结果
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                    <div>
                      <span className="text-gray-500">预期年化收益:</span>
                      <span className="text-[#10b981] ml-1">{(optimizationResult.expectedReturn * 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">预期年化风险:</span>
                      <span className="text-[#f97316] ml-1">{(optimizationResult.expectedRisk * 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">夏普比率:</span>
                      <span className="text-[#0ea5e9] ml-1">{optimizationResult.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">优化方法:</span>
                      <span className="text-gray-300 ml-1">
                        {formData.riskTolerance === 'conservative' ? '最小方差' :
                         formData.riskTolerance === 'aggressive' ? '最大夏普' : '风险平价'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">优化权重分配:</div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {optimizationResult.allocation.map((item) => (
                        <div key={item.symbol} className="flex justify-between text-xs">
                          <span className="text-gray-300">{item.symbol}</span>
                          <span className="text-[#0ea5e9]">{(item.weight * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-[#1E3A5F]">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-white">取消</Button>
          <Button onClick={handleSave} className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/80 text-white">保存配置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
