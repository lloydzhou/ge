/**
 * Edge —— 图边，连接两个 Node。
 *
 * - source/target 为端点配置（node id + 锚点）。
 * - update() 解析两端节点 → computeEdgePoints → connector 生成 path → updatePath 原地写回（修复 P0-2）。
 * - 事件驱动联动：监听两端节点的 `node:boundschange`，节点移动时自动重算路径。
 * - Anchor/Router/Connector 解析器由 Graph 注入（registry 统一管理）。
 */
import { Path, type DisplayObject } from '@antv/g-lite';
import { Cell } from './Cell';
import { CLASS, type EndpointConfig } from './types';
import { computeEdgePoints } from './compute';
import { updatePath, type ConnectorFn, type ConnectorOptions } from '../edge/connector';
import type { RouterFn } from '../edge/router';
import type { NodeAnchorFn } from '../anchor/types';
import type { Node } from './Node';
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
  /** 由 Graph 注入的解析器 */
  resolveAnchor?: (name?: string) => NodeAnchorFn;
  resolveRouter?: (name?: string) => RouterFn;
  resolveConnector?: (name?: string) => ConnectorFn;

  private boundNodes = new Set<string>();

  constructor(config: Record<string, any> = {}) {
    super({
      className: CLASS.edge,
      ...config,
      style: { ...DEFAULTS, ...config?.style },
    });
  }

  protected render(): void {
    const s = this.styleProps();
    this.body = new Path({
      style: {
        d: 'M 0 0',
        stroke: s.stroke,
        lineWidth: s.strokeWidth,
        fill: 'none',
      },
    });
    this.appendChild(this.body);
    this.update();
  }

  attributeChangedCallback(
    name: string | number | symbol,
    oldV: any,
    newV: any,
  ): void {
    if (oldV === newV) return;
    if (!this.rendered) return;
    switch (name) {
      case 'source':
      case 'target':
      case 'router':
      case 'connector':
      case 'waypoints':
      case 'connectorRadius':
      case 'connectorTension':
        this.update();
        break;
      case 'stroke':
        this.body?.setAttribute('stroke', newV);
        break;
      case 'strokeWidth':
        this.body?.setAttribute('lineWidth', newV);
        break;
      default:
        break;
    }
  }

  /** 重算并原地更新路径 */
  update(): void {
    if (!this.body) return;
    const s = this.styleProps();
    const srcNode = this.resolveNode(s.source);
    const tgtNode = this.resolveNode(s.target);
    if (!srcNode || !tgtNode) return;

    this.bindBoundsChange(srcNode);
    this.bindBoundsChange(tgtNode);

    const resolveAnchor = this.resolveAnchor ?? (() => undefined as unknown as NodeAnchorFn);
    const routerFn = (this.resolveRouter ?? (() => undefined as unknown as RouterFn))(s.router as string);
    const connectorFn = (this.resolveConnector ?? (() => undefined as unknown as ConnectorFn))(s.connector as string);

    const srcCfg = normalizeEndpoint(s.source);
    const tgtCfg = normalizeEndpoint(s.target);

    const points = computeEdgePoints(
      { bbox: srcNode.getWorldBBox(), anchorFn: resolveAnchor(srcCfg.anchor), anchorArgs: srcCfg.anchorArgs },
      { bbox: tgtNode.getWorldBBox(), anchorFn: resolveAnchor(tgtCfg.anchor), anchorArgs: tgtCfg.anchorArgs },
      routerFn,
      s.waypoints as Point[] | undefined,
    );

    const opts: ConnectorOptions = {};
    if (s.connectorRadius != null) opts.radius = s.connectorRadius as number;
    if (s.connectorTension != null) opts.tension = s.connectorTension as number;
    updatePath(this.body, points, connectorFn, opts);
  }

  protected resolveNode(e?: EndpointConfig | string): Node | null {
    const cfg = normalizeEndpoint(e);
    if (!cfg.cell) return null;
    const doc = this.ownerDocument as any;
    return (doc?.getElementById?.(cfg.cell) as Node) ?? null;
  }

  /** 监听端点节点的 boundschange，去重绑定 */
  protected bindBoundsChange(node: Node): void {
    const id = (node as any).id;
    if (!id || this.boundNodes.has(id)) return;
    this.boundNodes.add(id);
    node.addEventListener('node:boundschange', () => this.update());
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
