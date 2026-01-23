/**
 * Node Anchor 工具模块
 *
 * 整合了所有 NodeAnchor 预设，并提供了 resolveAnchorFunction 函数。
 * 新的预设系统支持通过 Graph.registerNodeAnchor() 扩展。
 *
 * 所有锚点函数都使用 getLocalBounds() 来获取形状边界，
 * 这是 @antv/g-lite DisplayObject 的标准 API。
 */

import type { DisplayObject } from '@antv/g-lite';

// ============================================================================
// 类型定义 (与新的 Anchor 系统一致)
// ============================================================================

export type NodeAnchorArgs = {
  dx?: number | string;
  dy?: number | string;
  angle?: number;
  x?: number;
  y?: number;
  // midSide 专用 - 最近侧中心点
  direction?: [number, number];  // 进入方向向量 [dx, dy]
  // orth 专用 - 正交锚点
  refX?: number;  // 参考点 X 坐标
  refY?: number;  // 参考点 Y 坐标
};

// 带参数的预设类型
export type LayoutAngle = { name: 'angle'; args: { angle: number } };
export type LayoutAbsolute = { name: 'absolute'; args: { x: number; y: number } };
export type LayoutMidSide = { name: 'midSide'; args: { direction: [number, number] } };
export type LayoutOrth = { name: 'orth'; args: { refX?: number; refY?: number } };

// 预设字符串类型
export type LayoutPreset = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'midSide' | 'orth' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

// 通用布局对象类型（支持所有预设）
export type LayoutWithName<T extends string, A = any> = { name: T; args?: A };

// 所有可能的布局类型
export type PortLayoutAny =
  | LayoutPreset
  | LayoutAngle
  | LayoutAbsolute
  | LayoutMidSide
  | LayoutOrth
  | LayoutWithName<string, any>
  | undefined;

// ============================================================================
// 辅助函数 - 使用 getLocalBounds() 获取边界
// ============================================================================

/**
 * 获取形状的本地边界
 * 使用 @antv/g-lite DisplayObject 的标准 API
 */
function getBounds(shape: DisplayObject): { min: [number, number]; max: [number, number] } {
  try {
    return shape.getLocalBounds();
  } catch {
    return { min: [0, 0], max: [0, 0] };
  }
}

/**
 * 获取边界中心点
 */
function getCenter(shape: DisplayObject): [number, number] {
  const bounds = getBounds(shape);
  return [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2
  ];
}

// ============================================================================
// NodeAnchor 预设 (与 core/anchor/Anchor.ts 中的预设保持同步)
// ============================================================================

function centerAnchor(shape: DisplayObject, args?: NodeAnchorArgs): [number, number] {
  return getCenter(shape);
}

function topAnchor(shape: DisplayObject, args?: NodeAnchorArgs): [number, number] {
  const bounds = getBounds(shape);
  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  return [centerX, bounds.min[1]];
}

function bottomAnchor(shape: DisplayObject, args?: NodeAnchorArgs): [number, number] {
  const bounds = getBounds(shape);
  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  return [centerX, bounds.max[1]];
}

function leftAnchor(shape: DisplayObject, args?: NodeAnchorArgs): [number, number] {
  const bounds = getBounds(shape);
  const centerY = (bounds.min[1] + bounds.max[1]) / 2;
  return [bounds.min[0], centerY];
}

function rightAnchor(shape: DisplayObject, args?: NodeAnchorArgs): [number, number] {
  const bounds = getBounds(shape);
  const centerY = (bounds.min[1] + bounds.max[1]) / 2;
  return [bounds.max[0], centerY];
}

/**
 * angleAnchor - 根据角度计算锚点位置
 * 对于矩形：从中心出发，沿着角度方向找到与边界的交点
 * 对于圆形/椭圆：使用参数方程计算
 */
function angleAnchor(shape: DisplayObject, args?: NodeAnchorArgs): [number, number] {
  const angleDeg = args?.angle || 0;
  const angleRad = (angleDeg * Math.PI) / 180;
  const bounds = getBounds(shape);

  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  const centerY = (bounds.min[1] + bounds.max[1]) / 2;
  const width = bounds.max[0] - bounds.min[0];
  const height = bounds.max[1] - bounds.min[1];

  // 根据形状类型选择不同的计算方法
  const nodeName = shape.nodeName;

  if (nodeName === 'circle' || nodeName === 'ellipse') {
    // 圆形/椭圆：使用参数方程
    const rx = width / 2;
    const ry = height / 2;
    return [
      centerX + rx * Math.cos(angleRad),
      centerY + ry * Math.sin(angleRad)
    ];
  }

  // 矩形或其他形状：计算射线与边界的交点
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  const intersections: [number, number][] = [];

  // 右边
  if (dx > 0) {
    const t = (bounds.max[0] - centerX) / dx;
    const y = centerY + dy * t;
    if (y >= bounds.min[1] && y <= bounds.max[1]) {
      intersections.push([bounds.max[0], y]);
    }
  }

  // 左边
  if (dx < 0) {
    const t = (bounds.min[0] - centerX) / dx;
    const y = centerY + dy * t;
    if (y >= bounds.min[1] && y <= bounds.max[1]) {
      intersections.push([bounds.min[0], y]);
    }
  }

  // 下边
  if (dy > 0) {
    const t = (bounds.max[1] - centerY) / dy;
    const x = centerX + dx * t;
    if (x >= bounds.min[0] && x <= bounds.max[0]) {
      intersections.push([x, bounds.max[1]]);
    }
  }

  // 上边
  if (dy < 0) {
    const t = (bounds.min[1] - centerY) / dy;
    const x = centerX + dx * t;
    if (x >= bounds.min[0] && x <= bounds.max[0]) {
      intersections.push([x, bounds.min[1]]);
    }
  }

  if (intersections.length > 0) {
    return intersections[0];
  }

  return [centerX, centerY];
}

function absoluteAnchor(shape: DisplayObject, args?: NodeAnchorArgs): [number, number] {
  return [args?.x ?? 0, args?.y ?? 0];
}

/**
 * midSide - 最近侧中心点
 * 根据边的进入方向，自动选择最近的一侧
 */
function midSideAnchor(shape: DisplayObject, args?: NodeAnchorArgs): [number, number] {
  const direction = args?.direction || [0, 0];
  const [dirX, dirY] = direction;

  // 如果没有方向信息，返回中心
  if (dirX === 0 && dirY === 0) {
    return centerAnchor(shape);
  }

  // 根据主导方向选择预设
  if (Math.abs(dirX) > Math.abs(dirY)) {
    // 水平方向主导
    return dirX > 0 ? rightAnchor(shape) : leftAnchor(shape);
  } else {
    // 垂直方向主导
    return dirY > 0 ? bottomAnchor(shape) : topAnchor(shape);
  }
}

/**
 * orth - 正交锚点
 * 选择水平或垂直方向上最近的点
 */
function orthAnchor(shape: DisplayObject, args?: NodeAnchorArgs): [number, number] {
  const bounds = getBounds(shape);
  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  const centerY = (bounds.min[1] + bounds.max[1]) / 2;

  // 使用参考点或默认中心
  const refX = args?.refX ?? centerX;
  const refY = args?.refY ?? centerY;

  // 计算到四个方向锚点的距离
  const distToTop = Math.abs(refY - bounds.min[1]);
  const distToBottom = Math.abs(refY - bounds.max[1]);
  const distToLeft = Math.abs(refX - bounds.min[0]);
  const distToRight = Math.abs(refX - bounds.max[0]);

  // 选择最近的方向
  const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);

  if (minDist === distToTop) return [centerX, bounds.min[1]];
  if (minDist === distToBottom) return [centerX, bounds.max[1]];
  if (minDist === distToLeft) return [bounds.min[0], centerY];
  return [bounds.max[0], centerY];
}

/**
 * topLeft - 左上角锚点
 */
function topLeftAnchor(shape: DisplayObject): [number, number] {
  const bounds = getBounds(shape);
  return [bounds.min[0], bounds.min[1]];
}

/**
 * topRight - 右上角锚点
 */
function topRightAnchor(shape: DisplayObject): [number, number] {
  const bounds = getBounds(shape);
  return [bounds.max[0], bounds.min[1]];
}

/**
 * bottomLeft - 左下角锚点
 */
function bottomLeftAnchor(shape: DisplayObject): [number, number] {
  const bounds = getBounds(shape);
  return [bounds.min[0], bounds.max[1]];
}

/**
 * bottomRight - 右下角锚点
 */
function bottomRightAnchor(shape: DisplayObject): [number, number] {
  const bounds = getBounds(shape);
  return [bounds.max[0], bounds.max[1]];
}

// 预设映射表
const anchorPresets: Map<string, (shape: DisplayObject, args?: NodeAnchorArgs) => [number, number]> = new Map([
  // 基本方向
  ['center', centerAnchor],
  ['top', topAnchor],
  ['bottom', bottomAnchor],
  ['left', leftAnchor],
  ['right', rightAnchor],
  // 智能预设
  ['midSide', midSideAnchor],
  ['orth', orthAnchor],
  // 角度
  ['angle', angleAnchor],
  // 绝对位置
  ['absolute', absoluteAnchor],
  // 四个角
  ['topLeft', topLeftAnchor],
  ['topRight', topRightAnchor],
  ['bottomLeft', bottomLeftAnchor],
  ['bottomRight', bottomRightAnchor],
]);

// ============================================================================
// 公共接口
// ============================================================================

/**
 * 解析 layout 为锚点函数
 */
export function resolveAnchorFunction(layout?: PortLayoutAny): ((shape: DisplayObject) => [number, number]) | null {
  if (!layout) return centerAnchor;

  // 字符串预设 - 直接返回函数
  if (typeof layout === 'string') {
    return anchorPresets.get(layout) || centerAnchor;
  }

  // 对象格式 - 需要绑定参数
  if (layout && typeof layout === 'object' && 'name' in layout) {
    const name = (layout as any).name;
    const args = (layout as any).args;

    // 检查是否是已知预设
    const presetFn = anchorPresets.get(name);
    if (presetFn) {
      // 返回闭包，固化参数
      return (shape) => presetFn(shape, args);
    }

    // 兼容旧的 LayoutAngle 和 LayoutAbsolute 格式
    if (name === 'angle') {
      return (shape) => angleAnchor(shape, args);
    }
    if (name === 'absolute') {
      return (shape) => absoluteAnchor(shape, args);
    }
  }

  return centerAnchor;
}
