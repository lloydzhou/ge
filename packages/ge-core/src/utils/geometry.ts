/**
 * 平面几何运算 —— 点/线段/包围盒相关，纯函数。
 * Anchor / Router / Connector 共用。
 */
import type { Point, BBox, BBoxCorners } from './types';
import { add, sub, dot, cross, scale, distance } from './math';

export const EPS = 1e-6;

/** 点是否在 bbox 内（含边界） */
export const isPointInBBox = (p: Point, b: BBox): boolean =>
  p.x >= b.x - EPS && p.x <= b.x + b.width + EPS &&
  p.y >= b.y - EPS && p.y <= b.y + b.height + EPS;

export const bboxCenter = (b: BBox): Point => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
});

export const bboxCorners = (b: BBox): BBoxCorners => ({
  center: bboxCenter(b),
  topLeft: { x: b.x, y: b.y },
  topRight: { x: b.x + b.width, y: b.y },
  bottomLeft: { x: b.x, y: b.y + b.height },
  bottomRight: { x: b.x + b.width, y: b.y + b.height },
});

/** 由一组点构造 bbox；空点集返回零包围盒 */
export const bboxFromPoints = (points: Point[]): BBox => {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

/** 合并两个 bbox */
export const mergeBBox = (a: BBox, b: BBox): BBox => {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

/** 膨胀 bbox */
export const expandBBox = (b: BBox, padding: number): BBox => ({
  x: b.x - padding,
  y: b.y - padding,
  width: b.width + padding * 2,
  height: b.height + padding * 2,
});

/** 点 p 在线段 [a,b] 上的最近点 */
export const closestPointOnSegment = (p: Point, a: Point, b: Point): Point => {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  if (len2 < EPS) return clone2(a);
  const t = clamp(dot(sub(p, a), ab) / len2, 0, 1);
  return add(a, scale(ab, t));
};

/** 点到线段的距离 */
export const distanceToSegment = (p: Point, a: Point, b: Point): number =>
  distance(p, closestPointOnSegment(p, a, b));

/**
 * 两线段 [p1,p2] 与 [p3,p4] 的交点，不相交返回 null。
 */
export const segmentIntersect = (
  p1: Point, p2: Point, p3: Point, p4: Point,
): Point | null => {
  const d = sub(p2, p1);
  const e = sub(p4, p3);
  const denom = cross(d, e);
  if (Math.abs(denom) < EPS) return null; // 平行
  const t = cross(sub(p3, p1), e) / denom;
  const u = cross(sub(p3, p1), d) / denom;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return add(p1, scale(d, t));
};

/**
 * 从 bbox 内的 center 点出发，沿「center -> direction」射线，求与 bbox 边框的交点。
 * 常用于：让连线从节点边缘出发，而非中心。
 */
export const getBBoxEdgePoint = (center: Point, direction: Point, b: BBox): Point => {
  const dx = direction.x - center.x;
  const dy = direction.y - center.y;
  if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) return center;
  const minX = b.x;
  const maxX = b.x + b.width;
  const minY = b.y;
  const maxY = b.y + b.height;
  const candidates: Point[] = [];
  if (Math.abs(dx) > EPS) {
    for (const ex of [minX, maxX]) {
      const t = (ex - center.x) / dx;
      if (t >= -EPS) {
        const y = center.y + t * dy;
        if (y >= minY - EPS && y <= maxY + EPS) candidates.push({ x: ex, y });
      }
    }
  }
  if (Math.abs(dy) > EPS) {
    for (const ey of [minY, maxY]) {
      const t = (ey - center.y) / dy;
      if (t >= -EPS) {
        const x = center.x + t * dx;
        if (x >= minX - EPS && x <= maxX + EPS) candidates.push({ x, y: ey });
      }
    }
  }
  if (candidates.length === 0) return center;
  candidates.sort((m, n) => distance(center, m) - distance(center, n));
  return candidates[0];
};

/**
 * 按指定角度（弧度）从 bbox center 射出，求与边缘的交点。
 */
export const getBBoxEdgePointByAngle = (center: Point, rad: number, b: BBox): Point => {
  const dir = { x: center.x + Math.cos(rad), y: center.y + Math.sin(rad) };
  return getBBoxEdgePoint(center, dir, b);
};

/** 点在直线上的投影比例 t（沿 a->b） */
export const pointProjectionT = (p: Point, a: Point, b: Point): number => {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  if (len2 < EPS) return 0;
  return dot(sub(p, a), ab) / len2;
};

// ---- 局部工具 ----
const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

const clone2 = (a: Point): Point => ({ x: a.x, y: a.y });
