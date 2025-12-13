# 图表时间轴优化 - 调试指南

## 🔍 问题诊断

用户反馈：切换时间档位（1D/5D/1M/3M/6M/1Y/YTD）时，图表显示的数据范围没有按预期变化。

## ✅ 已实现的更新

### 1. ViewportManager新方法
在`/utils/viewportManager.ts`中添加了`setVisibleRangeByPeriod`方法，包含：
- 交易日数量映射（1D=1天，5D=5天，1M=21天，等）
- YTD动态计算（从今年1月1日到当前）
- 详细的console.log调试信息

### 2. 图表组件监听
在`/components/TradingChart/EnhancedTradingChartV2.tsx`中添加了useEffect：
- 监听`selectedPeriod`和`chartData.length`变化
- 自动调用`viewportManager.setVisibleRangeByPeriod`
- 输出详细的调试日志

### 3. X轴刻度优化
在`/utils/professionalAxisCalculator.ts`中优化了：
- 刻度数量控制（5-9个）
- 智能时间格式选择
- 分层显示逻辑

## 🐛 调试步骤

### 步骤1：检查console日志

打开浏览器开发者工具（F12），切换到Console标签，查看以下日志：

#### 期望看到的日志序列：

```javascript
// 1. 数据加载
[EnhancedTradingChart] Data status: {
  symbol: "600519",
  loading: false,
  error: null,
  hasExternalData: false,
  serviceDataLength: 240,
  chartDataLength: 240
}

// 2. Period变化触发
[EnhancedTradingChart] Period changed, updating viewport range: {
  selectedPeriod: "3M",
  chartDataLength: 240,
  firstDataPoint: "12/1/2023",
  lastDataPoint: "8/31/2024"
}

// 3. ViewportManager处理
[ViewportManager] setVisibleRangeByPeriod called: {
  period: "3M",
  totalDataPoints: 240,
  hasData: true,
  dataLength: 240
}

[ViewportManager] Period calculation: {
  period: "3M",
  tradingDays: 63,
  startIndex: 177,  // 240 - 63 + 1 = 178
  endIndex: 239
}

[ViewportManager] Final state: {
  startIndex: 177,
  endIndex: 239,
  newVisibleBars: 63,
  clampedVisibleBars: 63
}

// 4. 新的viewport状态
[EnhancedTradingChart] New viewport state: {
  startIndex: 177,
  endIndex: 239,
  visibleBars: 63
}
```

### 步骤2：验证数据范围

#### 理论计算：

假设有240个数据点（大约1年的日K数据）：

| 档位 | 交易日数 | 预期startIndex | 预期endIndex | 预期visibleBars |
|-----|--------|--------------|-------------|----------------|
| 1D  | 1      | 239          | 239         | 1              |
| 5D  | 5      | 235          | 239         | 5              |
| 1M  | 21     | 219          | 239         | 21             |
| 3M  | 63     | 177          | 239         | 63             |
| 6M  | 126    | 114          | 239         | 126            |
| 1Y  | 252    | 0            | 239         | 240 (全部)      |
| YTD | 动态    | 取决于今年1月1日的位置 | 239 | 动态 |

#### 实际验证方法：

1. 打开图表，切换到1D档位
2. 检查console日志中的`startIndex`和`endIndex`
3. 应该看到只显示最后1个数据点

### 步骤3：检查effect触发

如果没有看到日志，说明effect可能没有触发。检查以下问题：

#### 问题A：selectedPeriod没有变化
```javascript
// 检查handlePeriodChange是否被调用
const handlePeriodChange = (newPeriod: TimePeriod) => {
  console.log('[DEBUG] handlePeriodChange called:', newPeriod);
  setSelectedPeriod(newPeriod);
  onPeriodChange?.(newPeriod);
};
```

#### 问题B：viewportManagerRef未初始化
```javascript
// 检查viewportManager是否正确创建
useEffect(() => {
  console.log('[DEBUG] ViewportManager initialized:', {
    exists: !!viewportManagerRef.current,
    chartDataLength: chartData.length,
  });
}, [chartData.length]);
```

#### 问题C：chartData.length为0
```javascript
// 检查数据加载状态
useEffect(() => {
  console.log('[DEBUG] Chart data changed:', {
    length: chartData.length,
    first: chartData[0],
    last: chartData[chartData.length - 1],
  });
}, [chartData]);
```

### 步骤4：检查渲染

如果effect触发了但图表没有更新，检查：

#### 问题A：viewportState没有更新
```javascript
// 在renderChart中添加日志
const renderChart = useCallback(() => {
  console.log('[DEBUG] renderChart called:', {
    viewportState,
    visibleDataLength: visibleData.length,
  });
  // ...
}, [viewportState, ...]);
```

#### 问题B：visibleData计算错误
```javascript
// 检查visibleData的切片
const visibleData = viewportManagerRef.current && viewportState
  ? chartData.slice(viewportState.startIndex, viewportState.endIndex + 1)
  : chartData;

console.log('[DEBUG] visibleData:', {
  startIndex: viewportState?.startIndex,
  endIndex: viewportState?.endIndex,
  visibleDataLength: visibleData.length,
  firstDate: visibleData[0]?.date,
  lastDate: visibleData[visibleData.length - 1]?.date,
});
```

## 🔧 可能的问题和解决方案

### 问题1：effect不触发

**原因**：依赖项可能不正确

**解决方案**：
```typescript
// 确保依赖chartData而不是chartData.length
useEffect(() => {
  if (!viewportManagerRef.current || chartData.length === 0) return;
  viewportManagerRef.current.setVisibleRangeByPeriod(selectedPeriod, chartData);
  setViewportState(viewportManagerRef.current.getState());
}, [selectedPeriod, chartData]); // 改为chartData而不是chartData.length
```

### 问题2：初始化顺序问题

**原因**：viewportManager在period effect之前没有初始化

**解决方案**：在初始化viewportManager后立即设置范围
```typescript
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas || viewportManagerRef.current) return;

  const rect = canvas.getBoundingClientRect();
  viewportManagerRef.current = createViewportManager(
    chartData.length,
    rect.width,
    { defaultVisibleBars: 100, minVisibleBars: 20, maxVisibleBars: 500 }
  );
  
  // 立即应用period设置
  viewportManagerRef.current.setVisibleRangeByPeriod(selectedPeriod, chartData);
  setViewportState(viewportManagerRef.current.getState());
}, [chartData.length]);
```

### 问题3：数据服务返回的数据量不足

**原因**：HistoricalDataService只返回了100个数据点

**解决方案**：增加数据请求量
```typescript
const { data: serviceData, loading, error } = useHistoricalData(
  symbol,
  servicePeriod,
  500  // 从100增加到500
);
```

### 问题4：YTD计算错误

**原因**：日期比较逻辑问题

**解决方案**：检查日期对象创建
```typescript
// 确保正确创建Date对象
const dataDate = dataPoint?.timestamp 
  ? new Date(dataPoint.timestamp)
  : dataPoint?.date 
    ? new Date(dataPoint.date)
    : null;

if (!dataDate) continue; // 跳过无效数据

if (dataDate < yearStart) {
  break;
}
```

## 📊 验证清单

### 前端验证

- [ ] 打开浏览器Console，看到数据加载日志
- [ ] 切换1D档位，看到startIndex=239, endIndex=239
- [ ] 切换5D档位，看到startIndex=235, endIndex=239
- [ ] 切换1M档位，看到startIndex=219, endIndex=239
- [ ] 切换3M档位，看到startIndex=177, endIndex=239
- [ ] 图表X轴显示的日期范围正确变化
- [ ] K线数量与档位匹配

### 代码验证

- [ ] `/utils/viewportManager.ts`包含`setVisibleRangeByPeriod`方法
- [ ] `/components/TradingChart/EnhancedTradingChartV2.tsx`包含period监听effect
- [ ] `/utils/professionalAxisCalculator.ts`包含优化的时间轴计算
- [ ] 所有console.log语句都存在

## 🚀 下一步

如果以上调试步骤都正常，但图表仍未更新，可能是：

1. **渲染优化问题**：React的memo或shouldComponentUpdate阻止了重新渲染
2. **Canvas缓存问题**：Canvas内容没有被清除和重绘
3. **状态同步问题**：viewportState和实际渲染的数据不同步

建议添加强制刷新：
```typescript
useEffect(() => {
  if (!viewportManagerRef.current || chartData.length === 0) return;
  
  viewportManagerRef.current.setVisibleRangeByPeriod(selectedPeriod, chartData);
  const newState = viewportManagerRef.current.getState();
  setViewportState(newState);
  
  // 强制重新渲染
  requestAnimationFrame(() => {
    renderChart();
  });
}, [selectedPeriod, chartData.length]);
```

## 📝 技术支持

如果问题仍然存在，请提供以下信息：

1. 完整的Console日志输出
2. 切换档位前后的截图
3. 浏览器和版本
4. 数据点数量（chartData.length）
5. 错误信息（如果有）

这将帮助我们快速定位问题所在。
