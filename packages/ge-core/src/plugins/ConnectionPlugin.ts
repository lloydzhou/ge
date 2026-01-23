/**
 * ConnectionPlugin - Event-driven connection creation
 *
 * Listens to connect:* events from Node/Port and handles edge creation.
 * This is an optional convenience layer - developers can also listen to
 * connect:* events directly for custom behavior.
 */
import type { RenderingPlugin, RenderingPluginContext } from '../types';
import { Edge } from '../core/edge/Edge';
import type { Port } from '../core/port/Port';
import type { Node } from '../core/node/Node';
import type { BaseEdgeStyleProps } from '../types';

export interface ConnectionPluginOptions {
  defaultEdgeStyle?: Partial<BaseEdgeStyleProps>;
  snapToPorts?: boolean; // snap to nearby ports during drag
  snapDistance?: number; // distance in canvas coordinates for snapping
}

export class ConnectionPlugin implements RenderingPlugin {
  name = 'connection';
  private context: RenderingPluginContext | null = null;
  private opts: ConnectionPluginOptions;
  private _onConnectStart: ((e: Event) => void) | null = null;
  private _onConnectDrag: ((e: Event) => void) | null = null;
  private _onConnectEnd: ((e: Event) => void) | null = null;

  private startEndpoint: Node | Port | null = null;
  private tempEdge: Edge | null = null;
  private virtualTarget: { getPosition(): [number, number]; setPosition(x: number, y: number): void } | null = null;

  constructor(options: ConnectionPluginOptions = {}) {
    this.opts = {
      snapToPorts: true,
      snapDistance: 10,
      ...options,
    };
  }

  /**
   * Apply plugin to graph (following Canvas's plugin.apply pattern)
   */
  apply(context: RenderingPluginContext, _runtime?: any): void {
    this.context = context;

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

    const cleanupTemp = () => {
      try {
        if (this.tempEdge && (this.context as any)?.graph) {
          (this.context as any).graph.removeChild(this.tempEdge);
        }
      } catch (err) {}
      this.tempEdge = null;
      this.virtualTarget = null;
      this.startEndpoint = null;
    };

    // Handle connect:start - start creating a connection
    this._onConnectStart = (e: any) => {
      try {
        // Clean up any existing temp edge first
        cleanupTemp();

        const { source } = e.detail;
        if (!source) return;

        this.startEndpoint = source;
        const startPos = this._computeEndpointPosition(source);

        // Create virtual target at start position
        this.virtualTarget = createVirtualEndpoint(startPos[0], startPos[1]);

        // Create temporary edge
        this.tempEdge = new Edge({
          id: `tmp-edge-${Math.random().toString(36).slice(2, 9)}`,
          source: this.startEndpoint,
          target: this.virtualTarget as any,
          style: {
            ...(this.opts.defaultEdgeStyle || {}),
            stroke: '#999',
            lineDash: [5, 5],
          } as any
        });

        try {
          if ((this.context as any)?.graph) {
            (this.context as any).graph.appendChild(this.tempEdge);
            this.tempEdge.connectTo(this.startEndpoint, this.virtualTarget as any);
          }
        } catch (err) {
          cleanupTemp();
        }
      } catch (err) {
        // ignore
      }
    };

    // Handle connect:drag - update temp edge endpoint position
    this._onConnectDrag = (e: any) => {
      try {
        if (!this.tempEdge || !this.virtualTarget) return;

        const { x, y } = e.detail;

        // Optionally snap to nearby ports
        let targetX = x;
        let targetY = y;

        if (this.opts.snapToPorts) {
          const snapResult = this._findSnapTarget(x, y);
          if (snapResult) {
            targetX = snapResult[0];
            targetY = snapResult[1];
          }
        }

        this.virtualTarget.setPosition(targetX, targetY);
        this.tempEdge.updatePositionFromNodes();
      } catch (err) {
        // ignore
      }
    };

    // Handle connect:end - finish connection
    this._onConnectEnd = (e: any) => {
      try {
        if (!this.startEndpoint) {
          cleanupTemp();
          return;
        }

        let target = e.detail.target;

        // If target not provided in event, try to find one at current position
        if (!target) {
          const x = e.detail.x;
          const y = e.detail.y;
          if (typeof x === 'number' && typeof y === 'number') {
            target = this._findTargetAt(x, y);
          }
        }

        // If still no target, just cleanup
        if (!target) {
          cleanupTemp();
          return;
        }

        // Don't allow self-connection
        if (target === this.startEndpoint) {
          cleanupTemp();
          return;
        }

        // Check if target accepts connection
        const canConnect = this._canConnectTo(this.startEndpoint, target);
        if (!canConnect) {
          cleanupTemp();
          return;
        }

        // Create the actual edge
        const edge = new Edge({
          id: `edge-${Math.random().toString(36).slice(2, 9)}`,
          source: this.startEndpoint,
          target: target,
          style: {
            ...(this.opts.defaultEdgeStyle || {}),
          }
        });

        if ((this.context as any)?.graph) {
          try {
            (this.context as any).graph.appendChild(edge);
            edge.connectTo(this.startEndpoint as any, target as any);
          } catch (err) {
            // ignore
          }
        }
      } catch (err) {
        // ignore
      } finally {
        cleanupTemp();
      }
    };

    // Attach event listeners to graph
    try {
      ((this.context as any).graph as any).addEventListener('connect:start', this._onConnectStart as EventListener);
      ((this.context as any).graph as any).addEventListener('connect:drag', this._onConnectDrag as EventListener);
      ((this.context as any).graph as any).addEventListener('connect:end', this._onConnectEnd as EventListener);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Clean up plugin (following Canvas's plugin.destroy pattern)
   */
  destroy(): void {
    try {
      if ((this.context as any)?.graph) {
        ((this.context as any).graph as any).removeEventListener('connect:start', this._onConnectStart as EventListener);
        ((this.context as any).graph as any).removeEventListener('connect:drag', this._onConnectDrag as EventListener);
        ((this.context as any).graph as any).removeEventListener('connect:end', this._onConnectEnd as EventListener);
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
    this.startEndpoint = null;
    this.tempEdge = null;
    this.virtualTarget = null;
    this._onConnectStart = null;
    this._onConnectDrag = null;
    this._onConnectEnd = null;
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

      // For Node, get position and add offset for center
      if (typeof endpoint.getPosition === 'function') {
        const [x, y] = endpoint.getPosition();
        if (typeof endpoint.getPrimaryShape === 'function') {
          const shape = endpoint.getPrimaryShape();
          if (shape?.style) {
            if (shape.nodeName === 'circle' || shape.nodeName === 'ellipse') {
              return [x + (shape.style.cx || 0), y + (shape.style.cy || 0)];
            } else if (shape.nodeName === 'rect') {
              const w = shape.style.width || 0;
              const h = shape.style.height || 0;
              return [x + w / 2, y + h / 2];
            }
          }
        }
        return [x, y];
      }
    } catch (e) {}
    return [0, 0];
  }

  /**
   * Find nearby port/node for snapping
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
            if (port === this.startEndpoint) continue;

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
            if (port === this.startEndpoint) continue;

            const pos = typeof port.getAbsolutePosition === 'function'
              ? port.getAbsolutePosition()
              : [0, 0];

            const dist = Math.sqrt((x - pos[0]) ** 2 + (y - pos[1]) ** 2);
            if (dist <= snapDistance) {
              // Check if port accepts connection
              if (this._canConnectTo(this.startEndpoint!, port)) {
                return port;
              }
            }
          }
        }
      }

      // If no port found, check nodes (for node-to-node connections)
      for (const node of nodes || []) {
        if (node === this.startEndpoint) continue;

        const pos = this._computeEndpointPosition(node);
        const dist = Math.sqrt((x - pos[0]) ** 2 + (y - pos[1]) ** 2);
        if (dist <= snapDistance) {
          // Check if node accepts connection
          if (this._canConnectTo(this.startEndpoint!, node)) {
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
