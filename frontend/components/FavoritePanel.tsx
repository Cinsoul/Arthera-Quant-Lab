/**
 * FavoritePanel - 收藏快速访问面板
 * 
 * 功能：
 * - 收藏常用函数
 * - 收藏管道命令
 * - 快速访问
 * - 分组管理
 * - 使用频率统计
 */

import { useState, useEffect } from 'react';
import { Star, Folder, Clock, TrendingUp, Play, X, Edit3, Trash2, Plus } from 'lucide-react';

export interface FavoriteItem {
  id: string;
  name: string;
  command: string;
  type: 'function' | 'pipeline' | 'query';
  group?: string;
  usageCount: number;
  lastUsed?: number;
  createdAt: number;
}

interface FavoritePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (command: string) => void;
}

const DEFAULT_FAVORITES: FavoriteItem[] = [
  {
    id: 'fav-1',
    name: 'Dashboard',
    command: 'DASH',
    type: 'function',
    group: 'Navigation',
    usageCount: 156,
    lastUsed: Date.now() - 3600000,
    createdAt: Date.now() - 86400000 * 30
  },
  {
    id: 'fav-2',
    name: 'Portfolio',
    command: 'PORT',
    type: 'function',
    group: 'Navigation',
    usageCount: 143,
    lastUsed: Date.now() - 7200000,
    createdAt: Date.now() - 86400000 * 28
  },
  {
    id: 'fav-3',
    name: 'Backtest',
    command: 'BT',
    type: 'function',
    group: 'Navigation',
    usageCount: 89,
    lastUsed: Date.now() - 14400000,
    createdAt: Date.now() - 86400000 * 25
  },
  {
    id: 'fav-4',
    name: '贵州茅台',
    command: 'GP 600519',
    type: 'query',
    group: 'Stocks',
    usageCount: 127,
    lastUsed: Date.now() - 1800000,
    createdAt: Date.now() - 86400000 * 20
  },
  {
    id: 'fav-5',
    name: '五粮液',
    command: 'GP 000858',
    type: 'query',
    group: 'Stocks',
    usageCount: 98,
    lastUsed: Date.now() - 5400000,
    createdAt: Date.now() - 86400000 * 18
  },
  {
    id: 'fav-6',
    name: '技术分析流程',
    command: 'GP {symbol} | MA periods=5,10,20 | RSI period=14',
    type: 'pipeline',
    group: 'Analysis',
    usageCount: 76,
    lastUsed: Date.now() - 10800000,
    createdAt: Date.now() - 86400000 * 15
  },
  {
    id: 'fav-7',
    name: '组合风险报告',
    command: 'PORT | VAR confidence=95 | RISK | EXPORT pdf',
    type: 'pipeline',
    group: 'Reports',
    usageCount: 54,
    lastUsed: Date.now() - 21600000,
    createdAt: Date.now() - 86400000 * 12
  },
  {
    id: 'fav-8',
    name: '股票筛选',
    command: 'EQS',
    type: 'function',
    group: 'Tools',
    usageCount: 45,
    lastUsed: Date.now() - 28800000,
    createdAt: Date.now() - 86400000 * 10
  }
];

export function FavoritePanel({ isOpen, onClose, onExecute }: FavoritePanelProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'usage' | 'recent' | 'name'>('usage');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('arthera-favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {
        setFavorites(DEFAULT_FAVORITES);
      }
    } else {
      setFavorites(DEFAULT_FAVORITES);
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: FavoriteItem[]) => {
    setFavorites(newFavorites);
    localStorage.setItem('arthera-favorites', JSON.stringify(newFavorites));
  };

  // Get groups
  const groups = ['all', ...Array.from(new Set(favorites.map(f => f.group).filter(Boolean)))];

  // Filter and sort favorites
  const filteredFavorites = favorites
    .filter(fav => selectedGroup === 'all' || fav.group === selectedGroup)
    .sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.usageCount - a.usageCount;
        case 'recent':
          return (b.lastUsed || 0) - (a.lastUsed || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const handleExecute = (favorite: FavoriteItem) => {
    // Update usage count and last used
    saveFavorites(
      favorites.map(f =>
        f.id === favorite.id
          ? { ...f, usageCount: f.usageCount + 1, lastUsed: Date.now() }
          : f
      )
    );
    onExecute(favorite.command);
    onClose();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要从收藏中移除吗？')) {
      saveFavorites(favorites.filter(f => f.id !== id));
    }
  };

  const handleUpdateName = (id: string, newName: string) => {
    saveFavorites(
      favorites.map(f => (f.id === id ? { ...f, name: newName } : f))
    );
    setEditingId(null);
  };

  const getTypeIcon = (type: FavoriteItem['type']) => {
    switch (type) {
      case 'function':
        return <Star className="w-3.5 h-3.5 text-yellow-400" />;
      case 'pipeline':
        return <TrendingUp className="w-3.5 h-3.5 text-blue-400" />;
      case 'query':
        return <Clock className="w-3.5 h-3.5 text-green-400" />;
    }
  };

  const formatLastUsed = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[380px] bg-[#0A1929] border-l border-[#1E3A5F] shadow-2xl z-[50] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#1E3A5F] bg-[#0D1F2D] px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-[#f59e0b]" />
            <h3 className="text-base text-gray-200">Favorites</h3>
            <span className="px-2 py-0.5 bg-[#f59e0b]/20 text-[#f59e0b] text-xs rounded">
              {favorites.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setSortBy('usage')}
            className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors ${
              sortBy === 'usage'
                ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30'
                : 'bg-[#1E3A5F]/30 text-gray-400 hover:text-gray-300'
            }`}
          >
            Most Used
          </button>
          <button
            onClick={() => setSortBy('recent')}
            className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors ${
              sortBy === 'recent'
                ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30'
                : 'bg-[#1E3A5F]/30 text-gray-400 hover:text-gray-300'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors ${
              sortBy === 'name'
                ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30'
                : 'bg-[#1E3A5F]/30 text-gray-400 hover:text-gray-300'
            }`}
          >
            Name
          </button>
        </div>

        {/* Groups */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {groups.map(group => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                selectedGroup === group
                  ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30'
                  : 'bg-[#1E3A5F]/30 text-gray-400 hover:text-gray-300'
              }`}
            >
              {group === 'all' ? 'All' : group}
            </button>
          ))}
        </div>
      </div>

      {/* Favorites List */}
      <div className="p-5 space-y-2.5 overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
        {filteredFavorites.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <div className="text-sm text-gray-500">No favorites yet</div>
            <div className="text-xs text-gray-600 mt-1">
              Star commands to add them here
            </div>
          </div>
        ) : (
          filteredFavorites.map(favorite => (
            <div
              key={favorite.id}
              className="border border-[#1E3A5F] rounded-lg p-3 hover:border-[#00D9FF]/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getTypeIcon(favorite.type)}
                  {editingId === favorite.id ? (
                    <input
                      type="text"
                      defaultValue={favorite.name}
                      onBlur={(e) => handleUpdateName(favorite.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateName(favorite.id, e.currentTarget.value);
                        }
                      }}
                      className="flex-1 px-2 py-1 bg-[#0A1520] border border-[#00D9FF]/50 rounded text-xs text-gray-200 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm text-gray-200 truncate">{favorite.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <button
                    onClick={() => setEditingId(favorite.id)}
                    className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(favorite.id)}
                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Command */}
              <div className="mb-2 p-2 bg-[#0A1520] border border-[#1E3A5F] rounded">
                <pre className="text-xs font-mono text-gray-400 truncate">
                  {favorite.command}
                </pre>
              </div>

              {/* Stats and Execute */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {favorite.usageCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatLastUsed(favorite.lastUsed)}
                  </span>
                </div>
                <button
                  onClick={() => handleExecute(favorite)}
                  className="px-3 py-1 bg-[#00D9FF]/20 hover:bg-[#00D9FF]/30 text-[#00D9FF] rounded text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  Run
                </button>
              </div>

              {/* Group Badge */}
              {favorite.group && (
                <div className="mt-2 pt-2 border-t border-[#1E3A5F]/50">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Folder className="w-3 h-3" />
                    <span>{favorite.group}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-[#1E3A5F] bg-[#0A1520] px-5 py-3">
        <div className="text-xs text-gray-500 text-center">
          {filteredFavorites.length} items • Total usage: {favorites.reduce((sum, f) => sum + f.usageCount, 0)}
        </div>
      </div>
    </div>
  );
}

/**
 * Add to Favorites helper
 */
export function addToFavorites(command: string, name?: string, type?: FavoriteItem['type']) {
  const saved = localStorage.getItem('arthera-favorites');
  const favorites: FavoriteItem[] = saved ? JSON.parse(saved) : DEFAULT_FAVORITES;

  const newFavorite: FavoriteItem = {
    id: `fav-${Date.now()}`,
    name: name || command,
    command,
    type: type || 'function',
    usageCount: 0,
    createdAt: Date.now()
  };

  favorites.push(newFavorite);
  localStorage.setItem('arthera-favorites', JSON.stringify(favorites));

  return newFavorite;
}

/**
 * Remove from Favorites helper
 */
export function removeFromFavorites(command: string) {
  const saved = localStorage.getItem('arthera-favorites');
  if (!saved) return;

  const favorites: FavoriteItem[] = JSON.parse(saved);
  const updated = favorites.filter(f => f.command !== command);
  localStorage.setItem('arthera-favorites', JSON.stringify(updated));
}

/**
 * Check if command is favorited
 */
export function isFavorited(command: string): boolean {
  const saved = localStorage.getItem('arthera-favorites');
  if (!saved) return false;

  const favorites: FavoriteItem[] = JSON.parse(saved);
  return favorites.some(f => f.command === command);
}
