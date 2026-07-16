import { describe, it, expect, vi } from 'vitest';
import {
  normalRouter, orthogonalRouter, manhattanRouter, manhattanAStarRouter,
  builtInRouters, RouterRegistry, createDefaultRouterRegistry,
  normalConnector, polylineConnector, roundedConnector, smoothConnector,
  builtInConnectors, ConnectorRegistry, createDefaultConnectorRegistry, updatePath,
} from '../src/index';
import type { Point } from '../src/utils/types';
import { Edge } from '../src/core/Edge';
import { Port } from '../src/core/Port';
import { Node } from '../src/core/Node';
import { getCellChildren, getCellDescendants } from '../src/core/cell-tree';

describe('Edge 端点监听', () => {
  const endpoint = (): any => {
    const listeners = new Map<string, Set<() => void>>();
    return {
      addEventListener(type: string, listener: () => void) {
        (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(listener);
      },
      removeEventListener(type: string, listener: () => void) {
        listeners.get(type)?.delete(listener);
      },
      emit(type: string) {
        for (const listener of listeners.get(type) ?? []) listener();
      },
      listenerCount(type: string) { return listeners.get(type)?.size ?? 0; },
    };
  };

  it('端点变更时解绑旧节点、绑定新节点且同端点不重复绑定', () => {
    const edge = new Edge() as any;
    const a = endpoint();
    const b = endpoint();
    const c = endpoint();
    const markDirty = vi.fn();
    edge.markDirty = markDirty;
    edge.syncBoundsChangeBindings([a, b]);
    edge.syncBoundsChangeBindings([a, b]);
    expect(a.listenerCount('node:boundschange')).toBe(1);
    expect(b.listenerCount('node:boundschange')).toBe(1);
    edge.syncBoundsChangeBindings([b, c]);
    expect(a.listenerCount('node:boundschange')).toBe(0);
    expect(b.listenerCount('node:boundschange')).toBe(1);
    expect(c.listenerCount('node:boundschange')).toBe(1);
    a.emit('node:boundschange');
    b.emit('node:boundschange');
    c.emit('node:boundschange');
    expect(markDirty).toHaveBeenCalledTimes(2);
  });

  it('断开时解除全部端点监听并停止虚线动画', () => {
    const edge = new Edge() as any;
    const a = endpoint();
    edge.syncBoundsChangeBindings([a]);
    edge.stopDashFlow = vi.fn();
    edge.disconnectedCallback();
    expect(edge.stopDashFlow).toHaveBeenCalledOnce();
    expect(a.listenerCount('node:boundschange')).toBe(0);
  });
});

describe('Port owner 监听', () => {
  const owner = (): any => {
    const listeners = new Map<string, Set<() => void>>();
    return {
      addEventListener(type: string, listener: () => void) {
        (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(listener);
      },
      removeEventListener(type: string, listener: () => void) {
        listeners.get(type)?.delete(listener);
      },
      emit(type: string) { for (const listener of listeners.get(type) ?? []) listener(); },
      listenerCount(type: string) { return listeners.get(type)?.size ?? 0; },
    };
  };

  it('重挂载时只保留新 owner 的监听，断开时释放', () => {
    const port = new Port() as any;
    const first = owner();
    const second = owner();
    const markDirty = vi.fn();
    port.markDirty = markDirty;
    port.parentNode = first;
    port.bindOwnerBounds();
    port.parentNode = second;
    port.bindOwnerBounds();
    expect(first.listenerCount('node:boundschange')).toBe(0);
    expect(second.listenerCount('node:boundschange')).toBe(1);
    first.emit('node:boundschange');
    second.emit('node:boundschange');
    expect(markDirty).toHaveBeenCalledTimes(1);
    port.disconnectedCallback();
    expect(second.listenerCount('node:boundschange')).toBe(0);
  });
});

describe('领域子树与世界几何', () => {
  it('领域子树工具过滤渲染内部节点并保留嵌套 Cell', () => {
    const port = new Port();
    const nested = new Node();
    const parent: any = { childNodes: [{ kind: 'body' }, port, nested] };
    const nestedPort = new Port();
    (nested as any).childNodes = [{ kind: 'label' }, nestedPort];
    expect(getCellChildren(parent)).toEqual([port, nested]);
    expect(getCellDescendants(parent)).toEqual([port, nested, nestedPort]);
  });

  it('嵌套 Group 的 Node 中心由世界 bbox 计算', () => {
    const group: any = { className: 'ge-group', styleProps: () => ({ x: 100, y: 200 }), parentNode: null };
    const node = new Node({ style: { x: 10, y: 20, width: 30, height: 40 } });
    (node as any).parentNode = group;
    expect(node.getWorldBBox()).toEqual({ x: 110, y: 220, width: 30, height: 40 });
    expect(node.getWorldCenter()).toEqual({ x: 125, y: 240 });
  });

  it('Port 世界位置叠加 owner 的世界中心与局部坐标', () => {
    const port = new Port() as any;
    port.parentNode = { getWorldBBox: () => ({ x: 100, y: 200, width: 80, height: 40 }) };
    port.getLocalPosition = () => ({ x: -40, y: 0 });
    expect(port.getWorldPosition()).toEqual({ x: 100, y: 220 });
  });

  it('Edge 端点 bbox 使用 Node/Port 的世界几何', () => {
    const edge = new Edge() as any;
    const node = { getWorldBBox: () => ({ x: 100, y: 200, width: 80, height: 40 }), childNodes: [] };
    expect(edge.endpointBBox(node, { cell: 'n' })).toEqual({ x: 100, y: 200, width: 80, height: 40 });
    const port = new Port({ id: 'p' }) as any;
    port.getWorldPosition = () => ({ x: 100, y: 220 });
    node.childNodes = [port];
    expect(edge.endpointBBox(node, { cell: 'n', port: 'p' })).toEqual({ x: 99.5, y: 219.5, width: 1, height: 1 });
  });
});

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

  it('RouterRegistry: 内置映射、链式注册、覆盖与回退', () => {
    const r = createDefaultRouterRegistry();
    expect(r.list().sort()).toEqual(Object.keys(builtInRouters).sort());
    for (const [name, fn] of Object.entries(builtInRouters)) expect(r.resolve(name)).toBe(fn);
    const first = () => [{ x: 1, y: 1 }];
    const second = () => [{ x: 2, y: 2 }];
    expect(r.register('custom', first)).toBe(r);
    expect(r.has('custom')).toBe(true);
    expect(r.resolve('custom')).toBe(first);
    r.register('custom', second);
    expect(r.resolve('custom')).toBe(second);
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

  it('连接器退化参数不产生非有限路径', () => {
    const repeated = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }];
    for (const radius of [0, -1, 1e9, NaN, Infinity]) {
      expect(roundedConnector(repeated, { radius })).not.toMatch(/NaN|Infinity/);
    }
    for (const tension of [0, -1, 1e9, NaN, Infinity, -Infinity]) {
      expect(smoothConnector(repeated, { tension })).not.toMatch(/NaN|Infinity/);
    }
    expect(normalConnector([{ x: 1, y: 2 }])).toBe('M 1 2');
  });

  it('ConnectorRegistry: 内置映射、链式注册、覆盖与回退', () => {
    const r = createDefaultConnectorRegistry();
    expect(r.list().sort()).toEqual(Object.keys(builtInConnectors).sort());
    for (const [name, fn] of Object.entries(builtInConnectors)) expect(r.resolve(name)).toBe(fn);
    const first = () => 'first';
    const second = () => 'second';
    expect(r.register('custom', first)).toBe(r);
    expect(r.has('custom')).toBe(true);
    expect(r.resolve('custom')).toBe(first);
    r.register('custom', second);
    expect(r.resolve('custom')).toBe(second);
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
    updatePath(fakePath, [], normalConnector, {});
    expect(fakePath.setAttribute).toHaveBeenCalledTimes(3);
    expect(fakePath.setAttribute).toHaveBeenLastCalledWith('d', '');
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

  it('端点含 NaN/Infinity → 立即降级不冻结（NaN > 4000 === false 修复）', () => {
    // NaN 端点曾导致 gridArea=NaN 绕过上限检查，A* 无限扩展冻结主线程
    const result = manhattanAStarRouter(
      [{ x: NaN, y: 82 }, { x: 990, y: 242 }],
      { obstacles: [], resolution: 10 }
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    // Infinity 同理
    const result2 = manhattanAStarRouter(
      [{ x: 0, y: 0 }, { x: Infinity, y: Infinity }],
      { obstacles: [], resolution: 10 }
    );
    expect(result2.length).toBeGreaterThanOrEqual(2);
  });

  it('端点不在 grid 上 → 严格正交路径（无斜线/无小拐角）', () => {
    // 模拟真实渲染端点坐标（非 grid 对齐），含中间障碍
    const result = manhattanAStarRouter(
      [{ x: 952.188, y: 104 }, { x: 783.331, y: 202.246 }],
      { obstacles: [{ x: 840, y: 110, width: 120, height: 70 }], resolution: 10 }
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    // 逐段验证严格正交：dx==0 或 dy==0（容差 0.001）
    for (let i = 1; i < result.length; i++) {
      const dx = Math.abs(result[i].x - result[i - 1].x);
      const dy = Math.abs(result[i].y - result[i - 1].y);
      if (dx > 0.001 && dy > 0.001) {
        throw new Error(`段 ${i - 1}->${i} 非正交: dx=${dx} dy=${dy} (${JSON.stringify(result[i - 1])})->(${JSON.stringify(result[i])})`);
      }
      expect(dx < 0.001 || dy < 0.001).toBe(true);
    }
  });

  it('非法或过小分辨率在栅格化障碍前降级', () => {
    const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    const fallback = manhattanRouter(points);
    const obstacles = [{ x: 20, y: 20, width: 40, height: 40 }];
    for (const resolution of [0, -1, NaN, Infinity, -Infinity, Number.MIN_VALUE, 1e-9]) {
      expect(manhattanAStarRouter(points, { obstacles, resolution })).toEqual(fallback);
    }
  });

  it('端点拖远（网格搜索空间超过上限）→ 降级 manhattan 不卡死', () => {
    // 模拟端点被拖到远处：网格搜索空间超过一千格，必须降级
    const far = manhattanAStarRouter(
      [{ x: 990, y: 82 }, { x: -2000, y: 3000 }],
      { obstacles: [], resolution: 10 }
    );
    expect(far.length).toBeGreaterThanOrEqual(2);
    // 降级后仍为正交路径
    for (let i = 1; i < far.length; i++) {
      const dx = Math.abs(far[i].x - far[i - 1].x);
      const dy = Math.abs(far[i].y - far[i - 1].y);
      expect(dx < 0.001 || dy < 0.001).toBe(true);
    }
    // 近距离（grid 小）仍走 A*，返回值合理
    const near = manhattanAStarRouter(
      [{ x: 990, y: 82 }, { x: 990, y: 242 }],
      { obstacles: [{ x: 940, y: 140, width: 100, height: 44 }], resolution: 10 }
    );
    expect(near.length).toBeGreaterThanOrEqual(2);
  });
});
