# 图表调试面板使用指南

## 概述
Bloomberg Terminal风格的专业级调试面板，用于实时监控图表系统的性能、状态和交互信息。

## 快捷键

### Ctrl+Shift+V - 切换调试面板
按下 `Ctrl+Shift+V` 可以显示/隐藏调试面板。调试面板会浮动在图表的右上角。

### 其他调试快捷键
- `Ctrl+Shift+D` - 切换调试日志（控制台输出）
- `Ctrl+Shift+P` - 切换性能监控（控制台输出）

## 调试面板功能

### 1. Performance Metrics（性能指标）
实时监控图表渲染性能：

- **FPS** - 帧率（绿色≥50，黄色≥30，红色<30）
- **Render Time** - 每帧渲染时间（毫秒）
- **Frame Count** - 总帧数
- **Draw Calls** - 绘制调用次数

### 2. Viewport State（视图状态）
显示当前视口的状态信息：

- **Visible Range** - 可见K线的索引范围
- **Visible Bars** - 可见K线数量
- **Bar Width** - 单根K线的宽度（像素）
- **Zoom Level** - 缩放级别（百分比）

### 3. Data Statistics（数据统计）
显示图表数据的统计信息：

- **Total Bars** - 总K线数量
- **Data Granularity** - 数据粒度（1min/5min/1hour/1day等）
- **Symbol** - 股票代码
- **Period** - 时间周期（1D/5D/1M等）

### 4. Interaction State（交互状态）
显示当前的交互状态：

- **Chart Type** - 图表类型（蜡烛图/折线图等）
- **Drawing Tool** - 当前选中的绘图工具
- **Crosshair** - 十字光标开关状态
- **Drawing Count** - 绘图对象数量

### 5. Active Indicators（激活的技术指标）
显示当前激活的所有技术指标列表，如MA5、MA10、MACD等。

### 6. Canvas Info（Canvas信息）
显示Canvas画布的详细信息：

- **Width** - Canvas宽度（像素）
- **Height** - Canvas高度（像素）
- **Device Pixel Ratio** - 设备像素比

## 控制台命令

除了键盘快捷键，你也可以在浏览器控制台中使用以下命令：

```javascript
// 切换调试日志
window.toggleChartDebug()

// 切换性能监控
window.toggleChartPerf()

// 切换调试面板
window.toggleDebugPanel()
```

## 使用场景

### 性能优化
1. 打开调试面板（Ctrl+Shift+V）
2. 观察FPS和Render Time
3. 执行平移、缩放等操作
4. 查看性能指标变化
5. 根据数据优化代码

### 调试交互问题
1. 打开调试面板
2. 查看Viewport State确认视图范围
3. 查看Interaction State确认交互状态
4. 验证数据是否正确加载

### 调试绘图功能
1. 打开调试面板
2. 查看Drawing Count确认绘图对象数量
3. 选择不同的绘图工具
4. 观察Drawing Tool状态变化

## 设计特点

- **Bloomberg Terminal风格** - 深蓝色系，专业精致
- **实时更新** - 所有数据实时刷新
- **高信息密度** - 紧凑布局，最大化信息展示
- **专业配色** - 性能指标采用红黄绿配色方案
- **优雅滚动** - 自定义滚动条，符合整体设计风格
- **一键关闭** - 点击右上角X或按Ctrl+Shift+V关闭

## 技术实现

### 状态管理
```typescript
const [debugMode, setDebugMode] = useState(DEV_MODE.showDebugPanel);
const [perfMetrics, setPerfMetrics] = useState({
  renderTime: 0,
  fps: 0,
  frameCount: 0,
  lastFrameTime: 0,
  drawCalls: 0,
});
```

### 性能监控
在每次渲染时自动更新性能指标：
```typescript
if (DEV_MODE.showPerformanceMetrics || DEV_MODE.showDebugPanel) {
  frameCounter.current++;
  const now = performance.now();
  const deltaTime = now - lastRenderTime.current;
  setPerfMetrics({
    renderTime: renderTime,
    fps: deltaTime > 0 ? Math.round(1000 / deltaTime) : 0,
    frameCount: frameCounter.current,
    lastFrameTime: deltaTime,
    drawCalls: 1,
  });
}
```

### 事件监听
监听全局调试面板切换事件：
```typescript
useEffect(() => {
  const handleDebugToggle = () => {
    setDebugMode(DEV_MODE.showDebugPanel);
  };
  window.addEventListener('chart-panel-toggle', handleDebugToggle);
  return () => {
    window.removeEventListener('chart-panel-toggle', handleDebugToggle);
  };
}, []);
```

## 注意事项

1. **生产环境** - 建议在生产环境中关闭调试面板，将`DEV_MODE.showDebugPanel`设为`false`
2. **性能影响** - 调试面板本身会占用少量性能，实际应用性能会略高于显示的数值
3. **数据刷新** - 所有数据都是实时刷新的，无需手动刷新
4. **响应式设计** - 调试面板采用固定宽度，在小屏幕上可能需要手动关闭

## 未来改进

- [ ] 可拖拽调试面板位置
- [ ] 可调整调试面板大小
- [ ] 支持数据导出（导出性能日志）
- [ ] 添加历史性能图表
- [ ] 支持自定义监控指标
- [ ] 添加内存使用监控
- [ ] 支持录制和回放交互操作
