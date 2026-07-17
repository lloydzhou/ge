import { Graph } from '@ge';

/**
 * 路由（Router）与连接器（Connector）对比：
 * 同两端节点，叠加 4 条不同 router × connector 的边。
 */
export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#fafafa' });
  await graph.ready;

  graph.addNode({ id: 's', x: 60, y: 80, width: 120, height: 48, fill: '#fff', stroke: '#8c8c8c', label: 'Source' });
  graph.addNode({ id: 't', x: 480, y: 300, width: 120, height: 48, fill: '#fff', stroke: '#8c8c8c', label: 'Target' });

  graph.addEdge({ source: 's', target: 't', router: 'normal', connector: 'normal', stroke: '#52c41a' });
  graph.addEdge({ source: 's', target: 't', router: 'orthogonal', connector: 'rounded', stroke: '#1890ff' });
  graph.addEdge({ source: 's', target: 't', router: 'manhattan', connector: 'rounded', stroke: '#722ed1' });
  graph.addEdge({ source: 's', target: 't', router: 'manhattan', connector: 'smooth', stroke: '#fa541c' });

  return graph;
}
