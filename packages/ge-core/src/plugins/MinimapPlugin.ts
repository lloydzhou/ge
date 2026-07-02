/**
 * MinimapPlugin —— 缩略导航图（轻量 DOM overlay 版）。
 *
 * - 在容器右下角叠加一个小窗，按节点世界坐标等比缩放渲染小矩形。
 * - 监听 pointerup / node:dragend 刷新，并辅以定时刷新兜底。
 * - 后续可替换为第二张 g-lite Canvas 的渲染实现。
 */
import { Plugin } from './plugin';

export class MinimapPlugin extends Plugin {
  readonly name = 'minimap';
  private el?: HTMLDivElement;
  private timer?: ReturnType<typeof setInterval>;

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    this.el = document.createElement('div');
    this.el.setAttribute('data-ge-minimap', 'true');
    this.el.style.cssText =
      'position:absolute;right:16px;bottom:16px;width:170px;height:120px;' +
      'background:rgba(255,255,255,.92);border:1px solid #d9d9d9;border-radius:6px;' +
      'overflow:hidden;pointer-events:none;z-index:10;';
    container.appendChild(this.el);

    const refresh = (): void => this.refresh();
    graph.addEventListener('pointerup', refresh);
    graph.addEventListener('node:dragend', refresh);
    this.timer = setInterval(refresh, 500);
    setTimeout(refresh, 300);
  }

  refresh(): void {
    if (!this.el) return;
    const nodes = this.graph.getNodes();
    if (nodes.length === 0) {
      this.el.innerHTML = '';
      return;
    }
    const bboxes = nodes.map((n: any) => n.getWorldBBox());
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const b of bboxes) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    const pad = 40;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const w = this.el.clientWidth || 170;
    const h = this.el.clientHeight || 120;
    const scale = Math.min(w / (maxX - minX), h / (maxY - minY));
    const map = (x: number, y: number): { left: number; top: number } => ({
      left: (x - minX) * scale,
      top: (y - minY) * scale,
    });
    let html = '';
    for (const b of bboxes) {
      const p = map(b.x, b.y);
      html += `<div style="position:absolute;left:${p.left}px;top:${p.top}px;` +
        `width:${Math.max(2, b.width * scale)}px;height:${Math.max(2, b.height * scale)}px;` +
        `background:#1890ff;opacity:.7;border-radius:1px;"></div>`;
    }
    this.el.innerHTML = html;
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.el?.remove();
  }
}
