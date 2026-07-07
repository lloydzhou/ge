/**
 * CreateEdgePlugin —— 从节点拖出创建连线。
 *
 * - 按住触发键（默认 Alt）从节点 pointerdown → 拖出虚线 ghost 跟随鼠标。
 * - 释放在另一节点上 → 创建正式 Edge；释放在空白 → 取消。
 * - 与 DragPlugin 解耦：DragPlugin 在触发键按下时跳过节点拖拽，交给本插件。
 */
import { Path } from '@antv/g-lite';
import { Plugin, closestCell } from './plugin';
import { bboxCenter } from '../utils/geometry';

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

  constructor(options: CreateEdgeOptions = {}) {
    super();
    this.opts = {
      trigger: options.trigger ?? 'alt',
      router: options.router ?? 'orthogonal',
      connector: options.connector ?? 'rounded',
      stroke: options.stroke ?? '#1890ff',
    };
  }

  init(graph: any): void {
    super.init(graph);
    const matchTrigger = (e: any): boolean => {
      switch (this.opts.trigger) {
        case 'alt': return !!e.altKey;
        case 'ctrl': return !!e.ctrlKey;
        case 'meta': return !!e.metaKey;
        default: return true;
      }
    };

    graph.addEventListener('pointerdown', (e: any) => {
      // Port 连线：从端口直接拖出（无需 trigger key）
      const tgt = e.target;
      const isPort = tgt && typeof tgt.className === 'string' && tgt.className.includes('ge-port');
      if (!isPort && !matchTrigger(e)) return;
      const node = isPort ? tgt?.parentNode : graph.pickNode(e.viewportX, e.viewportY);
      if (!node) return;
      const c = node.getWorldCenter();
      const w = graph.viewport2Canvas({ x: e.viewportX, y: e.viewportY });
      const ghost = new Path({
        style: {
          d: `M ${c.x} ${c.y} L ${w.x} ${w.y}`,
          stroke: this.opts.stroke,
          lineWidth: 1.5,
          lineDash: [5, 5],
          fill: 'none',
          pointerEvents: 'none',
        },
      });
      graph.appendChild(ghost);
      this.connecting = { source: node, ghost };
    });

    graph.addEventListener('pointermove', (e: any) => {
      if (!this.connecting) return;
      const c = this.connecting.source.getWorldCenter();
      const w = graph.viewport2Canvas({ x: e.viewportX, y: e.viewportY });
      // NaN 坐标防御（异常事件/未初始化），避免 g-lite path 解析异常
      if (!isFinite(c.x) || !isFinite(c.y) || !isFinite(w.x) || !isFinite(w.y)) return;
      this.connecting.ghost.setAttribute('d', `M ${c.x} ${c.y} L ${w.x} ${w.y}`);
    });

    const end = (e: any): void => {
      if (!this.connecting) return;
      const { source, ghost } = this.connecting;
      this.connecting = null;
      ghost.destroy();
      const target = graph.pickNode(e.viewportX, e.viewportY);
      if (target && target !== source) {
        this.graph.addEdge({
          source: source.id,
          target: target.id,
          router: this.opts.router,
          connector: this.opts.connector,
          stroke: this.opts.stroke,
        });
      }
    };
    graph.addEventListener('pointerup', end);
    graph.addEventListener('pointerupoutside', end);
  }

  destroy(): void {
    this.connecting?.ghost.destroy();
    this.connecting = null;
  }
}
