import { useState, useEffect, useCallback } from 'react';
import { Save, FolderOpen, Plus, Trash2, Star, LayoutGrid, Activity, TrendingUp, Shield, BarChart3, Settings, Link, RefreshCw, Zap } from 'lucide-react';
import { Widget, createChartWidget, createRiskWidget, createLevel2Widget, createWidget } from './WidgetLayout';
import { BloombergChart } from './TradingChart/BloombergChart';
import { RealTimeChartContainer } from './TradingChart/RealTimeChartContainer';
import { Level2DataPanel } from './TradingChart/Level2DataPanel';
import { 
  getWorkspaceService, 
  moduleCommunication,
  useModuleCommunication,
  getAlertService,
  getCacheManager,
  type WorkspaceWidget,
  type Workspace as WorkspaceType,
  type ModuleConnection,
  type WorkspaceTemplate
} from '../services';

export interface Workspace {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
  createdAt: Date;
  isFavorite: boolean;
  role?: string; // investor, trader, fund-manager, cfo
}

interface WorkspaceManagerProps {
  currentWidgets: Widget[];
  onLoadWorkspace: (workspace: Workspace) => void;
  onSaveWorkspace: (name: string, description: string) => void;
}

// 生成专业级工作区模板
function generateDefaultWorkspaces(): Workspace[] {
  return [
    {
      id: 'ws-multi-chart-pro',
      name: 'Bloomberg多图表专业版',
      description: '4图表同步布局：主图+Level2+技术指标+分时图',
      widgets: [
        createChartWidget('600519', ['MA', 'BOLL', 'VOL'], { x: 50, y: 50 }, { w: 600, h: 350 }),
        createLevel2Widget('600519', { x: 680, y: 50 }, { w: 300, h: 350 }),
        createChartWidget('600519', ['RSI', 'MACD', 'KDJ'], { x: 50, y: 420 }, { w: 450, h: 300 }),
        createWidget(
          'intraday-chart',
          'INT',
          '分时图',
          <RealTimeChartContainer 
            symbols={['600519']}
            mode="detail"
            chartType="line"
            height={250}
          />,
          { x: 520, y: 420 },
          { w: 460, h: 300 },
          { type: 'chart', subscribedSymbols: ['600519'] }
        )
      ],
      createdAt: new Date(),
      isFavorite: true,
      role: 'trader',
    },
    {
      id: 'ws-quad-chart',
      name: '四图表同步工作区',
      description: '2x2四象限布局：多时间周期同步分析',
      widgets: [
        createChartWidget('600519', ['MA', 'VOL'], { x: 50, y: 50 }, { w: 450, h: 300 }),
        createChartWidget('600519', ['MA', 'VOL'], { x: 520, y: 50 }, { w: 450, h: 300 }),
        createChartWidget('600519', ['RSI', 'MACD'], { x: 50, y: 370 }, { w: 450, h: 300 }),
        createChartWidget('600519', ['KDJ', 'BOLL'], { x: 520, y: 370 }, { w: 450, h: 300 })
      ],
      createdAt: new Date(),
      isFavorite: true,
      role: 'trader',
    },
    {
      id: 'ws-multi-symbol',
      name: '多股票监控布局',
      description: '6图表布局：核心股票池实时监控',
      widgets: [
        createChartWidget('600519', ['MA'], { x: 50, y: 50 }, { w: 300, h: 200 }),
        createChartWidget('300750', ['MA'], { x: 370, y: 50 }, { w: 300, h: 200 }),
        createChartWidget('000858', ['MA'], { x: 690, y: 50 }, { w: 300, h: 200 }),
        createChartWidget('600036', ['MA'], { x: 50, y: 270 }, { w: 300, h: 200 }),
        createChartWidget('002594', ['MA'], { x: 370, y: 270 }, { w: 300, h: 200 }),
        createChartWidget('601318', ['MA'], { x: 690, y: 270 }, { w: 300, h: 200 })
      ],
      createdAt: new Date(),
      isFavorite: true,
      role: 'fund-manager',
    },
    {
      id: 'ws-cfo',
      name: 'CFO Executive View',
      description: '企业CFO视角：总览KPI、风险监控、报告中心',
      widgets: [
        createWidget(
          'cfo-risk-overview',
          'RISK',
          '风险概览',
          <RealTimeChartContainer 
            symbols={['000001', '399001', '399006']}
            mode="institutional"
            showRiskPanel={true}
            height={300}
          />,
          { x: 50, y: 50 },
          { w: 800, h: 350 },
          { type: 'risk', subscribedSymbols: ['000001', '399001', '399006'] }
        ),
        createWidget(
          'cfo-portfolio-summary',
          'PORT',
          '投资组合概要',
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-sm text-gray-400">总资产</div>
                <div className="text-lg font-bold text-white">¥1,250万</div>
                <div className="text-xs text-green-400">+2.5%</div>
              </div>
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-sm text-gray-400">风险敞口</div>
                <div className="text-lg font-bold text-white">65%</div>
                <div className="text-xs text-yellow-400">中等</div>
              </div>
            </div>
          </div>,
          { x: 900, y: 50 },
          { w: 350, h: 200 }
        )
      ],
      createdAt: new Date(),
      isFavorite: true,
      role: 'cfo',
    },
    {
      id: 'ws-trader',
      name: 'Quant Trader Workspace',
      description: '量化交易员：实时数据、策略表现、参数调优',
      widgets: [
        createChartWidget('600519', ['MA', 'MACD', 'RSI'], { x: 50, y: 50 }, { w: 700, h: 400 }),
        createLevel2Widget('600519', { x: 780, y: 50 }, { w: 350, h: 400 }),
        createRiskWidget(['600519', '300750'], { x: 50, y: 480 }, { w: 400, h: 250 }),
        createWidget(
          'trader-watchlist',
          'WL',
          '自选股监控',
          <RealTimeChartContainer 
            symbols={['600519', '300750', '000858', '600036']}
            mode="detail"
            showLevel2={false}
            height={200}
          />,
          { x: 480, y: 480 },
          { w: 650, h: 250 },
          { type: 'data', subscribedSymbols: ['600519', '300750', '000858', '600036'] }
        )
      ],
      createdAt: new Date(),
      isFavorite: true,
      role: 'trader',
    },
    {
      id: 'ws-fund-manager',
      name: 'Fund Manager Dashboard',
      description: '基金经理：组合分析、归因分解、风险敞口',
      widgets: [
        createWidget(
          'fund-performance',
          'PERF',
          '基金表现分析',
          <RealTimeChartContainer 
            symbols={['600519', '300750', '000858', '002594', '601318']}
            mode="institutional"
            showRiskPanel={true}
            height={350}
          />,
          { x: 50, y: 50 },
          { w: 900, h: 400 },
          { type: 'chart' }
        ),
        createRiskWidget(['600519', '300750', '000858', '002594'], { x: 980, y: 50 }, { w: 350, h: 400 })
      ],
      createdAt: new Date(),
      isFavorite: false,
      role: 'fund-manager',
    },
    {
      id: 'ws-investor',
      name: 'Personal Investor View',
      description: '个人投资者：简化视图、策略推荐、收益跟踪',
      widgets: [
        createChartWidget('600519', ['MA'], { x: 50, y: 50 }, { w: 600, h: 400 }),
        createWidget(
          'investor-summary',
          'SUM',
          '投资概况',
          <div className="p-4 space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">¥85,230</div>
              <div className="text-sm text-gray-400">总资产</div>
              <div className="text-green-400 mt-2">+¥2,150 (+2.59%)</div>
            </div>
          </div>,
          { x: 680, y: 50 },
          { w: 300, h: 200 }
        )
      ],
      createdAt: new Date(),
      isFavorite: false,
      role: 'investor',
    },
  ];
}

export function WorkspaceManager({ currentWidgets, onLoadWorkspace, onSaveWorkspace }: WorkspaceManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const saved = localStorage.getItem('arthera-workspaces');
    return saved ? JSON.parse(saved) : generateDefaultWorkspaces();
  });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');

  // 新增：WorkspaceService 集成状态
  const [workspaceService] = useState(() => getWorkspaceService());
  const [serviceWorkspaces, setServiceWorkspaces] = useState<WorkspaceType[]>([]);
  const [moduleConnections, setModuleConnections] = useState<Map<string, ModuleConnection>>(new Map());
  const [availableTemplates, setAvailableTemplates] = useState<WorkspaceTemplate[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'investor' | 'trader' | 'fund-manager' | 'cfo'>('investor');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showModuleStatus, setShowModuleStatus] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // 模块间通信集成
  const {
    state: communicationState,
    updateNavigationState,
    notifyWorkspaceLoaded,
    shareWorkspaceConfig
  } = useModuleCommunication();

  // 初始化工作区服务连接
  useEffect(() => {
    const initializeWorkspaceService = async () => {
      setIsInitializing(true);
      try {
        // 加载工作区列表
        const allWorkspaces = workspaceService.getAllWorkspaces();
        setServiceWorkspaces(allWorkspaces);

        // 获取模块连接状态
        const connections = workspaceService.getModuleConnections();
        setModuleConnections(connections);

        // 获取模板列表
        const templates = workspaceService.getAvailableTemplates(currentUserRole);
        setAvailableTemplates(templates);

        // 连接所有模块
        await connectAllModules();

        console.log('✅ WorkspaceManager service integration initialized');
      } catch (error) {
        console.error('❌ Failed to initialize WorkspaceManager service:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeWorkspaceService();

    // 监听工作区事件
    const handleWorkspaceCreated = (data: any) => {
      setServiceWorkspaces(prev => [...prev, data.workspace]);
    };

    const handleWorkspaceUpdated = (data: any) => {
      setServiceWorkspaces(prev => prev.map(w => w.id === data.workspace.id ? data.workspace : w));
    };

    const handleWorkspaceDeleted = (data: any) => {
      setServiceWorkspaces(prev => prev.filter(w => w.id !== data.workspaceId));
    };

    workspaceService.on('workspace:created', handleWorkspaceCreated);
    workspaceService.on('workspace:updated', handleWorkspaceUpdated);
    workspaceService.on('workspace:deleted', handleWorkspaceDeleted);

    // 清理函数
    return () => {
      workspaceService.off('workspace:created', handleWorkspaceCreated);
      workspaceService.off('workspace:updated', handleWorkspaceUpdated);
      workspaceService.off('workspace:deleted', handleWorkspaceDeleted);
    };
  }, [currentUserRole]);

  // 连接所有模块
  const connectAllModules = useCallback(async () => {
    const modules = [
      'dashboard',
      'strategy-lab', 
      'strategy-compare',
      'stock-picker',
      'portfolio',
      'reports'
    ];

    for (const moduleId of modules) {
      try {
        await workspaceService.connectModule(moduleId, {
          autoConnect: true,
          watchlist: ['600519', '300750', '000858'],
          enableRealTime: true
        });
      } catch (error) {
        console.error(`Failed to connect module ${moduleId}:`, error);
      }
    }

    // 更新连接状态
    setModuleConnections(workspaceService.getModuleConnections());
  }, []);

  // 创建新工作区（使用 WorkspaceService）
  const createWorkspaceFromService = useCallback(async (name: string, description: string, userRole?: string) => {
    try {
      setIsInitializing(true);
      
      // 将当前 widgets 转换为 WorkspaceWidget 格式
      const workspaceWidgets: any[] = currentWidgets.map((widget, index) => ({
        type: 'chart' as const,
        moduleId: 'dashboard',
        title: widget.title,
        code: widget.code,
        config: {
          symbols: ['600519'], // 默认股票
          timeRange: '1M',
          refreshInterval: 30000
        },
        layout: {
          x: widget.position.x,
          y: widget.position.y,
          width: widget.size.w,
          height: widget.size.h,
          zIndex: index,
          resizable: true,
          draggable: true
        },
        dataSubscriptions: [],
        isActive: true,
        isMinimized: widget.minimized || false
      }));

      const workspaceId = workspaceService.createWorkspace({
        name,
        description,
        userRole: (userRole as any) || currentUserRole,
        widgets: workspaceWidgets,
        tags: ['custom', userRole || currentUserRole]
      });

      if (workspaceId) {
        // 通知模块通信系统
        notifyWorkspaceLoaded({
          workspaceId,
          name,
          widgets: workspaceWidgets
        });

        console.log(`✅ Created workspace: ${name} (${workspaceId})`);
        return workspaceId;
      }
    } catch (error) {
      console.error('❌ Failed to create workspace:', error);
    } finally {
      setIsInitializing(false);
    }
    return null;
  }, [currentWidgets, currentUserRole, notifyWorkspaceLoaded]);

  // 加载工作区（使用 WorkspaceService）
  const loadWorkspaceFromService = useCallback(async (workspace: WorkspaceType) => {
    try {
      setIsInitializing(true);
      
      const success = await workspaceService.loadWorkspace(workspace.id);
      if (success) {
        // 转换为旧格式兼容现有组件
        const legacyWorkspace: Workspace = {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          widgets: convertToLegacyWidgets(workspace.widgets),
          createdAt: workspace.createdAt,
          isFavorite: workspace.isFavorite,
          role: workspace.userRole
        };

        onLoadWorkspace(legacyWorkspace);
        
        // 通知其他模块工作区已加载
        notifyWorkspaceLoaded({
          workspaceId: workspace.id,
          name: workspace.name,
          config: workspace.globalSettings
        });

        console.log(`✅ Loaded workspace: ${workspace.name}`);
      }
    } catch (error) {
      console.error('❌ Failed to load workspace:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [onLoadWorkspace, notifyWorkspaceLoaded]);

  // 删除工作区（使用 WorkspaceService）
  const deleteWorkspaceFromService = useCallback(async (workspaceId: string) => {
    try {
      await workspaceService.deleteWorkspace(workspaceId);
      console.log(`✅ Deleted workspace: ${workspaceId}`);
    } catch (error) {
      console.error('❌ Failed to delete workspace:', error);
    }
  }, []);

  // 从模板创建工作区
  const createWorkspaceFromTemplate = useCallback(async (templateId: string, customName?: string) => {
    try {
      setIsInitializing(true);
      const workspaceId = workspaceService.createWorkspaceFromTemplate(templateId, customName);
      if (workspaceId) {
        const workspace = workspaceService.getWorkspace(workspaceId);
        if (workspace) {
          await loadWorkspaceFromService(workspace);
        }
      }
    } catch (error) {
      console.error('❌ Failed to create workspace from template:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [loadWorkspaceFromService]);

  // 辅助函数：转换为旧格式
  const convertToLegacyWidgets = (widgets: any[]): Widget[] => {
    return widgets.map(widget => ({
      id: widget.id,
      title: widget.title,
      code: widget.code,
      content: <div>Loading...</div>, // 占位符
      defaultSize: { w: widget.layout.width, h: widget.layout.height },
      position: { x: widget.layout.x, y: widget.layout.y },
      size: { w: widget.layout.width, h: widget.layout.height },
      minimized: widget.isMinimized
    }));
  };

  const saveCurrentWorkspace = () => {
    if (!newWorkspaceName.trim()) return;

    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name: newWorkspaceName,
      description: newWorkspaceDesc,
      widgets: currentWidgets,
      createdAt: new Date(),
      isFavorite: false,
    };

    const updated = [...workspaces, newWorkspace];
    setWorkspaces(updated);
    localStorage.setItem('arthera-workspaces', JSON.stringify(updated));

    onSaveWorkspace(newWorkspaceName, newWorkspaceDesc);
    setShowSaveDialog(false);
    setNewWorkspaceName('');
    setNewWorkspaceDesc('');
  };

  const deleteWorkspace = (id: string) => {
    const updated = workspaces.filter(w => w.id !== id);
    setWorkspaces(updated);
    localStorage.setItem('arthera-workspaces', JSON.stringify(updated));
  };

  const toggleFavorite = (id: string) => {
    const updated = workspaces.map(w =>
      w.id === id ? { ...w, isFavorite: !w.isFavorite } : w
    );
    setWorkspaces(updated);
    localStorage.setItem('arthera-workspaces', JSON.stringify(updated));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#1a2942]/50 border border-[#2a3f5f] rounded text-xs text-gray-400 hover:text-gray-200 hover:border-[#0ea5e9]/50 transition-colors"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span className="bloomberg-code">WORKSPACE</span>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Workspace Panel */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[800px] bg-[#0d1b2e] border border-[#0ea5e9]/50 rounded-lg shadow-2xl z-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2942] bg-[#0a1628]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <LayoutGrid className="w-5 h-5 text-[#0ea5e9]" />
              {isInitializing && (
                <RefreshCw className="w-3 h-3 text-[#0ea5e9] animate-spin absolute -top-1 -right-1" />
              )}
            </div>
            <div>
              <h3 className="text-sm text-gray-200 bloomberg-code">WORKSPACE MANAGER</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>管理您的工作区布局</span>
                <span>•</span>
                <span className="text-[#0ea5e9]">{Array.from(moduleConnections.values()).filter(c => c.isConnected).length} 模块已连接</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModuleStatus(!showModuleStatus)}
              className="flex items-center gap-1 px-2 py-1.5 bg-[#1a2942]/50 border border-[#2a3f5f] rounded text-xs text-gray-400 hover:text-gray-200 hover:border-[#0ea5e9]/50 transition-colors"
              title="模块连接状态"
            >
              <Link className="w-3.5 h-3.5" />
              <span>状态</span>
            </button>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1 px-2 py-1.5 bg-[#1a2942]/50 border border-[#2a3f5f] rounded text-xs text-gray-400 hover:text-gray-200 hover:border-[#0ea5e9]/50 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>模板</span>
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#0ea5e9] text-white rounded text-xs hover:bg-[#0284c7] transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              保存当前布局
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[#1a2942] rounded transition-colors"
            >
              <span className="text-gray-500">✕</span>
            </button>
          </div>
        </div>

        {/* Module Status Panel */}
        {showModuleStatus && (
          <div className="px-5 py-4 border-b border-[#1a2942] bg-[#0a1628]">
            <h4 className="text-xs text-gray-400 mb-3 bloomberg-code">MODULE CONNECTION STATUS</h4>
            <div className="grid grid-cols-2 gap-2">
              {Array.from(moduleConnections.entries()).map(([moduleId, connection]) => (
                <div
                  key={moduleId}
                  className={`flex items-center justify-between p-2 rounded text-xs ${
                    connection.isConnected 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  <span className="text-gray-200 capitalize">{moduleId.replace('-', ' ')}</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      connection.isConnected ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <span className={connection.isConnected ? 'text-green-400' : 'text-red-400'}>
                      {connection.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Templates Panel */}
        {showTemplates && (
          <div className="px-5 py-4 border-b border-[#1a2942] bg-[#0a1628]">
            <h4 className="text-xs text-gray-400 mb-3 bloomberg-code">WORKSPACE TEMPLATES</h4>
            <div className="grid grid-cols-2 gap-2">
              {availableTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => createWorkspaceFromTemplate(template.id)}
                  disabled={isInitializing}
                  className="p-3 bg-[#1a2942]/50 hover:bg-[#1a2942] border border-[#2a3f5f] rounded text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-sm text-gray-200 mb-1">{template.name}</div>
                  <div className="text-xs text-gray-500">{template.description}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] bloomberg-code ${
                      template.complexity === 'expert' ? 'bg-red-500/20 text-red-400' :
                      template.complexity === 'advanced' ? 'bg-orange-500/20 text-orange-400' :
                      template.complexity === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {template.complexity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-600">{template.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="px-5 py-4 bg-[#0a1628] border-b border-[#1a2942]">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">工作区名称</label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="例如：我的日常分析"
                  className="w-full px-3 py-2 bg-[#0d1b2e] border border-[#1a2942] rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">描述（可选）</label>
                <input
                  type="text"
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  placeholder="简要说明这个工作区的用途"
                  className="w-full px-3 py-2 bg-[#0d1b2e] border border-[#1a2942] rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveCurrentWorkspace}
                  className="px-4 py-2 bg-[#0ea5e9] text-white rounded text-sm hover:bg-[#0284c7] transition-colors"
                >
                  确认保存
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setNewWorkspaceName('');
                    setNewWorkspaceDesc('');
                  }}
                  className="px-4 py-2 bg-[#1a2942] text-gray-300 rounded text-sm hover:bg-[#2a3f5f] transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workspaces List */}
        <div className="p-5 max-h-[500px] overflow-y-auto">
          {/* Service Workspaces Section */}
          {serviceWorkspaces.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-xs text-gray-400 bloomberg-code">ENHANCED WORKSPACES (WorkspaceService)</h4>
                <div className="h-px bg-[#1a2942] flex-1" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {serviceWorkspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className="bg-[#0a1628] border border-[#1a2942] rounded-lg p-4 hover:border-[#0ea5e9]/50 transition-colors group relative"
                  >
                    {/* Enhanced workspace indicator */}
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 rounded-full bg-[#0ea5e9] animate-pulse" title="Enhanced with WorkspaceService" />
                    </div>
                    
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => {
                            const updated = serviceWorkspaces.map(w => 
                              w.id === workspace.id ? { ...w, isFavorite: !w.isFavorite } : w
                            );
                            setServiceWorkspaces(updated);
                          }}
                          className="mt-1"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              workspace.isFavorite
                                ? 'fill-[#f59e0b] text-[#f59e0b]'
                                : 'text-gray-600 hover:text-[#f59e0b]'
                            }`}
                          />
                        </button>
                        <div>
                          <h4 className="text-sm text-gray-200">{workspace.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">{workspace.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteWorkspaceFromService(workspace.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#f97316]/20 rounded transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-[#f97316]" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a2942]/50">
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="px-2 py-0.5 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded bloomberg-code">
                          {workspace.userRole.toUpperCase()}
                        </span>
                        <span>{workspace.widgets?.length || 0} widgets</span>
                        <span>{workspace.tags?.length || 0} tags</span>
                      </div>
                      <button
                        onClick={() => {
                          loadWorkspaceFromService(workspace);
                          setIsOpen(false);
                        }}
                        disabled={isInitializing}
                        className="flex items-center gap-1 px-3 py-1 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded text-xs hover:bg-[#0ea5e9]/30 transition-colors disabled:opacity-50"
                      >
                        <FolderOpen className="w-3 h-3" />
                        加载
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Legacy Workspaces Section */}
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-xs text-gray-400 bloomberg-code">LEGACY WORKSPACES</h4>
            <div className="h-px bg-[#1a2942] flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="bg-[#0a1628] border border-[#1a2942] rounded-lg p-4 hover:border-[#0ea5e9]/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleFavorite(workspace.id)}
                      className="mt-1"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          workspace.isFavorite
                            ? 'fill-[#f59e0b] text-[#f59e0b]'
                            : 'text-gray-600 hover:text-[#f59e0b]'
                        }`}
                      />
                    </button>
                    <div>
                      <h4 className="text-sm text-gray-200">{workspace.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{workspace.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteWorkspace(workspace.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#f97316]/20 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-[#f97316]" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a2942]/50">
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    {workspace.role && (
                      <span className="px-2 py-0.5 bg-[#1a2942] rounded bloomberg-code">
                        {workspace.role.toUpperCase()}
                      </span>
                    )}
                    <span>{workspace.widgets?.length || 0} widgets</span>
                  </div>
                  <button
                    onClick={() => {
                      onLoadWorkspace(workspace);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded text-xs hover:bg-[#0ea5e9]/30 transition-colors"
                  >
                    <FolderOpen className="w-3 h-3" />
                    加载
                  </button>
                </div>
              </div>
            ))}

            {/* Create New Workspace Card */}
            <button
              onClick={() => setShowSaveDialog(true)}
              className="bg-[#0a1628] border-2 border-dashed border-[#1a2942] rounded-lg p-4 hover:border-[#0ea5e9]/50 transition-colors flex flex-col items-center justify-center gap-2 min-h-[140px]"
            >
              <Plus className="w-6 h-6 text-gray-600" />
              <span className="text-sm text-gray-500">创建新工作区</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1a2942] bg-[#0a1628] text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span>工作区会自动保存到本地浏览器</span>
            <span className="bloomberg-mono">{workspaces.length} 个工作区</span>
          </div>
        </div>
      </div>
    </>
  );
}
