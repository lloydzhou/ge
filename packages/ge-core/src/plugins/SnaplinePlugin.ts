/**
 * SnaplinePlugin —— 对齐辅助线（视觉提示版）。
 *
 * - 监听 `node:boundschange`（拖拽时触发），检测被拖节点与其余节点的边缘/中心对齐。
 * - 命中阈值内时，在视口 overlay 上绘制红色辅助线（世界坐标经 canvas2Viewport 转换）。
 */
import { Plugin } from './plugin';

export interface SnaplineOptions {
  /** 对齐命中阈值（世界坐标 px） */
  threshold?: number;
  color?: string;
}

export class SnaplinePlugin extends Plugin {
  readonly name = 'snapline';
  private threshold: number;
  private color: string;
  private layer?: HTMLDivElement;
  private readonly onBoundsChange = (event: any): void => this.detect(event.target);
  private readonly onPointerUp = (): void => this.clear();

  constructor(options: SnaplineOptions = {}) {
    super();
    this.threshold = options.threshold ?? 6;
    this.color = options.color ?? '#fa541c';
  }

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    this.layer = document.createElement('div');
    this.layer.setAttribute('data-ge-snapline', 'true');
    this.layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:6;';
    container.appendChild(this.layer);

    graph.addEventListener('node:boundschange', this.onBoundsChange);
    graph.addEventListener('pointerup', this.onPointerUp);
    graph.addEventListener('pointerupoutside', this.onPointerUp);
  }

  private detect(node: any): void {
    this.clear();
    if (!this.layer) return;
    const a = node.getWorldBBox();
    const aXs = [a.x + a.width / 2, a.x, a.x + a.width];
    const aYs = [a.y + a.height / 2, a.y, a.y + a.height];
    const vlines: number[] = [];
    const hlines: number[] = [];
    for (const other of this.graph.getNodes()) {
      if (other === node) continue;
      const b = other.getWorldBBox();
      const bXs = [b.x + b.width / 2, b.x, b.x + b.width];
      const bYs = [b.y + b.height / 2, b.y, b.y + b.height];
      for (const ax of aXs) {
        for (const bx of bXs) {
          if (Math.abs(ax - bx) < this.threshold && !vlines.includes(bx)) vlines.push(bx);
        }
      }
      for (const ay of aYs) {
        for (const by of bYs) {
          if (Math.abs(ay - by) < this.threshold && !hlines.includes(by)) hlines.push(by);
        }
      }
    }
    this.render(vlines, hlines);
  }

  private render(vlines: number[], hlines: number[]): void {
    if (!this.layer) return;
    let html = '';
    for (const x of vlines) {
      const p = this.graph.canvas2Viewport({ x, y: 0 });
      html += `<div style="position:absolute;left:${p.x}px;top:0;width:1px;height:100%;background:${this.color};"></div>`;
    }
    for (const y of hlines) {
      const p = this.graph.canvas2Viewport({ x: 0, y });
      html += `<div style="position:absolute;left:0;top:${p.y}px;width:100%;height:1px;background:${this.color};"></div>`;
    }
    this.layer.innerHTML = html;
  }

  clear(): void {
    if (this.layer) this.layer.innerHTML = '';
  }

  destroy(): void {
    this.graph.removeEventListener('node:boundschange', this.onBoundsChange);
    this.graph.removeEventListener('pointerup', this.onPointerUp);
    this.graph.removeEventListener('pointerupoutside', this.onPointerUp);
    this.layer?.remove();
    super.destroy();
  }
}
