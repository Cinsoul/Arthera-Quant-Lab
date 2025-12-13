import type {
  CandleData,
  TimePeriod,
  TimeInterval,
  TimeTickConfig,
  TimeSeparatorConfig,
  TimeAxisResult,
  PriceTickConfig,
  PriceAxisResult,
  GridConfig,
} from './professionalAxisTypes';

// ============================================================================
// 一、时间梯度总表（核心常量）
// ============================================================================

/**
 * K线粒度候选表（决定一根K覆盖多久）
 * TradingView标准：从分钟级到月级
 */
const BAR_RESOLUTION_STEPS = [
  // Minutes
  { interval: '1m', ms: 1 * 60 * 1000 },
  { interval: '3m', ms: 3 * 60 * 1000 },
  { interval: '5m', ms: 5 * 60 * 1000 },
  { interval: '15m', ms: 15 * 60 * 1000 },
  { interval: '30m', ms: 30 * 60 * 1000 },
  // Hours
  { interval: '1h', ms: 1 * 60 * 60 * 1000 },
  { interval: '2h', ms: 2 * 60 * 60 * 1000 },
  { interval: '4h', ms: 4 * 60 * 60 * 1000 },
  { interval: '6h', ms: 6 * 60 * 60 * 1000 },
  { interval: '12h', ms: 12 * 60 * 60 * 1000 },
  // Days
  { interval: '1D', ms: 1 * 24 * 60 * 60 * 1000 },
  { interval: '2D', ms: 2 * 24 * 60 * 60 * 1000 },
  { interval: '3D', ms: 3 * 24 * 60 * 60 * 1000 },
  { interval: '5D', ms: 5 * 24 * 60 * 60 * 1000 },
  { interval: '10D', ms: 10 * 24 * 60 * 60 * 1000 },
  // Weeks
  { interval: '1W', ms: 7 * 24 * 60 * 60 * 1000 },
  { interval: '2W', ms: 14 * 24 * 60 * 60 * 1000 },
  { interval: '4W', ms: 28 * 24 * 60 * 60 * 1000 },
  // Months
  { interval: '1M', ms: 30 * 24 * 60 * 60 * 1000 },
  { interval: '3M', ms: 90 * 24 * 60 * 60 * 1000 },
  { interval: '6M', ms: 180 * 24 * 60 * 60 * 1000 },
  // Years
  { interval: '1Y', ms: 365 * 24 * 60 * 60 * 1000 },
  { interval: '2Y', ms: 2 * 365 * 24 * 60 * 60 * 1000 },
  { interval: '5Y', ms: 5 * 365 * 24 * 60 * 60 * 1000 },
] as const;

/**
 * X轴刻度粒度候选表（用来画网格和显示文字）
 * TradingView标准：确保刻度数量在5-9个之间
 */
const LABEL_STEP_CANDIDATES = [
  // Minutes
  { interval: '1m', ms: 1 * 60 * 1000 },
  { interval: '5m', ms: 5 * 60 * 1000 },
  { interval: '15m', ms: 15 * 60 * 1000 },
  { interval: '30m', ms: 30 * 60 * 1000 },
  // Hours
  { interval: '1h', ms: 1 * 60 * 60 * 1000 },
  { interval: '2h', ms: 2 * 60 * 60 * 1000 },
  { interval: '4h', ms: 4 * 60 * 60 * 1000 },
  { interval: '6h', ms: 6 * 60 * 60 * 1000 },
  // Days
  { interval: '1D', ms: 1 * 24 * 60 * 60 * 1000 },
  { interval: '2D', ms: 2 * 24 * 60 * 60 * 1000 },
  { interval: '3D', ms: 3 * 24 * 60 * 60 * 1000 },
  { interval: '5D', ms: 5 * 24 * 60 * 60 * 1000 },
  { interval: '10D', ms: 10 * 24 * 60 * 60 * 1000 },
  // Weeks
  { interval: '1W', ms: 7 * 24 * 60 * 60 * 1000 },
  { interval: '2W', ms: 14 * 24 * 60 * 60 * 1000 },
  // Months
  { interval: '1M', ms: 30 * 24 * 60 * 60 * 1000 },
  { interval: '3M', ms: 90 * 24 * 60 * 60 * 1000 },
  { interval: '6M', ms: 180 * 24 * 60 * 60 * 1000 },
  // Years
  { interval: '1Y', ms: 365 * 24 * 60 * 60 * 1000 },
  { interval: '2Y', ms: 2 * 365 * 24 * 60 * 60 * 1000 },
  { interval: '5Y', ms: 5 * 365 * 24 * 60 * 60 * 1000 },
] as const;

/**
 * 按钮 → 时间区间映射（TradingView风格）
 * 每个按钮代表可见区间长度（交易日数）
 */
const TIMEFRAME_PRESETS: Record<TimePeriod, {
  tradingDays: number;
  barResolution?: TimeInterval;
  labelStep?: TimeInterval;
  labelFormat?: string;
}> = {
  '1D': {
    tradingDays: 1,       // 1个交易日（可选分时数据）
    barResolution: '5m',  // 默认5分钟K
    labelStep: '1h',      // X轴显示小时
    labelFormat: 'HH:mm',
  },
  '5D': {
    tradingDays: 5,       // 5个交易日
    barResolution: '15m', // 默认15分钟K
    labelStep: '1D',      // X轴显示日期
    labelFormat: 'MM-dd',
  },
  '1M': {
    tradingDays: 21,      // 约1个月（21个交易日）
    barResolution: '1D',  // 日K
    labelStep: '3D',      // 每3天一个刻度
    labelFormat: 'MM-dd',
  },
  '3M': {
    tradingDays: 63,      // 约3个月（63个交易日）
    barResolution: '1D',  // 日K
    labelStep: '1W',      // 每周一个刻度
    labelFormat: 'MM-dd',
  },
  '6M': {
    tradingDays: 126,     // 约6个月（126个交易日）
    barResolution: '1D',  // 日K
    labelStep: '2W',      // 每2周一个刻度
    labelFormat: 'MM-dd',
  },
  '1Y': {
    tradingDays: 252,     // 约1年（252个交易日）
    barResolution: '1D',  // 日K
    labelStep: '1M',      // 每月一个刻度
    labelFormat: 'MM',
  },
  'YTD': {
    tradingDays: 252,     // 当年交易日数（动态计算）
    barResolution: '1D',  // 日K
    labelStep: '1M',      // 每月一个刻度
    labelFormat: 'MM',
  },
  '5Y': {
    tradingDays: 1260,    // 约5年
    barResolution: '1W',  // 周K
    labelStep: '3M',      // 每季度一个刻度
    labelFormat: 'yyyy-MM',
  },
  'ALL': {
    tradingDays: 2520,    // 约10年
    barResolution: '1M',  // 月K
    labelStep: '1Y',      // 每年一个刻度
    labelFormat: 'yyyy',
  },
};

// ============================================================================
// 二、核心算法：选择最佳粒度
// ============================================================================

/**
 * 根据时间跨度选择最佳K线粒度
 * TradingView规则：屏幕上显示150-300根bar最舒服
 * 
 * @param timeSpanMs 可见时间跨度（毫秒）
 * @param targetBars 目标K线数量（默认200）
 * @returns 最佳K线粒度
 */
function pickBarResolution(timeSpanMs: number, targetBars: number = 200): TimeInterval {
  // 计算理想的每根bar时长
  const approxBarDuration = timeSpanMs / targetBars;
  
  // 从候选表中选择一个 >= approxBarDuration 的最小值
  for (const step of BAR_RESOLUTION_STEPS) {
    if (step.ms >= approxBarDuration) {
      return step.interval as TimeInterval;
    }
  }
  
  // 如果跨度太大，返回最大粒度
  return '1M';
}

/**
 * 根据时间跨度选择最佳X轴刻度间隔
 * TradingView规则：保证X轴文字不要太多，5-9个label最佳
 * 
 * @param timeSpanMs 可见时间跨度（毫秒）
 * @param targetLabelCount 目标刻度数量（默认7）
 * @returns 最佳刻度间隔
 */
function pickLabelStep(timeSpanMs: number, targetLabelCount: number = 7): TimeInterval {
  // 计算理想的刻度间隔
  const approxLabelStepMs = timeSpanMs / targetLabelCount;
  
  // 从候选表中选择一个 >= approxLabelStepMs 的最小值
  for (const step of LABEL_STEP_CANDIDATES) {
    if (step.ms >= approxLabelStepMs) {
      return step.interval as TimeInterval;
    }
  }
  
  // 如果跨度太大，返回最大粒度
  return '5Y';
}

/**
 * Bloomberg级动态时间轴选择器
 * 实现多层级刻度系统：年>月>日>小时>分钟
 * 
 * @param timeSpanMs 可见时间跨度（毫秒）
 * @param targetLabelCount 目标刻度数量（默认7）
 * @returns 最佳刻度间隔和层级信息
 */
function pickDynamicTimeAxis(timeSpanMs: number, targetLabelCount: number = 7): {
  labelStep: TimeInterval;
  majorStep: TimeInterval;
  level: 'year' | 'month' | 'day' | 'hour' | 'minute';
  showSubTicks: boolean;
} {
  const approxLabelStepMs = timeSpanMs / targetLabelCount;
  const durationInMinutes = timeSpanMs / (1000 * 60);
  const durationInHours = timeSpanMs / (1000 * 60 * 60);
  const durationInDays = timeSpanMs / (1000 * 60 * 60 * 24);
  const durationInMonths = durationInDays / 30;
  const durationInYears = durationInDays / 365;
  
  // ========== 分钟级（< 6小时） ==========
  if (durationInHours < 6) {
    if (durationInMinutes < 30) {
      return { labelStep: '1m', majorStep: '5m', level: 'minute', showSubTicks: true };
    } else if (durationInMinutes < 120) {
      return { labelStep: '5m', majorStep: '30m', level: 'minute', showSubTicks: true };
    } else {
      return { labelStep: '15m', majorStep: '1h', level: 'minute', showSubTicks: true };
    }
  }
  
  // ========== 小时级（6小时 - 3天） ==========
  if (durationInDays < 3) {
    if (durationInHours < 12) {
      return { labelStep: '30m', majorStep: '2h', level: 'hour', showSubTicks: true };
    } else if (durationInHours < 48) {
      return { labelStep: '1h', majorStep: '6h', level: 'hour', showSubTicks: true };
    } else {
      return { labelStep: '2h', majorStep: '1D', level: 'hour', showSubTicks: false };
    }
  }
  
  // ========== 日级（3天 - 3个月） ==========
  if (durationInDays < 90) {
    if (durationInDays < 14) {
      return { labelStep: '1D', majorStep: '1W', level: 'day', showSubTicks: true };
    } else if (durationInDays < 45) {
      return { labelStep: '2D', majorStep: '1W', level: 'day', showSubTicks: true };
    } else {
      return { labelStep: '5D', majorStep: '1M', level: 'day', showSubTicks: false };
    }
  }
  
  // ========== 月级（3个月 - 3年） ==========
  if (durationInYears < 3) {
    if (durationInMonths < 12) {
      return { labelStep: '1M', majorStep: '3M', level: 'month', showSubTicks: true };
    } else {
      return { labelStep: '3M', majorStep: '1Y', level: 'month', showSubTicks: true };
    }
  }
  
  // ========== 年级（> 3年） ==========
  if (durationInYears < 10) {
    return { labelStep: '1Y', majorStep: '5Y', level: 'year', showSubTicks: false };
  } else {
    return { labelStep: '5Y', majorStep: '10Y', level: 'year', showSubTicks: false };
  }
}

/**
 * 根据时间跨度选择显示格式
 * TradingView标准：不同跨度用不同格式
 */
function pickLabelFormat(timeSpanDays: number): string {
  if (timeSpanDays <= 2) return 'HH:mm';        // 2天内：显示时间
  if (timeSpanDays <= 30) return 'MM-dd';       // 30天内：月-日
  if (timeSpanDays <= 180) return 'MM-dd';      // 6个月内：月-日
  if (timeSpanDays <= 540) return 'yyyy-MM';    // 18个月内：年-月
  return 'yyyy';                                 // 超过18个月：年份
}

/**
 * 计算专业级X轴（时间轴）
 * 
 * @param data 完整K线数据
 * @param period 时间周期
 * @param chartWidth 图表宽度
 * @param visibleRange 可见数据范围（用于缩放/平移）✅ 核心参数
 */
export function calculateProfessionalTimeAxis(
  data: CandleData[],
  period: TimePeriod,
  chartWidth: number,
  visibleRange?: { start: number; end: number }
): TimeAxisResult {
  if (!data || data.length === 0) {
    return { ticks: [], separators: [] };
  }

  // ✅ 使用可见范围或全部数据
  const start = visibleRange?.start ?? 0;
  const end = visibleRange?.end ?? data.length - 1;
  
  // 边界检查
  if (start < 0 || end >= data.length || start > end) {
    console.warn('[calculateProfessionalTimeAxis] Invalid range:', { start, end, dataLength: data.length });
    return { ticks: [], separators: [] };
  }
  
  // ✅ 只截取可见部分数据
  const visibleData = data.slice(Math.floor(start), Math.ceil(end) + 1);
  
  if (visibleData.length === 0) {
    return { ticks: [], separators: [] };
  }

  const startTime = visibleData[0].timestamp;
  const endTime = visibleData[visibleData.length - 1].timestamp;
  const duration = endTime - startTime;
  
  // Bloomberg标准：控制刻度数量在5-9个之间
  const minTicks = 5;
  const maxTicks = 9;
  const targetTicks = Math.max(minTicks, Math.min(maxTicks, Math.floor(chartWidth / 100)));
  
  // ✅ Bloomberg级动态时间轴系统
  const durationInDays = duration / (1000 * 60 * 60 * 24);
  const axisConfig = pickDynamicTimeAxis(duration, targetTicks);
  const interval = axisConfig.labelStep;
  
  const ticks = generateEnhancedTimeTicks(
    startTime, 
    endTime, 
    axisConfig, 
    period, 
    chartWidth, 
    targetTicks, 
    visibleData.length
  );
  const separators = generateTimeSeparators(startTime, endTime, axisConfig, period);
  
  console.log('[calculateProfessionalTimeAxis] Results:', {
    visibleDataLength: visibleData.length,
    visibleRange: `[${start.toFixed(1)}, ${end.toFixed(1)}]`,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    duration: `${durationInDays.toFixed(1)} days`,
    interval,
    ticksCount: ticks.length,
    separatorsCount: separators.length,
    firstTick: ticks[0]?.label,
    lastTick: ticks[ticks.length - 1]?.label,
  });
  
  return {
    ticks,
    separators,
    interval,
    format: pickLabelFormat(durationInDays),
    density: ticks.length,
    axisLevel: axisConfig.level,
    majorStep: axisConfig.majorStep,
    showSubTicks: axisConfig.showSubTicks,
  };
}

/**
 * 增强版时间刻度生成器
 * Bloomberg级多层刻度系统：主刻度 + 次刻度 + 智能对齐
 */
function generateEnhancedTimeTicks(
  startTime: number,
  endTime: number,
  axisConfig: {
    labelStep: TimeInterval;
    majorStep: TimeInterval;
    level: 'year' | 'month' | 'day' | 'hour' | 'minute';
    showSubTicks: boolean;
  },
  period: TimePeriod,
  chartWidth: number,
  targetTicks: number,
  dataLength: number
): TimeTickConfig[] {
  const { labelStep: interval, majorStep, level, showSubTicks } = axisConfig;
  const ticks: TimeTickConfig[] = [];
  const intervalMs = getIntervalMilliseconds(interval);
  
  // ✅ 计算可见时间跨度（用于自适应格式）
  const duration = endTime - startTime;
  
  // 对齐到时间边界
  let current = alignToTimeBoundary(startTime, interval);
  
  // 确保current不早于startTime太多
  while (current < startTime && current + intervalMs <= endTime) {
    current += intervalMs;
  }
  
  let tickCount = 0;
  const maxIterations = 1000; // 防止无限循环
  
  while (current <= endTime && tickCount < maxIterations) {
    const date = new Date(current);
    
    // 判断是否为主刻度
    const isMajor = isMajorTick(date, interval, period);
    
    // 判断是否为市场关键时间
    const isMarketOpen = isMarketOpenTime(date);
    const isMarketClose = isMarketCloseTime(date);
    
    // ✅ 增强的标签格式化，考虑多层级系统
    const label = formatEnhancedTimeLabel(date, interval, majorStep, level, isMajor, duration);
    
    if (label) {
      ticks.push({
        timestamp: current,
        label,
        position: (current - startTime) / (endTime - startTime) * chartWidth,
        type: isMajor ? 'major' : 'minor',
        isImportant: isMajor || isMarketOpen || isMarketClose,
        isMarketOpen,
        isMarketClose,
      });
    }
    
    current += intervalMs;
    tickCount++;
  }
  
  // 确保末端刻度
  if (ticks.length === 0 || ticks[ticks.length - 1].timestamp !== endTime) {
    const date = new Date(endTime);
    const label = formatEnhancedTimeLabel(date, interval, majorStep, level, true, duration);
    if (label) {
      ticks.push({
        timestamp: endTime,
        label,
        position: chartWidth,
        type: 'major',
        isImportant: true,
      });
    }
  }
  
  console.log('[generateTimeTicks] Generated ticks:', {
    period,
    interval,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    duration: `${(duration / (1000 * 60 * 60 * 24)).toFixed(1)} days`,
    tickCount: ticks.length,
    firstLabel: ticks[0]?.label,
    lastLabel: ticks[ticks.length - 1]?.label,
  });
  
  // 智能过滤：优先保留主刻度
  if (ticks.length > targetTicks * 1.5) {
    // 分离主次刻度
    const majorTicks = ticks.filter(t => t.type === 'major');
    const minorTicks = ticks.filter(t => t.type === 'minor');
    
    // 如果主刻度已经足够，只保留主刻度
    if (majorTicks.length >= targetTicks) {
      return majorTicks;
    }
    
    // 否则，保留所有主刻度 + 部分次刻度
    const minorToKeep = Math.max(0, targetTicks - majorTicks.length);
    const minorStep = Math.max(1, Math.ceil(minorTicks.length / minorToKeep));
    const filteredMinor = minorTicks.filter((_, index) => index % minorStep === 0);
    
    // 合并并按时间戳排序
    return [...majorTicks, ...filteredMinor].sort((a, b) => a.timestamp - b.timestamp);
  }
  
  return ticks;
}

/**
 * 对齐到时间边界
 * 例如：15分钟对齐到:00, :15, :30, :45
 */
function alignToTimeBoundary(timestamp: number, interval: TimeInterval): number {
  const date = new Date(timestamp);
  
  switch (interval) {
    case '1m':
      date.setSeconds(0, 0);
      break;
    case '3m':  // ✅ 新增3分钟对齐
      date.setMinutes(Math.floor(date.getMinutes() / 3) * 3, 0, 0);
      break;
    case '5m':
      date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
      break;
    case '10m':
      date.setMinutes(Math.floor(date.getMinutes() / 10) * 10, 0, 0);
      break;
    case '15m':
      date.setMinutes(Math.floor(date.getMinutes() / 15) * 15, 0, 0);
      break;
    case '30m':
      date.setMinutes(Math.floor(date.getMinutes() / 30) * 30, 0, 0);
      break;
    case '1h':
      date.setMinutes(0, 0, 0);
      break;
    case '2h':
      date.setHours(Math.floor(date.getHours() / 2) * 2, 0, 0, 0);
      break;
    case '3h':
      date.setHours(Math.floor(date.getHours() / 3) * 3, 0, 0, 0);
      break;
    case '4h':
      date.setHours(Math.floor(date.getHours() / 4) * 4, 0, 0, 0);
      break;
    case '6h':  // ✅ 新增6小时对齐
      date.setHours(Math.floor(date.getHours() / 6) * 6, 0, 0, 0);
      break;
    case '12h':  // ✅ 新增12小时对齐
      date.setHours(Math.floor(date.getHours() / 12) * 12, 0, 0, 0);
      break;
    case '1D':
      date.setHours(0, 0, 0, 0);
      break;
    case '2D':
      // 对齐到2天边界
      const daysSinceEpoch = Math.floor(date.getTime() / (2 * 24 * 60 * 60 * 1000));
      return daysSinceEpoch * 2 * 24 * 60 * 60 * 1000;
    case '3D':
      // 对齐到3天边界
      const daysSinceEpoch3 = Math.floor(date.getTime() / (3 * 24 * 60 * 60 * 1000));
      return daysSinceEpoch3 * 3 * 24 * 60 * 60 * 1000;
    case '5D':  // ✅ 新增5天对齐
      // 对齐到5天边界
      const daysSinceEpoch5 = Math.floor(date.getTime() / (5 * 24 * 60 * 60 * 1000));
      return daysSinceEpoch5 * 5 * 24 * 60 * 60 * 1000;
    case '10D':  // ✅ 新增10天对齐
      // 对齐到10天边界
      const daysSinceEpoch10 = Math.floor(date.getTime() / (10 * 24 * 60 * 60 * 1000));
      return daysSinceEpoch10 * 10 * 24 * 60 * 60 * 1000;
    case '1W':
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      date.setDate(diff);
      date.setHours(0, 0, 0, 0);
      break;
    case '2W':
      // 对齐到2周边界
      const weeksSinceEpoch = Math.floor(date.getTime() / (2 * 7 * 24 * 60 * 60 * 1000));
      return weeksSinceEpoch * 2 * 7 * 24 * 60 * 60 * 1000;
    case '4W':  // ✅ 新增4周对齐
      // 对齐到4周边界
      const weeksSinceEpoch4 = Math.floor(date.getTime() / (4 * 7 * 24 * 60 * 60 * 1000));
      return weeksSinceEpoch4 * 4 * 7 * 24 * 60 * 60 * 1000;
    case '1M':
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      break;
    case '3M':  // ✅ 新增3月对齐
      // 对齐到季度开始（1, 4, 7, 10月）
      date.setMonth(Math.floor(date.getMonth() / 3) * 3, 1);
      date.setHours(0, 0, 0, 0);
      break;
    case '6M':  // ✅ 新增6月对齐
      // 对齐到半年开始（1, 7月）
      date.setMonth(Math.floor(date.getMonth() / 6) * 6, 1);
      date.setHours(0, 0, 0, 0);
      break;
    case '1Y':  // ✅ 新增1年对齐
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
      break;
    case '2Y':  // ✅ 新增2年对齐
      const year2 = Math.floor(date.getFullYear() / 2) * 2;
      date.setFullYear(year2, 0, 1);
      date.setHours(0, 0, 0, 0);
      break;
    case '5Y':  // ✅ 新增5年对齐
      const year5 = Math.floor(date.getFullYear() / 5) * 5;
      date.setFullYear(year5, 0, 1);
      date.setHours(0, 0, 0, 0);
      break;
  }
  
  return date.getTime();
}

/**
 * 判断是否为主刻度
 * Bloomberg规则：关键时间节点为主刻度
 */
function isMajorTick(date: Date, interval: TimeInterval, period: TimePeriod): boolean {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay();
  
  switch (interval) {
    case '1m':
    case '5m':
      // 整点为主刻度
      return minute === 0;
    
    case '10m':  // ✅ 新增10分钟刻度判断
      // 整点和30分为主刻度
      return minute === 0 || minute === 30;
    
    case '15m':
      // 整点和半点为主刻度
      return minute === 0 || minute === 30;
    
    case '30m':
      // 9:30开盘、12:00、14:00、15:00收盘
      return (hour === 9 && minute === 30) || 
             (hour === 12 && minute === 0) || 
             (hour === 14 && minute === 0) || 
             (hour === 15 && minute === 0);
    
    case '1h':
      // 开盘时间、午休、收盘时间
      return hour === 9 || hour === 12 || hour === 13 || hour === 15;
    
    case '2h':
      // 每天开盘、收盘时间为主刻度
      return hour === 9 || hour === 13 || hour === 15;
    
    case '3h':  // ✅ 新增3小时刻度判断
      // 开盘和收盘时间为主刻度
      return hour === 9 || hour === 15;
    
    case '4h':
      // 每天的第一根
      return hour === 0;
    
    case '1D':
    case '2D':
      // 每周一、每月1号
      return dayOfWeek === 1 || dayOfMonth === 1;
    
    case '3D':
      // 每周一、每月1号、每月15号
      return dayOfWeek === 1 || dayOfMonth === 1 || dayOfMonth === 15;
    
    case '1W':
    case '2W':
      // 每月1号
      return dayOfMonth <= 7;
    
    case '1M':
      // 每季度、每年
      const month = date.getMonth() + 1;
      return month === 1 || month === 4 || month === 7 || month === 10;
    
    default:
      return false;
  }
}

/**
 * 查找时间分隔线
 * Bloomberg标准：月/季/年边界绘制分隔线
 */
function findTimeSeparators(startTime: number, endTime: number, period: TimePeriod): TimeSeparatorConfig[] {
  const separators: TimeSeparatorConfig[] = [];
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // 5D周期 - 日期分隔线（每天开盘时间）
  if (period === '5D') {
    let current = new Date(start);
    current.setHours(9, 30, 0, 0); // 设置为当天开盘时间
    
    // 如果起始时间在开盘后，从下一天开始
    if (start.getTime() > current.getTime()) {
      current.setDate(current.getDate() + 1);
      current.setHours(9, 30, 0, 0);
    }
    
    while (current <= end) {
      // 跳过周末
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        separators.push({
          timestamp: current.getTime(),
          type: 'day',
          label: `${current.getMonth() + 1}/${current.getDate()}`,
        });
      }
      
      // 移到下一天
      current.setDate(current.getDate() + 1);
      current.setHours(9, 30, 0, 0);
    }
  }
  
  // 1M周期 - 周分隔线（每周一）
  if (period === '1M') {
    let current = new Date(start);
    // 找到下一个周一
    const day = current.getDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    current.setDate(current.getDate() + daysUntilMonday);
    current.setHours(0, 0, 0, 0);
    
    while (current <= end) {
      separators.push({
        timestamp: current.getTime(),
        type: 'week',
        label: `Week ${Math.ceil(current.getDate() / 7)}`,
      });
      current.setDate(current.getDate() + 7);
    }
  }
  
  // 月分隔线（3M及以上周期）
  if (['3M', '6M', '1Y', 'YTD', '5Y', 'ALL'].includes(period)) {
    let current = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    while (current <= end) {
      separators.push({
        timestamp: current.getTime(),
        type: 'month',
        label: current.toLocaleString('default', { month: 'short' }),
      });
      current.setMonth(current.getMonth() + 1);
    }
  }
  
  // 季度分隔线（1Y及以上周期）
  if (['1Y', 'YTD', '5Y', 'ALL'].includes(period)) {
    let current = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3 + 3, 1);
    while (current <= end) {
      separators.push({
        timestamp: current.getTime(),
        type: 'quarter',
        label: `Q${Math.floor(current.getMonth() / 3) + 1}`,
      });
      current.setMonth(current.getMonth() + 3);
    }
  }
  
  // 年分隔线（5Y及以上周期）
  if (['5Y', 'ALL'].includes(period)) {
    let current = new Date(start.getFullYear() + 1, 0, 1);
    while (current <= end) {
      separators.push({
        timestamp: current.getTime(),
        type: 'year',
        label: current.getFullYear().toString(),
      });
      current.setFullYear(current.getFullYear() + 1);
    }
  }
  
  return [...new Set(separators)].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * 市场开盘时间判断（中国A股）
 */
function isMarketOpenTime(date: Date): boolean {
  const hour = date.getHours();
  const minute = date.getMinutes();
  return (hour === 9 && minute === 30) || (hour === 13 && minute === 0);
}

/**
 * 市场收盘时间判断（中国A股）
 */
function isMarketCloseTime(date: Date): boolean {
  const hour = date.getHours();
  const minute = date.getMinutes();
  return (hour === 11 && minute === 30) || (hour === 15 && minute === 0);
}

/**
 * 格式化时间标签
 * Bloomberg标准：根据区间长度智能选择格式
 * ✅ 新增：根据可见时间跨度自适应格式（月份>日期>小时>分钟）
 */
function formatTimeLabel(
  date: Date,
  interval: TimeInterval,
  period: TimePeriod,
  isMajor: boolean,
  duration?: number  // ✅ 新增：可见时间跨度（毫秒）
): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  // ✅ 智能自适应格式（优先级最高）
  if (duration) {
    const durationInMinutes = duration / (1000 * 60);
    const durationInHours = duration / (1000 * 60 * 60);
    const durationInDays = duration / (1000 * 60 * 60 * 24);
    
    // ========== 分钟级数据（1D周期的1分钟K线）==========
    if (interval === '1m' || interval === '5m' || interval === '15m' || interval === '30m') {
      // 极短跨度（< 30分钟）- 显示精确分钟
      if (durationInMinutes < 30) {
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }
      // 短跨度（30分钟 - 2小时）- 显示小时:分钟
      if (durationInHours < 2) {
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }
      // 中等跨度（2小时 - 1天）- 显示小时
      if (durationInDays < 1) {
        if (minute === 0) {
          return `${String(hour).padStart(2, '0')}:00`;
        }
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }
      // 跨天 - 显示日期+时间
      return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    
    // ========== 小时级数据 ==========
    if (interval === '1h' || interval === '2h' || interval === '4h') {
      if (durationInDays < 3) {
        return `${String(hour).padStart(2, '0')}:00`;
      }
      return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00`;
    }
    
    // ========== 日线级数据（1M/3M/6M周期）==========
    // 关键：日线数据hour和minute都是0，所以要根据天数跨度来调整格式粒度
    
    // 极短跨度（< 7天）- 显示完整日期 + 可能的星期
    if (durationInDays < 7) {
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      const weekday = weekdays[date.getDay()];
      // 主刻度显示星期，次刻度只显示日期
      if (isMajor) {
        return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 周${weekday}`;
      }
      return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    // 短跨度（7天 - 30天）- 显示月-日，主刻度高亮月份切换
    if (durationInDays < 30) {
      // 月初或主刻度：显示完整日期
      if (day === 1 || isMajor) {
        return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      // 次刻度：只显示日期
      return `${String(day).padStart(2, '0')}`;
    }
    
    // 中等跨度（30天 - 90天）- 显示月-日，间隔更大
    if (durationInDays < 90) {
      // 月初显示完整月-日
      if (day === 1) {
        return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      // 其他日期根据是否主刻度决定
      if (isMajor) {
        return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return `${String(day).padStart(2, '0')}`;
    }
    
    // 长跨度（90天 - 180天）- 主要显示月份
    if (durationInDays < 180) {
      // 每月1号或主刻度：显示月份
      if (day === 1 || isMajor) {
        return `${String(month).padStart(2, '0')}-01`;
      }
      // 月中次刻度：显示简化日期
      return `${String(day).padStart(2, '0')}`;
    }
    
    // 超长跨度（> 180天）- 显示年-月
    if (durationInDays < 365) {
      if (day === 1 || isMajor) {
        return `${String(month).padStart(2, '0')}-01`;
      }
      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    }
    
    // 超过1年 - 显示年-月
    if (month === 1 || isMajor) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    return `${String(month).padStart(2, '0')}`;
  }
  
  // ✅ 原有逻辑保持不变（向后兼容，当duration未传入时）
  // 分钟级 - 显示时间（Bloomberg风格）
  if (['1m', '5m', '15m', '30m'].includes(interval)) {
    // 始终显示完整时间 HH:mm
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  
  // 小时级 - 显示时间
  if (['1h', '2h', '4h'].includes(interval)) {
    return `${String(hour).padStart(2, '0')}:00`;
  }
  
  // 日级 - 根据周期选择格式
  if (interval === '1D') {
    // 短周期（≤ 1月）：显示 MM-dd
    if (['1D', '5D', '1M'].includes(period)) {
      return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    // 中周期（1-6月）：显示 MM 或完整 MM-dd
    if (['3M', '6M'].includes(period)) {
      // 每月1号显示完整日期，其他只显示日期
      if (day === 1) {
        return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return `${String(day).padStart(2, '0')}`;
    }
    
    // 长周期（> 1年）：显示 YYYY-MM 或 MM
    if (['1Y', 'YTD'].includes(period)) {
      // 每年1月或主刻度显示年份
      if (month === 1 || isMajor) {
        return `${year}-${String(month).padStart(2, '0')}`;
      }
      return `${String(month).padStart(2, '0')}`;
    }
    
    return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  // 2D/3D级 - 1M周期专用格式，显示完整日期
  if (interval === '2D' || interval === '3D') {
    if (period === '1M') {
      // 1M周期使用完整日期格式，主刻度显示月份信息
      if (isMajor || day === 1) {
        // 主刻度或每月1号：显示完整月-日
        return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      // 次刻度：只显示日期
      return `${String(day).padStart(2, '0')}`;
    }
    // 其他周期：显示完整日期
    return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  // 周级 - 显示 MM-dd
  if (interval === '1W') {
    return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  // 月级 - 显示 YYYY-MM
  if (interval === '1M') {
    // 每年1月显示完整年份，其他月份只显示月份
    if (month === 1 || isMajor) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    return `${String(month).padStart(2, '0')}`;
  }
  
  return '';
}

/**
 * 获取时间格式模板
 * Bloomberg标准：根据时间间隔和数据区间长度选择格式
 */
function getTimeFormatTemplate(interval: TimeInterval, period: TimePeriod, duration: number): string {
  const durationInDays = duration / (1000 * 60 * 60 * 24);
  
  // 分钟/小时级 - 时间格式
  if (['1m', '5m', '15m', '30m', '1h', '4h'].includes(interval)) {
    return 'HH:mm';
  }
  
  // 日级 - 根据数据区间长度选择
  if (interval === '1D' || interval === '1W') {
    // ≤ 30天：显示 MM-dd
    if (durationInDays <= 30) {
      return 'MM-DD';
    }
    // 30-180天：显示 MM
    if (durationInDays <= 180) {
      return 'MM';
    }
    // > 180天：显示 YYYY-MM
    return 'YYYY-MM';
  }
  
  // 月级 - 显示 YYYY-MM
  if (interval === '1M') {
    return 'YYYY-MM';
  }
  
  return 'MM-DD';
}

/**
 * 获取时间间隔毫秒数
 */
function getIntervalMilliseconds(interval: TimeInterval): number {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  switch (interval) {
    case '1m': return minute;
    case '3m': return 3 * minute;  // ✅ 新增3分钟
    case '5m': return 5 * minute;
    case '10m': return 10 * minute;
    case '15m': return 15 * minute;
    case '30m': return 30 * minute;
    case '1h': return hour;
    case '2h': return 2 * hour;
    case '3h': return 3 * hour;
    case '4h': return 4 * hour;
    case '6h': return 6 * hour;  // ✅ 新增6小时
    case '12h': return 12 * hour;  // ✅ 新增12小时
    case '1D': return day;
    case '2D': return 2 * day;
    case '3D': return 3 * day;
    case '5D': return 5 * day;  // ✅ 新增5天
    case '10D': return 10 * day;  // ✅ 新增10天
    case '1W': return 7 * day;
    case '2W': return 14 * day;
    case '4W': return 28 * day;
    case '1M': return 30 * day; // 近似
    case '3M': return 90 * day;  // ✅ 新增3月
    case '6M': return 180 * day;  // ✅ 新增6月
    case '1Y': return 365 * day;  // ✅ 新增1年
    case '2Y': return 2 * 365 * day;  // ✅ 新增2年
    case '5Y': return 5 * 365 * day;  // ✅ 新增5年
    default: return day;
  }
}

// ============================================================================
// Y轴价格计算 (Bloomberg标准)
// ============================================================================

/**
 * 计算专业级Y轴价格刻度（TradingView优化版）
 * 规则：
 * - 智能刻度数量：5-12个（根据图表高度自适应）
 * - 价格敏感的步长：0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100...
 * - 关键价位对齐（整数价位、心理价位）
 * - 中国股市特色：分（0.01）精度优先
 */
export function calculatePriceAxis(
  dataMin: number,
  dataMax: number,
  canvasHeight: number,
  minTickSpacing: number = 50, // 像素
  scaleType: 'linear' | 'log' = 'linear'
): PriceAxisResult {
  // TradingView风格：更少的留白（3-6%）
  const paddingPercent = Math.min(0.06, Math.max(0.03, (dataMax - dataMin) / Math.max(dataMax, 100) * 0.1));
  const padding = (dataMax - dataMin) * paddingPercent;
  const min = Math.max(0, dataMin - padding); // 价格不能为负
  const max = dataMax + padding;
  const range = max - min;
  
  if (range <= 0) {
    console.warn('[calculatePriceAxis] Invalid price range:', { dataMin, dataMax, range });
    return createFallbackPriceAxis(dataMin, dataMax);
  }
  
  // 智能刻度数量：根据图表高度自适应
  const maxTicks = Math.min(12, Math.max(5, Math.floor(canvasHeight / minTickSpacing)));
  const targetTickCount = Math.max(6, Math.min(maxTicks, Math.floor(canvasHeight / 60)));
  
  // TradingView风格：价格敏感的步长候选
  const niceSteps = [
    0.001, 0.002, 0.005,        // 极小步长（仙股）
    0.01, 0.02, 0.05,           // 分级步长（主要）
    0.1, 0.2, 0.5,             // 角级步长
    1, 2, 5,                   // 元级步长
    10, 20, 50,                // 十元级
    100, 200, 500,             // 百元级
    1000, 2000, 5000,          // 千元级
    10000, 20000, 50000        // 万元级
  ];
  
  // 找到最佳步长
  const idealStep = range / (targetTickCount - 1);
  let bestStep = niceSteps[0];
  let bestScore = Infinity;
  
  for (const step of niceSteps) {
    if (step < idealStep * 0.5) continue; // 太小，会产生太多刻度
    if (step > idealStep * 3) break;      // 太大，刻度太少
    
    // 计算这个步长的分数
    const tickCount = Math.ceil(range / step);
    const tickCountScore = Math.abs(tickCount - targetTickCount);
    const stepScore = Math.abs(Math.log10(step / idealStep)); // 偏离理想步长的程度
    const totalScore = tickCountScore + stepScore * 0.5;
    
    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestStep = step;
    }
  }
  
  // 对齐边界到心理价位
  const niceMin = alignToKeyPrice(min, bestStep, 'down');
  const niceMax = alignToKeyPrice(max, bestStep, 'up');
  
  // 生成刻度
  const ticks: PriceTickConfig[] = [];
  let currentValue = niceMin;
  let iterationCount = 0;
  const maxIterations = 50; // 防止无限循环
  
  while (currentValue <= niceMax && iterationCount < maxIterations) {
    // 判断是否为主刻度（关键价位）
    const isKeyPrice = isKeyPriceLevel(currentValue, bestStep);
    const isRoundNumber = isNiceRoundNumber(currentValue);
    
    ticks.push({
      value: currentValue,
      label: formatPriceValue(currentValue, bestStep),
      type: (isKeyPrice || isRoundNumber) ? 'major' : 'minor',
      isRoundNumber,
      isKeyLevel: isKeyPrice,
    });
    
    currentValue += bestStep;
    currentValue = Math.round(currentValue / bestStep) * bestStep; // 避免浮点累积误差
    iterationCount++;
  }
  
  // 计算小数位数
  const decimals = getOptimalDecimals(bestStep);
  
  console.log('[calculatePriceAxis] Results:', {
    dataRange: `[${dataMin.toFixed(3)}, ${dataMax.toFixed(3)}]`,
    niceRange: `[${niceMin.toFixed(3)}, ${niceMax.toFixed(3)}]`,
    step: bestStep,
    tickCount: ticks.length,
    decimals,
    padding: `${(paddingPercent * 100).toFixed(1)}%`,
  });
  
  return {
    ticks,
    min: dataMin,
    max: dataMax,
    step: bestStep,
    decimals,
    niceMin,
    niceMax,
  };
}

/**
 * 创建回退价格轴（当计算失败时）
 */
function createFallbackPriceAxis(dataMin: number, dataMax: number): PriceAxisResult {
  const center = (dataMin + dataMax) / 2;
  const range = Math.max(1, Math.abs(dataMax - dataMin));
  const step = range / 5;
  
  const ticks: PriceTickConfig[] = [];
  for (let i = 0; i <= 5; i++) {
    const value = dataMin + i * step;
    ticks.push({
      value,
      label: formatPriceValue(value),
      type: i % 2 === 0 ? 'major' : 'minor',
      isRoundNumber: i % 2 === 0,
    });
  }
  
  return {
    ticks,
    min: dataMin,
    max: dataMax,
    step,
    decimals: 2,
    niceMin: dataMin,
    niceMax: dataMax,
  };
}

/**
 * 对齐到关键价位
 * TradingView规则：优先对齐到心理价位（整数、半整数等）
 */
function alignToKeyPrice(price: number, step: number, direction: 'up' | 'down'): number {
  // 基础对齐
  const basicAligned = direction === 'up' ? 
    Math.ceil(price / step) * step : 
    Math.floor(price / step) * step;
  
  // 心理价位对齐（整数、0.5的倍数等）
  const keyPriceLevels = [1, 5, 10, 50, 100, 500, 1000];
  
  for (const level of keyPriceLevels) {
    if (Math.abs(price - level) < step) {
      // 如果接近心理价位，对齐到该价位
      return direction === 'up' ? 
        Math.max(basicAligned, level) :
        Math.min(basicAligned, level);
    }
  }
  
  return basicAligned;
}

/**
 * 判断是否为关键价位
 */
function isKeyPriceLevel(price: number, step: number): boolean {
  // 整数价位
  if (price === Math.floor(price) && price % 5 === 0) return true;
  
  // 大步长的边界
  if (step >= 1 && price % (step * 2) === 0) return true;
  
  // 心理价位（10, 50, 100的倍数）
  if (price > 0 && (
    price % 10 === 0 || 
    price % 50 === 0 || 
    price % 100 === 0
  )) return true;
  
  return false;
}

/**
 * 判断是否为漂亮的整数
 */
function isNiceRoundNumber(value: number): boolean {
  if (value === 0) return true;
  if (value === Math.floor(value)) {
    // 整数：检查是否为5或10的倍数
    return value % 5 === 0 || value % 10 === 0;
  }
  return false;
}

/**
 * 格式化价格值（TradingView风格优化）
 * 智能选择最佳精度和格式
 */
function formatPriceValue(value: number, step?: number): string {
  // TradingView规则：根据步长智能选择精度
  if (step) {
    // 根据步长确定小数位数
    const stepDecimals = getOptimalDecimals(step);
    
    // 特殊处理：中国股票价格通常为分（0.01）精度
    if (value >= 0.01 && value < 10000) {
      return value.toFixed(Math.max(2, stepDecimals));
    }
  }
  
  // 大数值：使用K/M后缀（但保持中国习惯）
  if (Math.abs(value) >= 10000) {
    if (Math.abs(value) >= 1000000) {
      return (value / 10000).toFixed(1) + '万';
    }
    return (value / 10000).toFixed(2) + '万';
  }
  
  // 极小值：科学计数法
  if (Math.abs(value) < 0.0001) {
    return value.toExponential(2);
  }
  
  // 小数：智能精度
  if (Math.abs(value) < 0.01) {
    return value.toFixed(4);
  }
  if (Math.abs(value) < 0.1) {
    return value.toFixed(3);
  }
  if (Math.abs(value) < 1) {
    return value.toFixed(3);
  }
  
  // 标准股价范围：2位小数
  if (Math.abs(value) < 1000) {
    return value.toFixed(2);
  }
  
  // 高价股：1位小数
  return value.toFixed(1);
}

/**
 * 获取最佳小数位数
 */
function getOptimalDecimals(step: number): number {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  if (step >= 0.01) return 2;
  if (step >= 0.001) return 3;
  return 4;
}

/**
 * 计算网格线配置
 */
export function calculateGridLines(
  timeAxis: TimeAxisResult,
  priceAxis: PriceAxisResult
): GridConfig {
  return {
    horizontalLines: priceAxis.ticks.map(t => t.value),
    verticalLines: timeAxis.ticks.map(t => t.timestamp),
    majorColor: '#1E3A5F',
    minorColor: '#1E3A5F33',
    separatorColor: '#0EA5E9',
  };
}

// ============================================================================
// 增强时间轴函数（Bloomberg级多层刻度系统）
// ============================================================================

/**
 * 增强版时间标签格式化
 * 支持多层级系统：年>月>日>小时>分钟
 */
function formatEnhancedTimeLabel(
  date: Date,
  interval: TimeInterval,
  majorStep: TimeInterval,
  level: 'year' | 'month' | 'day' | 'hour' | 'minute',
  isMajor: boolean,
  duration?: number
): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  // 优先使用Bloomberg级多层级格式化
  if (duration && level) {
    const durationInMinutes = duration / (1000 * 60);
    const durationInHours = duration / (1000 * 60 * 60);
    const durationInDays = duration / (1000 * 60 * 60 * 24);
    
    switch (level) {
      case 'minute':
        // 分钟级：根据主刻度决定显示内容
        if (isMajor || interval === majorStep) {
          // 主刻度：显示完整时间
          if (durationInMinutes < 30) {
            return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          } else if (durationInHours < 6) {
            return minute === 0 ? `${String(hour).padStart(2, '0')}:00` : 
                   `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          } else {
            return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          }
        } else {
          // 次刻度：简化显示
          return durationInMinutes < 60 ? String(minute).padStart(2, '0') : '';
        }
        
      case 'hour':
        // 小时级：主刻度显示小时，次刻度显示分钟或省略
        if (isMajor || interval === majorStep) {
          if (durationInDays < 1) {
            return `${String(hour).padStart(2, '0')}:00`;
          } else {
            return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00`;
          }
        } else {
          return durationInHours < 12 ? String(hour).padStart(2, '0') : '';
        }
        
      case 'day':
        // 日级：主刻度显示月-日，次刻度显示日期或省略
        if (isMajor || interval === majorStep) {
          if (durationInDays < 7) {
            const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
            const weekday = weekdays[date.getDay()];
            return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 周${weekday}`;
          } else if (durationInDays < 90) {
            return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          } else {
            return `${String(month).padStart(2, '0')}-01`;
          }
        } else {
          return durationInDays < 30 ? String(day).padStart(2, '0') : '';
        }
        
      case 'month':
        // 月级：主刻度显示年-月，次刻度显示月份
        if (isMajor || interval === majorStep) {
          if (durationInDays < 365) {
            return `${String(month).padStart(2, '0')}-01`;
          } else {
            return `${year}-${String(month).padStart(2, '0')}`;
          }
        } else {
          return String(month).padStart(2, '0');
        }
        
      case 'year':
        // 年级：主刻度显示年份，次刻度简化
        if (isMajor || interval === majorStep) {
          return year.toString();
        } else {
          return year.toString().slice(2); // 只显示后两位
        }
    }
  }
  
  // 回退到原有格式化逻辑
  return formatTimeLabel(date, interval, 'Custom', isMajor, duration);
}

/**
 * 增强版时间分隔线生成器
 * 根据层级和周期生成重要的时间分隔线
 */
function generateTimeSeparators(
  startTime: number,
  endTime: number,
  axisConfig: {
    labelStep: TimeInterval;
    majorStep: TimeInterval;
    level: 'year' | 'month' | 'day' | 'hour' | 'minute';
    showSubTicks: boolean;
  },
  period: TimePeriod
): TimeSeparatorConfig[] {
  const separators: TimeSeparatorConfig[] = [];
  const { level } = axisConfig;
  
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  // 根据层级生成不同的分隔线
  switch (level) {
    case 'minute':
    case 'hour':
      // 小时/分钟级：添加日分隔线
      addDaySeparators(startDate, endDate, separators);
      break;
      
    case 'day':
      // 日级：添加月分隔线
      addMonthSeparators(startDate, endDate, separators);
      break;
      
    case 'month':
      // 月级：添加年分隔线
      addYearSeparators(startDate, endDate, separators);
      break;
      
    case 'year':
      // 年级：添加十年分隔线
      addDecadeSeparators(startDate, endDate, separators);
      break;
  }
  
  return separators;
}

/**
 * 添加日分隔线
 */
function addDaySeparators(startDate: Date, endDate: Date, separators: TimeSeparatorConfig[]): void {
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  current.setDate(current.getDate() + 1); // 下一天开始
  
  while (current <= endDate) {
    separators.push({
      timestamp: current.getTime(),
      type: 'day',
      label: `${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`,
    });
    current.setDate(current.getDate() + 1);
  }
}

/**
 * 添加月分隔线
 */
function addMonthSeparators(startDate: Date, endDate: Date, separators: TimeSeparatorConfig[]): void {
  const current = new Date(startDate);
  current.setDate(1);
  current.setHours(0, 0, 0, 0);
  current.setMonth(current.getMonth() + 1); // 下个月开始
  
  while (current <= endDate) {
    separators.push({
      timestamp: current.getTime(),
      type: 'month',
      label: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
    });
    current.setMonth(current.getMonth() + 1);
  }
}

/**
 * 添加年分隔线
 */
function addYearSeparators(startDate: Date, endDate: Date, separators: TimeSeparatorConfig[]): void {
  const current = new Date(startDate);
  current.setMonth(0, 1);
  current.setHours(0, 0, 0, 0);
  current.setFullYear(current.getFullYear() + 1); // 下一年开始
  
  while (current <= endDate) {
    separators.push({
      timestamp: current.getTime(),
      type: 'year',
      label: current.getFullYear().toString(),
    });
    current.setFullYear(current.getFullYear() + 1);
  }
}

/**
 * 添加十年分隔线
 */
function addDecadeSeparators(startDate: Date, endDate: Date, separators: TimeSeparatorConfig[]): void {
  const current = new Date(startDate);
  current.setMonth(0, 1);
  current.setHours(0, 0, 0, 0);
  
  // 对齐到十年边界
  const startDecade = Math.floor(current.getFullYear() / 10) * 10;
  current.setFullYear(startDecade + 10);
  
  while (current <= endDate) {
    separators.push({
      timestamp: current.getTime(),
      type: 'year',
      label: `${current.getFullYear()}s`,
    });
    current.setFullYear(current.getFullYear() + 10);
  }
}