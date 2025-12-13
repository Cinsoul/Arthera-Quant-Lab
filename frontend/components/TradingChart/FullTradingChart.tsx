/**
 * FullTradingChart - 完整模式图表组件
 * 用于全屏图表、专业分析工作台等需要全功能的场景
 * 
 * 特点:
 * - 完整的控制面板（时间周期、图表类型、画线工具等）
 * - 较大的高度（600-800px）
 * - 详细的tooltip和数据面板
 * - 支持所有高级功能
 */

import { EnhancedTradingChart, type OHLCV, type TimePeriod, type ChartType } from './EnhancedTradingChartV2';

interface FullTradingChartProps {
  symbol?: string;
  data?: OHLCV[];
  period?: TimePeriod;
  chartType?: ChartType;
  showVolume?: boolean;
  showGrid?: boolean;
  showKeyLevels?: boolean;
  showCurrentPrice?: boolean;
  showSeparators?: boolean;
  showMarketTimes?: boolean;
  enableDrawing?: boolean;
  showControls?: boolean;
  height?: number;
  onPeriodChange?: (period: TimePeriod) => void;
  onChartTypeChange?: (type: ChartType) => void;
  className?: string;
}

export function FullTradingChart({
  symbol = '600519',
  data,
  period = '1M',
  chartType = 'candlestick',
  showVolume = true,
  showGrid = true,
  showKeyLevels = true,
  showCurrentPrice = true,
  showSeparators = true,
  showMarketTimes = false,
  enableDrawing = true,
  showControls = true,
  height = 600,
  onPeriodChange,
  onChartTypeChange,
  className = '',
}: FullTradingChartProps) {
  return (
    <EnhancedTradingChart
      symbol={symbol}
      data={data}
      period={period}
      chartType={chartType}
      mode="full"
      showVolume={showVolume}
      showGrid={showGrid}
      showKeyLevels={showKeyLevels}
      showCurrentPrice={showCurrentPrice}
      showSeparators={showSeparators}
      showMarketTimes={showMarketTimes}
      showMA={false}
      enableDrawing={enableDrawing}
      showControls={showControls}
      showTooltip={true}
      showIndicators={true}
      height={height}
      onPeriodChange={onPeriodChange}
      onChartTypeChange={onChartTypeChange}
      className={className}
    />
  );
}
