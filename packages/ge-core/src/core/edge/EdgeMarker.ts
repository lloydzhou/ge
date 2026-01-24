import { Circle, Polygon, DisplayObject } from '@antv/g-lite';
import type { Vec2 } from '../../types';
import type { EdgeLayoutOptions } from '../../utils/edgeLayout';
import { resolveCtor } from '../../utils/shapeResolver';
import { ItemToolElement } from '../ItemToolElement';

export type EdgeMarkerOptions = {
  enabled?: boolean;
  size?: number;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  layout?: EdgeLayoutOptions;
  shape?: string | Function; // optional registry name or ctor; can also be 'circle' or 'triangle'
};

export type EdgeAnchor = {
  x: number;
  y: number;
  tangent: Vec2;
  normal: Vec2;
};

/**
 * Edge Marker (arrow head) - extends ItemToolElement
 *
 * Represents an arrow marker at the start or end of an edge.
 * Uses ItemToolElement's unified positioning system.
 *
 * Inheritance:
 * CustomElement (@antv/g-lite)
 *   ↑
 * GEInteractiveElement
 *   ↑
 * ItemToolElement<TShape>
 *   ↑
 * EdgeMarker
 */
export class EdgeMarker extends ItemToolElement<DisplayObject> {
  private cfg: EdgeMarkerOptions;

  constructor(cfg: EdgeMarkerOptions, host?: DisplayObject | null) {
    // Initialize with minimal config
    super({
      className: 'g-edge-marker',
      id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    } as any);

    this.cfg = cfg || {};

    // Create primaryShape (the marker visual)
    this.primaryShape = this.createPrimaryShape();

    // Append primaryShape
    if (this.primaryShape) {
      super.appendChild(this.primaryShape);
    }

    // Set position if layout provided
    if (cfg.layout) {
      this.position.layout = cfg.layout;
    }

    // Store host reference for shape resolution
    if (host) {
      (this as any).host = host;
    }
  }

  /**
   * Create the marker shape (circle, triangle, or custom)
   */
  protected createPrimaryShape(): DisplayObject {
    if (!this.cfg || this.cfg.enabled === false) {
      // Return empty circle as placeholder
      return new Circle({ style: { r: 0 } });
    }

    const size = this.cfg.size ?? 6;
    const fill = this.cfg.fill ?? '#000';
    const stroke = this.cfg.stroke ?? '#000';
    const lineWidth = this.cfg.lineWidth ?? 1;

    // 1) Try shape from registry (using host as context)
    const shapeName = this.cfg.shape;
    const host = (this as any).host || this;
    if (shapeName) {
      try {
        const ctor = resolveCtor(host, shapeName as any);
        if (ctor) {
          try {
            return new ctor({ style: { r: size / 2, fill, stroke, lineWidth } });
          } catch (e) {
            // ignore and fallback
          }
        }
      } catch (e) {
        // ignore and fallback
      }

      // Handle built-in shape strings
      if (typeof shapeName === 'string') {
        if (shapeName === 'circle') {
          return new Circle({ style: { r: size / 2, fill, stroke, lineWidth } });
        }
        if (shapeName === 'triangle') {
          const k = 0.6;
          return new Polygon({
            style: {
              points: [
                [0, 0],
                [-size, size * k],
                [-size, -size * k],
              ],
              fill,
              stroke,
              lineWidth,
            },
          });
        }
      }
    }

    // Default: circle
    return new Circle({
      style: {
        r: size / 2,
        fill,
        stroke,
        lineWidth,
      },
    });
  }

  /**
   * Update marker position and rotation
   * @param anchor - Position and tangent info
   */
  update(anchor: EdgeAnchor | null): void {
    if (!anchor || !this.primaryShape) return;

    const { x, y, tangent } = anchor;

    // Update position
    try {
      this.setPosition(x, y);
    } catch (e) {}

    // Update rotation based on tangent
    const angle = Math.atan2(tangent[1], tangent[0]);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // For polygon, recompute rotated points
    try {
      if (this.primaryShape.nodeName === 'polygon') {
        const size = this.cfg.size ?? 6;
        const k = 0.6;
        const p1: [number, number] = [0, 0];
        const p2: [number, number] = [-(size), size * k];
        const p3: [number, number] = [-(size), -size * k];
        const r2: [number, number] = [p2[0] * cos - p2[1] * sin, p2[0] * sin + p2[1] * cos];
        const r3: [number, number] = [p3[0] * cos - p3[1] * sin, p3[0] * sin + p3[1] * cos];
        (this.primaryShape as Polygon).attr({ points: [p1, r2, r3] });
      } else {
        // For other shapes, use rotation transform
        const deg = (angle * 180) / Math.PI;
        try {
          this.primaryShape.setLocalEuler?.([0, 0, deg]);
        } catch (e) {
          // Fallback: set rotation attribute
          this.primaryShape.attr?.('rotation', deg);
        }
      }
    } catch (e) {
      // ignore rotation errors
    }
  }

  /**
   * Calculate position based on edge path (override from ItemToolElement)
   * Edge markers use 'layout' config to determine position along path
   */
  protected calculatePosition(): Vec2 {
    if (!this._owner?.primaryShape) return [0, 0];

    // Use layout config (e.g., { snap: 'start' } or { snap: 'end' })
    const layout = this.position.layout;
    if (typeof layout === 'object' && (layout as any).snap) {
      const snap = (layout as any).snap;
      if (snap === 'start') {
        this.position.distance = 0;
      } else if (snap === 'end') {
        this.position.distance = 1;
      }
    }

    // Call parent implementation to calculate position
    return super.calculatePosition();
  }

  /**
   * Update position when edge changes
   */
  updatePosition(): void {
    const pos = this.calculatePosition();
    this.setPosition(pos[0], pos[1]);
  }

  /**
   * Dispose of marker
   */
  dispose(): void {
    try {
      // Remove primaryShape
      if (this.primaryShape) {
        try {
          super.removeChild(this.primaryShape);
        } catch (e) {}
        this.primaryShape = null;
      }
    } catch (e) {}
  }
}
