import { useEffect, useState, useCallback } from 'react';
import { 
  moduleCommunication, 
  useModuleCommunication, 
  configManager 
} from '../services';

// 专业级快捷键配置接口
interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Mac Command key
  action: () => void;
  description: string;
  category?: 'navigation' | 'chart' | 'data' | 'workspace' | 'analysis' | 'general';
  context?: 'global' | 'chart' | 'widget' | 'workspace';
  priority?: number;
}

// Bloomberg/专业终端快捷键模板
export const PROFESSIONAL_SHORTCUTS = {
  // 图表操作
  CHART_RESET_ZOOM: { key: 'r', ctrl: true, description: '重置图表缩放', category: 'chart' as const },
  CHART_FIT_SCREEN: { key: 'f', ctrl: true, description: '适应屏幕', category: 'chart' as const },
  CHART_TOGGLE_FULLSCREEN: { key: 'F11', description: '切换全屏模式', category: 'chart' as const },
  CHART_NEXT_TIMEFRAME: { key: 'ArrowRight', alt: true, description: '下一时间框', category: 'chart' as const },
  CHART_PREV_TIMEFRAME: { key: 'ArrowLeft', alt: true, description: '上一时间框', category: 'chart' as const },
  
  // 数据操作
  DATA_REFRESH: { key: 'F5', description: '刷新数据', category: 'data' as const },
  DATA_EXPORT: { key: 'e', ctrl: true, shift: true, description: '导出数据', category: 'data' as const },
  DATA_SEARCH: { key: 's', ctrl: true, description: '搜索股票', category: 'data' as const },
  
  // 工作区操作
  WORKSPACE_SAVE: { key: 's', ctrl: true, shift: true, description: '保存工作区', category: 'workspace' as const },
  WORKSPACE_LOAD: { key: 'o', ctrl: true, description: '加载工作区', category: 'workspace' as const },
  WORKSPACE_NEW: { key: 'n', ctrl: true, description: '新建工作区', category: 'workspace' as const },
  
  // 分析功能
  ANALYSIS_RISK: { key: 'r', ctrl: true, alt: true, description: '打开风险分析', category: 'analysis' as const },
  ANALYSIS_BACKTEST: { key: 'b', ctrl: true, alt: true, description: '启动回测', category: 'analysis' as const },
  ANALYSIS_PORTFOLIO: { key: 'p', ctrl: true, alt: true, description: '投资组合分析', category: 'analysis' as const },
  
  // 导航
  NAV_DASHBOARD: { key: '1', ctrl: true, description: '主面板', category: 'navigation' as const },
  NAV_CHARTS: { key: '2', ctrl: true, description: '图表视图', category: 'navigation' as const },
  NAV_STRATEGY: { key: '3', ctrl: true, description: '策略实验室', category: 'navigation' as const },
  NAV_PORTFOLIO: { key: '4', ctrl: true, description: '投资组合', category: 'navigation' as const },
  
  // 通用操作
  GENERAL_HELP: { key: 'F1', description: '帮助文档', category: 'general' as const },
  GENERAL_COMMAND: { key: 'k', ctrl: true, description: '命令面板', category: 'general' as const },
  GENERAL_SETTINGS: { key: ',', ctrl: true, description: '设置', category: 'general' as const },
};

interface KeyboardShortcutsProps {
  shortcuts: ShortcutConfig[];
  context?: string;
  enabled?: boolean;
  onShortcutExecuted?: (shortcut: ShortcutConfig) => void;
}

// 上下文感知的快捷键管理器
export function KeyboardShortcuts({ 
  shortcuts, 
  context = 'global', 
  enabled = true,
  onShortcutExecuted 
}: KeyboardShortcutsProps) {
  const [activeShortcuts, setActiveShortcuts] = useState<ShortcutConfig[]>([]);
  const [dynamicShortcuts, setDynamicShortcuts] = useState<ShortcutConfig[]>([]);
  
  // 模块间通信集成
  const {
    state: communicationState,
    updateNavigationState,
    syncStrategyToComparison,
    applyStrategyToPortfolio
  } = useModuleCommunication();
  
  // 使用 useCallback 创建稳定的函数引用
  const stableUpdateNavigationState = useCallback(updateNavigationState, []);
  const stableApplyStrategyToPortfolio = useCallback(applyStrategyToPortfolio, []);

  // 生成动态快捷键
  useEffect(() => {
    const generateDynamicShortcuts = () => {
      const dynamics: ShortcutConfig[] = [];
      
      // 根据通信状态生成快捷键
      if (communicationState.labState?.activeStrategy) {
        const strategy = communicationState.labState.activeStrategy;
        dynamics.push({
          key: 'a',
          ctrl: true,
          shift: true,
          description: `应用策略 ${strategy.name}`,
          category: 'dynamic',
          context: 'global',
          priority: 1,
          action: () => {
            stableApplyStrategyToPortfolio(strategy);
            showShortcutFeedback({
              key: 'Ctrl+Shift+A',
              description: `策略 ${strategy.name} 已应用`,
              category: 'dynamic'
            } as ShortcutConfig);
          }
        });
      }

      // 策略对比相关快捷键
      if (communicationState.comparisonState?.selectedStrategies?.length > 0) {
        dynamics.push({
          key: 'c',
          ctrl: true,
          shift: true,
          description: '打开策略对比',
          category: 'dynamic',
          context: 'global',
          priority: 2,
          action: () => {
            stableUpdateNavigationState('strategy-compare', {
              source: 'keyboard_shortcut',
              selectedStrategies: communicationState.comparisonState.selectedStrategies
            });
            showShortcutFeedback({
              key: 'Ctrl+Shift+C',
              description: '已打开策略对比',
              category: 'dynamic'
            } as ShortcutConfig);
          }
        });
      }

      // 模块间快速切换
      const currentModule = communicationState.navigationState?.currentModule;
      if (currentModule && currentModule !== 'dashboard') {
        dynamics.push({
          key: 'Home',
          description: '返回总览',
          category: 'dynamic',
          context: 'global',
          priority: 3,
          action: () => {
            stableUpdateNavigationState('dashboard', { source: 'keyboard_shortcut' });
            showShortcutFeedback({
              key: 'Home',
              description: '已返回总览',
              category: 'dynamic'
            } as ShortcutConfig);
          }
        });
      }

      setDynamicShortcuts(dynamics);
    };

    generateDynamicShortcuts();
  }, [
    communicationState.labState?.activeStrategy,
    communicationState.comparisonState?.selectedStrategies,
    communicationState.navigationState?.currentModule
  ]);

  // 根据上下文过滤快捷键（包含动态快捷键）
  useEffect(() => {
    const staticFiltered = shortcuts.filter(shortcut => 
      !shortcut.context || shortcut.context === 'global' || shortcut.context === context
    );
    
    const dynamicFiltered = dynamicShortcuts.filter(shortcut => 
      !shortcut.context || shortcut.context === 'global' || shortcut.context === context
    );
    
    // 合并静态和动态快捷键，动态快捷键优先级更高
    const allShortcuts = [...dynamicFiltered, ...staticFiltered]
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));
    
    setActiveShortcuts(allShortcuts);
  }, [shortcuts, context, dynamicShortcuts]);

  // 增强的按键处理逻辑
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // 检查是否在输入框中
    const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
      (e.target as HTMLElement)?.tagName
    );
    
    // 在输入框中时只响应特殊组合键
    if (isInInput && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Escape') {
      return;
    }

    activeShortcuts.forEach(shortcut => {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !shortcut.ctrl;
      const shiftMatch = shortcut.shift ? e.shiftKey : !shortcut.shift;
      const altMatch = shortcut.alt ? e.altKey : !shortcut.alt;
      const metaMatch = shortcut.meta ? e.metaKey : !shortcut.meta;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          shortcut.action();
          onShortcutExecuted?.(shortcut);
          
          // 显示快捷键执行反馈
          showShortcutFeedback(shortcut);
        } catch (error) {
          console.error('Shortcut execution error:', error);
        }
      }
    });
  }, [activeShortcuts, enabled, onShortcutExecuted]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null;
}

// 快捷键执行反馈显示
function showShortcutFeedback(shortcut: ShortcutConfig) {
  // 创建临时提示元素
  const feedback = document.createElement('div');
  feedback.textContent = shortcut.description;
  feedback.className = 'fixed top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded shadow-lg z-50 transition-opacity';
  feedback.style.fontSize = '12px';
  
  document.body.appendChild(feedback);
  
  // 自动移除
  setTimeout(() => {
    feedback.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(feedback);
    }, 300);
  }, 1500);
}

// 专业级快捷键指南组件
export function ShortcutsGuide({ shortcuts, context }: KeyboardShortcutsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 按分类组织快捷键
  const categorizedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutConfig[]>);

  // 过滤快捷键
  const filteredShortcuts = Object.entries(categorizedShortcuts).reduce((acc, [category, shortcuts]) => {
    if (selectedCategory !== 'all' && category !== selectedCategory) return acc;
    
    const filtered = shortcuts.filter(shortcut => 
      shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, ShortcutConfig[]>);

  // 分类图标映射
  const categoryIcons: Record<string, string> = {
    chart: '📊',
    data: '📈',
    workspace: '🖥️',
    analysis: '🔍',
    navigation: '🧭',
    general: '⚙️'
  };

  // 分类名称映射
  const categoryNames: Record<string, string> = {
    chart: '图表操作',
    data: '数据操作',
    workspace: '工作区',
    analysis: '分析功能',
    navigation: '导航',
    general: '通用'
  };

  return (
    <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg overflow-hidden">
      {/* 头部 */}
      <div className="px-5 py-4 border-b border-[#1a2942] bg-[#0a1628]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">快捷键指南</h3>
          <div className="text-xs text-gray-400 bloomberg-code">PROFESSIONAL TERMINAL</div>
        </div>
        
        {/* 搜索和过滤 */}
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索快捷键..."
              className="w-full px-3 py-2 bg-[#0d1b2e] border border-[#1a2942] rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#0ea5e9]"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-[#0d1b2e] border border-[#1a2942] rounded text-sm text-gray-200 focus:outline-none focus:border-[#0ea5e9]"
          >
            <option value="all">所有分类</option>
            {Object.keys(categoryNames).map(category => (
              <option key={category} value={category}>
                {categoryNames[category]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 快捷键列表 */}
      <div className="max-h-[500px] overflow-y-auto p-5">
        {Object.keys(filteredShortcuts).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            没有找到匹配的快捷键
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(filteredShortcuts).map(([category, shortcuts]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{categoryIcons[category]}</span>
                  <h4 className="text-sm font-medium text-gray-300">{categoryNames[category]}</h4>
                  <div className="flex-1 h-px bg-[#1a2942]"></div>
                  <span className="text-xs text-gray-500">{shortcuts.length} 个</span>
                </div>
                
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 rounded hover:bg-[#0a1628] transition-colors">
                      <span className="text-sm text-gray-300">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.ctrl && (
                          <kbd className="px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-400">
                            Ctrl
                          </kbd>
                        )}
                        {shortcut.shift && (
                          <kbd className="px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-400">
                            Shift
                          </kbd>
                        )}
                        {shortcut.alt && (
                          <kbd className="px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-400">
                            Alt
                          </kbd>
                        )}
                        {shortcut.meta && (
                          <kbd className="px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-400">
                            Cmd
                          </kbd>
                        )}
                        <kbd className="px-2 py-1 bg-[#f59e0b]/20 border border-[#f59e0b]/30 rounded text-xs text-[#f59e0b] font-mono">
                          {shortcut.key.toUpperCase()}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      <div className="px-5 py-3 border-t border-[#1a2942] bg-[#0a1628] text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>按 F1 随时查看帮助</span>
          <span className="bloomberg-mono">
            {Object.values(filteredShortcuts).reduce((total, shortcuts) => total + shortcuts.length, 0)} 个快捷键
          </span>
        </div>
      </div>
    </div>
  );
}
