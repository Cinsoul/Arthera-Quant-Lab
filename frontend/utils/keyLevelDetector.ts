/**
 * Key Level Detector - 关键价位自动识别系统
 * Bloomberg/TradingView标准
 * 
 * 识别类型：
 * 1. 前高/前低 (Swing High/Low)
 * 2. 支撑位/阻力位 (Support/Resistance)
 * 3. 整数价位 (Round Numbers)
 * 4. 成交量加权价位 (VWAP Levels)
 */

import { CandleData } from './chartHelpers';

export type KeyLevelType = 
  | 'swing_high'      // 前高
  | 'swing_low'       // 前低
  | 'support'         // 支撑位
  | 'resistance'      // 阻力位
  | 'round_number'    // 整数价位
  | 'vwap'           // 成交量加权
  | 'current_price';  // 当前价格

export interface KeyLevel {
  price: number;              // 价格
  type: KeyLevelType;         // 类型
  strength: number;           // 强度 (0-1)
  timestamp?: number;         // 形成时间
  touchCount?: number;        // 触及次数
  label?: string;             // 标签
  color?: string;             // 颜色
}

export interface KeyLevelDetectorConfig {
  enableSwingPoints?: boolean;      // 启用前高前低
  enableSupportResistance?: boolean; // 启用支撑阻力
  enableRoundNumbers?: boolean;      // 启用整数价位
  enableVWAP?: boolean;              // 启用VWAP
  swingWindow?: number;              // 前高前低窗口
  touchThreshold?: number;           // 触及阈值
  minTouchCount?: number;            // 最小触及次数
  roundNumberStep?: number;          // 整数步长
}

const DEFAULT_CONFIG: KeyLevelDetectorConfig = {
  enableSwingPoints: true,
  enableSupportResistance: true,
  enableRoundNumbers: true,
  enableVWAP: true,
  swingWindow: 10,
  touchThreshold: 0.005,  // 0.5%
  minTouchCount: 2,
  roundNumberStep: 10,
};

/**
 * 检测所有关键价位
 */
export function detectKeyLevels(
  data: CandleData[],
  config: KeyLevelDetectorConfig = {}
): KeyLevel[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const levels: KeyLevel[] = [];

  if (!data || data.length === 0) return levels;

  // 1. 前高前低
  if (cfg.enableSwingPoints) {
    levels.push(...detectSwingPoints(data, cfg.swingWindow!));
  }

  // 2. 支撑位/阻力位
  if (cfg.enableSupportResistance) {
    levels.push(...detectSupportResistance(data, cfg.touchThreshold!, cfg.minTouchCount!));
  }

  // 3. 整数价位
  if (cfg.enableRoundNumbers) {
    levels.push(...detectRoundNumbers(data, cfg.roundNumberStep!));
  }

  // 4. VWAP
  if (cfg.enableVWAP) {
    const vwap = calculateVWAP(data);
    if (vwap) levels.push(vwap);
  }

  // 5. 当前价格线
  const currentPrice = data[data.length - 1].close;
  const prevClose = data.length > 1 ? data[data.length - 2].close : currentPrice;
  const isUp = currentPrice >= prevClose;
  
  levels.push({
    price: currentPrice,
    type: 'current_price',
    strength: 1,
    timestamp: data[data.length - 1].timestamp,
    label: `${currentPrice.toFixed(2)}`,
    color: isUp ? '#10B981' : '#EF4444',
  });

  // 按强度排序
  return levels.sort((a, b) => b.strength - a.strength);
}

/**
 * 检测前高前低 (Swing Points)
 * TradingView算法：局部极值点
 */
function detectSwingPoints(
  data: CandleData[],
  window: number = 10
): KeyLevel[] {
  const levels: KeyLevel[] = [];
  
  for (let i = window; i < data.length - window; i++) {
    const current = data[i];
    
    // 检查前高
    let isSwingHigh = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && data[j].high > current.high) {
        isSwingHigh = false;
        break;
      }
    }
    
    if (isSwingHigh) {
      // 计算强度（基于周围价格差异）
      const avgHigh = data.slice(i - window, i + window + 1).reduce((sum, d) => sum + d.high, 0) / (window * 2 + 1);
      const strength = Math.min((current.high - avgHigh) / avgHigh, 1);
      
      levels.push({
        price: current.high,
        type: 'swing_high',
        strength: Math.max(strength, 0.3),
        timestamp: current.timestamp,
        label: `前高 ${current.high.toFixed(2)}`,
        color: '#EF4444',
      });
    }
    
    // 检查前低
    let isSwingLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && data[j].low < current.low) {
        isSwingLow = false;
        break;
      }
    }
    
    if (isSwingLow) {
      const avgLow = data.slice(i - window, i + window + 1).reduce((sum, d) => sum + d.low, 0) / (window * 2 + 1);
      const strength = Math.min((avgLow - current.low) / avgLow, 1);
      
      levels.push({
        price: current.low,
        type: 'swing_low',
        strength: Math.max(strength, 0.3),
        timestamp: current.timestamp,
        label: `前低 ${current.low.toFixed(2)}`,
        color: '#10B981',
      });
    }
  }
  
  // 去重（合并接近的价位）
  return mergeSimilarLevels(levels, 0.003);
}

/**
 * 检测支撑位/阻力位
 * Bloomberg算法：多次触及的价位
 */
function detectSupportResistance(
  data: CandleData[],
  threshold: number = 0.005,
  minTouchCount: number = 2
): KeyLevel[] {
  const levels: Map<number, { count: number; type: 'support' | 'resistance'; timestamps: number[] }> = new Map();
  
  // 收集所有高低点
  const pricePoints: { price: number; isHigh: boolean; timestamp: number }[] = [];
  data.forEach(d => {
    pricePoints.push({ price: d.high, isHigh: true, timestamp: d.timestamp });
    pricePoints.push({ price: d.low, isHigh: false, timestamp: d.timestamp });
  });
  
  // 聚类相似价位
  pricePoints.forEach(point => {
    let foundCluster = false;
    
    for (const [clusterPrice, cluster] of levels.entries()) {
      if (Math.abs(point.price - clusterPrice) / clusterPrice < threshold) {
        cluster.count++;
        cluster.timestamps.push(point.timestamp);
        foundCluster = true;
        break;
      }
    }
    
    if (!foundCluster) {
      const avgPrice = calculateAveragePrice(data);
      levels.set(point.price, {
        count: 1,
        type: point.price > avgPrice ? 'resistance' : 'support',
        timestamps: [point.timestamp],
      });
    }
  });
  
  // 过滤并转换为KeyLevel
  const result: KeyLevel[] = [];
  levels.forEach((cluster, price) => {
    if (cluster.count >= minTouchCount) {
      const strength = Math.min(cluster.count / 10, 1); // 触及次数越多越强
      
      result.push({
        price,
        type: cluster.type,
        strength,
        touchCount: cluster.count,
        timestamp: cluster.timestamps[0],
        label: `${cluster.type === 'support' ? '支撑' : '阻力'} ${price.toFixed(2)} (${cluster.count}次)`,
        color: cluster.type === 'support' ? '#10B981' : '#EF4444',
      });
    }
  });
  
  return result;
}

/**
 * 检测整数价位 (Round Numbers)
 * Bloomberg心理关键位
 */
function detectRoundNumbers(
  data: CandleData[],
  step: number = 10
): KeyLevel[] {
  const levels: KeyLevel[] = [];
  
  if (!data || data.length === 0) return levels;
  
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const minPrice = Math.min(...lows);
  const maxPrice = Math.max(...highs);
  
  // 找到范围内的整数价位
  const startRound = Math.floor(minPrice / step) * step;
  const endRound = Math.ceil(maxPrice / step) * step;
  
  for (let price = startRound; price <= endRound; price += step) {
    if (price >= minPrice && price <= maxPrice) {
      // 检查是否在数据范围内
      const isInRange = data.some(d => d.low <= price && d.high >= price);
      
      if (isInRange) {
        // 整数位数越多，强度越高
        const digits = price.toString().replace(/0+$/, '').length;
        const strength = Math.max(0.2, 1 - digits / 10);
        
        levels.push({
          price,
          type: 'round_number',
          strength,
          label: `整数位 ${price.toFixed(0)}`,
          color: '#0EA5E9',
        });
      }
    }
  }
  
  return levels;
}

/**
 * 计算VWAP (Volume Weighted Average Price)
 * 成交量加权平均价
 */
function calculateVWAP(data: CandleData[]): KeyLevel | null {
  if (!data || data.length === 0) return null;
  
  let totalPV = 0;
  let totalVolume = 0;
  
  data.forEach(d => {
    const typicalPrice = (d.high + d.low + d.close) / 3;
    totalPV += typicalPrice * d.volume;
    totalVolume += d.volume;
  });
  
  if (totalVolume === 0) return null;
  
  const vwap = totalPV / totalVolume;
  
  return {
    price: vwap,
    type: 'vwap',
    strength: 0.6,
    label: `VWAP ${vwap.toFixed(2)}`,
    color: '#F59E0B',
  };
}

/**
 * 合并相似价位
 */
function mergeSimilarLevels(
  levels: KeyLevel[],
  threshold: number = 0.003
): KeyLevel[] {
  const merged: KeyLevel[] = [];
  const used = new Set<number>();
  
  levels.forEach((level, i) => {
    if (used.has(i)) return;
    
    const similar: KeyLevel[] = [level];
    
    for (let j = i + 1; j < levels.length; j++) {
      if (used.has(j)) continue;
      
      const other = levels[j];
      if (Math.abs(level.price - other.price) / level.price < threshold && level.type === other.type) {
        similar.push(other);
        used.add(j);
      }
    }
    
    // 合并相似价位（取平均价格，最大强度）
    const avgPrice = similar.reduce((sum, l) => sum + l.price, 0) / similar.length;
    const maxStrength = Math.max(...similar.map(l => l.strength));
    
    merged.push({
      ...level,
      price: avgPrice,
      strength: maxStrength,
    });
  });
  
  return merged;
}

/**
 * 计算平均价格
 */
function calculateAveragePrice(data: CandleData[]): number {
  if (!data || data.length === 0) return 0;
  
  const sum = data.reduce((acc, d) => acc + (d.high + d.low + d.close) / 3, 0);
  return sum / data.length;
}

/**
 * 过滤关键价位（按强度和类型）
 */
export function filterKeyLevels(
  levels: KeyLevel[],
  options: {
    minStrength?: number;
    types?: KeyLevelType[];
    maxCount?: number;
  } = {}
): KeyLevel[] {
  let filtered = levels;
  
  // 按强度过滤
  if (options.minStrength !== undefined) {
    filtered = filtered.filter(l => l.strength >= options.minStrength);
  }
  
  // 按类型过滤
  if (options.types && options.types.length > 0) {
    filtered = filtered.filter(l => options.types!.includes(l.type));
  }
  
  // 限制数量
  if (options.maxCount !== undefined) {
    filtered = filtered.slice(0, options.maxCount);
  }
  
  return filtered;
}

/**
 * 获取最近的关键价位
 */
export function getNearestKeyLevel(
  price: number,
  levels: KeyLevel[],
  direction?: 'above' | 'below'
): KeyLevel | null {
  if (!levels || levels.length === 0) return null;
  
  let candidates = levels;
  
  if (direction === 'above') {
    candidates = levels.filter(l => l.price > price);
  } else if (direction === 'below') {
    candidates = levels.filter(l => l.price < price);
  }
  
  if (candidates.length === 0) return null;
  
  return candidates.reduce((nearest, level) => {
    const currentDist = Math.abs(price - level.price);
    const nearestDist = Math.abs(price - nearest.price);
    return currentDist < nearestDist ? level : nearest;
  });
}
