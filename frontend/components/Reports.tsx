import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Eye, Calendar, Tag, Share2, Settings, Clock, FileType, Database, Activity, Brain, Cpu, Zap, TrendingUp } from 'lucide-react';
import { 
  getReportExportService, 
  getCacheManager,
  getAlertService,
  getWorkspaceService,
  getStrategyExecutionService,
  getPortfolioManagementService,
  initializeServices,
  quantEngineService,
  qlibIntegrationService,
  moduleCommunication,
  useModuleCommunication,
  configManager,
  type ReportConfig, 
  type ExportFormat, 
  type ExportOptions,
  type ReportTemplate,
  type ScheduledReport,
  type QlibModel,
  type Alpha158Factor,
  type BacktestResult,
  type RiskAssessment,
  type Alert,
  type AlertTriggerEvent,
  type ModuleConnection
} from '../services';
import { buildApiUrl } from '../utils/env';

const reports = [
  {
    id: 'rpt-001',
    name: 'High Vol Alpha Q4 回测报告',
    type: '回测报告',
    createTime: '2024-12-09 14:35',
    backtest: 'bt-001',
    size: '2.3 MB',
    pages: 18,
  },
  {
    id: 'rpt-002',
    name: 'Multi-Factor Balanced 综合分析',
    type: '综合报告',
    createTime: '2024-12-08 16:22',
    backtest: 'bt-002',
    size: '3.1 MB',
    pages: 24,
  },
  {
    id: 'rpt-003',
    name: 'Momentum + Quality 技术报告',
    type: '技术报告',
    createTime: '2024-12-07 10:15',
    backtest: 'bt-003',
    size: '1.8 MB',
    pages: 12,
  },
  {
    id: 'rpt-004',
    name: 'Low Volatility Defense 策略解析',
    type: '回测报告',
    createTime: '2024-12-06 09:48',
    backtest: 'bt-004',
    size: '2.5 MB',
    pages: 16,
  },
  {
    id: 'rpt-005',
    name: '2024 Q3 组合体检报告',
    type: '组合报告',
    createTime: '2024-09-30 17:00',
    backtest: null,
    size: '4.2 MB',
    pages: 32,
  },
  {
    id: 'rpt-006',
    name: '因子暴露分析 - 新能源板块',
    type: '技术报告',
    createTime: '2024-11-25 11:30',
    backtest: 'bt-001',
    size: '1.5 MB',
    pages: 10,
  },
];

export function Reports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  // 管理令牌（需要在状态使用前定义）
  const [reportsAdminToken, setReportsAdminToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('arthera_admin_token') || '';
  });
  const [backendReports, setBackendReports] = useState<any[]>([]);
  const [backendLoading, setBackendLoading] = useState(false);
  const [reportApiError, setReportApiError] = useState<string | null>(null);

  // 服务集成
  const reportService = getReportExportService();
  const cacheService = getCacheManager();
  
  // 模块间通信集成
  const {
    state: communicationState,
    updateNavigationState,
    shareComparisonReport
  } = useModuleCommunication();

  // 状态管理
  const [exportingReport, setExportingReport] = useState<string | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<ReportTemplate[]>([]);

  // 价格提醒服务集成
  const [reportAlerts, setReportAlerts] = useState<Alert[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertTriggerEvent[]>([]);

  const loadBackendReports = useCallback(async () => {
    if (!reportsAdminToken) return;
    setBackendLoading(true);
    setReportApiError(null);
    try {
      const response = await fetch(buildApiUrl('/api/v1/reports/history'), {
        headers: {
          'X-Admin-Token': reportsAdminToken
        },
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      const data = await response.json();
      const mapped = (data.reports || []).map((item: any) => ({
        id: item.id,
        name: item.name || `自动报告 ${item.id.slice(0, 6)}`,
        type: '综合报告',
        createTime: new Date(item.generated_at).toLocaleString(),
        size: 'JSON',
        pages: 0,
        backend: true,
        backendRecord: item,
        symbols: item.symbols || ['600519']
      }));
      setBackendReports(mapped);
    } catch (error) {
      console.error('[Reports] Failed to load backend reports:', error);
      setReportApiError('无法连接报告服务或令牌错误');
    } finally {
      setBackendLoading(false);
    }
  }, [reportsAdminToken]);

  // 初始化价格提醒服务连接
  useEffect(() => {
    const alertService = getAlertService();
    
    // 监听警报触发事件
    const unsubscribe = alertService.addEventListener('onAlertTriggered', (event: AlertTriggerEvent) => {
      setRecentAlerts(prev => [event, ...prev.slice(0, 4)]);
      
      // 如果是重要警报，自动生成相关报告
      if (event.alert.priority === 'critical' || event.alert.priority === 'high') {
        // 创建警报事件报告
        generateAlertReport(event);
      }
      
      // 通知模块通信系统
      moduleCommunication.emit('alert:report-generated', {
        symbol: event.alert.symbol,
        alertName: event.alert.name,
        module: 'reports'
      });
    });

    // 获取所有警报用于报告生成
    const allAlerts = alertService.getAllAlerts();
    setReportAlerts(allAlerts);

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (reportsAdminToken) {
      sessionStorage.setItem('arthera_admin_token', reportsAdminToken);
      void loadBackendReports();
    }
  }, [reportsAdminToken, loadBackendReports]);

  // 根据警报生成相关报告
  const generateAlertReport = async (alertEvent: AlertTriggerEvent) => {
    try {
      const reportConfig: ReportConfig = {
        templateId: 'alert-analysis',
        title: `${alertEvent.alert.symbol} 警报分析报告`,
        sections: [
          'alert-summary',
          'market-impact',
          'risk-assessment',
          'recommendations'
        ],
        data: {
          alertEvent,
          marketData: alertEvent.marketData,
          triggeredAt: alertEvent.timestamp
        },
        format: 'pdf' as ExportFormat,
        options: {
          includeCharts: true,
          includeRawData: false,
          watermark: 'Arthera Quant Lab'
        }
      };

      console.log(`正在生成警报报告: ${reportConfig.title}`);
      // 这里可以调用实际的报告生成逻辑
    } catch (error) {
      console.error('生成警报报告失败:', error);
    }
  };
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [exportProgress, setExportProgress] = useState(0);
  const [dynamicReports, setDynamicReports] = useState<any[]>([]);
  const [reportConfig, setReportConfig] = useState<any>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // 外部服务状态
  const [serviceStatus, setServiceStatus] = useState({
    initialized: false,
    quantEngine: false,
    qlib: false,
    akshare: false
  });
  const [availableModels, setAvailableModels] = useState<QlibModel[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<Map<string, RiskAssessment>>(new Map());
  const [alpha158Factors, setAlpha158Factors] = useState<Map<string, Alpha158Factor[]>>(new Map());

  // 工作区服务集成状态
  const [workspaceService] = useState(() => getWorkspaceService());
  const [workspaceConnected, setWorkspaceConnected] = useState(false);
  const [realTimeReports, setRealTimeReports] = useState<any[]>([]);
  const [reportGenerationQueue, setReportGenerationQueue] = useState<any[]>([]);

  // 配置管理 - 加载报告中心配置
  useEffect(() => {
    const loadReportConfig = async () => {
      try {
        const savedConfig = await configManager.loadConfig('report_center_settings', {
          autoGenerate: true,
          defaultFormat: 'pdf',
          enableScheduledReports: true,
          reportLayout: 'professional',
          includeCharts: true,
          includeData: true,
          enableSharing: true
        });
        
        setReportConfig(savedConfig);
        setConfigLoaded(true);
        
        console.log('📁 Reports configuration loaded:', savedConfig);
      } catch (error) {
        console.error('Failed to load reports configuration:', error);
        setConfigLoaded(true);
      }
    };

    loadReportConfig();
  }, []);

  // 模块间通信监听 - 监听来自其他模块的报告请求
  useEffect(() => {
    // 监听策略完成事件，自动生成回测报告
    const handleStrategyCompleted = (event: CustomEvent) => {
      const { strategy } = event.detail;
      console.log('📊 Reports received strategy completion:', strategy);
      
      if (strategy && reportConfig?.autoGenerate) {
        generateAutomaticReport('backtest', {
          strategyId: strategy.id,
          strategyName: strategy.name,
          source: 'strategy_lab',
          timestamp: Date.now()
        });
      }
    };

    // 监听策略对比报告共享
    const handleComparisonReportShared = (event: CustomEvent) => {
      const { report } = event.detail;
      console.log('📈 Reports received comparison report:', report);
      
      // 添加到动态报告列表
      const newReport = {
        id: `comparison_${Date.now()}`,
        name: `策略对比报告 - ${new Date().toLocaleDateString()}`,
        type: '对比报告',
        createTime: new Date().toLocaleString(),
        source: 'strategy_compare',
        size: '2.1 MB',
        pages: report.pages || 15,
        data: report
      };
      
      setDynamicReports(prev => [newReport, ...prev]);
    };

    // 监听组合体检请求
    const handlePortfolioReportRequest = (event: CustomEvent) => {
      const { portfolio } = event.detail;
      console.log('📊 Reports received portfolio report request:', portfolio);
      
      if (portfolio) {
        generateAutomaticReport('portfolio', {
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          source: 'portfolio',
          timestamp: Date.now()
        });
      }
    };

    // 监听导航状态更新
    const handleNavigationUpdate = (event: CustomEvent) => {
      const { navigationState } = event.detail;
      if (navigationState.currentModule === 'reports') {
        updateNavigationState('reports', {
          totalReports: reports.length + dynamicReports.length,
          lastAccess: Date.now()
        });
      }
    };

    moduleCommunication.addEventListener('strategy:completed', handleStrategyCompleted);
    moduleCommunication.addEventListener('comparison:report-shared', handleComparisonReportShared);
    moduleCommunication.addEventListener('portfolio:report-requested', handlePortfolioReportRequest);
    moduleCommunication.addEventListener('navigation:state-updated', handleNavigationUpdate);

    return () => {
      moduleCommunication.removeEventListener('strategy:completed', handleStrategyCompleted);
      moduleCommunication.removeEventListener('comparison:report-shared', handleComparisonReportShared);
      moduleCommunication.removeEventListener('portfolio:report-requested', handlePortfolioReportRequest);
      moduleCommunication.removeEventListener('navigation:state-updated', handleNavigationUpdate);
    };
  }, [reportConfig, dynamicReports, updateNavigationState]);

  // 工作区服务连接和报告数据同步
  useEffect(() => {
    // 定义事件监听器在外层作用域
    let workspaceListener: any;
    let reportsListener: any;
    
    const connectToWorkspace = async () => {
      try {
        // 监听工作区事件
        const handleWorkspaceReportData = (data: any) => {
          console.log('[Reports] Received workspace report data:', data);
          
          // 更新报告模板和自动导出设置
          if (data.templates && data.templates.length > 0) {
            setAvailableTemplates(data.templates);
          }
          
          if (data.autoExport) {
            setReportConfig(prev => ({
              ...prev,
              autoExport: data.autoExport
            }));
          }
          
          setWorkspaceConnected(true);
        };

        // 监听模块通信事件
        workspaceListener = (event: any) => handleWorkspaceReportData(event.detail);
        reportsListener = (event: any) => {
          const data = event.detail;
          // 处理报告生成事件
          if (data.event && data.event.report) {
            const newReport = {
              id: data.event.report.id || `auto_${Date.now()}`,
              name: data.event.report.title || 'Auto-Generated Report',
              type: data.event.report.type || '自动报告',
              createTime: new Date().toLocaleString(),
              backtest: data.event.report.backtestId,
              size: data.event.report.size || '1.5 MB',
              pages: data.event.report.pages || 10,
              source: 'workspace',
              data: data.event.report
            };
            
            setRealTimeReports(prev => [newReport, ...prev]);
            
            // 添加到报告生成队列
            setReportGenerationQueue(prev => [...prev, newReport]);
          }
        };

        // 添加事件监听器
        moduleCommunication.addEventListener('workspace:reports:connected', workspaceListener);
        moduleCommunication.addEventListener('data:reports:generated', reportsListener);

        // 获取实时报告数据
        const cacheManager = getCacheManager();
        const reportService = getReportExportService();
        
        // 尝试从缓存获取，如果失败则获取实时数据
        let recentReports = await cacheManager.get('reports', 'recent');
        if (!recentReports) {
          try {
            recentReports = await reportService.getGeneratedReports({ limit: 20 });
            await cacheManager.set('reports', 'recent', recentReports, 300); // 缓存5分钟
          } catch (error) {
            console.log('Using default reports data');
            recentReports = reports;
          }
        }
        
        if (recentReports && recentReports.length > 0) {
          // 合并报告时避免重复ID
          const existingIds = new Set(reports.map(r => r.id));
          const uniqueRecentReports = recentReports.filter(r => !existingIds.has(r.id));
          setRealTimeReports([...uniqueRecentReports, ...reports]);
        }

        // 获取可用的报告模板
        try {
          const templates = await reportService.getAvailableTemplates();
          if (templates && templates.length > 0) {
            setAvailableTemplates(templates);
          }
        } catch (error) {
          console.log('Using default templates');
        }

        // 获取调度的报告任务
        try {
          const scheduled = await reportService.getScheduledReports();
          if (scheduled && scheduled.length > 0) {
            setScheduledReports(scheduled);
          }
        } catch (error) {
          console.log('No scheduled reports found');
        }

        console.log('✅ Reports connected to workspace services with real data');
        
      } catch (error) {
        console.error('❌ Reports workspace connection failed:', error);
      }
    };

    connectToWorkspace();
    
    // 设置定时刷新报告列表
    const refreshInterval = setInterval(() => {
      if (workspaceConnected) {
        connectToWorkspace();
      }
    }, 60000); // 每60秒刷新一次报告列表

    return () => {
      moduleCommunication.removeEventListener('workspace:reports:connected', workspaceListener);
      moduleCommunication.removeEventListener('data:reports:generated', reportsListener);
      clearInterval(refreshInterval);
    };
  }, [workspaceConnected]);

  // 配置自动保存
  useEffect(() => {
    if (configLoaded && reportConfig) {
      const saveConfig = async () => {
        try {
          const updatedConfig = {
            ...reportConfig,
            lastUpdated: Date.now()
          };
          
          await configManager.saveConfig('report_center_settings', updatedConfig);
          setReportConfig(updatedConfig);
        } catch (error) {
          console.error('Failed to save reports configuration:', error);
        }
      };

      const timeoutId = setTimeout(saveConfig, 1000); // 防抖保存
      return () => clearTimeout(timeoutId);
    }
  }, [configLoaded, reportConfig]);

  // 初始化服务数据
  useEffect(() => {
    initializeExternalServices();
    loadServiceData();
  }, []);

  const initializeExternalServices = async () => {
    try {
      // 初始化统一服务架构
      const initialized = await initializeServices();
      
      setServiceStatus({
        initialized: true,
        quantEngine: initialized.quantEngine,
        qlib: initialized.qlib, 
        akshare: initialized.akshare
      });

      // 加载可用的 Qlib 模型
      if (initialized.qlib) {
        try {
          const models = await qlibIntegrationService.getTrainedModels();
          setAvailableModels(models);
          console.log('[Reports] Loaded Qlib models:', models.length);
        } catch (error) {
          console.warn('[Reports] Failed to load Qlib models:', error);
        }
      }

      console.log('[Reports] External services initialized:', initialized);
    } catch (error) {
      console.error('[Reports] Failed to initialize external services:', error);
      setServiceStatus({
        initialized: false,
        quantEngine: false,
        qlib: false,
        akshare: false
      });
    }
  };

  const loadServiceData = async () => {
    try {
      // 加载可用模板
      const templates = reportService.getAvailableTemplates();
      setAvailableTemplates(templates);
      
      // 加载调度报告
      const scheduled = reportService.getScheduledReports();
      setScheduledReports(scheduled);
      
      console.log('[Reports] Service data loaded successfully');
    } catch (error) {
      console.error('[Reports] Failed to load service data:', error);
    }
  };

  const handlePreview = (reportId: string) => {
    setSelectedReport(reportId);
    setPreviewOpen(true);
  };

  // 自动生成报告功能
  const generateAutomaticReport = async (type: string, data: any) => {
    try {
      console.log(`📊 Generating automatic ${type} report:`, data);
      
      const reportName = `${getReportTypeName(type)} - ${data.strategyName || data.portfolioName || '未命名'}`;
      const newReport = {
        id: `auto_${type}_${Date.now()}`,
        name: reportName,
        type: getReportTypeName(type),
        createTime: new Date().toLocaleString(),
        source: data.source,
        size: '1.8 MB',
        pages: type === 'portfolio' ? 20 : 15,
        backtest: data.strategyId || data.portfolioId,
        auto: true,
        data: data
      };

      setDynamicReports(prev => [newReport, ...prev]);
      
      // 如果启用自动导出，立即生成PDF
      if (reportConfig?.autoGenerate) {
        setTimeout(() => {
          handleDownload(newReport.id, 'pdf');
        }, 1000);
      }

      console.log(`✅ Auto-generated ${type} report: ${reportName}`);
    } catch (error) {
      console.error(`Failed to generate automatic ${type} report:`, error);
    }
  };

  const getReportTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'backtest': '回测报告',
      'portfolio': '组合报告', 
      'comparison': '对比报告',
      'risk': '风险报告',
      'performance': '业绩报告'
    };
    return typeMap[type] || '综合报告';
  };

  const resolveReportById = (reportId: string) => {
    return (
      reports.find(r => r.id === reportId) ||
      backendReports.find(r => r.id === reportId) ||
      dynamicReports.find(r => r.id === reportId)
    );
  };

  const handleDownload = async (reportId: string, format: ExportFormat = 'pdf') => {
    const report = resolveReportById(reportId);
    if (!report) return;

    if (!reportsAdminToken) {
      setReportApiError('请先输入管理令牌以连接报告服务');
      return;
    }

    setExportingReport(reportId);
    setExportProgress(0);

    const progressInterval = setInterval(() => {
      setExportProgress(prev => Math.min(prev + 20, 90));
    }, 200);

    try {
      if (report.backend && report.backendRecord) {
        await downloadBackendReport(report.backendRecord.id, `${report.backendRecord.id}.json`);
        await loadBackendReports();
        return;
      }

      const payload = {
        symbols: report.symbols || ['600519', '300750', '000001'],
        start_date: report.startDate || '2024-01-01',
        end_date: report.endDate || new Date().toISOString().slice(0, 10),
        template: report.name,
        format,
        include_backtest: true
      };

      const response = await fetch(buildApiUrl('/api/v1/reports/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': reportsAdminToken
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('生成报告失败');
      }

      const data = await response.json();
      await downloadBackendReport(data.report.id, `${data.report.id}.json`);
      await loadBackendReports();
    } catch (error) {
      console.error('[Reports] Failed to export report:', error);
      setReportApiError('报告生成或下载失败');
    } finally {
      clearInterval(progressInterval);
      setExportProgress(0);
      setExportingReport(null);
    }
  };

  const downloadBackendReport = async (reportId: string, filename: string) => {
    const response = await fetch(buildApiUrl(`/api/v1/reports/download/${reportId}`), {
      headers: {
        'X-Admin-Token': reportsAdminToken
      },
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('下载报告失败');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const combinedReports = [...backendReports, ...dynamicReports];

  const handleShare = async (reportId: string) => {
    try {
      const shareUrl = await reportService.createShareLink(reportId, {
        expiresIn: 72, // 72小时
        allowDownload: true
      });
      
      // 复制到剪贴板
      await navigator.clipboard.writeText(shareUrl);
      alert('分享链接已复制到剪贴板');
    } catch (error) {
      console.error('[Reports] Share failed:', error);
      alert('创建分享链接失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* Service Status & Header */}
      <div className="space-y-4">
        {/* Service Status Bar */}
        <div className="flex items-center justify-between bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-4">
          <div className="grid grid-cols-2 gap-6 flex-1">
            {/* 第一行 - 本地服务状态 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#10b981] animate-pulse" />
                <span className="text-sm text-gray-300">
                  报告服务: <span className="font-medium text-[#10b981]">运行中</span>
                </span>
              </div>
              <div className="text-sm text-gray-500">
                模板: {availableTemplates.length} 个
              </div>
              <div className="text-sm text-gray-500">
                调度: {scheduledReports.length} 个
              </div>
              {exportingReport && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#f59e0b] animate-spin" />
                  <span className="text-sm text-[#f59e0b]">导出中 {exportProgress}%</span>
                </div>
              )}
            </div>
            
            {/* 第二行 - 外部服务状态 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Database className={`w-4 h-4 ${serviceStatus.akshare ? 'text-[#10b981]' : 'text-gray-500'}`} />
                <span className="text-sm text-gray-400">
                  AkShare: <span className={serviceStatus.akshare ? 'text-[#10b981]' : 'text-gray-500'}>
                    {serviceStatus.akshare ? '已连接' : '离线'}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className={`w-4 h-4 ${serviceStatus.quantEngine ? 'text-[#8b5cf6]' : 'text-gray-500'}`} />
                <span className="text-sm text-gray-400">
                  QuantEngine: <span className={serviceStatus.quantEngine ? 'text-[#8b5cf6]' : 'text-gray-500'}>
                    {serviceStatus.quantEngine ? '已连接' : '离线'}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className={`w-4 h-4 ${serviceStatus.qlib ? 'text-[#f59e0b]' : 'text-gray-500'}`} />
                <span className="text-sm text-gray-400">
                  Qlib: <span className={serviceStatus.qlib ? 'text-[#f59e0b]' : 'text-gray-500'}>
                    {serviceStatus.qlib ? `${availableModels.length} 模型` : '离线'}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="px-3 py-1.5 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-300 rounded text-sm transition-colors"
            >
              模板管理
            </button>
            <button
              onClick={() => setShowScheduler(true)}
              className="px-3 py-1.5 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-300 rounded text-sm transition-colors"
            >
              调度设置
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg text-gray-100 mb-1 flex items-center gap-3">
              报告中心
              {workspaceConnected && (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#8b5cf6]" />
                  <span className="text-xs text-[#8b5cf6]">工作区同步</span>
                </div>
              )}
            </h2>
            <div className="text-sm text-gray-500">
              查看和管理生成的回测报告、技术文档和组合分析 • {realTimeReports.length} 个报告
              {reportGenerationQueue.length > 0 && (
                <span className="ml-2 text-[#f59e0b]">• {reportGenerationQueue.length} 个生成中</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-[#10b981] hover:bg-[#0d9668] text-white rounded text-sm transition-colors flex items-center gap-2"
            >
              <FileType className="w-4 h-4" />
              批量导出
            </button>
            <button className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded text-sm transition-colors">
              生成新报告
            </button>
          </div>
        </div>

        {/* Report service connection */}
        <div className="bg-[#0f243d]/70 border border-[#1e3a5f] rounded-lg px-4 py-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm text-gray-300 mb-1 block">管理令牌（SETTINGS_ADMIN_TOKEN）</label>
              <input
                type="password"
                value={reportsAdminToken}
                onChange={(e) => setReportsAdminToken(e.target.value)}
                placeholder="用于访问后端报告服务的令牌"
                className="w-full bg-[#0d1b2e] border border-[#2a3f5f] rounded px-4 py-2 text-sm text-white"
              />
            </div>
            <button
              onClick={() => void loadBackendReports()}
              disabled={!reportsAdminToken || backendLoading}
              className="px-4 py-2 bg-[#0ea5e9] text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {backendLoading ? '连接中...' : '连接报告服务'}
            </button>
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-2">
            {reportsAdminToken ? (
              <span className="text-green-400">🔐 已配置令牌，可使用 AkShare/Qlib 报告服务</span>
            ) : (
              <span>🔒 未配置令牌，仅显示示例报告</span>
            )}
            {reportApiError && <span className="text-red-400">{reportApiError}</span>}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索报告名称..."
              className="w-full bg-[#1a2942] border border-[#2a3f5f] rounded px-4 py-2 text-sm text-gray-200 placeholder-gray-600"
            />
          </div>
          <select className="bg-[#1a2942] border border-[#2a3f5f] rounded px-4 py-2 text-sm text-gray-200">
            <option>所有类型</option>
            <option>回测报告</option>
            <option>技术报告</option>
            <option>综合报告</option>
            <option>组合报告</option>
          </select>
          <select className="bg-[#1a2942] border border-[#2a3f5f] rounded px-4 py-2 text-sm text-gray-200">
            <option>按时间排序</option>
            <option>按名称排序</option>
            <option>按大小排序</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* 动态生成的报告 */}
        {combinedReports.map((report) => (
          <div
            key={report.id}
            className="bg-[#0d1b2e] border border-[#10b981] rounded-lg p-5 hover:border-[#10b981]/50 transition-colors cursor-pointer group relative"
          >
            {/* 新生成标识 */}
            <div className="absolute top-2 right-2 px-2 py-1 bg-[#10b981]/20 text-[#10b981] text-xs rounded">
              新生成
            </div>
            
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-[#10b981]/10 rounded flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#10b981]" />
              </div>
              <TypeBadge type={report.type} />
            </div>

            <h3 className="text-sm text-gray-200 mb-2 group-hover:text-[#10b981] transition-colors">
              {report.name}
            </h3>

            <div className="space-y-2 text-xs text-gray-500 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                <span>{report.createTime}</span>
              </div>
              {report.source && (
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  <span>来源: {report.source}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>{report.size}</span>
                <span>{report.pages} 页</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(report.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-300 rounded text-xs transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>预览</span>
                </button>
                <button
                  onClick={() => handleShare(report.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] rounded text-xs transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>分享</span>
                </button>
              </div>
              
              <div className="flex gap-1">
                {exportingReport === report.id ? (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#f59e0b]/20 text-[#f59e0b] rounded text-xs">
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>{exportProgress}%</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleDownload(report.id, 'pdf')}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] rounded text-xs transition-colors"
                      title="导出PDF"
                    >
                      <FileText className="w-3 h-3" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleDownload(report.id, 'xlsx')}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] rounded text-xs transition-colors"
                      title="导出Excel"
                    >
                      <FileType className="w-3 h-3" />
                      <span>Excel</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* 静态报告 */}
        {realTimeReports.map((report) => (
          <div
            key={report.id}
            className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5 hover:border-[#0ea5e9]/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-[#0ea5e9]/10 rounded flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#0ea5e9]" />
              </div>
              <TypeBadge type={report.type} />
            </div>

            <h3 className="text-sm text-gray-200 mb-2 group-hover:text-[#0ea5e9] transition-colors">
              {report.name}
            </h3>

            <div className="space-y-2 text-xs text-gray-500 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                <span>{report.createTime}</span>
              </div>
              {report.backtest && (
                <div className="flex items-center gap-2">
                  <Tag className="w-3 h-3" />
                  <span>关联回测: {report.backtest}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>{report.size}</span>
                <span>{report.pages} 页</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(report.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-300 rounded text-xs transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>预览</span>
                </button>
                <button
                  onClick={() => handleShare(report.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] rounded text-xs transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>分享</span>
                </button>
              </div>
              
              <div className="flex gap-1">
                {exportingReport === report.id ? (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#f59e0b]/20 text-[#f59e0b] rounded text-xs">
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>{exportProgress}%</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleDownload(report.id, 'pdf')}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] rounded text-xs transition-colors"
                      title="导出PDF"
                    >
                      <FileText className="w-3 h-3" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleDownload(report.id, 'excel')}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] rounded text-xs transition-colors"
                      title="导出Excel"
                    >
                      <Database className="w-3 h-3" />
                      <span>XLS</span>
                    </button>
                    <button
                      onClick={() => handleDownload(report.id, 'csv')}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#0ea5e9] rounded text-xs transition-colors"
                      title="导出CSV"
                    >
                      <Download className="w-3 h-3" />
                      <span>CSV</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewOpen && selectedReport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#1a2942]">
              <div>
                <h3 className="text-lg text-gray-100 mb-1">
                  {reports.find((r) => r.id === selectedReport)?.name}
                </h3>
                <div className="text-sm text-gray-500">报告预览</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(selectedReport, 'pdf')}
                    className="flex items-center gap-2 px-3 py-2 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] rounded text-sm transition-colors"
                    disabled={exportingReport === selectedReport}
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownload(selectedReport, 'excel')}
                    className="flex items-center gap-2 px-3 py-2 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] rounded text-sm transition-colors"
                    disabled={exportingReport === selectedReport}
                  >
                    <Database className="w-4 h-4" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => handleDownload(selectedReport, 'html')}
                    className="flex items-center gap-2 px-3 py-2 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] rounded text-sm transition-colors"
                    disabled={exportingReport === selectedReport}
                  >
                    <FileType className="w-4 h-4" />
                    <span>HTML</span>
                  </button>
                  <button
                    onClick={() => handleShare(selectedReport)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#0ea5e9] rounded text-sm transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>分享</span>
                  </button>
                </div>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="px-4 py-2 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-300 rounded text-sm transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>

            {/* Modal Body - Report Preview */}
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto bg-white text-gray-900 rounded shadow-lg">
                {/* Sample Report Content */}
                <div className="p-12">
                  <div className="text-center mb-12">
                    <div className="text-4xl mb-4">量化回测报告</div>
                    <div className="text-2xl text-gray-600 mb-2">High Vol Alpha - Q4 Test</div>
                    <div className="text-sm text-gray-500">
                      回测期间: 2024-01-01 至 2024-12-09
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="text-xl mb-4 pb-2 border-b-2 border-gray-300">执行摘要</div>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <div className="text-gray-600 mb-1">策略名称</div>
                        <div>High Vol Alpha Combo</div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">初始资金</div>
                        <div>¥10,000,000</div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">年化收益率</div>
                        <div className="text-green-600">42.3%</div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">最大回撤</div>
                        <div className="text-red-600">-8.2%</div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">夏普比率</div>
                        <div>2.18</div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">持仓股票数</div>
                        <div>45 只</div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="text-xl mb-4 pb-2 border-b-2 border-gray-300">核心发现</div>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>策略在 2024 年中小盘反弹阶段表现优异，Q2-Q3 累计收益达 28.5%</li>
                      <li>动量因子和成长因子贡献了约 65% 的超额收益</li>
                      <li>风险控制有效，最大回撤 -8.2% 显著优于沪深 300 的 -12.5%</li>
                      <li>持仓集中在新能源、电子、医药三大板块，行业分散度适中</li>
                    </ul>
                  </div>

                  <div className="mb-8">
                    <div className="text-xl mb-4 pb-2 border-b-2 border-gray-300">风险提示</div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
                      <ul className="list-disc list-inside space-y-2">
                        <li>新能源板块集中度较高（约 40%），需关注行业系统性风险</li>
                        <li>策略在震荡市中表现相对平稳，但在极端下跌中可能面临流动性压力</li>
                        <li>建议保持单票仓位上限 4%，行业权重上限 25% 的风控要求</li>
                      </ul>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 text-center mt-12 pt-8 border-t border-gray-200">
                    本报告由 Arthera Quant Lab 自动生成 | 
                    生成时间: 2024-12-09 14:35 | 
                    仅供内部参考，不构成投资建议
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    '回测报告': 'bg-[#0ea5e9]/20 text-[#0ea5e9]',
    '技术报告': 'bg-[#8b5cf6]/20 text-[#8b5cf6]',
    '综合报告': 'bg-[#10b981]/20 text-[#10b981]',
    '组合报告': 'bg-[#f59e0b]/20 text-[#f59e0b]',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${colorMap[type] || 'bg-gray-500/20 text-gray-500'}`}>
      {type}
    </span>
  );
}
