import { Rect, Text, DisplayObject, CustomEvent } from '@antv/g-lite';
import { resolveCtor } from '../../utils/shapeResolver';
import type { BaseNodeStyleProps, DisplayObjectConfigWithShape, NodeData, PortLayoutOptions } from '../../types';
import { Port } from '../port/Port';
import { resolveAnchorFunction } from '../../utils/nodeAnchor';
import { ItemElement } from '../ItemElement';

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

/**
 * Node class with generic primaryShape support
 *
 * Extends ItemElement to provide collection management (tools/ports/labels)
 * and GEInteractiveElement for interaction capabilities.
 *
 * @template TShape - The display object type used as primary shape (defaults to Rect)
 *
 * @example
 * // Using default Rect shape
 * const node = new Node({ id: 'n1', x: 100, y: 100 });
 *
 * // Using custom shape type
 * const circleNode = new Node<Circle>({ id: 'n2', shape: Circle, ... });
 *
 * // Using registered shape name
 * const customNode = new Node({ id: 'n3', shape: 'my-shape', ... });
 */
export class Node<TShape extends DisplayObject = Rect> extends ItemElement<TShape> {
  private data!: NodeConfig; // definite assignment assertion - set in constructor

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

    // Create primaryShape using parent's abstract method
    this.primaryShape = this.createPrimaryShape({
      ...(config as Record<string, unknown>),
      id: `${config.id}-primary`,
      shape: config.shape
    } as DisplayObjectConfigWithShape);

    // Add children to the group
    super.appendChild(this.primaryShape);

    // Create label if configured (directly like primaryShape, no pending config needed)
    if (config?.style?.label || config?.style?.labelFill || config?.style?.labelFontSize) {
      const label = new Text({
        style: {
          text: config?.style?.label || config.id,
          fill: config?.style?.labelFill || '#000',
          fontSize: config?.style?.labelFontSize || 12,
          textAlign: 'center',
          textBaseline: 'middle'
        }
      });
      super.appendChild(label); // Use super.appendChild to avoid Port tracking logic
    }
  }

  /**
   * Create the primary shape (implements abstract method from GEInteractiveElement)
   * Resolves shape from config.shape or defaults to Rect
   */
  protected createPrimaryShape(config: DisplayObjectConfigWithShape<any>): TShape {
    // Try resolving a registered ctor from config.shape if provided
    const ptype = (config as any).shape || (this.data && this.data.shape);
    const ctor = resolveCtor(this, ptype as any);
    if (ctor) {
      try { return new ctor(config) as unknown as TShape; } catch (e) {}
    }
    return new Rect(config) as unknown as TShape;
  }

  /**
   * Position the label in the center of the primary shape
   * Handles different shapes: Circle/Ellipse (cx, cy) vs Rect (x, y, width, height)
   */
  private positionLabel(): void {
    const label = this.getLabelShape();
    if (!label) return;

    try {
      const shape = this.primaryShape as any;
      if (!shape) {
        // Fallback: use style dimensions
        const nodeStyle = this.data?.style || {};
        const w = Number(nodeStyle.width ?? 100);
        const h = Number(nodeStyle.height ?? 40);
        label.setLocalPosition([w / 2, h / 2]);
        return;
      }

      const shapeStyle = shape.style || {};
      const nodeName = shape.nodeName;

      // For Circle/Ellipse: center is at (cx, cy)
      if (nodeName === 'circle' || nodeName === 'ellipse') {
        const cx = Number(shapeStyle.cx ?? 0);
        const cy = Number(shapeStyle.cy ?? 0);
        label.setLocalPosition([cx, cy]);
        return;
      }

      // For Rect and other shapes: center is at (x + width/2, y + height/2)
      const x = Number(shapeStyle.x ?? 0);
      const y = Number(shapeStyle.y ?? 0);
      const w = Number(shapeStyle.width ?? 100);
      const h = Number(shapeStyle.height ?? 40);
      label.setLocalPosition([x + w / 2, y + h / 2]);
    } catch (error) {
      // Final fallback
      const style = this.data?.style || {};
      label.setLocalPosition([(style.width || 100) / 2, (style.height || 40) / 2]);
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
   * Override appendChild to automatically track ItemToolElements (Port, etc.)
   * This enables DOM-style API: new Port(); node.appendChild(port);
   */
  override appendChild<T extends DisplayObject>(child: T): this {
    // Auto-track if child is a Port (ItemToolElement)
    // Use multiple checks for robustness: className property, constructor name, or instanceof
    const isPort = (child as any).className === 'g-port' ||
                    (child as any).constructor?.name === 'Port' ||
                    (child as any).getId && (child as any).updatePosition; // Port-specific methods

    if (child && isPort) {
      const port = child as unknown as Port;

      // Auto-add nodeId: prefix to Port ID if not already present
      // This ensures consistency with addPort behavior
      const portId = (port as any).data?.id;
      if (portId && !portId.includes(':')) {
        const fullId = `${this.getId()}:${portId}`;
        (port as any).data.id = fullId;
        // Update the element's id attribute for DOM lookup
        try {
          (port as any).id = fullId;
        } catch (e) {}
      }

      // Set owner reference
      (port as any).owner = this;
      (port as any)._setOwner?.(this);

      // Track in ItemElement's ports array
      this._trackItem(port as any, 'port');

      // Trigger position update
      try {
        (port as any).updatePosition?.();
      } catch (e) {}
    }

    // Call parent implementation
    return super.appendChild(child);
  }

  /**
   * Override removeChild to untrack ItemToolElements
   */
  override removeChild<T extends DisplayObject>(child: T): this {
    // Untrack before removing
    if (child && (child as any).constructor?.name === 'Port') {
      const port = child as unknown as Port;
      this._untrackItem(port as any, 'port');
    }

    // Call parent implementation
    return super.removeChild(child);
  }

  /**
   * Add a port to this node (convenience method for creating and adding a port)
   * Creates a Port and tracks it in ItemElement's ports array
   *
   * @deprecated Use DOM-style API instead: new Port({ id: 'p1', layout: 'left' }); node.appendChild(port);
   */
  addPort(portConfig: { id?: string; layout?: PortLayoutOptions; style?: BaseNodeStyleProps; [key: string]: unknown } = {}): Port {
    const portId = portConfig.id ? String(portConfig.id) : `port-${Math.random().toString(36).slice(2, 9)}`;
    const fullId = portId.includes(':') ? portId : `${this.getId()}:${portId}`;

    const port = new Port({
      id: fullId,
      parentId: this.getId(),
      style: portConfig.style || {},
      layout: portConfig.layout,
    });

    // Use DOM-style appendChild which will auto-track
    this.appendChild(port);

    return port;
  }

  /**
   * @deprecated Use DOM-style API instead: new Port({ id: 'p1', layout: 'left' }); node.appendChild(port);
   */
  createPort(portConfig: { id?: string; layout?: PortLayoutOptions; style?: BaseNodeStyleProps; [key: string]: unknown } = {}): Port {
    // Delegate to addPort for backward compatibility
    return this.addPort(portConfig);
  }

  getPortById(id: string): Port | undefined {
    const fullId = id.includes(':') ? id : `${this.getId()}:${id}`;
    return this.ports.find(p => (p as Port).getId() === fullId) as Port | undefined;
  }

  /**
   * Get port by simple ID (convenience method)
   */
  getPort(portId: string): Port | undefined {
    return this.getPortById(portId);
  }

  /**
   * Get all ports of this node (overrides ItemElement's getPorts)
   */
  override getPorts(): Port[] {
    return this.ports as Port[];
  }

  removePort(id: string): void {
    const port = this.getPortById(id);
    if (port) {
      try {
        super.removeChild(port);
      } catch (e) {}
      // Untrack from ItemElement's ports array
      this._untrackItem(port, 'port');
    }
  }

  connectedCallback() {
    // Initialize interaction event listeners
    this._initInteraction();

    // Apply cursor style based on interaction capabilities
    this._applyCursorStyleTo(this.primaryShape);

    // Position the label (created in constructor)
    try {
      this.positionLabel();
    } catch (e) {
      // ignore positioning errors
    }

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

    // Clear ports array
    this.ports = [];
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
      // Fallback to center - read from style first, then use defaults
      const w = Number(nodeStyle.width ?? shape?.style?.width ?? 100);
      const h = Number(nodeStyle.height ?? shape?.style?.height ?? 40);
      return [w / 2, h / 2];
    } catch (e) {
      try {
        // fallback to center using getLocalBounds
        if (shape && typeof (shape as any).getLocalBounds === 'function') {
          const bounds: any = (this.primaryShape as any).getLocalBounds();
          const centerX = (bounds.min[0] + bounds.max[0]) / 2;
          const centerY = (bounds.min[1] + bounds.max[1]) / 2;
          // Only use bounds if they're valid (not all zeros)
          if (centerX !== 0 || centerY !== 0) {
            return [centerX, centerY];
          }
        }
      } catch (er) {}
      // Final fallback - read from style directly
      const w = Number(nodeStyle.width ?? shape?.style?.width ?? 100);
      const h = Number(nodeStyle.height ?? shape?.style?.height ?? 40);
      return [w / 2, h / 2];
    }
  }

}

// legacy specific node classes removed in favor of registry-based 'shape' option
