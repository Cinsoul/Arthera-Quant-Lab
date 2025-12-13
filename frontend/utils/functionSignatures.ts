/**
 * Function Signatures Database
 * Bloomberg级函数参数定义库
 */

import { FunctionSignature } from '../components/ParameterHelper';

export const FUNCTION_SIGNATURES: Record<string, FunctionSignature> = {
  // === Market Data Functions ===
  GP: {
    code: 'GP',
    name: 'Price Graph',
    description: '显示股票实时行情和价格图表',
    category: 'Market Data',
    parameters: [
      {
        name: 'symbol',
        type: 'string',
        required: true,
        description: '股票代码',
        pattern: '^\\d{6}$',
        example: '600519'
      },
      {
        name: 'period',
        type: 'enum',
        required: false,
        description: '时间周期',
        enumValues: ['1D', '5D', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'],
        default: '1M',
        example: '1M'
      }
    ],
    examples: [
      'GP 600519',
      'GP 600519 1D',
      'GP 300750 3M'
    ]
  },

  DES: {
    code: 'DES',
    name: 'Description',
    description: '显示公司详细信息和基本面数据',
    category: 'Market Data',
    parameters: [
      {
        name: 'symbol',
        type: 'string',
        required: true,
        description: '股票代码',
        pattern: '^\\d{6}$',
        example: '600519'
      }
    ],
    examples: ['DES 600519', 'DES 000858']
  },

  HP: {
    code: 'HP',
    name: 'Historical Prices',
    description: '查询历史价格数据',
    category: 'Market Data',
    parameters: [
      {
        name: 'symbol',
        type: 'string',
        required: true,
        description: '股票代码',
        example: '600519'
      },
      {
        name: 'start',
        type: 'date',
        required: false,
        description: '开始日期',
        example: '2024-01-01'
      },
      {
        name: 'end',
        type: 'date',
        required: false,
        description: '结束日期',
        example: '2024-12-09'
      }
    ],
    examples: [
      'HP 600519',
      'HP 600519 2024-01-01 2024-12-09',
      'HP 000858 2024-06-01'
    ]
  },

  COMP: {
    code: 'COMP',
    name: 'Compare',
    description: '对比多只股票的价格走势',
    category: 'Charts',
    parameters: [
      {
        name: 'symbols',
        type: 'array',
        required: true,
        description: '股票代码列表（逗号分隔）',
        example: '600519,000858,300750'
      },
      {
        name: 'period',
        type: 'enum',
        required: false,
        description: '时间周期',
        enumValues: ['1D', '5D', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'],
        default: '3M',
        example: '3M'
      }
    ],
    examples: [
      'COMP 600519,000858',
      'COMP 600519,000858,300750 1Y'
    ]
  },

  // === Strategy Functions ===
  STRAT: {
    code: 'STRAT',
    name: 'Strategy Configuration',
    description: '配置和管理交易策略',
    category: 'Strategy',
    parameters: [
      {
        name: 'action',
        type: 'enum',
        required: true,
        description: '操作类型',
        enumValues: ['new', 'edit', 'delete', 'list'],
        example: 'new'
      },
      {
        name: 'name',
        type: 'string',
        required: false,
        description: '策略名称',
        example: 'momentum-strategy'
      },
      {
        name: 'config',
        type: 'object',
        required: false,
        description: '策略配置（JSON格式）',
        example: '{"ma":20,"rsi":14}'
      }
    ],
    examples: [
      'STRAT new',
      'STRAT edit momentum-strategy',
      'STRAT new name=test-strategy config={"ma":20}'
    ]
  },

  BT: {
    code: 'BT',
    name: 'Backtest',
    description: '运行策略回测',
    category: 'Backtest',
    parameters: [
      {
        name: 'strategy',
        type: 'string',
        required: true,
        description: '策略ID或名称',
        example: 'momentum-1'
      },
      {
        name: 'start',
        type: 'date',
        required: false,
        description: '回测开始日期',
        example: '2023-01-01'
      },
      {
        name: 'end',
        type: 'date',
        required: false,
        description: '回测结束日期',
        example: '2024-12-09'
      },
      {
        name: 'capital',
        type: 'number',
        required: false,
        description: '初始资金',
        min: 0,
        default: 1000000,
        example: '1000000'
      }
    ],
    examples: [
      'BT momentum-1',
      'BT momentum-1 2023-01-01 2024-12-09',
      'BT momentum-1 start=2023-01-01 capital=5000000'
    ]
  },

  BTCMP: {
    code: 'BTCMP',
    name: 'Backtest Compare',
    description: '对比多个回测结果',
    category: 'Backtest',
    parameters: [
      {
        name: 'backtests',
        type: 'array',
        required: true,
        description: '回测ID列表（逗号分隔）',
        example: 'bt-1,bt-2,bt-3'
      },
      {
        name: 'metrics',
        type: 'array',
        required: false,
        description: '对比指标列表',
        enumValues: ['return', 'sharpe', 'drawdown', 'winrate', 'all'],
        default: 'all',
        example: 'return,sharpe,drawdown'
      }
    ],
    examples: [
      'BTCMP bt-1,bt-2',
      'BTCMP bt-1,bt-2,bt-3 metrics=return,sharpe'
    ]
  },

  // === Portfolio Functions ===
  PORT: {
    code: 'PORT',
    name: 'Portfolio Analysis',
    description: '组合分析和体检',
    category: 'Portfolio',
    parameters: [
      {
        name: 'action',
        type: 'enum',
        required: false,
        description: '分析类型',
        enumValues: ['overview', 'risk', 'performance', 'attribution'],
        default: 'overview',
        example: 'risk'
      }
    ],
    examples: [
      'PORT',
      'PORT overview',
      'PORT risk'
    ]
  },

  VAR: {
    code: 'VAR',
    name: 'Value at Risk',
    description: '计算风险价值VaR',
    category: 'Risk',
    parameters: [
      {
        name: 'confidence',
        type: 'number',
        required: false,
        description: '置信水平（%）',
        min: 90,
        max: 99,
        default: 95,
        example: '95'
      },
      {
        name: 'horizon',
        type: 'number',
        required: false,
        description: '时间范围（天）',
        min: 1,
        max: 252,
        default: 1,
        example: '1'
      },
      {
        name: 'method',
        type: 'enum',
        required: false,
        description: '计算方法',
        enumValues: ['historical', 'parametric', 'monte-carlo'],
        default: 'historical',
        example: 'historical'
      }
    ],
    examples: [
      'VAR',
      'VAR confidence=99',
      'VAR confidence=95 horizon=10 method=monte-carlo'
    ]
  },

  RISK: {
    code: 'RISK',
    name: 'Risk Analysis',
    description: '综合风险分析',
    category: 'Risk',
    parameters: [
      {
        name: 'type',
        type: 'enum',
        required: false,
        description: '风险类型',
        enumValues: ['market', 'credit', 'liquidity', 'operational', 'all'],
        default: 'all',
        example: 'market'
      }
    ],
    examples: [
      'RISK',
      'RISK market',
      'RISK all'
    ]
  },

  // === Screening Functions ===
  EQS: {
    code: 'EQS',
    name: 'Equity Screening',
    description: '股票多因子筛选',
    category: 'Screening',
    parameters: [
      {
        name: 'filters',
        type: 'object',
        required: false,
        description: '筛选条件（JSON格式）',
        example: '{"pe":[0,20],"roe":[10,100]}'
      },
      {
        name: 'sort',
        type: 'enum',
        required: false,
        description: '排序字段',
        enumValues: ['pe', 'pb', 'roe', 'roa', 'market_cap', 'volume'],
        example: 'pe'
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: '返回数量',
        min: 1,
        max: 100,
        default: 50,
        example: '20'
      }
    ],
    examples: [
      'EQS',
      'EQS filters={"pe":[0,20]} sort=pe limit=20',
      'EQS sort=market_cap limit=50'
    ]
  },

  // === Technical Analysis ===
  MA: {
    code: 'MA',
    name: 'Moving Average',
    description: '移动平均线分析',
    category: 'Technical',
    parameters: [
      {
        name: 'symbol',
        type: 'string',
        required: true,
        description: '股票代码',
        example: '600519'
      },
      {
        name: 'periods',
        type: 'array',
        required: false,
        description: '周期列表',
        default: '5,10,20,60',
        example: '5,10,20'
      },
      {
        name: 'type',
        type: 'enum',
        required: false,
        description: 'MA类型',
        enumValues: ['SMA', 'EMA', 'WMA'],
        default: 'SMA',
        example: 'EMA'
      }
    ],
    examples: [
      'MA 600519',
      'MA 600519 periods=5,10,20',
      'MA 600519 periods=10,20,60 type=EMA'
    ]
  },

  RSI: {
    code: 'RSI',
    name: 'RSI Indicator',
    description: '相对强弱指标分析',
    category: 'Technical',
    parameters: [
      {
        name: 'symbol',
        type: 'string',
        required: true,
        description: '股票代码',
        example: '600519'
      },
      {
        name: 'period',
        type: 'number',
        required: false,
        description: 'RSI周期',
        min: 2,
        max: 100,
        default: 14,
        example: '14'
      },
      {
        name: 'overbought',
        type: 'number',
        required: false,
        description: '超买线',
        min: 50,
        max: 100,
        default: 70,
        example: '70'
      },
      {
        name: 'oversold',
        type: 'number',
        required: false,
        description: '超卖线',
        min: 0,
        max: 50,
        default: 30,
        example: '30'
      }
    ],
    examples: [
      'RSI 600519',
      'RSI 600519 period=14',
      'RSI 600519 period=14 overbought=80 oversold=20'
    ]
  },

  MACD: {
    code: 'MACD',
    name: 'MACD Indicator',
    description: 'MACD指标分析',
    category: 'Technical',
    parameters: [
      {
        name: 'symbol',
        type: 'string',
        required: true,
        description: '股票代码',
        example: '600519'
      },
      {
        name: 'fast',
        type: 'number',
        required: false,
        description: '快线周期',
        default: 12,
        example: '12'
      },
      {
        name: 'slow',
        type: 'number',
        required: false,
        description: '慢线周期',
        default: 26,
        example: '26'
      },
      {
        name: 'signal',
        type: 'number',
        required: false,
        description: '信号线周期',
        default: 9,
        example: '9'
      }
    ],
    examples: [
      'MACD 600519',
      'MACD 600519 fast=12 slow=26 signal=9'
    ]
  },

  // === Export Functions ===
  EXPORT: {
    code: 'EXPORT',
    name: 'Export Data',
    description: '导出数据到文件',
    category: 'Action',
    parameters: [
      {
        name: 'format',
        type: 'enum',
        required: true,
        description: '导出格式',
        enumValues: ['excel', 'csv', 'pdf', 'json'],
        example: 'excel'
      },
      {
        name: 'data',
        type: 'enum',
        required: true,
        description: '数据类型',
        enumValues: ['backtest', 'portfolio', 'strategy', 'report'],
        example: 'backtest'
      },
      {
        name: 'id',
        type: 'string',
        required: false,
        description: '数据ID',
        example: 'bt-1'
      }
    ],
    examples: [
      'EXPORT excel backtest id=bt-1',
      'EXPORT pdf report id=rpt-2024-12',
      'EXPORT csv portfolio'
    ]
  },

  // === System Functions ===
  HELP: {
    code: 'HELP',
    name: 'Help System',
    description: '打开函数帮助系统',
    category: 'System',
    parameters: [
      {
        name: 'function',
        type: 'string',
        required: false,
        description: '函数代码（可选）',
        example: 'GP'
      }
    ],
    examples: [
      'HELP',
      'HELP GP',
      'HELP BT'
    ]
  },

  SRCH: {
    code: 'SRCH',
    name: 'Global Search',
    description: '全局搜索股票、策略、报告',
    category: 'Action',
    parameters: [
      {
        name: 'query',
        type: 'string',
        required: true,
        description: '搜索关键词',
        example: '茅台'
      },
      {
        name: 'type',
        type: 'enum',
        required: false,
        description: '搜索类型',
        enumValues: ['all', 'stocks', 'strategies', 'reports'],
        default: 'all',
        example: 'stocks'
      }
    ],
    examples: [
      'SRCH 茅台',
      'SRCH 茅台 type=stocks',
      'SRCH momentum type=strategies'
    ]
  }
};

/**
 * Get function signature by code
 */
export function getFunctionSignature(code: string): FunctionSignature | null {
  return FUNCTION_SIGNATURES[code.toUpperCase()] || null;
}

/**
 * Get all function codes
 */
export function getAllFunctionCodes(): string[] {
  return Object.keys(FUNCTION_SIGNATURES);
}

/**
 * Search function signatures
 */
export function searchFunctionSignatures(query: string): FunctionSignature[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(FUNCTION_SIGNATURES).filter(
    sig =>
      sig.code.toLowerCase().includes(lowerQuery) ||
      sig.name.toLowerCase().includes(lowerQuery) ||
      sig.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get functions by category
 */
export function getFunctionsByCategory(category: string): FunctionSignature[] {
  return Object.values(FUNCTION_SIGNATURES).filter(sig => sig.category === category);
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  const categories = new Set(Object.values(FUNCTION_SIGNATURES).map(sig => sig.category));
  return Array.from(categories).sort();
}
