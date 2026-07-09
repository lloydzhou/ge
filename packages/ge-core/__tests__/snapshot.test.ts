import { describe, it, expect } from 'vitest';
import { GraphSnapshot } from '../src/core/GraphSnapshot';

/** 轻量 mock graph，避免引入真实 g-lite Canvas（happy-dom 下不稳定） */
const mockGraph = (overrides: any = {}) => ({
  getConfig: () => ({ width: 800, height: 600 }),
  toJSON: () => ({
    nodes: [{ id: 'a', x: 1 }, { id: 'b', x: 2 }],
    edges: [{ id: 'e1', source: 'a', target: 'b' }],
  }),
  panOffset: { x: 10, y: 20 },
  getCamera: () => ({ getZoom: () => 1.5 }),
  ...overrides,
});

describe('GraphSnapshot', () => {
  it('from：派生 nodes/edges/viewport/size 全量快照', () => {
    const snap = GraphSnapshot.from(mockGraph() as any);
    expect(snap.data.nodes).toHaveLength(2);
    expect(snap.data.edges).toHaveLength(1);
    expect(snap.data.viewport).toEqual({ panX: 10, panY: 20, zoom: 1.5 });
    expect(snap.data.width).toBe(800);
    expect(snap.data.height).toBe(600);
  });

  it('from：深拷贝 nodes/edges，修改快照不污染源', () => {
    const g = mockGraph();
    const snap = GraphSnapshot.from(g as any);
    snap.data.nodes[0].id = 'mutated';
    // 再次派生，源数据未变
    const snap2 = GraphSnapshot.from(g as any);
    expect(snap2.data.nodes[0].id).toBe('a');
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
