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

const resolveContainer = (c: HTMLElement | string): HTMLElement =>
  typeof c === 'string' ? document.querySelector<HTMLElement>(c)! : c;

export class Graph extends Canvas {
  readonly anchors: AnchorRegistry;
  readonly routers: RouterRegistry;
  readonly connectors: ConnectorRegistry;

  constructor(options: GraphOptions) {
    const container = resolveContainer(options.container);
    const width = options.width ?? container.clientWidth ?? 800;
    const height = options.height ?? container.clientHeight ?? 600;
    const renderer = new CanvasRenderer();
    super({
      container,
      width,
      height,
      renderer,
      background: options.background,
    });
    this.anchors = createDefaultAnchorRegistry();
    this.routers = createDefaultRouterRegistry();
    this.connectors = createDefaultConnectorRegistry();
    this.registerElements();
  }

  protected registerElements(): void {
    this.customElements.define(TAG.node, Node);
    this.customElements.define(TAG.edge, Edge);
    this.customElements.define(TAG.port, Port);
    this.customElements.define(TAG.group, Group);
  }

  // ---- 增删 API（走 document.createElement + appendChild） ----
  addNode(props: NodeProps & { id?: string }): Node {
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
    if (cell) {
      cell.remove();
    }
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
}
