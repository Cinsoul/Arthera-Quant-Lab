import { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, FileText, BarChart2, Clock, Star, Hash, Building2, Calendar, Newspaper, ArrowRight, ExternalLink, Activity, PieChart } from 'lucide-react';
import { newsService } from '../services/NewsService';

interface SearchResult {
  id: string;
  type: 'stock' | 'strategy' | 'backtest' | 'report' | 'function' | 'news' | 'chart';
  title: string;
  subtitle: string;
  icon: any;
  category: string;
  action: () => void;
  metadata?: {
    code?: string;
    date?: string;
    tags?: string[];
    price?: string;
    change?: string;
    sector?: string;
    newsCount?: number;
    chartType?: string;
  };
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string, id?: string) => void;
  onOpenChart?: (symbol: string, chartType?: string) => void;
  onOpenNews?: (searchTerm?: string, stockSymbol?: string) => void;
}

// Enhanced stock data with real-time info
const stockData = [
  { code: '600519', name: '贵州茅台', sector: '食品饮料', marketCap: '2.1T', price: '1658.32', change: '+2.45%', volume: '8.2M' },
  { code: '300750', name: '宁德时代', sector: '电力设备', marketCap: '1.2T', price: '245.67', change: '-1.23%', volume: '15.8M' },
  { code: '000858', name: '五粮液', sector: '食品饮料', marketCap: '0.8T', price: '128.55', change: '+0.89%', volume: '6.5M' },
  { code: '600036', name: '招商银行', sector: '银行', marketCap: '1.3T', price: '42.18', change: '+1.67%', volume: '18.3M' },
  { code: '002594', name: '比亚迪', sector: '汽车', marketCap: '0.9T', price: '278.45', change: '+3.21%', volume: '22.7M' },
  { code: '601318', name: '中国平安', sector: '保险', marketCap: '1.1T', price: '58.92', change: '-0.45%', volume: '12.1M' },
  { code: '000333', name: '美的集团', sector: '家用电器', marketCap: '0.6T', price: '65.78', change: '+1.12%', volume: '9.8M' },
  { code: '600276', name: '恒瑞医药', sector: '医药生物', marketCap: '0.5T', price: '48.33', change: '-2.11%', volume: '7.4M' },
  { code: '000001', name: '平安银行', sector: '银行', marketCap: '0.4T', price: '12.85', change: '+0.78%', volume: '25.6M' },
  { code: '000002', name: '万科A', sector: '房地产', marketCap: '0.3T', price: '8.96', change: '+2.34%', volume: '31.2M' },
];

const strategyData = [
  { id: 'high-vol-alpha', name: 'High Vol Alpha', description: '高波动Alpha策略', return: '+42.3%' },
  { id: 'multi-factor', name: 'Multi-Factor Balanced', description: '多因子平衡策略', return: '+38.6%' },
  { id: 'momentum-quality', name: 'Momentum + Quality', description: '动量质量组合', return: '+28.4%' },
  { id: 'low-vol-defense', name: 'Low Volatility Defense', description: '低波动防御策略', return: '+25.7%' },
];

const backtestData = [
  { id: 'bt-001', name: 'High Vol Alpha - Q4 Test', date: '2024-12-09', status: '完成' },
  { id: 'bt-002', name: 'Multi-Factor Balanced', date: '2024-12-08', status: '完成' },
  { id: 'bt-003', name: 'Momentum + Quality', date: '2024-12-07', status: '完成' },
];

const reportData = [
  { id: 'rpt-001', name: 'Q4 回测报告', type: '回测报告', date: '2024-12-09' },
  { id: 'rpt-002', name: '综合分析报告', type: '综合报告', date: '2024-12-08' },
  { id: 'rpt-003', name: '技术分析报告', type: '技术报告', date: '2024-12-07' },
];

export function GlobalSearch({ isOpen, onClose, onNavigate, onOpenChart, onOpenNews }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [newsResults, setNewsResults] = useState<any[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('arthera-recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Save to recent searches
  const saveToRecent = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('arthera-recent-searches', JSON.stringify(updated));
  };

  // Search news when query changes
  useEffect(() => {
    if (query.trim() !== '' && (activeFilter === 'all' || activeFilter === 'news')) {
      searchNews(query);
    } else {
      setNewsResults([]);
    }
  }, [query, activeFilter]);

  // Search news function
  const searchNews = async (searchQuery: string) => {
    setIsLoadingNews(true);
    try {
      const result = await newsService.searchNews({
        searchTerm: searchQuery,
        limit: 5
      });
      if (result.success) {
        setNewsResults(result.data);
      }
    } catch (error) {
      console.error('搜索新闻失败:', error);
    } finally {
      setIsLoadingNews(false);
    }
  };

  // Search logic
  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      return;
    }

    const searchQuery = query.toLowerCase();
    const allResults: SearchResult[] = [];

    // Search stocks
    if (activeFilter === 'all' || activeFilter === 'stock') {
      stockData
        .filter(stock => 
          stock.code.includes(searchQuery) ||
          stock.name.toLowerCase().includes(searchQuery) ||
          stock.sector.toLowerCase().includes(searchQuery)
        )
        .forEach(stock => {
          // Add main stock result
          allResults.push({
            id: stock.code,
            type: 'stock',
            title: `${stock.code} ${stock.name}`,
            subtitle: `${stock.sector} • ¥${stock.price} ${stock.change}`,
            icon: TrendingUp,
            category: '股票',
            action: () => {
              if (onOpenChart) {
                onOpenChart(stock.code, 'main');
              } else {
                onNavigate('chart-workbench', stock.code);
              }
              saveToRecent(`${stock.code} ${stock.name}`);
              onClose();
            },
            metadata: {
              code: stock.code,
              price: stock.price,
              change: stock.change,
              sector: stock.sector,
              tags: [stock.sector]
            }
          });

          // Add chart-specific results
          if (activeFilter === 'all' || activeFilter === 'chart') {
            const chartTypes = [
              { type: 'candlestick', name: 'K线图', icon: BarChart2 },
              { type: 'line', name: '分时图', icon: Activity },
              { type: 'volume', name: '成交量', icon: PieChart }
            ];

            chartTypes.forEach(chart => {
              allResults.push({
                id: `${stock.code}_${chart.type}`,
                type: 'chart',
                title: `${stock.name} ${chart.name}`,
                subtitle: `${stock.code} • ${stock.price} ${stock.change}`,
                icon: chart.icon,
                category: '图表',
                action: () => {
                  if (onOpenChart) {
                    onOpenChart(stock.code, chart.type);
                  }
                  saveToRecent(`${stock.code} ${chart.name}`);
                  onClose();
                },
                metadata: {
                  code: stock.code,
                  chartType: chart.type,
                  price: stock.price,
                  change: stock.change
                }
              });
            });
          }
        });
    }

    // Search strategies
    if (activeFilter === 'all' || activeFilter === 'strategy') {
      strategyData
        .filter(strategy =>
          strategy.name.toLowerCase().includes(searchQuery) ||
          strategy.description.toLowerCase().includes(searchQuery)
        )
        .forEach(strategy => {
          allResults.push({
            id: strategy.id,
            type: 'strategy',
            title: strategy.name,
            subtitle: `${strategy.description} • 收益 ${strategy.return}`,
            icon: BarChart2,
            category: '策略',
            action: () => {
              onNavigate('strategy-lab', strategy.id);
              saveToRecent(strategy.name);
              onClose();
            },
            metadata: {
              tags: ['策略']
            }
          });
        });
    }

    // Search backtests
    if (activeFilter === 'all' || activeFilter === 'backtest') {
      backtestData
        .filter(backtest =>
          backtest.name.toLowerCase().includes(searchQuery)
        )
        .forEach(backtest => {
          allResults.push({
            id: backtest.id,
            type: 'backtest',
            title: backtest.name,
            subtitle: `${backtest.date} • ${backtest.status}`,
            icon: Clock,
            category: '回测',
            action: () => {
              onNavigate('backtest-detail', backtest.id);
              saveToRecent(backtest.name);
              onClose();
            },
            metadata: {
              date: backtest.date
            }
          });
        });
    }

    // Search reports
    if (activeFilter === 'all' || activeFilter === 'report') {
      reportData
        .filter(report =>
          report.name.toLowerCase().includes(searchQuery) ||
          report.type.toLowerCase().includes(searchQuery)
        )
        .forEach(report => {
          allResults.push({
            id: report.id,
            type: 'report',
            title: report.name,
            subtitle: `${report.type} • ${report.date}`,
            icon: FileText,
            category: '报告',
            action: () => {
              onNavigate('reports', report.id);
              saveToRecent(report.name);
              onClose();
            },
            metadata: {
              date: report.date
            }
          });
        });
    }

    // Add news results
    if (activeFilter === 'all' || activeFilter === 'news') {
      newsResults.forEach(newsItem => {
        allResults.push({
          id: newsItem.id,
          type: 'news',
          title: newsItem.title,
          subtitle: `${newsItem.source} • ${newsItem.category} • ${getTimeAgo(newsItem.timestamp)}`,
          icon: Newspaper,
          category: '新闻',
          action: () => {
            if (onOpenNews) {
              onOpenNews(undefined, newsItem.relatedStocks?.[0]);
            }
            saveToRecent(newsItem.title);
            onClose();
          },
          metadata: {
            date: newsItem.timestamp,
            tags: newsItem.keywords
          }
        });
      });
    }

    setResults(allResults.slice(0, 25));
    setSelectedIndex(0);
  }, [query, activeFilter, newsResults]);

  // Helper function for time ago
  const getTimeAgo = (timestamp: Date) => {
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      }
    }
  };

  const filters = [
    { id: 'all', label: '全部', icon: Search },
    { id: 'stock', label: '股票', icon: TrendingUp },
    { id: 'chart', label: '图表', icon: BarChart2 },
    { id: 'news', label: '新闻', icon: Newspaper },
    { id: 'strategy', label: '策略', icon: Activity },
    { id: 'backtest', label: '回测', icon: Clock },
    { id: 'report', label: '报告', icon: FileText },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="fixed top-[12%] left-1/2 -translate-x-1/2 w-[750px] bg-[#0d1b2e] border border-[#0ea5e9]/50 rounded-lg shadow-2xl z-50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1a2942]">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-[#0ea5e9]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索股票、策略、回测、报告..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-200 placeholder-gray-600"
            />
            <kbd className="px-2 py-1 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-500">
              ESC
            </kbd>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mt-3">
            {filters.map(filter => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                    activeFilter === filter.id
                      ? 'bg-[#0ea5e9] text-white'
                      : 'bg-[#1a2942]/50 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[450px] overflow-y-auto">
          {query.trim() === '' ? (
            // Recent searches
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                <span>最近搜索</span>
              </div>
              {recentSearches.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  暂无搜索历史
                </div>
              ) : (
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(search)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-[#1a2942]/50 rounded transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              )}

              {/* Popular searches */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 uppercase tracking-wider">
                  <Star className="w-3 h-3" />
                  <span>热门搜索</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['贵州茅台', '宁德时代', 'High Vol Alpha', '新能源板块'].map((term, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 bg-[#1a2942]/30 hover:bg-[#1a2942]/50 rounded text-xs text-gray-400 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : results.length === 0 ? (
            // No results
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <div className="text-sm text-gray-500">未找到匹配结果</div>
              <div className="text-xs text-gray-600 mt-1">尝试使用其他关键词</div>
            </div>
          ) : (
            // Search results
            results.map((result, index) => {
              const Icon = result.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={result.id}
                  onClick={result.action}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors group ${
                    isSelected
                      ? 'bg-[#0ea5e9]/20 border-l-2 border-[#0ea5e9]'
                      : 'border-l-2 border-transparent hover:bg-[#1a2942]/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                    result.type === 'stock' ? 'bg-[#10b981]/20' :
                    result.type === 'chart' ? 'bg-[#0ea5e9]/20' :
                    result.type === 'news' ? 'bg-[#f59e0b]/20' :
                    result.type === 'strategy' ? 'bg-[#8b5cf6]/20' :
                    'bg-[#1a2942]/50'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      result.type === 'stock' ? 'text-[#10b981]' :
                      result.type === 'chart' ? 'text-[#0ea5e9]' :
                      result.type === 'news' ? 'text-[#f59e0b]' :
                      result.type === 'strategy' ? 'text-[#8b5cf6]' :
                      'text-[#0ea5e9]'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm text-gray-200 group-hover:text-white transition-colors">
                      {result.title}
                    </div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                      {result.subtitle}
                    </div>
                    {/* Metadata tags */}
                    {result.metadata && (
                      <div className="flex items-center gap-1 mt-1">
                        {result.metadata.price && (
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            result.metadata.change?.startsWith('+') ? 'bg-[#10b981]/20 text-[#10b981]' :
                            result.metadata.change?.startsWith('-') ? 'bg-[#f97316]/20 text-[#f97316]' :
                            'bg-gray-600/20 text-gray-400'
                          }`}>
                            ¥{result.metadata.price}
                          </span>
                        )}
                        {result.metadata.change && (
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            result.metadata.change.startsWith('+') ? 'bg-[#10b981]/20 text-[#10b981]' :
                            result.metadata.change.startsWith('-') ? 'bg-[#f97316]/20 text-[#f97316]' :
                            'bg-gray-600/20 text-gray-400'
                          }`}>
                            {result.metadata.change}
                          </span>
                        )}
                        {result.metadata.chartType && (
                          <span className="px-1.5 py-0.5 bg-[#0ea5e9]/20 text-[#0ea5e9] rounded text-xs">
                            {result.metadata.chartType}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 bg-[#1a2942]/50 rounded text-xs text-gray-600">
                      {result.category}
                    </div>
                    {(result.type === 'stock' || result.type === 'chart') && (
                      <ArrowRight className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                    {result.type === 'news' && (
                      <ExternalLink className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1a2942] bg-[#0a1628] flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#1a2942] rounded">↑↓</kbd> 导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#1a2942] rounded">Enter</kbd> 选择
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#1a2942] rounded">ESC</kbd> 关闭
            </span>
          </div>
          <div className="text-[#0ea5e9]">
            {results.length} 个结果
          </div>
        </div>
      </div>
    </>
  );
}
