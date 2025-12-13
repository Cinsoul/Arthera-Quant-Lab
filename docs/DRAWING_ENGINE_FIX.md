# DrawingEngine 初始化错误修复

## 问题描述

在调试模式下（Ctrl+Shift+V），调试面板显示错误：
```
❌ DrawingEngine not initialized
```

## 问题根因

1. **时序问题**：DrawingEngine的初始化useEffect依赖数组是空的`[]`，但它需要`canvasRef.current`存在
2. **React渲染顺序**：在组件首次渲染时，canvasRef可能还未挂载
3. **依赖冲突**：设置绘图工具的useEffect可能在DrawingEngine初始化之前执行

## 修复方案

### 1. 添加Canvas准备状态标志

```typescript
const [isCanvasReady, setIsCanvasReady] = useState(false);
```

### 2. 检测Canvas准备就绪

```typescript
useEffect(() => {
  if (canvasRef.current && !isCanvasReady) {
    setIsCanvasReady(true);
    debug.log('✅ Canvas is ready');
  }
}, [isCanvasReady]);
```

### 3. 修改DrawingEngine初始化依赖

```typescript
useEffect(() => {
  if (isCanvasReady && canvasRef.current && !drawingEngineRef.current) {
    debug.log('🎨 Initializing DrawingEngine V2...');
    drawingEngineRef.current = new DrawingEngineV2();
    drawingEngineRef.current.setCanvas(canvasRef.current);
    debug.log('✅ DrawingEngine V2 initialized');
    
    // ... 事件监听和清理
  }
}, [isCanvasReady]); // 依赖于canvas准备状态
```

### 4. 智能错误处理

```typescript
useEffect(() => {
  if (drawingEngineRef.current) {
    // DrawingEngine已初始化，设置工具
    drawingEngineRef.current.setTool(selectedDrawingTool);
  } else if (isCanvasReady) {
    // Canvas已准备但DrawingEngine未初始化，这是真正的错误
    debug.error('❌ DrawingEngine not initialized despite canvas being ready');
  } else {
    // Canvas还未准备好，这是正常情况，等待初始化
    debug.log('⏳ Waiting for canvas to be ready...');
  }
}, [selectedDrawingTool, isCanvasReady]);
```

## 修复效果

✅ **确保正确的初始化顺序**
- Canvas先挂载 → isCanvasReady设置为true → DrawingEngine初始化

✅ **避免误报错误**
- 只在真正出错时报告错误（Canvas已准备但Engine未初始化）
- 正常等待时不显示错误信息

✅ **保持健壮性**
- 所有DrawingEngine访问都有null检查
- 使用可选链操作符`?.`或条件判断`if`

## 验证清单

- [x] 添加`isCanvasReady`状态标志
- [x] 创建Canvas准备检测useEffect
- [x] 修改DrawingEngine初始化依赖
- [x] 更新工具设置的错误处理
- [x] 确保所有DrawingEngine访问都有null检查
- [x] 添加调试日志便于问题追踪

## 测试建议

1. **正常启动测试**
   - 打开应用
   - 按Ctrl+Shift+V打开调试面板
   - 检查"Drawing Count"是否正常显示0
   - 不应该看到"DrawingEngine not initialized"错误

2. **绘图工具切换测试**
   - 点击左侧绘图工具栏
   - 切换不同的绘图工具
   - 检查控制台日志，应该看到"✅ Tool set successfully"

3. **绘图功能测试**
   - 选择趋势线工具
   - 在图表上绘制线条
   - 检查线条是否正确显示
   - 按Esc取消，按Delete删除

## 相关文件

- `/components/TradingChart/EnhancedTradingChartV2.tsx` - 主要修复
- `/components/TradingChart/DrawingEngineV2.ts` - 绘图引擎
- `/components/TradingChart/DrawingTypes.ts` - 类型定义
- `/components/TradingChart/DrawingTools.ts` - 工具注册表

## 注意事项

⚠️ **不要移除null检查**
所有对`drawingEngineRef.current`的访问都应该有null检查，因为：
- 组件生命周期中可能存在Engine未初始化的瞬间
- 清理函数执行后Engine会被设置为null
- 防御性编程可以提高健壮性

⚠️ **调试日志**
生产环境应该将`DEV_MODE.enableDebugLogs`设置为false，但错误日志仍然会显示。
