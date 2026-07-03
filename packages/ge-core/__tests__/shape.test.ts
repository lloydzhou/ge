import { describe, it, expect } from 'vitest';
import { ShapeRegistry, type ShapeDefinition } from '../src/shape/registry';
import { createDefaultShapeRegistry } from '../src/shape/builtIn';

describe('ShapeRegistry', () => {
  it('createDefaultShapeRegistry 注册内置 shape', () => {
    const r = createDefaultShapeRegistry();
    expect(r.has('rect')).toBe(true);
    expect(r.has('circle')).toBe(true);
    expect(r.has('ellipse')).toBe(true);
    expect(r.has('diamond')).toBe(true);
    expect(r.list().length).toBe(8);
  });

  it('resolve 精确匹配，找不到回退 rect', () => {
    const r = createDefaultShapeRegistry();
    expect(r.resolve('circle').name).toBe('circle');
    expect(r.resolve('diamond').name).toBe('diamond');
    expect(r.resolve('notexist').name).toBe('rect');
    expect(r.resolve(undefined).name).toBe('rect');
  });

  it('register 注册自定义 + get/has/list', () => {
    const r = new ShapeRegistry();
    const def: ShapeDefinition = { name: 'custom', create: (() => ({})) as any };
    r.register(def);
    expect(r.has('custom')).toBe(true);
    expect(r.get('custom')).toBe(def);
    expect(r.list()).toEqual(['custom']);
  });

  it('空 registry resolve 回退 rect 得到 undefined（无 rect）', () => {
    const r = new ShapeRegistry();
    expect(r.resolve('anything')).toBeUndefined();
  });

  it('register 链式 + 覆盖同名', () => {
    const r = new ShapeRegistry();
    const a: ShapeDefinition = { name: 'x', create: (() => ({})) as any };
    const b: ShapeDefinition = { name: 'x', create: (() => ({})) as any };
    r.register(a).register(b);
    expect(r.get('x')).toBe(b);
    expect(r.list()).toEqual(['x']);
  });
});
