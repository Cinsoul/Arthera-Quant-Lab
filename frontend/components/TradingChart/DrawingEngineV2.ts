/**
 * DrawingEngine V2 - 专业级绘图引擎
 * Bloomberg/TradingView 架构
 * 
 * 核心特性：
 * - 世界坐标系统（与K线数据绑定）
 * - 状态机交互模式
 * - 专业命中测试
 * - 撤销/重做
 * - 多Pane支持
 * - 高性能渲染
 */

import {
  DrawingBase,
  DrawingState,
  DrawingType,
  DrawingToolId,
  WorldPoint,
  ScreenPoint,
  HitTestResult,
  InteractionMode,
  HistorySnapshot,
  ToolDefinition,
} from './DrawingTypes';
import {
  DRAWING_TOOLS,
  getToolDefinition,
  TOOL_SHORTCUTS,
  PRECISION_DRAWING_CONFIG,
  getToolDefaultStyle,
} from './DrawingTools';
import type {
  EnhancedChartViewStateManager as ViewStateManager
} from '../../utils/chartViewState';

// ============================================================================
// 配置常量
// ============================================================================

/** Bloomberg/TradingView标准专业配置 */
const PROFESSIONAL_CONFIG = {
  hitThreshold: 8,           // Bloomberg标准命中阈值（像素）
  handleRadius: 5,           // 控制点半径
  snapThreshold: 12,         // 磁吸距离阈值
  maxHistory: 100,           // 最大历史记录数（专业版更多）
  renderBatchSize: 50,       // 渲染批处理大小
  maxObjects: 500,           // 最大对象数量限制
  doubleClickTime: 300,      // 双击时间窗口（毫秒）
  dragSensitivity: 2,        // 拖拽敏感度
  precisionDecimals: 4,      // 计算精度小数位
};

/** 磁吸配置 */
const SNAP_CONFIG = {
  toPrice: true,             // 吸附到价格整数
  toTime: true,              // 吸附到时间节点
  toObjects: true,           // 吸附到其他对象
  angleIncrement: 15,        // 角度增量（度）
  showIndicators: true,      // 显示吸附指示器
};

const HIT_THRESHOLD = PROFESSIONAL_CONFIG.hitThreshold;
const HANDLE_RADIUS = PROFESSIONAL_CONFIG.handleRadius;
const MAX_HISTORY = PROFESSIONAL_CONFIG.maxHistory;

// 调试模式配置
const DEBUG_MODE = false;       // 生产环境设置为 false

// 调试辅助工具
const debug = {
  log: (...args: any[]) => DEBUG_MODE && console.log('[DrawingEngine]', ...args),
  warn: (...args: any[]) => DEBUG_MODE && console.warn('[DrawingEngine]', ...args),
  error: (...args: any[]) => console.error('[DrawingEngine]', ...args), // 错误总是显示
  group: (label: string) => DEBUG_MODE && console.group(`[DrawingEngine] ${label}`),
  groupEnd: () => DEBUG_MODE && console.groupEnd(),
};

// ============================================================================
// DrawingEngine 主类
// ============================================================================

export class DrawingEngineV2 {
  private state: DrawingState;
  private listeners: Map<string, Function[]> = new Map();
  
  // 历史记录
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  
  // 坐标转换函数（由外部提供）
  private worldToScreen: ((p: WorldPoint) => ScreenPoint) | null = null;
  private screenToWorld: ((x: number, y: number) => WorldPoint) | null = null;
  
  // Canvas引用和ViewState管理
  private canvas: HTMLCanvasElement | null = null;
  private viewState: ViewStateManager | null = null;
  private currentPaneId: 'price' | 'volume' | 'full' = 'price';
  
  // 专业级交互状态
  private lastClickTime = 0;
  private isDragging = false;
  private dragThreshold = PROFESSIONAL_CONFIG.dragSensitivity;
  private snapIndicators: Array<{ point: ScreenPoint; type: string }> = [];
  
  // 性能优化
  private renderCache = new Map<string, ImageData>();
  private isDirty = true;
  private lastRenderTime = 0;
  
  constructor() {
    this.state = {
      objects: [],
      activeTool: 'select',
      selectedId: null,
      hoveredId: null,
      mode: 'idle',
      tempObject: null,
      dragStartWorld: null,
      dragHandleIndex: null,
    };
  }
  
  // ============================================================================
  // 初始化与配置
  // ============================================================================
  
  /**
   * 设置Canvas引用并初始化专业级功能
   */
  public setCanvas(canvas: HTMLCanvasElement, viewState?: ViewStateManager): void {
    this.canvas = canvas;
    
    if (viewState) {
      this.viewState = viewState;
      this.setupAdvancedEventListeners();
      debug.log('✅ Professional features initialized with ViewState integration');
    }
  }
  
  /**
   * 设置高级事件监听器
   */
  private setupAdvancedEventListeners(): void {
    if (!this.canvas) return;
    
    // 专业级键盘快捷键
    this.setupKeyboardShortcuts();
    
    debug.log('✅ Advanced event listeners setup complete');
  }
  
  /**
   * 设置专业级键盘快捷键
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // 检查工具快捷键
      const toolType = TOOL_SHORTCUTS[event.code];
      if (toolType && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        this.setTool(toolType);
        return;
      }
      
      // 专业级快捷键处理
      this.handleAdvancedKeyboard(event);
    });
  }
  
  /**
   * 高级键盘事件处理
   */
  private handleAdvancedKeyboard(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyG': // Toggle grid snap
        if (event.ctrlKey) {
          SNAP_CONFIG.toObjects = !SNAP_CONFIG.toObjects;
          this.emit('snapModeChanged', { toObjects: SNAP_CONFIG.toObjects });
        }
        break;
        
      case 'KeyH': // Toggle snap indicators
        if (event.ctrlKey) {
          SNAP_CONFIG.showIndicators = !SNAP_CONFIG.showIndicators;
          this.invalidateRender();
        }
        break;
        
      case 'Equal': // Zoom in on selected
      case 'Minus': // Zoom out on selected
        if (this.state.selectedId && this.viewState) {
          const obj = this.state.objects.find(o => o.id === this.state.selectedId);
          if (obj && obj.points.length > 0) {
            const centerPoint = obj.points[0];
            const zoomFactor = event.code === 'Equal' ? 1.2 : 0.8;
            this.viewState.zoomAt(this.viewState.timeToX(centerPoint.t), zoomFactor);
          }
        }
        break;
    }
  }
  
  /**
   * 设置坐标转换函数
   */
  public setCoordinateTransform(
    toScreen: (p: WorldPoint) => ScreenPoint,
    toWorld: (x: number, y: number) => WorldPoint
  ): void {
    this.worldToScreen = toScreen;
    this.screenToWorld = toWorld;
  }
  
  /**
   * 设置当前Pane
   */
  public setPaneId(paneId: 'price' | 'volume' | 'full'): void {
    this.currentPaneId = paneId;
  }
  
  // ============================================================================
  // 工具管理
  // ============================================================================
  
  /**
   * 激活工具
   */
  public setTool(toolId: DrawingToolId): void {
    console.group('⚙️ DrawingEngine.setTool()');
    console.log('%c🔧 Tool ID:', 'color: #10b981; font-weight: bold;', toolId);
    
    // 如果正在绘图，取消当前绘图
    if (this.state.mode === 'drawing') {
      console.log('%c⚠️ Canceling current drawing', 'color: #f59e0b;');
      this.state.tempObject = null;
      this.state.mode = 'idle';
    }
    
    this.state.activeTool = toolId;
    console.log('%c✅ activeTool set to:', 'color: #10b981; font-weight: bold;', this.state.activeTool);
    this.emit('toolChanged', toolId);
    this.emit('needsRender');
    console.groupEnd();
  }
  
  /**
   * 获取当前工具
   */
  public getTool(): DrawingToolId {
    return this.state.activeTool;
  }
  
  // ============================================================================
  // 对象管理
  // ============================================================================
  
  /**
   * 添加对象
   */
  public addObject(obj: DrawingBase): void {
    obj.zIndex = this.state.objects.length;
    this.state.objects.push(obj);
    this.pushHistory();
    this.emit('objectCreated', obj);
    this.emit('needsRender');
  }
  
  /**
   * 删除对象
   */
  public deleteObject(id: string): void {
    this.state.objects = this.state.objects.filter(o => o.id !== id);
    if (this.state.selectedId === id) {
      this.state.selectedId = null;
    }
    this.pushHistory();
    this.emit('objectDeleted', id);
    this.emit('needsRender');
  }
  
  /**
   * 删除选中对象
   */
  public deleteSelected(): void {
    if (this.state.selectedId) {
      this.deleteObject(this.state.selectedId);
    }
  }
  
  /**
   * 更新对象
   */
  public updateObject(id: string, updates: Partial<DrawingBase>): void {
    const obj = this.state.objects.find(o => o.id === id);
    if (obj) {
      Object.assign(obj, updates);
      this.emit('objectUpdated', obj);
      this.emit('needsRender');
    }
  }
  
  /**
   * 获取所有对象
   */
  public getObjects(): DrawingBase[] {
    return [...this.state.objects];
  }
  
  /**
   * 选中对象
   */
  public selectObject(id: string | null): void {
    this.state.selectedId = id;
    this.emit('objectSelected', id);
    this.emit('needsRender');
  }
  
  /**
   * 清空所有对象
   */
  public clearAll(): void {
    this.state.objects = [];
    this.state.selectedId = null;
    this.pushHistory();
    this.emit('needsRender');
  }
  
  // ============================================================================
  // 交互事件处理
  // ============================================================================
  
  /**
   * 鼠标按下
   */
  public handleMouseDown(x: number, y: number, button: number = 0): void {
    debug.group('handleMouseDown');
    debug.log('Screen coords:', { x, y, button });
    debug.log('Active tool:', this.state.activeTool);
    debug.log('Current mode:', this.state.mode);
    debug.log('Transforms ready:', {
      screenToWorld: !!this.screenToWorld,
      worldToScreen: !!this.worldToScreen,
    });
    
    if (!this.screenToWorld || !this.worldToScreen) {
      debug.error('❌ Coordinate transforms not initialized');
      debug.groupEnd();
      return;
    }
    
    const worldPoint = this.screenToWorld(x, y);
    debug.log('World point:', { t: worldPoint.t, p: worldPoint.p.toFixed(2) });
    
    // 左键
    if (button === 0) {
      if (this.state.activeTool === 'select') {
        debug.log('SELECT mode → handleSelectMouseDown');
        this.handleSelectMouseDown(x, y, worldPoint);
      } else {
        debug.log('DRAW mode → handleDrawMouseDown');
        this.handleDrawMouseDown(worldPoint);
      }
    }
    
    debug.log('Mode after mouseDown:', this.state.mode);
    debug.groupEnd();
  }
  
  /**
   * 鼠标移动
   */
  public handleMouseMove(x: number, y: number): boolean {
    if (!this.screenToWorld || !this.worldToScreen) return false;
    
    const worldPoint = this.screenToWorld(x, y);
    
    // 只在drawing模式时输出日志，避免过多日志
    if (this.state.mode === 'drawing') {
      console.group('🖱️ handleMouseMove() - DRAWING MODE');
      console.log('%c✏️ Drawing in progress', 'color: #10b981; font-weight: bold; font-size: 14px; background: #d1fae5; padding: 4px;');
      console.log('%c🌍 World Point:', 'color: #06b6d4;', `t: ${worldPoint.t}, p: ${worldPoint.p.toFixed(2)}`);
    }
    
    switch (this.state.mode) {
      case 'drawing':
        this.handleDrawMouseMove(worldPoint);
        console.log('%c🚫 BLOCKING other interactions (pan, hover)', 'color: #ef4444; font-weight: bold;');
        console.log('%c✅ Returning TRUE', 'color: #10b981; font-weight: bold;');
        console.groupEnd();
        return true; // 阻止其他交互（如平移）
      
      case 'editing':
        this.handleEditMouseMove(worldPoint);
        return true;
      
      case 'resizing':
        this.handleResizeMouseMove(worldPoint);
        return true;
      
      case 'idle':
        // 更新悬停状态
        const hit = this.hitTest(x, y);
        const newHoveredId = hit.objectId;
        if (newHoveredId !== this.state.hoveredId) {
          this.state.hoveredId = newHoveredId;
          this.emit('needsRender');
        }
        return false;
      
      default:
        return false;
    }
  }
  
  /**
   * 鼠标抬起
   */
  public handleMouseUp(x: number, y: number): void {
    if (!this.screenToWorld) return;
    
    const worldPoint = this.screenToWorld(x, y);
    
    switch (this.state.mode) {
      case 'drawing':
        this.handleDrawMouseUp(worldPoint);
        break;
      
      case 'editing':
      case 'resizing':
        this.pushHistory();
        this.state.mode = 'idle';
        this.state.dragStartWorld = null;
        this.state.dragHandleIndex = null;
        this.emit('needsRender');
        break;
    }
  }
  
  /**
   * 键盘事件
   */
  public handleKeyDown(event: KeyboardEvent): boolean {
    // Delete/Backspace: 删除选中对象
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.state.selectedId) {
      this.deleteSelected();
      return true;
    }
    
    // Escape: 取消当前操作
    if (event.key === 'Escape') {
      if (this.state.mode === 'drawing') {
        this.state.tempObject = null;
        this.state.mode = 'idle';
        this.emit('needsRender');
        return true;
      }
      if (this.state.selectedId) {
        this.selectObject(null);
        return true;
      }
      if (this.state.activeTool !== 'select') {
        this.setTool('select');
        return true;
      }
    }
    
    // Ctrl+Z: 撤销
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      this.undo();
      return true;
    }
    
    // Ctrl+Shift+Z / Ctrl+Y: 重做
    if ((event.ctrlKey || event.metaKey) && (
      (event.key === 'z' && event.shiftKey) || event.key === 'y'
    )) {
      this.redo();
      return true;
    }
    
    return false;
  }
  
  // ============================================================================
  // 内部交互逻辑
  // ============================================================================
  
  private handleSelectMouseDown(x: number, y: number, worldPoint: WorldPoint): void {
    const hit = this.hitTest(x, y);
    
    if (hit.objectId) {
      const obj = this.state.objects.find(o => o.id === hit.objectId);
      if (!obj || obj.locked) return;
      
      this.state.selectedId = hit.objectId;
      this.state.dragStartWorld = worldPoint;
      
      if (hit.handleIndex !== null && hit.handleIndex >= 0) {
        // 拖动控制点
        this.state.mode = 'resizing';
        this.state.dragHandleIndex = hit.handleIndex;
      } else {
        // 拖动整个对象
        this.state.mode = 'editing';
      }
      
      this.emit('needsRender');
    } else {
      // 点击空白区域，取消选中
      this.state.selectedId = null;
      this.emit('needsRender');
    }
  }
  
  private handleDrawMouseDown(worldPoint: WorldPoint): void {
    debug.group('handleDrawMouseDown');
    debug.log('Active Tool:', this.state.activeTool);
    debug.log('World Point:', worldPoint);
    
    const tool = getToolDefinition(this.state.activeTool as DrawingType);
    debug.log('Tool Definition:', tool ? `✅ ${tool.name}` : '❌ NOT FOUND');
    
    if (!tool || !tool.onStart) {
      debug.error('❌ TOOL NOT FOUND OR NO onStart!', this.state.activeTool);
      debug.groupEnd();
      return;
    }
    
    // 应用智能磁吸
    const snappedPoint = this.applySmartSnapping(worldPoint);
    
    // 创建临时对象，应用专业级样式
    this.state.tempObject = tool.onStart(snappedPoint);
    if (this.state.tempObject) {
      this.state.tempObject.style = getToolDefaultStyle(this.state.activeTool as DrawingType);
    }
    this.state.mode = 'drawing';
    
    debug.log('✅ tempObject created with smart snapping');
    this.invalidateRender();
    debug.groupEnd();
  }
  
  private handleDrawMouseMove(worldPoint: WorldPoint): void {
    console.log('[DrawingEngine] handleDrawMouseMove - tempObject exists:', !!this.state.tempObject);
    
    if (!this.state.tempObject) {
      console.warn('[DrawingEngine] ❌ No tempObject in drawing mode!');
      return;
    }
    
    const tool = getToolDefinition(this.state.tempObject.type);
    if (!tool || !tool.onUpdate) {
      console.warn('[DrawingEngine] ❌ No tool or onUpdate for:', this.state.tempObject.type);
      return;
    }
    
    console.log('[DrawingEngine] ✅ Updating drawing, worldPoint:', worldPoint);
    tool.onUpdate(this.state.tempObject, worldPoint);
    this.emit('needsRender');
  }
  
  private handleDrawMouseUp(worldPoint: WorldPoint): void {
    if (!this.state.tempObject) return;
    
    const tool = getToolDefinition(this.state.tempObject.type);
    if (!tool) return;
    
    // 检查是否达到最小点数
    if (this.state.tempObject.points.length >= tool.minPoints) {
      // 完成对象
      let finalObject = this.state.tempObject;
      
      if (tool.onComplete) {
        finalObject = tool.onComplete(finalObject);
      }
      
      this.addObject(finalObject);
      
      // 重置状态
      this.state.tempObject = null;
      this.state.mode = 'idle';
      
      // 如果是单次工具（如文本），切回选择工具
      if (['text'].includes(tool.id)) {
        this.setTool('select');
      }
    }
  }
  
  private handleEditMouseMove(worldPoint: WorldPoint): void {
    if (!this.state.selectedId || !this.state.dragStartWorld) return;
    
    const obj = this.state.objects.find(o => o.id === this.state.selectedId);
    if (!obj || obj.locked) return;
    
    // 计算位移
    const deltaT = worldPoint.t - this.state.dragStartWorld.t;
    const deltaP = worldPoint.p - this.state.dragStartWorld.p;
    
    // 移动所有点
    obj.points = obj.points.map(p => ({
      t: p.t + deltaT,
      p: p.p + deltaP,
    }));
    
    this.state.dragStartWorld = worldPoint;
    this.emit('needsRender');
  }
  
  private handleResizeMouseMove(worldPoint: WorldPoint): void {
    if (!this.state.selectedId || this.state.dragHandleIndex === null) return;
    
    const obj = this.state.objects.find(o => o.id === this.state.selectedId);
    if (!obj || obj.locked) return;
    
    // 更新控制点
    if (this.state.dragHandleIndex < obj.points.length) {
      obj.points[this.state.dragHandleIndex] = worldPoint;
      this.emit('needsRender');
    }
  }
  
  // ============================================================================
  // 命中测试
  // ============================================================================
  
  private hitTest(x: number, y: number): HitTestResult {
    if (!this.screenToWorld || !this.worldToScreen) {
      return { objectId: null, handleIndex: null, distance: Infinity };
    }
    
    const worldPoint = this.screenToWorld(x, y);
    
    // 首先检查选中对象的控制点
    if (this.state.selectedId) {
      const obj = this.state.objects.find(o => o.id === this.state.selectedId);
      if (obj) {
        const handleHit = this.hitTestHandles(x, y, obj);
        if (handleHit.handleIndex !== null) {
          return handleHit;
        }
      }
    }
    
    // 从上到下检查对象（后画的先检测）
    const sorted = [...this.state.objects]
      .filter(o => o.visible && (o.paneId === this.currentPaneId || o.paneId === 'full'))
      .sort((a, b) => b.zIndex - a.zIndex);
    
    for (const obj of sorted) {
      const tool = getToolDefinition(obj.type);
      if (!tool || !tool.hitTest) continue;
      
      const distance = tool.hitTest(obj, worldPoint, this.worldToScreen);
      
      if (distance < HIT_THRESHOLD) {
        return { objectId: obj.id, handleIndex: -1, distance };
      }
    }
    
    return { objectId: null, handleIndex: null, distance: Infinity };
  }
  
  private hitTestHandles(x: number, y: number, obj: DrawingBase): HitTestResult {
    if (!this.worldToScreen) {
      return { objectId: null, handleIndex: null, distance: Infinity };
    }
    
    for (let i = 0; i < obj.points.length; i++) {
      const screenPoint = this.worldToScreen(obj.points[i]);
      const dx = x - screenPoint.x;
      const dy = y - screenPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= HANDLE_RADIUS) {
        return { objectId: obj.id, handleIndex: i, distance };
      }
    }
    
    return { objectId: null, handleIndex: null, distance: Infinity };
  }
  
  // ============================================================================
  // 渲染
  // ============================================================================
  
  /**
   * 渲染所有绘图对象
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.worldToScreen) return;
    
    // 渲染所有对象
    const sorted = [...this.state.objects]
      .filter(o => o.visible && (o.paneId === this.currentPaneId || o.paneId === 'full'))
      .sort((a, b) => a.zIndex - b.zIndex);
    
    for (const obj of sorted) {
      this.renderObject(ctx, obj, obj.id === this.state.selectedId);
    }
    
    // 渲染临时对象
    if (this.state.tempObject && this.state.mode === 'drawing') {
      this.renderObject(ctx, this.state.tempObject, false, true);
    }
  }
  
  private renderObject(
    ctx: CanvasRenderingContext2D,
    obj: DrawingBase,
    isSelected: boolean,
    isTemp: boolean = false
  ): void {
    if (!this.worldToScreen) return;
    
    const tool = getToolDefinition(obj.type);
    if (!tool || !tool.render) return;
    
    ctx.save();
    
    // 临时对象半透明
    if (isTemp) {
      ctx.globalAlpha = 0.6;
    }
    
    // 选中对象发光效果
    if (isSelected) {
      ctx.shadowColor = obj.style.color;
      ctx.shadowBlur = 10;
    }
    
    // 调用工具的渲染函数
    tool.render(ctx, obj, this.worldToScreen);
    
    // 绘制控制点
    if (isSelected && !isTemp) {
      this.renderHandles(ctx, obj);
    }
    
    ctx.restore();
  }
  
  private renderHandles(ctx: CanvasRenderingContext2D, obj: DrawingBase): void {
    if (!this.worldToScreen) return;
    
    ctx.save();
    ctx.fillStyle = obj.style.color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    
    for (const point of obj.points) {
      const screenPoint = this.worldToScreen(point);
      
      ctx.beginPath();
      ctx.arc(screenPoint.x, screenPoint.y, HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  // ============================================================================
  // 历史记录（撤销/重做）
  // ============================================================================
  
  private pushHistory(): void {
    const snapshot: HistorySnapshot = {
      objects: JSON.parse(JSON.stringify(this.state.objects)),
      timestamp: Date.now(),
    };
    
    this.undoStack.push(snapshot);
    this.redoStack = []; // 清空重做栈
    
    // 限制历史记录数量
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
  }
  
  public undo(): boolean {
    if (this.undoStack.length === 0) return false;
    
    const current: HistorySnapshot = {
      objects: JSON.parse(JSON.stringify(this.state.objects)),
      timestamp: Date.now(),
    };
    
    this.redoStack.push(current);
    const previous = this.undoStack.pop()!;
    this.state.objects = previous.objects;
    
    this.emit('needsRender');
    return true;
  }
  
  public redo(): boolean {
    if (this.redoStack.length === 0) return false;
    
    const current: HistorySnapshot = {
      objects: JSON.parse(JSON.stringify(this.state.objects)),
      timestamp: Date.now(),
    };
    
    this.undoStack.push(current);
    const next = this.redoStack.pop()!;
    this.state.objects = next.objects;
    
    this.emit('needsRender');
    return true;
  }
  
  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  // ============================================================================
  // 持久化
  // ============================================================================
  
  public exportObjects(): string {
    return JSON.stringify({
      version: '2.0',
      timestamp: Date.now(),
      objects: this.state.objects,
    });
  }
  
  public importObjects(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data.objects)) {
        this.state.objects = data.objects;
        this.pushHistory();
        this.emit('needsRender');
        return true;
      }
    } catch (e) {
      console.error('Failed to import objects:', e);
    }
    return false;
  }
  
  // ============================================================================
  // 事件系统
  // ============================================================================
  
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  public off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(
        event,
        callbacks.filter(cb => cb !== callback)
      );
    }
  }
  
  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(...args));
    }
  }
  
  // ============================================================================
  // 清理
  // ============================================================================
  
  // ============================================================================
  // Bloomberg/TradingView级专业算法
  // ============================================================================
  
  /**
   * 智能磁吸算法 - Bloomberg/TradingView标准
   */
  private applySmartSnapping(worldPoint: WorldPoint): WorldPoint {
    if (!this.viewState || (!SNAP_CONFIG.toPrice && !SNAP_CONFIG.toTime)) {
      return worldPoint;
    }
    
    let snappedPoint = { ...worldPoint };
    this.snapIndicators = [];
    
    // 价格磁吸
    if (SNAP_CONFIG.toPrice) {
      snappedPoint = this.snapToPrice(snappedPoint);
    }
    
    // 时间磁吸
    if (SNAP_CONFIG.toTime && this.viewState) {
      snappedPoint = this.snapToTime(snappedPoint);
    }
    
    // 对象磁吸
    if (SNAP_CONFIG.toObjects) {
      snappedPoint = this.snapToNearbyObjects(snappedPoint);
    }
    
    return snappedPoint;
  }
  
  /**
   * 价格磁吸算法
   */
  private snapToPrice(worldPoint: WorldPoint): WorldPoint {
    if (!this.viewState) return worldPoint;
    
    const state = this.viewState.getState();
    const priceRange = state.priceMax - state.priceMin;
    const priceStep = Math.pow(10, Math.floor(Math.log10(priceRange)) - 1);
    const nearestPrice = Math.round(worldPoint.p / priceStep) * priceStep;
    const pricePixelDiff = Math.abs(
      this.viewState.priceToY(nearestPrice) - this.viewState.priceToY(worldPoint.p)
    );
    
    if (pricePixelDiff <= PROFESSIONAL_CONFIG.snapThreshold) {
      this.snapIndicators.push({
        point: { 
          x: this.viewState.timeToX(worldPoint.t), 
          y: this.viewState.priceToY(nearestPrice) 
        },
        type: 'price'
      });
      return { ...worldPoint, p: nearestPrice };
    }
    
    return worldPoint;
  }
  
  /**
   * 时间磁吸算法
   */
  private snapToTime(worldPoint: WorldPoint): WorldPoint {
    if (!this.viewState) return worldPoint;
    
    const data = this.viewState.getAllData();
    if (data.length === 0) return worldPoint;
    
    let minTimeDiff = Infinity;
    let nearestTime = worldPoint.t;
    
    for (const bar of data) {
      const timeDiff = Math.abs(bar.timestamp - worldPoint.t);
      const timePixelDiff = Math.abs(
        this.viewState.timeToX(bar.timestamp) - this.viewState.timeToX(worldPoint.t)
      );
      
      if (timePixelDiff <= PROFESSIONAL_CONFIG.snapThreshold && timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        nearestTime = bar.timestamp;
      }
    }
    
    if (minTimeDiff < Infinity) {
      this.snapIndicators.push({
        point: { 
          x: this.viewState.timeToX(nearestTime), 
          y: this.viewState.priceToY(worldPoint.p) 
        },
        type: 'time'
      });
      return { ...worldPoint, t: nearestTime };
    }
    
    return worldPoint;
  }
  
  /**
   * 吸附到附近对象
   */
  private snapToNearbyObjects(worldPoint: WorldPoint): WorldPoint {
    if (!this.worldToScreen) return worldPoint;
    
    const screenPoint = this.worldToScreen(worldPoint);
    let bestSnap = worldPoint;
    let minDistance = PROFESSIONAL_CONFIG.snapThreshold;
    
    for (const obj of this.state.objects) {
      if (!obj.visible) continue;
      
      for (const point of obj.points) {
        const objScreenPoint = this.worldToScreen(point);
        const distance = Math.sqrt(
          Math.pow(screenPoint.x - objScreenPoint.x, 2) + 
          Math.pow(screenPoint.y - objScreenPoint.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          bestSnap = point;
          this.snapIndicators.push({
            point: objScreenPoint,
            type: 'object'
          });
        }
      }
    }
    
    return bestSnap;
  }
  
  /**
   * 渲染磁吸指示器
   */
  private renderSnapIndicators(ctx: CanvasRenderingContext2D): void {
    if (!SNAP_CONFIG.showIndicators || this.snapIndicators.length === 0) return;
    
    ctx.save();
    
    for (const indicator of this.snapIndicators) {
      const { point, type } = indicator;
      
      // 根据类型设置颜色
      switch (type) {
        case 'price':
          ctx.strokeStyle = '#10B981'; // 绿色 - 价格
          break;
        case 'time':
          ctx.strokeStyle = '#3B82F6'; // 蓝色 - 时间
          break;
        case 'object':
          ctx.strokeStyle = '#F59E0B'; // 橙色 - 对象
          break;
        default:
          ctx.strokeStyle = '#6B7280'; // 灰色
      }
      
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      
      // 绘制十字准星
      ctx.beginPath();
      ctx.moveTo(point.x - 8, point.y);
      ctx.lineTo(point.x + 8, point.y);
      ctx.moveTo(point.x, point.y - 8);
      ctx.lineTo(point.x, point.y + 8);
      ctx.stroke();
      
      // 绘制圆圈
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  /**
   * 标记需要重新渲染
   */
  private invalidateRender(): void {
    this.isDirty = true;
    this.renderCache.clear();
    this.emit('needsRender');
  }
  
  /**
   * 性能优化的渲染方法
   */
  public renderOptimized(ctx: CanvasRenderingContext2D): void {
    if (!this.isDirty && this.renderCache.size > 0) {
      return;
    }
    
    const startTime = performance.now();
    
    // 调用原始渲染方法
    this.render(ctx);
    
    // 渲染磁吸指示器
    this.renderSnapIndicators(ctx);
    
    this.isDirty = false;
    this.lastRenderTime = performance.now() - startTime;
    
    debug.log(`Render time: ${this.lastRenderTime.toFixed(2)}ms`);
  }
  
  /**
   * 获取性能统计
   */
  public getPerformanceStats(): {
    objectCount: number;
    lastRenderTime: number;
    cacheSize: number;
    memoryUsage: string;
  } {
    return {
      objectCount: this.state.objects.length,
      lastRenderTime: this.lastRenderTime,
      cacheSize: this.renderCache.size,
      memoryUsage: `${Math.round(this.renderCache.size * 0.1)}KB`,
    };
  }

  public destroy(): void {
    this.listeners.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.state.objects = [];
    this.renderCache.clear();
    this.snapIndicators = [];
    
    debug.log('✅ Professional DrawingEngine destroyed');
  }
}