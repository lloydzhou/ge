/**
 * GraphSnapshot —— 一次性图数据快照（纯数据）。
 *
 * 为 ExportView 等非交互视图提供输入：从 Graph 的可序列化 model（toJSON）
 * 加上当前 viewport 状态派生一次，不订阅、不常驻、不持有 DisplayObject。
 */
import type { Graph } from './Graph';

export interface SnapshotViewport {
  panX: number;
  panY: number;
  zoom: number;
}

/**
 * 快照保留 Graph.toJSON() 的完整 schema（当前为 version/viewport/cells，旧版为 nodes/edges），
 * 并附带导出视图需要的尺寸与标准化 viewport。
 */
export interface GraphSnapshotData {
  version?: number;
  cells?: unknown[];
  /** 旧 GraphJSON 兼容字段。 */
  nodes?: Record<string, any>[];
  /** 旧 GraphJSON 兼容字段。 */
  edges?: Record<string, any>[];
  viewport: SnapshotViewport;
  width: number;
  height: number;
  [key: string]: unknown;
}

const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

export class GraphSnapshot {
  readonly data: GraphSnapshotData;

  private constructor(data: GraphSnapshotData) {
    this.data = data;
  }

  /** 从 Graph 当前状态派生完整深拷贝，避免 CellJSON 的 props/data/children 被外部污染。 */
  static from(graph: Graph): GraphSnapshot {
    const cfg = graph.getConfig();
    const graphJSON = deepClone(graph.toJSON() as unknown as Record<string, unknown>);
    return new GraphSnapshot({
      ...graphJSON,
      viewport: {
        panX: graph.panOffset.x,
        panY: graph.panOffset.y,
        zoom: graph.getCamera().getZoom() || 1,
      },
      width: cfg.width ?? 800,
      height: cfg.height ?? 600,
    } as GraphSnapshotData);
  }

  toJSON(): GraphSnapshotData {
    return this.data;
  }
}
