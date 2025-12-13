# Bloomberg级图表系统 - 快速开始指南

## 🚀 5分钟快速上手

### 步骤1：准备数据（1分钟）

```typescript
import { type CandleDataPoint } from './utils/timeBasedViewportManager';

// 准备OHLCV数据
const chartData: CandleDataPoint[] = [
  {
    timestamp: 1638316800000, // 2021-12-01 00:00:00 UTC
    open: 200.5,
    high: 205.8,
    low: 198.2,
    close: 203.4,
    volume: 5234567,
  },
  {
    timestamp: 1638403200000, // 2021-12-02 00:00:00 UTC
    open: 203.4,
    high: 208.9,
    low: 201.5,
    close: 207.2,
    volume: 6123456,
  },
  // ... 更多数据
];
```

### 步骤2：导入组件（1分钟）

```typescript
import { BloombergChart } from './components/TradingChart/BloombergChart';
```

### 步骤3：使用组件（1分钟）

```typescript
function App() {
  return (
    <div className="p-8">
      <BloombergChart
        symbol="600519.SH"
        data={chartData}
        period="3M"
        height={600}
      />
    </div>
  );
}
```

### 步骤4：运行查看（2分钟）

```bash
npm run dev
```

打开浏览器，你应该看到：
- ✅ 专业的K线图
- ✅ 智能的时间轴刻度
- ✅ 可缩放和平移的图表
- ✅ 悬停显示详细信息

---

## 🎨 完整示例

```typescript
import { useState } from 'react';
import { BloombergChart } from './components/TradingChart/BloombergChart';
import { type CandleDataPoint } from './utils/timeBasedViewportManager';
import { type TimePeriod } from './components/TradingChart/BloombergChart';

// 生成模拟数据（用于测试）
function generateMockData(days: number): CandleDataPoint[] {
  const data: CandleDataPoint[] = [];
  const now = Date.now();
  const MS_DAY = 24 * 60 * 60 * 1000;
  
  let price = 200;
  
  for (let i = 0; i < days; i++) {
    const timestamp = now - (days - i) * MS_DAY;
    const date = new Date(timestamp);
    
    // 跳过周末
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const change = (Math.random() - 0.5) * 10;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;
    const volume = Math.random() * 10000000 + 5000000;
    
    data.push({ timestamp, open, high, low, close, volume });
    price = close;
  }
  
  return data;
}

function App() {
  const [period, setPeriod] = useState<TimePeriod>('3M');
  const data = generateMockData(365); // 1年数据
  
  return (
    <div className="min-h-screen bg-[#0a1628] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 标题 */}
        <div>
          <h1 className="text-3xl font-mono text-white mb-2">
            贵州茅台 (600519.SH)
          </h1>
          <p className="text-sm font-mono text-gray-400">
            Bloomberg级专业图表系统
          </p>
        </div>
        
        {/* 图表 */}
        <div className="bg-[#0d1b2e] border border-[#1e3a5f]/40 rounded-lg p-6">
          <BloombergChart
            symbol="600519.SH"
            data={data}
            period={period}
            chartType="candlestick"
            height={600}
            showVolume={true}
            showGrid={true}
            showControls={true}
            onPeriodChange={setPeriod}
          />
        </div>
        
        {/* 说明 */}
        <div className="bg-[#0d1b2e] border border-[#1e3a5f]/40 rounded-lg p-4">
          <div className="text-sm font-mono text-gray-400 space-y-2">
            <p><strong className="text-white">缩放：</strong>滚轮缩放，鼠标下的K线保持不动</p>
            <p><strong className="text-white">平移：</strong>鼠标拖拽左右移动查看历史数据</p>
            <p><strong className="text-white">周期：</strong>点击顶部按钮切换时间周期</p>
            <p><strong className="text-white">类型：</strong>切换K线图/线图/面积图</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
```

---

## 📝 Props API

### BloombergChart

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `symbol` | `string` | `'600519'` | 股票代码 |
| `data` | `CandleDataPoint[]` | **必填** | OHLCV数据数组 |
| `period` | `TimePeriod` | `'3M'` | 初始时间周期 |
| `chartType` | `ChartType` | `'candlestick'` | 图表类型 |
| `showVolume` | `boolean` | `true` | 显示成交量 |
| `showGrid` | `boolean` | `true` | 显示网格 |
| `showControls` | `boolean` | `true` | 显示控制栏 |
| `height` | `number` | `600` | 图表高度（像素） |
| `onPeriodChange` | `(period) => void` | - | 周期变化回调 |
| `className` | `string` | `''` | CSS类名 |

### 数据格式

```typescript
interface CandleDataPoint {
  timestamp: number;  // 时间戳（毫秒）
  open: number;       // 开盘价
  high: number;       // 最高价
  low: number;        // 最低价
  close: number;      // 收盘价
  volume: number;     // 成交量
}
```

### 周期选项

```typescript
type TimePeriod = 
  | '1D'   // 1天
  | '5D'   // 5天
  | '1M'   // 1个月
  | '3M'   // 3个月
  | '6M'   // 6个月
  | '1Y'   // 1年
  | 'YTD'; // 今年至今
```

### 图表类型

```typescript
type ChartType = 
  | 'candlestick'  // K线图
  | 'line'         // 线图
  | 'area';        // 面积图
```

---

## 🎯 常见场景

### 场景1：实时更新数据

```typescript
function RealTimeChart() {
  const [data, setData] = useState<CandleDataPoint[]>(initialData);
  
  useEffect(() => {
    // 模拟实时更新
    const interval = setInterval(() => {
      setData(prev => {
        const last = prev[prev.length - 1];
        const newPoint: CandleDataPoint = {
          timestamp: Date.now(),
          open: last.close,
          high: last.close + Math.random() * 5,
          low: last.close - Math.random() * 5,
          close: last.close + (Math.random() - 0.5) * 3,
          volume: Math.random() * 10000000,
        };
        return [...prev, newPoint];
      });
    }, 60000); // 每分钟更新
    
    return () => clearInterval(interval);
  }, []);
  
  return <BloombergChart symbol="600519" data={data} period="1D" />;
}
```

### 场景2：多图表对比

```typescript
function ComparisonCharts() {
  const [period, setPeriod] = useState<TimePeriod>('3M');
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <BloombergChart
        symbol="600519.SH"
        data={maotaiData}
        period={period}
        height={400}
        onPeriodChange={setPeriod}
      />
      <BloombergChart
        symbol="000858.SZ"
        data={wuliangData}
        period={period}
        height={400}
        showControls={false}
      />
    </div>
  );
}
```

### 场景3：自定义控制栏

```typescript
function CustomControlChart() {
  const [period, setPeriod] = useState<TimePeriod>('3M');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  
  return (
    <div>
      {/* 自定义控制栏 */}
      <div className="mb-4 flex gap-4">
        <select 
          value={period} 
          onChange={e => setPeriod(e.target.value as TimePeriod)}
          className="px-4 py-2 rounded bg-[#1e3a5f] text-white"
        >
          <option value="1D">1天</option>
          <option value="5D">5天</option>
          <option value="1M">1个月</option>
          <option value="3M">3个月</option>
          <option value="6M">6个月</option>
          <option value="1Y">1年</option>
          <option value="YTD">今年</option>
        </select>
        
        <select
          value={chartType}
          onChange={e => setChartType(e.target.value as ChartType)}
          className="px-4 py-2 rounded bg-[#1e3a5f] text-white"
        >
          <option value="candlestick">K线图</option>
          <option value="line">线图</option>
          <option value="area">面积图</option>
        </select>
      </div>
      
      {/* 图表（隐藏内置控制栏） */}
      <BloombergChart
        symbol="600519"
        data={data}
        period={period}
        chartType={chartType}
        height={600}
        showControls={false}
      />
    </div>
  );
}
```

### 场景4：从API加载数据

```typescript
function APIChart() {
  const [data, setData] = useState<CandleDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/stock/600519/daily');
        const jsonData = await response.json();
        
        // 转换为CandleDataPoint格式
        const formattedData: CandleDataPoint[] = jsonData.map((item: any) => ({
          timestamp: new Date(item.date).getTime(),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
        }));
        
        setData(formattedData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    }
    
    fetchData();
  }, []);
  
  if (loading) {
    return <div>Loading chart data...</div>;
  }
  
  return <BloombergChart symbol="600519" data={data} period="3M" />;
}
```

---

## 🎨 样式自定义

### 修改配色

编辑 `/components/TradingChart/BloombergChart.tsx`:

```typescript
const COLORS = {
  up: '#EF4444',        // 红涨（中国标准）
  down: '#10B981',      // 绿跌（中国标准）
  grid: '#1E3A5F',      // 网格线
  separator: '#0EA5E9', // 分隔线
  text: '#94A3B8',      // 文本
  background: '#0A1929', // 背景
};

// 也可以使用美国标准（绿涨红跌）：
const COLORS_US = {
  up: '#10B981',        // 绿涨
  down: '#EF4444',      // 红跌
  // ... 其他配色
};
```

### 调整图表比例

```typescript
<BloombergChart
  symbol="600519"
  data={data}
  period="3M"
  height={800}        // 增加高度
  showVolume={true}   // 成交量占20%
/>
```

### 隐藏部分功能

```typescript
<BloombergChart
  symbol="600519"
  data={data}
  period="3M"
  showVolume={false}    // 隐藏成交量
  showGrid={false}      // 隐藏网格
  showControls={false}  // 隐藏控制栏
/>
```

---

## 🔧 高级配置

### 调整缩放范围

编辑 `/utils/timeBasedViewportManager.ts`:

```typescript
const DEFAULT_CONFIG: TimeViewportConfig = {
  minTimeSpan: MS_HOUR,           // 最小1小时（可改为MS_MINUTE）
  maxTimeSpan: 10 * MS_YEAR,      // 最大10年（可改为20 * MS_YEAR）
  defaultTimeSpan: 3 * MS_MONTH,  // 默认3个月
  minBarWidth: 2,                 // 最小K线宽度
  maxBarWidth: 40,                // 最大K线宽度
  zoomSensitivity: 0.15,          // 缩放灵敏度（0.1-0.3）
};
```

### 调整刻度数量

编辑 `/utils/bloombergTimeAxis.ts`:

```typescript
const fullConfig: TimeAxisConfig = {
  minTickSpacing: 80,       // 最小刻度间距（像素）
  targetTickCount: 7,       // 目标刻度数量（5-9）
  enableMinorTicks: true,   // 启用次刻度
  enableSeparators: true,   // 启用分隔线
};
```

---

## 📊 数据获取示例

### 从Tushare获取数据

```python
# Python后端
import tushare as ts
import json

def get_stock_data(symbol: str, start_date: str, end_date: str):
    pro = ts.pro_api('YOUR_TOKEN')
    df = pro.daily(ts_code=symbol, start_date=start_date, end_date=end_date)
    
    result = []
    for _, row in df.iterrows():
        result.append({
            'timestamp': int(pd.Timestamp(row['trade_date']).timestamp() * 1000),
            'open': float(row['open']),
            'high': float(row['high']),
            'low': float(row['low']),
            'close': float(row['close']),
            'volume': int(row['vol'] * 100),  # 手 -> 股
        })
    
    return json.dumps(result)
```

### 从Yahoo Finance获取数据

```typescript
// Node.js后端
import yahooFinance from 'yahoo-finance2';

async function getStockData(symbol: string, period: string) {
  const result = await yahooFinance.chart(symbol, {
    period1: getStartDate(period),
    interval: '1d',
  });
  
  return result.quotes.map(quote => ({
    timestamp: quote.date.getTime(),
    open: quote.open,
    high: quote.high,
    low: quote.low,
    close: quote.close,
    volume: quote.volume,
  }));
}
```

---

## 🐛 故障排查

### 问题1：图表不显示

**原因**：数据格式不正确

**解决**：检查数据格式
```typescript
console.log('Data sample:', data[0]);
// 应该输出：
// {
//   timestamp: 1638316800000,
//   open: 200.5,
//   high: 205.8,
//   low: 198.2,
//   close: 203.4,
//   volume: 5234567
// }
```

### 问题2：缩放不流畅

**原因**：数据量太大（>5000点）

**解决**：对数据进行采样
```typescript
function sampleData(data: CandleDataPoint[], maxPoints: number) {
  if (data.length <= maxPoints) return data;
  
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}

const sampledData = sampleData(rawData, 2000);
```

### 问题3：时间轴标签重叠

**原因**：图表宽度太小

**解决**：增加图表宽度或调整刻度间距
```typescript
// 方法1：增加容器宽度
<div className="min-w-[1200px]">
  <BloombergChart ... />
</div>

// 方法2：调整minTickSpacing（在bloombergTimeAxis.ts中）
minTickSpacing: 100  // 从80增加到100
```

---

## 📚 更多资源

- **完整文档**：`/BLOOMBERG_TIME_AXIS_INTEGRATION_GUIDE.md`
- **测试指南**：`/TEST_BLOOMBERG_CHART.md`
- **系统总结**：`/BLOOMBERG_AXIS_SYSTEM_SUMMARY.md`

- **源代码**：
  - 视口管理：`/utils/timeBasedViewportManager.ts`
  - 时间轴：`/utils/bloombergTimeAxis.ts`
  - 图表组件：`/components/TradingChart/BloombergChart.tsx`

---

## 🎉 开始使用

现在你已经准备好使用Bloomberg级图表系统了！

```bash
# 复制示例代码到你的App.tsx
# 运行开发服务器
npm run dev

# 打开浏览器
# 开始测试缩放、平移和周期切换！
```

**祝你使用愉快！** 🚀
