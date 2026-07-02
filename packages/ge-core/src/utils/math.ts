/**
 * 向量 / 标量数学运算 —— 全部为纯函数，无副作用，可安全单测。
 */
import type { Point } from './types';

export const vec = (x: number, y: number): Point => ({ x, y });

export const clone = (a: Point): Point => ({ x: a.x, y: a.y });

export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (a: Point, s: number): Point => ({ x: a.x * s, y: a.y * s });

export const negate = (a: Point): Point => ({ x: -a.x, y: -a.y });

export const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;

/** 二维叉积（标量） */
export const cross = (a: Point, b: Point): number => a.x * b.y - a.y * b.x;

export const length = (a: Point): number => Math.hypot(a.x, a.y);

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** 单位向量；零向量返回 (0,0) */
export const normalize = (a: Point): Point => {
  const l = length(a);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};

/** a -> b 的方向角（弧度，[-PI, PI]） */
export const angle = (a: Point, b: Point): number => Math.atan2(b.y - a.y, b.x - a.x);

/** 线性插值 a + (b - a) * t */
export const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export const equals = (a: Point, b: Point, eps = 1e-6): boolean =>
  Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;

export const rad2deg = (r: number): number => (r * 180) / Math.PI;

export const deg2rad = (d: number): number => (d * Math.PI) / 180;
