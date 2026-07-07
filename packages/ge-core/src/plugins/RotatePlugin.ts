/**
 * RotatePlugin —— 节点旋转手柄（中心用实际几何中心，非 AABB）。
 *
 * - 选中单个节点 + `rotatable: true` 时，在节点上方显示旋转手柄（紫色圆柄）。
 * - 拖拽手柄 → 计算角度 → setAttribute('angle', x)（DOM 化声明式）。
 * - 旋转中心用 x+w/2, y+h/2（不用 AABB，旋转后准确）。
 */
import { OverlayPlugin } from './plugin';

export class RotatePlugin extends OverlayPlugin {
  readonly name = 'rotate';
  private handle?: HTMLDivElement;
  private target?: any;
  private rotating = false;

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;

    this.handle = document.createElement('div');
    this.handle.setAttribute('data-ge-rotate', 'true');
    this.handle.style.cssText =
      'position:absolute;width:12px;height:12px;background:#722ed1;border:2px solid #fff;' +
      'border-radius:50%;cursor:grab;z-index:11;display:none;pointer-events:auto;';
    container.appendChild(this.handle);

    this.handle.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!this.target) return;
      e.stopPropagation();
      this.rotating = true;
    });
    const containerRect = () => container.getBoundingClientRect();
    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.rotating || !this.target) return;
      const centerVp = this.centerViewport(this.target);
      const rect = containerRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dx = mx - centerVp.x;
      const dy = my - centerVp.y;
      const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
      this.target.setAttribute('angle', Math.round(angle));
      this.update();
    });
    window.addEventListener('pointerup', () => { this.rotating = false; });
  }

  /** 节点实际几何中心 → 视口坐标（不用 AABB，旋转后准确） */
  private centerViewport(node: any): { x: number; y: number } {
    const x = node.getAttribute('x') as number;
    const y = node.getAttribute('y') as number;
    const w = node.getAttribute('width') as number;
    const h = node.getAttribute('height') as number;
    return this.graph.canvas2Viewport({ x: x + w / 2, y: y + h / 2 });
  }

  protected update(): void {
    if (!this.handle) return;
    const sel = (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
    if (sel.length !== 1) { this.handle.style.display = 'none'; this.target = undefined; return; }
    const node = this.graph.getNode(sel[0]);
    if (!node || !node.getAttribute('rotatable')) { this.handle.style.display = 'none'; this.target = undefined; return; }
    this.target = node;
    const centerVp = this.centerViewport(node);
    const angle = (node.getAttribute('angle') as number) ?? 0;
    const rad = (angle * Math.PI) / 180;
    const h = node.getAttribute('height') as number;
    const zoom = this.graph.getCamera().getZoom() || 1;
    const dist = (h / 2) * zoom + 22;
    this.handle.style.left = centerVp.x + Math.sin(rad) * dist - 6 + 'px';
    this.handle.style.top = centerVp.y - Math.cos(rad) * dist - 6 + 'px';
    this.handle.style.display = 'block';
  }

  protected isActive(): boolean { return !!this.handle && this.handle.style.display !== 'none'; }

  destroy(): void { this.handle?.remove(); }
}
