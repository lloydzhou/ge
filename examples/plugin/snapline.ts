import { Graph, DragPlugin, SelectionPlugin, SnaplinePlugin } from '@ge';

/**
 * 对齐辅助线（Snapline）：拖拽节点接近其它节点边缘时显示对齐线。
 * threshold 控制触发灵敏度（px）。
 */
export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#fafafa' });
  await graph.ready;
  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());
  graph.use(new SnaplinePlugin({ threshold: 6 }));

  graph.addNode({ id: 'a', x: 60, y: 100, width: 120, height: 50, fill: '#e6f7ff', stroke: '#1890ff', label: '拖我对齐' });
  graph.addNode({ id: 'b', x: 320, y: 100, width: 120, height: 50, label: 'B' });
  graph.addNode({ id: 'c', x: 320, y: 230, width: 120, height: 50, fill: '#f6ffed', stroke: '#52c41a', label: 'C' });

  return graph;
}
