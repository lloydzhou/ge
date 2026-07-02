/**
 * MinimapPlugin —— 缩略导航图（专业版）。
 *
 * - canvas 2D 高清（dpr）绘制：节点按真实形状（rect/circle/ellipse）+ 边（中心连线）。
 * - 视口框：实时反映主画布的可见区域（随 pan/zoom 变化）。
 * - 拖拽导航：在小地图上按下/拖动 → 主画布 camera pan 到对应世界坐标。
 * - 实时同步：监听主画布 `afterrender`（rAF 节流），不再用 setInterval 轮询。
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
      width: options.width ?? 180,
      height: options.height ?? 130,
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

    // 实时：跟随主画布每帧渲染（rAF 合帧）
    graph.addEventListener('afterrender', () => this.scheduleDraw());

    // 拖拽导航：minimap 坐标 → 反映射到世界 → camera pan 使其居中
    let dragging = false;
    const navigate = (e: PointerEvent): void => {
      if (!this.canvasEl) return;
      const rect = this.canvasEl.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = this.view.minX + (mx - this.view.pad) / this.view.scale;
      const worldY = this.view.minY + (my - this.view.pad) / this.view.scale;
      const cam = this.graph.getCamera();
      const pos = cam.getPosition();
      cam.setPosition(worldX, worldY, pos[2]);
    };
    this.canvasEl.addEventListener('pointerdown', (e: PointerEvent) => {
      dragging = true;
      navigate(e);
    });
    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (dragging) navigate(e);
    });
    window.addEventListener('pointerup', () => {
      dragging = false;
    });
  }

  private scheduleDraw(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.draw();
    });
  }

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

    const items = nodes.map((n: any) => ({ bbox: n.getWorldBBox(), shape: n.getAttribute('shape') }));
    const view = this.viewportWorldBBox();

    // 内容范围（含视口框，确保视口可见）
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const it of items) {
      minX = Math.min(minX, it.bbox.x);
      minY = Math.min(minY, it.bbox.y);
      maxX = Math.max(maxX, it.bbox.x + it.bbox.width);
      maxY = Math.max(maxY, it.bbox.y + it.bbox.height);
    }
    minX = Math.min(minX, view.x);
    minY = Math.min(minY, view.y);
    maxX = Math.max(maxX, view.x + view.width);
    maxY = Math.max(maxY, view.y + view.height);

    const scale = Math.min(
      (W - 2 * pad) / Math.max(1, maxX - minX),
      (H - 2 * pad) / Math.max(1, maxY - minY),
    );
    this.view = { minX, minY, scale, pad };
    const map = (x: number, y: number): { x: number; y: number } => ({
      x: pad + (x - minX) * scale,
      y: pad + (y - minY) * scale,
    });

    // 边（source/target 中心连线）
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
      const sb = sn.getWorldBBox();
      const tb = tn.getWorldBBox();
      const a = map(sb.x + sb.width / 2, sb.y + sb.height / 2);
      const b = map(tb.x + tb.width / 2, tb.y + tb.height / 2);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    // 节点（按形状）
    ctx.fillStyle = this.opts.nodeColor;
    for (const it of items) {
      const p = map(it.bbox.x, it.bbox.y);
      const w = Math.max(2.5, it.bbox.width * scale);
      const h = Math.max(2.5, it.bbox.height * scale);
      if (it.shape === 'circle' || it.shape === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(p.x + w / 2, p.y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x, p.y, w, h);
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

  /** 主画布当前可见区域的世界坐标 bbox */
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
