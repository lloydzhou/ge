/**
 * Router：将控制点序列（锚点 + waypoint）路由为最终折线点序列。
 * 全部为纯函数，核心逻辑可无 DOM 单测。
 *
 * - normal：原样（去重）
 * - orthogonal：任意序列正交化（每段仅水平或垂直）
 * - manhattan：自动连线 Z 形（H-V-H，以中点转折）
 */
import type { Point } from '../utils/types';
import { EPS } from '../utils/geometry';

export interface RouterOptions {
  [key: string]: any;
}

export type RouterFn = (points: Point[], options?: RouterOptions) => Point[];

/** 去除连续重复点 */
const dedup = (pts: Point[]): Point[] => {
  const out: Point[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > EPS || Math.abs(last.y - p.y) > EPS) out.push({ ...p });
  }
  return out;
};

export const normalRouter: RouterFn = (points) => dedup(points);

export const orthogonalRouter: RouterFn = (points) => {
  const d = dedup(points);
  if (d.length < 2) return d;
  const out: Point[] = [{ ...d[0] }];
  for (let i = 0; i < d.length - 1; i++) {
    const a = d[i];
    const b = d[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) < EPS || Math.abs(dy) < EPS) {
      out.push({ ...b });
    } else if (Math.abs(dx) >= Math.abs(dy)) {
      out.push({ x: b.x, y: a.y });
      out.push({ ...b });
    } else {
      out.push({ x: a.x, y: b.y });
      out.push({ ...b });
    }
  }
  return dedup(out);
};

export const manhattanRouter: RouterFn = (points) => {
  const d = dedup(points);
  if (d.length < 2) return d;
  const out: Point[] = [{ ...d[0] }];
  for (let i = 0; i < d.length - 1; i++) {
    const a = d[i];
    const b = d[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) < EPS || Math.abs(dy) < EPS) {
      out.push({ ...b });
      continue;
    }
    const midX = a.x + dx / 2;
    out.push({ x: midX, y: a.y });
    out.push({ x: midX, y: b.y });
    out.push({ ...b });
  }
  return dedup(out);
};

export const builtInRouters: Record<string, RouterFn> = {
  normal: normalRouter,
  orthogonal: orthogonalRouter,
  manhattan: manhattanRouter,
};

// ---- Router 注册表 ----
export class RouterRegistry {
  private readonly map = new Map<string, RouterFn>();
  register(name: string, fn: RouterFn): this {
    this.map.set(name, fn);
    return this;
  }
  resolve(name: string): RouterFn {
    return this.map.get(name) ?? this.map.get('normal')!;
  }
  has(name: string): boolean {
    return this.map.has(name);
  }
  list(): string[] {
    return [...this.map.keys()];
  }
}

export const createDefaultRouterRegistry = (): RouterRegistry => {
  const r = new RouterRegistry();
  for (const [name, fn] of Object.entries(builtInRouters)) r.register(name, fn);
  return r;
};
