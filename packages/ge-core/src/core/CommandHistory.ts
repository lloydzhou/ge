import type { Command } from '../types';
import type { Graph } from './Graph';

/**
 * CommandHistory manages undo/redo functionality for the graph editor.
 * It maintains a stack of executed commands and allows undoing/redoing them.
 */
export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private graph: Graph;
  private maxHistorySize: number;

  /**
   * Create a new CommandHistory
   * @param graph The graph instance this history is associated with
   * @param maxHistorySize Maximum number of commands to keep in history (default: 100)
   */
  constructor(graph: Graph, maxHistorySize: number = 100) {
    this.graph = graph;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Execute a command and add it to the history
   * @param command The command to execute
   * @returns Promise that resolves when the command is executed
   */
  async execute(command: Command): Promise<void> {
    // Check if command can be executed
    if (command.canExecute && !command.canExecute()) {
      throw new Error('Command cannot be executed');
    }

    // Execute the command
    await command.execute();

    // Add to undo stack
    this.undoStack.push(command);

    // Clear redo stack when new command is executed
    this.redoStack = [];

    // Limit stack size
    this.trimStack();
  }

  /**
   * Undo the last command
   * @returns Promise that resolves when the command is undone
   */
  async undo(): Promise<void> {
    const command = this.undoStack.pop();
    if (!command) {
      throw new Error('No commands to undo');
    }

    // Check if command can be undone
    if (command.canUndo && !command.canUndo()) {
      throw new Error('Command cannot be undone');
    }

    // Undo the command
    await command.undo();

    // Add to redo stack
    this.redoStack.push(command);
  }

  /**
   * Redo the last undone command
   * @returns Promise that resolves when the command is redone
   */
  async redo(): Promise<void> {
    const command = this.redoStack.pop();
    if (!command) {
      throw new Error('No commands to redo');
    }

    // Re-execute the command
    await command.execute();

    // Add back to undo stack
    this.undoStack.push(command);
  }

  /**
   * Check if there are commands to undo
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if there are commands to redo
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get the number of commands in the undo stack
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get the number of commands in the redo stack
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Trim the undo stack to the maximum size
   */
  private trimStack(): void {
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack = this.undoStack.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get the graph associated with this history
   */
  getGraph(): Graph {
    return this.graph;
  }
}
