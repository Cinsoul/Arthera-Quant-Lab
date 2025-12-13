/**
 * CommandPipeline - Bloomberg级函数链式调用系统
 * 
 * 功能：
 * - 管道符 | 支持
 * - 多步骤命令执行
 * - 结果传递机制
 * - 错误处理与回滚
 * - 执行进度可视化
 */

import { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, Loader2, AlertCircle, ArrowRight, RotateCcw, X } from 'lucide-react';

export interface PipelineStep {
  id: string;
  command: string;
  params: Record<string, any>;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  error?: string;
  duration?: number;
}

export interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
  status: 'idle' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
}

interface CommandPipelineProps {
  pipelineText: string;
  onExecute?: (pipeline: Pipeline) => void;
  onClose?: () => void;
  autoExecute?: boolean;
}

/**
 * Parse pipeline text into steps
 * Example: "GP 600519 | MA periods=5,10,20 | EXPORT excel"
 */
export function parsePipeline(text: string): PipelineStep[] {
  const commands = text.split('|').map(s => s.trim()).filter(Boolean);
  
  return commands.map((cmd, index) => {
    const parts = cmd.split(/\s+/);
    const command = parts[0].toUpperCase();
    const params: Record<string, any> = {};

    // Parse parameters
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      
      if (part.includes('=')) {
        const [key, ...valueParts] = part.split('=');
        let value = valueParts.join('=');

        // Try parse as JSON
        if (value.startsWith('{') || value.startsWith('[')) {
          try {
            params[key] = JSON.parse(value);
            continue;
          } catch {
            // Fall through
          }
        }

        // Parse as array
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

        params[key] = value;
      } else {
        params[`_${i - 1}`] = part;
      }
    }

    return {
      id: `step-${index}`,
      command,
      params,
      status: 'pending' as const
    };
  });
}

/**
 * Execute a single pipeline step
 */
async function executeStep(
  step: PipelineStep,
  previousResult?: any
): Promise<{ success: boolean; result?: any; error?: string }> {
  // Simulate execution delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

  // Mock execution logic
  try {
    // Inject previous result as context
    const context = previousResult || {};
    
    switch (step.command) {
      case 'GP':
      case 'DES':
      case 'HP':
        return {
          success: true,
          result: {
            symbol: step.params.symbol || step.params._0,
            data: { price: 1850.50, change: 2.35, volume: 125000 },
            ...context
          }
        };

      case 'MA':
      case 'RSI':
      case 'MACD':
        return {
          success: true,
          result: {
            ...context,
            indicators: {
              ma: [1820, 1835, 1850],
              rsi: 62.5,
              macd: { value: 15.2, signal: 12.8 }
            }
          }
        };

      case 'COMP':
        const symbols = step.params.symbols || step.params._0?.split(',') || [];
        return {
          success: true,
          result: {
            symbols,
            comparison: symbols.map((s: string) => ({
              symbol: s,
              return: Math.random() * 20 - 10
            })),
            ...context
          }
        };

      case 'BT':
      case 'BTRUN':
        return {
          success: true,
          result: {
            ...context,
            backtest: {
              id: 'bt-' + Date.now(),
              return: 45.2,
              sharpe: 1.85,
              maxDrawdown: -12.5
            }
          }
        };

      case 'PORT':
        return {
          success: true,
          result: {
            ...context,
            portfolio: {
              totalValue: 5000000,
              positions: 15,
              dailyPnL: 25000
            }
          }
        };

      case 'VAR':
        const confidence = step.params.confidence || 95;
        return {
          success: true,
          result: {
            ...context,
            risk: {
              var: -125000,
              confidence,
              horizon: step.params.horizon || 1
            }
          }
        };

      case 'EXPORT':
        const format = step.params.format || step.params._0 || 'excel';
        return {
          success: true,
          result: {
            ...context,
            exported: true,
            format,
            filename: `export_${Date.now()}.${format}`
          }
        };

      case 'EQS':
        return {
          success: true,
          result: {
            stocks: ['600519', '000858', '300750', '600036', '000001'],
            filters: step.params.filters,
            ...context
          }
        };

      default:
        return {
          success: true,
          result: {
            ...context,
            executed: step.command,
            params: step.params
          }
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed'
    };
  }
}

export function CommandPipeline({
  pipelineText,
  onExecute,
  onClose,
  autoExecute = false
}: CommandPipelineProps) {
  const [pipeline, setPipeline] = useState<Pipeline>(() => ({
    id: 'pipeline-' + Date.now(),
    name: pipelineText,
    steps: parsePipeline(pipelineText),
    status: 'idle'
  }));

  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // Auto execute if enabled
  useEffect(() => {
    if (autoExecute && pipeline.status === 'idle') {
      handleExecute();
    }
  }, [autoExecute]);

  const handleExecute = async () => {
    setPipeline(prev => ({
      ...prev,
      status: 'running',
      startTime: Date.now()
    }));

    let previousResult: any = undefined;

    for (let i = 0; i < pipeline.steps.length; i++) {
      setCurrentStepIndex(i);
      const step = pipeline.steps[i];

      // Update step status to running
      setPipeline(prev => ({
        ...prev,
        steps: prev.steps.map((s, idx) =>
          idx === i ? { ...s, status: 'running' } : s
        )
      }));

      const startTime = Date.now();
      const result = await executeStep(step, previousResult);
      const duration = Date.now() - startTime;

      if (result.success) {
        // Update step to success
        setPipeline(prev => ({
          ...prev,
          steps: prev.steps.map((s, idx) =>
            idx === i
              ? { ...s, status: 'success', result: result.result, duration }
              : s
          )
        }));
        previousResult = result.result;
      } else {
        // Update step to error and stop pipeline
        setPipeline(prev => ({
          ...prev,
          status: 'failed',
          endTime: Date.now(),
          steps: prev.steps.map((s, idx) =>
            idx === i
              ? { ...s, status: 'error', error: result.error, duration }
              : s
          )
        }));
        setCurrentStepIndex(-1);
        return;
      }
    }

    // All steps completed successfully
    setPipeline(prev => ({
      ...prev,
      status: 'completed',
      endTime: Date.now()
    }));
    setCurrentStepIndex(-1);

    onExecute?.(pipeline);
  };

  const handleRetry = () => {
    setPipeline(prev => ({
      ...prev,
      status: 'idle',
      steps: prev.steps.map(s => ({ ...s, status: 'pending', error: undefined }))
    }));
    setCurrentStepIndex(-1);
  };

  const getStepIcon = (step: PipelineStep) => {
    switch (step.status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const totalDuration = pipeline.endTime && pipeline.startTime
    ? pipeline.endTime - pipeline.startTime
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center">
      <div className="bg-[#0A1929] border border-[#1E3A5F] rounded-lg shadow-2xl w-[700px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#1E3A5F] bg-[#0D1F2D] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Play className="w-5 h-5 text-[#00D9FF]" />
                <h3 className="text-lg text-gray-200">Pipeline Execution</h3>
              </div>
              <div className="text-xs text-gray-500 mt-1 font-mono">
                {pipelineText}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
          {pipeline.steps.map((step, index) => (
            <div key={step.id}>
              <div
                className={`border rounded-lg p-4 transition-all ${
                  step.status === 'running'
                    ? 'border-blue-400 bg-blue-400/5'
                    : step.status === 'success'
                    ? 'border-green-400/30 bg-green-400/5'
                    : step.status === 'error'
                    ? 'border-red-400/30 bg-red-400/5'
                    : 'border-[#1E3A5F]'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Step Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepIcon(step)}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">Step {index + 1}</span>
                        <div className="px-2 py-1 bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 rounded">
                          <span className="text-xs text-[#0ea5e9] font-mono font-bold">
                            {step.command}
                          </span>
                        </div>
                      </div>
                      {step.duration && (
                        <span className="text-xs text-gray-500">
                          {step.duration}ms
                        </span>
                      )}
                    </div>

                    {/* Parameters */}
                    {Object.keys(step.params).length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-500 mb-1">Parameters:</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(step.params)
                            .filter(([key]) => !key.startsWith('_'))
                            .map(([key, value]) => (
                              <div
                                key={key}
                                className="px-2 py-1 bg-[#1E3A5F]/30 rounded text-xs"
                              >
                                <span className="text-gray-500">{key}=</span>
                                <span className="text-gray-300 font-mono">
                                  {typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Result Preview */}
                    {step.status === 'success' && step.result && (
                      <div className="mt-3 p-3 bg-green-400/5 border border-green-400/20 rounded">
                        <div className="text-xs text-green-400 mb-1">Result:</div>
                        <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
                          {JSON.stringify(step.result, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Error Message */}
                    {step.status === 'error' && step.error && (
                      <div className="mt-3 p-3 bg-red-400/5 border border-red-400/20 rounded">
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Error</span>
                        </div>
                        <div className="text-xs text-red-300 mt-1">
                          {step.error}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Arrow between steps */}
              {index < pipeline.steps.length - 1 && (
                <div className="flex justify-center py-2">
                  <ArrowRight className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1E3A5F] bg-[#0A1520] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Status Badge */}
              <div
                className={`px-3 py-1.5 rounded text-xs font-medium ${
                  pipeline.status === 'idle'
                    ? 'bg-gray-600/20 text-gray-400'
                    : pipeline.status === 'running'
                    ? 'bg-blue-400/20 text-blue-400'
                    : pipeline.status === 'completed'
                    ? 'bg-green-400/20 text-green-400'
                    : 'bg-red-400/20 text-red-400'
                }`}
              >
                {pipeline.status === 'idle' && 'Ready'}
                {pipeline.status === 'running' && (
                  <>
                    <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                    Running...
                  </>
                )}
                {pipeline.status === 'completed' && (
                  <>
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    Completed
                  </>
                )}
                {pipeline.status === 'failed' && (
                  <>
                    <XCircle className="w-3 h-3 inline mr-1" />
                    Failed
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="text-xs text-gray-500">
                {pipeline.steps.length} steps
                {totalDuration > 0 && (
                  <span className="ml-2">• {totalDuration}ms total</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {pipeline.status === 'idle' && (
                <button
                  onClick={handleExecute}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Execute Pipeline
                </button>
              )}

              {(pipeline.status === 'completed' || pipeline.status === 'failed') && (
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </button>
              )}

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
    </div>
  );
}

/**
 * Pipeline Templates - 常用工作流
 */
export const PIPELINE_TEMPLATES = [
  {
    id: 'stock-analysis',
    name: '股票技术分析',
    description: '查看股票行情并计算技术指标',
    template: 'GP {symbol} | MA periods=5,10,20 | RSI period=14',
    category: 'Analysis'
  },
  {
    id: 'backtest-export',
    name: '回测并导出',
    description: '运行回测并导出Excel报告',
    template: 'BT {strategy} | EXPORT excel',
    category: 'Backtest'
  },
  {
    id: 'portfolio-risk',
    name: '组合风险分析',
    description: '分析组合并计算VaR',
    template: 'PORT | VAR confidence=95 | EXPORT pdf',
    category: 'Risk'
  },
  {
    id: 'stock-screening',
    name: '选股并对比',
    description: '筛选股票并进行对比分析',
    template: 'EQS filters={"pe":[0,20]} | COMP | EXPORT excel',
    category: 'Screening'
  },
  {
    id: 'multi-indicator',
    name: '多指标分析',
    description: '计算多个技术指标',
    template: 'GP {symbol} | MA periods=5,10,20 | RSI period=14 | MACD',
    category: 'Technical'
  }
];
