/**
 * ChartWorkbench - 专业图表工作台
 * Bloomberg 级别的图表分析工具
 * 支持多图表、多指标、绘图工具
 */

import { useState, useEffect } from 'react';
import { EnhancedTradingChart } from './TradingChart/EnhancedTradingChart';
import { FullChartView } from './FullChartView';
import OrderBookDepthChart from './OrderBookDepthChart';
import TradingPanel from './TradingPanel';
import MultiChartLayoutManager from './MultiChartLayoutManager';
import { NewsFeed } from './NewsFeed';
import OptionChainPanel from './OptionChainPanel';
import { BacktestDetail } from './BacktestDetail';
import { useChartService } from '../services/ChartService';
import { useStockAllTimeData } from '../services/StockInfoService';
import { useAlertService } from '../hooks/useAlertService';
import { 
  getAlertService, 
  moduleCommunication,
  initializeServices,
  type Alert, 
  type AlertTriggerEvent 
} from '../services';
import { getQuantCalculationService, type ReturnCalculation, type TimeFrameReturns, type VolumeData, type VolumeAnalysis, type TurnoverAnalysis, type TechnicalIndicators, type RSIData, type MACDData, type KDJData } from '../services/QuantCalculationService';
import { getIndicatorCalculationService, type TechnicalAnalysisSummary, type TechnicalStrength } from '../services/IndicatorCalculationService';
import { getMarketDataProvider, type FundamentalData } from '../services/MarketDataProvider';
import { getHistoricalDataService, type OHLCV } from '../services/HistoricalDataService';
import { StrategyExecutionService, maStrategy, type BacktestResult, type StrategyConfig } from '../services/StrategyExecutionService';
import {
  TrendingUp,
  BarChart3,
  Activity,
  Maximize2,
  Download,
  Settings,
  RefreshCw,
  ChevronRight,
  Info,
  Bell,
  BellPlus,
  DollarSign,
  Grid,
  Newspaper,
  PanelRightClose,
  PanelRightOpen,
  Bookmark,
  Calendar,
  User,
  Target,
  Gauge,
  Calculator,
  GitBranch,
  AlertTriangle
} from 'lucide-react';

interface ChartWorkbenchProps {
  initialSymbol?: string;
}

type ChartType = 'candlestick' | 'line' | 'area' | 'bar';
type TimeFrame = '1天' | '5天' | '1月' | '6月' | '年至今' | '1年' | '5年' | '全部';
type ChartPeriod = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';

// TradingView风格时间区间映射
const timeFrameToPeriodMap: Record<TimeFrame, ChartPeriod> = {
  '1天': '1D',
  '5天': '5D', 
  '1月': '1M',
  '6月': '6M',
  '年至今': 'YTD',
  '1年': '1Y',
  '5年': '5Y',
  '全部': 'ALL'
};

export function ChartWorkbench({ initialSymbol = '600519' }: ChartWorkbenchProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1月');
  const [showVolume, setShowVolume] = useState(true);
  const [showIndicators, setShowIndicators] = useState(true);
  const [showMA, setShowMA] = useState(true); 
  const [realtime, setRealtime] = useState(true);
  const [showFullChart, setShowFullChart] = useState(false);
  const [showPriceAlertPanel, setShowPriceAlertPanel] = useState(false);
  const [showOrderBook, setShowOrderBook] = useState(true);
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [showMultiTimeFrame, setShowMultiTimeFrame] = useState(false);
  const [showNewsFeed, setShowNewsFeed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'news' | 'trading' | 'orderbook' | 'calendar' | 'analysis' | 'options'>('watchlist');
  
  // 图表上方的标签页状态
  const [chartActiveTab, setChartActiveTab] = useState<'overview' | 'news' | 'technicals' | 'options' | 'fundamentals' | 'backtest'>('overview');
  
  const { state } = useChartService();
  const { 
    alerts, 
    statistics, 
    createPriceAlert, 
    createVolumeAlert,
    getAlertsBySymbol 
  } = useAlertService();

  // 使用真实数据Hook获取当前股票的全时间数据
  const { data: allTimeData, loading: allTimeLoading } = useStockAllTimeData(symbol);
  
  // 状态管理：真实收益率数据
  const [timeFrameReturns, setTimeFrameReturns] = useState<TimeFrameReturns | null>(null);
  const [benchmarkRealtime, setBenchmarkRealtime] = useState<{ hs300: number; csi500: number } | null>(null);
  const [volumeAnalysis, setVolumeAnalysis] = useState<VolumeAnalysis | null>(null);
  const [turnoverAnalysis, setTurnoverAnalysis] = useState<TurnoverAnalysis | null>(null);
  const [technicalIndicators, setTechnicalIndicators] = useState<TechnicalIndicators | null>(null);
  const [technicalAnalysis, setTechnicalAnalysis] = useState<TechnicalAnalysisSummary | null>(null);
  const [fundamentalData, setFundamentalData] = useState<FundamentalData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // 回测状态
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [strategyService, setStrategyService] = useState<StrategyExecutionService | null>(null);

  const defaultWatchlist = [
    { symbol: '600519', name: '贵州茅台', price: '—', change: '—', changeAmount: '—' },
    { symbol: '300750', name: '宁德时代', price: '—', change: '—', changeAmount: '—' },
    { symbol: '000858', name: '五粮液', price: '—', change: '—', changeAmount: '—' },
    { symbol: '600036', name: '招商银行', price: '—', change: '—', changeAmount: '—' },
    { symbol: '000001', name: '平安银行', price: '—', change: '—', changeAmount: '—' },
    { symbol: '002594', name: '比亚迪', price: '—', change: '—', changeAmount: '—' },
  ];
  const [watchlist, setWatchlist] = useState(defaultWatchlist);

  const timeFrames: TimeFrame[] = ['1天', '5天', '1月', '6月', '年至今', '1年', '5年', '全部'];

  // 获取当前选中股票的详细信息
  const currentStock = watchlist.find(s => s.symbol === symbol) || watchlist[0];

  // 加载热门股票实时行情
  useEffect(() => {
    let cancelled = false;
    const fetchWatchlistQuotes = async () => {
      try {
        const provider = getMarketDataProvider();
        const symbols = defaultWatchlist.map((item) => item.symbol);
        const quotesMap = await provider.getQuotes(symbols);
        if (cancelled) return;
        const updated = defaultWatchlist.map((item) => {
          const quote = quotesMap.get(item.symbol);
          if (!quote) return item;
          const changeValue = quote.change ?? 0;
          const changePercent = quote.changePercent ?? 0;
          return {
            symbol: item.symbol,
            name: item.name,
            price: quote.price?.toFixed ? quote.price.toFixed(2) : `${quote.price}`,
            change: `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}`,
            changeAmount: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
          };
        });
        setWatchlist(updated);
      } catch (error) {
        console.warn('[ChartWorkbench] Failed to load watchlist quotes:', error);
      }
    };

    fetchWatchlistQuotes();
    const interval = setInterval(fetchWatchlistQuotes, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // 价格提醒服务集成
  const [chartAlerts, setChartAlerts] = useState<Alert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AlertTriggerEvent[]>([]);

  // 初始化价格提醒服务连接
  useEffect(() => {
    const alertService = getAlertService();
    
    // 监听警报触发事件
    const unsubscribe = alertService.addEventListener('onAlertTriggered', (event: AlertTriggerEvent) => {
      setActiveAlerts(prev => [event, ...prev.slice(0, 4)]);
      
      // 如果触发的是当前图表的股票，在图表上显示标记
      if (event.alert.symbol === symbol) {
        // 可以在图表上显示警报标记或弹窗
        setShowPriceAlertPanel(true);
        
        // 自动切换到技术分析标签页查看详情
        setChartActiveTab('technicals');
      }
      
      // 通知模块通信系统
      moduleCommunication.emit('alert:chart-workbench', {
        symbol: event.alert.symbol,
        alertName: event.alert.name,
        currentSymbol: symbol,
        module: 'chart-workbench'
      });
    });

    // 获取当前股票的所有警报
    const allAlerts = alertService.getAllAlerts();
    const symbolAlerts = allAlerts.filter(alert => alert.symbol === symbol);
    setChartAlerts(symbolAlerts);

    return unsubscribe;
  }, [symbol]);

  // 创建基于图表的快速警报
  const createChartAlert = async (price: number, direction: 'above' | 'below') => {
    try {
      const alertService = getAlertService();
      
      const alertId = await alertService.createPriceAlert(symbol, price, 
        direction === 'above' ? 'price_above' : 'price_below', {
        priority: 'medium',
        notifications: ['browser', 'popup'],
        tags: ['chart-workbench', 'technical-analysis'],
        description: `图表工作台创建的${direction === 'above' ? '突破' : '支撑'}位警报`
      });
      
      console.log(`已创建图表警报: ${alertId}`);
    } catch (error) {
      console.error('创建图表警报失败:', error);
    }
  };

  // 服务初始化和数据加载
  useEffect(() => {
    let isCancelled = false;
    
    const initializeChartServices = async () => {
      console.log('🚀 Initializing ChartWorkbench services...');
      
      try {
        // 统一初始化服务
        const serviceResults = await initializeServices({
          enableRealData: true,
          enableWebSocket: true,
          enableAkShare: true,
          modules: ['chart-workbench', 'quantEngine', 'qlib']
        });
        
        console.log('✅ ChartWorkbench services initialized:', serviceResults);
      } catch (error) {
        console.error('❌ ChartWorkbench service initialization failed:', error);
      }
    };
    
    initializeChartServices();
  }, []);

  // 拉取指数表现用于基准对比
  useEffect(() => {
    let cancelled = false;
    const fetchBenchmark = async () => {
      try {
        const provider = getMarketDataProvider();
        const quotes = await provider.getQuotes(['000001', '399001']);
        const hs300 = quotes.get('000001');
        const csi500 = quotes.get('399001');
        if (!cancelled && hs300 && csi500 && hs300.changePercent !== undefined && csi500.changePercent !== undefined) {
          setBenchmarkRealtime({
            hs300: hs300.changePercent,
            csi500: csi500.changePercent,
          });
        }
      } catch (error) {
        console.warn('[ChartWorkbench] Failed to load benchmark data:', error);
      }
    };
    fetchBenchmark();
    const timer = setInterval(fetchBenchmark, 120_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // 实时计算成交量数据分析
  useEffect(() => {
    let isCancelled = false;
    
    const calculateVolumeData = async () => {
      if (!symbol || isCancelled) return;
      
      setDataLoading(true);
      setDataError(null);
      
      try {
        const quantService = getQuantCalculationService();
        const historicalService = getHistoricalDataService();
        
        // 获取历史数据用于成交量计算
        const periodMap = {
          '1天': '1d',
          '5天': '5d', 
          '1月': '1M',
          '6月': '6M',
          '年至今': 'YTD',
          '1年': '1Y',
          '5年': '5Y',
          '全部': 'max'
        };
        
        const period = periodMap[timeFrame] || '1M';
        const historicalData = await historicalService.getHistoricalData(symbol, period);
        
        if (historicalData && historicalData.data && historicalData.data.length > 0) {
          // 转换为成交量数据格式
          const volumeData: VolumeData[] = historicalData.data.map((ohlcv: OHLCV) => ({
            timestamp: typeof ohlcv.timestamp === 'string' ? new Date(ohlcv.timestamp).getTime() : ohlcv.timestamp,
            volume: ohlcv.volume || 0,
            turnover: (ohlcv.volume || 0) * ohlcv.close, // 简化的成交额计算
            price: ohlcv.close,
          }));
          
          // 计算成交量分析
          const volumeAnalysisResult = quantService.calculateVolumeAnalysis(volumeData);
          
          // 计算换手率分析（使用估算的总股本）
          const estimatedTotalShares = 1e8; // 1亿股的估算
          const turnoverAnalysisResult = quantService.calculateTurnoverAnalysis(volumeData, estimatedTotalShares);
          
          // 计算技术指标
          const priceData = historicalData.data.map((ohlcv: OHLCV) => ({
            timestamp: typeof ohlcv.timestamp === 'string' ? new Date(ohlcv.timestamp).getTime() : ohlcv.timestamp,
            price: ohlcv.close,
          }));
          
          const technicalIndicatorsResult = quantService.calculateTechnicalIndicators(priceData);
          
          // 计算技术分析摘要
          const indicatorService = getIndicatorCalculationService();
          try {
            const technicalAnalysisResult = await indicatorService.calculateTechnicalAnalysis(priceData);
            if (!isCancelled) {
              setTechnicalAnalysis(technicalAnalysisResult);
            }
          } catch (error) {
            console.warn('Failed to calculate technical analysis:', error);
            // 设置默认的技术分析数据
            if (!isCancelled) {
              setTechnicalAnalysis({
                summary: 'NEUTRAL' as TechnicalStrength,
                oscillators: {
                  summary: 'NEUTRAL' as TechnicalStrength,
                  signals: [],
                  counts: { buy: 0, sell: 0, neutral: 1 }
                },
                movingAverages: {
                  summary: 'NEUTRAL' as TechnicalStrength,
                  signals: [],
                  counts: { buy: 0, sell: 0, neutral: 1 }
                }
              });
            }
          }
          
          // 获取基本面数据
          const marketProvider = getMarketDataProvider();
          try {
            const fundamentalResult = await marketProvider.getFundamentalData(symbol);
            if (!isCancelled) {
              setFundamentalData(fundamentalResult);
            }
          } catch (error) {
            console.warn('Failed to load fundamental data:', error);
          }
          
          if (!isCancelled) {
            setVolumeAnalysis(volumeAnalysisResult);
            setTurnoverAnalysis(turnoverAnalysisResult);
            setTechnicalIndicators(technicalIndicatorsResult);
          }
          
          console.log(`[ChartWorkbench] Analysis calculated for ${symbol}:`, {
            volume: {
              vwap: volumeAnalysisResult.vwap,
              volumeTrend: volumeAnalysisResult.volumeTrend,
            },
            liquidity: {
              liquidityScore: turnoverAnalysisResult.liquidityScore,
              turnoverRate: turnoverAnalysisResult.turnoverRate,
            },
            technicalIndicators: {
              rsiCount: technicalIndicatorsResult.rsi.length,
              macdCount: technicalIndicatorsResult.macd.length,
              kdjCount: technicalIndicatorsResult.kdj.length,
              currentRSI: technicalIndicatorsResult.rsi.length > 0 ? 
                technicalIndicatorsResult.rsi[technicalIndicatorsResult.rsi.length - 1].rsi.toFixed(2) : 'N/A'
            }
          });
        }
        
      } catch (error) {
        console.error('Error calculating volume data:', error);
        if (!isCancelled) {
          setDataError('Failed to calculate volume data');
          // 设置默认值避免显示空白
          setVolumeAnalysis({
            totalVolume: 0,
            avgVolume: 0,
            volumeVolatility: 0,
            vwap: 0,
            volumeTrend: 'stable',
            relativeVolume: 1,
            volumeConcentration: 0,
          });
          setTurnoverAnalysis({
            totalTurnover: 0,
            avgTurnover: 0,
            turnoverRate: 0,
            liquidityScore: 50,
            marketImpact: 0,
            turnoverTrend: 'stable',
          });
          setTechnicalAnalysis({
            summary: 'NEUTRAL' as TechnicalStrength,
            oscillators: {
              summary: 'NEUTRAL' as TechnicalStrength,
              signals: [],
              counts: { buy: 0, sell: 0, neutral: 1 }
            },
            movingAverages: {
              summary: 'NEUTRAL' as TechnicalStrength,
              signals: [],
              counts: { buy: 0, sell: 0, neutral: 1 }
            }
          });
        }
      } finally {
        if (!isCancelled) {
          setDataLoading(false);
        }
      }
    };

    calculateVolumeData();
    
    return () => {
      isCancelled = true;
    };
  }, [symbol, timeFrame]);
  
  // 获取股票历史数据的最早时间和计算全部时期收益率
  const getStockHistoryData = (stockSymbol: string) => {
    // 股票上市时间数据
    const stockListingDates: Record<string, { date: string; price: number }> = {
      '600519': { date: '2001-08-27', price: 34.51 }, // 贵州茅台上市价格
      '300750': { date: '2018-06-11', price: 25.14 }, // 宁德时代上市价格
      '000858': { date: '1998-04-09', price: 18.38 }, // 五粮液上市价格
      '600036': { date: '2002-04-09', price: 12.83 }, // 招商银行上市价格
      '002594': { date: '2011-06-30', price: 30.00 }, // 比亚迪上市价格
      '601318': { date: '2007-03-01', price: 39.99 }, // 中国平安上市价格
      '000333': { date: '2013-09-18', price: 42.96 }, // 美的集团上市价格
      '600276': { date: '2000-10-12', price: 25.18 }, // 恒瑞医药上市价格
    };
    
    const stockInfo = stockListingDates[stockSymbol];
    if (stockInfo) {
      const currentStock = watchlist.find(s => s.symbol === stockSymbol);
      const parsedPrice = currentStock ? parseFloat(currentStock.price.replace(/,/g, '')) : NaN;
      const currentPrice = Number.isFinite(parsedPrice) ? parsedPrice : stockInfo.price;
      const listingPrice = stockInfo.price;
      const totalReturn = ((currentPrice - listingPrice) / listingPrice * 100).toFixed(2);
      
      const years = (Date.now() - new Date(stockInfo.date).getTime()) / (365 * 24 * 60 * 60 * 1000);
      const totalVolume = (years * 2.1).toFixed(1); // 模拟总成交额
      const volatility = Math.min(45, 15 + years * 1.2).toFixed(1); // 模拟波动率
      
      return {
        listingDate: stockInfo.date,
        listingPrice,
        totalReturn: `+${totalReturn}%`,
        totalVolume: `${totalVolume}万亿`,
        volatility: `${volatility}%`
      };
    }
    
    return {
      listingDate: '2010-01-01',
      listingPrice: 10,
      totalReturn: '+151.94%',
      totalVolume: '45.7万亿',
      volatility: '35.2%'
    };
  };

  // 计算涨跌幅的收益率展示 - Bloomberg风格专业数据（使用真实AkShare数据）
  const getReturnsByTimeFrame = () => {
    // 使用真实数据或回退到模拟数据
    const realAllTimeData = allTimeData || getStockHistoryData(symbol);
    
    // 格式化成交量显示
    const formatVolume = (volume: number): string => {
      if (volume >= 1e12) return `${(volume / 1e12).toFixed(1)}万亿`;
      if (volume >= 1e8) return `${(volume / 1e8).toFixed(1)}亿`;
      if (volume >= 1e4) return `${(volume / 1e4).toFixed(1)}万`;
      return volume.toFixed(0);
    };

    // 基础模拟数据
    const mockReturns: Record<TimeFrame, { return: string; volume: string; volatility: string }> = {
      '1天': { return: '+0.02%', volume: '12.5亿', volatility: '1.8%' },
      '5天': { return: '-0.36%', volume: '68.3亿', volatility: '2.4%' }, 
      '1月': { return: '+0.83%', volume: '285亿', volatility: '3.2%' },
      '6月': { return: '+14.02%', volume: '1.2万亿', volatility: '18.7%' },
      '年至今': { return: '+15.90%', volume: '2.8万亿', volatility: '22.1%' },
      '1年': { return: '+12.94%', volume: '4.5万亿', volatility: '24.8%' },
      '5年': { return: '+87.13%', volume: '18.3万亿', volatility: '28.6%' },
      '全部': { 
        return: realAllTimeData.totalReturn, 
        volume: realAllTimeData.totalVolume, 
        volatility: realAllTimeData.volatility 
      }
    };

    // 如果有真实的成交量分析数据，使用真实数据覆盖当前时间框架
    if (volumeAnalysis && turnoverAnalysis) {
      const realVolumeString = formatVolume(volumeAnalysis.totalVolume);
      const realVolatilityString = `${(volumeAnalysis.volumeVolatility * 100).toFixed(1)}%`;
      
      // 更新当前时间框架的真实数据
      mockReturns[timeFrame] = {
        ...mockReturns[timeFrame],
        volume: realVolumeString,
        volatility: realVolatilityString
      };
    }
    
    return mockReturns;
  };

  // 获取基准对比数据
  const getBenchmarkComparison = () => {
    const fallback: Record<TimeFrame, { hs300: string; csi500: string; outperform: boolean }> = {
      '1天': { hs300: '+0.15%', csi500: '-0.08%', outperform: false },
      '5天': { hs300: '-0.42%', csi500: '-0.51%', outperform: true }, 
      '1月': { hs300: '+0.67%', csi500: '+0.91%', outperform: true },
      '6月': { hs300: '+12.85%', csi500: '+13.76%', outperform: true },
      '年至今': { hs300: '+14.23%', csi500: '+15.02%', outperform: true },
      '1年': { hs300: '+11.67%', csi500: '+10.85%', outperform: true },
      '5年': { hs300: '+65.42%', csi500: '+72.18%', outperform: true },
      '全部': { hs300: '+89.76%', csi500: '+112.34%', outperform: true }
    };

    if (benchmarkRealtime) {
      const realOneDay = {
        hs300: `${benchmarkRealtime.hs300 >= 0 ? '+' : ''}${benchmarkRealtime.hs300.toFixed(2)}%`,
        csi500: `${benchmarkRealtime.csi500 >= 0 ? '+' : ''}${benchmarkRealtime.csi500.toFixed(2)}%`,
        outperform: (benchmarkRealtime.hs300 || 0) > (benchmarkRealtime.csi500 || 0)
      };
      return {
        ...fallback,
        '1天': realOneDay,
      };
    }

    return fallback;
  };

  // 价格提醒相关功能
  const getCurrentPrice = () => {
    return parseFloat(currentStock.price);
  };

  const currentStockAlerts = getAlertsBySymbol(symbol);
  const activePriceAlerts = currentStockAlerts.filter(alert => alert.isEnabled && alert.status === 'active');

  const handleCreatePriceAlert = async (direction: 'above' | 'below', priceOffset: number = 0) => {
    const currentPrice = getCurrentPrice();
    const targetPrice = direction === 'above' 
      ? currentPrice * (1 + priceOffset) 
      : currentPrice * (1 - priceOffset);
    
    try {
      await createPriceAlert(symbol, targetPrice, direction, {
        priority: 'medium',
        notifications: ['browser', 'sound']
      });
      console.log(`[ChartWorkbench] Created ${direction} price alert for ${symbol} at ¥${targetPrice.toFixed(2)}`);
      setShowPriceAlertPanel(false);
    } catch (error) {
      console.error('Failed to create price alert:', error);
    }
  };

  const handleCreateVolumeAlert = async (multiplier: number = 3) => {
    try {
      await createVolumeAlert(symbol, multiplier, {
        priority: 'medium',
        notifications: ['browser', 'sound']
      });
      console.log(`[ChartWorkbench] Created volume alert for ${symbol} at ${multiplier}x average`);
      setShowPriceAlertPanel(false);
    } catch (error) {
      console.error('Failed to create volume alert:', error);
    }
  };

  // 初始化回测服务
  const initializeBacktest = async () => {
    try {
      const config: StrategyConfig = {
        name: `${symbol} MA双均线策略`,
        initialCapital: 1000000, // 100万初始资金
        maxPositions: 1,
        commission: 0.0005, // 万分之5手续费
        slippage: 0.001, // 0.1%滑点
        riskPerTrade: 0.8, // 80%资金参与
        parameters: {
          fastPeriod: 5, // 快线周期
          slowPeriod: 20, // 慢线周期
        },
      };
      
      const service = new StrategyExecutionService(config);
      setStrategyService(service);
      
      return service;
    } catch (error) {
      console.error('Failed to initialize backtest service:', error);
      return null;
    }
  };

  // 运行回测
  const runBacktest = async () => {
    if (backtestLoading) return;
    
    setBacktestLoading(true);
    
    try {
      // 确保服务已初始化
      let service = strategyService;
      if (!service) {
        service = await initializeBacktest();
        if (!service) {
          throw new Error('Failed to initialize backtest service');
        }
      }
      
      // 获取历史数据
      const historicalService = getHistoricalDataService();
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1); // 一年数据
      
      const historicalData = await historicalService.getHistoricalData(
        symbol,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        '1D'
      );
      
      if (historicalData.success && historicalData.data.length > 0) {
        // 运行回测
        const result = await service.runBacktest(
          symbol,
          historicalData.data,
          maStrategy(5, 20) // 使用预设的MA策略
        );
        
        setBacktestResult(result);
        console.log(`[ChartWorkbench] Backtest completed for ${symbol}:`, result);
      } else {
        throw new Error('No historical data available for backtesting');
      }
    } catch (error) {
      console.error('Backtest failed:', error);
      setDataError('回测失败: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setBacktestLoading(false);
    }
  };

  return (
    <div className="h-full bg-[#0a1628] flex">
      {/* Main Chart Area */}
      <div className={`${showOrderBook ? 'flex-1' : 'w-full'} flex flex-col`}>
        {/* Header with stock info and basic controls */}
        <div className="bg-[#0d1b2e] border-b border-[#1e3a5f]/40 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Stock Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white font-bold text-sm">
                  {currentStock.symbol.slice(-3)}
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-200">
                    {currentStock.symbol} {currentStock.name}
                  </h1>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-200 font-mono">{currentStock.price}</span>
                    <span className={`${
                      currentStock.change.startsWith('+') ? 'text-[#10b981]' : 'text-[#f97316]'
                    }`}>
                      {currentStock.changeAmount} {currentStock.change}
                    </span>
                    {activePriceAlerts.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0ea5e9]/20 border border-[#0ea5e9]/40 rounded text-xs">
                        <Bell className="w-3 h-3 text-[#0ea5e9]" />
                        <span className="text-[#0ea5e9] font-mono">{activePriceAlerts.length}</span>
                        <span className="text-gray-400">提醒</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPriceAlertPanel(!showPriceAlertPanel)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm relative ${
                  showPriceAlertPanel
                    ? 'bg-[#f59e0b] hover:bg-[#f59e0b]/90 text-white'
                    : 'bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#f59e0b] border border-[#f59e0b]/40'
                }`}
                title="价格提醒"
              >
                <BellPlus className="w-4 h-4" />
                <span className="text-sm font-medium">提醒</span>
                {activePriceAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 py-0.5 bg-red-500 rounded-full text-white text-xs min-w-[16px] text-center">
                    {activePriceAlerts.length}
                  </span>
                )}
              </button>
              <button
                onClick={runBacktest}
                disabled={backtestLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 disabled:opacity-50"
                title="运行回测"
              >
                <GitBranch className={`w-4 h-4 ${backtestLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">{backtestLoading ? '回测中...' : '回测'}</span>
              </button>
              <button
                onClick={() => setShowFullChart(true)}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                <span className="text-sm font-medium">完整图表</span>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40 rounded transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#0d1b2e] border-b border-[#1e3a5f]/40 px-6 py-2">
          <div className="flex items-center gap-6">
            {['概览', '新闻', '创意', '资金', '技术指标', '季节性', '成分'].map((tab, index) => (
              <button
                key={tab}
                className={`py-2 text-sm font-medium transition-colors ${
                  index === 0 
                    ? 'text-gray-200 border-b-2 border-gray-200' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Section Header */}
        <div className="bg-[#0d1b2e] border-b border-[#1e3a5f]/40 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium text-gray-200">图表</h2>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex items-center gap-2">
              {/* Multi-TimeFrame Toggle Button */}
              <button 
                onClick={() => setShowMultiTimeFrame(!showMultiTimeFrame)}
                className={`p-1.5 rounded transition-colors ${
                  showMultiTimeFrame 
                    ? 'bg-[#8b5cf6] text-white' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40'
                }`}
                title={showMultiTimeFrame ? '关闭多时间框架' : '开启多时间框架'}
              >
                <Grid className="w-4 h-4" />
              </button>

              {/* Right Sidebar Toggle Button */}
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40 rounded transition-colors"
                title={sidebarCollapsed ? '显示侧边栏' : '隐藏侧边栏'}
              >
                {sidebarCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
              </button>
              
              {/* Price Alert Button */}
              <button 
                onClick={() => setShowPriceAlertPanel(!showPriceAlertPanel)}
                className={`p-1.5 rounded transition-colors relative ${
                  showPriceAlertPanel 
                    ? 'bg-[#0ea5e9] text-white' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40'
                }`}
                title="设置价格提醒"
              >
                <BellPlus className="w-4 h-4" />
                {activePriceAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#f97316] rounded-full"></span>
                )}
              </button>
              <button className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40 rounded transition-colors">
                <TrendingUp className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40 rounded transition-colors">
                <Activity className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40 rounded transition-colors">
                <Download className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/40 rounded transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Price Alert Panel */}
        {showPriceAlertPanel && (
          <div className="bg-[#0d1b2e] border-b border-[#1e3a5f]/40 px-6 py-4">
            <div className="bg-[#0a1628] border border-[#1e3a5f]/40 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#0ea5e9]" />
                  设置 {currentStock.name} ({symbol}) 价格提醒
                </h3>
                <div className="text-xs text-gray-400">
                  当前价格: ¥{currentStock.price}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Quick Price Alerts */}
                <div className="space-y-3">
                  <h4 className="text-xs text-gray-400 font-medium">快速价格提醒</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleCreatePriceAlert('above', 0.05)}
                      className="w-full p-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded text-xs text-green-300 transition-colors"
                    >
                      突破 +5% (¥{(getCurrentPrice() * 1.05).toFixed(2)})
                    </button>
                    <button
                      onClick={() => handleCreatePriceAlert('above', 0.10)}
                      className="w-full p-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded text-xs text-green-300 transition-colors"
                    >
                      突破 +10% (¥{(getCurrentPrice() * 1.10).toFixed(2)})
                    </button>
                    <button
                      onClick={() => handleCreatePriceAlert('below', 0.05)}
                      className="w-full p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded text-xs text-red-300 transition-colors"
                    >
                      跌破 -5% (¥{(getCurrentPrice() * 0.95).toFixed(2)})
                    </button>
                    <button
                      onClick={() => handleCreatePriceAlert('below', 0.10)}
                      className="w-full p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded text-xs text-red-300 transition-colors"
                    >
                      跌破 -10% (¥{(getCurrentPrice() * 0.90).toFixed(2)})
                    </button>
                  </div>
                </div>

                {/* Volume Alerts */}
                <div className="space-y-3">
                  <h4 className="text-xs text-gray-400 font-medium">成交量提醒</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleCreateVolumeAlert(2)}
                      className="w-full p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded text-xs text-blue-300 transition-colors"
                    >
                      成交量 &gt;2倍平均
                    </button>
                    <button
                      onClick={() => handleCreateVolumeAlert(3)}
                      className="w-full p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded text-xs text-blue-300 transition-colors"
                    >
                      成交量 &gt;3倍平均
                    </button>
                    <button
                      onClick={() => handleCreateVolumeAlert(5)}
                      className="w-full p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded text-xs text-blue-300 transition-colors"
                    >
                      成交量 &gt;5倍平均
                    </button>
                  </div>
                </div>

                {/* Current Alerts */}
                <div className="space-y-3">
                  <h4 className="text-xs text-gray-400 font-medium">当前提醒 ({activePriceAlerts.length})</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {activePriceAlerts.length === 0 ? (
                      <div className="text-xs text-gray-500 text-center py-4">
                        暂无活跃提醒
                      </div>
                    ) : (
                      activePriceAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-2 bg-[#1e3a5f]/30 border border-[#2a4f7f]/40 rounded text-xs"
                        >
                          <div className="text-gray-200 font-medium">{alert.name}</div>
                          <div className="text-gray-400 mt-1">{alert.description}</div>
                          <div className="text-[#0ea5e9] mt-1">
                            {alert.status === 'active' ? '监控中' : alert.status}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1e3a5f]/40">
                <div className="text-xs text-gray-500">
                  设置后将实时监控价格变动并发送通知
                </div>
                <button
                  onClick={() => setShowPriceAlertPanel(false)}
                  className="px-3 py-1 bg-[#1e3a5f]/40 hover:bg-[#1e3a5f]/60 text-gray-300 rounded text-xs transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chart Container with TradingView Style Tabs */}
        <div className="flex-1 bg-[#0d1b2e] p-6">
          {/* TradingView Style Tab Navigation */}
          <div className="bg-[#0a1628] border border-[#1e3a5f]/40 rounded-t-lg">
            <div className="flex items-center border-b border-[#1e3a5f]/40">
              {[
                { id: 'overview' as const, label: 'Overview', description: '图表概览' },
                { id: 'news' as const, label: 'News', description: '新闻资讯' },
                { id: 'technicals' as const, label: 'Technicals', description: '技术分析' },
                { id: 'options' as const, label: 'Options', description: '期权链' },
                { id: 'fundamentals' as const, label: 'Fundamentals', description: '基本面' },
                { id: 'backtest' as const, label: 'Backtest', description: '历史回测' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setChartActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 relative group ${
                    chartActiveTab === tab.id
                      ? 'text-white border-[#0ea5e9] bg-[#0ea5e9]/10'
                      : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'
                  }`}
                  title={tab.description}
                >
                  {tab.label}
                  {chartActiveTab === tab.id && (
                    <div className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-[#0ea5e9]"></div>
                  )}
                </button>
              ))}
              
              {/* Right side info */}
              <div className="flex-1 flex items-center justify-end pr-4">
                <div className="text-xs text-gray-500">
                  {currentStock.name} ({currentStock.symbol}) - ¥{currentStock.price}
                  <span className={`ml-2 ${currentStock.change.startsWith('+') ? 'text-[#10b981]' : 'text-[#f97316]'}`}>
                    {currentStock.change} ({currentStock.changeAmount})
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="bg-[#0a1628] border-l border-r border-b border-[#1e3a5f]/40 rounded-b-lg overflow-hidden" style={{ height: 'calc(100% - 60px)' }}>
            {/* Overview Tab - 图表显示 */}
            {chartActiveTab === 'overview' && (
              <div className="h-full flex flex-col">
                {dataLoading && (
                  <div className="absolute top-4 right-4 z-10 bg-[#0d1b2e] border border-[#1e3a5f]/40 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-[#0ea5e9] animate-spin" />
                      <span className="text-xs text-gray-300">加载数据中...</span>
                    </div>
                  </div>
                )}
                {dataError && (
                  <div className="absolute top-4 right-4 z-10 bg-[#dc2626]/20 border border-[#dc2626]/40 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#dc2626]" />
                      <span className="text-xs text-[#dc2626]">数据加载失败</span>
                    </div>
                  </div>
                )}
                <EnhancedTradingChart
                  symbol={symbol}
                  period={timeFrameToPeriodMap[timeFrame]}
                  chartType={['candlestick', 'line', 'area'].includes(chartType) ? chartType as 'candlestick' | 'line' | 'area' : 'candlestick'}
                  showVolume={showVolume}
                  showMA={showMA}
                  showGrid={true}
                  showKeyLevels={true}
                  showCurrentPrice={true}
                  showSeparators={true}
                  enableDrawing={true}
                  showControls={true}
                  showTooltip={true}
                  showIndicators={showIndicators}
                  className="workbench-chart flex-1"
                />
                {/* Chart Controls Bar */}
                <div className="bg-[#0a1628] border-t border-[#1e3a5f]/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={showVolume}
                          onChange={(e) => setShowVolume(e.target.checked)}
                          className="rounded"
                        />
                        成交量
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={showMA}
                          onChange={(e) => setShowMA(e.target.checked)}
                          className="rounded"
                        />
                        移动平均
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={showIndicators}
                          onChange={(e) => setShowIndicators(e.target.checked)}
                          className="rounded"
                        />
                        技术指标
                      </label>
                    </div>
                    <div className="text-xs text-gray-500">
                      数据源: {allTimeLoading ? '加载中...' : (volumeAnalysis ? 'AkShare实时' : '模拟数据')}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* News Tab */}
            {chartActiveTab === 'news' && (
              <div className="h-full">
                <NewsFeed isOpen={true} onClose={() => {}} />
              </div>
            )}
            
            {/* Technicals Tab */}
            {chartActiveTab === 'technicals' && (
              <div className="h-full p-4 overflow-y-auto">
                {technicalAnalysis && (
                  <div className="space-y-4">
                    {/* Technical Analysis Summary */}
                    <div className="bg-[#0d1b2e] border border-[#1e3a5f]/40 rounded p-4">
                      <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-[#0ea5e9]" />
                        技术分析汇总
                      </h4>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-[#1e3a5f]/20 rounded">
                          <div className="text-xs text-gray-400 mb-1">总体信号</div>
                          <div className={`text-sm font-medium ${
                            technicalAnalysis.summary === 'STRONG_BUY' ? 'text-[#10b981]' :
                            technicalAnalysis.summary === 'BUY' ? 'text-[#22c55e]' :
                            technicalAnalysis.summary === 'SELL' ? 'text-[#f97316]' :
                            technicalAnalysis.summary === 'STRONG_SELL' ? 'text-[#ef4444]' :
                            'text-gray-300'
                          }`}>
                            {technicalAnalysis.summary}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-[#1e3a5f]/20 rounded">
                          <div className="text-xs text-gray-400 mb-1">振荡器</div>
                          <div className={`text-sm font-medium ${
                            technicalAnalysis.oscillators.summary === 'STRONG_BUY' ? 'text-[#10b981]' :
                            technicalAnalysis.oscillators.summary === 'BUY' ? 'text-[#22c55e]' :
                            technicalAnalysis.oscillators.summary === 'SELL' ? 'text-[#f97316]' :
                            technicalAnalysis.oscillators.summary === 'STRONG_SELL' ? 'text-[#ef4444]' :
                            'text-gray-300'
                          }`}>
                            {technicalAnalysis.oscillators.summary}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-[#1e3a5f]/20 rounded">
                          <div className="text-xs text-gray-400 mb-1">移动平均</div>
                          <div className={`text-sm font-medium ${
                            technicalAnalysis.movingAverages.summary === 'STRONG_BUY' ? 'text-[#10b981]' :
                            technicalAnalysis.movingAverages.summary === 'BUY' ? 'text-[#22c55e]' :
                            technicalAnalysis.movingAverages.summary === 'SELL' ? 'text-[#f97316]' :
                            technicalAnalysis.movingAverages.summary === 'STRONG_SELL' ? 'text-[#ef4444]' :
                            'text-gray-300'
                          }`}>
                            {technicalAnalysis.movingAverages.summary}
                          </div>
                        </div>
                      </div>
                      
                      {/* Detailed Signals */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-xs text-gray-400 mb-2">振荡器指标</h5>
                          <div className="space-y-2">
                            {technicalAnalysis.oscillators.signals.map((signal, index) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <span className="text-gray-300">{signal.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">{signal.value.toFixed(2)}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    signal.signal === 'BUY' ? 'bg-[#10b981]/20 text-[#10b981]' :
                                    signal.signal === 'SELL' ? 'bg-[#f97316]/20 text-[#f97316]' :
                                    'bg-gray-600/20 text-gray-400'
                                  }`}>
                                    {signal.action}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs text-gray-400 mb-2">移动平均线</h5>
                          <div className="space-y-2">
                            {technicalAnalysis.movingAverages.signals.map((signal, index) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <span className="text-gray-300">{signal.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">{signal.value.toFixed(2)}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    signal.signal === 'BUY' ? 'bg-[#10b981]/20 text-[#10b981]' :
                                    signal.signal === 'SELL' ? 'bg-[#f97316]/20 text-[#f97316]' :
                                    'bg-gray-600/20 text-gray-400'
                                  }`}>
                                    {signal.action}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Options Tab */}
            {chartActiveTab === 'options' && (
              <div className="h-full">
                <OptionChainPanel 
                  symbol={symbol}
                  className="h-full border-0"
                />
              </div>
            )}
            
            {/* Fundamentals Tab */}
            {chartActiveTab === 'fundamentals' && (
              <div className="h-full p-4 overflow-y-auto">
                {fundamentalData && (
                  <div className="space-y-4">
                    {/* Company Info */}
                    <div className="bg-[#0d1b2e] border border-[#1e3a5f]/40 rounded p-4">
                      <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#10b981]" />
                        {fundamentalData.companyName}
                        <span className="text-xs text-gray-500 ml-auto">{fundamentalData.quarter}</span>
                      </h4>
                      
                      {/* Key Metrics */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-[#1e3a5f]/20 p-3 rounded">
                          <div className="text-xs text-gray-400">市盈率</div>
                          <div className="text-lg font-mono text-gray-200">{fundamentalData.valuation.pe.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#1e3a5f]/20 p-3 rounded">
                          <div className="text-xs text-gray-400">市净率</div>
                          <div className="text-lg font-mono text-gray-200">{fundamentalData.valuation.pb.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#1e3a5f]/20 p-3 rounded">
                          <div className="text-xs text-gray-400">ROE (%)</div>
                          <div className="text-lg font-mono text-[#10b981]">{fundamentalData.profitability.roe.toFixed(1)}</div>
                        </div>
                        <div className="bg-[#1e3a5f]/20 p-3 rounded">
                          <div className="text-xs text-gray-400">营收增长率 (%)</div>
                          <div className={`text-lg font-mono ${fundamentalData.growth.revenueGrowth1Y >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'}`}>
                            {fundamentalData.growth.revenueGrowth1Y >= 0 ? '+' : ''}{fundamentalData.growth.revenueGrowth1Y.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Backtest Tab */}
            {chartActiveTab === 'backtest' && (
              <div className="h-full">
                {!backtestResult && !backtestLoading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <GitBranch className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg mb-2">回测结果</p>
                      <p className="text-gray-500 text-sm mb-4">点击"回测"按钮开始运行策略回测分析</p>
                      <button
                        onClick={runBacktest}
                        className="flex items-center gap-2 px-4 py-2 bg-[#10b981] text-white rounded-md hover:bg-[#10b981]/90 transition-colors mx-auto"
                      >
                        <GitBranch className="w-4 h-4" />
                        <span>开始回测</span>
                      </button>
                    </div>
                  </div>
                )}
                {backtestLoading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <GitBranch className="w-16 h-16 text-[#0ea5e9] mx-auto mb-4 animate-spin" />
                      <p className="text-gray-400 text-lg mb-2">正在运行回测...</p>
                      <p className="text-gray-500 text-sm">请稍等，正在分析历史数据并计算策略绩效</p>
                    </div>
                  </div>
                )}
                {backtestResult && (
                  <BacktestDetail 
                    backtestId={`${symbol}-backtest`} 
                    backtestResult={backtestResult}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Time Frame Performance Strip */}
        <div className="bg-[#0d1b2e] border-t border-[#1e3a5f]/40 px-6 py-4">
          <div className="space-y-4">
            {/* 时间段选择器 - TradingView风格 */}
            <div className="flex items-center gap-1 bg-[#0a1628] border border-[#1e3a5f]/40 rounded-lg p-1">
              {timeFrames.map((tf) => {
                const returns = getReturnsByTimeFrame();
                const returnData = returns[tf];
                const isPositive = returnData.return.startsWith('+');
                
                return (
                  <button
                    key={tf}
                    onClick={() => {
                      setTimeFrame(tf);
                      console.log(`[ChartWorkbench] Time frame changed to: ${tf} (period: ${timeFrameToPeriodMap[tf]})`)
                    }}
                    className={`flex flex-col items-center gap-1 transition-all duration-200 rounded-md px-4 py-2 min-w-[60px] hover:bg-[#1e3a5f]/30 ${
                      timeFrame === tf 
                        ? 'text-white bg-[#0ea5e9] shadow-lg shadow-[#0ea5e9]/20' 
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span className={`text-xs font-semibold tracking-wider ${
                      timeFrame === tf ? 'text-white' : ''
                    }`}>{tf}</span>
                    <span className={`text-xs font-mono font-bold ${
                      timeFrame === tf 
                        ? (isPositive ? 'text-green-200' : 'text-red-200')
                        : (isPositive ? 'text-[#10b981]' : 'text-[#f97316]')
                    }`}>
                      {returnData.return}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 详细性能指标 - TradingView风格数据面板 */}
            <div className="bg-[#0a1628] border border-[#1e3a5f]/40 rounded-lg p-4 shadow-xl">
              <div className="grid grid-cols-4 gap-6">
                {/* 当前周期表现 */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 tracking-wider font-mono">当前周期 ({timeFrame})</div>
                  <div className="space-y-1">
                    {(() => {
                      const returns = getReturnsByTimeFrame();
                      const returnData = returns[timeFrame];
                      const isPositive = returnData.return.startsWith('+');
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">收益率</span>
                            <span className={`text-sm font-mono ${
                              isPositive ? 'text-[#10b981]' : 'text-[#f97316]'
                            }`}>
                              {returnData.return}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">成交额</span>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-mono text-gray-300">{returnData.volume}</span>
                              {volumeAnalysis && (
                                <span className="text-xs px-1 py-0.5 bg-green-500/20 text-green-300 rounded">实时</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">波动率</span>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-mono text-gray-300">{returnData.volatility}</span>
                              {volumeAnalysis && (
                                <span className="text-xs px-1 py-0.5 bg-green-500/20 text-green-300 rounded">实时</span>
                              )}
                            </div>
                          </div>
                          {volumeAnalysis && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">VWAP</span>
                                <span className="text-sm font-mono text-blue-300">{volumeAnalysis.vwap.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">成交量趋势</span>
                                <span className={`text-sm font-mono ${
                                  volumeAnalysis.volumeTrend === 'increasing' ? 'text-green-300' : 
                                  volumeAnalysis.volumeTrend === 'decreasing' ? 'text-red-300' : 'text-gray-300'
                                }`}>
                                  {volumeAnalysis.volumeTrend === 'increasing' ? '↑上升' : 
                                   volumeAnalysis.volumeTrend === 'decreasing' ? '↓下降' : '→稳定'}
                                </span>
                              </div>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 基准对比 */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 tracking-wider font-mono">基准对比</div>
                  <div className="space-y-1">
                    {(() => {
                      const benchmark = getBenchmarkComparison();
                      const benchmarkData = benchmark[timeFrame];
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">沪深300</span>
                            <span className="text-sm font-mono text-gray-300">{benchmarkData.hs300}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">中证500</span>
                            <span className="text-sm font-mono text-gray-300">{benchmarkData.csi500}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">超额收益</span>
                            <span className={`text-sm font-mono ${
                              benchmarkData.outperform ? 'text-[#10b981]' : 'text-[#f97316]'
                            }`}>
                              {benchmarkData.outperform ? '✓' : '✗'}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 风险指标 */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 tracking-wider font-mono">风险指标</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">夏普比率</span>
                      <span className="text-sm font-mono text-gray-300">1.42</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">最大回撤</span>
                      <span className="text-sm font-mono text-[#f97316]">-8.65%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Beta值</span>
                      <span className="text-sm font-mono text-gray-300">0.95</span>
                    </div>
                    {turnoverAnalysis && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">流动性评分</span>
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-mono ${
                            turnoverAnalysis.liquidityScore >= 80 ? 'text-green-300' :
                            turnoverAnalysis.liquidityScore >= 60 ? 'text-yellow-300' : 'text-red-300'
                          }`}>
                            {turnoverAnalysis.liquidityScore.toFixed(0)}
                          </span>
                          <span className="text-xs px-1 py-0.5 bg-blue-500/20 text-blue-300 rounded">实时</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 技术指标 */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 tracking-wider font-mono">技术指标</div>
                  <div className="space-y-1">
                    {technicalIndicators && technicalIndicators.rsi.length > 0 ? (
                      <>
                        {/* 真实RSI数据 */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">RSI(14)</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-mono ${
                              (() => {
                                const currentRSI = technicalIndicators.rsi[technicalIndicators.rsi.length - 1];
                                return currentRSI.signal === 'overbought' ? 'text-red-300' :
                                       currentRSI.signal === 'oversold' ? 'text-green-300' : 'text-gray-300';
                              })()
                            }`}>
                              {technicalIndicators.rsi[technicalIndicators.rsi.length - 1].rsi.toFixed(1)}
                            </span>
                            <span className="text-xs px-1 py-0.5 bg-blue-500/20 text-blue-300 rounded">实时</span>
                          </div>
                        </div>
                        
                        {/* 真实MACD数据 */}
                        {technicalIndicators.macd.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">MACD</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-sm font-mono ${
                                (() => {
                                  const currentMACD = technicalIndicators.macd[technicalIndicators.macd.length - 1];
                                  return currentMACD.histogram > 0 ? 'text-green-300' : 'text-red-300';
                                })()
                              }`}>
                                {(() => {
                                  const currentMACD = technicalIndicators.macd[technicalIndicators.macd.length - 1];
                                  return currentMACD.histogram > 0 ? `+${currentMACD.histogram.toFixed(2)}` : currentMACD.histogram.toFixed(2);
                                })()}
                              </span>
                              <span className="text-xs px-1 py-0.5 bg-blue-500/20 text-blue-300 rounded">实时</span>
                            </div>
                          </div>
                        )}
                        
                        {/* 真实KDJ数据 */}
                        {technicalIndicators.kdj.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">KDJ</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-sm font-mono ${
                                (() => {
                                  const currentKDJ = technicalIndicators.kdj[technicalIndicators.kdj.length - 1];
                                  return currentKDJ.signal === 'overbought' ? 'text-red-300' :
                                         currentKDJ.signal === 'oversold' ? 'text-green-300' : 'text-gray-300';
                                })()
                              }`}>
                                {(() => {
                                  const currentKDJ = technicalIndicators.kdj[technicalIndicators.kdj.length - 1];
                                  return `${currentKDJ.k.toFixed(1)},${currentKDJ.d.toFixed(1)}`;
                                })()}
                              </span>
                              <span className="text-xs px-1 py-0.5 bg-blue-500/20 text-blue-300 rounded">实时</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* 模拟数据回退 */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">RSI(14)</span>
                          <span className="text-sm font-mono text-gray-300">58.3</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">MACD</span>
                          <span className="text-sm font-mono text-[#10b981]">+2.15</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">KDJ</span>
                          <span className="text-sm font-mono text-gray-300">67.2</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TradingView Style Right Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-12' : 'w-80'} bg-[#0d1b2e] border-l border-[#1e3a5f]/40 flex transition-all duration-200`}>
        {/* Tab Icons (Always Visible) */}
        <div className="w-12 bg-[#0a1628] border-r border-[#1e3a5f]/40 flex flex-col">
          {[
            { id: 'watchlist', icon: Bookmark, label: '关注列表' },
            { id: 'analysis', icon: Gauge, label: '技术分析' },
            { id: 'news', icon: Newspaper, label: '新闻资讯' },
            { id: 'trading', icon: DollarSign, label: '交易面板' },
            { id: 'orderbook', icon: Activity, label: '订单簿' },
            { id: 'options', icon: Calculator, label: '期权链' },
            { id: 'calendar', icon: Calendar, label: '财经日历' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (sidebarCollapsed) setSidebarCollapsed(false);
                setActiveTab(tab.id as any);
              }}
              className={`flex items-center justify-center h-12 transition-colors ${
                activeTab === tab.id && !sidebarCollapsed
                  ? 'bg-[#0ea5e9] text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/30'
              }`}
              title={tab.label}
            >
              <tab.icon className="w-4 h-4" />
            </button>
          ))}
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* User/Settings */}
          <button
            className="flex items-center justify-center h-12 text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/30 transition-colors"
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Panel Content (Collapsible) */}
        {!sidebarCollapsed && (
          <div className="flex-1 flex flex-col">
            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-[#1e3a5f]/40">
              <h3 className="text-sm font-medium text-gray-200">
                {activeTab === 'watchlist' && '关注列表'}
                {activeTab === 'analysis' && '技术分析'}
                {activeTab === 'news' && '新闻资讯'}
                {activeTab === 'trading' && '交易面板'}
                {activeTab === 'orderbook' && '订单簿深度'}
                {activeTab === 'options' && '期权链'}
                {activeTab === 'calendar' && '财经日历'}
              </h3>
            </div>
            
            {/* Panel Body */}
            <div className="flex-1 overflow-hidden">
              {/* Watchlist Tab */}
              {activeTab === 'watchlist' && (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    {watchlist.map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => setSymbol(stock.symbol)}
                        className={`w-full px-4 py-3 text-left border-b border-[#1e3a5f]/20 hover:bg-[#1e3a5f]/20 transition-colors ${
                          stock.symbol === symbol ? 'bg-[#1e3a5f]/40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-200">{stock.symbol}</div>
                            <div className="text-xs text-gray-400">{stock.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-200 font-mono">{stock.price}</div>
                            <div className={`text-xs ${
                              stock.change.startsWith('+') ? 'text-[#10b981]' : 'text-[#f97316]'
                            }`}>
                              {stock.change}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* News Tab */}
              {activeTab === 'news' && (
                <div className="h-full">
                  <NewsFeed symbol={symbol} className="h-full" />
                </div>
              )}

              {/* Trading Tab */}
              {activeTab === 'trading' && (
                <div className="h-full">
                  <TradingPanel 
                    symbol={symbol} 
                    currentPrice={parseFloat(currentStock.price)}
                    onOrder={(order) => console.log('Order submitted:', order)}
                    className="h-full"
                  />
                </div>
              )}

              {/* Order Book Tab */}
              {activeTab === 'orderbook' && (
                <div className="h-full">
                  <OrderBookDepthChart 
                    symbol={symbol} 
                    height={400}
                    className="h-full"
                  />
                </div>
              )}

              {/* Analysis Tab */}
              {activeTab === 'analysis' && (
                <div className="h-full overflow-y-auto">
                  <div className="space-y-4 p-4">
                    {/* 技术分析汇总 */}
                    {technicalAnalysis && (
                      <div className="bg-[#0a1628] border border-[#1e3a5f]/40 rounded p-4">
                        <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-[#0ea5e9]" />
                          技术分析汇总
                        </h4>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="text-center p-3 bg-[#1e3a5f]/20 rounded">
                            <div className="text-xs text-gray-400 mb-1">总体信号</div>
                            <div className={`text-sm font-medium ${
                              technicalAnalysis.summary === 'STRONG_BUY' ? 'text-[#10b981]' :
                              technicalAnalysis.summary === 'BUY' ? 'text-[#22c55e]' :
                              technicalAnalysis.summary === 'SELL' ? 'text-[#f97316]' :
                              technicalAnalysis.summary === 'STRONG_SELL' ? 'text-[#ef4444]' :
                              'text-gray-300'
                            }`}>
                              {technicalAnalysis.summary}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-[#1e3a5f]/20 rounded">
                            <div className="text-xs text-gray-400 mb-1">振荡器</div>
                            <div className={`text-sm font-medium ${
                              technicalAnalysis.oscillators.summary === 'STRONG_BUY' ? 'text-[#10b981]' :
                              technicalAnalysis.oscillators.summary === 'BUY' ? 'text-[#22c55e]' :
                              technicalAnalysis.oscillators.summary === 'SELL' ? 'text-[#f97316]' :
                              technicalAnalysis.oscillators.summary === 'STRONG_SELL' ? 'text-[#ef4444]' :
                              'text-gray-300'
                            }`}>
                              {technicalAnalysis.oscillators.summary}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-[#1e3a5f]/20 rounded">
                            <div className="text-xs text-gray-400 mb-1">移动平均</div>
                            <div className={`text-sm font-medium ${
                              technicalAnalysis.movingAverages.summary === 'STRONG_BUY' ? 'text-[#10b981]' :
                              technicalAnalysis.movingAverages.summary === 'BUY' ? 'text-[#22c55e]' :
                              technicalAnalysis.movingAverages.summary === 'SELL' ? 'text-[#f97316]' :
                              technicalAnalysis.movingAverages.summary === 'STRONG_SELL' ? 'text-[#ef4444]' :
                              'text-gray-300'
                            }`}>
                              {technicalAnalysis.movingAverages.summary}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 基本面数据 */}
                    {fundamentalData && (
                      <div className="bg-[#0a1628] border border-[#1e3a5f]/40 rounded p-4">
                        <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-[#10b981]" />
                          基本面数据
                          <span className="text-xs text-gray-500 ml-auto">{fundamentalData.quarter}</span>
                        </h4>
                        
                        {/* 估值指标 */}
                        <div className="mb-4">
                          <div className="text-xs text-gray-400 mb-2">估值指标</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">市盈率(PE)</div>
                              <div className="text-sm font-mono text-gray-200">{fundamentalData.valuation.pe.toFixed(2)}</div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">市净率(PB)</div>
                              <div className="text-sm font-mono text-gray-200">{fundamentalData.valuation.pb.toFixed(2)}</div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">市销率(PS)</div>
                              <div className="text-sm font-mono text-gray-200">{fundamentalData.valuation.ps.toFixed(2)}</div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">股息率(%)</div>
                              <div className="text-sm font-mono text-gray-200">{fundamentalData.valuation.dividendYield.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>

                        {/* 盈利能力 */}
                        <div className="mb-4">
                          <div className="text-xs text-gray-400 mb-2">盈利能力</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">净资产收益率(ROE)</div>
                              <div className="text-sm font-mono text-[#10b981]">{fundamentalData.profitability.roe.toFixed(1)}%</div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">总资产收益率(ROA)</div>
                              <div className="text-sm font-mono text-[#10b981]">{fundamentalData.profitability.roa.toFixed(1)}%</div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">毛利率</div>
                              <div className="text-sm font-mono text-[#10b981]">{fundamentalData.profitability.grossMargin.toFixed(1)}%</div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">净利率</div>
                              <div className="text-sm font-mono text-[#10b981]">{fundamentalData.profitability.netMargin.toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>

                        {/* 成长性 */}
                        <div className="mb-4">
                          <div className="text-xs text-gray-400 mb-2">成长性指标</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">营收增长率(1Y)</div>
                              <div className={`text-sm font-mono ${fundamentalData.growth.revenueGrowth1Y >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'}`}>
                                {fundamentalData.growth.revenueGrowth1Y >= 0 ? '+' : ''}{fundamentalData.growth.revenueGrowth1Y.toFixed(1)}%
                              </div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">净利润增长率(1Y)</div>
                              <div className={`text-sm font-mono ${fundamentalData.growth.netIncomeGrowth1Y >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'}`}>
                                {fundamentalData.growth.netIncomeGrowth1Y >= 0 ? '+' : ''}{fundamentalData.growth.netIncomeGrowth1Y.toFixed(1)}%
                              </div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">EPS增长率(1Y)</div>
                              <div className={`text-sm font-mono ${fundamentalData.growth.epsGrowth1Y >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'}`}>
                                {fundamentalData.growth.epsGrowth1Y >= 0 ? '+' : ''}{fundamentalData.growth.epsGrowth1Y.toFixed(1)}%
                              </div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">净资产增长率</div>
                              <div className={`text-sm font-mono ${fundamentalData.growth.bookValueGrowth >= 0 ? 'text-[#10b981]' : 'text-[#f97316]'}`}>
                                {fundamentalData.growth.bookValueGrowth >= 0 ? '+' : ''}{fundamentalData.growth.bookValueGrowth.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 安全性 */}
                        <div>
                          <div className="text-xs text-gray-400 mb-2">安全性指标</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">流动比率</div>
                              <div className="text-sm font-mono text-gray-200">{fundamentalData.safety.currentRatio.toFixed(2)}</div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">资产负债率</div>
                              <div className="text-sm font-mono text-gray-200">{(fundamentalData.safety.debtToAssets * 100).toFixed(1)}%</div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">Altman Z-Score</div>
                              <div className={`text-sm font-mono ${
                                fundamentalData.safety.altmanZScore >= 3.0 ? 'text-[#10b981]' :
                                fundamentalData.safety.altmanZScore >= 1.8 ? 'text-[#f59e0b]' :
                                'text-[#f97316]'
                              }`}>
                                {fundamentalData.safety.altmanZScore.toFixed(2)}
                              </div>
                            </div>
                            <div className="bg-[#1e3a5f]/20 p-2 rounded">
                              <div className="text-xs text-gray-400">利息保障倍数</div>
                              <div className="text-sm font-mono text-gray-200">{fundamentalData.safety.interestCoverage.toFixed(1)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 数据加载状态 */}
                    {dataLoading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2 text-gray-500">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="text-sm">加载基本面数据中...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Options Tab */}
              {activeTab === 'options' && (
                <div className="h-full">
                  <OptionChainPanel 
                    symbol={symbol}
                    className="h-full border-0"
                  />
                </div>
              )}

              {/* Calendar Tab */}
              {activeTab === 'calendar' && (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">财经日历</p>
                    <p className="text-xs mt-1">功能开发中...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Multi-TimeFrame View */}
      {showMultiTimeFrame && (
        <div className="fixed inset-0 z-50 bg-[#0a1628]">
          <MultiChartLayoutManager
            initialTemplate="multi-timeframe"
            defaultSymbol={symbol}
            onClose={() => setShowMultiTimeFrame(false)}
            enableSync={true}
            showHeader={true}
            className="h-full"
          />
        </div>
      )}

      {/* Full Chart View */}
      {showFullChart && (
        <FullChartView
          symbol={symbol}
          chartType={chartType}
          showVolume={showVolume}
          showMA={showMA}
          showIndicators={showIndicators}
          realtime={realtime}
          initialTimeFrame={timeFrame}
          technicalIndicators={technicalIndicators}
          onTimeFrameChange={setTimeFrame}
          onClose={() => setShowFullChart(false)}
        />
      )}
    </div>
  );
}
