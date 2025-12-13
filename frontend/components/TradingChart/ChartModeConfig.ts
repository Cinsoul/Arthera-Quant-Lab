/**
 * 专业机构级图表模式配置系统
 * 基于Bloomberg Terminal、TradingView Pro、FactSet等专业平台标准
 */

export type ChartDisplayMode = 'detail' | 'fullscreen' | 'institutional' | 'research';

// 专业指标配置
export interface ProfessionalIndicatorConfig {
  technical: string[];        // 技术指标
  fundamental: string[];      // 基本面指标
  quantitative: string[];     // 量化指标
  risk: string[];            // 风险指标
  market: string[];          // 市场指标
}

// 数据源配置
export interface DataSourceConfig {
  realtime: boolean;         // 实时数据
  level2: boolean;           // Level 2数据
  darkPool: boolean;         // 暗池数据
  crossVenue: boolean;       // 跨交易所数据
  historical: 'basic' | 'complete' | 'institutional';
}

// 风险管理配置
export interface RiskManagementConfig {
  positionSizing: boolean;   // 仓位管理
  varCalculation: boolean;   // VaR计算
  stressTest: boolean;       // 压力测试
  correlation: boolean;      // 相关性分析
  liquidityRisk: boolean;    // 流动性风险
}

export interface ChartModeConfig {
  // 布局配置
  layout: {
    showHeader: boolean;
    showSidebar: boolean; 
    showNavTabs: boolean;
    showPerformanceStrip: boolean;
    showNewsPanel: boolean;
    showOrderBook: boolean;       // 订单簿
    showTimeAndSales: boolean;    // 时间与销售
    showOptionChain: boolean;     // 期权链
    padding: string;
    multiPanelSupport: boolean;   // 多面板支持
  };
  
  // 图表功能配置
  features: {
    drawingTools: 'none' | 'basic' | 'advanced' | 'institutional';
    indicators: ProfessionalIndicatorConfig;
    timeframes: 'basic' | 'extended' | 'institutional';
    chartTypes: 'basic' | 'professional' | 'institutional';
    volumeAnalysis: 'basic' | 'advanced' | 'institutional';
    marketDepth: boolean;
    advancedOrders: boolean;      // 高级订单类型
    algorithmicTrading: boolean;  // 算法交易
  };
  
  // 数据源配置
  dataSource: DataSourceConfig;
  
  // 风险管理
  riskManagement: RiskManagementConfig;
  
  // 交互配置
  interactions: {
    quickSymbolSwitch: boolean;
    keyboardShortcuts: 'none' | 'basic' | 'professional' | 'institutional';
    gestureSupport: boolean;
    multiChartSync: boolean;
    crosshairTracking: 'simple' | 'advanced' | 'institutional';
    hotkeys: string[];           // 专业热键
    mouseWheelZoom: boolean;     // 鼠标滚轮缩放
    panAndZoom: 'basic' | 'professional';
  };
  
  // 数据显示配置
  dataDisplay: {
    pricePanel: 'compact' | 'detailed' | 'institutional';
    newsIntegration: boolean;
    fundamentals: boolean;
    orderBook: boolean;
    marketEvents: boolean;
    economicCalendar: boolean;   // 经济日历
    earnings: boolean;           // 财报数据
    analyst: boolean;            // 分析师评级
    sentiment: boolean;          // 市场情绪
    flowData: boolean;           // 资金流向
  };
  
  // 性能配置
  performance: {
    enableWebGL: boolean;        // WebGL加速
    maxDataPoints: number;       // 最大数据点
    updateInterval: number;      // 更新间隔
    compressionLevel: 'none' | 'basic' | 'aggressive';
  };
  
  // 尺寸配置
  dimensions: {
    minHeight: number;
    maxHeight?: number;
    preferredHeight: number;
    aspectRatio?: number;
  };
  
  // 导出配置
  export: {
    formats: string[];           // 支持的导出格式
    resolution: 'standard' | 'high' | 'print';
    watermark: boolean;
  };
}

// 专业指标配置集合
const PROFESSIONAL_INDICATORS = {
  technical: ['SMA', 'EMA', 'MACD', 'RSI', 'Bollinger Bands', 'Stochastic', 'Williams %R', 'ADX', 'CCI', 'Momentum'],
  fundamental: ['P/E', 'P/B', 'ROE', 'ROA', 'Debt/Equity', 'Revenue Growth', 'EPS Growth', 'Free Cash Flow'],
  quantitative: ['Sharpe Ratio', 'Alpha', 'Beta', 'Information Ratio', 'Treynor Ratio', 'Calmar Ratio'],
  risk: ['VaR', 'Expected Shortfall', 'Maximum Drawdown', 'Volatility', 'Correlation', 'Delta', 'Gamma'],
  market: ['Volume Profile', 'VWAP', 'Money Flow Index', 'On-Balance Volume', 'Accumulation/Distribution']
};

const BASIC_INDICATORS = {
  technical: ['SMA', 'EMA', 'MACD', 'RSI'],
  fundamental: ['P/E', 'P/B', 'ROE'],
  quantitative: ['Sharpe Ratio', 'Beta'],
  risk: ['Volatility'],
  market: ['VWAP', 'Volume']
};

// 股票详情图表配置 (嵌入模式)
export const DETAIL_CHART_CONFIG: ChartModeConfig = {
  layout: {
    showHeader: true,
    showSidebar: true,
    showNavTabs: true,
    showPerformanceStrip: true,
    showNewsPanel: false,
    showOrderBook: false,
    showTimeAndSales: false,
    showOptionChain: false,
    padding: 'p-4',
    multiPanelSupport: false
  },
  
  features: {
    drawingTools: 'basic',
    indicators: BASIC_INDICATORS,
    timeframes: 'basic',
    chartTypes: 'basic',
    volumeAnalysis: 'basic',
    marketDepth: false,
    advancedOrders: false,
    algorithmicTrading: false
  },
  
  dataSource: {
    realtime: true,
    level2: false,
    darkPool: false,
    crossVenue: false,
    historical: 'basic'
  },
  
  riskManagement: {
    positionSizing: false,
    varCalculation: false,
    stressTest: false,
    correlation: false,
    liquidityRisk: false
  },
  
  interactions: {
    quickSymbolSwitch: true,
    keyboardShortcuts: 'basic',
    gestureSupport: true,
    multiChartSync: false,
    crosshairTracking: 'simple',
    hotkeys: ['Space', 'Escape'],
    mouseWheelZoom: true,
    panAndZoom: 'basic'
  },
  
  dataDisplay: {
    pricePanel: 'compact',
    newsIntegration: true,
    fundamentals: true,
    orderBook: false,
    marketEvents: true,
    economicCalendar: false,
    earnings: true,
    analyst: false,
    sentiment: false,
    flowData: false
  },
  
  performance: {
    enableWebGL: false,
    maxDataPoints: 5000,
    updateInterval: 1000,
    compressionLevel: 'basic'
  },
  
  dimensions: {
    minHeight: 400,
    preferredHeight: 500,
    aspectRatio: 16/9
  },
  
  export: {
    formats: ['PNG', 'SVG'],
    resolution: 'standard',
    watermark: false
  }
};

// 全局图表配置 (全屏专业模式)
export const FULLSCREEN_CHART_CONFIG: ChartModeConfig = {
  layout: {
    showHeader: true,
    showSidebar: false,
    showNavTabs: false,
    showPerformanceStrip: false,
    showNewsPanel: false,
    showOrderBook: true,
    showTimeAndSales: true,
    showOptionChain: false,
    padding: 'p-2',
    multiPanelSupport: true
  },
  
  features: {
    drawingTools: 'advanced',
    indicators: PROFESSIONAL_INDICATORS,
    timeframes: 'extended',
    chartTypes: 'professional',
    volumeAnalysis: 'advanced',
    marketDepth: true,
    advancedOrders: true,
    algorithmicTrading: false
  },
  
  dataSource: {
    realtime: true,
    level2: true,
    darkPool: false,
    crossVenue: false,
    historical: 'complete'
  },
  
  riskManagement: {
    positionSizing: true,
    varCalculation: false,
    stressTest: false,
    correlation: true,
    liquidityRisk: false
  },
  
  interactions: {
    quickSymbolSwitch: false,
    keyboardShortcuts: 'professional',
    gestureSupport: false,
    multiChartSync: true,
    crosshairTracking: 'advanced',
    hotkeys: ['Space', 'Escape', 'F1', 'F2', 'F3', 'F4', 'Ctrl+Z', 'Ctrl+Y'],
    mouseWheelZoom: true,
    panAndZoom: 'professional'
  },
  
  dataDisplay: {
    pricePanel: 'detailed',
    newsIntegration: false,
    fundamentals: true,
    orderBook: true,
    marketEvents: true,
    economicCalendar: false,
    earnings: true,
    analyst: true,
    sentiment: false,
    flowData: true
  },
  
  performance: {
    enableWebGL: true,
    maxDataPoints: 50000,
    updateInterval: 100,
    compressionLevel: 'basic'
  },
  
  dimensions: {
    minHeight: 600,
    preferredHeight: typeof window !== 'undefined' ? window.innerHeight - 100 : 800
  },
  
  export: {
    formats: ['PNG', 'SVG', 'PDF', 'Excel'],
    resolution: 'high',
    watermark: true
  }
};

// 机构级专业图表配置
export const INSTITUTIONAL_CHART_CONFIG: ChartModeConfig = {
  layout: {
    showHeader: true,
    showSidebar: false,
    showNavTabs: false,
    showPerformanceStrip: false,
    showNewsPanel: true,
    showOrderBook: true,
    showTimeAndSales: true,
    showOptionChain: true,
    padding: 'p-1',
    multiPanelSupport: true
  },
  
  features: {
    drawingTools: 'institutional',
    indicators: PROFESSIONAL_INDICATORS,
    timeframes: 'institutional',
    chartTypes: 'institutional',
    volumeAnalysis: 'institutional',
    marketDepth: true,
    advancedOrders: true,
    algorithmicTrading: true
  },
  
  dataSource: {
    realtime: true,
    level2: true,
    darkPool: true,
    crossVenue: true,
    historical: 'institutional'
  },
  
  riskManagement: {
    positionSizing: true,
    varCalculation: true,
    stressTest: true,
    correlation: true,
    liquidityRisk: true
  },
  
  interactions: {
    quickSymbolSwitch: false,
    keyboardShortcuts: 'institutional',
    gestureSupport: false,
    multiChartSync: true,
    crosshairTracking: 'institutional',
    hotkeys: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
    mouseWheelZoom: true,
    panAndZoom: 'professional'
  },
  
  dataDisplay: {
    pricePanel: 'institutional',
    newsIntegration: true,
    fundamentals: true,
    orderBook: true,
    marketEvents: true,
    economicCalendar: true,
    earnings: true,
    analyst: true,
    sentiment: true,
    flowData: true
  },
  
  performance: {
    enableWebGL: true,
    maxDataPoints: 100000,
    updateInterval: 50,
    compressionLevel: 'none'
  },
  
  dimensions: {
    minHeight: 800,
    preferredHeight: typeof window !== 'undefined' ? window.innerHeight - 50 : 1000
  },
  
  export: {
    formats: ['PNG', 'SVG', 'PDF', 'Excel', 'CSV', 'JSON'],
    resolution: 'print',
    watermark: true
  }
};

// 研究分析配置
export const RESEARCH_CHART_CONFIG: ChartModeConfig = {
  layout: {
    showHeader: true,
    showSidebar: true,
    showNavTabs: true,
    showPerformanceStrip: true,
    showNewsPanel: true,
    showOrderBook: false,
    showTimeAndSales: false,
    showOptionChain: false,
    padding: 'p-3',
    multiPanelSupport: true
  },
  
  features: {
    drawingTools: 'advanced',
    indicators: PROFESSIONAL_INDICATORS,
    timeframes: 'extended',
    chartTypes: 'professional',
    volumeAnalysis: 'advanced',
    marketDepth: false,
    advancedOrders: false,
    algorithmicTrading: false
  },
  
  dataSource: {
    realtime: true,
    level2: false,
    darkPool: false,
    crossVenue: false,
    historical: 'complete'
  },
  
  riskManagement: {
    positionSizing: true,
    varCalculation: true,
    stressTest: true,
    correlation: true,
    liquidityRisk: false
  },
  
  interactions: {
    quickSymbolSwitch: true,
    keyboardShortcuts: 'professional',
    gestureSupport: true,
    multiChartSync: true,
    crosshairTracking: 'advanced',
    hotkeys: ['Space', 'Escape', 'F1', 'F2', 'F3', 'Ctrl+C', 'Ctrl+V'],
    mouseWheelZoom: true,
    panAndZoom: 'professional'
  },
  
  dataDisplay: {
    pricePanel: 'detailed',
    newsIntegration: true,
    fundamentals: true,
    orderBook: false,
    marketEvents: true,
    economicCalendar: true,
    earnings: true,
    analyst: true,
    sentiment: true,
    flowData: true
  },
  
  performance: {
    enableWebGL: true,
    maxDataPoints: 75000,
    updateInterval: 500,
    compressionLevel: 'basic'
  },
  
  dimensions: {
    minHeight: 500,
    preferredHeight: 700,
    aspectRatio: 16/10
  },
  
  export: {
    formats: ['PNG', 'SVG', 'PDF', 'PowerPoint'],
    resolution: 'high',
    watermark: false
  }
};

// 获取配置的工具函数
export function getChartConfig(mode: ChartDisplayMode): ChartModeConfig {
  switch (mode) {
    case 'detail':
      return DETAIL_CHART_CONFIG;
    case 'fullscreen':
      return FULLSCREEN_CHART_CONFIG;
    case 'institutional':
      return INSTITUTIONAL_CHART_CONFIG;
    case 'research':
      return RESEARCH_CHART_CONFIG;
    default:
      return DETAIL_CHART_CONFIG;
  }
}

// 专业配置分析工具
export function getConfigCapabilities(mode: ChartDisplayMode) {
  const config = getChartConfig(mode);
  return {
    complexity: {
      score: calculateComplexityScore(config),
      level: getComplexityLevel(config)
    },
    dataRequirements: {
      realtime: config.dataSource.realtime,
      professional: config.dataSource.level2 || config.dataSource.darkPool,
      institutional: config.dataSource.crossVenue
    },
    userType: getUserType(config),
    recommendedFor: getRecommendations(mode)
  };
}

// 复杂度计算
function calculateComplexityScore(config: ChartModeConfig): number {
  let score = 0;
  
  // 布局复杂度
  score += Object.values(config.layout).filter(Boolean).length;
  
  // 功能复杂度
  if (config.features.drawingTools === 'institutional') score += 10;
  else if (config.features.drawingTools === 'advanced') score += 7;
  else if (config.features.drawingTools === 'basic') score += 3;
  
  // 指标复杂度
  const totalIndicators = Object.values(config.features.indicators)
    .reduce((sum, arr) => sum + arr.length, 0);
  score += totalIndicators;
  
  // 风险管理复杂度
  score += Object.values(config.riskManagement).filter(Boolean).length * 2;
  
  return score;
}

function getComplexityLevel(config: ChartModeConfig): 'basic' | 'intermediate' | 'advanced' | 'professional' {
  const score = calculateComplexityScore(config);
  if (score > 80) return 'professional';
  if (score > 50) return 'advanced';
  if (score > 25) return 'intermediate';
  return 'basic';
}

function getUserType(config: ChartModeConfig): string {
  if (config.dataSource.crossVenue && config.riskManagement.varCalculation) {
    return 'institutional_trader';
  }
  if (config.features.algorithmicTrading) {
    return 'professional_trader';
  }
  if (config.dataDisplay.analyst && config.dataDisplay.fundamentals) {
    return 'research_analyst';
  }
  return 'retail_investor';
}

function getRecommendations(mode: ChartDisplayMode): string[] {
  switch (mode) {
    case 'detail':
      return ['快速分析', '移动端查看', '嵌入式展示', '基础投资者'];
    case 'fullscreen':
      return ['专业分析', '日内交易', '技术分析师', '活跃投资者'];
    case 'institutional':
      return ['机构交易', '高频交易', '风险管理', '专业交易员'];
    case 'research':
      return ['投资研究', '基本面分析', '报告制作', '投资顾问'];
    default:
      return ['通用场景'];
  }
}

// 动态配置生成器
export function createCustomConfig(
  baseMode: ChartDisplayMode,
  overrides: Partial<ChartModeConfig>
): ChartModeConfig {
  const baseConfig = getChartConfig(baseMode);
  return {
    ...baseConfig,
    ...overrides,
    layout: { ...baseConfig.layout, ...overrides.layout },
    features: { ...baseConfig.features, ...overrides.features },
    dataSource: { ...baseConfig.dataSource, ...overrides.dataSource },
    riskManagement: { ...baseConfig.riskManagement, ...overrides.riskManagement },
    interactions: { ...baseConfig.interactions, ...overrides.interactions },
    dataDisplay: { ...baseConfig.dataDisplay, ...overrides.dataDisplay },
    performance: { ...baseConfig.performance, ...overrides.performance },
    dimensions: { ...baseConfig.dimensions, ...overrides.dimensions },
    export: { ...baseConfig.export, ...overrides.export }
  };
}

// 配置比较工具
export function compareConfigs(mode1: ChartDisplayMode, mode2: ChartDisplayMode) {
  const config1 = getChartConfig(mode1);
  const config2 = getChartConfig(mode2);
  
  return {
    layoutDifferences: {
      sidebar: config1.layout.showSidebar !== config2.layout.showSidebar,
      navTabs: config1.layout.showNavTabs !== config2.layout.showNavTabs,
      performanceStrip: config1.layout.showPerformanceStrip !== config2.layout.showPerformanceStrip,
      orderBook: config1.layout.showOrderBook !== config2.layout.showOrderBook,
      multiPanel: config1.layout.multiPanelSupport !== config2.layout.multiPanelSupport
    },
    featureDifferences: {
      drawingTools: config1.features.drawingTools !== config2.features.drawingTools,
      marketDepth: config1.features.marketDepth !== config2.features.marketDepth,
      algorithmicTrading: config1.features.algorithmicTrading !== config2.features.algorithmicTrading
    },
    dataDifferences: {
      level2: config1.dataSource.level2 !== config2.dataSource.level2,
      darkPool: config1.dataSource.darkPool !== config2.dataSource.darkPool,
      crossVenue: config1.dataSource.crossVenue !== config2.dataSource.crossVenue
    },
    riskDifferences: {
      varCalculation: config1.riskManagement.varCalculation !== config2.riskManagement.varCalculation,
      stressTest: config1.riskManagement.stressTest !== config2.riskManagement.stressTest,
      correlation: config1.riskManagement.correlation !== config2.riskManagement.correlation
    },
    interactionDifferences: {
      symbolSwitch: config1.interactions.quickSymbolSwitch !== config2.interactions.quickSymbolSwitch,
      shortcuts: config1.interactions.keyboardShortcuts !== config2.interactions.keyboardShortcuts,
      multiChart: config1.interactions.multiChartSync !== config2.interactions.multiChartSync
    }
  };
}

// 导出所有配置
export const CHART_CONFIGS = {
  DETAIL_CHART_CONFIG,
  FULLSCREEN_CHART_CONFIG,
  INSTITUTIONAL_CHART_CONFIG,
  RESEARCH_CHART_CONFIG
} as const;

// 模式配置映射
export const CHART_MODE_CONFIGS = {
  detail: DETAIL_CHART_CONFIG,
  fullscreen: FULLSCREEN_CHART_CONFIG,
  institutional: INSTITUTIONAL_CHART_CONFIG,
  research: RESEARCH_CHART_CONFIG
} as const;