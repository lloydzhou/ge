import { Graph } from '@ge';
import { mountStage, btn } from '../_ui';

/**
 * 导出图片：toDataURL() 将画布栅格化为 PNG（SVG 渲染器会先转 SVG 再用 canvas 栅格化）。
 */
export async function setup(host: HTMLElement) {
  const { graphDiv, toolbar } = mountStage(host);
  const graph = new Graph({ container: graphDiv, background: '#ffffff' });
  await graph.ready;

  graph.addNode({ id: 'a', x: 60, y: 110, width: 120, height: 50, fill: '#e6f7ff', stroke: '#1890ff', label: 'Start' });
  graph.addNode({ id: 'b', x: 360, y: 70, width: 120, height: 50, label: 'Process' });
  graph.addNode({ id: 'c', x: 360, y: 210, width: 64, height: 64, shape: 'circle', fill: '#fff7e6', stroke: '#fa8c16', label: 'End' });
  graph.addEdge({ source: 'a', target: 'b', connector: 'rounded', stroke: '#1890ff' });
  graph.addEdge({ source: 'b', target: 'c', connector: 'smooth', stroke: '#52c41a' });

  btn(toolbar, '导出 PNG', async () => {
    const url = await graph.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ge-export.png';
    a.click();
  });

  return graph;
}
