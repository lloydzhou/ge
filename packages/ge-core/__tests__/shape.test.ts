import { Circle, Ellipse, Path, Rect, Text, type DisplayObject } from '@antv/g-lite';
import { describe, expect, it } from 'vitest';
import {
  ShapeRegistry,
  builtInShapes,
  createDefaultShapeRegistry,
  type ShapeDefinition,
} from '../src/index';
import type { NodeStyleProps } from '../src/core/Node';

const shapeNames = [
  'rect',
  'circle',
  'ellipse',
  'diamond',
  'triangle',
  'hexagon',
  'parallelogram',
  'cylinder',
  'star',
  'text',
  'cross',
  'arrow',
] as const;

const initialStyle: NodeStyleProps = {
  width: 120,
  height: 60,
  fill: '#fff',
  stroke: '#1890ff',
  strokeWidth: 2,
  radius: 6,
  label: '初始文本',
};

const updatedStyle: NodeStyleProps = {
  ...initialStyle,
  width: 80,
  height: 40,
  radius: 10,
  label: '更新文本',
};

const expectedType: Record<(typeof shapeNames)[number], new (...args: any[]) => DisplayObject> = {
  rect: Rect,
  circle: Circle,
  ellipse: Ellipse,
  diamond: Path,
  triangle: Path,
  hexagon: Path,
  parallelogram: Path,
  cylinder: Path,
  star: Path,
  text: Text,
  cross: Path,
  arrow: Path,
};

const geometrySnapshot = (name: (typeof shapeNames)[number], body: DisplayObject): unknown => {
  if (name === 'rect') {
    return {
      width: body.getAttribute('width'),
      height: body.getAttribute('height'),
      radius: body.getAttribute('radius'),
    };
  }
  if (name === 'circle') {
    return {
      cx: body.getAttribute('cx'),
      cy: body.getAttribute('cy'),
      r: body.getAttribute('r'),
    };
  }
  if (name === 'ellipse') {
    return {
      cx: body.getAttribute('cx'),
      cy: body.getAttribute('cy'),
      rx: body.getAttribute('rx'),
      ry: body.getAttribute('ry'),
    };
  }
  if (name === 'text') {
    return {
      text: body.getAttribute('text'),
      x: body.getAttribute('x'),
      y: body.getAttribute('y'),
    };
  }
  return body.getAttribute('d');
};

describe('内置形状公开契约', () => {
  it('名称集合与默认注册表完整且同步', () => {
    expect(builtInShapes.map(({ name }) => name)).toEqual(shapeNames);

    const registry = createDefaultShapeRegistry();
    expect(registry.list()).toEqual(shapeNames);
    for (const name of shapeNames) {
      expect(registry.has(name)).toBe(true);
      expect(registry.get(name)).toBe(builtInShapes.find((shape) => shape.name === name));
    }
  });

  it.each(shapeNames)('%s 可创建并原地更新几何', (name) => {
    const definition = builtInShapes.find((shape) => shape.name === name)!;
    expect(definition.create).toBeTypeOf('function');
    expect(definition.update).toBeTypeOf('function');

    const body = definition.create!(initialStyle);
    expect(body).toBeInstanceOf(expectedType[name]);
    const before = geometrySnapshot(name, body);

    const sameBody = body;
    definition.update!(body, updatedStyle);

    expect(body).toBe(sameBody);
    expect(geometrySnapshot(name, body)).not.toEqual(before);

    if (name === 'rect') {
      expect(geometrySnapshot(name, body)).toEqual({ width: 80, height: 40, radius: 10 });
    } else if (name === 'circle') {
      expect(geometrySnapshot(name, body)).toEqual({ cx: 40, cy: 20, r: 20 });
    } else if (name === 'ellipse') {
      expect(geometrySnapshot(name, body)).toEqual({ cx: 40, cy: 20, rx: 40, ry: 20 });
    } else if (name === 'text') {
      expect(geometrySnapshot(name, body)).toEqual({ text: '初始文本', x: 40, y: 20 });
    } else {
      const path = geometrySnapshot(name, body);
      expect(path).toBeTypeOf('string');
      expect(path).not.toMatch(/NaN|Infinity/);
    }
  });
});

describe('ShapeRegistry', () => {
  it('resolve 精确匹配，找不到回退 rect', () => {
    const registry = createDefaultShapeRegistry();
    expect(registry.resolve('circle').name).toBe('circle');
    expect(registry.resolve('diamond').name).toBe('diamond');
    expect(registry.resolve('notexist').name).toBe('rect');
    expect(registry.resolve(undefined).name).toBe('rect');
  });

  it('register 支持链式注册、查询、列表与同名覆盖', () => {
    const registry = new ShapeRegistry();
    const first: ShapeDefinition = { name: 'custom', create: (() => ({})) as any };
    const second: ShapeDefinition = { name: 'custom', create: (() => ({})) as any };

    expect(registry.register(first)).toBe(registry);
    expect(registry.has('custom')).toBe(true);
    expect(registry.get('custom')).toBe(first);
    expect(registry.list()).toEqual(['custom']);

    registry.register(second);
    expect(registry.get('custom')).toBe(second);
    expect(registry.list()).toEqual(['custom']);
  });

  it('空注册表无法提供 rect 回退', () => {
    const registry = new ShapeRegistry();
    expect(registry.resolve('anything')).toBeUndefined();
  });
});
