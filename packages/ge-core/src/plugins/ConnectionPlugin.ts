/**
 * ConnectionPlugin - Connection creation using g-plugin-dragndrop events
 *
 * Listens to g-plugin-dragndrop's dragstart/drag/drop events and handles edge creation.
 * Uses linkable/linkto style properties to determine connection behavior.
 */
import type { RenderingPlugin, RenderingPluginContext } from '../types';
import { Edge } from '../core/edge/Edge';
import type { Port } from '../core/port/Port';
import type { Node } from '../core/node/Node';
import type { BaseEdgeStyleProps } from '../types';
import { Plugin as DragndropPlugin } from '@antv/g-plugin-dragndrop';

export interface ConnectionPluginOptions {
  defaultEdgeStyle?: Partial<BaseEdgeStyleProps>;
  snapToPorts?: boolean;
  snapDistance?: number;
  validateConnection?: (source: Node | Port, target: Node | Port) => boolean;
  /** g-plugin-dragndrop options (if not already registered by MovePlugin) */
  dragndrop?: {
    overlap?: 'pointer' | 'center';
    dragstartDistanceThreshold?: number;
    dragstartTimeThreshold?: number;
  };
}

export class ConnectionPlugin implements RenderingPlugin {
  name = 'connection';
  private context: RenderingPluginContext | null = null;
  private opts: ConnectionPluginOptions;

  private currentSource: Node | Port | null = null;
  private tempEdge: Edge | null = null;
  private virtualTarget: { getPosition(): [number, number]; setPosition(x: number, y: number): void } | null = null;
  private edgeCreated = false; // Flag to track if edge was successfully created
  private snappedTarget: Node | Port | null = null; // Last snapped target (when magnet effect triggered)

  private _onDragStart: ((e: Event) => void) | null = null;
  private _onDrag: ((e: Event) => void) | null = null;
  private _onDrop: ((e: Event) => void) | null = null;
  private _onDragEnd: ((e: Event) => void) | null = null;

  // Saved userSelect value from container
  private _savedUserSelect: string | null = null;

  // Helper: Check if g-plugin-dragndrop is already registered
  private _isDragndropRegistered(renderer: any): boolean {
    if (!renderer?.plugins) return false;
    return renderer.plugins.some((p: any) =>
      p?.constructor?.name === 'DragndropPlugin' ||
      p?.name === 'dragndrop'
    );
  }

  constructor(options: ConnectionPluginOptions = {}) {
    this.opts = {
      snapToPorts: true,
      snapDistance: 10,
      ...options,
    };
  }

  apply(context: RenderingPluginContext, _runtime?: any): void {
    this.context = context;
    const graph = (context as any).graph;

    // ========================================
    // Ensure g-plugin-dragndrop is registered
    // ========================================
    try {
      const renderer = (graph as any).renderer;
      if (renderer && !this._isDragndropRegistered(renderer)) {
        // Register with default options if MovePlugin hasn't registered it yet
        const dragndropPlugin = new DragndropPlugin({
          overlap: 'pointer',
          dragstartDistanceThreshold: 5,
          dragstartTimeThreshold: 200,
          ...(this.opts.dragndrop || {}),
        });
        renderer.registerPlugin(dragndropPlugin);
      }
    } catch (e) {
      console.warn('[ConnectionPlugin] Failed to ensure g-plugin-dragndrop:', e);
    }

    // Virtual endpoint factory: lightweight object with position methods
    const createVirtualEndpoint = (x = 0, y = 0) => {
      let vx = x;
      let vy = y;
      return {
        getAbsolutePosition(): [number, number] {
          return [vx, vy];
        },
        getPosition(): [number, number] {
          return [vx, vy];
        },
        setPosition(nx: number, ny: number) {
          vx = nx;
          vy = ny;
        },
      };
    };

    const cleanup = () => {
      try {
        if (this.tempEdge && graph) {
          graph.removeChild(this.tempEdge);
        }
      } catch (err) {}
      this.tempEdge = null;
      this.virtualTarget = null;
      this.currentSource = null;
      this.snappedTarget = null;
      this.edgeCreated = false;
    };

    // Handle dragstart from linkable elements
    this._onDragStart = (e: Event) => {
      // Prevent text selection during connection operations
      const container = graph.context?.config?.container;
      const domContainer = typeof container === 'string'
        ? document.querySelector(container) as HTMLElement
        : container as HTMLElement;
      if (domContainer && this._savedUserSelect === null) {
        this._savedUserSelect = domContainer.style.userSelect;
        domContainer.style.userSelect = 'none';
      }

      // @ts-ignore
      const path = (e as any).path || (e as any).composedPath?.() || [];

      const target = e.target as Node | Port;

      // Check if there's a linkable element in the event path
      // Only check style properties (setAttribute may not work in @antv/g-lite)
      const linkableElement = path.find((p: any) => {
        const linkable = p?.style?.linkable;
        return linkable === true;
      });

      if (linkableElement) {
        // Stop propagation - we're handling this for connection
        e.stopPropagation();
        cleanup();
        this.currentSource = linkableElement;
        const startPos = this._computeEndpointPosition(linkableElement);
        this.virtualTarget = createVirtualEndpoint(startPos[0], startPos[1]);
        this.tempEdge = new Edge({
          id: `tmp-edge-${Date.now()}`,
          source: this.currentSource,
          target: this.virtualTarget as any,
          style: {
            ...(this.opts.defaultEdgeStyle || {}),
            stroke: '#999',
            strokeDasharray: [5, 5],
          } as any
        });
        try {
          if (graph) {
            graph.appendChild(this.tempEdge);
            this.tempEdge.connectTo(this.currentSource as any, this.virtualTarget as any);
          }
        } catch (err) {
          cleanup();
        }
        return;
      }

      // Don't cleanup, just return - let other plugins (like MovePlugin) handle it
    };

    // Handle drag from linkable elements
    this._onDrag = (e: Event) => {
      if (!this.tempEdge || !this.virtualTarget || !this.currentSource) return;

      const { canvasX, canvasY } = e as any;

      // Optionally snap to nearby ports
      let targetX = canvasX;
      let targetY = canvasY;

      if (this.opts.snapToPorts) {
        const snapResult = this._findSnapTarget(canvasX, canvasY);
        if (snapResult) {
          targetX = snapResult[0];
          targetY = snapResult[1];
          // Record the actual snapped target (not just position)
          this.snappedTarget = this._findTargetAt(targetX, targetY);
        } else {
          this.snappedTarget = null;
        }
      }

      this.virtualTarget.setPosition(targetX, targetY);
      this.tempEdge.updatePositionFromNodes();

      // Also stop propagation in drag phase to prevent Node movement
      e.stopPropagation();
    };

    // Handle drop on linkto elements
    this._onDrop = (e: Event) => {
      if (!this.currentSource) {
        cleanup();
        return;
      }

      // Use snapped target if available (magnet effect was triggered)
      // Otherwise, try to find target at drop position
      let target = this.snappedTarget;

      if (!target) {
        const { canvasX, canvasY } = e as any;
        if (typeof canvasX === 'number' && typeof canvasY === 'number') {
          target = this._findTargetAt(canvasX, canvasY);
        }
      }

      if (!target) {
        cleanup();
        return;
      }

      // Don't allow self-connection
      if (target === this.currentSource) {
        cleanup();
        return;
      }

      // Create the actual edge
      const edge = new Edge({
        id: `edge-${Date.now()}`,
        source: this.currentSource,
        target: target,
        style: {
          ...(this.opts.defaultEdgeStyle || {}),
        }
      });

      try {
        if (graph) {
          graph.appendChild(edge);
          edge.connectTo(this.currentSource as any, target as any);
          this.edgeCreated = true;
        }
      } catch (err) {
        console.error('[ConnectionPlugin] Error creating edge:', err);
      }

      cleanup();
    };

    // Handle dragend - create edge if we have a snapped target
    // This handles the case where drop event doesn't fire (mouse released on canvas, not on target)
    this._onDragEnd = (e: Event) => {
      // Restore userSelect on container
      const container = graph.context?.config?.container;
      const domContainer = typeof container === 'string'
        ? document.querySelector(container) as HTMLElement
        : container as HTMLElement;
      if (domContainer && this._savedUserSelect !== null) {
        domContainer.style.userSelect = this._savedUserSelect;
        this._savedUserSelect = null;
      }

      // If drop handler already created the edge, just cleanup
      if (this.edgeCreated) {
        cleanup();
        return;
      }

      // If we have a snapped target (magnet effect), create the edge here
      // This handles the case where mouse is released on canvas (not on target element)
      if (this.snappedTarget && this.currentSource) {
        const target = this.snappedTarget;

        // Don't allow self-connection
        if (target === this.currentSource) {
          cleanup();
          return;
        }

        // Create the actual edge
        const edge = new Edge({
          id: `edge-${Date.now()}`,
          source: this.currentSource,
          target: target,
          style: {
            ...(this.opts.defaultEdgeStyle || {}),
          }
        });

        try {
          if (graph) {
            graph.appendChild(edge);
            edge.connectTo(this.currentSource as any, target as any);
            this.edgeCreated = true;
          }
        } catch (err) {
          console.error('[ConnectionPlugin] Error creating edge:', err);
        }

        cleanup();
        return;
      }

      cleanup();
    };

    // Listen to g-plugin-dragndrop events on graph with capture=true
    // Use event delegation - check target's style properties
    // capture=true ensures we handle events in capture phase, before they bubble to parent elements
    try {
      graph.addEventListener('dragstart', this._onDragStart as EventListener, { capture: true });
      graph.addEventListener('drag', this._onDrag as EventListener, { capture: true });
      graph.addEventListener('drop', this._onDrop as EventListener, { capture: true });
      graph.addEventListener('dragend', this._onDragEnd as EventListener, { capture: true });
    } catch (e) {
      // ignore
    }
  }

  destroy(): void {
    try {
      if ((this.context as any)?.graph) {
        const graph = (this.context as any).graph;
        // Must use same capture option as addEventListener
        graph.removeEventListener('dragstart', this._onDragStart as EventListener, { capture: true });
        graph.removeEventListener('drag', this._onDrag as EventListener, { capture: true });
        graph.removeEventListener('drop', this._onDrop as EventListener, { capture: true });
        graph.removeEventListener('dragend', this._onDragEnd as EventListener, { capture: true });
      }
    } catch (e) {
      // ignore
    }

    // Remove temp edge if any
    try {
      if (this.tempEdge && (this.context as any)?.graph) {
        (this.context as any).graph.removeChild(this.tempEdge);
      }
    } catch (err) {}

    // Reset all properties
    this.context = null;
    this.currentSource = null;
    this.tempEdge = null;
    this.virtualTarget = null;
    this.snappedTarget = null;
    this._onDragStart = null;
    this._onDrag = null;
    this._onDrop = null;
    this._onDragEnd = null;
    this.edgeCreated = false;
  }

  /**
   * Compute endpoint position in canvas coordinates
   */
  private _computeEndpointPosition(endpoint: any): [number, number] {
    try {
      if (!endpoint) return [0, 0];

      // Try getAbsolutePosition first (Port has this)
      if (typeof endpoint.getAbsolutePosition === 'function') {
        return endpoint.getAbsolutePosition();
      }

      // For other elements, get position directly
      if (typeof endpoint.getPosition === 'function') {
        return endpoint.getPosition();
      }
    } catch (e) {}
    return [0, 0];
  }

  /**
   * Find nearby port/node for snapping
   * Only considers elements with linkto=true (can accept connections)
   */
  private _findSnapTarget(x: number, y: number): [number, number] | null {
    try {
      if (!(this.context as any)?.graph) return null;

      const graph = (this.context as any).graph;
      const snapDistance = this.opts.snapDistance || 10;

      // Check all ports
      const nodes = graph.getNodes ? graph.getNodes() : [];
      for (const node of nodes || []) {
        if (typeof node.getPorts === 'function') {
          for (const port of node.getPorts()) {
            if (port === this.currentSource) continue;

            // Only snap to elements with linkto=true
            if (!(port as any).style?.linkto) continue;

            const pos = typeof port.getAbsolutePosition === 'function'
              ? port.getAbsolutePosition()
              : [0, 0];

            const dist = Math.sqrt((x - pos[0]) ** 2 + (y - pos[1]) ** 2);
            if (dist <= snapDistance) {
              return pos;
            }
          }
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Find a valid connection target at the given position
   * Only considers elements with linkto=true (can accept connections)
   */
  private _findTargetAt(x: number, y: number): Node | Port | null {
    try {
      if (!(this.context as any)?.graph) return null;

      const graph = (this.context as any).graph;
      const snapDistance = this.opts.snapDistance || 10;

      // Check all ports first (prefer ports over nodes)
      const nodes = graph.getNodes ? graph.getNodes() : [];
      for (const node of nodes || []) {
        if (typeof node.getPorts === 'function') {
          for (const port of node.getPorts()) {
            if (port === this.currentSource) continue;

            // Only target elements with linkto=true
            if (!(port as any).style?.linkto) continue;

            const pos = typeof port.getAbsolutePosition === 'function'
              ? port.getAbsolutePosition()
              : [0, 0];

            const dist = Math.sqrt((x - pos[0]) ** 2 + (y - pos[1]) ** 2);
            if (dist <= snapDistance) {
              // Check if port accepts connection
              if (this._canConnectTo(this.currentSource!, port)) {
                return port;
              }
            }
          }
        }
      }

      // If no port found, check nodes (for node-to-node connections)
      for (const node of nodes || []) {
        if (node === this.currentSource) continue;

        // Only target nodes with linkto=true
        if (!(node as any).style?.linkto) continue;

        const pos = this._computeEndpointPosition(node);
        const dist = Math.sqrt((x - pos[0]) ** 2 + (y - pos[1]) ** 2);
        if (dist <= snapDistance) {
          // Check if node accepts connection
          if (this._canConnectTo(this.currentSource!, node)) {
            return node;
          }
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Check if connection between source and target is allowed
   */
  private _canConnectTo(source: Node | Port, target: Node | Port): boolean {
    try {
      // Check if target has targetConnectable config
      if (typeof (target as any).getData === 'function') {
        const data = (target as any).getData();
        const targetConnectable = data?.targetConnectable;

        if (typeof targetConnectable === 'boolean') {
          return targetConnectable;
        }

        if (targetConnectable?.enabled === false) {
          return false;
        }
      }

      // Check if source has connectable validation
      if (typeof (source as any).getData === 'function') {
        const data = (source as any).getData();
        const connectable = data?.connectable;

        if (typeof connectable === 'function') {
          return connectable(source, target) !== false;
        }

        if (connectable === false) {
          return false;
        }
      }

      return true;
    } catch (e) {
      return true;
    }
  }
}
