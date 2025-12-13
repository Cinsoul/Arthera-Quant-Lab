import { useState, ReactNode, useContext, createContext, useEffect } from 'react';
import { GripVertical, X, Maximize2, Minimize2, Settings, Link, Unlink, Activity } from 'lucide-react';
import { 
  getDataStreamManager, 
  useMarketData,
  getWorkspaceService,
  getPortfolioManagementService,
  getStrategyExecutionService,
  getReportExportService,
  getCacheManager,
  moduleCommunication,
  type MarketData,
  type Portfolio as PortfolioType,
  type BacktestResult,
  type ModuleConnection
} from '../services';
import { getRiskAnalysisService } from '../services/RiskAnalysisService';

// 多图表同步相关类型
export interface ChartSyncState {
  connectedWidgets: Set<string>;
  syncedSymbol: string | null;
  syncedTimeRange: { start: number; end: number } | null;
  syncEnabled: boolean;
  syncZoom: boolean;
  syncIndicators: boolean;
  masterWidget: string | null;
}

// 图表数据相关接口  
export interface ChartData {
  symbol?: string;
  timeRange?: { start: number; end: number };
  indicators?: string[];
  riskMetrics?: any;
}

export interface Widget {
  id: string;
  title: string;
  code: string; // Bloomberg function code
  content: ReactNode;
  defaultSize: { w: number; h: number };
  position: { x: number; y: number };
  size: { w: number; h: number };
  minimized?: boolean;
  // 新增：图表同步相关属性
  type?: 'chart' | 'risk' | 'data' | 'portfolio' | 'strategy' | 'report' | 'other';
  syncEnabled?: boolean;
  chartData?: ChartData;
  // 实时数据相关
  subscribedSymbols?: string[];
  updateInterval?: number;
  // 工作区服务集成
  workspaceId?: string;
  moduleConnection?: ModuleConnection;
  dataSubscriptions?: string[];
  realTimeData?: any;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

// 多图表同步上下文
interface ChartSyncContextValue {
  syncState: ChartSyncState;
  connectWidget: (widgetId: string) => void;
  disconnectWidget: (widgetId: string) => void;
  syncToSymbol: (symbol: string) => void;
  syncTimeRange: (range: { start: number; end: number }) => void;
  syncZoom: (zoomLevel: number) => void;
  syncIndicators: (indicators: string[]) => void;
  setMasterWidget: (widgetId: string) => void;
  toggleSync: () => void;
  toggleZoomSync: () => void;
  toggleIndicatorSync: () => void;
}

const ChartSyncContext = createContext<ChartSyncContextValue | null>(null);

// 增强的Widget内容组件 - 支持真实数据渲染
interface EnhancedWidgetContentProps {
  widget: Widget;
  globalSymbols: string[];
}

function EnhancedWidgetContent({ widget, globalSymbols }: EnhancedWidgetContentProps) {
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 服务实例
  const workspaceService = getWorkspaceService();
  const portfolioService = getPortfolioManagementService();
  const strategyService = getStrategyExecutionService();
  const reportService = getReportExportService();
  const cacheManager = getCacheManager();

  // 实时数据订阅
  const symbolsToSubscribe = widget.subscribedSymbols || globalSymbols || [];
  const { data: marketData } = useMarketData(symbolsToSubscribe, { 
    enableLevel2: false,
    autoConnect: widget.autoRefresh !== false 
  });

  // 根据Widget类型获取相应的真实数据
  useEffect(() => {
    const fetchWidgetData = async () => {
      if (!widget.autoRefresh) return;
      
      setLoading(true);
      setError(null);

      try {
        let data = null;
        
        switch (widget.type) {
          case 'portfolio':
            data = await fetchPortfolioData();
            break;
          case 'strategy': 
            data = await fetchStrategyData();
            break;
          case 'report':
            data = await fetchReportData();
            break;
          case 'chart':
            data = await fetchChartData();
            break;
          case 'risk':
            data = await fetchRiskData();
            break;
          default:
            data = widget.realTimeData;
        }

        setRealTimeData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '数据加载失败');
        console.error(`[Widget ${widget.id}] Data fetch error:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchWidgetData();

    // 设置定时刷新
    if (widget.refreshInterval && widget.autoRefresh) {
      const interval = setInterval(fetchWidgetData, widget.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [widget.id, widget.type, widget.refreshInterval, widget.autoRefresh]);

  // 获取组合数据
  const fetchPortfolioData = async () => {
    const cached = await cacheManager.get(`portfolio:${widget.id}`);
    if (cached) return cached;

    const portfolios = await portfolioService.getAllPortfolios();
    const data = portfolios.length > 0 ? portfolios[0] : null;
    
    if (data) {
      await cacheManager.set(`portfolio:${widget.id}`, data, 30);
    }
    
    return data;
  };

  // 获取策略数据
  const fetchStrategyData = async () => {
    const cached = await cacheManager.get(`strategy:${widget.id}`);
    if (cached) return cached;

    const strategies = await strategyService.getRunningStrategies();
    const backtests = await strategyService.getBacktestResults({ limit: 5 });
    
    const data = {
      runningStrategies: strategies,
      recentBacktests: backtests
    };
    
    await cacheManager.set(`strategy:${widget.id}`, data, 20);
    return data;
  };

  // 获取报告数据
  const fetchReportData = async () => {
    const cached = await cacheManager.get(`reports:${widget.id}`);
    if (cached) return cached;

    const reports = await reportService.getGeneratedReports({ limit: 10 });
    const scheduled = await reportService.getScheduledReports();
    
    const data = {
      recentReports: reports,
      scheduledReports: scheduled
    };
    
    await cacheManager.set(`reports:${widget.id}`, data, 60);
    return data;
  };

  // 获取图表数据
  const fetchChartData = async () => {
    if (symbolsToSubscribe.length === 0) return null;
    
    const symbol = symbolsToSubscribe[0];
    const cached = await cacheManager.get(`chart:${widget.id}:${symbol}`);
    if (cached) return cached;

    // 这里可以集成更多的图表数据源
    const data = {
      symbol,
      marketData: marketData.get(symbol),
      timestamp: new Date().toISOString()
    };
    
    await cacheManager.set(`chart:${widget.id}:${symbol}`, data, 10);
    return data;
  };

  // 获取风险数据
  const fetchRiskData = async () => {
    const cached = await cacheManager.get(`risk:${widget.id}`);
    if (cached) return cached;

    const riskService = getRiskAnalysisService();
    const portfolios = await portfolioService.getAllPortfolios();
    
    if (portfolios.length > 0) {
      const riskMetrics = await riskService.calculateRiskMetrics(portfolios[0].id);
      await cacheManager.set(`risk:${widget.id}`, riskMetrics, 30);
      return riskMetrics;
    }
    
    return null;
  };

  // 渲染内容
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-gray-400">
            <Activity className="w-4 h-4 animate-spin" />
            <span className="text-sm">加载数据中...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-400 text-sm mb-2">加载失败</div>
            <div className="text-gray-500 text-xs">{error}</div>
          </div>
        </div>
      );
    }

    // 如果有实时数据，则优先使用实时数据渲染
    if (realTimeData) {
      return renderRealTimeContent(realTimeData);
    }

    // 否则回退到原始内容
    return widget.content;
  };

  // 根据Widget类型渲染不同的实时内容
  const renderRealTimeContent = (data: any) => {
    switch (widget.type) {
      case 'portfolio':
        return renderPortfolioContent(data);
      case 'strategy':
        return renderStrategyContent(data);
      case 'report':
        return renderReportContent(data);
      case 'chart':
        return renderChartContent(data);
      case 'risk':
        return renderRiskContent(data);
      default:
        return <div className="text-gray-400 text-sm">实时数据: {JSON.stringify(data, null, 2)}</div>;
    }
  };

  // 组合内容渲染
  const renderPortfolioContent = (data: PortfolioType) => (
    <div className="space-y-3">
      <div className="text-lg font-medium text-gray-100">{data.name}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">总价值</div>
          <div className="text-sm text-green-400">¥{(data.totalValue / 10000).toFixed(2)}万</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">今日盈亏</div>
          <div className={`text-sm ${data.todayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.todayPnL >= 0 ? '+' : ''}{(data.todayPnL / 10000).toFixed(2)}万
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500">持仓 {data.holdings?.length || 0} 只</div>
    </div>
  );

  // 策略内容渲染
  const renderStrategyContent = (data: any) => (
    <div className="space-y-3">
      <div className="text-sm text-gray-100">策略状态</div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">运行中</span>
          <span className="text-green-400">{data.runningStrategies?.length || 0}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">最近回测</span>
          <span className="text-blue-400">{data.recentBacktests?.length || 0}</span>
        </div>
      </div>
    </div>
  );

  // 报告内容渲染
  const renderReportContent = (data: any) => (
    <div className="space-y-3">
      <div className="text-sm text-gray-100">报告概览</div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">已生成</span>
          <span className="text-blue-400">{data.recentReports?.length || 0}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">已调度</span>
          <span className="text-yellow-400">{data.scheduledReports?.length || 0}</span>
        </div>
      </div>
    </div>
  );

  // 图表内容渲染
  const renderChartContent = (data: any) => (
    <div className="space-y-3">
      <div className="text-sm text-gray-100">{data.symbol}</div>
      {data.marketData && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">最新价</span>
            <span className="text-blue-400">{data.marketData.price?.toFixed(2) || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">涨跌幅</span>
            <span className={`${(data.marketData.changePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data.marketData.changePercent ? `${data.marketData.changePercent.toFixed(2)}%` : 'N/A'}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  // 风险内容渲染
  const renderRiskContent = (data: any) => (
    <div className="space-y-3">
      <div className="text-sm text-gray-100">风险指标</div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">夏普比率</span>
          <span className="text-blue-400">{data?.sharpeRatio?.toFixed(2) || 'N/A'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">最大回撤</span>
          <span className="text-red-400">{data?.maxDrawdown ? `${(data.maxDrawdown * 100).toFixed(1)}%` : 'N/A'}</span>
        </div>
      </div>
    </div>
  );

  return renderContent();
}

interface WidgetLayoutProps {
  widgets: Widget[];
  onUpdateWidgets: (widgets: Widget[]) => void;
  onRemoveWidget: (id: string) => void;
  // 新增：同步相关属性
  enableSync?: boolean;
  globalSymbols?: string[];
}

// 图表同步提供者组件
export function ChartSyncProvider({ 
  children, 
  initialSymbols = [] 
}: { 
  children: ReactNode; 
  initialSymbols?: string[] 
}) {
  const [syncState, setSyncState] = useState<ChartSyncState>({
    connectedWidgets: new Set(),
    syncedSymbol: initialSymbols[0] || null,
    syncedTimeRange: null,
    syncEnabled: false,
    syncZoom: true,
    syncIndicators: false,
    masterWidget: null,
  });

  // 使用实时数据流
  const { data: marketData } = useMarketData(initialSymbols);

  const connectWidget = (widgetId: string) => {
    setSyncState(prev => ({
      ...prev,
      connectedWidgets: new Set([...prev.connectedWidgets, widgetId]),
    }));
  };

  const disconnectWidget = (widgetId: string) => {
    setSyncState(prev => {
      const newConnectedWidgets = new Set(prev.connectedWidgets);
      newConnectedWidgets.delete(widgetId);
      return {
        ...prev,
        connectedWidgets: newConnectedWidgets,
      };
    });
  };

  const syncToSymbol = (symbol: string) => {
    setSyncState(prev => ({
      ...prev,
      syncedSymbol: symbol,
    }));
  };

  const syncTimeRange = (range: { start: number; end: number }) => {
    setSyncState(prev => ({
      ...prev,
      syncedTimeRange: range,
    }));
  };

  const syncZoom = (zoomLevel: number) => {
    if (!syncState.syncZoom || !syncState.syncEnabled) return;
    
    // 广播缩放级别到所有连接的组件
    console.log(`[ChartSync] Broadcasting zoom level: ${zoomLevel} to ${syncState.connectedWidgets.size} widgets`);
  };

  const syncIndicators = (indicators: string[]) => {
    if (!syncState.syncIndicators || !syncState.syncEnabled) return;
    
    // 广播技术指标配置到所有连接的组件
    console.log(`[ChartSync] Broadcasting indicators: ${indicators.join(', ')} to ${syncState.connectedWidgets.size} widgets`);
  };

  const setMasterWidget = (widgetId: string) => {
    setSyncState(prev => ({
      ...prev,
      masterWidget: widgetId,
    }));
    console.log(`[ChartSync] Set master widget: ${widgetId}`);
  };

  const toggleSync = () => {
    setSyncState(prev => ({
      ...prev,
      syncEnabled: !prev.syncEnabled,
    }));
  };

  const toggleZoomSync = () => {
    setSyncState(prev => ({
      ...prev,
      syncZoom: !prev.syncZoom,
    }));
  };

  const toggleIndicatorSync = () => {
    setSyncState(prev => ({
      ...prev,
      syncIndicators: !prev.syncIndicators,
    }));
  };

  const contextValue: ChartSyncContextValue = {
    syncState,
    connectWidget,
    disconnectWidget,
    syncToSymbol,
    syncTimeRange,
    syncZoom,
    syncIndicators,
    setMasterWidget,
    toggleSync,
    toggleZoomSync,
    toggleIndicatorSync,
  };

  return (
    <ChartSyncContext.Provider value={contextValue}>
      {children}
    </ChartSyncContext.Provider>
  );
}

// Hook for using chart sync context
export function useChartSync() {
  const context = useContext(ChartSyncContext);
  if (!context) {
    throw new Error('useChartSync must be used within ChartSyncProvider');
  }
  return context;
}

export function WidgetLayout({ 
  widgets, 
  onUpdateWidgets, 
  onRemoveWidget, 
  enableSync = false, 
  globalSymbols = [] 
}: WidgetLayoutProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 尝试使用图表同步上下文（如果可用）
  const syncContext = useContext(ChartSyncContext);
  
  // 获取实时数据（如果提供了符号列表）
  const { data: marketData, status } = globalSymbols.length > 0 ? 
    useMarketData(globalSymbols) : 
    { data: new Map(), status: 'disconnected' as const };

  const handleDragStart = (e: React.MouseEvent, widget: Widget) => {
    setDraggingId(widget.id);
    setDragOffset({
      x: e.clientX - widget.position.x,
      y: e.clientY - widget.position.y,
    });
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (!draggingId) return;
    e.preventDefault();

    const newWidgets = widgets.map(w => {
      if (w.id === draggingId) {
        return {
          ...w,
          position: {
            x: Math.max(0, e.clientX - dragOffset.x),
            y: Math.max(0, e.clientY - dragOffset.y),
          },
        };
      }
      return w;
    });

    onUpdateWidgets(newWidgets);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const toggleMinimize = (id: string) => {
    const newWidgets = widgets.map(w => {
      if (w.id === id) {
        return { ...w, minimized: !w.minimized };
      }
      return w;
    });
    onUpdateWidgets(newWidgets);
  };

  const handleResize = (id: string, newSize: { w: number; h: number }) => {
    const newWidgets = widgets.map(w => {
      if (w.id === id) {
        return { ...w, size: newSize };
      }
      return w;
    });
    onUpdateWidgets(newWidgets);
  };

  // 切换widget的同步状态
  const toggleWidgetSync = (widgetId: string) => {
    if (!syncContext || !enableSync) return;
    
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const isConnected = syncContext.syncState.connectedWidgets.has(widgetId);
    
    if (isConnected) {
      syncContext.disconnectWidget(widgetId);
    } else {
      syncContext.connectWidget(widgetId);
    }
  };

  return (
    <div
      className="relative w-full h-full"
      onMouseMove={handleDrag}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
    >
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className={`absolute bg-[#0d1b2e] border border-[#1a2942] rounded-lg overflow-hidden shadow-lg transition-shadow ${
            draggingId === widget.id ? 'shadow-2xl panel-active z-50' : 'z-10'
          }`}
          style={{
            left: widget.position.x,
            top: widget.position.y,
            width: widget.minimized ? 300 : widget.size.w,
            height: widget.minimized ? 40 : widget.size.h,
            cursor: draggingId === widget.id ? 'grabbing' : 'default',
          }}
        >
          {/* Widget Header */}
          <div
            className="flex items-center justify-between px-3 py-2 bg-[#0a1628] border-b border-[#1a2942] cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => handleDragStart(e, widget)}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-600" />
              <span className="text-xs bloomberg-code text-[#f59e0b]">{widget.code}</span>
              <span className="text-sm text-gray-400">{widget.title}</span>
              
              {/* 实时数据状态指示器 */}
              {globalSymbols.length > 0 && widget.subscribedSymbols && (
                <div className="flex items-center gap-1">
                  <Activity 
                    className={`w-3 h-3 ${
                      status === 'connected' ? 'text-green-400 animate-pulse' : 'text-gray-500'
                    }`} 
                  />
                  <span className="text-xs text-gray-500">
                    {status === 'connected' ? '实时' : '离线'}
                  </span>
                </div>
              )}

              {/* 同步状态显示 */}
              {syncContext && widget.chartData?.symbol && (
                <div className="flex items-center gap-1">
                  <span className="text-xs px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                    {widget.chartData.symbol}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {/* 同步状态指示器 */}
              {syncContext && syncContext.syncState.connectedWidgets.has(widget.id) && (
                <div className="flex items-center gap-1">
                  {syncContext.syncState.masterWidget === widget.id && (
                    <div className="text-xs px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded" title="主控图表">
                      M
                    </div>
                  )}
                  {syncContext.syncState.syncZoom && (
                    <div className="text-xs text-blue-400" title="缩放同步">Z</div>
                  )}
                  {syncContext.syncState.syncIndicators && (
                    <div className="text-xs text-green-400" title="指标同步">I</div>
                  )}
                </div>
              )}
              
              {/* 图表同步按钮 */}
              {enableSync && syncContext && (widget.type === 'chart' || widget.type === 'risk') && (
                <div className="relative group">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWidgetSync(widget.id);
                    }}
                    className={`p-1 rounded transition-colors ${
                      syncContext.syncState.connectedWidgets.has(widget.id)
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'hover:bg-[#1a2942] text-gray-500'
                    }`}
                    title={syncContext.syncState.connectedWidgets.has(widget.id) ? '断开同步' : '启用同步'}
                  >
                    {syncContext.syncState.connectedWidgets.has(widget.id) ? (
                      <Link className="w-3.5 h-3.5" />
                    ) : (
                      <Unlink className="w-3.5 h-3.5" />
                    )}
                  </button>
                  
                  {/* 同步选项下拉菜单 */}
                  {syncContext.syncState.connectedWidgets.has(widget.id) && (
                    <div className="absolute top-full right-0 mt-1 w-32 bg-[#0d1b2e] border border-[#1a2942] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <div className="p-2 space-y-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            syncContext.setMasterWidget(widget.id);
                          }}
                          className="w-full text-left text-xs px-2 py-1 hover:bg-[#1a2942] rounded text-gray-300"
                        >
                          设为主控
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            syncContext.toggleZoomSync();
                          }}
                          className={`w-full text-left text-xs px-2 py-1 hover:bg-[#1a2942] rounded ${
                            syncContext.syncState.syncZoom ? 'text-blue-400' : 'text-gray-300'
                          }`}
                        >
                          {syncContext.syncState.syncZoom ? '✓' : ' '} 缩放同步
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            syncContext.toggleIndicatorSync();
                          }}
                          className={`w-full text-left text-xs px-2 py-1 hover:bg-[#1a2942] rounded ${
                            syncContext.syncState.syncIndicators ? 'text-green-400' : 'text-gray-300'
                          }`}
                        >
                          {syncContext.syncState.syncIndicators ? '✓' : ' '} 指标同步
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={() => toggleMinimize(widget.id)}
                className="p-1 hover:bg-[#1a2942] rounded transition-colors"
              >
                {widget.minimized ? (
                  <Maximize2 className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5 text-gray-500" />
                )}
              </button>
              <button
                onClick={() => onRemoveWidget(widget.id)}
                className="p-1 hover:bg-[#f97316]/20 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-500 hover:text-[#f97316]" />
              </button>
            </div>
          </div>

          {/* Widget Content */}
          {!widget.minimized && (
            <div className="p-4 overflow-auto" style={{ height: widget.size.h - 40 }}>
              <EnhancedWidgetContent widget={widget} globalSymbols={globalSymbols} />
            </div>
          )}

          {/* Resize Handle */}
          {!widget.minimized && (
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
              onMouseDown={(e) => {
                e.stopPropagation();
                setResizingId(widget.id);
              }}
            >
              <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-[#1a2942]" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Pre-built Widget Templates
export function createWidget(
  id: string,
  code: string,
  title: string,
  content: ReactNode,
  position: { x: number; y: number } = { x: 100, y: 100 },
  size: { w: number; h: number } = { w: 400, h: 300 },
  options?: {
    type?: 'chart' | 'risk' | 'data' | 'portfolio' | 'strategy' | 'report' | 'other';
    subscribedSymbols?: string[];
    chartData?: ChartData;
    updateInterval?: number;
    workspaceId?: string;
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): Widget {
  return {
    id,
    code,
    title,
    content,
    position,
    size,
    defaultSize: size,
    minimized: false,
    type: options?.type || 'other',
    syncEnabled: options?.type === 'chart' || options?.type === 'risk',
    subscribedSymbols: options?.subscribedSymbols,
    chartData: options?.chartData,
    updateInterval: options?.updateInterval || 1000,
    workspaceId: options?.workspaceId,
    autoRefresh: options?.autoRefresh !== false,
    refreshInterval: options?.refreshInterval || 30000, // 默认30秒刷新
    dataSubscriptions: []
  };
}

// 专业级Widget模板生成器
export function createChartWidget(
  symbol: string,
  indicators: string[] = [],
  position: { x: number; y: number } = { x: 100, y: 100 },
  size: { w: number; h: number } = { w: 600, h: 400 }
): Widget {
  return createWidget(
    `chart_${symbol}_${Date.now()}`,
    'GP',
    `图表 ${symbol}`,
    <div className="text-gray-400 text-center">加载图表数据...</div>,
    position,
    size,
    {
      type: 'chart',
      subscribedSymbols: [symbol],
      chartData: { symbol, indicators },
    }
  );
}

export function createRiskWidget(
  symbols: string[],
  position: { x: number; y: number } = { x: 100, y: 100 },
  size: { w: number; h: number } = { w: 400, h: 300 }
): Widget {
  return createWidget(
    `risk_${symbols.join('_')}_${Date.now()}`,
    'RISK',
    '风险分析',
    <div className="text-gray-400 text-center">计算风险指标...</div>,
    position,
    size,
    {
      type: 'risk',
      subscribedSymbols: symbols,
    }
  );
}

export function createLevel2Widget(
  symbol: string,
  position: { x: number; y: number } = { x: 100, y: 100 },
  size: { w: number; h: number } = { w: 350, h: 500 }
): Widget {
  return createWidget(
    `level2_${symbol}_${Date.now()}`,
    'OB',
    `${symbol} Level2`,
    <div className="text-gray-400 text-center">加载Level2数据...</div>,
    position,
    size,
    {
      type: 'data',
      subscribedSymbols: [symbol],
      chartData: { symbol },
    }
  );
}

// 多图表布局助手函数
export function createMultiChartLayout(
  layoutType: 'quad' | 'dual-h' | 'dual-v' | 'bloomberg' | 'custom',
  symbols: string[],
  basePosition: { x: number; y: number } = { x: 50, y: 50 }
): Widget[] {
  const widgets: Widget[] = [];
  const symbol = symbols[0] || '600519';
  
  switch (layoutType) {
    case 'quad':
      // 2x2 四宫格布局
      widgets.push(
        createChartWidget(symbol, ['MA', 'VOL'], { x: basePosition.x, y: basePosition.y }, { w: 450, h: 300 }),
        createChartWidget(symbol, ['MA', 'VOL'], { x: basePosition.x + 470, y: basePosition.y }, { w: 450, h: 300 }),
        createChartWidget(symbol, ['RSI', 'MACD'], { x: basePosition.x, y: basePosition.y + 320 }, { w: 450, h: 300 }),
        createChartWidget(symbol, ['KDJ', 'BOLL'], { x: basePosition.x + 470, y: basePosition.y + 320 }, { w: 450, h: 300 })
      );
      break;
      
    case 'dual-h':
      // 水平双图布局
      widgets.push(
        createChartWidget(symbol, ['MA', 'BOLL', 'VOL'], { x: basePosition.x, y: basePosition.y }, { w: 460, h: 400 }),
        createChartWidget(symbol, ['RSI', 'MACD', 'KDJ'], { x: basePosition.x + 480, y: basePosition.y }, { w: 460, h: 400 })
      );
      break;
      
    case 'dual-v':
      // 垂直双图布局
      widgets.push(
        createChartWidget(symbol, ['MA', 'BOLL', 'VOL'], { x: basePosition.x, y: basePosition.y }, { w: 900, h: 300 }),
        createChartWidget(symbol, ['RSI', 'MACD', 'KDJ'], { x: basePosition.x, y: basePosition.y + 320 }, { w: 900, h: 300 })
      );
      break;
      
    case 'bloomberg':
      // Bloomberg专业布局：主图+Level2+技术指标+分时图
      widgets.push(
        createChartWidget(symbol, ['MA', 'BOLL', 'VOL'], { x: basePosition.x, y: basePosition.y }, { w: 600, h: 350 }),
        createLevel2Widget(symbol, { x: basePosition.x + 620, y: basePosition.y }, { w: 300, h: 350 }),
        createChartWidget(symbol, ['RSI', 'MACD', 'KDJ'], { x: basePosition.x, y: basePosition.y + 370 }, { w: 450, h: 300 }),
        createWidget(
          `intraday_${symbol}_${Date.now()}`,
          'INT',
          '分时图',
          <div className="text-gray-400 text-center">加载分时数据...</div>,
          { x: basePosition.x + 470, y: basePosition.y + 370 },
          { w: 450, h: 300 },
          { type: 'chart', subscribedSymbols: [symbol] }
        )
      );
      break;
  }
  
  // 为所有图表组件启用同步
  widgets.forEach(widget => {
    if (widget.type === 'chart') {
      widget.syncEnabled = true;
    }
  });
  
  return widgets;
}

// 新增：Portfolio Widget生成器
export function createPortfolioWidget(
  position: { x: number; y: number } = { x: 100, y: 100 },
  size: { w: number; h: number } = { w: 350, h: 250 },
  options?: { 
    portfolioId?: string;
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): Widget {
  return createWidget(
    `portfolio_${Date.now()}`,
    'PRT',
    '组合监控',
    <div className="text-gray-400 text-center">加载组合数据...</div>,
    position,
    size,
    {
      type: 'portfolio',
      autoRefresh: options?.autoRefresh,
      refreshInterval: options?.refreshInterval || 30000,
    }
  );
}

// 新增：Strategy Widget生成器
export function createStrategyWidget(
  position: { x: number; y: number } = { x: 100, y: 100 },
  size: { w: number; h: number } = { w: 350, h: 250 },
  options?: { 
    strategyId?: string;
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): Widget {
  return createWidget(
    `strategy_${Date.now()}`,
    'STR',
    '策略状态',
    <div className="text-gray-400 text-center">加载策略数据...</div>,
    position,
    size,
    {
      type: 'strategy',
      autoRefresh: options?.autoRefresh,
      refreshInterval: options?.refreshInterval || 20000,
    }
  );
}

// 新增：Report Widget生成器
export function createReportWidget(
  position: { x: number; y: number } = { x: 100, y: 100 },
  size: { w: number; h: number } = { w: 350, h: 250 },
  options?: { 
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): Widget {
  return createWidget(
    `reports_${Date.now()}`,
    'RPT',
    '报告中心',
    <div className="text-gray-400 text-center">加载报告数据...</div>,
    position,
    size,
    {
      type: 'report',
      autoRefresh: options?.autoRefresh,
      refreshInterval: options?.refreshInterval || 60000,
    }
  );
}

// 新增：增强版多模块布局生成器
export function createWorkspaceLayout(
  layoutType: 'professional' | 'trader' | 'manager' | 'executive',
  basePosition: { x: number; y: number } = { x: 50, y: 50 }
): Widget[] {
  const widgets: Widget[] = [];
  
  switch (layoutType) {
    case 'professional':
      // 专业版：图表 + Portfolio + Strategy + Reports
      widgets.push(
        createChartWidget('600519', ['MA', 'VOL'], { x: basePosition.x, y: basePosition.y }, { w: 500, h: 350 }),
        createPortfolioWidget({ x: basePosition.x + 520, y: basePosition.y }, { w: 300, h: 170 }),
        createStrategyWidget({ x: basePosition.x + 520, y: basePosition.y + 190 }, { w: 300, h: 170 }),
        createRiskWidget(['600519'], { x: basePosition.x, y: basePosition.y + 370 }, { w: 400, h: 200 }),
        createReportWidget({ x: basePosition.x + 420, y: basePosition.y + 370 }, { w: 400, h: 200 })
      );
      break;
      
    case 'trader':
      // 交易员版：多图表 + 实时监控
      widgets.push(
        createChartWidget('600519', ['MA', 'BOLL'], { x: basePosition.x, y: basePosition.y }, { w: 400, h: 300 }),
        createChartWidget('300750', ['MA', 'BOLL'], { x: basePosition.x + 420, y: basePosition.y }, { w: 400, h: 300 }),
        createLevel2Widget('600519', { x: basePosition.x + 840, y: basePosition.y }, { w: 250, h: 300 }),
        createPortfolioWidget({ x: basePosition.x, y: basePosition.y + 320 }, { w: 350, h: 200 }),
        createStrategyWidget({ x: basePosition.x + 370, y: basePosition.y + 320 }, { w: 350, h: 200 }),
        createRiskWidget(['600519', '300750'], { x: basePosition.x + 740, y: basePosition.y + 320 }, { w: 350, h: 200 })
      );
      break;
      
    case 'manager':
      // 经理版：组合管理为主
      widgets.push(
        createPortfolioWidget({ x: basePosition.x, y: basePosition.y }, { w: 400, h: 250 }),
        createRiskWidget(['600519', '300750', '000858'], { x: basePosition.x + 420, y: basePosition.y }, { w: 400, h: 250 }),
        createChartWidget('600519', ['MA', 'VOL'], { x: basePosition.x, y: basePosition.y + 270 }, { w: 550, h: 300 }),
        createReportWidget({ x: basePosition.x + 570, y: basePosition.y + 270 }, { w: 250, h: 150 }),
        createStrategyWidget({ x: basePosition.x + 570, y: basePosition.y + 440 }, { w: 250, h: 150 })
      );
      break;
      
    case 'executive':
      // 高管版：简洁监控
      widgets.push(
        createPortfolioWidget({ x: basePosition.x, y: basePosition.y }, { w: 450, h: 200 }),
        createRiskWidget(['600519', '300750', '000858', '601318'], { x: basePosition.x + 470, y: basePosition.y }, { w: 400, h: 200 }),
        createReportWidget({ x: basePosition.x, y: basePosition.y + 220 }, { w: 870, h: 180 })
      );
      break;
  }
  
  return widgets;
}
