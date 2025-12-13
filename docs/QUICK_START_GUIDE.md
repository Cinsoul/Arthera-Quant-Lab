# 🚀 Bloomberg级图表系统 - 快速启动指南

## 📦 5分钟快速上手

### 1. 最简单的用法

```typescript
import { EnhancedTradingChart } from '@/components/TradingChart/EnhancedTradingChart';

function MyComponent() {
  return <EnhancedTradingChart symbol="600519" period="1M" />;
}
```

**效果**: 一行代码，完整的Bloomberg级专业图表！✨

---

### 2. 启用所有专业功能

```typescript
<EnhancedTradingChart
  symbol="600519"
  period="1M"
  chartType="candlestick"
  
  // ✨ Bloomberg级专业功能
  showKeyLevels={true}        // 🎯 自动识别关键价位
  showCurrentPrice={true}     // 📊 实时价格线（闪烁）
  showSeparators={true}       // 📅 月/季/年分隔线
  showMarketTimes={true}      // ⏰ 开盘收盘标记
  
  // 📐 画线工具
  enableDrawing={true}        // ✏️ 专业画线
  
  height={600}
/>
```

---

### 3. 使用自定义数据

```typescript
const myData = [
  {
    timestamp: 1702095000000,
    open: 1850.0,
    high: 1865.5,
    low: 1845.2,
    close: 1860.3,
    volume: 5000000,
  },
  // ... 更多数据
];

<EnhancedTradingChart 
  data={myData} 
  period="1M" 
/>
```

---

### 4. 对数坐标（大范围价格）

```typescript
<EnhancedTradingChart
  symbol="300001"
  period="5Y"
  coordinateMode="log"  // 🔢 对数坐标
/>
```

**适用**: 长周期、大波动的股票

---

### 5. 百分比坐标（涨跌幅对比）

```typescript
<EnhancedTradingChart
  symbol="600519"
  period="1Y"
  coordinateMode="percentage"  // 📈 百分比坐标
/>
```

**适用**: 多股票表现对比

---

## 🎯 常见场景

### Dashboard 仪表盘

```typescript
<EnhancedTradingChart
  symbol={selectedStock}
  period="1D"
  chartType="line"           // 简洁的线图
  showKeyLevels={false}      // 关闭关键价位
  showCurrentPrice={true}    // 保留实时价格
  height={400}
/>
```

---

### Strategy Lab 策略实验室

```typescript
<EnhancedTradingChart
  symbol={stock}
  period="1M"
  chartType="candlestick"
  showKeyLevels={true}       // 显示支撑阻力
  showCurrentPrice={true}
  showSeparators={true}
  enableDrawing={true}       // 启用画线分析
  height={600}
/>
```

---

### Backtest 回测详情

```typescript
<EnhancedTradingChart
  data={backtestData}
  period="custom"
  chartType="candlestick"
  coordinateMode="percentage"  // 百分比收益
  showKeyLevels={true}
  showMA={true}                // 显示均线
  height={800}
/>
```

---

### Portfolio 组合监控

```typescript
<EnhancedTradingChart
  data={portfolioPerformance}
  period="1Y"
  chartType="area"              // 面积图
  coordinateMode="percentage"
  showCurrentPrice={true}
  height={500}
/>
```

---

## 📐 画线工具使用

### 启用画线

```typescript
function ChartWithDrawing() {
  const [tool, setTool] = useState<'none' | 'trendline' | 'horizontal'>('none');

  return (
    <>
      {/* 工具栏 */}
      <div>
        <button onClick={() => setTool('trendline')}>趋势线</button>
        <button onClick={() => setTool('horizontal')}>水平线</button>
        <button onClick={() => setTool('none')}>选择</button>
      </div>

      {/* 图表 */}
      <EnhancedTradingChart
        symbol="600519"
        period="1M"
        enableDrawing={true}
        // DrawingEngine会自动处理工具切换
      />
    </>
  );
}
```

### 可用的画线工具

- **趋势线** (`trendline`) - 拖拽绘制
- **水平线** (`horizontal`) - 支撑阻力
- **矩形** (`rectangle`) - 区域标记
- **斐波那契** (`fibonacci`) - 回调位

---

## 🎨 专业功能说明

### 1️⃣ 关键价位自动识别

**包含**:
- 🔴 前高 (Swing High) - 局部高点
- 🟢 前低 (Swing Low) - 局部低点
- 🔴 阻力位 (Resistance) - 多次触及的上方价位
- 🟢 支撑位 (Support) - 多次触及的下方价位
- 🔵 整数价位 (Round Numbers) - 心理关键位
- 🟡 VWAP - 成交量加权平均价

**效果**:
```
1900 ─────────────  整数位
1885 ─ ─ ─ ─ ─ ─  阻力位 (触及3次)
1870 ━━━━━━━━━━  VWAP
1855 ▲ ▲ ▲ ▲ ▲  前高
1840 ─ ─ ─ ─ ─ ─  支撑位 (触及4次)
1825 ▼ ▼ ▼ ▼ ▼  前低
```

---

### 2️⃣ 实时价格线

**特性**:
- 当前价水平线（虚线）
- 闪烁动画（60fps）
- 红涨绿跌配色
- 三角形指示器 ▶
- 价格标签背景

**效果**:
```
━━━━━━━━━━━━━━━▶ 1863.25 ◀  (闪烁中)
                   ━━━━━━
```

---

### 3️⃣ Bloomberg分隔线

**触发条件**:
- 3M+ 周期 → 月分隔线
- 1Y+ 周期 → 季度分隔线
- 5Y+ 周期 → 年分隔线

**效果**:
```
│      │      ║      │      │
│      │      ║      │      │
  月    月    季     月     月
             (高亮蓝色虚线)
```

---

### 4️⃣ X轴标签智能避让

**问题**: 标签重叠导致不可读

**解决**:
```
重叠前:
09:30 09:35 09:40 09:45 10:00
████████████████████████████

避让后:
09:30       09:45       10:00
  ▲         ▲           ▲
清晰可读！
```

**算法**: AABB碰撞检测 + 优先级排序

---

### 5️⃣ 市场时间标记

**中国A股标准**:
- 🟢 开盘: 9:30, 13:00 (▲)
- 🔴 收盘: 11:30, 15:00 (▼)

**效果**:
```
09:30  10:00  11:30  13:00  15:00
  ▲           ▼       ▲      ▼
 开盘        收盘    开盘   收盘
```

---

## ⚙️ 高级配置

### 自定义关键价位检测

```typescript
// 在 keyLevelDetector.ts 中修改配置
const config: KeyLevelDetectorConfig = {
  enableSwingPoints: true,
  enableSupportResistance: true,
  enableRoundNumbers: true,
  enableVWAP: true,
  swingWindow: 10,           // 前高前低窗口（K线数）
  touchThreshold: 0.005,     // 触及阈值 (0.5%)
  minTouchCount: 2,          // 最小触及次数
  roundNumberStep: 10,       // 整数步长
};
```

---

### 自定义标签避让

```typescript
// 在 labelCollisionDetector.ts 中修改
const result = resolveCollisions(labels, 
  8  // 最小间距（像素）
);

// 或使用自适应布局
const result = adaptiveLabelLayout(labels, 
  canvasWidth, 
  0.7  // 目标密度 (0-1)
);
```

---

## 🎓 API速查

### Props一览

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | string | `'600519'` | 股票代码 |
| `data` | OHLCV[] | - | 自定义OHLCV数据 |
| `period` | `'1D'\|'5D'\|'1M'\|'3M'\|'6M'\|'1Y'\|'YTD'` | `'1M'` | 时间周期 |
| `chartType` | `'candlestick'\|'line'\|'area'` | `'candlestick'` | 图表类型 |
| `coordinateMode` | `'linear'\|'log'\|'percentage'` | `'linear'` | 坐标模式 |
| `showVolume` | boolean | `true` | 显示成交量 |
| `showGrid` | boolean | `true` | 显示网格 |
| `showKeyLevels` | boolean | `true` | **显示关键价位** |
| `showCurrentPrice` | boolean | `true` | **显示实时价格线** |
| `showSeparators` | boolean | `true` | **显示分隔线** |
| `showMarketTimes` | boolean | `false` | **显示市场时间** |
| `showMA` | boolean | `false` | 显示均线 |
| `enableDrawing` | boolean | `false` | **启用画线工具** |
| `height` | number | `600` | 图表高度 |
| `onPeriodChange` | `(period) => void` | - | 周期变化回调 |
| `onChartTypeChange` | `(type) => void` | - | 图表类型变化回调 |

---

## 🐛 常见问题

### Q1: 数据格式要求？

**A**: OHLCV格式（开高低收量）

```typescript
interface OHLCV {
  timestamp: number;   // 时间戳（毫秒）
  open: number;        // 开盘价
  high: number;        // 最高价
  low: number;         // 最低价
  close: number;       // 收盘价
  volume: number;      // 成交量
}
```

---

### Q2: 如何关闭某个功能？

**A**: 使用对应的 `show*` 属性

```typescript
<EnhancedTradingChart
  showKeyLevels={false}      // 关闭关键价位
  showCurrentPrice={false}   // 关闭实时价格线
  showSeparators={false}     // 关闭分隔线
  showMarketTimes={false}    // 关闭市场时间
/>
```

---

### Q3: 如何修改配色？

**A**: 修改 `EnhancedTradingChartV2.tsx` 中的 `CHINA_COLORS`

```typescript
const CHINA_COLORS = {
  up: '#EF4444',           // 红涨 → 改成你的颜色
  down: '#10B981',         // 绿跌 → 改成你的颜色
  currentPriceUp: '#EF4444',
  currentPriceDown: '#10B981',
  // ...
};
```

---

### Q4: 性能优化建议？

**A**: 
1. 限制数据量（<1000条K线）
2. 按需启用功能（不需要的功能设为false）
3. 使用`React.memo`包裹组件
4. 避免频繁切换周期

```typescript
const MemoChart = React.memo(EnhancedTradingChart);

<MemoChart symbol="600519" period="1M" />
```

---

### Q5: 如何导出图表？

**A**: 使用Canvas API

```typescript
const canvas = canvasRef.current;
if (canvas) {
  // 导出为PNG
  const dataUrl = canvas.toDataURL('image/png');
  
  // 下载
  const link = document.createElement('a');
  link.download = 'chart.png';
  link.href = dataUrl;
  link.click();
}
```

---

## 📚 更多资源

- **完整文档**: `/BLOOMBERG_LEVEL_COMPLETE.md`
- **技术细节**: `/utils/professionalAxisCalculator.ts`
- **关键价位**: `/utils/keyLevelDetector.ts`
- **标签避让**: `/utils/labelCollisionDetector.ts`

---

## ✅ 检查清单

开始使用前，确保：

- [x] 已导入组件 `import { EnhancedTradingChart } from '@/components/TradingChart/EnhancedTradingChart'`
- [x] 数据格式正确（OHLCV）
- [x] 选择合适的周期（1D-YTD）
- [x] 根据需求启用功能
- [x] 测试不同设备的响应式

---

**祝你使用愉快！** 🎉

如有问题，请查阅 `/BLOOMBERG_LEVEL_COMPLETE.md` 获取详细技术文档。

*版本: 2.0*  
*更新时间: 2024-12-09*
