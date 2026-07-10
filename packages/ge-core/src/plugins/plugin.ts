/**
 * Plugin 基座 —— 所有 L3 交互/编辑插件的抽象基类。
 * 通过 Graph.use(plugin) 安装，init 时持有 graph 引用并注册事件。
 */
import type { Graph } from '../core/Graph';
import { CLASS } from '../core/types';

export abstract class Plugin {
  protected graph!: Graph;
  abstract readonly name: string;

  init(graph: Graph): void {
    this.graph = graph;
  }

  destroy(): void {}
}

/**
 * OverlayPlugin —— DOM overlay 插件基类。
 * 子类实现 update() + isActive()，不用重复 container position + 事件监听。
 */
export abstract class OverlayPlugin extends Plugin {
  private readonly onPointerDown = (): void => { setTimeout(() => this.update(), 0); };
  private readonly onNodeDragEnd = (): void => this.update();
  private lastOverlayDraw = 0;
  private readonly onAfterRender = (): void => {
    if (!this.isActive()) return;
    const now = performance.now();
    if (now - this.lastOverlayDraw < 200) return;
    this.lastOverlayDraw = now;
    this.update();
  };

  init(graph: Graph): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (container && getComputedStyle(container).position === 'static') container.style.position = 'relative';
    graph.addEventListener('pointerdown', this.onPointerDown);
    graph.addEventListener('node:dragend', this.onNodeDragEnd);
    graph.addEventListener('afterrender', this.onAfterRender);
  }

  destroy(): void {
    this.graph.removeEventListener('pointerdown', this.onPointerDown);
    this.graph.removeEventListener('node:dragend', this.onNodeDragEnd);
    this.graph.removeEventListener('afterrender', this.onAfterRender);
    super.destroy();
  }

  protected isActive(): boolean { return true; }
  protected abstract update(): void;
}

/** 向上查找最近的可交互 cell（node / group），按 className 识别 */
export const closestCell = (el: any): any => {
  let cur: any = el;
  while (cur) {
    const cls = cur.className;
    if (typeof cls === 'string' && (cls.includes(CLASS.node) || cls.includes(CLASS.group))) {
      return cur;
    }
    cur = cur.parentNode;
  }
  return null;
};

/** DOM 风格的 className 操作（g-lite className 为字符串） */
export const addClass = (el: any, cls: string): void => {
  if (!el) return;
  const cur = (el.className || '').split(/\s+/).filter(Boolean);
  if (!cur.includes(cls)) cur.push(cls);
  el.className = cur.join(' ');
};

export const removeClass = (el: any, cls: string): void => {
  if (!el) return;
  el.className = (el.className || '').split(/\s+/).filter((c: string) => c && c !== cls).join(' ');
};

/** 向上查找最近的 edge */
export const closestEdge = (el: any): any => {
  let cur: any = el;
  while (cur) {
    const cls = cur.className;
    if (typeof cls === 'string' && cls.includes(CLASS.edge)) return cur;
    cur = cur.parentNode;
  }
  return null;
};
