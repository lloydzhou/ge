/**
 * Edge 端点计算测试用例
 *
 * 测试 Edge 如何根据路由路径的实际方向计算锚点位置
 * 这是最关键的集成测试，验证了锚点、路由和连接器的协同工作
 */

import { describe, expect, beforeEach, jest } from '@jest/globals';
import { Graph } from '../core/Graph';
import { Rect, Circle, Ellipse } from '@antv/g-lite';

// 需要创建一个简化的测试环境
describe('Edge Endpoint Calculation with Router Path Direction', () => {
  let graph: Graph;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // 创建测试用的 canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    // 创建 graph 实例
    graph = new Graph({
      container: canvas
    });
  });

  afterEach(() => {
    if (document.body.contains(canvas)) {
      document.body.removeChild(canvas);
    }
    if (graph) {
      graph.destroy();
    }
  });

  describe('正交路由 - 水平路径', () => {
    test('水平边：矩形→矩形，应该在右边中间连出和左边连入', async () => {
      // 创建两个水平排列的矩形节点
      graph.addNode({
        id: 'node1',
        x: 50,
        y: 100,
        width: 80,
        height: 60,
        shape: Rect
      });

      graph.addNode({
        id: 'node2',
        x: 300,
        y: 100,
        width: 100,
        height: 80,
        shape: Rect
      });

      // 添加边，使用正交路由
      graph.addEdge({
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        style: {
          router: 'orthogonal'
        }
      });

      // 等待渲染完成
      await graph.ready;

      const edge = graph.getEdge('edge1');
      const edgeData = edge.getData();

      // 验证路径点是正交的
      expect(edgeData.points?.length).toBeGreaterThan(2);

      // 第一个点应该是 node1 的右边中间
      const firstPoint = edgeData.points?.[0];
      expect(firstPoint?.[0]).toBeCloseTo(90, 2);  // 50 + 80/2
      expect(firstPoint?.[1]).toBeCloseTo(130, 2); // 100 + 60/2

      // 最后一个点应该是 node2 的左边中间
      const lastPoint = edgeData.points?.[edgeData.points.length - 1];
      expect(lastPoint?.[0]).toBeCloseTo(300, 2);  // node2 x
      expect(lastPoint?.[1]).toBeCloseTo(140, 2); // 100 + 80/2
    });

    test('水平边：圆形→圆形，应该在右边连出和左边连入', async () => {
      graph.addNode({
        id: 'node1',
        x: 50,
        y: 100,
        shape: Circle,
        style: { r: 30 }
      });

      graph.addNode({
        id: 'node2',
        x: 300,
        y: 100,
        shape: Circle,
        style: { r: 40 }
      });

      graph.addEdge({
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        style: {
          router: 'orthogonal'
        }
      });

      await graph.ready;

      const edge = graph.getEdge('edge1');
      const points = edge.getData().points;

      // 第一个点：圆形 node1 右边 (3点方向，0度)
      const firstPoint = points?.[0];
      expect(firstPoint?.[0]).toBeCloseTo(80, 2);   // 50 + 30
      expect(firstPoint?.[1]).toBeCloseTo(100, 2);  // cy

      // 最后一个点：圆形 node2 左边 (9点方向，180度)
      const lastPoint = points?.[points?.length - 1];
      expect(lastPoint?.[0]).toBeCloseTo(260, 2); // 300 - 40
      expect(lastPoint?.[1]).toBeCloseTo(100, 2); // cy
    });

    test('水平边：圆形→矩形，圆形用角度锚点，矩形用 midSide', async () => {
      graph.addNode({
        id: 'node1',
        x: 50,
        y: 100,
        shape: Circle,
        style: { r: 30 }
      });

      graph.addNode({
        id: 'node2',
        x: 300,
        y: 100,
        width: 100,
        height: 80,
        shape: Rect
      });

      graph.addEdge({
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        style: {
          router: 'orthogonal'
        }
      });

      await graph.ready;

      const edge = graph.getEdge('edge1');
      const points = edge.getData().points;

      // 圆形 node1 右边
      const firstPoint = points?.[0];
      expect(firstPoint?.[0]).toBeCloseTo(80, 2);   // 50 + 30
      expect(firstPoint?.[1]).toBeCloseTo(100, 2);

      // 矩形 node2 左边
      const lastPoint = points?.[points?.length - 1];
      expect(lastPoint?.[0]).toBeCloseTo(300, 2); // node2 x
      expect(lastPoint?.[1]).toBeCloseTo(140, 2); // 100 + 80/2
    });
  });

  describe('正交路由 - 垂直路径', () => {
    test('垂直边：矩形→矩形，应该在底部中间连出和顶部连入', async () => {
      graph.addNode({
        id: 'node1',
        x: 100,
        y: 50,
        width: 80,
        height: 60,
        shape: Rect
      });

      graph.addNode({
        id: 'node2',
        x: 100,
        y: 300,
        width: 100,
        height: 80,
        shape: Rect
      });

      graph.addEdge({
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        style: {
          router: 'orthogonal'
        }
      });

      await graph.ready;

      const edge = graph.getEdge('edge1');
      const points = edge.getData().points;

      // node1 底部中间
      const firstPoint = points?.[0];
      expect(firstPoint?.[0]).toBeCloseTo(140, 2); // 100 + 80/2
      expect(firstPoint?.[1]).toBeCloseTo(110, 2); // 50 + 60

      // node2 顶部中间
      const lastPoint = points?.[points?.length - 1];
      expect(lastPoint?.[0]).toBeCloseTo(150, 2); // 100 + 100/2
      expect(lastPoint?.[1]).toBeCloseTo(300, 2); // node2 y
    });
  });

  describe('直线路由 - 斜向连接', () => {
    test('斜向边：圆形→圆形，应该根据角度计算连接点', async () => {
      graph.addNode({
        id: 'node1',
        x: 50,
        y: 50,
        shape: Circle,
        style: { r: 30 }
      });

      graph.addNode({
        id: 'node2',
        x: 300,
        y: 200,
        shape: Circle,
        style: { r: 40 }
      });

      graph.addEdge({
        id: 'edge1',
        source: 'node1',
        target: 'node2'
        // 默认使用 NormalRouter
      });

      await graph.ready;

      const edge = graph.getEdge('edge1');
      const points = edge.getData().points;

      // 应该有两个端点
      expect(points?.length).toBe(2);

      // 计算预期的角度
      const angle = Math.atan2(200 - 50, 300 - 50) * 180 / Math.PI;

      // node1 的连接点：根据角度计算
      const firstPoint = points?.[0];
      expect(firstPoint?.[0]).toBeCloseTo(50 + 30 * Math.cos(angle * Math.PI / 180), 2);
      expect(firstPoint?.[1]).toBeCloseTo(50 + 30 * Math.sin(angle * Math.PI / 180), 2);

      // node2 的连接点：应该是相反角度
      const lastPoint = points?.[1];
      const oppositeAngle = (angle + 180) % 360;
      expect(lastPoint?.[0]).toBeCloseTo(300 + 40 * Math.cos(oppositeAngle * Math.PI / 180), 2);
      expect(lastPoint?.[1]).toBeCloseTo(200 + 40 * Math.sin(oppositeAngle * Math.PI / 180), 2);
    });
  });

  describe('边界情况', () => {
    test('节点位置相同 - 应该仍然工作', async () => {
      graph.addNode({
        id: 'node1',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        shape: Rect
      });

      graph.addNode({
        id: 'node2',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        shape: Rect
      });

      const edge = graph.addEdge({
        id: 'edge1',
        source: 'node1',
        target: 'node2'
      });

      await graph.ready;
      // 不应该抛出错误
      expect(edge).toBeDefined();
    });

    test('椭圆形节点 - 应该正确处理不同长宽比', async () => {
      graph.addNode({
        id: 'node1',
        x: 100,
        y: 100,
        shape: Ellipse,
        style: { cx: 100, cy: 100, rx: 50, ry: 30 }
      });

      graph.addNode({
        id: 'node2',
        x: 300,
        y: 200,
        shape: Ellipse,
        style: { cx: 300, cy: 200, rx: 40, ry: 60 }
      });

      const edge = graph.addEdge({
        id: 'edge1',
        source: 'node1',
        target: 'node2'
      });

      await graph.ready;

      const edgeData = edge.getData();
      expect(edgeData.points).toBeDefined();
      expect(edgeData.points?.length).toBeGreaterThanOrEqual(2);
    });
  });
});
