/**
 * EnhancedTradingChart - Bloomberg/TradingView级专业图表系统
 * 
 * ✨ 最新升级 (Phase 7 - 差异化模式):
 * - ✅ Compact模式：用于股票详情、快速预览（简化控制、300px高度）
 * - ✅ Full模式：用于全屏图表、专业分析（完整功能、600px+高度）
 * - ✅ 专业级轴计算（Nice Numbers + 智能间隔）
 * - ✅ 实时价格线（当前价水平线 + 闪烁效果）
 * - ✅ X轴标签智能避让（自动隐藏重叠）
 * - ✅ 关键价位自动识别（前高前低 + 支撑阻力）
 * - ✅ Bloomberg级分隔线系统
 * - ✅ 市场时间标记
 * - ✅ ViewportManager平移和缩放
 * 
 * 保留功能：
 * - DrawingEngine 专业画线工具
 * - 时间周期选择 (1D, 5D, 1M, 3M, 6M, 1Y, YTD)
 * - 多种图表类型 (K线图、线图、面积图)
 * - 技术指标系统 (MA均线)
 * - 中国市场配色标准（红涨绿跌）
 */

// 核心组件
export { EnhancedTradingChart } from './EnhancedTradingChartV2';

// 便捷组件
export { CompactTradingChart } from './CompactTradingChart';
export { FullTradingChart } from './FullTradingChart';

// 类型导出
export type { 
  OHLCV, 
  TimePeriod, 
  ChartType, 
  CoordinateMode, 
  ChartMode 
} from './EnhancedTradingChartV2';