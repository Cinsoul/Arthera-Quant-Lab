/**
 * ParameterHelper - Bloomberg级参数自动补全和提示系统
 * 
 * 功能：
 * - 实时参数提示
 * - 智能参数补全
 * - 参数验证和错误提示
 * - 参数模板快捷输入
 * - 参数历史记录
 */

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, AlertCircle, Check, Clock, Sparkles, Info, X } from 'lucide-react';

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'enum';
  required: boolean;
  description: string;
  default?: any;
  enumValues?: string[];
  pattern?: string;
  min?: number;
  max?: number;
  example?: string;
}

export interface FunctionSignature {
  code: string;
  name: string;
  description: string;
  parameters: ParameterDefinition[];
  examples: string[];
  category: string;
}

interface ParameterHelperProps {
  functionSignature: FunctionSignature | null;
  currentInput: string;
  position: { x: number; y: number };
  onSelectSuggestion: (suggestion: string) => void;
  onClose: () => void;
}

interface ParsedParameter {
  name?: string;
  value: string;
  isComplete: boolean;
  error?: string;
}

export function ParameterHelper({
  functionSignature,
  currentInput,
  position,
  onSelectSuggestion,
  onClose
}: ParameterHelperProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [parameterHistory, setParameterHistory] = useState<Record<string, string[]>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Load parameter history
  useEffect(() => {
    const saved = localStorage.getItem('arthera-parameter-history');
    if (saved) {
      setParameterHistory(JSON.parse(saved));
    }
  }, []);

  if (!functionSignature) return null;

  // Parse current input to extract function and parameters
  const parseInput = (): { func: string; params: string[] } => {
    const parts = currentInput.trim().split(/\s+/);
    const func = parts[0].toUpperCase();
    const params = parts.slice(1);
    return { func, params };
  };

  const { func, params } = parseInput();

  // Validate each parameter
  const validateParameter = (
    param: string,
    definition: ParameterDefinition
  ): { valid: boolean; error?: string; parsed?: any } => {
    // Empty parameter
    if (!param || param.trim() === '') {
      if (definition.required) {
        return { valid: false, error: 'Required parameter' };
      }
      return { valid: true, parsed: definition.default };
    }

    // Type validation
    switch (definition.type) {
      case 'number':
        const num = parseFloat(param);
        if (isNaN(num)) {
          return { valid: false, error: 'Must be a number' };
        }
        if (definition.min !== undefined && num < definition.min) {
          return { valid: false, error: `Must be >= ${definition.min}` };
        }
        if (definition.max !== undefined && num > definition.max) {
          return { valid: false, error: `Must be <= ${definition.max}` };
        }
        return { valid: true, parsed: num };

      case 'boolean':
        const boolValue = param.toLowerCase();
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(boolValue)) {
          return { valid: false, error: 'Must be true/false' };
        }
        return { valid: true, parsed: ['true', '1', 'yes'].includes(boolValue) };

      case 'date':
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(param)) {
          return { valid: false, error: 'Format: YYYY-MM-DD' };
        }
        return { valid: true, parsed: param };

      case 'array':
        try {
          // Support comma-separated values
          const arr = param.includes(',') 
            ? param.split(',').map(s => s.trim())
            : JSON.parse(param);
          if (!Array.isArray(arr)) {
            return { valid: false, error: 'Must be an array' };
          }
          return { valid: true, parsed: arr };
        } catch {
          return { valid: false, error: 'Invalid array format' };
        }

      case 'object':
        try {
          const obj = JSON.parse(param);
          if (typeof obj !== 'object') {
            return { valid: false, error: 'Must be an object' };
          }
          return { valid: true, parsed: obj };
        } catch {
          return { valid: false, error: 'Invalid JSON format' };
        }

      case 'enum':
        if (definition.enumValues && !definition.enumValues.includes(param)) {
          return { 
            valid: false, 
            error: `Must be one of: ${definition.enumValues.join(', ')}` 
          };
        }
        return { valid: true, parsed: param };

      case 'string':
        if (definition.pattern) {
          const regex = new RegExp(definition.pattern);
          if (!regex.test(param)) {
            return { valid: false, error: 'Invalid format' };
          }
        }
        return { valid: true, parsed: param };

      default:
        return { valid: true, parsed: param };
    }
  };

  // Get suggestions for current parameter
  const getSuggestions = (): string[] => {
    const currentParamIndex = params.length - 1;
    if (currentParamIndex < 0 || currentParamIndex >= functionSignature.parameters.length) {
      return [];
    }

    const definition = functionSignature.parameters[currentParamIndex];
    const currentValue = params[currentParamIndex] || '';
    const suggestions: string[] = [];

    // Enum suggestions
    if (definition.type === 'enum' && definition.enumValues) {
      suggestions.push(...definition.enumValues.filter(v => 
        v.toLowerCase().includes(currentValue.toLowerCase())
      ));
    }

    // Historical values
    const historyKey = `${func}_${definition.name}`;
    if (parameterHistory[historyKey]) {
      const historicalValues = parameterHistory[historyKey]
        .filter(v => v.toLowerCase().includes(currentValue.toLowerCase()))
        .slice(0, 5);
      suggestions.push(...historicalValues);
    }

    // Example value
    if (definition.example && !currentValue) {
      suggestions.push(definition.example);
    }

    // Default value
    if (definition.default !== undefined && !currentValue) {
      suggestions.push(String(definition.default));
    }

    return [...new Set(suggestions)]; // Remove duplicates
  };

  // Get current parameter status
  const getParameterStatus = () => {
    return functionSignature.parameters.map((def, index) => {
      const param = params[index];
      const validation = validateParameter(param || '', def);
      
      return {
        definition: def,
        value: param,
        validation,
        isCurrent: index === params.length - 1,
        isProvided: param !== undefined && param !== ''
      };
    });
  };

  const parameterStatus = getParameterStatus();
  const suggestions = getSuggestions();
  const currentParam = functionSignature.parameters[params.length - 1];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Tab' && suggestions.length > 0) {
        e.preventDefault();
        onSelectSuggestion(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex]);

  return (
    <div
      ref={containerRef}
      className="fixed bg-[#0A1929] border border-[#1E3A5F] rounded shadow-2xl z-[60] w-[520px]"
      style={{
        left: Math.min(position.x, window.innerWidth - 540),
        top: Math.min(position.y + 45, window.innerHeight - 400)
      }}
    >
      {/* Function Header */}
      <div className="border-b border-[#1E3A5F] bg-[#0D1F2D] px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[#00D9FF] font-mono">{functionSignature.code}</div>
            <ChevronRight className="w-3 h-3 text-gray-500" />
            <div className="text-gray-400 text-sm">{functionSignature.name}</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {functionSignature.description}
        </div>
      </div>

      {/* Parameters Status */}
      <div className="max-h-[180px] overflow-y-auto border-b border-[#1E3A5F]">
        {parameterStatus.map((status, index) => (
          <div
            key={index}
            className={`px-4 py-2.5 border-b border-[#1A2F3F] last:border-b-0 ${
              status.isCurrent ? 'bg-[#0D1F2D]' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-sm ${
                    status.isCurrent ? 'text-[#00D9FF]' : 'text-gray-400'
                  }`}>
                    {status.definition.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {status.definition.type}
                  </span>
                  {status.definition.required && (
                    <span className="text-xs text-orange-400">required</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  {status.definition.description}
                </div>
                {status.value && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-600">Current:</span>
                    <span className="text-xs font-mono text-[#4ADE80]">
                      {status.value}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0">
                {!status.isProvided && !status.definition.required && (
                  <div className="text-xs text-gray-600">optional</div>
                )}
                {status.isProvided && status.validation.valid && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
                {status.isProvided && !status.validation.valid && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>

            {/* Validation Error */}
            {status.isProvided && !status.validation.valid && status.validation.error && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span>{status.validation.error}</span>
              </div>
            )}

            {/* Parameter Hints */}
            {status.isCurrent && (
              <div className="mt-2 space-y-1">
                {status.definition.example && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span className="text-gray-500">Example:</span>
                    <span className="font-mono text-blue-300">
                      {status.definition.example}
                    </span>
                  </div>
                )}
                {status.definition.default !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Info className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-500">Default:</span>
                    <span className="font-mono text-gray-400">
                      {String(status.definition.default)}
                    </span>
                  </div>
                )}
                {status.definition.enumValues && (
                  <div className="flex items-start gap-1.5 text-xs">
                    <Info className="w-3 h-3 text-gray-500 mt-0.5" />
                    <div>
                      <span className="text-gray-500">Options: </span>
                      <span className="font-mono text-gray-400">
                        {status.definition.enumValues.join(', ')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {currentParam && suggestions.length > 0 && (
        <div className="border-b border-[#1E3A5F]">
          <div className="px-4 py-2 bg-[#0D1F2D] border-b border-[#1A2F3F]">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Sparkles className="w-3 h-3" />
              <span>Suggestions (Tab to apply)</span>
            </div>
          </div>
          <div className="max-h-[120px] overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSelectSuggestion(suggestion)}
                className={`w-full px-4 py-2 text-left text-sm font-mono transition-colors ${
                  index === selectedIndex
                    ? 'bg-[#1E3A5F] text-[#00D9FF]'
                    : 'text-gray-300 hover:bg-[#0D1F2D]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{suggestion}</span>
                  {parameterHistory[`${func}_${currentParam.name}`]?.includes(suggestion) && (
                    <Clock className="w-3 h-3 text-gray-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      {functionSignature.examples.length > 0 && (
        <div className="px-4 py-3 bg-[#0A1520]">
          <div className="text-xs text-gray-500 mb-2">Examples:</div>
          {functionSignature.examples.map((example, index) => (
            <button
              key={index}
              onClick={() => {
                // Extract parameters from example
                const exampleParams = example.split(/\s+/).slice(1).join(' ');
                onSelectSuggestion(exampleParams);
              }}
              className="w-full text-left font-mono text-xs text-gray-400 hover:text-[#00D9FF] py-1 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {/* Keyboard Hints */}
      <div className="px-4 py-2 bg-[#0A1520] border-t border-[#1A2F3F]">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-[#1E3A5F] rounded">Tab</kbd> Apply</span>
            <span><kbd className="px-1.5 py-0.5 bg-[#1E3A5F] rounded">↑↓</kbd> Navigate</span>
          </div>
          <span><kbd className="px-1.5 py-0.5 bg-[#1E3A5F] rounded">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Parameter Parser - 解析复杂参数格式
 */
export class ParameterParser {
  /**
   * 解析命令行参数
   * 支持：
   * - 简单参数: GP 600519
   * - 命名参数: GP stock=600519 period=1D
   * - JSON对象: STRAT config={"ma":20,"rsi":14}
   * - 数组: COMP symbols=600519,000858,300750
   */
  static parse(input: string): { command: string; params: Record<string, any> } {
    const parts = input.trim().split(/\s+/);
    const command = parts[0].toUpperCase();
    const params: Record<string, any> = {};

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];

      // Named parameter (key=value)
      if (part.includes('=')) {
        const [key, ...valueParts] = part.split('=');
        let value = valueParts.join('=');

        // Try parse as JSON
        if (value.startsWith('{') || value.startsWith('[')) {
          try {
            params[key] = JSON.parse(value);
            continue;
          } catch {
            // Fall through to string parsing
          }
        }

        // Parse as array (comma-separated)
        if (value.includes(',')) {
          params[key] = value.split(',').map(v => v.trim());
          continue;
        }

        // Parse as number
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          params[key] = numValue;
          continue;
        }

        // Parse as boolean
        if (['true', 'false'].includes(value.toLowerCase())) {
          params[key] = value.toLowerCase() === 'true';
          continue;
        }

        // Default to string
        params[key] = value;
      } else {
        // Positional parameter
        params[`_${i - 1}`] = part;
      }
    }

    return { command, params };
  }

  /**
   * 验证参数是否符合函数签名
   */
  static validate(
    params: Record<string, any>,
    signature: FunctionSignature
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required parameters
    signature.parameters.forEach((def, index) => {
      const value = params[def.name] || params[`_${index}`];
      
      if (def.required && (value === undefined || value === '')) {
        errors.push(`Missing required parameter: ${def.name}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 格式化参数为显示字符串
   */
  static format(params: Record<string, any>): string {
    return Object.entries(params)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}=${JSON.stringify(value)}`;
        }
        return `${key}=${value}`;
      })
      .join(' ');
  }
}
