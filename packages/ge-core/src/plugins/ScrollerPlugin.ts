/** 画布平移与缩放。 */
import { Plugin } from './plugin';

export interface ScrollerOptions { zoomFactor?: number; minZoom?: number; maxZoom?: number; panOnBlank?: boolean; }

export class ScrollerPlugin extends Plugin {
  readonly name = 'scroller';
  private opts: Required<ScrollerOptions>;
  private panning: { x: number; y: number } | null = null;
  private readonly onWheel = (event: any): void => {
    const camera = this.graph.getCamera();
    const factor = event.deltaY < 0 ? this.opts.zoomFactor : 1 / this.opts.zoomFactor;
    const current = camera.getZoom(), next = clamp(current * factor, this.opts.minZoom, this.opts.maxZoom);
    if (Math.abs(next - current) < 1e-6) return;
    const cursor = { x: event.viewportX, y: event.viewportY }, world = this.graph.viewport2Canvas(cursor);
    if (typeof this.graph.setZoom === 'function') this.graph.setZoom(next); else camera.setZoom(next);
    const after = this.graph.canvas2Viewport(world);
    this.graph.panBy(cursor.x - after.x, cursor.y - after.y);
  };
  private readonly onPointerDown = (event: any): void => {
    if (!this.opts.panOnBlank || event.button === 0 || this.graph.pickNode(event.viewportX, event.viewportY)) return;
    this.panning = { x: event.viewportX, y: event.viewportY };
  };
  private readonly onPointerMove = (event: any): void => {
    if (!this.panning) return;
    this.graph.panBy(event.viewportX - this.panning.x, event.viewportY - this.panning.y);
    this.panning = { x: event.viewportX, y: event.viewportY };
  };
  private readonly onPointerUp = (): void => { this.panning = null; };

  constructor(options: ScrollerOptions = {}) {
    super();
    this.opts = { zoomFactor: options.zoomFactor ?? 1.1, minZoom: options.minZoom ?? 0.1, maxZoom: options.maxZoom ?? 10, panOnBlank: options.panOnBlank ?? true };
  }

  init(graph: any): void {
    super.init(graph);
    graph.addEventListener('wheel', this.onWheel);
    graph.addEventListener('pointerdown', this.onPointerDown);
    graph.addEventListener('pointermove', this.onPointerMove);
    graph.addEventListener('pointerup', this.onPointerUp);
    graph.addEventListener('pointerupoutside', this.onPointerUp);
  }

  destroy(): void {
    this.graph.removeEventListener('wheel', this.onWheel);
    this.graph.removeEventListener('pointerdown', this.onPointerDown);
    this.graph.removeEventListener('pointermove', this.onPointerMove);
    this.graph.removeEventListener('pointerup', this.onPointerUp);
    this.graph.removeEventListener('pointerupoutside', this.onPointerUp);
    this.panning = null;
    super.destroy();
  }
}

const clamp = (value: number, min: number, max: number): number => value < min ? min : value > max ? max : value;
