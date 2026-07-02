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

/** 按 id diff 同步节点：新增 addNode / 删除 removeCell / 改动 setAttribute */
const syncNodes = (graph: Graph, nodes?: (NodeProps & { id?: string })[]): void => {
  const existing = new Map<string, any>(graph.getNodes().map((n: any) => [n.id, n]));
  const seen = new Set<string>();
  for (const p of nodes || []) {
    const id = p.id as string | undefined;
    if (!id) continue;
    seen.add(id);
    const node = existing.get(id);
    if (!node) {
      graph.addNode(p);
    } else {
      for (const k in p) {
        const v = (p as any)[k];
        if (v !== undefined) node.setAttribute(k, v);
      }
    }
  }
  for (const id of existing.keys()) if (!seen.has(id)) graph.removeCell(id);
};

/** 按 id diff 同步边 */
const syncEdges = (graph: Graph, edges?: (EdgeProps & { id?: string })[]): void => {
  const existing = new Map<string, any>(graph.getEdges().map((e: any) => [e.id || '', e]));
  const seen = new Set<string>();
  for (const p of edges || []) {
    const id = p.id as string | undefined;
    if (!id) continue;
    seen.add(id);
    const edge = existing.get(id);
    if (!edge) graph.addEdge(p);
    else {
      for (const k in p) {
        const v = (p as any)[k];
        if (v !== undefined) edge.setAttribute(k, v);
      }
    }
  }
  for (const id of existing.keys()) if (id && !seen.has(id)) graph.removeCell(id);
};

/**
 * GE 的 React 声明式封装。
 * - mount 创建 Graph；unmount 销毁。
 * - nodes / edges props 变化时按 id 做增量 diff（增/删/改）自动同步到 graph。
 */
export function GraphView(props: GraphViewProps) {
  const { options, nodes, edges, onReady, style } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    readyRef.current = false;
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
      readyRef.current = true;
      syncNodes(graph, nodes);
      syncEdges(graph, edges);
      onReady?.(graph);
    });
    return () => {
      cancelled = true;
      readyRef.current = false;
      graph.destroy();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // nodes 变化 → diff 同步
  useEffect(() => {
    const graph = graphRef.current;
    if (graph && readyRef.current) syncNodes(graph, nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // edges 变化 → diff 同步
  useEffect(() => {
    const graph = graphRef.current;
    if (graph && readyRef.current) syncEdges(graph, edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges]);

  return (
    <div
      ref={containerRef}
      style={{ width: options?.width ?? '100%', height: options?.height ?? 400, ...style }}
    />
  );
}
