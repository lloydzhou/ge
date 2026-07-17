import {
  Graph, DragPlugin, SelectionPlugin,
  gridLayout, circularLayout, forceLayout, hierarchicalLayout,
} from '@ge';
import { mountStage, btn } from '../_ui';

/**
 * 布局算法：一键切换 网格 / 环形 / 力导向 / 层次 布局。
 * 布局函数为纯函数，返回 positions Map，由 graph.applyLayout 应用到节点。
 */
export async function setup(host: HTMLElement) {
  const { graphDiv, toolbar } = mountStage(host);
  const graph = new Graph({ container: graphDiv, background: '#fafafa' });
  await graph.ready;
  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());

  const N = 10;
  for (let i = 0; i < N; i++) {
    graph.addNode({ id: 'n' + i, x: 30 + (i % 5) * 110, y: 30 + Math.floor(i / 5) * 100, width: 80, height: 50, fill: '#e6f7ff', stroke: '#1890ff', label: 'N' + i });
  }
  for (let i = 0; i < N - 1; i++) graph.addEdge({ source: 'n' + i, target: 'n' + (i + 1) });

  const toNodes = () => graph.getNodes().map((n) => ({ id: n.id }));
  const toEdges = () =>
    graph.getEdges().map((e) => {
      const s = e.getAttribute('source') as any;
      const t = e.getAttribute('target') as any;
      return { source: typeof s === 'string' ? s : s.cell, target: typeof t === 'string' ? t : t.cell };
    });

  btn(toolbar, '网格', () => graph.applyLayout(gridLayout(toNodes(), { gap: 40, startX: 30, startY: 30 })));
  btn(toolbar, '环形', () => graph.applyLayout(circularLayout(toNodes(), { cx: 320, cy: 220, radius: 170 })));
  btn(toolbar, '力导向', () => graph.applyLayout(forceLayout(toNodes(), toEdges(), { iterations: 250, width: 700, height: 460 })));
  btn(toolbar, '层次', () => graph.applyLayout(hierarchicalLayout(toNodes(), toEdges(), { startX: 30, startY: 30 })));

  return graph;
}
