/**
 * GraphSnapshot —— 一次性图数据快照（纯数据）。
 *
 * 为 ExportView 等非交互视图提供输入：从 Graph 的可序列化 model（toJSON）
 * 加上当前 viewport 状态派生一次，不订阅、不常驻、不持有 DisplayObject。
 *
 * 与 Minimap 的常驻增量同步不同：导出 / 截图是「某一刻的全量」，适合快照而非订阅。
 */
import type { Graph } from './Graph';

export interface SnapshotViewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface GraphSnapshotData {
  nodes: Record<string, any>[];
  edges: Record<string, any>[];
  viewport: SnapshotViewport;
  width: number;
  height: number;
}

export class GraphSnapshot {
  readonly data: GraphSnapshotData;

  private constructor(data: GraphSnapshotData) {
    this.data = data;
  }

  /** 从 Graph 当前状态派生一份快照（深拷贝 nodes/edges，避免外部修改污染） */
  static from(graph: Graph): GraphSnapshot {
    const cfg = graph.getConfig();
    const { nodes, edges } = graph.toJSON();
    return new GraphSnapshot({
      nodes: nodes.map((n) => ({ ...n })),
      edges: edges.map((e) => ({ ...e })),
      viewport: {
        panX: graph.panOffset.x,
        panY: graph.panOffset.y,
        zoom: graph.getCamera().getZoom() || 1,
      },
      width: cfg.width ?? 800,
      height: cfg.height ?? 600,
    });
  }

  toJSON(): GraphSnapshotData {
    return this.data;
  }
}
