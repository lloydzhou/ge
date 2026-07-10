/** 点击选中与空白拖拽框选。 */
import { Plugin, addClass, removeClass, closestEdge } from './plugin';

export class SelectionPlugin extends Plugin {
  readonly name = 'selection';
  readonly selected = new Set<string>();
  private rubberEl?: HTMLDivElement;
  private rubber: { startX: number; startY: number } | null = null;
  private readonly onPointerDown = (e: any): void => {
    if (e.button !== 0) return;
    const cell = this.graph.pickNode(e.viewportX, e.viewportY);
    const additive = !!(e.shiftKey || e.metaKey || e.ctrlKey);
    if (!cell) {
      const edge = closestEdge(e.target);
      if (edge) { if (additive && this.selected.has(edge.id)) this.deselect(edge.id); else { if (!additive) this.clear(); this.select(edge.id); } return; }
      this.rubber = { startX: e.viewportX, startY: e.viewportY };
      if (!additive) this.clear();
      return;
    }
    if (additive && this.selected.has(cell.id)) this.deselect(cell.id);
    else { if (!additive) this.clear(); this.select(cell.id); }
  };
  private readonly onPointerMove = (e: any): void => {
    if (!this.rubber || !this.rubberEl) return;
    const x = Math.min(this.rubber.startX, e.viewportX), y = Math.min(this.rubber.startY, e.viewportY);
    this.rubberEl.style.left = x + 'px'; this.rubberEl.style.top = y + 'px';
    this.rubberEl.style.width = Math.abs(e.viewportX - this.rubber.startX) + 'px';
    this.rubberEl.style.height = Math.abs(e.viewportY - this.rubber.startY) + 'px';
    this.rubberEl.style.display = 'block';
  };
  private readonly onPointerUp = (e: any): void => {
    if (!this.rubber || !this.rubberEl) return;
    const { startX, startY } = this.rubber;
    this.rubber = null;
    this.rubberEl.style.display = 'none';
    const x1 = Math.min(startX, e.viewportX), y1 = Math.min(startY, e.viewportY);
    const x2 = Math.max(startX, e.viewportX), y2 = Math.max(startY, e.viewportY);
    if (x2 - x1 < 3 && y2 - y1 < 3) return;
    const from = this.graph.viewport2Canvas({ x: x1, y: y1 });
    const to = this.graph.viewport2Canvas({ x: x2, y: y2 });
    const minX = Math.min(from.x, to.x), maxX = Math.max(from.x, to.x);
    const minY = Math.min(from.y, to.y), maxY = Math.max(from.y, to.y);
    for (const node of this.graph.getNodes() as any[]) {
      const box = node.getWorldBBox(), centerX = box.x + box.width / 2, centerY = box.y + box.height / 2;
      if (centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY) this.select(node.id);
    }
  };

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (container && getComputedStyle(container).position === 'static') container.style.position = 'relative';
    this.rubberEl = document.createElement('div');
    this.rubberEl.style.cssText = 'position:absolute;border:1px solid #1890ff;background:rgba(24,144,255,.1);z-index:9;display:none;pointer-events:none;';
    container?.appendChild(this.rubberEl);
    graph.addEventListener('pointerdown', this.onPointerDown);
    graph.addEventListener('pointermove', this.onPointerMove);
    graph.addEventListener('pointerup', this.onPointerUp);
    graph.addEventListener('pointerupoutside', this.onPointerUp);
  }

  select(id: string): void { this.selected.add(id); addClass(this.graph.getNode(id), 'selected'); }
  deselect(id: string): void { this.selected.delete(id); removeClass(this.graph.getNode(id), 'selected'); }
  clear(): void { for (const id of [...this.selected]) this.deselect(id); }
  getSelected(): string[] { return [...this.selected]; }

  destroy(): void {
    this.graph.removeEventListener('pointerdown', this.onPointerDown);
    this.graph.removeEventListener('pointermove', this.onPointerMove);
    this.graph.removeEventListener('pointerup', this.onPointerUp);
    this.graph.removeEventListener('pointerupoutside', this.onPointerUp);
    this.rubberEl?.remove();
    this.rubberEl = undefined;
    this.rubber = null;
    super.destroy();
  }
}
