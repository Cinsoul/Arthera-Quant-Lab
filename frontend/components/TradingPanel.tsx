/**
 * TradingPanel - 快捷交易面板
 * Bloomberg Terminal 风格的专业交易界面
 */

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Percent, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface TradingPanelProps {
  symbol: string;
  currentPrice: number;
  onOrder?: (order: OrderRequest) => void;
  className?: string;
}

interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  price?: number;
  stopPrice?: number;
  timeInForce: 'DAY' | 'GTC' | 'IOC';
}

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
}

// Mock data - 在实际应用中这些数据应该来自交易API
const mockPositions: Position[] = [
  {
    symbol: '600519',
    quantity: 100,
    avgPrice: 1650.00,
    marketValue: 168236.00,
    unrealizedPL: 3236.00,
    unrealizedPLPercent: 1.96
  }
];

const mockBuyingPower = 50000.00;
const mockDayPL = 1234.56;
const mockTotalValue = 250000.00;

export function TradingPanel({ symbol, currentPrice, onOrder, className = '' }: TradingPanelProps) {
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'STOP'>('MARKET');
  const [quantity, setQuantity] = useState(100);
  const [limitPrice, setLimitPrice] = useState(currentPrice);
  const [stopPrice, setStopPrice] = useState(currentPrice * 0.95);
  const [timeInForce, setTimeInForce] = useState<'DAY' | 'GTC' | 'IOC'>('DAY');
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // 计算订单估值
  const orderValue = orderType === 'MARKET' ? quantity * currentPrice : quantity * limitPrice;
  const commission = Math.max(5.00, orderValue * 0.0003); // 最低5元，万分之3
  
  // 当前持仓信息
  const currentPosition = mockPositions.find(pos => pos.symbol === symbol);
  
  // 更新限价单价格跟随市价
  useEffect(() => {
    if (orderType === 'LIMIT') {
      setLimitPrice(currentPrice);
    }
  }, [currentPrice, orderType]);

  const handleSubmitOrder = () => {
    const order: OrderRequest = {
      symbol,
      side: orderSide,
      quantity,
      orderType,
      price: orderType === 'MARKET' ? undefined : limitPrice,
      stopPrice: orderType === 'STOP' ? stopPrice : undefined,
      timeInForce,
    };

    if (onOrder) {
      onOrder(order);
    }
    
    // 显示确认信息
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getQuickQuantities = () => {
    const baseQuantities = [100, 200, 500, 1000];
    const buyingPowerQuantity = Math.floor(mockBuyingPower / currentPrice / 100) * 100;
    
    if (buyingPowerQuantity > 1000) {
      baseQuantities.push(buyingPowerQuantity);
    }
    
    return baseQuantities.slice(0, 4);
  };

  return (
    <div className={`bg-[#0d1b2e] border border-[#1a2942] rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a2942] bg-[#0a1628]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm text-gray-200 bloomberg-code">TRADING PANEL</h3>
          <span className="text-xs text-gray-500">{symbol}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 账户概况 */}
        <div className="bg-[#0a1628] border border-[#1a2942] rounded p-3">
          <h4 className="text-xs text-gray-400 mb-2 bloomberg-code">ACCOUNT SUMMARY</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-gray-500">购买力</div>
              <div className="text-green-300 bloomberg-mono">{formatCurrency(mockBuyingPower)}</div>
            </div>
            <div>
              <div className="text-gray-500">总市值</div>
              <div className="text-gray-200 bloomberg-mono">{formatCurrency(mockTotalValue)}</div>
            </div>
            <div>
              <div className="text-gray-500">当日盈亏</div>
              <div className={`bloomberg-mono ${mockDayPL >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {mockDayPL >= 0 ? '+' : ''}{formatCurrency(mockDayPL)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">当前价格</div>
              <div className="text-[#0ea5e9] bloomberg-mono">{formatCurrency(currentPrice)}</div>
            </div>
          </div>
        </div>

        {/* 当前持仓 */}
        {currentPosition && (
          <div className="bg-[#0a1628] border border-[#1a2942] rounded p-3">
            <h4 className="text-xs text-gray-400 mb-2 bloomberg-code">CURRENT POSITION</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">持有数量</span>
                <span className="text-gray-200 bloomberg-mono">{currentPosition.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">平均成本</span>
                <span className="text-gray-200 bloomberg-mono">{formatCurrency(currentPosition.avgPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">市场价值</span>
                <span className="text-gray-200 bloomberg-mono">{formatCurrency(currentPosition.marketValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">未实现盈亏</span>
                <div className="text-right">
                  <div className={`bloomberg-mono ${currentPosition.unrealizedPL >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {currentPosition.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(currentPosition.unrealizedPL)}
                  </div>
                  <div className={`text-[10px] ${currentPosition.unrealizedPLPercent >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {formatPercent(currentPosition.unrealizedPLPercent)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 下单面板 */}
        <div className="bg-[#0a1628] border border-[#1a2942] rounded p-3">
          <h4 className="text-xs text-gray-400 mb-3 bloomberg-code">ORDER ENTRY</h4>
          
          {/* 买卖方向 */}
          <div className="flex mb-3">
            <button
              onClick={() => setOrderSide('BUY')}
              className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                orderSide === 'BUY'
                  ? 'bg-green-600 text-white'
                  : 'bg-[#1a2942] text-gray-400 hover:text-gray-200'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              买入
            </button>
            <button
              onClick={() => setOrderSide('SELL')}
              className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                orderSide === 'SELL'
                  ? 'bg-red-600 text-white'
                  : 'bg-[#1a2942] text-gray-400 hover:text-gray-200'
              }`}
            >
              <TrendingDown className="w-4 h-4 inline mr-1" />
              卖出
            </button>
          </div>

          {/* 订单类型 */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">订单类型</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as 'MARKET' | 'LIMIT' | 'STOP')}
              className="w-full px-2 py-1.5 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-200 focus:outline-none focus:border-[#0ea5e9]"
            >
              <option value="MARKET">市价单</option>
              <option value="LIMIT">限价单</option>
              <option value="STOP">止损单</option>
            </select>
          </div>

          {/* 数量选择 */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">数量</label>
            <div className="flex gap-1 mb-2">
              {getQuickQuantities().map(qty => (
                <button
                  key={qty}
                  onClick={() => setQuantity(qty)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    quantity === qty
                      ? 'bg-[#0ea5e9] text-white'
                      : 'bg-[#1a2942] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {qty}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="0"
              step="100"
              className="w-full px-2 py-1.5 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-200 bloomberg-mono focus:outline-none focus:border-[#0ea5e9]"
            />
          </div>

          {/* 价格设置 */}
          {orderType === 'LIMIT' && (
            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">限价</label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(Number(e.target.value))}
                step="0.01"
                className="w-full px-2 py-1.5 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-200 bloomberg-mono focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
          )}

          {orderType === 'STOP' && (
            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">止损价</label>
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(Number(e.target.value))}
                step="0.01"
                className="w-full px-2 py-1.5 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-200 bloomberg-mono focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
          )}

          {/* 有效期 */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">有效期</label>
            <select
              value={timeInForce}
              onChange={(e) => setTimeInForce(e.target.value as 'DAY' | 'GTC' | 'IOC')}
              className="w-full px-2 py-1.5 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-200 focus:outline-none focus:border-[#0ea5e9]"
            >
              <option value="DAY">当日有效</option>
              <option value="GTC">撤销前有效</option>
              <option value="IOC">立即成交或取消</option>
            </select>
          </div>

          {/* 订单预估 */}
          <div className="bg-[#1a2942] rounded p-2 mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">预估金额</span>
              <span className="text-gray-200 bloomberg-mono">{formatCurrency(orderValue)}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">手续费</span>
              <span className="text-gray-400 bloomberg-mono">{formatCurrency(commission)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium border-t border-[#2a3f5f] pt-1">
              <span className="text-gray-300">总计</span>
              <span className="text-gray-100 bloomberg-mono">{formatCurrency(orderValue + commission)}</span>
            </div>
          </div>

          {/* 风险检查 */}
          {orderSide === 'BUY' && orderValue > mockBuyingPower && (
            <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/40 rounded mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-300">购买力不足</span>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleSubmitOrder}
            disabled={orderSide === 'BUY' && orderValue > mockBuyingPower}
            className={`w-full py-3 rounded font-medium text-sm transition-colors ${
              orderSide === 'BUY'
                ? orderValue > mockBuyingPower
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {orderSide === 'BUY' ? '买入' : '卖出'} {symbol}
          </button>
        </div>

        {/* 确认消息 */}
        {showConfirmation && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">订单已提交</span>
            <button
              onClick={() => setShowConfirmation(false)}
              className="ml-2 hover:bg-green-700 rounded p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TradingPanel;