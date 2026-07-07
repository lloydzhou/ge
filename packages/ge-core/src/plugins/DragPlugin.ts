/**
 * DragPlugin —— 节点/分组拖拽移动（可选 snap to grid）。
 *
 * - 监听 graph 的 pointerdown/move/up（事件冒泡到 Canvas）。
 * - snapGrid > 0 时拖拽吸附网格。
 * - 拖拽时调用 node.moveTo，触发 `node:boundschange`，相连 Edge 自动重算路径。
 * - pointermove 经 rAF 合并（每帧最多 1 次 moveTo），避免高频事件导致卡顿。
 */
import { CustomEvent } from '@antv/g-lite';
import { Plugin, closestCell } from './plugin';

interface DragState {
  node: any;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  /** rAF 合并用的最新目标坐标 */
  lastX: number;
  lastY: number;
}

export interface DragOptions {
  /** 网格吸附大小（0 = 不吸附） */
  snapGrid?: number;
}

export class DragPlugin extends Plugin {
  readonly name = 'drag';
  private dragging: DragState | null = null;
  private snapGrid: number;
  private rafId: number | null = null;

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
      const ox = (node.getAttribute('x') as number) ?? 0;
      const oy = (node.getAttribute('y') as number) ?? 0;
      this.dragging = { node, sx: w.x, sy: w.y, ox, oy, lastX: ox, lastY: oy };
    });

    graph.addEventListener('pointermove', (e: any) => {
      if (!this.dragging) return;
      const d = this.dragging;
      const w = graph.viewport2Canvas({ x: e.viewportX, y: e.viewportY });
      // 仅记录最新目标坐标，rAF 内合并执行（避免高频 pointermove 每次同步 moveTo）
      d.lastX = d.ox + (w.x - d.sx);
      d.lastY = d.oy + (w.y - d.sy);
      if (this.rafId != null) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        const dd = this.dragging;
        if (!dd) return;
        let nx = dd.lastX, ny = dd.lastY;
        if (this.snapGrid > 0) {
          nx = Math.round(nx / this.snapGrid) * this.snapGrid;
          ny = Math.round(ny / this.snapGrid) * this.snapGrid;
        }
        dd.node.moveTo(nx, ny);
      });
    });

    const end = (): void => {
      if (this.rafId != null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
      // 拖拽结束前确保最后一帧的位置已应用
      const d = this.dragging;
      const node = d?.node;
      if (d && node) {
        let nx = d.lastX, ny = d.lastY;
        if (this.snapGrid > 0) {
          nx = Math.round(nx / this.snapGrid) * this.snapGrid;
          ny = Math.round(ny / this.snapGrid) * this.snapGrid;
        }
        node.moveTo(nx, ny);
      }
      this.dragging = null;
      if (node) node.dispatchEvent(new CustomEvent('node:dragend', { bubbles: true }));
    };
    graph.addEventListener('pointerup', end);
    graph.addEventListener('pointerupoutside', end);
  }

  destroy(): void {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.dragging = null;
    super.destroy();
  }
}
