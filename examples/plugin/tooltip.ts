import { Graph, TooltipPlugin } from '@ge';

/**
 * 悬停提示（Tooltip）：鼠标悬停节点显示 tooltip（DOM overlay）。
 * content 自定义生成函数，默认取节点的 tooltip attribute 或 id。
 */
export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#fafafa' });
  await graph.ready;
  graph.use(
    new TooltipPlugin({
      content: (node) => `${node.id} · ${node.getAttribute('label') ?? ''}`,
      offset: 14,
    }),
  );

  graph.addNode({ id: 'a', x: 80, y: 130, width: 150, height: 54, fill: '#e6f7ff', stroke: '#1890ff', label: '悬停看提示' });
  graph.addNode({ id: 'b', x: 400, y: 90, width: 140, height: 54, label: 'B' });
  graph.addNode({ id: 'c', x: 400, y: 240, width: 140, height: 54, fill: '#f6ffed', stroke: '#52c41a', label: 'C' });
  graph.addEdge({ source: 'a', target: 'b', connector: 'rounded' });
  graph.addEdge({ source: 'a', target: 'c', connector: 'smooth' });

  return graph;
}
