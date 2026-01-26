/**
 * MovePlugin - 拖拽功能（节点移动 + 画布平移）
 *
 * 1. 注册 g-plugin-dragndrop 插件
 * 2. 监听 drag 事件移动节点
 * 3. 监听文档级别拖拽实现画布平移
 *
 * Uses requestAnimationFrame for smooth 60fps updates.
 */
import type { RenderingPlugin, RenderingPluginContext } from '../types';
import type { Node } from '../core/node/Node';
import { Plugin as DragndropPlugin } from '@antv/g-plugin-dragndrop';

export interface MovePluginOptions {
  /** Enable grid snapping */
  snapToGrid?: boolean;
  /** Grid size in pixels */
  gridSize?: number;
  /** g-plugin-dragndrop options */
  dragndrop?: {
    overlap?: 'pointer' | 'center';
    dragstartDistanceThreshold?: number;
    dragstartTimeThreshold?: number;
  };
}

export class MovePlugin implements RenderingPlugin {
  name = 'move';
  private context: RenderingPluginContext | null = null;
  private opts: MovePluginOptions;
  private _onDrag: ((e: Event) => void) | null = null;
  private _onNodeDragStart: ((e: Event) => void) | null = null;
  private _onDocumentDrag: ((e: Event) => void) | null = null;

  // Drag event handlers for cursor updates
  private _onDragStart: ((e: Event) => void) | null = null;
  private _onDragEnd: ((e: Event) => void) | null = null;

  // Saved userSelect value from container (saved during dragstart, restored in dragend)
  private _savedUserSelect: string | null = null;

  // Helper: Check if g-plugin-dragndrop is already registered
  private _isDragndropRegistered(renderer: any): boolean {
    if (!renderer?.plugins) return false;
    return renderer.plugins.some((p: any) =>
      p?.constructor?.name === 'DragndropPlugin' ||
      p?.name === 'dragndrop'
    );
  }

  // requestAnimationFrame ID for throttling
  private rafId: number | null = null;
  private pendingMoves: Map<string, { x: number; y: number }> = new Map();

  private dragState: Map<string, {
    startPos: [number, number];
    offset: [number, number];  // Mouse offset from node position
    hasMoved: boolean;
  }> = new Map();

  constructor(options: MovePluginOptions = {}) {
    this.opts = {
      snapToGrid: false,
      gridSize: 10,
      dragndrop: {
        overlap: 'pointer',
        dragstartDistanceThreshold: 5,
        dragstartTimeThreshold: 200,
      },
      ...options,
    };
  }

  /**
   * Apply plugin to graph (following Canvas's plugin.apply pattern)
   */
  apply(context: RenderingPluginContext, runtime?: any): void {
    this.context = context;
    const graph = (context as any).graph;

    // ========================================
    // 1. Register g-plugin-dragndrop
    // ========================================
    try {
      const renderer = (graph as any).renderer;
      if (renderer && !this._isDragndropRegistered(renderer)) {
        // Check if graph.document is draggable (for camera panning)
        const isDocumentDraggable = graph.document?.style?.draggable === true;

        const dragndropPlugin = new DragndropPlugin({
          ...this.opts.dragndrop,
          isDocumentDraggable,
        });
        renderer.registerPlugin(dragndropPlugin);
      }
    } catch (e) {
      console.warn('[MovePlugin] Failed to register g-plugin-dragndrop:', e);
    }

    // ========================================
    // 2. Handle node dragging
    // ========================================

    // Handle g-plugin-dragndrop's dragstart event
    this._onNodeDragStart = (e: Event) => {
      try {
        const target = e.target as Node;

        // Only handle elements with draggable=true (ConnectionPlugin handles linkable in capture phase)
        if (!target || !target.style?.draggable) return;

        // Skip if target is linkable (ConnectionPlugin should handle it)
        if (target.style?.linkable) return;

        const nodeId = target.getId();
        if (!nodeId) return;

        const { canvasX, canvasY } = e as any;

        // Validate coordinates
        if (typeof canvasX !== 'number' || typeof canvasY !== 'number' ||
            !isFinite(canvasX) || !isFinite(canvasY)) {
          return;
        }

        // Calculate offset from node position
        const nodePos = target.getPosition();
        const offsetX = canvasX - nodePos[0];
        const offsetY = canvasY - nodePos[1];

        this.dragState.set(nodeId, {
          startPos: [nodePos[0], nodePos[1]],
          offset: [offsetX, offsetY],
          hasMoved: false,
        });
      } catch (err) {
        console.error('MovePlugin dragstart error:', err);
      }
    };

    // Handle g-plugin-dragndrop's drag event
    this._onDrag = (e: Event) => {
      try {
        const target = e.target as Node;

        // Only handle elements with draggable=true (ConnectionPlugin handles linkable in capture phase)
        if (!target || !target.style?.draggable) return;

        // Skip if target is linkable (ConnectionPlugin should handle it)
        if (target.style?.linkable) return;

        const nodeId = target.getId();
        if (!nodeId) return;

        const { canvasX, canvasY } = e as any;

        // Validate coordinates
        if (typeof canvasX !== 'number' || typeof canvasY !== 'number' ||
            !isFinite(canvasX) || !isFinite(canvasY)) {
          return;
        }

        // Get or create drag state
        let dragInfo = this.dragState.get(nodeId);
        if (!dragInfo) {
          // Fallback: calculate offset now (shouldn't happen if dragstart fired first)
          const nodePos = target.getPosition();
          dragInfo = {
            startPos: [nodePos[0], nodePos[1]],
            offset: [canvasX - nodePos[0], canvasY - nodePos[1]],
            hasMoved: false,
          };
          this.dragState.set(nodeId, dragInfo);
        }

        // Calculate new position (keeping offset)
        let newX = canvasX - dragInfo.offset[0];
        let newY = canvasY - dragInfo.offset[1];

        // Apply grid snapping if enabled
        if (this.opts.snapToGrid!) {
          newX = Math.round(newX / this.opts.gridSize!) * this.opts.gridSize!;
          newY = Math.round(newY / this.opts.gridSize!) * this.opts.gridSize!;
        }

        // Store pending move (will be applied via requestAnimationFrame)
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

    // Listen to g-plugin-dragndrop's drag event on graph
    // Use event delegation to handle all nodes
    graph.addEventListener('dragstart', this._onNodeDragStart);
    graph.addEventListener('drag', this._onDrag);

    // Update cursor on dragstart/dragend for document dragging
    this._onDragStart = (e: Event) => {
      const target = e.target as any;

      // Prevent text selection during drag operations
      const container = graph.context?.config?.container;
      const domContainer = typeof container === 'string'
        ? document.querySelector(container) as HTMLElement
        : container as HTMLElement;
      if (domContainer && this._savedUserSelect === null) {
        this._savedUserSelect = domContainer.style.userSelect;
        domContainer.style.userSelect = 'none';
      }

      if (target === graph.document) {
        try {
          // Set cursor on canvas DOM element
          const canvas = graph.getConfig()?.container;
          if (canvas && typeof canvas === 'string') {
            const el = document.getElementById(canvas);
            if (el) el.style.cursor = 'grabbing';
          } else if (canvas instanceof HTMLElement) {
            canvas.style.cursor = 'grabbing';
          }
        } catch (err) {
          console.error('[MovePlugin] Failed to set cursor:', err);
        }
      }
    };

    this._onDragEnd = (e: Event) => {
      const target = e.target as any;

      // Restore userSelect on container
      const container = graph.context?.config?.container;
      const domContainer = typeof container === 'string'
        ? document.querySelector(container) as HTMLElement
        : container as HTMLElement;
      if (domContainer && this._savedUserSelect !== null) {
        domContainer.style.userSelect = this._savedUserSelect;
        this._savedUserSelect = null;
      }

      // Restore cursor for document dragging
      if (target === graph.document) {
        try {
          // Set cursor on canvas DOM element
          const canvas = graph.getConfig()?.container;
          if (canvas && typeof canvas === 'string') {
            const el = document.getElementById(canvas);
            if (el) el.style.cursor = 'grab';
          } else if (canvas instanceof HTMLElement) {
            canvas.style.cursor = 'grab';
          }
        } catch (err) {
          console.error('[MovePlugin] Failed to restore cursor:', err);
        }
        return;
      }

      // Handle node dragging
      // Only handle elements with draggable=true
      if (!target || !target.style?.draggable) return;

      // Skip if target doesn't have getId (e.g., Circle, Path - not a Node/Port/Edge)
      const nodeId = typeof target.getId === 'function' ? target.getId() : target.id;
      if (!nodeId) return;

      if (nodeId) {
        // Apply final position immediately
        const pending = this.pendingMoves.get(nodeId);
        if (pending) {
          target.setPosition(pending.x, pending.y);
          this.pendingMoves.delete(nodeId);
        }

        this.dragState.delete(nodeId);
      }

      // Cancel any pending RAF
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    };

    graph.addEventListener('dragstart', this._onDragStart);
    graph.addEventListener('dragend', this._onDragEnd);

    // ========================================
    // 3. Handle document dragging (camera panning)
    // ========================================
    this._onDocumentDrag = (e: Event) => {
      try {
        // Check if the drag target is the document (canvas background)
        if ((e as any).target === graph.document) {
          const camera = graph.getCamera();
          // Pan the camera in opposite direction of drag
          // Try different API methods for camera translation
          const dx = -(e as any).dx;
          const dy = -(e as any).dy;

          // Method 1: Direct property access
          if (typeof camera.x === 'number' && typeof camera.y === 'number') {
            camera.x += dx;
            camera.y += dy;
          }
          // Method 2: translate method
          else if (typeof camera.translate === 'function') {
            camera.translate(dx, dy);
          }
          // Method 3: setPosition method
          else if (typeof camera.setPosition === 'function') {
            const [x, y] = camera.getPosition();
            camera.setPosition(x + dx, y + dy);
          }
        }
      } catch (err) {
        console.error('[MovePlugin] Document drag error:', err);
      }
    };

    // Listen to drag events for camera panning
    graph.addEventListener('drag', this._onDocumentDrag);
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

    // Remove node drag listeners
    if (this._onDrag) {
      graph.removeEventListener('drag', this._onDrag);
      this._onDrag = null;
    }
    if (this._onNodeDragStart) {
      graph.removeEventListener('dragstart', this._onNodeDragStart);
      this._onNodeDragStart = null;
    }

    // Remove document drag listener
    if (this._onDocumentDrag) {
      graph.removeEventListener('drag', this._onDocumentDrag);
      this._onDocumentDrag = null;
    }

    // Remove dragstart/dragend listeners for cursor updates
    if (this._onDragStart) {
      graph.removeEventListener('dragstart', this._onDragStart);
      this._onDragStart = null;
    }
    if (this._onDragEnd) {
      graph.removeEventListener('dragend', this._onDragEnd);
      this._onDragEnd = null;
    }

    this.dragState.clear();
    this.pendingMoves.clear();
  }
}
