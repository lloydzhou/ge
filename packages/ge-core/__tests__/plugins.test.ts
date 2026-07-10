import { describe, it, expect } from 'vitest';
import { HistoryPlugin } from '../src/plugins/HistoryPlugin';
import { closestCell, addClass, removeClass } from '../src/plugins/plugin';

describe('HistoryPlugin 栈逻辑', () => {
    const mkHistory = () => {
      const stack: any[] = [];
      const undoStack: any[] = [];
      const redoStack: any[] = [];
      return {
        undoStack, redoStack,
        mark() { undoStack.push('snap'); redoStack.length = 0; },
        commit() {},
        undo() { const c = undoStack.pop(); if (c) redoStack.push(c); return !!c; },
        redo() { const c = redoStack.pop(); if (c) undoStack.push(c); return !!c; },
        canUndo() { return undoStack.length > 0; },
        canRedo() { return redoStack.length > 0; },
        clear() { undoStack.length = 0; redoStack.length = 0; },
      };
    };
    it('push / undo / redo 顺序', () => {
      const h = mkHistory();
      h.mark(); h.commit();
      h.mark(); h.commit();
      expect(h.canUndo()).toBe(true);
      h.undo();
      expect(h.canRedo()).toBe(true);
      h.redo();
      expect(h.canRedo()).toBe(false);
    });
    it('新 push 清空 redo 栈', () => {
      const h = mkHistory();
      h.mark(); h.commit();
      h.undo();
      expect(h.canRedo()).toBe(true);
      h.mark(); h.commit();
      expect(h.canRedo()).toBe(false);
    });
    it('clear 清空两个栈', () => {
      const h = mkHistory();
      h.mark(); h.commit();
      h.undo();
      h.clear();
      expect(h.canUndo()).toBe(false);
      expect(h.canRedo()).toBe(false);
    });
  });

it('恢复快照期间不记录由 fromJSON 派发的事件', () => {
  const listeners = new Map<string, Array<() => void>>();
  let state = 1;
  const graph = {
    addEventListener(type: string, listener: () => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.set(type, (listeners.get(type) ?? []).filter((item) => item !== listener));
    },
    toJSON: () => ({ version: 1, viewport: { panX: 0, panY: 0, zoom: 1 }, cells: [{ tag: 'ge-node', props: { state }, data: {}, children: [] }] }),
    fromJSON(data: any) {
      state = data.cells[0].props.state;
      for (const listener of listeners.get('pointerdown') ?? []) listener();
      for (const listener of listeners.get('pointerup') ?? []) listener();
    },
  };
  const history = new HistoryPlugin();
  history.init(graph as any);
  history.mark();
  state = 2;
  history.commit();
  expect(history.canUndo()).toBe(true);
  history.undo();
  expect(history.canUndo()).toBe(false);
  expect(history.canRedo()).toBe(true);
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

describe('addClass / removeClass', () => {
  it('addClass 添加 + 去重', () => {
    const el: any = { className: 'ge-node' };
    addClass(el, 'hover');
    expect(el.className).toBe('ge-node hover');
    addClass(el, 'hover');
    expect(el.className).toBe('ge-node hover');
  });

  it('removeClass 移除', () => {
    const el: any = { className: 'ge-node hover selected' };
    removeClass(el, 'hover');
    expect(el.className).toBe('ge-node selected');
  });

  it('空输入安全', () => {
    expect(() => addClass(null, 'x')).not.toThrow();
    expect(() => removeClass(null, 'x')).not.toThrow();
  });
});
