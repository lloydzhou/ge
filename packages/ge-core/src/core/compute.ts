/**
 * 纯函数：计算 Edge 的路由点序列。
 * 把「锚点解析 + 路由」组合成无 DOM 依赖的逻辑，便于单测。
 */
import type { BBox, Point } from '../utils/types';
import { bboxCenter } from '../utils/geometry';
import type { NodeAnchorFn, NodeAnchorArgs } from '../anchor/types';
import type { RouterFn } from '../edge/router';

export interface EdgeEndpoint {
  /** 端点节点的世界坐标包围盒 */
  bbox: BBox;
  /** 已解析的节点锚点函数 */
  anchorFn: NodeAnchorFn;
  /** 锚点参数 */
  anchorArgs?: NodeAnchorArgs;
}

/**
 * 计算边路径点：source 锚点 → waypoints → target 锚点，再交给 router 路由。
 * source 锚点以 target 中心为方向（perimeter 模式下沿该方向射到边缘）。
 */
export const computeEdgePoints = (
  source: EdgeEndpoint,
  target: EdgeEndpoint,
  routerFn: RouterFn,
  waypoints: Point[] = [],
): Point[] => {
  const sCenter = bboxCenter(source.bbox);
  const tCenter = bboxCenter(target.bbox);
  const sPoint = source.anchorFn(source.bbox, { direction: tCenter, ...source.anchorArgs });
  const tPoint = target.anchorFn(target.bbox, { direction: sCenter, ...target.anchorArgs });
  return routerFn([sPoint, ...waypoints, tPoint]);
};
