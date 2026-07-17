import { Graph } from '@ge';

/**
 * 端口（Port）：节点挂载 Port，边端点用 ratio 锚点精确定位连接位置。
 * - 上排（蓝）：右端口 → 左端口，rounded 连线
 * - 下排（橙）：底端口 → 底端口，orthogonal 路由
 */
export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#fafafa' });
  await graph.ready;

  const a = graph.addNode({ id: 'a', x: 60, y: 130, width: 150, height: 60, label: 'Node A' });
  const b = graph.addNode({ id: 'b', x: 420, y: 130, width: 150, height: 60, label: 'Node B' });

  // 端口坐标相对 owner 的左上角（局部坐标）
  graph.addPort(a, { id: 'pa-r', x: 150, y: 30, fill: '#1890ff' });
  graph.addPort(b, { id: 'pb-l', x: 0, y: 30, fill: '#1890ff' });
  graph.addPort(a, { id: 'pa-b', x: 75, y: 60, fill: '#fa541c' });
  graph.addPort(b, { id: 'pb-b', x: 75, y: 60, fill: '#fa541c' });

  // ratio 锚点：dx/dy 为相对节点中心的比例（-0.5~0.5）
  graph.addEdge({
    source: { cell: 'a', anchor: 'ratio', anchorArgs: { dx: 0.5, dy: 0 } },
    target: { cell: 'b', anchor: 'ratio', anchorArgs: { dx: -0.5, dy: 0 } },
    connector: 'rounded', stroke: '#1890ff',
  });
  graph.addEdge({
    source: { cell: 'a', anchor: 'ratio', anchorArgs: { dx: 0, dy: 0.5 } },
    target: { cell: 'b', anchor: 'ratio', anchorArgs: { dx: 0, dy: 0.5 } },
    router: 'orthogonal', connector: 'rounded', stroke: '#fa541c',
  });

  return graph;
}
