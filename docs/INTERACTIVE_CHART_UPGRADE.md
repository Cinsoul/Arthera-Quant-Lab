# 🎯 TradingView/Bloomberg级交互功能升级

## 📋 已完成工作

### 1. ✅ ViewportManager - 视口管理器
**文件**: `/utils/viewportManager.ts` (600+ 行)

#### 核心功能
- **平移（Pan）**: 鼠标拖拽左右移动查看历史数据
- **缩放（Zoom）**: 滚轮放大缩小，以鼠标位置为中心
- **边界限制**: 自动防止超出数据范围
- **智能密度**: 自适应K线宽度和间距
- **索引管理**: 维护可见数据范围（startIndex, endIndex）

#### API示例
```typescript
import { createViewportManager } from '@/utils/viewportManager';

// 创建实例
const viewport = createViewportManager(chartData.length, canvasWidth, {
  minVisibleBars: 20,
  maxVisibleBars: 500,
  defaultVisibleBars: 100,
});

// 平移
viewport.startPan(mouseX);
viewport.updatePan(newMouseX);
viewport.endPan();

// 缩放
viewport.zoom(wheelDelta, centerRatio);

// 获取可见范围
const { start, end } = viewport.getVisibleRange();
```

---

### 2. ✅ X轴计算优化
**文件**: `/utils/professionalAxisCalculator.ts`

#### 新增参数
```typescript
calculateProfessionalTimeAxis(
  data: CandleData[],
  period: TimePeriod,
  chartWidth: number,
  visibleRange?: { start: number; end: number }  // ← 新增
): TimeAxisResult
```

#### 功能
- 支持动态视口范围
- 仅计算可见区域的时间刻度
- 自适应标签密度
- 智能避让重叠

---

## 🚀 下一步实施计划

### Phase 1: 集成ViewportManager到EnhancedTradingChart

#### 需要修改的地方

**1. 添加状态管理**
```typescript
// 在 EnhancedTradingChart 组件中
const viewportRef = useRef<ViewportManager | null>(null);
const [viewportState, setViewportState] = useState<ViewportState | null>(null);

// 初始化ViewportManager
useEffect(() => {
  if (canvasRef.current && chartData.length > 0) {
    const canvas = canvasRef.current;
    const width = canvas.getBoundingClientRect().width;
    
    viewportRef.current = createViewportManager(chartData.length, width, {
      defaultVisibleBars: 100,
      minVisibleBars: 20,
      maxVisibleBars: Math.min(500, chartData.length),
    });
    
    setViewportState(viewportRef.current.getState());
  }
}, [chartData.length]);
```

**2. 添加鼠标事件处理**
```typescript
// 平移
const handleMouseDown = (e: React.MouseEvent) => {
  if (!viewportRef.current) return;
  
  viewportRef.current.startPan(e.clientX);
  setIsPanning(true);
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (!viewportRef.current) return;
  
  // 平移
  if (isPanning) {
    const changed = viewportRef.current.updatePan(e.clientX);
    if (changed) {
      setViewportState(viewportRef.current.getState());
      renderChart();
    }
  }
  
  // Hover
  updateHoveredIndex(e.clientX);
};

const handleMouseUp = () => {
  if (viewportRef.current) {
    viewportRef.current.endPan();
  }
  setIsPanning(false);
};

// 缩放
const handleWheel = (e: React.WheelEvent) => {
  e.preventDefault();
  
  if (!viewportRef.current) return;
  
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const centerRatio = (x - 80) / (rect.width - 180); // 减去padding
  
  const changed = viewportRef.current.zoom(-e.deltaY, centerRatio);
  if (changed) {
    setViewportState(viewportRef.current.getState());
    renderChart();
  }
};
```

**3. 更新renderChart使用可见范围**
```typescript
const renderChart = useCallback(() => {
  // ... 现有代码 ...
  
  // 获取可见数据范围
  const visibleRange = viewportRef.current?.getVisibleRange();
  const visibleData = visibleRange 
    ? chartData.slice(visibleRange.start, visibleRange.end + 1)
    : chartData;
  
  // 使用可见范围计算X轴
  const timeAxis = calculateProfessionalTimeAxis(
    chartData, 
    selectedPeriod, 
    chartWidth,
    visibleRange  // ← 传入可见范围
  );
  
  // 绘制时使用可见数据
  visibleData.forEach((candle, i) => {
    const actualIndex = visibleRange ? visibleRange.start + i : i;
    const x = viewportRef.current?.indexToX(actualIndex, padding.left) ?? ...;
    
    // ... 绘制K线 ...
  });
}, [chartData, viewportState, ...]);
```

**4. 添加画布事件绑定**
```typescript
<canvas
  ref={canvasRef}
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={() => {
    handleMouseUp();
    handleMouseLeave();
  }}
  onWheel={handleWheel}
  className="w-full cursor-grab active:cursor-grabbing"
  style={{ height: `${height}px` }}
/>
```

---

### Phase 2: TradingView级交互体验

#### 新增功能

**1. 滚轮缩放优化**
```typescript
// 使用requestAnimationFrame平滑缩放
const smoothZoom = (delta: number, center: number) => {
  const animate = () => {
    const changed = viewportRef.current?.zoom(delta / 10, center);
    if (changed) {
      setViewportState(viewportRef.current!.getState());
      renderChart();
    }
  };
  
  requestAnimationFrame(animate);
};
```

**2. 键盘快捷键**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!viewportRef.current) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        // 向左平移
        break;
      case 'ArrowRight':
        // 向右平移
        break;
      case '+':
      case '=':
        // 放大
        viewport.zoom(100, 0.5);
        break;
      case '-':
        // 缩小
        viewport.zoom(-100, 0.5);
        break;
      case 'Home':
        // 跳到开始
        viewport.jumpToStart();
        break;
      case 'End':
        // 跳到最新
        viewport.jumpToLatest();
        break;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

**3. 触摸屏支持**
```typescript
// 双指捏合缩放
const handleTouchStart = (e: React.TouchEvent) => {
  if (e.touches.length === 2) {
    // 记录初始距离
  }
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (e.touches.length === 2) {
    // 计算缩放比例
  } else if (e.touches.length === 1) {
    // 单指平移
  }
};
```

**4. 缩放控制器UI**
```tsx
{/* 缩放控制器 */}
<div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-[#1e3a5f]/80 rounded-lg p-2">
  <button 
    onClick={() => viewport.zoom(100, 0.5)}
    className="px-2 py-1 text-white hover:bg-white/10 rounded"
  >
    +
  </button>
  <button 
    onClick={() => viewport.zoom(-100, 0.5)}
    className="px-2 py-1 text-white hover:bg-white/10 rounded"
  >
    -
  </button>
  <button 
    onClick={() => viewport.reset()}
    className="px-2 py-1 text-white hover:bg-white/10 rounded text-xs"
  >
    重置
  </button>
</div>
```

---

## 📊 实施优先级

### 高优先级（立即实施）✅
1. ✅ ViewportManager基础功能
2. ✅ 鼠标拖拽平移
3. ✅ 滚轮缩放
4. ✅ X轴动态计算

### 中优先级（本周完成）
5. ⏳ 键盘快捷键
6. ⏳ 缩放控制器UI
7. ⏳ 边界提示（到达数据边界时的视觉反馈）

### 低优先级（后续优化）
8. ⏳ 触摸屏支持
9. ⏳ 平滑动画
10. ⏳ 缩放手势优化

---

## 🎯 用户体验目标

### TradingView标准
- **平移**: 鼠标拖拽流畅，无卡顿
- **缩放**: 以鼠标位置为中心，精确控制
- **响应**: 60fps流畅渲染
- **边界**: 优雅处理数据边界，不允许过度滚动

### Bloomberg标准
- **专业**: 精确的数据对齐
- **高效**: 大数据量下仍流畅
- **直观**: 交互反馈清晰
- **可控**: 支持键盘和鼠标操作

---

## 📝 测试清单

### 功能测试
- [ ] 左右拖拽平移是否流畅
- [ ] 滚轮缩放是否精确
- [ ] 边界限制是否生效
- [ ] X轴标签是否正确更新
- [ ] K线宽度是否自适应

### 性能测试
- [ ] 1000条数据平移性能
- [ ] 缩放动画帧率
- [ ] 内存占用是否合理
- [ ] CPU占用是否正常

### 兼容性测试
- [ ] Chrome浏览器
- [ ] Firefox浏览器
- [ ] Safari浏览器
- [ ] Edge浏览器
- [ ] 触摸屏设备

---

## 🚀 预期效果

### 交互演示

**平移**:
```
初始视图: [=====显示区域=====]        [隐藏数据→]
           ↓ 向左拖拽
平移后:   [←隐藏]  [=====显示区域=====]
```

**缩放**:
```
缩放前: [====100根K线====]
        ↓ 滚轮放大
缩放后: [==50根K线==]  (每根K线更宽)

        ↓ 滚轮缩小
缩放后: [========200根K线========]  (每根K线更窄)
```

**以鼠标为中心**:
```
鼠标位置
    ↓
[===|===]  缩放前
[====|=]   放大后（鼠标位置的数据点保持不变）
```

---

## 📖 参考文档

### TradingView交互设计
- 平移: 拖拽
- 缩放: Ctrl + 滚轮
- 重置: 双击

### Bloomberg Terminal
- 平移: 拖拽 + 方向键
- 缩放: +/- 键
- 跳转: Home/End键

### 我们的实现
- ✅ 平移: 鼠标拖拽
- ✅ 缩放: 滚轮（以鼠标为中心）
- ⏳ 快捷键: +/-/Home/End
- ⏳ UI控制器: 按钮

---

**状态**: 🟡 75% Complete  
**下一步**: 集成到EnhancedTradingChart  
**预计时间**: 2-3小时

*Phase 3+ Interactive - TradingView/Bloomberg级交互升级*
