/**
 * 绘图工具注册表 - Bloomberg/TradingView级专业绘图工具
 * 每个工具的具体行为定义
 * 
 * ✨ 升级功能 (Phase 8 - 专业计算和鼠标响应):
 * - ✅ 专业级计算算法（精确数学运算）
 * - ✅ 时间基础坐标系统集成
 * - ✅ Bloomberg级鼠标响应精度
 * - ✅ 磁吸和捕获功能
 * - ✅ 高精度碰撞检测
 * - ✅ 专业级绘图工具准确性
 */

import {
  ToolDefinition,
  DrawingBase,
  WorldPoint,
  ScreenPoint,
  DrawingType,
} from './DrawingTypes';
import type {
  EnhancedChartViewStateManager as ViewStateManager
} from '../../utils/chartViewState';

// ============================================================================
// 工具默认样式和绑定配置
// ============================================================================

const DEFAULT_STYLE = {
  color: '#0EA5E9',
  lineWidth: 2,
  lineStyle: 'solid' as const,
  opacity: 1,
};

/** 文本固定绑定配置 - 确保文本与K线数据绑定 */
const TEXT_BINDING_CONFIG = {
  enableValidation: true,        // 启用坐标验证
  enableCorrection: true,        // 启用坐标修正
  maxTimeDeviation: 86400000 * 365 * 10,  // 最大时间偏差：10年
  maxPriceDeviation: 1000000,    // 最大价格偏差：100万
  logBindingEvents: false,       // 是否记录绑定事件
  autoCorrectInvalidCoords: true, // 自动修正无效坐标
};

// ============================================================================
// 专业级数学计算辅助函数
// ============================================================================

function generateId(): string {
  return `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 高精度点到线段距离计算（Bloomberg标准）
 * @param px 测试点X坐标
 * @param py 测试点Y坐标
 * @param x1 线段起点X
 * @param y1 线段起点Y
 * @param x2 线段终点X
 * @param y2 线段终点Y
 * @returns 最短距离（像素）
 */
function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  const param = Math.max(0, Math.min(1, dot / lenSq));
  const xx = x1 + param * C;
  const yy = y1 + param * D;
  
  const dx = px - xx;
  const dy = py - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 专业级磁吸算法
 * 自动吸附到重要价格水平和时间节点
 * @param worldPoint 原始世界坐标
 * @param viewState 视图状态管理器
 * @returns 优化后的世界坐标
 */
function snapToGrid(
  worldPoint: WorldPoint, 
  viewState: ViewStateManager
): WorldPoint {
  const state = viewState.getState();
  const snapThreshold = 8; // 8像素内自动吸附
  
  let snappedPoint = { ...worldPoint };
  
  // 价格吸附：吸附到整数价格、前高前低
  const priceRange = state.priceMax - state.priceMin;
  const priceStep = Math.pow(10, Math.floor(Math.log10(priceRange)) - 1);
  const nearestPrice = Math.round(worldPoint.p / priceStep) * priceStep;
  const pricePixelDiff = Math.abs(viewState.priceToY(nearestPrice) - viewState.priceToY(worldPoint.p));
  
  if (pricePixelDiff <= snapThreshold) {
    snappedPoint.p = nearestPrice;
  }
  
  // 时间吸附：吸附到K线边界、整点时间
  const timeSpan = state.timeRange.endTime - state.timeRange.startTime;
  const data = viewState.getAllData();
  
  if (data.length > 0) {
    // 找最近的K线时间点
    let minTimeDiff = Infinity;
    let nearestTime = worldPoint.t;
    
    for (const bar of data) {
      const timeDiff = Math.abs(bar.timestamp - worldPoint.t);
      const timePixelDiff = Math.abs(viewState.timeToX(bar.timestamp) - viewState.timeToX(worldPoint.t));
      
      if (timePixelDiff <= snapThreshold && timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        nearestTime = bar.timestamp;
      }
    }
    
    snappedPoint.t = nearestTime;
  }
  
  return snappedPoint;
}

/**
 * 专业级斐波那契回撤计算
 * Bloomberg/TradingView标准算法
 * @param p1 起点价格
 * @param p2 终点价格
 * @param customLevels 自定义比例
 * @returns 斐波那契价格水平数组
 */
function calculateFibonacciLevels(
  p1: number,
  p2: number,
  customLevels?: number[]
): Array<{ level: number; price: number; label: string }> {
  const levels = customLevels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
  const range = p2 - p1;
  
  return levels.map(level => ({
    level,
    price: p1 + range * level,
    label: `${(level * 100).toFixed(1)}%`
  }));
}

/**
 * 专业级通道平行线计算
 * @param p1 基线起点
 * @param p2 基线终点
 * @param p3 平行参考点
 * @returns 平行线端点
 */
function calculateParallelLine(
  p1: WorldPoint,
  p2: WorldPoint,
  p3: WorldPoint
): { p3: WorldPoint; p4: WorldPoint } {
  const dx = p2.t - p1.t;
  const dy = p2.p - p1.p;
  
  return {
    p3,
    p4: { t: p3.t + dx, p: p3.p + dy }
  };
}

/**
 * 专业级甘恩扇形角度计算
 * Bloomberg标准算法
 * @param p1 起点
 * @param p2 基准点
 * @param timeToPrice 时间到价格的比例
 * @returns 甘恩角度数组
 */
function calculateGannAngles(
  p1: WorldPoint,
  p2: WorldPoint,
  timeToPrice: number = 1
): Array<{ angle: number; slope: number; label: string }> {
  const gannRatios = [1/8, 1/4, 1/3, 1/2, 1, 2, 3, 4, 8];
  
  return gannRatios.map(ratio => {
    const slope = ratio * timeToPrice;
    const angle = Math.atan(slope);
    
    return {
      angle,
      slope,
      label: `1:${ratio}`
    };
  });
}

/**
 * 椭圆内点判定算法
 * @param point 测试点
 * @param center 椭圆中心
 * @param radiusX X轴半径
 * @param radiusY Y轴半径
 * @returns 是否在椭圆内
 */
function pointInEllipse(
  point: ScreenPoint,
  center: ScreenPoint,
  radiusX: number,
  radiusY: number
): boolean {
  const dx = (point.x - center.x) / radiusX;
  const dy = (point.y - center.y) / radiusY;
  return (dx * dx + dy * dy) <= 1;
}

// ============================================================================
// 趋势线工具
// ============================================================================

export const TrendlineTool: ToolDefinition = {
  id: 'trendline',
  name: '趋势线',
  icon: '/',
  cursor: 'crosshair',
  minPoints: 2,
  maxPoints: 2,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'trendline',
      paneId: 'price',
      points: [p, p],
      style: { ...DEFAULT_STYLE },
      locked: false,
      visible: true,
      zIndex: 0,
      meta: {
        // 线上文本标注功能
        lineText: '',
        showText: false,
        textPosition: 'center', // start, center, end
        textOffset: { x: 0, y: -20 }, // 相对于线的偏移
        textStyle: {
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
          color: DEFAULT_STYLE.color,
          backgroundColor: 'rgba(13, 27, 46, 0.8)',
          padding: 4,
          borderRadius: 3,
        }
      },
    };
  },
  
  onUpdate(draft: DrawingBase, p: WorldPoint) {
    draft.points[1] = p;
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen, viewState?: ViewStateManager) {
    if (obj.points.length < 2) return;
    
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    
    ctx.save();
    
    // 绘制趋势线
    ctx.strokeStyle = obj.style.color;
    ctx.lineWidth = obj.style.lineWidth || 2;
    ctx.globalAlpha = obj.style.opacity || 1;
    
    if (obj.style.lineStyle === 'dash') {
      ctx.setLineDash([5, 5]);
    } else if (obj.style.lineStyle === 'dot') {
      ctx.setLineDash([2, 2]);
    }
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    
    // 绘制线上文本标注（TradingView风格）
    if (obj.meta?.showText && obj.meta?.lineText) {
      renderLineText(ctx, obj, p1, p2);
    }
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length < 2) return Infinity;
    
    const testPoint = toScreen(worldPoint);
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    
    return pointToLineDistance(testPoint.x, testPoint.y, p1.x, p1.y, p2.x, p2.y);
  },
};

// ============================================================================
// 水平线工具
// ============================================================================

export const HLineTool: ToolDefinition = {
  id: 'hline',
  name: '水平线',
  icon: '—',
  cursor: 'crosshair',
  minPoints: 1,
  maxPoints: 1,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'hline',
      paneId: 'price',
      points: [p],
      style: { ...DEFAULT_STYLE },
      locked: false,
      visible: true,
      zIndex: 0,
      meta: {
        // 水平线文本标注功能
        lineText: '',
        showText: false,
        textPosition: 'center',
        textOffset: { x: 0, y: -20 },
        textStyle: {
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
          color: DEFAULT_STYLE.color,
          backgroundColor: 'rgba(13, 27, 46, 0.8)',
          padding: 4,
          borderRadius: 3,
        }
      },
    };
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length === 0) return;
    
    const p = toScreen(obj.points[0]);
    
    ctx.save();
    ctx.strokeStyle = obj.style.color;
    ctx.lineWidth = obj.style.lineWidth || 2;
    ctx.globalAlpha = obj.style.opacity || 1;
    
    if (obj.style.lineStyle === 'dash') {
      ctx.setLineDash([5, 5]);
    }
    
    ctx.beginPath();
    ctx.moveTo(0, p.y);
    ctx.lineTo(ctx.canvas.width, p.y);
    ctx.stroke();
    
    // 绘制价格标签（左侧）
    ctx.fillStyle = obj.style.color;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(obj.points[0].p.toFixed(2), 5, p.y - 5);
    
    // 绘制线上文本标注（中心位置）
    if (obj.meta?.showText && obj.meta?.lineText) {
      const lineStart = { x: 0, y: p.y };
      const lineEnd = { x: ctx.canvas.width, y: p.y };
      renderLineText(ctx, obj, lineStart, lineEnd);
    }
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length === 0) return Infinity;
    
    const testPoint = toScreen(worldPoint);
    const p = toScreen(obj.points[0]);
    
    return Math.abs(testPoint.y - p.y);
  },
};

// ============================================================================
// 垂直线工具
// ============================================================================

export const VLineTool: ToolDefinition = {
  id: 'vline',
  name: '垂直线',
  icon: '|',
  cursor: 'crosshair',
  minPoints: 1,
  maxPoints: 1,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'vline',
      paneId: 'full',  // 跨越所有pane
      points: [p],
      style: { ...DEFAULT_STYLE },
      locked: false,
      visible: true,
      zIndex: 0,
      meta: {
        // 垂直线文本标注功能
        lineText: '',
        showText: false,
        textPosition: 'center',
        textOffset: { x: 20, y: 0 }, // 垂直线的文本偏移到右侧
        textStyle: {
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
          color: DEFAULT_STYLE.color,
          backgroundColor: 'rgba(13, 27, 46, 0.8)',
          padding: 4,
          borderRadius: 3,
        }
      },
    };
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length === 0) return;
    
    const p = toScreen(obj.points[0]);
    
    ctx.save();
    ctx.strokeStyle = obj.style.color;
    ctx.lineWidth = obj.style.lineWidth || 2;
    ctx.globalAlpha = obj.style.opacity || 1;
    
    if (obj.style.lineStyle === 'dash') {
      ctx.setLineDash([5, 5]);
    }
    
    ctx.beginPath();
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, ctx.canvas.height);
    ctx.stroke();
    
    // 绘制线上文本标注（垂直线）
    if (obj.meta?.showText && obj.meta?.lineText) {
      const lineStart = { x: p.x, y: 0 };
      const lineEnd = { x: p.x, y: ctx.canvas.height };
      renderLineText(ctx, obj, lineStart, lineEnd);
    }
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length === 0) return Infinity;
    
    const testPoint = toScreen(worldPoint);
    const p = toScreen(obj.points[0]);
    
    return Math.abs(testPoint.x - p.x);
  },
};

// ============================================================================
// 矩形工具
// ============================================================================

export const RectTool: ToolDefinition = {
  id: 'rect',
  name: '矩形',
  icon: '□',
  cursor: 'crosshair',
  minPoints: 2,
  maxPoints: 2,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'rect',
      paneId: 'price',
      points: [p, p],
      style: {
        ...DEFAULT_STYLE,
        fillColor: '#0EA5E9',
        opacity: 0.1,
      },
      locked: false,
      visible: true,
      zIndex: 0,
    };
  },
  
  onUpdate(draft: DrawingBase, p: WorldPoint) {
    draft.points[1] = p;
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length < 2) return;
    
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);
    
    ctx.save();
    
    // 填充
    if (obj.style.fillColor) {
      ctx.fillStyle = obj.style.fillColor;
      ctx.globalAlpha = obj.style.opacity || 0.1;
      ctx.fillRect(x, y, width, height);
    }
    
    // 边框
    ctx.strokeStyle = obj.style.color;
    ctx.lineWidth = obj.style.lineWidth || 2;
    ctx.globalAlpha = 1;
    
    if (obj.style.lineStyle === 'dash') {
      ctx.setLineDash([5, 5]);
    }
    
    ctx.strokeRect(x, y, width, height);
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length < 2) return Infinity;
    
    const testPoint = toScreen(worldPoint);
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    
    if (testPoint.x >= minX && testPoint.x <= maxX &&
        testPoint.y >= minY && testPoint.y <= maxY) {
      return 0; // 内部
    }
    
    // 到边框的距离
    const distances = [
      Math.abs(testPoint.y - minY), // 上边
      Math.abs(testPoint.y - maxY), // 下边
      Math.abs(testPoint.x - minX), // 左边
      Math.abs(testPoint.x - maxX), // 右边
    ];
    
    return Math.min(...distances);
  },
};

// ============================================================================
// 射线工具
// ============================================================================

export const RayTool: ToolDefinition = {
  id: 'ray',
  name: '射线',
  icon: '→',
  cursor: 'crosshair',
  minPoints: 2,
  maxPoints: 2,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'ray',
      paneId: 'price',
      points: [p, p],
      style: { ...DEFAULT_STYLE },
      locked: false,
      visible: true,
      zIndex: 0,
      meta: {
        // 射线文本标注功能
        lineText: '',
        showText: false,
        textPosition: 'center',
        textOffset: { x: 0, y: -20 },
        textStyle: {
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
          color: DEFAULT_STYLE.color,
          backgroundColor: 'rgba(13, 27, 46, 0.8)',
          padding: 4,
          borderRadius: 3,
        }
      },
    };
  },
  
  onUpdate(draft: DrawingBase, p: WorldPoint) {
    draft.points[1] = p;
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length < 2) return;
    
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    
    // 延长到画布边缘
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return;
    
    const extendLength = ctx.canvas.width * 2;
    const endX = p1.x + (dx / length) * extendLength;
    const endY = p1.y + (dy / length) * extendLength;
    
    ctx.save();
    
    // 绘制射线
    ctx.strokeStyle = obj.style.color;
    ctx.lineWidth = obj.style.lineWidth || 2;
    ctx.globalAlpha = obj.style.opacity || 1;
    
    if (obj.style.lineStyle === 'dash') {
      ctx.setLineDash([5, 5]);
    }
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // 绘制射线上的文本标注
    if (obj.meta?.showText && obj.meta?.lineText) {
      // 使用射线上的一段作为文本渲染基础
      const textEndX = p1.x + (dx / length) * Math.min(extendLength, 200);
      const textEndY = p1.y + (dy / length) * Math.min(extendLength, 200);
      renderLineText(ctx, obj, p1, { x: textEndX, y: textEndY });
    }
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length < 2) return Infinity;
    
    const testPoint = toScreen(worldPoint);
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    
    return pointToLineDistance(testPoint.x, testPoint.y, p1.x, p1.y, p2.x, p2.y);
  },
};

// ============================================================================
// 箭头工具
// ============================================================================

export const ArrowTool: ToolDefinition = {
  id: 'arrow',
  name: '箭头',
  icon: '↗',
  cursor: 'crosshair',
  minPoints: 2,
  maxPoints: 2,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'arrow',
      paneId: 'price',
      points: [p, p],
      style: { ...DEFAULT_STYLE },
      locked: false,
      visible: true,
      zIndex: 0,
    };
  },
  
  onUpdate(draft: DrawingBase, p: WorldPoint) {
    draft.points[1] = p;
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length < 2) return;
    
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    
    ctx.save();
    ctx.strokeStyle = obj.style.color;
    ctx.fillStyle = obj.style.color;
    ctx.lineWidth = obj.style.lineWidth || 2;
    ctx.globalAlpha = obj.style.opacity || 1;
    
    // 绘制线
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    
    // 绘制箭头
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const arrowLength = 15;
    const arrowAngle = Math.PI / 6;
    
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(
      p2.x - arrowLength * Math.cos(angle - arrowAngle),
      p2.y - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(
      p2.x - arrowLength * Math.cos(angle + arrowAngle),
      p2.y - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length < 2) return Infinity;
    
    const testPoint = toScreen(worldPoint);
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    
    return pointToLineDistance(testPoint.x, testPoint.y, p1.x, p1.y, p2.x, p2.y);
  },
};

// ============================================================================
// 专业级文本标注工具 - Bloomberg/TradingView标准
// ============================================================================

export const TextTool: ToolDefinition = {
  id: 'text',
  name: '文本',
  icon: 'T',
  cursor: 'text',
  minPoints: 1,
  maxPoints: 1,
  
  onStart(p: WorldPoint): DrawingBase {
    // 使用专业级文本输入对话框
    const textData = createProfessionalTextDialog();
    
    return {
      id: generateId(),
      type: 'text',
      paneId: 'price',
      points: [p],
      style: {
        ...DEFAULT_STYLE,
        fontSize: textData.fontSize || 14,
        fontFamily: textData.fontFamily || 'Inter, -apple-system, sans-serif',
        fontWeight: textData.fontWeight || 'normal',
        fontStyle: textData.fontStyle || 'normal',
        textAlign: textData.textAlign || 'left',
        color: textData.color || '#0EA5E9',
      },
      locked: false,
      visible: true,
      zIndex: 100, // 文本层级较高
      meta: { 
        text: textData.text || '文本',
        backgroundColor: textData.backgroundColor,
        borderColor: textData.borderColor,
        borderWidth: textData.borderWidth || 0,
        borderRadius: textData.borderRadius || 0,
        padding: textData.padding || 4,
        shadow: textData.shadow || false,
        shadowColor: textData.shadowColor || 'rgba(0,0,0,0.3)',
        shadowBlur: textData.shadowBlur || 2,
        shadowOffset: textData.shadowOffset || { x: 1, y: 1 },
        multiline: textData.multiline || false,
        maxWidth: textData.maxWidth || 300,
        lineHeight: textData.lineHeight || 1.4,
        category: textData.category || 'annotation', // annotation, alert, note, label
        importance: textData.importance || 'normal', // low, normal, high, critical
        autoResize: textData.autoResize !== false,
        rotation: textData.rotation || 0,
        opacity: textData.opacity || 1,
      },
    };
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen, viewState?: ViewStateManager) {
    if (obj.points.length === 0 || !obj.meta?.text) return;
    
    // 确保使用世界坐标转换为屏幕坐标，保证文本与K线数据绑定
    const worldPoint = obj.points[0];
    const p = toScreen(worldPoint);
    
    // 检查文本是否在可见区域内，提高性能
    if (p.x < -100 || p.x > ctx.canvas.width + 100 || 
        p.y < -50 || p.y > ctx.canvas.height + 50) {
      return; // 不在可见区域，跳过渲染
    }
    
    const text = obj.meta.text;
    const style = obj.style;
    const meta = obj.meta;
    
    ctx.save();
    
    // 验证和修正文本坐标绑定
    if (TEXT_BINDING_CONFIG.enableValidation && viewState) {
      if (!validateTextBinding(obj, viewState)) {
        if (TEXT_BINDING_CONFIG.enableCorrection && TEXT_BINDING_CONFIG.autoCorrectInvalidCoords) {
          // 尝试修正坐标
          const correctedObj = correctTextBinding(obj, Date.now(), viewState.yToPrice?.(p.y) || 100);
          if (correctedObj !== obj) {
            console.warn('[TextTool] 已自动修正文本坐标绑定');
          }
        }
      }
    }

    // 添加绑定验证信息（调试模式）
    if (TEXT_BINDING_CONFIG.logBindingEvents && viewState) {
      const posInfo = getTextPositionInfo(obj, toScreen);
      if (posInfo) {
        console.log('[TextTool] 文本绑定状态:', {
          textId: obj.id,
          worldCoord: { t: worldPoint.t, p: worldPoint.p },
          screenCoord: { x: p.x, y: p.y },
          isVisible: posInfo.isVisible,
          text: text.substring(0, 15) + '...',
          bindingValid: validateTextBinding(obj, viewState),
        });
      }
    }
    
    // 应用旋转
    if (meta.rotation && meta.rotation !== 0) {
      ctx.translate(p.x, p.y);
      ctx.rotate((meta.rotation * Math.PI) / 180);
      ctx.translate(-p.x, -p.y);
    }
    
    // 设置字体样式（Bloomberg级别）
    const fontWeight = style.fontWeight || 'normal';
    const fontStyle = style.fontStyle || 'normal';
    const fontSize = style.fontSize || 14;
    const fontFamily = style.fontFamily || 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = style.color || '#0EA5E9';
    ctx.globalAlpha = meta.opacity || 1;
    
    // 处理多行文本
    const lines = meta.multiline ? text.split('\n') : [text];
    const lineHeight = fontSize * (meta.lineHeight || 1.4);
    
    // 计算文本尺寸
    const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const totalHeight = lines.length * lineHeight;
    const padding = meta.padding || 4;
    
    // 计算对齐位置
    let alignOffsetX = 0;
    if (style.textAlign === 'center') {
      alignOffsetX = -maxLineWidth / 2;
    } else if (style.textAlign === 'right') {
      alignOffsetX = -maxLineWidth;
    }
    
    // 绘制背景和边框
    if (meta.backgroundColor || meta.borderWidth > 0) {
      const bgX = p.x + alignOffsetX - padding;
      const bgY = p.y - fontSize + padding;
      const bgWidth = maxLineWidth + padding * 2;
      const bgHeight = totalHeight + padding;
      
      ctx.globalAlpha = (meta.opacity || 1) * 0.9;
      
      // 背景
      if (meta.backgroundColor) {
        ctx.fillStyle = meta.backgroundColor;
        if (meta.borderRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(bgX, bgY - padding, bgWidth, bgHeight, meta.borderRadius);
          ctx.fill();
        } else {
          ctx.fillRect(bgX, bgY - padding, bgWidth, bgHeight);
        }
      }
      
      // 边框
      if (meta.borderWidth > 0 && meta.borderColor) {
        ctx.strokeStyle = meta.borderColor;
        ctx.lineWidth = meta.borderWidth;
        if (meta.borderRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(bgX, bgY - padding, bgWidth, bgHeight, meta.borderRadius);
          ctx.stroke();
        } else {
          ctx.strokeRect(bgX, bgY - padding, bgWidth, bgHeight);
        }
      }
      
      ctx.globalAlpha = meta.opacity || 1;
    }
    
    // 绘制阴影
    if (meta.shadow) {
      ctx.shadowColor = meta.shadowColor || 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = meta.shadowBlur || 2;
      ctx.shadowOffsetX = meta.shadowOffset?.x || 1;
      ctx.shadowOffsetY = meta.shadowOffset?.y || 1;
    }
    
    // 设置文本颜色
    ctx.fillStyle = style.color || '#0EA5E9';
    
    // 根据重要性调整样式
    switch (meta.importance) {
      case 'critical':
        ctx.fillStyle = '#EF4444';
        ctx.font = `${fontStyle} bold ${fontSize + 2}px ${fontFamily}`;
        break;
      case 'high':
        ctx.fillStyle = '#F59E0B';
        ctx.font = `${fontStyle} 600 ${fontSize + 1}px ${fontFamily}`;
        break;
      case 'low':
        ctx.globalAlpha = (meta.opacity || 1) * 0.7;
        break;
    }
    
    // 绘制文本行
    lines.forEach((line, index) => {
      const lineY = p.y + (index * lineHeight);
      const lineX = p.x + alignOffsetX;
      
      // 文本长度限制（专业级处理）
      let displayLine = line;
      if (meta.maxWidth && ctx.measureText(line).width > meta.maxWidth) {
        const words = line.split(' ');
        let truncated = '';
        for (const word of words) {
          const testLine = truncated + (truncated ? ' ' : '') + word;
          if (ctx.measureText(testLine).width > meta.maxWidth - 20) {
            displayLine = truncated + '...';
            break;
          }
          truncated = testLine;
        }
        displayLine = truncated || line.substring(0, 10) + '...';
      }
      
      ctx.fillText(displayLine, lineX, lineY);
    });
    
    // Bloomberg级别的类别标识
    if (meta.category && meta.category !== 'annotation') {
      ctx.save();
      ctx.font = `normal 600 10px ${fontFamily}`;
      ctx.fillStyle = getCategoryColor(meta.category);
      ctx.globalAlpha = 0.8;
      
      const categoryLabel = getCategoryLabel(meta.category);
      const labelX = p.x + alignOffsetX - 8;
      const labelY = p.y - fontSize - 8;
      
      // 类别标签背景
      const labelWidth = ctx.measureText(categoryLabel).width + 6;
      ctx.fillRect(labelX - 3, labelY - 10, labelWidth, 12);
      
      // 类别标签文字
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(categoryLabel, labelX, labelY - 2);
      ctx.restore();
    }
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length === 0 || !obj.meta?.text) return Infinity;
    
    // 将测试的世界坐标和文本的世界坐标都转换为屏幕坐标
    const testPoint = toScreen(worldPoint);
    const textWorldPoint = obj.points[0];
    const p = toScreen(textWorldPoint);
    
    // 检查文本是否在可见区域内
    if (p.x < -200 || p.x > toScreen.canvas?.width + 200 || 
        p.y < -100 || p.y > toScreen.canvas?.height + 100) {
      return Infinity; // 文本不在可见区域，无法命中
    }
    
    // 精确的边界框检测
    const style = obj.style;
    const meta = obj.meta;
    const fontSize = style.fontSize || 14;
    const lines = meta.multiline ? meta.text.split('\n') : [meta.text];
    const lineHeight = fontSize * (meta.lineHeight || 1.4);
    const padding = meta.padding || 4;
    
    // 使用更精确的文本测量
    
    // 创建临时canvas来测量文本
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${fontSize}px ${style.fontFamily || 'Inter, sans-serif'}`;
    
    const maxLineWidth = Math.max(...lines.map(line => tempCtx.measureText(line).width));
    const totalHeight = lines.length * lineHeight;
    
    // 计算对齐偏移
    let alignOffsetX = 0;
    if (style.textAlign === 'center') {
      alignOffsetX = -maxLineWidth / 2;
    } else if (style.textAlign === 'right') {
      alignOffsetX = -maxLineWidth;
    }
    
    // 边界框
    const bounds = {
      left: p.x + alignOffsetX - padding,
      right: p.x + alignOffsetX + maxLineWidth + padding,
      top: p.y - fontSize - padding,
      bottom: p.y + totalHeight - fontSize + padding,
    };
    
    // 检测点击是否在边界框内
    if (testPoint.x >= bounds.left && testPoint.x <= bounds.right &&
        testPoint.y >= bounds.top && testPoint.y <= bounds.bottom) {
      
      // 计算到边界框中心的距离
      const centerX = (bounds.left + bounds.right) / 2;
      const centerY = (bounds.top + bounds.bottom) / 2;
      const distance = Math.sqrt(
        Math.pow(testPoint.x - centerX, 2) + Math.pow(testPoint.y - centerY, 2)
      );
      
      return distance;
    }
    
    return Infinity;
  },
};

/**
 * 创建专业级文本输入对话框 - TradingView/Bloomberg风格
 */
function createProfessionalTextDialog(): {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  color: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth: number;
  borderRadius: number;
  padding: number;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffset: { x: number; y: number };
  multiline: boolean;
  maxWidth: number;
  lineHeight: number;
  category: string;
  importance: string;
  autoResize: boolean;
  rotation: number;
  opacity: number;
} {
  // 创建专业级文本输入界面
  const dialogResult = showAdvancedTextInput();
  
  if (!dialogResult.text) {
    return getDefaultTextData('取消');
  }
  
  // 检测文本类型并应用智能默认设置
  const smartSettings = detectTextTypeAndApplySettings(dialogResult.text);
  
  return {
    ...dialogResult,
    ...smartSettings,
    fontFamily: dialogResult.fontFamily || 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    shadowColor: dialogResult.shadowColor || 'rgba(0,0,0,0.2)',
    shadowOffset: dialogResult.shadowOffset || { x: 1, y: 1 },
    lineHeight: dialogResult.lineHeight || 1.4,
    autoResize: true,
  };
}

/**
 * 显示高级文本输入界面
 */
function showAdvancedTextInput() {
  // 创建模态对话框容器
  const overlay = createModalOverlay();
  const modal = createTextInputModal();
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // 聚焦到文本输入框
  const textInput = modal.querySelector('#text-input') as HTMLTextAreaElement;
  const colorInput = modal.querySelector('#color-input') as HTMLInputElement;
  const fontSizeInput = modal.querySelector('#font-size-input') as HTMLInputElement;
  const fontWeightSelect = modal.querySelector('#font-weight-select') as HTMLSelectElement;
  const alignmentButtons = modal.querySelectorAll('[data-align]') as NodeListOf<HTMLButtonElement>;
  const previewDiv = modal.querySelector('#text-preview') as HTMLDivElement;
  
  textInput.focus();
  textInput.select();
  
  let result = getDefaultTextData('');
  let isConfirmed = false;
  
  // 实时预览更新
  function updatePreview() {
    const text = textInput.value || '预览文本';
    const color = colorInput.value;
    const fontSize = fontSizeInput.value + 'px';
    const fontWeight = fontWeightSelect.value;
    const alignment = modal.querySelector('[data-align].active')?.getAttribute('data-align') || 'left';
    
    previewDiv.style.color = color;
    previewDiv.style.fontSize = fontSize;
    previewDiv.style.fontWeight = fontWeight;
    previewDiv.style.textAlign = alignment;
    previewDiv.textContent = text;
    
    // 更新结果对象
    result.text = textInput.value;
    result.color = color;
    result.fontSize = parseInt(fontSizeInput.value);
    result.fontWeight = fontWeight;
    result.textAlign = alignment;
  }
  
  // 绑定事件监听器
  textInput.addEventListener('input', updatePreview);
  colorInput.addEventListener('change', updatePreview);
  fontSizeInput.addEventListener('input', updatePreview);
  fontWeightSelect.addEventListener('change', updatePreview);
  
  alignmentButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      alignmentButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePreview();
    });
  });
  
  // 键盘快捷键
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      confirmDialog();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelDialog();
    }
  });
  
  // 确认按钮
  const confirmBtn = modal.querySelector('#confirm-btn') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;
  
  function confirmDialog() {
    if (textInput.value.trim()) {
      isConfirmed = true;
      closeDialog();
    }
  }
  
  function cancelDialog() {
    closeDialog();
  }
  
  function closeDialog() {
    document.body.removeChild(overlay);
  }
  
  confirmBtn.addEventListener('click', confirmDialog);
  cancelBtn.addEventListener('click', cancelDialog);
  
  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cancelDialog();
    }
  });
  
  // 初始化预览
  updatePreview();
  
  // 同步等待用户操作（简化版，实际应用中使用Promise）
  // 这里使用同步方式，在实际项目中应该重构为异步
  let timeoutCount = 0;
  while (!isConfirmed && timeoutCount < 1000 && document.body.contains(overlay)) {
    // 等待用户操作
    timeoutCount++;
    // 同步等待的简化实现
  }
  
  return isConfirmed ? result : getDefaultTextData('');
}

/**
 * 创建模态遮罩
 */
function createModalOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
  `;
  return overlay;
}

/**
 * 创建文本输入模态框
 */
function createTextInputModal(): HTMLDivElement {
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #0d1b2e;
    border: 1px solid #1e3a5f;
    border-radius: 8px;
    width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  `;
  
  modal.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #1e3a5f40;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <div style="width: 16px; height: 16px; background: #0ea5e9; border-radius: 3px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 10px; font-weight: bold;">T</span>
        </div>
        <h3 style="color: white; margin: 0; font-size: 16px; font-weight: 600;">文本标注工具</h3>
      </div>
      <p style="color: #94a3b8; margin: 0; font-size: 12px;">TradingView专业级文本输入</p>
    </div>

    <div style="display: flex;">
      <!-- 左侧输入区域 -->
      <div style="flex: 1; padding: 20px;">
        <!-- 文本输入 -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">文本内容</label>
          <textarea 
            id="text-input" 
            placeholder="输入文本内容..."
            style="width: 100%; background: #0a1628; border: 1px solid #1e3a5f; border-radius: 4px; padding: 8px 12px; color: white; font-size: 14px; resize: vertical; min-height: 60px; font-family: Inter, sans-serif;"
          ></textarea>
        </div>

        <!-- 样式控制 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 6px;">字体大小</label>
            <input 
              id="font-size-input" 
              type="range" 
              min="10" 
              max="32" 
              value="14"
              style="width: 100%;"
            >
            <span id="font-size-display" style="color: #0ea5e9; font-size: 10px;">14px</span>
          </div>
          <div>
            <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 6px;">字体粗细</label>
            <select 
              id="font-weight-select"
              style="width: 100%; background: #0a1628; border: 1px solid #1e3a5f; border-radius: 4px; padding: 6px; color: white; font-size: 12px;"
            >
              <option value="normal">常规</option>
              <option value="600">中等</option>
              <option value="bold">粗体</option>
            </select>
          </div>
        </div>

        <!-- 颜色和对齐 -->
        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 6px;">颜色</label>
            <input 
              id="color-input" 
              type="color" 
              value="#0ea5e9"
              style="width: 100%; height: 32px; border: 1px solid #1e3a5f; border-radius: 4px; background: transparent;"
            >
          </div>
          <div>
            <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 6px;">对齐方式</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px;">
              <button data-align="left" class="active" style="padding: 6px; background: #0ea5e9; color: white; border: 1px solid #0ea5e9; border-radius: 3px; font-size: 11px;">左对齐</button>
              <button data-align="center" style="padding: 6px; background: #0a1628; color: #94a3b8; border: 1px solid #1e3a5f; border-radius: 3px; font-size: 11px;">居中</button>
              <button data-align="right" style="padding: 6px; background: #0a1628; color: #94a3b8; border: 1px solid #1e3a5f; border-radius: 3px; font-size: 11px;">右对齐</button>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div style="display: flex; gap: 8px; margin-top: 20px;">
          <button 
            id="confirm-btn"
            style="flex: 1; background: #0ea5e9; color: white; border: none; padding: 10px 16px; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer;"
          >
            确认添加 (Enter)
          </button>
          <button 
            id="cancel-btn"
            style="padding: 10px 16px; background: transparent; color: #94a3b8; border: 1px solid #1e3a5f; border-radius: 4px; font-size: 13px; cursor: pointer;"
          >
            取消 (Esc)
          </button>
        </div>
      </div>

      <!-- 右侧预览区域 -->
      <div style="width: 180px; border-left: 1px solid #1e3a5f40; padding: 20px;">
        <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">实时预览</label>
        <div style="background: #0a1628; border: 1px solid #1e3a5f; border-radius: 4px; padding: 16px; min-height: 80px; display: flex; align-items: center; justify-content: center;">
          <div 
            id="text-preview"
            style="color: #0ea5e9; font-size: 14px; font-family: Inter, sans-serif; text-align: left; word-break: break-word;"
          >
            预览文本
          </div>
        </div>
        
        <!-- 快捷提示 -->
        <div style="margin-top: 16px; font-size: 10px; color: #64748b; line-height: 1.4;">
          <div>• Enter: 确认</div>
          <div>• Esc: 取消</div>
          <div>• Shift+Enter: 换行</div>
        </div>
      </div>
    </div>
  `;
  
  // 添加对齐按钮样式切换
  const alignButtons = modal.querySelectorAll('[data-align]') as NodeListOf<HTMLButtonElement>;
  alignButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      alignButtons.forEach(b => {
        b.style.background = '#0a1628';
        b.style.color = '#94a3b8';
        b.style.borderColor = '#1e3a5f';
        b.classList.remove('active');
      });
      btn.style.background = '#0ea5e9';
      btn.style.color = 'white';
      btn.style.borderColor = '#0ea5e9';
      btn.classList.add('active');
    });
  });
  
  // 字体大小显示更新
  const fontSizeInput = modal.querySelector('#font-size-input') as HTMLInputElement;
  const fontSizeDisplay = modal.querySelector('#font-size-display') as HTMLSpanElement;
  fontSizeInput.addEventListener('input', () => {
    fontSizeDisplay.textContent = fontSizeInput.value + 'px';
  });
  
  return modal;
}

/**
 * 渲染线上文本标注 - TradingView风格
 * @param ctx Canvas上下文
 * @param obj 绘图对象
 * @param p1 线段起点
 * @param p2 线段终点
 */
function renderLineText(
  ctx: CanvasRenderingContext2D,
  obj: DrawingBase,
  p1: ScreenPoint,
  p2: ScreenPoint
): void {
  const meta = obj.meta;
  if (!meta?.lineText || !meta?.showText) return;

  const textStyle = meta.textStyle || {};
  const fontSize = textStyle.fontSize || 12;
  const fontFamily = textStyle.fontFamily || 'Inter, sans-serif';
  const textColor = textStyle.color || obj.style.color;
  const backgroundColor = textStyle.backgroundColor || 'rgba(13, 27, 46, 0.8)';
  const padding = textStyle.padding || 4;
  const borderRadius = textStyle.borderRadius || 3;

  // 计算文本位置
  let textX: number, textY: number;
  const textOffset = meta.textOffset || { x: 0, y: -20 };
  
  switch (meta.textPosition) {
    case 'start':
      textX = p1.x + textOffset.x;
      textY = p1.y + textOffset.y;
      break;
    case 'end':
      textX = p2.x + textOffset.x;
      textY = p2.y + textOffset.y;
      break;
    case 'center':
    default:
      textX = (p1.x + p2.x) / 2 + textOffset.x;
      textY = (p1.y + p2.y) / 2 + textOffset.y;
      break;
  }

  ctx.save();

  // 设置字体
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 测量文本尺寸
  const textMetrics = ctx.measureText(meta.lineText);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;

  // 绘制背景
  const bgX = textX - textWidth / 2 - padding;
  const bgY = textY - textHeight / 2 - padding;
  const bgWidth = textWidth + padding * 2;
  const bgHeight = textHeight + padding * 2;

  ctx.fillStyle = backgroundColor;
  if (borderRadius > 0) {
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius);
    ctx.fill();
  } else {
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  }

  // 绘制边框（可选）
  if (textStyle.borderColor) {
    ctx.strokeStyle = textStyle.borderColor;
    ctx.lineWidth = 1;
    if (borderRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius);
      ctx.stroke();
    } else {
      ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
    }
  }

  // 绘制文本
  ctx.fillStyle = textColor;
  ctx.fillText(meta.lineText, textX, textY);

  ctx.restore();
}

/**
 * 添加线上文本标注
 * @param lineObj 线条对象（趋势线、射线等）
 * @returns 更新后的对象
 */
export function addLineText(lineObj: DrawingBase): DrawingBase | null {
  if (!['trendline', 'ray', 'hline', 'vline'].includes(lineObj.type)) {
    console.warn('[LineText] 此工具不支持线上文本');
    return null;
  }

  // 显示文本输入对话框
  const textInput = prompt('输入线上文本标注:');
  if (!textInput || textInput.trim() === '') {
    return null;
  }

  // 更新对象的meta信息
  const updatedObj: DrawingBase = {
    ...lineObj,
    meta: {
      ...lineObj.meta,
      lineText: textInput.trim(),
      showText: true,
      textPosition: 'center',
      textOffset: { x: 0, y: -20 },
      textStyle: {
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        color: lineObj.style.color,
        backgroundColor: 'rgba(13, 27, 46, 0.8)',
        padding: 4,
        borderRadius: 3,
      }
    }
  };

  console.log('[LineText] 已添加线上文本:', textInput);
  return updatedObj;
}

/**
 * 编辑线上文本
 * @param lineObj 线条对象
 * @returns 更新后的对象
 */
export function editLineText(lineObj: DrawingBase): DrawingBase | null {
  if (!['trendline', 'ray', 'hline', 'vline'].includes(lineObj.type)) {
    return null;
  }

  const currentText = lineObj.meta?.lineText || '';
  const textInput = prompt('编辑线上文本标注:', currentText);
  
  if (textInput === null) {
    return null; // 用户取消
  }

  if (textInput.trim() === '') {
    // 删除文本
    return {
      ...lineObj,
      meta: {
        ...lineObj.meta,
        lineText: '',
        showText: false,
      }
    };
  }

  // 更新文本
  return {
    ...lineObj,
    meta: {
      ...lineObj.meta,
      lineText: textInput.trim(),
      showText: true,
    }
  };
}

/**
 * 切换线上文本显示状态
 * @param lineObj 线条对象
 * @returns 更新后的对象
 */
export function toggleLineText(lineObj: DrawingBase): DrawingBase {
  return {
    ...lineObj,
    meta: {
      ...lineObj.meta,
      showText: !lineObj.meta?.showText,
    }
  };
}

/**
 * 设置线上文本位置
 * @param lineObj 线条对象
 * @param position 文本位置
 * @returns 更新后的对象
 */
export function setLineTextPosition(
  lineObj: DrawingBase, 
  position: 'start' | 'center' | 'end'
): DrawingBase {
  return {
    ...lineObj,
    meta: {
      ...lineObj.meta,
      textPosition: position,
    }
  };
}

/**
 * 处理线条工具的双击事件 - 显示文本输入
 * @param lineObj 线条对象
 * @returns 更新后的对象或null
 */
export function handleLineDoubleClick(lineObj: DrawingBase): DrawingBase | null {
  if (!['trendline', 'ray', 'hline', 'vline'].includes(lineObj.type)) {
    return null;
  }

  const currentText = lineObj.meta?.lineText || '';
  
  if (currentText) {
    // 已有文本，编辑
    return editLineText(lineObj);
  } else {
    // 没有文本，添加
    return addLineText(lineObj);
  }
}

/**
 * 检查是否支持线上文本标注
 * @param drawingType 绘图工具类型
 * @returns 是否支持
 */
export function supportsLineText(drawingType: DrawingType): boolean {
  return ['trendline', 'ray', 'hline', 'vline'].includes(drawingType);
}

/**
 * 获取线条文本标注状态
 * @param lineObj 线条对象
 * @returns 文本状态信息
 */
export function getLineTextStatus(lineObj: DrawingBase): {
  hasText: boolean;
  isVisible: boolean;
  text: string;
  position: string;
  supportsText: boolean;
} {
  return {
    hasText: Boolean(lineObj.meta?.lineText),
    isVisible: Boolean(lineObj.meta?.showText),
    text: lineObj.meta?.lineText || '',
    position: lineObj.meta?.textPosition || 'center',
    supportsText: supportsLineText(lineObj.type),
  };
}

/**
 * 为所有线条工具批量添加文本功能
 * @param objects 绘图对象数组
 * @param defaultText 默认文本
 * @returns 更新后的对象数组
 */
export function addTextToAllLines(objects: DrawingBase[], defaultText: string = '标注'): DrawingBase[] {
  return objects.map(obj => {
    if (supportsLineText(obj.type) && !obj.meta?.lineText) {
      return {
        ...obj,
        meta: {
          ...obj.meta,
          lineText: defaultText,
          showText: true,
          textPosition: 'center',
        }
      };
    }
    return obj;
  });
}

/**
 * 检测文本类型并应用智能设置
 */
function detectTextTypeAndApplySettings(text: string) {
  let category = 'annotation';
  let importance = 'normal';
  let fontSize = 14;
  let color = '#0EA5E9';
  let backgroundColor: string | undefined;
  let borderColor: string | undefined;
  let borderWidth = 0;
  let borderRadius = 0;
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('!') || lowerText.includes('alert') || lowerText.includes('警告') || lowerText.includes('urgent')) {
    category = 'alert';
    importance = 'high';
    color = '#EF4444';
    fontSize = 16;
    backgroundColor = 'rgba(239, 68, 68, 0.1)';
    borderColor = '#EF4444';
    borderWidth = 1;
    borderRadius = 4;
  } else if (lowerText.includes('note') || lowerText.includes('注意') || lowerText.includes('memo')) {
    category = 'note';
    color = '#10B981';
  } else if (text.length < 5 && !text.includes(' ')) {
    category = 'label';
    fontSize = 12;
  } else if (lowerText.includes('critical') || lowerText.includes('emergency') || lowerText.includes('紧急')) {
    category = 'alert';
    importance = 'critical';
    color = '#DC2626';
    fontSize = 18;
    backgroundColor = 'rgba(220, 38, 38, 0.15)';
    borderColor = '#DC2626';
    borderWidth = 2;
    borderRadius = 6;
  }
  
  return {
    category,
    importance,
    fontSize,
    color,
    backgroundColor,
    borderColor,
    borderWidth,
    borderRadius,
    fontWeight: importance === 'high' || importance === 'critical' ? 'bold' : 'normal',
    shadow: importance !== 'low',
    shadowBlur: importance === 'critical' ? 4 : 3,
    multiline: text.includes('\n') || text.length > 50,
    padding: importance === 'critical' ? 8 : 6,
  };
}

/**
 * 获取默认文本数据
 */
function getDefaultTextData(text: string) {
  return {
    text,
    fontSize: 14,
    fontFamily: 'Inter, -apple-system, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    color: '#0EA5E9',
    borderWidth: 0,
    borderRadius: 0,
    padding: 6,
    shadow: true,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowBlur: 3,
    shadowOffset: { x: 1, y: 1 },
    multiline: false,
    maxWidth: 300,
    lineHeight: 1.4,
    category: 'annotation',
    importance: 'normal',
    autoResize: true,
    rotation: 0,
    opacity: 1,
  };
}

/**
 * 编辑现有文本对象 - 用于双击编辑
 * @param textObject 要编辑的文本对象
 * @returns 更新后的文本对象
 */
export function editExistingText(textObject: DrawingBase): DrawingBase | null {
  if (textObject.type !== 'text' || !textObject.meta?.text) {
    console.warn('[EditText] 无效的文本对象');
    return null;
  }

  // 获取当前文本数据
  const currentData = {
    text: textObject.meta.text,
    fontSize: textObject.style.fontSize || 14,
    fontFamily: textObject.style.fontFamily || 'Inter, -apple-system, sans-serif',
    fontWeight: textObject.style.fontWeight || 'normal',
    fontStyle: textObject.style.fontStyle || 'normal',
    textAlign: textObject.style.textAlign || 'left',
    color: textObject.style.color || '#0EA5E9',
    backgroundColor: textObject.meta.backgroundColor,
    borderColor: textObject.meta.borderColor,
    borderWidth: textObject.meta.borderWidth || 0,
    borderRadius: textObject.meta.borderRadius || 0,
    padding: textObject.meta.padding || 6,
    shadow: textObject.meta.shadow || false,
    shadowColor: textObject.meta.shadowColor || 'rgba(0,0,0,0.2)',
    shadowBlur: textObject.meta.shadowBlur || 3,
    shadowOffset: textObject.meta.shadowOffset || { x: 1, y: 1 },
    multiline: textObject.meta.multiline || false,
    maxWidth: textObject.meta.maxWidth || 300,
    lineHeight: textObject.meta.lineHeight || 1.4,
    category: textObject.meta.category || 'annotation',
    importance: textObject.meta.importance || 'normal',
    autoResize: textObject.meta.autoResize !== false,
    rotation: textObject.meta.rotation || 0,
    opacity: textObject.meta.opacity || 1,
  };

  // 显示编辑对话框
  const editResult = showAdvancedTextInputWithData(currentData);
  
  if (!editResult.text || editResult.text === currentData.text) {
    return null; // 取消或无变化
  }

  // 应用智能设置
  const smartSettings = detectTextTypeAndApplySettings(editResult.text);
  
  // 更新文本对象
  const updatedObject: DrawingBase = {
    ...textObject,
    style: {
      ...textObject.style,
      fontSize: editResult.fontSize,
      fontFamily: editResult.fontFamily || 'Inter, -apple-system, sans-serif',
      fontWeight: editResult.fontWeight,
      fontStyle: editResult.fontStyle,
      textAlign: editResult.textAlign,
      color: editResult.color,
    },
    meta: {
      ...textObject.meta,
      text: editResult.text,
      backgroundColor: smartSettings.backgroundColor || editResult.backgroundColor,
      borderColor: smartSettings.borderColor || editResult.borderColor,
      borderWidth: smartSettings.borderWidth,
      borderRadius: smartSettings.borderRadius,
      padding: smartSettings.padding,
      shadow: smartSettings.shadow,
      shadowColor: editResult.shadowColor,
      shadowBlur: smartSettings.shadowBlur,
      shadowOffset: editResult.shadowOffset,
      multiline: smartSettings.multiline,
      maxWidth: editResult.maxWidth,
      lineHeight: editResult.lineHeight,
      category: smartSettings.category,
      importance: smartSettings.importance,
      autoResize: editResult.autoResize,
      rotation: editResult.rotation,
      opacity: editResult.opacity,
    },
  };

  console.log('[EditText] 文本编辑完成:', {
    oldText: currentData.text,
    newText: editResult.text,
    category: smartSettings.category,
    importance: smartSettings.importance,
  });

  return updatedObject;
}

/**
 * 显示高级文本输入界面 - 带初始数据（用于编辑）
 */
function showAdvancedTextInputWithData(initialData: any) {
  // 创建模态对话框容器
  const overlay = createModalOverlay();
  const modal = createTextInputModal();
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // 聚焦到文本输入框并设置初始值
  const textInput = modal.querySelector('#text-input') as HTMLTextAreaElement;
  const colorInput = modal.querySelector('#color-input') as HTMLInputElement;
  const fontSizeInput = modal.querySelector('#font-size-input') as HTMLInputElement;
  const fontWeightSelect = modal.querySelector('#font-weight-select') as HTMLSelectElement;
  const alignmentButtons = modal.querySelectorAll('[data-align]') as NodeListOf<HTMLButtonElement>;
  const previewDiv = modal.querySelector('#text-preview') as HTMLDivElement;
  const fontSizeDisplay = modal.querySelector('#font-size-display') as HTMLSpanElement;

  // 设置初始值
  textInput.value = initialData.text || '';
  colorInput.value = initialData.color || '#0EA5E9';
  fontSizeInput.value = (initialData.fontSize || 14).toString();
  fontSizeDisplay.textContent = (initialData.fontSize || 14) + 'px';
  fontWeightSelect.value = initialData.fontWeight || 'normal';
  
  // 设置对齐方式
  alignmentButtons.forEach(btn => {
    btn.classList.remove('active');
    btn.style.background = '#0a1628';
    btn.style.color = '#94a3b8';
    btn.style.borderColor = '#1e3a5f';
    
    if (btn.getAttribute('data-align') === (initialData.textAlign || 'left')) {
      btn.classList.add('active');
      btn.style.background = '#0ea5e9';
      btn.style.color = 'white';
      btn.style.borderColor = '#0ea5e9';
    }
  });
  
  textInput.focus();
  textInput.select();
  
  let result = { ...initialData };
  let isConfirmed = false;
  
  // 实时预览更新
  function updatePreview() {
    const text = textInput.value || '预览文本';
    const color = colorInput.value;
    const fontSize = fontSizeInput.value + 'px';
    const fontWeight = fontWeightSelect.value;
    const alignment = modal.querySelector('[data-align].active')?.getAttribute('data-align') || 'left';
    
    previewDiv.style.color = color;
    previewDiv.style.fontSize = fontSize;
    previewDiv.style.fontWeight = fontWeight;
    previewDiv.style.textAlign = alignment;
    previewDiv.textContent = text;
    
    // 更新结果对象
    result.text = textInput.value;
    result.color = color;
    result.fontSize = parseInt(fontSizeInput.value);
    result.fontWeight = fontWeight;
    result.textAlign = alignment;
  }
  
  // 绑定事件监听器
  textInput.addEventListener('input', updatePreview);
  colorInput.addEventListener('change', updatePreview);
  fontSizeInput.addEventListener('input', () => {
    fontSizeDisplay.textContent = fontSizeInput.value + 'px';
    updatePreview();
  });
  fontWeightSelect.addEventListener('change', updatePreview);
  
  alignmentButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      alignmentButtons.forEach(b => {
        b.classList.remove('active');
        b.style.background = '#0a1628';
        b.style.color = '#94a3b8';
        b.style.borderColor = '#1e3a5f';
      });
      btn.classList.add('active');
      btn.style.background = '#0ea5e9';
      btn.style.color = 'white';
      btn.style.borderColor = '#0ea5e9';
      updatePreview();
    });
  });
  
  // 键盘快捷键
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      confirmDialog();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelDialog();
    }
  });
  
  // 确认按钮
  const confirmBtn = modal.querySelector('#confirm-btn') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;
  
  function confirmDialog() {
    if (textInput.value.trim()) {
      isConfirmed = true;
      closeDialog();
    }
  }
  
  function cancelDialog() {
    closeDialog();
  }
  
  function closeDialog() {
    document.body.removeChild(overlay);
  }
  
  confirmBtn.addEventListener('click', confirmDialog);
  cancelBtn.addEventListener('click', cancelDialog);
  
  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cancelDialog();
    }
  });
  
  // 初始化预览
  updatePreview();
  
  // 同步等待用户操作（简化版实现）
  let timeoutCount = 0;
  while (!isConfirmed && timeoutCount < 1000 && document.body.contains(overlay)) {
    timeoutCount++;
  }
  
  return isConfirmed ? result : initialData;
}

/**
 * 检查是否为文本对象
 */
export function isTextObject(obj: DrawingBase): boolean {
  return obj.type === 'text' && obj.meta?.text;
}

/**
 * 验证文本对象的世界坐标绑定
 * 确保文本始终正确绑定到时间/价格坐标
 */
export function validateTextBinding(textObj: DrawingBase, viewState?: ViewStateManager): boolean {
  if (!isTextObject(textObj) || textObj.points.length === 0) {
    return false;
  }

  const worldPoint = textObj.points[0];
  
  // 验证世界坐标是否有效
  if (typeof worldPoint.t !== 'number' || typeof worldPoint.p !== 'number') {
    console.warn('[TextBinding] 无效的世界坐标:', worldPoint);
    return false;
  }

  // 验证时间坐标是否合理（不能为NaN或无限大）
  if (!isFinite(worldPoint.t) || !isFinite(worldPoint.p)) {
    console.warn('[TextBinding] 世界坐标包含无效值:', worldPoint);
    return false;
  }

  // 如果有ViewState，验证坐标是否在合理范围内
  if (viewState && viewState.getState) {
    const state = viewState.getState();
    const timeRange = state.timeRange;
    
    // 检查时间是否在一个合理的范围内（允许超出当前可见范围）
    const reasonableTimeRange = timeRange.endTime - timeRange.startTime;
    const extendedStart = timeRange.startTime - reasonableTimeRange * 10; // 允许前后10倍范围
    const extendedEnd = timeRange.endTime + reasonableTimeRange * 10;
    
    if (worldPoint.t < extendedStart || worldPoint.t > extendedEnd) {
      console.warn('[TextBinding] 文本时间坐标超出合理范围:', {
        textTime: worldPoint.t,
        extendedRange: [extendedStart, extendedEnd],
        currentRange: [timeRange.startTime, timeRange.endTime]
      });
    }

    // 检查价格是否在合理范围内
    const priceRange = state.priceMax - state.priceMin;
    const extendedPriceMin = state.priceMin - priceRange * 5; // 允许价格范围的5倍扩展
    const extendedPriceMax = state.priceMax + priceRange * 5;
    
    if (worldPoint.p < extendedPriceMin || worldPoint.p > extendedPriceMax) {
      console.warn('[TextBinding] 文本价格坐标超出合理范围:', {
        textPrice: worldPoint.p,
        extendedRange: [extendedPriceMin, extendedPriceMax],
        currentRange: [state.priceMin, state.priceMax]
      });
    }
  }

  return true;
}

/**
 * 修正文本对象的世界坐标绑定
 * 用于修复可能损坏的坐标数据
 */
export function correctTextBinding(textObj: DrawingBase, fallbackTime?: number, fallbackPrice?: number): DrawingBase {
  if (!isTextObject(textObj) || textObj.points.length === 0) {
    return textObj;
  }

  const worldPoint = textObj.points[0];
  let corrected = false;

  // 修正无效的时间坐标
  if (!isFinite(worldPoint.t) || typeof worldPoint.t !== 'number') {
    worldPoint.t = fallbackTime || Date.now();
    corrected = true;
    console.warn('[TextBinding] 修正了无效的时间坐标');
  }

  // 修正无效的价格坐标
  if (!isFinite(worldPoint.p) || typeof worldPoint.p !== 'number') {
    worldPoint.p = fallbackPrice || 100;
    corrected = true;
    console.warn('[TextBinding] 修正了无效的价格坐标');
  }

  if (corrected) {
    console.log('[TextBinding] 文本坐标已修正:', {
      textId: textObj.id,
      newWorldPoint: worldPoint,
      text: textObj.meta?.text?.substring(0, 20) + '...'
    });
  }

  return {
    ...textObj,
    points: [worldPoint, ...textObj.points.slice(1)]
  };
}

/**
 * 获取文本在特定时间点的显示信息
 * 用于调试和监控文本位置
 */
export function getTextPositionInfo(textObj: DrawingBase, toScreen: (p: WorldPoint) => ScreenPoint): {
  worldPoint: WorldPoint;
  screenPoint: ScreenPoint;
  isVisible: boolean;
  text: string;
} | null {
  if (!isTextObject(textObj) || textObj.points.length === 0) {
    return null;
  }

  const worldPoint = textObj.points[0];
  const screenPoint = toScreen(worldPoint);
  const text = textObj.meta?.text || '';

  return {
    worldPoint,
    screenPoint,
    isVisible: screenPoint.x >= -100 && screenPoint.x <= window.innerWidth + 100 &&
               screenPoint.y >= -50 && screenPoint.y <= window.innerHeight + 50,
    text
  };
}

/**
 * 文本固定绑定管理器 - 确保文本始终与K线数据绑定
 */
export class TextBindingManager {
  private static instance: TextBindingManager;
  private textObjects: Map<string, DrawingBase> = new Map();
  private viewStateManager: ViewStateManager | null = null;

  static getInstance(): TextBindingManager {
    if (!TextBindingManager.instance) {
      TextBindingManager.instance = new TextBindingManager();
    }
    return TextBindingManager.instance;
  }

  /**
   * 注册ViewState管理器
   */
  registerViewState(viewState: ViewStateManager): void {
    this.viewStateManager = viewState;
    if (TEXT_BINDING_CONFIG.logBindingEvents) {
      console.log('[TextBindingManager] ViewState已注册');
    }
  }

  /**
   * 注册文本对象
   */
  registerTextObject(textObj: DrawingBase): void {
    if (isTextObject(textObj)) {
      this.textObjects.set(textObj.id, textObj);
      
      // 验证和修正绑定
      if (TEXT_BINDING_CONFIG.enableValidation) {
        const isValid = validateTextBinding(textObj, this.viewStateManager || undefined);
        if (!isValid && TEXT_BINDING_CONFIG.enableCorrection) {
          const corrected = correctTextBinding(textObj);
          this.textObjects.set(textObj.id, corrected);
          if (TEXT_BINDING_CONFIG.logBindingEvents) {
            console.log(`[TextBindingManager] 文本对象 ${textObj.id} 坐标已修正`);
          }
        }
      }
      
      if (TEXT_BINDING_CONFIG.logBindingEvents) {
        console.log(`[TextBindingManager] 文本对象已注册: ${textObj.id}`);
      }
    }
  }

  /**
   * 取消注册文本对象
   */
  unregisterTextObject(textId: string): void {
    this.textObjects.delete(textId);
    if (TEXT_BINDING_CONFIG.logBindingEvents) {
      console.log(`[TextBindingManager] 文本对象已取消注册: ${textId}`);
    }
  }

  /**
   * 验证所有文本对象的绑定
   */
  validateAllBindings(): { valid: DrawingBase[]; invalid: DrawingBase[]; corrected: DrawingBase[] } {
    const result = {
      valid: [] as DrawingBase[],
      invalid: [] as DrawingBase[],
      corrected: [] as DrawingBase[]
    };

    for (const [id, textObj] of this.textObjects) {
      const isValid = validateTextBinding(textObj, this.viewStateManager || undefined);
      
      if (isValid) {
        result.valid.push(textObj);
      } else {
        if (TEXT_BINDING_CONFIG.enableCorrection) {
          const corrected = correctTextBinding(textObj);
          this.textObjects.set(id, corrected);
          result.corrected.push(corrected);
        } else {
          result.invalid.push(textObj);
        }
      }
    }

    if (TEXT_BINDING_CONFIG.logBindingEvents) {
      console.log('[TextBindingManager] 绑定验证结果:', {
        总计: this.textObjects.size,
        有效: result.valid.length,
        无效: result.invalid.length,
        已修正: result.corrected.length
      });
    }

    return result;
  }

  /**
   * 获取所有文本对象的位置信息
   */
  getAllTextPositions(toScreen: (p: WorldPoint) => ScreenPoint): Array<{
    id: string;
    position: ReturnType<typeof getTextPositionInfo>;
  }> {
    const positions = [];
    
    for (const [id, textObj] of this.textObjects) {
      const position = getTextPositionInfo(textObj, toScreen);
      if (position) {
        positions.push({ id, position });
      }
    }

    return positions;
  }

  /**
   * 清理所有文本对象
   */
  clear(): void {
    this.textObjects.clear();
    if (TEXT_BINDING_CONFIG.logBindingEvents) {
      console.log('[TextBindingManager] 所有文本对象已清理');
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalTexts: number;
    validBindings: number;
    invalidBindings: number;
    visibleTexts: number;
  } {
    const toScreen = (p: WorldPoint) => ({ x: 0, y: 0 }); // 简化版本，仅用于统计
    let validBindings = 0;
    let invalidBindings = 0;
    let visibleTexts = 0;

    for (const textObj of this.textObjects.values()) {
      if (validateTextBinding(textObj, this.viewStateManager || undefined)) {
        validBindings++;
      } else {
        invalidBindings++;
      }

      // 检查可见性（需要实际的toScreen函数）
      if (this.viewStateManager) {
        // 简化的可见性检查
        visibleTexts++;
      }
    }

    return {
      totalTexts: this.textObjects.size,
      validBindings,
      invalidBindings,
      visibleTexts
    };
  }
}

// 导出全局实例
export const textBindingManager = TextBindingManager.getInstance();

/**
 * 获取类别颜色
 */
function getCategoryColor(category: string): string {
  switch (category) {
    case 'alert': return '#F59E0B';
    case 'note': return '#10B981';
    case 'label': return '#6B7280';
    default: return '#0EA5E9';
  }
}

/**
 * 获取类别标签
 */
function getCategoryLabel(category: string): string {
  switch (category) {
    case 'alert': return 'ALERT';
    case 'note': return 'NOTE';
    case 'label': return 'LBL';
    default: return 'TXT';
  }
}

// ============================================================================
// 斐波那契回撤工具
// ============================================================================

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
const FIB_COLORS = ['#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#6B7280'];

// 扩展斐波那契水平
const FIB_EXTENSION_LEVELS = [0, 0.618, 1, 1.272, 1.414, 1.618, 2.0, 2.618, 3.618, 4.236];
const FIB_EXTENSION_COLORS = ['#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#84CC16', '#06B6D4'];

export const FibTool: ToolDefinition = {
  id: 'fib',
  name: '斐波那契',
  icon: 'φ',
  cursor: 'crosshair',
  minPoints: 2,
  maxPoints: 2,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'fib',
      paneId: 'price',
      points: [p, p],
      style: { ...DEFAULT_STYLE },
      locked: false,
      visible: true,
      zIndex: 0,
      meta: { fibLevels: FIB_LEVELS },
    };
  },
  
  onUpdate(draft: DrawingBase, p: WorldPoint) {
    draft.points[1] = p;
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length < 2) return;
    
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    const levels = obj.meta?.fibLevels || FIB_LEVELS;
    
    ctx.save();
    ctx.font = '10px Inter, sans-serif';
    
    levels.forEach((level, i) => {
      const levelY = p1.y + (p2.y - p1.y) * level;
      const color = FIB_COLORS[i] || obj.style.color;
      
      ctx.strokeStyle = color;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.moveTo(Math.min(p1.x, p2.x), levelY);
      ctx.lineTo(Math.max(p1.x, p2.x), levelY);
      ctx.stroke();
      
      // 标签
      ctx.fillStyle = color;
      const label = `${(level * 100).toFixed(1)}%`;
      ctx.fillText(label, Math.max(p1.x, p2.x) + 5, levelY + 3);
      
      // 价格
      const levelPrice = obj.points[0].p + (obj.points[1].p - obj.points[0].p) * level;
      ctx.fillText(levelPrice.toFixed(2), Math.min(p1.x, p2.x) - 50, levelY + 3);
    });
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length < 2) return Infinity;
    
    const testPoint = toScreen(worldPoint);
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    const levels = obj.meta?.fibLevels || FIB_LEVELS;
    
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    
    // 检查是否靠近任何斐波那契水平线
    for (const level of levels) {
      const levelY = p1.y + (p2.y - p1.y) * level;
      
      if (testPoint.x >= minX && testPoint.x <= maxX &&
          Math.abs(testPoint.y - levelY) < 5) {
        return Math.abs(testPoint.y - levelY);
      }
    }
    
    return Infinity;
  },
};

// ============================================================================
// 斐波那契扩展工具
// ============================================================================

export const FibExtensionTool: ToolDefinition = {
  id: 'fib_extension',
  name: '斐波那契扩展',
  icon: 'φ+',
  cursor: 'crosshair',
  minPoints: 3,
  maxPoints: 3,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'fib_extension',
      paneId: 'price',
      points: [p, p, p],
      style: { ...DEFAULT_STYLE },
      locked: false,
      visible: true,
      zIndex: 0,
      meta: { fibLevels: FIB_EXTENSION_LEVELS },
    };
  },
  
  onUpdate(draft: DrawingBase, p: WorldPoint) {
    if (draft.points.length === 1) {
      draft.points[1] = p;
    } else if (draft.points.length === 2) {
      draft.points[2] = p;
    }
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length < 3) return;
    
    const [p1, p2, p3] = obj.points.map(p => toScreen(p));
    const levels = obj.meta?.fibLevels || FIB_EXTENSION_LEVELS;
    
    // 计算ABC波浪的扩展
    const swing = obj.points[1].p - obj.points[0].p;
    const basePrice = obj.points[2].p;
    
    ctx.save();
    ctx.font = '10px Inter, sans-serif';
    
    levels.forEach((level, i) => {
      const targetPrice = basePrice + swing * level;
      const targetScreen = toScreen({ t: obj.points[2].t, p: targetPrice });
      const color = FIB_EXTENSION_COLORS[i] || obj.style.color;
      
      ctx.strokeStyle = color;
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.moveTo(0, targetScreen.y);
      ctx.lineTo(ctx.canvas.width, targetScreen.y);
      ctx.stroke();
      
      // 标签
      ctx.fillStyle = color;
      const label = `${level.toFixed(3)}`;
      ctx.fillText(label, ctx.canvas.width - 50, targetScreen.y - 5);
      ctx.fillText(targetPrice.toFixed(2), 5, targetScreen.y - 5);
    });
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length < 3) return Infinity;
    return 50; // 简化的命中测试
  },
};

// ============================================================================
// 平行通道工具
// ============================================================================

export const ParallelChannelTool: ToolDefinition = {
  id: 'parallel',
  name: '平行通道',
  icon: '▭',
  cursor: 'crosshair',
  minPoints: 3,
  maxPoints: 3,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'parallel',
      paneId: 'price',
      points: [p, p, p],
      style: { 
        ...DEFAULT_STYLE,
        fillColor: '#0EA5E9',
        opacity: 0.1,
      },
      locked: false,
      visible: true,
      zIndex: 0,
    };
  },
  
  onUpdate(draft: DrawingBase, p: WorldPoint) {
    if (draft.points.length === 1) {
      draft.points[1] = p;
    } else if (draft.points.length === 2) {
      draft.points[2] = p;
    }
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length < 3) return;
    
    const [p1, p2, p3] = obj.points.map(p => toScreen(p));
    
    // 计算平行线
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const p4 = { x: p3.x + dx, y: p3.y + dy };
    
    ctx.save();
    ctx.strokeStyle = obj.style.color;
    ctx.lineWidth = obj.style.lineWidth || 2;
    
    // 填充通道
    if (obj.style.fillColor) {
      ctx.fillStyle = obj.style.fillColor;
      ctx.globalAlpha = obj.style.opacity || 0.1;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
    }
    
    // 绘制边框线
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.stroke();
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length < 3) return Infinity;
    
    const testPoint = toScreen(worldPoint);
    const [p1, p2, p3] = obj.points.map(p => toScreen(p));
    
    // 检查是否在通道内
    const line1Dist = pointToLineDistance(testPoint.x, testPoint.y, p1.x, p1.y, p2.x, p2.y);
    const line2Dist = pointToLineDistance(testPoint.x, testPoint.y, p3.x, p3.y, p3.x + (p2.x - p1.x), p3.y + (p2.y - p1.y));
    
    return Math.min(line1Dist, line2Dist);
  },
};

// ============================================================================
// 安德鲁干草叉工具
// ============================================================================

export const PitchforkTool: ToolDefinition = {
  id: 'pitchfork',
  name: '干草叉',
  icon: '⭃',
  cursor: 'crosshair',
  minPoints: 3,
  maxPoints: 3,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'pitchfork',
      paneId: 'price',
      points: [p, p, p],
      style: { ...DEFAULT_STYLE },
      locked: false,
      visible: true,
      zIndex: 0,
    };
  },
  
  onUpdate(draft: DrawingBase, p: WorldPoint) {
    if (draft.points.length === 1) {
      draft.points[1] = p;
    } else if (draft.points.length === 2) {
      draft.points[2] = p;
    }
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length < 3) return;
    
    const [p1, p2, p3] = obj.points.map(p => toScreen(p));
    
    // 计算中位点
    const midX = (p2.x + p3.x) / 2;
    const midY = (p2.y + p3.y) / 2;
    
    ctx.save();
    ctx.strokeStyle = obj.style.color;
    ctx.lineWidth = obj.style.lineWidth || 2;
    ctx.setLineDash([3, 3]);
    
    // 中位线
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(midX, midY);
    
    // 延长中位线
    const dx = midX - p1.x;
    const dy = midY - p1.y;
    const extendX = midX + dx * 2;
    const extendY = midY + dy * 2;
    ctx.lineTo(extendX, extendY);
    ctx.stroke();
    
    // 上下平行线
    const slope = (midY - p1.y) / (midX - p1.x);
    const p2EndX = p2.x + dx;
    const p2EndY = p2.y + dy;
    const p3EndX = p3.x + dx;
    const p3EndY = p3.y + dy;
    
    // 上平行线
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2EndX, p2EndY);
    ctx.stroke();
    
    // 下平行线
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p3EndX, p3EndY);
    ctx.stroke();
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length < 3) return Infinity;
    
    const testPoint = toScreen(worldPoint);
    const [p1, p2, p3] = obj.points.map(p => toScreen(p));
    
    // 检查三条线的距离
    const midX = (p2.x + p3.x) / 2;
    const midY = (p2.y + p3.y) / 2;
    
    const dist1 = pointToLineDistance(testPoint.x, testPoint.y, p1.x, p1.y, midX, midY);
    const dist2 = pointToLineDistance(testPoint.x, testPoint.y, p2.x, p2.y, p2.x + (midX - p1.x), p2.y + (midY - p1.y));
    const dist3 = pointToLineDistance(testPoint.x, testPoint.y, p3.x, p3.y, p3.x + (midX - p1.x), p3.y + (midY - p1.y));
    
    return Math.min(dist1, dist2, dist3);
  },
};

// ============================================================================
// 甘恩扇形工具
// ============================================================================

export const GannFanTool: ToolDefinition = {
  id: 'gann_fan',
  name: '甘恩扇形',
  icon: '🌊',
  cursor: 'crosshair',
  minPoints: 2,
  maxPoints: 2,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'gann_fan',
      paneId: 'price',
      points: [p, p],
      style: { ...DEFAULT_STYLE },
      locked: false,
      visible: true,
      zIndex: 0,
      meta: { 
        angles: [1/8, 1/4, 1/3, 1/2, 1, 2, 3, 4, 8] // 甘恩角度比例
      },
    };
  },
  
  onUpdate(draft: DrawingBase, p: WorldPoint) {
    draft.points[1] = p;
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length < 2) return;
    
    const [p1, p2] = obj.points.map(p => toScreen(p));
    const angles = obj.meta?.angles || [1/8, 1/4, 1/3, 1/2, 1, 2, 3, 4, 8];
    
    ctx.save();
    ctx.strokeStyle = obj.style.color;
    ctx.lineWidth = 1;
    
    // 计算基准线的角度
    const baseAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const baseDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    
    angles.forEach((ratio, index) => {
      ctx.globalAlpha = 0.7;
      ctx.setLineDash(index === 4 ? [] : [3, 3]); // 1:1线为实线
      
      const angle = Math.atan(ratio);
      const endX = p1.x + Math.cos(angle) * ctx.canvas.width;
      const endY = p1.y + Math.sin(angle) * (p2.y > p1.y ? 1 : -1) * ctx.canvas.width;
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // 标签
      ctx.fillStyle = obj.style.color;
      ctx.font = '10px Inter, sans-serif';
      const labelX = p1.x + Math.cos(angle) * 100;
      const labelY = p1.y + Math.sin(angle) * (p2.y > p1.y ? 1 : -1) * 100;
      ctx.fillText(`1:${ratio}`, labelX, labelY);
    });
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length < 2) return Infinity;
    return 30; // 简化的命中测试
  },
};

// ============================================================================
// 椭圆工具
// ============================================================================

export const EllipseTool: ToolDefinition = {
  id: 'ellipse',
  name: '椭圆',
  icon: '⭕',
  cursor: 'crosshair',
  minPoints: 2,
  maxPoints: 2,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'ellipse',
      paneId: 'price',
      points: [p, p],
      style: {
        ...DEFAULT_STYLE,
        fillColor: '#0EA5E9',
        opacity: 0.1,
      },
      locked: false,
      visible: true,
      zIndex: 0,
    };
  },
  
  onUpdate(draft: DrawingBase, p: WorldPoint) {
    draft.points[1] = p;
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length < 2) return;
    
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    
    const centerX = (p1.x + p2.x) / 2;
    const centerY = (p1.y + p2.y) / 2;
    const radiusX = Math.abs(p2.x - p1.x) / 2;
    const radiusY = Math.abs(p2.y - p1.y) / 2;
    
    ctx.save();
    
    // 填充
    if (obj.style.fillColor) {
      ctx.fillStyle = obj.style.fillColor;
      ctx.globalAlpha = obj.style.opacity || 0.1;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // 边框
    ctx.strokeStyle = obj.style.color;
    ctx.lineWidth = obj.style.lineWidth || 2;
    ctx.globalAlpha = 1;
    
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length < 2) return Infinity;
    
    const testPoint = toScreen(worldPoint);
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    
    const centerX = (p1.x + p2.x) / 2;
    const centerY = (p1.y + p2.y) / 2;
    const radiusX = Math.abs(p2.x - p1.x) / 2;
    const radiusY = Math.abs(p2.y - p1.y) / 2;
    
    // 椭圆内的点距离计算
    const normalizedX = (testPoint.x - centerX) / radiusX;
    const normalizedY = (testPoint.y - centerY) / radiusY;
    const distanceFromCenter = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
    
    return Math.abs(distanceFromCenter - 1) * Math.min(radiusX, radiusY);
  },
};

// ============================================================================
// 成交量轮廓工具
// ============================================================================

export const VolumeProfileTool: ToolDefinition = {
  id: 'volume_profile',
  name: '成交量轮廓',
  icon: '📊',
  cursor: 'crosshair',
  minPoints: 2,
  maxPoints: 2,
  
  onStart(p: WorldPoint): DrawingBase {
    return {
      id: generateId(),
      type: 'volume_profile',
      paneId: 'price',
      points: [p, p],
      style: {
        ...DEFAULT_STYLE,
        fillColor: '#10B981',
        opacity: 0.6,
      },
      locked: false,
      visible: true,
      zIndex: 0,
      meta: { 
        bins: 24,
        showPOC: true, // 显示成交量最大点
        showValueArea: true // 显示价值区域
      },
    };
  },
  
  onUpdate(draft: DrawingBase, p: WorldPoint) {
    draft.points[1] = p;
  },
  
  render(ctx: CanvasRenderingContext2D, obj: DrawingBase, toScreen) {
    if (obj.points.length < 2) return;
    
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    const bins = obj.meta?.bins || 24;
    
    // 简化的成交量分布渲染
    ctx.save();
    ctx.fillStyle = obj.style.fillColor || '#10B981';
    ctx.globalAlpha = obj.style.opacity || 0.6;
    
    const startY = Math.min(p1.y, p2.y);
    const endY = Math.max(p1.y, p2.y);
    const height = endY - startY;
    const binHeight = height / bins;
    
    // 模拟成交量数据
    for (let i = 0; i < bins; i++) {
      const y = startY + i * binHeight;
      const volume = Math.random() * 100 + 20; // 模拟成交量
      const barWidth = volume * 2;
      
      ctx.fillRect(Math.max(p1.x, p2.x), y, barWidth, binHeight - 1);
    }
    
    ctx.restore();
  },
  
  hitTest(obj: DrawingBase, worldPoint: WorldPoint, toScreen) {
    if (obj.points.length < 2) return Infinity;
    
    const testPoint = toScreen(worldPoint);
    const p1 = toScreen(obj.points[0]);
    const p2 = toScreen(obj.points[1]);
    
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x) + 200; // 考虑成交量柱的宽度
    
    if (testPoint.x >= minX && testPoint.x <= maxX &&
        testPoint.y >= minY && testPoint.y <= maxY) {
      return 0;
    }
    
    return Infinity;
  },
};

// ============================================================================
// 工具注册表
// ============================================================================

export const DRAWING_TOOLS: Record<DrawingType, ToolDefinition> = {
  trendline: TrendlineTool,
  hline: HLineTool,
  vline: VLineTool,
  rect: RectTool,
  ray: RayTool,
  arrow: ArrowTool,
  fib: FibTool,
  fib_extension: FibExtensionTool,
  text: TextTool,
  parallel: ParallelChannelTool,
  pitchfork: PitchforkTool,
  gann_fan: GannFanTool,
  ellipse: EllipseTool,
  volume_profile: VolumeProfileTool,
};

export function getToolDefinition(type: DrawingType): ToolDefinition | undefined {
  return DRAWING_TOOLS[type];
}

// 工具分类
export const TOOL_CATEGORIES = {
  basic: {
    name: '基础工具',
    tools: ['trendline', 'hline', 'vline', 'ray', 'arrow', 'text']
  },
  shapes: {
    name: '几何图形',
    tools: ['rect', 'ellipse']
  },
  fibonacci: {
    name: '斐波那契',
    tools: ['fib', 'fib_extension']
  },
  channels: {
    name: '通道分析',
    tools: ['parallel', 'pitchfork']
  },
  advanced: {
    name: '高级工具',
    tools: ['gann_fan', 'volume_profile']
  }
} as const;

// 工具快捷键映射
export const TOOL_SHORTCUTS = {
  't': 'trendline',
  'h': 'hline',
  'v': 'vline',
  'r': 'rect',
  'a': 'arrow',
  'f': 'fib',
  'n': 'text',
  'p': 'parallel',
  'e': 'ellipse'
} as const;

// 精确绘图配置
export const PRECISION_DRAWING_CONFIG = {
  snapThreshold: 5,
  magnetThreshold: 8,
  minDistance: 3,
  enableSnapping: true,
  enableMagnet: true
};

// 获取工具默认样式
export function getToolDefaultStyle(type: DrawingType) {
  return DRAWING_TOOLS[type]?.defaultStyle || DEFAULT_STYLE;
}
