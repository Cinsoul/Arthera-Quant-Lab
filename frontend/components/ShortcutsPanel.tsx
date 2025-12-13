import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: string;
}

interface ShortcutsPanelProps {
  onClose: () => void;
  shortcuts?: any[]; // Optional, using internal shortcuts if not provided
}

const internalShortcuts: ShortcutConfig[] = [
  // Navigation shortcuts
  { key: 'D', ctrl: true, description: '打开 Dashboard', category: '导航' },
  { key: 'L', ctrl: true, description: '打开策略实验室', category: '导航' },
  { key: 'P', ctrl: true, description: '打开组合体检', category: '导航' },
  { key: 'R', ctrl: true, description: '打开报告中心', category: '导航' },
  { key: 'S', ctrl: true, description: '打开股票选择器', category: '导航' },
  
  // Tool shortcuts
  { key: 'A', ctrl: true, shift: true, description: '打开 AI Copilot', category: '工具' },
  { key: 'N', ctrl: true, description: '切换新闻流', category: '工具' },
  { key: 'B', ctrl: true, description: '切换预警系统', category: '工具' },
  
  // Modal shortcuts
  { key: 'R', ctrl: true, shift: true, description: '风险偏好设置', category: '功能面板' },
  { key: 'M', ctrl: true, shift: true, description: '方法论说明', category: '功能面板' },
  { key: 'G', ctrl: true, shift: true, description: '术语解释', category: '功能面板' },
  { key: 'K', ctrl: true, shift: true, description: '快捷键面板', category: '功能面板' },
  
  // System shortcuts
  { key: 'Escape', description: '关闭当前面板', category: '系统' },
];

export function ShortcutsPanel({ onClose }: ShortcutsPanelProps) {
  const shortcuts = internalShortcuts;
  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e3a5f] flex items-center justify-between bg-gradient-to-r from-[#0d1b2e] to-[#0a1628]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 rounded-lg flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-[#0ea5e9]" />
            </div>
            <div>
              <h2 className="text-lg text-gray-100">键盘快捷键</h2>
              <p className="text-xs text-gray-500">Bloomberg 风格专业快捷键系统</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#1e3a5f]/50 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {categories.map((category) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-xs text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[#0ea5e9]"></div>
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 px-4 bg-[#0d1b2e] border border-[#1a2942] rounded-lg hover:border-[#0ea5e9]/30 transition-colors"
                    >
                      <span className="text-sm text-gray-300">{shortcut.description}</span>
                      <div className="flex items-center gap-1.5">
                        {shortcut.ctrl && (
                          <kbd className="px-2.5 py-1.5 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-400 font-mono">
                            Ctrl
                          </kbd>
                        )}
                        {shortcut.shift && (
                          <kbd className="px-2.5 py-1.5 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-400 font-mono">
                            Shift
                          </kbd>
                        )}
                        {shortcut.alt && (
                          <kbd className="px-2.5 py-1.5 bg-[#1a2942] border border-[#2a3f5f] rounded text-xs text-gray-400 font-mono">
                            Alt
                          </kbd>
                        )}
                        {shortcut.ctrl && !shortcut.shift && !shortcut.alt && (
                          <span className="text-gray-600 mx-1">+</span>
                        )}
                        {shortcut.shift && (
                          <span className="text-gray-600 mx-1">+</span>
                        )}
                        <kbd className="px-2.5 py-1.5 bg-[#0ea5e9]/20 border border-[#0ea5e9]/40 rounded text-xs text-[#0ea5e9] font-mono min-w-[32px] text-center">
                          {shortcut.key}
                        </kbd>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {/* Tips */}
          <div className="mt-6 p-4 bg-[#0ea5e9]/5 border border-[#0ea5e9]/20 rounded-lg">
            <div className="text-xs text-gray-400 mb-2">💡 专业提示</div>
            <ul className="space-y-1.5 text-xs text-gray-500">
              <li className="flex items-start gap-2">
                <span className="text-[#0ea5e9] mt-0.5">•</span>
                <span>在 Mac 上，Ctrl 键可以用 Cmd (⌘) 键代替</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0ea5e9] mt-0.5">•</span>
                <span>按 <kbd className="px-1 bg-[#1a2942] rounded">?</kbd> 可随时打开此快捷键面板</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0ea5e9] mt-0.5">•</span>
                <span>按 <kbd className="px-1 bg-[#1a2942] rounded">Escape</kbd> 可关闭任何面板或模态框</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1e3a5f] bg-[#0d1b2e]/50">
          <div className="text-xs text-gray-600 text-center">
            共 {shortcuts.length} 个快捷键 · 持续优化中
          </div>
        </div>
      </div>
    </div>
  );
}