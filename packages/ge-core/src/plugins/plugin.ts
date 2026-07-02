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
