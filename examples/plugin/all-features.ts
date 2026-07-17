import {
  Graph, DragPlugin, SelectionPlugin, HistoryPlugin, MinimapPlugin,
  CreateEdgePlugin, KeyboardPlugin, ClipboardPlugin, TransformPlugin,
  ResizePlugin, RotatePlugin, GridPlugin, VertexPlugin, BoundaryPlugin, Port,
} from '@ge';

/**
 * 全功能演示：集成 GE 主要插件 + 12 内置 Shape + A* 避障 / 自环 / 流动虚线 / 阴影 / Port。
 * 快捷键：Delete 删除 · Ctrl+Z 撤销 · Ctrl+Shift+Z 重做 · Ctrl+A 全选 · Ctrl+C/V 复制粘贴 · Alt+拖拽 连线
 */
export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#ffffff' });
  await graph.ready;

  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());
  graph.use(new HistoryPlugin());
  graph.use(new MinimapPlugin());
  graph.use(new CreateEdgePlugin({ trigger: 'alt' }));
  graph.use(new KeyboardPlugin());
  graph.use(new ClipboardPlugin());
  graph.use(new TransformPlugin());
  graph.use(new ResizePlugin());
  graph.use(new RotatePlugin());
  graph.use(new GridPlugin({ type: 'dot' }));
  graph.use(new VertexPlugin());
  graph.use(new BoundaryPlugin());

  // 1. 12 个 shape 节点（3 行 × 4 列）
  const shapes: [string, string, string][] = [
    ['rect', '#e6f7ff', '#1890ff'], ['circle', '#f6ffed', '#52c41a'],
    ['ellipse', '#fff7e6', '#fa8c16'], ['diamond', '#fff0f6', '#eb2f96'],
    ['triangle', '#f9f0ff', '#722ed1'], ['hexagon', '#e6fffb', '#13c2c2'],
    ['parallelogram', '#fcffe6', '#a0d911'], ['cylinder', '#fffbe6', '#fadb14'],
    ['star', '#fff1f0', '#f5223d'], ['text', '#f5f5f5', '#8c8c8c'],
    ['cross', '#e6f7ff', '#1890ff'], ['arrow', '#f6ffed', '#52c41a'],
  ];
  shapes.forEach(([shape, fill, stroke], i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    graph.addNode({
      id: 's' + i, shape, x: 30 + col * 120, y: 40 + row * 100,
      width: 90, height: 60, fill, stroke, strokeWidth: 1.5,
      label: shape, resizable: true, rotatable: true,
    });
  });

  // 2. A* 避障边（中间放障碍节点）
  graph.addNode({ id: 'astar-s', shape: 'rect', x: 30, y: 380, width: 100, height: 40, fill: '#e6f7ff', stroke: '#1890ff', label: 'A*源' });
  graph.addNode({ id: 'astar-obstacle', shape: 'rect', x: 180, y: 440, width: 100, height: 40, fill: '#fff1f0', stroke: '#f5223d', label: '障碍' });
  graph.addNode({ id: 'astar-t', shape: 'rect', x: 330, y: 380, width: 100, height: 40, fill: '#f6ffed', stroke: '#52c41a', label: 'A*终' });
  graph.addEdge({ source: 'astar-s', target: 'astar-t', router: 'manhattan-astar', connector: 'rounded', stroke: '#722ed1' });

  // 3. 自环边
  graph.addNode({ id: 'loop', shape: 'circle', x: 500, y: 400, width: 60, height: 60, fill: '#fff7e6', stroke: '#fa8c16', label: '自环' });
  graph.addEdge({ source: 'loop', target: 'loop', stroke: '#fa8c16' });

  // 4. 流动虚线边
  graph.addNode({ id: 'flow-a', shape: 'rect', x: 470, y: 380, width: 80, height: 36, fill: '#e6f7ff', stroke: '#1890ff', label: '流A' });
  graph.addNode({ id: 'flow-b', shape: 'rect', x: 470, y: 470, width: 80, height: 36, fill: '#e6f7ff', stroke: '#1890ff', label: '流B' });
  graph.addEdge({ source: 'flow-a', target: 'flow-b', lineDash: [6, 4], lineDashFlow: true, stroke: '#1890ff' });

  // 5. 阴影节点
  graph.addNode({ id: 'shadow', shape: 'rect', x: 620, y: 380, width: 120, height: 56, fill: '#fffbe6', stroke: '#fadb14', shadowColor: 'rgba(0,0,0,.35)', shadowBlur: 12, label: '阴影' });

  // 6. Port 节点
  graph.addNode({ id: 'port-node', shape: 'rect', x: 620, y: 60, width: 140, height: 90, fill: '#f9f0ff', stroke: '#722ed1', label: 'Ports', resizable: true, rotatable: true });
  const portNode = graph.getNode('port-node');
  if (portNode) {
    portNode.appendChild(new Port({ id: 'pt', layout: 'top' }));
    portNode.appendChild(new Port({ id: 'pb', layout: 'bottom' }));
    portNode.appendChild(new Port({ id: 'pl', layout: 'left' }));
    portNode.appendChild(new Port({ id: 'pr', layout: 'right' }));
  }

  return graph;
}
