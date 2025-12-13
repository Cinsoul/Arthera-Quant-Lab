# 图表ViewState集成待办清单

## ✅ 已完成

1. ✅ 创建新的`chartViewState.ts`系统
2. ✅ 升级`professionalAxisCalculator.ts`支持visibleRange
3. ✅ 删除废弃文件（13个）
4. ✅ 编写完整使用文档

---

## 🔄 待集成（下次会话）

### 步骤1：更新EnhancedTradingChartV2.tsx

**文件位置**：`/components/TradingChart/EnhancedTradingChartV2.tsx`

**需要修改的地方**：

1. **导入部分（第15-40行）**
```typescript
// 删除
import { createViewportManager, type ViewportManager } from '../../utils/viewportManager';

// 替换为
import { createChartViewState, type ChartViewStateManager, type Bar } from '../../utils/chartViewState';
```

2. **Ref定义（第126行）**
```typescript
// 删除
const viewportManagerRef = useRef<ViewportManager | null>(null);

// 替换为
const viewportManagerRef = useRef<ChartViewStateManager | null>(null);
```

3. **ViewportState类型（第133行）**
```typescript
// 删除
const [viewportState, setViewportState] = useState<ViewportState | null>(null);

// 替换为
const [viewportState, setViewportState] = useState<ReturnType<ChartViewStateManager['getState']> | null>(null);
```

4. **初始化ViewportManager（第208-267行）**
```typescript
// 完全替换这一段
useEffect(() => {
  const canvas = canvasRef.current;
  
  if (chartData.length === 0) {
    if (viewportManagerRef.current) {
      viewportManagerRef.current = null;
      setViewportState(null);
    }
    return;
  }
  
  if (!canvas) return;
  
  if (viewportManagerRef.current) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  
  // 转换数据格式为Bar[]
  const bars: Bar[] = chartData.map(d => ({
    time: new Date(d.timestamp),
    timestamp: d.timestamp,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
  }));
  
  viewportManagerRef.current = createChartViewState(
    bars,
    rect.width,
    rect.height
  );
  
  viewportManagerRef.current.applyTimeframe(selectedPeriod);
  const initialState = viewportManagerRef.current.getState();
  
  setViewportState(initialState);
}, [chartData.length, selectedPeriod]);
```

5. **更新canvas尺寸（第269-282行）**
```typescript
// 修改
useEffect(() => {
  if (!viewportManagerRef.current) return;

  const canvas = canvasRef.current;
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    viewportManagerRef.current.setCanvasSize(rect.width, rect.height);
  }
  
  setViewportState(viewportManagerRef.current.getState());
}, [chartData.length]);
```

6. **Period变化处理（第284-310行）**
```typescript
// 简化
useEffect(() => {
  if (!viewportManagerRef.current || chartData.length === 0) return;

  viewportManagerRef.current.applyTimeframe(selectedPeriod);
  const newState = viewportManagerRef.current.getState();
  
  setViewportState(newState);
}, [selectedPeriod, chartData.length]);
```

7. **鼠标滚轮处理（第1083-1185行）**
```typescript
// 完全替换
const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
  e.preventDefault();
  
  const canvas = canvasRef.current;
  const viewportManager = viewportManagerRef.current;
  if (!canvas || !viewportManager) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  
  // 使用新的wheelZoom API
  viewportManager.wheelZoom(mouseX, e.deltaY);
  
  setViewportState(viewportManager.getState());
};
```

8. **鼠标平移处理（第1020-1081行）**
```typescript
// handleMouseMove
const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;
  const viewportManager = viewportManagerRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const padding = { left: 80, right: 100 };
  const chartWidth = rect.width - padding.left - padding.right;

  // 处理hover（保持不变）
  if (viewportState) {
    const state = viewportState;
    const relativeX = x - padding.left;
    const visibleRange = state.visibleEnd - state.visibleStart;
    const relativeIndex = (relativeX / chartWidth) * visibleRange;
    const globalIndex = Math.floor(state.visibleStart + relativeIndex);
    
    if (globalIndex >= 0 && globalIndex < chartData.length) {
      setHoveredIndex(globalIndex);
    }
  }
};

// handleMouseDown
const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;
  const viewportManager = viewportManagerRef.current;
  if (!canvas || !viewportManager) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  
  viewportManager.startPan(x);
};

// handleMouseUp
const handleMouseUp = () => {
  viewportManagerRef.current?.endPan();
};
```

9. **renderChart函数中的visibleRange（第394-447行）**
```typescript
// 修改可见数据获取
const hasValidViewport = viewportManagerRef.current && viewportState;

const visibleData = hasValidViewport
  ? viewportManagerRef.current.getVisibleData()
  : chartData;

// 修改X轴计算
const timeAxis = calculateProfessionalTimeAxis(
  chartData,
  selectedPeriod,
  chartWidth,
  hasValidViewport
    ? {
        start: viewportState.visibleStart,
        end: viewportState.visibleEnd
      }
    : undefined
);

// Y轴已经在ViewState中自动计算了！
// 使用state中的priceMin/priceMax
const minPrice = viewportState?.priceMin || Math.min(...visibleData.map(d => d.low));
const maxPrice = viewportState?.priceMax || Math.max(...visibleData.map(d => d.high));
```

---

### 步骤2：测试集成

**测试项目**：

1. **基础功能**
   - [ ] 刷新页面，图表正常显示
   - [ ] 切换Timeframe（1D/5D/1M...），X轴范围正确
   - [ ] Y轴自动跟随时间范围调整

2. **缩放功能**
   - [ ] 滚轮向上，图表放大（鼠标位置不变）
   - [ ] 滚轮向下，图表缩小（鼠标位置不变）
   - [ ] 达到最小/最大缩放限制时停止

3. **平移功能**
   - [ ] 鼠标拖动，图表平移
   - [ ] 平移到左边界时停止
   - [ ] 平移到右边界时停止

4. **性能测试**
   - [ ] 快速连续缩放，无卡顿
   - [ ] 快速连续平移，无延迟
   - [ ] 切换Timeframe，响应迅速

---

### 步骤3：其他图表组件（可选）

如果其他图表组件也需要缩放平移功能，可以参考EnhancedTradingChartV2的集成方式：

- `/components/TradingChart/FullTradingChart.tsx`
- `/components/TradingChart/CompactTradingChart.tsx`
- `/components/TradingChart/BloombergChart.tsx`

---

## 📝 注意事项

1. **数据格式转换**
   - `chartData`（CandleData[]）需要转换为`Bar[]`
   - 确保包含所有必需字段（time, timestamp, open, high, low, close, volume）

2. **状态同步**
   - 每次ViewState变化都要调用`setViewportState()`
   - 确保renderChart在viewportState变化时触发

3. **类型检查**
   - ViewState的类型已经改变
   - 检查所有使用`viewportState`的地方

4. **向后兼容**
   - 如果数据为空，ViewState为null，组件应该正常降级

---

## 🎯 预期结果

集成完成后，用户应该能够：

1. ✅ 像TradingView一样精确缩放（鼠标位置作为锚点）
2. ✅ 流畅拖动平移（无抖动无延迟）
3. ✅ Y轴自动跟随X轴范围变化
4. ✅ 切换Timeframe时自动调整可见区间
5. ✅ 在控制台看到详细的调试日志

---

**建议执行时间**：下次会话（需要充足时间测试）  
**预计所需时间**：30-45分钟
