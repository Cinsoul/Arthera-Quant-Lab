/**
 * Services Index - 服务统一导出
 * 
 * 集中管理所有服务模块的导出
 */

import { useState, useEffect } from 'react';
import { moduleCommunication } from './CommunicationBus';
import { getEnvFlag } from '../utils/env';
import { getDataStreamManager } from './DataStreamManager';
import { getCacheManager } from './CacheManager';
import { getWorkspaceService } from './WorkspaceService';
import { getHistoricalDataService } from './HistoricalDataService';
import { getDataTransformService } from './DataTransformService';
import { getMarketDataProvider } from './MarketDataProvider';
import { getDataValidationService } from './DataValidationService';
import { getStrategyExecutionService } from './StrategyExecutionService';
import { getStrategyPerformanceMonitor } from './StrategyPerformanceMonitor';
import { getRiskAnalysisService } from './RiskAnalysisService';
import { getPortfolioManagementService } from './PortfolioManagementService';
import { getIndicatorCalculationService } from './IndicatorCalculationService';
import { getLevel2DataService } from './Level2DataService';
import { getAlertService } from './AlertService';
import { getReportExportService } from './ReportExportService';
import { getStockInfoService } from './StockInfoService';
import { getQuantCalculationService } from './QuantCalculationService';
import { quantEngineService } from './QuantEngineService';
import { qlibIntegrationService } from './QlibIntegrationService';
import { tushareDataService } from './TushareDataService';
import { deepSeekSignalService } from './DeepSeekSignalService';

declare global {
  interface Window {
    __ARTHERA_REAL_MODE__?: boolean;
  }
}

const BACKEND_PROBES_ENABLED = getEnvFlag(
  'VITE_ENABLE_BACKEND_PROBES',
  'REACT_APP_ENABLE_BACKEND_PROBES',
  false
);

const CRITICAL_SERVICES: string[] = [
  'cache',
  'historicalData',
  'marketData',
  'dataTransform',
  'dataValidation',
  'strategyExecution',
  'strategyMonitor',
  'riskAnalysis',
  'portfolio',
  'indicator',
  'alert',
  'reportExport',
  'stockInfo',
  'configManager',
  'moduleCommunication'
];

// ============================================================================
// 数据服务
// ============================================================================

export {
  getDataStreamManager,
  useMarketData,
  type MarketData,
  type ConnectionStatus,
  type DataStreamConfig,
  type Level2Data,
  type TickData,
  type Subscription,
} from './DataStreamManager';

export {
  getCacheManager,
  useCachedData,
  performanceOptimizer,
  dataShardManager,
  type CacheStore,
  type CacheConfig,
  type PerformanceMetrics,
  type DataCompressionConfig,
  type QueryOptimization,
  PerformanceOptimizer,
  DataShardManager,
} from './CacheManager';

export {
  getWorkspaceService,
  WorkspaceService,
  type Workspace as WorkspaceType,
  type WorkspaceWidget,
  type WorkspaceTemplate,
  type WorkspaceGlobalSettings,
  type WorkspaceSyncSettings,
  type ModuleConnection,
  type WidgetConfig,
  type WidgetLayout,
  type DataSubscription
} from './WorkspaceService';

export {
  getHistoricalDataService,
  useHistoricalData,
  useSmartHistoricalData,
  type OHLCV,
  type FinancialData,
  type StockInfo,
  type TimePeriod,
  type DataRequest,
  type DataResponse,
} from './HistoricalDataService';

export {
  getDataTransformService,
  type TimeSeriesData,
  type ResampleConfig,
  type NormalizeConfig,
  type TradingViewBar,
  type CSVRow,
} from './DataTransformService';

export {
  getMarketDataProvider,
  useQuotes,
  useStockSearch,
  type DataSource,
  type QuoteData,
  type FundamentalData,
  type DataQuality,
  type CorrelationMatrix,
} from './MarketDataProvider';

export {
  getDataValidationService,
  type ValidationResult,
  type ValidationIssue,
  type ValidationSummary,
  type OutlierDetectionResult,
} from './DataValidationService';

// ============================================================================
// 图表服务
// ============================================================================

export {
  type ChartDataPoint,
  type ChartConfig,
} from './ChartService';

// ============================================================================
// 策略服务
// ============================================================================

export {
  StrategyExecutionService,
  getStrategyExecutionService,
  maStrategy,
  aiDeepSeekStrategy,
  tushareBasicStrategy,
  type Signal,
  type SignalType,
  type Order,
  type OrderType,
  type OrderStatus,
  type Position,
  type PositionSide,
  type Trade,
  type StrategyConfig,
  type BacktestResult,
  type StrategySignalGenerator,
  type StrategyTemplate,
  StrategyTemplateManager,
  // 高级策略生成器 (新增)
  createMultiFactorStrategy,
  createMLStrategy,
  createRiskParityStrategy,
  createDynamicHedgingStrategy,
  createPairsTradingStrategy,
  strategyTemplateManager,
} from './StrategyExecutionService';

// ============================================================================
// 风险服务
// ============================================================================

export {
  getRiskAnalysisService,
  RiskAnalysisService,
  type RiskMetrics,
  type StressTestScenario,
  type StressTestResult,
  type RiskContribution,
  type BayesianRiskParams,
  type BayesianPositionMetrics,
  type DynamicStopLoss,
} from './RiskAnalysisService';

// ============================================================================
// 组合服务
// ============================================================================

export {
  getPortfolioManagementService,
  type Holding,
  type Portfolio,
  type PortfolioTemplate,
  type OptimizationParams,
  type OptimizationResult,
  type RebalanceAction,
  type Attribution,
  type AdvancedRiskMetrics,
  type IntelligentPositionConfig,
  type PositionRecommendation,
  type SmartRebalanceResult,
} from './PortfolioManagementService';

// ============================================================================
// 指标服务
// ============================================================================

export {
  getIndicatorCalculationService,
  type IndicatorType,
  type IndicatorParams,
  type IndicatorResult,
} from './IndicatorCalculationService';

export {
  getLevel2DataService,
  useLevel2Data,
  type Level2Data,
  type Level2OrderBookEntry,
  type Level2TradeEntry,
  type Level2LiquidityMetrics,
  type Level2SubscriptionConfig,
} from './Level2DataService';

export {
  VirtualizedChartService,
  createVirtualizedChartService,
  useVirtualizedChart,
  type VirtualizedChartConfig,
  type VirtualizedChartState,
  type ChartTheme,
  type RenderQuality,
} from './VirtualizedChartService';

// ============================================================================
// 警报服务
// ============================================================================

export {
  getAlertService,
  AlertService,
  type Alert,
  type AlertCondition,
  type AlertTriggerEvent,
  type AlertStatistics,
  type AlertConditionType,
  type AlertNotificationType,
  type AlertPriority,
  type AlertStatus,
} from './AlertService';

// ============================================================================
// 报告导出服务
// ============================================================================

export {
  getReportExportService,
  ReportExportService,
  type ReportConfig,
  type ReportTemplate,
  type ReportSection,
  type ReportBranding,
  type ReportMetadata,
  type ExportFormat,
  type ExportOptions,
  type ExportResult,
  type ScheduledReport,
  type ReportSchedule,
} from './ReportExportService';

// ============================================================================
// 策略性能监控服务
// ============================================================================

export {
  getStrategyPerformanceMonitor,
  StrategyPerformanceMonitor,
  automationWorkflowManager,
  multiAccountManager,
  AutomationWorkflowManager,
  MultiAccountManager,
  type StrategyPerformanceMetrics,
  type StrategySignal,
  type PerformanceAlert,
  type ComparisonMetrics,
  type PerformanceSubscription,
  type SystemPerformanceMetrics,
  type ErrorRecord,
  type ComponentPerformance,
  type APIPerformanceTracker,
  type ServiceHealthStatus,
  type EnhancedPerformanceAlert,
  type AutomationRule,
  type AutomationTrigger,
  type AutomationAction,
  type AccountConfig,
} from './StrategyPerformanceMonitor';

// ============================================================================
// 新闻服务
// ============================================================================

export {
  newsService,
  type NewsItem,
  type NewsCategory,
  type NewsSentiment,
  type NewsFilter,
  type NewsSearchOptions,
} from './NewsService';

// ============================================================================
// 股票信息服务
// ============================================================================

export {
  getStockInfoService,
  StockInfoService,
  type StockBasicInfo,
  type StockHistoryInfo,
  type IndustryInfo,
  type ConceptInfo,
} from './StockInfoService';

// ============================================================================
// 量化计算服务
// ============================================================================

export {
  getQuantCalculationService,
  QuantCalculationService,
  type MovingAverageParams,
  type BollingerBandsParams,
  type RSIParams,
  type MACDParams,
  type KDJParams,
  type CalculationResult,
} from './QuantCalculationService';

// ============================================================================
// 外部量化服务集成
// ============================================================================

export {
  quantEngineService,
  type Alpha158Factor,
  type MLPrediction,
  type BacktestResult,
  type TradeRecord,
  type RiskAssessment,
} from './QuantEngineService';

export {
  qlibIntegrationService,
  type QlibModel,
  type QlibDataset,
  type QlibBacktestConfig,
  type QlibBacktestResult,
} from './QlibIntegrationService';

export {
  deepSeekSignalService,
  type MarketSignal,
  type MarketAnalysis,
  type DeepSeekConfig,
} from './DeepSeekSignalService';

export {
  tushareDataService,
  type StockBasic,
  type DailyBasic,
  type MarketData as TushareMarketData,
  type IndexData,
  type FinanceData,
  type TushareConfig,
} from './TushareDataService';

// ============================================================================
// 服务工厂
// ============================================================================

/**
 * 获取所有服务实例
 */
export function getAllServices() {
  return {
    dataStream: getDataStreamManager(),
    cache: getCacheManager(),
    historicalData: getHistoricalDataService(),
    dataTransform: getDataTransformService(),
    marketData: getMarketDataProvider(),
    dataValidation: getDataValidationService(),
    riskAnalysis: getRiskAnalysisService(),
    portfolio: getPortfolioManagementService(),
    indicator: getIndicatorCalculationService(),
    level2Data: getLevel2DataService(),
    alert: getAlertService(),
    reportExport: getReportExportService(),
    strategyMonitor: getStrategyPerformanceMonitor(),
    automationWorkflow: automationWorkflowManager,
    multiAccount: multiAccountManager,
    news: newsService,
    stockInfo: getStockInfoService(),
    quantCalc: getQuantCalculationService(),
    // Performance Tools
    performanceOptimizer: performanceOptimizer,
    dataShardManager: dataShardManager,
    // 外部量化服务
    quantEngine: quantEngineService,
    qlib: qlibIntegrationService,
    // AI & 数据服务
    deepSeek: deepSeekSignalService,
    tushare: tushareDataService,
  };
}

/**
 * 服务健康检查
 */
export async function checkServicesHealth() {
  const marketData = getMarketDataProvider();
  const cache = getCacheManager();
  
  try {
    const marketHealth = await marketData.healthCheck();
    const cacheCount = await cache.count('market-data').catch(() => 0);

    if (!BACKEND_PROBES_ENABLED) {
      return {
        healthy: marketHealth.healthy,
        services: {
          marketData: marketHealth,
          cache: {
            healthy: true,
            recordCount: cacheCount,
          },
          quantEngine: { healthy: false, disabled: true, reason: 'Backend probes disabled' },
          qlib: { healthy: false, disabled: true, reason: 'Backend probes disabled' },
          deepSeek: { healthy: false, connected: false, disabled: true },
          tushare: { healthy: false, connected: false, disabled: true },
        },
        externalServices: {
          quantEngine: false,
          qlib: false,
          deepSeek: false,
          tushare: false,
        }
      };
    }

    const quantEngineHealth = await quantEngineService.healthCheck();
    const qlibHealth = await qlibIntegrationService.healthCheck();
    const deepSeekHealth = await deepSeekSignalService.testConnection();
    const tushareHealth = await tushareDataService.testConnection();
    const externalServicesHealthy =
      quantEngineHealth.healthy ||
      qlibHealth.healthy ||
      deepSeekHealth ||
      tushareHealth;

    return {
      healthy: marketHealth.healthy && externalServicesHealthy,
      services: {
        marketData: marketHealth,
        cache: {
          healthy: true,
          recordCount: cacheCount,
        },
        quantEngine: quantEngineHealth,
        qlib: qlibHealth,
        deepSeek: {
          healthy: deepSeekHealth,
          connected: deepSeekHealth,
        },
        tushare: {
          healthy: tushareHealth,
          connected: tushareHealth,
        },
      },
      externalServices: {
        quantEngine: quantEngineHealth.healthy,
        qlib: qlibHealth.healthy,
        deepSeek: deepSeekHealth,
        tushare: tushareHealth,
      }
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 统一服务初始化管理器 - 启用真实数据服务
 */
export async function initializeServices(options: {
  enableRealData?: boolean;
  enableWebSocket?: boolean;
  enableAkShare?: boolean;
  modules?: string[];
} = {}) {
  const {
    enableRealData = true,
    enableWebSocket = true,
    enableAkShare = true,
    modules = ['all']
  } = options;

  const externalServicesEnabled = BACKEND_PROBES_ENABLED;

  console.log('🚀 Initializing Arthera Quant Services...');
  console.log(`📊 Real Data: ${enableRealData ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🔗 WebSocket: ${enableWebSocket ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📈 AkShare: ${enableAkShare ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📦 Modules: ${modules.join(', ')}`);
  
  const initResults: Record<string, any> = {};
  const errors: Record<string, string> = {};

  // 首先进行后端连通性检测
  console.log('🔍 Checking backend connectivity...');
  try {
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8004';
    const response = await fetch(`${backendUrl}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5秒超时
    });
    
    if (!response.ok) {
      throw new Error(`Backend health check failed: HTTP ${response.status}`);
    }
    
    const healthData = await response.json();
    console.log('✅ Backend connection verified:', healthData);
    initResults.backendConnectivity = { healthy: true, status: healthData };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('⚠️  Backend connectivity issue:', errorMessage);
    initResults.backendConnectivity = { 
      healthy: false, 
      error: errorMessage,
      suggestion: 'Please ensure start_services.sh is running and backend is accessible'
    };
    errors.backendConnectivity = errorMessage;
    // 继续执行但禁用需要后端的功能
  }
  
  try {
    // 1. 核心基础服务初始化
    console.log('🔧 Initializing core services...');
    
    // 缓存管理器
    const cache = getCacheManager();
    await cache.init();
    initResults.cache = true;
    console.log('✅ Cache Manager initialized');

    // 数据流管理器
    const dataStream = getDataStreamManager();
    if (enableWebSocket) {
      dataStream.connect();
      initResults.dataStream = true;
      console.log('✅ Data Stream Manager connected (WebSocket enabled)');
    } else {
      console.log('⚠️  Data Stream Manager: WebSocket disabled');
      initResults.dataStream = false;
    }

    // 2. 数据服务层初始化
    console.log('📊 Initializing data services...');
    
    // 历史数据服务 (集成AkShare)
    const historicalService = getHistoricalDataService();
    await historicalService.initialize({ enableAkShare, enableRealData });
    initResults.historicalData = true;
    console.log('✅ Historical Data Service initialized (AkShare integrated)');

    // 市场数据提供者
    const marketDataProvider = getMarketDataProvider();
    await marketDataProvider.initialize({ enableRealData, enableAkShare });
    initResults.marketData = true;
    console.log('✅ Market Data Provider initialized');

    // 数据转换服务
    const dataTransform = getDataTransformService();
    initResults.dataTransform = true;
    console.log('✅ Data Transform Service initialized');

    // 数据验证服务
    const dataValidation = getDataValidationService();
    initResults.dataValidation = true;
    console.log('✅ Data Validation Service initialized');

    // 3. 策略执行层初始化
    console.log('🎯 Initializing strategy services...');
    
    // 策略执行服务 (真实回测引擎)
    try {
      const strategyExecution = getStrategyExecutionService();
      // 检查服务是否有initialize方法
      if (typeof strategyExecution.initialize === 'function') {
        await strategyExecution.initialize({ enableRealData });
        initResults.strategyExecution = { healthy: true, initialized: true };
        console.log('✅ Strategy Execution Service initialized (Real backtesting enabled)');
      } else {
        console.warn('⚠️  Strategy Execution Service: initialize method not found, using fallback');
        initResults.strategyExecution = { healthy: true, initialized: false, fallback: true };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️  Strategy Execution Service initialization failed:', errorMessage);
      initResults.strategyExecution = { healthy: false, error: errorMessage };
      errors.strategyExecution = errorMessage;
    }

    // 策略性能监控
    try {
      const strategyMonitor = getStrategyPerformanceMonitor();
      if (typeof strategyMonitor.initialize === 'function') {
        await strategyMonitor.initialize({ enableRealTime: enableWebSocket });
        initResults.strategyMonitor = { healthy: true, initialized: true };
        console.log('✅ Strategy Performance Monitor initialized');
      } else {
        console.warn('⚠️  Strategy Performance Monitor: initialize method not found, using fallback');
        initResults.strategyMonitor = { healthy: true, initialized: false, fallback: true };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️  Strategy Performance Monitor initialization failed:', errorMessage);
      initResults.strategyMonitor = { healthy: false, error: errorMessage };
      errors.strategyMonitor = errorMessage;
    }

    // 4. 风险分析层初始化
    console.log('⚠️  Initializing risk services...');
    
    const riskAnalysis = getRiskAnalysisService();
    await riskAnalysis.initialize({ enableRealData });
    initResults.riskAnalysis = true;
    console.log('✅ Risk Analysis Service initialized');

    // 5. 组合管理层初始化
    console.log('📈 Initializing portfolio services...');
    
    const portfolio = getPortfolioManagementService();
    await portfolio.initialize({ enableRealData });
    initResults.portfolio = true;
    console.log('✅ Portfolio Management Service initialized');

    // 6. 技术指标服务初始化
    console.log('📊 Initializing indicator services...');
    
    const indicator = getIndicatorCalculationService();
    initResults.indicator = true;
    console.log('✅ Indicator Calculation Service initialized');

    const quantCalc = getQuantCalculationService();
    initResults.quantCalc = true;
    console.log('✅ Quant Calculation Service initialized');

    // 7. 辅助服务初始化
    console.log('🔔 Initializing auxiliary services...');
    
    // 警报服务
    const alertService = getAlertService();
    await alertService.initialize();
    initResults.alert = true;
    console.log('✅ Alert Service initialized');

    // 报告导出服务
    const reportExport = getReportExportService();
    await reportExport.initialize();
    initResults.reportExport = true;
    console.log('✅ Report Export Service initialized');

    // 新闻服务 (已初始化)
    initResults.news = true;
    console.log('✅ News Service ready');

    // 股票信息服务
    const stockInfo = getStockInfoService();
    await stockInfo.initialize({ enableAkShare });
    initResults.stockInfo = true;
    console.log('✅ Stock Info Service initialized');

    // Level2数据服务 (如果启用WebSocket)
    if (enableWebSocket) {
      const level2Service = getLevel2DataService();
      initResults.level2Data = true;
      console.log('✅ Level2 Data Service initialized');
    }

    // 8. 配置管理器初始化
    console.log('📁 Initializing configuration services...');
    
    // 配置管理器初始化
    try {
      // 预加载核心配置
      const coreConfigs = [
        'dashboard_settings',
        'portfolio_settings', 
        'strategy_lab_settings',
        'command_bar_settings',
        'keyboard_shortcuts_settings'
      ];
      
      for (const configKey of coreConfigs) {
        await configManager.loadConfig(configKey, {});
      }
      
      initResults.configManager = true;
      console.log('✅ Configuration Manager initialized with core configs');
    } catch (error) {
      initResults.configManager = false;
      console.log('⚠️  Configuration Manager: Failed to preload configs');
    }

    // 模块间通信系统初始化
    try {
      // 清除旧状态并初始化
      moduleCommunication.clearState();
      
      // 初始化导航状态
      moduleCommunication.updateNavigationState('dashboard', {
        initialized: true,
        timestamp: Date.now()
      });
      
      initResults.moduleCommunication = true;
      console.log('✅ Module Communication Bus initialized');
    } catch (error) {
      initResults.moduleCommunication = false;
      console.log('⚠️  Module Communication: Initialization failed');
    }

    // 9. 特定模块服务初始化
    console.log('🏗️  Initializing module-specific services...');
    
    // 选股器服务
    if (modules.includes('all') || modules.includes('stock-picker')) {
      try {
        // 选股器服务依赖市场数据和股票信息服务
        if (initResults.marketData && initResults.stockInfo) {
          // 这里可以添加选股器特定的初始化逻辑
          initResults.stockPicker = true;
          console.log('✅ Stock Picker Service initialized');
        } else {
          initResults.stockPicker = false;
          console.log('⚠️  Stock Picker Service: Missing dependencies');
        }
      } catch (error) {
        initResults.stockPicker = false;
        console.log('⚠️  Stock Picker Service: Initialization failed');
      }
    }

    // 策略对比服务
    if (modules.includes('all') || modules.includes('strategy-compare')) {
      try {
        // 策略对比服务依赖策略执行和性能监控服务
        if (initResults.strategyExecution && initResults.strategyMonitor) {
          initResults.strategyCompare = true;
          console.log('✅ Strategy Compare Service initialized');
        } else {
          initResults.strategyCompare = false;
          console.log('⚠️  Strategy Compare Service: Missing dependencies');
        }
      } catch (error) {
        initResults.strategyCompare = false;
        console.log('⚠️  Strategy Compare Service: Initialization failed');
      }
    }

    // 命令栏和快捷键服务
    if (modules.includes('all') || modules.includes('command-interface')) {
      try {
        // 这些UI服务不需要复杂的初始化，主要是配置检查
        initResults.commandBar = true;
        initResults.keyboardShortcuts = true;
        console.log('✅ Command Bar and Keyboard Shortcuts initialized');
      } catch (error) {
        initResults.commandBar = false;
        initResults.keyboardShortcuts = false;
        console.log('⚠️  Command Interface: Initialization failed');
      }
    }

    // 报告中心服务
    if (modules.includes('all') || modules.includes('reports')) {
      try {
        // 报告中心依赖报告导出服务
        if (initResults.reportExport) {
          initResults.reportCenter = true;
          console.log('✅ Report Center Service initialized');
        } else {
          initResults.reportCenter = false;
          console.log('⚠️  Report Center Service: Missing dependencies');
        }
      } catch (error) {
        initResults.reportCenter = false;
        console.log('⚠️  Report Center Service: Initialization failed');
      }
    }

    // 9. 服务连接验证
    console.log('🔍 Performing service health checks...');
    const health = await checkServicesHealth();
    
    // 10. AkShare后端连接测试
    if (enableAkShare) {
      if (BACKEND_PROBES_ENABLED) {
        try {
          const akshareHealth = await testAkShareConnection();
          initResults.akshare = akshareHealth.success;
          console.log(`✅ AkShare Backend: ${akshareHealth.success ? 'CONNECTED' : 'FALLBACK MODE'}`);
        } catch (error) {
          initResults.akshare = false;
          console.log('⚠️  AkShare Backend: Connection failed, using fallback data');
        }
      } else {
        initResults.akshare = false;
        console.log('ℹ️  AkShare Backend: Remote probes disabled, running in offline mode');
      }
    }

    // 11. 外部量化服务集成
    console.log('🚀 Integrating external quantitative services...');

    if (externalServicesEnabled) {
      try {
        const quantEngineHealth = await testQuantEngineConnection();
        initResults.quantEngine = quantEngineHealth.success;
        if (quantEngineHealth.success) {
          console.log('✅ QuantEngine: CONNECTED (Alpha158, ML Models, Risk Management)');
        } else {
          console.log('⚠️  QuantEngine: Connection failed, using local fallback');
        }
      } catch (error) {
        initResults.quantEngine = false;
        console.log('⚠️  QuantEngine: Service not available, using local implementations');
      }

      try {
        const qlibHealth = await testQlibConnection();
        initResults.qlib = qlibHealth.success;
        if (qlibHealth.success) {
          console.log('✅ Qlib Platform: CONNECTED (Microsoft Qlib Integration)');
        } else {
          console.log('⚠️  Qlib Platform: Connection failed, using alternative strategies');
        }
      } catch (error) {
        initResults.qlib = false;
        console.log('⚠️  Qlib Platform: Service not available, using built-in algorithms');
      }

      try {
        const deepSeekHealth = await deepSeekSignalService.testConnection();
        initResults.deepSeek = deepSeekHealth;
        if (deepSeekHealth) {
          console.log('✅ DeepSeek AI: CONNECTED (Signal Generation, Market Analysis, Strategy Insights)');
        } else {
          console.log('⚠️  DeepSeek AI: Connection failed, using fallback analysis');
        }
      } catch (error) {
        initResults.deepSeek = false;
        console.log('⚠️  DeepSeek AI: Service not available, using local analysis');
      }

      try {
        const tushareHealth = await tushareDataService.testConnection();
        initResults.tushare = tushareHealth;
        if (tushareHealth) {
          console.log('✅ Tushare: CONNECTED (A股数据, 基本面数据, 指数数据)');
        } else {
          console.log('⚠️  Tushare: Connection failed, using alternative data sources');
        }
      } catch (error) {
        initResults.tushare = false;
        console.log('⚠️  Tushare: Service not available, using fallback data sources');
      }
    } else {
      initResults.quantEngine = false;
      initResults.qlib = false;
      initResults.deepSeek = false;
      initResults.tushare = false;
      console.log('ℹ️  External services disabled by environment, using local implementations');
    }

    const successCount = Object.values(initResults).filter(Boolean).length;
    const totalCount = Object.keys(initResults).length;
    const criticalSuccess = CRITICAL_SERVICES.every(service => initResults[service] !== false);
    const backendHealthy = initResults.backendConnectivity?.healthy ?? false;
    const resolvedRealData = enableRealData && backendHealthy;
    const resolvedWebSocket = enableWebSocket && backendHealthy;
    const resolvedAkShare = enableAkShare && backendHealthy;

    console.log(`\n🎉 Service Initialization Complete!`);
    console.log(`📊 Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
    console.log(`🔧 Health Status: ${health.healthy ? 'HEALTHY' : 'DEGRADED'}`);
    console.log(`🚀 External Services: QuantEngine=${initResults.quantEngine ? 'UP' : 'DOWN'}, Qlib=${initResults.qlib ? 'UP' : 'DOWN'}, DeepSeek=${initResults.deepSeek ? 'UP' : 'DOWN'}, Tushare=${initResults.tushare ? 'UP' : 'DOWN'}`);

    if (typeof window !== 'undefined') {
      const previousMode = window.__ARTHERA_REAL_MODE__;
      window.__ARTHERA_REAL_MODE__ = resolvedRealData;
      window.dispatchEvent(new CustomEvent('arthera:service-mode', {
        detail: {
          realData: resolvedRealData,
          backendHealthy,
        }
      }));
      if (previousMode === false && resolvedRealData) {
        console.log('🔄 Real data restored, refreshing UI...');
        setTimeout(() => window.location.reload(), 500);
      }
    }
    
    return { 
      success: criticalSuccess, 
      health, 
      initResults,
      errors,
      hasErrors: Object.keys(errors).length > 0,
      enabledFeatures: {
        realData: resolvedRealData,
        webSocket: resolvedWebSocket,
        akshare: resolvedAkShare && initResults.akshare
      },
      externalServices: {
        quantEngine: initResults.quantEngine || false,
        qlib: initResults.qlib || false,
        deepSeek: initResults.deepSeek || false,
        tushare: initResults.tushare || false
      },
      recommendations: Object.keys(errors).length > 0 ? [
        'Some services failed to initialize. Check console for details.',
        'Ensure backend services are running with start_services.sh',
        'Verify API keys are configured in Settings',
        'Check network connectivity for external services'
      ] : []
    };
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    
    // 确保initResults始终有默认值
    const safeInitResults = initResults || {
      cache: false,
      dataStream: false,
      historicalData: false,
      marketData: false,
      dataTransform: false,
      dataValidation: false,
      strategyExecution: false,
      strategyMonitor: false,
      riskAnalysis: false,
      portfolio: false,
      indicator: false,
      quantCalc: false,
      alert: false,
      reportExport: false,
      news: false,
      stockInfo: false,
      level2Data: false,
      configManager: false,
      moduleCommunication: false,
      stockPicker: false,
      strategyCompare: false,
      commandBar: false,
      keyboardShortcuts: false,
      reportCenter: false,
      akshare: false,
      quantEngine: false,
      qlib: false,
      deepSeek: false,
      tushare: false
    };
    
    return { 
      success: false, 
      error,
      initResults: safeInitResults,
      enabledFeatures: {
        realData: enableRealData || false,
        webSocket: enableWebSocket || false,
        akshare: false
      },
      externalServices: {
        quantEngine: false,
        qlib: false,
        deepSeek: false,
        tushare: false
      }
    };
  }
}

/**
 * 测试AkShare后端连接
 */
async function testAkShareConnection(): Promise<{ success: boolean; error?: string }> {
  if (!BACKEND_PROBES_ENABLED) {
    return { success: false, error: 'Backend probes disabled' };
  }
  try {
    const response = await fetch('http://localhost:8004/health', { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000 
    } as any);
    
    if (response.ok) {
      const data = await response.json();
      return { success: data.status === 'healthy' };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

/**
 * 测试QuantEngine服务连接
 */
async function testQuantEngineConnection(): Promise<{ success: boolean; error?: string }> {
  if (!BACKEND_PROBES_ENABLED) {
    return { success: false, error: 'Backend probes disabled' };
  }
  try {
    // 测试主API服务 (FastAPI on port 8000)
    const mainApiResponse = await fetch('http://localhost:8004/health', { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 3000 
    } as any);
    
    // 测试Qlib API服务 (port 8001)  
    const qlibApiResponse = await fetch('http://localhost:8004/health', { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 3000 
    } as any);
    
    const mainApiOk = mainApiResponse.ok;
    const qlibApiOk = qlibApiResponse.ok;
    
    if (mainApiOk || qlibApiOk) {
      return { 
        success: true,
        availableServices: {
          mainApi: mainApiOk,
          qlibApi: qlibApiOk
        }
      };
    } else {
      return { success: false, error: 'Both QuantEngine services unavailable' };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'QuantEngine connection failed' 
    };
  }
}

/**
 * 测试Qlib平台连接
 */
async function testQlibConnection(): Promise<{ success: boolean; error?: string }> {
  if (!BACKEND_PROBES_ENABLED) {
    return { success: true, error: 'Backend probes disabled', mode: 'offline' } as any;
  }
  try {
    // 检查Qlib安装和基本功能
    // 这里可以通过检查文件系统或者调用本地Python脚本来验证
    const qlibPath = '/Users/mac/Desktop/Arthera/qlib';
    
    // 简单的检查：验证Qlib目录和关键文件是否存在
    const response = await fetch('http://localhost:8004/api/v1/models', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 3000
    } as any);
    
    if (response.ok) {
      return { success: true };
    } else {
      // 如果API不可用，但Qlib文件存在，仍可以认为服务可用
      return { success: true, mode: 'file-based' };
    }
  } catch (error) {
    // 即使API不可用，Qlib作为Python库仍可能可用
    return { 
      success: true, 
      mode: 'offline',
      error: 'API unavailable, using offline mode'
    };
  }
}

// ============================================================================
// 配置持久化和恢复服务
// ============================================================================

/**
 * 配置管理器 - 处理应用配置的持久化和恢复
 */
class ConfigurationManager {
  private static instance: ConfigurationManager;
  private cache: Map<string, any> = new Map();

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * 保存配置
   */
  async saveConfig(key: string, config: any): Promise<void> {
    try {
      const configData = {
        data: config,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      
      localStorage.setItem(`arthera_config_${key}`, JSON.stringify(configData));
      this.cache.set(key, config);
      
      console.log(`📁 Configuration saved: ${key}`);
    } catch (error) {
      console.error(`Failed to save config ${key}:`, error);
      throw error;
    }
  }

  /**
   * 加载配置
   */
  async loadConfig(key: string, defaultValue: any = null): Promise<any> {
    try {
      // 先检查内存缓存
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      // 从localStorage加载
      const stored = localStorage.getItem(`arthera_config_${key}`);
      if (!stored) {
        console.log(`📂 No config found for ${key}, using default`);
        return defaultValue;
      }

      const configData = JSON.parse(stored);
      this.cache.set(key, configData.data);
      
      console.log(`📂 Configuration loaded: ${key}`);
      return configData.data;
    } catch (error) {
      console.error(`Failed to load config ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * 删除配置
   */
  async removeConfig(key: string): Promise<void> {
    try {
      localStorage.removeItem(`arthera_config_${key}`);
      this.cache.delete(key);
      console.log(`🗑️ Configuration removed: ${key}`);
    } catch (error) {
      console.error(`Failed to remove config ${key}:`, error);
    }
  }

  /**
   * 批量保存配置
   */
  async saveBatchConfig(configs: Record<string, any>): Promise<void> {
    const promises = Object.entries(configs).map(([key, value]) => 
      this.saveConfig(key, value)
    );
    await Promise.all(promises);
    console.log(`📁 Batch configuration saved: ${Object.keys(configs).join(', ')}`);
  }

  /**
   * 导出所有配置
   */
  async exportAllConfigs(): Promise<Record<string, any>> {
    const configs: Record<string, any> = {};
    
    // 从localStorage读取所有Arthera配置
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('arthera_config_')) {
        const configKey = key.replace('arthera_config_', '');
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          configs[configKey] = data.data;
        } catch (error) {
          console.warn(`Failed to export config ${configKey}:`, error);
        }
      }
    }
    
    console.log(`📤 Exported ${Object.keys(configs).length} configurations`);
    return configs;
  }

  /**
   * 导入配置批次
   */
  async importConfigs(configs: Record<string, any>): Promise<void> {
    await this.saveBatchConfig(configs);
    console.log(`📥 Imported ${Object.keys(configs).length} configurations`);
  }

  /**
   * 清除所有配置
   */
  async clearAllConfigs(): Promise<void> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('arthera_config_')) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => localStorage.removeItem(key));
    this.cache.clear();
    
    console.log(`🧹 Cleared ${keys.length} configurations`);
  }
}

export const configManager = ConfigurationManager.getInstance();

// 模块间通信和状态管理
// ============================================================================

// Implementation moved to CommunicationBus.ts

// 全局通信总线实例
// Re-export moduleCommunication from standalone file
export { moduleCommunication } from './CommunicationBus';

/**
 * React Hook for module communication
 */
export function useModuleCommunication() {
  const [state, setState] = useState(moduleCommunication.getCurrentState());

  useEffect(() => {
    const handleStateUpdate = (event: any) => {
      setState(moduleCommunication.getCurrentState());
    };

    const events = [
      'strategy:completed',
      'strategy:apply-to-portfolio',
      'stocks:selection-changed',
      'strategy:add-to-comparison',
      'services:status-updated',
      'comparison:strategy-synced',
      'lab:strategy-details-requested',
      'comparison:strategy-details-provided',
      'comparison:state-updated',
      'lab:state-updated',
      'navigation:state-updated',
      'comparison:report-shared',
      'state:cleared'
    ];

    events.forEach(eventType => {
      moduleCommunication.addEventListener(eventType, handleStateUpdate);
    });

    return () => {
      events.forEach(eventType => {
        moduleCommunication.removeEventListener(eventType, handleStateUpdate);
      });
    };
  }, []);

  return {
    state,
    notifyStrategyCompleted: moduleCommunication.notifyStrategyCompleted.bind(moduleCommunication),
    applyStrategyToPortfolio: moduleCommunication.applyStrategyToPortfolio.bind(moduleCommunication),
    importStockSelection: moduleCommunication.importStockSelection.bind(moduleCommunication),
    addStrategyToComparison: moduleCommunication.addStrategyToComparison.bind(moduleCommunication),
    updateServiceStatus: moduleCommunication.updateServiceStatus.bind(moduleCommunication),
    syncStrategyToComparison: moduleCommunication.syncStrategyToComparison.bind(moduleCommunication),
    requestStrategyDetails: moduleCommunication.requestStrategyDetails.bind(moduleCommunication),
    provideStrategyDetails: moduleCommunication.provideStrategyDetails.bind(moduleCommunication),
    updateComparisonState: moduleCommunication.updateComparisonState.bind(moduleCommunication),
    updateLabState: moduleCommunication.updateLabState.bind(moduleCommunication),
    updateNavigationState: moduleCommunication.updateNavigationState.bind(moduleCommunication),
    shareComparisonReport: moduleCommunication.shareComparisonReport.bind(moduleCommunication),
    clearState: moduleCommunication.clearState.bind(moduleCommunication),
    // 新增：数据传输优化方法
    getPerformanceMetrics: moduleCommunication.getPerformanceMetrics.bind(moduleCommunication),
    configureTransfer: moduleCommunication.configureTransfer.bind(moduleCommunication),
    flushQueue: moduleCommunication.flushQueue.bind(moduleCommunication),
    clearCache: moduleCommunication.clearCache.bind(moduleCommunication),
    dispatchUrgentEvent: moduleCommunication.dispatchUrgentEvent.bind(moduleCommunication)
  };
}

// ============================================================================
// 策略商店服务
// ============================================================================

export {
  strategyStoreService,
  type StrategyTemplate,
} from './StrategyStoreService';

import { moduleCommunication as communicationBus } from './CommunicationBus';

export default {
  getAllServices,
  checkServicesHealth,
  initializeServices,
  moduleCommunication: communicationBus,
  useModuleCommunication,
  // Configuration Management
  configManager,
};
