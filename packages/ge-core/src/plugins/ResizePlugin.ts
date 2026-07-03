/**
 * ResizePlugin —— 节点 8 向尺寸调整手柄。
 *
 * - 选中单个节点 + `resizable: true` 时，显示 8 个手柄（4 角 + 4 边中点）。
 * - 拖拽手柄 → 实时修改 width/height/x/y（保持对角/对边固定，DOM 化 setAttribute）。
 * - 手柄随节点移动 / 旋转 / 画布 pan/zoom 实时更新。
 * - 依赖 SelectionPlugin。
 */
import { OverlayPlugin } from './plugin';

const HANDLES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'] as const;
type Dir = (typeof HANDLES)[number];

const CURSORS: Record<Dir, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
  w: 'ew-resize', e: 'ew-resize',
  sw: 'nesw-resize', s: 'ns-resize', se: 'nwse-resize',
};

export class ResizePlugin extends OverlayPlugin {
  readonly name = 'resize';
  private handles: Record<string, HTMLDivElement> = {};
  private target?: any;
  private resizing: { dir: Dir; startX: number; startY: number; ox: number; oy: number; ow: number; oh: number } | null = null;

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    for (const dir of HANDLES) {
      const h = document.createElement('div');
      h.setAttribute('data-ge-resize', dir);
      h.style.cssText =
        `position:absolute;width:8px;height:8px;background:#1890ff;border:1px solid #fff;` +
        `border-radius:2px;cursor:${CURSORS[dir]};z-index:11;display:none;pointer-events:auto;`;
      container.appendChild(h);
      this.handles[dir] = h;
      h.addEventListener('pointerdown', (e: PointerEvent) => {
        if (!this.target) return;
        e.stopPropagation();
        this.resizing = {
          dir,
          startX: e.clientX, startY: e.clientY,
          ox: this.target.getAttribute('x') as number,
          oy: this.target.getAttribute('y') as number,
          ow: this.target.getAttribute('width') as number,
          oh: this.target.getAttribute('height') as number,
        };
      });
    }

    const update = (): void => this.update();
    graph.addEventListener('pointerdown', () => setTimeout(update, 0));
    graph.addEventListener('node:dragend', update);
    graph.addEventListener('afterrender', () => {
      if (this.handles['se'] && this.handles['se'].style.display !== 'none') update();
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.resizing || !this.target) return;
      const zoom = graph.getCamera().getZoom() || 1;
      const dx = (e.clientX - this.resizing.startX) / zoom;
      const dy = (e.clientY - this.resizing.startY) / zoom;
      const { dir, ox, oy, ow, oh } = this.resizing;
      let x = ox, y = oy, w = ow, h = oh;
      if (dir.includes('w')) { x = ox + dx; w = ow - dx; }
      if (dir.includes('e')) { w = ow + dx; }
      if (dir.includes('n')) { y = oy + dy; h = oh - dy; }
      if (dir.includes('s')) { h = oh + dy; }
      // 最小尺寸 20
      if (w < 20) { w = 20; if (dir.includes('w')) x = ox + ow - 20; }
      if (h < 20) { h = 20; if (dir.includes('n')) y = oy + oh - 20; }
      this.target.setAttribute('x', x);
      this.target.setAttribute('y', y);
      this.target.setAttribute('width', w);
      this.target.setAttribute('height', h);
      this.update();
    });
    window.addEventListener('pointerup', () => { this.resizing = null; });
  }

  protected update(): void {
    const sel = (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
    const node = sel.length === 1 ? this.graph.getNode(sel[0]) : null;
    const show = !!(node && node.getAttribute('resizable'));
    this.target = show ? node : undefined;

    for (const dir of HANDLES) {
      const h = this.handles[dir];
      if (!h) continue;
      if (!show || !node) { h.style.display = 'none'; continue; }
      const bb = node.getWorldBBox();
      const tl = this.graph.canvas2Viewport({ x: bb.x, y: bb.y });
      const tr = this.graph.canvas2Viewport({ x: bb.x + bb.width, y: bb.y });
      const bl = this.graph.canvas2Viewport({ x: bb.x, y: bb.y + bb.height });
      const br = this.graph.canvas2Viewport({ x: bb.x + bb.width, y: bb.y + bb.height });
      const pos: Record<string, { x: number; y: number }> = {
        nw: tl, n: { x: (tl.x + tr.x) / 2, y: tl.y }, ne: tr,
        w: { x: tl.x, y: (tl.y + bl.y) / 2 }, e: { x: tr.x, y: (tr.y + br.y) / 2 },
        sw: bl, s: { x: (bl.x + br.x) / 2, y: bl.y }, se: br,
      };
      const p = pos[dir];
      h.style.left = p.x - 4 + 'px';
      h.style.top = p.y - 4 + 'px';
      h.style.display = 'block';
    }
  }

  protected isActive(): boolean { return !!(this.target && this.handles['se'] && this.handles['se'].style.display !== 'none'); }

  destroy(): void {
    for (const dir of HANDLES) this.handles[dir]?.remove();
  }
}
