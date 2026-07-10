import { describe, it, expect } from 'vitest';
import { GraphSnapshot } from '../src/core/GraphSnapshot';

/** 轻量 mock graph，避免引入真实 g-lite Canvas（happy-dom 下不稳定） */
const mockGraph = (overrides: any = {}) => ({
  getConfig: () => ({ width: 800, height: 600 }),
  toJSON: () => ({
    version: 1,
    viewport: { panX: 0, panY: 0, zoom: 1 },
    cells: [
      {
        tag: 'ge-group', id: 'group', props: { x: 10 }, data: { nested: { value: 1 } }, children: [
          { tag: 'ge-node', id: 'node', props: { stateStyles: { selected: { stroke: '#1890ff' } } }, data: {}, children: [
            { tag: 'ge-port', id: 'port', props: { layout: 'left' }, data: {}, children: [] },
          ] },
        ],
      },
      { tag: 'ge-edge', id: 'edge', props: { source: { cell: 'node', port: 'port' } }, data: {}, children: [] },
    ],
  }),
  panOffset: { x: 10, y: 20 },
  getCamera: () => ({ getZoom: () => 1.5 }),
  ...overrides,
});

describe('GraphSnapshot', () => {
  it('from：保留完整递归 GraphJSON、viewport 与尺寸', () => {
    const snap = GraphSnapshot.from(mockGraph() as any);
    expect(snap.data.version).toBe(1);
    expect(snap.data.cells).toHaveLength(2);
    expect((snap.data.cells as any[])[0].children[0].children[0].id).toBe('port');
    expect(snap.data.viewport).toEqual({ panX: 10, panY: 20, zoom: 1.5 });
    expect(snap.data.width).toBe(800);
    expect(snap.data.height).toBe(600);
  });

  it('from：深拷贝嵌套 props/data/children，修改快照不污染源', () => {
    const source = mockGraph().toJSON();
    const graph = mockGraph({ toJSON: () => source });
    const snap = GraphSnapshot.from(graph as any);
    const group = (snap.data.cells as any[])[0];
    group.data.nested.value = 99;
    group.children[0].props.stateStyles.selected.stroke = '#f00';
    group.children[0].children[0].props.layout = 'right';
    expect(source.cells[0].data.nested.value).toBe(1);
    expect(source.cells[0].children[0].props.stateStyles.selected.stroke).toBe('#1890ff');
    expect(source.cells[0].children[0].children[0].props.layout).toBe('left');
  });

  it('兼容保留旧 nodes/edges GraphJSON', () => {
    const snap = GraphSnapshot.from(mockGraph({ toJSON: () => ({ nodes: [{ id: 'a', style: { fill: '#fff' } }], edges: [{ id: 'e' }] }) }) as any);
    expect(snap.data.nodes?.[0].id).toBe('a');
    expect(snap.data.edges?.[0].id).toBe('e');
  });

  it('toJSON：返回同一份数据', () => {
    const snap = GraphSnapshot.from(mockGraph() as any);
    expect(snap.toJSON()).toBe(snap.data);
  });

  it('zoom 兜底：getCamera 返回 0 时 zoom 为 1', () => {
    const g = mockGraph({ getCamera: () => ({ getZoom: () => 0 }) });
    const snap = GraphSnapshot.from(g as any);
    expect(snap.data.viewport.zoom).toBe(1);
  });
});
