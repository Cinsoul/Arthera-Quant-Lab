import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, TrendingDown, HelpCircle, Target, Activity, Database, Wifi, Brain, Cpu, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { RiskPreference, RiskPreferences } from './RiskPreference';
import { Methodology } from './Methodology';
import { Glossary } from './Glossary';
import { LiveMarketGrid } from './LiveMarketCard';
import { 
  useMarketData, 
  getCacheManager, 
  getAlertService, 
  getStrategyPerformanceMonitor,
  initializeServices,
  quantEngineService,
  qlibIntegrationService,
  moduleCommunication,
  useModuleCommunication,
  configManager,
  getPortfolioManagementService,
  getStrategyExecutionService,
  getWorkspaceService,
  type MarketData,
  type Alpha158Factor,
  type QlibModel,
  type Alert,
  type AlertTriggerEvent,
  type Portfolio as PortfolioType,
  type BacktestResult,
  type SystemPerformanceMetrics,
  type ServiceHealthStatus
} from '../services';

interface DashboardProps {
  onViewBacktest: (backtestId: string) => void;
  onViewComparison?: () => void;
  onOpenModal?: (modal: 'risk-preference' | 'methodology' | 'glossary') => void;
  onViewStockChart?: (symbol: string) => void;
  userRole: string;
}

interface QuickLinkCardProps {
  title: string;
  description: string;
  shortcut?: string;
  accentColor: string;
  onClick: () => void;
}

function QuickLinkCard({ title, description, shortcut, accentColor, onClick }: QuickLinkCardProps) {
  return (
    <button 
      onClick={onClick}
      className="relative group text-left overflow-hidden"
    >
      {/* Background gradient on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${accentColor}`}></div>
      
      {/* Border */}
      <div className="relative p-5 border border-[#1e3a5f]/40 rounded-lg group-hover:border-[#2a4f7f]/60 transition-all duration-300">
        {/* Top section: Title + Shortcut */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-[15px] text-gray-100 font-medium mb-1 group-hover:text-white transition-colors">
              {title}
            </h3>
            {shortcut && (
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-[#0d1b2e] border border-[#1e3a5f]/50 rounded text-[10px] text-gray-500 font-mono">
                  {shortcut}
                </kbd>
              </div>
            )}
          </div>
          
          {/* Accent indicator */}
          <div className={`w-1.5 h-1.5 rounded-full ${accentColor} opacity-60 group-hover:opacity-100 group-hover:scale-150 transition-all duration-300`}></div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
          {description}
        </p>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-current transition-all duration-500" style={{ color: accentColor.replace('bg-', '#') }}></div>
      </div>
    </button>
  );
}

// Mock data
const performanceData = [
  { date: '2024-01', strategy: 1.00, hs300: 1.00, zz500: 1.00, drawdown: 0 },
  { date: '2024-02', strategy: 1.03, hs300: 1.01, zz500: 1.02, drawdown: -0.005 },
  { date: '2024-03', strategy: 1.08, hs300: 1.02, zz500: 1.04, drawdown: 0 },
  { date: '2024-04', strategy: 1.06, hs300: 1.00, zz500: 1.03, drawdown: -0.025 },
  { date: '2024-05', strategy: 1.12, hs300: 1.03, zz500: 1.06, drawdown: 0 },
  { date: '2024-06', strategy: 1.18, hs300: 1.05, zz500: 1.08, drawdown: 0 },
  { date: '2024-07', strategy: 1.15, hs300: 1.04, zz500: 1.07, drawdown: -0.032 },
  { date: '2024-08', strategy: 1.22, hs300: 1.06, zz500: 1.10, drawdown: 0 },
  { date: '2024-09', strategy: 1.28, hs300: 1.08, zz500: 1.13, drawdown: 0 },
  { date: '2024-10', strategy: 1.35, hs300: 1.10, zz500: 1.16, drawdown: 0 },
  { date: '2024-11', strategy: 1.42, hs300: 1.12, zz500: 1.19, drawdown: 0 },
  { date: '2024-12', strategy: 1.48, hs300: 1.14, zz500: 1.22, drawdown: 0 },
];

const riskRadarData = [
  { metric: '收益', value: 85, fullMark: 100 },
  { metric: '回撤控制', value: 78, fullMark: 100 },
  { metric: '波动率', value: 72, fullMark: 100 },
  { metric: '分散度', value: 88, fullMark: 100 },
  { metric: '流动性', value: 82, fullMark: 100 },
];

const recentBacktests = [
  {
    id: 'bt-001',
    name: 'High Vol Alpha - Q4 Test',
    pool: 'A股中小盘高流动性池',
    period: '2024-01-01 至 2024-12-09',
    annualReturn: '42.3%',
    maxDrawdown: '-8.2%',
    status: '完成',
  },
  {
    id: 'bt-002',
    name: 'Multi-Factor Balanced',
    pool: '自定义组合 (45只)',
    period: '2024-01-01 至 2024-12-09',
    annualReturn: '38.6%',
    maxDrawdown: '-6.5%',
    status: '完成',
  },
  {
    id: 'bt-003',
    name: 'Momentum + Quality',
    pool: 'A股中小盘高流动性池',
    period: '2024-06-01 至 2024-12-09',
    annualReturn: '28.4%',
    maxDrawdown: '-5.1%',
    status: '完成',
  },
  {
    id: 'bt-004',
    name: 'Low Volatility Defense',
    pool: '自定义组合 (50只)',
    period: '2024-01-01 至 2024-12-09',
    annualReturn: '25.7%',
    maxDrawdown: '-4.2%',
    status: '完成',
  },
];

// 工具函数
function getMarketStatus(): 'open' | 'closed' | 'pre-market' | 'after-hours' {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0=Sunday, 6=Saturday
  
  // 周末闭市
  if (day === 0 || day === 6) return 'closed';
  
  // 工作日时间判断
  if (hour >= 9 && hour < 15) {
    return 'open';
  } else if (hour >= 8 && hour < 9) {
    return 'pre-market';
  } else if (hour >= 15 && hour < 16) {
    return 'after-hours';
  } else {
    return 'closed';
  }
}

function calculatePortfolioMetrics(portfolio: any) {
  try {
    // 计算组合总价值
    const totalValue = portfolio.totalValue || portfolio.holdings?.reduce((sum: number, holding: any) => {
      return sum + (holding.quantity * holding.currentPrice || 0);
    }, 0) || 5682456.78;
    
    // 计算今日盈亏
    const todayPnL = portfolio.todayPnL || (totalValue * (Math.random() - 0.5) * 0.02);
    
    // 计算总收益率
    const totalReturn = portfolio.totalReturn || ((totalValue - (portfolio.initialValue || totalValue * 0.7)) / (portfolio.initialValue || totalValue * 0.7));
    
    // 计算最大回撤（简化）
    const maxDrawdown = portfolio.maxDrawdown || -0.082;
    
    // 计算波动率（简化）
    const volatility = portfolio.volatility || 0.185;
    
    return {
      totalValue,
      todayPnL,
      totalReturn,
      maxDrawdown,
      volatility
    };
  } catch (error) {
    console.error('Error calculating portfolio metrics:', error);
    return {
      totalValue: 5682456.78,
      todayPnL: 12345.67,
      totalReturn: 0.423,
      maxDrawdown: -0.082,
      volatility: 0.185
    };
  }
}

function generatePerformanceDataFromBacktests(backtests: any[]): any[] {
  try {
    if (!backtests || backtests.length === 0) return performanceData;
    
    // 使用最新的回测结果生成性能图表数据
    const latestBacktest = backtests[0];
    if (latestBacktest.performanceHistory) {
      return latestBacktest.performanceHistory.map((point: any, index: number) => ({
        date: point.date || `2024-${String(index + 1).padStart(2, '0')}`,
        strategy: point.portfolioValue || (1 + index * 0.04),
        hs300: point.benchmark || (1 + index * 0.012),
        zz500: point.benchmark2 || (1 + index * 0.022),
        drawdown: point.drawdown || 0
      }));
    }
    
    return performanceData; // 回退到默认数据
  } catch (error) {
    console.error('Error generating performance data:', error);
    return performanceData;
  }
}

export function Dashboard({ onViewBacktest, onViewComparison, onOpenModal, onViewStockChart, userRole }: DashboardProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // 实时数据订阅
  const watchlist = ['600519', '300750', '000858', '600036', '002594', '601318'];
  const { data: marketData, status, connectionInfo } = useMarketData(watchlist, { 
    enableLevel2: false,
    autoConnect: true 
  });

  // 模块间通信集成
  const {
    state: communicationState,
    updateNavigationState,
    notifyStrategyCompleted
  } = useModuleCommunication();

  // 本地状态管理
  const [performanceDataState, setPerformanceData] = useState<any[]>(performanceData);
  const [alertCount, setAlertCount] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [todayPnL, setTodayPnL] = useState(0);
  const [dashboardConfig, setDashboardConfig] = useState<any>({
    watchlist: ['600519', '300750', '000858'],
    refreshInterval: 30000,
    enableRealTime: true
  });

  // 价格提醒服务集成
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [triggeredAlertsToday, setTriggeredAlertsToday] = useState<AlertTriggerEvent[]>([]);

  // 工作区服务集成状态
  const [workspaceService] = useState(() => getWorkspaceService());

  // 性能监控集成 (新增)
  const [performanceMonitor] = useState(() => getStrategyPerformanceMonitor());
  const [systemHealth, setSystemHealth] = useState<{
    healthScore: number;
    systemMetrics: SystemPerformanceMetrics | null;
    serviceHealth: ServiceHealthStatus[];
    errorCount: number;
  }>({
    healthScore: 100,
    systemMetrics: null,
    serviceHealth: [],
    errorCount: 0
  });
  const [workspaceConnected, setWorkspaceConnected] = useState(false);
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    portfolioValue: 5682456.78,
    todayPnL: 12345.67,
    totalReturn: 0.423,
    activeStrategies: 3,
    marketStatus: getMarketStatus(),
    maxDrawdown: -0.082,
    volatility: 0.185
  });

  // 初始化价格提醒服务连接
  useEffect(() => {
    const alertService = getAlertService();
    
    // 监听警报触发事件
    const unsubscribe = alertService.addEventListener('onAlertTriggered', (event: AlertTriggerEvent) => {
      setTriggeredAlertsToday(prev => [event, ...prev.slice(0, 9)]);
      setAlertCount(prev => prev + 1);
      
      // 通知模块通信系统
      moduleCommunication.emit('alert:triggered', {
        symbol: event.alert.symbol,
        alertName: event.alert.name,
        marketData: event.marketData,
        priority: event.alert.priority,
        module: 'dashboard'
      });
    });

    // 获取当前警报
    setAlerts(alertService.getAllAlerts());

    // 获取统计信息
    const stats = alertService.getStatistics();
    setAlertCount(stats.triggeredToday);

    return unsubscribe;
  }, []);

  // 性能监控数据更新 (新增)
  useEffect(() => {
    const updateSystemHealth = () => {
      try {
        const healthScore = performanceMonitor.getSystemHealthScore();
        const systemMetrics = performanceMonitor.getSystemMetrics();
        const serviceHealth = performanceMonitor.getServiceHealth();
        const errorRecords = performanceMonitor.getErrorRecords();
        
        setSystemHealth({
          healthScore,
          systemMetrics: systemMetrics.length > 0 ? systemMetrics[systemMetrics.length - 1] : null,
          serviceHealth,
          errorCount: errorRecords.filter(e => e.timestamp > Date.now() - 60000).length
        });

        // 记录Dashboard组件渲染性能
        performanceMonitor.trackComponentRender('Dashboard', performance.now() - renderStartTime);
      } catch (error) {
        performanceMonitor.logError('error', 'Dashboard', 'Failed to update system health', { error });
      }
    };

    const renderStartTime = performance.now();
    updateSystemHealth();
    
    // 定期更新系统健康状态
    const healthInterval = setInterval(updateSystemHealth, 10000); // 每10秒更新

    return () => clearInterval(healthInterval);
  }, [performanceMonitor]);

  // 工作区服务连接和数据同步 (增强版)
  useEffect(() => {
    // 定义事件监听器在外层作用域
    let workspaceListener: any;
    let marketListener: any;
    
    const connectToWorkspace = async () => {
      const startTime = performance.now();
      
      try {
        performanceMonitor.logInfo('Dashboard', 'Connecting to workspace service');

        // 监听工作区事件
        const handleWorkspaceData = (data: any) => {
          console.log('[Dashboard] Received workspace data:', data);
          
          // 更新仪表板配置
          if (data.symbols && data.symbols.length > 0) {
            setDashboardConfig(prev => ({
              ...prev,
              watchlist: data.symbols,
              lastUpdated: Date.now()
            }));
          }
          
          setWorkspaceConnected(true);
          performanceMonitor.logInfo('Dashboard', 'Workspace connected successfully');
        };

        // 监听模块通信事件
        workspaceListener = (event: any) => handleWorkspaceData(event.detail);
        marketListener = (event: any) => {
          // 处理实时市场数据
          const data = event.detail;
          if (data.data) {
            setRealTimeMetrics(prev => ({
              ...prev,
              marketStatus: getMarketStatus(),
              lastUpdated: new Date()
            }));
          }
        };
        
        moduleCommunication.addEventListener('workspace:dashboard:connected', workspaceListener);
        moduleCommunication.addEventListener('data:dashboard:market', marketListener);

        // 获取实时组合数据
        const portfolioService = getPortfolioManagementService();
        const cacheManager = getCacheManager();
        
        // 尝试从缓存获取，如果失败则获取实时数据
        let mainPortfolio = await cacheManager.get('portfolio-main', 'snapshot');
        if (!mainPortfolio) {
          mainPortfolio = portfolioService.getCurrentPortfolio();
          await cacheManager.set('portfolio-main', 'snapshot', mainPortfolio, 60); // 缓存60秒
        }
        
        if (mainPortfolio) {
          const calculatedMetrics = calculatePortfolioMetrics(mainPortfolio);
          
          setRealTimeMetrics(prev => ({
            ...prev,
            portfolioValue: calculatedMetrics.totalValue,
            todayPnL: calculatedMetrics.todayPnL,
            totalReturn: calculatedMetrics.totalReturn,
            maxDrawdown: calculatedMetrics.maxDrawdown,
            volatility: calculatedMetrics.volatility
          }));
          
          // 更新实际的 portfolio 和 PnL 状态
          setPortfolioValue(calculatedMetrics.totalValue);
          setTodayPnL(calculatedMetrics.todayPnL);
        }

        // 获取策略执行状态
        const strategyService = getStrategyExecutionService();
        let runningStrategies = await cacheManager.get('strategies-running', 'list');
        if (!runningStrategies) {
          runningStrategies = await strategyService.getRunningStrategies();
          await cacheManager.set('strategies-running', 'list', runningStrategies, 30);
        }
        
        setRealTimeMetrics(prev => ({
          ...prev,
          activeStrategies: runningStrategies ? runningStrategies.length : 0
        }));

        // 获取最新回测结果并更新性能数据
        const latestBacktests = await strategyService.getBacktestResults({ limit: 5 });
        if (latestBacktests && latestBacktests.length > 0) {
          const enhancedPerformanceData = generatePerformanceDataFromBacktests(latestBacktests);
          setPerformanceData(enhancedPerformanceData);
        }

        console.log('✅ Dashboard connected to workspace services with real data');
        
      } catch (error) {
        console.error('❌ Dashboard workspace connection failed:', error);
        // 降级到模拟数据
        setRealTimeMetrics({
          portfolioValue: 5682456.78,
          todayPnL: 12345.67,
          totalReturn: 0.423,
          activeStrategies: 3,
          marketStatus: getMarketStatus()
        });
      }
    };

    connectToWorkspace();
    
    // 设置定时刷新
    const refreshInterval = setInterval(() => {
      if (workspaceConnected) {
        connectToWorkspace();
      }
    }, 30000); // 每30秒刷新一次

    return () => {
      moduleCommunication.removeEventListener('workspace:dashboard:connected', workspaceListener);
      moduleCommunication.removeEventListener('data:dashboard:market', marketListener);
      clearInterval(refreshInterval);
    };
  }, [workspaceConnected]);

  // 实时数据更新
  useEffect(() => {
    const updateRealTimeData = () => {
      // 模拟实时数据更新
      const now = new Date();
      const marketHour = now.getHours();
      
      let marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours' = 'closed';
      if (marketHour >= 9 && marketHour < 15) {
        marketStatus = 'open';
      } else if (marketHour >= 8 && marketHour < 9) {
        marketStatus = 'pre-market';
      } else if (marketHour >= 15 && marketHour < 16) {
        marketStatus = 'after-hours';
      }

      setRealTimeMetrics(prev => ({
        ...prev,
        marketStatus,
        // 模拟微小的PnL变化（仅在开市时）
        todayPnL: marketStatus === 'open' ? prev.todayPnL + (Math.random() - 0.5) * 100 : prev.todayPnL
      }));
    };

    const interval = setInterval(updateRealTimeData, 5000); // 每5秒更新一次
    return () => clearInterval(interval);
  }, []);
  
  // 外部服务状态
  const [serviceStatus, setServiceStatus] = useState({
    initialized: false,
    quantEngine: false,
    qlib: false,
    akshare: false
  });
  const [alpha158Factors, setAlpha158Factors] = useState<Alpha158Factor[]>([]);
  const [mlPredictions, setMLPredictions] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<QlibModel[]>([]);

  // 统一服务初始化
  useEffect(() => {
    const initializeDashboardServices = async () => {
      try {
        console.log('🚀 Initializing Dashboard services...');
        
        // 1. 初始化所有服务（包括QuantEngine和Qlib）
        const serviceResults = await initializeServices({
          enableRealData: true,
          enableWebSocket: true,
          enableAkShare: true,
          modules: ['dashboard', 'quantEngine', 'qlib']
        });
        
        setServiceStatus({
          initialized: serviceResults.success,
          quantEngine: serviceResults.initResults?.quantEngine || false,
          qlib: serviceResults.initResults?.qlib || false,
          akshare: serviceResults.initResults?.akshare || false
        });
        
        // 2. 从缓存加载历史表现数据
        const cacheManager = getCacheManager();
        const cachedData = await cacheManager.get('portfolios', 'dashboard-performance');
        if (cachedData) {
          setPerformanceData(cachedData);
        } else {
          setPerformanceData(performanceData);
        }

        // 3. 监听警报事件
        const alertService = getAlertService();
        const unsubscribe = alertService.subscribe((alert) => {
          setAlertCount(prev => prev + 1);
        });

        // 4. 如果QuantEngine可用，获取Alpha158因子
        if (serviceResults.initResults?.quantEngine) {
          try {
            const factors = await quantEngineService.calculateAlpha158Factors(
              watchlist,
              '2024-11-01',
              '2024-12-10'
            );
            
            // 取第一个股票的因子作为展示
            if (factors[watchlist[0]]) {
              setAlpha158Factors(factors[watchlist[0]]);
            }
          } catch (error) {
            console.error('Failed to get Alpha158 factors:', error);
          }
        }

        // 5. 如果Qlib可用，获取可用模型
        if (serviceResults.initResults?.qlib) {
          try {
            const models = await qlibIntegrationService.getTrainedModels();
            setAvailableModels(models);
          } catch (error) {
            console.error('Failed to get Qlib models:', error);
          }
        }

        console.log('✅ Dashboard services initialized:', serviceResults);
        return () => unsubscribe();
      } catch (error) {
        console.error('[Dashboard] Service initialization failed:', error);
        setPerformanceData(performanceData);
        setServiceStatus(prev => ({ ...prev, initialized: false }));
      }
    };

    initializeDashboardServices();
  }, []);

  // 根据实时数据更新组合价值和PnL
  useEffect(() => {
    if (marketData.size > 0) {
      let totalGains = 0;
      let totalValue = portfolioValue;

      // 计算基于实时价格的组合表现
      marketData.forEach((data) => {
        const change = data.change || 0;
        const changePercent = data.changePercent || 0;
        
        // 模拟持仓影响
        if (changePercent !== 0) {
          totalGains += (change * 1000); // 假设每只股票持有1000股
        }
      });

      setTodayPnL(totalGains);
      setPortfolioValue(5682456.78 + totalGains);
    }
  }, [marketData]);

  // 配置管理 - 加载和保存Dashboard配置
  useEffect(() => {
    const loadDashboardConfig = async () => {
      try {
        const savedConfig = await configManager.loadConfig('dashboard_settings', {
          activeFilter: null,
          autoRefresh: true,
          refreshInterval: 5000,
          showRealTimeData: true,
          compactView: false
        });
        
        setDashboardConfig(savedConfig);
        setActiveFilter(savedConfig.activeFilter);
        
        console.log('📁 Dashboard configuration loaded:', savedConfig);
      } catch (error) {
        console.error('Failed to load dashboard configuration:', error);
      }
    };

    loadDashboardConfig();
  }, []);

  // 模块间通信监听 - 响应其他模块的事件
  useEffect(() => {
    // 监听策略完成事件
    const handleStrategyCompleted = (event: CustomEvent) => {
      const { strategy } = event.detail;
      console.log('📊 Dashboard received strategy completion:', strategy);
      
      // 更新仪表板显示
      if (strategy) {
        // 这里可以添加策略完成后的仪表板更新逻辑
        console.log(`✅ 策略 ${strategy.name} 已完成，更新仪表板显示`);
        
        // 可以触发表现数据刷新
        setPerformanceData(prev => [...prev, {
          date: new Date().toLocaleDateString(),
          strategy: 1 + (Math.random() * 0.1 - 0.05), // 模拟新的策略表现
          hs300: 1 + (Math.random() * 0.05 - 0.025)
        }]);
      }
    };

    // 监听导航状态更新
    const handleNavigationUpdate = (event: CustomEvent) => {
      const { navigationState } = event.detail;
      if (navigationState.currentModule === 'dashboard') {
        setRealTimeMetrics(prev => ({ ...prev, lastUpdated: new Date() }));
      }
    };

    // 监听模块状态更新
    const handleModuleStateUpdate = (event: CustomEvent) => {
      console.log('🔄 Dashboard received module state update:', event.detail);
      
      // 可以根据其他模块的状态更新仪表板显示
      const { labState, comparisonState } = communicationState;
      
      if (labState?.backtestInProgress) {
        setAlertCount(prev => prev + 1);
      }
      
      if (comparisonState?.activeComparison) {
        // 高亮显示对比相关的数据
        console.log('📈 对比分析正在进行中');
      }
    };

    moduleCommunication.addEventListener('strategy:completed', handleStrategyCompleted);
    moduleCommunication.addEventListener('navigation:state-updated', handleNavigationUpdate);
    moduleCommunication.addEventListener('lab:state-updated', handleModuleStateUpdate);
    moduleCommunication.addEventListener('comparison:state-updated', handleModuleStateUpdate);

    return () => {
      moduleCommunication.removeEventListener('strategy:completed', handleStrategyCompleted);
      moduleCommunication.removeEventListener('navigation:state-updated', handleNavigationUpdate);
      moduleCommunication.removeEventListener('lab:state-updated', handleModuleStateUpdate);
      moduleCommunication.removeEventListener('comparison:state-updated', handleModuleStateUpdate);
    };
  }, [activeFilter, userRole, communicationState]);

  // 配置自动保存
  useEffect(() => {
    if (dashboardConfig) {
      const saveConfig = async () => {
        try {
          const updatedConfig = {
            ...dashboardConfig,
            activeFilter,
            lastUpdated: Date.now()
          };
          
          await configManager.saveConfig('dashboard_settings', updatedConfig);
          setDashboardConfig(updatedConfig);
        } catch (error) {
          console.error('Failed to save dashboard configuration:', error);
        }
      };

      const timeoutId = setTimeout(saveConfig, 1000); // 防抖保存
      return () => clearTimeout(timeoutId);
    }
  }, [dashboardConfig, activeFilter]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0a1628] border border-[#0ea5e9]/50 rounded-lg p-3 shadow-xl">
          <div className="text-xs text-gray-400 mb-2">{data.date}</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#0ea5e9]">策略净值：</span>
              <span className="text-gray-200">{data.strategy.toFixed(2)} (+{((data.strategy - 1) * 100).toFixed(1)}%)</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">沪深300：</span>
              <span className="text-gray-300">{data.hs300.toFixed(2)} (+{((data.hs300 - 1) * 100).toFixed(1)}%)</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-[#1a2942]">
              <span className="text-[#10b981]">超额：</span>
              <span className="text-[#10b981]">+{((data.strategy - data.hs300) * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#1a2942] text-xs text-gray-500">
            主因：中小盘高贝塔 + 行业轮动
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Enhanced Service Status Bar */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {status === 'connected' ? (
                <Activity className="w-4 h-4 text-[#10b981] animate-pulse" />
              ) : status === 'connecting' ? (
                <Wifi className="w-4 h-4 text-[#f59e0b] animate-pulse" />
              ) : (
                <Database className="w-4 h-4 text-[#6b7280]" />
              )}
              <span className="text-sm text-gray-300">
                数据流状态: <span className={`font-medium ${
                  status === 'connected' ? 'text-[#10b981]' : 
                  status === 'connecting' ? 'text-[#f59e0b]' : 'text-gray-500'
                }`}>
                  {status === 'connected' ? '实时连接' : 
                   status === 'connecting' ? '连接中' : '离线模式'}
                </span>
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            {serviceStatus.initialized ? '服务已就绪' : '服务初始化中...'}
          </div>
        </div>
        
        {/* External Services Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[#1a2942]">
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
              {serviceStatus.quantEngine ? '已连接' : '离线'}
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
              {serviceStatus.qlib ? '已连接' : '离线'}
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
        
        {/* Additional Info */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1a2942]">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              订阅: {marketData.size}/{watchlist.length} 只股票
            </div>
            <div className="text-sm text-gray-500">
              重连次数: {connectionInfo.reconnectAttempts}
            </div>
          </div>
          <div className="text-xs text-gray-600">
            {userRole} • Dashboard v2.1 • 已集成外部服务
          </div>
        </div>
      </div>

      {/* Quick Links - 功能入口区 */}
      <div className="grid grid-cols-4 gap-4">
        <QuickLinkCard
          title="风险偏好设置"
          description="根据目标收益 & 容忍回撤，生成推荐策略组合"
          accentColor="bg-[#0ea5e9]"
          onClick={() => onOpenModal && onOpenModal('risk-preference')}
        />
        <QuickLinkCard
          title="方案对比"
          description="对比 2-3 个策略的表现差异和风险特征"
          accentColor="bg-[#10b981]"
          onClick={() => onViewComparison && onViewComparison()}
        />
        <QuickLinkCard
          title="术语解释"
          description="查看夏普、回撤等专业术语的详细说明"
          accentColor="bg-[#8b5cf6]"
          onClick={() => onOpenModal && onOpenModal('glossary')}
        />
        <QuickLinkCard
          title="方法论说明"
          description="回测假设、数据处理、风险公式透明化"
          accentColor="bg-[#f59e0b]"
          onClick={() => onOpenModal && onOpenModal('methodology')}
        />
      </div>

      {/* Key Metrics Cards - 分组指标卡片 */}
      <div className="space-y-4">
        {/* 收益表现 */}
        <div>
          <div className="text-xs text-gray-600 mb-3 pl-1">收益表现</div>
          <div className="grid grid-cols-3 gap-4">
            <PrimaryMetricCard
              title="年化收益"
              value={`${(realTimeMetrics.totalReturn * 100).toFixed(1)}%`}
              change={`+${((realTimeMetrics.totalReturn - 0.30) * 100).toFixed(1)}%`}
              trend={realTimeMetrics.totalReturn > 0.30 ? 'up' : 'down'}
              subtitle={`${realTimeMetrics.marketStatus === 'open' ? '实时策略表现' : '最近策略表现'}`}
              onClick={() => console.log('Navigate to Performance')}
              tooltip="将投资期间的总收益率转换为年度收益率"
              targetValue="70%"
              targetLabel="高风险目标"
            />
            <PrimaryMetricCard
              title="实时组合表现"
              value={realTimeMetrics.portfolioValue > 0 ? `¥${(realTimeMetrics.portfolioValue / 1000000).toFixed(2)}M` : `¥${(portfolioValue / 1000000).toFixed(2)}M`}
              change={realTimeMetrics.todayPnL !== 0 ? `${realTimeMetrics.todayPnL >= 0 ? '+' : ''}${(realTimeMetrics.todayPnL / 10000).toFixed(1)}万` : `${todayPnL >= 0 ? '+' : ''}${(todayPnL / 10000).toFixed(1)}万`}
              trend={(realTimeMetrics.todayPnL !== 0 ? realTimeMetrics.todayPnL : todayPnL) >= 0 ? 'up' : 'down'}
              subtitle={`${status === 'connected' ? '实时' : '缓存'} | ${marketData.size}只持仓 | ${realTimeMetrics.marketStatus === 'open' ? '交易中' : '休市'}`}
              onClick={() => onViewStockChart && onViewStockChart('600519')}
            />
            <PrimaryMetricCard
              title="成功率"
              value="78.5%"
              change="+5.2%"
              trend="up"
              subtitle="跑赢基准比例"
              onClick={() => console.log('Navigate to Reports')}
            />
          </div>
        </div>

        {/* 风险概况 */}
        <div>
          <div className="text-xs text-gray-600 mb-3 pl-1">风险概况</div>
          <div className="grid grid-cols-3 gap-4">
            <PrimaryMetricCard
              title="最大回撤"
              value={`${(realTimeMetrics.maxDrawdown * 100).toFixed(1)}%`}
              change={`${realTimeMetrics.maxDrawdown > -0.10 ? '+' : ''}${((realTimeMetrics.maxDrawdown + 0.10) * 100).toFixed(1)}%`}
              trend={realTimeMetrics.maxDrawdown > -0.10 ? 'up' : 'down'}
              subtitle={`较基准改善 | ${realTimeMetrics.marketStatus === 'open' ? '实时监控' : '最新数据'}`}
              onClick={() => console.log('Navigate to Risk')}
              tooltip="历史上从高点到低点的最大跌幅，衡量最糟糕情况"
            />
            <SecondaryMetricCard
              title="波动率"
              value={`${(realTimeMetrics.volatility * 100).toFixed(1)}%`}
              subtitle={`年化标准差 | ${realTimeMetrics.volatility < 0.2 ? '低风险' : '中等风险'}`}
            />
            <SecondaryMetricCard
              title="回撤恢复时间"
              value="23天"
              subtitle="平均恢复周期"
            />
          </div>
        </div>

        {/* 研究覆盖 */}
        <div>
          <div className="text-xs text-gray-600 mb-3 pl-1">研究覆盖</div>
          <div className="grid grid-cols-3 gap-4">
            <SecondaryMetricCard
              title="回测项目"
              value="127"
              subtitle="本月新增 +8"
            />
            <SecondaryMetricCard
              title="覆盖股票"
              value="1,245"
              subtitle="A股池总数 +52"
            />
            <SecondaryMetricCard
              title="活跃策略"
              value={realTimeMetrics.activeStrategies.toString()}
              subtitle={`正在运行 | ${realTimeMetrics.marketStatus === 'open' ? '实时执行中' : '待开市'}`}
            />
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-3 gap-5">
        {/* Performance Chart with Drawdown */}
        <div className="col-span-2 bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm text-gray-400 mb-2">收益 & 基准对比</h3>
              <div className="flex gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#0ea5e9] rounded-sm"></div>
                  <span className="text-gray-500">策略组合</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-[#64748b] rounded-sm"></div>
                  <span className="text-gray-600">沪深300</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-[#475569] rounded-sm"></div>
                  <span className="text-gray-600">中证500</span>
                </div>
              </div>
            </div>
            <div className="text-right text-xs space-y-1">
              <div className="text-[#0ea5e9]">策略：1.48 (+48%)</div>
              <div className="text-gray-500">沪深300：1.14 (+14%)</div>
              <div className="text-gray-600">中证500：1.22 (+22%)</div>
            </div>
          </div>

          {/* Main Equity Curve */}
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={performanceData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2942" />
              <XAxis 
                dataKey="date" 
                stroke="#475569" 
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis 
                stroke="#475569" 
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickMargin={8}
                domain={['auto', 'auto']}
                tickCount={7}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="strategy" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="hs300" stroke="#64748b" strokeWidth={1.2} dot={false} />
              <Line type="monotone" dataKey="zz500" stroke="#475569" strokeWidth={1.2} dot={false} />
            </LineChart>
          </ResponsiveContainer>

          {/* Drawdown Mini Chart */}
          <div className="mt-6 pt-4 border-t border-[#1a2942]">
            <h3 className="text-xs text-gray-500 mb-2">回撤曲线</h3>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={performanceData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2942" />
                <XAxis 
                  dataKey="date" 
                  stroke="#475569" 
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  tickMargin={5}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis 
                  stroke="#475569" 
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  tickMargin={5}
                  domain={[-0.04, 0]}
                  tickCount={5}
                  tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d1b2e',
                    border: '1px solid #1a2942',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                  formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
                />
                <Area type="monotone" dataKey="drawdown" stroke="#f97316" strokeWidth={1.5} fill="url(#drawdownGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: AI Summary + Risk Radar */}
        <div className="space-y-5">
          {/* AI Summary - 结构化 */}
          <div className="bg-gradient-to-br from-[#0d1b2e] to-[#0a1628] border border-[#0ea5e9]/30 rounded-lg p-5">
            <div className="mb-3">
              <h3 className="text-sm text-gray-400 mb-1">AI 高层摘要</h3>
              <div className="text-xs text-gray-500">基于最近 6 次回测</div>
            </div>

            {/* 一句话结论 */}
            <div className="p-3 bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 rounded mb-4">
              <div className="text-sm text-gray-200 leading-relaxed">
                <span className="text-[#0ea5e9]">结论：</span>当前默认策略在 6 次回测中有 5 次跑赢沪深 300，
                年化 <span className="px-1.5 py-0.5 bg-[#10b981]/20 text-[#10b981] rounded text-xs mx-1">42.3%</span>，
                风险水平可接受。
              </div>
            </div>

            {/* 表现 & 风险要点 */}
            <div className="space-y-2 text-xs text-gray-300 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-[#0ea5e9] mt-0.5">•</span>
                <div>
                  <span className="text-gray-400">最差阶段：</span>2024年4-7月最大回撤 
                  <span className="px-1.5 py-0.5 bg-[#f97316]/20 text-[#f97316] rounded mx-1">-8.2%</span>
                  ，明显优于基准 -12.5%
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#0ea5e9] mt-0.5">•</span>
                <div>
                  <span className="text-gray-400">收益来源：</span>中小盘成长 + 高换手 Alpha
                </div>
              </div>
            </div>

            {/* 与客户 Mandate 对齐 */}
            <div className="pt-3 border-t border-[#1a2942]">
              <div className="text-xs text-gray-500 mb-2">对 10M 组合</div>
              <div className="text-xs text-gray-400 leading-relaxed">
                <span className="px-1.5 py-0.5 bg-[#1a2942] text-gray-300 rounded mr-1">40-50只</span>
                股票分散度良好，单票最大权重 
                <span className="px-1.5 py-0.5 bg-[#1a2942] text-gray-300 rounded mx-1">&lt;4%</span>
                ，符合当前风险偏好设定
              </div>
            </div>

            {/* 可点击关键词 */}
            <div className="pt-3 border-t border-[#1a2942] mt-3">
              <div className="text-xs text-gray-600 mb-2">关键标签</div>
              <div className="flex flex-wrap gap-2">
                {['中小盘', '最大回撤控制', '动量因子', '高流动性'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveFilter(tag)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      activeFilter === tag
                        ? 'bg-[#0ea5e9] text-white'
                        : 'bg-[#1a2942]/50 text-gray-400 hover:bg-[#1a2942]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Risk Radar Chart */}
          <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
            <h3 className="text-sm text-gray-400 mb-3">风险结构评分</h3>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={riskRadarData}>
                <PolarGrid stroke="#1a2942" />
                <PolarAngleAxis 
                  dataKey="metric" 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                />
                <Radar 
                  name="评分" 
                  dataKey="value" 
                  stroke="#0ea5e9" 
                  fill="#0ea5e9" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="text-xs text-gray-500 text-center mt-2">
              综合得分：<span className="text-gray-300">81/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Backtests Table */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg">
        <div className="px-5 py-4 border-b border-[#1a2942]">
          <h3 className="text-sm text-gray-400">最近回测列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1a2942] text-gray-500 text-xs">
                <th className="text-left px-5 py-3">回测名称</th>
                <th className="text-left px-5 py-3">股票池</th>
                <th className="text-left px-5 py-3">起止时间</th>
                <th className="text-right px-5 py-3">年化收益</th>
                <th className="text-right px-5 py-3">最大回撤</th>
                <th className="text-center px-5 py-3">状态</th>
                <th className="text-center px-5 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {recentBacktests.map((backtest) => (
                <tr key={backtest.id} className="border-b border-[#1a2942]/50 hover:bg-[#1a2942]/30 transition-colors">
                  <td className="px-5 py-3 text-gray-200">{backtest.name}</td>
                  <td className="px-5 py-3 text-gray-400">{backtest.pool}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{backtest.period}</td>
                  <td className="px-5 py-3 text-right text-[#10b981]">{backtest.annualReturn}</td>
                  <td className="px-5 py-3 text-right text-[#f97316]">{backtest.maxDrawdown}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex px-2 py-1 bg-[#10b981]/20 text-[#10b981] rounded text-xs">
                      {backtest.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => onViewBacktest(backtest.id)}
                      className="px-3 py-1 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded text-xs hover:bg-[#0ea5e9]/30 transition-colors"
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Market Grid */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
        <h3 className="text-sm text-gray-400 mb-4">实时市场概览</h3>
        <LiveMarketGrid 
          symbols={['600519', '300750', '000858', '600036', '002594', '601318', '000333', '600276']}
          onCardClick={onViewStockChart}
        />
      </div>
    </div>
  );
}

import { Skeleton } from './ui/skeleton';
import { cn } from './ui/utils';

interface PrimaryMetricCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  onClick?: () => void;
  tooltip?: string;
  targetValue?: string;
  targetLabel?: string;
  loading?: boolean;
  isActive?: boolean;
  className?: string;
}

function PrimaryMetricCard({ 
  title, 
  value, 
  change, 
  trend, 
  subtitle, 
  onClick, 
  tooltip, 
  targetValue, 
  targetLabel,
  loading = false,
  isActive = false,
  className
}: PrimaryMetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={cn(
        "bg-[#0d1b2e] border rounded-lg p-5 transition-all group text-left relative w-full overflow-hidden",
        isActive 
          ? "border-[#0ea5e9] shadow-[0_0_30px_rgba(14,165,233,0.1)] bg-[#0d1b2e] ring-1 ring-[#0ea5e9]/20" 
          : "border-[#1a2942] hover:border-[#0ea5e9]/50 hover:shadow-lg hover:shadow-black/20",
        loading && "cursor-wait opacity-90",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="text-xs text-gray-500 flex items-center gap-1 font-medium tracking-wide">
          组合表现
          {tooltip && <HelpCircle className="w-3 h-3 text-gray-600 hover:text-gray-400 transition-colors" />}
        </div>
        {loading ? (
          <Skeleton className="h-4 w-16 bg-[#1a2942]" />
        ) : (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-mono font-medium px-1.5 py-0.5 rounded",
              trend === 'up' ? 'text-[#10b981] bg-[#10b981]/10' : trend === 'down' ? 'text-[#f97316] bg-[#f97316]/10' : 'text-gray-400'
            )}
          >
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
            <span>{change}</span>
          </div>
        )}
      </div>
      
      <div className="mb-2 relative z-10">
        {loading ? (
          <Skeleton className="h-9 w-32 bg-[#1a2942] mb-1" />
        ) : (
          <div className={cn(
            "text-3xl font-semibold tracking-tight text-gray-100 transition-colors",
            isActive ? "text-[#0ea5e9]" : "group-hover:text-white"
          )}>
            {value}
          </div>
        )}
      </div>
      
      {targetValue && !loading && (
        <div className="mb-3 flex items-center gap-2 text-xs relative z-10">
          <div className="flex-1 h-1 bg-[#1a2942] rounded-full overflow-hidden">
            <div className="h-full bg-[#0ea5e9] shadow-[0_0_10px_#0ea5e9]" style={{ width: '60%' }}></div>
          </div>
          <Target className="w-3 h-3 text-gray-600" />
        </div>
      )}
      
      <div className="relative z-10">
        {loading ? (
          <Skeleton className="h-3 w-24 bg-[#1a2942]" />
        ) : (
          <div className="text-xs text-gray-500 font-medium">{subtitle}</div>
        )}
      </div>
      
      {targetValue && !loading && (
        <div className="text-xs text-gray-600 mt-1.5 font-mono relative z-10">
          目标：<span className="text-[#f97316]">{targetValue}</span> ({targetLabel})
        </div>
      )}

      {showTooltip && tooltip && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-[#0a1628] border border-[#1a2942] rounded-lg p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-xs text-gray-300 leading-relaxed font-sans">{tooltip}</div>
        </div>
      )}
      
      {/* Active Indicator Glow */}
      {isActive && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#0ea5e9]/5 blur-[60px] rounded-full pointer-events-none -z-0" />
      )}
    </button>
  );
}

interface SecondaryMetricCardProps {
  title: string;
  value: string;
  subtitle: string;
}

function SecondaryMetricCard({ title, value, subtitle }: SecondaryMetricCardProps) {
  return (
    <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-2">{title}</div>
      <div className="text-2xl text-gray-200 mb-2">{value}</div>
      <div className="text-xs text-gray-600">{subtitle}</div>
    </div>
  );
}
