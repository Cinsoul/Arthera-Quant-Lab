import { useState } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';

export type TimeRange = 'ytd' | '1y' | '3y' | 'custom';
export type ViewMode = '策略回测分析' | '组合监控' | '风险评估' | '绩效归因';
export type Benchmark = '沪深300' | '中证500' | '沪深300 / 中证500' | '创业板指' | '科创50';

interface ContextBarProps {
  viewMode?: ViewMode;
  dateRange?: string;
  strategy?: string;
  benchmark?: Benchmark;
  onViewModeChange?: (mode: ViewMode) => void;
  onDateRangeChange?: (range: string) => void;
  onStrategyChange?: (strategy: string) => void;
  onBenchmarkChange?: (benchmark: Benchmark) => void;
  onTimeRangeSelect?: (range: TimeRange) => void;
}

export function ContextBar({
  viewMode = '策略回测分析',
  dateRange = '2024-01-01 ~ 2024-12-09',
  strategy = 'High Vol Alpha – Q4',
  benchmark = '沪深300 / 中证500',
  onViewModeChange,
  onDateRangeChange,
  onStrategyChange,
  onBenchmarkChange,
  onTimeRangeSelect,
}: ContextBarProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1y');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);
  const [showBenchmarkPicker, setShowBenchmarkPicker] = useState(false);
  const [showViewModePicker, setShowViewModePicker] = useState(false);

  const viewModes: ViewMode[] = ['策略回测分析', '组合监控', '风险评估', '绩效归因'];
  const benchmarks: Benchmark[] = ['沪深300', '中证500', '沪深300 / 中证500', '创业板指', '科创50'];
  const strategies = [
    'High Vol Alpha – Q4',
    'Multi-Factor Balanced',
    'Momentum + Quality',
    'Low Volatility Defense',
    'Growth + Value Hybrid',
  ];

  const handleTimeRangeClick = (range: TimeRange) => {
    setSelectedTimeRange(range);
    onTimeRangeSelect?.(range);
    
    // Auto-calculate date range based on selection
    const today = new Date();
    let startDate = new Date();
    
    switch (range) {
      case 'ytd':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      case '1y':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        break;
      case '3y':
        startDate = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
        break;
      case 'custom':
        setShowDatePicker(true);
        return;
    }
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const newRange = `${formatDate(startDate)} ~ ${formatDate(today)}`;
    onDateRangeChange?.(newRange);
  };

  return (
    <div className="h-10 bg-[#0d1b2e]/80 border-b border-[#1e3a5f]/30 px-6 flex items-center justify-between backdrop-blur-sm">
      {/* Left: Context Info */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        {/* View Mode */}
        <div className="flex items-center gap-2 relative">
          <span className="text-gray-500">当前模式</span>
          <button
            onClick={() => setShowViewModePicker(!showViewModePicker)}
            className="text-gray-300 hover:text-[#0ea5e9] transition-colors flex items-center gap-1"
          >
            {viewMode}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showViewModePicker && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowViewModePicker(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-40 bg-[#0a1628] border border-[#0ea5e9]/50 rounded-lg shadow-2xl overflow-hidden z-50">
                {viewModes.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      onViewModeChange?.(mode);
                      setShowViewModePicker(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                      viewMode === mode
                        ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] border-l-2 border-[#0ea5e9]'
                        : 'text-gray-400 hover:bg-[#1e3a5f]/40 hover:text-gray-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-px h-4 bg-[#1e3a5f]/60"></div>

        {/* Date Range */}
        <div className="flex items-center gap-2 relative">
          <span className="text-gray-500">时间区间</span>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="text-gray-300 hover:text-[#0ea5e9] transition-colors flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" />
            {dateRange}
          </button>
          
          {showDatePicker && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowDatePicker(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#0a1628] border border-[#0ea5e9]/50 rounded-lg shadow-2xl p-4 z-50">
                <div className="text-xs text-gray-400 mb-3">选择时间区间</div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="flex-1 px-2 py-1 bg-[#0d1b2e] border border-[#1e3a5f] rounded text-xs text-gray-300 focus:outline-none focus:border-[#0ea5e9]"
                      defaultValue="2024-01-01"
                    />
                    <span className="text-gray-500">~</span>
                    <input
                      type="date"
                      className="flex-1 px-2 py-1 bg-[#0d1b2e] border border-[#1e3a5f] rounded text-xs text-gray-300 focus:outline-none focus:border-[#0ea5e9]"
                      defaultValue="2024-12-09"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setShowDatePicker(false);
                    }}
                    className="w-full px-3 py-1.5 bg-[#0ea5e9] text-white rounded text-xs hover:bg-[#0284c7] transition-colors"
                  >
                    确认
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-4 bg-[#1e3a5f]/60"></div>

        {/* Strategy */}
        <div className="flex items-center gap-2 relative">
          <span className="text-gray-500">默认策略</span>
          <button
            onClick={() => setShowStrategyPicker(!showStrategyPicker)}
            className="text-gray-300 hover:text-[#0ea5e9] transition-colors flex items-center gap-1"
          >
            {strategy}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showStrategyPicker && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowStrategyPicker(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-56 bg-[#0a1628] border border-[#0ea5e9]/50 rounded-lg shadow-2xl overflow-hidden z-50">
                {strategies.map((strat) => (
                  <button
                    key={strat}
                    onClick={() => {
                      onStrategyChange?.(strat);
                      setShowStrategyPicker(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center justify-between ${
                      strategy === strat
                        ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] border-l-2 border-[#0ea5e9]'
                        : 'text-gray-400 hover:bg-[#1e3a5f]/40 hover:text-gray-200'
                    }`}
                  >
                    {strat}
                    {strategy === strat && (
                      <TrendingUp className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-px h-4 bg-[#1e3a5f]/60"></div>

        {/* Benchmark */}
        <div className="flex items-center gap-2 relative">
          <span className="text-gray-500">基准</span>
          <button
            onClick={() => setShowBenchmarkPicker(!showBenchmarkPicker)}
            className="text-gray-300 hover:text-[#0ea5e9] transition-colors flex items-center gap-1"
          >
            {benchmark}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showBenchmarkPicker && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowBenchmarkPicker(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#0a1628] border border-[#0ea5e9]/50 rounded-lg shadow-2xl overflow-hidden z-50">
                {benchmarks.map((bench) => (
                  <button
                    key={bench}
                    onClick={() => {
                      onBenchmarkChange?.(bench);
                      setShowBenchmarkPicker(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                      benchmark === bench
                        ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] border-l-2 border-[#0ea5e9]'
                        : 'text-gray-400 hover:bg-[#1e3a5f]/40 hover:text-gray-200'
                    }`}
                  >
                    {bench}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Time Period Quick Filters */}
      <div className="flex items-center gap-1">
        {[
          { id: 'ytd' as TimeRange, label: 'YTD' },
          { id: '1y' as TimeRange, label: '1Y' },
          { id: '3y' as TimeRange, label: '3Y' },
          { id: 'custom' as TimeRange, label: 'Custom' },
        ].map((period) => {
          const isActive = selectedTimeRange === period.id;
          return (
            <button
              key={period.id}
              onClick={() => handleTimeRangeClick(period.id)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                isActive
                  ? 'bg-[#0ea5e9] text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40'
              }`}
            >
              {period.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
