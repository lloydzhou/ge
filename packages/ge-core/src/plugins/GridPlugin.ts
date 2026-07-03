/**
 * GridPlugin —— 画布背景网格。
 *
 * - 点阵 / 网格线两种风格。
 * - 随 pan/zoom 实时更新（background-position/size 跟 panOffset + zoom）。
 */
import { Plugin } from './plugin';

export interface GridOptions {
  /** 网格类型：dot 点阵 / line 网格线 */
  type?: 'dot' | 'line';
  /** 网格间距（世界坐标，默认 20） */
  size?: number;
  /** 网格颜色 */
  color?: string;
  /** 主网格间距倍数（每 N 格一条主线，0 = 无主线） */
  majorEvery?: number;
  /** 主网格颜色 */
  majorColor?: string;
}

export class GridPlugin extends Plugin {
  readonly name = 'grid';
  private opts: Required<GridOptions>;
  private layer?: HTMLDivElement;

  constructor(options: GridOptions = {}) {
    super();
    this.opts = {
      type: options.type ?? 'dot',
      size: options.size ?? 20,
      color: options.color ?? '#e8e8e8',
      majorEvery: options.majorEvery ?? 5,
      majorColor: options.majorColor ?? '#d0d0d0',
    };
  }

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    this.layer = document.createElement('div');
    this.layer.setAttribute('data-ge-grid', 'true');
    this.layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;';
    container.insertBefore(this.layer, container.firstChild);

    const update = (): void => this.update();
    graph.addEventListener('afterrender', update);
    update();
  }

  private update(): void {
    if (!this.layer || !this.graph) return;
    const zoom = this.graph.getCamera().getZoom() || 1;
    const pan = this.graph.panOffset;
    const cfg = this.graph.getConfig();
    const cx = (cfg.width ?? 800) / 2;
    const cy = (cfg.height ?? 600) / 2;
    const { size, color, type, majorEvery, majorColor } = this.opts;

    // 网格在视口的位置（中心缩放公式：viewport = (world + panOffset - center) * zoom + center）
    // world=0 的视口位置 = (0 + pan - center) * zoom + center = (pan - center) * zoom + center
    const originX = ((pan.x - cx) * zoom + cx) % (size * zoom);
    const originY = ((pan.y - cy) * zoom + cy) % (size * zoom);
    const gridSize = size * zoom;

    if (type === 'dot') {
      this.layer.style.backgroundImage = `radial-gradient(${color} 1px, transparent 1px)`;
      this.layer.style.backgroundSize = `${gridSize}px ${gridSize}px`;
      this.layer.style.backgroundPosition = `${originX}px ${originY}px`;
    } else {
      // 网格线
      const minor = `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`;
      this.layer.style.backgroundImage = minor;
      this.layer.style.backgroundSize = `${gridSize}px ${gridSize}px`;
      this.layer.style.backgroundPosition = `${originX}px ${originY}px`;
    }
    // 确保 graph 的 SVG 在网格之上
    const svg = this.layer.parentElement?.querySelector('svg');
    if (svg) svg.style.position = svg.style.position || 'relative';
  }

  destroy(): void {
    this.layer?.remove();
  }
}
