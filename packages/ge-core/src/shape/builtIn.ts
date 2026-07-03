/**
 * 内置 shape：rect / circle / ellipse / diamond。
 * 每个 shape 把 NodeStyleProps 映射成 g-lite 渲染元素。
 */
import { Rect, Circle, Ellipse, Path, Text, type DisplayObject } from '@antv/g-lite';
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

export const triangleShape: ShapeDefinition = {
  name: 'triangle',
  create: (s) => {
    const w = s.width as number;
    const h = s.height as number;
    const d = `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`;
    return new Path({ style: { d, fill: s.fill, stroke: s.stroke, lineWidth: s.strokeWidth } });
  },
};

export const hexagonShape: ShapeDefinition = {
  name: 'hexagon',
  create: (s) => {
    const w = s.width as number;
    const h = s.height as number;
    const d = `M ${w * 0.25} 0 L ${w * 0.75} 0 L ${w} ${h / 2} L ${w * 0.75} ${h} L ${w * 0.25} ${h} L 0 ${h / 2} Z`;
    return new Path({ style: { d, fill: s.fill, stroke: s.stroke, lineWidth: s.strokeWidth } });
  },
};

export const parallelogramShape: ShapeDefinition = {
  name: 'parallelogram',
  create: (s) => {
    const w = s.width as number;
    const h = s.height as number;
    const d = `M ${w * 0.15} 0 L ${w} 0 L ${w * 0.85} ${h} L 0 ${h} Z`;
    return new Path({ style: { d, fill: s.fill, stroke: s.stroke, lineWidth: s.strokeWidth } });
  },
};

export const cylinderShape: ShapeDefinition = {
  name: 'cylinder',
  create: (s) => {
    const w = s.width as number;
    const h = s.height as number;
    const ry = h * 0.1; // 椭圆半高
    const d = `M 0 ${ry} A ${w / 2} ${ry} 0 0 0 ${w} ${ry} L ${w} ${h - ry} A ${w / 2} ${ry} 0 0 1 0 ${h - ry} L 0 ${ry} Z M 0 ${ry} A ${w / 2} ${ry} 0 0 1 ${w} ${ry}`;
    return new Path({ style: { d, fill: s.fill, stroke: s.stroke, lineWidth: s.strokeWidth } });
  },
};


export const starShape: ShapeDefinition = {
  name: 'star',
  create: (s) => {
    const w = s.width as number;
    const h = s.height as number;
    const cx = w / 2, cy = h / 2;
    const outer = Math.min(w, h) / 2;
    const inner = outer * 0.4;
    let d = '';
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      d += (i === 0 ? 'M' : 'L') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1) + ' ';
    }
    return new Path({ style: { d: d + 'Z', fill: s.fill, stroke: s.stroke, lineWidth: s.strokeWidth } });
  },
};

export const textShape: ShapeDefinition = {
  name: 'text',
  create: (s) => new Text({ style: { text: (s.label as string) ?? '', x: (s.width as number) / 2, y: (s.height as number) / 2, fontSize: 14, fill: s.fill ?? '#333', textAlign: 'center', textBaseline: 'middle' } }),
};

export const crossShape: ShapeDefinition = {
  name: 'cross',
  create: (s) => {
    const w = s.width as number;
    const h = s.height as number;
    const t = Math.min(w, h) / 3; // 臂宽
    const cx = w / 2, cy = h / 2;
    const x1 = cx - t / 2, x2 = cx + t / 2;
    const y1 = cy - t / 2, y2 = cy + t / 2;
    const d = `M ${x1} 0 H ${x2} V ${y1} H ${w} V ${y2} H ${x2} V ${h} H ${x1} V ${y2} H 0 V ${y1} H ${x1} Z`;
    return new Path({ style: { d, fill: s.fill, stroke: s.stroke, lineWidth: s.strokeWidth } });
  },
};

export const arrowShape: ShapeDefinition = {
  name: 'arrow',
  create: (s) => {
    const w = s.width as number;
    const h = s.height as number;
    const headW = w * 0.4; // 箭头宽
    const stemH = h * 0.4; // 杆高
    const cy = h / 2;
    const sy1 = cy - stemH / 2, sy2 = cy + stemH / 2;
    const d = `M 0 ${sy1} L ${w - headW} ${sy1} L ${w - headW} 0 L ${w} ${cy} L ${w - headW} ${h} L ${w - headW} ${sy2} L 0 ${sy2} Z`;
    return new Path({ style: { d, fill: s.fill, stroke: s.stroke, lineWidth: s.strokeWidth } });
  },
};

export const builtInShapes: ShapeDefinition[] = [rectShape, circleShape, ellipseShape, diamondShape, triangleShape, hexagonShape, parallelogramShape, cylinderShape, starShape, textShape, crossShape, arrowShape];

import { ShapeRegistry } from './registry';

export const createDefaultShapeRegistry = (): ShapeRegistry => {
  const r = new ShapeRegistry();
  for (const def of builtInShapes) r.register(def);
  return r;
};
