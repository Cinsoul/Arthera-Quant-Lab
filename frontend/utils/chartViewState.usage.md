# Chart View State Manager - 使用指南

## TradingView标准的缩放/平移架构

这套系统实现了类似TradingView/Bloomberg的专业级图表交互体验。

---

## 核心概念

### 1. 世界坐标系统
- 所有时间用 `barIndex`（数组索引）表示，允许小数
- `visibleRange = [start, end]` 控制可见区间
- 缩放 = 调整visibleRange长度
- 平移 = 整体移动visibleRange

### 2. 自动Y轴重算
- 每次visibleRange变化 → 自动重算Y轴范围
- Y轴只看当前可见的K线数据
- 实现了Bloomberg标准的5-10% padding

### 3. 智能数据加载
- 接近边缘（50根）自动触发数据加载
- 支持往左加载历史数据
- 支持往右加载实时数据

---

## 快速开始

### 第一步：创建ViewState实例

```typescript
import { createChartViewState, type Bar, type DataLoader } from './utils/chartViewState';

// 准备数据
const data: Bar[] = [
  {
    time: new Date('2024-01-01'),
    timestamp: new Date('2024-01-01').getTime(),
    open: 100,
    high: 105,
    low: 99,
    close: 103,
    volume: 1000000,
  },
  // ... 更多数据
];

// 定义数据加载器（可选）
const loader: DataLoader = {
  loadMoreLeft: async (count: number) => {
    // 往左加载历史数据
    const response = await fetch(`/api/history?count=${count}`);
    return response.json();
  },
  loadMoreRight: async (count: number) => {
    // 往右加载最新数据
    const response = await fetch(`/api/latest?count=${count}`);
    return response.json();
  },
  onRangeChange: (start, end) => {
    console.log('Visible range changed:', start, end);
  },
};

// 创建ViewState管理器
const viewState = createChartViewState(
  data,
  1200,  // 画布宽度
  600,   // 画布高度
  loader // 数据加载器（可选）
);
```

---

### 第二步：应用Timeframe

```typescript
// 用户点击"1M"按钮
viewState.applyTimeframe('1M');

// 获取当前状态
const state = viewState.getState();
console.log('Visible range:', state.visibleStart, '-', state.visibleEnd);
console.log('Price range:', state.priceMin, '-', state.priceMax);

// 获取可见数据
const visibleBars = viewState.getVisibleData();
```

---

### 第三步：实现缩放交互

```typescript
// 监听鼠标滚轮
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  
  // 滚轮缩放
  viewState.wheelZoom(mouseX, e.deltaY);
  
  // 重新绘制图表
  redrawChart();
});

// 或者自定义缩放因子
const mouseX = 600; // 鼠标X坐标
viewState.zoomAt(mouseX, 1.2); // 放大20%
```

---

### 第四步：实现平移交互

```typescript
let isDragging = false;

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  
  viewState.startPan(mouseX);
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  
  viewState.updatePan(mouseX);
  redrawChart();
});

canvas.addEventListener('mouseup', () => {
  if (!isDragging) return;
  
  isDragging = false;
  viewState.endPan();
});
```

---

### 第五步：绘制图表（使用专业轴计算器）

```typescript
import { calculateProfessionalTimeAxis, calculatePriceAxis } from './utils/professionalAxisCalculator';

function redrawChart() {
  const state = viewState.getState();
  const allData = viewState.getAllData();
  
  // ✅ 计算X轴（传入visibleRange）
  const timeAxis = calculateProfessionalTimeAxis(
    allData,
    state.timeframe === 'Custom' ? '1M' : state.timeframe,
    state.widthPx,
    {
      start: state.visibleStart,
      end: state.visibleEnd,
    }
  );
  
  // ✅ 计算Y轴（ViewState已经自动计算了priceMin/priceMax）
  const priceAxis = calculatePriceAxis(
    state.priceMin,
    state.priceMax,
    state.heightPx
  );
  
  // 绘制X轴刻度
  timeAxis.ticks.forEach(tick => {
    const x = viewState.indexToX(
      allData.findIndex(bar => bar.timestamp === tick.timestamp)
    );
    
    ctx.fillText(tick.label, x, state.heightPx + 20);
  });
  
  // 绘制Y轴刻度
  priceAxis.ticks.forEach(tick => {
    const y = viewState.priceToY(tick.value);
    ctx.fillText(tick.label, state.widthPx + 10, y);
  });
  
  // 绘制K线
  const visibleBars = viewState.getVisibleData();
  visibleBars.forEach((bar, i) => {
    const globalIndex = state.visibleStart + i;
    const x = viewState.indexToX(globalIndex);
    const yOpen = viewState.priceToY(bar.open);
    const yClose = viewState.priceToY(bar.close);
    const yHigh = viewState.priceToY(bar.high);
    const yLow = viewState.priceToY(bar.low);
    
    // 绘制蜡烛图...
  });
}
```

---

## 完整示例（React组件）

```typescript
import { useRef, useEffect, useState } from 'react';
import { createChartViewState, type ChartViewStateManager } from './utils/chartViewState';

export function ProfessionalChart({ data }: { data: Bar[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewState, setViewState] = useState<ChartViewStateManager | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 初始化ViewState
  useEffect(() => {
    if (!canvasRef.current || !data) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const vs = createChartViewState(data, rect.width, rect.height);
    
    // 默认显示1M
    vs.applyTimeframe('1M');
    
    setViewState(vs);
  }, [data]);

  // 滚轮缩放
  const handleWheel = (e: WheelEvent) => {
    if (!viewState || !canvasRef.current) return;
    e.preventDefault();
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    viewState.wheelZoom(mouseX, e.deltaY);
    redraw();
  };

  // 拖动平移
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!viewState || !canvasRef.current) return;
    setIsDragging(true);
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    viewState.startPan(mouseX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !viewState || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    viewState.updatePan(mouseX);
    redraw();
  };

  const handleMouseUp = () => {
    if (!isDragging || !viewState) return;
    setIsDragging(false);
    viewState.endPan();
  };

  // 绘制图表
  const redraw = () => {
    // 实现绘制逻辑...
  };

  // Timeframe按钮
  const handleTimeframeClick = (tf: TimePeriod) => {
    if (!viewState) return;
    viewState.applyTimeframe(tf);
    redraw();
  };

  return (
    <div>
      {/* Timeframe按钮 */}
      <div className="flex gap-2 mb-4">
        {['1D', '5D', '1M', '3M', '6M', '1Y', 'YTD'].map(tf => (
          <button
            key={tf}
            onClick={() => handleTimeframeClick(tf as TimePeriod)}
            className={viewState?.getState().timeframe === tf ? 'active' : ''}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* 图表画布 */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel as any}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />
    </div>
  );
}
```

---

## API参考

### ChartViewStateManager

#### 构造函数
```typescript
new ChartViewStateManager(
  data: Bar[],
  canvasWidth: number,
  canvasHeight: number,
  loader?: DataLoader
)
```

#### 公共方法

##### `getState(): Readonly<ViewState>`
获取当前状态（只读）

##### `getVisibleData(): Bar[]`
获取当前可见的K线数据

##### `getAllData(): Bar[]`
获取所有已加载数据

##### `setCanvasSize(width: number, height: number)`
更新画布尺寸

##### `setData(newData: Bar[])`
更新数据源

##### `applyTimeframe(timeframe: TimePeriod)`
应用时间周期（1D/5D/1M等）

##### `zoomAt(mouseX: number, zoomFactor: number)`
以指定位置为锚点缩放
- `zoomFactor > 1`: 放大
- `zoomFactor < 1`: 缩小

##### `wheelZoom(mouseX: number, deltaY: number)`
滚轮缩放（便捷方法）

##### `startPan(mouseX: number)`
开始拖动

##### `updatePan(mouseX: number)`
更新拖动

##### `endPan()`
结束拖动

##### `indexToX(index: number): number`
barIndex → 屏幕X坐标

##### `priceToY(price: number): number`
价格 → 屏幕Y坐标

##### `yToPrice(y: number): number`
屏幕Y坐标 → 价格

---

## 最佳实践

### 1. Y轴自动重算
ViewState会在以下情况自动重算Y轴：
- 切换timeframe
- 缩放
- 平移
- 更新数据

**不需要手动调用任何Y轴计算函数**！

### 2. 性能优化
- 使用`getVisibleData()`只绘制可见K线
- 在`onRangeChange`回调中做节流处理
- 缓存计算结果

### 3. 数据加载策略
- 首次加载：拉取最近600根K线
- 往左：用户靠近左边缘时自动补历史
- 往右：实时行情更新时自动追加

### 4. Timeframe行为
- 点击按钮 → 设置对应可见区间
- 手动缩放/平移 → 自动变为Custom
- Custom状态下不影响继续交互

---

## 常见问题

### Q: Y轴不跟着时间变化？
A: 确保每次缩放/平移后调用`redraw()`，ViewState会自动重算Y轴范围。

### Q: 缩放时锚点位置不对？
A: 检查传入`zoomAt()`的mouseX是否是相对于canvas的坐标，不是屏幕坐标。

### Q: 平移时数据丢失？
A: ViewState会自动触发数据加载，确保实现了`DataLoader`的`loadMoreLeft/loadMoreRight`。

### Q: 如何禁用自动数据加载？
A: 创建ViewState时不传入`loader`参数即可。

---

## 完整工作流程

```
用户操作 → ViewState更新 → 自动触发
   ↓              ↓              ↓
[缩放]        visibleRange    重算Y轴
[平移]        变化            边界检测
[点按钮]      timeframe       补数据
                ↓              ↓
           调用redraw()    onRangeChange
                ↓
            重新绘制图表
```

---

现在你拥有了与TradingView同级别的专业图表交互系统！🎉
