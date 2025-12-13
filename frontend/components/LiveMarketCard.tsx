/**
 * LiveMarketCard - 实时市场数据卡片
 * 显示股票实时行情、迷你图表
 * 集成 DataStreamManager 实时数据流
 */

import { useMemo, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useMarketData } from '../services/DataStreamManager';
import { getMarketDataProvider, type MarketData } from '../services';
import { MiniChart } from './charts/MiniChart';

interface LiveMarketCardProps {
  symbol: string;
  onClick?: () => void;
}

export function LiveMarketCard({ symbol, onClick }: LiveMarketCardProps) {
  // 使用实时数据流
  const { data: marketData, status } = useMarketData([symbol]);
  const stock = marketData.get(symbol);
  const [fallbackStock, setFallbackStock] = useState<MarketData | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!stock) {
      const loadFallback = async () => {
        try {
          const provider = getMarketDataProvider();
          const quotes = await provider.getQuotes([symbol]);
          const quote = quotes.get(symbol);
          if (quote && !cancelled) {
            setFallbackStock({
              symbol: quote.symbol ?? symbol,
              name: quote.name ?? symbol,
              price: quote.price ?? quote.close ?? 0,
              change: quote.change ?? 0,
              changePercent: quote.changePercent ?? 0,
              volume: quote.volume ?? 0,
              timestamp: new Date(),
              bid: quote.bid1 ?? quote.bid,
              ask: quote.ask1 ?? quote.ask,
            });
          }
        } catch (error) {
          if (!cancelled) {
            console.warn(`[LiveMarketCard] Fallback quote failed for ${symbol}:`, error);
            setFallbackStock(null);
          }
        }
      };
      loadFallback();
    } else {
      setFallbackStock(null);
    }

    return () => {
      cancelled = true;
    };
  }, [stock, symbol]);

  const displayStock = stock ?? fallbackStock;

  // 生成迷你图表数据（模拟历史价格走势）
  const chartData = useMemo(() => {
    if (!displayStock) return [];
    
    // 模拟最近30个数据点
    const basePrice = displayStock.price || 0;
    const data: number[] = [];
    
    for (let i = 0; i < 30; i++) {
      const randomWalk = (Math.random() - 0.5) * (basePrice * 0.02);
      data.push(basePrice + randomWalk);
    }
    
    // 最后一个点是当前价格
    data[data.length - 1] = displayStock.price;
    
    return data;
  }, [displayStock?.price]);

  if (!displayStock) {
    return (
      <div className="bg-[#0d1b2e] border border-[#1e3a5f]/40 rounded-lg p-4">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <div className="text-xs text-gray-500">加载中...</div>
          </div>
        </div>
      </div>
    );
  }

  const isUp = (displayStock.change ?? 0) >= 0;
  const chartColor = isUp ? 'green' : 'red';

  return (
    <button
      onClick={onClick}
      className="bg-[#0d1b2e] border border-[#1e3a5f]/40 rounded-lg p-4 text-left hover:border-[#0ea5e9]/50 transition-all group w-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-[#f59e0b]">{displayStock.symbol}</span>
            {status === 'connected' && (
              <div className="flex items-center gap-1 text-[10px] text-[#10b981]">
                <div className="w-1 h-1 bg-[#10b981] rounded-full animate-pulse"></div>
                <span>LIVE</span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{displayStock.name}</div>
        </div>
        <Activity className="w-4 h-4 text-gray-600 group-hover:text-[#0ea5e9] transition-colors" />
      </div>

      {/* Price */}
      <div className="mb-3">
        <div className="text-2xl font-mono text-gray-200 mb-1">
          ¥{displayStock.price.toFixed(2)}
        </div>
        <div className={`flex items-center gap-1 text-sm font-mono ${
          isUp ? 'text-[#10b981]' : 'text-[#f97316]'
        }`}>
          {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{isUp ? '+' : ''}{displayStock.change?.toFixed?.(2) ?? '0.00'}</span>
          <span>({isUp ? '+' : ''}{displayStock.changePercent?.toFixed?.(2) ?? '0.00'}%)</span>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="-mx-4 -mb-4">
        <MiniChart data={chartData} color={chartColor} height={50} />
      </div>

      {/* Additional Info */}
      <div className="mt-3 pt-3 border-t border-[#1e3a5f]/40 flex items-center justify-between text-xs">
        <div>
          <span className="text-gray-600">成交量 </span>
          <span className="text-gray-400 font-mono">{formatVolume(displayStock.volume ?? 0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div>
            <span className="text-gray-600">买 </span>
            <span className="text-[#10b981] font-mono">{displayStock.bid?.toFixed?.(2) ?? '--'}</span>
          </div>
          <div>
            <span className="text-gray-600">卖 </span>
            <span className="text-[#f97316] font-mono">{displayStock.ask?.toFixed?.(2) ?? '--'}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// Helper: Format Volume
function formatVolume(volume: number): string {
  if (volume >= 1e8) {
    return (volume / 1e8).toFixed(2) + '亿';
  } else if (volume >= 1e4) {
    return (volume / 1e4).toFixed(2) + '万';
  }
  return volume.toString();
}

/**
 * LiveMarketGrid - 实时行情网格
 * 显示多个股票的实时行情
 */

interface LiveMarketGridProps {
  symbols: string[];
  onCardClick?: (symbol: string) => void;
}

export function LiveMarketGrid({ symbols, onCardClick }: LiveMarketGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {symbols.map(symbol => (
        <LiveMarketCard
          key={symbol}
          symbol={symbol}
          onClick={() => onCardClick?.(symbol)}
        />
      ))}
    </div>
  );
}
