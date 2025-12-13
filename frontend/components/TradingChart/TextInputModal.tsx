/**
 * TradingView风格的专业文本输入模态框
 * 支持实时预览、样式配置和智能分类
 */

import React, { useState, useEffect, useRef } from 'react';

export interface TextInputData {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth: number;
  borderRadius: number;
  padding: number;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffset: { x: number; y: number };
  multiline: boolean;
  maxWidth: number;
  lineHeight: number;
  category: 'annotation' | 'alert' | 'note' | 'label';
  importance: 'low' | 'normal' | 'high' | 'critical';
  autoResize: boolean;
  rotation: number;
  opacity: number;
}

interface TextInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TextInputData) => void;
  initialData?: Partial<TextInputData>;
  position?: { x: number; y: number };
}

export function TextInputModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  position = { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 300 }
}: TextInputModalProps) {
  const [data, setData] = useState<TextInputData>({
    text: '',
    fontSize: 14,
    fontFamily: 'Inter, -apple-system, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    color: '#0EA5E9',
    borderWidth: 0,
    borderRadius: 0,
    padding: 6,
    shadow: true,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowBlur: 3,
    shadowOffset: { x: 1, y: 1 },
    multiline: false,
    maxWidth: 300,
    lineHeight: 1.4,
    category: 'annotation',
    importance: 'normal',
    autoResize: true,
    rotation: 0,
    opacity: 1,
    ...initialData
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isOpen]);

  // 智能分类检测
  useEffect(() => {
    const text = data.text.toLowerCase();
    let newCategory = data.category;
    let newImportance = data.importance;
    let newColor = data.color;
    let newFontSize = data.fontSize;

    if (text.includes('!') || text.includes('alert') || text.includes('警告') || text.includes('urgent')) {
      newCategory = 'alert';
      newImportance = 'high';
      newColor = '#EF4444';
      newFontSize = 16;
    } else if (text.includes('note') || text.includes('注意') || text.includes('memo')) {
      newCategory = 'note';
      newColor = '#10B981';
    } else if (data.text.length < 5 && !data.text.includes(' ')) {
      newCategory = 'label';
      newFontSize = 12;
    } else if (text.includes('critical') || text.includes('emergency') || text.includes('紧急')) {
      newCategory = 'alert';
      newImportance = 'critical';
      newColor = '#DC2626';
      newFontSize = 18;
    }

    setData(prev => ({
      ...prev,
      category: newCategory,
      importance: newImportance,
      color: newColor,
      fontSize: newFontSize,
      backgroundColor: newCategory === 'alert' ? 'rgba(239, 68, 68, 0.1)' : prev.backgroundColor,
      borderColor: newCategory === 'alert' ? '#EF4444' : prev.borderColor,
      borderWidth: newCategory === 'alert' ? 1 : prev.borderWidth,
      borderRadius: newCategory === 'alert' ? 4 : prev.borderRadius,
    }));
  }, [data.text]);

  const handleSubmit = () => {
    if (data.text.trim()) {
      onSubmit(data);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !data.multiline) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const presetStyles = [
    { name: '标准', color: '#0EA5E9', fontSize: 14, fontWeight: 'normal' },
    { name: '标题', color: '#1E293B', fontSize: 18, fontWeight: 'bold' },
    { name: '警告', color: '#EF4444', fontSize: 16, fontWeight: '600' },
    { name: '注释', color: '#10B981', fontSize: 12, fontWeight: 'normal' },
    { name: '重要', color: '#F59E0B', fontSize: 16, fontWeight: 'bold' },
  ];

  const fontFamilies = [
    'Inter, -apple-system, sans-serif',
    'Monaco, Menlo, monospace',
    'Georgia, serif',
    'Arial, sans-serif',
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/20 z-[9998]"
        onClick={onClose}
      />

      {/* 主模态框 */}
      <div 
        className="fixed bg-[#0d1b2e] border border-[#1e3a5f] rounded-lg shadow-2xl z-[9999] w-[500px]"
        style={{ 
          left: position.x, 
          top: position.y,
          maxHeight: 'calc(100vh - 100px)'
        }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-[#1e3a5f]/40">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-[#0ea5e9] rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">T</span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">文本标注</h3>
              <p className="text-xs text-gray-400">TradingView专业级文本工具</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[500px]">
          {/* 左侧输入区域 */}
          <div className="flex-1 p-4 space-y-4">
            {/* 文本输入 */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 tracking-wider font-mono">文本内容</label>
              <textarea
                ref={textareaRef}
                value={data.text}
                onChange={(e) => setData(prev => ({ ...prev, text: e.target.value }))}
                onKeyDown={handleKeyDown}
                placeholder="输入文本内容..."
                rows={data.multiline ? 4 : 2}
                className="w-full bg-[#0a1628] border border-[#1e3a5f] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0ea5e9] resize-none"
              />
            </div>

            {/* 快速样式预设 */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 tracking-wider font-mono">快速样式</label>
              <div className="grid grid-cols-5 gap-1">
                {presetStyles.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => setData(prev => ({
                      ...prev,
                      color: preset.color,
                      fontSize: preset.fontSize,
                      fontWeight: preset.fontWeight
                    }))}
                    className="h-8 px-2 rounded border border-[#1e3a5f] text-xs font-mono transition-colors hover:border-[#0ea5e9] hover:text-[#0ea5e9]"
                    style={{ color: preset.color }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 字体设置 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1 font-mono">字号</label>
                <input
                  type="range"
                  min="10"
                  max="32"
                  value={data.fontSize}
                  onChange={(e) => setData(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs text-[#0ea5e9] font-mono">{data.fontSize}px</span>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 font-mono">粗细</label>
                <select
                  value={data.fontWeight}
                  onChange={(e) => setData(prev => ({ ...prev, fontWeight: e.target.value }))}
                  className="w-full bg-[#0a1628] border border-[#1e3a5f] rounded px-2 py-1 text-white text-xs"
                >
                  <option value="normal">常规</option>
                  <option value="600">中等</option>
                  <option value="bold">粗体</option>
                </select>
              </div>
            </div>

            {/* 颜色和对齐 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1 font-mono">颜色</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={data.color}
                    onChange={(e) => setData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-8 h-8 rounded border border-[#1e3a5f] bg-transparent"
                  />
                  <input
                    type="text"
                    value={data.color}
                    onChange={(e) => setData(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1 bg-[#0a1628] border border-[#1e3a5f] rounded px-2 py-1 text-white text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 font-mono">对齐</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { value: 'left', label: '左' },
                    { value: 'center', label: '中' },
                    { value: 'right', label: '右' }
                  ].map(align => (
                    <button
                      key={align.value}
                      onClick={() => setData(prev => ({ ...prev, textAlign: align.value as any }))}
                      className={`h-7 text-xs rounded border transition-colors ${
                        data.textAlign === align.value
                          ? 'border-[#0ea5e9] bg-[#0ea5e9]/10 text-[#0ea5e9]'
                          : 'border-[#1e3a5f] text-gray-400 hover:text-white'
                      }`}
                    >
                      {align.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 高级选项 */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={data.multiline}
                    onChange={(e) => setData(prev => ({ ...prev, multiline: e.target.checked }))}
                    className="rounded"
                  />
                  多行文本
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={data.shadow}
                    onChange={(e) => setData(prev => ({ ...prev, shadow: e.target.checked }))}
                    className="rounded"
                  />
                  阴影效果
                </label>
              </div>

              {data.shadow && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">模糊</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={data.shadowBlur}
                      onChange={(e) => setData(prev => ({ ...prev, shadowBlur: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">X偏移</label>
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      value={data.shadowOffset.x}
                      onChange={(e) => setData(prev => ({ 
                        ...prev, 
                        shadowOffset: { ...prev.shadowOffset, x: Number(e.target.value) }
                      }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-mono">Y偏移</label>
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      value={data.shadowOffset.y}
                      onChange={(e) => setData(prev => ({ 
                        ...prev, 
                        shadowOffset: { ...prev.shadowOffset, y: Number(e.target.value) }
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSubmit}
                disabled={!data.text.trim()}
                className="flex-1 bg-[#0ea5e9] text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0ea5e9]/90 transition-colors"
              >
                确认添加
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-[#1e3a5f] text-gray-400 rounded text-sm font-medium hover:text-white hover:border-[#1e3a5f]/60 transition-colors"
              >
                取消
              </button>
            </div>
          </div>

          {/* 右侧预览区域 */}
          <div className="w-48 border-l border-[#1e3a5f]/40 p-4">
            <div className="text-xs text-gray-400 mb-3 tracking-wider font-mono">实时预览</div>
            <div className="bg-[#0a1628] border border-[#1e3a5f] rounded p-4 h-32 relative flex items-center justify-center">
              {data.text ? (
                <div
                  ref={previewRef}
                  className="absolute"
                  style={{
                    fontSize: `${data.fontSize}px`,
                    fontFamily: data.fontFamily,
                    fontWeight: data.fontWeight,
                    fontStyle: data.fontStyle,
                    color: data.color,
                    textAlign: data.textAlign,
                    whiteSpace: data.multiline ? 'pre-wrap' : 'nowrap',
                    lineHeight: data.lineHeight,
                    opacity: data.opacity,
                    transform: `rotate(${data.rotation}deg)`,
                    textShadow: data.shadow ? `${data.shadowOffset.x}px ${data.shadowOffset.y}px ${data.shadowBlur}px ${data.shadowColor}` : 'none',
                    backgroundColor: data.backgroundColor,
                    border: data.borderWidth > 0 ? `${data.borderWidth}px solid ${data.borderColor}` : 'none',
                    borderRadius: `${data.borderRadius}px`,
                    padding: `${data.padding}px`,
                  }}
                >
                  {data.text}
                </div>
              ) : (
                <span className="text-gray-600 text-xs italic">预览区域</span>
              )}
            </div>

            {/* 分类信息 */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">分类:</span>
                <span 
                  className={`text-xs px-2 py-1 rounded font-mono ${
                    data.category === 'alert' ? 'bg-red-500/20 text-red-400' :
                    data.category === 'note' ? 'bg-green-500/20 text-green-400' :
                    data.category === 'label' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {data.category.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">重要性:</span>
                <span 
                  className={`text-xs px-2 py-1 rounded font-mono ${
                    data.importance === 'critical' ? 'bg-red-600/20 text-red-400' :
                    data.importance === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    data.importance === 'normal' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {data.importance.toUpperCase()}
                </span>
              </div>
            </div>

            {/* 快捷键提示 */}
            <div className="mt-4 text-xs text-gray-600 space-y-1">
              <div>• Enter: 确认</div>
              <div>• Shift+Enter: 换行</div>
              <div>• Esc: 取消</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}