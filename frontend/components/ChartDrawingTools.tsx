/**
 * ChartDrawingTools - Bloomberg级图表绘图工具套件
 * 
 * 功能：
 * - 趋势线绘制 (Trendline)
 * - 水平支撑/阻力线 (Horizontal Line)
 * - 垂直线 (Vertical Line)
 * - 矩形标注 (Rectangle)
 * - 文字标签 (Text Annotation)
 * - 斐波那契回调线 (Fibonacci Retracement)
 * - 射线 (Ray)
 * - 箭头 (Arrow)
 * - 绘图保存和加载 (Save/Load)
 * 
 * 设计理念：
 * - 去除图标，使用专业文本标签
 * - Bloomberg Terminal级别的专业界面
 * - 深蓝色系设计风格
 * - 键盘快捷键支持
 */

import { useState, useEffect } from 'react';

export type DrawingTool =
  | 'select'
  | 'trendline'
  | 'hline'
  | 'vline'
  | 'rect'
  | 'text'
  | 'fib'
  | 'ray'
  | 'arrow';

export interface Drawing {
  id: string;
  type: DrawingTool;
  points: { x: number; y: number; price?: number; date?: string }[];
  color: string;
  lineWidth: number;
  text?: string;
  timestamp: number;
}

interface ChartDrawingToolsProps {
  onToolChange: (tool: DrawingTool) => void;
  onDrawingAdd: (drawing: Drawing) => void;
  onDrawingRemove: (id: string) => void;
  onDrawingsClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: () => void;
  activeTool: DrawingTool;
  drawings: Drawing[];
  canUndo: boolean;
  canRedo: boolean;
}

export function ChartDrawingTools({
  onToolChange,
  onDrawingAdd,
  onDrawingRemove,
  onDrawingsClear,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  activeTool,
  drawings,
  canUndo,
  canRedo
}: ChartDrawingToolsProps) {
  const [selectedColor, setSelectedColor] = useState('#0ea5e9');
  const [lineWidth, setLineWidth] = useState(2);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z: 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }
      // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y: 重做
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        onRedo();
      }
      // ESC: 切换到选择工具
      if (e.key === 'Escape') {
        onToolChange('select');
      }
      // Delete: 删除选中的绘图
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 这里需要从父组件传入selectedDrawingId
        // 暂时留空，实际实现需要配合父组件
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onToolChange]);

  const tools = [
    {
      id: 'select' as DrawingTool,
      name: 'SELECT',
      label: '选择',
      shortcut: 'ESC',
      description: '选择和移动图形'
    },
    {
      id: 'trendline' as DrawingTool,
      name: 'TREND',
      label: '趋势线',
      shortcut: 'T',
      description: '绘制趋势线'
    },
    {
      id: 'hline' as DrawingTool,
      name: 'HLINE',
      label: '水平线',
      shortcut: 'H',
      description: '支撑/阻力位标记'
    },
    {
      id: 'vline' as DrawingTool,
      name: 'VLINE',
      label: '垂直线',
      shortcut: 'V',
      description: '垂直支撑/阻力位标记'
    },
    {
      id: 'ray' as DrawingTool,
      name: 'RAY',
      label: '射线',
      shortcut: 'R',
      description: '延长的趋势线'
    },
    {
      id: 'rect' as DrawingTool,
      name: 'RECT',
      label: '矩形',
      shortcut: 'B',
      description: '框选区域'
    },
    {
      id: 'fib' as DrawingTool,
      name: 'FIB',
      label: '斐波那契',
      shortcut: 'F',
      description: '斐波那契回调线'
    },
    {
      id: 'arrow' as DrawingTool,
      name: 'ARROW',
      label: '箭头',
      shortcut: 'A',
      description: '方向标注'
    },
    {
      id: 'text' as DrawingTool,
      name: 'TEXT',
      label: '文字',
      shortcut: 'X',
      description: '文字标注（双击添加）'
    }
  ];

  const colors = [
    { name: '天蓝', value: '#0ea5e9', code: 'CYN' },
    { name: '红色', value: '#ef5350', code: 'RED' },
    { name: '绿色', value: '#10b981', code: 'GRN' },
    { name: '黄色', value: '#f59e0b', code: 'YEL' },
    { name: '紫色', value: '#8b5cf6', code: 'PUR' },
    { name: '橙色', value: '#f97316', code: 'ORG' },
    { name: '白色', value: '#ffffff', code: 'WHT' },
    { name: '灰色', value: '#6b7280', code: 'GRY' }
  ];

  const lineStyles = [
    { value: 'solid' as const, label: 'SOLID', name: '实线' },
    { value: 'dashed' as const, label: 'DASH', name: '虚线' },
    { value: 'dotted' as const, label: 'DOT', name: '点线' }
  ];

  return (
    <div className="bg-[#0d1b2e] border border-[#1e3a5f]/40 rounded-none">
      {/* Header */}
      <div className="bg-[#0a1628] border-b border-[#1e3a5f]/40 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] tracking-[0.15em] text-[#0ea5e9] font-mono">
            DRAWING TOOLS
          </div>
          <div className="text-[9px] text-gray-600 font-mono">
            {drawings.length} OBJECTS
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Tools Grid */}
        <div>
          <div className="text-[9px] text-gray-600 mb-2 tracking-wider font-mono">TOOL SELECT</div>
          <div className="grid grid-cols-4 gap-1">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                title={`${tool.description} (${tool.shortcut})`}
                className={`h-11 px-2 flex flex-col items-center justify-center rounded border transition-all ${
                  activeTool === tool.id
                    ? 'bg-[#0ea5e9] border-[#0ea5e9] text-white shadow-lg'
                    : 'bg-[#0a1628] border-[#1e3a5f] text-gray-400 hover:bg-[#1e3a5f]/30 hover:text-gray-200 hover:border-[#0ea5e9]/30'
                }`}
              >
                <span className="text-[10px] font-mono tracking-wider">
                  {tool.name}
                </span>
                <span className="text-[8px] opacity-60 mt-0.5">
                  {tool.shortcut}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Style Controls */}
        <div className="space-y-3">
          <div className="text-[9px] text-gray-600 mb-2 tracking-wider font-mono">STYLE CONFIG</div>
          
          {/* Color Selector */}
          <div>
            <div className="text-[8px] text-gray-600 mb-1.5 tracking-wider font-mono">COLOR</div>
            <div className="grid grid-cols-8 gap-1">
              {colors.map(color => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  title={`${color.name} (${color.code})`}
                  className={`h-8 rounded border-2 transition-all hover:scale-105 flex items-center justify-center ${
                    selectedColor === color.value
                      ? 'border-white shadow-lg scale-105'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  <span className={`text-[7px] font-mono tracking-wider ${
                    color.value === '#ffffff' ? 'text-gray-800' : 'text-white mix-blend-difference'
                  }`}>
                    {color.code}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Line Width */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[8px] text-gray-600 tracking-wider font-mono">LINE WIDTH</span>
              <span className="text-[10px] text-[#0ea5e9] font-mono">{lineWidth}PX</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="5"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="flex-1 h-1.5 bg-[#1e3a5f] rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${(lineWidth - 1) * 25}%, #1e3a5f ${(lineWidth - 1) * 25}%, #1e3a5f 100%)`
                }}
              />
            </div>
          </div>

          {/* Line Style */}
          <div>
            <div className="text-[8px] text-gray-600 mb-1.5 tracking-wider font-mono">LINE STYLE</div>
            <div className="grid grid-cols-3 gap-1">
              {lineStyles.map(style => (
                <button
                  key={style.value}
                  onClick={() => setLineStyle(style.value)}
                  title={style.name}
                  className={`h-9 px-2 rounded border transition-all ${
                    lineStyle === style.value
                      ? 'bg-[#0ea5e9]/10 border-[#0ea5e9] text-[#0ea5e9]'
                      : 'bg-[#0a1628] border-[#1e3a5f] text-gray-500 hover:text-gray-300 hover:border-[#1e3a5f]/60'
                  }`}
                >
                  <span className="text-[9px] font-mono tracking-wider">{style.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="text-[9px] text-gray-600 mb-2 tracking-wider font-mono">ACTIONS</div>
          
          {/* Undo/Redo */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="h-9 flex items-center justify-center gap-2 rounded bg-[#0a1628] border border-[#1e3a5f] text-gray-400 hover:bg-[#1e3a5f]/30 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="撤销 (Ctrl+Z)"
            >
              <span className="text-[9px] font-mono tracking-wider">UNDO</span>
              <span className="text-[7px] opacity-60">⌘Z</span>
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="h-9 flex items-center justify-center gap-2 rounded bg-[#0a1628] border border-[#1e3a5f] text-gray-400 hover:bg-[#1e3a5f]/30 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="重做 (Ctrl+Y)"
            >
              <span className="text-[9px] font-mono tracking-wider">REDO</span>
              <span className="text-[7px] opacity-60">⌘Y</span>
            </button>
          </div>

          {/* File Operations */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onSave}
              className="h-9 flex items-center justify-center rounded bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20 transition-colors"
              title="保存绘图到本地"
            >
              <span className="text-[9px] font-mono tracking-wider">SAVE</span>
            </button>
            <button
              onClick={onLoad}
              className="h-9 flex items-center justify-center rounded bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 text-[#0ea5e9] hover:bg-[#0ea5e9]/20 transition-colors"
              title="从本地加载绘图"
            >
              <span className="text-[9px] font-mono tracking-wider">LOAD</span>
            </button>
            <button
              onClick={() => {
                if (confirm('确定要清除所有绘图吗？')) {
                  onDrawingsClear();
                }
              }}
              className="h-9 flex items-center justify-center rounded bg-[#ef5350]/10 border border-[#ef5350]/30 text-[#ef5350] hover:bg-[#ef5350]/20 transition-colors"
              title="清除所有绘图"
            >
              <span className="text-[9px] font-mono tracking-wider">CLEAR</span>
            </button>
          </div>
        </div>

        {/* Drawings List */}
        {drawings.length > 0 && (
          <div className="border-t border-[#1e3a5f]/40 pt-3">
            <div className="text-[9px] text-gray-600 mb-2 tracking-wider font-mono">
              RECENT DRAWINGS ({Math.min(drawings.length, 5)}/{drawings.length})
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {drawings.slice(-5).reverse().map(drawing => (
                <div
                  key={drawing.id}
                  className="flex items-center justify-between px-3 py-2 bg-[#0a1628] border border-[#1e3a5f]/30 rounded hover:border-[#1e3a5f] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-sm"
                      style={{ backgroundColor: drawing.color }}
                    />
                    <span className="text-[9px] text-gray-400 font-mono tracking-wider">
                      {drawing.type === 'trendline' && 'TREND'}
                      {drawing.type === 'hline' && 'HLINE'}
                      {drawing.type === 'vline' && 'VLINE'}
                      {drawing.type === 'rect' && 'RECT'}
                      {drawing.type === 'text' && 'TEXT'}
                      {drawing.type === 'fib' && 'FIB'}
                      {drawing.type === 'ray' && 'RAY'}
                      {drawing.type === 'arrow' && 'ARROW'}
                    </span>
                    <span className="text-[8px] text-gray-600 font-mono">
                      {new Date(drawing.timestamp).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => onDrawingRemove(drawing.id)}
                    className="text-[8px] text-gray-600 hover:text-[#ef5350] transition-colors font-mono tracking-wider"
                  >
                    DEL
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="border-t border-[#1e3a5f]/40 pt-3">
          <div className="text-[8px] text-gray-600 leading-relaxed space-y-1 font-mono">
            <div>• 选择工具后在图表上点击绘制</div>
            <div>• 文字工具需要双击图表位置</div>
            <div>• ESC键切换到选择工具</div>
            <div>• 使用 Ctrl+Z/Y 撤销重做</div>
          </div>
        </div>
      </div>
    </div>
  );
}