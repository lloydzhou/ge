import { createRoot } from 'react-dom/client';
import { GraphView } from '@ge-react';

const nodes = [
  { id: 'a', x: 120, y: 200, width: 140, height: 54, fill: '#e6f7ff', stroke: '#1890ff', label: 'React A' },
  { id: 'b', x: 460, y: 140, width: 140, height: 54, label: 'React B' },
  { id: 'c', x: 460, y: 320, width: 140, height: 54, fill: '#f6ffed', stroke: '#52c41a', label: 'React C' },
];

const edges = [
  { source: 'a', target: 'b', router: 'orthogonal', connector: 'rounded' },
  { source: 'a', target: 'c', connector: 'smooth' },
];

function App() {
  return (
    <GraphView
      options={{ width: 1280, height: 720, background: '#fafafa' }}
      nodes={nodes}
      edges={edges}
      onReady={(g) => {
        window.ge = g;
        console.log('React GraphView ready, nodes:', g.getNodes().length);
      }}
    />
  );
}

createRoot(document.getElementById('root')).render(<App />);
