/**
 * ScrollerPlugin —— 画布平移与缩放。
 *
 * - wheel：以光标为中心缩放（camera.setZoomByViewportPoint）。
 * - 空白处拖拽：平移画布（camera.pan），不与节点拖拽冲突（节点上交给 DragPlugin）。
 */
import { Plugin, closestCell } from './plugin';

export interface ScrollerOptions {
  /** 每次滚轮缩放因子 */
  zoomFactor?: number;
  minZoom?: number;
  maxZoom?: number;
  /** 是否启用空白拖拽平移 */
  panOnBlank?: boolean;
}

export class ScrollerPlugin extends Plugin {
  readonly name = 'scroller';
  private opts: Required<ScrollerOptions>;
  private panning: { x: number; y: number } | null = null;

  constructor(options: ScrollerOptions = {}) {
    super();
    this.opts = {
      zoomFactor: options.zoomFactor ?? 1.1,
      minZoom: options.minZoom ?? 0.1,
      maxZoom: options.maxZoom ?? 10,
      panOnBlank: options.panOnBlank ?? true,
    };
  }

  init(graph: any): void {
    super.init(graph);
    const camera = graph.getCamera();
    const { zoomFactor, minZoom, maxZoom, panOnBlank } = this.opts;

    graph.addEventListener('wheel', (e: any) => {
      const factor = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
      const cur = camera.getZoom();
      const next = clamp(cur * factor, minZoom, maxZoom);
      if (Math.abs(next - cur) < 1e-6) return;
      // 以光标为中心：保持光标处世界坐标不变（pan 未实现时退化为中心缩放）
      const wBefore = graph.viewport2Canvas({ x: e.viewportX, y: e.viewportY });
      camera.setZoom(next);
      try {
        const wAfter = graph.viewport2Canvas({ x: e.viewportX, y: e.viewportY });
        camera.pan((wBefore as any).x - (wAfter as any).x, (wBefore as any).y - (wAfter as any).y);
      } catch {
        /* 退化为中心缩放 */
      }
    });

    graph.addEventListener('pointerdown', (e: any) => {
      if (!panOnBlank) return;
      if (closestCell(e.target)) return; // 点在节点上交给 Drag
      this.panning = { x: e.viewportX, y: e.viewportY };
    });

    graph.addEventListener('pointermove', (e: any) => {
      if (!this.panning) return;
      const dx = e.viewportX - this.panning.x;
      const dy = e.viewportY - this.panning.y;
      const z = camera.getZoom() || 1;
      const pos = camera.getPosition();
      camera.setPosition(pos[0] - dx / z, pos[1] - dy / z, pos[2]);
      this.panning = { x: e.viewportX, y: e.viewportY };
    });

    const end = (): void => {
      this.panning = null;
    };
    graph.addEventListener('pointerup', end);
    graph.addEventListener('pointerupoutside', end);
  }
}

const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);
