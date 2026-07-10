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

type MenuItemListener = { element: HTMLElement; type: string; listener: EventListener };

export class ContextMenuPlugin extends Plugin {
  readonly name = 'contextMenu';
  private menu?: HTMLDivElement;
  private items: ContextMenuItem[];
  private container?: HTMLElement;
  private menuItemListeners: MenuItemListener[] = [];
  private readonly onContextMenu = (e: MouseEvent): void => {
    const container = this.container;
    if (!container) return;
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const target = this.graph.pickNode(e.clientX - rect.left, e.clientY - rect.top);
    this.show(e.clientX - rect.left, e.clientY - rect.top, target);
  };
  private readonly onDocumentClick = (): void => this.hide();

  constructor(items: ContextMenuItem[] = []) {
    super();
    this.items = items;
  }

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    this.container = container;

    this.menu = document.createElement('div');
    this.menu.style.cssText =
      'position:absolute;background:#fff;border:1px solid #d9d9d9;border-radius:6px;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.12);padding:4px 0;z-index:20;display:none;' +
      'min-width:120px;font-size:13px;font-family:system-ui,sans-serif;';
    container.appendChild(this.menu);

    container.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('click', this.onDocumentClick);
  }

  private addMenuItemListener(element: HTMLElement, type: string, listener: EventListener): void {
    element.addEventListener(type, listener);
    this.menuItemListeners.push({ element, type, listener });
  }

  private clearMenuItemListeners(): void {
    for (const { element, type, listener } of this.menuItemListeners) {
      element.removeEventListener(type, listener);
    }
    this.menuItemListeners = [];
  }

  private show(x: number, y: number, target: any): void {
    if (!this.menu) return;
    this.clearMenuItemListeners();
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
      const onEnter = (): void => { el.style.background = '#f5f5f5'; };
      const onLeave = (): void => { el.style.background = ''; };
      const onClick = (): void => {
        item.action?.({ target, graph: this.graph });
        this.hide();
      };
      this.addMenuItemListener(el, 'mouseenter', onEnter);
      this.addMenuItemListener(el, 'mouseleave', onLeave);
      this.addMenuItemListener(el, 'click', onClick);
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
    if (this.container) this.container.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('click', this.onDocumentClick);
    this.clearMenuItemListeners();
    this.menu?.remove();
    this.menu = undefined;
    this.container = undefined;
    super.destroy();
  }
}
