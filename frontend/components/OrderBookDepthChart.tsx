/**
 * OrderBookDepthChart - 订单簿深度图表
 * Bloomberg DEPT 风格的买卖盘深度可视化
 */

import { useState, useEffect, useMemo } from 'react';
import { useLevel2Data } from '../services/Level2DataService';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';

interface OrderBookDepthChartProps {
  symbol: string;
  height?: number;
  className?: string;
}

interface DepthLevel {
  price: number;
  volume: number;
  cumulative: number;
  orders?: number;
}

interface DepthData {
  bids: DepthLevel[];
  asks: DepthLevel[];
  spread: number;
  midPrice: number;
  totalBidVolume: number;
  totalAskVolume: number;
}

export function OrderBookDepthChart({ 
  symbol, 
  height = 300,
  className = '' 
}: OrderBookDepthChartProps) {
  const { data: level2Data, isConnected, lastUpdate } = useLevel2Data(symbol);
  const [depthLevels, setDepthLevels] = useState(20); // 显示深度层级
  const [viewMode, setViewMode] = useState<'volume' | 'cumulative'>('cumulative');

  // 计算深度数据
  const depthData = useMemo((): DepthData => {
    if (!level2Data || !level2Data.orderBook) {
      return {
        bids: [],
        asks: [],
        spread: 0,
        midPrice: 0,
        totalBidVolume: 0,
        totalAskVolume: 0,
      };
    }

    const { bids, asks } = level2Data.orderBook;
    
    // 处理买盘数据（降序，最高价在前）
    const processedBids = bids
      .slice(0, depthLevels)
      .map((bid, index) => {
        const cumulative = bids
          .slice(0, index + 1)
          .reduce((sum, b) => sum + b.volume, 0);
        return {
          price: bid.price,
          volume: bid.volume,
          cumulative,
          orders: bid.orders || 1,
        };
      });

    // 处理卖盘数据（升序，最低价在前）
    const processedAsks = asks
      .slice(0, depthLevels)
      .map((ask, index) => {
        const cumulative = asks
          .slice(0, index + 1)
          .reduce((sum, a) => sum + a.volume, 0);
        return {
          price: ask.price,
          volume: ask.volume,
          cumulative,
          orders: ask.orders || 1,
        };
      });

    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;

    const totalBidVolume = processedBids.reduce((sum, bid) => sum + bid.volume, 0);
    const totalAskVolume = processedAsks.reduce((sum, ask) => sum + ask.volume, 0);

    return {
      bids: processedBids,
      asks: processedAsks,
      spread,
      midPrice,
      totalBidVolume,
      totalAskVolume,
    };
  }, [level2Data, depthLevels]);

  // 计算图表渲染数据
  const chartData = useMemo(() => {
    const maxCumulative = Math.max(
      depthData.bids[depthData.bids.length - 1]?.cumulative || 0,
      depthData.asks[depthData.asks.length - 1]?.cumulative || 0
    );

    return {
      bids: depthData.bids.map(bid => ({
        ...bid,
        widthPercent: (viewMode === 'cumulative' ? bid.cumulative : bid.volume) / 
                     (viewMode === 'cumulative' ? maxCumulative : Math.max(...depthData.bids.map(b => b.volume))) * 100
      })),
      asks: depthData.asks.map(ask => ({
        ...ask,
        widthPercent: (viewMode === 'cumulative' ? ask.cumulative : ask.volume) / 
                     (viewMode === 'cumulative' ? maxCumulative : Math.max(...depthData.asks.map(a => a.volume))) * 100
      })),
      maxCumulative,
    };
  }, [depthData, viewMode]);

  // 格式化数字显示
  const formatVolume = (volume: number) => {
    if (volume >= 10000) {
      return `${(volume / 10000).toFixed(1)}万`;
    }
    return volume.toLocaleString();
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  return (
    <div className={`bg-[#0d1b2e] border border-[#1a2942] rounded ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2942] bg-[#0a1628]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0ea5e9]" />
          <span className="text-sm text-gray-200 bloomberg-code">ORDER BOOK DEPTH</span>
          <span className="text-xs text-gray-500">{symbol}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 连接状态 */}
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-500">
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* 视图模式切换 */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'volume' | 'cumulative')}
            className="px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-200 focus:outline-none focus:border-[#0ea5e9]"
          >
            <option value="cumulative">累计深度</option>
            <option value="volume">单级量能</option>
          </select>

          {/* 深度级别 */}
          <select
            value={depthLevels}
            onChange={(e) => setDepthLevels(Number(e.target.value))}
            className="px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-200 focus:outline-none focus:border-[#0ea5e9]"
          >
            <option value={10}>10档</option>
            <option value={20}>20档</option>
            <option value={50}>50档</option>
          </select>
        </div>
      </div>

      {/* 市场概况 */}
      <div className="px-3 py-2 border-b border-[#1a2942] bg-[#0a1628]">
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-gray-500">价差</div>
            <div className="text-gray-200 bloomberg-mono">¥{formatPrice(depthData.spread)}</div>
          </div>
          <div>
            <div className="text-gray-500">中间价</div>
            <div className="text-gray-200 bloomberg-mono">¥{formatPrice(depthData.midPrice)}</div>
          </div>
          <div>
            <div className="text-gray-500">买盘总量</div>
            <div className="text-[#10b981] bloomberg-mono">{formatVolume(depthData.totalBidVolume)}</div>
          </div>
          <div>
            <div className="text-gray-500">卖盘总量</div>
            <div className="text-[#f97316] bloomberg-mono">{formatVolume(depthData.totalAskVolume)}</div>
          </div>
        </div>
      </div>

      {/* 深度图表 */}
      <div className="flex" style={{ height }}>
        {/* 买盘 (左侧) */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center gap-1 mb-2">
              <TrendingUp className="w-3 h-3 text-[#10b981]" />
              <span className="text-xs text-[#10b981] bloomberg-code">BIDS</span>
            </div>
            
            <div className="space-y-0.5">
              {chartData.bids.map((bid, index) => (
                <div
                  key={index}
                  className="relative flex items-center justify-between py-0.5 px-1 hover:bg-[#10b981]/10 rounded transition-colors group"
                >
                  {/* 背景条 */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-[#10b981]/20 transition-all duration-300"
                    style={{ width: `${bid.widthPercent}%` }}
                  />
                  
                  {/* 数据显示 */}
                  <div className="relative z-10 flex items-center justify-between w-full text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[#10b981] bloomberg-mono font-medium">
                        {formatPrice(bid.price)}
                      </span>
                      <span className="text-gray-400">{bid.orders}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-200 bloomberg-mono">{formatVolume(bid.volume)}</div>
                      {viewMode === 'cumulative' && (
                        <div className="text-gray-500 text-[10px]">{formatVolume(bid.cumulative)}</div>
                      )}
                    </div>
                  </div>

                  {/* Hover 详情 */}
                  <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                    价格: ¥{formatPrice(bid.price)} | 量: {formatVolume(bid.volume)} | 累计: {formatVolume(bid.cumulative)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中间分割线 */}
        <div className="w-px bg-[#1a2942]" />

        {/* 卖盘 (右侧) */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center gap-1 mb-2">
              <TrendingDown className="w-3 h-3 text-[#f97316]" />
              <span className="text-xs text-[#f97316] bloomberg-code">ASKS</span>
            </div>
            
            <div className="space-y-0.5">
              {chartData.asks.map((ask, index) => (
                <div
                  key={index}
                  className="relative flex items-center justify-between py-0.5 px-1 hover:bg-[#f97316]/10 rounded transition-colors group"
                >
                  {/* 背景条 */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-[#f97316]/20 transition-all duration-300"
                    style={{ width: `${ask.widthPercent}%` }}
                  />
                  
                  {/* 数据显示 */}
                  <div className="relative z-10 flex items-center justify-between w-full text-xs">
                    <div className="text-left">
                      <div className="text-gray-200 bloomberg-mono">{formatVolume(ask.volume)}</div>
                      {viewMode === 'cumulative' && (
                        <div className="text-gray-500 text-[10px]">{formatVolume(ask.cumulative)}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{ask.orders}</span>
                      <span className="text-[#f97316] bloomberg-mono font-medium">
                        {formatPrice(ask.price)}
                      </span>
                    </div>
                  </div>

                  {/* Hover 详情 */}
                  <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                    价格: ¥{formatPrice(ask.price)} | 量: {formatVolume(ask.volume)} | 累计: {formatVolume(ask.cumulative)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#1a2942] bg-[#0a1628] text-xs text-gray-500">
        <span>最后更新: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '--'}</span>
        <div className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          <span>实时更新</span>
        </div>
      </div>
    </div>
  );
}

export default OrderBookDepthChart;