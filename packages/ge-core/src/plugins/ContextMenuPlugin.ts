/**
 * ContextMenuPlugin —— 右键上下文菜单。
 *
 * - 右键画布 → 显示自定义菜单（DOM overlay）。
 * - 菜单项通过构造函数配置（DOM 化，非命令式 API）。
 * - 点击菜单项触发 action({ target, graph })。
 */
import { Plugin } from './plugin';

export interface ContextMenuItem {
  label: string;
  action?: (ctx: { target: any; graph: any }) => void;
  separator?: boolean;
}

export class ContextMenuPlugin extends Plugin {
  readonly name = 'contextMenu';
  private menu?: HTMLDivElement;
  private items: ContextMenuItem[];

  constructor(items: ContextMenuItem[] = []) {
    super();
    this.items = items;
  }

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    this.menu = document.createElement('div');
    this.menu.style.cssText =
      'position:absolute;background:#fff;border:1px solid #d9d9d9;border-radius:6px;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.12);padding:4px 0;z-index:20;display:none;' +
      'min-width:120px;font-size:13px;font-family:system-ui,sans-serif;';
    container.appendChild(this.menu);

    container.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const target = graph.pickNode(e.clientX - rect.left, e.clientY - rect.top);
      this.show(e.clientX - rect.left, e.clientY - rect.top, target);
    });

    document.addEventListener('click', () => this.hide());
  }

  private show(x: number, y: number, target: any): void {
    if (!this.menu) return;
    this.menu.innerHTML = '';
    for (const item of this.items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:#e8e8e8;margin:4px 0;';
        this.menu.appendChild(sep);
        continue;
      }
      const el = document.createElement('div');
      el.textContent = item.label;
      el.style.cssText = 'padding:6px 16px;cursor:pointer;white-space:nowrap;';
      el.addEventListener('mouseenter', () => { el.style.background = '#f5f5f5'; });
      el.addEventListener('mouseleave', () => { el.style.background = ''; });
      el.addEventListener('click', () => {
        item.action?.({ target, graph: this.graph });
        this.hide();
      });
      this.menu.appendChild(el);
    }
    this.menu.style.left = x + 'px';
    this.menu.style.top = y + 'px';
    this.menu.style.display = 'block';
  }

  private hide(): void {
    if (this.menu) this.menu.style.display = 'none';
  }

  destroy(): void {
    this.menu?.remove();
  }
}
