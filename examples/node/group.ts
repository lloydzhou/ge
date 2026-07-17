import { Graph, DragPlugin, SelectionPlugin } from '@ge';

/**
 * 分组（Group）：拖动分组（虚线框）时，组内被 embed 的节点整体跟随。
 * 组内节点连到组外节点时，世界坐标计算正确。
 */
export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#fafafa' });
  await graph.ready;
  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());

  const a = graph.addNode({ id: 'a', x: 150, y: 120, width: 120, height: 50, fill: '#e6f7ff', stroke: '#1890ff', label: '组内A' });
  const b = graph.addNode({ id: 'b', x: 150, y: 200, width: 120, height: 50, fill: '#e6f7ff', stroke: '#1890ff', label: '组内B' });
  graph.addNode({ id: 'c', x: 500, y: 160, width: 120, height: 50, fill: '#f6ffed', stroke: '#52c41a', label: '外部C' });

  // 创建分组并嵌入子节点：移动分组时子节点整体跟随
  const g = graph.addGroup({ id: 'g', x: 110, y: 80, width: 240, height: 200, label: '分组' });
  g.embed(a);
  g.embed(b);

  // 组内节点连到组外节点
  graph.addEdge({ source: 'a', target: 'c', router: 'orthogonal', connector: 'rounded', stroke: '#722ed1' });

  return graph;
}
