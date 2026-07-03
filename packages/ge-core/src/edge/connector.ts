/**
 * Connector：将折线点序列转为 SVG path 的 `d` 字符串。
 * 渲染层（g-lite Path）通过 setAttribute('d', ...) 原地更新，
 * 不再销毁重建 primaryShape（修复 P0-2）。
 *
 * - normal / polyline：直线段
 * - rounded：折线 + 圆角拐角（二次贝塞尔近似）
 * - smooth：Catmull-Rom 转三次贝塞尔平滑
 */
import type { Point } from '../utils/types';
import { distance } from '../utils/math';

export interface ConnectorOptions {
  /** rounded 拐角半径 */
  radius?: number;
  /** smooth 张力（默认 1 = Catmull-Rom） */
  tension?: number;
  [key: string]: any;
}

export type ConnectorFn = (points: Point[], options?: ConnectorOptions) => string;

const fmt = (n: number): string => (+n.toFixed(3)).toString();
const moveTo = (p: Point): string => `M ${fmt(p.x)} ${fmt(p.y)}`;
const lineTo = (p: Point): string => `L ${fmt(p.x)} ${fmt(p.y)}`;

export const normalConnector: ConnectorFn = (points) => {
  if (points.length === 0) return '';
  return [moveTo(points[0]), ...points.slice(1).map(lineTo)].join(' ');
};

/** polyline 与 normal 行为一致（保留语义别名） */
export const polylineConnector: ConnectorFn = normalConnector;

export const roundedConnector: ConnectorFn = (points, options = {}) => {
  const radius = options.radius ?? 8;
  if (points.length < 3) return normalConnector(points);
  let d = moveTo(points[0]);
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const inLen = distance(cur, prev);
    const outLen = distance(cur, next);
    if (inLen === 0 || outLen === 0) {
      d += ` ${lineTo(cur)}`;
      continue;
    }
    const r = Math.max(0, Math.min(radius, inLen / 2, outLen / 2));
    const A = {
      x: cur.x + ((prev.x - cur.x) * r) / inLen,
      y: cur.y + ((prev.y - cur.y) * r) / inLen,
    };
    const B = {
      x: cur.x + ((next.x - cur.x) * r) / outLen,
      y: cur.y + ((next.y - cur.y) * r) / outLen,
    };
    d += ` L ${fmt(A.x)} ${fmt(A.y)}`;
    d += ` Q ${fmt(cur.x)} ${fmt(cur.y)} ${fmt(B.x)} ${fmt(B.y)}`;
  }
  d += ` ${lineTo(points[points.length - 1])}`;
  return d;
};

export const smoothConnector: ConnectorFn = (points, options = {}) => {
  const tension = options.tension ?? 1;
  if (points.length < 3) return normalConnector(points);
  let d = moveTo(points[0]);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? points[i + 1];
    const cp1 = {
      x: p1.x + ((p2.x - p0.x) / 6) * tension,
      y: p1.y + ((p2.y - p0.y) / 6) * tension,
    };
    const cp2 = {
      x: p2.x - ((p3.x - p1.x) / 6) * tension,
      y: p2.y - ((p3.y - p1.y) / 6) * tension,
    };
    d += ` C ${fmt(cp1.x)} ${fmt(cp1.y)} ${fmt(cp2.x)} ${fmt(cp2.y)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return d;
};

export const builtInConnectors: Record<string, ConnectorFn> = {
  normal: normalConnector,
  polyline: polylineConnector,
  rounded: roundedConnector,
  smooth: smoothConnector,
};

// ---- Connector 注册表 ----
export class ConnectorRegistry {
  private readonly map = new Map<string, ConnectorFn>();
  register(name: string, fn: ConnectorFn): this {
    this.map.set(name, fn);
    return this;
  }
  resolve(name: string): ConnectorFn {
    return this.map.get(name) ?? this.map.get('normal')!;
  }
  has(name: string): boolean {
    return this.map.has(name);
  }
  list(): string[] {
    return [...this.map.keys()];
  }
}

export const createDefaultConnectorRegistry = (): ConnectorRegistry => {
  const r = new ConnectorRegistry();
  for (const [name, fn] of Object.entries(builtInConnectors)) r.register(name, fn);
  return r;
};

// ---- 原地更新能力（修复 P0-2） ----
/** 最小 path 接口，便于单测，同时兼容 g-lite 的 Path（setAttribute('d', ...)） */
export interface PathLike {
  setAttribute(name: 'd' | string, value: string): void;
}

/**
 * 用指定 connector 重新生成 path `d` 并原地写回，避免销毁重建 shape。
 */
export const updatePath = (
  path: PathLike,
  points: Point[],
  connector: ConnectorFn,
  options?: ConnectorOptions,
): void => {
  path.setAttribute('d', connector(points, options));
};
