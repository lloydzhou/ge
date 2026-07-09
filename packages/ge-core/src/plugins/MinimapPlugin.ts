/**
 * MinimapPlugin —— 缩略导航图。
 *
 * - canvas 2D 高清（dpr）绘制：节点按真实形状（Path2D）+ 边（中心连线）。
 * - 用 attribute 直接算 bbox（逻辑坐标，不用 getWorldBBox 矩阵计算）。
 * - 视口框 + 拖拽导航。
 */
import { Plugin } from './plugin';

export interface MinimapOptions {
  width?: number;
  height?: number;
  padding?: number;
  nodeColor?: string;
  edgeColor?: string;
  viewportStroke?: string;
  viewportFill?: string;
}

interface ViewParam {
  minX: number;
  minY: number;
  scale: number;
  pad: number;
}

export class MinimapPlugin extends Plugin {
  readonly name = 'minimap';
  private opts: Required<MinimapOptions>;
  private canvasEl?: HTMLCanvasElement;
  private rafId = 0;
  private view: ViewParam = { minX: 0, minY: 0, scale: 1, pad: 12 };

  constructor(options: MinimapOptions = {}) {
    super();
    this.opts = {
      width: options.width ?? 220,
      height: options.height ?? 160,
      padding: options.padding ?? 12,
      nodeColor: options.nodeColor ?? '#1890ff',
      edgeColor: options.edgeColor ?? '#bfbfbf',
      viewportStroke: options.viewportStroke ?? '#1890ff',
      viewportFill: options.viewportFill ?? 'rgba(24,144,255,0.10)',
    };
  }

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    const dpr = window.devicePixelRatio || 1;
    this.canvasEl = document.createElement('canvas');
    this.canvasEl.setAttribute('data-ge-minimap', 'true');
    this.canvasEl.width = this.opts.width * dpr;
    this.canvasEl.height = this.opts.height * dpr;
    this.canvasEl.style.cssText =
      `position:absolute;right:16px;bottom:16px;width:${this.opts.width}px;height:${this.opts.height}px;` +
      'background:#fff;border:1px solid #d9d9d9;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.12);cursor:pointer;z-index:10;';
    const ctx = this.canvasEl.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    container.appendChild(this.canvasEl);

    graph.addEventListener('afterrender', () => this.scheduleDraw());

    // 拖框导航
    let dragOffset: { x: number; y: number } | null = null;
    const navigate = (e: PointerEvent): void => {
      if (!this.canvasEl || !this.view) return;
      const rect = this.canvasEl.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const fcx = mx - (dragOffset?.x ?? 0);
      const fcy = my - (dragOffset?.y ?? 0);
      const worldX = this.view.minX + (fcx - this.view.pad) / this.view.scale;
      const worldY = this.view.minY + (fcy - this.view.pad) / this.view.scale;
      this.graph.panTo(worldX, worldY);
    };
    this.canvasEl.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!this.canvasEl || !this.view) return;
      const rect = this.canvasEl.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const vp = this.viewportWorldBBox();
      const fcx = this.view.pad + (vp.x + vp.width / 2 - this.view.minX) * this.view.scale;
      const fcy = this.view.pad + (vp.y + vp.height / 2 - this.view.minY) * this.view.scale;
      const fw = vp.width * this.view.scale;
      const fh = vp.height * this.view.scale;
      const inside = Math.abs(mx - fcx) <= fw / 2 && Math.abs(my - fcy) <= fh / 2;
      dragOffset = inside ? { x: mx - fcx, y: my - fcy } : { x: 0, y: 0 };
      navigate(e);
    });
    window.addEventListener('pointermove', (e: PointerEvent) => { if (dragOffset) navigate(e); });
    window.addEventListener('pointerup', () => { dragOffset = null; });
  }

  private scheduleDraw(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => { this.rafId = 0; this.draw(); });
  }

  /** 用 attribute 直接构造 bbox（逻辑坐标，不用 getWorldBBox 矩阵计算） */
  private nodeBBox = (n: any) => ({
    x: (n.getAttribute('x') as number) ?? 0,
    y: (n.getAttribute('y') as number) ?? 0,
    width: (n.getAttribute('width') as number) ?? 0,
    height: (n.getAttribute('height') as number) ?? 0,
  });

  private draw(): void {
    const ctx = this.canvasEl?.getContext('2d');
    if (!ctx || !this.canvasEl) return;
    const W = this.opts.width;
    const H = this.opts.height;
    const pad = this.opts.padding;
    ctx.clearRect(0, 0, W, H);

    const nodes = this.graph.getNodes();
    const edges = this.graph.getEdges();
    if (nodes.length === 0) return;

    const items = nodes.map((n: any) => ({
      bbox: this.nodeBBox(n),
      shape: n.getAttribute('shape'),
      fill: n.getAttribute('fill'),
      stroke: n.getAttribute('stroke'),
    }));
    const view = this.viewportWorldBBox();

    // 内容范围（含视口框）
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const it of items) {
      minX = Math.min(minX, it.bbox.x);
      minY = Math.min(minY, it.bbox.y);
      maxX = Math.max(maxX, it.bbox.x + it.bbox.width);
      maxY = Math.max(maxY, it.bbox.y + it.bbox.height);
    }
    const ncx = (minX + maxX) / 2;
    const ncy = (minY + maxY) / 2;
    minX = Math.min(minX, ncx - view.width / 2);
    maxX = Math.max(maxX, ncx + view.width / 2);
    minY = Math.min(minY, ncy - view.height / 2);
    maxY = Math.max(maxY, ncy + view.height / 2);

    const scale = Math.min(
      (W - 2 * pad) / Math.max(1, maxX - minX),
      (H - 2 * pad) / Math.max(1, maxY - minY),
    );
    this.view = { minX, minY, scale, pad };
    const map = (x: number, y: number) => ({
      x: pad + (x - minX) * scale,
      y: pad + (y - minY) * scale,
    });

    // 边（attribute 中心连线）
    ctx.strokeStyle = this.opts.edgeColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const e of edges) {
      const s = e.getAttribute('source');
      const t = e.getAttribute('target');
      const sid = typeof s === 'string' ? s : s?.cell;
      const tid = typeof t === 'string' ? t : t?.cell;
      const sn = this.graph.getNode(sid);
      const tn = this.graph.getNode(tid);
      if (!sn || !tn) continue;
      const sb = this.nodeBBox(sn);
      const tb = this.nodeBBox(tn);
      const a = map(sb.x + sb.width / 2, sb.y + sb.height / 2);
      const b = map(tb.x + tb.width / 2, tb.y + tb.height / 2);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    // 节点：画实际形状（从 ShapeRegistry 提取 Path d）
    const shapes = (this.graph as any).shapes;
    for (const it of items) {
      const p = map(it.bbox.x, it.bbox.y);
      const w = it.bbox.width * scale;
      const h = it.bbox.height * scale;

      ctx.fillStyle = it.fill || this.opts.nodeColor;

      if (it.shape === 'circle' || it.shape === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(p.x + w / 2, p.y + h / 2, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (shapes) {
        // Path-based shape → 从 ShapeRegistry 提取 d 字符串，用 Path2D 画
        const def = shapes.resolve(it.shape);
        if (def?.create) {
          const tmp: any = def.create({ width: it.bbox.width, height: it.bbox.height } as any);
          const d = tmp?.getAttribute?.('d');
          if (d) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(scale, scale);
            ctx.fill(new Path2D(d));
            ctx.restore();
          } else {
            ctx.fillRect(p.x, p.y, Math.max(2, w), Math.max(2, h));
          }
          tmp?.destroy?.();
        } else {
          ctx.fillRect(p.x, p.y, Math.max(2, w), Math.max(2, h));
        }
      } else {
        ctx.fillRect(p.x, p.y, Math.max(2, w), Math.max(2, h));
      }
    }

    // 视口框
    const vp = map(view.x, view.y);
    const vw = Math.max(4, view.width * scale);
    const vh = Math.max(4, view.height * scale);
    ctx.fillStyle = this.opts.viewportFill;
    ctx.fillRect(vp.x, vp.y, vw, vh);
    ctx.strokeStyle = this.opts.viewportStroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vp.x, vp.y, vw, vh);
  }

  private viewportWorldBBox(): { x: number; y: number; width: number; height: number } {
    const cfg = this.graph.getConfig();
    const w = cfg.width ?? 800;
    const h = cfg.height ?? 600;
    const tl = this.graph.viewport2Canvas({ x: 0, y: 0 }) as any;
    const br = this.graph.viewport2Canvas({ x: w, y: h }) as any;
    return {
      x: Math.min(tl.x, br.x),
      y: Math.min(tl.y, br.y),
      width: Math.abs(br.x - tl.x),
      height: Math.abs(br.y - tl.y),
    };
  }

  destroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.canvasEl?.remove();
  }
}
