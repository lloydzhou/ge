/**
 * TooltipPlugin —— 悬停提示。
 *
 * - 鼠标悬停节点 → 显示 tooltip（DOM overlay）。
 * - tooltip 内容：node.getAttribute('tooltip') 或 node.getData() 或 node.id。
 * - 移开自动隐藏。
 */
import { Plugin } from './plugin';

export interface TooltipOptions {
  /** 自定义内容生成（默认用 tooltip attribute 或 id） */
  content?: (target: any) => string;
  /** 偏移（px） */
  offset?: number;
}

export class TooltipPlugin extends Plugin {
  readonly name = 'tooltip';
  private el?: HTMLDivElement;
  private opts: Required<TooltipOptions>;
  private currentTarget: any = null;
  private throttle = false;
  private readonly onPointerMove = (e: any): void => {
    if (this.throttle) return;
    this.throttle = true;
    requestAnimationFrame(() => { this.throttle = false; });
    const node = this.graph.pickNode(e.viewportX, e.viewportY);
    if (node) this.show(node, e.viewportX, e.viewportY); else this.hide();
  };
  private readonly onPointerLeave = (): void => this.hide();

  constructor(options: TooltipOptions = {}) {
    super();
    this.opts = {
      content: options.content ?? ((t: any) => t.getAttribute('tooltip') || t.id || ''),
      offset: options.offset ?? 12,
    };
  }

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    this.el = document.createElement('div');
    this.el.style.cssText =
      'position:absolute;background:rgba(0,0,0,.75);color:#fff;padding:4px 8px;border-radius:4px;' +
      'font-size:12px;font-family:system-ui,sans-serif;pointer-events:none;z-index:21;display:none;' +
      'white-space:nowrap;max-width:300px;';
    container.appendChild(this.el);

    graph.addEventListener('pointermove', this.onPointerMove);
    graph.addEventListener('pointerleave', this.onPointerLeave);
  }

  private show(target: any, x: number, y: number): void {
    if (!this.el || target === this.currentTarget) {
      if (this.el && target === this.currentTarget) {
        this.el.style.left = x + this.opts.offset + 'px';
        this.el.style.top = y + this.opts.offset + 'px';
      }
      return;
    }
    this.currentTarget = target;
    this.el.textContent = this.opts.content(target);
    this.el.style.left = x + this.opts.offset + 'px';
    this.el.style.top = y + this.opts.offset + 'px';
    this.el.style.display = 'block';
  }

  private hide(): void {
    if (this.el) this.el.style.display = 'none';
    this.currentTarget = null;
  }

  destroy(): void {
    this.graph.removeEventListener('pointermove', this.onPointerMove);
    this.graph.removeEventListener('pointerleave', this.onPointerLeave);
    this.el?.remove();
    super.destroy();
  }
}
