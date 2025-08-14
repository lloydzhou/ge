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
  style?: BaseNodeStyleProps;
  [key: string]: any;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  style?: BaseEdgeStyleProps;
  [key: string]: any;
}

export interface GraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}