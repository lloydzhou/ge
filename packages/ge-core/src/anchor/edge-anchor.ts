/**
 * 线性锚点：沿 edge 路径点序列按长度定位。
 * 用于标签、箭头、沿线交互点等。
 */
import type { Point } from '../utils/types';
import { distance } from '../utils/math';
import type { EdgeAnchorFn } from './types';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 路径总长度（折线累加） */
export const pathLength = (points: Point[]): number => {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += distance(points[i - 1], points[i]);
  return len;
};

/** 按 t∈[0,1] 沿路径长度取点（默认 0.5 中点） */
export const edgeAnchorRatio: EdgeAnchorFn = (points, args = {}) => {
  const t = clamp01(args.t ?? 0.5);
  const total = pathLength(points);
  let target = total * t;
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { ...points[0] };
  for (let i = 1; i < points.length; i++) {
    const segLen = distance(points[i - 1], points[i]);
    if (target <= segLen + 1e-9 || i === points.length - 1) {
      const k = segLen < 1e-9 ? 0 : target / segLen;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * k,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * k,
      };
    }
    target -= segLen;
  }
  return { ...points[points.length - 1] };
};

/** 按绝对长度（从起点）取点 */
export const edgeAnchorLength: EdgeAnchorFn = (points, args = {}) => {
  const total = pathLength(points);
  return edgeAnchorRatio(points, { t: total === 0 ? 0 : (args.length ?? 0) / total });
};

/** 路径中点 */
export const edgeAnchorMid: EdgeAnchorFn = (points) => edgeAnchorRatio(points, { t: 0.5 });

/** 在指定段的 t 位置取点 */
export const edgeAnchorSegment: EdgeAnchorFn = (points, args = {}) => {
  const idx = Math.min(Math.max(args.segmentIndex ?? 0, 0), points.length - 2);
  const a = points[idx];
  const b = points[idx + 1];
  if (!a || !b) return a ? { ...a } : { x: 0, y: 0 };
  const t = args.segmentT ?? 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
};

export const builtInEdgeAnchors: Record<string, EdgeAnchorFn> = {
  ratio: edgeAnchorRatio,
  length: edgeAnchorLength,
  mid: edgeAnchorMid,
  segment: edgeAnchorSegment,
};
