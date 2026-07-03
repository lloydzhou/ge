/**
 * AnchorRegistry —— 统一锚点注册表。
 * 取代旧版散落在多处的自建 Map，提供可扩展的注册/查询能力。
 */
import type { NodeAnchorFn, EdgeAnchorFn } from './types';
import { builtInNodeAnchors } from './node-anchor';
import { builtInEdgeAnchors } from './edge-anchor';

export class AnchorRegistry {
  private readonly nodeMap = new Map<string, NodeAnchorFn>();
  private readonly edgeMap = new Map<string, EdgeAnchorFn>();

  /** 注册节点锚点 */
  registerNode(name: string, fn: NodeAnchorFn): this {
    this.nodeMap.set(name, fn);
    return this;
  }

  /** 注册线性锚点 */
  registerEdge(name: string, fn: EdgeAnchorFn): this {
    this.edgeMap.set(name, fn);
    return this;
  }

  getNode(name: string): NodeAnchorFn | undefined {
    return this.nodeMap.get(name);
  }

  /** 解析节点锚点，找不到时回退到 center */
  resolveNode(name: string): NodeAnchorFn {
    return this.nodeMap.get(name) ?? this.nodeMap.get('center')!;
  }

  getEdge(name: string): EdgeAnchorFn | undefined {
    return this.edgeMap.get(name);
  }

  /** 解析线性锚点，找不到时回退到 ratio */
  resolveEdge(name: string): EdgeAnchorFn {
    return this.edgeMap.get(name) ?? this.edgeMap.get('ratio')!;
  }

  hasNode(name: string): boolean {
    return this.nodeMap.has(name);
  }

  hasEdge(name: string): boolean {
    return this.edgeMap.has(name);
  }

  listNode(): string[] {
    return [...this.nodeMap.keys()];
  }

  listEdge(): string[] {
    return [...this.edgeMap.keys()];
  }
}

/** 创建内置锚点齐全的默认注册表 */
export const createDefaultAnchorRegistry = (): AnchorRegistry => {
  const r = new AnchorRegistry();
  for (const [name, fn] of Object.entries(builtInNodeAnchors)) r.registerNode(name, fn);
  for (const [name, fn] of Object.entries(builtInEdgeAnchors)) r.registerEdge(name, fn);
  return r;
};
