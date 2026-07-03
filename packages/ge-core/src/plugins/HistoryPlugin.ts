/**
 * HistoryPlugin —— 撤销/重做（command 栈）。
 *
 * - 自动监听节点拖拽（pointerdown 记录起点，node:dragend 记录终点）压栈。
 * - 提供 undo() / redo() / canUndo() / canRedo()。
 * - 也可手动 push(do, undo) 记录任意操作（增删节点等）。
 */
import { Plugin, closestCell } from './plugin';

export interface Command {
  do: () => void;
  undo: () => void;
}

export class HistoryPlugin extends Plugin {
  readonly name = 'history';
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private pending: { id: string; x: number; y: number } | null = null;

  init(graph: any): void {
    super.init(graph);

    graph.addEventListener('pointerdown', (e: any) => {
      const node = graph.pickNode(e.viewportX, e.viewportY);
      if (!node) return;
      this.pending = {
        id: node.id,
        x: (node.getAttribute('x') as number) ?? 0,
        y: (node.getAttribute('y') as number) ?? 0,
      };
    });

    graph.addEventListener('node:dragend', (e: any) => {
      if (!this.pending) return;
      const node = e.target;
      const from = this.pending;
      this.pending = null;
      const to = { id: node.id, x: (node.getAttribute('x') as number) ?? 0, y: (node.getAttribute('y') as number) ?? 0 };
      if (Math.abs(from.x - to.x) < 0.5 && Math.abs(from.y - to.y) < 0.5) return;
      this.push({
        do: () => this.graph.getNode(to.id)?.moveTo(to.x, to.y),
        undo: () => this.graph.getNode(from.id)?.moveTo(from.x, from.y),
      });
    });
  }

  /** 手动压入一个命令 */
  push(cmd: Command): void {
    this.undoStack.push(cmd);
    this.redoStack = [];
  }

  undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    this.redoStack.push(cmd);
    cmd.undo();
    return true;
  }

  redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    this.undoStack.push(cmd);
    cmd.do();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
