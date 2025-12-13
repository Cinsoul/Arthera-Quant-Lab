/**
 * PipelineTemplates - 管道模板选择器
 * 
 * 功能：
 * - 常用工作流模板
 * - 快速填充参数
 * - 模板分类浏览
 * - 自定义模板保存
 */

import { useState } from 'react';
import { Zap, Search, Play, Star, Plus, Trash2, Edit3 } from 'lucide-react';

interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  category: string;
  isCustom?: boolean;
  usageCount?: number;
}

interface PipelineTemplatesProps {
  onSelect: (template: string) => void;
  onClose: () => void;
}

const BUILTIN_TEMPLATES: PipelineTemplate[] = [
  {
    id: 'stock-analysis',
    name: '股票技术分析',
    description: '查看股票行情并计算技术指标',
    template: 'GP {symbol} | MA periods=5,10,20 | RSI period=14',
    category: 'Analysis',
    usageCount: 125
  },
  {
    id: 'backtest-export',
    name: '回测并导出',
    description: '运行回测并导出Excel报告',
    template: 'BT {strategy} | EXPORT excel',
    category: 'Backtest',
    usageCount: 89
  },
  {
    id: 'portfolio-risk',
    name: '组合风险分析',
    description: '分析组合并计算VaR风险',
    template: 'PORT | VAR confidence=95 | EXPORT pdf',
    category: 'Risk',
    usageCount: 67
  },
  {
    id: 'stock-screening',
    name: '选股并对比',
    description: '筛选股票并进行对比分析',
    template: 'EQS filters={"pe":[0,20]} | COMP',
    category: 'Screening',
    usageCount: 54
  },
  {
    id: 'multi-indicator',
    name: '多指标分析',
    description: '计算MA、RSI、MACD多个技术指标',
    template: 'GP {symbol} | MA periods=5,10,20 | RSI period=14 | MACD',
    category: 'Technical',
    usageCount: 43
  },
  {
    id: 'comparison-backtest',
    name: '对比回测',
    description: '对比多只股票并运行回测',
    template: 'COMP symbols={symbols} | BT start=2024-01-01',
    category: 'Backtest',
    usageCount: 38
  },
  {
    id: 'risk-report',
    name: '完整风险报告',
    description: '生成包含VaR、压力测试的完整报告',
    template: 'PORT | VAR | RISK | EXPORT pdf report=risk-analysis',
    category: 'Risk',
    usageCount: 29
  },
  {
    id: 'factor-analysis',
    name: '因子分析流程',
    description: '分析股票的价值、动量、质量因子',
    template: 'GP {symbol} | FVAL | FMOM | FQUA | EXPORT excel',
    category: 'Factor',
    usageCount: 22
  },
  {
    id: 'quick-screen-bt',
    name: '快速筛选回测',
    description: '筛选低估值股票并快速回测',
    template: 'EQS filters={"pe":[0,15],"pb":[0,2]} | BT strategy=value | EXPORT excel',
    category: 'Screening',
    usageCount: 18
  },
  {
    id: 'portfolio-attribution',
    name: '组合归因分析',
    description: '完整的组合归因和绩效分解',
    template: 'PORT | PATTR | PERF | EXPORT pdf',
    category: 'Portfolio',
    usageCount: 15
  }
];

export function PipelineTemplates({ onSelect, onClose }: PipelineTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customTemplates, setCustomTemplates] = useState<PipelineTemplate[]>([]);

  // Get all templates
  const allTemplates = [...BUILTIN_TEMPLATES, ...customTemplates];

  // Get categories
  const categories = ['all', ...Array.from(new Set(allTemplates.map(t => t.category)))];

  // Filter templates
  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.template.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Sort by usage count
  const sortedTemplates = filteredTemplates.sort((a, b) => 
    (b.usageCount || 0) - (a.usageCount || 0)
  );

  const handleSelectTemplate = (template: PipelineTemplate) => {
    onSelect(template.template);
    onClose();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Analysis': 'text-blue-400',
      'Backtest': 'text-green-400',
      'Risk': 'text-red-400',
      'Screening': 'text-yellow-400',
      'Technical': 'text-purple-400',
      'Factor': 'text-pink-400',
      'Portfolio': 'text-cyan-400'
    };
    return colors[category] || 'text-gray-400';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] flex items-center justify-center">
      <div className="bg-[#0A1929] border border-[#1E3A5F] rounded-lg shadow-2xl w-[800px] max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#1E3A5F] bg-[#0D1F2D] px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-[#00D9FF]" />
              <h3 className="text-lg text-gray-200">Pipeline Templates</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 bg-[#0A1520] border border-[#1E3A5F] rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30'
                    : 'bg-[#1E3A5F]/30 text-gray-400 hover:text-gray-300'
                }`}
              >
                {category === 'all' ? 'All' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto">
          {sortedTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <div className="text-sm text-gray-500">No templates found</div>
              <div className="text-xs text-gray-600 mt-1">
                Try adjusting your search or filters
              </div>
            </div>
          ) : (
            sortedTemplates.map(template => (
              <div
                key={template.id}
                className="border border-[#1E3A5F] rounded-lg p-4 hover:border-[#00D9FF]/50 transition-all cursor-pointer group"
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-sm font-medium text-gray-200 group-hover:text-[#00D9FF] transition-colors">
                        {template.name}
                      </h4>
                      <span className={`text-xs ${getCategoryColor(template.category)}`}>
                        {template.category}
                      </span>
                      {template.isCustom && (
                        <span className="px-2 py-0.5 bg-purple-400/20 text-purple-400 text-xs rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{template.description}</p>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    {template.usageCount !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Star className="w-3 h-3" />
                        <span>{template.usageCount}</span>
                      </div>
                    )}
                    <Play className="w-4 h-4 text-gray-600 group-hover:text-[#00D9FF] transition-colors" />
                  </div>
                </div>

                {/* Template Preview */}
                <div className="mt-3 p-3 bg-[#0A1520] border border-[#1E3A5F] rounded">
                  <pre className="text-xs font-mono text-gray-400 overflow-x-auto">
                    {template.template}
                  </pre>
                </div>

                {/* Variable Hints */}
                {template.template.includes('{') && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <span>Variables:</span>
                    {template.template.match(/\{(\w+)\}/g)?.map(variable => (
                      <span
                        key={variable}
                        className="px-2 py-0.5 bg-[#1E3A5F]/30 rounded text-[#00D9FF]"
                      >
                        {variable}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1E3A5F] bg-[#0A1520] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {sortedTemplates.length} templates available
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#2A4A6F] text-gray-300 rounded text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
