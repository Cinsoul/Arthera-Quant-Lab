# 绘图工具调试指南

## 问题描述
用户选择绘图工具（如趋势线）后，在画布上拖动时仍然会平移图表，而不是绘制线条。

## 调试流程

### 1. 查看浏览器控制台日志

当用户选择绘图工具并尝试绘图时，应该看到以下日志序列：

#### 步骤 1: 选择工具
```
[Chart] ========== Drawing Tool Changed ==========
[Chart] New selectedDrawingTool: trendline
[Chart] DrawingEngine exists: true
[DrawingEngine] setTool called: trendline
[DrawingEngine] activeTool set to: trendline
[Chart] Tool set in DrawingEngine
```

✅ **检查点**: 
- `selectedDrawingTool` 应该是你选择的工具ID（如 'trendline', 'hline', 'ray' 等）
- `DrawingEngine exists` 应该是 `true`
- `activeTool set to` 应该和你选择的工具一致

#### 步骤 2: 鼠标按下（开始绘图）
```
[Chart] ========== handleMouseDown ==========
[Chart] selectedDrawingTool: trendline
[Chart] DrawingEngine exists: true
[DrawingEngine] ========== handleMouseDown ==========
[DrawingEngine] Coordinate transforms available: { screenToWorld: true, worldToScreen: true }
[DrawingEngine] Current state: { activeTool: 'trendline', mode: 'idle', button: 0 }
[DrawingEngine] World point: { t: 1234567890, p: 1850.25 }
[DrawingEngine] → Calling handleDrawMouseDown
[DrawingEngine] ========== handleDrawMouseDown ==========
[DrawingEngine] activeTool: trendline
[DrawingEngine] worldPoint: { t: 1234567890, p: 1850.25 }
[DrawingEngine] tool found: YES (趋势线)
[DrawingEngine] ✅ tempObject created: { id: 'drawing_...', type: 'trendline', ... }
[DrawingEngine] ✅ mode set to: drawing
[DrawingEngine] Tool requires 2 points
[DrawingEngine] After mouseDown, mode is now: drawing
[Chart] Non-select tool detected! Tool: trendline
[Chart] BLOCKING pan - isDragging will NOT be set to true
[Chart] User should now be in drawing mode
```

✅ **检查点**:
- `Coordinate transforms available` 中两个值都应该是 `true`
- `activeTool` 应该和你选择的工具一致
- `tool found` 应该是 `YES (工具名称)`
- `mode set to: drawing` - 这是关键！
- `BLOCKING pan` - 这表示图表平移被阻止了

❌ **常见问题**:
- 如果 `screenToWorld: false` 或 `worldToScreen: false`，说明坐标转换函数没有设置
- 如果 `tool found: NOT FOUND`，说明工具ID不匹配或工具未注册
- 如果 `mode` 没有变成 `drawing`，说明创建tempObject失败

#### 步骤 3: 鼠标移动（绘制过程）
```
[DrawingEngine] handleMouseMove - mode: drawing
[DrawingEngine] Drawing mode active - handling draw move
[DrawingEngine] handleDrawMouseMove - tempObject exists: true
[DrawingEngine] ✅ Updating drawing, worldPoint: { t: 1234567891, p: 1852.30 }
[DrawingEngine] Returning TRUE to block other interactions
[Chart] handleMouseMove - DrawingEngine blocking interaction (drawing in progress)
[Chart] → Skipping pan and hover updates
```

✅ **检查点**:
- `mode: drawing` - 确认处于绘图模式
- `tempObject exists: true` - 临时对象存在
- `Returning TRUE to block other interactions` - 阻止其他交互
- `Skipping pan and hover updates` - 图表不应平移

❌ **常见问题**:
- 如果 `mode: idle`，说明mouseDown时没有成功进入drawing模式
- 如果 `tempObject exists: false`，说明临时对象创建失败
- 如果看到 `Pan mode active (isDragging = true)`，说明被错误地当作平移处理

#### 步骤 4: 鼠标抬起（完成绘图）
```
[DrawingEngine] handleMouseUp - mode: drawing
[DrawingEngine] Drawing completed, adding to objects
```

## 故障排查

### 问题 1: 坐标转换函数未设置

**症状**:
```
[DrawingEngine] Coordinate transforms available: { screenToWorld: false, worldToScreen: false }
[DrawingEngine] ❌ Coordinate transforms not set! Cannot handle mouse down.
```

**原因**: DrawingEngine的坐标转换函数在renderChart中设置，可能是：
1. renderChart还没有被调用
2. drawingEngineRef.current为null

**解决方案**: 确保在组件初始化时正确创建DrawingEngine实例。

### 问题 2: 工具ID不匹配

**症状**:
```
[DrawingEngine] tool found: NOT FOUND
[DrawingEngine] ❌ Tool not found or no onStart handler for: trend-line
[DrawingEngine] Available tools: ['trendline', 'hline', 'vline', ...]
```

**原因**: UI中使用的工具ID（如'trend-line'）和DrawingTools.ts中注册的ID（如'trendline'）不匹配。

**解决方案**: 确保drawingToolCategories中的tool.id和DRAWING_TOOLS中的key完全一致。

### 问题 3: 绘图模式未激活

**症状**:
```
[DrawingEngine] handleMouseMove - mode: idle
[Chart] handleMouseMove - DrawingEngine returned FALSE, continuing with normal interactions
[Chart] handleMouseMove - Pan mode active (isDragging = true)
```

**原因**: 
1. handleDrawMouseDown没有成功创建tempObject
2. mode没有被设置为'drawing'
3. 工具定义中缺少onStart函数

**解决方案**: 检查工具定义，确保有完整的onStart、onUpdate、render等函数。

### 问题 4: 图表仍然平移

**症状**:
即使选择了绘图工具，拖动时图表仍然平移。

**可能原因**:
1. `isDragging` 状态在mouseDown时被错误设置为true
2. DrawingEngine.handleMouseMove返回了false
3. EnhancedTradingChart的handleMouseDown中的阻止逻辑被跳过

**检查清单**:
- [ ] `selectedDrawingTool !== 'select'` 条件是否正确判断
- [ ] `DrawingEngine.state.mode` 是否为 'drawing'
- [ ] `DrawingEngine.handleMouseMove` 是否返回 true
- [ ] `handleMouseDown` 中是否正确 return 阻止后续代码执行

## 正确的工作流程

```
用户选择工具 (trendline)
    ↓
setSelectedDrawingTool('trendline')
    ↓
useEffect 触发 → drawingEngine.setTool('trendline')
    ↓
DrawingEngine.state.activeTool = 'trendline'
    ↓
用户 mouseDown
    ↓
EnhancedChart.handleMouseDown
    ↓
DrawingEngine.handleMouseDown
    → handleDrawMouseDown
    → 创建 tempObject
    → state.mode = 'drawing'  ← 关键！
    ↓
EnhancedChart 检查 selectedDrawingTool !== 'select'
    → return (阻止设置 isDragging)  ← 关键！
    ↓
用户 mouseMove
    ↓
EnhancedChart.handleMouseMove
    ↓
DrawingEngine.handleMouseMove
    → state.mode === 'drawing'
    → handleDrawMouseMove
    → 返回 TRUE  ← 关键！
    ↓
EnhancedChart 收到 shouldBlock = true
    → return (跳过平移和hover)  ← 关键！
```

## 调试命令

在浏览器控制台中，可以使用以下命令检查状态：

```javascript
// 检查选中的工具
console.log('Selected tool:', selectedDrawingTool);

// 检查DrawingEngine状态（需要在代码中暴露）
// drawingEngineRef.current?.getState()

// 检查isDragging状态
console.log('Is dragging:', isDragging);
```

## 已修复的问题

### 2024-12-10 优化
- ✅ 增强了 DrawingEngine.handleMouseDown 的日志
- ✅ 增强了 DrawingEngine.handleMouseMove 的日志
- ✅ 添加了坐标转换函数检查的警告
- ✅ 在 EnhancedChart.handleMouseMove 中添加了更详细的状态日志

### 下一步调试计划

1. **收集完整日志**: 请选择一个绘图工具，尝试绘图，并复制完整的控制台日志
2. **对比正确流程**: 将实际日志和本文档中的"正确工作流程"对比
3. **定位问题节点**: 找出哪一步的输出和预期不符
4. **针对性修复**: 根据问题类型应用相应的解决方案

## 联系支持

如果按照本指南仍无法解决问题，请提供：
1. 完整的控制台日志（从选择工具到尝试绘图）
2. 选择的工具名称
3. 浏览器和操作系统信息
