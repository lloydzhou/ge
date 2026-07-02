/**
 * 内置 shape：rect / circle / ellipse / diamond。
 * 每个 shape 把 NodeStyleProps 映射成 g-lite 渲染元素。
 */
import { Rect, Circle, Ellipse, Path, type DisplayObject } from '@antv/g-lite';
import type { ShapeDefinition } from './registry';
import type { NodeStyleProps } from '../core/Node';

export const rectShape: ShapeDefinition = {
  name: 'rect',
  create: (s) =>
    new Rect({
      style: {
        width: s.width as number,
        height: s.height as number,
        fill: s.fill,
        stroke: s.stroke,
        lineWidth: s.strokeWidth,
        radius: s.radius,
      },
    }),
};

export const circleShape: ShapeDefinition = {
  name: 'circle',
  create: (s) => {
    const w = s.width as number;
    const h = s.height as number;
    return new Circle({
      style: { cx: w / 2, cy: h / 2, r: Math.min(w, h) / 2, fill: s.fill, stroke: s.stroke, lineWidth: s.strokeWidth },
    });
  },
};

export const ellipseShape: ShapeDefinition = {
  name: 'ellipse',
  create: (s) => {
    const w = s.width as number;
    const h = s.height as number;
    return new Ellipse({
      style: { cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2, fill: s.fill, stroke: s.stroke, lineWidth: s.strokeWidth },
    });
  },
};

export const diamondShape: ShapeDefinition = {
  name: 'diamond',
  create: (s) => {
    const w = s.width as number;
    const h = s.height as number;
    const d = `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
    return new Path({ style: { d, fill: s.fill, stroke: s.stroke, lineWidth: s.strokeWidth } });
  },
};

export const builtInShapes: ShapeDefinition[] = [rectShape, circleShape, ellipseShape, diamondShape];

import { ShapeRegistry } from './registry';

export const createDefaultShapeRegistry = (): ShapeRegistry => {
  const r = new ShapeRegistry();
  for (const def of builtInShapes) r.register(def);
  return r;
};
