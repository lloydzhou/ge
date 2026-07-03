/**
 * 层次布局（hierarchical / dagre 简化版）：
 * 按有向边的拓扑分层，同层水平排列，层间垂直递增。
 * 适合流程图 / DAG。仅处理无环情况（含环时按访问序降级处理）。
 */
import type { LayoutNode, LayoutEdge, Positions, LayoutOptions } from './types';

export interface HierarchicalOptions extends LayoutOptions {
  layerGap?: number;
  nodeGap?: number;
  startX?: number;
  startY?: number;
}

export const hierarchicalLayout = (
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: HierarchicalOptions = {},
): Positions => {
  const layerGap = options.layerGap ?? 110;
  const nodeGap = options.nodeGap ?? 140;
  const sx = options.startX ?? 80;
  const sy = options.startY ?? 80;

  const indeg = new Map<string, number>();
  const depth = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => {
    indeg.set(n.id, 0);
    depth.set(n.id, 0);
  });
  edges.forEach((e) => {
    if (!indeg.has(e.target)) indeg.set(e.target, 0);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  });

  // BFS 计算深度
  const queue: string[] = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const next of adj.get(id) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 0, (depth.get(id) ?? 0) + 1));
      queue.push(next);
    }
  }
  // 未访问节点（孤立/环）放到最大层 +1 兜底
  let maxDepth = 0;
  depth.forEach((d) => (maxDepth = Math.max(maxDepth, d)));
  nodes.forEach((n) => {
    if (!visited.has(n.id)) depth.set(n.id, maxDepth + 1);
  });

  // 按层分组排列
  const layers = new Map<number, string[]>();
  nodes.forEach((n) => {
    const d = depth.get(n.id) ?? 0;
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(n.id);
  });

  const pos: Positions = new Map();
  layers.forEach((ids, d) => {
    const totalW = (ids.length - 1) * nodeGap;
    ids.forEach((id, i) => {
      pos.set(id, { x: sx + i * nodeGap - totalW / 2, y: sy + d * layerGap });
    });
  });
  return pos;
};
