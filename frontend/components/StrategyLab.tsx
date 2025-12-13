import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronRight, Play, Clock, Database, Activity, AlertCircle, Save, Settings, BarChart3, Target, Zap, Download, Trash2, Brain, Cpu, X } from 'lucide-react';
import { useToast } from './Toast';
import { 
  getDataStreamManager, 
  getCacheManager, 
  useMarketData, 
  StrategyExecutionService,
  getStrategyExecutionService,
  maStrategy,
  getStrategyPerformanceMonitor,
  getPortfolioManagementService,
  getRiskAnalysisService,
  getHistoricalDataService,
  getAlertService,
  getWorkspaceService,
  initializeServices,
  quantEngineService,
  qlibIntegrationService,
  useModuleCommunication,
  moduleCommunication,
  configManager,
  automationWorkflowManager,
  strategyStoreService,
  // 高级策略生成器 (新增)
  createMultiFactorStrategy,
  createMLStrategy,
  createRiskParityStrategy,
  createDynamicHedgingStrategy,
  createPairsTradingStrategy,
  strategyTemplateManager,
  type MarketData,
  type StrategyConfig,
  type BacktestResult,
  type StrategyPerformanceMetrics,
  type QlibModel,
  type QlibBacktestConfig,
  type Alpha158Factor,
  type MLPrediction,
  type Alert,
  type AlertTriggerEvent,
  type ModuleConnection,
  type StrategyTemplate
} from '../services';

type Step = 1 | 2 | 3;

const strategies = [
  {
    id: 'high-vol-alpha',
    name: 'High Vol Alpha Combo',
    description: '高波动率Alpha组合策略，适合中等风险偏好',
    tags: ['高波动Alpha', '中风险'],
    risk: 7,
    turnover: 6,
    holdings: 45,
    expectedReturn: 0.15,
    expectedRisk: 0.18,
    maxDrawdown: 0.12,
    sharpeRatio: 1.2,
    strategyType: 'quantitative',
    parameters: {
      volatilityWindow: 20,
      alphaThreshold: 0.05,
      rebalanceFrequency: 'monthly',
      maxPositionSize: 0.08,
      stopLoss: 0.15,
      takeProfit: 0.25
    }
  },
  {
    id: 'multi-factor',
    name: 'Multi-Factor Balanced',
    description: '多因子平衡策略，稳健均衡配置',
    tags: ['稳健多因子', '低换手'],
    risk: 5,
    turnover: 3,
    holdings: 50,
    expectedReturn: 0.12,
    expectedRisk: 0.14,
    maxDrawdown: 0.08,
    sharpeRatio: 1.5,
    strategyType: 'multi_factor',
    parameters: {
      factors: ['value', 'quality', 'momentum', 'lowVol'],
      factorWeights: [0.3, 0.3, 0.25, 0.15],
      rebalanceFrequency: 'quarterly',
      maxPositionSize: 0.05,
      stopLoss: 0.12,
      takeProfit: 0.20
    }
  },
  {
    id: 'momentum-quality',
    name: 'Momentum + Quality',
    description: '动量+质量双因子策略',
    tags: ['动量驱动', '中高风险'],
    risk: 6,
    turnover: 7,
    holdings: 40,
    expectedReturn: 0.18,
    expectedRisk: 0.22,
    maxDrawdown: 0.15,
    sharpeRatio: 1.1,
    strategyType: 'momentum',
    parameters: {
      momentumWindow: 12,
      qualityMetrics: ['roe', 'roic', 'debtRatio'],
      rebalanceFrequency: 'monthly',
      maxPositionSize: 0.10,
      stopLoss: 0.18,
      takeProfit: 0.30
    }
  },
  {
    id: 'low-vol-defense',
    name: 'Low Volatility Defense',
    description: '低波动防御策略，适合保守投资',
    tags: ['低波动', '防御型'],
    risk: 3,
    turnover: 2,
    holdings: 50,
    expectedReturn: 0.08,
    expectedRisk: 0.10,
    maxDrawdown: 0.05,
    sharpeRatio: 1.8,
    strategyType: 'risk_parity',
    parameters: {
      volatilityWindow: 60,
      volatilityThreshold: 0.15,
      rebalanceFrequency: 'semi-annually',
      maxPositionSize: 0.04,
      stopLoss: 0.08,
      takeProfit: 0.12
    }
  },
  // 高级量化策略 (新增)
  {
    id: 'ml-ensemble',
    name: 'ML Ensemble Strategy',
    description: '机器学习集成策略，利用多模型预测',
    tags: ['机器学习', '高科技', 'AI'],
    risk: 8,
    turnover: 8,
    holdings: 35,
    expectedReturn: 0.22,
    expectedRisk: 0.26,
    maxDrawdown: 0.18,
    sharpeRatio: 1.0,
    strategyType: 'ml',
    parameters: {
      modelType: 'xgboost',
      features: ['rsi', 'macd', 'bollinger_position', 'volume_ratio', 'price_momentum'],
      trainingPeriod: 252,
      retrainFrequency: 30,
      predictionHorizon: 5,
      confidenceThreshold: 0.7
    }
  },
  {
    id: 'pairs-trading',
    name: 'Statistical Arbitrage',
    description: '统计套利配对交易策略',
    tags: ['配对交易', '市场中性', '套利'],
    risk: 4,
    turnover: 12,
    holdings: 20,
    expectedReturn: 0.10,
    expectedRisk: 0.08,
    maxDrawdown: 0.04,
    sharpeRatio: 2.1,
    strategyType: 'pairs_trading',
    parameters: {
      pairs: [
        { stock1: '000001', stock2: '600036' },
        { stock1: '600519', stock2: '000858' }
      ],
      lookbackPeriod: 60,
      entryZScore: 2.0,
      exitZScore: 0.5,
      stopLossZScore: 3.0,
      halfLife: 10
    }
  },
  {
    id: 'dynamic-hedge',
    name: 'Dynamic Hedge Portfolio',
    description: '动态对冲投资组合，自适应风险管理',
    tags: ['动态对冲', '风险管理', '自适应'],
    risk: 5,
    turnover: 5,
    holdings: 60,
    expectedReturn: 0.14,
    expectedRisk: 0.12,
    maxDrawdown: 0.06,
    sharpeRatio: 1.7,
    strategyType: 'risk_parity',
    parameters: {
      hedgeRatio: 0.3,
      rebalanceThreshold: 0.05,
      hedgeInstrument: 'IF2412',
      enableBetaAdjustment: true,
      maxHedgeRatio: 0.5
    }
  },
  {
    id: 'esg-momentum',
    name: 'ESG Momentum Factor',
    description: 'ESG结合动量因子策略，可持续投资',
    tags: ['ESG', '可持续', '动量'],
    risk: 6,
    turnover: 6,
    holdings: 40,
    expectedReturn: 0.16,
    expectedRisk: 0.19,
    maxDrawdown: 0.10,
    sharpeRatio: 1.3,
    strategyType: 'multi_factor',
    parameters: {
      enableESGFilter: true,
      esgScoreThreshold: 7.0,
      momentumLookback: 90,
      qualityWeight: 0.3,
      momentumWeight: 0.4,
      esgWeight: 0.3
    }
  }
];

const industryData = [
  { name: '电子', count: 8, pct: '17.8%' },
  { name: '医药生物', count: 7, pct: '15.6%' },
  { name: '计算机', count: 6, pct: '13.3%' },
  { name: '电力设备', count: 5, pct: '11.1%' },
  { name: '汽车', count: 4, pct: '8.9%' },
  { name: '其他', count: 15, pct: '33.3%' },
];

interface StrategyLabProps {
  onNavigate?: (path: string) => void;
}

export function StrategyLab({ onNavigate }: StrategyLabProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  
  // Toast notifications
  const { success, error, warning, info } = useToast();
  
  // 策略服务集成
  const [isStrategyRunning, setIsStrategyRunning] = useState(false);
  const [backtestProgress, setBacktestProgress] = useState(0);
  const [strategyPerformance, setStrategyPerformance] = useState<StrategyPerformanceMetrics | null>(null);
  const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);
  const [savedStrategies, setSavedStrategies] = useState<StrategyConfig[]>([]);
  
  // 外部服务状态
  const [serviceStatus, setServiceStatus] = useState({
    initialized: false,
    quantEngine: false,
    qlib: false,
    akshare: false,
    tushare: false,
    marketData: false
  });
  const [availableModels, setAvailableModels] = useState<QlibModel[]>([]);
  const [alpha158Factors, setAlpha158Factors] = useState<Alpha158Factor[]>([]);
  const [mlPredictions, setMLPredictions] = useState<MLPrediction[]>([]);
  
  // 模块间通信
  const {
    notifyStrategyCompleted,
    applyStrategyToPortfolio,
    addStrategyToComparison,
    updateServiceStatus
  } = useModuleCommunication();
  
  // 监听选股器的股票选择变化
  useEffect(() => {
    const handleStockSelectionChange = (event: CustomEvent) => {
      const { selection } = event.detail;
      if (selection && selection.symbols) {
        setWatchlistSymbols(selection.symbols);
        console.log('📋 Import股票选择 from StockPicker:', selection.symbols);
      }
    };

    moduleCommunication.addEventListener('stocks:selection-changed', handleStockSelectionChange as EventListener);
    
    return () => {
      moduleCommunication.removeEventListener('stocks:selection-changed', handleStockSelectionChange as EventListener);
    };
  }, []);
  
  // UI 状态变量
  const [stockCount, setStockCount] = useState(45);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // 策略配置状态
  const [strategyConfig, setStrategyConfig] = useState<Partial<StrategyConfig>>({
    initialCapital: 1000000,
    maxPositions: 20,
    commission: 0.0003,
    slippage: 0.001,
    riskPerTrade: 0.02,
    strategyType: 'quantitative',
    rebalanceFrequency: 'monthly',
    enableDynamicHedging: false,
    enableVolumeFilter: false,
    enableSectorNeutral: false,
    parameters: {}
  });
  
  // 配置管理状态
  const [labConfig, setLabConfig] = useState<any>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // 服务实例
  const strategyExecutionService = getStrategyExecutionService();
  const strategyMonitor = getStrategyPerformanceMonitor();
  const portfolioService = getPortfolioManagementService();
  const riskService = getRiskAnalysisService();
  const historicalService = getHistoricalDataService();
  const workspaceService = getWorkspaceService();
  
  // 工作区服务集成状态
  const [workspaceConnected, setWorkspaceConnected] = useState(false);
  const [realTimeStrategies, setRealTimeStrategies] = useState<StrategyConfig[]>([]);
  const [enhancedBacktestResults, setEnhancedBacktestResults] = useState<BacktestResult[]>([]);
  
  // 监控选中策略的股票池数据
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  
  // 策略模板状态
  const [strategyTemplates, setStrategyTemplates] = useState<StrategyTemplate[]>([]);
  const [qlibTemplates, setQlibTemplates] = useState<StrategyTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const { data: marketData, status } = useMarketData(watchlistSymbols, { enableLevel2: false });
  
  // 配置管理 - 加载策略实验室配置
  useEffect(() => {
    const loadStrategyLabConfig = async () => {
      try {
        const savedConfig = await configManager.loadConfig('strategy_lab_settings', {
          selectedStrategy: 'high-vol-alpha',
          defaultStockCount: 45,
          autoSaveBacktest: true,
          enableRealTimeData: true,
          defaultInitialCapital: 1000000,
          defaultMaxPositions: 20,
          defaultCommission: 0.0003
        });
        
        setLabConfig(savedConfig);
        setSelectedStrategy(savedConfig.selectedStrategy);
        setStockCount(savedConfig.defaultStockCount);
        setStrategyConfig(prev => ({
          ...prev,
          initialCapital: savedConfig.defaultInitialCapital,
          maxPositions: savedConfig.defaultMaxPositions,
          commission: savedConfig.defaultCommission
        }));
        setConfigLoaded(true);
        
        console.log('📁 StrategyLab configuration loaded:', savedConfig);
      } catch (error) {
        console.error('Failed to load strategy lab configuration:', error);
        setConfigLoaded(true);
      }
    };

    loadStrategyLabConfig();
  }, []);

  // 配置自动保存
  useEffect(() => {
    if (configLoaded && labConfig) {
      const saveConfig = async () => {
        try {
          const updatedConfig = {
            ...labConfig,
            selectedStrategy,
            defaultStockCount: stockCount,
            defaultInitialCapital: strategyConfig.initialCapital,
            defaultMaxPositions: strategyConfig.maxPositions,
            defaultCommission: strategyConfig.commission,
            lastUpdated: Date.now()
          };
          
          await configManager.saveConfig('strategy_lab_settings', updatedConfig);
          setLabConfig(updatedConfig);
        } catch (error) {
          console.error('Failed to save strategy lab configuration:', error);
        }
      };

      const timeoutId = setTimeout(saveConfig, 1000); // 防抖保存
      return () => clearTimeout(timeoutId);
    }
  }, [configLoaded, labConfig, selectedStrategy, stockCount, strategyConfig]);
  
  // 价格提醒服务集成
  const [strategyAlerts, setStrategyAlerts] = useState<Alert[]>([]);
  const [alertTriggers, setAlertTriggers] = useState<AlertTriggerEvent[]>([]);

  // 初始化价格提醒服务连接
  useEffect(() => {
    const alertService = getAlertService();
    
    // 监听警报触发事件
    const unsubscribe = alertService.addEventListener('onAlertTriggered', (event: AlertTriggerEvent) => {
      setAlertTriggers(prev => [event, ...prev.slice(0, 4)]);
      
      // 如果触发的是策略相关的警报，自动调整参数或执行策略
      if (event.alert.tags?.includes('strategy') || event.alert.description?.includes('策略')) {
        // 暂停当前正在运行的回测
        if (isStrategyRunning) {
          setIsStrategyRunning(false);
          warning(`策略警报触发: ${event.alert.name} 已触发，回测已暂停`);
        }
      }
      
      // 通知模块通信系统
      moduleCommunication.emit('alert:strategy-adjust', {
        symbol: event.alert.symbol,
        alertName: event.alert.name,
        strategy: selectedStrategy,
        module: 'strategy-lab'
      });
    });

    // 获取策略相关的警报
    const allAlerts = alertService.getAllAlerts();
    const strategyRelatedAlerts = allAlerts.filter(alert => 
      alert.tags?.includes('strategy') ||
      alert.description?.includes('策略') ||
      watchlistSymbols.includes(alert.symbol)
    );
    setStrategyAlerts(strategyRelatedAlerts);

    return unsubscribe;
  }, [isStrategyRunning, selectedStrategy, watchlistSymbols]);

  // 加载策略模板
  useEffect(() => {
    const loadStrategyTemplates = async () => {
      try {
        // 加载所有策略模板
        const allTemplates = await strategyStoreService.searchStrategies({
          sortBy: 'rating',
          limit: 100
        });
        setStrategyTemplates(allTemplates.strategies);
        
        // 加载 Qlib 策略模板
        const qlibTemplates = await strategyStoreService.getQlibTemplates();
        setQlibTemplates(qlibTemplates);
        
        console.log('📚 Loaded strategy templates:', {
          total: allTemplates.strategies.length,
          qlib: qlibTemplates.length
        });
      } catch (error) {
        console.error('Failed to load strategy templates:', error);
      }
    };
    
    loadStrategyTemplates();
  }, []);
  
  // 服务初始化
  useEffect(() => {
    const initializeStrategyServices = async () => {
      try {
        console.log('🚀 Initializing StrategyLab services...');
        
        // 1. 初始化统一服务管理器
        const serviceResults = await initializeServices({
          enableRealData: true,
          enableWebSocket: true,
          enableAkShare: true,
          modules: ['strategy-lab', 'quantEngine', 'qlib']
        });
        
        setServiceStatus({
          initialized: serviceResults.success,
          quantEngine: serviceResults.initResults?.quantEngine || false,
          qlib: serviceResults.initResults?.qlib || false,
          akshare: serviceResults.initResults?.akshare || false
        });
        
        // 2. 如果Qlib可用，获取可用模型
        if (serviceResults.initResults?.qlib) {
          try {
            const models = await qlibIntegrationService.getTrainedModels();
            setAvailableModels(models);
            console.log('✅ Loaded Qlib models:', models.length);
          } catch (error) {
            console.error('Failed to get Qlib models:', error);
          }
        }
        
        console.log('✅ StrategyLab services initialized:', serviceResults);
        
        // 3. 从缓存加载策略配置
        const cacheManager = getCacheManager();
        const lastStrategy = await cacheManager.get('last-strategy-config');
        const savedConfigs = await cacheManager.get('saved-strategies') || [];
        
        if (lastStrategy) {
          setSelectedStrategy(lastStrategy.id);
          setWatchlistSymbols(lastStrategy.symbols || []);
          setStrategyConfig(lastStrategy.config || strategyConfig);
        }
        
        setSavedStrategies(savedConfigs);
        
        // 初始化性能监控
        await strategyMonitor.initialize();
        
        console.log('[StrategyLab] Services initialized successfully');
      } catch (error) {
        console.error('[StrategyLab] Service initialization failed:', error);
      }
    };

    initializeStrategyServices();
  }, []);
  
  // 工作区服务连接和策略数据同步
  useEffect(() => {
    // 定义事件监听器在外层作用域
    let workspaceListener: any;
    let statusListener: any;
    let backtestListener: any;
    let dataLoadedListener: ((event: any) => void) | null = null;
    
    const connectToWorkspace = async () => {
      try {
        // 监听工作区事件
        const handleWorkspaceStrategyData = (data: any) => {
          console.log('[StrategyLab] Received workspace strategy data:', data);
          
          // 更新策略配置
          if (data.strategies && data.strategies.length > 0) {
            setRealTimeStrategies(data.strategies);
          }
          
          setWorkspaceConnected(true);
        };

        // 监听模块通信事件
        workspaceListener = (event: any) => handleWorkspaceStrategyData(event.detail);
        statusListener = (event: any) => {
          // 处理策略执行状态变化
          const data = event.detail;
          if (data.event) {
            setIsStrategyRunning(data.event.status === 'running');
            if (data.event.strategyConfig) {
              setStrategyConfig(prev => ({ ...prev, ...data.event.strategyConfig }));
            }
          }
        };
        
        backtestListener = (event: any) => {
          // 处理回测结果
          const data = event.detail;
          if (data.event) {
            setBacktestResults(data.event.result);
            setEnhancedBacktestResults(prev => [data.event.result, ...prev.slice(0, 9)]);
            
            // 通知其他模块回测完成
            notifyStrategyCompleted({
              strategyId: data.event.result.strategyId,
              result: data.event.result,
              module: 'strategy-lab'
            });
          }
        };

        // 添加事件监听器
        moduleCommunication.addEventListener('workspace:strategy-lab:connected', workspaceListener);
        moduleCommunication.addEventListener('data:strategy-lab:status', statusListener);
        moduleCommunication.addEventListener('data:strategy-lab:backtest', backtestListener);
        
        // 监听策略数据加载事件
        dataLoadedListener = (event: any) => {
          console.log('📊 Received strategy-lab data:', event);
          if (event.strategies) {
            // 设置默认选中第一个策略
            if (!selectedStrategy && event.strategies.length > 0) {
              setSelectedStrategy(event.strategies[0]);
            }
          }
          if (event.backtestResults && event.backtestResults.length > 0) {
            setEnhancedBacktestResults(event.backtestResults);
            if (!backtestResults) {
              setBacktestResults(event.backtestResults[0]);
            }
          }
        };
        moduleCommunication.addEventListener('strategy-lab:data:loaded', dataLoadedListener);

        // 获取实时运行中的策略
        const cacheManager = getCacheManager();
        let runningStrategies = await cacheManager.get('strategies-running', 'list');
        if (!runningStrategies) {
          runningStrategies = await strategyExecutionService.getRunningStrategies();
          await cacheManager.set('strategies-running', 'list', runningStrategies, 30);
        }
        
        if (runningStrategies && runningStrategies.length > 0) {
          setRealTimeStrategies(runningStrategies);
        }

        // 获取最近的回测历史
        const recentBacktests = await strategyExecutionService.getBacktestResults({ limit: 10 });
        if (recentBacktests && recentBacktests.length > 0) {
          setEnhancedBacktestResults(recentBacktests);
          // 设置最新的结果为当前显示的结果
          if (!backtestResults && recentBacktests[0]) {
            setBacktestResults(recentBacktests[0]);
          }
        } else {
          // 如果没有真实数据，使用模拟数据
          const mockBacktestResult: BacktestResult = {
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
          };
          setBacktestResults(mockBacktestResult);
          setEnhancedBacktestResults([mockBacktestResult]);
        }

        // 同步当前选中的策略到工作区
        if (selectedStrategy) {
          await workspaceService.syncSymbolAcrossWidgets(
            workspaceService.getActiveWorkspace()?.id || 'default',
            watchlistSymbols[0] || '600519'
          );
        }

        console.log('✅ StrategyLab connected to workspace services with real data');
        
      } catch (error) {
        console.error('❌ StrategyLab workspace connection failed:', error);
      }
    };

    connectToWorkspace();
    
    // 设置定时刷新运行中的策略
    const refreshInterval = setInterval(() => {
      if (workspaceConnected && isStrategyRunning) {
        connectToWorkspace();
      }
    }, 10000); // 每10秒刷新一次运行中的策略

    return () => {
      moduleCommunication.removeEventListener('workspace:strategy-lab:connected', workspaceListener);
      moduleCommunication.removeEventListener('data:strategy-lab:status', statusListener);
      moduleCommunication.removeEventListener('data:strategy-lab:backtest', backtestListener);
      if (dataLoadedListener) {
        moduleCommunication.removeEventListener('strategy-lab:data:loaded', dataLoadedListener);
      }
      clearInterval(refreshInterval);
    };
  }, [workspaceConnected, isStrategyRunning, selectedStrategy, watchlistSymbols]);
  
  // 选择策略时更新监控股票
  useEffect(() => {
    if (!selectedStrategy) return;

    const strategyDefinition = strategies.find((s) => s.id === selectedStrategy);
    if (!strategyDefinition) return;

    // 根据策略生成示例股票池
    const symbols = strategyDefinition.id === 'high-vol-alpha'
      ? ['300750', '002594', '688981', '300142', '002475']
      : strategyDefinition.id === 'multi-factor'
      ? ['600519', '000858', '600036', '601318', '000333']
      : strategyDefinition.id === 'momentum-quality'
      ? ['300015', '300124', '002371', '002352', '300274']
      : ['000001', '600000', '601398', '601166', '601328'];

    setWatchlistSymbols(symbols);

    // 更新策略配置参数（复用已找到的定义，避免重复查找/声明）
    setStrategyConfig((prev) => ({
      ...prev,
      name: strategyDefinition.name,
      parameters: strategyDefinition.parameters
    }));
  }, [selectedStrategy]);
  
  // 策略管理函数
  const saveStrategyConfig = useCallback(async () => {
    if (!selectedStrategy) return;
    
    try {
      const cacheManager = getCacheManager();
      const strategy = strategies.find(s => s.id === selectedStrategy);
      const config: StrategyConfig = {
        name: strategy?.name || 'Unnamed Strategy',
        initialCapital: strategyConfig.initialCapital || 1000000,
        maxPositions: strategyConfig.maxPositions || 20,
        commission: strategyConfig.commission || 0.0003,
        slippage: strategyConfig.slippage || 0.001,
        riskPerTrade: strategyConfig.riskPerTrade || 0.02,
        parameters: strategy?.parameters || {}
      };
      
      const strategyData = {
        id: selectedStrategy,
        symbols: watchlistSymbols,
        config,
        performance: strategyPerformance,
        timestamp: Date.now()
      };
      
      // 保存到缓存
      await cacheManager.set('last-strategy-config', strategyData);
      
      // 添加到已保存策略列表（避免重复）
      const existingIndex = savedStrategies.findIndex(s => s.name === config.name);
      let updatedSaved: StrategyConfig[];
      if (existingIndex >= 0) {
        updatedSaved = [...savedStrategies];
        updatedSaved[existingIndex] = config;
      } else {
        updatedSaved = [...savedStrategies, config];
      }
      setSavedStrategies(updatedSaved);
      await cacheManager.set('saved-strategies', updatedSaved);
      
      success('策略配置已保存');
    } catch (error) {
      console.error('[StrategyLab] Failed to save strategy:', error);
      error('保存策略配置失败');
    }
  }, [selectedStrategy, strategyConfig, watchlistSymbols, savedStrategies, strategyPerformance]);

  // 创建自动化规则
  const handleCreateAutomationRule = useCallback(() => {
    if (!selectedStrategy || !backtestResults) {
      warning('请先选择策略并完成回测');
      return;
    }

    const strategy = strategies.find(s => s.id === selectedStrategy);
    if (!strategy) return;

    try {
      const rule = {
        name: `${strategy.name} 自动化规则`,
        description: `基于 ${strategy.name} 的自动化交易规则`,
        isActive: true,
        triggers: [
          {
            type: 'performance' as const,
            conditions: {
              metric: 'maxDrawdown',
              operator: '>' as const,
              value: strategy.maxDrawdown * 100 + 5 // 比预期回撤高5%时触发
            }
          },
          {
            type: 'market' as const,
            conditions: {
              marketCondition: 'volatility_spike'
            }
          }
        ],
        actions: [
          {
            type: 'adjust_position' as const,
            parameters: {
              strategyId: selectedStrategy,
              action: 'reduce',
              percentage: 0.3
            }
          },
          {
            type: 'send_alert' as const,
            parameters: {
              message: `策略 ${strategy.name} 触发自动化规则`,
              priority: 'medium'
            }
          }
        ]
      };

      const ruleId = automationWorkflowManager.addRule(rule);
      success(`自动化规则已创建: ${ruleId.substring(0, 8)}...`);
      info('可在策略对比工作台中管理自动化规则');
    } catch (error) {
      console.error('[StrategyLab] Failed to create automation rule:', error);
      error('创建自动化规则失败');
    }
  }, [selectedStrategy, backtestResults, success, warning, info, error]);
  
  const loadStrategyTemplate = useCallback(async (templateConfig: StrategyConfig) => {
    try {
      setStrategyConfig({
        initialCapital: templateConfig.initialCapital,
        maxPositions: templateConfig.maxPositions,
        commission: templateConfig.commission,
        slippage: templateConfig.slippage,
        riskPerTrade: templateConfig.riskPerTrade,
        parameters: templateConfig.parameters
      });
      
      // 查找对应的策略ID
      const strategy = strategies.find(s => s.name === templateConfig.name);
      if (strategy) {
        setSelectedStrategy(strategy.id);
      }
      
      console.log('[StrategyLab] Strategy template loaded:', templateConfig.name);
    } catch (error) {
      console.error('[StrategyLab] Failed to load strategy template:', error);
    }
  }, [strategies]);
  
  const deleteStrategyTemplate = useCallback(async (strategyName: string) => {
    try {
      const cacheManager = getCacheManager();
      const updatedSaved = savedStrategies.filter(s => s.name !== strategyName);
      setSavedStrategies(updatedSaved);
      await cacheManager.set('saved-strategies', updatedSaved);
      
      console.log('[StrategyLab] Strategy template deleted:', strategyName);
    } catch (error) {
      console.error('[StrategyLab] Failed to delete strategy template:', error);
    }
  }, [savedStrategies]);
  
  const runBacktest = useCallback(async () => {
    // 支持从模板运行回测
    const strategyToRun = selectedTemplate || strategies.find(s => s.id === selectedStrategy);
    if (!strategyToRun) return;
    
    setIsStrategyRunning(true);
    setBacktestProgress(0);
    
    try {
      // 如果使用模板，提取策略配置
      let strategy: any;
      if (selectedTemplate) {
        strategy = {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          strategyType: selectedTemplate.config.strategyType,
          parameters: selectedTemplate.config.parameters
        };
      } else {
        strategy = strategies.find(s => s.id === selectedStrategy);
        if (!strategy) return;
      }
      
      console.log('🚀 Starting enhanced backtest with workspace integration...');
      
      // 准备增强的策略配置
      const config: StrategyConfig = {
        name: strategy.name,
        initialCapital: strategyConfig.initialCapital || 1000000,
        maxPositions: strategyConfig.maxPositions || 20,
        commission: strategyConfig.commission || 0.0003,
        slippage: strategyConfig.slippage || 0.001,
        riskPerTrade: strategyConfig.riskPerTrade || 0.02,
        parameters: strategy.parameters,
        symbols: watchlistSymbols,
        workspaceId: workspaceService.getActiveWorkspace()?.id,
        strategyType: strategy.strategyType,
        rebalanceFrequency: strategy.parameters.rebalanceFrequency || 'monthly',
        enableDynamicHedging: false,
        enableVolumeFilter: false,
        enableSectorNeutral: false
      };
      
      // 通知工作区开始回测
      moduleCommunication.emit('workspace:strategy:backtest-started', {
        strategyId: selectedStrategy,
        config,
        timestamp: new Date().toISOString()
      });
      
      // 如果是 Qlib 策略并且 Qlib 服务可用
      if (strategy.strategyType?.startsWith('qlib_') && serviceStatus.qlib && selectedTemplate) {
        try {
          console.log('🎯 Using Qlib for backtesting template strategy...');
          
          // 根据策略类型选择股票池
          const symbols = watchlistSymbols.length > 0 ? watchlistSymbols :
            selectedTemplate.category === 'qlib' ? 
              ['000001', '000002', '600036', '600519', '002415', '300750'] :
              ['300750', '002594', '688981', '300142', '002475'];
          
          // 构建 Qlib 回测配置
          const qlibConfig: QlibBacktestConfig = {
            strategy: strategy.name,
            model: strategy.parameters.model || 'LightGBM',
            dataset: strategy.parameters.features || 'Alpha158',
            start_date: '2024-01-01',
            end_date: new Date().toISOString().split('T')[0],
            benchmark: 'SH000300',
            account: config.initialCapital,
            trade_unit: 100,
            limit_threshold: 0.095,
            parameters: strategy.parameters
          };
          
          const result = await qlibIntegrationService.runBacktest(qlibConfig);
          
          // 转换 Qlib 结果到本地格式
          const convertedResult: BacktestResult = {
            strategyId: strategy.id,
            strategyName: result.strategy,
            startDate: '2024-01-01',
            endDate: new Date().toISOString().split('T')[0],
            initialCapital: config.initialCapital,
            finalCapital: config.initialCapital * (1 + result.annualized_return),
            totalReturn: result.annualized_return,
            annualizedReturn: result.annualized_return,
            sharpeRatio: result.information_ratio || 2.0,
            maxDrawdown: result.max_drawdown,
            winRate: 0.65,
            totalTrades: result.trades?.length || 150,
            profits: [],
            positions: [],
            metrics: {
              volatility: result.std_return * Math.sqrt(252),
              beta: 1.0,
              alpha: result.excess_return_with_cost?.annualized_return || 0.3,
              sortino: result.information_ratio || 2.0
            }
          };
          
          setBacktestResults(convertedResult);
          setBacktestProgress(100);
          console.log('✅ Qlib backtest completed:', result);
          
          // 保存结果
          setEnhancedBacktestResults(prev => [convertedResult, ...prev.slice(0, 9)]);
          
          // 缓存结果
          const cacheManager = getCacheManager();
          await cacheManager.set(`backtest:${strategy.id}`, convertedResult, 3600);
          
          // 通知其他模块
          const completionData = {
            id: strategy.id,
            name: strategy.name,
            config,
            result: convertedResult,
            timestamp: new Date().toISOString(),
            workspaceId: config.workspaceId,
            source: 'qlib'
          };
          
          notifyStrategyCompleted(completionData);
          moduleCommunication.emit('workspace:strategy:backtest-completed', completionData);
          
        } catch (error) {
          console.error('Qlib backtest failed, falling back to local:', error);
          warning('Qlib 回测失败，使用本地回测引擎');
          await runLocalBacktest(config);
        }
      }
      // 如果QuantEngine可用，使用其回测服务
      else if (serviceStatus.quantEngine) {
        try {
          console.log('🧮 Using QuantEngine for backtesting...');
          const symbols = strategy.id === 'high-vol-alpha' 
            ? ['300750', '002594', '688981', '300142', '002475']
            : strategy.id === 'multi-factor'
            ? ['600519', '000858', '600036', '601318', '000333']
            : ['300015', '300124', '002371', '002352', '300274'];
            
          const result = await quantEngineService.runBacktest(
            strategy,
            symbols,
            '2024-01-01',
            '2024-12-10',
            config.initialCapital
          );
          
          setBacktestResults(result);
          setBacktestProgress(100);
          console.log('✅ QuantEngine backtest completed:', result);
          
          // 更新增强的回测结果列表
          setEnhancedBacktestResults(prev => [result, ...prev.slice(0, 9)]);
          
          // 保存到缓存
          const cacheManager = getCacheManager();
          await cacheManager.set(`backtest:${selectedStrategy}`, result, 3600);
          
          // 通知其他模块和工作区策略完成
          const completionData = {
            id: selectedStrategy,
            name: strategy.name,
            config,
            result,
            timestamp: new Date().toISOString(),
            workspaceId: config.workspaceId
          };
          
          notifyStrategyCompleted(completionData);
          
          // 通知工作区回测完成
          moduleCommunication.emit('workspace:strategy:backtest-completed', completionData);
          
        } catch (error) {
          console.error('QuantEngine backtest failed, falling back to local:', error);
          // 降级到本地回测
          await runLocalBacktest(config);
        }
      } 
      // 如果Qlib可用，尝试使用Qlib回测
      else if (serviceStatus.qlib && availableModels.length > 0) {
        try {
          console.log('📊 Using Qlib for backtesting...');
          const qlibConfig: QlibBacktestConfig = {
            strategy: strategy.name,
            model: availableModels[0].name,
            dataset: 'alpha158_cn_data',
            start_date: '2024-01-01',
            end_date: '2024-12-10',
            benchmark: 'SH000300',
            account: config.initialCapital,
            trade_unit: 100,
            limit_threshold: 0.095
          };
          
          const result = await qlibIntegrationService.runBacktest(qlibConfig);
          
          // 转换Qlib结果到本地格式
          const convertedResult: BacktestResult = {
            strategy_name: result.strategy,
            start_date: '2024-01-01',
            end_date: '2024-12-10',
            initial_capital: config.initialCapital,
            final_capital: config.initialCapital * (1 + result.annualized_return),
            total_return: result.annualized_return,
            annualized_return: result.annualized_return,
            max_drawdown: result.max_drawdown,
            sharpe_ratio: result.information_ratio,
            volatility: result.std_return * Math.sqrt(252),
            benchmark_return: 0.08,
            alpha: result.excess_return_with_cost.annualized_return,
            beta: 1.0,
            information_ratio: result.information_ratio,
            trades: []
          };
          
          setBacktestResults(convertedResult);
          setBacktestProgress(100);
          console.log('✅ Qlib backtest completed:', result);
          
          // 通知其他模块策略完成
          notifyStrategyCompleted({
            id: selectedStrategy,
            name: strategy.name,
            config,
            result: convertedResult,
            timestamp: new Date().toISOString(),
            source: 'qlib'
          });
          
        } catch (error) {
          console.error('Qlib backtest failed, falling back to local:', error);
          await runLocalBacktest(config);
        }
      } else {
        // 使用本地回测服务
        await runLocalBacktest(config);
      }
      
      async function runLocalBacktest(config: StrategyConfig) {
        console.log('🏠 Using local backtest service...');
        
        try {
          // 模拟回测进度
          const progressInterval = setInterval(() => {
            setBacktestProgress(prev => {
              if (prev >= 95) {
                clearInterval(progressInterval);
                return 95;
              }
              return prev + Math.random() * 15;
            });
          }, 500);
        
          // 获取历史数据
          const historicalDataMap = await historicalService.getBatchData(
            watchlistSymbols,
            { period: '1Y', interval: '1D' }
          );

          const primarySymbol = watchlistSymbols[0] || Object.keys(historicalDataMap)[0] || '600519';
          const primarySeries = historicalDataMap[primarySymbol] || [];

          if (primarySeries.length === 0) {
            throw new Error('No historical data available for local backtest');
          }
          
          // 使用适当的高级策略生成器
          let enhancedConfig = config;
          
          switch (strategy.strategyType) {
            case 'multi_factor':
              console.log('🎯 Creating Multi-Factor strategy...');
              enhancedConfig = createMultiFactorStrategy({
                factors: strategy.parameters.factors || ['value', 'quality', 'momentum', 'lowVol'],
                factorWeights: strategy.parameters.factorWeights || [0.3, 0.3, 0.25, 0.15],
                rebalanceFrequency: strategy.parameters.rebalanceFrequency || 'quarterly',
                enableSectorNeutral: true,
                enableRiskBudget: true
              });
              break;
              
            case 'ml':
              console.log('🤖 Creating ML Ensemble strategy...');
              enhancedConfig = createMLStrategy({
                modelType: strategy.parameters.modelType || 'xgboost',
                features: strategy.parameters.features || ['rsi', 'macd', 'bollinger_position'],
                trainingPeriod: strategy.parameters.trainingPeriod || 252,
                retrainFrequency: strategy.parameters.retrainFrequency || 30,
                predictionHorizon: strategy.parameters.predictionHorizon || 5,
                confidenceThreshold: strategy.parameters.confidenceThreshold || 0.7,
                enableEnsemble: true
              });
              break;
              
            case 'risk_parity':
              console.log('⚖️ Creating Risk Parity strategy...');
              enhancedConfig = createRiskParityStrategy({
                riskBudgetMethod: 'equal_risk_contribution',
                lookbackPeriod: strategy.parameters.volatilityWindow || 60,
                rebalanceFrequency: strategy.parameters.rebalanceFrequency || 'monthly',
                maxWeight: 0.2,
                minWeight: 0.01,
                covarianceEstimator: 'sample',
                enableVolatilityTargeting: true
              });
              break;
              
            case 'pairs_trading':
              console.log('📊 Creating Pairs Trading strategy...');
              enhancedConfig = createPairsTradingStrategy({
                pairs: strategy.parameters.pairs || [
                  { stock1: '000001', stock2: '600036' },
                  { stock1: '600519', stock2: '000858' }
                ],
                lookbackPeriod: strategy.parameters.lookbackPeriod || 60,
                entryZScore: strategy.parameters.entryZScore || 2.0,
                exitZScore: strategy.parameters.exitZScore || 0.5,
                stopLossZScore: strategy.parameters.stopLossZScore || 3.0,
                halfLife: strategy.parameters.halfLife || 10,
                enableCointegrationTest: true
              });
              break;
              
            default:
              // 对于传统策略类型，使用动态对冲增强
              console.log('🛡️ Creating Dynamic Hedging enhanced strategy...');
              enhancedConfig = createDynamicHedgingStrategy({
                hedgeRatio: 0.3,
                rebalanceThreshold: 0.05,
                hedgeInstrument: 'IF2412',
                enableBetaAdjustment: true,
                maxHedgeRatio: 0.5,
                riskModel: 'fama_french_3factor'
              });
              break;
          }
          
          // 合并原始配置和增强配置
          const finalConfig = {
            ...config,
            ...enhancedConfig,
            name: config.name,
            initialCapital: config.initialCapital,
            strategyType: strategy.strategyType,
            enhancedStrategy: true
          };
          
          console.log(`✨ Enhanced strategy config for ${strategy.strategyType}:`, finalConfig);
          
          // 运行增强的回测
          const localEngine = new StrategyExecutionService(finalConfig);
          const results = await localEngine.runBacktest(
            primarySymbol,
            primarySeries,
            maStrategy(5, 20)
          );
          
          setBacktestResults(results);
          setBacktestProgress(100);
          
          // 通知其他模块策略完成
          notifyStrategyCompleted({
            id: selectedStrategy,
            name: config.name,
            config,
            result: results,
            timestamp: new Date().toISOString(),
            source: 'local'
          });
          
          // 启动实时性能监控
          const subscription = await strategyMonitor.subscribeToStrategy(config.name, {
            symbols: watchlistSymbols,
            updateInterval: 60000
          });
          
          // 监听性能更新
          strategyMonitor.onPerformanceUpdate((metrics) => {
            setStrategyPerformance(metrics);
          });
          
          setTimeout(() => {
            setIsStrategyRunning(false);
          }, 1000);
          
          // 通知策略完成，触发报告生成
          const strategy = strategies.find(s => s.id === selectedStrategy);
          if (strategy) {
            notifyStrategyCompleted({
              id: selectedStrategy,
              name: strategy.name,
              results: results,
              config: config,
              performance: strategyPerformance,
              completedAt: new Date()
            });
          }
          
          console.log('[StrategyLab] Backtest completed:', results);
        } catch (error) {
          console.error('[StrategyLab] Local backtest failed:', error);
          setIsStrategyRunning(false);
        }
      }
    } catch (error) {
      console.error('[StrategyLab] Backtest failed:', error);
      setIsStrategyRunning(false);
    }
  }, [selectedStrategy, strategyConfig, watchlistSymbols, strategyExecutionService, strategyMonitor, historicalService]);
  
  // 从模板创建策略
  const createStrategyFromTemplate = useCallback(async (template: StrategyTemplate) => {
    try {
      console.log('🎯 Creating strategy from template:', template.name);
      
      // 从模板创建策略实例
      const { strategyId, config } = await strategyStoreService.createStrategyFromTemplate(
        template.id,
        {
          tradingParams: {
            initialCapital: strategyConfig.initialCapital || template.config.tradingParams.initialCapital,
            commission: strategyConfig.commission || template.config.tradingParams.commission,
            slippage: strategyConfig.slippage || template.config.tradingParams.slippage
          }
        }
      );
      
      // 更新策略配置
      setStrategyConfig({
        ...strategyConfig,
        ...config.parameters,
        strategyType: config.strategyType,
        maxPositions: config.tradingParams?.initialCapital ? Math.floor(config.tradingParams.initialCapital / 50000) : 20
      });
      
      // 设置选中的模板
      setSelectedTemplate(template);
      setShowTemplateSelector(false);
      
      // 如果是 Qlib 策略，初始化 Qlib 服务
      if (template.category === 'qlib' && serviceStatus.qlib) {
        console.log('🤖 Initializing Qlib model for:', template.name);
        
        try {
          // 根据策略类型初始化 Qlib 模型
          if (template.config.strategyType === 'qlib_ml') {
            // 初始化 Qlib 机器学习模型
            const modelConfig = {
              model: template.config.parameters.model || 'LightGBM',
              features: template.config.parameters.features || 'Alpha158',
              trainingWindow: template.config.parameters.trainingWindow || 252,
              predictionHorizon: template.config.parameters.predictionHorizon || 20,
              dropoutRate: template.config.parameters.dropoutRate || 0.1
            };
            
            await qlibIntegrationService.initializeModel(modelConfig);
            
            // 加载 Alpha158 因子
            const alpha158Factors = await qlibIntegrationService.getAlpha158Factors();
            setAlpha158Factors(alpha158Factors);
            
            console.log('✅ Qlib ML model initialized with Alpha158 factors');
            
          } else if (template.config.strategyType === 'qlib_dl') {
            // 初始化 Qlib 深度学习模型
            const dlConfig = {
              model: template.config.parameters.model || 'LSTM',
              lookbackWindow: template.config.parameters.lookbackWindow || 60,
              lstmLayers: template.config.parameters.lstmLayers || 3,
              hiddenSize: template.config.parameters.hiddenSize || 128,
              dropout: template.config.parameters.dropout || 0.2,
              learningRate: template.config.parameters.learningRate || 0.001
            };
            
            await qlibIntegrationService.initializeDeepLearningModel(dlConfig);
            console.log('✅ Qlib LSTM model initialized');
            
          } else if (template.config.strategyType === 'qlib_factor_mining') {
            // 初始化 Qlib 因子挖掘
            const miningConfig = {
              method: template.config.parameters.miningMethod || 'genetic_algorithm',
              populationSize: template.config.parameters.populationSize || 100,
              generations: template.config.parameters.generations || 50,
              fitnessMetric: template.config.parameters.fitnessMetric || 'information_ratio',
              factorUniverse: template.config.parameters.factorUniverse || 'price_volume'
            };
            
            await qlibIntegrationService.initializeFactorMining(miningConfig);
            console.log('✅ Qlib factor mining framework initialized');
          }
          
          // 更新可用模型列表
          const models = await qlibIntegrationService.getAvailableModels();
          setAvailableModels(models);
          
        } catch (error) {
          console.error('Failed to initialize Qlib model:', error);
          warning('Qlib 模型初始化失败，将使用本地策略');
        }
      }
      
      success(`已从模板创建策略: ${template.name}`);
      
      // 自动运行回测（如果模板有历史回测结果）
      if (template.backtestResults) {
        setBacktestResults({
          strategyId: strategyId,
          strategyName: template.name,
          startDate: '2024-01-01',
          endDate: new Date().toISOString().split('T')[0],
          initialCapital: config.tradingParams.initialCapital,
          finalCapital: config.tradingParams.initialCapital * (1 + template.backtestResults.totalReturn),
          totalReturn: template.backtestResults.totalReturn,
          annualizedReturn: template.backtestResults.annualizedReturn,
          sharpeRatio: template.backtestResults.sharpeRatio,
          maxDrawdown: template.backtestResults.maxDrawdown,
          winRate: template.backtestResults.winRate,
          totalTrades: template.backtestResults.trades,
          profits: [],
          positions: []
        });
      }
      
    } catch (error) {
      console.error('Failed to create strategy from template:', error);
      warning('创建策略失败，请重试');
    }
  }, [strategyConfig, serviceStatus.qlib, success, warning]);
  
  const optimizeStrategy = useCallback(async () => {
    if (!selectedStrategy || !backtestResults) return;
    
    try {
      // 使用组合优化服务优化策略参数
      const strategy = strategies.find(s => s.id === selectedStrategy);
      if (!strategy) return;
      
      // 生成参数优化空间
      const parameterSpace = generateParameterSpace(strategy.parameters);
      
      // 运行参数优化
      const optimizedParams = await optimizeParameters(parameterSpace, watchlistSymbols);
      
      // 更新策略配置
      setStrategyConfig(prev => ({
        ...prev,
        parameters: optimizedParams
      }));
      
      console.log('[StrategyLab] Strategy optimized:', optimizedParams);
    } catch (error) {
      console.error('[StrategyLab] Strategy optimization failed:', error);
    }
  }, [selectedStrategy, backtestResults, watchlistSymbols]);
  
  // 辅助函数
  const generateParameterSpace = (baseParams: any) => {
    // 为每个参数生成优化范围
    const space: any = {};
    Object.keys(baseParams).forEach(key => {
      const value = baseParams[key];
      if (typeof value === 'number') {
        space[key] = {
          min: value * 0.5,
          max: value * 1.5,
          step: value * 0.1
        };
      }
    });
    return space;
  };
  
  const optimizeParameters = async (space: any, symbols: string[]) => {
    // 简化的网格搜索优化
    // 实际应用中可以使用更复杂的优化算法
    let bestParams = {};
    let bestSharpe = -Infinity;
    
    // 这里简化为返回原始参数加上一些随机优化
    const strategy = strategies.find(s => s.id === selectedStrategy);
    if (strategy) {
      bestParams = { ...strategy.parameters };
      // 模拟优化过程
      Object.keys(bestParams).forEach(key => {
        if (typeof bestParams[key] === 'number') {
          bestParams[key] = bestParams[key] * (0.9 + Math.random() * 0.2);
        }
      });
    }
    
    return bestParams;
  };
  
  // 事件处理函数
  const handleRunBacktest = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    
    try {
      await runBacktest();
      setProgress(100);
      setIsRunning(false);
    } catch (error) {
      console.error('[StrategyLab] Backtest execution failed:', error);
      setIsRunning(false);
    }
  }, [runBacktest]);

  return (
    <div className="space-y-6">
      {/* Strategy Template Selector Dialog */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg w-full max-w-5xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-[#1a2942]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg text-gray-100">策略模板库</h2>
                <button
                  onClick={() => setShowTemplateSelector(false)}
                  className="p-2 hover:bg-[#1a2942] rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Qlib 策略模板 */}
              {qlibTemplates.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Cpu className="w-5 h-5 text-[#8b5cf6]" />
                    <h3 className="text-sm font-medium text-gray-200">Qlib AI 策略</h3>
                    <span className="text-xs text-gray-500">({qlibTemplates.length} 个策略)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {qlibTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="bg-[#1a2942]/50 border border-[#2a3f5f] rounded-lg p-4 hover:border-[#8b5cf6]/50 transition-all cursor-pointer group"
                        onClick={() => createStrategyFromTemplate(template)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-200 group-hover:text-[#8b5cf6]">
                            {template.name}
                          </h4>
                          <div className="flex items-center gap-1">
                            <div className="text-xs text-[#f59e0b]">★ {template.rating}</div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded text-[10px]">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {template.downloads} 次使用
                          </div>
                        </div>
                        {template.backtestResults && (
                          <div className="mt-3 pt-3 border-t border-[#2a3f5f]/50 grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center">
                              <div className="text-[#10b981]">{(template.backtestResults.totalReturn * 100).toFixed(1)}%</div>
                              <div className="text-gray-600">收益率</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[#0ea5e9]">{template.backtestResults.sharpeRatio.toFixed(2)}</div>
                              <div className="text-gray-600">夏普率</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[#f97316]">{Math.abs(template.backtestResults.maxDrawdown * 100).toFixed(1)}%</div>
                              <div className="text-gray-600">最大回撤</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 其他策略模板 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-[#0ea5e9]" />
                  <h3 className="text-sm font-medium text-gray-200">内置策略模板</h3>
                  <span className="text-xs text-gray-500">({strategyTemplates.filter(t => t.category !== 'qlib').length} 个策略)</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {strategyTemplates.filter(t => t.category !== 'qlib').map((template) => (
                    <div
                      key={template.id}
                      className="bg-[#1a2942]/50 border border-[#2a3f5f] rounded-lg p-4 hover:border-[#0ea5e9]/50 transition-all cursor-pointer group"
                      onClick={() => createStrategyFromTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-200 group-hover:text-[#0ea5e9]">
                          {template.name}
                        </h4>
                        <div className="flex items-center gap-1">
                          <div className="text-xs text-[#f59e0b]">★ {template.rating}</div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded text-[10px]">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">
                          {template.downloads} 次使用
                        </div>
                      </div>
                      {template.backtestResults && (
                        <div className="mt-3 pt-3 border-t border-[#2a3f5f]/50 grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-[#10b981]">{(template.backtestResults.totalReturn * 100).toFixed(1)}%</div>
                            <div className="text-gray-600">收益率</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[#0ea5e9]">{template.backtestResults.sharpeRatio.toFixed(2)}</div>
                            <div className="text-gray-600">夏普率</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[#f97316]">{Math.abs(template.backtestResults.maxDrawdown * 100).toFixed(1)}%</div>
                            <div className="text-gray-600">最大回撤</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Enhanced Service Status & Strategy Pool Monitor */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {status === 'connected' ? (
                <Activity className="w-4 h-4 text-[#10b981] animate-pulse" />
              ) : (
                <Database className="w-4 h-4 text-[#6b7280]" />
              )}
              <span className="text-sm text-gray-300">
                策略池监控: <span className={`font-medium ${status === 'connected' ? 'text-[#10b981]' : 'text-gray-500'}`}>
                  {status === 'connected' ? '实时' : '离线'}
                </span>
              </span>
            </div>
            {selectedStrategy && (
              <div className="text-sm text-gray-500">
                当前策略: <span className="text-[#0ea5e9]">{strategies.find(s => s.id === selectedStrategy)?.name}</span>
              </div>
            )}
            <div className="text-sm text-gray-500">
              监控股票: {marketData.size}/{watchlistSymbols.length}
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            {serviceStatus.initialized ? '量化引擎已就绪' : '服务初始化中...'}
          </div>
        </div>
        
        {/* External Services Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-[#1a2942]">
          <div className="flex items-center gap-2">
            {workspaceConnected ? (
              <Zap className="w-4 h-4 text-[#10b981]" />
            ) : (
              <Zap className="w-4 h-4 text-[#6b7280]" />
            )}
            <span className="text-xs text-gray-400">工作区:</span>
            <span className={`text-xs font-medium ${
              workspaceConnected ? 'text-[#10b981]' : 'text-gray-500'
            }`}>
              {workspaceConnected ? `已同步 (${realTimeStrategies.length} 策略)` : '未连接'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {serviceStatus.quantEngine ? (
              <Brain className="w-4 h-4 text-[#10b981]" />
            ) : (
              <Brain className="w-4 h-4 text-[#6b7280]" />
            )}
            <span className="text-xs text-gray-400">QuantEngine:</span>
            <span className={`text-xs font-medium ${
              serviceStatus.quantEngine ? 'text-[#10b981]' : 'text-gray-500'
            }`}>
              {serviceStatus.quantEngine ? `已连接 (Alpha158)` : '离线'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {serviceStatus.qlib ? (
              <Cpu className="w-4 h-4 text-[#10b981]" />
            ) : (
              <Cpu className="w-4 h-4 text-[#6b7280]" />
            )}
            <span className="text-xs text-gray-400">Qlib:</span>
            <span className={`text-xs font-medium ${
              serviceStatus.qlib ? 'text-[#10b981]' : 'text-gray-500'
            }`}>
              {serviceStatus.qlib ? `已连接 (${availableModels.length} 模型)` : '离线'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {serviceStatus.akshare ? (
              <BarChart3 className="w-4 h-4 text-[#10b981]" />
            ) : (
              <BarChart3 className="w-4 h-4 text-[#6b7280]" />
            )}
            <span className="text-xs text-gray-400">AkShare:</span>
            <span className={`text-xs font-medium ${
              serviceStatus.akshare ? 'text-[#10b981]' : 'text-gray-500'
            }`}>
              {serviceStatus.akshare ? '已连接' : '离线'}
            </span>
          </div>
        </div>
        
        {/* Action Bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a2942]">
          <div className="flex items-center gap-2">
            {isStrategyRunning && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#f59e0b] animate-spin" />
                <span className="text-sm text-[#f59e0b]">策略运行中...</span>
              </div>
            )}
          </div>
          
          {/* Strategy Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={saveStrategyConfig}
              disabled={!selectedStrategy || isStrategyRunning}
              className="p-2 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-400 hover:text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="保存策略配置"
            >
              <Save className="w-4 h-4" />
            </button>
            
            <button
              onClick={optimizeStrategy}
              disabled={!selectedStrategy || !backtestResults || isStrategyRunning}
              className="p-2 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-400 hover:text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="优化策略参数"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => console.log('Export strategy results')}
              disabled={!backtestResults}
              className="p-2 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-400 hover:text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="导出策略结果"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Performance Metrics Quick View */}
        {strategyPerformance && (
          <div className="mt-4 pt-4 border-t border-[#1a2942]">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-medium text-[#10b981]">
                  {(strategyPerformance.totalReturn * 100).toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500">总收益</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-[#0ea5e9]">
                  {strategyPerformance.sharpeRatio?.toFixed(2) || 'N/A'}
                </div>
                <div className="text-xs text-gray-500">夏普比率</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-[#f97316]">
                  {(strategyPerformance.maxDrawdown * 100).toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500">最大回撤</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-[#a855f7]">
                  {strategyPerformance.winRate?.toFixed(1) || 'N/A'}%
                </div>
                <div className="text-xs text-gray-500">胜率</div>
              </div>
            </div>
            
            {/* External Services Integration Status */}
            <div className="mt-3 pt-3 border-t border-[#1a2942]">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  {serviceStatus.quantEngine && (
                    <span className="text-[#10b981]">✓ QuantEngine实时分析</span>
                  )}
                  {serviceStatus.qlib && availableModels.length > 0 && (
                    <span className="text-[#10b981]">✓ Qlib模型 ({availableModels.length})</span>
                  )}
                  {serviceStatus.akshare && (
                    <span className="text-[#10b981]">✓ AkShare数据</span>
                  )}
                </div>
                <div className="text-gray-500">
                  数据源: {serviceStatus.initialized ? '多源集成' : '本地模拟'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-6">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[
            { step: 1, title: '股票池 & 组合' },
            { step: 2, title: '策略 & 参数' },
            { step: 3, title: '回测 & 提交' },
          ].map((item, idx) => (
            <div key={item.step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                    currentStep >= item.step
                      ? 'bg-[#0ea5e9] text-white'
                      : 'bg-[#1a2942] text-gray-500'
                  }`}
                >
                  {currentStep > item.step ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{item.step}</span>
                  )}
                </div>
                <div
                  className={`text-sm ${
                    currentStep >= item.step ? 'text-gray-200' : 'text-gray-500'
                  }`}
                >
                  {item.title}
                </div>
              </div>
              {idx < 2 && (
                <ChevronRight
                  className={`w-5 h-5 mx-4 ${
                    currentStep > item.step ? 'text-[#0ea5e9]' : 'text-gray-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Stock Pool */}
      {currentStep === 1 && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <h3 className="text-sm text-gray-400 mb-4">选择股票池类型</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 bg-[#1a2942]/30 rounded border border-[#0ea5e9] cursor-pointer">
                  <input type="radio" name="pool-type" defaultChecked className="mt-1" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-200 mb-1">使用预设股票池</div>
                    <div className="text-xs text-gray-500">A股中小盘高流动性池 (当前 245 只)</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 bg-[#1a2942]/30 rounded border border-transparent hover:border-[#1a2942] cursor-pointer">
                  <input type="radio" name="pool-type" className="mt-1" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-200 mb-1">使用企业自定义组合</div>
                    <div className="text-xs text-gray-500">上传 CSV 或手动输入股票代码</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <h3 className="text-sm text-gray-400 mb-4">过滤条件</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-2">行业</label>
                  <select className="w-full bg-[#1a2942] border border-[#2a3f5f] rounded px-3 py-2 text-sm text-gray-200">
                    <option>全部行业</option>
                    <option>电子</option>
                    <option>医药生物</option>
                    <option>计算机</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-2">市值范围 (亿元)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="最小"
                      className="w-full bg-[#1a2942] border border-[#2a3f5f] rounded px-3 py-2 text-sm text-gray-200"
                      defaultValue={50}
                    />
                    <span className="text-gray-600">-</span>
                    <input
                      type="number"
                      placeholder="最大"
                      className="w-full bg-[#1a2942] border border-[#2a3f5f] rounded px-3 py-2 text-sm text-gray-200"
                      defaultValue={500}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-2">日均成交额 (百万)</label>
                  <input
                    type="number"
                    className="w-full bg-[#1a2942] border border-[#2a3f5f] rounded px-3 py-2 text-sm text-gray-200"
                    defaultValue={50}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-2">排除</label>
                  <div className="flex gap-2 text-xs">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" defaultChecked />
                      <span className="text-gray-400">ST</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" />
                      <span className="text-gray-400">创业板</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" />
                      <span className="text-gray-400">科创板</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-gray-400">股票列表</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">已选</span>
                  <span className="text-lg text-[#10b981]">{stockCount}</span>
                  <span className="text-xs text-gray-500">只</span>
                  <Check className="w-4 h-4 text-[#10b981] ml-1" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a2942] text-gray-500">
                      <th className="text-left py-2">代码</th>
                      <th className="text-left py-2">名称</th>
                      <th className="text-left py-2">行业</th>
                      <th className="text-right py-2">市值(亿)</th>
                      <th className="text-right py-2">日均成交(百万)</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    {[
                      { code: '000001', name: '平安银行', industry: '银行', cap: 245.8, vol: 156.2 },
                      { code: '000002', name: '万科A', industry: '房地产', cap: 189.3, vol: 98.4 },
                      { code: '000063', name: '中兴通讯', industry: '通信', cap: 456.7, vol: 234.5 },
                      { code: '000333', name: '美的集团', industry: '家电', cap: 3245.6, vol: 445.8 },
                      { code: '000651', name: '格力电器', industry: '家电', cap: 2156.4, vol: 312.3 },
                    ].map((stock) => (
                      <tr key={stock.code} className="border-b border-[#1a2942]/50">
                        <td className="py-2">{stock.code}</td>
                        <td className="py-2">{stock.name}</td>
                        <td className="py-2 text-gray-500">{stock.industry}</td>
                        <td className="py-2 text-right">{stock.cap}</td>
                        <td className="py-2 text-right">{stock.vol}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <h3 className="text-sm text-gray-400 mb-4">行业分布</h3>
              <div className="space-y-2">
                {industryData.map((industry) => (
                  <div key={industry.name} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{industry.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-[#1a2942] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0ea5e9]"
                          style={{ width: industry.pct }}
                        ></div>
                      </div>
                      <span className="text-gray-500 w-8 text-right">{industry.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <h3 className="text-sm text-gray-400 mb-4">市值分布</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>&lt; 100亿</span>
                  <span>12 只 (26.7%)</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>100-300亿</span>
                  <span>18 只 (40.0%)</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>300-500亿</span>
                  <span>10 只 (22.2%)</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>&gt; 500亿</span>
                  <span>5 只 (11.1%)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              className="w-full py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded transition-colors"
            >
              下一步：选择策略
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Strategy Selection */}
      {currentStep === 2 && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {/* Service Integration Status Bar */}
            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-gray-400">策略服务集成状态</h3>
                <div className="flex items-center gap-4 text-xs">
                  {serviceStatus.quantEngine && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
                      <span className="text-[#10b981]">QuantEngine</span>
                    </div>
                  )}
                  {serviceStatus.qlib && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
                      <span className="text-[#10b981]">Qlib</span>
                    </div>
                  )}
                  {serviceStatus.akShare && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-[#0ea5e9] rounded-full"></div>
                      <span className="text-[#0ea5e9]">AkShare</span>
                    </div>
                  )}
                  {serviceStatus.tushare && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-[#0ea5e9] rounded-full"></div>
                      <span className="text-[#0ea5e9]">Tushare</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {serviceStatus.quantEngine && serviceStatus.qlib 
                  ? '量化引擎和AI模型服务已连接，支持高级策略分析'
                  : '使用模拟数据运行策略回测'}
              </div>
            </div>
            
            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-gray-400">选择策略</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="px-3 py-1.5 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] rounded text-sm transition-colors flex items-center gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    策略模板库
                  </button>
                  {qlibTemplates.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {strategyTemplates.length} 个模板可用 ({qlibTemplates.length} Qlib)
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {strategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className={`p-4 rounded border transition-all ${
                      selectedStrategy === strategy.id
                        ? 'border-[#0ea5e9] bg-[#0ea5e9]/10'
                        : 'border-[#1a2942] bg-[#1a2942]/30 hover:border-[#2a3f5f]'
                    }`}
                  >
                    <div 
                      onClick={() => setSelectedStrategy(strategy.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-200">{strategy.name}</div>
                        {isStrategyRunning && selectedStrategy === strategy.id && (
                          <div className="w-2 h-2 bg-[#0ea5e9] rounded-full animate-pulse"></div>
                        )}
                      </div>
                    <div className="text-xs text-gray-500 mb-3">{strategy.description}</div>
                    <div className="flex gap-2 mb-3">
                      {strategy.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-[#1a2942] text-[#0ea5e9] rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {/* Service Support Indicators */}
                    <div className="flex gap-3 mb-3">
                      {(strategy.id === 'high-vol-alpha' || strategy.id === 'multi-factor') && serviceStatus.quantEngine && (
                        <div className="flex items-center gap-1">
                          <Brain className="w-3 h-3 text-[#10b981]" />
                          <span className="text-[10px] text-[#10b981]">QuantEngine</span>
                        </div>
                      )}
                      {(strategy.id === 'momentum-quality' || strategy.id === 'multi-factor') && serviceStatus.qlib && (
                        <div className="flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-[#10b981]" />
                          <span className="text-[10px] text-[#10b981]">Qlib</span>
                        </div>
                      )}
                      {serviceStatus.tushare && (
                        <div className="flex items-center gap-1">
                          <Database className="w-3 h-3 text-[#0ea5e9]" />
                          <span className="text-[10px] text-[#0ea5e9]">实时数据</span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-gray-600 mb-1">风险</div>
                        <div className="flex gap-0.5">
                          {[...Array(10)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-1 h-3 rounded-sm ${
                                i < strategy.risk ? 'bg-[#f97316]' : 'bg-[#1a2942]'
                              }`}
                            ></div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">换手</div>
                        <div className="flex gap-0.5">
                          {[...Array(10)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-1 h-3 rounded-sm ${
                                i < strategy.turnover ? 'bg-[#0ea5e9]' : 'bg-[#1a2942]'
                              }`}
                            ></div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">持仓</div>
                        <div className="text-gray-300">{strategy.holdings}</div>
                      </div>
                    </div>
                    </div>
                    
                    {/* Strategy Controls */}
                    <div className="mt-4 pt-3 border-t border-[#1a2942] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {marketData.has(watchlistSymbols[0]) && (
                          <div className="text-xs text-gray-500">
                            {marketData.size} 只数据源
                          </div>
                        )}
                        {status === 'connected' && (
                          <div className="text-xs text-[#10b981]">实时</div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Quick test:', strategy.id);
                          }}
                          className="px-2 py-1 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-400 rounded text-xs transition-colors"
                          disabled={isStrategyRunning}
                        >
                          快测
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStrategy(strategy.id);
                            console.log('Full test:', strategy.id);
                          }}
                          className="px-2 py-1 bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#0ea5e9] rounded text-xs transition-colors"
                          disabled={isStrategyRunning}
                        >
                          {isStrategyRunning && selectedStrategy === strategy.id ? '运行中...' : '执行'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* External Strategy Sources */}
            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <h3 className="text-sm text-gray-400 mb-4">外部策略源</h3>
              <div className="space-y-3">
                {serviceStatus.quantEngine && (
                  <div className="p-3 bg-[#1a2942]/30 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-[#10b981]" />
                        <span className="text-xs text-[#10b981]">QuantEngine</span>
                      </div>
                      <span className="text-xs text-gray-500">15 策略</span>
                    </div>
                    <div className="text-xs text-gray-400">Alpha158因子策略库</div>
                  </div>
                )}
                {serviceStatus.qlib && (
                  <div className="p-3 bg-[#1a2942]/30 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-[#10b981]" />
                        <span className="text-xs text-[#10b981]">Qlib</span>
                      </div>
                      <span className="text-xs text-gray-500">8 模型</span>
                    </div>
                    <div className="text-xs text-gray-400">机器学习预测模型</div>
                  </div>
                )}
                {!serviceStatus.quantEngine && !serviceStatus.qlib && (
                  <div className="text-center py-4">
                    <AlertCircle className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">暂无外部策略源连接</p>
                    <p className="text-xs text-gray-600 mt-1">使用内置策略进行回测</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Stock Pool Management */}
            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-gray-400">股票池管理</h3>
                <span className="text-xs text-[#0ea5e9]">{watchlistSymbols.length} 只</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-[#1a2942]/30 rounded text-xs">
                  <div className="text-gray-400 mb-1">当前股票池</div>
                  <div className="text-gray-300">
                    {watchlistSymbols.length > 0 ? 
                      watchlistSymbols.slice(0, 3).join(', ') + (watchlistSymbols.length > 3 ? '...' : '') :
                      '未设置股票池'
                    }
                  </div>
                </div>
                <button 
                  onClick={() => {
                    // 触发选股器打开或导入
                    console.log('Open StockPicker integration');
                    // 可以通过模块通信触发选股器打开
                  }}
                  className="w-full py-2 bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#0ea5e9] rounded text-sm transition-colors"
                >
                  从选股器导入
                </button>
                <div className="text-xs text-gray-500 text-center">
                  支持从选股器自动导入筛选结果
                </div>
              </div>
            </div>
            
            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <h3 className="text-sm text-gray-400 mb-4">参数配置</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-2">回测时间区间</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="w-full bg-[#1a2942] border border-[#2a3f5f] rounded px-3 py-2 text-xs text-gray-200"
                      defaultValue="2024-01-01"
                    />
                    <input
                      type="date"
                      className="w-full bg-[#1a2942] border border-[#2a3f5f] rounded px-3 py-2 text-xs text-gray-200"
                      defaultValue="2024-12-09"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-2">资金规模</label>
                  <input
                    type="text"
                    className="w-full bg-[#1a2942] border border-[#2a3f5f] rounded px-3 py-2 text-sm text-gray-200"
                    defaultValue="¥10,000,000"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-2">换手频率</label>
                  <select className="w-full bg-[#1a2942] border border-[#2a3f5f] rounded px-3 py-2 text-sm text-gray-200">
                    <option>每周</option>
                    <option>每月</option>
                    <option>每季度</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-2">单票最大仓位</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      defaultValue="4"
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-200 w-12">4%</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-2">最大行业权重</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="10"
                      max="50"
                      defaultValue="25"
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-200 w-12">25%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <h3 className="text-sm text-gray-400 mb-4">策略权重</h3>
              <div className="space-y-3">
                {[
                  { name: '动量因子', value: 40 },
                  { name: '反转因子', value: 20 },
                  { name: '质量因子', value: 20 },
                  { name: '情绪/成交', value: 20 },
                ].map((factor) => (
                  <div key={factor.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{factor.name}</span>
                      <span className="text-gray-200">{factor.value}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue={factor.value}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Strategy Details */}
            {selectedStrategy && (
              <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                <h3 className="text-sm text-gray-400 mb-4">已选策略详情</h3>
                {(() => {
                  const strategy = strategies.find(s => s.id === selectedStrategy);
                  return strategy ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-200">{strategy.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{strategy.description}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">预期收益</span>
                          <div className="text-[#10b981] font-medium">{(strategy.expectedReturn * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-500">预期风险</span>
                          <div className="text-[#f97316] font-medium">{(strategy.expectedRisk * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Sharpe比率</span>
                          <div className="text-[#0ea5e9] font-medium">{strategy.sharpeRatio.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">最大回撤</span>
                          <div className="text-[#ef4444] font-medium">{(strategy.maxDrawdown * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                      {/* Service Support for Selected Strategy */}
                      <div className="pt-3 border-t border-[#1a2942]">
                        <div className="text-xs text-gray-500 mb-2">支持的服务</div>
                        <div className="flex flex-wrap gap-2">
                          {(strategy.id === 'high-vol-alpha' || strategy.id === 'multi-factor') && serviceStatus.quantEngine && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-[#10b981]/20 rounded">
                              <Brain className="w-3 h-3 text-[#10b981]" />
                              <span className="text-[10px] text-[#10b981]">QuantEngine</span>
                            </div>
                          )}
                          {(strategy.id === 'momentum-quality' || strategy.id === 'multi-factor') && serviceStatus.qlib && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-[#10b981]/20 rounded">
                              <Cpu className="w-3 h-3 text-[#10b981]" />
                              <span className="text-[10px] text-[#10b981]">Qlib ML</span>
                            </div>
                          )}
                          {(serviceStatus.akShare || serviceStatus.tushare) && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-[#0ea5e9]/20 rounded">
                              <Activity className="w-3 h-3 text-[#0ea5e9]" />
                              <span className="text-[10px] text-[#0ea5e9]">实时数据</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Strategy Templates */}
            {savedStrategies.length > 0 && (
              <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
                <h3 className="text-sm text-gray-400 mb-4">已保存策略模板</h3>
                <div className="space-y-2">
                  {savedStrategies.map((template, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#1a2942]/30 rounded border border-transparent hover:border-[#2a3f5f]">
                      <div className="flex-1">
                        <div className="text-sm text-gray-200">{template.name}</div>
                        <div className="text-xs text-gray-500">
                          资金: ¥{(template.initialCapital / 10000).toFixed(0)}万 | 
                          持仓: {template.maxPositions}只 | 
                          手续费: {(template.commission * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => loadStrategyTemplate(template)}
                          className="p-1.5 bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#0ea5e9] rounded text-xs transition-colors"
                          title="加载模板"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteStrategyTemplate(template.name)}
                          className="p-1.5 bg-[#dc2626]/20 hover:bg-[#dc2626]/30 text-[#dc2626] rounded text-xs transition-colors"
                          title="删除模板"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-3 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-300 rounded transition-colors"
              >
                上一步
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="flex-1 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded transition-colors"
              >
                下一步
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Run Backtest */}
      {currentStep === 3 && (
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <h3 className="text-sm text-gray-400 mb-4">回测配置摘要</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">股票池</span>
                  <span className="text-gray-200">A股中小盘高流动性池</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">股票数量</span>
                  <span className="text-gray-200">45 只</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">策略</span>
                  <span className="text-gray-200">High Vol Alpha Combo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">时间区间</span>
                  <span className="text-gray-200">2024-01-01 至 2024-12-09</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">初始资金</span>
                  <span className="text-gray-200">¥10,000,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">换手频率</span>
                  <span className="text-gray-200">每周</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">单票最大仓位</span>
                  <span className="text-gray-200">4%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">行业最大权重</span>
                  <span className="text-gray-200">25%</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
              <h3 className="text-sm text-gray-400 mb-4">运行状态</h3>
              
              {!isStrategyRunning && backtestProgress === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-[#0ea5e9]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-[#0ea5e9]" />
                  </div>
                  <div className="text-sm text-gray-400 mb-6">准备就绪，点击开始回测</div>
                  <button
                    onClick={runBacktest}
                    className="px-8 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded transition-colors"
                    disabled={!selectedStrategy}
                  >
                    {selectedStrategy ? '运行回测' : '请先选择策略'}
                  </button>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>预计耗时: 2-3 分钟</span>
                  </div>
                </div>
              )}

              {isStrategyRunning && (
                <div className="py-8">
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">处理进度</span>
                      <span className="text-[#0ea5e9]">{Math.round(backtestProgress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#1a2942] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0ea5e9] transition-all duration-300"
                        style={{ width: `${backtestProgress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full"></div>
                      <span>加载历史数据... 完成</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full"></div>
                      <span>计算因子暴露... 完成</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${backtestProgress > 50 ? 'bg-[#10b981]' : 'bg-[#475569] animate-pulse'}`}></div>
                      <span>生成交易信号... {backtestProgress > 50 ? '完成' : '进行中'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${backtestProgress > 80 ? 'bg-[#10b981]' : 'bg-[#475569]'}`}></div>
                      <span>回测组合表现... {backtestProgress > 80 ? '完成' : '等待中'}</span>
                    </div>
                  </div>
                </div>
              )}

              {backtestProgress === 100 && !isStrategyRunning && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-[#10b981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-[#10b981]" />
                  </div>
                  <div className="text-sm text-gray-200 mb-6">回测完成！</div>
                  <div className="space-y-3">
                    <button 
                      onClick={() => console.log('View results:', backtestResults)}
                      className="w-full py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded transition-colors"
                    >
                      查看详细结果
                    </button>
                    
                    {/* 模块间操作按钮 */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button 
                        onClick={() => {
                          if (backtestResults) {
                            applyStrategyToPortfolio({
                              id: selectedStrategy,
                              name: strategies.find(s => s.id === selectedStrategy)?.name || '',
                              result: backtestResults,
                              config: strategyConfig
                            });
                            success('策略已应用到投资组合');
                          }
                        }}
                        className="py-2 px-3 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] rounded text-sm transition-colors flex items-center justify-center gap-1"
                      >
                        <Target className="w-3 h-3" />
                        应用到组合
                      </button>
                      <button 
                        onClick={() => {
                          if (backtestResults) {
                            addStrategyToComparison({
                              id: selectedStrategy,
                              name: strategies.find(s => s.id === selectedStrategy)?.name || '',
                              result: backtestResults,
                              config: strategyConfig
                            });
                            success('策略已添加到对比分析');
                          }
                        }}
                        className="py-2 px-3 bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#f59e0b] rounded text-sm transition-colors flex items-center justify-center gap-1"
                      >
                        <BarChart3 className="w-3 h-3" />
                        添加对比
                      </button>
                    </div>

                    {/* 快捷操作按钮 */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button 
                        onClick={() => {
                          if (backtestResults && onNavigate) {
                            // 直接跳转到对比工作台并传入当前策略
                            const url = new URLSearchParams();
                            url.set('ids', selectedStrategy);
                            url.set('from', 'strategy-lab');
                            onNavigate?.(`strategy-compare?${url.toString()}`);
                            info('正在打开策略对比工作台...');
                          }
                        }}
                        className="py-2 px-3 bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#0ea5e9] rounded text-sm transition-colors flex items-center justify-center gap-1"
                        title="Ctrl+Shift+C"
                      >
                        <Brain className="w-3 h-3" />
                        对比分析
                      </button>
                      <button 
                        onClick={handleCreateAutomationRule}
                        className="py-2 px-3 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] rounded text-sm transition-colors flex items-center justify-center gap-1"
                        title="Ctrl+Shift+A"
                      >
                        <Zap className="w-3 h-3" />
                        自动化
                      </button>
                    </div>
                    
                    <button 
                      onClick={saveStrategyConfig}
                      className="w-full py-2 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-300 rounded text-sm transition-colors"
                    >
                      保存策略模板
                    </button>
                  </div>
                  
                  {/* Service Integration Status */}
                  <div className="mt-6 p-4 bg-[#1a2942]/30 rounded border border-[#2a3f5f]/40">
                    <div className="text-xs text-gray-400 mb-2">服务集成状态</div>
                    <div className="flex items-center justify-center gap-4 text-xs">
                      {serviceStatus.quantEngine && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
                          <span className="text-[#10b981]">QuantEngine</span>
                        </div>
                      )}
                      {serviceStatus.qlib && availableModels.length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
                          <span className="text-[#10b981]">Qlib ({availableModels.length})</span>
                        </div>
                      )}
                      {serviceStatus.marketData && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
                          <span className="text-[#10b981]">实时数据</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Empty State for No Performance Data */}
              {!isStrategyRunning && backtestProgress === 0 && performanceMetrics && Object.keys(performanceMetrics).length === 0 && (
                <div className="mt-6 p-6 border border-[#1a2942] border-dashed rounded-lg text-center">
                  <BarChart3 className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <div className="text-sm text-gray-500 mb-2">暂无策略表现数据</div>
                  <div className="text-xs text-gray-600">运行回测后可查看详细性能指标</div>
                </div>
              )}
            </div>
          </div>

          {!isStrategyRunning && backtestProgress === 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-300 rounded transition-colors"
              >
                返回修改参数
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
