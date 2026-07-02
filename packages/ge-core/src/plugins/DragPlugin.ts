/**
 * DragPlugin —— 节点/分组拖拽移动。
 *
 * - 监听 graph 的 pointerdown/move/up（事件冒泡到 Canvas）。
 * - 拖拽时调用 node.moveTo，触发 `node:boundschange`，
 *   相连 Edge 通过既有事件机制自动重算路径（验证事件驱动联动）。
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

export class DragPlugin extends Plugin {
  readonly name = 'drag';
  private dragging: DragState | null = null;

  init(graph: any): void {
    super.init(graph);

    graph.addEventListener('pointerdown', (e: any) => {
      const node = closestCell(e.target);
      if (!node) return;
      this.dragging = {
        node,
        sx: e.canvasX,
        sy: e.canvasY,
        ox: (node.getAttribute('x') as number) ?? 0,
        oy: (node.getAttribute('y') as number) ?? 0,
      };
    });

    graph.addEventListener('pointermove', (e: any) => {
      if (!this.dragging) return;
      const d = this.dragging;
      d.node.moveTo(d.ox + (e.canvasX - d.sx), d.oy + (e.canvasY - d.sy));
    });

    const end = (): void => {
      const node = this.dragging?.node;
      this.dragging = null;
      if (node) {
        // 派发拖拽结束事件，供 History 等记录
        node.dispatchEvent(new CustomEvent('node:dragend'));
      }
    };
    graph.addEventListener('pointerup', end);
    graph.addEventListener('pointerupoutside', end);
  }
}
