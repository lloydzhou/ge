/** 节点/分组拖拽移动（可选 snap to grid）。 */
import { CustomEvent } from '@antv/g-lite';
import { Plugin } from './plugin';

interface DragState { node: any; sx: number; sy: number; ox: number; oy: number; }
export interface DragOptions { snapGrid?: number; }

export class DragPlugin extends Plugin {
  readonly name = 'drag';
  private dragging: DragState | null = null;
  private snapGrid: number;
  private readonly onPointerDown = (e: any): void => {
    if (e.altKey || (typeof e.target?.className === 'string' && e.target.className.includes('ge-port'))) return;
    const node = this.graph.pickNode(e.viewportX, e.viewportY);
    if (!node) return;
    const point = this.graph.viewport2Canvas({ x: e.viewportX, y: e.viewportY });
    this.dragging = { node, sx: point.x, sy: point.y, ox: node.getAttribute('x') ?? 0, oy: node.getAttribute('y') ?? 0 };
  };
  private readonly onPointerMove = (e: any): void => {
    if (!this.dragging) return;
    const point = this.graph.viewport2Canvas({ x: e.viewportX, y: e.viewportY });
    let x = this.dragging.ox + point.x - this.dragging.sx;
    let y = this.dragging.oy + point.y - this.dragging.sy;
    if (this.snapGrid > 0) { x = Math.round(x / this.snapGrid) * this.snapGrid; y = Math.round(y / this.snapGrid) * this.snapGrid; }
    this.dragging.node.moveTo(x, y);
  };
  private readonly onPointerUp = (): void => {
    const node = this.dragging?.node;
    this.dragging = null;
    if (!node) return;
    this.graph.scheduler?.flush();
    node.dispatchEvent(new CustomEvent('node:dragend', { bubbles: true }));
  };

  constructor(options: DragOptions = {}) { super(); this.snapGrid = options.snapGrid ?? 0; }

  init(graph: any): void {
    super.init(graph);
    graph.addEventListener('pointerdown', this.onPointerDown);
    graph.addEventListener('pointermove', this.onPointerMove);
    graph.addEventListener('pointerup', this.onPointerUp);
    graph.addEventListener('pointerupoutside', this.onPointerUp);
  }

  destroy(): void {
    this.graph.removeEventListener('pointerdown', this.onPointerDown);
    this.graph.removeEventListener('pointermove', this.onPointerMove);
    this.graph.removeEventListener('pointerup', this.onPointerUp);
    this.graph.removeEventListener('pointerupoutside', this.onPointerUp);
    this.dragging = null;
    super.destroy();
  }
}
