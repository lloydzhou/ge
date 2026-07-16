import { describe, it, expect, vi } from 'vitest';
import {
  gridLayout, circularLayout, forceLayout, hierarchicalLayout, treeLayout,
} from '../src/index';
import type { LayoutNode, LayoutEdge } from '../src/layout/types';

const nodes = (ids: string[]): LayoutNode[] => ids.map((id) => ({ id }));

const expectCompleteFinite = (pos: Map<string, { x: number; y: number }>, ids: string[]) => {
  expect([...pos.keys()].sort()).toEqual([...ids].sort());
  pos.forEach((point) => {
    expect(Number.isFinite(point.x)).toBe(true);
    expect(Number.isFinite(point.y)).toBe(true);
  });
};

describe('gridLayout', () => {
  it('支持显式列数、零间距、空输入和单节点', () => {
    const pos = gridLayout(nodes(['a', 'b', 'c', 'd']), { cols: 2, gap: 100, startX: 0, startY: 0 });
    expect(pos.get('a')).toEqual({ x: 0, y: 0 });
    expect(pos.get('b')).toEqual({ x: 100, y: 0 });
    expect(pos.get('c')).toEqual({ x: 0, y: 100 });
    expect(pos.get('d')).toEqual({ x: 100, y: 100 });
    expect(gridLayout([]).size).toBe(0);
    expect(gridLayout(nodes(['a']), { gap: 0, startX: 3, startY: 4 }).get('a')).toEqual({ x: 3, y: 4 });
  });

  it('自动列数并拒绝非法列数', () => {
    const pos = gridLayout(nodes(['a', 'b', 'c']), { gap: 100, startX: 0, startY: 0 });
    expect(pos.get('b')!.x).toBe(100);
    for (const cols of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => gridLayout(nodes(['a']), { cols })).toThrow(RangeError);
    }
  });
});

describe('circularLayout', () => {
  it('覆盖空输入、单节点和零半径', () => {
    expect(circularLayout([]).size).toBe(0);
    expect(circularLayout(nodes(['a']), { cx: 0, cy: 0, radius: 100 }).get('a')).toEqual({ x: 100, y: 0 });
    const pos = circularLayout(nodes(['a', 'b']), { cx: 3, cy: 4, radius: 0 });
    expect(pos.get('a')).toEqual({ x: 3, y: 4 });
    expect(pos.get('b')).toEqual({ x: 3, y: 4 });
  });

  it('四节点等距分布并拒绝非有限参数', () => {
    const pos = circularLayout(nodes(['a', 'b', 'c', 'd']), { cx: 0, cy: 0, radius: 100 });
    pos.forEach((p) => expect(Math.hypot(p.x, p.y)).toBeCloseTo(100));
    expect(() => circularLayout(nodes(['a']), { radius: NaN })).toThrow(RangeError);
    expect(() => circularLayout(nodes(['a']), { cx: Infinity })).toThrow(RangeError);
  });
});

describe('forceLayout', () => {
  it('固定随机源处理重合节点、环、自环与未知端点', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0.2).mockReturnValueOnce(0.8).mockReturnValue(0.7);
    const ns: LayoutNode[] = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }, { id: 'c' }];
    const es: LayoutEdge[] = [
      { source: 'a', target: 'b' }, { source: 'b', target: 'a' },
      { source: 'a', target: 'a' }, { source: 'a', target: 'missing' },
    ];
    const pos = forceLayout(ns, es, { iterations: 5, width: 400, height: 400 });
    expectCompleteFinite(pos, ['a', 'b', 'c']);
    random.mockRestore();
  });

  it('零迭代保留显式坐标，空输入可终止', () => {
    const pos = forceLayout([{ id: 'a', x: 2, y: 3 }], [], { iterations: 0 });
    expect(pos.get('a')).toEqual({ x: 2, y: 3 });
    expect(forceLayout([], [], { iterations: 0 }).size).toBe(0);
  });

  it('拒绝会导致失控或非有限结果的参数', () => {
    for (const iterations of [-1, 1.5, NaN, Infinity]) {
      expect(() => forceLayout(nodes(['a']), [], { iterations })).toThrow(RangeError);
    }
    for (const k of [0, -1, NaN, Infinity]) {
      expect(() => forceLayout(nodes(['a']), [], { iterations: 0, k })).toThrow(RangeError);
    }
    expect(() => forceLayout(nodes(['a']), [], { width: 0 })).toThrow(RangeError);
    expect(() => forceLayout(nodes(['a']), [], { height: Infinity })).toThrow(RangeError);
  });
});

describe('hierarchicalLayout', () => {
  it('链式分层和同层排列', () => {
    const ns = nodes(['a', 'b', 'c']);
    const pos = hierarchicalLayout(ns, [{ source: 'a', target: 'b' }, { source: 'a', target: 'c' }], {
      layerGap: 100, nodeGap: 100, startX: 0, startY: 0,
    });
    expect(pos.get('a')!.y).toBe(0);
    expect(pos.get('b')!.y).toBe(100);
    expect(pos.get('c')!.y).toBe(100);
    expect(pos.get('b')!.x).not.toBe(pos.get('c')!.x);
  });

  it('环、自环、孤立节点、多分量和未知端点不遗漏节点', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const es: LayoutEdge[] = [
      { source: 'a', target: 'b' }, { source: 'b', target: 'a' },
      { source: 'c', target: 'c' }, { source: 'd', target: 'e' },
      { source: 'missing', target: 'a' }, { source: 'e', target: 'missing' },
    ];
    expectCompleteFinite(hierarchicalLayout(nodes(ids), es), ids);
    expect(hierarchicalLayout([], []).size).toBe(0);
  });

  it('同层节点按父层位置排序', () => {
    const ns = nodes(['a', 'b', 'c', 'd']);
    const pos = hierarchicalLayout(ns, [{ source: 'a', target: 'c' }, { source: 'b', target: 'd' }]);
    expect(pos.get('c')!.x).toBeLessThan(pos.get('d')!.x);
  });
});

describe('treeLayout', () => {
  it('支持左右和上下方向', () => {
    const ns = nodes(['root', 'a', 'b']);
    const es = [{ source: 'root', target: 'a' }, { source: 'root', target: 'b' }];
    const lr = treeLayout(ns, es, { direction: 'LR', startX: 0, startY: 0 });
    expect(lr.get('root')!.x).toBeLessThan(lr.get('a')!.x);
    expect(lr.get('a')!.x).toBe(lr.get('b')!.x);
    const tb = treeLayout(nodes(['root', 'a']), [{ source: 'root', target: 'a' }], { direction: 'TB' });
    expect(tb.get('root')!.y).toBeLessThan(tb.get('a')!.y);
  });

  it('环、自环、森林、孤立节点和未知端点只输出输入节点', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const es: LayoutEdge[] = [
      { source: 'a', target: 'b' }, { source: 'b', target: 'a' },
      { source: 'c', target: 'c' }, { source: 'd', target: 'e' },
      { source: 'missing', target: 'a' }, { source: 'e', target: 'missing' },
    ];
    expectCompleteFinite(treeLayout(nodes(ids), es), ids);
    expect(treeLayout([], []).size).toBe(0);
  });
});
