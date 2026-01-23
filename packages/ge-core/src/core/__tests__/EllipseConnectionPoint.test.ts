import { Ellipse } from '@antv/g-lite';
import { resolveAnchorFunction } from '../../utils/nodeAnchor';

describe('Ellipse Connection Point', () => {
  test('should calculate correct intersection point for ellipse', () => {
    // 创建一个椭圆形状
    const ellipseShape = new Ellipse({
      style: {
        cx: 0,
        cy: 0,
        rx: 50,
        ry: 30
      }
    });

    // 测试从右侧水平方向的交点 (angle: 0)
    const anchorFn1 = resolveAnchorFunction({ name: 'angle', args: { angle: 0 } });
    const result1 = anchorFn1!(ellipseShape);
    expect(result1[0]).toBeCloseTo(50);
    expect(result1[1]).toBeCloseTo(0);

    // 测试从上方垂直方向的交点 (angle: -90)
    const anchorFn2 = resolveAnchorFunction({ name: 'angle', args: { angle: -90 } });
    const result2 = anchorFn2!(ellipseShape);
    expect(result2[0]).toBeCloseTo(0);
    expect(result2[1]).toBeCloseTo(-30);

    // 测试从左侧水平方向的交点 (angle: 180)
    const anchorFn3 = resolveAnchorFunction({ name: 'angle', args: { angle: 180 } });
    const result3 = anchorFn3!(ellipseShape);
    expect(result3[0]).toBeCloseTo(-50);
    expect(result3[1]).toBeCloseTo(0);

    // 测试从下方垂直方向的交点 (angle: 90)
    const anchorFn4 = resolveAnchorFunction({ name: 'angle', args: { angle: 90 } });
    const result4 = anchorFn4!(ellipseShape);
    expect(result4[0]).toBeCloseTo(0);
    expect(result4[1]).toBeCloseTo(30);
  });
});