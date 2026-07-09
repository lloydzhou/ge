/**
 * MinimapPlugin —— 第二个 View 形态的缩略导航图。
 *
 * - 内部维护一个常驻 overview Graph，固定使用 canvas renderer。
 * - 初始化从主 Graph 的可序列化 cell props 构建一次，不共享 g-lite root。
 * - 后续通过 cell 事件做局部同步，不走 canvas 2D 手动画 / 截图 / 共享 root。
 * - pan / zoom 高频变化只更新 DOM 视口框，不重绘 overview graph。
 */
import { Graph } from '../core/Graph';
import { CLASS } from '../core/types';
import { Plugin } from './plugin';

export interface MinimapOptions {
  width?: number;
  height?: number;
  padding?: number;
  viewportStroke?: string;
  viewportFill?: string;
}

interface ViewParam {
  minX: number;
  minY: number;
  scale: number;
  pad: number;
}

type ListenerTarget = { addEventListener?: (type: string, fn: any) => void; removeEventListener?: (type: string, fn: any) => void };

type ListenerRecord = { target: ListenerTarget; type: string; fn: any };

export class MinimapPlugin extends Plugin {
  readonly name = 'minimap';
  private opts: Required<MinimapOptions>;
  private hostEl?: HTMLDivElement;
  private viewportEl?: HTMLDivElement;
  private overview?: Graph;
  private map = new Map<string, any>();
  private listeners: ListenerRecord[] = [];
  private view: ViewParam = { minX: 0, minY: 0, scale: 1, pad: 12 };
  private syncRafId = 0;
  private viewportRafId = 0;
  private contentDirty = true;
  private dragging = false;
  private dragOffset: { x: number; y: number } | null = null;

  constructor(options: MinimapOptions = {}) {
    super();
    this.opts = {
      width: options.width ?? 220,
      height: options.height ?? 160,
      padding: options.padding ?? 12,
      viewportStroke: options.viewportStroke ?? '#1890ff',
      viewportFill: options.viewportFill ?? 'rgba(24,144,255,0.10)',
    };
  }

  init(graph: Graph): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    this.hostEl = document.createElement('div');
    this.hostEl.setAttribute('data-ge-minimap', 'true');
    this.hostEl.style.cssText =
      `position:absolute;right:16px;bottom:16px;width:${this.opts.width}px;height:${this.opts.height}px;` +
      'background:#fff;border:1px solid #d9d9d9;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.12);' +
      'cursor:pointer;z-index:10;overflow:hidden;';
    container.appendChild(this.hostEl);

    this.viewportEl = document.createElement('div');
    this.viewportEl.setAttribute('data-ge-minimap-viewport', 'true');
    this.viewportEl.style.cssText =
      `position:absolute;left:0;top:0;box-sizing:border-box;background:${this.opts.viewportFill};` +
      `border:1.5px solid ${this.opts.viewportStroke};pointer-events:none;z-index:2;`;
    this.hostEl.appendChild(this.viewportEl);

    this.overview = new Graph({
      container: this.hostEl,
      width: this.opts.width,
      height: this.opts.height,
      renderer: 'canvas',
      background: '#ffffff',
    });

    this.rebuildOverview();
    this.bindMainGraph();
    this.bindNavigation();
    this.scheduleSync(true);
  }

  private addListener(target: ListenerTarget, type: string, fn: any): void {
    target.addEventListener?.(type, fn);
    this.listeners.push({ target, type, fn });
  }

  private bindMainGraph(): void {
    const graph = this.graph as any;

    this.addListener(graph, 'cell:added', (e: any) => this.onCellAdded(e.target));
    this.addListener(graph, 'cell:removed', (e: any) => this.onCellRemoved(e.target));
    this.addListener(graph, 'node:boundschange', (e: any) => {
      this.syncNode(e.target);
      this.syncConnectedEdges(e.target?.id);
      this.contentDirty = true;
      this.scheduleSync();
    });
    this.addListener(graph, 'cell:attributechange', (e: any) => {
      const cell = e.target;
      this.syncCell(cell);
      if (this.isNode(cell)) this.syncConnectedEdges(cell.id);
      if (this.isPort(cell)) this.syncConnectedEdges((cell.parentNode as any)?.id);
      this.contentDirty = true;
      this.scheduleSync();
    });
    this.addListener(graph, 'afterrender', () => this.scheduleViewport());
  }

  private bindNavigation(): void {
    if (!this.hostEl) return;

    const navigate = (e: PointerEvent): void => {
      if (!this.hostEl) return;
      const rect = this.hostEl.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const fcx = mx - (this.dragOffset?.x ?? 0);
      const fcy = my - (this.dragOffset?.y ?? 0);
      const worldX = this.view.minX + (fcx - this.view.pad) / this.view.scale;
      const worldY = this.view.minY + (fcy - this.view.pad) / this.view.scale;
      this.graph.panTo(worldX, worldY);
      this.scheduleViewport();
    };

    this.addListener(this.hostEl, 'pointerdown', (e: PointerEvent) => {
      if (!this.hostEl) return;
      e.preventDefault();
      this.dragging = true;
      const rect = this.hostEl.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const vp = this.viewportWorldBBox();
      const fcx = this.view.pad + (vp.x + vp.width / 2 - this.view.minX) * this.view.scale;
      const fcy = this.view.pad + (vp.y + vp.height / 2 - this.view.minY) * this.view.scale;
      const fw = vp.width * this.view.scale;
      const fh = vp.height * this.view.scale;
      const inside = Math.abs(mx - fcx) <= fw / 2 && Math.abs(my - fcy) <= fh / 2;
      this.dragOffset = inside ? { x: mx - fcx, y: my - fcy } : { x: 0, y: 0 };
      navigate(e);
    });
    this.addListener(window as any, 'pointermove', (e: PointerEvent) => { if (this.dragging) navigate(e); });
    this.addListener(window as any, 'pointerup', () => { this.dragging = false; this.dragOffset = null; });
  }

  private onCellAdded(cell: any): void {
    if (!cell || cell === this.graph || !this.isGraphCell(cell)) return;
    if (this.isPort(cell)) {
      this.syncNode(cell.parentNode);
      this.syncConnectedEdges((cell.parentNode as any)?.id);
    } else {
      this.syncCell(cell);
    }
    this.contentDirty = true;
    this.scheduleSync(true);
  }

  private onCellRemoved(cell: any): void {
    if (!cell || !this.isGraphCell(cell)) return;
    const id = cell.id;
    const miniCell = id ? this.map.get(id) : null;
    if (miniCell) {
      miniCell.remove?.();
      this.map.delete(id);
    }
    this.contentDirty = true;
    this.scheduleSync(true);
  }

  private rebuildOverview(): void {
    if (!this.overview) return;
    this.overview.clear();
    this.map.clear();
    for (const node of this.graph.getNodes() as any[]) this.createOrUpdateNode(node);
    for (const edge of this.graph.getEdges() as any[]) this.createOrUpdateEdge(edge);
    this.contentDirty = true;
  }

  private syncCell(cell: any): void {
    if (this.isNode(cell)) this.syncNode(cell);
    else if (this.isEdge(cell)) this.syncEdge(cell);
    else if (this.isPort(cell)) this.syncNode(cell.parentNode);
  }

  private syncNode(node: any): void {
    if (!node || !this.isNode(node)) return;
    this.createOrUpdateNode(node);
  }

  private syncEdge(edge: any): void {
    if (!edge || !this.isEdge(edge)) return;
    this.createOrUpdateEdge(edge);
  }

  private createOrUpdateNode(node: any): any {
    if (!this.overview || !node?.id) return null;
    const props = this.cloneNodeProps(node);
    let mini = this.map.get(node.id);
    if (!mini) {
      mini = this.overview.addNode(definedProps(props) as any);
      this.map.set(node.id, mini);
    } else {
      this.applyProps(mini, props);
    }
    this.syncPorts(node, mini);
    return mini;
  }

  private createOrUpdateEdge(edge: any): any {
    if (!this.overview || !edge?.id) return null;
    const props = this.cloneEdgeProps(edge);
    const sourceId = endpointId(props.source);
    const targetId = endpointId(props.target);
    if (!sourceId || !targetId || !this.overview.getNode(sourceId) || !this.overview.getNode(targetId)) return null;

    let mini = this.map.get(edge.id);
    if (!mini) {
      mini = this.overview.addEdge(definedProps(props) as any);
      this.map.set(edge.id, mini);
    } else {
      this.applyProps(mini, props);
    }
    return mini;
  }

  private syncPorts(sourceNode: any, miniNode: any): void {
    if (!this.overview || !sourceNode || !miniNode) return;
    const sourcePorts = ((sourceNode.children ?? []) as any[]).filter((c) => this.isPort(c) && c.id);
    const keep = new Set(sourcePorts.map((p) => p.id));

    for (const child of [...((miniNode.children ?? []) as any[])]) {
      if (this.isPort(child) && child.id && !keep.has(child.id)) child.remove?.();
    }

    for (const port of sourcePorts) {
      let miniPort = ((miniNode.children ?? []) as any[]).find((c) => this.isPort(c) && c.id === port.id);
      const props = { ...port.props, id: port.id };
      if (!miniPort) miniPort = this.overview.addPort(miniNode, definedProps(props) as any);
      else this.applyProps(miniPort, props);
    }
  }

  private syncConnectedEdges(nodeId?: string): void {
    if (!nodeId) return;
    for (const edge of this.graph.getEdges() as any[]) {
      const source = endpointId(edge.getAttribute('source'));
      const target = endpointId(edge.getAttribute('target'));
      if (source === nodeId || target === nodeId) this.syncEdge(edge);
    }
  }

  private applyProps(cell: any, props: Record<string, any>): void {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'id' || value === undefined) continue;
      cell.setAttribute?.(key, value);
    }
  }

  private cloneNodeProps(node: any): Record<string, any> {
    const bbox = this.nodeBBox(node);
    return {
      ...node.props,
      id: node.id,
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      shape: node.getAttribute('shape'),
      fill: node.getAttribute('fill'),
      stroke: node.getAttribute('stroke'),
      strokeWidth: node.getAttribute('strokeWidth'),
      radius: node.getAttribute('radius'),
      label: node.getAttribute('label'),
      labels: node.getAttribute('labels'),
      angle: node.getAttribute('angle'),
      visible: node.getAttribute('visible'),
    };
  }

  private cloneEdgeProps(edge: any): Record<string, any> {
    return {
      ...edge.props,
      id: edge.id,
      source: edge.getAttribute('source'),
      target: edge.getAttribute('target'),
      router: edge.getAttribute('router'),
      connector: edge.getAttribute('connector'),
      waypoints: edge.getAttribute('waypoints'),
      stroke: edge.getAttribute('stroke'),
      strokeWidth: edge.getAttribute('strokeWidth'),
      label: edge.getAttribute('label'),
      labels: edge.getAttribute('labels'),
      visible: edge.getAttribute('visible'),
    };
  }

  private scheduleSync(forceFit = false): void {
    if (forceFit) this.contentDirty = true;
    if (this.syncRafId) return;
    this.syncRafId = requestAnimationFrame(() => {
      this.syncRafId = 0;
      if (!this.overview) return;
      if (this.contentDirty) {
        this.fitOverview();
        this.contentDirty = false;
      }
      this.overview.scheduler.flush();
      this.overview.render();
      this.scheduleViewport();
    });
  }

  private scheduleViewport(): void {
    if (this.viewportRafId) return;
    this.viewportRafId = requestAnimationFrame(() => {
      this.viewportRafId = 0;
      this.updateViewportRect();
    });
  }

  private fitOverview(): void {
    if (!this.overview) return;
    const bounds = this.contentWorldBBox();
    const pad = this.opts.padding;
    const contentW = Math.max(1, bounds.maxX - bounds.minX);
    const contentH = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(
      (this.opts.width - 2 * pad) / contentW,
      (this.opts.height - 2 * pad) / contentH,
    );
    this.view = { minX: bounds.minX, minY: bounds.minY, scale, pad };

    const root = this.overview.document.documentElement as any;
    root.setLocalPosition?.(pad - bounds.minX * scale, pad - bounds.minY * scale);
    root.setLocalScale?.(scale, scale);
  }

  private contentWorldBBox(): { minX: number; minY: number; maxX: number; maxY: number } {
    const nodes = this.graph.getNodes() as any[];
    const viewport = this.viewportWorldBBox();
    if (nodes.length === 0) {
      return { minX: viewport.x, minY: viewport.y, maxX: viewport.x + viewport.width, maxY: viewport.y + viewport.height };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      const bbox = this.nodeBBox(node);
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    minX = Math.min(minX, cx - viewport.width / 2);
    maxX = Math.max(maxX, cx + viewport.width / 2);
    minY = Math.min(minY, cy - viewport.height / 2);
    maxY = Math.max(maxY, cy + viewport.height / 2);
    return { minX, minY, maxX, maxY };
  }

  private updateViewportRect(): void {
    if (!this.viewportEl) return;
    const vp = this.viewportWorldBBox();
    const x = this.view.pad + (vp.x - this.view.minX) * this.view.scale;
    const y = this.view.pad + (vp.y - this.view.minY) * this.view.scale;
    const w = Math.max(4, vp.width * this.view.scale);
    const h = Math.max(4, vp.height * this.view.scale);
    this.viewportEl.style.transform = `translate(${x}px, ${y}px)`;
    this.viewportEl.style.width = `${w}px`;
    this.viewportEl.style.height = `${h}px`;
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

  private nodeBBox(node: any): { x: number; y: number; width: number; height: number } {
    if (typeof node?.getWorldBBox === 'function') return node.getWorldBBox();
    return {
      x: (node.getAttribute('x') as number) ?? 0,
      y: (node.getAttribute('y') as number) ?? 0,
      width: (node.getAttribute('width') as number) ?? 0,
      height: (node.getAttribute('height') as number) ?? 0,
    };
  }

  private isGraphCell(cell: any): boolean {
    return this.isNode(cell) || this.isEdge(cell) || this.isPort(cell);
  }

  private isNode(cell: any): boolean {
    const cls = cell?.className;
    return typeof cls === 'string' && (cls.includes(CLASS.node) || cls.includes(CLASS.group));
  }

  private isEdge(cell: any): boolean {
    return typeof cell?.className === 'string' && cell.className.includes(CLASS.edge);
  }

  private isPort(cell: any): boolean {
    return typeof cell?.className === 'string' && cell.className.includes(CLASS.port);
  }

  destroy(): void {
    if (this.syncRafId) cancelAnimationFrame(this.syncRafId);
    if (this.viewportRafId) cancelAnimationFrame(this.viewportRafId);
    for (const { target, type, fn } of this.listeners) target.removeEventListener?.(type, fn);
    this.listeners = [];
    this.map.clear();
    this.overview?.destroy?.();
    this.hostEl?.remove();
    this.overview = undefined;
    this.hostEl = undefined;
    this.viewportEl = undefined;
  }
}

const endpointId = (endpoint: any): string | undefined =>
  typeof endpoint === 'string' ? endpoint : endpoint?.cell;

const definedProps = (props: Record<string, any>): Record<string, any> =>
  Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined));
