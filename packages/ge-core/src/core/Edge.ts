/**
 * Edge —— 图边，连接两个 Node。
 *
 * - source/target 为端点配置（node id + 锚点）。
 * - update() 解析两端节点 → computeEdgePoints → connector 生成 path → updatePath 原地写回（修复 P0-2）。
 * - 事件驱动联动：监听两端节点的 `node:boundschange`，节点移动时自动重算路径。
 * - Anchor/Router/Connector 解析器由 Graph 注入（registry 统一管理）。
 */
import { Path, Text, type DisplayObject } from '@antv/g-lite';
import { Cell, ROUTE, STYLE, LABEL } from './Cell';
import { CLASS, type EndpointConfig } from './types';
import { computeEdgePoints } from './compute';
import { edgeAnchorRatio } from '../anchor/edge-anchor';
import { updatePath, type ConnectorFn, type ConnectorOptions } from '../edge/connector';
import type { RouterFn } from '../edge/router';
import type { NodeAnchorFn } from '../anchor/types';
import type { Node } from './Node';
import { getCellChildren } from './cell-tree';
import type { Point } from '../utils/types';

export interface EdgeStyleProps {
  source?: EndpointConfig | string;
  target?: EndpointConfig | string;
  router?: string;
  connector?: string;
  waypoints?: Point[];
  stroke?: string;
  strokeWidth?: number;
  connectorRadius?: number;
  connectorTension?: number;
  label?: string;
  [key: string]: any;
}

const DEFAULTS: EdgeStyleProps = {
  router: 'normal',
  connector: 'rounded',
  stroke: '#1890ff',
  strokeWidth: 1.5,
  connectorRadius: 8,
};

/** 标准化端点：字符串 → EndpointConfig */
const normalizeEndpoint = (e?: EndpointConfig | string): EndpointConfig =>
  typeof e === 'string' ? { cell: e } : (e ?? { cell: '' });

export class Edge extends Cell {
  static readonly tag = 'ge-edge';

  protected body?: DisplayObject;
  protected endMarker?: Path;
  protected startMarker?: Path;
  protected labelText?: Text;
  protected _labelTexts: Text[] = [];
  private dashRafId: number | null = null;
  /** 由 Graph 注入的解析器 */
  resolveAnchor?: (name?: string) => NodeAnchorFn;
  resolveRouter?: (name?: string) => RouterFn;
  resolveConnector?: (name?: string) => ConnectorFn;

  /** 当前端点的 boundschange 监听器；端点变更或断开时必须解绑。 */
  private boundNodes = new Map<Node, () => void>();

  constructor(config: Record<string, any> = {}) {
    const style = { ...DEFAULTS, ...config?.style };
    super({ className: CLASS.edge, ...config, style });
    this.initProps({ id: config?.id, style });
  }

  protected render(): void {
    const s = this.styleProps();
    this.endMarker = this.createMarker(s.stroke as string);
    this.startMarker = (s.startArrow as boolean) ? this.createMarker(s.stroke as string) : undefined;
    this.body = new Path({
      style: {
        d: 'M 0 0',
        stroke: s.stroke,
        lineWidth: s.strokeWidth,
        fill: 'none',
        lineDash: s.lineDash as number[] | undefined,
        opacity: s.opacity as number | undefined,
      },
    });
    this.appendChild(this.body);
    this.syncLabel();
    this.update();
  }

  attributeChangedCallback(
    name: string | number | symbol,
    oldV: any,
    newV: any,
  ): void {
    if (oldV === newV) return;
    this.syncProp(name as string, newV);
    this.fireAttributeChange(name as string, oldV, newV);
    if (!this.rendered) return;
    switch (name) {
      case 'source':
      case 'target':
      case 'router':
      case 'connector':
      case 'waypoints':
      case 'connectorRadius':
      case 'connectorTension':
        this.markDirty(ROUTE);
        break;
      case 'label':
      case 'labels':
      case 'labelFill':
      case 'labelFontSize':
        this.markDirty(LABEL);
        break;
      case 'stroke':
        this.body?.setAttribute('stroke', newV);
        this.endMarker?.setAttribute('fill', newV);
        this.startMarker?.setAttribute('fill', newV);
        break;
      case 'strokeWidth':
        this.body?.setAttribute('lineWidth', newV);
        break;
      case 'lineDash':
      case 'opacity':
        this.body?.setAttribute(name, newV);
        break;
      case 'lineDashFlow':
        if (newV) this.startDashFlow(); else this.stopDashFlow();
        break;
      case 'markerSize':
        this.endMarker?.destroy(); this.endMarker = this.createMarker((this.styleProps().stroke as string) ?? '#333');
        if (this.styleProps().startArrow) { this.startMarker?.destroy(); this.startMarker = this.createMarker((this.styleProps().stroke as string) ?? '#333'); }
        this.body?.removeAttribute('markerEnd');
        this.body?.removeAttribute('markerStart');
        this.markDirty(ROUTE);
        break;
      case 'visible':
        this.body?.setAttribute('visibility', newV ? 'visible' : 'hidden');
        break;
      case 'stateStyles':
        this.applyStates();
        break;
      default:
        break;
    }
  }

  /** Scheduler 帧边界统一调用 */
  flushDirty(): void {
    const d = this._dirty;
    this._dirty = 0;
    if (!this.body) return;
    if (d & LABEL) this.syncLabel();
    if (d & (ROUTE | LABEL)) this.update();
  }

  /** 端点 bbox：有 port → port 世界坐标（1x1）；无 port → node worldBBox */
  protected endpointBBox(node: Node, cfg: EndpointConfig): { x: number; y: number; width: number; height: number } {
    if (cfg.port) {
      const port = getCellChildren(node).find((child: any) => child.id === cfg.port) as any;
      if (port?.getWorldPosition) {
        const position = port.getWorldPosition();
        return { x: position.x - 0.5, y: position.y - 0.5, width: 1, height: 1 };
      }
    }
    return node.getWorldBBox();
  }

  /** 重算并原地更新路径 */
  update(): void {
    if (!this.body) return;
    const s = this.styleProps();
    const srcNode = this.resolveNode(s.source);
    const tgtNode = this.resolveNode(s.target);
    this.syncBoundsChangeBindings([srcNode, tgtNode].filter((node): node is Node => !!node));
    if (!srcNode || !tgtNode) return;

    const resolveAnchor = this.resolveAnchor ?? (() => undefined as unknown as NodeAnchorFn);
    const routerFn = (this.resolveRouter ?? (() => undefined as unknown as RouterFn))(s.router as string);
    const connectorFn = (this.resolveConnector ?? (() => undefined as unknown as ConnectorFn))(s.connector as string);

    const srcCfg = normalizeEndpoint(s.source);
    const tgtCfg = normalizeEndpoint(s.target);

    const srcShape = srcNode.getAttribute('shape');
    const tgtShape = tgtNode.getAttribute('shape');

    const graph = (this as any).ownerDocument?.defaultView;
    // 仅 astar 路由器需要避障，避免普通路由每次遍历所有节点算 getWorldBBox
    const needObstacles = typeof s.router === 'string' && s.router.includes('astar');
    const obstacles = needObstacles
      ? (graph?.getNodes?.()?.filter((n: any) => n.id !== srcNode.id && n.id !== tgtNode.id).map((n: any) => n.getWorldBBox()) ?? [])
      : [];
    const points = computeEdgePoints(
      { bbox: this.endpointBBox(srcNode, srcCfg), anchorFn: resolveAnchor(srcCfg.anchor), anchorArgs: { shape: srcShape, ...srcCfg.anchorArgs } },
      { bbox: this.endpointBBox(tgtNode, tgtCfg), anchorFn: resolveAnchor(tgtCfg.anchor), anchorArgs: { shape: tgtShape, ...tgtCfg.anchorArgs } },
      routerFn,
      s.waypoints as Point[] | undefined,
      { obstacles },
    );

    const opts: ConnectorOptions = {};
    if (s.connectorRadius != null) opts.radius = s.connectorRadius as number;
    if (s.connectorTension != null) opts.tension = s.connectorTension as number;
    updatePath(this.body, points, connectorFn, opts);
    if (this.endMarker && !this.body.getAttribute('markerEnd')) {
      this.body.setAttribute('markerEnd', this.endMarker);
    }
    if (this.startMarker && !this.body.getAttribute('markerStart')) {
      this.body.setAttribute('markerStart', this.startMarker);
    }
    this.positionLabel(points);
  }

  protected resolveNode(e?: EndpointConfig | string): Node | null {
    const cfg = normalizeEndpoint(e);
    if (!cfg.cell) return null;
    const doc = this.ownerDocument as any;
    return (doc?.getElementById?.(cfg.cell) as Node) ?? null;
  }

  /** 端点变更时重绑，避免旧节点与已删除 Edge 保留闭包引用。 */
  protected syncBoundsChangeBindings(nodes: Node[]): void {
    const expected = new Set(nodes);
    for (const [node, listener] of this.boundNodes) {
      if (!expected.has(node)) {
        node.removeEventListener('node:boundschange', listener);
        this.boundNodes.delete(node);
      }
    }
    for (const node of expected) {
      if (this.boundNodes.has(node)) continue;
      // boundschange 高频触发（拖拽），走 Scheduler 合并（每帧最多 1 次 update）
      const listener = (): void => this.markDirty(ROUTE);
      node.addEventListener('node:boundschange', listener);
      this.boundNodes.set(node, listener);
    }
  }

  protected unbindBoundsChanges(): void {
    for (const [node, listener] of this.boundNodes) {
      node.removeEventListener('node:boundschange', listener);
    }
    this.boundNodes.clear();
  }

  disconnectedCallback(): void {
    this.stopDashFlow();
    this.unbindBoundsChanges();
    super.disconnectedCallback();
  }

  /** 根据 className 应用 stateStyles（hover/selected 等） */
  protected applyStates(): void {
    if (!this.body) return;
    const cls = (this.className || '').split(/\s+/);
    const s = this.styleProps();
    const baseWidth = (s.strokeWidth as number) ?? 1;
    const defaults: Record<string, any> = {
      hover: { lineWidth: baseWidth + 1 },
      selected: { stroke: '#722ed1', lineWidth: baseWidth + 1 },
    };
    const states = { ...defaults, ...((s.stateStyles as Record<string, any>) || {}) };
    const cur: Record<string, any> = { stroke: s.stroke, lineWidth: s.strokeWidth };
    for (const c of cls) {
      if (c && states[c]) {
        if (states[c].stroke) cur.stroke = states[c].stroke;
        if (states[c].strokeWidth) cur.lineWidth = states[c].strokeWidth;
      }
    }
    this.body.setAttribute('stroke', cur.stroke);
    this.body.setAttribute('lineWidth', cur.lineWidth);
  }

  /** 流动虚线动画 */
  protected startDashFlow(): void {
    if (this.dashRafId != null) return;
    let offset = 0;
    const animate = (): void => {
      offset -= ((this.styleProps().dashFlowSpeed as number) ?? 0.5);
      this.body?.setAttribute('lineDashOffset', offset);
      this.dashRafId = requestAnimationFrame(animate);
    };
    this.dashRafId = requestAnimationFrame(animate);
  }
  protected stopDashFlow(): void {
    if (this.dashRafId != null) { cancelAnimationFrame(this.dashRafId); this.dashRafId = null; }
  }

  /** 创建终点箭头 marker（颜色跟随 stroke） */
  protected createMarker(color: string): Path {
    // 尖端在 (0,0)（= 路径终点/target 边缘），底朝 +x（g-lite orient 使 +x 朝 source，即边外）
    // 这样箭头完整落在边外、尖端刚好贴 target 边缘，不会伸入节点被遮挡
    const sz = (this.styleProps().markerSize as number) ?? 10;
    return new Path({ style: { d: `M 0 0 L ${sz} ${-sz / 2} L ${sz} ${sz / 2} Z`, fill: color } });
  }

  /** 同步边标签 */
  protected syncLabel(): void {
    const s = this.styleProps();
    const labels = s.labels as any[] | undefined;
    if (labels && labels.length > 0) {
      for (const lt of this._labelTexts) lt.destroy();
      this._labelTexts = [];
      for (const item of labels) {
        const lt = new Text({ style: { text: item.text, fontSize: (item.fontSize as number) ?? (this.styleProps().labelFontSize as number) ?? 12, fill: (item.fill as string) ?? (this.styleProps().labelFill as string) ?? '#333333', textAlign: 'center', textBaseline: 'middle' } });
        this.appendChild(lt);
        this._labelTexts.push(lt);
      }
      return;
    }
    const text = s.label as string | undefined;
    if (!text) {
      this.labelText?.destroy();
      this.labelText = undefined;
      return;
    }
    if (!this.labelText) {
      this.labelText = new Text({
        style: { text, fontSize: 12, fill: '#333333', textAlign: 'center', textBaseline: 'middle' },
      });
      this.appendChild(this.labelText);
    } else {
      this.labelText.setAttribute('text', text as any);
    }
  }

  /** 把标签定位到路径中点 */
  protected positionLabel(points: Point[]): void {
    if (!this.labelText || points.length === 0) return;
    if (this._labelTexts.length > 0) {
      const labels = (this.styleProps().labels as { distance?: number }[]) ?? [];
      this._labelTexts.forEach((lt, i) => {
        const t = labels[i]?.distance ?? 0.5;
        const pt = edgeAnchorRatio(points, { t });
        lt.setLocalPosition(pt.x, pt.y);
      });
      return;
    }
    const mid = edgeAnchorRatio(points, { t: ((this.styleProps().labelDistance as number) ?? 0.5) });
    this.labelText.setLocalPosition(mid.x, mid.y);
  }

  protected styleProps(): EdgeStyleProps {
    return { ...DEFAULTS, ...(this.attributes as EdgeStyleProps) };
  }

  // ---- 公开 API ----
  setSource(cell: string | EndpointConfig): this {
    this.setAttribute('source', cell);
    return this;
  }
  setTarget(cell: string | EndpointConfig): this {
    this.setAttribute('target', cell);
    return this;
  }
  setWaypoints(points: Point[]): this {
    this.setAttribute('waypoints', points);
    return this;
  }
}
