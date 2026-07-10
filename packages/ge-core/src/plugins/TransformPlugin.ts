/** 选中集组合变换。 */
import { Plugin } from './plugin';

interface TransformState { draggedId: string; lastX: number; lastY: number; }

export class TransformPlugin extends Plugin {
  readonly name = 'transform';
  private state: TransformState | null = null;
  private readonly onPointerDown = (event: any): void => {
    const selection = this.graph.getPlugin('selection');
    const node = selection && this.graph.pickNode(event.viewportX, event.viewportY);
    const selected = (selection as any)?.getSelected?.() ?? [];
    this.state = node && selected.includes(node.id) && selected.length > 1 ? { draggedId: node.id, lastX: event.canvasX, lastY: event.canvasY } : null;
  };
  private readonly onPointerMove = (event: any): void => {
    if (!this.state) return;
    const dx = event.canvasX - this.state.lastX, dy = event.canvasY - this.state.lastY;
    for (const id of (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? []) {
      if (id === this.state.draggedId) continue;
      const node = this.graph.getNode(id);
      if (node) node.moveTo((node.getAttribute('x') ?? 0) + dx, (node.getAttribute('y') ?? 0) + dy);
    }
    this.state.lastX = event.canvasX;
    this.state.lastY = event.canvasY;
  };
  private readonly onPointerUp = (): void => { this.state = null; };

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
    this.state = null;
    super.destroy();
  }
}
