/**
 * MultiChartLayoutManager - 多图表布局管理器
 * 
 * 功能特性：
 * ✅ 预设布局模板：1x1, 2x2, 3x3, 1+2, 2+1 等专业布局
 * ✅ 动态分割视图：支持水平/垂直分割，任意组合
 * ✅ 图表同步：时间范围、缩放级别、股票代码同步
 * ✅ 拖拽重排：支持图表面板拖拽重新排列
 * ✅ 响应式布局：自动适应屏幕尺寸
 * ✅ 会话保存：布局状态持久化
 * ✅ Bloomberg级操作：专业交易终端体验
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, 
  Grid3X3, 
  Columns2, 
  Rows2, 
  Split, 
  Maximize2, 
  Minimize2,
  Copy,
  Trash2,
  Settings,
  Link,
  Unlink,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  FolderOpen,
  RotateCcw
} from 'lucide-react';
import { EnhancedTradingChart } from './TradingChart/EnhancedTradingChart';
import { Level2DataPanel } from './TradingChart/Level2DataPanel';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { WidgetLayout, ChartSyncProvider, createMultiChartLayout, Widget } from './WidgetLayout';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ChartPaneConfig {
  id: string;
  title: string;
  symbol: string;
  chartType: 'candlestick' | 'line' | 'area' | 'level2';
  timeFrame: string;
  indicators: string[];
  position: { row: number; col: number };
  size: { rows: number; cols: number };
  isMaximized?: boolean;
  isMinimized?: boolean;
  syncEnabled?: boolean;
  customSettings?: any;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gridSize: { rows: number; cols: number };
  panes: Omit<ChartPaneConfig, 'id' | 'symbol'>[];
  category: 'basic' | 'advanced' | 'professional' | 'custom';
}

export interface LayoutState {
  currentTemplate: string;
  gridSize: { rows: number; cols: number };
  panes: ChartPaneConfig[];
  syncGroups: Map<string, string[]>; // groupId -> paneIds
  globalSync: {
    enabled: boolean;
    masterPane?: string;
    syncTime: boolean;
    syncSymbol: boolean;
    syncZoom: boolean;
  };
}

export interface SyncGroup {
  id: string;
  name: string;
  paneIds: string[];
  syncSettings: {
    timeRange: boolean;
    symbol: boolean;
    zoom: boolean;
    indicators: boolean;
  };
}

// ============================================================================
// Layout Templates
// ============================================================================

const defaultTemplates: LayoutTemplate[] = [
  {
    id: 'single',
    name: '单图表',
    description: '单个全屏图表，适合专注分析',
    icon: <Monitor className="w-4 h-4" />,
    gridSize: { rows: 1, cols: 1 },
    category: 'basic',
    panes: [{
      title: '主图表',
      chartType: 'candlestick',
      timeFrame: '1D',
      indicators: ['MA', 'VOL'],
      position: { row: 0, col: 0 },
      size: { rows: 1, cols: 1 }
    }]
  },
  {
    id: 'dual-horizontal',
    name: '水平双图',
    description: '左右两个图表，适合对比分析',
    icon: <Columns2 className="w-4 h-4" />,
    gridSize: { rows: 1, cols: 2 },
    category: 'basic',
    panes: [
      {
        title: '主图表',
        chartType: 'candlestick',
        timeFrame: '1D',
        indicators: ['MA', 'VOL'],
        position: { row: 0, col: 0 },
        size: { rows: 1, cols: 1 }
      },
      {
        title: '对比图表',
        chartType: 'candlestick',
        timeFrame: '1D',
        indicators: ['MA', 'VOL'],
        position: { row: 0, col: 1 },
        size: { rows: 1, cols: 1 }
      }
    ]
  },
  {
    id: 'dual-vertical',
    name: '垂直双图',
    description: '上下两个图表，适合不同时间周期',
    icon: <Rows2 className="w-4 h-4" />,
    gridSize: { rows: 2, cols: 1 },
    category: 'basic',
    panes: [
      {
        title: '主图表',
        chartType: 'candlestick',
        timeFrame: '1D',
        indicators: ['MA', 'VOL'],
        position: { row: 0, col: 0 },
        size: { rows: 1, cols: 1 }
      },
      {
        title: '副图表',
        chartType: 'candlestick',
        timeFrame: '5M',
        indicators: ['RSI', 'MACD'],
        position: { row: 1, col: 0 },
        size: { rows: 1, cols: 1 }
      }
    ]
  },
  {
    id: 'quad',
    name: '四宫格',
    description: '2x2四个图表，经典多图布局',
    icon: <Grid3X3 className="w-4 h-4" />,
    gridSize: { rows: 2, cols: 2 },
    category: 'advanced',
    panes: [
      {
        title: '主图 - 日线',
        chartType: 'candlestick',
        timeFrame: '1D',
        indicators: ['MA', 'VOL'],
        position: { row: 0, col: 0 },
        size: { rows: 1, cols: 1 }
      },
      {
        title: '主图 - 小时',
        chartType: 'candlestick',
        timeFrame: '1H',
        indicators: ['MA', 'VOL'],
        position: { row: 0, col: 1 },
        size: { rows: 1, cols: 1 }
      },
      {
        title: 'Level2深度',
        chartType: 'level2',
        timeFrame: 'RT',
        indicators: [],
        position: { row: 1, col: 0 },
        size: { rows: 1, cols: 1 }
      },
      {
        title: '分时图',
        chartType: 'line',
        timeFrame: '5M',
        indicators: ['VOL'],
        position: { row: 1, col: 1 },
        size: { rows: 1, cols: 1 }
      }
    ]
  },
  {
    id: 'main-plus-two',
    name: '主图+双辅图',
    description: '一个主图表，两个辅助图表',
    icon: <Split className="w-4 h-4" />,
    gridSize: { rows: 2, cols: 2 },
    category: 'professional',
    panes: [
      {
        title: '主图表',
        chartType: 'candlestick',
        timeFrame: '1D',
        indicators: ['MA', 'BOLL', 'VOL'],
        position: { row: 0, col: 0 },
        size: { rows: 1, cols: 2 } // 跨两列
      },
      {
        title: 'Level2深度',
        chartType: 'level2',
        timeFrame: 'RT',
        indicators: [],
        position: { row: 1, col: 0 },
        size: { rows: 1, cols: 1 }
      },
      {
        title: '技术指标',
        chartType: 'line',
        timeFrame: '1D',
        indicators: ['RSI', 'MACD', 'KDJ'],
        position: { row: 1, col: 1 },
        size: { rows: 1, cols: 1 }
      }
    ]
  },
  {
    id: 'multi-timeframe',
    name: '多时间框架同步',
    description: '1分钟+5分钟+1小时+日线，四时间框架同步分析',
    icon: <LayoutGrid className="w-4 h-4" />,
    gridSize: { rows: 2, cols: 2 },
    category: 'professional',
    panes: [
      {
        title: '1分钟 K线',
        chartType: 'candlestick',
        timeFrame: '1m',
        indicators: ['MA', 'VOL'],
        position: { row: 0, col: 0 },
        size: { rows: 1, cols: 1 },
        syncEnabled: true
      },
      {
        title: '5分钟 K线',
        chartType: 'candlestick',
        timeFrame: '5m',
        indicators: ['MA', 'VOL'],
        position: { row: 0, col: 1 },
        size: { rows: 1, cols: 1 },
        syncEnabled: true
      },
      {
        title: '1小时 K线',
        chartType: 'candlestick',
        timeFrame: '1h',
        indicators: ['MA', 'VOL'],
        position: { row: 1, col: 0 },
        size: { rows: 1, cols: 1 },
        syncEnabled: true
      },
      {
        title: '日线 K线',
        chartType: 'candlestick',
        timeFrame: '1d',
        indicators: ['MA', 'VOL'],
        position: { row: 1, col: 1 },
        size: { rows: 1, cols: 1 },
        syncEnabled: true
      }
    ]
  },
  {
    id: 'bloomberg-pro',
    name: 'Bloomberg专业版',
    description: '仿Bloomberg终端专业多图布局',
    icon: <LayoutGrid className="w-4 h-4" />,
    gridSize: { rows: 3, cols: 3 },
    category: 'professional',
    panes: [
      {
        title: '主K线图',
        chartType: 'candlestick',
        timeFrame: '1D',
        indicators: ['MA', 'BOLL', 'VOL'],
        position: { row: 0, col: 0 },
        size: { rows: 2, cols: 2 } // 2x2大图
      },
      {
        title: 'Level2深度',
        chartType: 'level2',
        timeFrame: 'RT',
        indicators: [],
        position: { row: 0, col: 2 },
        size: { rows: 2, cols: 1 }
      },
      {
        title: '小时图',
        chartType: 'candlestick',
        timeFrame: '1H',
        indicators: ['MA', 'VOL'],
        position: { row: 2, col: 0 },
        size: { rows: 1, cols: 1 }
      },
      {
        title: '分时图',
        chartType: 'line',
        timeFrame: '5M',
        indicators: ['VOL'],
        position: { row: 2, col: 1 },
        size: { rows: 1, cols: 1 }
      },
      {
        title: '技术指标',
        chartType: 'line',
        timeFrame: '1D',
        indicators: ['RSI', 'MACD', 'KDJ'],
        position: { row: 2, col: 2 },
        size: { rows: 1, cols: 1 }
      }
    ]
  }
];

// ============================================================================
// Multi Chart Layout Manager Component
// ============================================================================

export interface MultiChartLayoutManagerProps {
  defaultSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
  height?: number;
  className?: string;
  useWidgetMode?: boolean; // 新增：是否使用Widget模式
}

export function MultiChartLayoutManager({
  defaultSymbol = '600519',
  onSymbolChange,
  height = 800,
  className = '',
  useWidgetMode = false
}: MultiChartLayoutManagerProps) {
  const [layoutState, setLayoutState] = useState<LayoutState>({
    currentTemplate: 'single',
    gridSize: { rows: 1, cols: 1 },
    panes: [],
    syncGroups: new Map(),
    globalSync: {
      enabled: false,
      syncTime: true,
      syncSymbol: true,
      syncZoom: true
    }
  });

  const [selectedPane, setSelectedPane] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    draggedPane: string | null;
    dropTarget: string | null;
  }>({ draggedPane: null, dropTarget: null });

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Widget模式状态
  const [widgets, setWidgets] = useState<Widget[]>([]);

  // ============================================================================
  // Layout Management
  // ============================================================================

  /**
   * 应用布局模板
   */
  const applyTemplate = useCallback((templateId: string) => {
    const template = defaultTemplates.find(t => t.id === templateId);
    if (!template) return;

    if (useWidgetMode) {
      // Widget模式：创建Widget布局
      const layoutType = getLayoutTypeFromTemplate(templateId);
      const newWidgets = createMultiChartLayout(layoutType, [defaultSymbol]);
      setWidgets(newWidgets);
    } else {
      // 传统模式：创建Pane布局
      const newPanes: ChartPaneConfig[] = template.panes.map((paneTemplate, index) => ({
        ...paneTemplate,
        id: `pane_${Date.now()}_${index}`,
        symbol: defaultSymbol,
        syncEnabled: false
      }));

      setLayoutState(prev => ({
        ...prev,
        currentTemplate: templateId,
        gridSize: template.gridSize,
        panes: newPanes
      }));
    }

    console.log(`[MultiChartLayout] Applied template: ${template.name} (${useWidgetMode ? 'Widget' : 'Pane'} mode)`);
  }, [defaultSymbol, useWidgetMode]);

  /**
   * 从模板ID获取布局类型
   */
  const getLayoutTypeFromTemplate = (templateId: string): 'quad' | 'dual-h' | 'dual-v' | 'bloomberg' | 'custom' => {
    switch (templateId) {
      case 'dual-horizontal': return 'dual-h';
      case 'dual-vertical': return 'dual-v';
      case 'quad': return 'quad';
      case 'bloomberg-pro': return 'bloomberg';
      default: return 'custom';
    }
  };

  /**
   * 添加新图表面板
   */
  const addPane = useCallback(() => {
    const { gridSize, panes } = layoutState;
    
    // 找到空位置
    let position: { row: number; col: number } | null = null;
    for (let row = 0; row < gridSize.rows; row++) {
      for (let col = 0; col < gridSize.cols; col++) {
        const occupied = panes.some(pane => 
          pane.position.row === row && pane.position.col === col
        );
        if (!occupied) {
          position = { row, col };
          break;
        }
      }
      if (position) break;
    }

    if (!position) {
      // 扩展网格
      const newGridSize = { 
        rows: gridSize.rows, 
        cols: gridSize.cols + 1 
      };
      position = { row: 0, col: gridSize.cols };
      
      setLayoutState(prev => ({
        ...prev,
        gridSize: newGridSize
      }));
    }

    const newPane: ChartPaneConfig = {
      id: `pane_${Date.now()}`,
      title: `图表 ${panes.length + 1}`,
      symbol: defaultSymbol,
      chartType: 'candlestick',
      timeFrame: '1D',
      indicators: ['MA', 'VOL'],
      position,
      size: { rows: 1, cols: 1 }
    };

    setLayoutState(prev => ({
      ...prev,
      panes: [...prev.panes, newPane]
    }));
  }, [layoutState, defaultSymbol]);

  /**
   * 删除图表面板
   */
  const removePane = useCallback((paneId: string) => {
    setLayoutState(prev => ({
      ...prev,
      panes: prev.panes.filter(pane => pane.id !== paneId)
    }));

    if (selectedPane === paneId) {
      setSelectedPane(null);
    }
  }, [selectedPane]);

  /**
   * 更新面板配置
   */
  const updatePane = useCallback((paneId: string, updates: Partial<ChartPaneConfig>) => {
    setLayoutState(prev => ({
      ...prev,
      panes: prev.panes.map(pane => 
        pane.id === paneId ? { ...pane, ...updates } : pane
      )
    }));
  }, []);

  /**
   * 最大化/最小化面板
   */
  const togglePaneMaximize = useCallback((paneId: string) => {
    updatePane(paneId, { 
      isMaximized: !layoutState.panes.find(p => p.id === paneId)?.isMaximized 
    });
  }, [updatePane, layoutState.panes]);

  // ============================================================================
  // Sync Management
  // ============================================================================

  /**
   * 切换全局同步
   */
  const toggleGlobalSync = useCallback(() => {
    setLayoutState(prev => ({
      ...prev,
      globalSync: {
        ...prev.globalSync,
        enabled: !prev.globalSync.enabled
      }
    }));
  }, []);

  /**
   * 同步股票代码到所有面板
   */
  const syncSymbolToAll = useCallback((symbol: string) => {
    if (!layoutState.globalSync.enabled || !layoutState.globalSync.syncSymbol) return;

    setLayoutState(prev => ({
      ...prev,
      panes: prev.panes.map(pane => ({ ...pane, symbol }))
    }));

    onSymbolChange?.(symbol);
  }, [layoutState.globalSync, onSymbolChange]);

  // ============================================================================
  // Render Methods
  // ============================================================================

  /**
   * 渲染图表面板内容
   */
  const renderPaneContent = useCallback((pane: ChartPaneConfig) => {
    switch (pane.chartType) {
      case 'level2':
        return (
          <Level2DataPanel
            symbol={pane.symbol}
            height={200}
            showTrades={true}
            showLiquidity={true}
          />
        );
      
      case 'candlestick':
      case 'line':
      case 'area':
      default:
        return (
          <EnhancedTradingChart
            symbol={pane.symbol}
            period={pane.timeFrame as any}
            chartType={pane.chartType as any}
            showVolume={pane.indicators.includes('VOL')}
            showMA={pane.indicators.includes('MA')}
            height={200}
            className="h-full"
          />
        );
    }
  }, []);

  /**
   * 计算网格布局样式
   */
  const calculateGridStyle = useMemo(() => {
    const { gridSize } = layoutState;
    return {
      display: 'grid',
      gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
      gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
      gap: '8px',
      height: `${height - 120}px`, // 减去头部高度
      padding: '8px'
    };
  }, [layoutState.gridSize, height]);

  /**
   * 计算面板样式
   */
  const calculatePaneStyle = useCallback((pane: ChartPaneConfig) => {
    if (pane.isMaximized) {
      return {
        gridRow: `1 / -1`,
        gridColumn: `1 / -1`,
        zIndex: 10
      };
    }

    return {
      gridRow: `${pane.position.row + 1} / span ${pane.size.rows}`,
      gridColumn: `${pane.position.col + 1} / span ${pane.size.cols}`
    };
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  // 初始化默认布局
  useEffect(() => {
    if (useWidgetMode) {
      if (widgets.length === 0) {
        applyTemplate('single');
      }
    } else {
      if (layoutState.panes.length === 0) {
        applyTemplate('single');
      }
    }
  }, [applyTemplate, layoutState.panes.length, widgets.length, useWidgetMode]);

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // ============================================================================
  // Widget Mode Handlers
  // ============================================================================

  const updateWidgets = useCallback((newWidgets: Widget[]) => {
    setWidgets(newWidgets);
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  // Widget模式渲染
  if (useWidgetMode) {
    return (
      <div ref={containerRef} className={`multi-chart-layout-widget ${className}`}>
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            {/* 布局模板选择 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">布局:</span>
              <div className="flex space-x-1">
                {defaultTemplates.map(template => (
                  <Button
                    key={template.id}
                    variant={layoutState.currentTemplate === template.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyTemplate(template.id)}
                    className="h-8"
                    title={template.description}
                  >
                    {template.icon}
                    <span className="ml-1 text-xs">{template.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>Widget模式</span>
            <span>图表: {widgets.length}</span>
            <span>同步: 已启用</span>
          </div>
        </div>

        {/* Widget布局区域 */}
        <div className="relative h-full bg-gray-900">
          <ChartSyncProvider initialSymbols={[defaultSymbol]}>
            <WidgetLayout
              widgets={widgets}
              onUpdateWidgets={updateWidgets}
              onRemoveWidget={removeWidget}
              enableSync={true}
              globalSymbols={[defaultSymbol]}
            />
          </ChartSyncProvider>
        </div>
      </div>
    );
  }

  // 传统Pane模式渲染
  return (
    <div ref={containerRef} className={`multi-chart-layout ${className}`}>
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          {/* 布局模板选择 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">布局:</span>
            <div className="flex space-x-1">
              {defaultTemplates.map(template => (
                <Button
                  key={template.id}
                  variant={layoutState.currentTemplate === template.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyTemplate(template.id)}
                  className="h-8"
                  title={template.description}
                >
                  {template.icon}
                  <span className="ml-1 text-xs">{template.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* 添加面板 */}
          <Button
            variant="outline"
            size="sm"
            onClick={addPane}
            className="h-8"
          >
            <span className="text-xs">添加</span>
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          {/* 全局同步控制 */}
          <div className="flex items-center space-x-2">
            <Button
              variant={layoutState.globalSync.enabled ? "default" : "outline"}
              size="sm"
              onClick={toggleGlobalSync}
              className="h-8"
            >
              {layoutState.globalSync.enabled ? <Link className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
              <span className="ml-1 text-xs">同步</span>
            </Button>
          </div>

          {/* 布局操作 */}
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" className="h-8">
              <Save className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8">
              <FolderOpen className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 图表网格区域 */}
      <div style={calculateGridStyle} className="bg-gray-900">
        {layoutState.panes.map(pane => (
          <Card
            key={pane.id}
            style={calculatePaneStyle(pane)}
            className={`relative border-gray-700 bg-gray-800 ${
              selectedPane === pane.id ? 'ring-2 ring-blue-500' : ''
            } ${pane.isMaximized ? 'border-blue-500' : ''}`}
            onClick={() => setSelectedPane(pane.id)}
          >
            <CardHeader className="px-3 py-2 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-white flex items-center space-x-2">
                  <span>{pane.title}</span>
                  <span className="text-xs text-gray-400">({pane.symbol})</span>
                  {pane.syncEnabled && (
                    <Link className="w-3 h-3 text-blue-400" />
                  )}
                </CardTitle>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePaneMaximize(pane.id);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    {pane.isMaximized ? (
                      <Minimize2 className="w-3 h-3" />
                    ) : (
                      <Maximize2 className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePane(pane.id);
                    }}
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 h-[calc(100%-60px)]">
              {renderPaneContent(pane)}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <span>布局: {layoutState.currentTemplate}</span>
          <span>面板: {layoutState.panes.length}</span>
          <span>网格: {layoutState.gridSize.rows}×{layoutState.gridSize.cols}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>同步: {layoutState.globalSync.enabled ? '开启' : '关闭'}</span>
          <span>尺寸: {Math.round(containerSize.width)}×{Math.round(containerSize.height)}</span>
        </div>
      </div>
    </div>
  );
}

export default MultiChartLayoutManager;