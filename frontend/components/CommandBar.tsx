import { useState, useEffect, useRef } from 'react';
import { Search, Terminal, Clock, TrendingUp, BarChart2, FileText, Settings, History, BookOpen, Zap, GitBranch, Star, Tag } from 'lucide-react';
import { 
  moduleCommunication, 
  useModuleCommunication, 
  configManager,
  getStrategyExecutionService,
  getPortfolioManagementService
} from '../services';
import { ParameterHelper, ParameterParser, FunctionSignature } from './ParameterHelper';
import { getFunctionSignature } from '../utils/functionSignatures';
import { CommandPipeline, parsePipeline } from './CommandPipeline';
import { PipelineTemplates } from './PipelineTemplates';
import { AliasManager, CommandAlias } from './AliasManager';
import { FavoritePanel, addToFavorites, removeFromFavorites, isFavorited } from './FavoritePanel';
import { MacroBuilder, MacroCommand } from './MacroBuilder';

interface Command {
  code: string;
  name: string;
  description: string;
  category: string;
  params?: string;
  action: (params?: string) => void;
}

interface StockQuery {
  stockCode: string;
  function: string;
  params?: string;
}

interface CommandBarProps {
  onNavigate: (view: string) => void;
  onCommand?: (command: string) => void;
  onStockQuery?: (query: StockQuery) => void;
  onOpenHelp?: (functionCode?: string) => void;  // New prop for opening help
}

// Expanded stock database for quick lookup
const stockDatabase: Record<string, string> = {
  '600519': '贵州茅台',
  '000858': '五粮液',
  '600036': '招商银行',
  '000001': '平安银行',
  '600276': '恒瑞医药',
  '300750': '宁德时代',
  '601012': '隆基绿能',
  '300059': '东方财富',
  '002594': '比亚迪',
  '688981': '中芯国际',
  '601318': '中国平安',
  '000333': '的集团',
  '600900': '长江电力',
  '601888': '中国中免',
  '002475': '立讯精密',
  '300760': '迈瑞医疗',
  '688599': '天合光能',
  '002415': '海康威视',
  '000725': '京东方A',
  '601166': '兴业银行',
};

export function CommandBar({ onNavigate, onCommand, onStockQuery, onOpenHelp }: CommandBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Command[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const [showParameterHelper, setShowParameterHelper] = useState(false);
  const [currentFunctionSignature, setCurrentFunctionSignature] = useState<FunctionSignature | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [pipelineText, setPipelineText] = useState('');
  const [showAliasManager, setShowAliasManager] = useState(false);
  const [showFavoritePanel, setShowFavoritePanel] = useState(false);
  const [showMacroBuilder, setShowMacroBuilder] = useState(false);
  const [aliases, setAliases] = useState<CommandAlias[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandBarRef = useRef<HTMLDivElement>(null);

  // 模块间通信集成
  const {
    state: communicationState,
    updateNavigationState,
    syncStrategyToComparison,
    applyStrategyToPortfolio
  } = useModuleCommunication();

  // 服务状态和配置
  const [serviceConfig, setServiceConfig] = useState<any>(null);
  const [contextualCommands, setContextualCommands] = useState<Command[]>([]);

  // Load aliases from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('arthera-aliases');
    if (saved) {
      try {
        setAliases(JSON.parse(saved));
      } catch {
        setAliases([]);
      }
    }
  }, [showAliasManager]); // Reload when alias manager closes

  // Load command history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('arthera-command-history');
    if (saved) {
      setCommandHistory(JSON.parse(saved));
    }
  }, []);

  // 加载命令栏配置
  useEffect(() => {
    const loadCommandConfig = async () => {
      try {
        const config = await configManager.loadConfig('command_bar_settings', {
          showParameterHelper: true,
          showPipeline: false,
          maxHistoryItems: 50,
          enableContextualCommands: true
        });
        
        setServiceConfig(config);
        console.log('📁 CommandBar configuration loaded:', config);
      } catch (error) {
        console.error('Failed to load CommandBar configuration:', error);
      }
    };

    loadCommandConfig();
  }, []);

  // 动态生成上下文相关命令
  useEffect(() => {
    const generateContextualCommands = () => {
      const dynamicCommands: Command[] = [];
      
      // 根据通信状态生成动态命令
      if (communicationState.labState?.activeStrategy) {
        const strategy = communicationState.labState.activeStrategy;
        dynamicCommands.push({
          code: 'APPLY_STRATEGY',
          name: 'Apply Current Strategy',
          description: `应用当前策略 ${strategy.name} 到组合`,
          category: 'Dynamic',
          action: () => {
            applyStrategyToPortfolio(strategy);
            setIsOpen(false);
            console.log(`✅ 策略 ${strategy.name} 已通过命令应用`);
          }
        });
      }

      if (communicationState.comparisonState?.selectedStrategies?.length > 0) {
        dynamicCommands.push({
          code: 'SYNC_COMPARISON',
          name: 'Sync to Comparison',
          description: '同步当前选择到策略对比',
          category: 'Dynamic',
          action: () => {
            updateNavigationState('strategy-compare', {
              source: 'command_bar',
              selectedStrategies: communicationState.comparisonState.selectedStrategies
            });
            onNavigate('strategy-compare');
            setIsOpen(false);
          }
        });
      }

      // 根据当前模块添加快捷操作
      const currentModule = communicationState.navigationState?.currentModule;
      if (currentModule === 'portfolio') {
        dynamicCommands.push({
          code: 'PORTFOLIO_EXPORT',
          name: 'Export Portfolio',
          description: '导出当前组合报告',
          category: 'Quick',
          action: () => {
            console.log('📤 导出组合报告');
            // 这里可以调用组合导出功能
            setIsOpen(false);
          }
        });
      }

      setContextualCommands(dynamicCommands);
    };

    generateContextualCommands();
  }, [
    communicationState.labState?.activeStrategy?.name,
    communicationState.labState?.activeStrategy?.id,
    communicationState.comparisonState?.selectedStrategies?.length,
    communicationState.navigationState?.currentModule
  ]);

  // Bloomberg-style function codes (100+ commands)
  const commands: Command[] = [
    // === System Functions ===
    { code: 'HELP', name: 'Help System', description: '打开函数帮助系统 - Bloomberg级文档', category: 'System', params: '[function]', action: (params) => {
      setIsOpen(false);
      if (onOpenHelp) {
        onOpenHelp(params);
      }
    }},
    
    // === Navigation Functions ===
    { code: 'DASH', name: 'Dashboard', description: '总览仪表盘 - 策略表现、KPI监控', category: 'Navigation', action: () => onNavigate('dashboard') },
    { code: 'LAB', name: 'Strategy Lab', description: '策略实验室 - 配置策略、参数调优', category: 'Navigation', action: () => onNavigate('strategy-lab') },
    { code: 'BT', name: 'Backtest', description: '回测详情 - 历史回测分析', category: 'Navigation', action: () => onNavigate('backtest-detail') },
    { code: 'PORT', name: 'Portfolio', description: '组合体检 - 持仓分析、风险监控', category: 'Navigation', action: () => onNavigate('portfolio') },
    { code: 'RISK', name: 'Risk Analysis', description: '风险画像 - 风险偏好设置', category: 'Navigation', action: () => onNavigate('risk-profile') },
    { code: 'COMP', name: 'Strategy Compare', description: '策略对比工作台 - 多策略对比分析', category: 'Navigation', action: () => onNavigate('strategy-compare') },
    { code: 'RPT', name: 'Reports', description: '报告中心 - 查看和管理报告', category: 'Navigation', action: () => onNavigate('reports') },
    { code: 'PICK', name: 'Stock Picker', description: '股票选择器 - 股票筛选工具', category: 'Navigation', action: () => onNavigate('stock-picker') },
    { code: 'GLOSS', name: 'Glossary', description: '术语解释 - 金融术语词典', category: 'Navigation', action: () => onNavigate('glossary') },

    // === Data & Analysis Functions ===
    { code: 'PERF', name: 'Performance', description: '策略表现分析 - 收益、回撤、夏普比率', category: 'Analysis', action: () => onNavigate('dashboard') },
    { code: 'HP', name: 'Historical Prices', description: '历史价格 - K线图、成交量', category: 'Data', params: '[stock] [start] [end]', action: () => console.log('HP') },
    { code: 'GP', name: 'Price Graph', description: '价格图表 - 技术分析图表', category: 'Data', action: () => console.log('GP') },
    { code: 'DES', name: 'Description', description: '证券描述 - 公司基本信息', category: 'Data', params: '[stock]', action: () => console.log('DES') },
    { code: 'CN', name: 'Company News', description: '公司新闻 - 最新资讯动态', category: 'Data', action: () => console.log('CN') },
    { code: 'FA', name: 'Financial Analysis', description: '财务分析 - 财报数据、财务指标', category: 'Analysis', action: () => console.log('FA') },
    { code: 'RV', name: 'Relative Value', description: '相对价值 - 估值对比分析', category: 'Analysis', action: () => console.log('RV') },
    { code: 'BETA', name: 'Beta Calculation', description: 'Beta计算 - 系统性风险度量', category: 'Analysis', action: () => console.log('BETA') },
    { code: 'DVD', name: 'Dividend Analysis', description: '股息分析 - 分红历史与预测', category: 'Analysis', action: () => console.log('DVD') },
    { code: 'ANR', name: 'Analyst Ratings', description: '分析师评级 - 买入/持有/卖出建议', category: 'Data', action: () => console.log('ANR') },

    // === Portfolio Functions ===
    { code: 'PRTU', name: 'Portfolio Upload', description: '组合上传 - 批量导入持仓数据', category: 'Portfolio', action: () => console.log('PRTU') },
    { code: 'PRTS', name: 'Portfolio Stress', description: '压力测试 - 极端情景模拟', category: 'Portfolio', action: () => console.log('PRTS') },
    { code: 'PMEN', name: 'Portfolio Monitor', description: '组合监控 - 实时盈亏追踪', category: 'Portfolio', action: () => console.log('PMEN') },
    { code: 'PATTR', name: 'Attribution', description: '归因分析 - 收益来源分解', category: 'Portfolio', action: () => console.log('PATTR') },
    { code: 'PEXP', name: 'Exposure', description: '暴露分析 - 行业/因子/风格暴露', category: 'Portfolio', action: () => console.log('PEXP') },
    { code: 'POPT', name: 'Optimization', description: '组合优化 - 最优权重配置', category: 'Portfolio', action: () => console.log('POPT') },
    { code: 'PREB', name: 'Rebalance', description: '再平衡 - 调仓建议', category: 'Portfolio', action: () => console.log('PREB') },

    // === Risk Functions ===
    { code: 'MARS', name: 'Multi-Asset Risk', description: '多资产风险系统 - VaR、CVaR分析', category: 'Risk', action: () => console.log('MARS') },
    { code: 'VAR', name: 'Value at Risk', description: '风险价值 - 潜在最大损失', category: 'Risk', action: () => console.log('VAR') },
    { code: 'CVAR', name: 'Conditional VaR', description: '条件风险价值 - CVaR计算', category: 'Risk', action: () => console.log('CVAR') },
    { code: 'CORR', name: 'Correlation', description: '相关性分析 - 资产相关矩阵', category: 'Risk', action: () => console.log('CORR') },
    { code: 'COVR', name: 'Covariance', description: '协方差矩阵 - 风险关联分析', category: 'Risk', action: () => console.log('COVR') },
    { code: 'DRAW', name: 'Drawdown', description: '回撤分析 - 历史回撤详情', category: 'Risk', action: () => console.log('DRAW') },
    { code: 'RVOL', name: 'Realized Volatility', description: '已实现波动率 - 历史波动度量', category: 'Risk', action: () => console.log('RVOL') },

    // === Backtest Functions ===
    { code: 'BTST', name: 'Backtest Statistics', description: '回测统计 - 完整指标汇总', category: 'Backtest', action: () => console.log('BTST') },
    { code: 'BTRUN', name: 'Run Backtest', description: '运行回测 - 执行策略回测', category: 'Backtest', action: () => onNavigate('strategy-lab') },
    { code: 'BTHIS', name: 'Backtest History', description: '回测历史 - 历史回测列表', category: 'Backtest', action: () => console.log('BTHIS') },
    { code: 'BTCMP', name: 'Backtest Compare', description: '回测对比 - 多个回测对比', category: 'Backtest', action: () => onNavigate('strategy-compare') },

    // === Screening Functions ===
    { code: 'EQS', name: 'Equity Screening', description: '股票筛选 - 多因子筛选器', category: 'Screening', action: () => onNavigate('stock-picker') },
    { code: 'FSRC', name: 'Fund Screening', description: '基金筛选 - 基金评级筛选', category: 'Screening', action: () => console.log('FSRC') },
    { code: 'TOPV', name: 'Top Volume', description: '成交量排行 - 活跃度排名', category: 'Screening', action: () => console.log('TOPV') },
    { code: 'TOPG', name: 'Top Gainers', description: '涨幅榜 - 当日涨幅排名', category: 'Screening', action: () => console.log('TOPG') },
    { code: 'TOPL', name: 'Top Losers', description: '跌幅榜 - 当日跌幅排名', category: 'Screening', action: () => console.log('TOPL') },

    // === Technical Analysis ===
    { code: 'MA', name: 'Moving Average', description: '移动平均线 - MA5/MA10/MA20', category: 'Technical', action: () => console.log('MA') },
    { code: 'RSI', name: 'RSI Indicator', description: '相对强弱指标 - 超买超卖信号', category: 'Technical', action: () => console.log('RSI') },
    { code: 'MACD', name: 'MACD', description: 'MACD指标 - 趋势动量分析', category: 'Technical', action: () => console.log('MACD') },
    { code: 'BOLL', name: 'Bollinger Bands', description: '布林带 - 波动率通道', category: 'Technical', action: () => console.log('BOLL') },
    { code: 'KDJ', name: 'KDJ Indicator', description: '随机指标 - 超买超卖分析', category: 'Technical', action: () => console.log('KDJ') },
    { code: 'VOL', name: 'Volume Analysis', description: '成交量分析 - 量价关系', category: 'Technical', action: () => console.log('VOL') },

    // === Factor Analysis ===
    { code: 'FEXP', name: 'Factor Exposure', description: '因子暴露 - 多因子分析', category: 'Factor', action: () => console.log('FEXP') },
    { code: 'FRET', name: 'Factor Returns', description: '因子收益 - 因子表现归因', category: 'Factor', action: () => console.log('FRET') },
    { code: 'FVAL', name: 'Value Factor', description: '价值因子 - PB/PE/PS分析', category: 'Factor', action: () => console.log('FVAL') },
    { code: 'FMOM', name: 'Momentum Factor', description: '动量因子 - 价格动量分析', category: 'Factor', action: () => console.log('FMOM') },
    { code: 'FQUA', name: 'Quality Factor', description: '质量因子 - ROE/ROA分析', category: 'Factor', action: () => console.log('FQUA') },
    { code: 'FSIZE', name: 'Size Factor', description: '规模因子 - 市值分析', category: 'Factor', action: () => console.log('FSIZE') },

    // === Report Functions ===
    { code: 'RGEN', name: 'Generate Report', description: '生成报告 - 自动化报告生成', category: 'Report', action: () => console.log('RGEN') },
    { code: 'REXP', name: 'Export Report', description: '导出报告 - PDF/Excel导出', category: 'Report', action: () => console.log('REXP') },
    { code: 'RSCH', name: 'Schedule Report', description: '定时报告 - 自动发送设置', category: 'Report', action: () => console.log('RSCH') },
    { code: 'RHIS', name: 'Report History', description: '报告历史 - 历史报告列表', category: 'Report', action: () => onNavigate('reports') },

    // === Market Data ===
    { code: 'MKT', name: 'Market Overview', description: '市场总览 - 指数行情', category: 'Market', action: () => console.log('MKT') },
    { code: 'HEAT', name: 'Heat Map', description: '热力图 - 市场情绪可视化', category: 'Market', action: () => console.log('HEAT') },
    { code: 'SECT', name: 'Sector Analysis', description: '行业分析 - 行业涨跌排名', category: 'Market', action: () => console.log('SECT') },
    { code: 'IDX', name: 'Index Monitor', description: '指数监控 - 主要指数追踪', category: 'Market', action: () => console.log('IDX') },

    // === Action Functions ===
    { code: 'SRCH', name: 'Search', description: '全局搜索 - 搜索股票/策略/报告', category: 'Action', action: () => onNavigate('stock-picker') },
    { code: 'NEW', name: 'New Backtest', description: '新建回测 - 快速创建回测', category: 'Action', action: () => onNavigate('strategy-lab') },
    { code: 'SAVE', name: 'Save Workspace', description: '保存工作区 - 保存当前布局', category: 'Action', action: () => console.log('SAVE') },
    { code: 'LOAD', name: 'Load Workspace', description: '加载工作区 - 恢复布局', category: 'Action', action: () => console.log('LOAD') },
    { code: 'EXPORT', name: 'Export Data', description: '导出数据 - 批量导出', category: 'Action', action: () => console.log('EXPORT') },
    { code: 'IMPORT', name: 'Import Data', description: '导入数据 - 批量导入', category: 'Action', action: () => console.log('IMPORT') },
    { code: 'ALERT', name: 'Create Alert', description: '创建预警 - 设置价格/指标预警', category: 'Action', action: () => console.log('ALERT') },
    { code: 'NOTE', name: 'Add Note', description: '添加备注 - 交易笔记', category: 'Action', action: () => console.log('NOTE') },

    // === Settings & System ===
    { code: 'SET', name: 'Settings', description: '系统设置 - 偏好配置', category: 'System', action: () => console.log('SET') },
    { code: 'KEYS', name: 'Keyboard Shortcuts', description: '快捷键 - 快捷键列表', category: 'System', action: () => console.log('KEYS') },
    { code: 'USER', name: 'User Profile', description: '用户资料 - 账户设置', category: 'System', action: () => console.log('USER') },
    { code: 'ABOUT', name: 'About', description: '关于系统 - 版本信息', category: 'System', action: () => console.log('ABOUT') },
    { code: 'LOG', name: 'Activity Log', description: '活动日志 - 操作记录', category: 'System', action: () => console.log('LOG') },
  ];

  // Parse Bloomberg-style queries (e.g., "600519 PERF" or "PERF 600519")
  const parseStockQuery = (query: string): StockQuery | null => {
    const parts = query.trim().toUpperCase().split(/\s+/);
    if (parts.length < 2) return null;

    const [first, second, ...rest] = parts;
    const params = rest.join(' ');
    
    // Check if first part is stock code
    if (stockDatabase[first]) {
      return { stockCode: first, function: second, params: params || undefined };
    }
    
    // Check if second part is stock code
    if (stockDatabase[second]) {
      return { stockCode: second, function: first, params: params || undefined };
    }
    
    return null;
  };

  // Save command to history
  const saveToHistory = (cmd: string) => {
    const newHistory = [cmd, ...commandHistory.filter(h => h !== cmd)].slice(0, 50);
    setCommandHistory(newHistory);
    localStorage.setItem('arthera-command-history', JSON.stringify(newHistory));
  };

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setInput('');
        setShowHistory(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filter suggestions (包含动态上下文命令)
  useEffect(() => {
    if (showHistory) {
      return; // Don't filter when showing history
    }

    // 合并静态命令和动态上下文命令
    const allCommands = [...commands, ...contextualCommands];

    if (input.trim() === '') {
      // Show popular commands and contextual commands when empty
      const popular = commands.filter(c => 
        ['DASH', 'LAB', 'PORT', 'COMP', 'PERF', 'BT', 'RPT', 'PICK'].includes(c.code)
      );
      
      // 优先显示上下文命令
      const contextPriority = [...contextualCommands, ...popular];
      setSuggestions(contextPriority.slice(0, 10));
    } else {
      const filtered = allCommands.filter(cmd => 
        cmd.code.toLowerCase().includes(input.toLowerCase()) ||
        cmd.name.toLowerCase().includes(input.toLowerCase()) ||
        cmd.description.toLowerCase().includes(input.toLowerCase())
      );
      
      // 上下文命令优先，然后是匹配的普通命令
      const contextMatches = filtered.filter(cmd => cmd.category === 'Dynamic' || cmd.category === 'Quick');
      const regularMatches = filtered.filter(cmd => cmd.category !== 'Dynamic' && cmd.category !== 'Quick');
      
      setSuggestions([...contextMatches, ...regularMatches].slice(0, 10));
    }
    setSelectedIndex(0);
  }, [input, showHistory, contextualCommands]);

  // Check for parameter helper trigger
  useEffect(() => {
    if (!input.includes(' ')) {
      setShowParameterHelper(false);
      setCurrentFunctionSignature(null);
      return;
    }

    const parts = input.trim().split(/\s+/);
    const commandCode = parts[0].toUpperCase();
    const signature = getFunctionSignature(commandCode);

    if (signature && signature.parameters.length > 0) {
      setCurrentFunctionSignature(signature);
      setShowParameterHelper(true);
    } else {
      setShowParameterHelper(false);
      setCurrentFunctionSignature(null);
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (showHistory ? commandHistory.length : suggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showHistory && commandHistory.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + commandHistory.length) % commandHistory.length);
      } else if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      // Check if input contains pipeline (|)
      if (input.includes('|')) {
        setPipelineText(input);
        setShowPipeline(true);
        setIsOpen(false);
        return;
      }
      
      if (showHistory && commandHistory[selectedIndex]) {
        setInput(commandHistory[selectedIndex]);
        setShowHistory(false);
      } else if (suggestions[selectedIndex]) {
        executeCommand(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setShowHistory(!showHistory);
    } else if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      setShowTemplates(true);
      setIsOpen(false);
    }
  };

  const executeCommand = (cmd: Command) => {
    const fullCommand = cmd.params ? `${cmd.code} ${cmd.params}` : cmd.code;
    saveToHistory(fullCommand);
    cmd.action();
    onCommand?.(cmd.code);
    setIsOpen(false);
    setInput('');
    setShowHistory(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Navigation': return <TrendingUp className="w-3 h-3" />;
      case 'Analysis': return <BarChart2 className="w-3 h-3" />;
      case 'Portfolio': return <FileText className="w-3 h-3" />;
      case 'Risk': return <Settings className="w-3 h-3" />;
      case 'Action': return <Zap className="w-3 h-3" />;
      case 'System': return <Settings className="w-3 h-3" />;
      default: return <BookOpen className="w-3 h-3" />;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#1a2942]/50 border border-[#2a3f5f] rounded text-xs text-gray-400 hover:text-gray-200 hover:border-[#0ea5e9]/50 transition-colors"
      >
        <Terminal className="w-3.5 h-3.5" />
        <span>Command</span>
        <kbd className="px-1.5 py-0.5 bg-[#0a1628] border border-[#1a2942] rounded text-[10px] text-gray-500">
          Ctrl+K
        </kbd>
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

      {/* Command Palette */}
      <div 
        ref={commandBarRef}
        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[700px] bg-[#0d1b2e] border border-[#0ea5e9]/50 rounded-lg shadow-2xl z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a2942]">
          <Terminal className="w-4 h-4 text-[#f59e0b]" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter function code or search... (e.g., DASH, PORT, GP 600519)"
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-200 placeholder-gray-600"
            style={{ fontFamily: 'Monaco, "Courier New", monospace' }}
          />
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded transition-colors ${
              showHistory ? 'bg-[#0ea5e9]/20 text-[#0ea5e9]' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Command History (Tab)"
          >
            <History className="w-4 h-4" />
          </button>
          <kbd className="px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Suggestions or History */}
        <div className="max-h-[450px] overflow-y-auto">
          {showHistory ? (
            // History View
            <>
              <div className="px-4 py-2 bg-[#0a1628] border-b border-[#1a2942]">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <History className="w-3 h-3" />
                  <span>命令历史 ({commandHistory.length})</span>
                </div>
              </div>
              {commandHistory.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  暂无历史命令
                </div>
              ) : (
                commandHistory.map((cmd, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInput(cmd);
                      setShowHistory(false);
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                      index === selectedIndex
                        ? 'bg-[#0ea5e9]/20 border-l-2 border-[#0ea5e9]'
                        : 'border-l-2 border-transparent hover:bg-[#1a2942]/50'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="flex-1 text-left text-sm text-gray-300 font-mono">
                      {cmd}
                    </span>
                  </button>
                ))
              )}
            </>
          ) : (
            // Suggestions View
            <>
              {suggestions.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-500">未找到匹配的命令</div>
                  <div className="text-xs text-gray-600 mt-1">尝试输入 DASH, PORT, PERF 等</div>
                </div>
              ) : (
                suggestions.map((cmd, index) => (
                  <button
                    key={cmd.code}
                    onClick={() => executeCommand(cmd)}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                      index === selectedIndex
                        ? 'bg-[#0ea5e9]/20 border-l-2 border-[#0ea5e9]'
                        : 'border-l-2 border-transparent hover:bg-[#1a2942]/50'
                    }`}
                  >
                    <div className="w-14 h-8 bg-[#f59e0b]/20 border border-[#f59e0b]/30 rounded flex items-center justify-center">
                      <span 
                        className="text-xs text-[#f59e0b]"
                        style={{ fontFamily: 'Monaco, "Courier New", monospace', fontWeight: 700 }}
                      >
                        {cmd.code}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm text-gray-200">{cmd.name}</div>
                      <div className="text-xs text-gray-500">{cmd.description}</div>
                      {cmd.params && (
                        <div className="text-xs text-gray-600 mt-0.5 font-mono">{cmd.params}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1a2942]/50 rounded text-xs text-gray-600">
                      {getCategoryIcon(cmd.category)}
                      <span>{cmd.category}</span>
                    </div>
                  </button>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1a2942] bg-[#0a1628] flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#1a2942] rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#1a2942] rounded">Enter</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#1a2942] rounded">Tab</kbd> History
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#1a2942] rounded">ESC</kbd> Close
            </span>
          </div>
          <div className="text-[#f59e0b]">
            {showHistory ? `${commandHistory.length} history` : `${suggestions.length} commands`}
          </div>
        </div>
      </div>

      {/* Parameter Helper */}
      {showParameterHelper && currentFunctionSignature && commandBarRef.current && (
        <ParameterHelper
          functionSignature={currentFunctionSignature}
          currentInput={input}
          position={{
            x: commandBarRef.current.getBoundingClientRect().left,
            y: commandBarRef.current.getBoundingClientRect().bottom
          }}
          onSelectSuggestion={(suggestion) => {
            const parts = input.trim().split(/\s+/);
            const newInput = parts[0] + ' ' + suggestion;
            setInput(newInput);
          }}
          onClose={() => setShowParameterHelper(false)}
        />
      )}

      {/* Pipeline Execution */}
      {showPipeline && (
        <CommandPipeline
          pipelineText={pipelineText}
          autoExecute={true}
          onClose={() => {
            setShowPipeline(false);
            setPipelineText('');
          }}
        />
      )}

      {/* Pipeline Templates */}
      {showTemplates && (
        <PipelineTemplates
          onSelect={(template) => {
            setInput(template);
            setShowTemplates(false);
            setIsOpen(true);
          }}
          onClose={() => {
            setShowTemplates(false);
            setIsOpen(true);
          }}
        />
      )}

      {/* Alias Manager */}
      {showAliasManager && (
        <AliasManager
          onClose={() => setShowAliasManager(false)}
          onAliasSelect={(alias) => {
            setInput(alias.command);
            setShowAliasManager(false);
            setIsOpen(true);
          }}
        />
      )}

      {/* Favorite Panel */}
      <FavoritePanel
        isOpen={showFavoritePanel}
        onClose={() => setShowFavoritePanel(false)}
        onExecute={(command) => {
          setInput(command);
          setIsOpen(true);
        }}
      />

      {/* Macro Builder */}
      {showMacroBuilder && (
        <MacroBuilder
          onClose={() => setShowMacroBuilder(false)}
          onExecute={(macro, variables) => {
            // Build command with variables
            let command = macro.steps.map(s => s.command).join(' | ');
            Object.entries(variables).forEach(([key, value]) => {
              command = command.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
            });
            setPipelineText(command);
            setShowPipeline(true);
          }}
        />
      )}
    </>
  );
}