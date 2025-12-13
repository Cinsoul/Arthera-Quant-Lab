/**
 * Professional Axis Calculator - Type Definitions
 * Bloomberg Terminal标准的图表轴类型定义
 */

// ============================================================================
// 基础数据类型
// ============================================================================

export interface CandleData {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// 时间轴类型
// ============================================================================

/**
 * 时间周期
 */
export type TimePeriod = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | '5Y' | 'ALL';

/**
 * 时间间隔粒度
 */
export type TimeInterval = 
  | '1m'   // 1分钟
  | '3m'   // 3分钟 ✅ 新增
  | '5m'   // 5分钟
  | '10m'  // 10分钟
  | '15m'  // 15分钟
  | '30m'  // 30分钟
  | '1h'   // 1小时
  | '2h'   // 2小时
  | '3h'   // 3小时
  | '4h'   // 4小时
  | '6h'   // 6小时 ✅ 新增
  | '12h'  // 12小时 ✅ 新增
  | '1D'   // 1天
  | '2D'   // 2天
  | '3D'   // 3天
  | '5D'   // 5天 ✅ 新增
  | '10D'  // 10天 ✅ 新增
  | '1W'   // 1周
  | '2W'   // 2周
  | '4W'   // 4周 ✅ 新增
  | '1M'   // 1月
  | '3M'   // 3月 ✅ 新增
  | '6M'   // 6月 ✅ 新增
  | '1Y'   // 1年 ✅ 新增
  | '2Y'   // 2年 ✅ 新增
  | '5Y';  // 5年 ✅ 新增

/**
 * 时间刻度配置（增强版）
 */
export interface TimeTickConfig {
  timestamp: number;       // 时间戳
  label: string;          // 显示标签
  position: number;       // X坐标（0-chartWidth）
  type?: 'major' | 'minor'; // 刻度类型
  isImportant?: boolean;  // 是否为重要刻度
  // Bloomberg级增强属性
  isMarketOpen?: boolean;  // 是否为开市时间
  isMarketClose?: boolean; // 是否为闭市时间
}

/**
 * 时间分隔线配置
 */
export interface TimeSeparatorConfig {
  timestamp: number;       // 时间戳
  type: 'day' | 'week' | 'month' | 'quarter' | 'year'; // 分隔线类型
  label: string;          // 标签
}

/**
 * 时间轴计算结果（增强版）
 */
export interface TimeAxisResult {
  ticks: TimeTickConfig[];          // 时间刻度
  separators: TimeSeparatorConfig[]; // 分隔线
  interval?: TimeInterval;           // 选择的时间间隔
  format?: string;                   // 时间格式
  density?: number;                  // 刻度密度
  // Bloomberg级增强属性
  axisLevel?: 'year' | 'month' | 'day' | 'hour' | 'minute';  // 当前轴级别
  majorStep?: TimeInterval;          // 主刻度间隔
  showSubTicks?: boolean;           // 是否显示次刻度
}

// ============================================================================
// 价格轴类型
// ============================================================================

/**
 * 价格刻度配置
 */
export interface PriceTickConfig {
  value: number;           // 价格值
  label: string;           // 显示标签
  type: 'major' | 'minor'; // 主刻度/次刻度
  isRoundNumber?: boolean; // 是否为整数
  isKeyLevel?: boolean;    // 是否为关键价位
}

/**
 * 价格轴计算结果
 */
export interface PriceAxisResult {
  ticks: PriceTickConfig[]; // 价格刻度
  min: number;              // 最小值
  max: number;              // 最大值
  step: number;             // 刻度步长
  decimals: number;         // 小数位数
  niceMin: number;          // 优化后的最小值
  niceMax: number;          // 优化后的最大值
}

// ============================================================================
// 网格类型
// ============================================================================

/**
 * 网格配置
 */
export interface GridConfig {
  horizontalLines: number[]; // 水平网格线（价格）
  verticalLines: number[];   // 垂直网格线（时间）
  majorColor: string;        // 主网格线颜色
  minorColor: string;        // 次网格线颜色
  separatorColor: string;    // 分隔线颜色
}