import { useState, useEffect, useCallback } from 'react';
import { Newspaper, TrendingUp, AlertCircle, Calendar, ExternalLink, Filter, Search, X, Building, DollarSign, Globe, RefreshCw } from 'lucide-react';
import { newsService, NewsItem } from '../services/NewsService';
import { 
  getAlertService, 
  moduleCommunication,
  type Alert, 
  type AlertTriggerEvent 
} from '../services';

// Mock news data for development - will be replaced with real API
const mockNewsData: NewsItem[] = [
  {
    id: 'n1',
    title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
    summary: '中国人民银行决定于2024年12月15日下调金融机构存款准备金率0.5个百分点...',
    source: '新华社',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    category: 'policy',
    sentiment: 'positive',
    importance: 'high',
    keywords: ['央行', '降准', '货币政策', '流动性'],
    mentionedStocks: ['000001', '600036'],
  },
  {
    id: 'n2',
    title: '贵州茅台Q4业绩超预期，营收同比增长18%',
    summary: '贵州茅台发布业绩快报，第四季度营收达420亿元，净利润同比增长22%...',
    source: '财联社',
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    category: 'earnings',
    sentiment: 'positive',
    relatedStocks: ['600519'],
    importance: 'high',
    keywords: ['业绩', '财报', '营收增长', '白酒'],
    mentionedStocks: ['600519'],
  },
  {
    id: 'n3',
    title: 'A股三大指数集体上涨，沪指重返3000点',
    summary: '截至收盘，上证指数涨1.2%，深证成指涨1.8%，创业板指涨2.1%...',
    source: '东方财富',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    category: 'market',
    sentiment: 'positive',
    importance: 'medium',
    keywords: ['A股', '指数', '上涨', '3000点'],
  },
  {
    id: 'n4',
    title: '宁德时代与特斯拉签署长期供货协议',
    summary: '宁德时代宣布与特斯拉达成战略合作，将在未来3年供应新一代电池...',
    source: '证券时报',
    timestamp: new Date(Date.now() - 90 * 60 * 1000),
    category: 'company',
    sentiment: 'positive',
    relatedStocks: ['300750'],
    importance: 'high',
    keywords: ['宁德时代', '特斯拉', '战略合作', '新能源电池'],
    mentionedStocks: ['300750', '002594'],
  },
  {
    id: 'n5',
    title: '美联储维持利率不变，市场预期明年降息',
    summary: 'FOMC会议决定维持联邦基金利率在5.25%-5.5%区间，鲍威尔表示...',
    source: 'Bloomberg',
    timestamp: new Date(Date.now() - 120 * 60 * 1000),
    category: 'policy',
    sentiment: 'neutral',
    importance: 'high',
    keywords: ['美联储', '利率', 'FOMC', '鲍威尔'],
  },
  {
    id: 'n6',
    title: '比亚迪11月新能源车销量突破30万辆',
    summary: '比亚迪发布产销快报，11月新能源汽车销量达到30.12万辆，同比增长31%...',
    source: '界面新闻',
    timestamp: new Date(Date.now() - 180 * 60 * 1000),
    category: 'earnings',
    sentiment: 'positive',
    relatedStocks: ['002594'],
    importance: 'medium',
    keywords: ['比亚迪', '新能源汽车', '销量', '产销快报'],
    mentionedStocks: ['002594', '300750'],
  },
  {
    id: 'n7',
    title: '科技股集体回调，半导体板块跌幅居前',
    summary: '受外围市场影响，A股科技板块今日大幅回调，半导体指数跌超3%...',
    source: '第一财经',
    timestamp: new Date(Date.now() - 240 * 60 * 1000),
    category: 'industry',
    sentiment: 'negative',
    importance: 'medium',
    keywords: ['科技股', '半导体', '回调', '外围市场'],
    mentionedStocks: ['002415', '300059', '688981'],
  },
  {
    id: 'n8',
    title: '房地产板块异动，多只龙头股涨停',
    summary: '受政策利好影响，房地产板块今日强势拉升，万科A、保利发展等多只龙头股涨停...',
    source: '证券日报',
    timestamp: new Date(Date.now() - 300 * 60 * 1000),
    category: 'industry',
    sentiment: 'positive',
    importance: 'medium',
    keywords: ['房地产', '政策利好', '涨停', '龙头股'],
    mentionedStocks: ['000002', '600048'],
  },
];

interface NewsFeedProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewsFeed({ isOpen, onClose }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'market' | 'policy' | 'earnings' | 'industry' | 'company'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchStock, setSearchStock] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // 加载新闻数据
  const loadNews = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      let result;
      
      if (searchStock.trim()) {
        // 搜索特定股票新闻
        result = await newsService.getNewsByStock(searchStock.trim().toUpperCase(), 50);
      } else if (filter === 'high') {
        // 获取重要新闻
        result = await newsService.getImportantNews(50);
      } else {
        // 获取普通新闻
        result = await newsService.getFinancialNews({
          category: filter === 'all' ? undefined : filter,
          limit: 100
        });
      }
      
      if (result.success) {
        setNews(result.data);
      } else {
        console.error('加载新闻失败');
        // 使用模拟数据作为降级方案
        setNews(mockNewsData);
      }
    } catch (error) {
      console.error('加载新闻出错:', error);
      setNews(mockNewsData);
    } finally {
      setLoading(false);
    }
  }, [filter, searchStock, loading]);

  // 初始加载和定期更新
  useEffect(() => {
    loadNews();
    
    // 每2分钟自动刷新
    const interval = setInterval(loadNews, 120000);
    return () => clearInterval(interval);
  }, [loadNews]);

  // 价格提醒服务集成
  const [newsAlerts, setNewsAlerts] = useState<Alert[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<AlertTriggerEvent[]>([]);

  // 初始化价格提醒服务连接
  useEffect(() => {
    const alertService = getAlertService();
    
    // 监听警报触发事件
    const unsubscribe = alertService.addEventListener('onAlertTriggered', (event: AlertTriggerEvent) => {
      setTriggeredAlerts(prev => [event, ...prev.slice(0, 4)]);
      
      // 根据警报触发的股票自动搜索相关新闻
      const symbol = event.alert.symbol;
      const stockName = getStockName(symbol);
      
      // 自动切换到该股票的新闻
      setSearchStock(symbol);
      setFilter('all');
      
      // 通知模块通信系统
      moduleCommunication.emit('alert:news-filter', {
        symbol,
        alertName: event.alert.name,
        module: 'news'
      });
    });

    // 获取与新闻相关的警报
    const allAlerts = alertService.getAllAlerts();
    setNewsAlerts(allAlerts);

    return unsubscribe;
  }, []);

  // 获取股票名称的辅助函数
  const getStockName = (symbol: string): string => {
    const stockNames: Record<string, string> = {
      '600519': '贵州茅台',
      '300750': '宁德时代',
      '002594': '比亚迪',
      '600036': '招商银行',
      '000858': '五粮液',
      '601318': '中国平安'
    };
    return stockNames[symbol] || symbol;
  };

  // 筛选新闻
  useEffect(() => {
    let filtered = [...news];

    // 分类过滤（如果不是通过API已经过滤的）
    if (!searchStock && filter === 'high') {
      filtered = filtered.filter(item => getImportanceLevel(item.importance) === 'high');
    } else if (!searchStock && filter !== 'all') {
      filtered = filtered.filter(item => item.category === filter);
    }

    // 搜索词过滤
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        item.source.toLowerCase().includes(term) ||
        (item.keywords && item.keywords.some(keyword => keyword.toLowerCase().includes(term)))
      );
    }

    // 按时间排序
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setFilteredNews(filtered);
  }, [news, filter, searchTerm, searchStock]);

  // 获取重要性级别
  const getImportanceLevel = (importance: number): 'high' | 'medium' | 'low' => {
    if (importance >= 8) return 'high';
    if (importance >= 6) return 'medium';
    return 'low';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'market':
        return <TrendingUp className="w-3.5 h-3.5" />;
      case 'policy':
        return <AlertCircle className="w-3.5 h-3.5" />;
      case 'earnings':
        return <Calendar className="w-3.5 h-3.5" />;
      case 'industry':
        return <Building className="w-3.5 h-3.5" />;
      case 'company':
        return <DollarSign className="w-3.5 h-3.5" />;
      default:
        return <Globe className="w-3.5 h-3.5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'market':
        return 'text-[#0ea5e9]';
      case 'policy':
        return 'text-[#f59e0b]';
      case 'earnings':
        return 'text-[#10b981]';
      case 'industry':
        return 'text-[#8b5cf6]';
      case 'company':
        return 'text-[#f472b6]';
      case 'alert':
        return 'text-[#f97316]';
      default:
        return 'text-gray-500';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-[#10b981]';
      case 'negative':
        return 'text-[#f97316]';
      default:
        return 'text-gray-500';
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-[400px] bg-[#0d1b2e] border-l border-[#1a2942] shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2942] bg-[#0a1628]">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[#0ea5e9]" />
          <div>
            <h3 className="text-sm text-gray-200 bloomberg-code">NEWS</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <span className="status-live">LIVE</span>
              <span>实时新闻流</span>
              {loading && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadNews}
            disabled={loading}
            className="p-1 hover:bg-[#1a2942] rounded transition-colors disabled:opacity-50"
            title="刷新新闻"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1a2942] rounded transition-colors"
          >
            <span className="text-gray-500">✕</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-4 py-3 border-b border-[#1a2942] space-y-3">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索新闻标题、内容或关键词..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#1a2942]/50 border border-[#2a3f5f] rounded text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#0ea5e9]/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1.5 p-0.5 hover:bg-[#2a3f5f] rounded transition-colors"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-2 py-1.5 rounded text-xs transition-colors ${
              showAdvancedFilters || searchStock
                ? 'bg-[#0ea5e9] text-white'
                : 'bg-[#1a2942]/50 text-gray-500 hover:text-gray-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                value={searchStock}
                onChange={(e) => setSearchStock(e.target.value)}
                placeholder="搜索股票代码 (如: 600519)"
                className="flex-1 px-2.5 py-1 bg-[#1a2942]/50 border border-[#2a3f5f] rounded text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#0ea5e9]/50"
              />
              {searchStock && (
                <button
                  onClick={() => setSearchStock('')}
                  className="p-0.5 hover:bg-[#2a3f5f] rounded transition-colors"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-600" />
          <div className="flex gap-1 flex-wrap">
            {[
              { id: 'all', label: '全部' },
              { id: 'high', label: '重要' },
              { id: 'market', label: '市场' },
              { id: 'policy', label: '政策' },
              { id: 'earnings', label: '财报' },
              { id: 'industry', label: '行业' },
              { id: 'company', label: '公司' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  filter === f.id
                    ? 'bg-[#0ea5e9] text-white'
                    : 'bg-[#1a2942]/50 text-gray-500 hover:text-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || searchStock) && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">筛选条件:</span>
            {searchTerm && (
              <span className="px-2 py-0.5 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded">
                关键词: {searchTerm}
              </span>
            )}
            {searchStock && (
              <span className="px-2 py-0.5 bg-[#10b981]/20 text-[#10b981] rounded">
                股票: {searchStock}
              </span>
            )}
          </div>
        )}
      </div>

      {/* News List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNews.map((item) => (
          <div
            key={item.id}
            className="px-4 py-3 border-b border-[#1a2942]/50 hover:bg-[#1a2942]/30 transition-colors cursor-pointer group"
          >
            {/* News Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={getCategoryColor(item.category)}>
                  {getCategoryIcon(item.category)}
                </div>
                {item.importance === 'high' && (
                  <span className="px-1.5 py-0.5 bg-[#f97316]/20 text-[#f97316] rounded text-xs bloomberg-code">
                    HIGH
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-600 bloomberg-mono">
                {getTimeAgo(item.timestamp)}
              </span>
            </div>

            {/* News Title */}
            <h4 className="text-sm text-gray-200 mb-1 group-hover:text-[#0ea5e9] transition-colors">
              {item.title}
            </h4>

            {/* News Summary */}
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.summary}</p>

            {/* Keywords */}
            {item.keywords && item.keywords.length > 0 && (
              <div className="flex items-center gap-1 mb-2 flex-wrap">
                {item.keywords.slice(0, 3).map(keyword => (
                  <span
                    key={keyword}
                    className="px-1.5 py-0.5 bg-gray-700/30 text-gray-400 rounded text-xs cursor-pointer hover:bg-gray-600/30"
                    onClick={() => setSearchTerm(keyword)}
                  >
                    #{keyword}
                  </span>
                ))}
              </div>
            )}

            {/* News Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">{item.source}</span>
                {/* Related Stocks */}
                {item.relatedStocks && item.relatedStocks.length > 0 && (
                  <div className="flex items-center gap-1">
                    {item.relatedStocks.map(stock => (
                      <span
                        key={stock}
                        className="px-1.5 py-0.5 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded text-xs bloomberg-code cursor-pointer hover:bg-[#0ea5e9]/30 transition-colors"
                        onClick={() => setSearchStock(stock)}
                      >
                        {stock}
                      </span>
                    ))}
                  </div>
                )}
                {/* Mentioned Stocks */}
                {item.mentionedStocks && item.mentionedStocks.length > 0 && (
                  <div className="flex items-center gap-1">
                    {item.mentionedStocks.filter(stock => !item.relatedStocks?.includes(stock)).slice(0, 2).map(stock => (
                      <span
                        key={stock}
                        className="px-1.5 py-0.5 bg-[#10b981]/20 text-[#10b981] rounded text-xs bloomberg-code cursor-pointer hover:bg-[#10b981]/30 transition-colors"
                        onClick={() => setSearchStock(stock)}
                      >
                        {stock}
                      </span>
                    ))}
                  </div>
                )}
                {/* Importance Badge */}
                {getImportanceLevel(item.importance) === 'high' && (
                  <span className="px-1.5 py-0.5 bg-[#f97316]/20 text-[#f97316] rounded text-xs bloomberg-code">
                    重要
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${getSentimentColor(item.sentiment)}`} />
                <ExternalLink className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredNews.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-2">未找到相关新闻</p>
            <p className="text-gray-600 text-xs">
              尝试调整搜索条件或分类筛选
            </p>
            {(searchTerm || searchStock) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearchStock('');
                  setFilter('all');
                }}
                className="mt-3 px-3 py-1.5 bg-[#0ea5e9] text-white rounded text-xs hover:bg-[#0ea5e9]/80 transition-colors"
              >
                清除所有筛选
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#1a2942] bg-[#0a1628]">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>自动刷新中</span>
            {(searchTerm || searchStock || filter !== 'all') && (
              <span className="px-1.5 py-0.5 bg-[#f59e0b]/20 text-[#f59e0b] rounded">
                已筛选
              </span>
            )}
          </div>
          <span className="bloomberg-mono">
            {filteredNews.length} / {news.length} 条新闻
          </span>
        </div>
      </div>
    </div>
  );
}

// Toggle Button Component
export function NewsFeedToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-[#1a2942]/50 border border-[#2a3f5f] rounded text-xs text-gray-400 hover:text-gray-200 hover:border-[#0ea5e9]/50 transition-colors relative"
    >
      <Newspaper className="w-3.5 h-3.5" />
      <span className="bloomberg-code">NEWS</span>
      <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#10b981] rounded-full animate-data-pulse"></span>
    </button>
  );
}
