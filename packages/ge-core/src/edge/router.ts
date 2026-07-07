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

/** A* 避障路由：网格化 + 寻路避开 obstacles */
export const manhattanAStarRouter: RouterFn = (points, options) => {
  const d = dedup(points);
  if (d.length < 2) return d;
  const obstacles = (options?.obstacles as { x: number; y: number; width: number; height: number }[]) ?? [];
  const res = (options?.resolution as number) ?? 10;
  const pad = (options?.padding as number) ?? 5;
  const start = d[0], end = d[d.length - 1];
  const blocked = new Set<string>();
  for (const o of obstacles) {
    const x1 = Math.floor((o.x - pad) / res), y1 = Math.floor((o.y - pad) / res);
    const x2 = Math.ceil((o.x + o.width + pad) / res), y2 = Math.ceil((o.y + o.height + pad) / res);
    for (let gx = x1; gx <= x2; gx++) for (let gy = y1; gy <= y2; gy++) blocked.add(gx + ',' + gy);
  }
  const sx = Math.round(start.x / res), sy = Math.round(start.y / res);
  const ex = Math.round(end.x / res), ey = Math.round(end.y / res);
  blocked.delete(sx + ',' + sy); blocked.delete(ex + ',' + ey);
  const open: { x: number; y: number; g: number; f: number }[] = [];
  const closed = new Set<string>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const h = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey);
  open.push({ x: sx, y: sy, g: 0, f: h(sx, sy) });
  gScore.set(sx + ',' + sy, 0);
  let found = false;
  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const ck = cur.x + ',' + cur.y;
    if (cur.x === ex && cur.y === ey) { found = true; break; }
    closed.add(ck);
    for (const [dxx, dyy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dxx, ny = cur.y + dyy, nk = nx + ',' + ny;
      if (closed.has(nk) || blocked.has(nk)) continue;
      const ng = cur.g + 1;
      if (!gScore.has(nk) || ng < gScore.get(nk)!) {
        gScore.set(nk, ng); cameFrom.set(nk, ck);
        open.push({ x: nx, y: ny, g: ng, f: ng + h(nx, ny) });
      }
    }
  }
  if (!found) return manhattanRouter(d);
  const path: Point[] = [];
  let curKey = ex + ',' + ey;
  while (curKey) {
    const [px, py] = curKey.split(',').map(Number);
    path.unshift({ x: px * res, y: py * res });
    curKey = cameFrom.get(curKey)!;
  }
  const simp: Point[] = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const p = simp[simp.length - 1], c = path[i], n = path[i + 1];
    if (Math.sign(c.x - p.x) === Math.sign(n.x - c.x) && Math.sign(c.y - p.y) === Math.sign(n.y - c.y)) continue;
    simp.push(c);
  }
  simp.push(path[path.length - 1]);
  // 返回严格正交的 grid 路径（起终点对齐 grid，偏移 < resolution/2）
  return simp;
};

export const builtInRouters: Record<string, RouterFn> = {
  normal: normalRouter,
  orthogonal: orthogonalRouter,
  manhattan: manhattanRouter,
  'manhattan-astar': manhattanAStarRouter,
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
