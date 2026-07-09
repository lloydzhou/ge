/**
 * DragPlugin —— 节点/分组拖拽移动（可选 snap to grid）。
 *
 * - 监听 graph 的 pointerdown/move/up（事件冒泡到 Canvas）。
 * - snapGrid > 0 时拖拽吸附网格。
 * - pointermove 直接 moveTo（setAttribute → markDirty），由 Scheduler 在帧边界合并 applyPosition。
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
      // port 拖出连线交给 CreateEdgePlugin，不拖动节点
      const tgt = e.target;
      if (tgt && typeof tgt.className === 'string' && tgt.className.includes('ge-port')) return;
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
      // moveTo → setAttribute → markDirty → Scheduler 帧边界合并 applyPosition
      d.node.moveTo(nx, ny);
    });

    const end = (): void => {
      const node = this.dragging?.node;
      this.dragging = null;
      if (node) {
        // 确保拖拽结束位置立即生效（视觉 + 联动 Edge/Port）
        graph.scheduler?.flush();
        node.dispatchEvent(new CustomEvent('node:dragend', { bubbles: true }));
      }
    };
    graph.addEventListener('pointerup', end);
    graph.addEventListener('pointerupoutside', end);
  }
}
