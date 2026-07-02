import { describe, it, expect } from 'vitest';
import { HistoryPlugin } from '../src/plugins/HistoryPlugin';
import { closestCell } from '../src/plugins/plugin';

describe('HistoryPlugin 栈逻辑', () => {
  it('push / undo / redo 顺序', () => {
    const log: string[] = [];
    const h = new HistoryPlugin();
    h.push({ do: () => log.push('a-do'), undo: () => log.push('a-undo') });
    h.push({ do: () => log.push('b-do'), undo: () => log.push('b-undo') });

    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);

    expect(h.undo()).toBe(true); // b-undo
    expect(log).toEqual(['b-undo']);
    expect(h.undo()).toBe(true); // a-undo
    expect(log).toEqual(['b-undo', 'a-undo']);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(true);

    expect(h.redo()).toBe(true); // a-do
    expect(log).toEqual(['b-undo', 'a-undo', 'a-do']);
  });

  it('新 push 清空 redo 栈', () => {
    const h = new HistoryPlugin();
    h.push({ do: () => {}, undo: () => {} });
    h.undo();
    expect(h.canRedo()).toBe(true);
    h.push({ do: () => {}, undo: () => {} });
    expect(h.canRedo()).toBe(false);
  });

  it('空栈 undo/redo 返回 false', () => {
    const h = new HistoryPlugin();
    expect(h.undo()).toBe(false);
    expect(h.redo()).toBe(false);
  });

  it('clear 清空两个栈', () => {
    const h = new HistoryPlugin();
    h.push({ do: () => {}, undo: () => {} });
    h.undo();
    h.clear();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });
});

describe('closestCell', () => {
  it('向上找到最近 node', () => {
    const node = { className: 'ge-node', parentNode: { className: 'x', parentNode: null } };
    const child = { className: 'ge-rect', parentNode: node };
    expect(closestCell(child)).toBe(node);
  });

  it('找到 group', () => {
    const group = { className: 'ge-group', parentNode: null };
    expect(closestCell(group)).toBe(group);
  });

  it('无匹配返回 null', () => {
    expect(closestCell({ className: 'x', parentNode: { className: 'y', parentNode: null } })).toBeNull();
  });

  it('空输入安全返回 null', () => {
    expect(closestCell(null)).toBeNull();
  });
});
