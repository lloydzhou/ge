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

type HandleListeners = {
  onDblClick: (event: MouseEvent) => void;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: () => void;
};

export class VertexPlugin extends Plugin {
  readonly name = 'vertex';
  private activeEdge?: any;
  private handles: HTMLDivElement[] = [];
  private handleListeners = new Map<HTMLDivElement, HandleListeners>();
  private srcHandle?: HTMLDivElement;
  private tgtHandle?: HTMLDivElement;
  private endpointListeners: Array<{ handle: HTMLDivElement; onPointerDown: (event: PointerEvent) => void; onPointerUp: (event: PointerEvent) => void }> = [];
  private edgeDrag: { sx: number; sy: number; wps: any[] } | null = null;
  private readonly onDblClick = (e: any): void => {
    const edge = closestEdge(e.target);
    if (!edge || e.target?.getAttribute?.('data-ge-endpoint')) return;
    this.activeEdge = edge;
    const wps = (((edge.getAttribute('waypoints') as Point[]) || []) as Point[]).slice();
    wps.push({ x: e.canvasX, y: e.canvasY });
    edge.setAttribute('waypoints', wps);
    this.syncHandles();
  };
  private readonly onAfterRender = (): void => { if (this.activeEdge) this.syncHandles(); };
  private readonly onPointerDown = (e: any): void => {
    const edge = closestEdge(e.target);
    if (edge && edge === this.activeEdge) {
      this.edgeDrag = { sx: e.clientX, sy: e.clientY, wps: ((edge.getAttribute('waypoints') as Point[]) || []).map((p: Point) => ({ ...p })) };
      return;
    }
    if (edge || e.target?.getAttribute?.('data-ge-vertex') || e.target?.getAttribute?.('data-ge-endpoint')) return;
    this.activeEdge = undefined;
    this.clearHandles();
  };
  private readonly onPointerMove = (e: any): void => {
    if (!this.edgeDrag || !this.activeEdge) return;
    const zoom = this.graph.getCamera().getZoom() || 1;
    const dx = (e.clientX - this.edgeDrag.sx) / zoom;
    const dy = (e.clientY - this.edgeDrag.sy) / zoom;
    this.activeEdge.setAttribute('waypoints', this.edgeDrag.wps.map((wp: any) => ({ x: wp.x + dx, y: wp.y + dy })));
  };
  private readonly onPointerUp = (): void => { this.edgeDrag = null; };

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    graph.addEventListener('dblclick', this.onDblClick);
    graph.addEventListener('afterrender', this.onAfterRender);
    graph.addEventListener('pointerdown', this.onPointerDown);
    graph.addEventListener('pointermove', this.onPointerMove);
    graph.addEventListener('pointerup', this.onPointerUp);
    graph.addEventListener('pointerupoutside', this.onPointerUp);
    this.srcHandle = this.createEndpointHandle(container, 'source');
    this.tgtHandle = this.createEndpointHandle(container, 'target');
  }

  private createEndpointHandle(container: HTMLElement, type: string): HTMLDivElement {
    const handle = document.createElement('div');
    handle.setAttribute('data-ge-endpoint', type);
    const color = type === 'source' ? '#52c41a' : '#f5222d';
    handle.style.cssText = `position:absolute;width:10px;height:10px;background:${color};border:2px solid #fff;border-radius:50%;cursor:move;z-index:12;pointer-events:auto;display:none;`;
    container.appendChild(handle);
    let dragging = false;
    const onPointerDown = (e: PointerEvent): void => {
      if (!this.activeEdge) return;
      e.stopPropagation();
      dragging = true;
    };
    const onPointerUp = (e: PointerEvent): void => {
      if (!dragging || !this.activeEdge) { dragging = false; return; }
      dragging = false;
      const rect = container.getBoundingClientRect();
      const node = this.graph.pickNode(e.clientX - rect.left, e.clientY - rect.top);
      if (node) this.activeEdge.setAttribute(type, node.id);
    };
    handle.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    this.endpointListeners.push({ handle, onPointerDown, onPointerUp });
    return handle;
  }

  private removeHandleListeners(handle: HTMLDivElement): void {
    const listeners = this.handleListeners.get(handle);
    if (!listeners) return;
    handle.removeEventListener('dblclick', listeners.onDblClick);
    handle.removeEventListener('pointerdown', listeners.onPointerDown);
    window.removeEventListener('pointermove', listeners.onPointerMove);
    window.removeEventListener('pointerup', listeners.onPointerUp);
    this.handleListeners.delete(handle);
  }

  private clearHandles(): void {
    for (const handle of this.handles) {
      this.removeHandleListeners(handle);
      handle.remove();
    }
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
      const handle = document.createElement('div');
      handle.setAttribute('data-ge-vertex', 'true');
      handle.style.cssText = 'position:absolute;width:10px;height:10px;background:#fff;border:2px solid #722ed1;border-radius:50%;cursor:move;z-index:11;pointer-events:auto;';
      container.appendChild(handle);
      this.handles.push(handle);
      this.bindDrag(handle, this.handles.length - 1);
    }
    while (this.handles.length > wps.length) {
      const handle = this.handles.pop();
      if (!handle) continue;
      this.removeHandleListeners(handle);
      handle.remove();
    }
    wps.forEach((wp: Point, index: number) => {
      const point = graph.canvas2Viewport({ x: wp.x, y: wp.y });
      this.handles[index].style.left = (point.x - 5) + 'px';
      this.handles[index].style.top = (point.y - 5) + 'px';
    });
    const source = this.activeEdge.getAttribute('source');
    const target = this.activeEdge.getAttribute('target');
    const sourceNode = graph.getNode(typeof source === 'string' ? source : source?.cell);
    const targetNode = graph.getNode(typeof target === 'string' ? target : target?.cell);
    if (sourceNode && this.srcHandle) {
      const point = graph.canvas2Viewport(sourceNode.getWorldCenter());
      this.srcHandle.style.left = (point.x - 5) + 'px';
      this.srcHandle.style.top = (point.y - 5) + 'px';
      this.srcHandle.style.display = 'block';
    }
    if (targetNode && this.tgtHandle) {
      const point = graph.canvas2Viewport(targetNode.getWorldCenter());
      this.tgtHandle.style.left = (point.x - 5) + 'px';
      this.tgtHandle.style.top = (point.y - 5) + 'px';
      this.tgtHandle.style.display = 'block';
    }
  }

  private bindDrag(handle: HTMLDivElement, index: number): void {
    let start: { cx: number; cy: number; wp: Point } | null = null;
    const onDblClick = (e: MouseEvent): void => {
      e.stopPropagation();
      if (!this.activeEdge) return;
      const wps = (((this.activeEdge.getAttribute('waypoints') as Point[]) || []) as Point[]).slice();
      wps.splice(index, 1);
      this.activeEdge.setAttribute('waypoints', wps);
      this.syncHandles();
    };
    const onPointerDown = (e: PointerEvent): void => {
      if (!this.activeEdge) return;
      e.stopPropagation();
      const wps = (this.activeEdge.getAttribute('waypoints') as Point[]) || [];
      start = { cx: e.clientX, cy: e.clientY, wp: { ...wps[index] } };
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (!start || !this.activeEdge) return;
      const zoom = this.graph.getCamera().getZoom() || 1;
      const dx = (e.clientX - start.cx) / zoom;
      const dy = (e.clientY - start.cy) / zoom;
      const wps = (((this.activeEdge.getAttribute('waypoints') as Point[]) || []) as Point[]).slice();
      wps[index] = { x: start.wp.x + dx, y: start.wp.y + dy };
      this.activeEdge.setAttribute('waypoints', wps);
    };
    const onPointerUp = (): void => { start = null; };
    handle.addEventListener('dblclick', onDblClick);
    handle.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    this.handleListeners.set(handle, { onDblClick, onPointerDown, onPointerMove, onPointerUp });
  }

  destroy(): void {
    this.clearHandles();
    for (const { handle, onPointerDown, onPointerUp } of this.endpointListeners) {
      handle.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    }
    this.endpointListeners = [];
    this.srcHandle?.remove();
    this.tgtHandle?.remove();
    this.srcHandle = undefined;
    this.tgtHandle = undefined;
    this.graph.removeEventListener('dblclick', this.onDblClick);
    this.graph.removeEventListener('afterrender', this.onAfterRender);
    this.graph.removeEventListener('pointerdown', this.onPointerDown);
    this.graph.removeEventListener('pointermove', this.onPointerMove);
    this.graph.removeEventListener('pointerup', this.onPointerUp);
    this.graph.removeEventListener('pointerupoutside', this.onPointerUp);
    super.destroy();
  }
}
