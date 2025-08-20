import { Line, Polyline } from '@antv/g-lite';
import type { Vec2 } from '../../utils/edgeLayout';

export interface EdgeConnector {
  /**
   * 创建边的显示对象
   * @param points 路径点
   * @param style 样式配置
   * @returns 显示对象
   */
  connect(points: Vec2[], style: any): any;
}

/**
 * 普通连接器（直线）
 */
export class NormalConnector implements EdgeConnector {
  connect(points: Vec2[], style: any): any {
    if (points.length < 2) {
      return new Line({
        style: {
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0,
          ...style
        }
      });
    }
    
    const [start, end] = [points[0], points[points.length - 1]];
    return new Line({
      style: {
        x1: start[0],
        y1: start[1],
        x2: end[0],
        y2: end[1],
        ...style
      }
    });
  }
}

/**
 * 折线连接器
 */
export class PolylineConnector implements EdgeConnector {
  connect(points: Vec2[], style: any): any {
    return new Polyline({
      style: {
        points,
        ...style
      }
    });
  }
}

/**
 * 平滑连接器（贝塞尔曲线）
 */
export class SmoothConnector implements EdgeConnector {
  connect(points: Vec2[], style: any): any {
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
      }
    });
  }
}

/**
 * 圆角连接器
 */
export class RoundedConnector implements EdgeConnector {
  private readonly radius: number;

  constructor(radius: number = 10) {
    this.radius = radius;
  }

  connect(points: Vec2[], style: any): any {
    // 对于只有两个点的情况，使用直线
    if (points.length < 3) {
      const normal = new NormalConnector();
      return normal.connect(points, style);
    }
    
    // 在实际应用中，这里可以实现带圆角的路径算法
    // 目前我们只是简单地使用 Polyline，但会记录 radius 值以备将来使用
    console.log(`RoundedConnector with radius: ${this.radius}`);
    
    return new Polyline({
      style: {
        points,
        ...style
      }
    });
  }
}