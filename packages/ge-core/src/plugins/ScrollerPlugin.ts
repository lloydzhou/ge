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
      // 以光标为中心（2D）：记录光标处世界点，缩放后用 panBy 拉回光标
      const cursor = { x: e.viewportX, y: e.viewportY };
      const wBefore = graph.viewport2Canvas(cursor);
      camera.setZoom(next);
      const vpAfter = graph.canvas2Viewport(wBefore);
      graph.panBy(cursor.x - vpAfter.x, cursor.y - vpAfter.y);
    });

    graph.addEventListener('pointerdown', (e: any) => {
      if (!panOnBlank) return;
      if (e.button === 0) return; // 左键留给框选（SelectionPlugin）
      if (graph.pickNode(e.viewportX, e.viewportY)) return; // 点在节点上交给 Drag
      this.panning = { x: e.viewportX, y: e.viewportY };
    });

    graph.addEventListener('pointermove', (e: any) => {
      if (!this.panning) return;
      const dx = e.viewportX - this.panning.x;
      const dy = e.viewportY - this.panning.y;
      graph.panBy(dx, dy);
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
