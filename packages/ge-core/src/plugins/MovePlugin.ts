/**
 * MovePlugin - Node drag-to-move functionality
 *
 * Listens to node:drag events and moves nodes in real-time.
 * This follows the industry standard pattern (React Flow, G6, GoJS, etc.)
 * where nodes move immediately during drag, with edges updating in real-time.
 *
 * Uses requestAnimationFrame for smooth 60fps updates.
 */
import type { RenderingPlugin, RenderingPluginContext } from '../types';
import type { Node } from '../core/node/Node';
import type { FederatedEvent } from '@antv/g-lite';

export interface MovePluginOptions {
  /** Enable grid snapping */
  snapToGrid?: boolean;
  /** Grid size in pixels */
  gridSize?: number;
  /** Minimum drag distance before node starts moving (pixels) */
  dragThreshold?: number;
}

export class MovePlugin implements RenderingPlugin {
  name = 'move';
  private context: RenderingPluginContext | null = null;
  private opts: MovePluginOptions;
  private _onDragStart: ((e: Event) => void) | null = null;
  private _onDrag: ((e: Event) => void) | null = null;
  private _onDragEnd: ((e: Event) => void) | null = null;

  // requestAnimationFrame ID for throttling
  private rafId: number | null = null;
  private pendingMoves: Map<string, { x: number; y: number }> = new Map();

  private dragState: Map<string, {
    startPos: [number, number];
    startPointer: [number, number];
    hasMoved: boolean;
  }> = new Map();

  constructor(options: MovePluginOptions = {}) {
    this.opts = {
      snapToGrid: false,
      gridSize: 10,
      dragThreshold: 0,
      ...options,
    };
  }

  /**
   * Apply plugin to graph (following Canvas's plugin.apply pattern)
   */
  apply(context: RenderingPluginContext, runtime?: any): void {
    this.context = context;
    const graph = (context as any).graph;

    // Handle node:dragstart - record initial position
    this._onDragStart = (e: Event) => {
      try {
        const detail = (e as any).detail || {};
        const source = detail.source || e.target;
        if (!source) return;

        const canvasX = detail.x ?? detail.event?.canvasX;
        const canvasY = detail.y ?? detail.event?.canvasY;

        // Validate coordinates
        if (typeof canvasX !== 'number' || typeof canvasY !== 'number' ||
            !isFinite(canvasX) || !isFinite(canvasY)) {
          return;
        }

        const startPos = source.getPosition();

        // 关键修复：创建数组的副本，避免 getPosition() 返回的数组被 setPosition 修改
        this.dragState.set(source.getId(), {
          startPos: [startPos[0], startPos[1], startPos[2]] as [number, number, number],
          startPointer: [canvasX, canvasY],
          hasMoved: false,
        });
      } catch (err) {
        console.error('MovePlugin dragstart error:', err);
      }
    };

    // Handle node:drag - move node (throttled via requestAnimationFrame)
    this._onDrag = (e: Event) => {
      try {
        const detail = (e as any).detail || {};
        const source = detail.source || e.target;
        if (!source) return;

        const canvasX = detail.x ?? detail.event?.canvasX;
        const canvasY = detail.y ?? detail.event?.canvasY;

        const state = this.dragState.get(source.getId());
        if (!state) return;

        // Validate coordinates
        if (typeof canvasX !== 'number' || typeof canvasY !== 'number' ||
            !isFinite(canvasX) || !isFinite(canvasY)) {
          return;
        }

        const deltaX = canvasX - state.startPointer[0];
        const deltaY = canvasY - state.startPointer[1];

        // Check drag threshold
        if (!state.hasMoved) {
          const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          if (dist < this.opts.dragThreshold!) {
            return;
          }
          state.hasMoved = true;
        }

        // Calculate new position
        let newX = state.startPos[0] + deltaX;
        let newY = state.startPos[1] + deltaY;

        // Apply grid snapping if enabled
        if (this.opts.snapToGrid!) {
          newX = Math.round(newX / this.opts.gridSize!) * this.opts.gridSize!;
          newY = Math.round(newY / this.opts.gridSize!) * this.opts.gridSize!;
        }

        // Store pending move (will be applied via requestAnimationFrame)
        const nodeId = source.getId();
        this.pendingMoves.set(nodeId, { x: newX, y: newY });

        // Schedule update via requestAnimationFrame
        if (this.rafId === null) {
          this.rafId = requestAnimationFrame(() => {
            this._applyPendingMoves();
            this.rafId = null;
          });
        }
      } catch (err) {
        console.error('MovePlugin drag error:', err);
      }
    };

    // Handle node:dragend - cleanup
    this._onDragEnd = (e: Event) => {
      try {
        const detail = (e as any).detail || {};
        const source = detail.source || e.target;
        if (!source) return;

        // Apply final position immediately
        const nodeId = source.getId();
        const pending = this.pendingMoves.get(nodeId);
        if (pending) {
          source.setPosition(pending.x, pending.y);
          this.pendingMoves.delete(nodeId);
        }

        this.dragState.delete(nodeId);

        // Cancel any pending RAF
        if (this.rafId !== null) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
      } catch (err) {
        console.error('MovePlugin dragend error:', err);
      }
    };

    // Register event listeners on graph
    graph.addEventListener('node:dragstart', this._onDragStart);
    graph.addEventListener('node:drag', this._onDrag);
    graph.addEventListener('node:dragend', this._onDragEnd);
  }

  /**
   * Apply all pending moves (called via requestAnimationFrame)
   */
  private _applyPendingMoves(): void {
    if (this.pendingMoves.size === 0) return;

    const graph = (this.context as any).graph;
    if (!graph) return;

    // Apply all pending moves
    this.pendingMoves.forEach((pos, nodeId) => {
      try {
        const node = graph.getNodeById?.(nodeId);
        if (node) {
          node.setPosition(pos.x, pos.y);
        }
      } catch (e) {
        console.error('MovePlugin: Error moving node', { nodeId, pos, error: e });
      }
    });

    this.pendingMoves.clear();
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    // Cancel any pending RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (!this.context) return;
    const graph = (this.context as any).graph;

    if (this._onDragStart) {
      graph.removeEventListener('node:dragstart', this._onDragStart);
      this._onDragStart = null;
    }
    if (this._onDrag) {
      graph.removeEventListener('node:drag', this._onDrag);
      this._onDrag = null;
    }
    if (this._onDragEnd) {
      graph.removeEventListener('node:dragend', this._onDragEnd);
      this._onDragEnd = null;
    }

    this.dragState.clear();
    this.pendingMoves.clear();
  }
}
