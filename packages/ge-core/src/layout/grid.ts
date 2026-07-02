/**
 * 网格布局：按行列顺序排列。
 */
import type { LayoutNode, Positions, LayoutOptions } from './types';

export interface GridOptions extends LayoutOptions {
  cols?: number;
  gap?: number;
  startX?: number;
  startY?: number;
}

export const gridLayout = (nodes: LayoutNode[], options: GridOptions = {}): Positions => {
  const n = nodes.length;
  const cols = options.cols ?? Math.ceil(Math.sqrt(n));
  const gap = options.gap ?? 160;
  const sx = options.startX ?? 80;
  const sy = options.startY ?? 80;
  const pos: Positions = new Map();
  nodes.forEach((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    pos.set(node.id, { x: sx + col * gap, y: sy + row * gap });
  });
  return pos;
};
