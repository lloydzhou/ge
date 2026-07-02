/**
 * VertexPlugin —— 边路径控制点（vertices）编辑。
 *
 * - 双击边 → 在双击处添加一个 waypoint（控制点），边变为 source→[waypoint]→target。
 * - 拖拽控制点 → 实时更新该 waypoint 位置，边重算路径。
 * - 控制点随画布 pan/zoom / 节点移动实时跟随（afterrender）。
 * - 点击空白取消激活。
 */
import { Plugin, closestEdge } from './plugin';
import type { Point } from '../utils/types';

export class VertexPlugin extends Plugin {
  readonly name = 'vertex';
  private activeEdge?: any;
  private handles: HTMLDivElement[] = [];

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    graph.addEventListener('dblclick', (e: any) => {
      const edge = closestEdge(e.target);
      if (!edge) return;
      const wps = (((edge.getAttribute('waypoints') as Point[]) || []) as Point[]).slice();
      wps.push({ x: e.canvasX, y: e.canvasY });
      edge.setAttribute('waypoints', wps);
      this.activeEdge = edge;
      this.syncHandles();
    });

    graph.addEventListener('afterrender', () => {
      if (this.activeEdge) this.syncHandles();
    });

    graph.addEventListener('pointerdown', (e: any) => {
      if (closestEdge(e.target) || e.target?.getAttribute?.('data-ge-vertex')) return;
      this.activeEdge = undefined;
      this.clearHandles();
    });
  }

  private clearHandles(): void {
    for (const h of this.handles) h.remove();
    this.handles = [];
  }

  private syncHandles(): void {
    const graph = this.graph;
    const container = graph.getConfig().container as HTMLElement;
    if (!this.activeEdge) {
      this.clearHandles();
      return;
    }
    const wps = (this.activeEdge.getAttribute('waypoints') as Point[]) || [];
    while (this.handles.length < wps.length) {
      const h = document.createElement('div');
      h.setAttribute('data-ge-vertex', 'true');
      h.style.cssText =
        'position:absolute;width:10px;height:10px;background:#fff;border:2px solid #722ed1;' +
        'border-radius:50%;cursor:move;z-index:11;pointer-events:auto;';
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
  }

  private bindDrag(h: HTMLDivElement, idx: number): void {
    let start: { cx: number; cy: number; wp: Point } | null = null;
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
    const up = (): void => {
      start = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  destroy(): void {
    this.clearHandles();
  }
}
