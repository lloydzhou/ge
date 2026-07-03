/**
 * SelectionPlugin —— 点击选中 + 空白拖拽框选。
 *
 * - 单击节点：选中（Shift/Cmd/Ctrl 多选切换）
 * - 空白左键拖拽：框选（橡皮筋），释放选中框内节点
 * - 选中通过 className 'selected' 触发（DOM 风格）
 */
import { Plugin, addClass, removeClass, closestEdge } from './plugin';

export class SelectionPlugin extends Plugin {
  readonly name = 'selection';
  readonly selected = new Set<string>();
  private rubberEl?: HTMLDivElement;
  private rubber: { startX: number; startY: number } | null = null;

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (container && getComputedStyle(container).position === 'static') container.style.position = 'relative';
    this.rubberEl = document.createElement('div');
    this.rubberEl.style.cssText =
      'position:absolute;border:1px solid #1890ff;background:rgba(24,144,255,.1);z-index:9;display:none;pointer-events:none;';
    container?.appendChild(this.rubberEl);

    graph.addEventListener('pointerdown', (e: any) => {
      if (e.button !== 0) return; // 只左键
      const cell = graph.pickNode(e.viewportX, e.viewportY);
      const additive = !!(e.shiftKey || e.metaKey || e.ctrlKey);
      if (!cell) {
        const edge = closestEdge(e.target);
        if (edge) {
          if (additive) { if (this.selected.has(edge.id)) this.deselect(edge.id); else this.select(edge.id); }
          else { this.clear(); this.select(edge.id); }
          return;
        }
        this.rubber = { startX: e.viewportX, startY: e.viewportY };
        if (!additive) this.clear();
        return;
      }
      const id = cell.id;
      if (additive) {
        if (this.selected.has(id)) this.deselect(id);
        else this.select(id);
      } else {
        this.clear();
        this.select(id);
      }
    });

    graph.addEventListener('pointermove', (e: any) => {
      if (!this.rubber || !this.rubberEl) return;
      const x = Math.min(this.rubber.startX, e.viewportX);
      const y = Math.min(this.rubber.startY, e.viewportY);
      const w = Math.abs(e.viewportX - this.rubber.startX);
      const h = Math.abs(e.viewportY - this.rubber.startY);
      this.rubberEl.style.left = x + 'px';
      this.rubberEl.style.top = y + 'px';
      this.rubberEl.style.width = w + 'px';
      this.rubberEl.style.height = h + 'px';
      this.rubberEl.style.display = 'block';
    });

    const end = (e: any): void => {
      if (!this.rubber || !this.rubberEl) return;
      this.rubberEl.style.display = 'none';
      const x1 = Math.min(this.rubber.startX, e.viewportX);
      const y1 = Math.min(this.rubber.startY, e.viewportY);
      const x2 = Math.max(this.rubber.startX, e.viewportX);
      const y2 = Math.max(this.rubber.startY, e.viewportY);
      this.rubber = null;
      if (x2 - x1 < 3 && y2 - y1 < 3) return; // 点击（非拖拽）
      // 框选：视口框 → 世界框 → 选中中心在框内的节点
      const w1 = graph.viewport2Canvas({ x: x1, y: y1 });
      const w2 = graph.viewport2Canvas({ x: x2, y: y2 });
      const minX = Math.min(w1.x, w2.x), maxX = Math.max(w1.x, w2.x);
      const minY = Math.min(w1.y, w2.y), maxY = Math.max(w1.y, w2.y);
      for (const n of graph.getNodes() as any[]) {
        const bb = n.getWorldBBox();
        const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
        if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) this.select(n.id);
      }
    };
    graph.addEventListener('pointerup', end);
    graph.addEventListener('pointerupoutside', end);
  }

  select(id: string): void {
    this.selected.add(id);
    addClass(this.graph.getNode(id), 'selected');
  }

  deselect(id: string): void {
    this.selected.delete(id);
    removeClass(this.graph.getNode(id), 'selected');
  }

  clear(): void {
    for (const id of [...this.selected]) this.deselect(id);
  }

  getSelected(): string[] {
    return [...this.selected];
  }

  destroy(): void {
    this.rubberEl?.remove();
  }
}
