import { Graph } from '@ge';

/**
 * 内置 Shape 一览：12 个内置形状（3 行 × 4 列）。
 */
const SHAPES: [string, string, string][] = [
  ['rect', '#e6f7ff', '#1890ff'],
  ['circle', '#f6ffed', '#52c41a'],
  ['ellipse', '#fff7e6', '#fa8c16'],
  ['diamond', '#fff0f6', '#eb2f96'],
  ['triangle', '#f9f0ff', '#722ed1'],
  ['hexagon', '#e6fffb', '#13c2c2'],
  ['parallelogram', '#fcffe6', '#a0d911'],
  ['cylinder', '#fffbe6', '#fadb14'],
  ['star', '#fff1f0', '#f5223d'],
  ['text', '#f5f5f5', '#8c8c8c'],
  ['cross', '#e6f7ff', '#1890ff'],
  ['arrow', '#f6ffed', '#52c41a'],
];

export async function setup(container: HTMLElement) {
  const graph = new Graph({ container, background: '#ffffff' });
  await graph.ready;

  SHAPES.forEach(([shape, fill, stroke], i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    graph.addNode({
      id: 's' + i, shape,
      x: 20 + col * 120, y: 20 + row * 100,
      width: 92, height: 60, fill, stroke, strokeWidth: 1.5,
      label: shape, resizable: true, rotatable: true,
    });
  });

  return graph;
}
