import { NormalRouter, OrthogonalRouter, ManhattanRouter } from '../edge/EdgeRouter';
import { NormalConnector, PolylineConnector } from '../edge/EdgeConnector';
import type { Vec2 } from '../../utils/edgeLayout';

describe('EdgeRouter', () => {
  test('NormalRouter should return the same points', () => {
    const router = new NormalRouter();
    const points: Vec2[] = [[0, 0], [100, 100]];
    const result = router.route(points);
    expect(result).toEqual(points);
  });

  test('NormalRouter should include vertices', () => {
    const router = new NormalRouter();
    const points: Vec2[] = [[0, 0], [100, 100]];
    const vertices: Vec2[] = [[50, 50]];
    const result = router.route(points, vertices);
    expect(result).toEqual([[0, 0], [50, 50], [100, 100]]);
  });

  test('OrthogonalRouter should create orthogonal path', () => {
    const router = new OrthogonalRouter();
    const points: Vec2[] = [[0, 0], [100, 100]];
    const result = router.route(points);
    expect(result).toEqual([
      [0, 0],
      [50, 0],
      [50, 100],
      [100, 100]
    ]);
  });

  test('ManhattanRouter should create manhattan path', () => {
    const router = new ManhattanRouter({ step: 10 });
    const points: Vec2[] = [[0, 0], [100, 100]];
    const result = router.route(points);
    expect(result).toEqual([
      [0, 0],
      [50, 0],
      [50, 100],
      [100, 100]
    ]);
  });
});

describe('EdgeConnector', () => {
  test('NormalConnector should create a line', () => {
    const connector = new NormalConnector();
    const points: Vec2[] = [[0, 0], [100, 100]];
    const style = { stroke: '#000' };
    const result = connector.connect(points, style);
    expect(result).toBeDefined();
    expect(result.style.x1).toBe(0);
    expect(result.style.y1).toBe(0);
    expect(result.style.x2).toBe(100);
    expect(result.style.y2).toBe(100);
  });

  test('PolylineConnector should create a polyline', () => {
    const connector = new PolylineConnector();
    const points: Vec2[] = [[0, 0], [50, 50], [100, 100]];
    const style = { stroke: '#000' };
    const result = connector.connect(points, style);
    expect(result).toBeDefined();
    expect(result.style.points).toEqual(points);
  });
});