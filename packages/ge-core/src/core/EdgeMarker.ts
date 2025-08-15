import { DisplayObject, Circle, Polygon } from '@antv/g-lite';
import type { Vec2 } from './EdgeLayout';
import type { EdgeLayoutOptions } from './EdgeLayout';

export type EdgeMarkerOptions = {
  enabled?: boolean;
  type?: 'none' | 'circle' | 'triangle';
  size?: number;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  layout?: EdgeLayoutOptions;
};

export type EdgeAnchor = {
  x: number;
  y: number;
  tangent: Vec2;
  normal: Vec2;
};

export class EdgeMarker {
  private cfg: EdgeMarkerOptions;
  private node: DisplayObject | null = null;

  constructor(cfg: EdgeMarkerOptions) {
    this.cfg = cfg || {};
    this.node = this.createNode();
  }

  private createNode(): DisplayObject | null {
    if (!this.cfg || this.cfg.enabled === false || this.cfg.type === 'none') return null;
    const size = this.cfg.size ?? 6;
    const fill = this.cfg.fill ?? '#000';
    const stroke = this.cfg.stroke ?? '#000';
    const lineWidth = this.cfg.lineWidth ?? 1;

    if (this.cfg.type === 'circle') {
      return new Circle({
        style: {
          r: size / 2,
          fill,
          stroke,
          lineWidth,
        },
      });
    }

    // default triangle with apex at origin, base extending along -X
    const s = size;
    const k = 0.6;
    return new Polygon({
      style: {
        points: [
          [0, 0],
          [-s, s * k],
          [-s, -s * k],
        ],
        fill,
        stroke,
        lineWidth,
      },
    });
  }

  getDisplayObject(): DisplayObject | null {
    return this.node;
  }

  update(anchor: EdgeAnchor | null) {
    if (!this.node || !anchor) return;
    const { x, y, tangent } = anchor;

    // position
    try {
      (this.node as any).setLocalPosition?.([x, y]);
    } catch (e) {}

    // angle along tangent
    const angle = Math.atan2(tangent[1], tangent[0]);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // if polygon, recompute rotated points (fallback if rotation transform unavailable)
    try {
      // Circle doesn't need rotation
      if ((this.node as any).nodeName === 'polygon') {
        const size = this.cfg.size ?? 6;
        const k = 0.6;
        const p1: [number, number] = [0, 0];
        const p2: [number, number] = [-(size), size * k];
        const p3: [number, number] = [-(size), -size * k];
        const r2: [number, number] = [p2[0] * cos - p2[1] * sin, p2[0] * sin + p2[1] * cos];
        const r3: [number, number] = [p3[0] * cos - p3[1] * sin, p3[0] * sin + p3[1] * cos];
        (this.node as Polygon).attr({ points: [p1, r2, r3] });
      } else {
        // if renderer supports local euler/rotation, set it (degrees)
        const deg = (angle * 180) / Math.PI;
        try { (this.node as any).setLocalEuler?.([0, 0, deg]); } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  }

  dispose() {
    this.node = null;
  }
}
