import { CustomElement, Circle, DisplayObject } from '@antv/g-lite';
import { resolveCtor } from './shapeResolver';
import type { BasePortStyleProps } from '../types';

export interface PortStyleProps extends BasePortStyleProps {
  r?: number;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  x?: number;
  y?: number;
}

export type PortLayout =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | {
      name: 'angle';
      args: {
        angle: number; // 0-360 degrees
      };
    }
  | {
      name: 'absolute';
      args: {
        x: number;
        y: number;
      };
    };

export interface PortConfig {
  id: string; // unique id, may be namespaced by node e.g. `${nodeId}:${portId}`
  parentId?: string;
  shape?: string | Function;
  style?: PortStyleProps;
  layout?: PortLayout;
  [key: string]: any;
}

export class Port extends CustomElement<PortStyleProps> {
  private circle: DisplayObject | null = null;
  private data: any;
  public owner: any = null; // parent node reference
  private layout: PortLayout | undefined;

  constructor(config: PortConfig) {
    super({
      ...config,
      className: 'g-port',
      id: config.id,
    });
    this.data = config;
    this.layout = config.layout;

    // Create default styles if not provided
    const style: PortStyleProps = {
      r: 3,
      fill: '#fff',
      stroke: '#000',
      lineWidth: 1,
      x: 0,
      y: 0,
      ...config.style,
    };

    // Try to create port shape immediately using config.shape (falls back to global registry),
    // so ports are visible even before connectedCallback.
    let initialShape: any = null;
    try {
      const ctor = resolveCtor(this, config.shape as any);
      if (ctor) {
        try {
          initialShape = new ctor({
            style: {
              r: Number(style.r ?? 3),
              fill: style.fill,
              stroke: style.stroke,
              lineWidth: Number(style.lineWidth ?? 1),
              cx: Number(style.x ?? 0),
              cy: Number(style.y ?? 0),
            },
          });
        } catch (e) {
          initialShape = null;
        }
      }
    } catch (e) {}
    if (!initialShape) {
      initialShape = new Circle({
        style: {
          r: Number(style.r ?? 3),
          fill: style.fill,
          stroke: style.stroke,
          lineWidth: Number(style.lineWidth ?? 1),
          cx: Number(style.x ?? 0),
          cy: Number(style.y ?? 0),
        },
      });
    }
    this.circle = initialShape;
    // Add to group so it's visible immediately; connectedCallback will skip creation if already present
    try {
      super.appendChild(this.circle as any);
    } catch (e) {}
  }

  public updatePosition(): void {
    if (!this.layout || !this.owner) {
      return;
    }

    const shape = this.owner.getPrimaryShape();
    if (!shape) {
      return;
    }

    let pos = { x: 0, y: 0 };

    if (shape.nodeName === 'rect') {
      const w = shape.style.width || 0;
      const h = shape.style.height || 0;
      const x = shape.style.x || 0;
      const y = shape.style.y || 0;
      if (typeof this.layout === 'string') {
        switch (this.layout) {
          case 'top':
            pos = { x: x + w / 2, y };
            break;
          case 'bottom':
            pos = { x: x + w / 2, y: y + h };
            break;
          case 'left':
            pos = { x, y: y + h / 2 };
            break;
          case 'right':
            pos = { x: x + w, y: y + h / 2 };
            break;
        }
      }
    }

    if (shape.nodeName === 'circle') {
      const cx = shape.style.cx || 0;
      const cy = shape.style.cy || 0;
      const r = shape.style.r || 0;
      if (typeof this.layout === 'string') {
        switch (this.layout) {
          case 'top':
            pos = { x: cx, y: cy - r };
            break;
          case 'bottom':
            pos = { x: cx, y: cy + r };
            break;
          case 'left':
            pos = { x: cx - r, y: cy };
            break;
          case 'right':
            pos = { x: cx + r, y: cy };
            break;
        }
      } else if (this.layout.name === 'angle') {
        const angleRad = (this.layout.args.angle * Math.PI) / 180;
        pos = {
          x: cx + r * Math.cos(angleRad),
          y: cy + r * Math.sin(angleRad),
        };
      }
    }

    if (typeof this.layout === 'object' && this.layout.name === 'absolute') {
      pos = this.layout.args;
    }

    try {
      if (this.circle && (this.circle as any).style) {
        (this.circle as any).style.cx = pos.x;
        (this.circle as any).style.cy = pos.y;
      }
    } catch (e) {}
  }

  /**
   * Get the port ID
   */
  getId(): string {
    return this.data.id;
  }

  /**
   * Get the port data
   */
  getData(): any {
    return this.data;
  }

  /**
   * Get relative position of port inside owner node
   */
  getRelativePosition(): [number, number] {
    try {
      const cx = Number((this.circle as any)?.style?.cx) || 0;
      const cy = Number((this.circle as any)?.style?.cy) || 0;
      return [cx, cy];
    } catch (e) {
      return [0, 0];
    }
  }

  /**
   * Compute absolute position in graph coordinate by combining owner node position and relative offset
   */
  getAbsolutePosition(): [number, number] {
    if (!this.owner) {
      const pos = this.getPosition();
      return [pos[0], pos[1]];
    }
    const [ownerX, ownerY] = this.owner.getPosition();
    const [relativeX, relativeY] = this.getRelativePosition();
    return [ownerX + relativeX, ownerY + relativeY];
  }

  connectedCallback() {
    // Initialize port when connected to DOM
    console.log('Port connected:', this.data.id);
    // Synchronously update position to avoid edge connection issues
    this.updatePosition();
  }

  disconnectedCallback() {
    // Cleanup when port is removed from DOM
    console.log('Port disconnected:', this.data.id);
  }
}