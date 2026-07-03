import { describe, it, expect } from 'vitest';
import { gridLayout } from '../src/layout/grid';
import { circularLayout } from '../src/layout/circular';
import { forceLayout } from '../src/layout/force';
import { hierarchicalLayout } from '../src/layout/hierarchical';
import type { LayoutNode, LayoutEdge } from '../src/layout/types';

const nodes = (ids: string[]): LayoutNode[] => ids.map((id) => ({ id }));

describe('gridLayout', () => {
  it('2 列网格', () => {
    const pos = gridLayout(nodes(['a', 'b', 'c', 'd']), { cols: 2, gap: 100, startX: 0, startY: 0 });
    expect(pos.get('a')).toEqual({ x: 0, y: 0 });
    expect(pos.get('b')).toEqual({ x: 100, y: 0 });
    expect(pos.get('c')).toEqual({ x: 0, y: 100 });
    expect(pos.get('d')).toEqual({ x: 100, y: 100 });
  });

  it('自动列数（sqrt(n)）', () => {
    const pos = gridLayout(nodes(['a', 'b', 'c']), { gap: 100, startX: 0, startY: 0 });
    expect(pos.size).toBe(3);
    expect(pos.get('b')!.x).toBe(100); // ceil(sqrt(3))=2 列
  });
});

describe('circularLayout', () => {
  it('4 节点等距分布在圆周', () => {
    const pos = circularLayout(nodes(['a', 'b', 'c', 'd']), { cx: 0, cy: 0, radius: 100 });
    expect(pos.get('a')).toEqual({ x: 100, y: 0 });
    expect(pos.get('b')!.x).toBeCloseTo(0);
    expect(pos.get('b')!.y).toBeCloseTo(100);
    pos.forEach((p) => expect(Math.hypot(p.x, p.y)).toBeCloseTo(100));
  });
});

describe('forceLayout', () => {
  it('返回所有节点位置且为有限数', () => {
    const ns = nodes(['a', 'b', 'c']);
    const es: LayoutEdge[] = [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }];
    const pos = forceLayout(ns, es, { iterations: 50, width: 400, height: 400 });
    expect(pos.size).toBe(3);
    pos.forEach((p) => {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    });
  });

  it('连通边端点距离收敛（不发散）', () => {
    const ns: LayoutNode[] = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 800, y: 0 }];
    const es: LayoutEdge[] = [{ source: 'a', target: 'b' }];
    const pos = forceLayout(ns, es, { iterations: 120, width: 400, height: 400 });
    const a = pos.get('a')!;
    const b = pos.get('b')!;
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(800); // 从 800 收敛
  });
});

describe('hierarchicalLayout', () => {
  it('链式分层：y 随深度递增', () => {
    const ns = nodes(['a', 'b', 'c']);
    const es: LayoutEdge[] = [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }];
    const pos = hierarchicalLayout(ns, es, { layerGap: 100, nodeGap: 100, startX: 0, startY: 0 });
    expect(pos.get('a')!.y).toBe(0);
    expect(pos.get('b')!.y).toBe(100);
    expect(pos.get('c')!.y).toBe(200);
  });

  it('同层节点水平排列', () => {
    const ns = nodes(['a', 'b', 'c']);
    const es: LayoutEdge[] = [{ source: 'a', target: 'b' }, { source: 'a', target: 'c' }];
    const pos = hierarchicalLayout(ns, es, { layerGap: 100, nodeGap: 100, startX: 0, startY: 0 });
    expect(pos.get('a')!.y).toBe(0);
    expect(pos.get('b')!.y).toBe(100);
    expect(pos.get('c')!.y).toBe(100);
    expect(pos.get('b')!.x).not.toBe(pos.get('c')!.x);
  });
});
