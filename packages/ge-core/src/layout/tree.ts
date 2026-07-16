/**
 * 树布局（tree）：按父子关系递归排列。
 * 适合思维导图 / 组织架构。横向（左→右 LR）或纵向（上→下 TB）。
 */
import type { LayoutNode, LayoutEdge, Positions, LayoutOptions } from './types';

export interface TreeOptions extends LayoutOptions {
  direction?: 'LR' | 'TB';
  nodeGap?: number;
  levelGap?: number;
  startX?: number;
  startY?: number;
}

interface TreeNode {
  id: string;
  children: TreeNode[];
  width: number;
}

export const treeLayout = (
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: TreeOptions = {},
): Positions => {
  const dir = options.direction ?? 'LR';
  const nodeGap = options.nodeGap ?? 60;
  const levelGap = options.levelGap ?? 140;
  const sx = options.startX ?? 80;
  const sy = options.startY ?? 80;

  const nodeIds = new Set(nodes.map((node) => node.id));
  const validEdges = edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  const childrenMap = new Map<string, string[]>();
  const parentSet = new Set<string>();
  nodes.forEach((n) => { if (!childrenMap.has(n.id)) childrenMap.set(n.id, []); });
  validEdges.forEach((e) => {
    if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
    childrenMap.get(e.source)!.push(e.target);
    parentSet.add(e.target);
  });

  const roots = nodes.filter((n) => !parentSet.has(n.id)).map((n) => n.id);
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0].id);

  const build = (id: string, visited: Set<string>): TreeNode => {
    if (visited.has(id)) return { id, children: [], width: 1 };
    visited.add(id);
    const kids = (childrenMap.get(id) || []).map((c) => build(c, visited));
    const width = kids.length === 0 ? 1 : kids.reduce((s, k) => s + k.width, 0);
    return { id, children: kids, width };
  };

  const forest = roots.map((r) => build(r, new Set()));

  let cursor = 0;
  const pos: Positions = new Map();
  const place = (node: TreeNode, depth: number): void => {
    if (node.children.length === 0) {
      if (dir === 'LR') { pos.set(node.id, { x: sx + depth * levelGap, y: sy + cursor * nodeGap }); }
      else { pos.set(node.id, { x: sx + cursor * nodeGap, y: sy + depth * levelGap }); }
      cursor += 1;
    } else {
      const start = cursor;
      node.children.forEach((c) => place(c, depth + 1));
      const mid = (start + cursor - 1) / 2;
      if (dir === 'LR') { pos.set(node.id, { x: sx + depth * levelGap, y: sy + mid * nodeGap }); }
      else { pos.set(node.id, { x: sx + mid * nodeGap, y: sy + depth * levelGap }); }
    }
  };

  forest.forEach((root) => { place(root, 0); cursor += 1; });

  // 孤立节点兜底
  nodes.forEach((n) => { if (!pos.has(n.id)) { pos.set(n.id, { x: sx, y: sy + (cursor++) * nodeGap }); } });

  return pos;
};
