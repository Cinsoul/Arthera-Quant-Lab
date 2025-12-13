import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wifi, WifiOff, Signal } from 'lucide-react';
import { type MarketData } from '../services/DataStreamManager';

interface TickerData {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MarketTickerProps {
  marketData: Map<string, MarketData>;
  marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours';
  isServicesReady: boolean;
}

export function MarketTicker({ marketData, marketStatus, isServicesReady }: MarketTickerProps) {

  // Ticker 显示数据
  const [tickerData, setTickerData] = useState<TickerData[]>([
    { code: 'HS300', name: '沪深300', price: 3945.67, change: 12.34, changePercent: 0.31 },
    { code: 'ZZ500', name: '中证500', price: 5678.23, change: -23.45, changePercent: -0.41 },
  ]);

  // 更新 ticker 数据
  useEffect(() => {
    if (marketData.size === 0) return;

    const stockData: TickerData[] = [];

    // 将 Map 转换为数组
    marketData.forEach((data, symbol) => {
      stockData.push({
        code: symbol,
        name: data.name,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
      });
    });

    // 合并指数数据和股票数据
    setTickerData([
      { code: 'HS300', name: '沪深300', price: 3945.67, change: 12.34, changePercent: 0.31 },
      { code: 'ZZ500', name: '中证500', price: 5678.23, change: -23.45, changePercent: -0.41 },
      ...stockData,
      { code: 'VIX', name: '波动率指数', price: 18.45, change: -0.67, changePercent: -3.51 },
    ]);
  }, [marketData]);

  // 模拟指数数据更新（HS300, ZZ500, VIX）
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerData(prev => prev.map(item => {
        // 只更新指数数据，股票数据由实时流更新
        if (['HS300', 'ZZ500', 'VIX'].includes(item.code)) {
          const randomChange = (Math.random() - 0.5) * 0.5;
          const newPrice = item.price * (1 + randomChange / 100);
          const change = newPrice - item.price;
          const changePercent = (change / item.price) * 100;
          
          return {
            ...item,
            price: Number(newPrice.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2))
          };
        }
        return item;
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0a1628] border-b border-[#1a2942] overflow-hidden relative">
      {/* Connection Status Indicator */}
      <div className="absolute top-1 right-4 z-10 flex items-center gap-1">
        {!isServicesReady ? (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[#f59e0b]/20 rounded">
            <WifiOff className="w-3 h-3 text-[#f59e0b]" />
            <span className="text-xs text-[#f59e0b]">连接中</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[#10b981]/20 rounded">
            {marketStatus === 'open' ? (
              <>
                <Signal className="w-3 h-3 text-[#10b981] animate-pulse" />
                <span className="text-xs text-[#10b981]">LIVE</span>
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3 text-[#0ea5e9]" />
                <span className="text-xs text-[#0ea5e9]">
                  {marketStatus === 'closed' ? '休市' : marketStatus === 'pre-market' ? '盘前' : '盘后'}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Ticker Scroll */}
      <div className="flex items-center animate-ticker-scroll">
        {/* Duplicate items for seamless loop */}
        {[...tickerData, ...tickerData].map((item, index) => (
          <div
            key={`${item.code}-${index}`}
            className="flex items-center gap-2 px-4 py-1.5 border-r border-[#1a2942] whitespace-nowrap"
          >
            <span 
              className="text-xs text-[#f59e0b]"
              style={{ fontFamily: 'Monaco, "Courier New", monospace', fontWeight: 600 }}
            >
              {item.code}
            </span>
            <span className="text-xs text-gray-400">{item.name}</span>
            <span 
              className="text-xs text-gray-200"
              style={{ fontFamily: 'Monaco, "Courier New", monospace' }}
            >
              {item.price.toFixed(2)}
            </span>
            <span
              className={`flex items-center gap-0.5 text-xs ${
                item.change >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'
              }`}
              style={{ fontFamily: 'Monaco, "Courier New", monospace' }}
            >
              {item.change >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
