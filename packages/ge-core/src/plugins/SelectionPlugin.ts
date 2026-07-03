/**
 * SelectionPlugin —— 点击选中节点/分组。
 *
 * - 单击：选中目标，清除其余；点空白：清空。
 * - Shift / Cmd / Ctrl + 点击：多选切换。
 * - 选中通过 node.setAttribute('selected', true)，视觉由 Node 响应。
 */
import { Plugin, closestCell, addClass, removeClass } from './plugin';

export class SelectionPlugin extends Plugin {
  readonly name = 'selection';
  readonly selected = new Set<string>();

  init(graph: any): void {
    super.init(graph);
    graph.addEventListener('pointerdown', (e: any) => {
      const cell = graph.pickNode(e.viewportX, e.viewportY);
      const additive = !!(e.shiftKey || e.metaKey || e.ctrlKey);
      if (!cell) {
        this.clear();
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
}
