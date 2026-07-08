/**
 * BoundaryPlugin —— 选中节点的外包围框（虚线 outline）。
 * 选中单个节点时显示虚线框（比节点略大），随移动/resize/pan/zoom 实时跟随。
 */
import { OverlayPlugin } from './plugin';

export class BoundaryPlugin extends OverlayPlugin {
  readonly name = 'boundary';
  private box?: HTMLDivElement;

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    this.box = document.createElement('div');
    this.box.setAttribute('data-ge-boundary', 'true');
    this.box.style.cssText =
      'position:absolute;border:1.5px dashed #1890ff;border-radius:2px;' +
      'pointer-events:none;z-index:8;display:none;';
    container.appendChild(this.box);
    // 节点移动/resize 时即时跟随（boundschange 在 Scheduler flush 内同步触发）
    graph.addEventListener('node:boundschange', () => this.update());
  }

  protected update(): void {
    if (!this.box) return;
    const sel = (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
    if (sel.length !== 1) { this.box.style.display = 'none'; return; }
    const node = this.graph.getNode(sel[0]);
    if (!node) { this.box.style.display = 'none'; return; }
    const x = node.getAttribute('x') as number;
    const y = node.getAttribute('y') as number;
    const w = node.getAttribute('width') as number;
    const h = node.getAttribute('height') as number;
    const angle = (node.getAttribute('angle') as number) ?? 0;
    const padding = 4;
    const zoom = this.graph.getCamera().getZoom() || 1;
    const c = this.graph.canvas2Viewport({ x: x + w / 2, y: y + h / 2 });
    this.box.style.left = (c.x - (w / 2 + padding) * zoom) + 'px';
    this.box.style.top = (c.y - (h / 2 + padding) * zoom) + 'px';
    this.box.style.width = ((w + padding * 2) * zoom) + 'px';
    this.box.style.height = ((h + padding * 2) * zoom) + 'px';
    this.box.style.transform = `rotate(${angle}deg)`;
    this.box.style.transformOrigin = 'center center';
    this.box.style.display = 'block';
  }

  protected isActive(): boolean { return !!this.box && this.box.style.display !== 'none'; }

  destroy(): void { this.box?.remove(); }
}
