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
const ASTAR_GRID_LIMIT = 1000;

export const manhattanAStarRouter: RouterFn = (points, options) => {
  const d = dedup(points);
  if (d.length < 2) return d;
  const obstacles = (options?.obstacles as { x: number; y: number; width: number; height: number }[]) ?? [];
  const res = (options?.resolution as number) ?? 10;
  if (!Number.isFinite(res) || res <= 0) return manhattanRouter(d);
  const pad = (options?.padding as number) ?? 5;
  const start = d[0], end = d[d.length - 1];
  const sx = Math.round(start.x / res), sy = Math.round(start.y / res);
  const ex = Math.round(end.x / res), ey = Math.round(end.y / res);
  const gridArea = (Math.abs(ex - sx) + 1) * (Math.abs(ey - sy) + 1);
  if (!Number.isFinite(gridArea) || gridArea > ASTAR_GRID_LIMIT) return manhattanRouter(d);
  const blocked = new Set<string>();
  let blockedArea = 0;
  for (const o of obstacles) {
    const x1 = Math.floor((o.x - pad) / res), y1 = Math.floor((o.y - pad) / res);
    const x2 = Math.ceil((o.x + o.width + pad) / res), y2 = Math.ceil((o.y + o.height + pad) / res);
    const obstacleArea = (x2 - x1 + 1) * (y2 - y1 + 1);
    blockedArea += obstacleArea;
    if (!Number.isFinite(obstacleArea) || obstacleArea < 0 || blockedArea > ASTAR_GRID_LIMIT) {
      return manhattanRouter(d);
    }
    for (let gx = x1; gx <= x2; gx++) for (let gy = y1; gy <= y2; gy++) blocked.add(gx + ',' + gy);
  }
  blocked.delete(sx + ',' + sy); blocked.delete(ex + ',' + ey);
  // 最小堆优先队列：O(log N) push/pop，替代线性查找 O(N²)
  const heap: any[] = [];
  const hpush = (it: any) => {
    heap.push(it); let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
  };
  const hpop = (): any => {
    if (!heap.length) return; const top = heap[0]; const last = heap.pop()!;
    if (heap.length) { heap[0] = last; let i = 0, n = heap.length;
      while (true) { let m = i, l = i * 2 + 1, r = l + 1;
        if (l < n && heap[l].f < heap[m].f) m = l; if (r < n && heap[r].f < heap[m].f) m = r;
        if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } }
    return top;
  };
  const closed = new Set<string>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const h = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey);
  hpush({ x: sx, y: sy, g: 0, f: h(sx, sy), dx: 0, dy: 0 });
  gScore.set(sx + ',' + sy, 0);
  let found = false;
  const dl = performance.now() + 15; // 15ms 时间上限
  while (heap.length > 0) {
    if (performance.now() > dl) break;
    const cur = hpop();
    const ck = cur.x + ',' + cur.y;
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.x === ex && cur.y === ey) { found = true; break; }
    for (const [dxx, dyy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dxx, ny = cur.y + dyy, nk = nx + ',' + ny;
      if (closed.has(nk) || blocked.has(nk)) continue;
      // 转弯惩罚：方向变化 +1 代价，A* 倾向直线（L/Z 形），避免锯齿阶梯
      const turned = cur.g > 0 && (cur.dx !== dxx || cur.dy !== dyy);
      const ng = cur.g + 1 + (turned ? 1 : 0);
      if (!gScore.has(nk) || ng < gScore.get(nk)!) {
        gScore.set(nk, ng); cameFrom.set(nk, ck);
        hpush({ x: nx, y: ny, g: ng, f: ng + h(nx, ny), dx: dxx, dy: dyy });
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
  // 路径简化：跳过共线中间点
  const simp: Point[] = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const p = simp[simp.length - 1], c = path[i], n = path[i + 1];
    if ((p.x === c.x && c.x === n.x) || (p.y === c.y && c.y === n.y)) continue;
    simp.push(c);
  }
  simp.push(path[path.length - 1]);
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
