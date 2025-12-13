/**
 * BloombergChart - Bloomberg Terminal级专业图表（基于时间的版本）
 * 
 * 核心改进：
 * ✅ 基于真实时间戳的缩放和平移（而非数组索引）
 * ✅ 智能时间轴刻度生成（秒/分/时/日/周/月/年）
 * ✅ 缩放时精确保持焦点时间点不变
 * ✅ 处理数据缺失（周末/节假日）
 * ✅ Bloomberg级的多级缩放策略
 * 
 * 使用示例：
 * <BloombergChart
 *   symbol="600519"
 *   data={ohlcvData}
 *   period="3M"
 *   height={600}
 * />
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  createTimeBasedViewportManager,
  type TimeBasedViewportManager,
  type CandleDataPoint,
  type TimeViewportState,
} from '../../utils/timeBasedViewportManager';
import {
  calculateProfessionalTimeAxis,
  type TimeAxisResult,
  type CandleData,
} from '../../utils/professionalAxisCalculator';
import {
  calculateProfessionalPriceAxis,
  formatPrice,
  formatVolume,
} from '../../utils/chartHelpers';

// 中国市场标准配色
const COLORS = {
  up: '#EF4444',
  down: '#10B981',
  grid: '#1E3A5F',
  gridMinor: '#1E3A5F33',
  separator: '#0EA5E9',
  text: '#94A3B8',
  textDim: '#64748B',
  background: '#0A1929',
};

export type TimePeriod = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'YTD';
export type ChartType = 'candlestick' | 'line' | 'area';

export interface BloombergChartProps {
  symbol?: string;
  data: CandleDataPoint[];
  period?: TimePeriod;
  chartType?: ChartType;
  showVolume?: boolean;
  showGrid?: boolean;
  showControls?: boolean;
  height?: number;
  onPeriodChange?: (period: TimePeriod) => void;
  className?: string;
}

export function BloombergChart({
  symbol = '600519',
  data,
  period = '3M',
  chartType = 'candlestick',
  showVolume = true,
  showGrid = true,
  showControls = true,
  height = 600,
  onPeriodChange,
  className = '',
}: BloombergChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportManagerRef = useRef<TimeBasedViewportManager | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(period);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(chartType);
  const [viewportState, setViewportState] = useState<TimeViewportState | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number>(-1);

  // 初始化ViewportManager
  useEffect(() => {
    if (data.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // 创建时间基础的视口管理器
    viewportManagerRef.current = createTimeBasedViewportManager(data, {
      canvasWidth: rect.width,
      paddingLeft: 80,
      paddingRight: 100,
      defaultTimeSpan: 3 * 30 * 24 * 60 * 60 * 1000, // 3个月
    });

    // 设置初始周期
    viewportManagerRef.current.setTimeRangeByPeriod(selectedPeriod);
    setViewportState(viewportManagerRef.current.getState());

    console.log('[BloombergChart] Initialized with time-based viewport');
  }, [data.length]); // 只在数据长度变化时重新初始化

  // 周期变化时更新viewport
  useEffect(() => {
    if (!viewportManagerRef.current || data.length === 0) return;

    viewportManagerRef.current.setTimeRangeByPeriod(selectedPeriod);
    setViewportState(viewportManagerRef.current.getState());

    console.log('[BloombergChart] Period changed to:', selectedPeriod);
  }, [selectedPeriod, data.length]);

  // 数据更新时刷新viewport
  useEffect(() => {
    if (!viewportManagerRef.current || data.length === 0) return;

    viewportManagerRef.current.updateData(data);
    setViewportState(viewportManagerRef.current.getState());
  }, [data]);

  // 渲染图表
  const renderChart = useCallback(() => {
    const canvas = canvasRef.current;
    const viewportManager = viewportManagerRef.current;
    if (!canvas || !viewportManager || !viewportState || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 高DPI支持
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const chartHeight = height;

    canvas.width = width * dpr;
    canvas.height = chartHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${chartHeight}px`;
    ctx.scale(dpr, dpr);

    // 清空画布
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, chartHeight);

    const padding = { top: 40, right: 100, bottom: showVolume ? 140 : 80, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const mainChartHeight = showVolume ? chartHeight * 0.7 : chartHeight - padding.top - padding.bottom;

    // 获取可见数据
    const visibleData = viewportManager.getVisibleData();
    if (visibleData.length === 0) return;

    // ========== 计算Bloomberg时间轴 ==========
    // 将CandleDataPoint转换为CandleData格式
    const candleData: CandleData[] = visibleData.map(d => ({
      timestamp: d.timestamp,
      date: new Date(d.timestamp).toISOString(),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));

    const timeAxis = calculateProfessionalTimeAxis(
      candleData,
      selectedPeriod as any, // TimePeriod兼容
      chartWidth
    );
    
    console.log('[BloombergChart] TimeAxis debug:', {
      period: selectedPeriod,
      candleDataLength: candleData.length,
      firstTimestamp: new Date(candleData[0]?.timestamp).toISOString(),
      lastTimestamp: new Date(candleData[candleData.length - 1]?.timestamp).toISOString(),
      chartWidth,
      ticksCount: timeAxis.ticks.length,
      interval: timeAxis.interval,
    });

    // ========== 计算价格轴 ==========
    const priceAxis = calculateProfessionalPriceAxis(visibleData, mainChartHeight, 'linear');
    const { niceMin: minPrice, niceMax: maxPrice } = priceAxis;
    const priceScale = mainChartHeight / (maxPrice - minPrice);

    // ========== 绘制网格 ==========
    if (showGrid) {
      // 水平网格线（价格）
      priceAxis.ticks.forEach(tick => {
        const y = padding.top + ((maxPrice - tick.value) / (maxPrice - minPrice)) * mainChartHeight;

        ctx.strokeStyle = tick.type === 'major' ? COLORS.grid : COLORS.gridMinor;
        ctx.lineWidth = tick.type === 'major' ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      });

      // 垂直网格线（时间）
      timeAxis.ticks.forEach(tick => {
        const x = padding.left + tick.position;

        ctx.strokeStyle = tick.type === 'major' ? COLORS.grid : COLORS.gridMinor;
        ctx.lineWidth = tick.type === 'major' ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + mainChartHeight);
        ctx.stroke();
      });
    }

    // ========== 绘制分隔线 ==========
    timeAxis.separators.forEach(sep => {
      const x = viewportManager.timeToX(sep.timestamp);

      ctx.strokeStyle = COLORS.separator;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + mainChartHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ========== 绘制边框 ==========
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 2;
    ctx.strokeRect(padding.left, padding.top, chartWidth, mainChartHeight);

    // ========== 绘制K线（基于真实时间） ==========
    if (selectedChartType === 'candlestick') {
      visibleData.forEach((candle, i) => {
        const x = viewportManager.timeToX(candle.timestamp);
        const openY = padding.top + (maxPrice - candle.open) * priceScale;
        const closeY = padding.top + (maxPrice - candle.close) * priceScale;
        const highY = padding.top + (maxPrice - candle.high) * priceScale;
        const lowY = padding.top + (maxPrice - candle.low) * priceScale;

        const isUp = candle.close >= candle.open;
        ctx.strokeStyle = isUp ? COLORS.up : COLORS.down;
        ctx.fillStyle = isUp ? COLORS.up : COLORS.down;

        // Wick
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Body
        const bodyHeight = Math.abs(closeY - openY);
        const bodyY = Math.min(openY, closeY);
        const candleWidth = Math.max(2, viewportState.barWidth - 2);

        if (bodyHeight < 1) {
          // Doji
          ctx.beginPath();
          ctx.moveTo(x - candleWidth / 2, bodyY);
          ctx.lineTo(x + candleWidth / 2, bodyY);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
        }

        // Hover effect
        const globalIndex = viewportState.startIndex + i;
        if (globalIndex === hoveredIndex) {
          ctx.strokeStyle = COLORS.separator;
          ctx.lineWidth = 2;
          ctx.strokeRect(x - candleWidth / 2 - 2, bodyY - 2, candleWidth + 4, bodyHeight + 4);
        }
      });
    } else if (selectedChartType === 'line') {
      ctx.strokeStyle = COLORS.separator;
      ctx.lineWidth = 2;
      ctx.beginPath();
      visibleData.forEach((candle, i) => {
        const x = viewportManager.timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    } else if (selectedChartType === 'area') {
      // 绘制区域
      ctx.fillStyle = 'rgba(14, 165, 233, 0.2)';
      ctx.beginPath();
      visibleData.forEach((candle, i) => {
        const x = viewportManager.timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(padding.left + chartWidth, padding.top + mainChartHeight);
      ctx.lineTo(padding.left, padding.top + mainChartHeight);
      ctx.closePath();
      ctx.fill();

      // 绘制线条
      ctx.strokeStyle = COLORS.separator;
      ctx.lineWidth = 2;
      ctx.beginPath();
      visibleData.forEach((candle, i) => {
        const x = viewportManager.timeToX(candle.timestamp);
        const y = padding.top + (maxPrice - candle.close) * priceScale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // ========== 绘制时间轴 ==========
    timeAxis.ticks.forEach(tick => {
      const x = padding.left + tick.position;

      // 刻度线
      ctx.strokeStyle = tick.type === 'major' ? COLORS.textDim : '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, chartHeight - padding.bottom);
      ctx.lineTo(x, chartHeight - padding.bottom + (tick.type === 'major' ? 8 : 4));
      ctx.stroke();

      // 标签 - 主刻度显示完整时间，次刻度显示简化时间
      ctx.fillStyle = tick.type === 'major' ? COLORS.text : COLORS.textDim;
      ctx.font = tick.type === 'major' ? '12px "SF Mono"' : '10px "SF Mono"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(tick.label, x, chartHeight - padding.bottom + 10);
    });

    // ========== 绘制价格轴 ==========
    priceAxis.ticks.forEach(tick => {
      const y = padding.top + ((maxPrice - tick.value) / (maxPrice - minPrice)) * mainChartHeight;

      // 刻度线
      ctx.strokeStyle = tick.type === 'major' ? COLORS.textDim : '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width - padding.right, y);
      ctx.lineTo(width - padding.right + (tick.type === 'major' ? 8 : 4), y);
      ctx.stroke();

      // 标签
      ctx.fillStyle = tick.type === 'major' ? COLORS.text : COLORS.textDim;
      ctx.font = '11px "SF Mono"';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tick.label, width - padding.right + 15, y);
    });

    // ========== 绘制成交量 ==========
    if (showVolume && visibleData.length > 0) {
      const volumes = visibleData.map(d => d.volume);
      const maxVolume = Math.max(...volumes);
      const volumeHeight = chartHeight * 0.2;
      const volumeY = chartHeight - padding.bottom + 20;

      visibleData.forEach(candle => {
        const x = viewportManager.timeToX(candle.timestamp);
        const volumeBarHeight = (candle.volume / maxVolume) * volumeHeight;
        const isUp = candle.close >= candle.open;
        const candleWidth = Math.max(2, viewportState.barWidth - 2);

        ctx.fillStyle = isUp ? COLORS.up + '80' : COLORS.down + '80';
        ctx.fillRect(
          x - candleWidth / 2,
          volumeY + volumeHeight - volumeBarHeight,
          candleWidth,
          volumeBarHeight
        );
      });

      // 成交量边框
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(padding.left, volumeY, chartWidth, volumeHeight);
    }

    // ========== 绘制Tooltip ==========
    if (hoveredIndex >= 0 && hoveredIndex < data.length) {
      const candle = data[hoveredIndex];

      const tooltipX = 20;
      const tooltipY = 60;
      const tooltipWidth = 280;
      const tooltipHeight = 140;

      ctx.fillStyle = 'rgba(13, 27, 46, 0.95)';
      ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

      const isUp = candle.close >= candle.open;
      const changePercent = ((candle.close - candle.open) / candle.open * 100).toFixed(2);

      ctx.font = '11px "SF Mono"';
      ctx.textAlign = 'left';

      const lines = [
        { label: '时间', value: new Date(candle.timestamp).toLocaleString(), color: COLORS.text },
        { label: '开盘', value: formatPrice(candle.open), color: COLORS.text },
        { label: '最高', value: formatPrice(candle.high), color: COLORS.up },
        { label: '最低', value: formatPrice(candle.low), color: COLORS.down },
        { label: '收盘', value: formatPrice(candle.close), color: isUp ? COLORS.up : COLORS.down },
        { label: '涨跌', value: `${isUp ? '+' : ''}${changePercent}%`, color: isUp ? COLORS.up : COLORS.down },
        { label: '成交量', value: formatVolume(candle.volume), color: COLORS.text },
      ];

      lines.forEach((line, i) => {
        ctx.fillStyle = COLORS.textDim;
        ctx.fillText(line.label, tooltipX + 15, tooltipY + 25 + i * 18);

        ctx.fillStyle = line.color;
        ctx.fillText(line.value, tooltipX + 90, tooltipY + 25 + i * 18);
      });
    }

    // ========== 绘制信息栏 ==========
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px \"SF Mono\"';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${symbol} | ${timeAxis.interval?.toUpperCase() || selectedPeriod} | ${visibleData.length} bars | Zoom: ${(viewportState.zoomLevel * 100).toFixed(0)}%`,
      padding.left + 10,
      20
    );
  }, [data, viewportState, hoveredIndex, selectedChartType, showVolume, showGrid, height, symbol]);

  // 监听viewport变化并重绘
  useEffect(() => {
    renderChart();
  }, [renderChart]);

  // 窗口resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !viewportManagerRef.current) return;

      const rect = canvas.getBoundingClientRect();
      viewportManagerRef.current.updateCanvasWidth(rect.width);
      setViewportState(viewportManagerRef.current.getState());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ========== 交互事件 ==========

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const viewportManager = viewportManagerRef.current;
    if (!canvas || !viewportManager) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // 更新平移
    const updated = viewportManager.updatePan(x);
    if (updated) {
      setViewportState(viewportManager.getState());
      return;
    }

    // 更新hover
    const index = viewportManager.xToIndex(x);
    if (index >= 0 && index < data.length) {
      setHoveredIndex(index);
    } else {
      setHoveredIndex(-1);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(-1);
    viewportManagerRef.current?.endPan();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const viewportManager = viewportManagerRef.current;
    if (!canvas || !viewportManager) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    viewportManager.startPan(x);
  };

  const handleMouseUp = () => {
    viewportManagerRef.current?.endPan();
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    const viewportManager = viewportManagerRef.current;
    if (!canvas || !viewportManager) return;

    const rect = canvas.getBoundingClientRect();
    const focusX = e.clientX - rect.left;
    const delta = -e.deltaY;

    const updated = viewportManager.zoom(delta, focusX);
    if (updated) {
      setViewportState(viewportManager.getState());
    }
  };

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setSelectedPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const handleChartTypeChange = (newType: ChartType) => {
    setSelectedChartType(newType);
  };

  const periods: TimePeriod[] = ['1D', '5D', '1M', '3M', '6M', '1Y', 'YTD'];
  const chartTypes: { id: ChartType; label: string }[] = [
    { id: 'candlestick', label: 'K线' },
    { id: 'line', label: '线图' },
    { id: 'area', label: '面积图' },
  ];

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-[#0A1929] rounded border border-[#1E3A5F]/40 ${className}`}
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <div className="text-gray-500 text-4xl mb-3">📊</div>
          <div className="text-sm font-mono text-gray-400">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 控制栏 */}
      {showControls && (
        <div className="flex items-center justify-between mb-4 gap-4">
          {/* 周期选择 */}
          <div className="flex gap-1">
            {periods.map(p => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  selectedPeriod === p
                    ? 'bg-[#0ea5e9] text-white'
                    : 'bg-[#1e3a5f]/40 text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/60'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* 图表类型 */}
          <div className="flex gap-1">
            {chartTypes.map(type => (
              <button
                key={type.id}
                onClick={() => handleChartTypeChange(type.id)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  selectedChartType === type.id
                    ? 'bg-[#0ea5e9] text-white'
                    : 'bg-[#1e3a5f]/40 text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/60'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 图表画布 */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full cursor-crosshair"
        style={{ height: `${height}px` }}
      />

      {/* 调试信息 */}
      {viewportState && (
        <div className="mt-2 text-xs font-mono text-gray-500">
          时间范围: {new Date(viewportState.timeRange.startTime).toLocaleDateString()} - {new Date(viewportState.timeRange.endTime).toLocaleDateString()} 
          {' | '}
          可见: {viewportState.visibleBars} bars
          {' | '}
          K线宽度: {viewportState.barWidth.toFixed(1)}px
          {' | '}
          缩放: {(viewportState.zoomLevel * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}