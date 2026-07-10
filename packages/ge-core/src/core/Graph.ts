/**
 * Graph —— 图容器，继承 g-lite Canvas。
 *
 * - 构造时注册领域自定义元素（customElements.define）。
 * - 拥抱 document API：addNode/addEdge 走 createElement + appendChild；
 *   查询走 getElementById / getElementsByClassName，无平行 Map（修复 P0-4/Registry 双轨）。
 * - 统一持有 Anchor / Router / Connector 注册表，并注入到 Edge。
 */
import { Canvas, CustomEvent } from '@antv/g-lite';
import { Renderer as CanvasRenderer } from '@antv/g-canvas';
import { Renderer as SVGRenderer } from '@antv/g-svg';
import { Node } from './Node';
import { Edge } from './Edge';
import { Port } from './Port';
import { Group } from './Group';
import { Cell } from './Cell';
import { getCellChildren } from './cell-tree';
import {
  TAG,
  CLASS,
  type GraphOptions,
  type NodeProps,
  type EdgeProps,
  type CellJSON,
  type GraphJSON,
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

const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

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
    // 挂到 document 上，Cell 通过 ownerDocument 可直接访问（兼容 g-lite ownerDocument 返回 Document 而非 Canvas）
    (this.document as any).scheduler = this.scheduler;
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
    this.fireViewportChange();
  }

  /** 设置缩放（统一出口，派发 viewportchange；外部插件改 zoom 应走这里而非直接 camera.setZoom） */
  setZoom(zoom: number): void {
    this.getCamera().setZoom(zoom);
    this.fireViewportChange();
  }

  /** viewport（pan/zoom）变化通知：Minimap 等视图订阅后更新视口框，无需轮询 afterrender */
  private fireViewportChange(): void {
    this.dispatchEvent(new CustomEvent('viewportchange', {
      detail: {
        panOffset: { x: this.panOffset.x, y: this.panOffset.y },
        zoom: this.getCamera().getZoom() || 1,
      },
    }));
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

  /** 清空所有领域根节点和边，保留 Canvas 的内部渲染树。 */
  clear(): void {
    for (const cell of getCellChildren(this as any)) cell.remove();
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
    this.setZoom(zoom);
    this.panTo((minX + maxX) / 2, (minY + maxY) / 2);
  }

  /** 动态调整画布尺寸。 */
  resize(width: number, height: number): void {
    super.resize(width, height);
    if (this._culling) this.cullViewport();
    this.fireViewportChange();
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
  /**
   * 导出为 data URL（异步）。
   * canvas 渲染器 → canvas.toDataURL；svg 渲染器 → ContextService.toDataURL 得 SVG data URL，再用 canvas 栅格化为真正的 PNG/JPEG。
   * SVG renderer 直接 toDataURL 只会产出 `data:image/svg+xml`，浏览器/图片查看器按 .png 解析会无法查看，故强制栅格化。
   */
  async toDataURL(type: string = 'image/png', quality?: number): Promise<string> {
    const domEl = this.getContextService().getDomElement();
    if ((domEl as any)?.tagName === 'CANVAS') {
      return (domEl as HTMLCanvasElement).toDataURL(type, quality);
    }
    const svgUrl = await this.getContextService().toDataURL({ type: type as any, encoderOptions: quality ?? 1 });
    return this.rasterizeSvgDataUrl(svgUrl, type, quality);
  }

  /** 把 SVG data URL 绘制到 canvas，导出真正的 PNG/JPEG；失败则回退原 SVG data URL。 */
  private async rasterizeSvgDataUrl(svgDataUrl: string, type: string, quality?: number): Promise<string> {
    const cfg = this.getConfig();
    const w = cfg.width ?? 800;
    const h = cfg.height ?? 600;
    const dpr = ((this.getContextService() as any)?.getDPR?.() as number) || (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('[GE] rasterize: SVG image load failed'));
      img.src = svgDataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return svgDataUrl;
    if (type === 'image/jpeg' || type === 'image/jpg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    try {
      return canvas.toDataURL(type, quality);
    } catch {
      // canvas 被 tainted（如含跨域 image）→ 回退 SVG data URL
      return svgDataUrl;
    }
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
  /** 序列化整个领域 Cell 树；渲染内部节点不会进入 JSON。 */
  toJSON(): GraphJSON {
    return deepClone({
      version: 1,
      viewport: {
        panX: this.panOffset.x,
        panY: this.panOffset.y,
        zoom: this.getCamera().getZoom() || 1,
      },
      cells: getCellChildren(this as any).filter((cell) => !(cell instanceof Edge)).map((cell) => this.serializeCell(cell))
        .concat(getCellChildren(this as any).filter((cell): cell is Edge => cell instanceof Edge).map((cell) => this.serializeCell(cell))),
    });
  }

  /**
   * 恢复版本化领域树。兼容旧版 { nodes, edges } 输入；未知 tag、重复 id 与非法端点抛出异常。
   */
  fromJSON(data: GraphJSON | { nodes?: Record<string, unknown>[]; edges?: Record<string, unknown>[] }): void {
    const normalized = this.normalizeJSON(data);
    this.validateJSON(normalized);
    this.clear();

    const edges: CellJSON[] = [];
    for (const cell of normalized.cells) {
      if (cell.tag === TAG.edge) edges.push(cell);
      else this.restoreCell(cell, this);
    }
    for (const edge of edges) this.restoreCell(edge, this);

    this.setZoom(normalized.viewport.zoom);
    const current = { ...this.panOffset };
    this.panBy((normalized.viewport.panX - current.x) * normalized.viewport.zoom, (normalized.viewport.panY - current.y) * normalized.viewport.zoom);
  }

  private serializeCell(cell: Cell): CellJSON {
    const tag = (cell.constructor as any).tag as string;
    return {
      tag,
      id: cell.id || undefined,
      props: deepClone({ ...cell.props }),
      data: deepClone(cell.getData()),
      children: getCellChildren(cell).map((child) => this.serializeCell(child)),
    };
  }

  private restoreCell(json: CellJSON, parent: any): Cell {
    const cell = this.document.createElement<Cell, any>(json.tag, { id: json.id, style: deepClone(json.props) });
    if (cell instanceof Edge) {
      cell.resolveAnchor = (name) => this.anchors.resolveNode(name ?? 'perimeter');
      cell.resolveRouter = (name) => this.routers.resolve(name ?? 'normal');
      cell.resolveConnector = (name) => this.connectors.resolve(name ?? 'rounded');
    }
    parent.appendChild(cell);
    if (Object.keys(json.data).length > 0) cell.setData(deepClone(json.data));
    for (const child of json.children) this.restoreCell(child, cell);
    return cell;
  }

  private normalizeJSON(data: GraphJSON | { nodes?: Record<string, unknown>[]; edges?: Record<string, unknown>[] }): GraphJSON {
    if ('version' in data && 'cells' in data) return deepClone(data as GraphJSON);
    return {
      version: 1,
      viewport: { panX: this.panOffset.x, panY: this.panOffset.y, zoom: this.getCamera().getZoom() || 1 },
      cells: [
        ...((data.nodes ?? []).map((props) => ({ tag: TAG.node, id: props.id as string | undefined, props, data: {}, children: [] }))),
        ...((data.edges ?? []).map((props) => ({ tag: TAG.edge, id: props.id as string | undefined, props, data: {}, children: [] }))),
      ].map((cell) => deepClone(cell)),
    };
  }

  private validateJSON(data: GraphJSON): void {
    if (data.version !== 1 || !Array.isArray(data.cells)) throw new Error('[GE] 无效 GraphJSON。');
    const ids = new Set<string>();
    const validateCell = (cell: CellJSON, allowEdge: boolean): void => {
      if (![TAG.node, TAG.group, TAG.port, TAG.edge].includes(cell.tag as any)) throw new Error(`[GE] 未知 Cell tag: ${cell.tag}`);
      if (!allowEdge && cell.tag === TAG.edge) throw new Error('[GE] Edge 只能位于 Graph 根节点。');
      if (cell.id) {
        if (ids.has(cell.id)) throw new Error(`[GE] 重复 Cell id: ${cell.id}`);
        ids.add(cell.id);
      }
      if (!cell.props || !cell.data || !Array.isArray(cell.children)) throw new Error('[GE] 非法 CellJSON。');
      for (const child of cell.children) {
        if (cell.tag !== TAG.node && cell.tag !== TAG.group) throw new Error('[GE] 只有 Node/Group 可以拥有领域子元素。');
        if (child.tag !== TAG.node && child.tag !== TAG.group && child.tag !== TAG.port) throw new Error('[GE] 非法领域子元素。');
        validateCell(child, false);
      }
    };
    for (const cell of data.cells) validateCell(cell, true);
    for (const cell of data.cells.filter((item) => item.tag === TAG.edge)) {
      for (const endpoint of [cell.props.source, cell.props.target]) {
        const id = typeof endpoint === 'string' ? endpoint : (endpoint as any)?.cell;
        const isPoint = typeof endpoint === 'object' && endpoint !== null
          && typeof (endpoint as any).x === 'number' && typeof (endpoint as any).y === 'number';
        if (!isPoint && (!id || !ids.has(id))) throw new Error(`[GE] Edge 引用了不存在的端点: ${String(id)}`);
      }
    }
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
    if (this.getPlugin(plugin.name)) {
      throw new Error(`[GE] Plugin "${plugin.name}" 已安装；请先调用 graph.dispose("${plugin.name}")。`);
    }
    plugin.init(this);
    this.plugins.push(plugin);
    return plugin;
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.find((p) => p.name === name);
  }

  /** 卸载指定插件并释放其事件/DOM 资源。 */
  dispose(name: string): boolean {
    const index = this.plugins.findIndex((plugin) => plugin.name === name);
    if (index < 0) return false;
    const [plugin] = this.plugins.splice(index, 1);
    plugin.destroy();
    return true;
  }

  /** 销毁 Graph 前先销毁插件和调度器，避免全局监听器与 rAF 泄漏。 */
  destroy(cleanUp?: boolean, skipTriggerEvent?: boolean): void {
    for (const plugin of [...this.plugins].reverse()) plugin.destroy();
    this.plugins = [];
    this.scheduler.destroy();
    super.destroy(cleanUp, skipTriggerEvent);
  }
}
