import { useState } from 'react';
import { AlertTriangle, CheckCircle, ArrowRight, Info } from 'lucide-react';

export interface RiskPreferences {
  targetReturn: number;
  maxDrawdown: number;
  riskLevel: 'conservative' | 'balanced' | 'aggressive';
  investmentHorizon: '3m' | '6m' | '1y' | '3y' | '5y';
}

interface RiskPreferenceProps {
  onClose: () => void;
  onApply: (preferences: RiskPreferences) => void;
}

const riskLevels = {
  conservative: {
    label: '保守型',
    description: '低风险，稳健收益',
    color: 'text-[#10b981]',
    bg: 'bg-[#10b981]',
    border: 'border-[#10b981]',
    targetReturn: 15,
    maxDrawdown: 5,
  },
  balanced: {
    label: '平衡型',
    description: '中等风险，平衡增长',
    color: 'text-[#0ea5e9]',
    bg: 'bg-[#0ea5e9]',
    border: 'border-[#0ea5e9]',
    targetReturn: 30,
    maxDrawdown: 10,
  },
  aggressive: {
    label: '进取型',
    description: '高风险，追求高收益',
    color: 'text-[#f97316]',
    bg: 'bg-[#f97316]',
    border: 'border-[#f97316]',
    targetReturn: 50,
    maxDrawdown: 20,
  },
};

const recommendedStrategies = {
  conservative: [
    { name: 'Low Volatility Defense', expectedReturn: '15-20%', risk: '低' },
    { name: 'Quality + Dividend', expectedReturn: '12-18%', risk: '低' },
  ],
  balanced: [
    { name: 'Multi-Factor Balanced', expectedReturn: '25-35%', risk: '中' },
    { name: 'Growth + Value Hybrid', expectedReturn: '28-38%', risk: '中' },
  ],
  aggressive: [
    { name: 'High Vol Alpha - Q4', expectedReturn: '40-55%', risk: '高' },
    { name: 'Momentum + Quality', expectedReturn: '35-50%', risk: '高' },
  ],
};

export function RiskPreference({ onClose, onApply }: RiskPreferenceProps) {
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [targetReturn, setTargetReturn] = useState(30);
  const [maxDrawdown, setMaxDrawdown] = useState(10);
  const [investmentHorizon, setInvestmentHorizon] = useState<'3m' | '6m' | '1y' | '3y' | '5y'>('1y');

  const handleRiskLevelChange = (level: 'conservative' | 'balanced' | 'aggressive') => {
    setSelectedRiskLevel(level);
    setTargetReturn(riskLevels[level].targetReturn);
    setMaxDrawdown(riskLevels[level].maxDrawdown);
  };

  const handleApply = () => {
    onApply({
      targetReturn,
      maxDrawdown,
      riskLevel: selectedRiskLevel,
      investmentHorizon,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-8 py-5 border-b border-[#1e3a5f] flex items-center justify-between bg-gradient-to-r from-[#0d1b2e] to-[#0a1628]">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-6 bg-[#0ea5e9] rounded-full"></div>
              <h2 className="text-xl text-gray-100">风险偏好设置</h2>
            </div>
            <p className="text-xs text-gray-500 pl-4">根据您的投资目标和风险承受能力，生成推荐策略组合</p>
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

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="grid grid-cols-3 gap-8">
            {/* Left: Risk Level Selection */}
            <div className="col-span-2 space-y-7">
              {/* Risk Level Cards */}
              <div>
                <div className="flex items-baseline gap-3 mb-4">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider">选择风险等级</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#1e3a5f] to-transparent"></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {(Object.keys(riskLevels) as Array<keyof typeof riskLevels>).map((level) => {
                    const config = riskLevels[level];
                    const isSelected = selectedRiskLevel === level;
                    return (
                      <button
                        key={level}
                        onClick={() => handleRiskLevelChange(level)}
                        className={`p-5 rounded-lg border-2 transition-all text-left relative overflow-hidden group ${
                          isSelected
                            ? `${config.border} bg-gradient-to-br from-transparent to-[#0d1b2e]`
                            : 'border-[#1e3a5f] hover:border-[#2a4f7f]'
                        }`}
                      >
                        {/* Accent bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${config.bg} ${isSelected ? 'opacity-100' : 'opacity-0'} transition-opacity`}></div>
                        
                        <div className="relative">
                          <div className={`text-base mb-2 ${isSelected ? config.color : 'text-gray-300'} font-medium`}>
                            {config.label}
                          </div>
                          <div className="text-xs text-gray-500 mb-4">{config.description}</div>
                          
                          {isSelected && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className={`w-1.5 h-1.5 rounded-full ${config.bg}`}></div>
                              <span className={config.color}>已选择</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Return Slider */}
              <div>
                <div className="flex items-baseline gap-3 mb-4">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider">目标年化收益</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#1e3a5f] to-transparent"></div>
                  <div className="text-2xl text-[#10b981] font-light tabular-nums">{targetReturn}%</div>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="5"
                    value={targetReturn}
                    onChange={(e) => setTargetReturn(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#1e3a5f] rounded-full appearance-none cursor-pointer slider-green"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                    <span>5%</span>
                    <span className="text-gray-500">低收益</span>
                    <span className="text-gray-500">高收益</span>
                    <span>80%</span>
                  </div>
                </div>
              </div>

              {/* Max Drawdown Slider */}
              <div>
                <div className="flex items-baseline gap-3 mb-4">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider">最大可容忍回撤</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#1e3a5f] to-transparent"></div>
                  <div className="text-2xl text-[#f97316] font-light tabular-nums">-{maxDrawdown}%</div>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="3"
                    max="30"
                    step="1"
                    value={maxDrawdown}
                    onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#1e3a5f] rounded-full appearance-none cursor-pointer slider-orange"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                    <span>-3%</span>
                    <span className="text-gray-500">保守</span>
                    <span className="text-gray-500">激进</span>
                    <span>-30%</span>
                  </div>
                </div>
              </div>

              {/* Investment Horizon */}
              <div>
                <div className="flex items-baseline gap-3 mb-4">
                  <h3 className="text-sm text-gray-400 uppercase tracking-wider">投资期限</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#1e3a5f] to-transparent"></div>
                </div>
                <div className="flex gap-3">
                  {[
                    { value: '3m' as const, label: '3个月' },
                    { value: '6m' as const, label: '6个月' },
                    { value: '1y' as const, label: '1年' },
                    { value: '3y' as const, label: '3年' },
                    { value: '5y' as const, label: '5年+' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setInvestmentHorizon(option.value)}
                      className={`flex-1 px-4 py-3 rounded-lg text-sm transition-all border ${
                        investmentHorizon === option.value
                          ? 'bg-[#0ea5e9] border-[#0ea5e9] text-white'
                          : 'bg-[#0d1b2e] border-[#1e3a5f] text-gray-400 hover:border-[#2a4f7f]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Warning */}
              <div className="p-5 bg-[#f97316]/5 border border-[#f97316]/20 rounded-lg relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#f97316] rounded-l-lg"></div>
                <div className="pl-4">
                  <div className="text-sm text-[#f97316] mb-2 font-medium">风险提示</div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    历史业绩不代表未来表现。基于您选择的参数，推荐策略的实际表现可能因市场环境变化而波动。
                    建议定期回顾您的风险偏好设置，并根据市场情况调整策略配置。
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Recommended Strategies */}
            <div className="bg-[#0d1b2e] border border-[#1e3a5f] rounded-lg p-6 h-fit">
              <div className="flex items-baseline gap-3 mb-5">
                <h3 className="text-sm text-gray-400 uppercase tracking-wider">推荐策略</h3>
              </div>
              
              {/* Risk Summary */}
              <div className="mb-6 p-4 bg-[#0ea5e9]/5 border border-[#0ea5e9]/20 rounded-lg">
                <div className="text-xs text-gray-500 mb-3 uppercase tracking-wider">您的风险档案</div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-[#1e3a5f]/30">
                    <span className="text-gray-500">风险等级</span>
                    <span className={`${riskLevels[selectedRiskLevel].color} font-medium`}>
                      {riskLevels[selectedRiskLevel].label}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#1e3a5f]/30">
                    <span className="text-gray-500">目标收益</span>
                    <span className="text-[#10b981] font-medium tabular-nums">{targetReturn}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#1e3a5f]/30">
                    <span className="text-gray-500">容忍回撤</span>
                    <span className="text-[#f97316] font-medium tabular-nums">-{maxDrawdown}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-gray-500">投资期限</span>
                    <span className="text-gray-300 font-medium">
                      {investmentHorizon === '3m' && '3个月'}
                      {investmentHorizon === '6m' && '6个月'}
                      {investmentHorizon === '1y' && '1年'}
                      {investmentHorizon === '3y' && '3年'}
                      {investmentHorizon === '5y' && '5年+'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Strategy List */}
              <div className="space-y-3">
                {recommendedStrategies[selectedRiskLevel].map((strategy, index) => (
                  <div
                    key={index}
                    className="p-4 bg-[#1e3a5f]/10 border border-[#1e3a5f]/30 rounded-lg hover:border-[#0ea5e9]/40 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm text-gray-200 group-hover:text-white transition-colors">{strategy.name}</div>
                      <div className={`text-[10px] px-2 py-1 rounded uppercase tracking-wider font-medium ${
                        strategy.risk === '低' ? 'bg-[#10b981]/20 text-[#10b981]' :
                        strategy.risk === '中' ? 'bg-[#0ea5e9]/20 text-[#0ea5e9]' :
                        'bg-[#f97316]/20 text-[#f97316]'
                      }`}>
                        {strategy.risk}风险
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      预期收益：<span className="text-gray-400 tabular-nums">{strategy.expectedReturn}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-[#1e3a5f]">
                <div className="text-xs text-gray-600 leading-relaxed">
                  基于您的风险偏好，以上策略历史表现符合您的收益和回撤要求。
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-[#1e3a5f] flex items-center justify-between bg-[#0d1b2e]/50">
          <div className="text-xs text-gray-500">
            参数将应用到所有回测和策略评估中
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-[#1e3a5f]/30 text-gray-300 rounded-lg hover:bg-[#1e3a5f]/50 transition-all text-sm border border-[#1e3a5f]"
            >
              取消
            </button>
            <button
              onClick={handleApply}
              className="px-6 py-2.5 bg-[#0ea5e9] text-white rounded-lg hover:bg-[#0284c7] transition-all text-sm flex items-center gap-2 group"
            >
              应用设置
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .slider-green::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          background: #10b981;
          border: 2px solid #0a1628;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
        }
        .slider-green::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #10b981;
          border: 2px solid #0a1628;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
        }
        .slider-orange::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          background: #f97316;
          border: 2px solid #0a1628;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.2);
        }
        .slider-orange::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #f97316;
          border: 2px solid #0a1628;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.2);
        }
      `}</style>
    </div>
  );
}