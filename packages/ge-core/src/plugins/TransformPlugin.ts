/**
 * TransformPlugin —— 选中集组合变换。
 *
 * - 多选拖拽时：被拖节点由 DragPlugin 移动，其余选中节点由本插件同步偏移，
 *   实现选中集整体平移。
 * - 依赖 SelectionPlugin（多选）+ DragPlugin。
 */
import { Plugin, closestCell } from './plugin';

interface TransformState {
  draggedId: string;
  lastX: number;
  lastY: number;
}

export class TransformPlugin extends Plugin {
  readonly name = 'transform';
  private state: TransformState | null = null;

  init(graph: any): void {
    super.init(graph);

    graph.addEventListener('pointerdown', (e: any) => {
      const sel = graph.getPlugin('selection');
      if (!sel) return;
      const node = graph.pickNode(e.viewportX, e.viewportY);
      if (!node) return;
      const selected = sel.getSelected?.() ?? [];
      if (!selected.includes(node.id) || selected.length <= 1) {
        this.state = null;
        return;
      }
      this.state = { draggedId: node.id, lastX: e.canvasX, lastY: e.canvasY };
    });

    graph.addEventListener('pointermove', (e: any) => {
      if (!this.state) return;
      const dx = e.canvasX - this.state.lastX;
      const dy = e.canvasY - this.state.lastY;
      const selected = (graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
      for (const id of selected) {
        if (id === this.state.draggedId) continue; // 被拖节点交给 DragPlugin
        const n = graph.getNode(id);
        if (n) n.moveTo((n.getAttribute('x') ?? 0) + dx, (n.getAttribute('y') ?? 0) + dy);
      }
      this.state.lastX = e.canvasX;
      this.state.lastY = e.canvasY;
    });

    const end = (): void => {
      this.state = null;
    };
    graph.addEventListener('pointerup', end);
    graph.addEventListener('pointerupoutside', end);
  }
}
