import { describe, it, expect, vi } from 'vitest';
import {
  normalRouter, orthogonalRouter, manhattanRouter, manhattanAStarRouter,
  RouterRegistry, createDefaultRouterRegistry,
} from '../src/edge/router';
import {
  normalConnector, polylineConnector, roundedConnector, smoothConnector,
  ConnectorRegistry, createDefaultConnectorRegistry, updatePath,
} from '../src/edge/connector';
import type { Point } from '../src/utils/types';

describe('router', () => {
  it('normalRouter 去除连续重复点', () => {
    expect(
      normalRouter([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 5 }]),
    ).toEqual([{ x: 0, y: 0 }, { x: 5, y: 5 }]);
  });

  it('orthogonalRouter: 不对齐时插入拐点（|dx|>=|dy| 先 x）', () => {
    expect(orthogonalRouter([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toEqual([
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 },
    ]);
  });

  it('orthogonalRouter: |dy|>|dx| 先 y', () => {
    expect(orthogonalRouter([{ x: 0, y: 0 }, { x: 5, y: 10 }])).toEqual([
      { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 5, y: 10 },
    ]);
  });

  it('orthogonalRouter: 已对齐不插点', () => {
    expect(orthogonalRouter([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toEqual([
      { x: 0, y: 0 }, { x: 10, y: 0 },
    ]);
  });

  it('manhattanRouter: Z 形中点转折', () => {
    expect(manhattanRouter([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toEqual([
      { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 5 },
    ]);
  });

  it('RouterRegistry: 注册 / 解析 / 回退', () => {
    const r = createDefaultRouterRegistry();
    expect(r.has('manhattan')).toBe(true);
    expect(r.list()).toContain('orthogonal');
    expect(r.resolve('not-exist')([{ x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }]);
  });
});

describe('connector', () => {
  const seg2: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
  const seg3: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];

  it('normalConnector: M + L', () => {
    expect(normalConnector(seg2)).toBe('M 0 0 L 10 0');
  });

  it('normalConnector: 空数组返回空串', () => {
    expect(normalConnector([])).toBe('');
  });

  it('polylineConnector 与 normal 一致', () => {
    expect(polylineConnector(seg2)).toBe(normalConnector(seg2));
  });

  it('roundedConnector: 含二次贝塞尔 Q', () => {
    const d = roundedConnector(seg3, { radius: 8 });
    // r=min(8,5,5)=5；A=(5,0) B=(10,5)
    expect(d).toContain('Q 10 0 10 5');
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d.endsWith('L 10 10')).toBe(true);
  });

  it('roundedConnector: 三点退化为直线时不含 Q', () => {
    expect(roundedConnector(seg2)).toBe('M 0 0 L 10 0');
  });

  it('smoothConnector: 含三次贝塞尔 C', () => {
    const d = smoothConnector(seg3);
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d).toContain('C ');
    // 末段到达 (10,10)
    expect(d.endsWith('10 10')).toBe(true);
  });

  it('ConnectorRegistry: 回退到 normal', () => {
    const r = createDefaultConnectorRegistry();
    expect(r.has('smooth')).toBe(true);
    expect(r.resolve('not-exist')(seg2)).toBe('M 0 0 L 10 0');
  });

  it('updatePath: 原地 setAttribute（修复 P0-2）', () => {
    const fakePath = { setAttribute: vi.fn() };
    updatePath(fakePath, seg2, normalConnector, {});
    expect(fakePath.setAttribute).toHaveBeenCalledWith('d', 'M 0 0 L 10 0');
    // 再次更新应复用同一对象，而非销毁重建
    updatePath(fakePath, seg3, normalConnector, {});
    expect(fakePath.setAttribute).toHaveBeenCalledTimes(2);
    expect(fakePath.setAttribute).toHaveBeenLastCalledWith('d', 'M 0 0 L 10 0 L 10 10');
  });
});

describe('manhattanAStarRouter', () => {
  it('无障碍 → 正交路径', () => {
    const result = manhattanAStarRouter(
      [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      { obstacles: [], resolution: 10 }
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[result.length - 1]).toEqual({ x: 100, y: 100 });
  });

  it('有障碍 → 绕路（y 偏离 0）', () => {
    const result = manhattanAStarRouter(
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      { obstacles: [{ x: 30, y: -10, width: 40, height: 20 }], resolution: 10 }
    );
    // 应避开 y=0 附近的障碍
    const hasDetour = result.some((p) => Math.abs(p.y) > 15);
    expect(hasDetour).toBe(true);
  });

  it('注册表中可解析', () => {
    const reg = createDefaultRouterRegistry();
    expect(reg.resolve('manhattan-astar')).toBe(manhattanAStarRouter);
  });
});
