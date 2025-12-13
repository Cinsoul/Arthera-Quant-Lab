import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  term: string;
  definition: string;
  formula?: string;
}

export function InfoTooltip({ term, definition, formula }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="ml-1 text-gray-600 hover:text-[#0ea5e9] transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-[#0d1b2e] border border-[#0ea5e9]/50 rounded-lg shadow-xl p-3 z-50">
          <div className="text-xs text-[#0ea5e9] mb-1">{term}</div>
          <div className="text-xs text-gray-300 leading-relaxed mb-2">{definition}</div>
          {formula && (
            <div className="text-xs text-gray-400 font-mono bg-[#0a1628] px-2 py-1 rounded">
              {formula}
            </div>
          )}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-[#0d1b2e] border-b border-r border-[#0ea5e9]/50 transform rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
}
