interface ProgressDialogProps {
  isOpen: boolean;
  title: string;
  progress: number;
  statusMessage: string;
  estimatedTime?: string;
  onCancel?: () => void;
}

export function ProgressDialog({
  isOpen,
  title,
  progress,
  statusMessage,
  estimatedTime,
  onCancel,
}: ProgressDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"></div>

      {/* Dialog */}
      <div className="relative w-full max-w-lg animate-in zoom-in-95 duration-200">
        <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-[#1e3a5f]/30">
            <div className="flex items-center gap-4">
              {/* Animated Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#0ea5e9] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white mb-1">{title}</h3>
                <p className="text-xs text-gray-500">
                  {estimatedTime && `预计用时 ${estimatedTime}`}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Content */}
          <div className="p-6 space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{statusMessage}</span>
                <span className="text-[#0ea5e9] font-mono tabular-nums">{progress}%</span>
              </div>
              
              <div className="h-2 bg-[#1e3a5f]/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#10b981] rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="space-y-2">
              {[
                { step: 1, label: '收集策略数据', threshold: 0 },
                { step: 2, label: '渲染图表', threshold: 25 },
                { step: 3, label: '编译PDF文档', threshold: 50 },
                { step: 4, label: '压缩优化', threshold: 75 },
                { step: 5, label: '准备下载', threshold: 95 },
              ].map((item) => {
                const isActive = progress >= item.threshold;
                const isComplete = progress > item.threshold + 20;
                
                return (
                  <div key={item.step} className="flex items-center gap-3 text-sm">
                    {/* Step Indicator */}
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isComplete
                        ? 'bg-[#10b981]/20 border-2 border-[#10b981]'
                        : isActive
                        ? 'bg-[#0ea5e9]/20 border-2 border-[#0ea5e9] animate-pulse'
                        : 'bg-[#1e3a5f]/30 border-2 border-[#1e3a5f]'
                    }`}>
                      {isComplete ? (
                        <svg className="w-3.5 h-3.5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className={`text-xs font-medium ${
                          isActive ? 'text-[#0ea5e9]' : 'text-gray-600'
                        }`}>
                          {item.step}
                        </span>
                      )}
                    </div>

                    {/* Step Label */}
                    <span className={`transition-colors ${
                      isComplete
                        ? 'text-[#10b981]'
                        : isActive
                        ? 'text-gray-300'
                        : 'text-gray-600'
                    }`}>
                      {item.label}
                    </span>

                    {/* Loading Spinner for Active Step */}
                    {isActive && !isComplete && (
                      <div className="flex-shrink-0 ml-auto">
                        <div className="w-4 h-4 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          {onCancel && progress < 100 && (
            <div className="p-4 bg-[#0d1b2e]/50 border-t border-[#1e3a5f]/30 flex justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-[#1e3a5f]/30 rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
