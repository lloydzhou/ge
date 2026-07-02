import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GraphView } from '@ge-react';

const initialNodes = [
  { id: 'a', x: 120, y: 200, width: 140, height: 54, fill: '#e6f7ff', stroke: '#1890ff', label: 'React A' },
  { id: 'b', x: 460, y: 140, width: 140, height: 54, label: 'React B' },
  { id: 'c', x: 460, y: 320, width: 140, height: 54, fill: '#f6ffed', stroke: '#52c41a', label: 'React C' },
];
const initialEdges = [
  { id: 'e1', source: 'a', target: 'b', router: 'orthogonal', connector: 'rounded' },
  { id: 'e2', source: 'a', target: 'c', connector: 'smooth' },
];

function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges] = useState(initialEdges);
  const [n, setN] = useState(0);

  const addNode = () => {
    const id = 'dyn-' + (++window.__seq);
    setNodes([...nodes, { id, x: 200 + Math.random() * 300, y: 100 + Math.random() * 380, width: 120, height: 50, label: id, fill: '#fff7e6', stroke: '#fa8c16' }]);
    setN(n + 1);
  };
  const removeFirst = () => {
    if (nodes.length > 1) setNodes(nodes.slice(1));
    setN(n - 1);
  };
  const moveA = () => {
    // 声明式更新属性（diff 会 setAttribute）
    setNodes(nodes.map((nd) => (nd.id === 'a' ? { ...nd, x: nd.x + 30, label: 'A moved' } : nd)));
  };

  return (
    <>
      <GraphView
        options={{ width: 1280, height: 720, background: '#fafafa' }}
        nodes={nodes}
        edges={edges}
        onReady={(g) => { window.ge = g; }}
      />
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, pointerEvents: 'none' }}>
        <button style={{ pointerEvents: 'auto' }} onClick={addNode}>+ 节点</button>
        <button style={{ pointerEvents: 'auto' }} onClick={removeFirst}>删首</button>
        <button style={{ pointerEvents: 'auto' }} onClick={moveA}>移动 A</button>
      </div>
    </>
  );
}

window.__seq = 0;
createRoot(document.getElementById('root')).render(<App />);
