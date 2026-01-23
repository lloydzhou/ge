/**
 * Edge Anchor 工具模块
 *
 * 整合了所有 EdgeAnchor 预设，并提供了向后兼容的 computeAnchor 函数。
 */

import type { Vec2 } from '../types';

// ============================================================================
// 类型定义
// ============================================================================

export interface EdgeLayoutOffset {
  along?: number; // offset along tangent (pixels)
  normal?: number; // offset along normal (pixels)
}

export interface EdgeLayoutOptions {
  t?: number; // [0,1]
  snap?: 'start' | 'middle' | 'end';
  segmentIndex?: number; // for polyline
  offset?: EdgeLayoutOffset;
}

export interface EdgeAnchor {
  x: number;
  y: number;
  tangent: Vec2; // normalized
  normal: Vec2; // normalized (left-hand normal)
}

// ============================================================================
// EdgeAnchor 预设
// ============================================================================

function startAnchor(points: Vec2[]): EdgeAnchor {
  const start = points[0] || [0, 0];
  const end = points[points.length - 1] || [0, 0];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  return {
    x: start[0],
    y: start[1],
    tangent: len > 0 ? [dx / len, dy / len] : [1, 0],
    normal: len > 0 ? [-dy / len, dx / len] : [0, 1]
  };
}

function endAnchor(points: Vec2[]): EdgeAnchor {
  const start = points[0] || [0, 0];
  const end = points[points.length - 1] || [0, 0];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  return {
    x: end[0],
    y: end[1],
    tangent: len > 0 ? [dx / len, dy / len] : [1, 0],
    normal: len > 0 ? [-dy / len, dx / len] : [0, 1]
  };
}

function middleAnchor(points: Vec2[], offset?: EdgeLayoutOffset): EdgeAnchor {
  if (points.length < 2) return startAnchor(points);

  const start = points[0];
  const end = points[points.length - 1];
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;

  // 计算切向量（从起点到终点）
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  const tangent: Vec2 = len > 0 ? [dx / len, dy / len] : [1, 0];
  const normal: Vec2 = len > 0 ? [-dy / len, dx / len] : [0, 1];

  let x = midX;
  let y = midY;

  // 应用偏移
  if (offset && (offset.normal || offset.along)) {
    x = midX + normal[0] * (offset.normal ?? 0) + tangent[0] * (offset.along ?? 0);
    y = midY + normal[1] * (offset.normal ?? 0) + tangent[1] * (offset.along ?? 0);
  }

  return { x, y, tangent, normal };
}

function ratioAnchor(points: Vec2[], args?: { ratio?: number }): EdgeAnchor {
  const ratio = args?.ratio ?? 0.5;
  if (points.length < 2) return startAnchor(points);

  const start = points[0];
  const end = points[points.length - 1];
  const x = start[0] + (end[0] - start[0]) * ratio;
  const y = start[1] + (end[1] - start[1]) * ratio;

  // 计算切向量（保持方向）
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  const tangent: Vec2 = len > 0 ? [dx / len, dy / len] : [1, 0];
  const normal: Vec2 = len > 0 ? [-dy / len, dx / len] : [0, 1];

  return { x, y, tangent, normal };
}

// ============================================================================
// 公共接口
// ============================================================================

/**
 * EdgeAnchor 预设类型
 */
export type EdgeAnchorPreset = 'start' | 'end' | 'middle' | 'ratio';

/**
 * EdgeAnchor 定义（支持字符串、对象、函数）
 */
export type EdgeAnchorDefinition =
  | EdgeAnchorPreset
  | { name: 'ratio'; args?: { ratio?: number } }
  | { name: 'middle'; args?: EdgeLayoutOffset }
  | ((points: Vec2[]) => EdgeAnchor);

/**
 * 解析 EdgeAnchor 定义为锚点函数
 */
export function resolveEdgeAnchorFunction(definition: EdgeAnchorDefinition): ((points: Vec2[]) => EdgeAnchor) | null {
  if (typeof definition === 'string') {
    switch (definition) {
      case 'start': return startAnchor;
      case 'end': return endAnchor;
      case 'middle': return (pts) => middleAnchor(pts);
      default: return null;
    }
  }

  if (definition && typeof definition === 'object') {
    if (definition.name === 'ratio') {
      const ratio = definition.args?.ratio ?? 0.5;
      return (pts) => ratioAnchor(pts, { ratio });
    }
    if (definition.name === 'middle') {
      return (pts) => middleAnchor(pts, definition.args);
    }
  }

  if (typeof definition === 'function') {
    return definition;
  }

  return null;
}

/**
 * Compute an anchor point along an edge's path.
 * 此函数保留用于向后兼容，内部使用预设锚点系统。
 *
 * @param points - Array of [x, y] coordinates defining the edge path
 * @param opts - Layout options for positioning the anchor
 * @returns The computed anchor point with position, tangent, and normal vectors
 */
export function computeAnchor(points: Vec2[], opts: EdgeLayoutOptions = {}): EdgeAnchor {
  const fallback: Vec2[] = [[0, 0], [0, 0]];
  const pts: Vec2[] = (points && points.length >= 2 ? points : fallback) as Vec2[];

  // total length & segments
  const segs: { a: Vec2; b: Vec2; len: number; dir: Vec2 }[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i] as Vec2;
    const b = pts[i + 1] as Vec2;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const dir: Vec2 = len > 0 ? [dx / len, dy / len] : [1, 0];
    segs.push({ a, b, len, dir });
    total += len;
  }
  if (total === 0) {
    const [tx, ty] = segs[0]?.dir || [1, 0];
    return { x: pts[0][0], y: pts[0][1], tangent: [tx, ty], normal: [-ty as number, tx as number] } as EdgeAnchor;
  }

  // resolve t
  let t = typeof opts.t === 'number' ? Math.min(1, Math.max(0, opts.t)) : undefined;
  if (t === undefined) {
    if (opts.snap === 'start') t = 0;
    else if (opts.snap === 'end') t = 1;
    else t = 0.5; // middle
  }

  // map t -> target length position
  const targetLen = t * total;
  let acc = 0;
  let segIdx = 0;
  if (typeof opts.segmentIndex === 'number') {
    segIdx = Math.min(segs.length - 1, Math.max(0, opts.segmentIndex));
    acc = 0;
    for (let i = 0; i < segIdx; i++) acc += segs[i].len;
  } else {
    for (let i = 0; i < segs.length; i++) {
      if (acc + segs[i].len >= targetLen) { segIdx = i; break; }
      acc += segs[i].len;
    }
  }

  const seg = segs[segIdx];
  const local = seg.len > 0 ? (targetLen - acc) / seg.len : 0;
  const x = seg.a[0] + (seg.b[0] - seg.a[0]) * local;
  const y = seg.a[1] + (seg.b[1] - seg.a[1]) * local;
  const [tx, ty] = seg.dir;
  const nx = -ty as number, ny = tx as number;

  const along = opts.offset?.along ?? 0;
  const normal = opts.offset?.normal ?? 0;

  return {
    x: x + tx * along + nx * normal,
    y: y + ty * along + ny * normal,
    tangent: [tx, ty],
    normal: [nx, ny],
  } as EdgeAnchor;
}
