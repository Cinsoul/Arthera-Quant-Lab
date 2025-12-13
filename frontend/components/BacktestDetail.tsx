import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, DollarSign, GitBranch, FileCode } from 'lucide-react';
import { useState } from 'react';
import { InfoTooltip } from './InfoTooltip';
import { ExportMenu } from './ExportMenu';
import { RiskDisclaimer } from './RiskDisclaimer';

interface BacktestDetailProps {
  backtestId: string;
  backtestResult?: any; // 可选的真实回测结果
}

const equityData = [
  { date: '2024-01', strategy: 1.00, benchmark: 1.00, drawdown: 0 },
  { date: '2024-02', strategy: 1.03, benchmark: 1.01, drawdown: -0.005 },
  { date: '2024-03', strategy: 1.08, benchmark: 1.02, drawdown: 0 },
  { date: '2024-04', strategy: 1.06, benchmark: 1.00, drawdown: -0.025 },
  { date: '2024-05', strategy: 1.12, benchmark: 1.03, drawdown: 0 },
  { date: '2024-06', strategy: 1.18, benchmark: 1.05, drawdown: 0 },
  { date: '2024-07', strategy: 1.15, benchmark: 1.04, drawdown: -0.032 },
  { date: '2024-08', strategy: 1.22, benchmark: 1.06, drawdown: 0 },
  { date: '2024-09', strategy: 1.28, benchmark: 1.08, drawdown: 0 },
  { date: '2024-10', strategy: 1.35, benchmark: 1.10, drawdown: 0 },
  { date: '2024-11', strategy: 1.42, benchmark: 1.12, drawdown: 0 },
  { date: '2024-12', strategy: 1.48, benchmark: 1.14, drawdown: 0 },
];

const monthlyReturns = [
  { month: 'Jan', return: 0.030 },
  { month: 'Feb', return: 0.045 },
  { month: 'Mar', return: -0.015 },
  { month: 'Apr', return: 0.055 },
  { month: 'May', return: 0.042 },
  { month: 'Jun', return: -0.022 },
  { month: 'Jul', return: 0.038 },
  { month: 'Aug', return: 0.052 },
  { month: 'Sep', return: 0.048 },
  { month: 'Oct', return: 0.033 },
  { month: 'Nov', return: 0.041 },
  { month: 'Dec', return: 0.028 },
];

const holdingsData = [
  { name: '宁德时代', weight: 4.0, contribution: 3.2 },
  { name: '比亚迪', weight: 3.8, contribution: 2.9 },
  { name: '隆基绿能', weight: 3.5, contribution: 2.1 },
  { name: '阳光电源', weight: 3.2, contribution: 2.6 },
  { name: '中兴通讯', weight: 3.0, contribution: 1.8 },
  { name: '立讯精密', weight: 2.9, contribution: 2.3 },
  { name: '汇川技术', weight: 2.7, contribution: 1.9 },
  { name: '天合光能', weight: 2.5, contribution: 1.5 },
  { name: '东方财富', weight: 2.4, contribution: 2.0 },
  { name: '药明康德', weight: 2.3, contribution: 1.4 },
];

const sectorData = [
  { name: '电力设备', value: 24.5, color: '#0ea5e9' },
  { name: '电子', value: 18.3, color: '#06b6d4' },
  { name: '医药生物', value: 15.6, color: '#8b5cf6' },
  { name: '计算机', value: 13.2, color: '#10b981' },
  { name: '汽车', value: 12.1, color: '#f59e0b' },
  { name: '其他', value: 16.3, color: '#64748b' },
];

const contributionData = [
  { stock: '宁德时代', sector: '电力设备', avgWeight: 4.0, return: 3.2, drawdown: -1.2 },
  { stock: '比亚迪', sector: '汽车', avgWeight: 3.8, return: 2.9, drawdown: -0.8 },
  { stock: '隆基绿能', sector: '电力设备', avgWeight: 3.5, return: 2.1, drawdown: -1.5 },
  { stock: '阳光电源', sector: '电力设备', avgWeight: 3.2, return: 2.6, drawdown: -0.9 },
  { stock: '中兴通讯', sector: '通信', avgWeight: 3.0, return: 1.8, drawdown: -1.1 },
];

export function BacktestDetail({ backtestId, backtestResult }: BacktestDetailProps) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // 如果有真实的回测结果，使用真实数据；否则使用模拟数据
  const hasRealData = backtestResult && backtestResult.equity && backtestResult.equity.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg text-gray-100 mb-1">High Vol Alpha - Q4 Test</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>策略: High Vol Alpha Combo</span>
              <span>•</span>
              <span>2024-01-01 至 2024-12-09</span>
              <span>•</span>
              <span>45 只股票</span>
              <span>•</span>
              <span>初始资金: ¥10,000,000</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">年化收益</div>
              <div className="text-xl text-[#10b981]">42.3%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">最大回撤</div>
              <div className="text-xl text-[#f97316]">-8.2%</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">夏普比率</div>
              <div className="text-xl text-gray-200">2.18</div>
            </div>
            <div>
              <span className="inline-flex px-3 py-1 bg-[#10b981]/20 text-[#10b981] rounded text-sm">
                成功 ✓
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Equity Curve & Drawdown */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-sm text-gray-400 mb-2">收益曲线</h3>
            <div className="flex gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#0ea5e9] rounded-sm"></div>
                <span>策略净值 (+48.0%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#64748b] rounded-sm"></div>
                <span>沪深300 (+14.0%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#10b981] rounded-sm"></div>
                <span>超额收益 (+34.0%)</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={equityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2942" />
              <XAxis dataKey="date" stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d1b2e',
                  border: '1px solid #1a2942',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              />
              <Line type="monotone" dataKey="strategy" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="benchmark" stroke="#64748b" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-6 mb-4">
            <h3 className="text-sm text-gray-400 mb-2">回撤曲线</h3>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={equityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2942" />
              <XAxis dataKey="date" stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d1b2e',
                  border: '1px solid #1a2942',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              />
              <Line type="monotone" dataKey="drawdown" stroke="#f97316" strokeWidth={2} fill="#f97316" fillOpacity={0.2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-4">
          <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
            <h3 className="text-sm text-gray-400 mb-4">表现指标</h3>
            <div className="space-y-3">
              <MetricRow label="年化收益" value="42.3%" valueColor="text-[#10b981]" />
              <MetricRow label="累计收益" value="48.0%" valueColor="text-[#10b981]" />
              <MetricRow label="波动率" value="18.5%" />
              <MetricRow label="夏普比率" value="2.18" valueColor="text-[#0ea5e9]" />
              <MetricRow label="Sortino比率" value="3.12" valueColor="text-[#0ea5e9]" />
              <MetricRow label="最大回撤" value="-8.2%" valueColor="text-[#f97316]" />
              <MetricRow label="Calmar比率" value="5.16" />
              <MetricRow label="胜率" value="68.2%" valueColor="text-[#10b981]" />
              <MetricRow label="盈亏比" value="2.34" />
              <MetricRow label="换手率" value="245%" />
            </div>
          </div>

          <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
            <h3 className="text-sm text-gray-400 mb-4">风险指标</h3>
            <div className="space-y-3">
              <MetricRow label="Beta" value="1.12" />
              <MetricRow label="Alpha" value="28.3%" valueColor="text-[#10b981]" />
              <MetricRow label="信息比率" value="1.85" valueColor="text-[#0ea5e9]" />
              <MetricRow label="跟踪误差" value="15.2%" />
              <MetricRow label="下行波动" value="12.3%" valueColor="text-[#f97316]" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Returns */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
        <h3 className="text-sm text-gray-400 mb-4">月度收益</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyReturns}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2942" />
            <XAxis dataKey="month" stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0d1b2e',
                border: '1px solid #1a2942',
                borderRadius: '4px',
                fontSize: '12px',
              }}
              formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
            />
            <Bar dataKey="return" fill="#0ea5e9" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Holdings & Contribution Analysis */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Holdings */}
        <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
          <h3 className="text-sm text-gray-400 mb-4">持仓集中度 - Top 10</h3>
          <div className="space-y-2">
            {holdingsData.map((holding, idx) => (
              <div key={holding.name} className="flex items-center gap-3">
                <div className="text-xs text-gray-600 w-4">{idx + 1}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{holding.name}</span>
                    <span className="text-gray-500">{holding.weight.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1a2942] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0ea5e9]"
                      style={{ width: `${holding.weight * 10}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-xs text-[#10b981] w-16 text-right">
                  +{holding.contribution.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Distribution */}
        <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
          <h3 className="text-sm text-gray-400 mb-4">行业分布</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d1b2e',
                    border: '1px solid #1a2942',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {sectorData.map((sector) => (
                <div key={sector.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: sector.color }}
                    ></div>
                    <span className="text-gray-300">{sector.name}</span>
                  </div>
                  <span className="text-gray-500">{sector.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Table */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
        <h3 className="text-sm text-gray-400 mb-4">收益贡献度分析 - Top 5</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1a2942] text-gray-500 text-xs">
                <th className="text-left py-3 px-4">股票</th>
                <th className="text-left py-3 px-4">行业</th>
                <th className="text-right py-3 px-4">平均权重</th>
                <th className="text-right py-3 px-4">收益贡献</th>
                <th className="text-right py-3 px-4">回撤贡献</th>
              </tr>
            </thead>
            <tbody>
              {contributionData.map((row) => (
                <tr key={row.stock} className="border-b border-[#1a2942]/50 hover:bg-[#1a2942]/30">
                  <td className="py-3 px-4 text-gray-200">{row.stock}</td>
                  <td className="py-3 px-4 text-gray-400">{row.sector}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{row.avgWeight.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right text-[#10b981]">+{row.return.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right text-[#f97316]">{row.drawdown.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk & Stress Test */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
        <h3 className="text-sm text-gray-400 mb-4">压力测试 & 市场阶段表现</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-[#1a2942]/30 rounded">
            <div className="text-xs text-gray-500 mb-2">2024 Q1 震荡期</div>
            <div className="text-lg text-gray-200 mb-1">+8.2%</div>
            <div className="text-xs text-gray-500">vs 基准 +2.1% (超额 +6.1%)</div>
          </div>
          <div className="p-4 bg-[#1a2942]/30 rounded">
            <div className="text-xs text-gray-500 mb-2">2024 Q2-Q3 上涨期</div>
            <div className="text-lg text-gray-200 mb-1">+28.5%</div>
            <div className="text-xs text-gray-500">vs 基准 +8.5% (超额 +20.0%)</div>
          </div>
          <div className="p-4 bg-[#1a2942]/30 rounded">
            <div className="text-xs text-gray-500 mb-2">2024 Q4 整固期</div>
            <div className="text-lg text-gray-200 mb-1">+9.1%</div>
            <div className="text-xs text-gray-500">vs 基准 +3.2% (超额 +5.9%)</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs text-gray-500 mb-3">极端日损失 - 最差5个交易日</div>
          <div className="space-y-1 text-xs">
            {[
              { date: '2024-04-22', loss: -3.2 },
              { date: '2024-07-15', loss: -2.8 },
              { date: '2024-02-08', loss: -2.5 },
              { date: '2024-09-12', loss: -2.1 },
              { date: '2024-11-03', loss: -1.9 },
            ].map((day) => (
              <div key={day.date} className="flex justify-between items-center p-2 bg-[#1a2942]/20 rounded">
                <span className="text-gray-400">{day.date}</span>
                <span className="text-[#f97316]">{day.loss.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#0a1628] border border-[#0ea5e9]/30 rounded-lg p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 bg-[#0ea5e9]/20 rounded-full flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-[#0ea5e9]" />
          </div>
          <div>
            <h3 className="text-sm text-gray-200 mb-1">AI 策略解释</h3>
            <div className="text-xs text-gray-500">基于本次回测数据的智能分析</div>
          </div>
        </div>
        <div className="space-y-4 text-sm text-gray-300 leading-relaxed pl-11">
          <p>
            在本回测中，该策略对沪深300的超额收益主要来自 <span className="text-[#0ea5e9]">2024年中小盘反弹阶段</span>（Q2-Q3），
            期间动量因子和成长因子贡献了约 <span className="text-[#10b981]">65%</span> 的超额收益。
          </p>
          <p>
            持仓集中在电力设备、电子、医药生物三大行业，合计占比 <span className="text-[#0ea5e9]">58.4%</span>。
            其中宁德时代、比亚迪等新能源龙头贡献了主要收益，但在 7 月的行业调整中也带来了一定回撤压力。
          </p>
          <p>
            风险控制方面，策略在 4 月和 7 月两次市场调整中表现出良好的防御性，最大回撤 <span className="text-[#f97316]">-8.2%</span> 
            明显优于沪深300的 -12.5%。单票最大仓位控制在 4% 以内，符合预设风险管理要求。
          </p>
          <div className="flex items-start gap-2 p-3 bg-[#f97316]/10 border border-[#f97316]/30 rounded text-xs">
            <AlertTriangle className="w-4 h-4 text-[#f97316] flex-shrink-0 mt-0.5" />
            <div className="text-gray-400">
              <span className="text-[#f97316]">建议关注：</span> 当前行业集中度较高，建议在新能源板块波动加剧时考虑适度降低仓位或增加防御性板块配置。
            </div>
          </div>
        </div>
      </div>

      {/* Export Menu */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm text-gray-400 mb-4">导出报告</h3>
          <button
            className="text-[#0ea5e9] hover:text-[#06b6d4] transition-colors"
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
          >
            <GitBranch className="w-4 h-4" />
          </button>
        </div>
        {exportMenuOpen && (
          <ExportMenu
            onClose={() => setExportMenuOpen(false)}
            backtestId={backtestId}
          />
        )}
      </div>

      {/* Risk Disclaimer */}
      <RiskDisclaimer />
    </div>
  );
}

function MetricRow({ label, value, valueColor = 'text-gray-200' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={valueColor}>{value}</span>
    </div>
  );
}