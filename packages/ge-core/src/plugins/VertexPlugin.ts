/**
 * VertexPlugin —— 边路径编辑（waypoint 增删 + 端点拖拽改 source/target）。
 *
 * - 双击边 → 激活 + 添加 waypoint
 * - 双击 waypoint → 删除
 * - 拖拽端点手柄（绿=source / 红=target）→ 落到节点 → 改变连线端点
 * - 拖拽 waypoint → 实时调整路径
 */
import { Plugin, closestEdge } from './plugin';
import type { Point } from '../utils/types';

export class VertexPlugin extends Plugin {
  readonly name = 'vertex';
  private activeEdge?: any;
  private handles: HTMLDivElement[] = [];
  private srcHandle?: HTMLDivElement;
  private edgeDrag: { sx: number; sy: number; wps: any[] } | null = null;
  private tgtHandle?: HTMLDivElement;

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    graph.addEventListener('dblclick', (e: any) => {
      const edge = closestEdge(e.target);
      if (!edge) return;
      if (e.target?.getAttribute?.('data-ge-endpoint')) return;
      this.activeEdge = edge;
      const wps = (((edge.getAttribute('waypoints') as Point[]) || []) as Point[]).slice();
      wps.push({ x: e.canvasX, y: e.canvasY });
      edge.setAttribute('waypoints', wps);
      this.syncHandles();
    });

    graph.addEventListener('afterrender', () => { if (this.activeEdge) this.syncHandles(); });
    graph.addEventListener('pointerdown', (e: any) => {
      const edge = closestEdge(e.target);
      // 已激活边的 body → 整段拖拽（所有 waypoints 平移）
      if (edge && edge === this.activeEdge) {
        this.edgeDrag = { sx: e.clientX, sy: e.clientY, wps: ((edge.getAttribute('waypoints') as Point[]) || []).map((p: Point) => ({ ...p })) };
        return;
      }
      if (edge || e.target?.getAttribute?.('data-ge-vertex') || e.target?.getAttribute?.('data-ge-endpoint')) return;
      this.activeEdge = undefined;
      this.clearHandles();
    });
    graph.addEventListener('pointermove', (e: any) => {
      if (!this.edgeDrag || !this.activeEdge) return;
      const zoom = graph.getCamera().getZoom() || 1;
      const dx = (e.clientX - this.edgeDrag.sx) / zoom;
      const dy = (e.clientY - this.edgeDrag.sy) / zoom;
      const newWps = this.edgeDrag.wps.map((wp: any) => ({ x: wp.x + dx, y: wp.y + dy }));
      this.activeEdge.setAttribute('waypoints', newWps);
    });
    graph.addEventListener('pointerup', () => { this.edgeDrag = null; });
    graph.addEventListener('pointerupoutside', () => { this.edgeDrag = null; });

    this.srcHandle = this.createEndpointHandle(container, 'source');
    this.tgtHandle = this.createEndpointHandle(container, 'target');
  }

  private createEndpointHandle(container: HTMLElement, type: string): HTMLDivElement {
    const h = document.createElement('div');
    h.setAttribute('data-ge-endpoint', type);
    const color = type === 'source' ? '#52c41a' : '#f5222d';
    h.style.cssText = `position:absolute;width:10px;height:10px;background:${color};border:2px solid #fff;border-radius:50%;cursor:move;z-index:12;pointer-events:auto;display:none;`;
    container.appendChild(h);
    let dragging = false;
    h.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!this.activeEdge) return;
      e.stopPropagation();
      dragging = true;
    });
    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (!dragging || !this.activeEdge) { dragging = false; return; }
      dragging = false;
      const rect = container.getBoundingClientRect();
      const node = this.graph.pickNode(e.clientX - rect.left, e.clientY - rect.top);
      if (node) this.activeEdge.setAttribute(type, node.id);
    });
    return h;
  }

  private clearHandles(): void {
    for (const h of this.handles) h.remove();
    this.handles = [];
    if (this.srcHandle) this.srcHandle.style.display = 'none';
    if (this.tgtHandle) this.tgtHandle.style.display = 'none';
  }

  private syncHandles(): void {
    const graph = this.graph;
    const container = graph.getConfig().container as HTMLElement;
    if (!this.activeEdge) { this.clearHandles(); return; }

    const wps = (this.activeEdge.getAttribute('waypoints') as Point[]) || [];
    while (this.handles.length < wps.length) {
      const h = document.createElement('div');
      h.setAttribute('data-ge-vertex', 'true');
      h.style.cssText = 'position:absolute;width:10px;height:10px;background:#fff;border:2px solid #722ed1;border-radius:50%;cursor:move;z-index:11;pointer-events:auto;';
      container.appendChild(h);
      this.handles.push(h);
      this.bindDrag(h, this.handles.length - 1);
    }
    while (this.handles.length > wps.length) this.handles.pop()?.remove();
    wps.forEach((wp: Point, i: number) => {
      const p = graph.canvas2Viewport({ x: wp.x, y: wp.y });
      this.handles[i].style.left = (p.x - 5) + 'px';
      this.handles[i].style.top = (p.y - 5) + 'px';
    });

    // endpoint handles（在 source/target 节点中心）
    const sId = this.activeEdge.getAttribute('source');
    const tId = this.activeEdge.getAttribute('target');
    const sNode = graph.getNode(typeof sId === 'string' ? sId : sId?.cell);
    const tNode = graph.getNode(typeof tId === 'string' ? tId : tId?.cell);
    if (sNode && this.srcHandle) {
      const p = graph.canvas2Viewport(sNode.getWorldCenter());
      this.srcHandle.style.left = (p.x - 5) + 'px';
      this.srcHandle.style.top = (p.y - 5) + 'px';
      this.srcHandle.style.display = 'block';
    }
    if (tNode && this.tgtHandle) {
      const p = graph.canvas2Viewport(tNode.getWorldCenter());
      this.tgtHandle.style.left = (p.x - 5) + 'px';
      this.tgtHandle.style.top = (p.y - 5) + 'px';
      this.tgtHandle.style.display = 'block';
    }
  }

  private bindDrag(h: HTMLDivElement, idx: number): void {
    let start: { cx: number; cy: number; wp: Point } | null = null;
    h.addEventListener('dblclick', (e: MouseEvent) => {
      e.stopPropagation();
      if (!this.activeEdge) return;
      const wps = (((this.activeEdge.getAttribute('waypoints') as Point[]) || []) as Point[]).slice();
      wps.splice(idx, 1);
      this.activeEdge.setAttribute('waypoints', wps);
      this.syncHandles();
    });
    h.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!this.activeEdge) return;
      e.stopPropagation();
      const wps = (this.activeEdge.getAttribute('waypoints') as Point[]) || [];
      start = { cx: e.clientX, cy: e.clientY, wp: { ...wps[idx] } };
    });
    const move = (e: PointerEvent): void => {
      if (!start || !this.activeEdge) return;
      const zoom = this.graph.getCamera().getZoom() || 1;
      const dx = (e.clientX - start.cx) / zoom;
      const dy = (e.clientY - start.cy) / zoom;
      const wps = (((this.activeEdge.getAttribute('waypoints') as Point[]) || []) as Point[]).slice();
      wps[idx] = { x: start.wp.x + dx, y: start.wp.y + dy };
      this.activeEdge.setAttribute('waypoints', wps);
    };
    const up = (): void => { start = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  destroy(): void {
    this.clearHandles();
    this.srcHandle?.remove();
    this.tgtHandle?.remove();
  }
}
