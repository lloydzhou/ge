/** 节点旋转手柄。 */
import { OverlayPlugin } from './plugin';

export class RotatePlugin extends OverlayPlugin {
  readonly name = 'rotate';
  private handle?: HTMLDivElement;
  private container?: HTMLElement;
  private target?: any;
  private rotating = false;
  private readonly onBoundsChange = (): void => this.update();
  private readonly onHandlePointerDown = (event: PointerEvent): void => {
    if (!this.target) return;
    event.stopPropagation();
    this.rotating = true;
  };
  private readonly onWindowPointerMove = (event: PointerEvent): void => {
    if (!this.rotating || !this.target || !this.container) return;
    const center = this.centerViewport(this.target);
    const rect = this.container.getBoundingClientRect();
    const angle = Math.atan2(event.clientX - rect.left - center.x, -(event.clientY - rect.top - center.y)) * 180 / Math.PI;
    this.target.setAttribute('angle', Math.round(angle));
    this.update();
  };
  private readonly onWindowPointerUp = (): void => { this.rotating = false; };

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    this.container = container;
    this.handle = document.createElement('div');
    this.handle.setAttribute('data-ge-rotate', 'true');
    this.handle.style.cssText = 'position:absolute;width:12px;height:12px;background:#722ed1;border:2px solid #fff;border-radius:50%;cursor:grab;z-index:11;display:none;pointer-events:auto;';
    container.appendChild(this.handle);
    graph.addEventListener('node:boundschange', this.onBoundsChange);
    this.handle.addEventListener('pointerdown', this.onHandlePointerDown);
    window.addEventListener('pointermove', this.onWindowPointerMove);
    window.addEventListener('pointerup', this.onWindowPointerUp);
  }

  private centerViewport(node: any): { x: number; y: number } {
    return this.graph.canvas2Viewport({ x: node.getAttribute('x') + node.getAttribute('width') / 2, y: node.getAttribute('y') + node.getAttribute('height') / 2 });
  }

  protected update(): void {
    if (!this.handle) return;
    const selected = (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
    if (selected.length !== 1) { this.handle.style.display = 'none'; this.target = undefined; return; }
    const node = this.graph.getNode(selected[0]);
    if (!node || !node.getAttribute('rotatable')) { this.handle.style.display = 'none'; this.target = undefined; return; }
    this.target = node;
    const center = this.centerViewport(node);
    const radians = ((node.getAttribute('angle') ?? 0) * Math.PI) / 180;
    const distance = node.getAttribute('height') / 2 * (this.graph.getCamera().getZoom() || 1) + 22;
    this.handle.style.left = center.x + Math.sin(radians) * distance - 6 + 'px';
    this.handle.style.top = center.y - Math.cos(radians) * distance - 6 + 'px';
    this.handle.style.display = 'block';
  }

  protected isActive(): boolean { return !!this.handle && this.handle.style.display !== 'none'; }

  destroy(): void {
    this.graph.removeEventListener('node:boundschange', this.onBoundsChange);
    this.handle?.removeEventListener('pointerdown', this.onHandlePointerDown);
    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('pointerup', this.onWindowPointerUp);
    this.handle?.remove();
    this.handle = undefined;
    this.container = undefined;
    this.rotating = false;
    super.destroy();
  }
}
