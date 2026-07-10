/**
 * CreateEdgePlugin —— 从节点拖出创建连线。
 *
 * - 按住触发键（默认 Alt）从节点 pointerdown → 拖出虚线 ghost 跟随鼠标。
 * - 释放在另一节点上 → 创建正式 Edge；释放在空白 → 取消。
 * - 与 DragPlugin 解耦：DragPlugin 在触发键按下时跳过节点拖拽，交给本插件。
 */
import { Path } from '@antv/g-lite';
import { Plugin } from './plugin';

export interface CreateEdgeOptions {
  trigger?: 'alt' | 'ctrl' | 'meta';
  router?: string;
  connector?: string;
  stroke?: string;
}

export class CreateEdgePlugin extends Plugin {
  readonly name = 'create-edge';
  private opts: Required<CreateEdgeOptions>;
  private connecting: { source: any; ghost: Path } | null = null;
  private readonly onPointerDown = (e: any): void => {
    const isPort = e.target && typeof e.target.className === 'string' && e.target.className.includes('ge-port');
    if (!isPort && !this.matchesTrigger(e)) return;
    const node = isPort ? e.target?.parentNode : this.graph.pickNode(e.viewportX, e.viewportY);
    if (!node) return;
    const center = node.getWorldCenter();
    const point = this.graph.viewport2Canvas({ x: e.viewportX, y: e.viewportY });
    const ghost = new Path({ style: { d: `M ${center.x} ${center.y} L ${point.x} ${point.y}`, stroke: this.opts.stroke, lineWidth: 1.5, lineDash: [5, 5], fill: 'none', pointerEvents: 'none' } });
    this.graph.appendChild(ghost);
    this.connecting = { source: node, ghost };
  };
  private readonly onPointerMove = (e: any): void => {
    if (!this.connecting) return;
    const center = this.connecting.source.getWorldCenter();
    const point = this.graph.viewport2Canvas({ x: e.viewportX, y: e.viewportY });
    if (!isFinite(center.x) || !isFinite(center.y) || !isFinite(point.x) || !isFinite(point.y)) return;
    this.connecting.ghost.setAttribute('d', `M ${center.x} ${center.y} L ${point.x} ${point.y}`);
  };
  private readonly onPointerUp = (e: any): void => {
    if (!this.connecting) return;
    const { source, ghost } = this.connecting;
    this.connecting = null;
    ghost.destroy();
    const target = this.graph.pickNode(e.viewportX, e.viewportY);
    if (target && target !== source) this.graph.addEdge({ source: source.id, target: target.id, router: this.opts.router, connector: this.opts.connector, stroke: this.opts.stroke });
  };

  constructor(options: CreateEdgeOptions = {}) {
    super();
    this.opts = { trigger: options.trigger ?? 'alt', router: options.router ?? 'orthogonal', connector: options.connector ?? 'rounded', stroke: options.stroke ?? '#1890ff' };
  }

  init(graph: any): void {
    super.init(graph);
    graph.addEventListener('pointerdown', this.onPointerDown);
    graph.addEventListener('pointermove', this.onPointerMove);
    graph.addEventListener('pointerup', this.onPointerUp);
    graph.addEventListener('pointerupoutside', this.onPointerUp);
  }

  private matchesTrigger(event: any): boolean {
    return this.opts.trigger === 'alt' ? !!event.altKey : this.opts.trigger === 'ctrl' ? !!event.ctrlKey : !!event.metaKey;
  }

  destroy(): void {
    this.graph.removeEventListener('pointerdown', this.onPointerDown);
    this.graph.removeEventListener('pointermove', this.onPointerMove);
    this.graph.removeEventListener('pointerup', this.onPointerUp);
    this.graph.removeEventListener('pointerupoutside', this.onPointerUp);
    this.connecting?.ghost.destroy();
    this.connecting = null;
    super.destroy();
  }
}
