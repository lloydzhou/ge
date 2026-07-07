/**
 * Graph —— 图容器，继承 g-lite Canvas。
 *
 * - 构造时注册领域自定义元素（customElements.define）。
 * - 拥抱 document API：addNode/addEdge 走 createElement + appendChild；
 *   查询走 getElementById / getElementsByClassName，无平行 Map（修复 P0-4/Registry 双轨）。
 * - 统一持有 Anchor / Router / Connector 注册表，并注入到 Edge。
 */
import { Canvas } from '@antv/g-lite';
import { Renderer as CanvasRenderer } from '@antv/g-canvas';
import { Renderer as SVGRenderer } from '@antv/g-svg';
import { Node } from './Node';
import { Edge } from './Edge';
import { Port } from './Port';
import { Group } from './Group';
import {
  TAG,
  CLASS,
  type GraphOptions,
  type NodeProps,
  type EdgeProps,
} from './types';
import {
  createDefaultAnchorRegistry,
  type AnchorRegistry,
} from '../anchor';
import {
  createDefaultRouterRegistry,
  type RouterRegistry,
} from '../edge/router';
import {
  createDefaultConnectorRegistry,
  type ConnectorRegistry,
} from '../edge/connector';
import { createDefaultShapeRegistry, type ShapeRegistry } from '../shape';
import type { Plugin } from '../plugins/plugin';
import { Scheduler } from './Scheduler';

const resolveContainer = (c: HTMLElement | string): HTMLElement =>
  typeof c === 'string' ? document.querySelector<HTMLElement>(c)! : c;

export class Graph extends Canvas {
  readonly anchors: AnchorRegistry;
  readonly shapes: ShapeRegistry;
  readonly routers: RouterRegistry;
  readonly connectors: ConnectorRegistry;
  /** 全局渲染调度器（rAF 合并 dirty cell，仿浏览器渲染队列） */
  readonly scheduler: Scheduler;
  private plugins: Plugin[] = [];
  /** pan 偏移（世界坐标），由 panBy 累积；坐标转换用 2D 公式保证与 SVG 渲染一致 */
  panOffset = { x: 0, y: 0 };

  constructor(options: GraphOptions) {
    const container = resolveContainer(options.container);
    const width = options.width ?? container.clientWidth ?? 800;
    const height = options.height ?? container.clientHeight ?? 600;
    const renderer = options.renderer === 'canvas' ? new CanvasRenderer() : new SVGRenderer();
    super({
      container,
      width,
      height,
      renderer,
      background: options.background,
    });
    this.anchors = createDefaultAnchorRegistry();
    this.shapes = createDefaultShapeRegistry();
    this.routers = createDefaultRouterRegistry();
    this.connectors = createDefaultConnectorRegistry();
    this.scheduler = new Scheduler();
    this.registerElements();
    this.addEventListener('afterrender', () => { if (this._culling) this.cullViewport(); });
  }

  /** 平移画布（dx,dy 视口像素）。用 root.translate（2D）而非 camera.position（g-lite SVG 下不一致） */
  panBy(dvx: number, dvy: number): void {
    const zoom = this.getCamera().getZoom() || 1;
    const dwx = dvx / zoom;
    const dwy = dvy / zoom;
    this.panOffset.x += dwx;
    this.panOffset.y += dwy;
    (this as any).document.documentElement.translate(dwx, dwy);
  }

  /** 平移使世界点 (worldX, worldY) 位于视口中心（minimap 导航用） */
  panTo(worldX: number, worldY: number): void {
    const zoom = this.getCamera().getZoom() || 1;
    const cfg = this.getConfig();
    const cx = (cfg.width ?? 800) / 2;
    const cy = (cfg.height ?? 600) / 2;
    const targetOffX = cx - worldX;
    const targetOffY = cy - worldY;
    const dvx = (targetOffX - this.panOffset.x) * zoom;
    const dvy = (targetOffY - this.panOffset.y) * zoom;
    this.panBy(dvx, dvy);
  }

  /** 世界 → 视口（2D 中心缩放：与 root.translate + setZoom 渲染一致） */
  canvas2Viewport(canvasP: { x: number; y: number }): { x: number; y: number } {
    const zoom = this.getCamera().getZoom() || 1;
    const cfg = this.getConfig();
    const cx = (cfg.width ?? 800) / 2;
    const cy = (cfg.height ?? 600) / 2;
    return {
      x: (canvasP.x + this.panOffset.x - cx) * zoom + cx,
      y: (canvasP.y + this.panOffset.y - cy) * zoom + cy,
    };
  }

  /** 视口 → 世界 */
  viewport2Canvas(vp: { x: number; y: number }): { x: number; y: number } {
    const zoom = this.getCamera().getZoom() || 1;
    const cfg = this.getConfig();
    const cx = (cfg.width ?? 800) / 2;
    const cy = (cfg.height ?? 600) / 2;
    return {
      x: (vp.x - cx) / zoom - this.panOffset.x + cx,
      y: (vp.y - cy) / zoom - this.panOffset.y + cy,
    };
  }

  /**
   * 命中测试：视口点 → 顶层节点。
   * 用 viewport2Canvas + 节点 world bbox 自行判断（不依赖 g-lite 的 e.target hit test，
   * 后者不识别 root.translate 平移，pan 后会命中错位）。
   */
  pickNode(viewportX: number, viewportY: number): any {
    const w = this.viewport2Canvas({ x: viewportX, y: viewportY });
    const nodes = this.getNodes();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i] as any;
      const bb = n.getWorldBBox();
      if (w.x >= bb.x && w.x <= bb.x + bb.width && w.y >= bb.y && w.y <= bb.y + bb.height) {
        return n;
      }
    }
    return null;
  }

  protected registerElements(): void {
    this.customElements.define(TAG.node, Node);
    this.customElements.define(TAG.edge, Edge);
    this.customElements.define(TAG.port, Port);
    this.customElements.define(TAG.group, Group);
  }

  // ---- 增删 API（走 document.createElement + appendChild） ----
  addNode(props: NodeProps & { id?: string }): Node {
    if (props.id && this.getNode(props.id)) {
      console.warn(`[GE] Duplicate node id "${props.id}" — getElementById will return the first match`);
    }
    const node = this.document.createElement<Node, any>(TAG.node, { id: props.id, style: props as any });
    this.appendChild(node);
    return node;
  }

  addEdge(props: EdgeProps & { id?: string }): Edge {
    const edge = this.document.createElement<Edge, any>(TAG.edge, { id: props.id, style: props as any });
    edge.resolveAnchor = (n) => this.anchors.resolveNode(n ?? 'perimeter');
    edge.resolveRouter = (n) => this.routers.resolve(n ?? 'normal');
    edge.resolveConnector = (n) => this.connectors.resolve(n ?? 'rounded');
    this.appendChild(edge);
    return edge;
  }

  addGroup(props: NodeProps & { id?: string }): Group {
    const group = this.document.createElement<Group, any>(TAG.group, { id: props.id, style: props as any });
    this.appendChild(group);
    return group;
  }

  addPort(node: Node, props: { id?: string; x?: number; y?: number; r?: number; fill?: string }): Port {
    const port = this.document.createElement<Port, any>(TAG.port, { id: props.id, style: props as any });
    node.appendChild(port);
    return port;
  }

  removeCell(id: string): void {
    const cell = this.document.getElementById(id);
    if (!cell) return;
    // 删除节点时连带清理以其为端点的边，避免孤儿边 / 数据不一致
    const cls = (cell as any).className;
    if (typeof cls === 'string' && cls.includes(CLASS.node)) {
      for (const e of this.getEdges()) {
        const s = e.getAttribute('source');
        const t = e.getAttribute('target');
        const sid = typeof s === 'string' ? s : s?.cell;
        const tid = typeof t === 'string' ? t : t?.cell;
        if (sid === id || tid === id) e.remove();
      }
    }
    cell.remove();
  }

  /** 批量操作（History 合并为一次 undo/redo） */
  batch(fn: () => void): void {
    const history = this.getPlugin('history') as any;
    history?.mark?.();
    fn();
    history?.commit?.();
  }

  // ---- 查询 API（走 document API，无平行 Map） ----
  getNode(id: string): Node | null {
    return this.document.getElementById<Node>(id);
  }

  getNodes(): Node[] {
    return this.document.getElementsByClassName<Node>(CLASS.node);
  }

  getEdges(): Edge[] {
    return this.document.getElementsByClassName<Edge>(CLASS.edge);
  }

  /** 获取所有元素（节点 + 边） */
  getCells(): (Node | Edge)[] {
    return [...this.getNodes(), ...this.getEdges()];
  }

  /** 清空所有节点和边 */
  clear(): void {
    for (const e of this.getEdges()) e.remove();
    for (const n of this.getNodes()) n.remove();
  }

  /** 缩放并平移使所有内容适配视口 */
  zoomToFit(padding = 20): void {
    const nodes = this.getNodes();
    if (nodes.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes as any[]) {
      const bb = n.getWorldBBox();
      minX = Math.min(minX, bb.x); minY = Math.min(minY, bb.y);
      maxX = Math.max(maxX, bb.x + bb.width); maxY = Math.max(maxY, bb.y + bb.height);
    }
    const cfg = this.getConfig();
    const vw = (cfg.width ?? 800) - padding * 2;
    const vh = (cfg.height ?? 600) - padding * 2;
    const cw = maxX - minX, ch = maxY - minY;
    if (cw <= 0 || ch <= 0) return;
    const zoom = Math.min(vw / cw, vh / ch, 2);
    this.getCamera().setZoom(zoom);
    this.panTo((minX + maxX) / 2, (minY + maxY) / 2);
  }

  /** 动态调整画布尺寸 */
  resize(width: number, height: number): void {
    const cfg = this.getConfig() as any;
    cfg.width = width;
    cfg.height = height;
  }

  /** 聚焦到指定节点（平移使其居中，easeOutCubic 动画） */
  focusNode(id: string, animate = true): void {
    const node = this.getNode(id);
    if (!node) return;
    const c = node.getWorldCenter();
    const tx = c.x;
    const ty = c.y;
    if (!animate) { this.panTo(tx, ty); return; }
    const cfg = this.getConfig();
    const cx = (cfg.width ?? 800) / 2;
    const cy = (cfg.height ?? 600) / 2;
    const dxWorld = (cx - tx) - this.panOffset.x;
    const dyWorld = (cy - ty) - this.panOffset.y;
    const zoom = this.getCamera().getZoom() || 1;
    const dur = 300;
    const t0 = performance.now();
    let lastE = 0;
    const step = (now: number): void => {
      const t = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      const deltaE = e - lastE;
      lastE = e;
      this.panBy(dxWorld * deltaE * zoom, dyWorld * deltaE * zoom);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---- 虚拟渲染（viewport culling） ----
  private _culling = false;
  /** 启用/禁用视口裁剪（大图性能优化，只渲染可见节点） */
  set culling(v: boolean) {
    this._culling = v;
    if (!v) { for (const n of this.getNodes() as any[]) if (n.getAttribute('visible') !== false) (n as any).visible = true; }
    else this.cullViewport();
  }
  get culling(): boolean { return this._culling; }

  /** 裁剪视口外节点（隐藏不可见的，提升大图性能） */
  cullViewport(): void {
    if (!this._culling) return;
    const cfg = this.getConfig();
    const w = cfg.width ?? 800, h = cfg.height ?? 600;
    const tl = this.viewport2Canvas({ x: 0, y: 0 });
    const br = this.viewport2Canvas({ x: w, y: h });
    const minX = Math.min(tl.x, br.x), maxX = Math.max(tl.x, br.x);
    const minY = Math.min(tl.y, br.y), maxY = Math.max(tl.y, br.y);
    for (const n of this.getNodes() as any[]) {
      if (n.getAttribute('visible') === false) continue;
      const bb = n.getWorldBBox();
      const inView = bb.x + bb.width >= minX && bb.x <= maxX && bb.y + bb.height >= minY && bb.y <= maxY;
      if ((n as any).visible !== inView) (n as any).visible = inView;
    }
  }

  // ---- 导出 ----
  /** 导出为 data URL：canvas 渲染→PNG，svg 渲染→SVG data URL */
  toDataURL(type: string = 'image/png', quality?: number): string {
    const container = this.getConfig().container as HTMLElement;
    const canvas = container.querySelector('canvas');
    if (canvas) return (canvas as HTMLCanvasElement).toDataURL(type, quality);
    const svg = container.querySelector('svg');
    if (svg) {
      const xml = new XMLSerializer().serializeToString(svg);
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    }
    throw new Error('[GE] no canvas/svg element found for export');
  }

  /** 导出为 SVG 字符串（含 xmlns，可直接保存 .svg 文件） */
  toSVGString(): string {
    const container = this.getConfig().container as HTMLElement;
    const svg = container.querySelector('svg');
    if (!svg) return '';
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(clone);
  }

  // ---- 序列化 ----
  toJSON(): { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } {
    // 直接返回 Cell 的 props model（用户设的所有字段都保留，不漏 data/stateStyles 等）
    const nodes = this.getNodes().map((n: any) => ({ ...n.props }));
    const edges = this.getEdges().map((e: any) => ({ ...e.props }));
    return { nodes, edges };
  }

  fromJSON(data: { nodes?: Record<string, unknown>[]; edges?: Record<string, unknown>[] }): void {
    for (const n of this.getNodes()) n.remove();
    for (const e of this.getEdges()) e.remove();
    for (const node of data.nodes ?? []) this.addNode(node as NodeProps & { id?: string });
    for (const edge of data.edges ?? []) this.addEdge(edge as EdgeProps & { id?: string });
  }

  // ---- 布局 ----
  /** 应用布局结果（节点 id → 世界坐标）到图中 */
  applyLayout(positions: Map<string, { x: number; y: number }>): void {
    positions.forEach((p, id) => {
      this.getNode(id)?.moveTo(p.x, p.y);
    });
    // g-lite 多节点连续 setLocalPosition 后 body local 可能错位，强制重置
    for (const n of this.getNodes() as any[]) {
      if (n.body) n.body.setLocalPosition(0, 0);
    }
  }

  // ---- 插件 ----
  use<T extends Plugin>(plugin: T): T {
    plugin.init(this);
    this.plugins.push(plugin);
    return plugin;
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.find((p) => p.name === name);
  }
}
