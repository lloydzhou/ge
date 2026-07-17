import {
  Graph, DragPlugin, SelectionPlugin, HistoryPlugin, MinimapPlugin,
  CreateEdgePlugin, KeyboardPlugin, ClipboardPlugin, TransformPlugin,
  ResizePlugin, RotatePlugin, GridPlugin, VertexPlugin,
} from '@ge';
import { mountStage, btn } from '../_ui';

/**
 * 编辑动作：复制 / 粘贴 / 克隆，配合 Alt+拖拽 创建连线、Delete 删除。
 */
export async function setup(host: HTMLElement) {
  const { graphDiv, toolbar } = mountStage(host);
  const graph = new Graph({ container: graphDiv, background: '#fafafa' });
  await graph.ready;

  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());
  graph.use(new HistoryPlugin());
  graph.use(new MinimapPlugin());
  graph.use(new CreateEdgePlugin({ trigger: 'alt' }));
  graph.use(new KeyboardPlugin());
  const clip = graph.use(new ClipboardPlugin());
  graph.use(new TransformPlugin());
  graph.use(new ResizePlugin());
  graph.use(new RotatePlugin());
  graph.use(new GridPlugin({ type: 'dot' }));
  graph.use(new VertexPlugin());

  graph.addNode({ id: 'a', x: 180, y: 200, width: 130, height: 50, fill: '#e6f7ff', stroke: '#1890ff', label: 'A', rotatable: true, resizable: true });
  graph.addNode({ id: 'b', x: 460, y: 150, width: 130, height: 50, label: 'B' });
  graph.addNode({ id: 'c', x: 460, y: 290, width: 130, height: 50, fill: '#f6ffed', stroke: '#52c41a', label: 'C' });
  graph.addEdge({ source: 'a', target: 'b', router: 'orthogonal', connector: 'rounded' });

  btn(toolbar, '复制', () => clip.copy());
  btn(toolbar, '粘贴', () => clip.paste());
  btn(toolbar, '克隆', () => clip.duplicate());

  return graph;
}
