import { Graph, DragPlugin, SelectionPlugin, ScrollerPlugin } from '@ge';

/**
 * 首页 Live Demo：一个流程图，集中展示 GE 的多 Shape、多 Connector、
 * 正交路由、流动动画、回环边等能力。可拖拽、滚轮缩放。
 */
export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#fafafa' });
  await graph.ready;
  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());
  graph.use(new ScrollerPlugin({ minZoom: 0.4, maxZoom: 3 }));

  graph.addNode({ id: 'start', shape: 'circle', x: 20, y: 150, width: 64, height: 64, fill: '#e6f7ff', stroke: '#1890ff', label: '开始' });
  graph.addNode({ id: 'p1', x: 130, y: 158, width: 110, height: 48, fill: '#fff', stroke: '#8c8c8c', label: '数据采集' });
  graph.addNode({ id: 'decision', shape: 'diamond', x: 280, y: 142, width: 104, height: 80, fill: '#fff7e6', stroke: '#fa8c16', label: '校验?' });
  graph.addNode({ id: 'p2', x: 430, y: 78, width: 110, height: 48, fill: '#f6ffed', stroke: '#52c41a', label: '业务处理' });
  graph.addNode({ id: 'end', shape: 'circle', x: 580, y: 82, width: 64, height: 64, fill: '#fff1f0', stroke: '#f5223d', label: '结束' });
  graph.addNode({ id: 'retry', x: 430, y: 268, width: 110, height: 48, fill: '#f9f0ff', stroke: '#722ed1', label: '异常重试' });

  graph.addEdge({ source: 'start', target: 'p1', connector: 'rounded', stroke: '#1890ff' });
  graph.addEdge({ source: 'p1', target: 'decision', connector: 'rounded', stroke: '#8c8c8c' });
  graph.addEdge({ source: 'decision', target: 'p2', connector: 'rounded', stroke: '#52c41a', label: '通过' });
  graph.addEdge({ source: 'decision', target: 'retry', connector: 'rounded', stroke: '#fa8c16', label: '失败' });
  // 流动虚线：处理完成流向结束
  graph.addEdge({ source: 'p2', target: 'end', connector: 'smooth', stroke: '#52c41a', lineDash: [6, 4], lineDashFlow: true });
  // 正交回环：重试回到采集
  graph.addEdge({ source: 'retry', target: 'p1', router: 'orthogonal', connector: 'rounded', stroke: '#722ed1' });

  return graph;
}
