export interface BaseNodeStyleProps {
  [key: string]: any;
}

export interface BaseEdgeStyleProps {
  [key: string]: any;
}

export interface BasePortStyleProps {
  [key: string]: any;
}

export interface GraphNodeData {
  id: string;
  x?: number;
  y?: number;
  shape?: string | Function;
  style?: BaseNodeStyleProps;
  [key: string]: any;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  shape?: string | Function;
  style?: BaseEdgeStyleProps;
  [key: string]: any;
}

export interface GraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

export type DisplayObjectConfigWithShape<T = any> = import('@antv/g-lite').DisplayObjectConfig<T> & {
  shape?: string | Function;
};