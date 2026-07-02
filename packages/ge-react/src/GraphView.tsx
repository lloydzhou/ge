import { useEffect, useRef, type CSSProperties } from 'react';
import { Graph } from '@antv/ge-core';
import type { GraphOptions, NodeProps, EdgeProps } from '@antv/ge-core';

export interface GraphViewProps {
  options?: Omit<GraphOptions, 'container'>;
  nodes?: (NodeProps & { id?: string })[];
  edges?: (EdgeProps & { id?: string })[];
  onReady?: (graph: Graph) => void;
  style?: CSSProperties;
}

/**
 * GE 的 React 声明式封装。
 * - mount 时创建 Graph，ready 后写入 nodes/edges。
 * - unmount 时销毁 Graph，避免泄漏。
 * 节点/边的响应式增量 diff 留待后续增强；当前以一次性渲染 + onReady 暴露命令式 API 为主。
 */
export function GraphView(props: GraphViewProps) {
  const { options, nodes, edges, onReady, style } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const graph = new Graph({
      container: containerRef.current,
      width: options?.width,
      height: options?.height,
      background: options?.background,
    });
    graphRef.current = graph;
    let cancelled = false;
    graph.ready.then(() => {
      if (cancelled || !graphRef.current) return;
      if (nodes) for (const n of nodes) graph.addNode(n);
      if (edges) for (const e of edges) graph.addEdge(e);
      onReady?.(graph);
    });
    return () => {
      cancelled = true;
      graph.destroy();
      graphRef.current = null;
    };
    // 仅在 mount 时初始化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: options?.width ?? '100%', height: options?.height ?? 400, ...style }}
    />
  );
}
