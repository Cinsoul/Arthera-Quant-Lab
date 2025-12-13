/**
 * AliasManager - Bloomberg级命令别名管理系统
 * 
 * 功能：
 * - 创建命令别名
 * - 别名列表管理
 * - 编辑/删除别名
 * - 别名导入/导出
 * - 团队共享
 */

import { useState, useEffect } from 'react';
import { Tag, Plus, Edit3, Trash2, Download, Upload, Search, Copy, Check, AlertCircle } from 'lucide-react';

export interface CommandAlias {
  id: string;
  name: string;
  command: string;
  description?: string;
  category?: string;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

interface AliasManagerProps {
  onClose: () => void;
  onAliasSelect?: (alias: CommandAlias) => void;
}

const DEFAULT_ALIASES: CommandAlias[] = [
  {
    id: 'mt',
    name: 'mt',
    command: 'GP 600519',
    description: '贵州茅台快捷方式',
    category: 'Stock',
    usageCount: 45,
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 30
  },
  {
    id: 'wly',
    name: 'wly',
    command: 'GP 000858',
    description: '五粮液快捷方式',
    category: 'Stock',
    usageCount: 32,
    createdAt: Date.now() - 86400000 * 25,
    updatedAt: Date.now() - 86400000 * 25
  },
  {
    id: 'myport',
    name: 'myport',
    command: 'PORT | VAR confidence=95',
    description: '我的组合风险分析',
    category: 'Portfolio',
    usageCount: 28,
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 20
  },
  {
    id: 'daily',
    name: 'daily',
    command: 'PORT | PERF | EXPORT pdf',
    description: '每日组合报告',
    category: 'Report',
    usageCount: 67,
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 15
  },
  {
    id: 'tech',
    name: 'tech',
    command: 'GP {symbol} | MA periods=5,10,20 | RSI period=14 | MACD',
    description: '完整技术分析',
    category: 'Analysis',
    usageCount: 53,
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10
  }
];

export function AliasManager({ onClose, onAliasSelect }: AliasManagerProps) {
  const [aliases, setAliases] = useState<CommandAlias[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingAlias, setEditingAlias] = useState<CommandAlias | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load aliases from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('arthera-aliases');
    if (saved) {
      try {
        setAliases(JSON.parse(saved));
      } catch {
        setAliases(DEFAULT_ALIASES);
      }
    } else {
      setAliases(DEFAULT_ALIASES);
    }
  }, []);

  // Save aliases to localStorage
  const saveAliases = (newAliases: CommandAlias[]) => {
    setAliases(newAliases);
    localStorage.setItem('arthera-aliases', JSON.stringify(newAliases));
  };

  // Get categories
  const categories = ['all', ...Array.from(new Set(aliases.map(a => a.category).filter(Boolean)))];

  // Filter aliases
  const filteredAliases = aliases.filter(alias => {
    const matchesSearch =
      alias.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alias.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alias.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || alias.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Sort by usage count
  const sortedAliases = filteredAliases.sort((a, b) => b.usageCount - a.usageCount);

  const handleCreateAlias = (alias: Omit<CommandAlias, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => {
    const newAlias: CommandAlias = {
      ...alias,
      id: alias.name,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    saveAliases([...aliases, newAlias]);
    setShowCreateForm(false);
  };

  const handleUpdateAlias = (id: string, updates: Partial<CommandAlias>) => {
    saveAliases(
      aliases.map(a =>
        a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
      )
    );
    setEditingAlias(null);
  };

  const handleDeleteAlias = (id: string) => {
    if (confirm('确定要删除这个别名吗？')) {
      saveAliases(aliases.filter(a => a.id !== id));
    }
  };

  const handleCopyCommand = (alias: CommandAlias) => {
    navigator.clipboard.writeText(alias.command);
    setCopiedId(alias.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAliases = () => {
    const dataStr = JSON.stringify(aliases, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arthera-aliases-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAliases = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          saveAliases([...aliases, ...imported]);
          alert(`成功导入 ${imported.length} 个别名`);
        }
      } catch {
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'Stock': 'text-blue-400',
      'Portfolio': 'text-green-400',
      'Report': 'text-yellow-400',
      'Analysis': 'text-purple-400',
      'Risk': 'text-red-400'
    };
    return colors[category || ''] || 'text-gray-400';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] flex items-center justify-center">
      <div className="bg-[#0A1929] border border-[#1E3A5F] rounded-lg shadow-2xl w-[900px] max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#1E3A5F] bg-[#0D1F2D] px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-[#00D9FF]" />
              <h3 className="text-lg text-gray-200">Alias Manager</h3>
              <span className="px-2 py-1 bg-[#00D9FF]/20 text-[#00D9FF] text-xs rounded">
                {aliases.length} aliases
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Alias
              </button>
              <button
                onClick={handleExportAliases}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
                title="Export Aliases"
              >
                <Download className="w-4 h-4" />
              </button>
              <label className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportAliases}
                  className="hidden"
                />
              </label>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-300 transition-colors ml-2"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search aliases..."
              className="w-full pl-10 pr-4 py-2 bg-[#0A1520] border border-[#1E3A5F] rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
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

        {/* Create/Edit Form */}
        {(showCreateForm || editingAlias) && (
          <AliasForm
            alias={editingAlias || undefined}
            onSave={(data) => {
              if (editingAlias) {
                handleUpdateAlias(editingAlias.id, data);
              } else {
                handleCreateAlias(data);
              }
            }}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingAlias(null);
            }}
          />
        )}

        {/* Aliases List */}
        <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto">
          {sortedAliases.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <div className="text-sm text-gray-500">No aliases found</div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-3 text-xs text-[#00D9FF] hover:underline"
              >
                Create your first alias
              </button>
            </div>
          ) : (
            sortedAliases.map(alias => (
              <div
                key={alias.id}
                className="border border-[#1E3A5F] rounded-lg p-4 hover:border-[#00D9FF]/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="px-2 py-1 bg-[#f59e0b]/20 border border-[#f59e0b]/30 rounded">
                        <span className="text-xs text-[#f59e0b] font-mono font-bold">
                          {alias.name}
                        </span>
                      </div>
                      {alias.category && (
                        <span className={`text-xs ${getCategoryColor(alias.category)}`}>
                          {alias.category}
                        </span>
                      )}
                      <span className="text-xs text-gray-600">
                        Used {alias.usageCount} times
                      </span>
                    </div>
                    {alias.description && (
                      <p className="text-xs text-gray-500 mt-1">{alias.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyCommand(alias)}
                      className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                      title="Copy Command"
                    >
                      {copiedId === alias.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingAlias(alias)}
                      className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAlias(alias.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Command Preview */}
                <div className="p-3 bg-[#0A1520] border border-[#1E3A5F] rounded">
                  <div className="flex items-center justify-between">
                    <pre className="text-xs font-mono text-gray-400 overflow-x-auto flex-1">
                      {alias.command}
                    </pre>
                    <button
                      onClick={() => onAliasSelect?.(alias)}
                      className="ml-3 px-3 py-1 bg-[#00D9FF]/20 hover:bg-[#00D9FF]/30 text-[#00D9FF] rounded text-xs transition-colors"
                    >
                      Use
                    </button>
                  </div>
                </div>

                {/* Variables */}
                {alias.command.includes('{') && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>Contains variables:</span>
                    {alias.command.match(/\{(\w+)\}/g)?.map(variable => (
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
              {sortedAliases.length} aliases • Total usage: {aliases.reduce((sum, a) => sum + a.usageCount, 0)}
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
    </div>
  );
}

/**
 * Alias Form - Create/Edit form
 */
interface AliasFormProps {
  alias?: CommandAlias;
  onSave: (data: Omit<CommandAlias, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

function AliasForm({ alias, onSave, onCancel }: AliasFormProps) {
  const [name, setName] = useState(alias?.name || '');
  const [command, setCommand] = useState(alias?.command || '');
  const [description, setDescription] = useState(alias?.description || '');
  const [category, setCategory] = useState(alias?.category || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !command.trim()) return;

    onSave({
      name: name.trim(),
      command: command.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined
    });
  };

  return (
    <div className="border-b border-[#1E3A5F] bg-[#0A1520] px-6 py-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Alias Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., mt, daily, tech"
              className="w-full px-3 py-2 bg-[#0D1F2D] border border-[#1E3A5F] rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Stock, Portfolio"
              className="w-full px-3 py-2 bg-[#0D1F2D] border border-[#1E3A5F] rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Command *</label>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g., GP 600519 | MA | RSI"
            className="w-full px-3 py-2 bg-[#0D1F2D] border border-[#1E3A5F] rounded text-sm text-gray-200 placeholder-gray-600 font-mono focus:outline-none focus:border-[#00D9FF]/50"
            required
          />
          <div className="text-xs text-gray-600 mt-1">
            Use {'{variable}'} for parameters, e.g., GP {'{symbol}'}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full px-3 py-2 bg-[#0D1F2D] border border-[#1E3A5F] rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#2A4A6F] text-gray-300 rounded text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
          >
            {alias ? 'Update' : 'Create'} Alias
          </button>
        </div>
      </form>
    </div>
  );
}
