import { Rect, Text, DisplayObject, CustomEvent } from '@antv/g-lite';
import { resolveCtor } from '../../utils/shapeResolver';
import type { BaseNodeStyleProps, DisplayObjectConfigWithShape, NodeData, PortLayoutOptions } from '../../types';
import { Port } from '../port/Port';
import { resolveAnchorFunction } from '../../utils/nodeAnchor';
import { GEInteractiveElement } from '../GEInteractiveElement';

export interface NodeStyleProps extends BaseNodeStyleProps {
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  radius?: number;
  label?: string;
  labelFill?: string;
  labelFontSize?: number;
}

export interface NodeConfig extends NodeData {
  [key: string]: unknown;
}

export class Node<T extends DisplayObject = Rect> extends GEInteractiveElement<NodeStyleProps> {
  private primaryShape: T;
  private label: Text;
  private data: NodeConfig;
  private portsById: Map<string, Port> = new Map();

  constructor(config: NodeConfig) {
    super({
      ...config,
      className: 'g-node',
      id: config.id,
    });
    this.data = config;
    
    // Set initial position
    if (config.x !== undefined && config.y !== undefined) {
      super.setPosition(config.x, config.y);
    }

    // pass through shape to createPrimaryShape
    this.primaryShape = this.createPrimaryShape({
      ...(config as Record<string, unknown>),
      id: `${config.id}-primary`,
      shape: config.shape
    } as DisplayObjectConfigWithShape);

    // Create the node label
    this.label = new Text({
      style: {
        text: config?.style?.label || config.id,
        fill: config?.style?.labelFill || '#000',
        fontSize: config?.style?.labelFontSize || 12,
        textAlign: 'center',
        textBaseline: 'middle'
      }
    });

    // Add children to the group
    super.appendChild(this.primaryShape);
    super.appendChild(this.label);

    // Immediately position the label synchronously to avoid flashing
    try {
      this.positionLabel();
    } catch (e) {
      // ignore positioning errors
    }
  }
  
  protected createPrimaryShape(config: DisplayObjectConfigWithShape<any>): T {
    // This method should be overridden by subclasses to create the appropriate shape
    // For the base Node class, we default to Rect
    // try resolving a registered ctor from config.shape if provided
    const ptype = (config as any).shape || (this.data && this.data.shape);
    const ctor = resolveCtor(this, ptype as any);
    if (ctor) {
      try { return new ctor(config) as unknown as T; } catch (e) {}
    }
    return new Rect(config) as unknown as T;
  }
  
  /**
   * Position the label in the center of the primary shape
   * Uses DisplayObject's getLocalBounds() for consistent positioning
   */
  private positionLabel(): void {
    try {
      const shape = this.primaryShape;

      // Use getLocalBounds() from DisplayObject to get the center position
      if (typeof shape.getLocalBounds === 'function') {
        const bounds = shape.getLocalBounds();
        const centerX = (bounds.min[0] + bounds.max[0]) / 2;
        const centerY = (bounds.min[1] + bounds.max[1]) / 2;
        this.label.setLocalPosition([centerX, centerY]);
        return;
      }

      // Fallback: use style dimensions
      const nodeStyle = this.data?.style || {};
      this.label.setLocalPosition([(nodeStyle.width || 100) / 2, (nodeStyle.height || 40) / 2]);
    } catch (error) {
      // Final fallback
      const style = this.data?.style || {};
      this.label.setLocalPosition([(style.width || 100) / 2, (style.height || 40) / 2]);
    }
  }
  
  /**
   * Get the node ID
   */
  getId(): string {
    return this.data.id;
  }
  
  /**
   * Get the node data
   *
   * Note: getPosition() is provided by DisplayObject (parent class)
   * and returns [x, y] coordinates directly.
   */
  getData(): NodeConfig {
    return this.data;
  }
  
  /**
   * Get the primary shape
   */
  getPrimaryShape(): T {
    return this.primaryShape;
  }
  
  createPort(portConfig: { id?: string; layout?: PortLayoutOptions; style?: BaseNodeStyleProps; [key: string]: unknown } = {}): Port {
    const portId = portConfig.id ? String(portConfig.id) : `port-${Math.random().toString(36).slice(2, 9)}`;
    const fullId = portId.includes(':') ? portId : `${this.getId()}:${portId}`;

    const port = new Port({
      id: fullId,
      parentId: this.getId(),
      style: portConfig.style || {},
      layout: portConfig.layout,
    });
    
    port.owner = this;
    super.appendChild(port);
    this.portsById.set(fullId, port);
    return port;
  }

  getPortById(id: string): Port | undefined {
    const fullId = id.includes(':') ? id : `${this.getId()}:${id}`;
    return this.portsById.get(fullId);
  }

  /**
   * Get port by simple ID (convenience method)
   */
  getPort(portId: string): Port | undefined {
    return this.getPortById(portId);
  }

  /**
   * Get all ports of this node
   */
  getPorts(): Port[] {
    return Array.from(this.portsById.values());
  }

  removePort(id: string): void {
    const port = this.getPortById(id);
    if (port) {
      try {
        super.removeChild(port);
      } catch (e) {}
      this.portsById.delete(port.getId ? port.getId() : id);
    }
  }

  connectedCallback() {
    // Initialize interaction event listeners
    this._initInteraction();

    // Apply cursor style based on interaction capabilities
    this._applyCursorStyleTo(this.primaryShape);

    // Register with Graph
    try {
      const graph = this.ownerDocument as any;
      if (typeof graph.registerNode === 'function') {
        graph.registerNode(this as any);
      }
    } catch (e) {
      // ignore
    }
  }

  disconnectedCallback() {
    // Unregister from Graph
    try {
      const graph = this.ownerDocument as any;
      if (typeof graph.unregisterNode === 'function') {
        graph.unregisterNode(this as any);
      }
    } catch (e) {
      // ignore
    }

    // Unregister ports
    try {
      this.portsById.forEach((p) => {
        if (p && typeof p.getId === 'function') {
          // nothing special for now
        }
      });
    } catch (e) {}
  }

  // Override setPosition to emit moved event
  setPosition(position: number | [number, number] | any, y?: number, z?: number): this {
    // Call base implementation with the provided args
    try {
      super.setPosition(position as any, y as any, z as any);
    } catch (e) {
      // fallback: set properties directly
      if (typeof position === 'number' && typeof y === 'number') {
        (this as any).x = position;
        (this as any).y = y;
      }
    }

    // Normalize numeric x/y for event payload
    let xNum = 0;
    let yNum = 0;
    try {
      if (typeof position === 'number') {
        xNum = position;
        if (typeof y === 'number') yNum = y;
      } else if (Array.isArray(position)) {
        xNum = Number(position[0]) || 0;
        yNum = Number(position[1]) || 0;
      } else {
        xNum = Number((this as any).x) || 0;
        yNum = Number((this as any).y) || 0;
      }
    } catch (e) {
      xNum = Number((this as any).x) || 0;
      yNum = Number((this as any).y) || 0;
    }

    // After moving, dispatch event to self (DOM API style)
    try {
      const ev = new CustomEvent('node:moved', { detail: { id: this.getId(), x: xNum, y: yNum } });
      this.dispatchEvent(ev);
    } catch (e) {
      // ignore
    }

    // Synchronously reposition label to avoid flicker
    try {
      this.positionLabel();
    } catch (e) {
      // ignore
    }

    return this;
  }
  
  /**
   * Compute a point on or around the primary shape according to a PortLayoutOptions.
   * Returns coordinates in the same local coordinate space used by the primary shape styles.
   * Useful for positioning ports and node tools consistently.
   *
   * Uses the new Anchor preset system via resolveAnchorFunction.
   */
  public computeAnchorForLayout(layout?: PortLayoutOptions): [number, number] {
    const shape: any = this.primaryShape as any;
    const nodeStyle = this.data?.style || {};
    try {
      // Use the new Anchor preset system
      const anchorFn = resolveAnchorFunction(layout);
      if (anchorFn) {
        return anchorFn(shape);
      }
      // Fallback to center
      return [Number(nodeStyle.width || 100) / 2, Number(nodeStyle.height || 40) / 2];
    } catch (e) {
      try {
        // fallback to center using getLocalBounds
        if (shape && typeof (shape as any).getLocalBounds === 'function') {
          const bounds: any = (this.primaryShape as any).getLocalBounds();
          const centerX = (bounds.min[0] + bounds.max[0]) / 2;
          const centerY = (bounds.min[1] + bounds.max[1]) / 2;
          return [centerX, centerY];
        }
      } catch (er) {}
      return [Number(nodeStyle.width || 100) / 2, Number(nodeStyle.height || 40) / 2];
    }
  }

}

// legacy specific node classes removed in favor of registry-based 'shape' option