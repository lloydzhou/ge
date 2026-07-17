import { createElement as h, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { GraphView } from '@ge-react';

/**
 * React 声明式封装：<GraphView> 接收 nodes / edges，props 变化时按 id 增量 diff 自动同步。
 * 演示：动态增删节点、声明式更新属性（移动 A）。
 */
const initialNodes = [
  { id: 'a', x: 80, y: 150, width: 140, height: 54, fill: '#e6f7ff', stroke: '#1890ff', label: 'React A' },
  { id: 'b', x: 380, y: 90, width: 140, height: 54, label: 'React B' },
  { id: 'c', x: 380, y: 250, width: 140, height: 54, fill: '#f6ffed', stroke: '#52c41a', label: 'React C' },
];
const initialEdges = [
  { id: 'e1', source: 'a', target: 'b', router: 'orthogonal', connector: 'rounded' },
  { id: 'e2', source: 'a', target: 'c', connector: 'smooth' },
];

const BTN: Record<string, string> = {
  padding: '6px 12px',
  border: '1px solid #d9d9d9',
  background: '#fff',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
};

function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [seq, setSeq] = useState(0);

  const addNode = () => {
    const id = 'dyn-' + (seq + 1);
    setNodes([
      ...nodes,
      { id, x: 180 + Math.random() * 260, y: 70 + Math.random() * 330, width: 120, height: 50, label: id, fill: '#fff7e6', stroke: '#fa8c16' },
    ]);
    setSeq(seq + 1);
  };
  const moveA = () =>
    setNodes(nodes.map((n) => (n.id === 'a' ? { ...n, x: n.x + 30, label: 'A moved' } : n)));
  const removeLast = () => {
    if (nodes.length > 1) setNodes(nodes.filter((_, i) => i < nodes.length - 1));
  };

  return h(
    'div',
    { style: { position: 'relative', width: '100%', height: '100%' } },
    h(GraphView, {
      options: { background: '#fafafa' },
      nodes,
      edges: initialEdges,
      style: { width: '100%', height: '100%' },
    }),
    h(
      'div',
      { style: { position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 } },
      h('button', { onClick: addNode, style: BTN }, '+ 节点'),
      h('button', { onClick: removeLast, style: BTN }, '删末'),
      h('button', { onClick: moveA, style: BTN }, '移动 A'),
    ),
  );
}

export function setup(host: HTMLElement): { destroy: () => void } {
  const root: Root = createRoot(host);
  root.render(h(App));
  return { destroy: () => root.unmount() };
}
