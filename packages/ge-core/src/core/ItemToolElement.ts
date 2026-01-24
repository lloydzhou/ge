import { DisplayObject } from '@antv/g-lite';
import { GEInteractiveElement } from './GEInteractiveElement';
import type { Vec2, PortLayoutOptions } from '../../types';
import type { ItemElement } from './ItemElement';

/**
 * ItemToolElement - Individual Positioning for Port/EdgeLabel/Tools
 *
 * Extends GEInteractiveElement to provide unified positioning logic:
 * - Owner reference (node/edge)
 * - Position parameters (distance, offset, angle)
 * - Unified position calculation based on owner's primaryShape
 * - Sibling detection for distribution support
 *
 * All positioning logic for Labels and Ports lives here:
 * - Edge Labels: position along Path using distance (t parameter)
 * - Node Ports: position on Shape using layout
 *
 * Inheritance:
 * CustomElement (@antv/g-lite)
 *   ↑
 * GEInteractiveElement<TShape> (existing - interactions)
 *   ↑
 * ItemToolElement<TShape> (NEW - positioning logic)
 *   ↑
 * Port | EdgeLabel | ButtonRemove | NodeEditor | etc.
 *
 * @template TShape - The display object type used as primary shape
 */
export abstract class ItemToolElement<TShape extends DisplayObject = DisplayObject>
  extends GEInteractiveElement<TShape> {

  // ============================================
  // Owner Reference
  // ============================================

  /** Owner element (Node or Edge that contains this item) */
  protected _owner: ItemElement | null = null;

  /**
   * Get the owner element
   * @returns Owner element or null
   */
  getOwner(): ItemElement | null {
    return this._owner;
  }

  /**
   * Set the owner element
   * Called by ItemElement when this item is added
   * @param owner - Owner element
   */
  _setOwner(owner: ItemElement | null): void {
    this._owner = owner;
  }

  // ============================================
  // Position Parameters
  // ============================================

  /** Position parameters (unified for all items) */
  protected position: {
    distance?: number;    // 0-1 along path (for Edge labels)
    offset?: {
      normal?: number;     // Perpendicular offset
      tangent?: number;    // Parallel offset
    };
    angle?: number;       // Rotation in degrees
  } = {};

  /** Layout type (for Node ports) */
  protected layout: string | PortLayoutOptions = 'top';

  /** Index among siblings (for distribution) */
  protected _index: number = -1;

  // ============================================
  // Position Calculation
  // ============================================

  /**
   * Calculate position based on owner's primaryShape
   * Works for both Edge (Path) and Node (closed Shape)
   * @returns Calculated position
   */
  protected calculatePosition(): Vec2 {
    if (!this._owner?.primaryShape) return [0, 0];

    const shape = this._owner.primaryShape;

    // Get position along the shape
    if (this.isPathLike(shape)) {
      // For Edge labels: position along Path using distance (t)
      return this.calculatePositionOnPath(shape, this.position.distance ?? 0.5);
    } else {
      // For Node ports: position on Shape using layout
      return this.calculatePositionOnShape(shape, this.layout);
    }
  }

  /**
   * Check if a shape is path-like (Line, Polyline, Path)
   * @param shape - Shape to check
   * @returns True if path-like
   */
  protected isPathLike(shape: DisplayObject): boolean {
    const nodeName = shape.nodeName;
    return nodeName === 'line' || nodeName === 'polyline' || nodeName === 'path';
  }

  /**
   * Calculate position on a Path at distance t (0-1)
   * For Edge labels
   * @param path - Path object
   * @param t - Distance along path (0-1)
   * @returns Position on path
   */
  protected calculatePositionOnPath(path: DisplayObject, t: number): Vec2 {
    try {
      // Try to use getPointAtLength and getTangentAt if available
      if (typeof (path as any).getPointAtLength === 'function') {
        const totalLength = (path as any).getTotalLength?.() || 100;
        const point = (path as any).getPointAtLength(t * totalLength);

        let tangent: Vec2 | undefined;
        if (typeof (path as any).getTangentAt === 'function') {
          const tan = (path as any).getTangentAt(t * totalLength);
          tangent = [tan.x, tan.y] as Vec2;
        }

        return this.applyOffsetAndAngle(point, tangent);
      }

      // Fallback: return [0, 0]
      return [0, 0];
    } catch (e) {
      return [0, 0];
    }
  }

  /**
   * Calculate position on a Shape based on layout
   * For Node ports
   * @param shape - Shape object
   * @param layout - Layout type
   * @returns Position on shape
   */
  protected calculatePositionOnShape(shape: DisplayObject, layout: string | PortLayoutOptions): Vec2 {
    try {
      const bounds = shape.getLocalBounds?.();
      if (!bounds) return [0, 0];

      const center = [(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2];
      const size = [bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1]];

      // Handle string layout types
      if (typeof layout === 'string') {
        switch (layout) {
          case 'top': return [center[0], bounds.min[1]];
          case 'bottom': return [center[0], bounds.max[1]];
          case 'left': return [bounds.min[0], center[1]];
          case 'right': return [bounds.max[0], center[1]];
          default: return center;
        }
      }

      // Handle object layout types
      if (typeof layout === 'object') {
        if ((layout as any).name === 'angle') {
          const angle = ((layout as any).args?.angle ?? 0) * Math.PI / 180;
          const r = Math.max(size[0], size[1]) / 2;
          return [
            center[0] + r * Math.cos(angle),
            center[1] + r * Math.sin(angle)
          ];
        }
        if ((layout as any).name === 'absolute') {
          return [
            Number((layout as any).args?.x ?? 0),
            Number((layout as any).args?.y ?? 0)
          ];
        }
      }

      return center;
    } catch (e) {
      return [0, 0];
    }
  }

  /**
   * Apply offset (normal/tangent) and angle rotation to a point
   * @param point - Original point
   * @param tangent - Tangent vector at point (optional)
   * @returns Adjusted point
   */
  protected applyOffsetAndAngle(point: Vec2, tangent?: Vec2): Vec2 {
    let result = [...point] as Vec2;

    // Apply normal offset (perpendicular to tangent)
    if (this.position.offset?.normal && tangent) {
      const normal = [-tangent[1], tangent[0]]; // Perpendicular
      result[0] += normal[0] * this.position.offset.normal;
      result[1] += normal[1] * this.position.offset.normal;
    }

    // Apply tangent offset (parallel to tangent)
    if (this.position.offset?.tangent && tangent) {
      result[0] += tangent[0] * this.position.offset.tangent;
      result[1] += tangent[1] * this.position.offset.tangent;
    }

    // Apply angle rotation (around point itself)
    if (this.position.angle) {
      // For now, angle is just stored - actual rotation would be applied to the element
      // This can be implemented by subclasses
    }

    return result;
  }

  // ============================================
  // Distribution Support
  // ============================================

  /**
   * Get siblings for index calculation (for distribution)
   * Siblings are other ItemToolElements with the same layout
   * @returns Array of sibling items
   */
  protected getSiblings(): ItemToolElement[] {
    if (!this._owner) return [];

    // Query owner's children for siblings with same layout
    try {
      const children = Array.from(this._owner.children || []);
      return children.filter((c): c is ItemToolElement => {
        return c instanceof ItemToolElement && (c as any).layout === this.layout;
      });
    } catch (e) {
      return [];
    }
  }

  /**
   * Get index among siblings
   * Used for distribution calculation
   * @returns Index in siblings array, or -1 if not found
   */
  getIndex(): number {
    if (this._index >= 0) return this._index;

    const siblings = this.getSiblings();
    return siblings.indexOf(this);
  }

  /**
   * Update position based on distribution
   * Called by ItemElement's distributeItems method
   * @param index - Index in distribution
   * @param total - Total number of items
   */
  updateDistributedPosition(index: number, total: number): void {
    // Store index for later use
    this._index = index;

    // Subclasses can override to implement distribution logic
    // For example, ports on the same side could be distributed evenly
  }
}
