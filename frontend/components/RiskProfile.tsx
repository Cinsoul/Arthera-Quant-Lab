import { useState } from 'react';
import { Target, TrendingUp, Shield, Clock, ChevronRight } from 'lucide-react';

export function RiskProfile() {
  const [targetReturn, setTargetReturn] = useState<string>('30-50');
  const [maxDrawdown, setMaxDrawdown] = useState<string>('20');
  const [capital, setCapital] = useState<string>('10000000');
  const [horizon, setHorizon] = useState<string>('3');

  const getRecommendations = () => {
    if (targetReturn === '50+') {
      return [
        { name: 'High Vol Alpha Combo', weight: 40, reason: '高波动捕捉超额收益' },
        { name: 'Momentum + Quality', weight: 35, reason: '动量因子增强' },
        { name: 'Multi-Factor Balanced', weight: 25, reason: '稳定性平衡' },
      ];
    } else if (targetReturn === '30-50') {
      return [
        { name: 'Multi-Factor Balanced', weight: 45, reason: '均衡配置主力' },
        { name: 'High Vol Alpha Combo', weight: 30, reason: '适度增强收益' },
        { name: 'Low Volatility Defense', weight: 25, reason: '回撤控制' },
      ];
    } else {
      return [
        { name: 'Multi-Factor Balanced', weight: 50, reason: '稳健收益' },
        { name: 'Low Volatility Defense', weight: 40, reason: '防守为主' },
        { name: 'Momentum + Quality', weight: 10, reason: '少量增强' },
      ];
    }
  };

  const getRiskWarning = () => {
    if (targetReturn === '50+' && maxDrawdown === '10') {
      return {
        level: 'high',
        message: '目标年化 >50% 但只接受 10% 回撤，这种组合在历史数据中较难实现。建议提高回撤容忍度至 20-30%。',
      };
    } else if (targetReturn === '50+') {
      return {
        level: 'medium',
        message: '目标年化 >50% 属于高风险区间，历史数据表明需要承受 20-35% 的波动和回撤。',
      };
    } else if (targetReturn === '8-15' && maxDrawdown === '30') {
      return {
        level: 'low',
        message: '您的风险容忍度较高，但目标收益相对保守。可以考虑适度提高收益目标。',
      };
    }
    return {
      level: 'low',
      message: '您的风险收益配置合理，符合大多数机构投资者的偏好。',
    };
  };

  const recommendations = getRecommendations();
  const riskWarning = getRiskWarning();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg text-gray-100 mb-1">风险偏好 & 目标配置</h2>
        <div className="text-sm text-gray-500">
          设置您的投资目标和风险承受能力，系统将为您推荐最适合的策略组合
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="col-span-2 space-y-6">
          {/* Target Return */}
          <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-[#0ea5e9]/10 rounded flex items-center justify-center">
                <Target className="w-5 h-5 text-[#0ea5e9]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm text-gray-200 mb-1">目标年化收益率</h3>
                <div className="text-xs text-gray-500">选择您期望的年化收益区间</div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: '8-15', label: '8-15%', desc: '稳健保守' },
                { value: '15-30', label: '15-30%', desc: '稳健增长' },
                { value: '30-50', label: '30-50%', desc: '积极进取' },
                { value: '50+', label: '>50%', desc: '激进高风险' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTargetReturn(option.value)}
                  className={`p-4 rounded border transition-all ${
                    targetReturn === option.value
                      ? 'border-[#0ea5e9] bg-[#0ea5e9]/10'
                      : 'border-[#1a2942] bg-[#1a2942]/30 hover:border-[#2a3f5f]'
                  }`}
                >
                  <div className="text-lg text-gray-200 mb-1">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Drawdown */}
          <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-[#f97316]/10 rounded flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#f97316]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm text-gray-200 mb-1">可接受最大回撤</h3>
                <div className="text-xs text-gray-500">您能承受的最大账户损失比例</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { value: '10', label: '10%', desc: '极度保守' },
                { value: '20', label: '20%', desc: '相对保守' },
                { value: '30', label: '30%', desc: '中等风险' },
                { value: '40', label: '40%+', desc: '高风险承受' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMaxDrawdown(option.value)}
                  className={`p-4 rounded border transition-all ${
                    maxDrawdown === option.value
                      ? 'border-[#f97316] bg-[#f97316]/10'
                      : 'border-[#1a2942] bg-[#1a2942]/30 hover:border-[#2a3f5f]'
                  }`}
                >
                  <div className="text-lg text-gray-200 mb-1">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Capital & Horizon */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-[#10b981]/10 rounded flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#10b981]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm text-gray-200 mb-1">资金规模</h3>
                  <div className="text-xs text-gray-500">投资总金额（人民币）</div>
                </div>
              </div>
              <input
                type="text"
                value={`¥${parseInt(capital).toLocaleString()}`}
                onChange={(e) => setCapital(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-[#1a2942] border border-[#2a3f5f] rounded px-4 py-3 text-lg text-gray-200"
              />
            </div>

            <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-[#8b5cf6]/10 rounded flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#8b5cf6]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm text-gray-200 mb-1">投资周期</h3>
                  <div className="text-xs text-gray-500">计划持有时间</div>
                </div>
              </div>
              <select
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                className="w-full bg-[#1a2942] border border-[#2a3f5f] rounded px-4 py-3 text-lg text-gray-200"
              >
                <option value="1">1 年</option>
                <option value="3">3 年</option>
                <option value="5">5 年</option>
                <option value="10">10 年+</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-6">
          {/* Risk Warning */}
          <div
            className={`border rounded-lg p-5 ${
              riskWarning.level === 'high'
                ? 'bg-[#f97316]/10 border-[#f97316]/30'
                : riskWarning.level === 'medium'
                ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30'
                : 'bg-[#10b981]/10 border-[#10b981]/30'
            }`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`text-lg mt-0.5 ${
                  riskWarning.level === 'high'
                    ? 'text-[#f97316]'
                    : riskWarning.level === 'medium'
                    ? 'text-[#f59e0b]'
                    : 'text-[#10b981]'
                }`}
              >
                {riskWarning.level === 'high' ? '⚠️' : riskWarning.level === 'medium' ? '⚡' : '✓'}
              </div>
              <div className="text-sm text-gray-300 leading-relaxed">{riskWarning.message}</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
            <h3 className="text-sm text-gray-400 mb-4">投资概况</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">资金规模</span>
                <span className="text-gray-200">¥{parseInt(capital).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">目标年化</span>
                <span className="text-[#10b981]">{targetReturn}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">回撤容忍</span>
                <span className="text-[#f97316]">{maxDrawdown}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">投资周期</span>
                <span className="text-gray-200">{horizon} 年</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Recommendations */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-6">
        <h3 className="text-sm text-gray-400 mb-4">推荐策略组合</h3>
        <div className="space-y-3 mb-6">
          {recommendations.map((rec, idx) => (
            <div
              key={rec.name}
              className="flex items-center gap-4 p-4 bg-[#1a2942]/30 rounded hover:bg-[#1a2942]/50 transition-colors"
            >
              <div className="text-2xl text-gray-600">{idx + 1}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-200">{rec.name}</div>
                  <div className="text-sm text-[#0ea5e9]">{rec.weight}%</div>
                </div>
                <div className="w-full h-2 bg-[#1a2942] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[#0ea5e9]"
                    style={{ width: `${rec.weight}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">{rec.reason}</div>
              </div>
              <button className="px-4 py-2 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded text-xs hover:bg-[#0ea5e9]/30 transition-colors">
                查看详情
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded transition-colors">
            <span>应用此配置</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button className="px-6 py-3 bg-[#1a2942] hover:bg-[#2a3f5f] text-gray-300 rounded transition-colors">
            重置
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
        <div className="text-xs text-gray-500 leading-relaxed">
          <div className="mb-2">
            <span className="text-[#f97316]">风险提示：</span>
          </div>
          <ul className="space-y-1 list-disc list-inside">
            <li>以上推荐基于历史回测数据，不构成任何形式的投资建议或收益承诺。</li>
            <li>过去表现不代表未来表现，实际投资可能出现亏损，甚至严重亏损。</li>
            <li>建议您在专业投资顾问指导下，结合自身风险承受能力做出投资决策。</li>
            <li>本系统仅供研究和学习使用，不得用于收集PII或处理敏感数据。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
