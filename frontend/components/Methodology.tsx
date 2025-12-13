import { useState } from 'react';
import { BookOpen, Database, TrendingUp, Shield, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

interface MethodologyProps {
  onClose: () => void;
}

type Section = 'backtest' | 'data' | 'risk' | 'formula';

const sectionConfig = {
  backtest: {
    title: '回测假设',
    color: 'bg-[#0ea5e9]',
    description: '详细说明回测过程中的核心假设和约束条件',
  },
  data: {
    title: '数据处理',
    color: 'bg-[#10b981]',
    description: '数据获取、清洗、处理的完整流程说明',
  },
  risk: {
    title: '风险计算',
    color: 'bg-[#f97316]',
    description: '风险指标的定义、计算方法和应用场景',
  },
  formula: {
    title: '核心公式',
    color: 'bg-[#8b5cf6]',
    description: '关键绩效指标的数学公式和解读',
  },
};

const methodologyContent = {
  backtest: {
    title: '回测假设',
    icon: TrendingUp,
    color: 'text-[#0ea5e9]',
    sections: [
      {
        title: '1. 交易成本假设',
        content: [
          '• 股票交易佣金：双边各 0.03%（万三）',
          '• 印花税：卖出时 0.1%',
          '• 滑点成本：买入/卖出各 0.05%',
          '• 总计单边交易成本约 0.18%',
        ],
      },
      {
        title: '2. 流动性约束',
        content: [
          '• 单日成交量限制：不超过该股票当日成交量的 10%',
          '• 冲击成本模型：基于 Almgren-Chriss 模型估算',
          '• 停牌处理：停牌期间无法交易，按前一日收盘价计算净值',
          '• 涨跌停限制：触及涨跌停时，假设无法成交',
        ],
      },
      {
        title: '3. 再平衡策略',
        content: [
          '• 再平衡频率：每月 1 次（月初第一个交易日）',
          '• 触发条件：权重偏离目标 > 5% 时立即再平衡',
          '• 最小交易单位：100 股（1手）',
          '• 现金持仓：允许 0-5% 现金缓冲',
        ],
      },
      {
        title: '4. 存活偏差处理',
        content: [
          '• 使用时点有效股票池（Point-in-Time Universe）',
          '• 包含已退市股票的历史数据',
          '• 财务数据使用发布日期而非报告期',
          '• 避免未来信息泄露（Look-ahead Bias）',
        ],
      },
    ],
  },
  data: {
    title: '数据处理',
    icon: Database,
    color: 'text-[#10b981]',
    sections: [
      {
        title: '1. 数据来源',
        content: [
          '• 行情数据：Wind/聚源/同花顺多源交叉验证',
          '• 财务数据：上市公司定期报告（年报/半年报/季报）',
          '• 指数数据：中证指数公司官方数据',
          '• 数据更新频率：日度行情，季度财务',
        ],
      },
      {
        title: '2. 数据清洗',
        content: [
          '• 异常值检测：3σ 原则剔除极端值',
          '• 缺失值处理：前向填充（Forward Fill）',
          '• ST/退市股票：标记但保留，回测时可选择剔除',
          '• 复权处理：后复权价格用于收益计算',
        ],
      },
      {
        title: '3. 因子计算',
        content: [
          '• 计算时点：使用 T-1 日收盘后可得数据',
          '• 行业分类：采用中信一级行业（30个行业）',
          '• 因子标准化：行业中性化 + Z-Score 标准化',
          '• 因子更新：动态因子每日更新，基本面因子按财报发布',
        ],
      },
      {
        title: '4. 数据质量保证',
        content: [
          '• 多源数据交叉验证，差异率 < 0.01%',
          '• 定期审计：每季度人工抽检 100+ 样本',
          '• 版本控制：所有数据快照保留历史版本',
          '• 透明度：数据问题追溯到源头',
        ],
      },
    ],
  },
  risk: {
    title: '风险计算',
    icon: Shield,
    color: 'text-[#f97316]',
    sections: [
      {
        title: '1. 最大回撤 (Max Drawdown)',
        content: [
          '• 定义：从任意历史高点到后续最低点的最大跌幅',
          '• 计算公式：MDD = max[(Peak - Trough) / Peak]',
          '• 应用：衡量策略在最糟糕情况下的损失',
          '• 补充：同时计算平均回撤和回撤持续时间',
        ],
      },
      {
        title: '2. 波动率 (Volatility)',
        content: [
          '• 定义：日度收益率的标准差，年化处理',
          '• 计算公式：σ_annual = σ_daily × √252',
          '• 滚动窗口：20日、60日、120日多窗口',
          '• 下行波动率：仅计算负收益的波动（Downside Deviation）',
        ],
      },
      {
        title: '3. VaR & CVaR',
        content: [
          '• VaR (95%)：95% 置信度下的最大预期损失',
          '• CVaR：超过 VaR 后的条件期望损失',
          '• 方法：历史模拟法（252个交易日滚动窗口）',
          '• 应用：风险预算和仓位管理',
        ],
      },
      {
        title: '4. Beta & 相关性',
        content: [
          '• Beta：相对基准的系统性风险暴露',
          '• 计算周期：滚动 120 个交易日',
          '• 相关性矩阵：日度收益率的 Pearson 相关系数',
          '• 行业暴露：相对基准的行业权重偏离',
        ],
      },
    ],
  },
  formula: {
    title: '核心公式',
    icon: BookOpen,
    color: 'text-[#8b5cf6]',
    sections: [
      {
        title: '1. 夏普比率 (Sharpe Ratio)',
        content: [
          '• 公式：Sharpe = (R_p - R_f) / σ_p',
          '• R_p：策略年化收益率',
          '• R_f：无风险利率（3% 中国国债）',
          '• σ_p：策略年化波动率',
          '• 解释：每单位风险获得的超额收益',
        ],
      },
      {
        title: '2. 信息比率 (Information Ratio)',
        content: [
          '• 公式：IR = (R_p - R_b) / TE',
          '• R_p - R_b：相对基准的超额收益',
          '• TE：跟踪误差（超额收益的标准差）',
          '• 应用：衡量主动管理能力',
          '• 目标：IR > 0.5 为良好，> 1.0 为优秀',
        ],
      },
      {
        title: '3. 卡尔马比率 (Calmar Ratio)',
        content: [
          '• 公式：Calmar = R_annual / |MDD|',
          '• R_annual：年化收益率',
          '• MDD：最大回撤（绝对值）',
          '• 应用：收益/回撤综合评价',
          '• 解释：每承受 1% 回撤获得的年化收益',
        ],
      },
      {
        title: '4. 索提诺比率 (Sortino Ratio)',
        content: [
          '• 公式：Sortino = (R_p - R_f) / DD',
          '• DD：下行偏差（仅计算负收益的标准差）',
          '• 相比夏普：仅惩罚下行波动',
          '• 应用：更符合投资者对风险的感知',
          '• 目标：Sortino > 1.5 为优秀策略',
        ],
      },
      {
        title: '5. 胜率 & 盈亏比',
        content: [
          '• 胜率：盈利交易次数 / 总交易次数',
          '• 盈亏比：平均盈利 / 平均亏损',
          '• 期望收益：胜率 × 盈亏比 - (1 - 胜率)',
          '• Kelly公式：f* = (胜率 × 盈亏比 - (1 - 胜率)) / 盈亏比',
          '• 应用：最优仓位和资金管理',
        ],
      },
    ],
  },
};

export function Methodology({ onClose }: MethodologyProps) {
  const [activeSection, setActiveSection] = useState<Section>('backtest');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['backtest-0']));

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const currentContent = methodologyContent[activeSection];
  const currentConfig = sectionConfig[activeSection];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-8 py-5 border-b border-[#1e3a5f] flex items-center justify-between bg-gradient-to-r from-[#0d1b2e] to-[#0a1628]">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-6 bg-[#0ea5e9] rounded-full"></div>
              <h2 className="text-xl text-gray-100">方法论说明</h2>
            </div>
            <p className="text-xs text-gray-500 pl-4">回测假设 · 数据处理 · 风险公式透明化</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#1e3a5f]/50 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex" style={{ height: 'calc(90vh - 100px)' }}>
          {/* Left Sidebar - Section Navigation */}
          <div className="w-72 border-r border-[#1e3a5f] bg-[#0d1b2e]/30 p-6">
            <div className="text-[10px] text-gray-600 mb-4 uppercase tracking-widest flex items-center gap-2">
              <div className="w-4 h-px bg-[#1e3a5f]"></div>
              方法论目录
            </div>
            <div className="space-y-2">
              {(Object.keys(sectionConfig) as Section[]).map((section) => {
                const config = sectionConfig[section];
                const isActive = activeSection === section;
                return (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`w-full px-4 py-3.5 rounded-lg transition-all text-left relative overflow-hidden group ${
                      isActive
                        ? 'bg-gradient-to-r from-[#0ea5e9]/10 to-transparent border border-[#0ea5e9]/30'
                        : 'border border-[#1e3a5f]/40 hover:border-[#2a4f7f]/60'
                    }`}
                  >
                    {/* Accent indicator */}
                    {isActive && (
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.color}`}></div>
                    )}
                    
                    <div className={`pl-${isActive ? '2' : '0'}`}>
                      <div className={`text-sm mb-1 ${isActive ? 'text-gray-100' : 'text-gray-400 group-hover:text-gray-300'} font-medium`}>
                        {config.title}
                      </div>
                      <div className="text-[10px] text-gray-600 leading-relaxed">
                        {config.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Links */}
            <div className="mt-8 pt-6 border-t border-[#1e3a5f]">
              <div className="text-[10px] text-gray-600 mb-3 uppercase tracking-widest">相关资源</div>
              <div className="space-y-2.5">
                {[
                  { label: '学术论文参考', href: '#' },
                  { label: '代码开源仓库', href: '#' },
                  { label: '方法论白皮书', href: '#' },
                ].map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#0ea5e9] transition-colors group"
                  >
                    <div className="w-1 h-1 rounded-full bg-gray-600 group-hover:bg-[#0ea5e9] transition-colors"></div>
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-8 overflow-y-auto">
            {/* Section Header */}
            <div className="mb-8">
              <div className="flex items-baseline gap-4 mb-3">
                <div className={`w-2 h-2 rounded-full ${currentConfig.color}`}></div>
                <h3 className="text-2xl text-gray-100 font-light">{currentContent.title}</h3>
              </div>
              <div className="h-px bg-gradient-to-r from-[#1e3a5f] to-transparent mb-4"></div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {currentConfig.description}
              </p>
            </div>

            {/* Expandable Content Sections */}
            <div className="space-y-4">
              {currentContent.sections.map((section, index) => {
                const itemId = `${activeSection}-${index}`;
                const isExpanded = expandedItems.has(itemId);
                return (
                  <div
                    key={itemId}
                    className="bg-[#0d1b2e]/50 border border-[#1e3a5f]/50 rounded-lg overflow-hidden hover:border-[#2a4f7f]/60 transition-all"
                  >
                    <button
                      onClick={() => toggleExpand(itemId)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#1e3a5f]/10 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded border transition-all ${
                          isExpanded 
                            ? 'bg-[#0ea5e9]/10 border-[#0ea5e9]/40 rotate-180' 
                            : 'border-[#1e3a5f] group-hover:border-[#2a4f7f]'
                        } flex items-center justify-center`}>
                          <svg className={`w-3 h-3 transition-colors ${isExpanded ? 'text-[#0ea5e9]' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-200 group-hover:text-white transition-colors">{section.title}</span>
                      </div>
                      <div className={`text-[10px] px-2.5 py-1 rounded uppercase tracking-wider font-medium transition-all ${
                        isExpanded ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]' : 'bg-[#1e3a5f]/30 text-gray-600'
                      }`}>
                        {section.content.length} 项
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-6 pb-5 border-t border-[#1e3a5f]/30">
                        <div className="space-y-2.5 mt-5">
                          {section.content.map((item, i) => (
                            <div
                              key={i}
                              className="flex gap-3 py-2 group"
                            >
                              <div className="w-1 h-1 rounded-full bg-[#0ea5e9]/40 mt-2 group-hover:bg-[#0ea5e9] transition-colors"></div>
                              <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors font-mono leading-relaxed flex-1">
                                {item}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Additional Context for Some Sections */}
                        {activeSection === 'formula' && index === 0 && (
                          <div className="mt-5 p-4 bg-[#0ea5e9]/5 border border-[#0ea5e9]/20 rounded-lg">
                            <div className="text-[10px] text-gray-500 mb-3 uppercase tracking-wider">示例计算</div>
                            <div className="font-mono text-xs space-y-2">
                              <div className="text-gray-500">假设：年化收益 = <span className="text-gray-400">42.3%</span>，波动率 = <span className="text-gray-400">18.5%</span>，无风险利率 = <span className="text-gray-400">3%</span></div>
                              <div className="text-[#0ea5e9] font-medium">Sharpe = (42.3% - 3%) / 18.5% = 2.12</div>
                              <div className="text-gray-600 text-[11px]">解读：每承担 1 单位风险，获得 2.12 单位超额收益</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Note */}
            <div className="mt-8 p-5 bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981] rounded-l-lg"></div>
              <div className="pl-4">
                <div className="text-sm text-[#10b981] mb-2 font-medium">透明度承诺</div>
                <div className="text-xs text-gray-400 leading-relaxed">
                  我们致力于完全透明化所有回测假设、数据处理流程和风险计算方法。
                  如对任何公式或方法有疑问，请通过帮助中心联系我们的量化研究团队。
                  所有历史回测结果均可追溯和验证。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}