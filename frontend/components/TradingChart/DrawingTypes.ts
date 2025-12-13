/**
 * 绘图系统类型定义
 * Bloomberg/TradingView 级别的专业绘图架构
 */

// ============================================================================
// 1. 坐标体系
// ============================================================================

/**
 * 世界坐标点（与K线数据绑定）
 */
export interface WorldPoint {
  t: number;  // 时间坐标：barIndex 或 timestamp
  p: number;  // 价格坐标：实际价格值
}

/**
 * 屏幕坐标点
 */
export interface ScreenPoint {
  x: number;  // Canvas X坐标
  y: number;  // Canvas Y坐标
}

// ============================================================================
// 2. 绘图对象类型
// ============================================================================

export type DrawingType =
  | 'trendline'       // 趋势线
  | 'hline'           // 水平线
  | 'vline'           // 垂直线
  | 'rect'            // 矩形
  | 'ray'             // 射线
  | 'arrow'           // 箭头
  | 'fib'             // 斐波那契回撤
  | 'fib_extension'   // 斐波那契扩展
  | 'parallel'        // 平行通道
  | 'pitchfork'       // 安德鲁音叉
  | 'gann_fan'        // 甘恩扇形
  | 'ellipse'         // 椭圆
  | 'volume_profile'  // 成交量轮廓
  | 'text';           // 文本标注

export type DrawingToolId = 'select' | DrawingType;

/**
 * 绘图样式
 */
export interface DrawingStyle {
  color: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dash' | 'dot';
  fillColor?: string;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
}

/**
 * 绘图对象基类
 */
export interface DrawingBase {
  id: string;
  type: DrawingType;
  paneId: 'price' | 'volume' | 'full';  // 画在哪个pane
  
  points: WorldPoint[];  // 世界坐标点列表
  style: DrawingStyle;
  
  locked: boolean;       // 是否锁定（不可编辑）
  visible: boolean;      // 是否可见
  zIndex: number;        // 图层顺序
  
  meta?: {               // 额外信息
    text?: string;       // 文本内容
    fibLevels?: number[]; // 斐波那契比例
    [key: string]: any;
  };
}

// ============================================================================
// 3. 交互状态
// ============================================================================

/**
 * 交互模式
 */
export type InteractionMode =
  | 'idle'           // 空闲
  | 'drawing'        // 正在创建对象
  | 'editing'        // 拖动整个对象
  | 'resizing'       // 拖动控制点
  | 'panning';       // 平移图表

/**
 * 绘图状态
 */
export interface DrawingState {
  objects: DrawingBase[];           // 所有绘图对象
  activeTool: DrawingToolId;        // 当前激活的工具
  selectedId: string | null;        // 选中的对象ID
  hoveredId: string | null;         // 悬停的对象ID
  mode: InteractionMode;            // 当前交互模式
  
  // 临时状态
  tempObject: DrawingBase | null;   // 正在创建的临时对象
  dragStartWorld: WorldPoint | null; // 拖动起始世界坐标
  dragHandleIndex: number | null;   // 拖动的控制点索引
}

/**
 * 命中测试结果
 */
export interface HitTestResult {
  objectId: string | null;
  handleIndex: number | null;  // 命中的控制点索引，-1表示对象本身
  distance: number;             // 距离（用于优先级判断）
}

// ============================================================================
// 4. 工具定义
// ============================================================================

/**
 * 工具定义接口
 */
export interface ToolDefinition {
  id: DrawingToolId;
  name: string;
  icon: string;
  cursor: 'crosshair' | 'default' | 'text' | 'pointer';
  
  // 创建流程
  minPoints: number;
  maxPoints: number;
  
  // 交互钩子
  onStart?: (startPoint: WorldPoint) => DrawingBase;
  onUpdate?: (draft: DrawingBase, currentPoint: WorldPoint) => void;
  onComplete?: (obj: DrawingBase) => DrawingBase;
  
  // 渲染（增强版 - 支持ViewState集成）
  render?: (
    ctx: CanvasRenderingContext2D, 
    obj: DrawingBase, 
    toScreen: (p: WorldPoint) => ScreenPoint,
    viewState?: any  // ViewStateManager，避免循环导入
  ) => void;
  
  // 命中测试
  hitTest?: (obj: DrawingBase, worldPoint: WorldPoint, toScreen: (p: WorldPoint) => ScreenPoint) => number;
}

// ============================================================================
// 5. 历史记录
// ============================================================================

/**
 * 历史快照
 */
export interface HistorySnapshot {
  objects: DrawingBase[];
  timestamp: number;
}

/**
 * 持久化快照
 */
export interface DrawingSnapshot {
  symbol: string;
  timeframe: string;
  updatedAt: string;
  objects: DrawingBase[];
}

// ============================================================================
// 6. 事件类型
// ============================================================================

export type DrawingEventType =
  | 'objectCreated'
  | 'objectUpdated'
  | 'objectDeleted'
  | 'objectSelected'
  | 'toolChanged'
  | 'stateChanged';

export interface DrawingEvent {
  type: DrawingEventType;
  payload?: any;
}
