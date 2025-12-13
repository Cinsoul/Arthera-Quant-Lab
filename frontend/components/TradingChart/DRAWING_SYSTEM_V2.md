# Drawing System V2 - 专业级绘图系统

## 🎯 核心特性

### 1. **世界坐标系统**
- 所有绘图对象绑定到世界坐标（时间戳 + 价格）
- 自动跟随缩放和平移
- 精确的坐标转换系统

### 2. **状态机交互模式**
```
idle → drawing → idle
     → editing → idle
     → resizing → idle
     → panning → idle
```

### 3. **专业命中测试**
- 像素级精确度
- 控制点优先检测
- Z-index分层系统

### 4. **完整的历史记录**
- Ctrl+Z 撤销
- Ctrl+Shift+Z / Ctrl+Y 重做
- 最多50层历史记录

## 📐 支持的绘图工具

### 线条工具 (LINES)
- ✅ **趋势线** (trendline) - 两点确定
- ✅ **射线** (ray) - 从起点无限延伸
- ✅ **水平线** (hline) - 横跨整个图表
- ✅ **垂直线** (vline) - 纵跨所有pane
- ✅ **箭头** (arrow) - 带箭头的趋势线

### 形状工具 (SHAPES)
- ✅ **矩形** (rect) - 两点定义矩形区域

### 斐波那契工具 (FIBONACCI)
- ✅ **斐波那契回撤** (fib) - 自动计算关键比例位
  - 0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%

### 其他工具 (OTHERS)
- ✅ **文本标注** (text) - 单击添加文本

### 计划中 (ROADMAP)
- ⏳ **平行通道** (parallel)
- ⏳ **安德鲁音叉** (pitchfork)

## ⌨️ 快捷键

| 功能 | 快捷键 |
|------|--------|
| 选择工具 | Esc |
| 删除选中对象 | Delete / Backspace |
| 撤销 | Ctrl+Z |
| 重做 | Ctrl+Shift+Z / Ctrl+Y |
| 取消绘图 | Esc |
| 取消选中 | Esc |

## 🔧 技术架构

### 文件结构
```
DrawingTypes.ts         # 类型定义
DrawingTools.ts         # 工具注册表
DrawingEngineV2.ts      # 核心引擎
EnhancedTradingChartV2.tsx  # React集成
```

### 核心类：DrawingEngineV2

#### 坐标转换
```typescript
worldToScreen(p: {t: number, p: number}) => {x: number, y: number}
screenToWorld(x: number, y: number) => {t: number, p: number}
```

#### 事件处理
```typescript
handleMouseDown(x, y, button)
handleMouseMove(x, y) => boolean  // 返回true表示阻止其他交互
handleMouseUp(x, y)
handleKeyDown(event) => boolean
```

#### 对象管理
```typescript
addObject(obj)
deleteObject(id)
updateObject(id, updates)
selectObject(id)
clearAll()
```

#### 渲染
```typescript
render(ctx)  // 渲染所有对象和控制点
```

### 工具定义接口

每个工具实现以下接口：
```typescript
interface ToolDefinition {
  id: DrawingToolId;
  name: string;
  icon: string;
  cursor: 'crosshair' | 'default' | 'text';
  minPoints: number;
  maxPoints: number;
  
  onStart?(p: WorldPoint): DrawingBase;
  onUpdate?(draft: DrawingBase, p: WorldPoint): void;
  onComplete?(obj: DrawingBase): DrawingBase;
  render?(ctx, obj, toScreen): void;
  hitTest?(obj, worldPoint, toScreen): number;
}
```

## 🎨 对象模型

### DrawingBase
```typescript
{
  id: string;
  type: DrawingType;
  paneId: 'price' | 'volume' | 'full';
  points: WorldPoint[];
  style: {
    color: string;
    lineWidth: number;
    lineStyle: 'solid' | 'dash' | 'dot';
    fillColor?: string;
    opacity?: number;
  };
  locked: boolean;
  visible: boolean;
  zIndex: number;
  meta?: any;
}
```

### WorldPoint（世界坐标）
```typescript
{
  t: number;  // timestamp (毫秒)
  p: number;  // price (价格值)
}
```

## 🚀 使用示例

### 基本初始化
```typescript
const engine = new DrawingEngineV2();
engine.setCanvas(canvasElement);
engine.setCoordinateTransform(worldToScreen, screenToWorld);
engine.setPaneId('price');
```

### 监听事件
```typescript
engine.on('needsRender', () => {
  renderChart();
});

engine.on('objectCreated', (obj) => {
  console.log('Created:', obj);
});
```

### 渲染循环
```typescript
function renderChart() {
  // ... 绘制K线、指标等
  
  // 最后绘制绘图对象
  if (drawingEngine) {
    drawingEngine.render(ctx);
  }
}
```

## 🔍 调试技巧

### 查看所有对象
```javascript
console.log(engine.getObjects());
```

### 导出/导入
```javascript
const json = engine.exportObjects();
localStorage.setItem('drawings', json);

// 恢复
const json = localStorage.getItem('drawings');
engine.importObjects(json);
```

## 📊 性能优化

1. **Canvas裁剪** - 只渲染可见区域
2. **智能重绘** - 事件驱动的needsRender
3. **命中测试缓存** - Z-index排序优化
4. **控制点检测优先级** - 选中对象优先

## 🎯 与 Bloomberg/TradingView 对标

| 特性 | Bloomberg | TradingView | DrawingV2 |
|------|-----------|-------------|-----------|
| 世界坐标系 | ✅ | ✅ | ✅ |
| 撤销/重做 | ✅ | ✅ | ✅ |
| 控制点编辑 | ✅ | ✅ | ✅ |
| 对象锁定 | ✅ | ✅ | ✅ |
| 跨Pane绘图 | ✅ | ✅ | ✅ |
| 持久化 | ✅ | ✅ | ✅ |
| 斐波那契 | ✅ | ✅ | ✅ |
| 音叉工具 | ✅ | ✅ | ⏳ |
| 自动图表模式识别 | ✅ | ✅ | ⏳ |

## 🐛 已知问题

- 暂无

## 📝 更新日志

### v2.0.0 (2025-12-10)
- ✅ 完全重构为专业架构
- ✅ 世界坐标系统
- ✅ 状态机交互
- ✅ 8种基础工具
- ✅ 撤销/重做
- ✅ 键盘快捷键
- ✅ 持久化支持
