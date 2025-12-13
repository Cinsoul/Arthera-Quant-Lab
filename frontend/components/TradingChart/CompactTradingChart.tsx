/**
 * CompactTradingChart - 紧凑模式图表组件
 * 用于股票详情页面、Dashboard卡片等需要快速预览的场景
 * 
 * 特点:
 * - 简化的控制面板（仅时间周期）
 * - 较小的高度（300-400px）
 * - 简化的tooltip
 * - 隐藏部分高级功能
 */

import { EnhancedTradingChart, type OHLCV, type TimePeriod } from './EnhancedTradingChartV2';

type CompactChartType = 'candlestick' | 'line' | 'area';

interface CompactTradingChartProps {
  symbol?: string;
  data?: OHLCV[];
  period?: TimePeriod;
  chartType?: CompactChartType;
  showVolume?: boolean;
  showControls?: boolean;
  height?: number;
  onPeriodChange?: (period: TimePeriod) => void;
  className?: string;
}

export function CompactTradingChart({
  symbol = '600519',
  data,
  period = '1M',
  chartType = 'candlestick',
  showVolume = false,
  showControls = true,
  height = 300,
  onPeriodChange,
  className = '',
}: CompactTradingChartProps) {
  return (
    <EnhancedTradingChart
      symbol={symbol}
      data={data}
      period={period}
      chartType={chartType}
      mode="compact"
      showVolume={showVolume}
      showGrid={true}
      showKeyLevels={false} // 紧凑模式简化关键价位
      showCurrentPrice={true}
      showSeparators={false} // 紧凑模式隐藏分隔线
      showMarketTimes={false}
      showMA={false}
      enableDrawing={false} // 紧凑模式不支持画线
      showControls={showControls}
      showTooltip={true}
      showIndicators={false} // 紧凑模式隐藏功能指示器
      height={height}
      onPeriodChange={onPeriodChange}
      className={className}
    />
  );
}