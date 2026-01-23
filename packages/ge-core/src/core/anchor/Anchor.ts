/**
 * Anchor 系统 - 图编辑原语 (Layer 2)
 *
 * Anchor 是计算连接点位置的策略函数，不是可视化对象。
 *
 * 参考 @antv/x6 设计：
 * - NodeAnchor: 计算节点上的连接点位置
 * - EdgeAnchor: 计算边上的连接点位置 (标签、标记位置等)
 * - 支持预设和自定义注册
 */

import type { DisplayObject } from '@antv/g-lite';
import type { Vec2 } from '../../utils/edgeLayout';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Anchor 点数据结构
 * 包含位置、切向量和法向量
 */
export interface AnchorPoint {
  x: number;
  y: number;
  tangent: Vec2;   // 切向量 (normalized)
  normal: Vec2;    // 法向量 (normalized)
}

/**
 * Anchor 计算结果
 * 可以是简化版 (仅坐标) 或完整版 (包含向量)
 */
export type AnchorResult =
  | AnchorPoint           // 完整版
  | [number, number];      // 简化版

/**
 * Node Anchor 参数
 */
export interface NodeAnchorArgs {
  // 通用偏移
  dx?: number | string;    // X轴偏移 (数字或百分比)
  dy?: number | string;    // Y轴偏移
  rotate?: boolean;        // 是否考虑旋转
  padding?: number;        // 内边距

  // 预设特定参数
  angle?: number;          // 角度锚点专用
  x?: number;              // 绝对位置专用
  y?: number;              // 绝对位置专用

  // midSide 专用 - 最近侧中心点
  direction?: [number, number];  // 进入方向向量 [dx, dy]

  // orth 专用 - 正交锚点
  refX?: number;           // 参考点 X 坐标
  refY?: number;           // 参考点 Y 坐标
}

/**
 * Edge Anchor 参数
 */
export interface EdgeAnchorArgs {
  // 比例位置
  ratio?: number;          // 0-1 之间的比例
  length?: number;         // 绝对长度

  // 偏移
  offset?: {
    along?: number;        // 沿切线偏移
    normal?: number;       // 沿法线偏移
  };

  // 段索引
  segmentIndex?: number;   // 用于多段线

  // 吸附选项
  snap?: 'start' | 'middle' | 'end';
}

/**
 * Node Anchor 函数签名
 * @param shape - 节点的图形对象
 * @param args - Anchor 参数
 * @returns Anchor 点坐标或完整信息
 */
export type NodeAnchorFunction = (
  shape: DisplayObject,
  args?: NodeAnchorArgs
) => AnchorResult;

/**
 * Edge Anchor 函数签名
 * @param points - 边的路径点
 * @param args - Anchor 参数
 * @returns Anchor 点坐标或完整信息
 */
export type EdgeAnchorFunction = (
  points: Vec2[],
  args?: EdgeAnchorArgs
) => AnchorResult;

/**
 * Anchor 类型 (支持字符串、对象、函数)
 */
export type AnchorDefinition<TArgs = any> =
  | string                    // 预设名称，如 'center', 'top'
  | {
      name: string;
      args?: TArgs;
    }
  | ((...args: any[]) => AnchorResult);  // 自定义函数

// ============================================================================
// NodeAnchor 预设
// ============================================================================

/**
 * NodeAnchor 预设注册表
 */
export const NodeAnchorPresets: Record<string, NodeAnchorFunction> = {
  /**
   * 中心点 (默认)
   */
  center: (shape) => {
    try {
      const bounds = shape.getLocalBounds();
      return [
        (bounds.min[0] + bounds.max[0]) / 2,
        (bounds.min[1] + bounds.max[1]) / 2
      ];
    } catch {
      return [0, 0];
    }
  },

  /**
   * 顶部中心
   */
  top: (shape) => {
    const style = (shape as any).style || {};
    if (shape.nodeName === 'rect') {
      const x = style.x || 0;
      const y = style.y || 0;
      const w = style.width || 0;
      return [x + w / 2, y];
    }
    if (shape.nodeName === 'circle' || shape.nodeName === 'ellipse') {
      const cx = style.cx || 0;
      const cy = style.cy || 0;
      const r = shape.nodeName === 'circle' ? (style.r || 0) : (style.ry || 0);
      return [cx, cy - r];
    }
    // fallback to center
    return NodeAnchorPresets.center(shape);
  },

  /**
   * 底部中心
   */
  bottom: (shape) => {
    const style = (shape as any).style || {};
    if (shape.nodeName === 'rect') {
      const x = style.x || 0;
      const y = style.y || 0;
      const w = style.width || 0;
      const h = style.height || 0;
      return [x + w / 2, y + h];
    }
    if (shape.nodeName === 'circle' || shape.nodeName === 'ellipse') {
      const cx = style.cx || 0;
      const cy = style.cy || 0;
      const r = shape.nodeName === 'circle' ? (style.r || 0) : (style.ry || 0);
      return [cx, cy + r];
    }
    return NodeAnchorPresets.center(shape);
  },

  /**
   * 左侧中心
   */
  left: (shape) => {
    const style = (shape as any).style || {};
    if (shape.nodeName === 'rect') {
      const x = style.x || 0;
      const y = style.y || 0;
      const h = style.height || 0;
      return [x, y + h / 2];
    }
    if (shape.nodeName === 'circle' || shape.nodeName === 'ellipse') {
      const cx = style.cx || 0;
      const cy = style.cy || 0;
      const r = shape.nodeName === 'circle' ? (style.r || 0) : (style.rx || 0);
      return [cx - r, cy];
    }
    return NodeAnchorPresets.center(shape);
  },

  /**
   * 右侧中心
   */
  right: (shape) => {
    const style = (shape as any).style || {};
    if (shape.nodeName === 'rect') {
      const x = style.x || 0;
      const y = style.y || 0;
      const w = style.width || 0;
      const h = style.height || 0;
      return [x + w, y + h / 2];
    }
    if (shape.nodeName === 'circle' || shape.nodeName === 'ellipse') {
      const cx = style.cx || 0;
      const cy = style.cy || 0;
      const r = shape.nodeName === 'circle' ? (style.r || 0) : (style.rx || 0);
      return [cx + r, cy];
    }
    return NodeAnchorPresets.center(shape);
  },

  /**
   * 角度锚点
   */
  angle: (shape, args?: NodeAnchorArgs) => {
    const style = (shape as any).style || {};
    const angleDeg = args?.angle || 0;
    const angleRad = (angleDeg * Math.PI) / 180;

    if (shape.nodeName === 'circle') {
      const cx = style.cx || 0;
      const cy = style.cy || 0;
      const r = style.r || 0;
      return [cx + r * Math.cos(angleRad), cy + r * Math.sin(angleRad)];
    }

    if (shape.nodeName === 'ellipse') {
      const cx = style.cx || 0;
      const cy = style.cy || 0;
      const rx = style.rx || style.r || 0;
      const ry = style.ry || style.r || 0;
      return [cx + rx * Math.cos(angleRad), cy + ry * Math.sin(angleRad)];
    }

    // 对于 rect，计算与边界的交点
    if (shape.nodeName === 'rect') {
      const x = style.x || 0;
      const y = style.y || 0;
      const w = style.width || 0;
      const h = style.height || 0;
      const dx = Math.cos(angleRad);
      const dy = Math.sin(angleRad);

      // 简化实现：使用包围盒中心 + 方向
      // 完整实现需要计算射线与矩形的交点
      const cx = x + w / 2;
      const cy = y + h / 2;
      return [cx + dx * Math.min(w, h) / 2, cy + dy * Math.min(w, h) / 2];
    }

    return NodeAnchorPresets.center(shape);
  },

  /**
   * 绝对位置
   */
  absolute: (shape, args?: NodeAnchorArgs) => {
    return [args?.x ?? 0, args?.y ?? 0];
  },

  /**
   * midSide - 最近侧中心点
   * 根据边的进入方向，自动选择最近的一侧
   */
  midSide: (shape, args?: NodeAnchorArgs) => {
    const style = (shape as any).style || {};
    const direction = args?.direction || [0, 0];
    const [dirX, dirY] = direction;

    // 如果没有方向信息，返回中心
    if (dirX === 0 && dirY === 0) {
      return NodeAnchorPresets.center(shape);
    }

    // 根据主导方向选择预设
    if (Math.abs(dirX) > Math.abs(dirY)) {
      // 水平方向主导
      return dirX > 0 ? NodeAnchorPresets.right(shape) : NodeAnchorPresets.left(shape);
    } else {
      // 垂直方向主导
      return dirY > 0 ? NodeAnchorPresets.bottom(shape) : NodeAnchorPresets.top(shape);
    }
  },

  /**
   * orth - 正交锚点
   * 选择水平或垂直方向上最近的点
   */
  orth: (shape, args?: NodeAnchorArgs) => {
    const style = (shape as any).style || {};

    if (shape.nodeName === 'rect') {
      const x = style.x || 0;
      const y = style.y || 0;
      const w = style.width || 0;
      const h = style.height || 0;
      const cx = x + w / 2;
      const cy = y + h / 2;

      // 使用参考点或默认中心
      const refX = args?.refX ?? cx;
      const refY = args?.refY ?? cy;

      // 计算到四个方向锚点的距离
      const distToTop = Math.abs(refY - y);
      const distToBottom = Math.abs(refY - (y + h));
      const distToLeft = Math.abs(refX - x);
      const distToRight = Math.abs(refX - (x + w));

      // 选择最近的方向
      const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);

      if (minDist === distToTop) return [cx, y];
      if (minDist === distToBottom) return [cx, y + h];
      if (minDist === distToLeft) return [x, cy];
      return [x + w, cy];
    }

    if (shape.nodeName === 'circle' || shape.nodeName === 'ellipse') {
      const cx = style.cx || 0;
      const cy = style.cy || 0;
      const refX = args?.refX ?? cx;
      const refY = args?.refY ?? cy;

      // 对于圆形/椭圆，使用角度来选择正交方向
      const angle = Math.atan2(refY - cy, refX - cx);
      const deg = (angle * 180 / Math.PI + 360) % 360;

      // 将角度映射到四个正交方向
      if (deg >= 315 || deg < 45) return NodeAnchorPresets.right(shape);
      if (deg >= 45 && deg < 135) return NodeAnchorPresets.bottom(shape);
      if (deg >= 135 && deg < 225) return NodeAnchorPresets.left(shape);
      return NodeAnchorPresets.top(shape);
    }

    return NodeAnchorPresets.center(shape);
  },

  /**
   * topLeft - 左上角锚点
   */
  topLeft: (shape) => {
    const style = (shape as any).style || {};
    if (shape.nodeName === 'rect') {
      const x = style.x || 0;
      const y = style.y || 0;
      return [x, y];
    }
    if (shape.nodeName === 'circle' || shape.nodeName === 'ellipse') {
      const cx = style.cx || 0;
      const cy = style.cy || 0;
      const rx = shape.nodeName === 'circle' ? (style.r || 0) : (style.rx || style.r || 0);
      const ry = shape.nodeName === 'circle' ? (style.r || 0) : (style.ry || style.r || 0);
      return [cx - rx, cy - ry];
    }
    return NodeAnchorPresets.center(shape);
  },

  /**
   * topRight - 右上角锚点
   */
  topRight: (shape) => {
    const style = (shape as any).style || {};
    if (shape.nodeName === 'rect') {
      const x = style.x || 0;
      const y = style.y || 0;
      const w = style.width || 0;
      return [x + w, y];
    }
    if (shape.nodeName === 'circle' || shape.nodeName === 'ellipse') {
      const cx = style.cx || 0;
      const cy = style.cy || 0;
      const rx = shape.nodeName === 'circle' ? (style.r || 0) : (style.rx || style.r || 0);
      const ry = shape.nodeName === 'circle' ? (style.r || 0) : (style.ry || style.r || 0);
      return [cx + rx, cy - ry];
    }
    return NodeAnchorPresets.center(shape);
  },

  /**
   * bottomLeft - 左下角锚点
   */
  bottomLeft: (shape) => {
    const style = (shape as any).style || {};
    if (shape.nodeName === 'rect') {
      const x = style.x || 0;
      const y = style.y || 0;
      const h = style.height || 0;
      return [x, y + h];
    }
    if (shape.nodeName === 'circle' || shape.nodeName === 'ellipse') {
      const cx = style.cx || 0;
      const cy = style.cy || 0;
      const rx = shape.nodeName === 'circle' ? (style.r || 0) : (style.rx || style.r || 0);
      const ry = shape.nodeName === 'circle' ? (style.r || 0) : (style.ry || style.r || 0);
      return [cx - rx, cy + ry];
    }
    return NodeAnchorPresets.center(shape);
  },

  /**
   * bottomRight - 右下角锚点
   */
  bottomRight: (shape) => {
    const style = (shape as any).style || {};
    if (shape.nodeName === 'rect') {
      const x = style.x || 0;
      const y = style.y || 0;
      const w = style.width || 0;
      const h = style.height || 0;
      return [x + w, y + h];
    }
    if (shape.nodeName === 'circle' || shape.nodeName === 'ellipse') {
      const cx = style.cx || 0;
      const cy = style.cy || 0;
      const rx = shape.nodeName === 'circle' ? (style.r || 0) : (style.rx || style.r || 0);
      const ry = shape.nodeName === 'circle' ? (style.r || 0) : (style.ry || style.r || 0);
      return [cx + rx, cy + ry];
    }
    return NodeAnchorPresets.center(shape);
  },
};

// ============================================================================
// EdgeAnchor 预设
// ============================================================================

/**
 * EdgeAnchor 预设注册表
 */
export const EdgeAnchorPresets: Record<string, EdgeAnchorFunction> = {
  /**
   * 起点
   */
  start: (points) => {
    return points[0] || [0, 0];
  },

  /**
   * 终点
   */
  end: (points) => {
    return points[points.length - 1] || [0, 0];
  },

  /**
   * 中点
   */
  middle: (points) => {
    if (points.length < 2) return [0, 0];
    const start = points[0];
    const end = points[points.length - 1];
    return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
  },

  /**
   * 比例位置
   */
  ratio: (points, args?: EdgeAnchorArgs) => {
    const ratio = args?.ratio ?? 0.5;
    if (points.length < 2) return [0, 0];
    const start = points[0];
    const end = points[points.length - 1];
    return [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio
    ];
  },
};

// ============================================================================
// Anchor 注册表
// ============================================================================

/**
 * Anchor 注册表类
 * 管理 NodeAnchor 和 EdgeAnchor 的预设和自定义注册
 */
export class AnchorRegistry {
  private nodeAnchors = new Map<string, NodeAnchorFunction>();
  private edgeAnchors = new Map<string, EdgeAnchorFunction>();

  constructor() {
    // 注册默认预设
    this.registerDefaults();
  }

  /**
   * 注册默认预设
   */
  private registerDefaults() {
    // NodeAnchor 预设
    Object.entries(NodeAnchorPresets).forEach(([name, fn]) => {
      this.nodeAnchors.set(name, fn);
    });

    // EdgeAnchor 预设
    Object.entries(EdgeAnchorPresets).forEach(([name, fn]) => {
      this.edgeAnchors.set(name, fn);
    });
  }

  /**
   * 注册 NodeAnchor
   */
  registerNodeAnchor(name: string, fn: NodeAnchorFunction): void {
    this.nodeAnchors.set(name, fn);
  }

  /**
   * 注册 EdgeAnchor
   */
  registerEdgeAnchor(name: string, fn: EdgeAnchorFunction): void {
    this.edgeAnchors.set(name, fn);
  }

  /**
   * 获取 NodeAnchor
   */
  getNodeAnchor(name: string): NodeAnchorFunction | undefined {
    return this.nodeAnchors.get(name);
  }

  /**
   * 获取 EdgeAnchor
   */
  getEdgeAnchor(name: string): EdgeAnchorFunction | undefined {
    return this.edgeAnchors.get(name);
  }

  /**
   * 解析 NodeAnchor 定义
   */
  resolveNodeAnchor(
    definition: AnchorDefinition<NodeAnchorArgs>
  ): NodeAnchorFunction | undefined {
    // 字符串 → 从注册表获取
    if (typeof definition === 'string') {
      return this.getNodeAnchor(definition);
    }

    // 对象 → 从注册表获取并应用参数
    if (definition && typeof definition === 'object' && 'name' in definition) {
      const baseFn = this.getNodeAnchor(definition.name);
      if (!baseFn) return undefined;

      // 返回包装函数，固化参数
      const args = definition.args;
      return (shape) => baseFn(shape, args);
    }

    // 函数 → 直接返回
    if (typeof definition === 'function') {
      return definition as NodeAnchorFunction;
    }

    return undefined;
  }

  /**
   * 解析 EdgeAnchor 定义
   */
  resolveEdgeAnchor(
    definition: AnchorDefinition<EdgeAnchorArgs>
  ): EdgeAnchorFunction | undefined {
    // 字符串 → 从注册表获取
    if (typeof definition === 'string') {
      return this.getEdgeAnchor(definition);
    }

    // 对象 → 从注册表获取并应用参数
    if (definition && typeof definition === 'object' && 'name' in definition) {
      const baseFn = this.getEdgeAnchor(definition.name);
      if (!baseFn) return undefined;

      const args = definition.args;
      return (points) => baseFn(points, args);
    }

    // 函数 → 直接返回
    if (typeof definition === 'function') {
      return definition as EdgeAnchorFunction;
    }

    return undefined;
  }

  /**
   * 列出所有注册的 NodeAnchor
   */
  listNodeAnchors(): string[] {
    return Array.from(this.nodeAnchors.keys());
  }

  /**
   * 列出所有注册的 EdgeAnchor
   */
  listEdgeAnchors(): string[] {
    return Array.from(this.edgeAnchors.keys());
  }
}

// ============================================================================
// 默认注册表实例
// ============================================================================

/**
 * 全局默认 Anchor 注册表
 */
export const defaultAnchorRegistry = new AnchorRegistry();
