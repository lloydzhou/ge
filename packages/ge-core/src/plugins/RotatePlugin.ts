/**
 * RotatePlugin —— 节点旋转手柄。
 *
 * - 选中单个节点 + `rotatable: true` 时，在节点上方显示旋转手柄（紫色圆柄）。
 * - 拖拽手柄 → 计算角度 → setAttribute('angle', x)（DOM 化声明式）。
 * - 手柄位置随节点移动 / 旋转 / 画布 pan/zoom 实时更新（afterrender）。
 * - 依赖 SelectionPlugin。
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
      const bb = this.target.getWorldBBox();
      const centerVp = this.graph.canvas2Viewport({ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 });
      const rect = containerRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // 手柄在上方（-y），0° 朝上，顺时针正：angle = atan2(dx, -dy)
      const dx = mx - centerVp.x;
      const dy = my - centerVp.y;
      const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
      this.target.setAttribute('angle', Math.round(angle));
      this.update();
    });
    window.addEventListener('pointerup', () => {
      this.rotating = false;
    });
  }

  protected update(): void {
    if (!this.handle) return;
    const sel = (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
    if (sel.length !== 1) {
      this.handle.style.display = 'none';
      this.target = undefined;
      return;
    }
    const node = this.graph.getNode(sel[0]);
    if (!node || !node.getAttribute('rotatable')) {
      this.handle.style.display = 'none';
      this.target = undefined;
      return;
    }
    this.target = node;
    // 手柄在节点上方，绕中心旋转 angle（视口空间）
    const bb = node.getWorldBBox();
    const centerVp = this.graph.canvas2Viewport({ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 });
    const angle = (node.getAttribute('angle') as number) ?? 0;
    const rad = (angle * Math.PI) / 180;
    const dist = 30; // 视口 px，手柄距中心
    const hx = centerVp.x + Math.sin(rad) * dist;
    const hy = centerVp.y - Math.cos(rad) * dist;
    this.handle.style.left = hx - 6 + 'px';
    this.handle.style.top = hy - 6 + 'px';
    this.handle.style.display = 'block';
  }

  protected isActive(): boolean { return !!this.handle && this.handle.style.display !== 'none'; }

  destroy(): void {
    this.handle?.remove();
  }
}
