import { Graph } from '@ge';

/**
 * 基础渲染：3 节点 + 3 条边
 * 演示 perimeter 锚点与不同 connector（rounded 直角圆滑 / smooth 贝塞尔）。
 */
export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#fafafa' });
  await graph.ready;

  graph.addNode({
    id: 'a', x: 60, y: 140, width: 130, height: 50,
    fill: '#e6f7ff', stroke: '#1890ff', label: 'Start',
  });
  graph.addNode({ id: 'b', x: 360, y: 70, width: 130, height: 50, label: 'Process' });
  graph.addNode({
    id: 'c', x: 360, y: 230, width: 64, height: 64, shape: 'circle',
    fill: '#fff7e6', stroke: '#fa8c16', label: 'C',
  });

  // rounded 直角圆滑连线
  graph.addEdge({ source: 'a', target: 'b', connector: 'rounded', stroke: '#1890ff' });
  // orthogonal 路由 + rounded
  graph.addEdge({ source: 'a', target: 'c', router: 'orthogonal', connector: 'rounded', stroke: '#fa8c16' });
  // smooth 贝塞尔
  graph.addEdge({ source: 'b', target: 'c', connector: 'smooth', stroke: '#52c41a' });

  return graph;
}
