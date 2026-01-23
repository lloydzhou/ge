/**
 * Node Anchor 测试用例
 *
 * 测试所有锚点预设在不同形状上的正确行为
 * 这些测试固定了锚点系统的核心逻辑，防止未来修改破坏
 */

import { Circle, Ellipse, Rect } from '@antv/g-lite';
import { resolveAnchorFunction } from '../nodeAnchor';

describe('resolveAnchorFunction', () => {
  describe('基本方向锚点 - 矩形', () => {
    const createRect = (x = 0, y = 0, width = 100, height = 60) => {
      const rect = new Rect({
        style: { x, y, width, height }
      });
      return rect;
    };

    test('center - 应该返回矩形的中心点', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction('center');
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);  // width / 2
      expect(result[1]).toBe(30);  // height / 2
    });

    test('top - 应该返回矩形顶部中心', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction('top');
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);  // width / 2
      expect(result[1]).toBe(0);   // top
    });

    test('bottom - 应该返回矩形底部中心', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction('bottom');
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);  // width / 2
      expect(result[1]).toBe(60);  // height
    });

    test('left - 应该返回矩形左侧中心', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction('left');
      const result = anchorFn!(rect);
      expect(result[0]).toBe(0);   // left
      expect(result[1]).toBe(30);  // height / 2
    });

    test('right - 应该返回矩形右侧中心', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction('right');
      const result = anchorFn!(rect);
      expect(result[0]).toBe(100); // right
      expect(result[1]).toBe(30);  // height / 2
    });

    test('topLeft - 应该返回矩形左上角', () => {
      const rect = createRect(10, 20, 100, 60);
      const anchorFn = resolveAnchorFunction('topLeft');
      const result = anchorFn!(rect);
      expect(result[0]).toBe(10);
      expect(result[1]).toBe(20);
    });

    test('topRight - 应该返回矩形右上角', () => {
      const rect = createRect(10, 20, 100, 60);
      const anchorFn = resolveAnchorFunction('topRight');
      const result = anchorFn!(rect);
      expect(result[0]).toBe(110); // 10 + 100
      expect(result[1]).toBe(20);
    });

    test('bottomLeft - 应该返回矩形左下角', () => {
      const rect = createRect(10, 20, 100, 60);
      const anchorFn = resolveAnchorFunction('bottomLeft');
      const result = anchorFn!(rect);
      expect(result[0]).toBe(10);
      expect(result[1]).toBe(80);  // 20 + 60
    });

    test('bottomRight - 应该返回矩形右下角', () => {
      const rect = createRect(10, 20, 100, 60);
      const anchorFn = resolveAnchorFunction('bottomRight');
      const result = anchorFn!(rect);
      expect(result[0]).toBe(110); // 10 + 100
      expect(result[1]).toBe(80);  // 20 + 60
    });
  });

  describe('基本方向锚点 - 圆形', () => {
    const createCircle = (cx = 50, cy = 50, r = 30) => {
      const circle = new Circle({
        style: { cx, cy, r }
      });
      return circle;
    };

    test('center - 应该返回圆形中心', () => {
      const circle = createCircle(50, 50, 30);
      const anchorFn = resolveAnchorFunction('center');
      const result = anchorFn!(circle);
      expect(result[0]).toBe(50);
      expect(result[1]).toBe(50);
    });

    test('top - 应该返回圆形顶部点', () => {
      const circle = createCircle(50, 50, 30);
      const anchorFn = resolveAnchorFunction('top');
      const result = anchorFn!(circle);
      expect(result[0]).toBe(50);  // cx
      expect(result[1]).toBe(20);  // cy - r
    });

    test('bottom - 应该返回圆形底部点', () => {
      const circle = createCircle(50, 50, 30);
      const anchorFn = resolveAnchorFunction('bottom');
      const result = anchorFn!(circle);
      expect(result[0]).toBe(50);  // cx
      expect(result[1]).toBe(80);  // cy + r
    });

    test('left - 应该返回圆形左侧点', () => {
      const circle = createCircle(50, 50, 30);
      const anchorFn = resolveAnchorFunction('left');
      const result = anchorFn!(circle);
      expect(result[0]).toBe(20);  // cx - r
      expect(result[1]).toBe(50);  // cy
    });

    test('right - 应该返回圆形右侧点', () => {
      const circle = createCircle(50, 50, 30);
      const anchorFn = resolveAnchorFunction('right');
      const result = anchorFn!(circle);
      expect(result[0]).toBe(80);  // cx + r
      expect(result[1]).toBe(50);  // cy
    });
  });

  describe('angle 锚点 - 矩形', () => {
    const createRect = (x = 0, y = 0, width = 100, height = 60) => {
      const rect = new Rect({
        style: { x, y, width, height }
      });
      return rect;
    };

    test('angle 0° - 应该从矩形右侧连出', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: 0 } });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(100); // 右边
      expect(result[1]).toBe(30);  // 垂直中心
    });

    test('angle 90° - 应该从矩形底部连出', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: 90 } });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);  // 水平中心
      expect(result[1]).toBe(60);  // 底边
    });

    test('angle 180° - 应该从矩形左侧连出', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: 180 } });
      const result = anchorFn!(rect);
      expect(result[0]).toBeCloseTo(0, 10);   // 左边 (浮点精度)
      expect(result[1]).toBeCloseTo(30, 10);  // 垂直中心
    });

    test('angle -90° (270°) - 应该从矩形顶部连出', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: -90 } });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);  // 水平中心
      expect(result[1]).toBe(0);   // 顶边
    });
  });

  describe('angle 锚点 - 圆形', () => {
    const createCircle = (cx = 50, cy = 50, r = 30) => {
      const circle = new Circle({
        style: { cx, cy, r }
      });
      return circle;
    };

    test('angle 0° (3点方向) - 应该返回圆右侧点', () => {
      const circle = createCircle(50, 50, 30);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: 0 } });
      const result = anchorFn!(circle);
      expect(result[0]).toBeCloseTo(80, 1);   // cx + r * cos(0)
      expect(result[1]).toBeCloseTo(50, 1);   // cy + r * sin(0)
    });

    test('angle 90° (6点方向) - 应该返回圆底部点', () => {
      const circle = createCircle(50, 50, 30);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: 90 } });
      const result = anchorFn!(circle);
      expect(result[0]).toBeCloseTo(50, 1);   // cx + r * cos(90°)
      expect(result[1]).toBeCloseTo(80, 1);   // cy + r * sin(90°)
    });

    test('angle 180° (9点方向) - 应该返回圆左侧点', () => {
      const circle = createCircle(50, 50, 30);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: 180 } });
      const result = anchorFn!(circle);
      expect(result[0]).toBeCloseTo(20, 1);   // cx + r * cos(180°)
      expect(result[1]).toBeCloseTo(50, 1);   // cy + r * sin(180°)
    });

    test('angle -90° (12点方向) - 应该返回圆顶部点', () => {
      const circle = createCircle(50, 50, 30);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: -90 } });
      const result = anchorFn!(circle);
      expect(result[0]).toBeCloseTo(50, 1);   // cx + r * cos(-90°)
      expect(result[1]).toBeCloseTo(20, 1);   // cy + r * sin(-90°)
    });
  });

  describe('angle 锚点 - 椭圆', () => {
    const createEllipse = (cx = 50, cy = 50, rx = 50, ry = 30) => {
      const ellipse = new Ellipse({
        style: { cx, cy, rx, ry }
      });
      return ellipse;
    };

    test('angle 0° - 应该返回椭圆右侧点', () => {
      const ellipse = createEllipse(50, 50, 50, 30);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: 0 } });
      const result = anchorFn!(ellipse);
      expect(result[0]).toBeCloseTo(100, 1); // cx + rx
      expect(result[1]).toBeCloseTo(50, 1);  // cy
    });

    test('angle 90° - 应该返回椭圆底部点', () => {
      const ellipse = createEllipse(50, 50, 50, 30);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: 90 } });
      const result = anchorFn!(ellipse);
      expect(result[0]).toBeCloseTo(50, 1);   // cx
      expect(result[1]).toBeCloseTo(80, 1);  // cy + ry
    });

    test('angle 180° - 应该返回椭圆左侧点', () => {
      const ellipse = createEllipse(50, 50, 50, 30);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: 180 } });
      const result = anchorFn!(ellipse);
      expect(result[0]).toBeCloseTo(0, 1);    // cx - rx
      expect(result[1]).toBeCloseTo(50, 1);  // cy
    });

    test('angle 45° - 应该返回椭圆右下象限的点', () => {
      const ellipse = createEllipse(50, 50, 50, 30);
      const anchorFn = resolveAnchorFunction({ name: 'angle', args: { angle: 45 } });
      const result = anchorFn!(ellipse);
      // 预期：cx + rx * cos(45°), cy + ry * sin(45°)
      expect(result[0]).toBeCloseTo(85.36, 0.1); // 50 + 50 * √2/2
      expect(result[1]).toBeCloseTo(71.21, 0.1); // 50 + 30 * √2/2
    });
  });

  describe('midSide 锚点 - 智能选择最近侧', () => {
    const createRect = (x = 0, y = 0, width = 100, height = 60) => {
      const rect = new Rect({
        style: { x, y, width, height }
      });
      return rect;
    };

    test('方向向右 [1, 0] - 应该选择右侧', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'midSide',
        args: { direction: [1, 0] }
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(100); // right
      expect(result[1]).toBe(30);  // center Y
    });

    test('方向向左 [-1, 0] - 应该选择左侧', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'midSide',
        args: { direction: [-1, 0] }
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(0);   // left
      expect(result[1]).toBe(30);  // center Y
    });

    test('方向向下 [0, 1] - 应该选择底部', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'midSide',
        args: { direction: [0, 1] }
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);  // center X
      expect(result[1]).toBe(60);  // bottom
    });

    test('方向向上 [0, -1] - 应该选择顶部', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'midSide',
        args: { direction: [0, -1] }
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);  // center X
      expect(result[1]).toBe(0);   // top
    });

    test('方向右下 [1, 1] - 应该选择底部（垂直主导）', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'midSide',
        args: { direction: [1, 1] }
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);  // center X
      expect(result[1]).toBe(60);  // bottom (垂直主导)
    });

    test('方向右下 [2, 1] - 应该选择右侧（水平主导）', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'midSide',
        args: { direction: [2, 1] }
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(100); // right (水平主导)
      expect(result[1]).toBe(30);  // center Y
    });

    test('无方向 [0, 0] - 应该返回中心', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'midSide',
        args: { direction: [0, 0] }
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);  // center X
      expect(result[1]).toBe(30);  // center Y
    });
  });

  describe('orth 锚点 - 正交最近点', () => {
    const createRect = (x = 0, y = 0, width = 100, height = 60) => {
      const rect = new Rect({
        style: { x, y, width, height }
      });
      return rect;
    };

    test('参考点在右侧 - 应该选择右边中心', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'orth',
        args: { refX: 150, refY: 30 }  // 右侧外部
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(100); // right
      expect(result[1]).toBe(30);  // center Y
    });

    test('参考点在左侧 - 应该选择左边中心', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'orth',
        args: { refX: -50, refY: 30 }  // 左侧外部
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(0);   // left
      expect(result[1]).toBe(30);  // center Y
    });

    test('参考点在上方 - 应该选择顶部中心', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'orth',
        args: { refX: 50, refY: -30 }  // 上方外部
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);  // center X
      expect(result[1]).toBe(0);   // top
    });

    test('参考点在下方 - 应该选择底部中心', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'orth',
        args: { refX: 50, refY: 100 }  // 下方外部
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);  // center X
      expect(result[1]).toBe(60);  // bottom
    });

    test('参考点在中心 - 应该选择最近边（假设右边更近）', () => {
      const rect = createRect(0, 0, 100, 60);
      const anchorFn = resolveAnchorFunction({
        name: 'orth',
        args: { refX: 80, refY: 30 }  // 靠近右边
      });
      const result = anchorFn!(rect);
      expect(result[0]).toBe(100); // right (距离 20)
      expect(result[1]).toBe(30);  // center Y
    });
  });

  describe('absolute 锚点 - 绝对位置', () => {
    test('应该返回指定的绝对位置', () => {
      const anchorFn = resolveAnchorFunction({
        name: 'absolute',
        args: { x: 123, y: 456 }
      });
      const result = anchorFn!(null as any);
      expect(result[0]).toBe(123);
      expect(result[1]).toBe(456);
    });

    test('缺少参数时应该返回 0,0', () => {
      const anchorFn = resolveAnchorFunction({
        name: 'absolute',
        args: {}
      });
      const result = anchorFn!(null as any);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
    });
  });

  describe('边界情况', () => {
    test('未知 layout 应该返回 center 锚点', () => {
      const rect = new Rect({ style: { x: 0, y: 0, width: 100, height: 60 } });
      const anchorFn = resolveAnchorFunction('unknown' as any);
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);
      expect(result[1]).toBe(30);
    });

    test('undefined layout 应该返回 center 锚点', () => {
      const rect = new Rect({ style: { x: 0, y: 0, width: 100, height: 60 } });
      const anchorFn = resolveAnchorFunction(undefined);
      const result = anchorFn!(rect);
      expect(result[0]).toBe(50);
      expect(result[1]).toBe(30);
    });
  });
});
