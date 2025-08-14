import { CustomElement, Rect, Text, DisplayObject, Circle, DisplayObjectConfig } from '@antv/g-lite';
import type { BaseNodeStyleProps } from '../types';
import { Port, PortLayout } from './Port';

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

export interface NodeConfig {
  id: string;
  x?: number;
  y?: number;
  style?: NodeStyleProps;
  [key: string]: any;
}

export class Node<T extends DisplayObject = Rect> extends CustomElement<NodeStyleProps> {
  private primaryShape: T;
  private label: Text;
  private data: any;
  private portsById: Map<string, any> = new Map();

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

    this.primaryShape = this.createPrimaryShape({ ...config, id: `${config.id}-primary` });

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
  
  protected createPrimaryShape(config: DisplayObjectConfig<any>): T {
    // This method should be overridden by subclasses to create the appropriate shape
    // For the base Node class, we default to Rect
    return new Rect(config) as unknown as T;
  }
  
  /**
   * Position the label in the center of the primary shape
   * Uses shape style when possible, otherwise falls back to bbox size
   */
  private positionLabel(): void {
    try {
      const shape: any = this.primaryShape as any;
      const style = shape.style || {};

      // For Circle, center is at (cx, cy)
      if (shape.nodeName === 'circle') {
        const cx = style.cx || 0;
        const cy = style.cy || 0;
        this.label.setLocalPosition([cx, cy]);
        return;
      }

      // For Rect, center is at (x + width/2, y + height/2)
      if (shape.nodeName === 'rect') {
        const x = style.x || 0;
        const y = style.y || 0;
        const width = style.width || 0;
        const height = style.height || 0;
        this.label.setLocalPosition([x + width / 2, y + height / 2]);
        return;
      }

      // Fallback for other shapes using local bounds
      let bounds: any = null;
      if (typeof shape.getLocalBounds === 'function') {
        try {
          bounds = shape.getLocalBounds();
        } catch (e) {
          bounds = null;
        }
      }

      if (bounds) {
        const centerX = (bounds.min[0] + bounds.max[0]) / 2;
        const centerY = (bounds.min[1] + bounds.max[1]) / 2;
        this.label.setLocalPosition([centerX, centerY]);
        return;
      }

      // Final fallback
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
   * Get the node position as [x, y]
   */
  getPosition(): [number, number] {
    try {
      // Try to get position from properties first
      const x = Number((this as any).x) || Number(this.data?.x) || 0;
      const y = Number((this as any).y) || Number(this.data?.y) || 0;
      
      // If we have valid position data, use it
      if (x !== 0 || y !== 0) {
        return [x, y];
      }
      
      // Fallback: try to get position from transform matrix
      const transform = this.getLocalTransform();
      if (transform && Array.isArray(transform) && transform.length >= 13) {
        // mat4 format: [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33]
        // Translation is at indices 12 and 13 (or 4 and 5 in some formats)
        return [transform[12] || 0, transform[13] || 0];
      }
      
      return [x, y];
    } catch (e) {
      // Final fallback
      const x = Number(this.data?.x) || 0;
      const y = Number(this.data?.y) || 0;
      return [x, y];
    }
  }

  /**
   * Get the node data
   */
  getData(): any {
    return this.data;
  }
  
  /**
   * Get the primary shape
   */
  getPrimaryShape(): T {
    return this.primaryShape;
  }
  
  createPort(portConfig: { id?: string; layout?: PortLayout; style?: any; [key: string]: any } = {}): Port {
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
    // Initialize node when connected to DOM
    console.log('Node connected:', this.data.id);
    
    // Try to find enclosing Graph instance and register
    try {
      let parent: any = this.parent;
      while (parent) {
        if (parent.constructor && parent.constructor.name === 'Graph') {
          // register if available
          if (typeof parent.registerNode === 'function') {
            parent.registerNode(this as any);
          }
          break;
        }
        parent = parent.parent;
      }
    } catch (e) {
      // ignore
    }

    // label positioning removed from connectedCallback to avoid double layout
  }
  
  disconnectedCallback() {
    // Cleanup when node is removed from DOM
    console.log('Node disconnected:', this.data.id);
    // Try to unregister from Graph
    try {
      let parent: any = this.parent;
      while (parent) {
        if (parent.constructor && parent.constructor.name === 'Graph') {
          if (typeof parent.unregisterNode === 'function') {
            parent.unregisterNode(this as any);
          }
          break;
        }
        parent = parent.parent;
      }
    } catch (e) {
      // ignore
    }
    // unregister ports
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

    // After moving, notify graph via eventBus if available
    try {
      let parent: any = this.parent;
      while (parent) {
        if (parent.constructor && parent.constructor.name === 'Graph') {
          const bus = parent.eventBus as EventTarget;
          if (bus) {
            const ev = new CustomEvent('node:moved', { detail: { id: this.getId(), x: xNum, y: yNum } });
            bus.dispatchEvent(ev as unknown as Event);
          }
          break;
        }
        parent = parent.parent;
      }
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
}

// Predefined node types
export class RectNode extends Node<Rect> {
  protected createPrimaryShape(config: DisplayObjectConfig<any>): Rect {
    return new Rect(config);
  }
}

export class CircleNode extends Node<Circle> {
  protected createPrimaryShape(config: DisplayObjectConfig<any>): Circle {
    return new Circle(config);
  }
}