/**
 * ResizePlugin —— 节点 8 向尺寸调整手柄（旋转感知 OBB）。
 *
 * - 选中单个节点 + `resizable: true` 时，显示 8 个手柄（4 角 + 4 边中点）。
 * - 手柄位置用节点局部角 + 旋转（OBB），旋转后仍贴合实际角。
 * - 拖拽 delta 沿节点局部轴（旋转后方向正确），保持对角固定。
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
  private resizing: { dir: Dir; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; oa: number } | null = null;

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
          dir, sx: e.clientX, sy: e.clientY,
          ox: this.target.getAttribute('x') as number,
          oy: this.target.getAttribute('y') as number,
          ow: this.target.getAttribute('width') as number,
          oh: this.target.getAttribute('height') as number,
          oa: (this.target.getAttribute('angle') as number) ?? 0,
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
      const wdx = (e.clientX - this.resizing.sx) / zoom;
      const wdy = (e.clientY - this.resizing.sy) / zoom;
      const { dir, ox, oy, ow, oh, oa } = this.resizing;
      // 世界 delta → 节点局部 delta（逆旋转）
      const rad = oa * Math.PI / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const ldx = wdx * cos + wdy * sin;
      const ldy = -wdx * sin + wdy * cos;
      // 局部尺寸变化
      let lw = 0, lh = 0;
      if (dir.includes('e')) lw = ldx;
      if (dir.includes('w')) lw = -ldx;
      if (dir.includes('s')) lh = ldy;
      if (dir.includes('n')) lh = -ldy;
      const nw = Math.max(20, ow + lw);
      const nh = Math.max(20, oh + lh);
      // 对角固定的局部中心位移
      const clw = (dir.includes('e') ? (nw - ow) / 2 : (dir.includes('w') ? -(nw - ow) / 2 : 0));
      const clh = (dir.includes('s') ? (nh - oh) / 2 : (dir.includes('n') ? -(nh - oh) / 2 : 0));
      // 局部中心位移 → 世界
      const cwx = clw * cos - clh * sin;
      const cwy = clw * sin + clh * cos;
      const ocx = ox + ow / 2, ocy = oy + oh / 2;
      this.target.setAttribute('x', ocx + cwx - nw / 2);
      this.target.setAttribute('y', ocy + cwy - nh / 2);
      this.target.setAttribute('width', nw);
      this.target.setAttribute('height', nh);
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
      // OBB：节点局部角 + 旋转
      const x = node.getAttribute('x') as number;
      const y = node.getAttribute('y') as number;
      const w = node.getAttribute('width') as number;
      const hh = node.getAttribute('height') as number;
      const a = ((node.getAttribute('angle') as number) ?? 0) * Math.PI / 180;
      const cos = Math.cos(a), sin = Math.sin(a);
      const cx = x + w / 2, cy = y + hh / 2;
      const rot = (lx: number, ly: number) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
      const C = { nw: rot(-w / 2, -hh / 2), ne: rot(w / 2, -hh / 2), se: rot(w / 2, hh / 2), sw: rot(-w / 2, hh / 2) };
      const V = { nw: this.graph.canvas2Viewport(C.nw), ne: this.graph.canvas2Viewport(C.ne), se: this.graph.canvas2Viewport(C.se), sw: this.graph.canvas2Viewport(C.sw) };
      const pos: Record<string, { x: number; y: number }> = {
        nw: V.nw, n: { x: (V.nw.x + V.ne.x) / 2, y: (V.nw.y + V.ne.y) / 2 }, ne: V.ne,
        w: { x: (V.nw.x + V.sw.x) / 2, y: (V.nw.y + V.sw.y) / 2 }, e: { x: (V.ne.x + V.se.x) / 2, y: (V.ne.y + V.se.y) / 2 },
        sw: V.sw, s: { x: (V.sw.x + V.se.x) / 2, y: (V.sw.y + V.se.y) / 2 }, se: V.se,
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
