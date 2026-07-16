import { describe, it, expect } from 'vitest';
import {
  vec, clone, add, sub, scale, negate, dot, cross, length, distance,
  normalize, angle, lerp, equals, rad2deg, deg2rad,
} from '../src/index';
import {
  EPS,
  isPointInBBox, bboxCenter, bboxCorners, bboxFromPoints, mergeBBox, expandBBox,
  closestPointOnSegment, distanceToSegment, segmentIntersect, getBBoxEdgePoint, getBBoxEdgePointByAngle,
  pointProjectionT,
} from '../src/utils/geometry';
import type { BBox, Point } from '../src/utils/types';

const around = (p: Point): [number, number] => [+p.x.toFixed(6), +p.y.toFixed(6)];

describe('math', () => {
  it('vec / clone / negate 返回新对象且不修改输入', () => {
    expect(vec(2, -3)).toEqual({ x: 2, y: -3 });
    const input = { x: 2, y: -3 };
    const copy = clone(input);
    const opposite = negate(input);
    expect(copy).toEqual(input);
    expect(copy).not.toBe(input);
    expect(opposite).toEqual({ x: -2, y: 3 });
    expect(opposite).not.toBe(input);
    expect(input).toEqual({ x: 2, y: -3 });
  });

  it('add / sub / scale', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
    expect(sub({ x: 5, y: 5 }, { x: 1, y: 2 })).toEqual({ x: 4, y: 3 });
    expect(scale({ x: 2, y: -3 }, 2)).toEqual({ x: 4, y: -6 });
  });

  it('dot / cross', () => {
    expect(dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
    expect(dot({ x: 2, y: 3 }, { x: 4, y: 5 })).toBe(23);
    expect(cross({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(1);
    expect(cross({ x: 2, y: 0 }, { x: 0, y: 3 })).toBe(6);
  });

  it('length / distance', () => {
    expect(length({ x: 3, y: 4 })).toBe(5);
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('normalize (含零向量)', () => {
    expect(normalize({ x: 0, y: 5 })).toEqual({ x: 0, y: 1 });
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('angle / lerp / equals', () => {
    expect(angle({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
    expect(angle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2);
    expect(lerp({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)).toEqual({ x: 5, y: 10 });
    expect(equals({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(true);
  });

  it('rad2deg / deg2rad 互逆', () => {
    expect(rad2deg(Math.PI)).toBe(180);
    expect(deg2rad(180)).toBeCloseTo(Math.PI);
  });
});

describe('geometry', () => {
  const box: BBox = { x: 0, y: 0, width: 10, height: 6 };

  it('isPointInBBox (含边界)', () => {
    expect(isPointInBBox({ x: 5, y: 3 }, box)).toBe(true);
    expect(isPointInBBox({ x: 0, y: 0 }, box)).toBe(true);
    expect(isPointInBBox({ x: 10, y: 6 }, box)).toBe(true);
    expect(isPointInBBox({ x: 11, y: 3 }, box)).toBe(false);
  });

  it('bboxCenter / bboxCorners', () => {
    expect(bboxCenter(box)).toEqual({ x: 5, y: 3 });
    const c = bboxCorners(box);
    expect(c.topLeft).toEqual({ x: 0, y: 0 });
    expect(c.topRight).toEqual({ x: 10, y: 0 });
    expect(c.bottomLeft).toEqual({ x: 0, y: 6 });
    expect(c.bottomRight).toEqual({ x: 10, y: 6 });
  });

  it('bboxFromPoints 处理空数组、单点和重复点', () => {
    expect(bboxFromPoints([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(bboxFromPoints([{ x: 3, y: -2 }])).toEqual({ x: 3, y: -2, width: 0, height: 0 });
    expect(bboxFromPoints([{ x: 3, y: -2 }, { x: 3, y: -2 }])).toEqual({
      x: 3, y: -2, width: 0, height: 0,
    });
    expect(bboxFromPoints([{ x: 1, y: 2 }, { x: 4, y: 6 }, { x: 0, y: 0 }])).toEqual({
      x: 0, y: 0, width: 4, height: 6,
    });
  });

  it('mergeBBox / expandBBox', () => {
    expect(mergeBBox({ x: 0, y: 0, width: 2, height: 2 }, { x: 5, y: 5, width: 2, height: 2 })).toEqual({
      x: 0, y: 0, width: 7, height: 7,
    });
    expect(expandBBox({ x: 0, y: 0, width: 4, height: 4 }, 1)).toEqual({
      x: -1, y: -1, width: 6, height: 6,
    });
  });

  it('closestPointOnSegment / distanceToSegment', () => {
    const a = { x: 0, y: 0 }, b = { x: 10, y: 0 };
    expect(closestPointOnSegment({ x: 5, y: 5 }, a, b)).toEqual({ x: 5, y: 0 });
    // 端点外 clamp
    expect(closestPointOnSegment({ x: -3, y: 5 }, a, b)).toEqual({ x: 0, y: 0 });
    expect(distanceToSegment({ x: 5, y: 5 }, a, b)).toBe(5);
    const endpoint = { x: 2, y: 3 };
    const closest = closestPointOnSegment({ x: 8, y: 7 }, endpoint, endpoint);
    expect(closest).toEqual(endpoint);
    expect(closest).not.toBe(endpoint);
    expect(distanceToSegment({ x: 5, y: 7 }, endpoint, endpoint)).toBe(5);
  });

  it('segmentIntersect', () => {
    const r = segmentIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 });
    expect(r).toEqual({ x: 5, y: 5 });
    // 平行不相交
    expect(segmentIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBeNull();
    // 不在线段范围
    expect(segmentIntersect({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 5, y: 0 }, { x: 5, y: 5 })).toBeNull();
    // 端点接触属于相交
    expect(segmentIntersect(
      { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 },
    )).toEqual({ x: 5, y: 0 });
    // 共线重叠和零长度线段不返回唯一交点
    expect(segmentIntersect(
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }, { x: 15, y: 0 },
    )).toBeNull();
    expect(segmentIntersect(
      { x: 1, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 2, y: 1 },
    )).toBeNull();
  });

  it('getBBoxEdgePoint: 从中心向右并处理零方向', () => {
    const center = { x: 5, y: 3 };
    const edge = getBBoxEdgePoint(center, { x: 100, y: 3 }, box);
    expect(edge).toEqual({ x: 10, y: 3 });
    expect(getBBoxEdgePoint(center, center, box)).toBe(center);
  });

  it('getBBoxEdgePoint: 斜向 (中心到右下角方向)', () => {
    // 中心 (5,3) 指向 (20,12)：dx=15,dy=9，与右边 x=10 相交 t=5/15=1/3, y=3+3=6
    const edge = getBBoxEdgePoint({ x: 5, y: 3 }, { x: 20, y: 12 }, box);
    expect(around(edge)).toEqual([10, 6]);
  });

  it('getBBoxEdgePointByAngle', () => {
    // 向右 0 弧度
    expect(getBBoxEdgePointByAngle({ x: 5, y: 3 }, 0, box)).toEqual({ x: 10, y: 3 });
    // 向下 PI/2
    expect(getBBoxEdgePointByAngle({ x: 5, y: 3 }, Math.PI / 2, box)).toEqual({ x: 5, y: 6 });
  });

  it('pointProjectionT', () => {
    expect(pointProjectionT({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0.5);
    expect(pointProjectionT({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
  });

  it('EPS 为正小量', () => {
    expect(EPS).toBeGreaterThan(0);
    expect(EPS).toBeLessThan(1e-3);
  });
});
