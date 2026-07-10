/**
 * KeyboardPlugin —— 键盘快捷键。
 *
 * - Delete / Backspace：删除选中
 * - Ctrl+Z：撤销 / Ctrl+Shift+Z 或 Ctrl+Y：重做
 * - Ctrl+A：全选 / Ctrl+C：复制 / Ctrl+V：粘贴 / Ctrl+D：克隆
 * - 依赖 SelectionPlugin / HistoryPlugin / ClipboardPlugin（可选）
 */
import { Plugin } from './plugin';

export interface KeyboardOptions {
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
      const sel = (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
      const meta = e.metaKey || e.ctrlKey;

      // Delete
      if (this.deleteKeys.includes(e.key) && !meta) {
        if (sel.length === 0) return;
        e.preventDefault();
        for (const id of sel) this.graph.removeCell(id);
        (this.graph.getPlugin('selection') as any)?.clear?.();
        return;
      }
      // Undo / Redo
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const h = this.graph.getPlugin('history') as any;
        if (e.shiftKey) h?.redo?.(); else h?.undo?.();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        (this.graph.getPlugin('history') as any)?.redo?.();
        return;
      }
      // Select All
      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const s = this.graph.getPlugin('selection') as any;
        s?.clear?.();
        for (const n of this.graph.getNodes()) s?.select?.(n.id);
        return;
      }
      // Copy / Paste / Duplicate
      if (meta && e.key.toLowerCase() === 'c' && sel.length > 0) {
        e.preventDefault();
        (this.graph.getPlugin('clipboard') as any)?.copy?.(sel);
        return;
      }
      if (meta && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        (this.graph.getPlugin('clipboard') as any)?.paste?.();
        return;
      }
      if (meta && e.key.toLowerCase() === 'd' && sel.length > 0) {
        e.preventDefault();
        (this.graph.getPlugin('clipboard') as any)?.duplicate?.(sel);
        return;
      }
    };
    window.addEventListener('keydown', this.handler);
  }

  destroy(): void {
    if (this.handler) window.removeEventListener('keydown', this.handler);
    this.handler = undefined;
    super.destroy();
  }
}
