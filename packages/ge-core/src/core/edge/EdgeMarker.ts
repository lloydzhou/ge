import { CustomElement, DisplayObject, Circle, Polygon } from '@antv/g-lite';
import type { Vec2 } from '../../utils/edgeLayout';
import type { EdgeLayoutOptions } from '../../utils/edgeLayout';
import { resolveCtor } from '../../utils/shapeResolver';

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

export class EdgeMarker extends CustomElement<EdgeMarkerOptions> {
  private cfg: EdgeMarkerOptions;
  private host: any = null;

  constructor(cfg: EdgeMarkerOptions, host?: any) {
    super({ className: 'g-edge-marker' });
    this.cfg = cfg || {};
    this.host = host;

    // create inner display object and append as child so EdgeMarker itself is a DisplayObject
    const inner = this.createInnerNode();
    if (inner) {
      try { super.appendChild(inner as any); } catch (e) {}
    }
  }

  private createInnerNode(): DisplayObject | null {
    if (!this.cfg || this.cfg.enabled === false) return null;
    const size = this.cfg.size ?? 6;
    const fill = this.cfg.fill ?? '#000';
    const stroke = this.cfg.stroke ?? '#000';
    const lineWidth = this.cfg.lineWidth ?? 1;

    // 1) 优先尝试 shape（注册名或 ctor）
    const shapeName = this.cfg.shape;
    const ctx = this.host || (this as any);
    if (shapeName) {
      try {
        const ctor = resolveCtor(ctx, shapeName as any);
        if (ctor) {
          try {
            return new ctor({ style: { r: size / 2, fill, stroke, lineWidth } });
          } catch (e) {
            // ignore and fallback to builtin handling below
          }
        }
      } catch (e) {
        // ignore and fallback
      }

      // if shapeName is a built-in indicator string, handle it
      if (typeof shapeName === 'string') {
        if (shapeName === 'circle') {
          return new Circle({ style: { r: size / 2, fill, stroke, lineWidth } });
        }
        if (shapeName === 'triangle') {
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
      }
    }

    // 默认回退为圆形
    return new Circle({
      style: {
        r: size / 2,
        fill,
        stroke,
        lineWidth,
      },
    });
  }

  // 返回自身作为可被 appendChild 的对象
  getDisplayObject(): DisplayObject | null {
    return this;
  }

  private _getInner(): DisplayObject | null {
    try {
      // CustomElement children stored on internal property; use safe access
      return (this as any).children && (this as any).children.length > 0 ? (this as any).children[0] as DisplayObject : null;
    } catch (e) {
      return null;
    }
  }

  update(anchor: EdgeAnchor | null) {
    const inner = this._getInner();
    if (!inner || !anchor) return;
    const { x, y, tangent } = anchor;

    // position
    try {
      (this as any).setLocalPosition?.([x, y]);
    } catch (e) {}

    // angle along tangent
    const angle = Math.atan2(tangent[1], tangent[0]);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // if polygon, recompute rotated points (fallback if rotation transform unavailable)
    try {
      if ((inner as any).nodeName === 'polygon') {
        const size = this.cfg.size ?? 6;
        const k = 0.6;
        const p1: [number, number] = [0, 0];
        const p2: [number, number] = [-(size), size * k];
        const p3: [number, number] = [-(size), -size * k];
        const r2: [number, number] = [p2[0] * cos - p2[1] * sin, p2[0] * sin + p2[1] * cos];
        const r3: [number, number] = [p3[0] * cos - p3[1] * sin, p3[0] * sin + p3[1] * cos];
        (inner as Polygon).attr({ points: [p1, r2, r3] });
      } else {
        const deg = (angle * 180) / Math.PI;
        try { (this as any).setLocalEuler?.([0, 0, deg]); } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  }

  dispose() {
    try {
      // remove any children
      try {
        const children = (this as any).children || [];
        for (let i = children.length - 1; i >= 0; i--) {
          try { super.removeChild(children[i]); } catch (e) {}
        }
      } catch (e) {}
    } catch (e) {}
  }
}
