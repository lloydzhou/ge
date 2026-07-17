import { Graph, DragPlugin, SelectionPlugin, EditLabelPlugin } from '@ge';

/**
 * 标签编辑（EditLabel）：双击节点 inline 编辑 label。
 * 回车确认 / ESC 取消 / blur 确认，提交后 setAttribute('label', ...)。
 */
export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#fafafa' });
  await graph.ready;
  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());
  graph.use(new EditLabelPlugin());

  graph.addNode({ id: 'a', x: 80, y: 130, width: 150, height: 54, fill: '#e6f7ff', stroke: '#1890ff', label: '双击编辑' });
  graph.addNode({ id: 'b', x: 400, y: 90, width: 140, height: 54, label: 'Node B' });
  graph.addNode({ id: 'c', x: 400, y: 240, width: 140, height: 54, fill: '#f6ffed', stroke: '#52c41a', label: 'Node C' });
  graph.addEdge({ source: 'a', target: 'b', connector: 'rounded' });
  graph.addEdge({ source: 'a', target: 'c', connector: 'smooth' });

  return graph;
}
