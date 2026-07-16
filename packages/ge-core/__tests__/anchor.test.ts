import { describe, it, expect } from 'vitest';
import {
  anchorCenter, anchorTop, anchorBottom, anchorLeft, anchorRight,
  anchorTopLeft, anchorTopRight, anchorBottomLeft, anchorBottomRight,
  anchorRatio, anchorCoordinate, anchorPerimeter, builtInNodeAnchors,
  pathLength, edgeAnchorRatio, edgeAnchorLength, edgeAnchorMid, edgeAnchorSegment,
  builtInEdgeAnchors, AnchorRegistry, createDefaultAnchorRegistry,
} from '../src/index';
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

  it('segment: 指定段并截断索引与段内比例', () => {
    // 第 1 段 (10,0)->(10,10)，t=0.5 → (10,5)
    expect(edgeAnchorSegment(pts, { segmentIndex: 1, segmentT: 0.5 })).toEqual({ x: 10, y: 5 });
    expect(edgeAnchorSegment(pts, { segmentIndex: -1, segmentT: -1 })).toEqual({ x: 0, y: 0 });
    expect(edgeAnchorSegment(pts, { segmentIndex: 99, segmentT: 2 })).toEqual({ x: 10, y: 10 });
  });

  it('空路径、单点和重复点均返回有限坐标', () => {
    const single = [{ x: 3, y: -2 }];
    const repeated = [{ x: 3, y: -2 }, { x: 3, y: -2 }];
    const anchors = [edgeAnchorRatio, edgeAnchorLength, edgeAnchorMid, edgeAnchorSegment];
    for (const anchor of anchors) {
      expect(anchor([], {})).toEqual({ x: 0, y: 0 });
      expect(anchor(single, {})).toEqual(single[0]);
      const point = anchor(repeated, {});
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
    expect(edgeAnchorRatio(pts, { t: NaN })).toEqual({ x: 0, y: 0 });
    expect(edgeAnchorLength(pts, { length: Infinity })).toEqual({ x: 0, y: 0 });
  });
});

describe('AnchorRegistry', () => {
  it('默认注册表与全部内置锚点映射同步', () => {
    const r = createDefaultAnchorRegistry();
    expect(r.listNode().sort()).toEqual(Object.keys(builtInNodeAnchors).sort());
    expect(r.listEdge().sort()).toEqual(Object.keys(builtInEdgeAnchors).sort());
    for (const [name, fn] of Object.entries(builtInNodeAnchors)) expect(r.getNode(name)).toBe(fn);
    for (const [name, fn] of Object.entries(builtInEdgeAnchors)) expect(r.getEdge(name)).toBe(fn);
    expect(r.getNode('not-exist')).toBeUndefined();
    expect(r.getEdge('not-exist')).toBeUndefined();
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

  it('节点和边锚点支持链式注册与同名覆盖', () => {
    const r = new AnchorRegistry();
    const nodeFirst = (_b: BBox) => ({ x: 1, y: 1 });
    const nodeSecond = (_b: BBox) => ({ x: 2, y: 2 });
    const edgeFirst = (_points: Point[]) => ({ x: 3, y: 3 });
    const edgeSecond = (_points: Point[]) => ({ x: 4, y: 4 });
    expect(r.registerNode('custom', nodeFirst)).toBe(r);
    expect(r.registerEdge('custom', edgeFirst)).toBe(r);
    expect(r.hasNode('custom')).toBe(true);
    expect(r.hasEdge('custom')).toBe(true);
    expect(r.getNode('custom')).toBe(nodeFirst);
    expect(r.getEdge('custom')).toBe(edgeFirst);
    r.registerNode('custom', nodeSecond).registerEdge('custom', edgeSecond);
    expect(r.getNode('custom')).toBe(nodeSecond);
    expect(r.getEdge('custom')).toBe(edgeSecond);
  });
});
