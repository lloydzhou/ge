/**
 * FPSPlugin —— 性能监控（FPS + g-lite getStats total/rendered）。
 *
 * 左上角 overlay 显示：FPS / 总元素 / 渲染元素。
 * 用于排查大图性能瓶颈。
 */
import { Plugin } from './plugin';

export class FPSPlugin extends Plugin {
  readonly name = 'fps';
  private el?: HTMLDivElement;
  private frames = 0;
  private lastTime = 0;
  private rafId: number | null = null;

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    this.el = document.createElement('div');
    this.el.style.cssText =
      'position:absolute;top:8px;left:8px;padding:4px 8px;background:rgba(0,0,0,.72);' +
      'color:#0f0;font:11px/1.4 monospace;border-radius:3px;z-index:99;pointer-events:none;' +
      'white-space:pre;';
    container.appendChild(this.el);

    this.lastTime = performance.now();
    const loop = (): void => {
      this.frames++;
      const now = performance.now();
      if (now - this.lastTime >= 500) {
        const fps = Math.round((this.frames * 1000) / (now - this.lastTime));
        const stats = graph.getStats?.() ?? { total: 0, rendered: 0 };
        if (this.el) this.el.textContent = `FPS ${fps}\n总数 ${stats.total}\n渲染 ${stats.rendered}`;
        this.frames = 0;
        this.lastTime = now;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  destroy(): void {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.el?.remove();
  }
}
