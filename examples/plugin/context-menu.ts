import { Graph, DragPlugin, SelectionPlugin, ContextMenuPlugin } from '@ge';

/**
 * 右键菜单（ContextMenu）：右键画布弹出自定义菜单。
 * 菜单项通过构造函数配置（DOM 化），点击触发 action({ target, graph })。
 * target 为右键命中的节点（pickNode），空白处为 null。
 */
export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#fafafa' });
  await graph.ready;
  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());
  graph.use(
    new ContextMenuPlugin([
      {
        label: '复制节点',
        action: ({ target }) => {
          if (target) console.log('copy', target.id);
        },
      },
      {
        label: '删除节点',
        action: ({ target, graph }) => {
          if (target) graph.removeCell(target.id);
        },
      },
      { label: '', separator: true },
      { label: '自适应缩放', action: ({ graph }) => graph.zoomToFit() },
    ]),
  );

  graph.addNode({ id: 'a', x: 80, y: 130, width: 130, height: 50, fill: '#e6f7ff', stroke: '#1890ff', label: '右键我' });
  graph.addNode({ id: 'b', x: 380, y: 90, width: 130, height: 50, label: 'B' });
  graph.addNode({ id: 'c', x: 380, y: 240, width: 130, height: 50, fill: '#f6ffed', stroke: '#52c41a', label: 'C' });
  graph.addEdge({ source: 'a', target: 'b', connector: 'rounded' });
  graph.addEdge({ source: 'a', target: 'c', connector: 'smooth' });

  return graph;
}
