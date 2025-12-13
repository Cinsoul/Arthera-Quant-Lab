# 🚀 调试面板快速上手

## 一分钟快速体验

### 第一步：打开调试面板
```
按下键盘：Ctrl + Shift + V
```

### 第二步：观察数据
调试面板会立即出现在图表右上角，显示：
- ✅ FPS（帧率）
- ✅ 渲染时间  
- ✅ 可见K线范围
- ✅ 数据统计
- ✅ 交互状态
- ✅ 技术指标列表

### 第三步：测试交互
1. **平移图表** → 观察 "Visible Range" 变化
2. **滚轮缩放** → 观察 "Zoom Level" 变化
3. **切换图表类型** → 观察 "Chart Type" 变化
4. **选择绘图工具** → 观察 "Drawing Tool" 变化

### 第四步：关闭面板
```
再次按下：Ctrl + Shift + V
或点击面板右上角的 ✕
```

## 性能监控示例

### 检查性能是否达标
打开调试面板，查看 Performance Metrics：

```
✅ 优秀性能:  FPS ≥ 50 (绿色)
⚠️  一般性能:  30 ≤ FPS < 50 (黄色)
❌ 需要优化:  FPS < 30 (红色)
```

### 常见性能问题排查

**问题1: FPS偏低**
- 检查 "Total Bars" 是否过多（>10000）
- 检查 "Active Indicators" 数量（>5个可能影响性能）
- 检查 "Drawing Count" 绘图对象数量

**问题2: Render Time过高**
- 正常范围：5-15ms
- 超过30ms需优化
- 检查是否开启了过多技术指标

## 调试技巧

### 技巧1: 验证数据加载
```
打开调试面板 → 查看 Data Statistics 模块
- Total Bars: 确认数据量
- Data Granularity: 确认数据粒度正确（1min/5min/1hour/1day）
- Symbol: 确认股票代码正确
```

### 技巧2: 检查视图状态
```
平移/缩放图表 → 查看 Viewport State 模块
- Visible Range: 可见K线的起止索引
- Visible Bars: 当前显示多少根K线
- Bar Width: 单根K线宽度（太小可能看不清）
```

### 技巧3: 监控绘图工具
```
使用绘图工具 → 查看 Interaction State 模块
- Drawing Tool: 当前选中的工具
- Drawing Count: 已绘制的对象数量
- 如果count不增加，说明绘图未生效
```

## 控制台命令速查

```javascript
// 方法1: 使用快捷键（推荐）
Ctrl+Shift+V  // 切换调试面板

// 方法2: 使用控制台命令
window.toggleDebugPanel()  // 切换调试面板
window.toggleChartDebug()  // 切换调试日志
window.toggleChartPerf()   // 切换性能监控
```

## 典型使用场景

### 场景1: 新功能开发
1. 打开调试面板
2. 修改代码
3. 观察 FPS 和 Render Time 变化
4. 确保性能不降低

### 场景2: 性能优化
1. 打开调试面板
2. 记录当前 FPS 和 Render Time
3. 执行优化
4. 对比优化前后的数据

### 场景3: Bug调试
1. 打开调试面板
2. 重现Bug
3. 查看各模块数据
4. 定位问题根源

### 场景4: 用户反馈问题
1. 让用户打开调试面板（Ctrl+Shift+V）
2. 截图发送调试信息
3. 根据数据快速定位问题

## 数据含义详解

### Performance Metrics（性能指标）
| 指标 | 含义 | 理想值 |
|-----|------|-------|
| FPS | 每秒帧数 | ≥50 |
| Render Time | 单帧渲染时间 | <15ms |
| Frame Count | 累计渲染帧数 | 持续增长 |
| Draw Calls | 绘制调用次数 | 越少越好 |

### Viewport State（视图状态）
| 指标 | 含义 | 说明 |
|-----|------|-----|
| Visible Range | 可见范围 | 当前屏幕显示的K线索引 |
| Visible Bars | 可见K线数 | 屏幕能容纳多少根K线 |
| Bar Width | K线宽度 | 单根K线占用的像素 |
| Zoom Level | 缩放级别 | 相对于全部数据的缩放比例 |

### Data Statistics（数据统计）
| 指标 | 含义 | 说明 |
|-----|------|-----|
| Total Bars | 总K线数 | 数据集中的K线总数 |
| Data Granularity | 数据粒度 | 1分钟/5分钟/1小时/1天 |
| Symbol | 股票代码 | 当前显示的股票 |
| Period | 时间周期 | 1D/5D/1M/3M/6M/1Y/YTD |

## 常见问题

**Q: 调试面板不显示？**  
A: 确认按下 Ctrl+Shift+V（不是Ctrl+V）

**Q: 数据不更新？**  
A: 数据是实时更新的，如果不更新可能是图表静止状态

**Q: FPS显示0？**  
A: 可能是图表未启动渲染，尝试平移或缩放图表

**Q: 面板遮挡图表？**  
A: 按 Ctrl+Shift+V 临时关闭，或等待拖拽功能实现

**Q: 影响性能吗？**  
A: 关闭时0影响，开启时<1%影响，可放心使用

## 进阶提示

### 提示1: 性能基准测试
```
1. 清空缓存，刷新页面
2. 打开调试面板
3. 记录初始状态的 FPS 和 Render Time
4. 执行标准操作序列（平移、缩放、切换类型）
5. 对比不同配置的性能差异
```

### 提示2: 长时间监控
```
1. 打开调试面板
2. 让图表运行数小时
3. 观察 Frame Count 是否持续增长
4. 检查 FPS 是否下降（可能是内存泄漏）
```

### 提示3: 对比测试
```
1. 记录当前配置的性能数据
2. 修改配置（如开启更多指标）
3. 对比性能变化
4. 找到最佳配置平衡点
```

---

**开始使用**: 按下 `Ctrl+Shift+V` 即可开始！  
**详细文档**: 查看 `CHART_DEBUG_PANEL_GUIDE.md`  
**完整报告**: 查看 `DEBUG_PANEL_IMPLEMENTATION_COMPLETE.md`
