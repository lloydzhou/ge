import { Line, Polyline, type DisplayObject, type LineStyleProps, type PolylineStyleProps } from '@antv/g-lite';
import type { Vec2 } from '../../types';
import type { BaseEdgeStyleProps } from '../../types';

export interface EdgeConnector {
  /**
   * 创建边的显示对象
   * @param points 路径点
   * @param style 样式配置
   * @returns 显示对象 (Line, Path, Polyline, etc.)
   */
  connect(points: Vec2[], style: BaseEdgeStyleProps): DisplayObject;
}

/**
 * 普通连接器（直线）
 */
export class NormalConnector implements EdgeConnector {
  connect(points: Vec2[], style: BaseEdgeStyleProps): DisplayObject {
    const baseStyle: BaseEdgeStyleProps = style || {};

    if (points.length < 2) {
      return new Line({
        style: {
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0,
          ...baseStyle
        } as LineStyleProps
      });
    }

    const [start, end] = [points[0], points[points.length - 1]];
    return new Line({
      style: {
        x1: start[0],
        y1: start[1],
        x2: end[0],
        y2: end[1],
        ...baseStyle
      } as LineStyleProps
    });
  }
}

/**
 * 折线连接器
 */
export class PolylineConnector implements EdgeConnector {
  connect(points: Vec2[], style: BaseEdgeStyleProps): DisplayObject {
    const baseStyle: BaseEdgeStyleProps = style || {};
    return new Polyline({
      style: {
        points,
        ...baseStyle
      } as PolylineStyleProps
    });
  }
}

/**
 * 平滑连接器（贝塞尔曲线）
 */
export class SmoothConnector implements EdgeConnector {
  connect(points: Vec2[], style: BaseEdgeStyleProps): DisplayObject {
    // 对于只有两个点的情况，使用直线
    if (points.length < 3) {
      const normal = new NormalConnector();
      return normal.connect(points, style);
    }

    // 使用 Polyline 作为简化实现
    // 在实际应用中，这里可以实现更复杂的贝塞尔曲线算法
    return new Polyline({
      style: {
        points,
        ...style
      } as PolylineStyleProps
    });
  }
}

/**
 * 圆角连接器
 */
export class RoundedConnector implements EdgeConnector {
  // @ts-expect-error - radius stored for future use when rounded corners are implemented
  private readonly radius: number;

  constructor(radius: number = 10) {
    this.radius = radius;
  }

  connect(points: Vec2[], style: BaseEdgeStyleProps): DisplayObject {
    // 对于只有两个点的情况，使用直线
    if (points.length < 3) {
      const normal = new NormalConnector();
      return normal.connect(points, style);
    }

    // 在实际应用中，这里可以实现带圆角的路径算法
    // 目前我们只是简单地使用 Polyline，但会记录 radius 值以备将来使用
    return new Polyline({
      style: {
        points,
        ...style
      } as PolylineStyleProps
    });
  }
}
