/**
 * KeyboardPlugin —— 键盘快捷键。
 *
 * - Delete / Backspace：删除选中节点（并清理其连接的边）。
 * - 依赖 SelectionPlugin 提供选中集合。
 */
import { Plugin } from './plugin';

export interface KeyboardOptions {
  /** 触发删除的键名（默认 Delete + Backspace） */
  deleteKeys?: string[];
}

export class KeyboardPlugin extends Plugin {
  readonly name = 'keyboard';
  private deleteKeys: string[];
  private handler?: (e: KeyboardEvent) => void;

  constructor(options: KeyboardOptions = {}) {
    super();
    this.deleteKeys = options.deleteKeys ?? ['Delete', 'Backspace'];
  }

  init(graph: any): void {
    super.init(graph);
    this.handler = (e: KeyboardEvent): void => {
      if (!this.deleteKeys.includes(e.key)) return;
      const sel = (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
      if (sel.length === 0) return;
      e.preventDefault();
      for (const id of sel) {
        this.removeConnectedEdges(id);
        this.graph.removeCell(id);
      }
      (this.graph.getPlugin('selection') as any)?.clear?.();
    };
    window.addEventListener('keydown', this.handler);
  }

  /** 删除与节点相连的所有边 */
  private removeConnectedEdges(nodeId: string): void {
    const edges = this.graph.getEdges();
    for (const edge of edges) {
      const s = edge.getAttribute('source');
      const t = edge.getAttribute('target');
      const sid = typeof s === 'string' ? s : s?.cell;
      const tid = typeof t === 'string' ? t : t?.cell;
      if (sid === nodeId || tid === nodeId) edge.remove();
    }
  }

  destroy(): void {
    if (this.handler) window.removeEventListener('keydown', this.handler);
  }
}
