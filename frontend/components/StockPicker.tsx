import { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Star, Plus, X, ChevronDown, ChevronUp, Filter, Target, Zap, BarChart3 } from 'lucide-react';
import { CompactTradingChart } from './TradingChart/EnhancedTradingChart';
import { 
  getStockInfoService, 
  useStockBasicInfo, 
  useStockSearch, 
  useStockList, 
  usePopularStocks,
  StockSearchResult,
  StockListResult 
} from '../services/StockInfoService';
import { getMarketDataProvider, useQuotes, QuoteData, FundamentalData } from '../services/MarketDataProvider';
import { getQuantCalculationService } from '../services/QuantCalculationService';
import { 
  getAlertService, 
  moduleCommunication,
  type Alert, 
  type AlertTriggerEvent 
} from '../services';

// 将后端数据类型映射到组件内部类型
interface Stock {
  code: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  volume: string;
  marketCap: string;
}

// 智能选股筛选条件
interface SmartScreeningCriteria {
  fundamentals: {
    peRange: [number, number];
    pbRange: [number, number];
    roeMin: number;
    revenueGrowthMin: number;
    debtRatioMax: number;
  };
  technical: {
    rsiRange: [number, number];
    enableVolumeTrend: boolean;
    enablePriceAboveMA: boolean;
    maPeriod: number;
  };
  market: {
    marketCapMin: number;
    volumeMin: number;
    liquidityMin: number;
  };
}

interface StockPickerProps {
  onViewChart?: (symbol: string) => void;
}

export function StockPicker({ onViewChart }: StockPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [filterSector, setFilterSector] = useState<string>('全部');
  const [filterMarket, setFilterMarket] = useState<'all' | 'sh' | 'sz'>('all');
  const [expandedStock, setExpandedStock] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // 智能选股相关状态
  const [showSmartScreen, setShowSmartScreen] = useState(false);
  const [smartScreening, setSmartScreening] = useState(false);
  const [screenedStocks, setScreenedStocks] = useState<Stock[]>([]);
  const [screeningCriteria, setScreeningCriteria] = useState<SmartScreeningCriteria>({
    fundamentals: {
      peRange: [0, 50],
      pbRange: [0, 10],
      roeMin: 10,
      revenueGrowthMin: 5,
      debtRatioMax: 60,
    },
    technical: {
      rsiRange: [30, 70],
      enableVolumeTrend: true,
      enablePriceAboveMA: true,
      maPeriod: 20,
    },
    market: {
      marketCapMin: 50, // 50亿
      volumeMin: 10000000, // 1千万
      liquidityMin: 0.1,
    },
  });
  
  const sectors = ['全部', '食品饮料', '银行', '医药生物', '电气设备', '非银金融', '汽车', '半导体', '社会服务'];
  
  // 使用搜索Hook
  const { data: searchResults, loading: searchLoading } = useStockSearch(
    searchQuery, 
    20
  );
  
  // 使用股票列表Hook
  const { data: stockListData, loading: listLoading } = useStockList(filterMarket, 100);
  
  // 使用热门股票Hook
  const { data: popularStocks, loading: popularLoading } = usePopularStocks(24);

  // 获取实时行情数据
  const allSymbols = [
    ...searchResults.map(s => s.symbol),
    ...stockListData.map(s => s.symbol),
    ...popularStocks.map(s => s.symbol)
  ];
  const { data: quotesData, loading: quotesLoading } = useQuotes(allSymbols, {
    refreshInterval: 3000, // 3秒刷新
    enableRealtime: true
  });

  // 转换数据格式，集成实时行情
  const convertToStock = (item: StockSearchResult | StockListResult): Stock => {
    const quote = quotesData[item.symbol];
    return {
      code: item.symbol,
      name: item.name,
      sector: item.sector,
      price: quote?.price || item.price || 0,
      change: quote?.changePercent || item.change_percent || 0,
      volume: quote ? formatVolume(quote.volume) : '-',
      marketCap: quote ? formatMarketCap(quote.marketCap) : '-'
    };
  };

  // 价格提醒服务集成
  const [pickerAlerts, setPickerAlerts] = useState<Alert[]>([]);
  const [alertNotifications, setAlertNotifications] = useState<AlertTriggerEvent[]>([]);

  // 初始化价格提醒服务连接
  useEffect(() => {
    const alertService = getAlertService();
    
    // 监听警报触发事件
    const unsubscribe = alertService.addEventListener('onAlertTriggered', (event: AlertTriggerEvent) => {
      setAlertNotifications(prev => [event, ...prev.slice(0, 4)]);
      
      // 如果触发的股票在当前视图中，高亮显示
      if (searchResults?.some(stock => stock.symbol === event.alert.symbol) ||
          stockListData?.some(stock => stock.symbol === event.alert.symbol)) {
        
        // 自动展开该股票的详情
        setExpandedStock(event.alert.symbol);
        
        // 如果没有在搜索，则搜索该股票
        if (!searchQuery) {
          setSearchQuery(event.alert.symbol);
          setShowSearchResults(true);
        }
      }
      
      // 通知模块通信系统
      moduleCommunication.emit('alert:stock-picker', {
        symbol: event.alert.symbol,
        alertName: event.alert.name,
        module: 'stock-picker'
      });
    });

    // 获取所有警报，筛选股票相关的
    const allAlerts = alertService.getAllAlerts();
    setPickerAlerts(allAlerts);

    return unsubscribe;
  }, [searchResults, stockListData, searchQuery]);

  // 为选中的股票创建快速警报
  const createQuickAlert = async (stockCode: string, alertType: 'price_above' | 'price_below') => {
    try {
      const alertService = getAlertService();
      const quote = quotesMap.get(stockCode);
      
      if (!quote) {
        console.warn('无法获取股票价格，无法创建警报');
        return;
      }

      const currentPrice = quote.price;
      const targetPrice = alertType === 'price_above' ? currentPrice * 1.05 : currentPrice * 0.95;
      
      const alertId = await alertService.createPriceAlert(stockCode, targetPrice, alertType, {
        priority: 'medium',
        notifications: ['browser', 'popup'],
        tags: ['stock-picker', 'quick-alert'],
        description: `从选股器快速创建的${alertType === 'price_above' ? '突破' : '跌破'}警报`
      });
      
      console.log(`已为 ${stockCode} 创建快速警报: ${alertId}`);
    } catch (error) {
      console.error('创建快速警报失败:', error);
    }
  };

  // 智能选股核心功能
  const performSmartScreening = async () => {
    setSmartScreening(true);
    try {
      const marketDataProvider = getMarketDataProvider();
      const quantService = getQuantCalculationService();
      
      // 获取候选股票池（使用当前的股票列表）
      const candidateStocks = stockListData.length > 0 ? stockListData : popularStocks;
      const screenedResults: Stock[] = [];
      
      console.log(`开始智能选股扫描，候选股票数量: ${candidateStocks.length}`);
      
      // 并行处理股票筛选（限制并发数量避免过载）
      const batchSize = 10;
      for (let i = 0; i < candidateStocks.length; i += batchSize) {
        const batch = candidateStocks.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(async (stock) => {
            try {
              // 获取基本面数据
              const fundamentalData = await marketDataProvider.getFundamentalData(stock.symbol);
              if (!fundamentalData) return null;
              
              // 获取实时行情数据
              const quotes = await marketDataProvider.getQuotes([stock.symbol]);
              const quote = quotes.get(stock.symbol);
              if (!quote) return null;
              
              // 应用筛选条件
              const passedScreening = await applyScreeningCriteria(fundamentalData, quote, stock);
              
              if (passedScreening) {
                return convertToStock(stock);
              }
              return null;
            } catch (error) {
              console.warn(`股票 ${stock.symbol} 筛选失败:`, error);
              return null;
            }
          })
        );
        
        // 收集成功筛选的结果
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            screenedResults.push(result.value);
          }
        });
        
        // 添加小延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`智能选股完成，筛选出 ${screenedResults.length} 只股票`);
      setScreenedStocks(screenedResults);
      
    } catch (error) {
      console.error('智能选股扫描失败:', error);
      setScreenedStocks([]);
    } finally {
      setSmartScreening(false);
    }
  };
  
  // 应用筛选条件
  const applyScreeningCriteria = async (
    fundamentalData: FundamentalData,
    quote: QuoteData,
    stock: StockSearchResult | StockListResult
  ): Promise<boolean> => {
    const criteria = screeningCriteria;
    
    // 基本面筛选
    if (fundamentalData.valuation.pe < criteria.fundamentals.peRange[0] || 
        fundamentalData.valuation.pe > criteria.fundamentals.peRange[1]) {
      return false;
    }
    
    if (fundamentalData.valuation.pb < criteria.fundamentals.pbRange[0] || 
        fundamentalData.valuation.pb > criteria.fundamentals.pbRange[1]) {
      return false;
    }
    
    if (fundamentalData.profitability.roe < criteria.fundamentals.roeMin) {
      return false;
    }
    
    if (fundamentalData.growth.revenueGrowth1Y < criteria.fundamentals.revenueGrowthMin) {
      return false;
    }
    
    if (fundamentalData.safety.debtToAssets * 100 > criteria.fundamentals.debtRatioMax) {
      return false;
    }
    
    // 市场筛选
    if ((quote.marketCap || 0) < criteria.market.marketCapMin * 100000000) { // 转换为亿
      return false;
    }
    
    if ((quote.volume || 0) < criteria.market.volumeMin) {
      return false;
    }
    
    // 技术指标筛选（简化实现）
    // 在实际应用中，这里应该获取历史数据进行技术分析
    // 这里使用模拟的技术指标值
    const mockRSI = 50 + (Math.random() - 0.5) * 40; // 模拟RSI值30-70
    if (mockRSI < criteria.technical.rsiRange[0] || mockRSI > criteria.technical.rsiRange[1]) {
      return false;
    }
    
    return true;
  };

  // 决定显示哪组股票数据
  const getDisplayStocks = (): Stock[] => {
    // 优先显示智能选股结果
    if (screenedStocks.length > 0 && !searchQuery.trim()) {
      return screenedStocks;
    }
    
    if (searchQuery.trim() && showSearchResults) {
      return searchResults.map(convertToStock);
    }
    
    if (stockListData.length > 0) {
      return stockListData.map(convertToStock);
    }
    
    return popularStocks.map(convertToStock);
  };

  const displayStocks = getDisplayStocks();
  const loading = searchQuery.trim() ? searchLoading : (listLoading || popularLoading);

  // 搜索状态管理
  useEffect(() => {
    if (searchQuery.trim()) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  // 格式化函数
  const formatVolume = (volume: number): string => {
    if (volume >= 100000000) {
      return `${(volume / 100000000).toFixed(1)}亿`;
    } else if (volume >= 10000) {
      return `${(volume / 10000).toFixed(1)}万`;
    } else {
      return volume.toString();
    }
  };

  const formatMarketCap = (marketCap: number | null | undefined): string => {
    if (!marketCap) return '-';
    if (marketCap >= 1000000000000) {
      return `${(marketCap / 1000000000000).toFixed(1)}万亿`;
    } else if (marketCap >= 100000000) {
      return `${(marketCap / 100000000).toFixed(0)}亿`;
    } else {
      return '-';
    }
  };

  const filteredStocks = displayStocks.filter(stock => {
    const matchSector = filterSector === '全部' || stock.sector === filterSector;
    return matchSector;
  });

  const toggleStock = (code: string) => {
    if (selectedStocks.includes(code)) {
      setSelectedStocks(selectedStocks.filter(c => c !== code));
    } else {
      setSelectedStocks([...selectedStocks, code]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl text-gray-200 mb-1">Stock Picker 股票选择器</h1>
          <p className="text-sm text-gray-500">搜索并选择您想要分析的股票，构建自定义股票池</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">
            已选择 <span className="text-[#0ea5e9]">{selectedStocks.length}</span> 只股票
          </div>
          {selectedStocks.length > 0 && (
            <button className="px-4 py-2 bg-[#0ea5e9] text-white rounded text-sm hover:bg-[#0284c7] transition-colors">
              创建股票池
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="搜索股票代码、名称、行业..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0a1628] border border-[#1a2942] rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#0ea5e9]"
            />
          </div>
          <button 
            onClick={() => setShowSmartScreen(!showSmartScreen)}
            className={`px-4 py-2.5 rounded text-sm transition-colors flex items-center gap-2 ${
              showSmartScreen 
                ? 'bg-[#0ea5e9] text-white' 
                : 'bg-[#1a2942] text-gray-300 hover:bg-[#2a3f5f]'
            }`}
          >
            <Target className="w-4 h-4" />
            智能选股
          </button>
        </div>

        {/* Market and Sector Filters */}
        <div className="space-y-3">
          {/* Market Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">市场：</span>
            {[
              { value: 'all' as const, label: '全部' },
              { value: 'sh' as const, label: '沪市' },
              { value: 'sz' as const, label: '深市' }
            ].map((market) => (
              <button
                key={market.value}
                onClick={() => setFilterMarket(market.value)}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${
                  filterMarket === market.value
                    ? 'bg-[#0ea5e9] text-white'
                    : 'bg-[#1a2942]/50 text-gray-400 hover:bg-[#1a2942]'
                }`}
              >
                {market.label}
              </button>
            ))}
          </div>
          
          {/* Sector Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">行业：</span>
            {sectors.map((sector) => (
              <button
                key={sector}
                onClick={() => setFilterSector(sector)}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${
                  filterSector === sector
                    ? 'bg-[#0ea5e9] text-white'
                    : 'bg-[#1a2942]/50 text-gray-400 hover:bg-[#1a2942]'
                }`}
              >
                {sector}
              </button>
            ))}
          </div>
        </div>

        {/* Smart Screening Panel */}
        {showSmartScreen && (
          <div className="mt-4 pt-4 border-t border-[#1a2942]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#0ea5e9]" />
                <span className="text-sm text-gray-300">智能选股扫描器</span>
              </div>
              <div className="flex items-center gap-2">
                {screenedStocks.length > 0 && (
                  <button 
                    onClick={() => setScreenedStocks([])}
                    className="px-3 py-1.5 bg-[#f97316]/20 text-[#f97316] rounded text-xs hover:bg-[#f97316]/30 transition-colors"
                  >
                    清除结果
                  </button>
                )}
                <button
                  onClick={performSmartScreening}
                  disabled={smartScreening}
                  className="px-4 py-1.5 bg-[#10b981] text-white rounded text-sm hover:bg-[#0f9b6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {smartScreening ? (
                    <>
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                      扫描中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      开始扫描
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              {/* 基本面条件 */}
              <div className="space-y-3">
                <h6 className="text-gray-400 font-medium">基本面筛选</h6>
                
                <div>
                  <label className="text-gray-500">市盈率 (PE)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={screeningCriteria.fundamentals.peRange[0]}
                      onChange={(e) => setScreeningCriteria(prev => ({
                        ...prev,
                        fundamentals: {
                          ...prev.fundamentals,
                          peRange: [parseFloat(e.target.value) || 0, prev.fundamentals.peRange[1]]
                        }
                      }))}
                      className="w-16 px-2 py-1 bg-[#0a1628] border border-[#1a2942] rounded text-gray-200"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      value={screeningCriteria.fundamentals.peRange[1]}
                      onChange={(e) => setScreeningCriteria(prev => ({
                        ...prev,
                        fundamentals: {
                          ...prev.fundamentals,
                          peRange: [prev.fundamentals.peRange[0], parseFloat(e.target.value) || 50]
                        }
                      }))}
                      className="w-16 px-2 py-1 bg-[#0a1628] border border-[#1a2942] rounded text-gray-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500">市净率 (PB)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={screeningCriteria.fundamentals.pbRange[0]}
                      onChange={(e) => setScreeningCriteria(prev => ({
                        ...prev,
                        fundamentals: {
                          ...prev.fundamentals,
                          pbRange: [parseFloat(e.target.value) || 0, prev.fundamentals.pbRange[1]]
                        }
                      }))}
                      className="w-16 px-2 py-1 bg-[#0a1628] border border-[#1a2942] rounded text-gray-200"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      value={screeningCriteria.fundamentals.pbRange[1]}
                      onChange={(e) => setScreeningCriteria(prev => ({
                        ...prev,
                        fundamentals: {
                          ...prev.fundamentals,
                          pbRange: [prev.fundamentals.pbRange[0], parseFloat(e.target.value) || 10]
                        }
                      }))}
                      className="w-16 px-2 py-1 bg-[#0a1628] border border-[#1a2942] rounded text-gray-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500">ROE最低(%)</label>
                  <input
                    type="number"
                    value={screeningCriteria.fundamentals.roeMin}
                    onChange={(e) => setScreeningCriteria(prev => ({
                      ...prev,
                      fundamentals: {
                        ...prev.fundamentals,
                        roeMin: parseFloat(e.target.value) || 10
                      }
                    }))}
                    className="w-full px-2 py-1 mt-1 bg-[#0a1628] border border-[#1a2942] rounded text-gray-200"
                  />
                </div>
              </div>

              {/* 技术面条件 */}
              <div className="space-y-3">
                <h6 className="text-gray-400 font-medium">技术面筛选</h6>
                
                <div>
                  <label className="text-gray-500">RSI区间</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={screeningCriteria.technical.rsiRange[0]}
                      onChange={(e) => setScreeningCriteria(prev => ({
                        ...prev,
                        technical: {
                          ...prev.technical,
                          rsiRange: [parseFloat(e.target.value) || 30, prev.technical.rsiRange[1]]
                        }
                      }))}
                      className="w-16 px-2 py-1 bg-[#0a1628] border border-[#1a2942] rounded text-gray-200"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      value={screeningCriteria.technical.rsiRange[1]}
                      onChange={(e) => setScreeningCriteria(prev => ({
                        ...prev,
                        technical: {
                          ...prev.technical,
                          rsiRange: [prev.technical.rsiRange[0], parseFloat(e.target.value) || 70]
                        }
                      }))}
                      className="w-16 px-2 py-1 bg-[#0a1628] border border-[#1a2942] rounded text-gray-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500">移动平均线周期</label>
                  <input
                    type="number"
                    value={screeningCriteria.technical.maPeriod}
                    onChange={(e) => setScreeningCriteria(prev => ({
                      ...prev,
                      technical: {
                        ...prev.technical,
                        maPeriod: parseInt(e.target.value) || 20
                      }
                    }))}
                    className="w-full px-2 py-1 mt-1 bg-[#0a1628] border border-[#1a2942] rounded text-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-gray-500">
                    <input
                      type="checkbox"
                      checked={screeningCriteria.technical.enableVolumeTrend}
                      onChange={(e) => setScreeningCriteria(prev => ({
                        ...prev,
                        technical: {
                          ...prev.technical,
                          enableVolumeTrend: e.target.checked
                        }
                      }))}
                      className="w-4 h-4 rounded border-[#1a2942] bg-[#0a1628] text-[#0ea5e9]"
                    />
                    成交量趋势
                  </label>
                  <label className="flex items-center gap-2 text-gray-500">
                    <input
                      type="checkbox"
                      checked={screeningCriteria.technical.enablePriceAboveMA}
                      onChange={(e) => setScreeningCriteria(prev => ({
                        ...prev,
                        technical: {
                          ...prev.technical,
                          enablePriceAboveMA: e.target.checked
                        }
                      }))}
                      className="w-4 h-4 rounded border-[#1a2942] bg-[#0ea5e9] text-[#0ea5e9]"
                    />
                    价格高于均线
                  </label>
                </div>
              </div>

              {/* 市场条件 */}
              <div className="space-y-3">
                <h6 className="text-gray-400 font-medium">市场筛选</h6>
                
                <div>
                  <label className="text-gray-500">最小市值(亿)</label>
                  <input
                    type="number"
                    value={screeningCriteria.market.marketCapMin}
                    onChange={(e) => setScreeningCriteria(prev => ({
                      ...prev,
                      market: {
                        ...prev.market,
                        marketCapMin: parseFloat(e.target.value) || 50
                      }
                    }))}
                    className="w-full px-2 py-1 mt-1 bg-[#0a1628] border border-[#1a2942] rounded text-gray-200"
                  />
                </div>

                <div>
                  <label className="text-gray-500">最小成交量</label>
                  <input
                    type="number"
                    value={screeningCriteria.market.volumeMin}
                    onChange={(e) => setScreeningCriteria(prev => ({
                      ...prev,
                      market: {
                        ...prev.market,
                        volumeMin: parseInt(e.target.value) || 10000000
                      }
                    }))}
                    className="w-full px-2 py-1 mt-1 bg-[#0a1628] border border-[#1a2942] rounded text-gray-200"
                  />
                </div>

                <div>
                  <label className="text-gray-500">流动性得分</label>
                  <input
                    type="number"
                    step="0.1"
                    value={screeningCriteria.market.liquidityMin}
                    onChange={(e) => setScreeningCriteria(prev => ({
                      ...prev,
                      market: {
                        ...prev.market,
                        liquidityMin: parseFloat(e.target.value) || 0.1
                      }
                    }))}
                    className="w-full px-2 py-1 mt-1 bg-[#0a1628] border border-[#1a2942] rounded text-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* 扫描结果状态 */}
            {screenedStocks.length > 0 && (
              <div className="mt-4 p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded">
                <div className="flex items-center gap-2 text-sm text-[#10b981]">
                  <BarChart3 className="w-4 h-4" />
                  <span>智能选股完成：筛选出 {screenedStocks.length} 只符合条件的股票</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Stocks Bar */}
      {selectedStocks.length > 0 && (
        <div className="bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-300">已选股票池</div>
            <button
              onClick={() => setSelectedStocks([])}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedStocks.map((code) => {
              const stock = displayStocks.find(s => s.code === code);
              return (
                <div
                  key={code}
                  className="px-3 py-1.5 bg-[#0d1b2e] border border-[#1a2942] rounded flex items-center gap-2"
                >
                  <span className="text-xs text-gray-400">{stock?.code}</span>
                  <span className="text-xs text-gray-300">{stock?.name}</span>
                  <button
                    onClick={() => toggleStock(code)}
                    className="ml-1 text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock List */}
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg">
        <div className="px-5 py-4 border-b border-[#1a2942] flex items-center justify-between">
          <h3 className="text-sm text-gray-400">
            {screenedStocks.length > 0 && !searchQuery.trim() ? (
              <>智能选股结果 ({filteredStocks.length} 只) - 根据您的筛选条件</>
            ) : searchQuery.trim() ? (
              <>搜索结果 ({filteredStocks.length} 只) - "{searchQuery}"</>
            ) : (
              <>股票列表 ({filteredStocks.length} 只) - {filterMarket === 'all' ? '全市场' : filterMarket === 'sh' ? '沪市' : '深市'}</>
            )}
          </h3>
          {(loading || quotesLoading) && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin"></div>
              {quotesLoading ? '更新行情中...' : '加载中...'}
            </div>
          )}
          {!loading && !quotesLoading && quotesData && Object.keys(quotesData).length > 0 && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              实时行情
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">加载股票数据中...</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a2942] text-gray-500 text-xs">
                  <th className="text-center px-5 py-3 w-12"></th>
                  <th className="text-left px-5 py-3">股票代码</th>
                  <th className="text-left px-5 py-3">股票名称</th>
                  <th className="text-left px-5 py-3">所属行业</th>
                  <th className="text-right px-5 py-3">最新价</th>
                  <th className="text-right px-5 py-3">涨跌幅</th>
                  <th className="text-right px-5 py-3">成交额</th>
                  <th className="text-right px-5 py-3">市值</th>
                  <th className="text-center px-5 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock) => {
                  const isSelected = selectedStocks.includes(stock.code);
                  const isExpanded = expandedStock === stock.code;
                  
                  return (
                    <tr
                      key={stock.code}
                      className={`border-b border-[#1a2942]/50 transition-colors ${
                        isSelected ? 'bg-[#0ea5e9]/10' : 'hover:bg-[#1a2942]/30'
                      }`}
                    >
                      <td className="px-5 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStock(stock.code)}
                          className="w-4 h-4 rounded border-[#1a2942] bg-[#0a1628] text-[#0ea5e9] focus:ring-[#0ea5e9] focus:ring-offset-0"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedStock(isExpanded ? null : stock.code)}
                            className="text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <span className="text-gray-400">{stock.code}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-200">{stock.name}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-1 bg-[#1a2942]/50 text-gray-400 rounded text-xs">
                          {stock.sector}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-200">
                        {stock.price > 0 ? `¥${stock.price.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div
                          className={`flex items-center justify-end gap-1 ${
                            stock.change >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'
                          }`}
                        >
                          {stock.change >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{stock.change >= 0 ? '+' : ''}{stock.change ? stock.change.toFixed(2) : '0.00'}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-400">{stock.volume}</td>
                      <td className="px-5 py-3 text-right text-gray-400">{stock.marketCap}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={() => toggleStock(stock.code)}
                            className={`px-3 py-1 rounded text-xs transition-colors ${
                              isSelected
                                ? 'bg-[#f97316]/20 text-[#f97316] hover:bg-[#f97316]/30'
                                : 'bg-[#0ea5e9]/20 text-[#0ea5e9] hover:bg-[#0ea5e9]/30'
                            }`}
                          >
                            {isSelected ? '移除' : '添加'}
                          </button>
                          <button
                            onClick={() => onViewChart?.(stock.code)}
                            className="px-3 py-1 bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 rounded text-xs transition-colors flex items-center gap-1"
                            title="查看图表分析"
                          >
                            <BarChart3 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {/* 展开的图表视图 - 单独渲染 */}
                {filteredStocks.map((stock) => {
                  const isExpanded = expandedStock === stock.code;
                  if (!isExpanded) return null;
                  
                  return (
                    <tr key={`${stock.code}-chart`}>
                      <td colSpan={9} className="px-5 py-4 bg-[#0a1628]/50">
                        <div className="flex gap-4">
                          {/* 左侧：快速信息 */}
                          <div className="w-48 flex-shrink-0">
                            <div className="space-y-3">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">股票代码</div>
                                <div className="text-sm text-gray-200 font-mono">{stock.code}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">股票名称</div>
                                <div className="text-sm text-gray-200">{stock.name}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-1">所属行业</div>
                                <div className="text-sm text-gray-400">{stock.sector}</div>
                              </div>
                              <div className="pt-2 border-t border-[#1a2942]">
                                <div className="text-xs text-gray-500 mb-2">快速操作</div>
                                <div className="space-y-2">
                                  <button 
                                    onClick={() => onViewChart?.(stock.code)}
                                    className="w-full px-3 py-2 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded text-xs hover:bg-[#0ea5e9]/30 transition-colors flex items-center gap-2 justify-center"
                                  >
                                    <BarChart3 className="w-3 h-3" />
                                    查看图表分析
                                  </button>
                                  <button className="w-full px-3 py-2 bg-[#1a2942]/50 text-gray-300 rounded text-xs hover:bg-[#1a2942] transition-colors">
                                    添加到自选
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 右侧：紧凑图表 */}
                          <div className="flex-1">
                            <CompactTradingChart
                              symbol={stock.code}
                              period="1M"
                              chartType="candlestick"
                              showVolume={false}
                              showControls={true}
                              height={250}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-4">
          <h4 className="text-sm text-gray-400 mb-2">智能选股策略</h4>
          <div className="space-y-2">
            <button 
              onClick={() => {
                setScreeningCriteria({
                  fundamentals: { peRange: [0, 30], pbRange: [0, 5], roeMin: 15, revenueGrowthMin: 10, debtRatioMax: 50 },
                  technical: { rsiRange: [30, 70], enableVolumeTrend: true, enablePriceAboveMA: true, maPeriod: 20 },
                  market: { marketCapMin: 100, volumeMin: 50000000, liquidityMin: 0.5 }
                });
                setShowSmartScreen(true);
              }}
              className="w-full px-3 py-2 bg-[#10b981]/20 text-[#10b981] rounded text-xs text-left hover:bg-[#10b981]/30 transition-colors"
            >
              高成长价值股
            </button>
            <button 
              onClick={() => {
                setScreeningCriteria({
                  fundamentals: { peRange: [0, 15], pbRange: [0, 3], roeMin: 12, revenueGrowthMin: 0, debtRatioMax: 30 },
                  technical: { rsiRange: [20, 80], enableVolumeTrend: false, enablePriceAboveMA: true, maPeriod: 50 },
                  market: { marketCapMin: 200, volumeMin: 30000000, liquidityMin: 0.3 }
                });
                setShowSmartScreen(true);
              }}
              className="w-full px-3 py-2 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded text-xs text-left hover:bg-[#0ea5e9]/30 transition-colors"
            >
              稳健防御型
            </button>
            <button 
              onClick={() => {
                setScreeningCriteria({
                  fundamentals: { peRange: [0, 100], pbRange: [0, 15], roeMin: 5, revenueGrowthMin: 20, debtRatioMax: 80 },
                  technical: { rsiRange: [40, 80], enableVolumeTrend: true, enablePriceAboveMA: true, maPeriod: 10 },
                  market: { marketCapMin: 20, volumeMin: 80000000, liquidityMin: 0.8 }
                });
                setShowSmartScreen(true);
              }}
              className="w-full px-3 py-2 bg-[#f59e0b]/20 text-[#f59e0b] rounded text-xs text-left hover:bg-[#f59e0b]/30 transition-colors"
            >
              科技成长股
            </button>
          </div>
        </div>

        <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-4">
          <h4 className="text-sm text-gray-400 mb-2">推荐股票池</h4>
          <div className="space-y-2">
            <button className="w-full px-3 py-2 bg-[#1a2942]/50 text-gray-300 rounded text-xs text-left hover:bg-[#1a2942] transition-colors">
              沪深300成分股 (300只)
            </button>
            <button className="w-full px-3 py-2 bg-[#1a2942]/50 text-gray-300 rounded text-xs text-left hover:bg-[#1a2942] transition-colors">
              中证500成分股 (500只)
            </button>
            <button className="w-full px-3 py-2 bg-[#1a2942]/50 text-gray-300 rounded text-xs text-left hover:bg-[#1a2942] transition-colors">
              科创50 (50只)
            </button>
          </div>
        </div>

        <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-4">
          <h4 className="text-sm text-gray-400 mb-2">行业精选</h4>
          <div className="space-y-2">
            <button className="w-full px-3 py-2 bg-[#1a2942]/50 text-gray-300 rounded text-xs text-left hover:bg-[#1a2942] transition-colors">
              新能源板块 (85只)
            </button>
            <button className="w-full px-3 py-2 bg-[#1a2942]/50 text-gray-300 rounded text-xs text-left hover:bg-[#1a2942] transition-colors">
              医药生物 (120只)
            </button>
            <button className="w-full px-3 py-2 bg-[#1a2942]/50 text-gray-300 rounded text-xs text-left hover:bg-[#1a2942] transition-colors">
              半导体芯片 (65只)
            </button>
          </div>
        </div>

        <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg p-4">
          <h4 className="text-sm text-gray-400 mb-2">我的股票池</h4>
          <div className="space-y-2">
            <button className="w-full px-3 py-2 bg-[#1a2942]/50 text-gray-300 rounded text-xs text-left hover:bg-[#1a2942] transition-colors flex items-center justify-between">
              <span>高成长价值股 (45只)</span>
              <Star className="w-3 h-3 text-[#f59e0b]" />
            </button>
            <button className="w-full px-3 py-2 bg-[#1a2942]/50 text-gray-300 rounded text-xs text-left hover:bg-[#1a2942] transition-colors">
              低波动防御组合 (30只)
            </button>
            <button className="w-full px-3 py-2 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded text-xs text-left hover:bg-[#0ea5e9]/30 transition-colors flex items-center gap-2">
              <Plus className="w-3 h-3" />
              <span>新建股票池</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}