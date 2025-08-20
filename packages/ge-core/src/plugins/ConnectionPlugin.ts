import type { Graph } from '../core/Graph';
import { Edge } from '../core/edge/Edge';
import type { Port } from '../core/port/Port';
import type { Node } from '../core/node/Node';

export interface ConnectionPluginOptions {
  defaultEdgeStyle?: any;
  pickRadius?: number; // radius in canvas coordinates for picking endpoints
}

export class ConnectionPlugin {
  public name = 'connection';
  private graph: Graph | null = null;
  private opts: ConnectionPluginOptions;
  private _onPointerDown: any = null;
  private _onPointerUp: any = null;
  private _onPointerMove: any = null;
  private startEndpoint: Node | Port | null = null;
  private tempEdge: Edge | null = null;
  private virtualTarget: any = null; // virtual endpoint object
  private startPos: [number, number] | null = null;

  constructor(options: ConnectionPluginOptions = {}) {
    this.opts = options;
  }

  install(graph: Graph) {
    this.graph = graph;

    // Virtual endpoint factory: lightweight object with position methods
    const createVirtualEndpoint = (x = 0, y = 0) => {
      let vx = x;
      let vy = y;
      return {
        // used by Edge to query target coordinates
        getAbsolutePosition() {
          return [vx, vy];
        },
        getPosition() {
          return [vx, vy];
        },
        // plugin will call this to update pointer follow
        setPosition(nx: number, ny: number) {
          vx = nx;
          vy = ny;
        },
      };
    };

    const cleanupTemp = () => {
      try {
        if (this.tempEdge && this.graph) this.graph.removeChild(this.tempEdge);
      } catch (err) {}
      this.tempEdge = null;
      this.virtualTarget = null;
      this.startEndpoint = null;
      this.startPos = null;
      
      // Restore text selection
      this._restoreTextSelection();
    };

    this._onPointerDown = (e: any) => {
      try {
        const pick = this._pickEndpointFromEvent(e);
        if (pick && typeof (pick as any).then === 'function') {
          // async result
          (pick as unknown as Promise<any>).then((endpoint) => {
            try {
              if (!endpoint) return;
              this.startEndpoint = endpoint;
              this.startPos = this._computeEndpointPosition(endpoint);
              this.virtualTarget = createVirtualEndpoint(this.startPos[0], this.startPos[1]);
              this.tempEdge = new Edge({
                id: `tmp-edge-${Math.random().toString(36).slice(2, 9)}`,
                source: this.startEndpoint,
                target: this.virtualTarget,
                style: {
                  ...(this.opts.defaultEdgeStyle || {}),
                }
              });
              if (this.graph) this.graph.appendChild(this.tempEdge);
              try { this.tempEdge.connectTo(this.startEndpoint, this.virtualTarget); } catch (e) {}
              
              // Prevent text selection during connection
              this._preventTextSelection();
            } catch (err) {
              // ignore
            }
          }).catch(() => {});
           return;
         }

        const endpoint = pick as any;
        if (endpoint) {
          this.startEndpoint = endpoint;
          // compute start position
          this.startPos = this._computeEndpointPosition(endpoint);

          // create virtual target at same position initially
          this.virtualTarget = createVirtualEndpoint(this.startPos[0], this.startPos[1]);

          // create temporary Edge using Edge (reuses Edge rendering and logic)
          this.tempEdge = new Edge({
            id: `tmp-edge-${Math.random().toString(36).slice(2, 9)}`,
            source: this.startEndpoint,
            target: this.virtualTarget,
            style: {
              ...(this.opts.defaultEdgeStyle || {}),
            }
          });

          try {
            if (this.graph) this.graph.appendChild(this.tempEdge);
            // ensure geometry is initialized
            this.tempEdge.connectTo(this.startEndpoint, this.virtualTarget);
          } catch (err) {
            console.error && console.error('[connection] failed create tempEdge', err);
          }
          
          // Prevent text selection during connection
          this._preventTextSelection();
        }
      } catch (err) {
        // ignore
      }
    };

    this._onPointerMove = (e: any) => {
      try {
        if (!this.tempEdge || !this.virtualTarget) return;

        // compute pointer position in canvas coordinates
        let px = e.x ?? e.canvasX ?? e.clientX;
        let py = e.y ?? e.canvasY ?? e.clientY;

        if ((px === undefined || py === undefined) && this.graph) {
          try {
            const container = (this.graph as any).options?.container || (this.graph as any).container || null;
            if (container) {
              const rect = container.getBoundingClientRect();
              px = (e.clientX ?? 0) - rect.left;
              py = (e.clientY ?? 0) - rect.top;
            }
          } catch (err) {}
        }

        if (typeof px === 'number' && typeof py === 'number') {
          // update virtual endpoint and tell tempEdge to recalc
          try {
            this.virtualTarget.setPosition(px, py);
            // Edge.updatePositionFromNodes is internal but available; call to refresh geometry
            this.tempEdge.updatePositionFromNodes();
          } catch (err) {
            // ignore
          }
        }
      } catch (err) {
        // ignore
      }
    };

    this._onPointerUp = (e: any) => {
      try {
        if (!this.startEndpoint) return;

        const pick = this._pickEndpointFromEvent(e);
        if (pick && typeof (pick as any).then === 'function') {
          // async endpoint resolution
          (pick as unknown as Promise<any>).then((endpoint) => {
            try {
              if (!endpoint) {
                cleanupTemp();
                return;
              }
              if (endpoint === this.startEndpoint) {
                cleanupTemp();
                return;
              }

              try {
                if (typeof (this.startEndpoint as any).updatePosition === 'function') (this.startEndpoint as any).updatePosition();
                if (typeof (endpoint as any).updatePosition === 'function') (endpoint as any).updatePosition();
              } catch (err) {}

              const edge = new Edge({
                id: `edge-${Math.random().toString(36).slice(2, 9)}`,
                source: this.startEndpoint,
                target: endpoint,
                style: {
                  ...(this.opts.defaultEdgeStyle || {}),
                }
              });

              if (this.graph) {
                try { this.graph.appendChild(edge); } catch (err) { console.error && console.error('[connection] appendChild failed', err); }
                try { if (typeof (this.startEndpoint as any).updatePosition === 'function') (this.startEndpoint as any).updatePosition(); if (typeof (endpoint as any).updatePosition === 'function') (endpoint as any).updatePosition(); } catch (err) {}
                try { edge.connectTo(this.startEndpoint, endpoint); } catch (err) { console.error && console.error('[connection] connectTo failed', err); }
              }
            } catch (err) {
              // ignore
            } finally {
              cleanupTemp();
            }
          }).catch(() => { cleanupTemp(); });

          return;
        }

        // synchronous path
        const endpoint = pick as any;
        if (!endpoint) {
          cleanupTemp();
          return;
        }
        if (endpoint === this.startEndpoint) {
          cleanupTemp();
          return;
        }

        try {
          if (typeof (this.startEndpoint as any).updatePosition === 'function') (this.startEndpoint as any).updatePosition();
          if (typeof (endpoint as any).updatePosition === 'function') (endpoint as any).updatePosition();
        } catch (err) {}

        const edge = new Edge({
          id: `edge-${Math.random().toString(36).slice(2, 9)}`,
          source: this.startEndpoint,
          target: endpoint,
          style: {
            ...(this.opts.defaultEdgeStyle || {}),
          }
        });

        if (this.graph) {
          try { this.graph.appendChild(edge); } catch (err) { console.error && console.error('[connection] appendChild failed', err); }
          try { if (typeof (this.startEndpoint as any).updatePosition === 'function') (this.startEndpoint as any).updatePosition(); if (typeof (endpoint as any).updatePosition === 'function') (endpoint as any).updatePosition(); } catch (err) {}
          try { edge.connectTo(this.startEndpoint, endpoint); } catch (err) { console.error && console.error('[connection] connectTo failed', err); }
        }

        cleanupTemp();
      } catch (err) {
        // ignore
      }
    };

    // Attach listeners to graph
    try {
      (this.graph as any).addEventListener('pointerdown', this._onPointerDown as EventListener);
      (this.graph as any).addEventListener('pointermove', this._onPointerMove as EventListener);
      (this.graph as any).addEventListener('pointerup', this._onPointerUp as EventListener);
    } catch (e) {
      // ignore
    }
  }

  uninstall(graph: Graph) {
    // parameter included for API symmetry
    void graph;
    try {
      if (this.graph) {
        (this.graph as any).removeEventListener('pointerdown', this._onPointerDown as EventListener);
        (this.graph as any).removeEventListener('pointermove', this._onPointerMove as EventListener);
        (this.graph as any).removeEventListener('pointerup', this._onPointerUp as EventListener);
      }
    } catch (e) {
      // ignore
    }
    // remove temp edge if any
    try {
      if (this.tempEdge && this.graph) this.graph.removeChild(this.tempEdge);
    } catch (err) {}
    
    // Reset all properties to initial state
    this.graph = null;
    this.startEndpoint = null;
    this.tempEdge = null;
    this.virtualTarget = null;
    this.startPos = null;
    this._onPointerDown = null;
    this._onPointerUp = null;
    this._onPointerMove = null;
    
    // Restore text selection
    this._restoreTextSelection();
  }

  private _computeEndpointPosition(endpoint: any): [number, number] {
    try {
      if (!endpoint) return [0, 0];
      if (typeof endpoint.getAbsolutePosition === 'function') return endpoint.getAbsolutePosition();
      if (typeof endpoint.getPrimaryShape === 'function') {
        const shape = endpoint.getPrimaryShape();
        const [nodeX, nodeY] = endpoint.getPosition();
        if (shape && shape.style) {
          // 对于所有节点类型，都返回节点中心位置
          // Edge 类会在 getNodeEdgePoint 中计算准确的边缘交点
          if (shape.nodeName === 'circle' || shape.nodeName === 'ellipse') {
            const cx = shape.style.cx || 0;
            const cy = shape.style.cy || 0;
            return [nodeX + cx, nodeY + cy];
          } else if (shape.nodeName === 'rect') {
            const x = shape.style.x || 0;
            const y = shape.style.y || 0;
            const width = shape.style.width || 0;
            const height = shape.style.height || 0;
            return [nodeX + x + width / 2, nodeY + y + height / 2];
          }
        }
        // 其他形状返回节点中心
        return [nodeX, nodeY];
      }
    } catch (e) {}
    return [0, 0];
  }

  // Helper: get pointer position relative to graph container/canvas
  private _getPointerPos(e: any): [number, number] {
    let px = e.x ?? e.canvasX ?? e.clientX;
    let py = e.y ?? e.canvasY ?? e.clientY;
    return [px, py];
  }

  // Helper: pick endpoint using only g-lite elementsFromBBox with a small search box around pointer
  private _pickEndpointFromEvent(e: any): Node | Port | null | Promise<Node | Port | null> {
    try {
      if (!this.graph) return null;
      const [px, py] = this._getPointerPos(e);
      const doc = (this.graph as any).document;
      if (!doc || typeof (doc as any).elementsFromBBox !== 'function') return null;

      const r = this.opts.pickRadius || 2; // pick radius in canvas coords
      const maybe: any = (doc as any).elementsFromBBox(px - r, py - r, px + r, py + r);

      const pickFromArray = (elems: any[]): Node | Port | null => {
        // Prefer Port over Node
        for (const el of elems || []) {
          const ctor = (el && (el.className || el.constructor?.name)) || '';
          if (ctor === 'g-edge' || String(el.constructor?.name).toLowerCase().includes('edge')) continue;
          if (typeof el.getAbsolutePosition === 'function') return el as Port;
          if (typeof el.getPortById === 'function' || typeof el.getPorts === 'function' || typeof el.createPort === 'function') return el as Node;
        }
        return null;
      };

      if (maybe && typeof (maybe as any).then === 'function') {
        // async result
        return (maybe as Promise<any[]>).then((elems) => pickFromArray(elems || [])).catch(() => null);
      }

      const elems: any[] = (maybe as any[]) || [];
      return pickFromArray(elems);
    } catch (e) {}
    return null;
  }
  
  // Prevent text selection during connection
  private _preventTextSelection() {
    try {
      if (this.graph) {
        // Try to get container from graph config
        const config = (this.graph as any).getConfig?.();
        const container = config?.container;
        if (container) {
          if (typeof container === 'string') {
            // container is a selector string
            const element = document.querySelector(container);
            if (element) {
              (element as any).style.userSelect = 'none';
              (element as any).style.webkitUserSelect = 'none';
              (element as any).style.MozUserSelect = 'none';
              (element as any).style.msUserSelect = 'none';
            }
          } else if (container instanceof HTMLElement) {
            // container is an HTMLElement
            (container as any).style.userSelect = 'none';
            (container as any).style.webkitUserSelect = 'none';
            (container as any).style.MozUserSelect = 'none';
            (container as any).style.msUserSelect = 'none';
          }
        } else {
          // Try to get container from document
          const doc = (this.graph as any).document;
          if (doc && doc.ownerDocument && doc.ownerDocument.body) {
            (doc.ownerDocument.body as any).style.userSelect = 'none';
            (doc.ownerDocument.body as any).style.webkitUserSelect = 'none';
            (doc.ownerDocument.body as any).style.MozUserSelect = 'none';
            (doc.ownerDocument.body as any).style.msUserSelect = 'none';
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
  
  // Restore text selection after connection
  private _restoreTextSelection() {
    try {
      if (this.graph) {
        // Try to get container from graph config
        const config = (this.graph as any).getConfig?.();
        const container = config?.container;
        if (container) {
          if (typeof container === 'string') {
            // container is a selector string
            const element = document.querySelector(container);
            if (element) {
              (element as any).style.userSelect = '';
              (element as any).style.webkitUserSelect = '';
              (element as any).style.MozUserSelect = '';
              (element as any).style.msUserSelect = '';
            }
          } else if (container instanceof HTMLElement) {
            // container is an HTMLElement
            (container as any).style.userSelect = '';
            (container as any).style.webkitUserSelect = '';
            (container as any).style.MozUserSelect = '';
            (container as any).style.msUserSelect = '';
          }
        } else {
          // Try to get container from document
          const doc = (this.graph as any).document;
          if (doc && doc.ownerDocument && doc.ownerDocument.body) {
            (doc.ownerDocument.body as any).style.userSelect = '';
            (doc.ownerDocument.body as any).style.webkitUserSelect = '';
            (doc.ownerDocument.body as any).style.MozUserSelect = '';
            (doc.ownerDocument.body as any).style.msUserSelect = '';
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}
