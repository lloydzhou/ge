import { Graph, DragPlugin, SelectionPlugin, HistoryPlugin, MinimapPlugin } from '@ge';

/**
 * 交互编辑：拖拽 + 框选 + 撤销重做 + 小地图。
 * - 拖拽节点，边自动跟随
 * - 单击选中（橙色高亮）/ Shift 多选
 * - Cmd/Ctrl+Z 撤销，Shift+Cmd/Ctrl+Z 重做
 */
export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#fafafa' });
  await graph.ready;

  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());
  graph.use(new HistoryPlugin());
  graph.use(new MinimapPlugin());

  graph.addNode({ id: 'a', x: 60, y: 140, width: 140, height: 54, fill: '#e6f7ff', stroke: '#1890ff', label: '拖我' });
  graph.addNode({ id: 'b', x: 420, y: 80, width: 140, height: 54, label: '连到这里' });
  graph.addNode({ id: 'c', x: 420, y: 260, width: 140, height: 54, fill: '#f6ffed', stroke: '#52c41a', label: '多选拖' });
  graph.addEdge({ source: 'a', target: 'b', router: 'orthogonal', connector: 'rounded', stroke: '#1890ff' });
  graph.addEdge({ source: 'a', target: 'c', connector: 'smooth', stroke: '#52c41a' });

  return graph;
}
