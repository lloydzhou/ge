/**
 * 圆形布局：节点均匀分布在圆周上。
 */
import type { LayoutNode, Positions, LayoutOptions } from './types';

export interface CircularOptions extends LayoutOptions {
  cx?: number;
  cy?: number;
  radius?: number;
}

export const circularLayout = (nodes: LayoutNode[], options: CircularOptions = {}): Positions => {
  const n = nodes.length;
  const cx = options.cx ?? 400;
  const cy = options.cy ?? 300;
  const radius = options.radius ?? Math.max(120, n * 30);
  const pos: Positions = new Map();
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, n);
    pos.set(node.id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  });
  return pos;
};
