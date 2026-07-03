/**
 * ResizePlugin —— 节点尺寸调整手柄。
 *
 * - 选中单个节点时，在其右下角显示一个拖拽手柄（DOM overlay）。
 * - 拖拽手柄 → 实时修改节点 width/height（视口 dx/dy 经 zoom 转世界坐标）。
 * - 手柄位置随节点移动 / 画布平移缩放实时更新（afterrender）。
 * - 依赖 SelectionPlugin。
 */
import { Plugin } from './plugin';

export class ResizePlugin extends Plugin {
  readonly name = 'resize';
  private handle?: HTMLDivElement;
  private target?: any;
  private resizing: { startX: number; startY: number; startW: number; startH: number } | null = null;

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    this.handle = document.createElement('div');
    this.handle.setAttribute('data-ge-resize', 'true');
    this.handle.style.cssText =
      'position:absolute;width:10px;height:10px;background:#1890ff;border:1px solid #fff;' +
      'border-radius:2px;cursor:nwse-resize;z-index:11;display:none;pointer-events:auto;';
    container.appendChild(this.handle);

    const update = (): void => this.updateHandle();
    graph.addEventListener('pointerdown', () => setTimeout(update, 0));
    graph.addEventListener('node:dragend', update);
    graph.addEventListener('afterrender', () => {
      if (this.handle && this.handle.style.display !== 'none') update();
    });

    this.handle.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!this.target) return;
      e.stopPropagation();
      this.resizing = {
        startX: e.clientX,
        startY: e.clientY,
        // 存世界坐标的初始尺寸（不除 zoom），与 dx/dy（世界 delta）单位一致
        startW: this.target.getAttribute('width') as number,
        startH: this.target.getAttribute('height') as number,
      };
    });
    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.resizing || !this.target) return;
      const zoom = graph.getCamera().getZoom() || 1;
      const dx = (e.clientX - this.resizing.startX) / zoom;
      const dy = (e.clientY - this.resizing.startY) / zoom;
      this.target.resize(Math.max(20, this.resizing.startW + dx), Math.max(20, this.resizing.startH + dy));
      this.updateHandle();
    });
    window.addEventListener('pointerup', () => {
      this.resizing = null;
    });
  }

  private updateHandle(): void {
    if (!this.handle) return;
    const sel = (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
    if (sel.length !== 1) {
      this.handle.style.display = 'none';
      this.target = undefined;
      return;
    }
    const node = this.graph.getNode(sel[0]);
    if (!node) {
      this.handle.style.display = 'none';
      this.target = undefined;
      return;
    }
    this.target = node;
    const bb = node.getWorldBBox();
    const p = this.graph.canvas2Viewport({ x: bb.x + bb.width, y: bb.y + bb.height });
    this.handle.style.left = (p.x - 5) + 'px';
    this.handle.style.top = (p.y - 5) + 'px';
    this.handle.style.display = 'block';
  }

  destroy(): void {
    this.handle?.remove();
  }
}
