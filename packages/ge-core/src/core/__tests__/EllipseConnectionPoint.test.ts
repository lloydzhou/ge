import { computeAnchorForShape } from '../../utils/nodeAnchor';

describe('Ellipse Connection Point', () => {
  test('should calculate correct intersection point for ellipse', () => {
    // 创建一个椭圆形状的模拟对象
    const ellipseShape = {
      nodeName: 'ellipse',
      style: {
        cx: 0,
        cy: 0,
        rx: 50,
        ry: 30
      }
    };

    // 测试从右侧水平方向的交点
    const result1 = computeAnchorForShape(ellipseShape, { name: 'angle', args: { angle: 0 } }, {});
    expect(result1[0]).toBeCloseTo(50);
    expect(result1[1]).toBeCloseTo(0);

    // 测试从上方垂直方向的交点
    const result2 = computeAnchorForShape(ellipseShape, { name: 'angle', args: { angle: -90 } }, {});
    expect(result2[0]).toBeCloseTo(0);
    expect(result2[1]).toBeCloseTo(-30);

    // 测试从左侧水平方向的交点
    const result3 = computeAnchorForShape(ellipseShape, { name: 'angle', args: { angle: 180 } }, {});
    expect(result3[0]).toBeCloseTo(-50);
    expect(result3[1]).toBeCloseTo(0);

    // 测试从下方垂直方向的交点
    const result4 = computeAnchorForShape(ellipseShape, { name: 'angle', args: { angle: 90 } }, {});
    expect(result4[0]).toBeCloseTo(0);
    expect(result4[1]).toBeCloseTo(30);
  });
});