import type { Vec2 } from '../../utils/edgeLayout';

export interface EdgeRouter {
  /**
   * 计算边的路径点
   * @param points 起点和终点坐标 [[x1, y1], [x2, y2]]
   * @param vertices 中间点
   * @returns 路径点数组
   */
  route(points: Vec2[], vertices?: Vec2[]): Vec2[];
}

/**
 * 直线路由器
 */
export class NormalRouter implements EdgeRouter {
  route(points: Vec2[], vertices?: Vec2[]): Vec2[] {
    if (vertices && vertices.length > 0) {
      return [points[0], ...vertices, points[1]];
    }
    return points;
  }
}

/**
 * 正交路由器
 */
export class OrthogonalRouter implements EdgeRouter {
  route(points: Vec2[], vertices?: Vec2[]): Vec2[] {
    if (vertices && vertices.length > 0) {
      // 如果有中间点，连接所有点
      return [points[0], ...vertices, points[1]];
    }
    
    const [start, end] = [points[0], points[points.length - 1]];
    const midX = (start[0] + end[0]) / 2;
    
    return [
      start,
      [midX, start[1]],
      [midX, end[1]],
      end
    ];
  }
}

/**
 * 曼哈顿路由器
 */
export class ManhattanRouter implements EdgeRouter {
  private readonly options: {
    step?: number;
  };

  constructor(options: { step?: number } = {}) {
    this.options = {
      step: 10,
      ...options
    };
  }

  route(points: Vec2[], vertices?: Vec2[]): Vec2[] {
    if (vertices && vertices.length > 0) {
      // 如果有中间点，连接所有点
      return [points[0], ...vertices, points[1]];
    }
    
    const [start, end] = [points[0], points[points.length - 1]];
    const step = this.options.step || 10;
    
    // 简化版曼哈顿路由
    const midX = Math.round((start[0] + end[0]) / 2 / step) * step;
    
    return [
      start,
      [midX, start[1]],
      [midX, end[1]],
      end
    ];
  }
}