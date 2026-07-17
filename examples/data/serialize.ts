import { Graph, DragPlugin, SelectionPlugin } from '@ge';
import { mountStage, btn } from '../_ui';

/**
 * 序列化：toJSON() 导出整图为 GraphJSON，fromJSON() 从 JSON 恢复。
 * 流程：导出 → 清空 → 从 JSON 恢复（结果与原始一致）。
 */
export async function setup(host: HTMLElement) {
  const { graphDiv, toolbar } = mountStage(host);
  const graph = new Graph({ container: graphDiv, background: '#fafafa' });
  await graph.ready;
  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());

  graph.addNode({ id: 'a', x: 60, y: 130, width: 120, height: 50, fill: '#e6f7ff', stroke: '#1890ff', label: 'A' });
  graph.addNode({ id: 'b', x: 380, y: 80, width: 120, height: 50, label: 'B' });
  graph.addNode({ id: 'c', x: 380, y: 240, width: 120, height: 50, fill: '#f6ffed', stroke: '#52c41a', label: 'C' });
  graph.addEdge({ source: 'a', target: 'b', router: 'orthogonal', connector: 'rounded' });
  graph.addEdge({ source: 'a', target: 'c', connector: 'smooth' });

  let snapshot: unknown = null;
  btn(toolbar, '导出 JSON', () => {
    snapshot = graph.toJSON();
    // eslint-disable-next-line no-console
    console.log('GraphJSON:', snapshot);
  });
  btn(toolbar, '清空', () => {
    graph.getNodes().slice().forEach((n) => graph.removeCell((n as any).id));
  });
  btn(toolbar, '从 JSON 恢复', () => {
    if (snapshot) graph.fromJSON(snapshot as any);
  });

  return graph;
}
