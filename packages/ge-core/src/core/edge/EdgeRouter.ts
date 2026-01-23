import type { Vec2 } from '../../utils/edgeLayout';

export interface EdgeRouter {
  /**
   * 计算边的路径点
   * @param points 起点和终点坐标 [[x1, y1], [x2, y2]]
   * @param vertices 中间点
   * @returns 路径点数组
   */
  route(points: Vec2[], vertices?: Vec2[]): Vec2[];

  /**
   * 获取源节点的首选方向（可选）
   * 用于 Edge 计算锚点位置时确定应该从哪个方向出去
   * @param from 源节点位置
   * @param to 目标节点位置
   * @returns 方向向量 [dx, dy]，不需要归一化
   */
  getStartDirection?(from: Vec2, to: Vec2): Vec2;

  /**
   * 获取目标节点的首选方向（可选）
   * 用于 Edge 计算锚点位置时确定应该从哪个方向进入
   * @param from 源节点位置
   * @param to 目标节点位置
   * @returns 方向向量 [dx, dy]，不需要归一化
   */
  getEndDirection?(from: Vec2, to: Vec2): Vec2;
}

/**
 * OrthogonalRouter 配置选项
 */
export interface OrthogonalRouterOptions {
  /**
   * 第一段的方向策略
   * - 'horizontal': 总是先水平移动
   * - 'vertical': 总是先垂直移动
   * - 'auto': 根据距离自动选择（距离大的方向优先）
   */
  firstSegment?: 'horizontal' | 'vertical' | 'auto';
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
 * 支持配置第一段的方向策略
 */
export class OrthogonalRouter implements EdgeRouter {
  private readonly options: OrthogonalRouterOptions;

  constructor(options: OrthogonalRouterOptions = {}) {
    this.options = {
      firstSegment: 'horizontal',  // 默认先水平移动
      ...options
    };
  }

  route(points: Vec2[], vertices?: Vec2[]): Vec2[] {
    if (vertices && vertices.length > 0) {
      // 如果有中间点，连接所有点
      return [points[0], ...vertices, points[1]];
    }

    const [start, end] = [points[0], points[points.length - 1]];
    const strategy = this.options.firstSegment || 'horizontal';

    if (strategy === 'auto') {
      // 根据距离自动选择
      const dx = Math.abs(end[0] - start[0]);
      const dy = Math.abs(end[1] - start[1]);
      if (dx >= dy) {
        // 水平距离更大或相等，先水平移动
        const midX = (start[0] + end[0]) / 2;
        return [
          start,
          [midX, start[1]],
          [midX, end[1]],
          end
        ];
      } else {
        // 垂直距离更大，先垂直移动
        const midY = (start[1] + end[1]) / 2;
        return [
          start,
          [start[0], midY],
          [end[0], midY],
          end
        ];
      }
    } else if (strategy === 'horizontal') {
      // 总是先水平移动
      const midX = (start[0] + end[0]) / 2;
      return [
        start,
        [midX, start[1]],
        [midX, end[1]],
        end
      ];
    } else {
      // vertical: 总是先垂直移动
      const midY = (start[1] + end[1]) / 2;
      return [
        start,
        [start[0], midY],
        [end[0], midY],
        end
      ];
    }
  }

  getStartDirection(from: Vec2, to: Vec2): Vec2 {
    const strategy = this.options.firstSegment || 'horizontal';

    if (strategy === 'auto') {
      // 根据距离自动选择方向
      const dx = Math.abs(to[0] - from[0]);
      const dy = Math.abs(to[1] - from[1]);
      if (dx >= dy) {
        return [to[0] - from[0] > 0 ? 1 : -1, 0];  // 水平
      } else {
        return [0, to[1] - from[1] > 0 ? 1 : -1];  // 垂直
      }
    } else if (strategy === 'horizontal') {
      // 固定返回水平方向
      return [to[0] - from[0] > 0 ? 1 : -1, 0];
    } else {
      // vertical: 固定返回垂直方向
      return [0, to[1] - from[1] > 0 ? 1 : -1];
    }
  }

  getEndDirection(from: Vec2, to: Vec2): Vec2 {
    const strategy = this.options.firstSegment || 'horizontal';

    if (strategy === 'auto') {
      // 根据距离自动选择方向（与 getStartDirection 逻辑一致）
      const dx = Math.abs(to[0] - from[0]);
      const dy = Math.abs(to[1] - from[1]);
      if (dx >= dy) {
        return [from[0] - to[0] > 0 ? 1 : -1, 0];  // 水平（相反）
      } else {
        return [0, from[1] - to[1] > 0 ? 1 : -1];  // 垂直（相反）
      }
    } else if (strategy === 'horizontal') {
      // 固定返回水平方向（相反）
      return [from[0] - to[0] > 0 ? 1 : -1, 0];
    } else {
      // vertical: 固定返回垂直方向（相反）
      return [0, from[1] - to[1] > 0 ? 1 : -1];
    }
  }
}

/**
 * 曼哈顿路由器配置选项
 */
export interface ManhattanRouterOptions {
  /**
   * 网格步长（默认 10）
   */
  step?: number;

  /**
   * 第一段的方向策略
   * - 'horizontal': 总是先水平移动
   * - 'vertical': 总是先垂直移动
   * - 'auto': 根据距离自动选择（距离大的方向优先）
   */
  firstSegment?: 'horizontal' | 'vertical' | 'auto';
}

/**
 * 曼哈顿路由器
 * 对齐到网格的正交路由
 */
export class ManhattanRouter implements EdgeRouter {
  private readonly options: ManhattanRouterOptions;

  constructor(options: ManhattanRouterOptions = {}) {
    this.options = {
      step: 10,
      firstSegment: 'horizontal',  // 默认先水平移动
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
    const strategy = this.options.firstSegment || 'horizontal';

    if (strategy === 'auto') {
      // 根据距离自动选择
      const dx = Math.abs(end[0] - start[0]);
      const dy = Math.abs(end[1] - start[1]);
      if (dx >= dy) {
        // 水平距离更大或相等，先水平移动
        const midX = Math.round((start[0] + end[0]) / 2 / step) * step;
        return [
          start,
          [midX, start[1]],
          [midX, end[1]],
          end
        ];
      } else {
        // 垂直距离更大，先垂直移动
        const midY = Math.round((start[1] + end[1]) / 2 / step) * step;
        return [
          start,
          [start[0], midY],
          [end[0], midY],
          end
        ];
      }
    } else if (strategy === 'horizontal') {
      // 总是先水平移动（对齐到网格）
      const midX = Math.round((start[0] + end[0]) / 2 / step) * step;
      return [
        start,
        [midX, start[1]],
        [midX, end[1]],
        end
      ];
    } else {
      // vertical: 总是先垂直移动（对齐到网格）
      const midY = Math.round((start[1] + end[1]) / 2 / step) * step;
      return [
        start,
        [start[0], midY],
        [end[0], midY],
        end
      ];
    }
  }

  getStartDirection(from: Vec2, to: Vec2): Vec2 {
    const strategy = this.options.firstSegment || 'horizontal';

    if (strategy === 'auto') {
      // 根据距离自动选择方向
      const dx = Math.abs(to[0] - from[0]);
      const dy = Math.abs(to[1] - from[1]);
      if (dx >= dy) {
        return [to[0] - from[0] > 0 ? 1 : -1, 0];  // 水平
      } else {
        return [0, to[1] - from[1] > 0 ? 1 : -1];  // 垂直
      }
    } else if (strategy === 'horizontal') {
      // 固定返回水平方向
      return [to[0] - from[0] > 0 ? 1 : -1, 0];
    } else {
      // vertical: 固定返回垂直方向
      return [0, to[1] - from[1] > 0 ? 1 : -1];
    }
  }

  getEndDirection(from: Vec2, to: Vec2): Vec2 {
    const strategy = this.options.firstSegment || 'horizontal';

    if (strategy === 'auto') {
      // 根据距离自动选择方向（与 getStartDirection 逻辑一致）
      const dx = Math.abs(to[0] - from[0]);
      const dy = Math.abs(to[1] - from[1]);
      if (dx >= dy) {
        return [from[0] - to[0] > 0 ? 1 : -1, 0];  // 水平（相反）
      } else {
        return [0, from[1] - to[1] > 0 ? 1 : -1];  // 垂直（相反）
      }
    } else if (strategy === 'horizontal') {
      // 固定返回水平方向（相反）
      return [from[0] - to[0] > 0 ? 1 : -1, 0];
    } else {
      // vertical: 固定返回垂直方向（相反）
      return [0, from[1] - to[1] > 0 ? 1 : -1];
    }
  }
}