import { useState } from 'react';

const glossaryTerms = [
  {
    category: '收益指标',
    color: '#10b981',
    terms: [
      {
        term: '年化收益率',
        english: 'Annualized Return',
        definition: '将投资期间的总收益率转换为年度收益率，便于不同期限投资的对比。',
        analogy: '就像把一个月赚的钱换算成一年能赚多少，方便比较长短期投资。',
        formula: '年化收益率 = (1 + 总收益率)^(365/投资天数) - 1',
        example: '投资 100 天，收益 10%，年化 = (1.1)^(365/100) - 1 ≈ 42.6%',
        importance: 'high',
      },
      {
        term: '累计收益率',
        english: 'Cumulative Return',
        definition: '从投资开始到结束，资产净值的总体增长百分比。',
        analogy: '投入10万，最后变成14.8万，累计收益率就是48%。',
        formula: '累计收益率 = (期末净值 - 期初净值) / 期初净值',
        example: '期初净值 1.00，期末净值 1.48，累计收益 = 48%',
        importance: 'high',
      },
      {
        term: '超额收益',
        english: 'Excess Return / Alpha',
        definition: '相对于基准（如沪深300）的额外收益，衡量主动管理的价值。',
        analogy: '基准涨了14%，你涨了48%，超额收益就是34%。',
        formula: '超额收益 = 策略收益 - 基准收益',
        example: '策略年化 42.3%，沪深300 年化 14%，Alpha = 28.3%',
        importance: 'high',
      },
    ],
  },
  {
    category: '风险指标',
    color: '#f97316',
    terms: [
      {
        term: '最大回撤',
        english: 'Maximum Drawdown',
        definition: '从历史最高点到最低点的最大跌幅，衡量"最惨的时候亏了多少"。',
        analogy: '账户最高到过15万，后来最低跌到13.77万，回撤就是 -8.2%。',
        formula: '最大回撤 = (最低点净值 - 最高点净值) / 最高点净值',
        example: '峰值净值 1.50，谷底净值 1.38，MDD = (1.38-1.50)/1.50 = -8%',
        importance: 'high',
      },
      {
        term: '波动率',
        english: 'Volatility',
        definition: '收益率的标准差，衡量投资收益的稳定性，越高说明越不稳定。',
        analogy: '每天涨跌幅度大，像过山车，波动率就高；稳稳地涨，波动率低。',
        formula: '波动率 = 收益率的标准差 × √252（年化）',
        example: '日收益率标准差 1.2%，年化波动率 = 1.2% × √252 ≈ 19%',
        importance: 'medium',
      },
      {
        term: 'VaR',
        english: 'Value at Risk',
        definition: '在一定置信度下，未来特定时间内可能的最大损失。',
        analogy: '95%置信度VaR=-370K，意思是95%的情况下，损失不会超过37万。',
        formula: 'VaR = 投资组合价值 × 收益率分位数',
        example: '投资组合价值 1000K，95% VaR 分位数 -0.37，VaR = 1000K × -0.37 = -370K',
        importance: 'medium',
      },
    ],
  },
  {
    category: '风险调整收益',
    color: '#0ea5e9',
    terms: [
      {
        term: '夏普比率',
        english: 'Sharpe Ratio',
        definition: '每承担一单位风险（波动），获得的超额收益，越高说明性价比越好。',
        analogy: '同样是冒险，一个人赚100块，一个赚200块，后者夏普比率更高。',
        formula: '夏普 = (年化收益 - 无风险利率) / 波动率',
        example: '年化收益 42.3%，无风险利率 3%，波动率 19%，夏普 = (42.3%-3%)/19% ≈ 2.07',
        importance: 'high',
      },
      {
        term: 'Sortino比率',
        english: 'Sortino Ratio',
        definition: '只考虑下行波动的风险调整收益，比夏普更关注"亏钱的风险"。',
        analogy: '夏普看总波动，Sortino只看跌的时候的波动，更关注亏损风险。',
        formula: 'Sortino = (年化收益 - 无风险利率) / 下行标准差',
        example: '年化收益 10%，无风险利率 2%，下行标准差 10%，Sortino = (10%-2%)/10% = 0.8',
        importance: 'high',
      },
      {
        term: 'Calmar比率',
        english: 'Calmar Ratio',
        definition: '年化收益除以最大回撤，衡量承受最大损失换来的收益。',
        analogy: '最惨的时候亏8.2%，但年化赚42.3%，Calmar = 42.3/8.2 = 5.16。',
        formula: 'Calmar = 年化收益 / |最大回撤|',
        example: '年化收益 42.3%，最大回撤 8.2%，Calmar = 42.3/8.2 ≈ 5.16',
        importance: 'high',
      },
    ],
  },
  {
    category: '交易指标',
    color: '#8b5cf6',
    terms: [
      {
        term: '换手率',
        english: 'Turnover Rate',
        definition: '一定时期内买卖股票的总金额与组合市值的比率，衡量交易频繁程度。',
        analogy: '组合10M，一年交易了24.5M，换手率就是245%。频繁换股会增加成本。',
        formula: '换手率 = (买入+卖出总额) / 2 / 平均持仓市值',
        example: '买入 15M，卖出 15M，平均持仓市值 10M，换手率 = (15M+15M)/2/10M = 1.5',
        importance: 'medium',
      },
      {
        term: '胜率',
        english: 'Win Rate',
        definition: '盈利交易占总交易次数的比例。',
        analogy: '做了100次交易，68次赚钱，胜率就是68.2%。',
        formula: '胜率 = 盈利次数 / 总交易次数',
        example: '盈利 68 次，总交易 100 次，胜率 = 68/100 = 68%',
        importance: 'high',
      },
      {
        term: '盈亏比',
        english: 'Profit/Loss Ratio',
        definition: '平均盈利与平均亏损的比值，衡量"赚的时候赚多少，亏的时候亏多少"。',
        analogy: '赚的时候平均赚2.34块，亏的时候平均亏1块，盈亏比=2.34。',
        formula: '盈亏比 = 平均盈利金额 / 平均亏损金额',
        example: '平均盈利 2.34，平均亏损 1，盈亏比 = 2.34/1 = 2.34',
        importance: 'high',
      },
    ],
  },
];

interface GlossaryProps {
  onClose?: () => void;
  highlightTerm?: string;
}

export function Glossary({ onClose, highlightTerm }: GlossaryProps) {
  const [searchTerm, setSearchTerm] = useState(highlightTerm || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTerms = glossaryTerms.map((category) => ({
    ...category,
    terms: category.terms.filter(
      (term) =>
        term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        term.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
        term.definition.includes(searchTerm)
    ),
  })).filter((category) => category.terms.length > 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-8 py-5 border-b border-[#1e3a5f] flex items-center justify-between bg-gradient-to-r from-[#0d1b2e] to-[#0a1628]">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-6 bg-[#8b5cf6] rounded-full"></div>
              <h2 className="text-xl text-gray-100">术语中心</h2>
            </div>
            <p className="text-xs text-gray-500 pl-4">理解量化投资中的关键概念和计算方法</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#1e3a5f]/50 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索术语、英文名或定义... (如: 夏普, Sharpe, 回撤, Drawdown)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0d1b2e] border border-[#1e3a5f] rounded-lg pl-12 pr-4 py-3.5 text-sm text-gray-200 placeholder-gray-600 focus:border-[#0ea5e9] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2.5 rounded-lg text-sm transition-all border ${
                selectedCategory === null
                  ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                  : 'bg-[#0d1b2e] border-[#1e3a5f] text-gray-400 hover:border-[#2a4f7f]'
              }`}
            >
              全部
            </button>
            {glossaryTerms.map((category) => (
              <button
                key={category.category}
                onClick={() => setSelectedCategory(category.category)}
                className={`px-4 py-2.5 rounded-lg text-sm transition-all border relative ${
                  selectedCategory === category.category
                    ? 'border-current text-white'
                    : 'bg-[#0d1b2e] border-[#1e3a5f] text-gray-400 hover:border-[#2a4f7f]'
                }`}
                style={{
                  borderColor: selectedCategory === category.category ? category.color : undefined,
                  backgroundColor: selectedCategory === category.category ? `${category.color}20` : undefined,
                }}
              >
                {selectedCategory === category.category && (
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" style={{ backgroundColor: category.color }}></div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }}></div>
                  {category.category}
                </div>
              </button>
            ))}
          </div>

          {/* Terms List */}
          <div className="space-y-6">
            {filteredTerms
              .filter((category) => !selectedCategory || category.category === selectedCategory)
              .map((category) => (
                <div key={category.category}>
                  {/* Category Header */}
                  <div className="flex items-baseline gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }}></div>
                    <h3 className="text-sm text-gray-300 uppercase tracking-wider">{category.category}</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-[#1e3a5f] to-transparent"></div>
                    <div className="text-xs text-gray-600">{category.terms.length} 个术语</div>
                  </div>

                  {/* Terms */}
                  <div className="space-y-4">
                    {category.terms.map((term) => (
                      <div
                        key={term.term}
                        className={`p-5 bg-[#0d1b2e] border rounded-lg hover:border-[#2a4f7f]/60 transition-all ${
                          highlightTerm && term.term === highlightTerm
                            ? 'border-[#0ea5e9] ring-2 ring-[#0ea5e9]/20'
                            : 'border-[#1e3a5f]/50'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-baseline gap-3 mb-1">
                              <h4 className="text-base text-gray-100 font-medium">{term.term}</h4>
                              <div className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-medium ${
                                term.importance === 'high' 
                                  ? 'bg-[#f59e0b]/20 text-[#f59e0b]' 
                                  : 'bg-[#6b7280]/20 text-gray-500'
                              }`}>
                                {term.importance === 'high' ? '核心' : '进阶'}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 font-mono">{term.english}</div>
                          </div>
                        </div>

                        {/* Content Grid */}
                        <div className="space-y-3 text-sm">
                          {/* Definition */}
                          <div className="p-3 bg-[#1e3a5f]/10 border border-[#1e3a5f]/30 rounded-lg">
                            <div className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">定义</div>
                            <div className="text-gray-300 leading-relaxed">{term.definition}</div>
                          </div>

                          {/* Analogy */}
                          <div className="p-3 bg-[#0ea5e9]/5 border border-[#0ea5e9]/20 rounded-lg">
                            <div className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">通俗理解</div>
                            <div className="text-gray-400 italic leading-relaxed">{term.analogy}</div>
                          </div>

                          {/* Formula & Example */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-[#0a1628] border border-[#1e3a5f]/30 rounded-lg">
                              <div className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">计算公式</div>
                              <div className="text-gray-300 font-mono text-xs leading-relaxed break-words">
                                {term.formula}
                              </div>
                            </div>
                            <div className="p-3 bg-[#0a1628] border border-[#1e3a5f]/30 rounded-lg">
                              <div className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">示例计算</div>
                              <div className="text-gray-400 font-mono text-xs leading-relaxed break-words">
                                {term.example}
                              </div>
                            </div>
                          </div>

                          {/* Platform Context */}
                          {term.term === '夏普比率' && (
                            <div className="p-3 bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg relative">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10b981] rounded-l-lg"></div>
                              <div className="pl-3">
                                <div className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">平台应用</div>
                                <div className="text-xs text-gray-400">
                                  当前策略夏普 <span className="text-[#10b981] font-medium tabular-nums">1.35</span>，
                                  意味着在历史样本中，每 1 单位波动带来约 1.35 单位超额收益；
                                  沪深 300 同期约为 <span className="text-gray-500 tabular-nums">0.7</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {filteredTerms.length === 0 && (
            <div className="bg-[#1e3a5f]/10 border border-[#1e3a5f]/30 rounded-lg p-12 text-center">
              <div className="text-gray-500 mb-2">未找到相关术语</div>
              <div className="text-sm text-gray-600">请尝试其他搜索关键词</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {onClose && (
          <div className="px-8 py-4 border-t border-[#1e3a5f] bg-[#0d1b2e]/50">
            <div className="text-xs text-gray-600 text-center">
              共 {glossaryTerms.reduce((sum, cat) => sum + cat.terms.length, 0)} 个专业术语 · 持续更新中
            </div>
          </div>
        )}
      </div>
    </div>
  );
}