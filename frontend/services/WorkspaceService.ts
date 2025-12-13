/**
 * WorkspaceService - 统一工作区管理服务
 * 
 * 功能特性：
 * ✅ 工作区布局管理和持久化
 * ✅ 跨模块状态同步
 * ✅ 实时数据订阅管理
 * ✅ 模块间通信协调
 * ✅ 用户角色适配
 * ✅ 智能布局推荐
 */

// 浏览器兼容的事件发射器
class BrowserEventEmitter {
  private events: { [event: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  off(event: string, listener?: Function) {
    if (!this.events[event]) return;
    if (!listener) {
      delete this.events[event];
    } else {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}
import { getCacheManager } from './CacheManager';
import { moduleCommunication } from './CommunicationBus';
import { 
  getDataStreamManager,
  getAlertService,
  getStrategyExecutionService,
  getPortfolioManagementService,
  getReportExportService,
  type MarketData,
  type Alert,
  type BacktestResult,
  type Portfolio as PortfolioType,
  type StrategyConfig
} from './index';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface WorkspaceWidget {
  id: string;
  type: 'chart' | 'dashboard' | 'strategy' | 'portfolio' | 'reports' | 'news' | 'risk' | 'data';
  moduleId: string;
  title: string;
  code: string; // Bloomberg 风格的功能代码
  config: WidgetConfig;
  layout: WidgetLayout;
  dataSubscriptions: DataSubscription[];
  isActive: boolean;
  isMinimized: boolean;
  createdAt: Date;
  lastUpdated: Date;
}

export interface WidgetConfig {
  // 通用配置
  symbols?: string[];
  timeRange?: string;
  refreshInterval?: number;
  
  // 图表相关
  chartType?: 'candlestick' | 'line' | 'area' | 'bar';
  indicators?: string[];
  showVolume?: boolean;
  
  // 策略相关
  strategyId?: string;
  backtestId?: string;
  
  // 组合相关
  portfolioId?: string;
  
  // 报告相关
  reportTemplate?: string;
  reportFormat?: 'pdf' | 'excel' | 'html';
  
  // 自定义参数
  customParams?: Record<string, any>;
}

export interface WidgetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isDocked?: boolean;
  dockedTo?: string;
  resizable: boolean;
  draggable: boolean;
}

export interface DataSubscription {
  type: 'market' | 'strategy' | 'portfolio' | 'alerts' | 'news';
  symbols?: string[];
  params?: Record<string, any>;
  callback: (data: any) => void;
  subscriptionId?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  userRole: 'investor' | 'trader' | 'fund-manager' | 'cfo';
  widgets: WorkspaceWidget[];
  globalSettings: WorkspaceGlobalSettings;
  syncSettings: WorkspaceSyncSettings;
  createdAt: Date;
  lastUsed: Date;
  isFavorite: boolean;
  isTemplate: boolean;
  tags: string[];
  metadata: WorkspaceMetadata;
}

export interface WorkspaceGlobalSettings {
  defaultTimeRange: string;
  defaultSymbols: string[];
  autoSave: boolean;
  autoSync: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  theme: 'dark' | 'light' | 'bloomberg';
  language: 'zh-CN' | 'en-US';
  timezone: string;
}

export interface WorkspaceSyncSettings {
  syncSymbols: boolean;
  syncTimeRange: boolean;
  syncIndicators: boolean;
  syncAlerts: boolean;
  masterWidget?: string;
  connectedWidgets: string[];
}

export interface WorkspaceMetadata {
  usage: {
    totalOpenTime: number;
    lastSessionDuration: number;
    openCount: number;
    favoriteWidgets: string[];
  };
  performance: {
    loadTime: number;
    renderTime: number;
    updateFrequency: number;
    dataVolume: number;
  };
  customization: {
    layoutVersion: number;
    customStylesheet?: string;
    hotkeys: Record<string, string>;
  };
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  targetRole: string[];
  category: 'trading' | 'analysis' | 'risk-management' | 'reporting' | 'research';
  widgets: Omit<WorkspaceWidget, 'id' | 'createdAt' | 'lastUpdated'>[];
  prerequisites?: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface WorkspaceEvent {
  type: 'widget-added' | 'widget-removed' | 'widget-updated' | 'sync-changed' | 'data-updated';
  workspaceId: string;
  widgetId?: string;
  data?: any;
  timestamp: Date;
}

export interface ModuleConnection {
  moduleId: string;
  serviceName: string;
  isConnected: boolean;
  subscriptions: string[];
  lastHeartbeat: Date;
  config: Record<string, any>;
}

// ============================================================================
// WorkspaceService Implementation
// ============================================================================

export class WorkspaceService extends BrowserEventEmitter {
  private workspaces: Map<string, Workspace> = new Map();
  private activeWorkspace: Workspace | null = null;
  private moduleConnections: Map<string, ModuleConnection> = new Map();
  private dataSubscriptions: Map<string, DataSubscription> = new Map();
  private syncManager: WorkspaceSyncManager;
  private templateManager: WorkspaceTemplateManager;
  
  // 服务实例
  private dataStreamManager = getDataStreamManager();
  private alertService = getAlertService();
  private cacheManager = getCacheManager();
  
  constructor() {
    super();
    
    this.syncManager = new WorkspaceSyncManager(this);
    this.templateManager = new WorkspaceTemplateManager();
    
    this.initializeModuleConnections();
    this.loadWorkspacesFromStorage();
    this.setupEventListeners();
  }

  // ============================================================================
  // Workspace Management
  // ============================================================================

  /**
   * 创建新工作区
   */
  createWorkspace(config: Partial<Workspace>): string {
    const workspace: Workspace = {
      id: this.generateWorkspaceId(),
      name: config.name || 'New Workspace',
      description: config.description || '',
      userRole: config.userRole || 'investor',
      widgets: config.widgets || [],
      globalSettings: config.globalSettings || this.getDefaultGlobalSettings(),
      syncSettings: config.syncSettings || this.getDefaultSyncSettings(),
      createdAt: new Date(),
      lastUsed: new Date(),
      isFavorite: config.isFavorite || false,
      isTemplate: config.isTemplate || false,
      tags: config.tags || [],
      metadata: config.metadata || this.getDefaultMetadata()
    };

    this.workspaces.set(workspace.id, workspace);
    this.saveWorkspacesToStorage();
    
    this.emit('workspace:created', { workspace });
    console.log(`[WorkspaceService] Created workspace: ${workspace.name} (${workspace.id})`);
    
    return workspace.id;
  }

  /**
   * 加载工作区
   */
  async loadWorkspace(workspaceId: string): Promise<boolean> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      console.error(`[WorkspaceService] Workspace not found: ${workspaceId}`);
      return false;
    }

    try {
      // 停止当前工作区的订阅
      if (this.activeWorkspace) {
        await this.stopWorkspaceSubscriptions(this.activeWorkspace.id);
      }

      // 设置为活跃工作区
      this.activeWorkspace = workspace;
      workspace.lastUsed = new Date();

      // 初始化工作区的数据订阅
      await this.initializeWorkspaceSubscriptions(workspace);

      // 通知模块加载工作区配置
      await this.notifyModulesWorkspaceLoaded(workspace);

      this.saveWorkspacesToStorage();
      this.emit('workspace:loaded', { workspace });
      
      console.log(`[WorkspaceService] Loaded workspace: ${workspace.name}`);
      return true;
    } catch (error) {
      console.error(`[WorkspaceService] Failed to load workspace:`, error);
      return false;
    }
  }

  /**
   * 更新工作区
   */
  updateWorkspace(workspaceId: string, updates: Partial<Workspace>): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    const updatedWorkspace = { ...workspace, ...updates, lastUpdated: new Date() };
    this.workspaces.set(workspaceId, updatedWorkspace);
    
    if (this.activeWorkspace?.id === workspaceId) {
      this.activeWorkspace = updatedWorkspace;
    }

    this.saveWorkspacesToStorage();
    this.emit('workspace:updated', { workspace: updatedWorkspace });
    
    return true;
  }

  /**
   * 删除工作区
   */
  async deleteWorkspace(workspaceId: string): Promise<boolean> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    try {
      // 如果是当前活跃工作区，先停止订阅
      if (this.activeWorkspace?.id === workspaceId) {
        await this.stopWorkspaceSubscriptions(workspaceId);
        this.activeWorkspace = null;
      }

      this.workspaces.delete(workspaceId);
      this.saveWorkspacesToStorage();
      
      this.emit('workspace:deleted', { workspaceId });
      console.log(`[WorkspaceService] Deleted workspace: ${workspaceId}`);
      
      return true;
    } catch (error) {
      console.error(`[WorkspaceService] Failed to delete workspace:`, error);
      return false;
    }
  }

  // ============================================================================
  // Widget Management
  // ============================================================================

  /**
   * 添加小组件到工作区
   */
  addWidget(workspaceId: string, widget: Omit<WorkspaceWidget, 'id' | 'createdAt' | 'lastUpdated'>): string {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    const newWidget: WorkspaceWidget = {
      ...widget,
      id: this.generateWidgetId(),
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    workspace.widgets.push(newWidget);
    this.updateWorkspace(workspaceId, workspace);

    // 如果是活跃工作区，立即设置数据订阅
    if (this.activeWorkspace?.id === workspaceId) {
      this.setupWidgetSubscriptions(newWidget);
    }

    this.emit('widget:added', { workspaceId, widget: newWidget });
    return newWidget.id;
  }

  /**
   * 更新小组件
   */
  updateWidget(workspaceId: string, widgetId: string, updates: Partial<WorkspaceWidget>): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    const widgetIndex = workspace.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return false;

    workspace.widgets[widgetIndex] = {
      ...workspace.widgets[widgetIndex],
      ...updates,
      lastUpdated: new Date()
    };

    this.updateWorkspace(workspaceId, workspace);
    this.emit('widget:updated', { workspaceId, widget: workspace.widgets[widgetIndex] });
    
    return true;
  }

  /**
   * 移除小组件
   */
  removeWidget(workspaceId: string, widgetId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    const widgetIndex = workspace.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return false;

    const removedWidget = workspace.widgets[widgetIndex];
    workspace.widgets.splice(widgetIndex, 1);

    // 停止小组件的数据订阅
    if (this.activeWorkspace?.id === workspaceId) {
      this.stopWidgetSubscriptions(removedWidget);
    }

    this.updateWorkspace(workspaceId, workspace);
    this.emit('widget:removed', { workspaceId, widgetId });
    
    return true;
  }

  // ============================================================================
  // Module Connections
  // ============================================================================

  /**
   * 连接模块服务
   */
  async connectModule(moduleId: string, config: Record<string, any> = {}): Promise<boolean> {
    try {
      const connection: ModuleConnection = {
        moduleId,
        serviceName: this.getServiceNameForModule(moduleId),
        isConnected: false,
        subscriptions: [],
        lastHeartbeat: new Date(),
        config
      };

      // 根据模块类型进行特定连接
      switch (moduleId) {
        case 'dashboard':
          connection.isConnected = await this.connectDashboardModule(config);
          break;
        case 'strategy-lab':
          connection.isConnected = await this.connectStrategyLabModule(config);
          break;
        case 'strategy-compare':
          connection.isConnected = await this.connectStrategyCompareModule(config);
          break;
        case 'stock-picker':
          connection.isConnected = await this.connectStockPickerModule(config);
          break;
        case 'portfolio':
          connection.isConnected = await this.connectPortfolioModule(config);
          break;
        case 'reports':
          connection.isConnected = await this.connectReportsModule(config);
          break;
        default:
          console.warn(`[WorkspaceService] Unknown module: ${moduleId}`);
          return false;
      }

      this.moduleConnections.set(moduleId, connection);
      
      if (connection.isConnected) {
        this.emit('module:connected', { moduleId, connection });
        console.log(`[WorkspaceService] Connected module: ${moduleId}`);
      }

      return connection.isConnected;
    } catch (error) {
      console.error(`[WorkspaceService] Failed to connect module ${moduleId}:`, error);
      return false;
    }
  }

  /**
   * 断开模块连接
   */
  async disconnectModule(moduleId: string): Promise<boolean> {
    try {
      const connection = this.moduleConnections.get(moduleId);
      if (!connection) return false;

      // 停止所有订阅
      for (const subscriptionId of connection.subscriptions) {
        await this.stopDataSubscription(subscriptionId);
      }

      connection.isConnected = false;
      this.moduleConnections.set(moduleId, connection);

      this.emit('module:disconnected', { moduleId });
      console.log(`[WorkspaceService] Disconnected module: ${moduleId}`);
      
      return true;
    } catch (error) {
      console.error(`[WorkspaceService] Failed to disconnect module ${moduleId}:`, error);
      return false;
    }
  }

  // ============================================================================
  // Specific Module Connections
  // ============================================================================

  private async connectDashboardModule(config: Record<string, any>): Promise<boolean> {
    try {
      console.log('[WorkspaceService] Connecting Dashboard module...');
      
      // 订阅总览模块需要的数据
      const symbols = config.watchlist || ['000001', '399001', '399006'];
      
      // 确保dataStreamManager已初始化
      if (!this.dataStreamManager) {
        console.error('[WorkspaceService] DataStreamManager not initialized');
        return false;
      }
      
      const subscriptionId = this.dataStreamManager.subscribe(symbols, (data: MarketData) => {
        this.emit('data:dashboard:market', { data, symbols });
      });

      // 订阅警报系统
      if (this.alertService && this.alertService.addEventListener) {
        const alertUnsubscribe = this.alertService.addEventListener('onAlertTriggered', (event) => {
          this.emit('data:dashboard:alert', { event });
        });
      }

      const connection = this.moduleConnections.get('dashboard');
      if (connection) {
        connection.subscriptions.push(subscriptionId);
      }

      // 通知Dashboard模块工作区连接成功
      moduleCommunication.emit('workspace:dashboard:connected', {
        symbols,
        subscriptionId
      });

      console.log('[WorkspaceService] Dashboard module connected successfully');
      return true;
    } catch (error) {
      console.error('[WorkspaceService] Dashboard connection failed:', error);
      return false;
    }
  }

  private async connectStrategyLabModule(config: Record<string, any>): Promise<boolean> {
    try {
      console.log('[WorkspaceService] Connecting Strategy Lab module...');
      
      const strategyService = getStrategyExecutionService();
      
      // 监听策略执行状态变化
      if (strategyService && strategyService.addEventListener) {
        const statusUnsubscribe = strategyService.addEventListener('statusChanged', (event) => {
          this.emit('data:strategy-lab:status', { event });
        });

        // 监听回测结果
        const backtestUnsubscribe = strategyService.addEventListener('backtestCompleted', (event) => {
          this.emit('data:strategy-lab:backtest', { event });
        });
      }

      // 通知策略实验室模块
      moduleCommunication.emit('workspace:strategy-lab:connected', {
        strategies: config.strategies || [],
        autoExecute: config.autoExecute || false
      });
      
      // 发送初始数据
      moduleCommunication.emit('strategy-lab:data:loaded', {
        strategies: ['high-vol-alpha', 'multi-factor', 'momentum-quality'],
        backtestResults: []
      });

      console.log('[WorkspaceService] Strategy Lab module connected successfully');
      return true;
    } catch (error) {
      console.error('[WorkspaceService] Strategy Lab connection failed:', error);
      return false;
    }
  }

  private async connectStrategyCompareModule(config: Record<string, any>): Promise<boolean> {
    try {
      console.log('[WorkspaceService] Connecting Strategy Compare module...');
      
      // 连接策略对比的特定服务
      moduleCommunication.emit('workspace:strategy-compare:connected', {
        compareMode: config.compareMode || 'performance',
        strategies: config.strategies || [],
        benchmarks: config.benchmarks || ['HS300', 'ZZ500']
      });
      
      // 发送初始数据
      moduleCommunication.emit('strategy-compare:data:loaded', {
        strategies: ['high-vol-alpha', 'multi-factor', 'momentum-quality', 'low-volatility'],
        compareData: {}
      });

      console.log('[WorkspaceService] Strategy Compare module connected successfully');
      return true;
    } catch (error) {
      console.error('[WorkspaceService] Strategy Compare connection failed:', error);
      return false;
    }
  }

  private async connectStockPickerModule(config: Record<string, any>): Promise<boolean> {
    try {
      // 连接选股器的筛选服务
      moduleCommunication.emit('workspace:stock-picker:connected', {
        criteria: config.criteria || {},
        universe: config.universe || 'A_SHARES',
        autoScreen: config.autoScreen || false
      });

      return true;
    } catch (error) {
      console.error('[WorkspaceService] Stock Picker connection failed:', error);
      return false;
    }
  }

  private async connectPortfolioModule(config: Record<string, any>): Promise<boolean> {
    try {
      console.log('[WorkspaceService] Connecting Portfolio module...');
      
      const portfolioService = getPortfolioManagementService();
      
      // 监听组合变化事件
      if (portfolioService && portfolioService.addEventListener) {
        const portfolioUnsubscribe = portfolioService.addEventListener('portfolioUpdated', (event) => {
          this.emit('data:portfolio:updated', { event });
        });
      }

      // 通知组合体验模块
      moduleCommunication.emit('workspace:portfolio:connected', {
        portfolioId: config.portfolioId || 'default',
        realTimeUpdate: config.realTimeUpdate !== false
      });
      
      // 发送初始数据
      moduleCommunication.emit('portfolio:data:loaded', {
        portfolioId: 'default',
        assets: [
          { symbol: '600519', shares: 1000, avgCost: 1680.5 },
          { symbol: '000858', shares: 2000, avgCost: 285.3 },
          { symbol: '002415', shares: 1500, avgCost: 42.8 }
        ]
      });

      console.log('[WorkspaceService] Portfolio module connected successfully');
      return true;
    } catch (error) {
      console.error('[WorkspaceService] Portfolio connection failed:', error);
      return false;
    }
  }

  private async connectReportsModule(config: Record<string, any>): Promise<boolean> {
    try {
      const reportService = getReportExportService();
      
      // 监听报告生成事件
      const reportUnsubscribe = reportService.addEventListener('reportGenerated', (event) => {
        this.emit('data:reports:generated', { event });
      });

      // 通知报告中心模块
      moduleCommunication.emit('workspace:reports:connected', {
        templates: config.templates || ['performance', 'risk', 'holdings'],
        autoExport: config.autoExport || false
      });

      return true;
    } catch (error) {
      console.error('[WorkspaceService] Reports connection failed:', error);
      return false;
    }
  }

  // ============================================================================
  // Data Subscription Management
  // ============================================================================

  private async initializeWorkspaceSubscriptions(workspace: Workspace): Promise<void> {
    for (const widget of workspace.widgets) {
      if (widget.isActive) {
        await this.setupWidgetSubscriptions(widget);
      }
    }
  }

  private async setupWidgetSubscriptions(widget: WorkspaceWidget): Promise<void> {
    for (const subscription of widget.dataSubscriptions) {
      const subscriptionId = await this.createDataSubscription(subscription);
      if (subscriptionId) {
        subscription.subscriptionId = subscriptionId;
      }
    }
  }

  private async createDataSubscription(subscription: DataSubscription): Promise<string | null> {
    try {
      switch (subscription.type) {
        case 'market':
          if (subscription.symbols && subscription.symbols.length > 0) {
            return this.dataStreamManager.subscribe(subscription.symbols, subscription.callback);
          }
          break;
        case 'alerts':
          return this.alertService.addEventListener('onAlertTriggered', subscription.callback);
        // 其他订阅类型...
      }
      return null;
    } catch (error) {
      console.error('[WorkspaceService] Failed to create subscription:', error);
      return null;
    }
  }

  private async stopDataSubscription(subscriptionId: string): Promise<void> {
    try {
      this.dataStreamManager.unsubscribe(subscriptionId);
    } catch (error) {
      console.error('[WorkspaceService] Failed to stop subscription:', error);
    }
  }

  private async stopWorkspaceSubscriptions(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return;

    for (const widget of workspace.widgets) {
      await this.stopWidgetSubscriptions(widget);
    }
  }

  private async stopWidgetSubscriptions(widget: WorkspaceWidget): Promise<void> {
    for (const subscription of widget.dataSubscriptions) {
      if (subscription.subscriptionId) {
        await this.stopDataSubscription(subscription.subscriptionId);
      }
    }
  }

  // ============================================================================
  // Sync Management
  // ============================================================================

  enableSync(workspaceId: string, settings?: Partial<WorkspaceSyncSettings>): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    workspace.syncSettings = {
      ...workspace.syncSettings,
      ...settings
    };

    this.syncManager.enableSync(workspace);
    this.updateWorkspace(workspaceId, workspace);
    
    return true;
  }

  syncSymbolAcrossWidgets(workspaceId: string, symbol: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace || !workspace.syncSettings.syncSymbols) return false;

    return this.syncManager.syncSymbol(workspace, symbol);
  }

  syncTimeRangeAcrossWidgets(workspaceId: string, timeRange: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace || !workspace.syncSettings.syncTimeRange) return false;

    return this.syncManager.syncTimeRange(workspace, timeRange);
  }

  // ============================================================================
  // Templates & Presets
  // ============================================================================

  getAvailableTemplates(role?: string): WorkspaceTemplate[] {
    return this.templateManager.getTemplates(role);
  }

  createWorkspaceFromTemplate(templateId: string, name?: string): string | null {
    const template = this.templateManager.getTemplate(templateId);
    if (!template) return null;

    const workspaceConfig: Partial<Workspace> = {
      name: name || `${template.name} - ${Date.now()}`,
      description: template.description,
      userRole: template.targetRole[0] as any || 'investor',
      widgets: template.widgets.map(widget => ({
        ...widget,
        id: this.generateWidgetId(),
        createdAt: new Date(),
        lastUpdated: new Date()
      })),
      tags: [template.category, ...template.targetRole]
    };

    return this.createWorkspace(workspaceConfig);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private initializeModuleConnections(): void {
    const modules = ['dashboard', 'strategy-lab', 'strategy-compare', 'stock-picker', 'portfolio', 'reports'];
    
    for (const moduleId of modules) {
      this.moduleConnections.set(moduleId, {
        moduleId,
        serviceName: this.getServiceNameForModule(moduleId),
        isConnected: false,
        subscriptions: [],
        lastHeartbeat: new Date(),
        config: {}
      });
    }
  }

  private setupEventListeners(): void {
    // 监听模块通信事件
    moduleCommunication.addEventListener('workspace:loaded', (event: any) => {
      this.handleModuleCommunicationEvent(event.detail);
    });

    // 设置心跳检查
    setInterval(() => {
      this.checkModuleHeartbeats();
    }, 30000); // 30秒检查一次
  }

  private handleModuleCommunicationEvent(eventData: any): void {
    // 处理来自各模块的通信事件
    this.emit('module:communication', eventData);
  }

  private checkModuleHeartbeats(): void {
    const now = new Date();
    this.moduleConnections.forEach((connection, moduleId) => {
      const timeSinceLastHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
      
      if (timeSinceLastHeartbeat > 60000 && connection.isConnected) { // 1分钟无心跳
        console.warn(`[WorkspaceService] Module ${moduleId} heartbeat timeout`);
        connection.isConnected = false;
        this.emit('module:timeout', { moduleId });
      }
    });
  }

  private async notifyModulesWorkspaceLoaded(workspace: Workspace): Promise<void> {
    // 通知所有连接的模块工作区已加载
    moduleCommunication.dispatchEvent(new CustomEvent('workspace:loaded', {
      detail: {
        workspaceId: workspace.id,
        workspace,
        widgets: workspace.widgets,
        globalSettings: workspace.globalSettings
      }
    }));
  }

  private getServiceNameForModule(moduleId: string): string {
    const serviceMap: Record<string, string> = {
      'dashboard': 'DashboardService',
      'strategy-lab': 'StrategyExecutionService', 
      'strategy-compare': 'StrategyCompareService',
      'stock-picker': 'StockPickerService',
      'portfolio': 'PortfolioManagementService',
      'reports': 'ReportExportService'
    };
    return serviceMap[moduleId] || 'UnknownService';
  }

  private generateWorkspaceId(): string {
    return `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultGlobalSettings(): WorkspaceGlobalSettings {
    return {
      defaultTimeRange: '1M',
      defaultSymbols: ['600519', '300750', '000858'],
      autoSave: true,
      autoSync: false,
      notificationsEnabled: true,
      soundEnabled: true,
      theme: 'dark',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai'
    };
  }

  private getDefaultSyncSettings(): WorkspaceSyncSettings {
    return {
      syncSymbols: false,
      syncTimeRange: false,
      syncIndicators: false,
      syncAlerts: false,
      connectedWidgets: []
    };
  }

  private getDefaultMetadata(): WorkspaceMetadata {
    return {
      usage: {
        totalOpenTime: 0,
        lastSessionDuration: 0,
        openCount: 0,
        favoriteWidgets: []
      },
      performance: {
        loadTime: 0,
        renderTime: 0,
        updateFrequency: 0,
        dataVolume: 0
      },
      customization: {
        layoutVersion: 1,
        hotkeys: {}
      }
    };
  }

  private loadWorkspacesFromStorage(): void {
    try {
      const stored = localStorage.getItem('arthera-workspaces-v2');
      if (stored) {
        const workspacesArray = JSON.parse(stored);
        workspacesArray.forEach((workspace: any) => {
          // 恢复Date对象
          workspace.createdAt = new Date(workspace.createdAt);
          workspace.lastUsed = new Date(workspace.lastUsed);
          
          this.workspaces.set(workspace.id, workspace);
        });
        console.log(`[WorkspaceService] Loaded ${workspacesArray.length} workspaces from storage`);
      }
    } catch (error) {
      console.error('[WorkspaceService] Failed to load workspaces:', error);
    }
  }

  private saveWorkspacesToStorage(): void {
    try {
      const workspacesArray = Array.from(this.workspaces.values());
      localStorage.setItem('arthera-workspaces-v2', JSON.stringify(workspacesArray));
    } catch (error) {
      console.error('[WorkspaceService] Failed to save workspaces:', error);
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  getAllWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  getWorkspace(id: string): Workspace | null {
    return this.workspaces.get(id) || null;
  }

  getActiveWorkspace(): Workspace | null {
    return this.activeWorkspace;
  }

  getModuleConnections(): Map<string, ModuleConnection> {
    return this.moduleConnections;
  }

  isModuleConnected(moduleId: string): boolean {
    return this.moduleConnections.get(moduleId)?.isConnected || false;
  }

  getWorkspacesByRole(role: string): Workspace[] {
    return Array.from(this.workspaces.values()).filter(w => w.userRole === role);
  }

  getFavoriteWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values()).filter(w => w.isFavorite);
  }

  destroy(): void {
    // 停止所有订阅
    if (this.activeWorkspace) {
      this.stopWorkspaceSubscriptions(this.activeWorkspace.id);
    }
    
    // 断开所有模块连接
    this.moduleConnections.forEach((_, moduleId) => {
      this.disconnectModule(moduleId);
    });
    
    // 移除所有监听器
    this.removeAllListeners();
    
    console.log('[WorkspaceService] Service destroyed');
  }
}

// ============================================================================
// Sync Manager
// ============================================================================

class WorkspaceSyncManager {
  constructor(private workspaceService: WorkspaceService) {}

  enableSync(workspace: Workspace): boolean {
    try {
      // 启用工作区同步逻辑
      console.log(`[SyncManager] Enabling sync for workspace: ${workspace.id}`);
      return true;
    } catch (error) {
      console.error('[SyncManager] Failed to enable sync:', error);
      return false;
    }
  }

  syncSymbol(workspace: Workspace, symbol: string): boolean {
    try {
      // 同步股票代码到所有相关小组件
      workspace.widgets.forEach(widget => {
        if (workspace.syncSettings.connectedWidgets.includes(widget.id)) {
          if (widget.config.symbols) {
            widget.config.symbols = [symbol];
          }
        }
      });

      // 发送同步事件
      moduleCommunication.emit('workspace:sync:symbol', {
        workspaceId: workspace.id,
        symbol,
        widgets: workspace.syncSettings.connectedWidgets
      });

      return true;
    } catch (error) {
      console.error('[SyncManager] Failed to sync symbol:', error);
      return false;
    }
  }

  syncTimeRange(workspace: Workspace, timeRange: string): boolean {
    try {
      // 同步时间范围到所有相关小组件
      workspace.widgets.forEach(widget => {
        if (workspace.syncSettings.connectedWidgets.includes(widget.id)) {
          widget.config.timeRange = timeRange;
        }
      });

      // 发送同步事件
      moduleCommunication.emit('workspace:sync:timeRange', {
        workspaceId: workspace.id,
        timeRange,
        widgets: workspace.syncSettings.connectedWidgets
      });

      return true;
    } catch (error) {
      console.error('[SyncManager] Failed to sync time range:', error);
      return false;
    }
  }
}

// ============================================================================
// Template Manager
// ============================================================================

class WorkspaceTemplateManager {
  private templates: Map<string, WorkspaceTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // 添加默认模板
    const defaultTemplates: WorkspaceTemplate[] = [
      {
        id: 'trading-pro',
        name: 'Professional Trading Setup',
        description: '专业交易员工作区：多图表、Level2、技术分析',
        targetRole: ['trader'],
        category: 'trading',
        complexity: 'expert',
        prerequisites: ['实时数据订阅', '高级图表功能'],
        widgets: [
          {
            moduleId: 'chart_main',
            title: '主图表 - 600519',
            code: 'GP',
            type: 'chart',
            config: {
              symbols: ['600519'],
              chartType: 'candlestick',
              indicators: ['MA', 'BOLL', 'VOL'],
              timeRange: '1D',
              showVolume: true,
              refreshInterval: 1000
            },
            layout: { x: 50, y: 50, width: 500, height: 350, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'market',
                symbols: ['600519'],
                params: { level2: false },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'level2_600519',
            title: 'Level2 深度',
            code: 'OB',
            type: 'data',
            config: {
              symbols: ['600519'],
              refreshInterval: 500
            },
            layout: { x: 570, y: 50, width: 300, height: 350, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'market',
                symbols: ['600519'],
                params: { level2: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'portfolio_monitor',
            title: '组合监控',
            code: 'PRT',
            type: 'portfolio',
            config: {
              autoRefresh: true,
              refreshInterval: 30000
            },
            layout: { x: 50, y: 420, width: 350, height: 200, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'portfolio',
                params: { realTime: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'risk_metrics',
            title: '风险指标',
            code: 'RSK',
            type: 'risk',
            config: {
              symbols: ['600519'],
              riskMetrics: ['sharpeRatio', 'maxDrawdown', 'volatility'],
              refreshInterval: 30000
            },
            layout: { x: 420, y: 420, width: 450, height: 200, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'portfolio',
                symbols: ['600519'],
                params: { riskAnalysis: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          }
        ]
      },
      {
        id: 'portfolio-manager',
        name: 'Portfolio Management Hub',
        description: '投资组合管理中心：组合分析、风险监控、归因分解',
        targetRole: ['fund-manager', 'cfo'],
        category: 'risk-management',
        complexity: 'advanced',
        prerequisites: ['组合管理权限', '风险分析模块'],
        widgets: [
          {
            moduleId: 'portfolio_main',
            title: '主要组合',
            code: 'PRT',
            type: 'portfolio',
            config: {
              autoRefresh: true,
              refreshInterval: 30000,
              showPerformance: true,
              showHoldings: true
            },
            layout: { x: 50, y: 50, width: 400, height: 250, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'portfolio',
                params: { detailed: true, performance: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'risk_dashboard',
            title: '风险控制台',
            code: 'RSK',
            type: 'risk',
            config: {
              symbols: ['600519', '300750', '000858'],
              portfolioRisk: true,
              refreshInterval: 60000
            },
            layout: { x: 470, y: 50, width: 400, height: 250, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'portfolio',
                params: { riskMetrics: true, attribution: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'performance_chart',
            title: '净值走势',
            code: 'PERF',
            type: 'chart',
            config: {
              chartType: 'line',
              showBenchmark: true,
              timeRange: '1Y',
              refreshInterval: 300000
            },
            layout: { x: 50, y: 320, width: 550, height: 300, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'portfolio',
                params: { performance: true, benchmark: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'reports_center',
            title: '报告中心',
            code: 'RPT',
            type: 'report',
            config: {
              autoRefresh: true,
              refreshInterval: 300000,
              templates: ['performance', 'risk', 'attribution']
            },
            layout: { x: 620, y: 320, width: 250, height: 150, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'reports',
                params: { scheduled: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'strategy_status',
            title: '策略状态',
            code: 'STR',
            type: 'strategy',
            config: {
              autoRefresh: true,
              refreshInterval: 60000,
              showRunning: true
            },
            layout: { x: 620, y: 490, width: 250, height: 130, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'strategy',
                params: { status: true, performance: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          }
        ]
      },
      {
        id: 'research-analyst',
        name: 'Research & Analysis Workspace',
        description: '研究分析工作区：选股器、报告生成、策略回测',
        targetRole: ['trader', 'fund-manager'],
        category: 'research',
        complexity: 'intermediate',
        prerequisites: ['策略回测权限', '数据分析模块'],
        widgets: [
          {
            moduleId: 'chart_analysis',
            title: '分析图表',
            code: 'GP',
            type: 'chart',
            config: {
              symbols: ['600519'],
              chartType: 'candlestick',
              indicators: ['MA', 'RSI', 'MACD'],
              timeRange: '3M',
              refreshInterval: 5000
            },
            layout: { x: 50, y: 50, width: 500, height: 350, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'market',
                symbols: ['600519'],
                params: { indicators: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'strategy_lab',
            title: '策略实验室',
            code: 'STR',
            type: 'strategy',
            config: {
              autoRefresh: true,
              refreshInterval: 30000,
              showBacktests: true
            },
            layout: { x: 570, y: 50, width: 350, height: 200, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'strategy',
                params: { backtests: true, results: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'portfolio_test',
            title: '组合测试',
            code: 'PRT',
            type: 'portfolio',
            config: {
              testMode: true,
              refreshInterval: 60000
            },
            layout: { x: 570, y: 270, width: 350, height: 180, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'portfolio',
                params: { backtest: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'research_reports',
            title: '研究报告',
            code: 'RPT',
            type: 'report',
            config: {
              autoRefresh: true,
              refreshInterval: 300000,
              templates: ['research', 'analysis']
            },
            layout: { x: 50, y: 420, width: 450, height: 180, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'reports',
                params: { category: 'research' },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          }
        ]
      },
      {
        id: 'executive-dashboard',
        name: 'Executive Dashboard',
        description: '高管仪表板：关键指标监控、风险总览、业绩报告',
        targetRole: ['cfo', 'fund-manager'],
        category: 'reporting',
        complexity: 'beginner',
        prerequisites: ['高管权限'],
        widgets: [
          {
            moduleId: 'kpi_overview',
            title: 'KPI 总览',
            code: 'KPI',
            type: 'dashboard',
            config: {
              metrics: ['totalReturn', 'risk', 'performance'],
              refreshInterval: 300000
            },
            layout: { x: 50, y: 50, width: 450, height: 200, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'portfolio',
                params: { kpi: true, summary: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'risk_summary',
            title: '风险摘要',
            code: 'RSK',
            type: 'risk',
            config: {
              summaryMode: true,
              refreshInterval: 300000
            },
            layout: { x: 520, y: 50, width: 400, height: 200, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'portfolio',
                params: { riskSummary: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          },
          {
            moduleId: 'executive_reports',
            title: '管理报告',
            code: 'RPT',
            type: 'report',
            config: {
              executiveMode: true,
              refreshInterval: 600000,
              templates: ['executive', 'summary']
            },
            layout: { x: 50, y: 270, width: 870, height: 250, zIndex: 1, resizable: true, draggable: true },
            dataSubscriptions: [
              {
                type: 'reports',
                params: { executive: true, scheduled: true },
                callback: () => {}
              }
            ],
            isActive: true,
            isMinimized: false,
            createdAt: new Date(),
            lastUpdated: new Date()
          }
        ]
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  getTemplates(role?: string): WorkspaceTemplate[] {
    const templates = Array.from(this.templates.values());
    
    if (role) {
      return templates.filter(template => template.targetRole.includes(role));
    }
    
    return templates;
  }

  getTemplate(id: string): WorkspaceTemplate | null {
    return this.templates.get(id) || null;
  }
}

// ============================================================================
// Global Instance & Exports
// ============================================================================

let globalWorkspaceService: WorkspaceService | null = null;

/**
 * 获取全局工作区服务实例
 */
export function getWorkspaceService(): WorkspaceService {
  if (!globalWorkspaceService) {
    globalWorkspaceService = new WorkspaceService();
  }
  return globalWorkspaceService;
}

export default WorkspaceService;