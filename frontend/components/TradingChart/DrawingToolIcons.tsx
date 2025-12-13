/**
 * DrawingToolIcons - 专业绘图工具图标组件
 * TradingView级别的工具图标设计
 */

interface IconProps {
  className?: string;
  size?: number;
}

// ========== 选择工具 ==========
export function SelectIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M3 3L15 9L8 11L3 17V3Z" fill="currentColor" />
    </svg>
  );
}

// ========== LINES 线条工具 ==========
export function TrendLineIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="3" y1="16" x2="17" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="3" cy="16" r="2" fill="currentColor" />
      <circle cx="17" cy="4" r="2" fill="currentColor" />
    </svg>
  );
}

export function RayIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="3" y1="16" x2="17" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="3" cy="16" r="2" fill="currentColor" />
      <path d="M15 6L17 4L15 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InfoLineIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="3" y1="16" x2="17" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="3" cy="16" r="2" fill="currentColor" />
      <circle cx="17" cy="4" r="2" fill="currentColor" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function ExtendedLineIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="1" y1="16" x2="19" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
      <line x1="6" y1="14" x2="14" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="6" cy="14" r="2" fill="currentColor" />
      <circle cx="14" cy="6" r="2" fill="currentColor" />
    </svg>
  );
}

export function TrendAngleIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="3" y1="16" x2="17" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 16L10 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
      <path d="M8 14.5L10 16L8 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="3" cy="16" r="2" fill="currentColor" />
      <circle cx="17" cy="4" r="2" fill="currentColor" />
    </svg>
  );
}

export function HorizontalLineIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="5" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

export function HorizontalRayIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="3" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="3" cy="10" r="2" fill="currentColor" />
      <path d="M16 8L18 10L16 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VerticalLineIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="5" r="2" fill="currentColor" />
    </svg>
  );
}

export function CrossLineIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="10" r="2.5" fill="currentColor" />
    </svg>
  );
}

// ========== CHANNELS 通道工具 ==========
export function ParallelChannelIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="2" y1="16" x2="12" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="18" x2="18" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="2" cy="16" r="1.5" fill="currentColor" />
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function RegressionTrendIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="2" y1="15" x2="18" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="12" x2="18" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
      <line x1="2" y1="18" x2="18" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
      <circle cx="5" cy="14" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="15" cy="6" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export function FlatTopBottomIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <rect x="3" y="6" width="14" height="8" stroke="currentColor" strokeWidth="2" fill="none" rx="1" />
      <circle cx="3" cy="6" r="1.5" fill="currentColor" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function DisjointChannelIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="2" y1="16" x2="9" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="11" y1="11" x2="18" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="18" x2="13" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="13" x2="20" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ========== PITCHFORKS 草叉工具 ==========
export function PitchforkIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="10" y1="3" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="3" x2="4" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="3" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="3" r="2" fill="currentColor" />
      <circle cx="4" cy="17" r="1.5" fill="currentColor" />
      <circle cx="16" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function SchiffPitchforkIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="10" y1="5" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="5" x2="3" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="5" r="2" fill="currentColor" />
      <circle cx="3" cy="17" r="1.5" fill="currentColor" />
      <circle cx="17" cy="17" r="1.5" fill="currentColor" />
      <line x1="6.5" y1="3" x2="10" y2="5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
    </svg>
  );
}

export function ModifiedSchiffPitchforkIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="8" y1="5" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="5" x2="2" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="5" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5" r="2" fill="currentColor" />
      <circle cx="2" cy="17" r="1.5" fill="currentColor" />
      <circle cx="16" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function InsidePitchforkIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="10" y1="3" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="3" x2="6" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="3" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="3" r="2" fill="currentColor" />
      <circle cx="6" cy="14" r="1.5" fill="currentColor" />
      <circle cx="14" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

// ========== 其他工具 ==========
export function DotIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="10" cy="10" r="4" fill="currentColor" />
    </svg>
  );
}

export function ArrowIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="3" y1="16" x2="17" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 4H17V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TextIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <text x="10" y="14" fill="currentColor" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="monospace">T</text>
      <line x1="5" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function RectangleIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <rect x="3" y="5" width="14" height="10" stroke="currentColor" strokeWidth="2" fill="none" rx="1" />
    </svg>
  );
}

export function FibonacciIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <line x1="3" y1="3" x2="3" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="5" x2="17" y2="5" stroke="#EF4444" strokeWidth="1" />
      <line x1="3" y1="7.5" x2="17" y2="7.5" stroke="#F59E0B" strokeWidth="1" />
      <line x1="3" y1="10" x2="17" y2="10" stroke="#10B981" strokeWidth="1.5" />
      <line x1="3" y1="12.5" x2="17" y2="12.5" stroke="#3B82F6" strokeWidth="1" />
      <line x1="3" y1="15" x2="17" y2="15" stroke="#8B5CF6" strokeWidth="1" />
      <circle cx="3" cy="3" r="1.5" fill="currentColor" />
      <circle cx="17" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function MagicIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M14 6L6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="6" r="1.5" fill="currentColor" />
      <path d="M14 3V4M14 8V9M12 6H11M16 6H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 15L5 17L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EraserIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <rect x="8" y="6" width="8" height="8" rx="1" transform="rotate(45 12 10)" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="2" y1="16" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
