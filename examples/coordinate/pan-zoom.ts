import { Graph, DragPlugin, SelectionPlugin, ScrollerPlugin } from '@ge';
import { mountStage, btn } from '../_ui';

/**
 * 平移与缩放：滚轮以光标为中心缩放，空白处拖拽平移画布。
 * ScrollerPlugin 提供 pan/zoom 交互；按钮调用 setZoom / zoomToFit / panTo。
 */
export async function setup(host: HTMLElement) {
  const { graphDiv, toolbar } = mountStage(host);
  const graph = new Graph({ container: graphDiv, background: '#fafafa' });
  await graph.ready;
  graph.use(new ScrollerPlugin({ minZoom: 0.2, maxZoom: 4 }));
  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());

  // 散布节点（部分超出初始视口，以演示平移）
  for (let i = 0; i < 8; i++) {
    graph.addNode({ id: 'n' + i, x: 40 + (i % 4) * 170, y: 40 + Math.floor(i / 4) * 160, width: 110, height: 50, fill: '#e6f7ff', stroke: '#1890ff', label: 'N' + i });
  }
  for (let i = 0; i < 7; i++) graph.addEdge({ source: 'n' + i, target: 'n' + (i + 1) });

  const zoom = () => graph.getCamera().getZoom();
  btn(toolbar, '放大', () => graph.setZoom(zoom() * 1.2));
  btn(toolbar, '缩小', () => graph.setZoom(zoom() / 1.2));
  btn(toolbar, '自适应', () => graph.zoomToFit());
  btn(toolbar, '重置', () => { graph.setZoom(1); graph.panTo(0, 0); });

  return graph;
}
