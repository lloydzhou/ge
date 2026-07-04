/**
 * DragPlugin —— 节点/分组拖拽移动（可选 snap to grid）。
 *
 * - 监听 graph 的 pointerdown/move/up（事件冒泡到 Canvas）。
 * - snapGrid > 0 时拖拽吸附网格。
 * - 拖拽时调用 node.moveTo，触发 `node:boundschange`，相连 Edge 自动重算路径。
 */
import { CustomEvent } from '@antv/g-lite';
import { Plugin, closestCell } from './plugin';

interface DragState {
  node: any;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
}

export interface DragOptions {
  /** 网格吸附大小（0 = 不吸附） */
  snapGrid?: number;
}

export class DragPlugin extends Plugin {
  readonly name = 'drag';
  private dragging: DragState | null = null;
  private snapGrid: number;

  constructor(options: DragOptions = {}) {
    super();
    this.snapGrid = options.snapGrid ?? 0;
  }

  init(graph: any): void {
    super.init(graph);

    graph.addEventListener('pointerdown', (e: any) => {
      if (e.altKey) return;
      const node = graph.pickNode(e.viewportX, e.viewportY);
      if (!node) return;
      const w = graph.viewport2Canvas({ x: e.viewportX, y: e.viewportY });
      this.dragging = {
        node,
        sx: w.x,
        sy: w.y,
        ox: (node.getAttribute('x') as number) ?? 0,
        oy: (node.getAttribute('y') as number) ?? 0,
      };
    });

    graph.addEventListener('pointermove', (e: any) => {
      if (!this.dragging) return;
      const d = this.dragging;
      const w = graph.viewport2Canvas({ x: e.viewportX, y: e.viewportY });
      let nx = d.ox + (w.x - d.sx);
      let ny = d.oy + (w.y - d.sy);
      if (this.snapGrid > 0) {
        nx = Math.round(nx / this.snapGrid) * this.snapGrid;
        ny = Math.round(ny / this.snapGrid) * this.snapGrid;
      }
      d.node.moveTo(nx, ny);
    });

    const end = (): void => {
      const node = this.dragging?.node;
      this.dragging = null;
      if (node) node.dispatchEvent(new CustomEvent('node:dragend'));
    };
    graph.addEventListener('pointerup', end);
    graph.addEventListener('pointerupoutside', end);
  }
}
