/**
 * Layout 唯一类型源 —— 自动布局的输入/输出契约。
 * 全部布局算法均为纯函数：(nodes, edges, options) => Positions。
 */
export interface LayoutNode {
  id: string;
  /** 已有位置（可选，无则由布局决定初始位置） */
  x?: number;
  y?: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

/** 布局结果：节点 id → 世界坐标 */
export type Positions = Map<string, { x: number; y: number }>;

export interface LayoutOptions {
  width?: number;
  height?: number;
  [key: string]: any;
}
