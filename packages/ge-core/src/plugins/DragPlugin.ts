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
      if (e.altKey) return; // 触发键按下时交给 CreateEdge 接管连线创建
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
      d.node.moveTo(d.ox + (w.x - d.sx), d.oy + (w.y - d.sy));
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
