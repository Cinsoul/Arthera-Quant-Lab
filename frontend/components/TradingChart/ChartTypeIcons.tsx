/**
 * ChartTypeIcons - 专业图表类型图标组件
 * Bloomberg/TradingView级别的视觉设计
 */

interface IconProps {
  className?: string;
  size?: number;
}

// 柱状图图标
export function BarsIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="8" width="4" height="12" rx="1" fill="#EF4444" />
      <rect x="10" y="4" width="4" height="16" rx="1" fill="#10B981" />
      <rect x="16" y="10" width="4" height="10" rx="1" fill="#0EA5E9" />
    </svg>
  );
}

// 实心蜡烛图图标
export function CandlestickIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* 第一根K线 - 红色（涨） */}
      <line x1="6" y1="4" x2="6" y2="8" stroke="#EF4444" strokeWidth="1.5" />
      <rect x="4" y="8" width="4" height="6" rx="0.5" fill="#EF4444" />
      <line x1="6" y1="14" x2="6" y2="18" stroke="#EF4444" strokeWidth="1.5" />
      
      {/* 第二根K线 - 绿色（跌） */}
      <line x1="12" y1="6" x2="12" y2="10" stroke="#10B981" strokeWidth="1.5" />
      <rect x="10" y="10" width="4" height="4" rx="0.5" fill="#10B981" />
      <line x1="12" y1="14" x2="12" y2="20" stroke="#10B981" strokeWidth="1.5" />
      
      {/* 第三根K线 - 红色（涨） */}
      <line x1="18" y1="8" x2="18" y2="12" stroke="#EF4444" strokeWidth="1.5" />
      <rect x="16" y="12" width="4" height="5" rx="0.5" fill="#EF4444" />
      <line x1="18" y1="17" x2="18" y2="20" stroke="#EF4444" strokeWidth="1.5" />
    </svg>
  );
}

// 空心蜡烛图图标
export function HollowCandlesIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* 第一根K线 - 红色（涨）空心 */}
      <line x1="6" y1="4" x2="6" y2="8" stroke="#EF4444" strokeWidth="1.5" />
      <rect x="4" y="8" width="4" height="6" rx="0.5" stroke="#EF4444" strokeWidth="1.5" fill="none" />
      <line x1="6" y1="14" x2="6" y2="18" stroke="#EF4444" strokeWidth="1.5" />
      
      {/* 第二根K线 - 绿色（跌）空心 */}
      <line x1="12" y1="6" x2="12" y2="10" stroke="#10B981" strokeWidth="1.5" />
      <rect x="10" y="10" width="4" height="4" rx="0.5" stroke="#10B981" strokeWidth="1.5" fill="none" />
      <line x1="12" y1="14" x2="12" y2="20" stroke="#10B981" strokeWidth="1.5" />
      
      {/* 第三根K线 - 红色（涨）空心 */}
      <line x1="18" y1="8" x2="18" y2="12" stroke="#EF4444" strokeWidth="1.5" />
      <rect x="16" y="12" width="4" height="5" rx="0.5" stroke="#EF4444" strokeWidth="1.5" fill="none" />
      <line x1="18" y1="17" x2="18" y2="20" stroke="#EF4444" strokeWidth="1.5" />
    </svg>
  );
}

// 折线图图标
export function LineIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path 
        d="M3 17L7 13L11 15L15 9L18 11L21 7" 
        stroke="#EF4444" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 标记线图图标
export function LineMarkersIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path 
        d="M3 17L7 13L11 15L15 9L18 11L21 7" 
        stroke="#EF4444" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <circle cx="3" cy="17" r="2.5" fill="#EF4444" />
      <circle cx="7" cy="13" r="2.5" fill="#EF4444" />
      <circle cx="11" cy="15" r="2.5" fill="#EF4444" />
      <circle cx="15" cy="9" r="2.5" fill="#EF4444" />
      <circle cx="18" cy="11" r="2.5" fill="#EF4444" />
      <circle cx="21" cy="7" r="2.5" fill="#EF4444" />
    </svg>
  );
}

// 阶梯线图图标
export function StepLineIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path 
        d="M3 17H7V13H11V15H15V9H18V11H21V7" 
        stroke="#F59E0B" 
        strokeWidth="2" 
        strokeLinecap="square" 
        strokeLinejoin="miter"
      />
    </svg>
  );
}

// 面积图图标
export function AreaIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path 
        d="M3 17L7 13L11 15L15 9L18 11L21 7V20H3V17Z" 
        fill="url(#areaGradient)" 
      />
      <path 
        d="M3 17L7 13L11 15L15 9L18 11L21 7" 
        stroke="#0EA5E9" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="areaGradient" x1="12" y1="7" x2="12" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5E9" stopOpacity="0.4" />
          <stop offset="1" stopColor="#0EA5E9" stopOpacity="0.05" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 基线图图标
export function BaselineIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* 基线 */}
      <line x1="3" y1="14" x2="21" y2="14" stroke="#64748B" strokeWidth="1" strokeDasharray="3 3" />
      
      {/* 上涨区域（红色） */}
      <path 
        d="M3 14L7 10L11 12L11 14H3Z" 
        fill="rgba(239, 68, 68, 0.3)" 
      />
      
      {/* 下跌区域（绿色） */}
      <path 
        d="M11 14L15 16L18 18L21 16L21 14H11Z" 
        fill="rgba(16, 185, 129, 0.3)" 
      />
      
      {/* 价格线 */}
      <path 
        d="M3 14L7 10L11 12L15 16L18 18L21 16" 
        stroke="#0EA5E9" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}
