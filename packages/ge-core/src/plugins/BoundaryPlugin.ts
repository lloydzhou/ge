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
  }

  protected update(): void {
    if (!this.box) return;
    const sel = (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
    if (sel.length !== 1) { this.box.style.display = 'none'; return; }
    const node = this.graph.getNode(sel[0]);
    if (!node) { this.box.style.display = 'none'; return; }
    const bb = node.getWorldBBox();
    const padding = 4;
    const tl = this.graph.canvas2Viewport({ x: bb.x - padding, y: bb.y - padding });
    const br = this.graph.canvas2Viewport({ x: bb.x + bb.width + padding, y: bb.y + bb.height + padding });
    this.box.style.left = tl.x + 'px';
    this.box.style.top = tl.y + 'px';
    this.box.style.width = (br.x - tl.x) + 'px';
    this.box.style.height = (br.y - tl.y) + 'px';
    this.box.style.display = 'block';
  }

  protected isActive(): boolean { return !!(this.handle || this.box)?.style && (this.handle || this.box).style.display !== 'none'; }

  destroy(): void { this.box?.remove(); }
}
