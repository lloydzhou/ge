import { describe, it, expect } from 'vitest';
import { computeEdgePoints } from '../src/core/compute';
import { anchorPerimeter, anchorCenter } from '../src/anchor/node-anchor';
import { normalRouter, manhattanRouter } from '../src/edge/router';
import type { BBox } from '../src/utils/types';

const src: BBox = { x: 0, y: 0, width: 10, height: 10 }; // center (5,5)
const tgt: BBox = { x: 100, y: 0, width: 10, height: 10 }; // center (105,5)

describe('computeEdgePoints', () => {
  it('perimeter + normal：源右边缘 → 目标左边缘', () => {
    const pts = computeEdgePoints(
      { bbox: src, anchorFn: anchorPerimeter },
      { bbox: tgt, anchorFn: anchorPerimeter },
      normalRouter,
    );
    // 源中心(5,5) 朝向目标中心(105,5) → 源右边 (10,5)
    // 目标中心(105,5) 朝向源中心(5,5) → 目标左边 (100,5)
    expect(pts).toEqual([{ x: 10, y: 5 }, { x: 100, y: 5 }]);
  });

  it('center anchor：使用中心点', () => {
    const pts = computeEdgePoints(
      { bbox: src, anchorFn: anchorCenter },
      { bbox: tgt, anchorFn: anchorCenter },
      normalRouter,
    );
    expect(pts).toEqual([{ x: 5, y: 5 }, { x: 105, y: 5 }]);
  });

  it('manhattan router 产生 Z 形中点转折', () => {
    const pts = computeEdgePoints(
      { bbox: src, anchorFn: anchorPerimeter },
      { bbox: tgt, anchorFn: anchorPerimeter },
      manhattanRouter,
    );
    // (10,5) -> (100,5)：dy=0 已对齐，manhattan 直接连接（中点转折但共线会被 dedup）
    // dx=90 dy=0，manhattanRouter 检测 |dy|<EPS 直接 push b
    expect(pts[0]).toEqual({ x: 10, y: 5 });
    expect(pts[pts.length - 1]).toEqual({ x: 100, y: 5 });
  });

  it('waypoints 被插入到中间', () => {
    const pts = computeEdgePoints(
      { bbox: src, anchorFn: anchorPerimeter },
      { bbox: tgt, anchorFn: anchorPerimeter },
      normalRouter,
      [{ x: 55, y: 50 }],
    );
    expect(pts).toEqual([{ x: 10, y: 5 }, { x: 55, y: 50 }, { x: 100, y: 5 }]);
  });
});
