import { Circle, DisplayObject } from '@antv/g-lite';
import { resolveCtor } from '../../utils/shapeResolver';
import type { BasePortStyleProps, PortData, PortLayoutOptions } from '../../types';
import type { Node } from '../node/Node';
import { GEInteractiveElement } from '../GEInteractiveElement';

export interface PortStyleProps extends BasePortStyleProps {
  r?: number;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  x?: number;
  y?: number;
}

export interface PortConfig extends PortData {
  [key: string]: unknown;
}

/**
 * Port class with generic primaryShape support
 *
 * @template TShape - The display object type used as primary shape (defaults to Circle)
 *
 * @example
 * // Using default Circle shape
 * const port = new Port({ id: 'p1', layout: 'right' });
 *
 * // Using custom shape type
 * const rectPort = new Port<Rect>({ id: 'p2', shape: Rect, ... });
 *
 * // Using registered shape name
 * const customPort = new Port({ id: 'p3', shape: 'my-port-shape', ... });
 */
export class Port<TShape extends DisplayObject = Circle> extends GEInteractiveElement<TShape> {
  private data: PortConfig;
  public owner: Node | null = null; // parent node reference
  private layout: PortLayoutOptions | undefined;

  // Port 默认支持连线（与 Node 不同，Node 默认不支持）
  protected _defaultSourceConnectable = true;

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

    // Create primaryShape using parent's abstract method
    this.primaryShape = this.createPrimaryShape({
      shape: config.shape,
      style: {
        r: Number(style.r ?? 3),
        fill: style.fill,
        stroke: style.stroke,
        lineWidth: Number(style.lineWidth ?? 1),
        cx: Number(style.x ?? 0),
        cy: Number(style.y ?? 0),
      },
    });

    // Add to group so it's visible immediately
    try {
      super.appendChild(this.primaryShape);
    } catch (e) {}
  }

  /**
   * Create the primary shape (implements abstract method from GEInteractiveElement)
   * Resolves shape from config.shape or defaults to Circle
   */
  protected createPrimaryShape(config: any): TShape {
    const ptype = config.shape;
    const ctor = resolveCtor(this, ptype as any);
    if (ctor) {
      try {
        return new ctor(config) as unknown as TShape;
      } catch (e) {
        // fall through to default
      }
    }
    return new Circle(config) as unknown as TShape;
  }

  public updatePosition(): void {
    if (!this.layout || !this.owner) {
      return;
    }

    // Prefer using owner's computeAnchorForLayout if available (centralized logic)
    try {
      if (typeof (this.owner as any).computeAnchorForLayout === 'function') {
        const p = (this.owner as any).computeAnchorForLayout(this.layout);
        if (Array.isArray(p) && p.length >= 2) {
          const pos = { x: Number(p[0] || 0), y: Number(p[1] || 0) };
          try {
            if (this.primaryShape && (this.primaryShape as any).style) {
              (this.primaryShape as any).style.cx = pos.x;
              (this.primaryShape as any).style.cy = pos.y;
            }
          } catch (e) {}
          return;
        }
      }
    } catch (e) {
      // ignore and fallback to local calculation
    }

    // Fallback: compute based on owner's primary shape (back-compat)
    const shape = this.owner.getPrimaryShape && this.owner.getPrimaryShape();
    if (!shape) return;

    let pos = { x: 0, y: 0 };

    if (shape.nodeName === 'rect') {
      const w = Number(shape.style.width || 0);
      const h = Number(shape.style.height || 0);
      const x = Number(shape.style.x || 0);
      const y = Number(shape.style.y || 0);
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
      const circleStyle = (shape.style as any);
      const cx = Number(circleStyle.cx || 0);
      const cy = Number(circleStyle.cy || 0);
      const r = Number(circleStyle.r || 0);
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
      } else if ((this.layout as any).name === 'angle') {
        const angleRad = (((this.layout as any).args?.angle ?? 0) * Math.PI) / 180;
        pos = {
          x: cx + r * Math.cos(angleRad),
          y: cy + r * Math.sin(angleRad),
        };
      }
    }

    if (typeof this.layout === 'object' && (this.layout as any).name === 'absolute') {
      pos = (this.layout as any).args;
    }

    try {
      if (this.primaryShape && (this.primaryShape as any).style) {
        (this.primaryShape as any).style.cx = pos.x;
        (this.primaryShape as any).style.cy = pos.y;
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
  getData(): PortConfig {
    return this.data;
  }

  /**
   * Get relative position of port inside owner node
   */
  getRelativePosition(): [number, number] {
    try {
      const cx = Number((this.primaryShape as any)?.style?.cx) || 0;
      const cy = Number((this.primaryShape as any)?.style?.cy) || 0;
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
    // Initialize interaction event listeners (handled by parent)
    super._initInteraction();

    // Apply cursor style (Port 默认支持连线，显示 crosshair)
    this._applyCursorStyleTo(this.primaryShape);

    // Synchronously update position to avoid edge connection issues
    this.updatePosition();
  }

  disconnectedCallback() {
    // Cleanup when port is removed from DOM
  }
}
