/**
 * HistoryPlugin —— 撤销/重做（snapshot 模式）。
 *
 * - 自动监听 pointerdown→pointerup（覆盖拖拽/缩放/旋转）：操作前存 before snapshot，操作后存 after。
 * - 手动 mark()/commit() 用于结构性操作（addNode/removeNode 等）。
 * - undo/redo 通过 graph.fromJSON 恢复 snapshot。
 */
import { Plugin } from './plugin';

interface Snapshot {
  before: any;
  after: any;
}

export class HistoryPlugin extends Plugin {
  readonly name = 'history';
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private beforeSnapshot: any = null;

  init(graph: any): void {
    super.init(graph);
    // pointerdown：记录 before（拖拽/resize/rotate 前）
    graph.addEventListener('pointerdown', () => {
      this.beforeSnapshot = this.snap();
    });
    // pointerup：记录 after，如果不同 push
    const onUp = (): void => {
      if (!this.beforeSnapshot) return;
      const after = this.snap();
      if (JSON.stringify(after) !== JSON.stringify(this.beforeSnapshot)) {
        this.pushRaw(this.beforeSnapshot, after);
      }
      this.beforeSnapshot = null;
    };
    graph.addEventListener('pointerup', onUp);
    graph.addEventListener('pointerupoutside', onUp);
  }

  private snap(): any {
    return this.graph.toJSON();
  }

  private pushRaw(before: any, after: any): void {
    this.undoStack.push({ before, after });
    this.redoStack = [];
    if (this.undoStack.length > 50) this.undoStack.shift(); // 限制栈深度
  }

  /** 手动标记操作开始（addNode/removeNode 等结构性操作） */
  mark(): void {
    this.beforeSnapshot = this.snap();
  }

  /** 手动提交操作（和 mark 配对） */
  commit(): void {
    if (!this.beforeSnapshot) return;
    const after = this.snap();
    if (JSON.stringify(after) !== JSON.stringify(this.beforeSnapshot)) {
      this.pushRaw(this.beforeSnapshot, after);
    }
    this.beforeSnapshot = null;
  }

  undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    this.redoStack.push(cmd);
    this.restore(cmd.before);
    return true;
  }

  redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    this.undoStack.push(cmd);
    this.restore(cmd.after);
    return true;
  }

  private restore(data: any): void {
    this.graph.fromJSON(data);
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
