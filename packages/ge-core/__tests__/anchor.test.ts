import { describe, it, expect } from 'vitest';
import {
  anchorCenter, anchorTop, anchorBottom, anchorLeft, anchorRight,
  anchorTopLeft, anchorTopRight, anchorBottomLeft, anchorBottomRight,
  anchorRatio, anchorCoordinate, anchorPerimeter,
} from '../src/anchor/node-anchor';
import { pathLength, edgeAnchorRatio, edgeAnchorLength, edgeAnchorMid, edgeAnchorSegment } from '../src/anchor/edge-anchor';
import { AnchorRegistry, createDefaultAnchorRegistry } from '../src/anchor/registry';
import type { BBox, Point } from '../src/utils/types';

const box: BBox = { x: 0, y: 0, width: 10, height: 6 };

describe('node-anchor', () => {
  it('center / 四边中点', () => {
    expect(anchorCenter(box)).toEqual({ x: 5, y: 3 });
    expect(anchorTop(box)).toEqual({ x: 5, y: 0 });
    expect(anchorBottom(box)).toEqual({ x: 5, y: 6 });
    expect(anchorLeft(box)).toEqual({ x: 0, y: 3 });
    expect(anchorRight(box)).toEqual({ x: 10, y: 3 });
  });

  it('四角', () => {
    expect(anchorTopLeft(box)).toEqual({ x: 0, y: 0 });
    expect(anchorTopRight(box)).toEqual({ x: 10, y: 0 });
    expect(anchorBottomLeft(box)).toEqual({ x: 0, y: 6 });
    expect(anchorBottomRight(box)).toEqual({ x: 10, y: 6 });
  });

  it('ratio: 相对中心比例偏移', () => {
    expect(anchorRatio(box, { dx: 0.3, dy: 0 })).toEqual({ x: 8, y: 3 });
    expect(anchorRatio(box, { dx: -0.5, dy: -0.5 })).toEqual({ x: 0, y: 0 });
  });

  it('coordinate: 绝对坐标', () => {
    expect(anchorCoordinate(box, { x: 100, y: 200 })).toEqual({ x: 100, y: 200 });
  });

  it('perimeter: 沿方向到边缘', () => {
    // 中心(5,3) 向右(100,3) → 右边 (10,3)
    expect(anchorPerimeter(box, { direction: { x: 100, y: 3 } })).toEqual({ x: 10, y: 3 });
    // 斜向 (20,12) → 右边 (10,6)
    expect(anchorPerimeter(box, { direction: { x: 20, y: 12 } })).toEqual({ x: 10, y: 6 });
    // 无方向退化为中心
    expect(anchorPerimeter(box, {})).toEqual({ x: 5, y: 3 });
  });

  it('perimeter: padding 向外膨胀', () => {
    // center(5,3) 向右，padding=2 → 膨胀后 box 右边 x=12
    expect(anchorPerimeter(box, { direction: { x: 100, y: 3 }, padding: 2 })).toEqual({ x: 12, y: 3 });
  });
});

describe('edge-anchor', () => {
  // L 形折线：(0,0) -> (10,0) -> (10,10)，总长 20
  const pts: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it('pathLength', () => {
    expect(pathLength(pts)).toBe(20);
    expect(pathLength([{ x: 1, y: 1 }])).toBe(0);
  });

  it('ratio t=0.25/0.5/0.75', () => {
    expect(edgeAnchorRatio(pts, { t: 0.25 })).toEqual({ x: 5, y: 0 });
    expect(edgeAnchorRatio(pts, { t: 0.5 })).toEqual({ x: 10, y: 0 });
    expect(edgeAnchorRatio(pts, { t: 0.75 })).toEqual({ x: 10, y: 5 });
  });

  it('ratio clamp 到 [0,1]', () => {
    expect(edgeAnchorRatio(pts, { t: -1 })).toEqual({ x: 0, y: 0 });
    expect(edgeAnchorRatio(pts, { t: 2 })).toEqual({ x: 10, y: 10 });
  });

  it('length: 绝对长度', () => {
    expect(edgeAnchorLength(pts, { length: 5 })).toEqual({ x: 5, y: 0 });
    expect(edgeAnchorLength(pts, { length: 15 })).toEqual({ x: 10, y: 5 });
  });

  it('mid: 中点', () => {
    expect(edgeAnchorMid(pts)).toEqual({ x: 10, y: 0 });
  });

  it('segment: 指定段', () => {
    // 第 1 段 (10,0)->(10,10)，t=0.5 → (10,5)
    expect(edgeAnchorSegment(pts, { segmentIndex: 1, segmentT: 0.5 })).toEqual({ x: 10, y: 5 });
  });
});

describe('AnchorRegistry', () => {
  it('默认注册表包含全部内置锚点', () => {
    const r = createDefaultAnchorRegistry();
    expect(r.hasNode('center')).toBe(true);
    expect(r.hasNode('perimeter')).toBe(true);
    expect(r.hasNode('ratio')).toBe(true);
    expect(r.hasEdge('ratio')).toBe(true);
    expect(r.hasEdge('mid')).toBe(true);
    expect(r.listNode().length).toBeGreaterThanOrEqual(11);
  });

  it('resolveNode 未知名称回退到 center', () => {
    const r = createDefaultAnchorRegistry();
    const fn = r.resolveNode('not-exist');
    expect(fn(box, {})).toEqual({ x: 5, y: 3 });
  });

  it('resolveEdge 未知名称回退到 ratio', () => {
    const r = createDefaultAnchorRegistry();
    const fn = r.resolveEdge('not-exist');
    expect(fn([{ x: 0, y: 0 }, { x: 10, y: 0 }], { t: 0.5 })).toEqual({ x: 5, y: 0 });
  });

  it('自定义注册', () => {
    const r = createDefaultAnchorRegistry();
    r.registerNode('custom', (_b, args) => ({ x: args.x ?? 0, y: args.y ?? 0 }));
    expect(r.resolveNode('custom')(box, { x: 9, y: 9 })).toEqual({ x: 9, y: 9 });
  });
});
