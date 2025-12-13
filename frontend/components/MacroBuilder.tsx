/**
 * MacroBuilder - 宏命令构建器
 * 
 * 功能：
 * - 定义复杂命令组
 * - 一键执行宏
 * - 宏参数化
 * - 宏分享导出
 * - 条件执行
 */

import { useState, useEffect } from 'react';
import { Zap, Plus, Play, Edit3, Trash2, Download, Upload, Copy, Settings, ChevronDown, ChevronRight } from 'lucide-react';

export interface MacroStep {
  id: string;
  command: string;
  description?: string;
  condition?: string;
}

export interface MacroCommand {
  id: string;
  name: string;
  description?: string;
  steps: MacroStep[];
  variables: Record<string, { type: string; default?: any; description?: string }>;
  category?: string;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

interface MacroBuilderProps {
  onClose: () => void;
  onExecute?: (macro: MacroCommand, variables: Record<string, any>) => void;
}

const DEFAULT_MACROS: MacroCommand[] = [
  {
    id: 'daily-report',
    name: 'Daily Portfolio Report',
    description: '生成每日组合报告，包含风险分析和导出',
    steps: [
      { id: 's1', command: 'PORT', description: '查看组合持仓' },
      { id: 's2', command: 'VAR confidence=95', description: '计算VaR风险' },
      { id: 's3', command: 'RISK', description: '风险详细分析' },
      { id: 's4', command: 'EXPORT pdf report=daily-{date}', description: '导出PDF报告' }
    ],
    variables: {
      date: { type: 'date', default: 'today', description: '报告日期' }
    },
    category: 'Report',
    usageCount: 45,
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 20
  },
  {
    id: 'stock-deep-dive',
    name: 'Stock Deep Dive',
    description: '股票深度分析：基本面+技术面+估值',
    steps: [
      { id: 's1', command: 'GP {symbol}', description: '查看股票行情' },
      { id: 's2', command: 'DES {symbol}', description: '公司基本信息' },
      { id: 's3', command: 'FA {symbol}', description: '财务分析' },
      { id: 's4', command: 'MA periods=5,10,20,60', description: '技术指标' },
      { id: 's5', command: 'RSI period=14', description: 'RSI指标' },
      { id: 's6', command: 'RV {symbol}', description: '相对估值' },
      { id: 's7', command: 'EXPORT pdf report={symbol}-analysis', description: '导出分析报告' }
    ],
    variables: {
      symbol: { type: 'string', description: '股票代码' }
    },
    category: 'Analysis',
    usageCount: 32,
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 15
  },
  {
    id: 'backtest-workflow',
    name: 'Complete Backtest Workflow',
    description: '完整回测流程：选股→回测→分析→导出',
    steps: [
      { id: 's1', command: 'EQS filters={filters}', description: '股票筛选' },
      { id: 's2', command: 'BT strategy={strategy} start={start}', description: '运行回测' },
      { id: 's3', command: 'BTST', description: '回测统计' },
      { id: 's4', command: 'DRAW', description: '回撤分析' },
      { id: 's5', command: 'EXPORT excel report=backtest-{strategy}', description: '导出Excel' }
    ],
    variables: {
      filters: { type: 'json', default: '{"pe":[0,20]}', description: '筛选条件' },
      strategy: { type: 'string', default: 'value', description: '策略名称' },
      start: { type: 'date', default: '2024-01-01', description: '回测开始日期' }
    },
    category: 'Backtest',
    usageCount: 28,
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10
  }
];

export function MacroBuilder({ onClose, onExecute }: MacroBuilderProps) {
  const [macros, setMacros] = useState<MacroCommand[]>([]);
  const [selectedMacro, setSelectedMacro] = useState<MacroCommand | null>(null);
  const [expandedMacros, setExpandedMacros] = useState<Set<string>>(new Set());
  const [editingMacro, setEditingMacro] = useState<MacroCommand | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [executingMacro, setExecutingMacro] = useState<MacroCommand | null>(null);
  const [macroVariables, setMacroVariables] = useState<Record<string, any>>({});

  // Load macros from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('arthera-macros');
    if (saved) {
      try {
        setMacros(JSON.parse(saved));
      } catch {
        setMacros(DEFAULT_MACROS);
      }
    } else {
      setMacros(DEFAULT_MACROS);
    }
  }, []);

  // Save macros to localStorage
  const saveMacros = (newMacros: MacroCommand[]) => {
    setMacros(newMacros);
    localStorage.setItem('arthera-macros', JSON.stringify(newMacros));
  };

  const toggleExpanded = (macroId: string) => {
    const newExpanded = new Set(expandedMacros);
    if (newExpanded.has(macroId)) {
      newExpanded.delete(macroId);
    } else {
      newExpanded.add(macroId);
    }
    setExpandedMacros(newExpanded);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个宏吗？')) {
      saveMacros(macros.filter(m => m.id !== id));
    }
  };

  const handleExecute = (macro: MacroCommand) => {
    // Initialize variables with defaults
    const initialVariables: Record<string, any> = {};
    Object.entries(macro.variables).forEach(([key, config]) => {
      initialVariables[key] = config.default || '';
    });
    setMacroVariables(initialVariables);
    setExecutingMacro(macro);
  };

  const handleRunMacro = () => {
    if (!executingMacro) return;

    // Update usage count
    saveMacros(
      macros.map(m =>
        m.id === executingMacro.id
          ? { ...m, usageCount: m.usageCount + 1 }
          : m
      )
    );

    onExecute?.(executingMacro, macroVariables);
    setExecutingMacro(null);
    onClose();
  };

  const handleExport = (macro: MacroCommand) => {
    const dataStr = JSON.stringify(macro, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `macro-${macro.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'Report': 'text-yellow-400',
      'Analysis': 'text-blue-400',
      'Backtest': 'text-green-400',
      'Risk': 'text-red-400',
      'Portfolio': 'text-cyan-400'
    };
    return colors[category || ''] || 'text-gray-400';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] flex items-center justify-center">
      <div className="bg-[#0A1929] border border-[#1E3A5F] rounded-lg shadow-2xl w-[900px] max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#1E3A5F] bg-[#0D1F2D] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-[#f59e0b]" />
              <h3 className="text-lg text-gray-200">Macro Commands</h3>
              <span className="px-2 py-1 bg-[#f59e0b]/20 text-[#f59e0b] text-xs rounded">
                {macros.length} macros
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Macros List */}
        <div className="p-6 space-y-3 max-h-[600px] overflow-y-auto">
          {macros.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <div className="text-sm text-gray-500">No macros yet</div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-3 text-xs text-[#00D9FF] hover:underline"
              >
                Create your first macro
              </button>
            </div>
          ) : (
            macros.map(macro => (
              <div
                key={macro.id}
                className="border border-[#1E3A5F] rounded-lg overflow-hidden hover:border-[#00D9FF]/50 transition-all"
              >
                {/* Macro Header */}
                <div className="p-4 bg-[#0A1520]/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => toggleExpanded(macro.id)}
                        className="mt-1 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {expandedMacros.has(macro.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-sm font-medium text-gray-200">{macro.name}</h4>
                          {macro.category && (
                            <span className={`text-xs ${getCategoryColor(macro.category)}`}>
                              {macro.category}
                            </span>
                          )}
                          <span className="text-xs text-gray-600">
                            {macro.steps.length} steps • Used {macro.usageCount} times
                          </span>
                        </div>
                        {macro.description && (
                          <p className="text-xs text-gray-500">{macro.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleExecute(macro)}
                        className="px-3 py-1.5 bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#f59e0b] rounded text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Run
                      </button>
                      <button
                        onClick={() => handleExport(macro)}
                        className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                        title="Export"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(macro.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Variables Summary */}
                  {Object.keys(macro.variables).length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                      <Settings className="w-3 h-3" />
                      <span>Variables:</span>
                      {Object.keys(macro.variables).map(varName => (
                        <span
                          key={varName}
                          className="px-2 py-0.5 bg-[#1E3A5F]/30 rounded text-[#00D9FF]"
                        >
                          {'{'}
                          {varName}
                          {'}'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expanded Steps */}
                {expandedMacros.has(macro.id) && (
                  <div className="border-t border-[#1E3A5F] p-4 bg-[#0A1520]/30">
                    <div className="space-y-2">
                      {macro.steps.map((step, index) => (
                        <div key={step.id} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#00D9FF]/20 border border-[#00D9FF]/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-[#00D9FF] font-medium">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="p-2 bg-[#0A1520] border border-[#1E3A5F] rounded mb-1">
                              <pre className="text-xs font-mono text-gray-400">
                                {step.command}
                              </pre>
                            </div>
                            {step.description && (
                              <div className="text-xs text-gray-600">{step.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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
              {macros.length} macros • Total usage: {macros.reduce((sum, m) => sum + m.usageCount, 0)}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#2A4A6F] text-gray-300 rounded text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Execute Macro Modal */}
      {executingMacro && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-[#0A1929] border border-[#1E3A5F] rounded-lg shadow-2xl w-[600px]">
            <div className="border-b border-[#1E3A5F] bg-[#0D1F2D] px-6 py-4">
              <h4 className="text-base text-gray-200">Configure Macro Variables</h4>
              <div className="text-xs text-gray-500 mt-1">{executingMacro.name}</div>
            </div>

            <div className="p-6 space-y-4">
              {Object.entries(executingMacro.variables).map(([varName, config]) => (
                <div key={varName}>
                  <label className="block text-sm text-gray-300 mb-2">
                    {varName}
                    {config.description && (
                      <span className="text-xs text-gray-500 ml-2">({config.description})</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={macroVariables[varName] || ''}
                    onChange={(e) =>
                      setMacroVariables({ ...macroVariables, [varName]: e.target.value })
                    }
                    placeholder={config.default}
                    className="w-full px-3 py-2 bg-[#0A1520] border border-[#1E3A5F] rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50"
                  />
                </div>
              ))}
            </div>

            <div className="border-t border-[#1E3A5F] bg-[#0A1520] px-6 py-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setExecutingMacro(null)}
                className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#2A4A6F] text-gray-300 rounded text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRunMacro}
                className="px-4 py-2 bg-[#f59e0b] hover:bg-[#f59e0b]/90 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Run Macro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
