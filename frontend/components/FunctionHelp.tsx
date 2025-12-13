/**
 * FunctionHelp - Bloomberg级函数帮助系统
 * 
 * 功能：
 * - 显示所有可用函数代码
 * - 详细参数说明和使用示例
 * - 快速搜索和过滤
 * - 相关函数推荐
 */

import { useState, useMemo } from 'react';
import { Search, Book, Code, Sparkles, X, ChevronRight, Terminal } from 'lucide-react';

interface FunctionDoc {
  code: string;
  category: string;
  name: string;
  description: string;
  syntax: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  examples: string[];
  relatedFunctions?: string[];
}

const FUNCTION_DOCS: FunctionDoc[] = [
  // Market Data
  {
    code: 'GP',
    category: 'Market Data',
    name: '行情总览',
    description: '显示指定股票的实时行情数据，包括价格、涨跌幅、成交量等核心指标',
    syntax: 'GP <symbol>',
    parameters: [
      { name: 'symbol', type: 'string', required: true, description: '股票代码，如600519' }
    ],
    examples: [
      'GP 600519  # 查看贵州茅台行情',
      'GP 000001  # 查看平安银行行情'
    ],
    relatedFunctions: ['DES', 'CN', 'HVG']
  },
  {
    code: 'DES',
    category: 'Market Data',
    name: '公司描述',
    description: '显示公司详细信息，包括所属行业、主营业务、公司简介等',
    syntax: 'DES <symbol>',
    parameters: [
      { name: 'symbol', type: 'string', required: true, description: '股票代码' }
    ],
    examples: ['DES 600519'],
    relatedFunctions: ['GP', 'FA']
  },
  {
    code: 'GIP',
    category: 'Market Data',
    name: '行业行情',
    description: '显示整个行业的综合行情数据',
    syntax: 'GIP <industry>',
    parameters: [
      { name: 'industry', type: 'string', required: true, description: '行业代码或名称' }
    ],
    examples: ['GIP 白酒', 'GIP 新能源'],
    relatedFunctions: ['SECF', 'RESC']
  },

  // Charts & Analysis
  {
    code: 'G',
    category: 'Charts',
    name: 'K线图',
    description: '打开专业K线图界面，支持多周期切换、技术指标叠加、绘图工具等',
    syntax: 'G <symbol> [period]',
    parameters: [
      { name: 'symbol', type: 'string', required: true, description: '股票代码' },
      { name: 'period', type: 'string', required: false, description: '时间周期：1D/5D/1M/3M/6M/1Y' }
    ],
    examples: [
      'G 600519      # 打开茅台K线图',
      'G 600519 1D   # 打开日内分时图',
      'G 300750 3M   # 打开宁德时代3月K线'
    ],
    relatedFunctions: ['GIP', 'COMP', 'HVG']
  },
  {
    code: 'COMP',
    category: 'Charts',
    name: '图表对比',
    description: '在同一图表中对比多只股票的价格走势',
    syntax: 'COMP <symbols>',
    parameters: [
      { name: 'symbols', type: 'string', required: true, description: '多个股票代码，逗号分隔' }
    ],
    examples: [
      'COMP 600519,000858  # 对比茅台和五粮液',
      'COMP 300750,002594  # 对比宁德时代和比亚迪'
    ],
    relatedFunctions: ['G', 'RV']
  },
  {
    code: 'DRAW',
    category: 'Charts',
    name: '绘图工具',
    description: '在K线图上绘制趋势线、支撑位、标注等',
    syntax: 'DRAW <tool>',
    parameters: [
      { name: 'tool', type: 'string', required: false, description: 'line/horizontal/text/rect' }
    ],
    examples: [
      'DRAW line        # 绘制趋势线',
      'DRAW horizontal  # 绘制水平支撑线',
      'DRAW text        # 添加文字标注'
    ],
    relatedFunctions: ['G', 'SAVE']
  },

  // Strategy & Backtest
  {
    code: 'STRAT',
    category: 'Strategy',
    name: '策略实验室',
    description: '打开策略配置界面，创建和编辑量化策略',
    syntax: 'STRAT [action]',
    parameters: [
      { name: 'action', type: 'string', required: false, description: 'new/edit/list' }
    ],
    examples: [
      'STRAT         # 打开策略实验室',
      'STRAT new     # 创建新策略',
      'STRAT list    # 列出所有策略'
    ],
    relatedFunctions: ['BT', 'PORT']
  },
  {
    code: 'BT',
    category: 'Backtest',
    name: '回测',
    description: '对选定策略执行历史回测，评估策略表现',
    syntax: 'BT <strategy> [start] [end]',
    parameters: [
      { name: 'strategy', type: 'string', required: true, description: '策略ID或名称' },
      { name: 'start', type: 'date', required: false, description: '回测开始日期' },
      { name: 'end', type: 'date', required: false, description: '回测结束日期' }
    ],
    examples: [
      'BT momentum-1      # 回测动量策略',
      'BT value-2 2023-01-01 2023-12-31  # 指定时间范围'
    ],
    relatedFunctions: ['STRAT', 'PERF', 'RISK']
  },
  {
    code: 'PERF',
    category: 'Analytics',
    name: '业绩分析',
    description: '查看策略或组合的详细业绩指标',
    syntax: 'PERF <id>',
    parameters: [
      { name: 'id', type: 'string', required: true, description: '策略或组合ID' }
    ],
    examples: ['PERF momentum-1', 'PERF my-portfolio'],
    relatedFunctions: ['BT', 'RISK', 'ATTR']
  },

  // Portfolio & Risk
  {
    code: 'PORT',
    category: 'Portfolio',
    name: '组合管理',
    description: '管理投资组合，查看持仓、收益、风险等',
    syntax: 'PORT [action]',
    parameters: [
      { name: 'action', type: 'string', required: false, description: 'view/create/edit/delete' }
    ],
    examples: [
      'PORT           # 查看组合总览',
      'PORT create    # 创建新组合',
      'PORT edit      # 编辑组合'
    ],
    relatedFunctions: ['RISK', 'PERF', 'OPT']
  },
  {
    code: 'RISK',
    category: 'Risk',
    name: '风险分析',
    description: '分析组合的风险指标，包括VaR、波动率、最大回撤等',
    syntax: 'RISK <portfolio>',
    parameters: [
      { name: 'portfolio', type: 'string', required: true, description: '组合ID' }
    ],
    examples: ['RISK my-portfolio'],
    relatedFunctions: ['PORT', 'VAR', 'STRESS']
  },
  {
    code: 'VAR',
    category: 'Risk',
    name: '在险价值',
    description: '计算组合的VaR (Value at Risk) 和CVaR指标',
    syntax: 'VAR <portfolio> [confidence]',
    parameters: [
      { name: 'portfolio', type: 'string', required: true, description: '组合ID' },
      { name: 'confidence', type: 'number', required: false, description: '置信水平，默认95%' }
    ],
    examples: [
      'VAR my-portfolio      # 95%置信水平',
      'VAR my-portfolio 99   # 99%置信水平'
    ],
    relatedFunctions: ['RISK', 'STRESS']
  },

  // Export & Reports
  {
    code: 'XLS',
    category: 'Export',
    name: '导出Excel',
    description: '将当前数据导出为Excel格式',
    syntax: 'XLS [filename]',
    parameters: [
      { name: 'filename', type: 'string', required: false, description: '文件名，默认自动生成' }
    ],
    examples: [
      'XLS             # 导出到默认文件',
      'XLS report-2024 # 导出到指定文件'
    ],
    relatedFunctions: ['PDF', 'CSV', 'SEND']
  },
  {
    code: 'PDF',
    category: 'Export',
    name: '导出PDF',
    description: '生成专业PDF报告',
    syntax: 'PDF [template]',
    parameters: [
      { name: 'template', type: 'string', required: false, description: '报告模板：standard/detailed/summary' }
    ],
    examples: [
      'PDF              # 标准报告',
      'PDF detailed     # 详细报告',
      'PDF summary      # 摘要报告'
    ],
    relatedFunctions: ['XLS', 'SEND']
  },

  // Search & Filter
  {
    code: 'SECF',
    category: 'Screening',
    name: '股票筛选',
    description: 'Bloomberg级股票筛选器，支持多维度条件组合',
    syntax: 'SECF <criteria>',
    parameters: [
      { name: 'criteria', type: 'object', required: true, description: '筛选条件' }
    ],
    examples: [
      'SECF PE<20 AND ROE>15  # 低估值高ROE',
      'SECF INDUSTRY=白酒      # 白酒行业股票'
    ],
    relatedFunctions: ['RESC', 'WEI']
  },

  // System
  {
    code: 'HELP',
    category: 'System',
    name: '帮助系统',
    description: '显示函数帮助文档（当前界面）',
    syntax: 'HELP [function]',
    parameters: [
      { name: 'function', type: 'string', required: false, description: '函数代码，不填则显示所有' }
    ],
    examples: [
      'HELP       # 显示所有函数',
      'HELP GP    # 查看GP函数详情'
    ],
    relatedFunctions: ['KEYS', 'SETTINGS']
  },
  {
    code: 'KEYS',
    category: 'System',
    name: '快捷键',
    description: '显示所有键盘快捷键',
    syntax: 'KEYS',
    examples: ['KEYS'],
    relatedFunctions: ['HELP']
  }
];

interface FunctionHelpProps {
  isOpen: boolean;
  onClose: () => void;
  initialFunction?: string;
}

export function FunctionHelp({ isOpen, onClose, initialFunction }: FunctionHelpProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFunction, setSelectedFunction] = useState<FunctionDoc | null>(
    initialFunction ? FUNCTION_DOCS.find(f => f.code === initialFunction) || null : null
  );

  const categories = useMemo(() => {
    const cats = new Set(FUNCTION_DOCS.map(f => f.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const filteredFunctions = useMemo(() => {
    return FUNCTION_DOCS.filter(func => {
      const matchesSearch =
        searchTerm === '' ||
        func.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        func.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || func.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e3a5f]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] rounded-lg flex items-center justify-center">
              <Book className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-200">函数代码帮助系统</h2>
              <p className="text-xs text-gray-500">Bloomberg Terminal Function Reference</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1e3a5f]/40 transition-colors text-gray-400 hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r border-[#1e3a5f]/40 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-[#1e3a5f]/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索函数代码..."
                  className="w-full h-10 pl-10 pr-4 bg-[#0d1b2e] border border-[#1e3a5f] rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="p-4 border-b border-[#1e3a5f]/40">
              <div className="text-xs text-gray-500 mb-2">分类</div>
              <div className="flex flex-wrap gap-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#0ea5e9] text-white'
                        : 'bg-[#0d1b2e] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {cat === 'all' ? '全部' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Function List */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                {filteredFunctions.map(func => (
                  <button
                    key={func.code}
                    onClick={() => setSelectedFunction(func)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg mb-1 transition-colors ${
                      selectedFunction?.code === func.code
                        ? 'bg-[#0ea5e9]/10 border border-[#0ea5e9]/30'
                        : 'hover:bg-[#1e3a5f]/20'
                    }`}
                  >
                    <div className="w-10 h-10 bg-[#1e3a5f]/30 rounded flex items-center justify-center flex-shrink-0">
                      <Terminal className="w-4 h-4 text-[#0ea5e9]" />
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-[#0ea5e9]">{func.code}</span>
                        <ChevronRight className="w-3 h-3 text-gray-500" />
                      </div>
                      <div className="text-xs text-gray-400 truncate">{func.name}</div>
                    </div>
                  </button>
                ))}
                {filteredFunctions.length === 0 && (
                  <div className="text-center py-12 text-sm text-gray-500">
                    未找到匹配的函数
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 border-t border-[#1e3a5f]/40">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>共 {FUNCTION_DOCS.length} 个函数</span>
                <span>显示 {filteredFunctions.length} 个</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {selectedFunction ? (
              <div className="p-8">
                {/* Function Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl font-mono text-[#0ea5e9]">{selectedFunction.code}</span>
                    <span className="px-3 py-1 bg-[#1e3a5f]/30 rounded text-xs text-gray-400">
                      {selectedFunction.category}
                    </span>
                  </div>
                  <h3 className="text-xl text-gray-200 mb-2">{selectedFunction.name}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{selectedFunction.description}</p>
                </div>

                {/* Syntax */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Code className="w-4 h-4 text-[#0ea5e9]" />
                    <h4 className="text-sm font-medium text-gray-300">语法</h4>
                  </div>
                  <div className="bg-[#0d1b2e] border border-[#1e3a5f] rounded-lg p-4">
                    <code className="text-sm font-mono text-[#f59e0b]">{selectedFunction.syntax}</code>
                  </div>
                </div>

                {/* Parameters */}
                {selectedFunction.parameters && selectedFunction.parameters.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-[#0ea5e9]" />
                      <h4 className="text-sm font-medium text-gray-300">参数说明</h4>
                    </div>
                    <div className="bg-[#0d1b2e] border border-[#1e3a5f] rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#1e3a5f]">
                            <th className="px-4 py-2 text-left text-xs text-gray-500">参数名</th>
                            <th className="px-4 py-2 text-left text-xs text-gray-500">类型</th>
                            <th className="px-4 py-2 text-left text-xs text-gray-500">必填</th>
                            <th className="px-4 py-2 text-left text-xs text-gray-500">说明</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFunction.parameters.map((param, idx) => (
                            <tr key={idx} className="border-b border-[#1e3a5f]/30 last:border-0">
                              <td className="px-4 py-3 font-mono text-sm text-[#0ea5e9]">{param.name}</td>
                              <td className="px-4 py-3 text-xs text-gray-400">{param.type}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  param.required ? 'bg-[#f97316]/10 text-[#f97316]' : 'bg-[#10b981]/10 text-[#10b981]'
                                }`}>
                                  {param.required ? '必填' : '可选'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-400">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Examples */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal className="w-4 h-4 text-[#0ea5e9]" />
                    <h4 className="text-sm font-medium text-gray-300">使用示例</h4>
                  </div>
                  <div className="space-y-2">
                    {selectedFunction.examples.map((example, idx) => (
                      <div key={idx} className="bg-[#0d1b2e] border border-[#1e3a5f] rounded-lg p-4">
                        <code className="text-sm font-mono text-gray-300">{example}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Related Functions */}
                {selectedFunction.relatedFunctions && selectedFunction.relatedFunctions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ChevronRight className="w-4 h-4 text-[#0ea5e9]" />
                      <h4 className="text-sm font-medium text-gray-300">相关函数</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedFunction.relatedFunctions.map(code => {
                        const relatedFunc = FUNCTION_DOCS.find(f => f.code === code);
                        return relatedFunc ? (
                          <button
                            key={code}
                            onClick={() => setSelectedFunction(relatedFunc)}
                            className="px-3 py-1.5 bg-[#1e3a5f]/30 hover:bg-[#1e3a5f]/50 rounded border border-[#2a4f7f] transition-colors"
                          >
                            <span className="text-xs font-mono text-[#0ea5e9]">{code}</span>
                            <span className="text-xs text-gray-500 ml-2">{relatedFunc.name}</span>
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-12">
                <div>
                  <Book className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <div className="text-lg text-gray-400 mb-2">选择一个函数查看详情</div>
                  <div className="text-sm text-gray-500">
                    左侧列表包含 {FUNCTION_DOCS.length} 个专业函数代码
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1e3a5f]/40 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>快捷键: ESC 关闭 | Ctrl+F 搜索</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-[#0d1b2e] border border-[#1e3a5f] rounded text-xs text-gray-500">
              HELP
            </kbd>
            <span className="text-xs text-gray-500">Bloomberg Terminal Style</span>
          </div>
        </div>
      </div>
    </div>
  );
}
