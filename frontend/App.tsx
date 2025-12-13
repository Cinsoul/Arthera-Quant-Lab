import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { StrategyLab } from './components/StrategyLab';
import { BacktestDetail } from './components/BacktestDetail';
import { Portfolio } from './components/Portfolio';
import { Reports } from './components/Reports';
import { AICopilot } from './components/AICopilot';
import { RiskProfile } from './components/RiskProfile';
import { StrategyCompareWorkbench } from './components/StrategyCompareWorkbench';
import { Glossary } from './components/Glossary';
import { StockPicker } from './components/StockPicker';
import { CommandBar } from './components/CommandBar';
import { GlobalSearch } from './components/GlobalSearch';
import { FunctionHelp } from './components/FunctionHelp';
import { MarketTicker } from './components/MarketTicker';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { NewsFeed, NewsFeedToggle } from './components/NewsFeed';
import { WorkspaceManager } from './components/WorkspaceManager';
import { Workspace } from './components/WorkspaceManager';
import { Widget } from './components/WidgetLayout';
import { AlertSystem, AlertSystemToggle } from './components/AlertSystem';
import { ContextBar, TimeRange, ViewMode, Benchmark } from './components/ContextBar';
import { RiskPreference, RiskPreferences } from './components/RiskPreference';
import { Methodology } from './components/Methodology';
import { ShortcutsPanel } from './components/ShortcutsPanel';
import { ChartWorkbench } from './components/ChartWorkbench';
import { SafeComponentWrapper } from './components/SafeComponentWrapper';
import { Settings } from './components/Settings';
import { LayoutDashboard, FlaskConical, Search, PieChart, FileText, GitCompare, BarChart3, Settings as SettingsIcon } from 'lucide-react';

// 服务层集成
import { 
  getDataStreamManager, 
  getAlertService, 
  getCacheManager,
  getWorkspaceService,
  initializeServices,
  type MarketData, 
  type Alert 
} from './services';
import { moduleCommunication } from './services/CommunicationBus';
import { getEnvFlag } from './utils/env';

type View = 'dashboard' | 'strategy-lab' | 'backtest-detail' | 'portfolio' | 'reports' | 'risk-profile' | 'glossary' | 'stock-picker' | 'strategy-compare' | 'chart-view';

type ModalView = 'risk-preference' | 'methodology' | 'glossary' | 'shortcuts' | null;

type UserRole = 'investor' | 'trader' | 'fund-manager' | 'cfo';

const roleLabels: Record<UserRole, string> = {
  'investor': '个人投资者',
  'trader': '量化交易员',
  'fund-manager': '基金经理',
  'cfo': '企业CFO'
};

const REAL_DATA_ENABLED = getEnvFlag('VITE_ENABLE_REAL_DATA', 'REACT_APP_ENABLE_REAL_DATA', false);
const WEBSOCKET_ENABLED = getEnvFlag('VITE_ENABLE_WEBSOCKET', 'REACT_APP_ENABLE_WEBSOCKET', false);
const AKSHARE_ENABLED = getEnvFlag('VITE_ENABLE_AKSHARE', 'REACT_APP_ENABLE_AKSHARE', false);

export default function App() {
  // 应用状态管理
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedBacktestId, setSelectedBacktestId] = useState<string | null>(null);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string>('600519');
  const [showStockPicker, setShowStockPicker] = useState(false);
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [showNews, setShowNews] = useState(true);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showFunctionHelp, setShowFunctionHelp] = useState(false);
  const [helpFunction, setHelpFunction] = useState<string | undefined>(undefined);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(3);
  const [currentWidgets, setCurrentWidgets] = useState<Widget[]>([]);
  const [modalView, setModalView] = useState<ModalView>(null);
  const [userRole, setUserRole] = useState<UserRole>('investor');
  const [userRiskPreferences, setUserRiskPreferences] = useState<RiskPreferences>({
    targetReturn: 30,
    maxDrawdown: 10,
    riskLevel: 'balanced',
    investmentHorizon: '1y',
  });

  // 系统状态管理
  const [isServicesReady, setIsServicesReady] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [marketStatus, setMarketStatus] = useState<'open' | 'closed' | 'pre-market' | 'after-hours'>('open');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [realtimeData, setRealtimeData] = useState<Map<string, MarketData>>(new Map());

  // 应用初始化：服务启动和数据流连接
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 [App] Initializing Arthera Quant Lab...');
      setServicesError(null);
      
      try {
        // 初始化所有服务（包含所有模块）
        const result = await initializeServices({
          enableRealData: REAL_DATA_ENABLED,
          enableWebSocket: WEBSOCKET_ENABLED,
          enableAkShare: AKSHARE_ENABLED,
          modules: [
            'all',
            'price-alerts', // 确保价格提醒模块初始化
            'dashboard', 
            'portfolio', 
            'strategy-lab',
            'strategy-compare',
            'stock-picker',
            'command-interface',
            'reports'
          ]
        });
        
        if (result.success) {
          setIsServicesReady(true);
          console.log('✅ [App] All services initialized successfully');
          
          // 显示服务状态详情
          console.log('📊 [App] Service Status:', {
            core: {
              cache: result.initResults?.cache,
              dataStream: result.initResults?.dataStream,
              marketData: result.initResults?.marketData
            },
            modules: {
              dashboard: true,
              portfolio: result.initResults?.portfolio,
              strategyLab: result.initResults?.strategyExecution,
              strategyCompare: result.initResults?.strategyCompare,
              stockPicker: result.initResults?.stockPicker,
              reportCenter: result.initResults?.reportCenter
            },
            interfaces: {
              commandBar: result.initResults?.commandBar,
              keyboardShortcuts: result.initResults?.keyboardShortcuts,
              configManager: result.initResults?.configManager,
              moduleCommunication: result.initResults?.moduleCommunication
            },
            external: result.externalServices
          });
          
          // 初始化URL路由
          initializeUrlRouting();
          
          // 启动实时数据流
          setupRealtimeDataStream();
          
          // 初始化警报系统
          setupAlertSystem();
          
          // 初始化时间更新器
          setupTimeUpdater();
          
          // 初始化价格提醒系统统一设置
          initializePriceAlertSystem();
          
          // 初始化工作区服务
          initializeWorkspaceSystem();
          
        } else {
          throw new Error(result.error || 'Service initialization failed');
        }
      } catch (error) {
        console.error('❌ [App] Failed to initialize services:', error);
        setServicesError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initializeApp();
  }, []);

  // 实时数据流设置
  const setupRealtimeDataStream = () => {
    const dataStreamManager = getDataStreamManager();
    
    // 订阅关键股票数据
    const subscriptionId = dataStreamManager.subscribe(
      ['000001', '399001', '399006'], // 上证、深证、创业板指数
      (data: MarketData) => {
        setRealtimeData(prev => new Map(prev).set(data.symbol, data));
        
        // 更新市场状态
        const currentHour = new Date().getHours();
        if (currentHour >= 9 && currentHour < 15) {
          setMarketStatus('open');
        } else if (currentHour >= 15 && currentHour < 16) {
          setMarketStatus('after-hours');
        } else {
          setMarketStatus('closed');
        }
      }
    );
    
    console.log('📊 [App] Realtime data stream connected');
    
    // 返回清理函数
    return () => {
      dataStreamManager.unsubscribe(subscriptionId);
    };
  };

  // 警报系统设置
  const setupAlertSystem = () => {
    const alertService = getAlertService();
    
    // 订阅警报事件
    const unsubscribe = alertService.addEventListener('onAlertTriggered', (event) => {
      console.log('🔔 [App] Alert triggered:', event.alert.name);
      setUnreadAlerts(prev => prev + 1);
      
      // 可以在这里添加Toast通知或其他UI反馈
      if (event.alert.priority === 'high' || event.alert.priority === 'critical') {
        // 高优先级警报的特殊处理
      }
    });
    
    console.log('🚨 [App] Alert system connected');
    
    // 返回清理函数
    return unsubscribe;
  };

  // 时间更新器设置
  const setupTimeUpdater = () => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  };

  // 价格提醒系统统一初始化
  const initializePriceAlertSystem = async () => {
    try {
      const alertService = getAlertService();
      
      // 清理过期警报
      alertService.cleanupExpiredAlerts();
      
      // 获取统计信息
      const stats = alertService.getStatistics();
      console.log('📊 [App] Price Alert System Statistics:', stats);
      
      // 设置全局模块通信事件监听
      moduleCommunication.addEventListener('alert:triggered', (event: any) => {
        console.log('🔔 [App] Module Communication Alert Event:', event.detail);
      });
      
      // 如果有预设的示例警报，可以在这里创建
      const existingAlerts = alertService.getAllAlerts();
      if (existingAlerts.length === 0) {
        console.log('ℹ️ [App] No existing alerts, you can create some from any module');
      }
      
      console.log('✅ [App] Price Alert System unified initialization complete');
    } catch (error) {
      console.error('❌ [App] Failed to initialize price alert system:', error);
    }
  };

  // 工作区服务统一初始化
  const initializeWorkspaceSystem = async () => {
    try {
      const workspaceService = getWorkspaceService();
      
      // 连接所有核心模块
      const coreModules = ['dashboard', 'strategy-lab', 'strategy-compare', 'stock-picker', 'portfolio', 'reports'];
      
      for (const moduleId of coreModules) {
        await workspaceService.connectModule(moduleId, {
          autoConnect: true,
          watchlist: ['600519', '300750', '000858'],
          enableRealTime: true
        });
      }

      // 监听工作区事件
      workspaceService.on('workspace:loaded', (data) => {
        console.log('📋 [App] Workspace loaded:', data.workspace.name);
        
        // 可以在这里更新应用状态
        if (data.workspace.globalSettings?.defaultSymbols?.length > 0) {
          setSelectedStockSymbol(data.workspace.globalSettings.defaultSymbols[0]);
        }
      });

      workspaceService.on('module:connected', (data) => {
        console.log('🔗 [App] Module connected:', data.moduleId);
      });

      workspaceService.on('module:disconnected', (data) => {
        console.warn('⚠️ [App] Module disconnected:', data.moduleId);
      });

      console.log('✅ [App] Workspace System unified initialization complete');
    } catch (error) {
      console.error('❌ [App] Failed to initialize workspace system:', error);
    }
  };

  // URL路由初始化
  const initializeUrlRouting = () => {
    try {
      // 解析当前URL
      const hash = window.location.hash.slice(1); // 移除#
      if (!hash) return;

      const [path, queryString] = hash.split('?');
      const params = new URLSearchParams(queryString || '');
      
      console.log('🔗 [App] Initializing from URL:', { path, params: Object.fromEntries(params) });
      
      // 设置初始视图
      if (path && path !== currentView) {
        setCurrentView(path as View);
      }
      
      // 处理策略对比特殊参数
      if (path === 'strategy-compare') {
        const ids = params.get('ids')?.split(',').filter(Boolean) || [];
        const from = params.get('from') || '';
        const report = params.get('report') || '';
        const share = params.get('share') || '';
        
        setStrategyCompareParams({ ids, from, report, share });
        
        console.log('📊 [App] Strategy comparison initialized with:', {
          strategies: ids.length,
          source: from,
          hasReport: !!report,
          isShared: !!share
        });
      }
      
      // 处理回测详情参数
      if (path === 'backtest-detail') {
        const backtestId = params.get('id');
        if (backtestId) {
          setSelectedBacktestId(backtestId);
        }
      }
      
      // 处理股票选择参数
      const symbol = params.get('symbol');
      if (symbol) {
        setSelectedStockSymbol(symbol);
      }
      
      setUrlParams(params);
    } catch (error) {
      console.error('[App] Failed to initialize URL routing:', error);
    }
  };

  // 监听浏览器前进后退
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        const { view } = event.state;
        if (view) {
          handleViewChange(view as View);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 加载用户偏好
  useEffect(() => {
    const loadUserPreferences = async () => {
      const cacheManager = getCacheManager();
      
      // 从localStorage加载风险偏好
      const saved = localStorage.getItem('arthera-risk-preferences');
      if (saved) {
        setUserRiskPreferences(JSON.parse(saved));
      }
      
      // 从缓存加载其他用户设置
      const userSettings = await cacheManager.get('user-settings', 'profile');
      if (userSettings) {
        const { role, selectedSymbol, currentView: savedView } = userSettings;
        if (role) setUserRole(role);
        if (selectedSymbol) setSelectedStockSymbol(selectedSymbol);
        if (savedView) setCurrentView(savedView);
      }
    };
    
    if (isServicesReady) {
      loadUserPreferences();
    }
  }, [isServicesReady]);

  // 监听设置更新
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      const settings = event.detail;
      console.log('设置已更新:', settings);
      
      // 这里可以根据设置更新应用状态
      // 比如重新初始化相关服务、更新主题等
      
      // 触发服务重新配置
      if (settings.tushareToken || settings.deepSeekApiKey) {
        console.log('检测到API配置更新，正在重新配置服务...');
        
        // 动态更新Tushare服务配置
        if (settings.tushareToken) {
          const { tushareDataService } = require('./services/TushareDataService');
          tushareDataService.updateConfig({ token: settings.tushareToken });
        }
        
        // 动态更新DeepSeek服务配置
        if (settings.deepSeekApiKey) {
          const { deepSeekSignalService } = require('./services/DeepSeekSignalService');
          deepSeekSignalService.updateConfig({
            apiKey: settings.deepSeekApiKey,
            model: settings.deepSeekModel || 'deepseek-chat',
            baseUrl: settings.deepSeekBaseUrl || 'https://api.deepseek.com/v1'
          });
        }
        
        console.log('✅ 服务配置已更新，新配置立即生效');
      }
    };

    window.addEventListener('settings-updated', handleSettingsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate as EventListener);
    };
  }, []);

  // 保存用户设置到缓存
  const saveUserSettings = async () => {
    if (!isServicesReady) return;
    
    try {
      const cacheManager = getCacheManager();
      const userSettings = {
        role: userRole,
        selectedSymbol: selectedStockSymbol,
        currentView,
        lastUpdated: Date.now()
      };
      
      await cacheManager.set('user-settings', 'profile', userSettings);
    } catch (error) {
      console.error('Failed to save user settings:', error);
    }
  };

  // 监听用户设置变化并自动保存
  useEffect(() => {
    const timeoutId = setTimeout(saveUserSettings, 1000); // 防抖保存
    return () => clearTimeout(timeoutId);
  }, [userRole, selectedStockSymbol, currentView, isServicesReady]);

  const handleApplyRiskPreferences = (preferences: RiskPreferences) => {
    setUserRiskPreferences(preferences);
    localStorage.setItem('arthera-risk-preferences', JSON.stringify(preferences));
    
    // 通知相关组件风险偏好已更新
    window.dispatchEvent(new CustomEvent('risk-preferences-updated', { 
      detail: preferences 
    }));
  };

  // 智能视图切换处理
  const handleViewChange = (view: View) => {
    console.log(`🔄 [App] Switching view: ${currentView} → ${view}`);
    setCurrentView(view);
    
    // 清理模态框和面板状态
    setModalView(null);
    setShowStockPicker(false);
    setShowGlobalSearch(false);
    setShowCommandBar(false);
    
    // 记录用户行为分析
    if (isServicesReady) {
      const cacheManager = getCacheManager();
      cacheManager.set(`user-analytics-${Date.now()}`, {
        action: 'view-change',
        from: currentView,
        to: view,
        timestamp: Date.now(),
        userRole
      });
    }
  };

  const handleOpenModal = (modal: 'risk-preference' | 'methodology' | 'glossary') => {
    setModalView(modal);
  };

  const handleCloseModal = () => {
    setModalView(null);
  };

  const handleViewBacktest = (backtestId: string) => {
    setSelectedBacktestId(backtestId);
    setCurrentView('backtest-detail');
  };

  const handleViewComparison = () => {
    setCurrentView('strategy-compare');
  };

  const handleViewStockChart = (symbol: string) => {
    setSelectedStockSymbol(symbol);
    setCurrentView('chart-view');
  };

  // URL参数状态
  const [urlParams, setUrlParams] = useState<URLSearchParams>(new URLSearchParams());
  const [strategyCompareParams, setStrategyCompareParams] = useState({
    ids: [] as string[],
    from: '',
    report: '',
    share: ''
  });

  const handleNavigate = (path: string) => {
    // 解析路径和参数
    const [view, queryString] = path.split('?');
    const params = new URLSearchParams(queryString || '');
    setUrlParams(params);

    // 特殊处理策略对比页面
    if (view === 'strategy-compare') {
      const ids = params.get('ids')?.split(',').filter(Boolean) || [];
      const from = params.get('from') || '';
      const report = params.get('report') || '';
      const share = params.get('share') || '';
      
      setStrategyCompareParams({ ids, from, report, share });
      
      console.log('🔄 [App] Navigate to strategy-compare with params:', {
        ids, from, report, share
      });
    }

    handleViewChange(view as View);
    
    // 更新浏览器URL (不刷新页面)
    const newUrl = `${window.location.pathname}#${path}`;
    window.history.pushState({ view, params: queryString }, '', newUrl);
  };


  const handleLoadWorkspace = (workspace: Workspace) => {
    setCurrentWidgets(workspace.widgets || []);
    console.log('Loaded workspace:', workspace.name);
  };

  const handleSaveWorkspace = (name: string, description: string) => {
    console.log('Saved workspace:', name, description);
  };

  // Bloomberg-style keyboard shortcuts (enhanced with service integration)
  const shortcuts = [
    // Navigation
    { key: 'd', ctrl: true, action: () => handleViewChange('dashboard'), description: '打开 Dashboard' },
    { key: 'l', ctrl: true, action: () => handleViewChange('strategy-lab'), description: '打开策略实验室' },
    { key: 'p', ctrl: true, action: () => handleViewChange('portfolio'), description: '打开组合体检' },
    { key: 'r', ctrl: true, action: () => handleViewChange('reports'), description: '打开报告中心' },
    { key: 's', ctrl: true, action: () => setShowStockPicker(true), description: '打开股票选择器' },
    { key: 'f', ctrl: true, action: () => setShowGlobalSearch(true), description: '全局搜索' },
    
    // Tools
    { key: 'a', ctrl: true, shift: true, action: () => setShowAICopilot(!showAICopilot), description: '切换 AI Copilot' },
    { key: 'n', ctrl: true, action: () => setShowNews(!showNews), description: '切换新闻流' },
    { key: 'b', ctrl: true, action: () => setShowAlerts(!showAlerts), description: '切换预警系统' },
    
    // Modals
    { key: 'r', ctrl: true, shift: true, action: () => setModalView('risk-preference'), description: '打开风险偏好设置' },
    { key: 'm', ctrl: true, shift: true, action: () => setModalView('methodology'), description: '打开方法论说明' },
    { key: 'g', ctrl: true, shift: true, action: () => setModalView('glossary'), description: '打开术语解释' },
    { key: 'k', ctrl: true, shift: true, action: () => setModalView('shortcuts'), description: '打开快捷键面板' },
    
    // System
    { key: 'Escape', action: () => {
      setModalView(null);
      setShowStockPicker(false);
      setShowAICopilot(false);
      setShowCommandBar(false);
      setShowGlobalSearch(false);
    }, description: '关闭当前面板' },
  ];

  return (
    <div className="min-h-screen bg-[#0a1628] text-gray-100">
      {/* Keyboard Shortcuts Handler */}
      <KeyboardShortcuts shortcuts={shortcuts} />

      {/* Market Ticker with real-time data */}
      <MarketTicker 
        marketData={realtimeData}
        marketStatus={marketStatus}
        isServicesReady={isServicesReady}
      />

      {/* Three-Layer Navigation System */}
      <div className="sticky top-0 z-40">
        {/* Layer 1: System Bar - Brand, Status, User */}
        <div className="h-12 bg-[#0d1b2e] border-b border-[#1e3a5f]/30 px-6 flex items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300 font-medium">Arthera Quant</span>
          </div>

          {/* Right: Status & User */}
          <div className="flex items-center gap-3">
            {/* System Status */}
            {!isServicesReady ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f59e0b]/10 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse"></span>
                <span className="text-xs text-[#f59e0b] font-medium uppercase">Starting</span>
                <span className="text-xs text-gray-500">初始化中</span>
              </div>
            ) : servicesError ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#ef4444]/10 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span>
                <span className="text-xs text-[#ef4444] font-medium uppercase">Error</span>
                <span className="text-xs text-gray-500" title={servicesError}>服务异常</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#10b981]/10 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                <span className="text-xs text-[#10b981] font-medium uppercase">
                  {marketStatus === 'open' ? 'Live' : marketStatus === 'closed' ? 'Closed' : 'Pre'}
                </span>
                <span className="text-xs text-gray-500">
                  {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* Alert System */}
            <AlertSystemToggle 
              onClick={() => {
                setShowAlerts(!showAlerts);
                setUnreadAlerts(0);
              }}
              unreadCount={unreadAlerts}
            />

            {/* News Feed Toggle */}
            <NewsFeedToggle onClick={() => setShowNews(!showNews)} />

            {/* Role Selector */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="h-8 px-3 flex items-center gap-2 text-xs bg-[#1e3a5f]/30 hover:bg-[#1e3a5f]/50 rounded transition-colors"
              >
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#0ea5e9]/20 to-[#0284c7]/20 flex items-center justify-center border border-[#0ea5e9]/30">

                </div>
                <span className="text-gray-300">{roleLabels[userRole]}</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showRoleMenu && (
                <div className="absolute top-full right-0 mt-2 w-36 bg-[#0a1628] border border-[#1e3a5f] rounded-lg shadow-2xl overflow-hidden z-50">
                  {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        setUserRole(role);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                        userRole === role
                          ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] border-l-2 border-[#0ea5e9]'
                          : 'text-gray-400 hover:bg-[#1e3a5f]/40 hover:text-gray-200'
                      }`}
                    >
                      {roleLabels[role]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Layer 2: Main Navigation + Tools */}
        <div className="h-12 bg-[#0a1628] border-b border-[#1e3a5f]/40 px-6 flex items-center justify-between">
          {/* Left: Main Navigation Tabs */}
          <nav className="flex items-center gap-1">
            {[
              { id: 'dashboard', label: '总览', icon: LayoutDashboard },
              { id: 'strategy-lab', label: '策略实验室', icon: FlaskConical },
              { id: 'strategy-compare', label: '策略对比', icon: GitCompare },
              { id: 'stock-picker', label: '选股器', icon: Search },
              { id: 'portfolio', label: '组合体检', icon: PieChart },
              { id: 'reports', label: '报告中心', icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id as View)}
                  className={`h-9 px-4 flex items-center gap-2 text-sm transition-all relative ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0ea5e9]"></div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Tools */}
          <div className="flex items-center gap-3">
            {/* Global Search Button */}
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#1a2942]/50 border border-[#2a3f5f] rounded text-xs text-gray-400 hover:text-gray-200 hover:border-[#0ea5e9]/50 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
              <kbd className="px-1.5 py-0.5 bg-[#0a1628] border border-[#1a2942] rounded text-[10px] text-gray-500">
                Ctrl+F
              </kbd>
            </button>

            {/* Command Bar */}
            <CommandBar 
              onNavigate={handleNavigate}
              onOpenHelp={(functionCode) => {
                setHelpFunction(functionCode);
                setShowFunctionHelp(true);
              }}
            />

            {/* Workspace Manager */}
            <WorkspaceManager
              currentWidgets={currentWidgets}
              onLoadWorkspace={handleLoadWorkspace}
              onSaveWorkspace={handleSaveWorkspace}
            />

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#1a2942]/50 border border-[#2a3f5f] rounded text-xs text-gray-400 hover:text-gray-200 hover:border-[#0ea5e9]/50 transition-colors"
              title="系统设置"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>设置</span>
            </button>
          </div>
        </div>

        {/* Layer 3: Context Bar - View State & Filters */}
        {currentView !== 'strategy-compare' && (
          <ContextBar
            onViewModeChange={(mode) => console.log('View mode changed:', mode)}
            onDateRangeChange={(range) => console.log('Date range changed:', range)}
            onStrategyChange={(strategy) => console.log('Strategy changed:', strategy)}
            onBenchmarkChange={(benchmark) => console.log('Benchmark changed:', benchmark)}
            onTimeRangeSelect={(range) => console.log('Time range selected:', range)}
          />
        )}
      </div>

      {/* Main Content */}
      {currentView === 'strategy-compare' ? (
        <div style={{padding: '20px'}}>
          <SafeComponentWrapper fallback={
            <div style={{minHeight: '400px', padding: '20px', border: '1px solid #2a4f7f', borderRadius: '8px'}}>
              <h2 style={{color: 'white', marginBottom: '20px'}}>策略对比</h2>
              <div style={{padding: '20px', color: '#64748b'}}>
                <p>策略对比组件加载失败</p>
                <p>请检查浏览器控制台获取详细错误信息</p>
              </div>
            </div>
          }>
            <StrategyCompareWorkbench 
              initialStrategies={strategyCompareParams.ids}
              onNavigate={handleNavigate}
            />
          </SafeComponentWrapper>
        </div>
      ) : currentView === 'chart-view' ? (
        <div className="h-[calc(100vh-180px)]">
          <SafeComponentWrapper fallback={
            <div style={{
              minHeight: '400px', 
              padding: '40px', 
              border: '2px solid #ef4444', 
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              textAlign: 'center'
            }}>
              <h2 style={{color: '#ef4444', marginBottom: '20px', fontSize: '24px'}}>图表工作台加载失败</h2>
              <div style={{padding: '20px', color: '#64748b'}}>
                <p style={{marginBottom: '10px'}}>图表工作台组件遇到错误无法加载</p>
                <p style={{marginBottom: '20px'}}>请检查浏览器控制台获取详细错误信息</p>
                <button 
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#0ea5e9',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  刷新页面
                </button>
              </div>
            </div>
          }>
            <ChartWorkbench initialSymbol={selectedStockSymbol} />
          </SafeComponentWrapper>
        </div>
      ) : (
        <main className="p-6 h-[calc(100vh-180px)] overflow-auto">
          {currentView === 'dashboard' && <Dashboard onViewBacktest={handleViewBacktest} onViewComparison={handleViewComparison} onOpenModal={handleOpenModal} onViewStockChart={handleViewStockChart} userRole={roleLabels[userRole]} />}
          {currentView === 'strategy-lab' && (
            <SafeComponentWrapper fallback={
              <div style={{minHeight: '400px', padding: '20px', border: '1px solid #2a4f7f', borderRadius: '8px'}}>
                <h2 style={{color: 'white', marginBottom: '20px'}}>策略实验室</h2>
                <div style={{padding: '20px', color: '#64748b'}}>
                  <p>策略实验室组件加载失败</p>
                  <p>请检查浏览器控制台获取详细错误信息</p>
                </div>
              </div>
            }>
              <StrategyLab onNavigate={handleNavigate} />
            </SafeComponentWrapper>
          )}
          {currentView === 'backtest-detail' && selectedBacktestId && (
            <BacktestDetail backtestId={selectedBacktestId} />
          )}
          {currentView === 'stock-picker' && (
            <SafeComponentWrapper fallback={
              <div style={{minHeight: '400px', padding: '20px', border: '1px solid #2a4f7f', borderRadius: '8px'}}>
                <h2 style={{color: 'white', marginBottom: '20px'}}>选股器</h2>
                <div style={{padding: '20px', color: '#64748b'}}>
                  <p>选股器组件加载失败</p>
                  <p>请检查浏览器控制台获取详细错误信息</p>
                </div>
              </div>
            }>
              <StockPicker onViewChart={handleViewStockChart} />
            </SafeComponentWrapper>
          )}
          {currentView === 'portfolio' && (
            <SafeComponentWrapper fallback={
              <div style={{minHeight: '400px', padding: '20px', border: '1px solid #2a4f7f', borderRadius: '8px'}}>
                <h2 style={{color: 'white', marginBottom: '20px'}}>组合管理</h2>
                <div style={{padding: '20px', color: '#64748b'}}>
                  <p>组合管理组件加载失败</p>
                  <p>请检查浏览器控制台获取详细错误信息</p>
                </div>
              </div>
            }>
              <Portfolio />
            </SafeComponentWrapper>
          )}
          {currentView === 'reports' && (
            <div style={{minHeight: '400px', padding: '20px', border: '1px solid #2a4f7f', borderRadius: '8px'}}>
              <h2 style={{color: 'white', marginBottom: '20px'}}>报告中心</h2>
              <p style={{color: '#64748b'}}>报告中心功能开发中...</p>
              <Reports />
            </div>
          )}
          {currentView === 'risk-profile' && <RiskProfile />}
          {currentView === 'glossary' && <Glossary />}
        </main>
      )}

      {/* AI Copilot Button */}
      <button
        onClick={() => setShowAICopilot(!showAICopilot)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* AI Copilot Drawer */}
      {showAICopilot && (
        <AICopilot 
          onClose={() => setShowAICopilot(false)}
          context={{ view: currentView, backtestId: selectedBacktestId }}
        />
      )}

      {/* News Feed */}
      <NewsFeed isOpen={showNews} onClose={() => setShowNews(false)} />

      {/* Alert System */}
      {showAlerts && (
        <AlertSystem 
          isOpen={showAlerts}
          onClose={() => setShowAlerts(false)}
        />
      )}

      {/* Global Search */}
      <GlobalSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onNavigate={(view, id) => {
          if (id) {
            if (view === 'backtest-detail') {
              handleViewBacktest(id);
            } else {
              setCurrentView(view as View);
            }
          } else {
            setCurrentView(view as View);
          }
        }}
      />

      {/* Function Help */}
      <FunctionHelp
        isOpen={showFunctionHelp}
        onClose={() => setShowFunctionHelp(false)}
        initialFunction={helpFunction}
      />

      {/* Modal Views */}
      {modalView === 'risk-preference' && (
        <RiskPreference 
          onClose={handleCloseModal}
          onApply={handleApplyRiskPreferences}
        />
      )}
      
      {modalView === 'methodology' && (
        <Methodology onClose={handleCloseModal} />
      )}
      
      {modalView === 'glossary' && (
        <Glossary onClose={handleCloseModal} />
      )}
      
      {modalView === 'shortcuts' && (
        <ShortcutsPanel onClose={handleCloseModal} shortcuts={shortcuts} />
      )}

      {/* Settings Modal */}
      <Settings
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      {/* Risk Preferences Indicator */}
      {userRiskPreferences && (
        <div className="fixed bottom-6 left-6 z-40">
          <div className="bg-[#0d1b2e] border border-[#1e3a5f] rounded-lg px-4 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500">当前风险偏好</div>
              <div className={`px-2 py-1 rounded text-xs ${
                userRiskPreferences.riskLevel === 'conservative' ? 'bg-[#10b981]/10 text-[#10b981]' :
                userRiskPreferences.riskLevel === 'balanced' ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]' :
                'bg-[#f97316]/10 text-[#f97316]'
              }`}>
                {userRiskPreferences.riskLevel === 'conservative' ? '保守型' :
                 userRiskPreferences.riskLevel === 'balanced' ? '平衡型' : '进取型'}
              </div>
              <div className="text-xs text-gray-400">
                目标 {userRiskPreferences.targetReturn}% | 回撤 -{userRiskPreferences.maxDrawdown}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
