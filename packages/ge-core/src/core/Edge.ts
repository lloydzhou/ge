/**
 * Edge —— 图边，连接两个 Node。
 *
 * - source/target 为端点配置（node id + 锚点）。
 * - update() 解析两端节点 → computeEdgePoints → connector 生成 path → updatePath 原地写回（修复 P0-2）。
 * - 事件驱动联动：监听两端节点的 `node:boundschange`，节点移动时自动重算路径。
 * - Anchor/Router/Connector 解析器由 Graph 注入（registry 统一管理）。
 */
import { Path, Text, type DisplayObject } from '@antv/g-lite';
import { Cell } from './Cell';
import { CLASS, type EndpointConfig } from './types';
import { computeEdgePoints } from './compute';
import { edgeAnchorRatio } from '../anchor/edge-anchor';
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
  protected endMarker?: Path;
  protected startMarker?: Path;
  protected labelText?: Text;
  protected _labelTexts: Text[] = [];
  /** 由 Graph 注入的解析器 */
  resolveAnchor?: (name?: string) => NodeAnchorFn;
  resolveRouter?: (name?: string) => RouterFn;
  resolveConnector?: (name?: string) => ConnectorFn;

  private boundNodes = new Set<string>();

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
        this.endMarker?.setAttribute('fill', newV);
        this.startMarker?.setAttribute('fill', newV);
        break;
      case 'label':
        this.syncLabel();
        this.update();
        break;
      case 'strokeWidth':
        this.body?.setAttribute('lineWidth', newV);
        break;
      case 'lineDash':
        this.body?.setAttribute('lineDash', newV);
        break;
      case 'opacity':
        this.body?.setAttribute('opacity', newV);
        break;
      case 'visible':
        this.body?.setAttribute('visibility', newV ? 'visible' : 'hidden');
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

    const srcShape = srcNode.getAttribute('shape');
    const tgtShape = tgtNode.getAttribute('shape');

    const graph = (this as any).ownerDocument?.defaultView;
    const obstacles = graph?.getNodes?.()?.filter((n: any) => n.id !== srcNode.id && n.id !== tgtNode.id).map((n: any) => n.getWorldBBox()) ?? [];
    const points = computeEdgePoints(
      { bbox: srcNode.getWorldBBox(), anchorFn: resolveAnchor(srcCfg.anchor), anchorArgs: { shape: srcShape, ...srcCfg.anchorArgs } },
      { bbox: tgtNode.getWorldBBox(), anchorFn: resolveAnchor(tgtCfg.anchor), anchorArgs: { shape: tgtShape, ...tgtCfg.anchorArgs } },
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

  /** 监听端点节点的 boundschange，去重绑定 */
  protected bindBoundsChange(node: Node): void {
    const id = (node as any).id;
    if (!id || this.boundNodes.has(id)) return;
    this.boundNodes.add(id);
    node.addEventListener('node:boundschange', () => this.update());
  }

  /** 创建终点箭头 marker（颜色跟随 stroke） */
  protected createMarker(color: string): Path {
    // 尖端在 (0,0)（= 路径终点/target 边缘），底朝 +x（g-lite orient 使 +x 朝 source，即边外）
    // 这样箭头完整落在边外、尖端刚好贴 target 边缘，不会伸入节点被遮挡
    return new Path({ style: { d: 'M 0 0 L 10 -5 L 10 5 Z', fill: color } });
  }

  /** 同步边标签 */
  protected syncLabel(): void {
    const s = this.styleProps();
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
