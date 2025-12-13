/**
 * FullChartView - Bloomberg级全屏图表系统
 * 集成DrawingEngine专业画线工具和ChartService状态管理
 */

import { useState, useEffect, useRef } from 'react';
import { EnhancedTradingChart } from './TradingChart/EnhancedTradingChart';
import { useChartService } from '../services/ChartService';
import { getStockInfoService } from '../services/StockInfoService';
import { getDataStreamManager, type MarketData } from '../services/DataStreamManager';
import { getIndicatorCalculationService } from '../services/IndicatorCalculationService';
import { getMarketDataProvider } from '../services/MarketDataProvider';
import { 
  getAlertService, 
  moduleCommunication,
  type Alert, 
  type AlertTriggerEvent 
} from '../services';
import {
  X,
  Calendar,
  Clock,
  ChevronDown,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  TrendingUp,
  BarChart3,
  Activity,
  Settings,
} from 'lucide-react';

interface FullChartViewProps {
  symbol?: string;
  chartType?: 'candlestick' | 'line' | 'area' | 'bar';
  showVolume?: boolean;
  showMA?: boolean;
  showIndicators?: boolean;
  realtime?: boolean;
  initialTimeFrame?: string;
  onTimeFrameChange?: (timeFrame: string) => void;
  onClose: () => void;
}


// 时间区域预设
interface TimeRangePreset {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  duration: number; // 毫秒
  category: 'quick' | 'standard' | 'extended';
}

// 自定义时间范围
interface CustomTimeRange {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
}

export function FullChartView({ 
  symbol: initialSymbol,
  chartType: initialChartType,
  showVolume: initialShowVolume = true,
  showMA: initialShowMA = true,
  showIndicators: initialShowIndicators = true,
  realtime: initialRealtime = true,
  initialTimeFrame,
  onTimeFrameChange,
  onClose 
}: FullChartViewProps) {
  const {
    state,
    setSymbol,
    setInterval,
    updateSettings,
  } = useChartService();

  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol || state.settings.symbol);
  
  // 时间区间映射：ChartWorkbench的时间区间 -> FullChartView的时间区间
  const timeFrameMapping = {
    '1天': '1D',
    '5天': '5D', 
    '1月': '1M',
    '6月': '6M',
    '年至今': 'YTD',
    '1年': '1Y',
    '5年': '5Y',
    '全部': 'ALL'
  } as const;

  // 反向映射：FullChartView -> ChartWorkbench
  const reverseTimeFrameMapping = Object.fromEntries(
    Object.entries(timeFrameMapping).map(([k, v]) => [v, k])
  ) as Record<string, string>;

  // 初始化时间区间选择状态，优先使用传入的时间区间
  const getInitialTimeRange = () => {
    if (initialTimeFrame && timeFrameMapping[initialTimeFrame as keyof typeof timeFrameMapping]) {
      return timeFrameMapping[initialTimeFrame as keyof typeof timeFrameMapping];
    }
    return '1M'; // 默认1个月
  };
  
  const [selectedTimeRange, setSelectedTimeRange] = useState(getInitialTimeRange());
  const [customTimeRange, setCustomTimeRange] = useState<CustomTimeRange | null>(null);
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = useState(false);
  const [showCustomTimeDialog, setShowCustomTimeDialog] = useState(false);
  const [showIndicatorSettings, setShowIndicatorSettings] = useState(false);
  const [indicatorLoading, setIndicatorLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeRangeDropdownRef = useRef<HTMLDivElement>(null);


  const defaultSymbols = [
    { symbol: '600519', name: '贵州茅台', price: '—', change: '—' },
    { symbol: '300750', name: '宁德时代', price: '—', change: '—' },
    { symbol: '000858', name: '五粮液', price: '—', change: '—' },
    { symbol: '600036', name: '招商银行', price: '—', change: '—' },
    { symbol: '002594', name: '比亚迪', price: '—', change: '—' },
    { symbol: '601318', name: '中国平安', price: '—', change: '—' },
    { symbol: '000333', name: '美的集团', price: '—', change: '—' },
    { symbol: '600276', name: '恒瑞医药', price: '—', change: '—' },
  ];
  const [symbolWatchlist, setSymbolWatchlist] = useState(defaultSymbols);

  // Bloomberg级时间区域预设
  const timeRangePresets: TimeRangePreset[] = [
    // 快捷选择
    { id: '1H', label: '1小时', shortLabel: '1H', description: '最近1小时', duration: 60 * 60 * 1000, category: 'quick' },
    { id: '4H', label: '4小时', shortLabel: '4H', description: '最近4小时', duration: 4 * 60 * 60 * 1000, category: 'quick' },
    { id: '1D', label: '1天', shortLabel: '1D', description: '最近1天', duration: 24 * 60 * 60 * 1000, category: 'quick' },
    
    // 标准选择
    { id: '5D', label: '5天', shortLabel: '5D', description: '最近5个交易日', duration: 5 * 24 * 60 * 60 * 1000, category: 'standard' },
    { id: '1M', label: '1个月', shortLabel: '1M', description: '最近1个月', duration: 30 * 24 * 60 * 60 * 1000, category: 'standard' },
    { id: '3M', label: '3个月', shortLabel: '3M', description: '最近3个月', duration: 90 * 24 * 60 * 60 * 1000, category: 'standard' },
    { id: '6M', label: '6个月', shortLabel: '6M', description: '最近6个月', duration: 180 * 24 * 60 * 60 * 1000, category: 'standard' },
    
    // 扩展选择
    { id: '1Y', label: '1年', shortLabel: '1Y', description: '最近1年', duration: 365 * 24 * 60 * 60 * 1000, category: 'extended' },
    { id: 'YTD', label: '今年至今', shortLabel: 'YTD', description: '从今年1月1日至今', duration: 0, category: 'extended' },
    { id: '2Y', label: '2年', shortLabel: '2Y', description: '最近2年', duration: 2 * 365 * 24 * 60 * 60 * 1000, category: 'extended' },
    { id: '5Y', label: '5年', shortLabel: '5Y', description: '最近5年', duration: 5 * 365 * 24 * 60 * 60 * 1000, category: 'extended' },
    { id: 'ALL', label: '全部', shortLabel: 'ALL', description: '所有可用数据', duration: 0, category: 'extended' },
  ];
  
  // 获取当前选中的预设
  const currentPreset = timeRangePresets.find(p => p.id === selectedTimeRange);

  // 加载热门列表的实时行情
  useEffect(() => {
    let cancelled = false;
    const fetchQuotes = async () => {
      try {
        const provider = getMarketDataProvider();
        const quotes = await provider.getQuotes(defaultSymbols.map((item) => item.symbol));
        if (cancelled) return;
        const updated = defaultSymbols.map((item) => {
          const quote = quotes.get(item.symbol);
          if (!quote) return item;
          const changePercent = quote.changePercent ?? 0;
          return {
            symbol: item.symbol,
            name: item.name,
            price: quote.price?.toFixed ? quote.price.toFixed(2) : `${quote.price}`,
            change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`
          };
        });
        setSymbolWatchlist(updated);
      } catch (error) {
        console.warn('[FullChartView] Failed to load watchlist quotes:', error);
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  
  // 处理时间区域变化
  const handleTimeRangeChange = (rangeId: string) => {
    setSelectedTimeRange(rangeId);
    setCustomTimeRange(null);
    setInterval(rangeId as any);
    setShowTimeRangeDropdown(false);
    
    // 同步回ChartWorkbench组件
    if (onTimeFrameChange && reverseTimeFrameMapping[rangeId]) {
      onTimeFrameChange(reverseTimeFrameMapping[rangeId]);
    }
    
    console.log('[FullChartView] Time range changed:', {
      rangeId,
      mappedBack: reverseTimeFrameMapping[rangeId],
      preset: timeRangePresets.find(p => p.id === rangeId)
    });
  };
  
  // 处理自定义时间范围
  const handleCustomTimeRange = (customRange: CustomTimeRange) => {
    setCustomTimeRange(customRange);
    setSelectedTimeRange('Custom');
    setShowCustomTimeDialog(false);
    
    console.log('[FullChartView] Custom time range set:', customRange);
  };
  
  // 重置到默认范围
  const resetTimeRange = () => {
    handleTimeRangeChange('1M');
  };

  // 价格提醒服务集成
  const [fullscreenAlerts, setFullscreenAlerts] = useState<Alert[]>([]);
  const [alertBanner, setAlertBanner] = useState<AlertTriggerEvent | null>(null);

  // 初始化价格提醒服务连接
  useEffect(() => {
    const alertService = getAlertService();
    
    // 监听警报触发事件
    const unsubscribe = alertService.addEventListener('onAlertTriggered', (event: AlertTriggerEvent) => {
      // 如果触发的是当前全屏图表的股票，显示横幅提醒
      if (event.alert.symbol === selectedSymbol) {
        setAlertBanner(event);
        
        // 3秒后自动隐藏横幅
        setTimeout(() => {
          setAlertBanner(null);
        }, 3000);
      }
      
      // 通知模块通信系统
      moduleCommunication.emit('alert:fullscreen', {
        symbol: event.alert.symbol,
        alertName: event.alert.name,
        currentSymbol: selectedSymbol,
        module: 'fullscreen'
      });
    });

    // 获取当前股票的所有警报
    const allAlerts = alertService.getAllAlerts();
    const symbolAlerts = allAlerts.filter(alert => alert.symbol === selectedSymbol);
    setFullscreenAlerts(symbolAlerts);

    return unsubscribe;
  }, [selectedSymbol]);

  // 创建快速价格警报
  const createQuickPriceAlert = async (targetPrice: number) => {
    try {
      const alertService = getAlertService();
      
      // 获取当前价格判断方向
      const marketData = await getMarketDataProvider().getQuotes([selectedSymbol]);
      const currentPrice = marketData.get(selectedSymbol)?.price;
      
      if (!currentPrice) return;
      
      const direction = targetPrice > currentPrice ? 'price_above' : 'price_below';
      
      const alertId = await alertService.createPriceAlert(selectedSymbol, targetPrice, direction, {
        priority: 'medium',
        notifications: ['browser', 'popup'],
        tags: ['fullscreen', 'quick-alert'],
        description: '全屏图表快速创建的价格警报'
      });
      
      console.log(`已创建全屏图表警报: ${alertId}`);
    } catch (error) {
      console.error('创建全屏图表警报失败:', error);
    }
  };

  // 获取股票历史数据的最早时间（使用真实AkShare数据）
  const getStockEarliestDate = async (symbol: string): Promise<number> => {
    try {
      const stockInfoService = getStockInfoService();
      const listingDate = await stockInfoService.getStockListingDate(symbol);
      
      if (listingDate) {
        return listingDate.getTime();
      }
    } catch (error) {
      console.error(`Failed to get listing date for ${symbol}:`, error);
    }
    
    // 回退到模拟数据
    const stockListingDates: Record<string, string> = {
      '600519': '2001-08-27', // 贵州茅台上市时间
      '300750': '2018-06-11', // 宁德时代上市时间  
      '000858': '1998-04-27', // 五粮液上市时间
      '600036': '2002-04-09', // 招商银行上市时间
      '002594': '2011-06-30', // 比亚迪上市时间
      '601318': '2007-03-01', // 中国平安上市时间
      '000333': '2013-09-18', // 美的集团上市时间
      '600276': '2000-10-18', // 恒瑞医药上市时间
    };
    
    const listingDate = stockListingDates[symbol] || '2010-01-01'; // 默认2010年
    return new Date(listingDate).getTime();
  };

  // 存储股票上市时间的状态
  const [stockListingTimes, setStockListingTimes] = useState<Map<string, number>>(new Map());

  // 计算时间区间的实际时间范围（用于数据加载和X轴计算）
  const calculateTimeRange = (rangeId: string) => {
    const now = Date.now();
    let startTime: number;
    let endTime: number = now;
    
    switch (rangeId) {
      case '1H':
        startTime = now - 60 * 60 * 1000;
        break;
      case '4H':
        startTime = now - 4 * 60 * 60 * 1000;
        break;
      case '1D':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case '5D':
        startTime = now - 5 * 24 * 60 * 60 * 1000;
        break;
      case '1M':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case '3M':
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case '6M':
        startTime = now - 180 * 24 * 60 * 60 * 1000;
        break;
      case '1Y':
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
      case 'YTD':
        // 今年1月1日
        const currentYear = new Date().getFullYear();
        startTime = new Date(currentYear, 0, 1).getTime();
        break;
      case '2Y':
        startTime = now - 2 * 365 * 24 * 60 * 60 * 1000;
        break;
      case '5Y':
        startTime = now - 5 * 365 * 24 * 60 * 60 * 1000;
        break;
      case 'ALL':
        // 使用缓存的股票上市时间或默认值
        const cachedListingTime = stockListingTimes.get(selectedSymbol);
        if (cachedListingTime) {
          startTime = cachedListingTime;
        } else {
          // 使用默认回退时间，同时异步获取真实时间
          startTime = new Date('2010-01-01').getTime();
          loadStockListingTime(selectedSymbol);
        }
        break;
      default:
        startTime = now - 30 * 24 * 60 * 60 * 1000; // 默认1个月
    }
    
    return { startTime, endTime };
  };

  // 异步加载股票上市时间
  const loadStockListingTime = async (symbol: string) => {
    setDataLoading(true);
    setError(null);
    
    try {
      const listingTime = await getStockEarliestDate(symbol);
      setStockListingTimes(prev => new Map(prev).set(symbol, listingTime));
    } catch (error) {
      console.error(`Failed to load listing time for ${symbol}:`, error);
      setError(`无法获取${symbol}的上市时间数据`);
    } finally {
      setDataLoading(false);
    }
  };

  // 加载技术指标数据
  const loadIndicatorData = async () => {
    setIndicatorLoading(true);
    setError(null);
    
    try {
      const indicatorService = getIndicatorCalculationService();
      const marketDataProvider = getMarketDataProvider();
      
      // 获取历史数据用于技术指标计算
      const { startTime, endTime } = calculateTimeRange(selectedTimeRange);
      const startDate = new Date(startTime).toISOString().split('T')[0];
      const endDate = new Date(endTime).toISOString().split('T')[0];
      
      const historicalData = await marketDataProvider.getHistoricalData(
        selectedSymbol,
        startDate,
        endDate,
        '1D'
      );
      
      if (historicalData.success && historicalData.data.length > 0) {
        // 计算RSI
        const rsiResult = await indicatorService.calculateRSI(historicalData.data, 14);
        
        // 计算MACD
        const macdResult = await indicatorService.calculateMACD(
          historicalData.data,
          12, // 快线
          26, // 慢线
          9   // 信号线
        );
        
        // 计算布林带
        const bollResult = await indicatorService.calculateBollingerBands(
          historicalData.data,
          20, // 周期
          2   // 标准差倍数
        );
        
        console.log('[FullChartView] Technical indicators loaded:', {
          rsi: rsiResult.success,
          macd: macdResult.success,
          boll: bollResult.success
        });
      }
    } catch (error) {
      console.error('Failed to load indicator data:', error);
      setError('技术指标加载失败');
    } finally {
      setIndicatorLoading(false);
    }
  };

  // 实时数据流管理
  useEffect(() => {
    if (!initialRealtime) return;
    
    const dataStreamManager = getDataStreamManager();
    
    const handleRealtimeData = (data: MarketData) => {
      console.log('[FullChartView] Realtime data received:', data);
      // 这里可以更新图表的实时价格
    };

    const subscriptionId = dataStreamManager.subscribe([selectedSymbol], handleRealtimeData);

    return () => {
      dataStreamManager.unsubscribe(subscriptionId);
    };
  }, [selectedSymbol, initialRealtime]);

  // 获取当前选中时间区间的计算数据
  const currentTimeRange = calculateTimeRange(selectedTimeRange);

  // 时间区间数据加载
  useEffect(() => {
    const periodMap = {
      '1D': '1d',
      '5D': '5d', 
      '1M': '1M',
      '3M': '3M',
      '6M': '6M',
      '1Y': '1Y',
      '2Y': '2Y',
      '5Y': '5Y',
      'YTD': 'YTD',
      'ALL': 'max'
    };
    
    const period = periodMap[selectedTimeRange as keyof typeof periodMap] || '1M';
    
    console.log(`[FullChartView] Time range updated:`, {
      symbol: selectedSymbol,
      timeRange: selectedTimeRange,
      mappedPeriod: period,
      startTime: currentTimeRange.startTime,
      endTime: currentTimeRange.endTime
    });
  }, [selectedSymbol, selectedTimeRange, currentTimeRange.startTime, currentTimeRange.endTime]);


  // ESC键关闭和点击外部关闭下拉菜单
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTimeRangeDropdown) {
          setShowTimeRangeDropdown(false);
        } else if (showCustomTimeDialog) {
          setShowCustomTimeDialog(false);
        } else {
          onClose();
        }
      }
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      if (timeRangeDropdownRef.current && !timeRangeDropdownRef.current.contains(e.target as Node)) {
        setShowTimeRangeDropdown(false);
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, showTimeRangeDropdown, showCustomTimeDialog]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a1628] flex flex-col">
      {/* 顶部工具栏 - Bloomberg级时间控制 */}
      <div className="bg-[#0d1b2e] border-b border-[#1a2942] px-6 py-3 flex items-center justify-between">
        {/* 左侧：股票信息 */}
        <div className="flex items-center space-x-4">
          <div className="text-white font-semibold text-lg">
            {selectedSymbol} - {symbolWatchlist.find(s => s.symbol === selectedSymbol)?.name || '未知股票'}
          </div>
          {/* 数据加载状态 */}
          {dataLoading && (
            <div className="flex items-center space-x-2 px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
              <div className="w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
              <span>加载数据中...</span>
            </div>
          )}
          {/* 错误状态 */}
          {error && (
            <div className="flex items-center space-x-2 px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs">
              <span>⚠️ {error}</span>
              <button
                onClick={() => {
                  setError(null);
                  if (selectedTimeRange === 'ALL') {
                    loadStockListingTime(selectedSymbol);
                  }
                }}
                className="text-red-200 hover:text-white underline"
              >
                重试
              </button>
            </div>
          )}
        </div>
        
        {/* 中部：时间区域选择器 */}
        <div className="flex items-center space-x-2">
          {/* 快捷时间按钮 */}
          <div className="flex items-center space-x-1">
            {timeRangePresets.filter(p => p.category === 'standard').map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleTimeRangeChange(preset.id)}
                className={`px-3 py-1.5 rounded text-sm font-mono transition-all duration-200 ${
                  selectedTimeRange === preset.id
                    ? 'bg-[#0ea5e9] text-white shadow-lg'
                    : 'bg-[#1a2942] text-gray-300 hover:bg-[#243249] hover:text-white'
                }`}
                title={preset.description}
              >
                {preset.shortLabel}
              </button>
            ))}
          </div>
          
          {/* 时间范围下拉菜单 */}
          <div className="relative" ref={timeRangeDropdownRef}>
            <button
              onClick={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-[#1a2942] hover:bg-[#243249] text-gray-300 hover:text-white rounded transition-all duration-200"
              title="更多时间范围选项"
            >
              <Clock className="w-4 h-4" />
              <span className="text-sm font-mono">
                {customTimeRange ? 'Custom' : (currentPreset?.label || '更多')}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${
                showTimeRangeDropdown ? 'rotate-180' : ''
              }`} />
            </button>
            
            {/* 下拉菜单内容 */}
            {showTimeRangeDropdown && (
              <TimeRangeDropdown
                presets={timeRangePresets}
                selectedRange={selectedTimeRange}
                onRangeChange={handleTimeRangeChange}
                onCustomRange={() => {
                  setShowCustomTimeDialog(true);
                  setShowTimeRangeDropdown(false);
                }}
              />
            )}
          </div>
          
          {/* 重置按钮 */}
          <button
            onClick={resetTimeRange}
            className="p-1.5 bg-[#1a2942] hover:bg-[#243249] text-gray-400 hover:text-white rounded transition-all"
            title="重置到默认时间范围 (3个月)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        
        {/* 右侧：技术指标和关闭按钮 */}
        <div className="flex items-center space-x-2">
          {/* 技术指标设置按钮 */}
          <button
            onClick={() => {
              setShowIndicatorSettings(!showIndicatorSettings);
              if (!showIndicatorSettings && !indicatorLoading) {
                loadIndicatorData();
              }
            }}
            disabled={indicatorLoading}
            className={`p-2 hover:bg-[#1a2942] text-gray-400 hover:text-white rounded transition-all disabled:opacity-50 ${
              showIndicatorSettings ? 'bg-[#1a2942] text-white' : ''
            }`}
            title="技术指标设置"
          >
            <TrendingUp className={`w-5 h-5 ${indicatorLoading ? 'animate-pulse' : ''}`} />
          </button>
          
          {/* 指标加载状态 */}
          {indicatorLoading && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-md text-sm">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
              <span>计算指标中...</span>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1a2942] text-gray-400 hover:text-white rounded transition-all"
            title="关闭全屏模式 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* 主体区域 - Bloomberg级图表 */}
      <div className="flex-1 overflow-hidden p-6 relative">
        <EnhancedTradingChart
          symbol={selectedSymbol}
          period={selectedTimeRange as any}
          chartType={initialChartType as 'candlestick' | 'line' | 'area'}
          showVolume={initialShowVolume}
          showMA={initialShowMA}
          showGrid={true}
          showKeyLevels={true}
          showCurrentPrice={initialRealtime}
          showSeparators={true}
          enableDrawing={true}
          showControls={true}
          showTooltip={true}
          showIndicators={initialShowIndicators}
          height={window.innerHeight - 120} // 调整高度以适应顶部工具栏
          className="h-full"
        />
        
        {/* 技术指标设置面板 */}
        {showIndicatorSettings && (
          <TechnicalIndicatorPanel
            symbol={selectedSymbol}
            loading={indicatorLoading}
            onClose={() => setShowIndicatorSettings(false)}
            onApply={(indicators) => {
              console.log('[FullChartView] Applied indicators:', indicators);
              setShowIndicatorSettings(false);
            }}
          />
        )}
      </div>
      
      {/* 自定义时间范围对话框 */}
      {showCustomTimeDialog && (
        <CustomTimeRangeDialog
          onConfirm={handleCustomTimeRange}
          onCancel={() => setShowCustomTimeDialog(false)}
          currentRange={customTimeRange}
        />
      )}

    </div>
  );
}

// 时间范围下拉菜单组件
interface TimeRangeDropdownProps {
  presets: TimeRangePreset[];
  selectedRange: string;
  onRangeChange: (rangeId: string) => void;
  onCustomRange: () => void;
}

function TimeRangeDropdown({ presets, selectedRange, onRangeChange, onCustomRange }: TimeRangeDropdownProps) {
  return (
    <div className="absolute top-full right-0 mt-2 bg-[#0d1b2e] border border-[#1a2942] rounded-lg shadow-xl z-10 min-w-[320px]">
      {/* 菜单头部 */}
      <div className="px-4 py-3 border-b border-[#1a2942]">
        <h3 className="text-sm font-semibold text-white mb-1">时间范围选择</h3>
        <p className="text-xs text-gray-400">选择图表显示的时间范围</p>
      </div>
      
      {/* 快捷选择 */}
      <div className="p-3">
        <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">快捷选择</h4>
        <div className="grid grid-cols-3 gap-2">
          {presets.filter(p => p.category === 'quick').map((preset) => (
            <button
              key={preset.id}
              onClick={() => onRangeChange(preset.id)}
              className={`px-3 py-2 text-sm font-mono rounded transition-all ${
                selectedRange === preset.id
                  ? 'bg-[#0ea5e9] text-white'
                  : 'bg-[#1a2942] text-gray-300 hover:bg-[#243249]'
              }`}
              title={preset.description}
            >
              {preset.shortLabel}
            </button>
          ))}
        </div>
      </div>
      
      {/* 标准选择 */}
      <div className="p-3 border-t border-[#1a2942]">
        <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">标准区间</h4>
        <div className="space-y-1">
          {presets.filter(p => p.category === 'standard').map((preset) => (
            <button
              key={preset.id}
              onClick={() => onRangeChange(preset.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-all ${
                selectedRange === preset.id
                  ? 'bg-[#0ea5e9] text-white'
                  : 'text-gray-300 hover:bg-[#1a2942]'
              }`}
            >
              <span className="font-mono">{preset.shortLabel}</span>
              <span className="text-xs opacity-75">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* 扩展选择 */}
      <div className="p-3 border-t border-[#1a2942]">
        <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">扩展区间</h4>
        <div className="space-y-1">
          {presets.filter(p => p.category === 'extended').map((preset) => (
            <button
              key={preset.id}
              onClick={() => onRangeChange(preset.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-all ${
                selectedRange === preset.id
                  ? 'bg-[#0ea5e9] text-white'
                  : 'text-gray-300 hover:bg-[#1a2942]'
              }`}
            >
              <span className="font-mono">{preset.shortLabel}</span>
              <span className="text-xs opacity-75">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* 自定义时间范围 */}
      <div className="p-3 border-t border-[#1a2942]">
        <button
          onClick={onCustomRange}
          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-[#0ea5e9] hover:bg-[#1a2942] rounded transition-all"
        >
          <Calendar className="w-4 h-4" />
          <span>自定义时间范围...</span>
        </button>
      </div>
    </div>
  );
}


// 自定义时间范围对话框组件
interface CustomTimeRangeDialogProps {
  onConfirm: (range: CustomTimeRange) => void;
  onCancel: () => void;
  currentRange?: CustomTimeRange | null;
}

function CustomTimeRangeDialog({ onConfirm, onCancel, currentRange }: CustomTimeRangeDialogProps) {
  const [startDate, setStartDate] = useState(
    currentRange?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    currentRange?.endDate || new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState(currentRange?.startTime || '09:30');
  const [endTime, setEndTime] = useState(currentRange?.endTime || '15:00');
  const [includeTime, setIncludeTime] = useState(!!currentRange?.startTime);
  
  const handleConfirm = () => {
    // 验证日期范围
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      alert('开始日期不能晚于结束日期');
      return;
    }
    
    const range: CustomTimeRange = {
      startDate,
      endDate,
      ...(includeTime && { startTime, endTime })
    };
    
    onConfirm(range);
  };
  
  // 快捷日期选择
  const quickDateRanges = [
    { label: '最近7天', days: 7 },
    { label: '最近30天', days: 30 },
    { label: '最近90天', days: 90 },
    { label: '本月', days: 'thisMonth' as const },
    { label: '上月', days: 'lastMonth' as const },
  ];
  
  const applyQuickRange = (range: typeof quickDateRanges[0]) => {
    const now = new Date();
    let start: Date;
    
    if (range.days === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range.days === 'lastMonth') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setEndDate(end.toISOString().split('T')[0]);
    } else {
      start = new Date(now.getTime() - (range.days as number) * 24 * 60 * 60 * 1000);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    if (range.days !== 'lastMonth') {
      setEndDate(now.toISOString().split('T')[0]);
    }
  };
  
  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[#0d1b2e] border border-[#1a2942] rounded-lg shadow-2xl w-full max-w-md">
        {/* 对话框头部 */}
        <div className="px-6 py-4 border-b border-[#1a2942]">
          <h2 className="text-lg font-semibold text-white">自定义时间范围</h2>
          <p className="text-sm text-gray-400 mt-1">选择具体的开始和结束时间</p>
        </div>
        
        {/* 对话框内容 */}
        <div className="px-6 py-4 space-y-4">
          {/* 快捷选择 */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">快捷选择</label>
            <div className="flex flex-wrap gap-2">
              {quickDateRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => applyQuickRange(range)}
                  className="px-3 py-1 text-xs bg-[#1a2942] hover:bg-[#243249] text-gray-300 hover:text-white rounded transition-all"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* 日期选择 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a2942] border border-[#2a3f5f] rounded text-white text-sm focus:outline-none focus:border-[#0ea5e9] transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a2942] border border-[#2a3f5f] rounded text-white text-sm focus:outline-none focus:border-[#0ea5e9] transition-colors"
              />
            </div>
          </div>
          
          {/* 包含具体时间选项 */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeTime}
                onChange={(e) => setIncludeTime(e.target.checked)}
                className="form-checkbox h-4 w-4 text-[#0ea5e9] bg-[#1a2942] border-[#2a3f5f] rounded focus:ring-[#0ea5e9] focus:ring-offset-0"
              />
              <span className="text-sm text-gray-300">包含具体时间 (适用于日内数据)</span>
            </label>
          </div>
          
          {/* 时间选择 */}
          {includeTime && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">开始时间</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a2942] border border-[#2a3f5f] rounded text-white text-sm focus:outline-none focus:border-[#0ea5e9] transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">结束时间</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a2942] border border-[#2a3f5f] rounded text-white text-sm focus:outline-none focus:border-[#0ea5e9] transition-colors"
                />
              </div>
            </div>
          )}
          
          {/* 提示信息 */}
          <div className="bg-[#1a2942] border border-[#2a3f5f] rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="w-1 h-1 bg-[#0ea5e9] rounded-full mt-2"></div>
              <div className="text-xs text-gray-400">
                <p>• 日期格式会自动适配可用的数据范围</p>
                <p>• 包含时间选项适用于1天内的高频数据分析</p>
                <p>• 系统会自动加载指定范围内的K线数据</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 对话框底部 */}
        <div className="px-6 py-4 border-t border-[#1a2942] flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm rounded transition-colors"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

// 技术指标设置面板组件
interface TechnicalIndicatorPanelProps {
  symbol: string;
  loading: boolean;
  onClose: () => void;
  onApply: (indicators: any[]) => void;
}

function TechnicalIndicatorPanel({ symbol, loading, onClose, onApply }: TechnicalIndicatorPanelProps) {
  const [selectedIndicators, setSelectedIndicators] = useState({
    ma: { enabled: true, periods: [5, 10, 20] },
    rsi: { enabled: true, period: 14 },
    macd: { enabled: true, fast: 12, slow: 26, signal: 9 },
    boll: { enabled: false, period: 20, deviation: 2 },
    kdj: { enabled: false },
    cci: { enabled: false, period: 14 },
  });

  const handleApply = () => {
    const activeIndicators = Object.entries(selectedIndicators)
      .filter(([_, config]) => config.enabled)
      .map(([name, config]) => ({ name, ...config }));
    
    onApply(activeIndicators);
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-[#0d1b2e] border border-[#1a2942] rounded-lg shadow-xl z-10">
      {/* 面板头部 */}
      <div className="px-4 py-3 border-b border-[#1a2942] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">技术指标设置</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#1a2942] rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      {/* 面板内容 */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-400">计算指标中...</span>
            </div>
          </div>
        )}
        
        {!loading && (
          <>
            {/* 移动平均线 */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedIndicators.ma.enabled}
                  onChange={(e) => setSelectedIndicators(prev => ({
                    ...prev,
                    ma: { ...prev.ma, enabled: e.target.checked }
                  }))}
                  className="form-checkbox h-4 w-4 text-[#0ea5e9]"
                />
                <span className="text-sm text-gray-300">移动平均线 (MA)</span>
              </label>
              {selectedIndicators.ma.enabled && (
                <div className="ml-6 space-y-2">
                  <div className="text-xs text-gray-400">周期设置:</div>
                  <div className="flex gap-2">
                    {[5, 10, 20, 30, 60].map(period => (
                      <label key={period} className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={selectedIndicators.ma.periods.includes(period)}
                          onChange={(e) => {
                            setSelectedIndicators(prev => ({
                              ...prev,
                              ma: {
                                ...prev.ma,
                                periods: e.target.checked
                                  ? [...prev.ma.periods, period]
                                  : prev.ma.periods.filter(p => p !== period)
                              }
                            }));
                          }}
                          className="form-checkbox h-3 w-3 text-[#0ea5e9]"
                        />
                        <span className="text-xs text-gray-400">{period}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RSI */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedIndicators.rsi.enabled}
                  onChange={(e) => setSelectedIndicators(prev => ({
                    ...prev,
                    rsi: { ...prev.rsi, enabled: e.target.checked }
                  }))}
                  className="form-checkbox h-4 w-4 text-[#0ea5e9]"
                />
                <span className="text-sm text-gray-300">相对强弱指数 (RSI)</span>
              </label>
            </div>

            {/* MACD */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedIndicators.macd.enabled}
                  onChange={(e) => setSelectedIndicators(prev => ({
                    ...prev,
                    macd: { ...prev.macd, enabled: e.target.checked }
                  }))}
                  className="form-checkbox h-4 w-4 text-[#0ea5e9]"
                />
                <span className="text-sm text-gray-300">MACD</span>
              </label>
            </div>

            {/* 布林带 */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedIndicators.boll.enabled}
                  onChange={(e) => setSelectedIndicators(prev => ({
                    ...prev,
                    boll: { ...prev.boll, enabled: e.target.checked }
                  }))}
                  className="form-checkbox h-4 w-4 text-[#0ea5e9]"
                />
                <span className="text-sm text-gray-300">布林带 (BOLL)</span>
              </label>
            </div>
          </>
        )}
      </div>
      
      {/* 面板底部 */}
      <div className="px-4 py-3 border-t border-[#1a2942] flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleApply}
          disabled={loading}
          className="px-3 py-1 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm rounded transition-colors disabled:opacity-50"
        >
          应用
        </button>
      </div>
    </div>
  );
}
