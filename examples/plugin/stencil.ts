import { Graph, DragPlugin, SelectionPlugin, HistoryPlugin, DndPlugin } from '@ge';

/**
 * 模具拖拽（Stencil / DnD）：左侧模板项通过 HTML5 拖拽创建节点。
 * DndPlugin.registerTemplate 注册模板，dragstart 写入 dataTransfer。
 */
const TEMPLATES = [
  { type: 'rect', label: '矩形', props: { width: 120, height: 50, shape: 'rect', fill: '#e6f7ff', stroke: '#1890ff', label: '矩形' } },
  { type: 'circle', label: '圆形', props: { width: 70, height: 70, shape: 'circle', fill: '#fff7e6', stroke: '#fa8c16', label: '圆' } },
  { type: 'green', label: '绿色块', props: { width: 120, height: 50, fill: '#f6ffed', stroke: '#52c41a', label: '绿块' } },
];

export async function setup(host: HTMLElement) {
  // 左侧模板面板
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:absolute;top:10px;left:10px;width:116px;background:rgba(255,255,255,.94);padding:10px;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);z-index:10;';
  panel.innerHTML = '<div style="font-size:12px;color:#888;margin-bottom:8px;">拖到画布</div>';
  host.appendChild(panel);

  const graphDiv = document.createElement('div');
  graphDiv.style.cssText = 'position:absolute;inset:0;';
  host.appendChild(graphDiv);

  const graph = new Graph({ container: graphDiv, background: '#fafafa' });
  await graph.ready;
  graph.use(new DragPlugin());
  graph.use(new SelectionPlugin());
  graph.use(new HistoryPlugin());
  const dnd = graph.use(new DndPlugin());

  TEMPLATES.forEach((t) => {
    dnd.registerTemplate({ type: t.type, props: t.props });
    const el = document.createElement('div');
    el.draggable = true;
    el.textContent = t.label;
    el.dataset.type = t.type;
    el.style.cssText =
      'padding:8px;margin-bottom:6px;background:#f5f7fa;border:1px dashed #bbb;border-radius:6px;text-align:center;cursor:grab;font-size:12px;';
    el.addEventListener('dragstart', (e) => e.dataTransfer!.setData('text/ge-template', t.type));
    panel.appendChild(el);
  });

  graph.addNode({ id: 'n1', x: 300, y: 140, width: 120, height: 50, label: 'N1' });
  graph.addNode({ id: 'n2', x: 500, y: 140, width: 120, height: 50, label: 'N2' });
  graph.addEdge({ source: 'n1', target: 'n2' });

  return graph;
}
