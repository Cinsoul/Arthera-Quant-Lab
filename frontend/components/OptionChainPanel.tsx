/**
 * OptionChainPanel - 期权链和衍生品数据展示面板
 * 
 * 功能：
 * - 期权链数据展示
 * - 看涨/看跌期权对比
 * - 希腊字母指标
 * - 波动率曲面
 * - 期货数据展示
 */

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  Target,
  BarChart3,
  Activity,
  Zap,
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  RefreshCw,
  Filter,
  Info
} from 'lucide-react';
import { getMarketDataProvider } from '../services/MarketDataProvider';

// 期权数据接口
interface OptionContract {
  contractCode: string;        // 合约代码
  strikePrice: number;        // 行权价
  expiryDate: string;         // 到期日
  type: 'call' | 'put';      // 看涨/看跌
  lastPrice: number;          // 最新价
  bid: number;                // 买价
  ask: number;                // 卖价
  volume: number;             // 成交量
  openInterest: number;       // 持仓量
  impliedVolatility: number;  // 隐含波动率
  delta: number;              // Delta
  gamma: number;              // Gamma
  theta: number;              // Theta
  vega: number;               // Vega
  rho: number;                // Rho
  timeValue: number;          // 时间价值
  intrinsicValue: number;     // 内在价值
}

// 期货数据接口
interface FuturesContract {
  contractCode: string;       // 合约代码
  contractMonth: string;      // 交割月份
  lastPrice: number;          // 最新价
  change: number;             // 涨跌
  changePercent: number;      // 涨跌幅
  volume: number;             // 成交量
  openInterest: number;       // 持仓量
  settlementPrice: number;    // 结算价
  basis: number;              // 基差
  contango: number;           // 升贴水
}

interface OptionChainPanelProps {
  symbol: string;
  className?: string;
}

export function OptionChainPanel({ symbol, className = '' }: OptionChainPanelProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'options' | 'futures' | 'volatility'>('options');
  const [selectedExpiry, setSelectedExpiry] = useState<string>('2024-03-15');
  const [filterMoneyness, setFilterMoneyness] = useState<'all' | 'itm' | 'atm' | 'otm'>('all');
  
  // 期权数据
  const [optionChain, setOptionChain] = useState<OptionContract[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(150.00);
  const [expireDates, setExpireDates] = useState<string[]>(['2024-03-15', '2024-04-19', '2024-06-21', '2024-09-20']);
  
  // 期货数据
  const [futuresContracts, setFuturesContracts] = useState<FuturesContract[]>([]);
  
  // 波动率数据
  const [volatilitySurface, setVolatilitySurface] = useState<any[]>([]);

  // 加载期权链数据
  const loadOptionChain = async () => {
    setLoading(true);
    try {
      // 模拟期权链数据
      const mockOptionChain = generateMockOptionChain(symbol, selectedExpiry, currentPrice);
      setOptionChain(mockOptionChain);
      
      // 模拟期货数据
      const mockFutures = generateMockFutures(symbol);
      setFuturesContracts(mockFutures);
      
    } catch (error) {
      console.error('加载期权链数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptionChain();
  }, [symbol, selectedExpiry]);

  // 生成模拟期权链数据
  const generateMockOptionChain = (symbol: string, expiry: string, spotPrice: number): OptionContract[] => {
    const contracts: OptionContract[] = [];
    const strikePrices = Array.from({ length: 21 }, (_, i) => Math.round(spotPrice * (0.8 + i * 0.02) * 100) / 100);
    
    strikePrices.forEach(strike => {
      // Call期权
      const callContract: OptionContract = {
        contractCode: `${symbol}C${expiry.replace(/-/g, '')}${strike.toFixed(0).padStart(3, '0')}`,
        strikePrice: strike,
        expiryDate: expiry,
        type: 'call',
        lastPrice: Math.max(0.01, spotPrice - strike + Math.random() * 5),
        bid: Math.max(0.01, spotPrice - strike - 0.5 + Math.random() * 2),
        ask: Math.max(0.02, spotPrice - strike + 0.5 + Math.random() * 2),
        volume: Math.floor(Math.random() * 1000 + 10),
        openInterest: Math.floor(Math.random() * 5000 + 100),
        impliedVolatility: 0.2 + Math.random() * 0.3,
        delta: strike < spotPrice ? 0.5 + (spotPrice - strike) / (spotPrice * 2) : 0.5 - (strike - spotPrice) / (spotPrice * 2),
        gamma: 0.01 + Math.random() * 0.02,
        theta: -(Math.random() * 0.5 + 0.1),
        vega: Math.random() * 0.3 + 0.1,
        rho: Math.random() * 0.1,
        timeValue: Math.max(0, spotPrice - strike + Math.random() * 2),
        intrinsicValue: Math.max(0, spotPrice - strike)
      };
      
      // Put期权
      const putContract: OptionContract = {
        contractCode: `${symbol}P${expiry.replace(/-/g, '')}${strike.toFixed(0).padStart(3, '0')}`,
        strikePrice: strike,
        expiryDate: expiry,
        type: 'put',
        lastPrice: Math.max(0.01, strike - spotPrice + Math.random() * 5),
        bid: Math.max(0.01, strike - spotPrice - 0.5 + Math.random() * 2),
        ask: Math.max(0.02, strike - spotPrice + 0.5 + Math.random() * 2),
        volume: Math.floor(Math.random() * 800 + 5),
        openInterest: Math.floor(Math.random() * 4000 + 50),
        impliedVolatility: 0.25 + Math.random() * 0.25,
        delta: strike > spotPrice ? -(0.5 + (strike - spotPrice) / (spotPrice * 2)) : -(0.5 - (spotPrice - strike) / (spotPrice * 2)),
        gamma: 0.01 + Math.random() * 0.02,
        theta: -(Math.random() * 0.4 + 0.08),
        vega: Math.random() * 0.25 + 0.08,
        rho: -(Math.random() * 0.08),
        timeValue: Math.max(0, strike - spotPrice + Math.random() * 2),
        intrinsicValue: Math.max(0, strike - spotPrice)
      };
      
      contracts.push(callContract, putContract);
    });
    
    return contracts;
  };

  // 生成模拟期货数据
  const generateMockFutures = (symbol: string): FuturesContract[] => {
    const months = ['2024-03', '2024-06', '2024-09', '2024-12', '2025-03', '2025-06'];
    return months.map((month, index) => ({
      contractCode: `${symbol}${month.replace('-', '')}`,
      contractMonth: month,
      lastPrice: currentPrice + (index * 2) + Math.random() * 5 - 2.5,
      change: (Math.random() - 0.5) * 4,
      changePercent: (Math.random() - 0.5) * 3,
      volume: Math.floor(Math.random() * 10000 + 1000),
      openInterest: Math.floor(Math.random() * 50000 + 5000),
      settlementPrice: currentPrice + (index * 1.8) + Math.random() * 3 - 1.5,
      basis: Math.random() * 2 - 1,
      contango: index * 0.5 + Math.random() * 1 - 0.5
    }));
  };

  // 筛选期权合约
  const filteredOptions = optionChain.filter(option => {
    if (filterMoneyness === 'all') return true;
    const moneyness = option.strikePrice / currentPrice;
    if (filterMoneyness === 'itm') {
      return option.type === 'call' ? moneyness < 0.98 : moneyness > 1.02;
    }
    if (filterMoneyness === 'atm') {
      return moneyness >= 0.98 && moneyness <= 1.02;
    }
    if (filterMoneyness === 'otm') {
      return option.type === 'call' ? moneyness > 1.02 : moneyness < 0.98;
    }
    return true;
  });

  // 按执行价格分组期权
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    const key = option.strikePrice;
    if (!acc[key]) {
      acc[key] = { call: null, put: null };
    }
    acc[key][option.type] = option;
    return acc;
  }, {} as Record<number, { call: OptionContract | null; put: OptionContract | null }>);

  return (
    <div className={`bg-[#0d1b2e] border border-[#1a2942] rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a2942] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-200">期权链 & 衍生品</h3>
          <p className="text-xs text-gray-500 mt-1">{symbol} - 现价 ¥{currentPrice.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadOptionChain}
            disabled={loading}
            className="p-1.5 hover:bg-[#1a2942] rounded transition-colors disabled:opacity-50"
            title="刷新数据"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a2942]">
        {[
          { id: 'options' as const, label: '期权链', icon: Calculator },
          { id: 'futures' as const, label: '期货', icon: TrendingUp },
          { id: 'volatility' as const, label: '波动率', icon: Activity },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              activeTab === tab.id
                ? 'bg-[#0ea5e9]/20 text-[#0ea5e9] border-b-2 border-[#0ea5e9]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a2942]/50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="h-[600px] overflow-hidden flex flex-col">
        {/* Options Tab */}
        {activeTab === 'options' && (
          <>
            {/* Controls */}
            <div className="px-4 py-3 border-b border-[#1a2942] flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedExpiry}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  className="px-2 py-1 bg-[#0a1628] border border-[#1a2942] rounded text-xs text-gray-200"
                >
                  {expireDates.map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterMoneyness}
                  onChange={(e) => setFilterMoneyness(e.target.value as any)}
                  className="px-2 py-1 bg-[#0a1628] border border-[#1a2942] rounded text-xs text-gray-200"
                >
                  <option value="all">全部</option>
                  <option value="itm">实值(ITM)</option>
                  <option value="atm">平值(ATM)</option>
                  <option value="otm">虚值(OTM)</option>
                </select>
              </div>
              
              <div className="text-xs text-gray-500">
                到期: {selectedExpiry} ({Math.ceil((new Date(selectedExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} 天)
              </div>
            </div>

            {/* Option Chain Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#0a1628] border-b border-[#1a2942]">
                  <tr>
                    {/* Call Options */}
                    <th className="text-center px-2 py-2 text-[#10b981] bg-[#10b981]/10" colSpan={6}>看涨期权 (Call)</th>
                    {/* Strike Price */}
                    <th className="text-center px-2 py-2 text-gray-300 bg-[#1a2942]/30">执行价</th>
                    {/* Put Options */}
                    <th className="text-center px-2 py-2 text-[#f97316] bg-[#f97316]/10" colSpan={6}>看跌期权 (Put)</th>
                  </tr>
                  <tr className="text-gray-400">
                    <th className="text-right px-2 py-1">买价</th>
                    <th className="text-right px-2 py-1">卖价</th>
                    <th className="text-right px-2 py-1">最新价</th>
                    <th className="text-right px-2 py-1">成交量</th>
                    <th className="text-right px-2 py-1">隐含波动率</th>
                    <th className="text-right px-2 py-1">Delta</th>
                    <th className="text-center px-2 py-1 font-medium">执行价</th>
                    <th className="text-right px-2 py-1">Delta</th>
                    <th className="text-right px-2 py-1">隐含波动率</th>
                    <th className="text-right px-2 py-1">成交量</th>
                    <th className="text-right px-2 py-1">最新价</th>
                    <th className="text-right px-2 py-1">卖价</th>
                    <th className="text-right px-2 py-1">买价</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedOptions)
                    .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
                    .map(([strike, contracts]) => {
                      const isAtm = Math.abs(parseFloat(strike) - currentPrice) < currentPrice * 0.02;
                      
                      return (
                        <tr
                          key={strike}
                          className={`border-b border-[#1a2942]/50 hover:bg-[#1a2942]/30 transition-colors ${
                            isAtm ? 'bg-[#0ea5e9]/5' : ''
                          }`}
                        >
                          {/* Call Options */}
                          <td className="text-right px-2 py-2 text-gray-300">
                            {contracts.call ? contracts.call.bid.toFixed(2) : '-'}
                          </td>
                          <td className="text-right px-2 py-2 text-gray-300">
                            {contracts.call ? contracts.call.ask.toFixed(2) : '-'}
                          </td>
                          <td className="text-right px-2 py-2 text-[#10b981] font-medium">
                            {contracts.call ? contracts.call.lastPrice.toFixed(2) : '-'}
                          </td>
                          <td className="text-right px-2 py-2 text-gray-400">
                            {contracts.call ? contracts.call.volume.toLocaleString() : '-'}
                          </td>
                          <td className="text-right px-2 py-2 text-gray-300">
                            {contracts.call ? (contracts.call.impliedVolatility * 100).toFixed(1) + '%' : '-'}
                          </td>
                          <td className="text-right px-2 py-2 text-gray-300">
                            {contracts.call ? contracts.call.delta.toFixed(3) : '-'}
                          </td>
                          
                          {/* Strike Price */}
                          <td className="text-center px-2 py-2 text-gray-200 font-medium bg-[#1a2942]/20">
                            {parseFloat(strike).toFixed(2)}
                          </td>
                          
                          {/* Put Options */}
                          <td className="text-right px-2 py-2 text-gray-300">
                            {contracts.put ? contracts.put.delta.toFixed(3) : '-'}
                          </td>
                          <td className="text-right px-2 py-2 text-gray-300">
                            {contracts.put ? (contracts.put.impliedVolatility * 100).toFixed(1) + '%' : '-'}
                          </td>
                          <td className="text-right px-2 py-2 text-gray-400">
                            {contracts.put ? contracts.put.volume.toLocaleString() : '-'}
                          </td>
                          <td className="text-right px-2 py-2 text-[#f97316] font-medium">
                            {contracts.put ? contracts.put.lastPrice.toFixed(2) : '-'}
                          </td>
                          <td className="text-right px-2 py-2 text-gray-300">
                            {contracts.put ? contracts.put.ask.toFixed(2) : '-'}
                          </td>
                          <td className="text-right px-2 py-2 text-gray-300">
                            {contracts.put ? contracts.put.bid.toFixed(2) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Futures Tab */}
        {activeTab === 'futures' && (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0a1628] border-b border-[#1a2942]">
                <tr className="text-gray-400">
                  <th className="text-left px-4 py-3">合约代码</th>
                  <th className="text-center px-4 py-3">交割月份</th>
                  <th className="text-right px-4 py-3">最新价</th>
                  <th className="text-right px-4 py-3">涨跌</th>
                  <th className="text-right px-4 py-3">涨跌幅</th>
                  <th className="text-right px-4 py-3">成交量</th>
                  <th className="text-right px-4 py-3">持仓量</th>
                  <th className="text-right px-4 py-3">结算价</th>
                  <th className="text-right px-4 py-3">基差</th>
                </tr>
              </thead>
              <tbody>
                {futuresContracts.map((contract, index) => (
                  <tr
                    key={contract.contractCode}
                    className="border-b border-[#1a2942]/50 hover:bg-[#1a2942]/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-200 font-medium">{contract.contractCode}</td>
                    <td className="text-center px-4 py-3 text-gray-300">{contract.contractMonth}</td>
                    <td className="text-right px-4 py-3 text-gray-200 font-medium">
                      ¥{contract.lastPrice.toFixed(2)}
                    </td>
                    <td className={`text-right px-4 py-3 font-medium ${
                      contract.change >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'
                    }`}>
                      {contract.change >= 0 ? '+' : ''}{contract.change.toFixed(2)}
                    </td>
                    <td className={`text-right px-4 py-3 font-medium ${
                      contract.changePercent >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'
                    }`}>
                      {contract.changePercent >= 0 ? '+' : ''}{contract.changePercent.toFixed(2)}%
                    </td>
                    <td className="text-right px-4 py-3 text-gray-400">
                      {contract.volume.toLocaleString()}
                    </td>
                    <td className="text-right px-4 py-3 text-gray-400">
                      {contract.openInterest.toLocaleString()}
                    </td>
                    <td className="text-right px-4 py-3 text-gray-300">
                      ¥{contract.settlementPrice.toFixed(2)}
                    </td>
                    <td className={`text-right px-4 py-3 ${
                      contract.basis >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'
                    }`}>
                      {contract.basis >= 0 ? '+' : ''}{contract.basis.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Volatility Tab */}
        {activeTab === 'volatility' && (
          <div className="flex-1 p-4 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-2">波动率曲面</p>
              <p className="text-xs">功能开发中...</p>
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <div className="bg-[#0a1628] p-3 rounded border border-[#1a2942]">
                  <div className="text-gray-400 mb-1">历史波动率</div>
                  <div className="text-gray-200 font-medium">23.5%</div>
                </div>
                <div className="bg-[#0a1628] p-3 rounded border border-[#1a2942]">
                  <div className="text-gray-400 mb-1">隐含波动率</div>
                  <div className="text-gray-200 font-medium">28.2%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OptionChainPanel;