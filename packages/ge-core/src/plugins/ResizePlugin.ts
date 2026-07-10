/** 节点八向尺寸调整手柄（旋转感知 OBB）。 */
import { OverlayPlugin } from './plugin';

const HANDLES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'] as const;
type Dir = (typeof HANDLES)[number];
const BASE_CURSOR_ANGLE: Record<Dir, number> = { e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315 };
const CURSOR_TYPES = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
const cursorFor = (dir: Dir, angle: number): string => CURSOR_TYPES[Math.floor((((BASE_CURSOR_ANGLE[dir] + angle) % 360 + 360) % 360 + 22.5) / 45) % 8];

export class ResizePlugin extends OverlayPlugin {
  readonly name = 'resize';
  private handles: Record<string, HTMLDivElement> = {};
  private handleListeners = new Map<HTMLDivElement, (event: PointerEvent) => void>();
  private target?: any;
  private resizing: { dir: Dir; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; oa: number } | null = null;
  private readonly onGraphPointerDown = (): void => { setTimeout(() => this.update(), 0); };
  private readonly onUpdate = (): void => this.update();
  private readonly onResizeAfterRender = (): void => { if (this.handles.se?.style.display !== 'none') this.update(); };
  private readonly onWindowPointerMove = (event: PointerEvent): void => {
    if (!this.resizing || !this.target) return;
    const zoom = this.graph.getCamera().getZoom() || 1;
    const { dir, sx, sy, ox, oy, ow, oh, oa } = this.resizing;
    const worldX = (event.clientX - sx) / zoom, worldY = (event.clientY - sy) / zoom;
    const radians = oa * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians);
    const localX = worldX * cos + worldY * sin, localY = -worldX * sin + worldY * cos;
    const width = Math.max(20, ow + (dir.includes('e') ? localX : dir.includes('w') ? -localX : 0));
    const height = Math.max(20, oh + (dir.includes('s') ? localY : dir.includes('n') ? -localY : 0));
    const centerLocalX = dir.includes('e') ? (width - ow) / 2 : dir.includes('w') ? -(width - ow) / 2 : 0;
    const centerLocalY = dir.includes('s') ? (height - oh) / 2 : dir.includes('n') ? -(height - oh) / 2 : 0;
    const centerWorldX = centerLocalX * cos - centerLocalY * sin, centerWorldY = centerLocalX * sin + centerLocalY * cos;
    this.target.setAttribute('x', ox + ow / 2 + centerWorldX - width / 2);
    this.target.setAttribute('y', oy + oh / 2 + centerWorldY - height / 2);
    this.target.setAttribute('width', width); this.target.setAttribute('height', height);
    this.update();
  };
  private readonly onWindowPointerUp = (): void => { this.resizing = null; };

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    for (const dir of HANDLES) {
      const handle = document.createElement('div');
      handle.setAttribute('data-ge-resize', dir);
      handle.style.cssText = `position:absolute;width:8px;height:8px;background:#1890ff;border:1px solid #fff;border-radius:2px;cursor:ew-resize;z-index:11;display:none;pointer-events:auto;`;
      const listener = (event: PointerEvent): void => {
        if (!this.target) return;
        event.stopPropagation();
        this.resizing = { dir, sx: event.clientX, sy: event.clientY, ox: this.target.getAttribute('x'), oy: this.target.getAttribute('y'), ow: this.target.getAttribute('width'), oh: this.target.getAttribute('height'), oa: this.target.getAttribute('angle') ?? 0 };
      };
      handle.addEventListener('pointerdown', listener);
      this.handleListeners.set(handle, listener);
      container.appendChild(handle); this.handles[dir] = handle;
    }
    graph.addEventListener('pointerdown', this.onGraphPointerDown);
    graph.addEventListener('node:dragend', this.onUpdate);
    graph.addEventListener('node:boundschange', this.onUpdate);
    graph.addEventListener('afterrender', this.onResizeAfterRender);
    window.addEventListener('pointermove', this.onWindowPointerMove);
    window.addEventListener('pointerup', this.onWindowPointerUp);
  }

  protected update(): void {
    const selected = (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
    const node = selected.length === 1 ? this.graph.getNode(selected[0]) : null;
    const visible = !!(node && node.getAttribute('resizable'));
    this.target = visible ? node : undefined;
    for (const dir of HANDLES) {
      const handle = this.handles[dir]; if (!handle) continue;
      if (!visible || !node) { handle.style.display = 'none'; continue; }
      const x = node.getAttribute('x'), y = node.getAttribute('y'), width = node.getAttribute('width'), height = node.getAttribute('height');
      const angle = (node.getAttribute('angle') ?? 0) * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle), cx = x + width / 2, cy = y + height / 2;
      const rotate = (localX: number, localY: number) => ({ x: cx + localX * cos - localY * sin, y: cy + localX * sin + localY * cos });
      const corners = { nw: rotate(-width / 2, -height / 2), ne: rotate(width / 2, -height / 2), se: rotate(width / 2, height / 2), sw: rotate(-width / 2, height / 2) };
      const points = { nw: this.graph.canvas2Viewport(corners.nw), ne: this.graph.canvas2Viewport(corners.ne), se: this.graph.canvas2Viewport(corners.se), sw: this.graph.canvas2Viewport(corners.sw) };
      const positions: Record<Dir, { x: number; y: number }> = { nw: points.nw, n: { x: (points.nw.x + points.ne.x) / 2, y: (points.nw.y + points.ne.y) / 2 }, ne: points.ne, w: { x: (points.nw.x + points.sw.x) / 2, y: (points.nw.y + points.sw.y) / 2 }, e: { x: (points.ne.x + points.se.x) / 2, y: (points.ne.y + points.se.y) / 2 }, sw: points.sw, s: { x: (points.sw.x + points.se.x) / 2, y: (points.sw.y + points.se.y) / 2 }, se: points.se };
      const point = positions[dir];
      handle.style.left = point.x - 4 + 'px'; handle.style.top = point.y - 4 + 'px';
      handle.style.cursor = cursorFor(dir, node.getAttribute('angle') ?? 0); handle.style.display = 'block';
    }
  }

  protected isActive(): boolean { return !!(this.target && this.handles.se?.style.display !== 'none'); }

  destroy(): void {
    this.graph.removeEventListener('pointerdown', this.onGraphPointerDown);
    this.graph.removeEventListener('node:dragend', this.onUpdate);
    this.graph.removeEventListener('node:boundschange', this.onUpdate);
    this.graph.removeEventListener('afterrender', this.onResizeAfterRender);
    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('pointerup', this.onWindowPointerUp);
    for (const [handle, listener] of this.handleListeners) handle.removeEventListener('pointerdown', listener);
    this.handleListeners.clear();
    for (const dir of HANDLES) this.handles[dir]?.remove();
    this.handles = {}; this.target = undefined; this.resizing = null;
    super.destroy();
  }
}
