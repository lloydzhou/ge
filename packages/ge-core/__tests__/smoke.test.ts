import { describe, expect, it } from 'vitest';
import {
  VERSION,
  anchorCenter,
  builtInShapes,
  gridLayout,
  normalRouter,
  vec,
} from '../src/index';

describe('公开入口冒烟测试', () => {
  it('导出版本与五类公开运行时接口', () => {
    expect(VERSION).toBe('2.0.0-alpha.0');

    expect(builtInShapes.some(({ name }) => name === 'rect')).toBe(true);
    expect(gridLayout([{ id: 'node' }]).get('node')).toEqual({ x: 80, y: 80 });
    expect(anchorCenter({ x: 10, y: 20, width: 40, height: 20 }, {})).toEqual({ x: 30, y: 30 });
    expect(normalRouter([vec(0, 0), vec(10, 10)])).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]);
  });
});
