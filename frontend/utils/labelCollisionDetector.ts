/**
 * Label Collision Detector - X轴标签智能避让系统
 * TradingView/Bloomberg标准
 * 
 * 功能：
 * 1. 检测标签重叠
 * 2. 自动隐藏低优先级标签
 * 3. 保留关键时间节点
 * 4. 优化视觉密度
 */

export interface LabelBox {
  x: number;              // X坐标
  y: number;              // Y坐标
  width: number;          // 宽度
  height: number;         // 高度
  text: string;           // 文本内容
  priority: number;       // 优先级 (0-1)
  isMajor: boolean;       // 是否主刻度
  metadata?: any;         // 元数据
}

export interface CollisionResult {
  visibleLabels: LabelBox[];     // 可见标签
  hiddenLabels: LabelBox[];      // 隐藏标签
  collisionCount: number;        // 碰撞次数
  density: number;               // 密度 (0-1)
}

/**
 * 检测并解决标签碰撞
 * 
 * 算法：
 * 1. 按优先级排序
 * 2. 检测重叠
 * 3. 隐藏低优先级标签
 * 4. 保证最小间距
 */
export function resolveCollisions(
  labels: LabelBox[],
  minSpacing: number = 8 // 最小间距（像素）
): CollisionResult {
  if (!labels || labels.length === 0) {
    return {
      visibleLabels: [],
      hiddenLabels: [],
      collisionCount: 0,
      density: 0,
    };
  }

  // 按优先级排序（高优先级优先显示）
  const sortedLabels = [...labels].sort((a, b) => {
    // 主刻度优先
    if (a.isMajor !== b.isMajor) return a.isMajor ? -1 : 1;
    // 然后按优先级
    return b.priority - a.priority;
  });

  const visibleLabels: LabelBox[] = [];
  const hiddenLabels: LabelBox[] = [];
  let collisionCount = 0;

  sortedLabels.forEach((label) => {
    let hasCollision = false;

    // 检查与已显示标签的碰撞
    for (const visible of visibleLabels) {
      if (isColliding(label, visible, minSpacing)) {
        hasCollision = true;
        collisionCount++;
        break;
      }
    }

    if (hasCollision) {
      hiddenLabels.push(label);
    } else {
      visibleLabels.push(label);
    }
  });

  // 计算密度
  const totalWidth = labels.length > 0 
    ? Math.max(...labels.map(l => l.x + l.width)) - Math.min(...labels.map(l => l.x))
    : 0;
  const occupiedWidth = visibleLabels.reduce((sum, l) => sum + l.width + minSpacing, 0);
  const density = totalWidth > 0 ? occupiedWidth / totalWidth : 0;

  return {
    visibleLabels,
    hiddenLabels,
    collisionCount,
    density: Math.min(density, 1),
  };
}

/**
 * 检测两个标签是否碰撞
 */
function isColliding(
  label1: LabelBox,
  label2: LabelBox,
  minSpacing: number = 8
): boolean {
  // 扩展边界以包含最小间距
  const box1 = {
    left: label1.x - minSpacing / 2,
    right: label1.x + label1.width + minSpacing / 2,
    top: label1.y - minSpacing / 2,
    bottom: label1.y + label1.height + minSpacing / 2,
  };

  const box2 = {
    left: label2.x - minSpacing / 2,
    right: label2.x + label2.width + minSpacing / 2,
    top: label2.y - minSpacing / 2,
    bottom: label2.y + label2.height + minSpacing / 2,
  };

  // AABB碰撞检测
  return !(
    box1.right < box2.left ||
    box1.left > box2.right ||
    box1.bottom < box2.top ||
    box1.top > box2.bottom
  );
}

/**
 * 测量文本宽度
 * 
 * @param text 文本内容
 * @param font 字体（例如："12px monospace"）
 * @param ctx Canvas上下文（可选，用于精确测量）
 */
export function measureTextWidth(
  text: string,
  font: string = '12px monospace',
  ctx?: CanvasRenderingContext2D
): number {
  if (ctx) {
    const previousFont = ctx.font;
    ctx.font = font;
    const width = ctx.measureText(text).width;
    ctx.font = previousFont;
    return width;
  }

  // 粗略估算（monospace字体）
  const fontSize = parseInt(font.match(/(\d+)px/)?.[1] || '12');
  return text.length * fontSize * 0.6;
}

/**
 * 智能X轴标签布局
 * TradingView算法：自适应密度
 * 
 * @param labels 所有标签
 * @param canvasWidth 画布宽度
 * @param targetDensity 目标密度 (0-1，默认0.7)
 */
export function adaptiveLabelLayout(
  labels: LabelBox[],
  canvasWidth: number,
  targetDensity: number = 0.7
): CollisionResult {
  let minSpacing = 4;
  let result = resolveCollisions(labels, minSpacing);

  // 如果密度过高，增加间距
  let iterations = 0;
  const maxIterations = 20;

  while (result.density > targetDensity && iterations < maxIterations) {
    minSpacing += 4;
    result = resolveCollisions(labels, minSpacing);
    iterations++;
  }

  // 如果密度过低且有隐藏标签，减少间距
  while (
    result.density < targetDensity * 0.8 &&
    result.hiddenLabels.length > 0 &&
    minSpacing > 4 &&
    iterations < maxIterations
  ) {
    minSpacing -= 2;
    result = resolveCollisions(labels, minSpacing);
    iterations++;
  }

  return result;
}

/**
 * 分层标签系统
 * Bloomberg标准：多行显示不同级别的标签
 * 
 * @param labels 所有标签
 * @param layers 层数（默认2层：主刻度、次刻度）
 */
export function layeredLabelLayout(
  labels: LabelBox[],
  layers: number = 2
): { [layer: number]: LabelBox[] } {
  const result: { [layer: number]: LabelBox[] } = {};

  // 按优先级分层
  const sortedLabels = [...labels].sort((a, b) => b.priority - a.priority);

  const labelsPerLayer = Math.ceil(sortedLabels.length / layers);

  for (let i = 0; i < layers; i++) {
    const start = i * labelsPerLayer;
    const end = Math.min((i + 1) * labelsPerLayer, sortedLabels.length);
    result[i] = sortedLabels.slice(start, end);
  }

  return result;
}

/**
 * 强制显示关键标签
 * 
 * @param labels 所有标签
 * @param criticalIndices 必须显示的标签索引
 * @param minSpacing 最小间距
 */
export function forceShowCriticalLabels(
  labels: LabelBox[],
  criticalIndices: number[],
  minSpacing: number = 8
): CollisionResult {
  const criticalLabels = criticalIndices.map(i => labels[i]).filter(Boolean);
  const otherLabels = labels.filter((_, i) => !criticalIndices.includes(i));

  // 关键标签自动可见
  const visibleLabels = [...criticalLabels];
  const hiddenLabels: LabelBox[] = [];
  let collisionCount = 0;

  // 尝试添加其他标签
  otherLabels.forEach((label) => {
    let hasCollision = false;

    for (const visible of visibleLabels) {
      if (isColliding(label, visible, minSpacing)) {
        hasCollision = true;
        collisionCount++;
        break;
      }
    }

    if (hasCollision) {
      hiddenLabels.push(label);
    } else {
      visibleLabels.push(label);
    }
  });

  const totalWidth = labels.length > 0
    ? Math.max(...labels.map(l => l.x + l.width)) - Math.min(...labels.map(l => l.x))
    : 0;
  const occupiedWidth = visibleLabels.reduce((sum, l) => sum + l.width + minSpacing, 0);
  const density = totalWidth > 0 ? occupiedWidth / totalWidth : 0;

  return {
    visibleLabels,
    hiddenLabels,
    collisionCount,
    density: Math.min(density, 1),
  };
}

/**
 * 获取标签建议位置
 * 
 * @param labels 当前标签
 * @param availableSpace 可用空间
 * @returns 建议的新标签位置
 */
export function suggestLabelPosition(
  labels: LabelBox[],
  availableSpace: { x: number; width: number },
  labelWidth: number,
  minSpacing: number = 8
): number | null {
  if (!labels || labels.length === 0) {
    return availableSpace.x;
  }

  // 按X坐标排序
  const sortedLabels = [...labels].sort((a, b) => a.x - b.x);

  // 检查起始位置
  if (sortedLabels[0].x - availableSpace.x >= labelWidth + minSpacing) {
    return availableSpace.x;
  }

  // 检查标签之间的间隙
  for (let i = 0; i < sortedLabels.length - 1; i++) {
    const current = sortedLabels[i];
    const next = sortedLabels[i + 1];
    const gap = next.x - (current.x + current.width);

    if (gap >= labelWidth + minSpacing * 2) {
      return current.x + current.width + minSpacing;
    }
  }

  // 检查结束位置
  const last = sortedLabels[sortedLabels.length - 1];
  const endSpace = availableSpace.x + availableSpace.width - (last.x + last.width);

  if (endSpace >= labelWidth + minSpacing) {
    return last.x + last.width + minSpacing;
  }

  return null; // 没有合适位置
}

/**
 * 优化标签旋转
 * 当标签过长时，计算最佳旋转角度
 * 
 * @param labelWidth 标签宽度
 * @param availableWidth 可用宽度
 * @returns 建议旋转角度（度）
 */
export function calculateOptimalRotation(
  labelWidth: number,
  availableWidth: number
): number {
  if (labelWidth <= availableWidth) return 0;

  // 旋转角度选项：0°, 30°, 45°, 60°, 90°
  const rotations = [0, 30, 45, 60, 90];

  for (const angle of rotations) {
    const radians = (angle * Math.PI) / 180;
    const rotatedWidth = Math.abs(labelWidth * Math.cos(radians));

    if (rotatedWidth <= availableWidth) {
      return angle;
    }
  }

  return 90; // 最大旋转
}

/**
 * 智能缩略标签
 * 当空间不足时，智能缩短标签文本
 * 
 * @param text 原始文本
 * @param maxWidth 最大宽度
 * @param font 字体
 * @returns 缩略后的文本
 */
export function smartTruncateLabel(
  text: string,
  maxWidth: number,
  font: string = '12px monospace'
): string {
  const fullWidth = measureTextWidth(text, font);

  if (fullWidth <= maxWidth) return text;

  // 时间格式特殊处理
  if (text.includes(':')) {
    // "09:30" -> "9:30"
    const shortened = text.replace(/^0/, '');
    if (measureTextWidth(shortened, font) <= maxWidth) return shortened;

    // "09:30" -> "9:30"
    return shortened;
  }

  if (text.includes('/')) {
    // "2024/12/09" -> "12/09"
    const parts = text.split('/');
    if (parts.length === 3) {
      const shortened = `${parts[1]}/${parts[2]}`;
      if (measureTextWidth(shortened, font) <= maxWidth) return shortened;
    }
  }

  // 通用截断
  const ellipsis = '...';
  const ellipsisWidth = measureTextWidth(ellipsis, font);
  const avgCharWidth = fullWidth / text.length;
  const maxChars = Math.floor((maxWidth - ellipsisWidth) / avgCharWidth);

  if (maxChars <= 0) return '';

  return text.slice(0, maxChars) + ellipsis;
}
