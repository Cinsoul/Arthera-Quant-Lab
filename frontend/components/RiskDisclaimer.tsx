import { AlertTriangle } from 'lucide-react';

interface RiskDisclaimerProps {
  annualReturn?: number;
  showHighRiskWarning?: boolean;
}

export function RiskDisclaimer({ annualReturn, showHighRiskWarning = false }: RiskDisclaimerProps) {
  const isHighReturn = annualReturn && annualReturn > 50;

  return (
    <div className="space-y-3">
      {/* High Risk Warning */}
      {(isHighReturn || showHighRiskWarning) && (
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#f97316] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-[#f97316] mb-2">
                ⚠️ 极端高收益情景提示
              </div>
              <div className="text-sm text-gray-300 leading-relaxed">
                该结果年化收益率为 <span className="text-[#f97316]">{annualReturn}%</span>，
                属于极端高收益情景，历史数据表明此类策略通常伴随 <span className="text-[#f97316]">20-35%</span> 的波动和回撤。
                <span className="block mt-2">
                  实际投资中可能面临显著亏损风险，请谨慎解读并充分评估自身风险承受能力后决策。
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standard Disclaimer */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
        <div className="text-xs text-gray-500 leading-relaxed">
          <div className="mb-3">
            <span className="text-[#f97316]">⚠️ 重要风险提示与合规声明</span>
          </div>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <span className="text-gray-400">
                本页面所有结果均为基于历史数据的模拟回测，<span className="text-[#f97316]">不构成任何形式的投资建议或收益承诺</span>。
              </span>
            </li>
            <li>
              <span className="text-gray-400">
                过去表现不代表未来表现，实际投资可能出现亏损，<span className="text-[#f97316]">甚至严重亏损</span>。
              </span>
            </li>
            <li>
              <span className="text-gray-400">
                回测结果基于理想化假设（如无滑点、无冲击成本、完美成交等），实际交易中可能无法达到同等表现。
              </span>
            </li>
            <li>
              <span className="text-gray-400">
                建议您在<span className="text-[#0ea5e9]">专业投资顾问</span>指导下，结合自身风险承受能力、投资目标和财务状况做出投资决策。
              </span>
            </li>
            <li>
              <span className="text-gray-400">
                <span className="text-[#f97316]">本系统仅供研究和学习使用</span>，不得用于收集个人敏感信息（PII）或处理需要特殊保护的数据。
              </span>
            </li>
            <li>
              <span className="text-gray-400">
                Arthera Quant Lab 及其关联方对使用本系统产生的任何投资损失不承担责任。
              </span>
            </li>
          </ul>
          <div className="mt-4 pt-3 border-t border-[#1a2942] text-xs text-gray-600">
            本地部署版本 · 最后更新: 2024-12-09 · 
            <a href="#" className="text-[#0ea5e9] hover:underline ml-1">
              查看完整合规条款
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
