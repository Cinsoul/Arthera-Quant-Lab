import React from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "../ui/utils";
import { format } from "date-fns";
import image from "figma:asset/84eefa24d31f6f5a841163e3f019c40705d0bb14.png"; // Keeping reference, though not displaying directly

interface StrategyControlBarProps {
  currentMode?: string;
  onModeChange?: (value: string) => void;
  dateRange?: { from: Date; to: Date };
  onDateRangeChange?: (range: { from: Date; to: Date }) => void;
  currentStrategy?: string;
  onStrategyChange?: (value: string) => void;
  benchmark?: string;
  onBenchmarkChange?: (value: string) => void;
  timeFrame?: 'YTD' | '1Y' | '3Y' | 'Custom';
  onTimeFrameChange?: (value: 'YTD' | '1Y' | '3Y' | 'Custom') => void;
}

export function StrategyControlBar({
  currentMode = "backtest",
  onModeChange,
  dateRange,
  onDateRangeChange,
  currentStrategy = "high_vol_alpha",
  onStrategyChange,
  benchmark = "csi300",
  onBenchmarkChange,
  timeFrame = "1Y",
  onTimeFrameChange
}: StrategyControlBarProps) {
  
  // Custom separator component
  const Separator = () => (
    <div className="h-4 w-px bg-[#2A3F5F] mx-4" />
  );

  return (
    <div className="w-full h-12 bg-[#0d1b2e] border-b border-[#1a2942] flex items-center px-4 text-sm select-none">
      
      {/* 1. 当前模式 */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">当前模式</span>
        <Select value={currentMode} onValueChange={onModeChange}>
          <SelectTrigger className="w-[110px] h-8 border-none bg-transparent text-gray-200 hover:bg-[#1a2942] focus:ring-0 p-2 gap-1 text-xs font-medium">
            <SelectValue placeholder="选择模式" />
          </SelectTrigger>
          <SelectContent className="bg-[#0d1b2e] border-[#2A3F5F] text-gray-200">
            <SelectItem value="backtest">策略回测分析</SelectItem>
            <SelectItem value="paper_trading">模拟盘交易</SelectItem>
            <SelectItem value="live">实盘监控</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* 2. 时间区间 (Date Range Picker Trigger) */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">时间区间</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-8 justify-start text-left font-normal bg-transparent text-gray-200 hover:bg-[#1a2942] hover:text-white px-2 text-xs",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3 text-gray-400" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "yyyy-MM-dd")} ~ {format(dateRange.to, "yyyy-MM-dd")}
                  </>
                ) : (
                  format(dateRange.from, "yyyy-MM-dd")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-[#0d1b2e] border-[#2A3F5F]" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range: any) => onDateRangeChange?.(range)}
              numberOfMonths={2}
              className="text-gray-200"
            />
          </PopoverContent>
        </Popover>
      </div>

      <Separator />

      {/* 3. 默认策略 */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">默认策略</span>
        <Select value={currentStrategy} onValueChange={onStrategyChange}>
          <SelectTrigger className="w-[160px] h-8 border-none bg-transparent text-gray-200 hover:bg-[#1a2942] focus:ring-0 p-2 gap-1 text-xs font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0d1b2e] border-[#2A3F5F] text-gray-200">
            <SelectItem value="high_vol_alpha">High Vol Alpha - Q4</SelectItem>
            <SelectItem value="low_vol_defensive">Low Vol Defensive</SelectItem>
            <SelectItem value="tech_momentum">Tech Momentum</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* 4. 基准 (Benchmark) */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">基准</span>
        <Select value={benchmark} onValueChange={onBenchmarkChange}>
          <SelectTrigger className="w-[150px] h-8 border-none bg-transparent text-gray-200 hover:bg-[#1a2942] focus:ring-0 p-2 gap-1 text-xs font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0d1b2e] border-[#2A3F5F] text-gray-200">
            <SelectItem value="csi300">沪深300 / CSI300</SelectItem>
            <SelectItem value="zz500">中证500 / CSI500</SelectItem>
            <SelectItem value="sp500">标普500 / SPX</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 5. 时间快捷键 (Quick Actions) */}
      <div className="ml-auto flex items-center bg-[#1a2942]/50 rounded p-0.5">
        {(['YTD', '1Y', '3Y', 'Custom'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeFrameChange?.(tf)}
            className={cn(
              "px-3 py-1 text-xs rounded transition-all",
              timeFrame === tf
                ? "bg-[#0EA5E9] text-white font-medium shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#1a2942]"
            )}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  );
}
