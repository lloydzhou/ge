/**
 * 力导向布局：Fruchterman-Reingold 简化版。
 * 节点间斥力 + 边吸引力，迭代收敛。连通的节点会相互靠近、整体均匀铺开。
 */
import type { LayoutNode, LayoutEdge, Positions, LayoutOptions } from './types';

export interface ForceOptions extends LayoutOptions {
  iterations?: number;
  /** 理想距离 k，默认按面积/节点数估算 */
  k?: number;
}

export const forceLayout = (
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: ForceOptions = {},
): Positions => {
  const W = options.width ?? 800;
  const H = options.height ?? 600;
  const iters = options.iterations ?? 300;
  const k = options.k ?? Math.sqrt((W * H) / Math.max(1, nodes.length));

  const pos: Positions = new Map();
  nodes.forEach((node) => {
    pos.set(node.id, node.x != null && node.y != null ? { x: node.x, y: node.y } : { x: Math.random() * W, y: Math.random() * H });
  });

  for (let t = 0; t < iters; t++) {
    const disp = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => disp.set(n.id, { x: 0, y: 0 }));

    // 斥力（所有节点对）
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const u = pos.get(nodes[i].id)!;
        const v = pos.get(nodes[j].id)!;
        let dx = u.x - v.x;
        let dy = u.y - v.y;
        let d = Math.hypot(dx, dy);
        if (d < 1e-6) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          d = Math.hypot(dx, dy) || 1;
        }
        const rep = (k * k) / d;
        const du = disp.get(nodes[i].id)!;
        du.x += (dx / d) * rep;
        du.y += (dy / d) * rep;
      }
    }

    // 吸引力（边）
    for (const e of edges) {
      const u = pos.get(e.source);
      const v = pos.get(e.target);
      if (!u || !v) continue;
      let dx = u.x - v.x;
      let dy = u.y - v.y;
      let d = Math.hypot(dx, dy);
      if (d < 1e-6) d = 1e-6;
      const att = (d * d) / k;
      const du = disp.get(e.source);
      const dv = disp.get(e.target);
      if (du) {
        du.x -= (dx / d) * att;
        du.y -= (dy / d) * att;
      }
      if (dv) {
        dv.x += (dx / d) * att;
        dv.y += (dy / d) * att;
      }
    }

    // 应用位移（模拟退火温度）
    const temp = (W / 10) * (1 - t / iters);
    nodes.forEach((n) => {
      const p = pos.get(n.id)!;
      const d = disp.get(n.id)!;
      const dd = Math.hypot(d.x, d.y);
      if (dd < 1e-6) return;
      const limit = Math.min(dd, temp);
      p.x += (d.x / dd) * limit;
      p.y += (d.y / dd) * limit;
    });
  }
  return pos;
};
