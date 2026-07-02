/**
 * Anchor 唯一类型源 —— 解决旧版 5 文件碎片化重复定义问题（P0-1）。
 * Node 锚点：基于节点 bbox 定位（中心 / 边 / 角 / 比例 / 沿方向到边缘）。
 * Edge 锚点：基于路径点序列按长度比例定位（用于标签/箭头）。
 */
import type { Point, BBox } from '../utils/types';

/** 节点锚点参数 */
export interface NodeAnchorArgs {
  /** 相对中心的比例偏移 dx∈[-0.5,0.5]（用于 ratio 锚点） */
  dx?: number;
  dy?: number;
  /** 绝对坐标（用于 coordinate 锚点） */
  x?: number;
  y?: number;
  /** 参考方向点：perimeter 模式下沿「center→direction」射到 bbox 边缘 */
  direction?: Point;
  /** 额外边距（perimeter 模式向外膨胀 bbox） */
  padding?: number;
}

/** 节点锚点函数：给定节点 bbox + 参数 → 返回锚点坐标 */
export type NodeAnchorFn = (bbox: BBox, args: NodeAnchorArgs) => Point;

/** 线性锚点参数（沿 edge 路径） */
export interface EdgeAnchorArgs {
  /** 沿路径长度比例 t∈[0,1] */
  t?: number;
  /** 绝对长度（从起点） */
  length?: number;
  /** 指定第 segmentIndex 段，段内 t */
  segmentIndex?: number;
  segmentT?: number;
}

/** 线性锚点函数：给定路径点序列 + 参数 → 返回锚点坐标 */
export type EdgeAnchorFn = (points: Point[], args: EdgeAnchorArgs) => Point;

/** 锚点计算结果（含可选方向角，供端点箭头旋转用） */
export interface AnchorResult extends Point {
  angle?: number;
}
