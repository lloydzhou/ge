/**
 * 节点锚点：预定义纯函数集合。
 * 每个函数 (bbox, args) => Point，无状态、可单测。
 */
import type { BBox, Point } from '../utils/types';
import { bboxCenter, getBBoxEdgePoint, expandBBox } from '../utils/geometry';
import type { NodeAnchorFn } from './types';

export const anchorCenter: NodeAnchorFn = (bbox) => bboxCenter(bbox);

export const anchorTop: NodeAnchorFn = (bbox) => ({
  x: bbox.x + bbox.width / 2,
  y: bbox.y,
});

export const anchorBottom: NodeAnchorFn = (bbox) => ({
  x: bbox.x + bbox.width / 2,
  y: bbox.y + bbox.height,
});

export const anchorLeft: NodeAnchorFn = (bbox) => ({
  x: bbox.x,
  y: bbox.y + bbox.height / 2,
});

export const anchorRight: NodeAnchorFn = (bbox) => ({
  x: bbox.x + bbox.width,
  y: bbox.y + bbox.height / 2,
});

export const anchorTopLeft: NodeAnchorFn = (bbox) => ({ x: bbox.x, y: bbox.y });
export const anchorTopRight: NodeAnchorFn = (bbox) => ({ x: bbox.x + bbox.width, y: bbox.y });
export const anchorBottomLeft: NodeAnchorFn = (bbox) => ({ x: bbox.x, y: bbox.y + bbox.height });
export const anchorBottomRight: NodeAnchorFn = (bbox) => ({ x: bbox.x + bbox.width, y: bbox.y + bbox.height });

/** 相对中心的比例偏移：dx,dy∈[-0.5,0.5] */
export const anchorRatio: NodeAnchorFn = (bbox, args) => {
  const c = bboxCenter(bbox);
  return {
    x: c.x + (args.dx ?? 0) * bbox.width,
    y: c.y + (args.dy ?? 0) * bbox.height,
  };
};

/** 绝对坐标锚点（端口等已知坐标场景） */
export const anchorCoordinate: NodeAnchorFn = (_bbox, args) => ({
  x: args.x ?? 0,
  y: args.y ?? 0,
});

/**
 * perimeter：沿「center→direction」射线射到 bbox 边缘。
 * 没有方向点时退化为中心。
 */
export const anchorPerimeter: NodeAnchorFn = (bbox, args) => {
  const center = bboxCenter(bbox);
  const dir = args.direction;
  if (!dir) return center;
  // 圆/椭圆：沿方向到真实圆弧（而非 bbox 方框），避免边连到圆外
  if (args.shape === 'circle' || args.shape === 'ellipse') {
    const rx = bbox.width / 2;
    const ry = bbox.height / 2;
    const dx = dir.x - center.x;
    const dy = dir.y - center.y;
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return center;
    const sx = dx / rx;
    const sy = dy / ry;
    const sl = Math.hypot(sx, sy) || 1;
    return { x: center.x + (sx / sl) * rx, y: center.y + (sy / sl) * ry };
  }
  const box = args.padding ? expandBBox(bbox, args.padding) : bbox;
  return getBBoxEdgePoint(center, dir, box);
};

export const builtInNodeAnchors: Record<string, NodeAnchorFn> = {
  center: anchorCenter,
  top: anchorTop,
  bottom: anchorBottom,
  left: anchorLeft,
  right: anchorRight,
  topLeft: anchorTopLeft,
  topRight: anchorTopRight,
  bottomLeft: anchorBottomLeft,
  bottomRight: anchorBottomRight,
  ratio: anchorRatio,
  coordinate: anchorCoordinate,
  perimeter: anchorPerimeter,
};
