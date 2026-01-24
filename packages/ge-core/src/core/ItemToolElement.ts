import { DisplayObject, Text, HTML, CustomEvent } from '@antv/g-lite';
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
 * - Inline editing support (contenteditable)
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
  // ContentEditable Support (inline editing)
  // ============================================

  /** ContentEditable state (like browser's contenteditable attribute) */
  protected _contenteditable: boolean | string = false;

  /** HTML input element for inline editing (using @antv/g-lite HTML class) */
  private _editingInput: HTMLInputElement | null = null;

  /** Original text before editing (for cancel) */
  private _originalText: string = '';

  /**
   * Get attribute value (DOM-like API)
   * Supports: contenteditable
   * @param name - Attribute name
   * @returns Attribute value or null
   */
  getAttribute(name: string): string | null {
    if (name === 'contenteditable') {
      if (this._contenteditable === true) return 'true';
      if (this._contenteditable === false) return 'false';
      return String(this._contenteditable);
    }
    return null;
  }

  /**
   * Set attribute value (DOM-like API)
   * Supports: contenteditable
   * @param name - Attribute name
   * @param value - Attribute value
   */
  setAttribute(name: string, value: string | boolean | null): void {
    if (name === 'contenteditable') {
      const oldValue = this._contenteditable;

      if (value === true || value === 'true') {
        this._contenteditable = true;
      } else if (value === false || value === 'false') {
        this._contenteditable = false;
      } else {
        this._contenteditable = String(value);
      }

      // Enable/disable editing based on contenteditable state
      if (!oldValue && this._contenteditable) {
        // Enable editing
        this._setupEditing();
      } else if (oldValue && !this._contenteditable) {
        // Disable editing
        this._cleanupEditing();
      }
    }
  }

  /**
   * Remove attribute (DOM-like API)
   * @param name - Attribute name
   */
  removeAttribute(name: string): void {
    if (name === 'contenteditable') {
      this._contenteditable = false;
      this._cleanupEditing();
    }
  }

  /**
   * Setup editing handlers when contenteditable is enabled
   * Uses parent's _setupDblClick method and listens for dblclick event
   */
  private _setupEditing(): void {
    const label = this.getLabelShape();
    if (!label) return;

    // Use parent's _setupDblClick method
    this._setupDblClick(label);

    // Listen for dblclick event to start editing
    this.addEventListener('dblclick', () => {
      if (this._contenteditable) {
        // Dispatch edit start event
        this.dispatchEvent(new CustomEvent('editstart', {
          detail: { source: this, target: 'label' }
        } as any));
        this._startEditing();
      }
    });
  }

  /**
   * Cleanup editing handlers when contenteditable is disabled
   */
  private _cleanupEditing(): void {
    // Cancel any active editing
    if (this._editingInput) {
      this._cancelEditing();
    }
  }

  /**
   * Start inline editing
   * Creates an HTML input using @antv/g-lite's HTML class
   */
  private _startEditing(): void {
    const label = this.getLabelShape();
    if (!label) return;

    const currentText = (label as any).style?.text || '';
    this._originalText = currentText;

    // Get label bounds for positioning
    const bounds = label.getLocalBounds?.();
    if (!bounds) return;

    const x = bounds.min[0];
    const y = bounds.min[1];
    const width = Math.max(100, bounds.max[0] - bounds.min[0]);
    const height = Math.max(30, bounds.max[1] - bounds.min[1]);

    // Get label style
    let fontSize = 12;
    let fontFamily = 'sans-serif';
    if (label && (label as any).style) {
      fontSize = Number((label as any).style.fontSize) || 12;
      fontFamily = (label as any).style.fontFamily || 'sans-serif';
    }

    // Create HTML element with input
    const inputHTML = document.createElement('input');
    inputHTML.type = 'text';
    inputHTML.value = currentText;
    inputHTML.style.cssText = `
      width: 100%;
      height: 100%;
      padding: 4px 8px;
      font-size: ${fontSize}px;
      font-family: ${fontFamily};
      border: 1px solid #1890ff;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      outline: none;
      background: #fff;
      box-sizing: border-box;
    `;

    // Create HTML display object (using @antv/g-lite's HTML class)
    const htmlInput = new HTML({
      style: {
        x,
        y: y - 5, // 稍微往上偏移
        width,
        height,
        zIndex: 9999, // 确保 input 在最上层
        innerHTML: inputHTML
      }
    });

    // Store reference and add to this element
    this._editingInput = inputHTML as any;
    this.appendChild(htmlInput);

    // Use requestAnimationFrame to ensure DOM is ready before adding listeners and focusing
    requestAnimationFrame(() => {
      // Listen for editing events
      inputHTML.addEventListener('blur', this._handleBlur);
      inputHTML.addEventListener('keydown', this._handleKeyDown);

      // Auto-select text and focus
      inputHTML.select();
      inputHTML.focus();
    });
  }

  /**
   * Handle blur (commit editing)
   */
  private _handleBlur = (): void => {
    this._commitEditing();
  };

  /**
   * Handle keyboard events (Enter to commit, Esc to cancel)
   */
  private _handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._commitEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this._cancelEditing();
    }
  };

  /**
   * Commit editing changes
   */
  private _commitEditing(): void {
    if (!this._editingInput) return;

    const newValue = (this._editingInput as any).value;
    const oldValue = this._originalText;

    // Update label text only if changed
    if (newValue !== oldValue) {
      const label = this.getLabelShape();
      if (label && (label as any).style) {
        (label as any).style.text = newValue;
      }
    }

    // Cleanup
    this._cleanupEditingInput();

    // Dispatch edit end event
    this.dispatchEvent(new CustomEvent('editend', {
      detail: {
        source: this,
        target: 'label',
        oldValue,
        newValue
      }
    } as any));
  }

  /**
   * Cancel editing without saving
   */
  private _cancelEditing(): void {
    this._cleanupEditingInput();

    // Dispatch cancel event
    this.dispatchEvent(new CustomEvent('editcancel', {
      detail: {
        source: this,
        target: 'label',
        originalValue: this._originalText
      }
    } as any));
  }

  /**
   * Clean up editing input
   */
  private _cleanupEditingInput(): void {
    if (this._editingInput) {
      this._editingInput.removeEventListener('blur', this._handleBlur);
      this._editingInput.removeEventListener('keydown', this._handleKeyDown);

      // Remove HTML element from this element
      const htmlElement = this.children?.find((child): child is HTML => child instanceof HTML);
      if (htmlElement && this.contains(htmlElement)) {
        try {
          this.removeChild(htmlElement);
        } catch (e) {
          console.warn('[ItemToolElement._cleanupEditingInput] Failed to remove HTML element:', e);
        }
      }

      this._editingInput = null;
    }
    this._originalText = '';
  }

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
    const nodeName = shape.nodeName?.toLowerCase() || '';
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
      // Try to use getPointAtLength and getTangentAt if available (SVG Path API)
      if (typeof (path as any).getPointAtLength === 'function') {
        const totalLength = (path as any).getTotalLength?.() || 100;
        const point = (path as any).getPointAtLength(t * totalLength);

        // Handle different return types: {x, y} object or [x, y] array
        let pos: Vec2 = [0, 0];
        if (point && typeof point === 'object') {
          if (Array.isArray(point)) {
            pos = point as Vec2;
          } else if ('x' in point && 'y' in point) {
            pos = [point.x, point.y];
          }
        }

        let tangent: Vec2 | undefined;
        if (typeof (path as any).getTangentAt === 'function') {
          const tan = (path as any).getTangentAt(t * totalLength);
          if (tan) {
            if (Array.isArray(tan)) {
              tangent = tan as Vec2;
            } else if ('x' in tan && 'y' in tan) {
              tangent = [tan.x, tan.y];
            }
          }
        }

        // CRITICAL: If getTangentAt doesn't exist or returned null/undefined,
        // calculate tangent from nearby points on the path
        if (!tangent && typeof (path as any).getPointAtLength === 'function') {
          try {
            const epsilon = 0.001;
            const p1 = (path as any).getPointAtLength(Math.max(0, t * totalLength - epsilon));
            const p2 = (path as any).getPointAtLength(Math.min(totalLength, t * totalLength + epsilon));

            if (p1 && p2) {
              const x1 = Array.isArray(p1) ? p1[0] : (p1 as any).x;
              const y1 = Array.isArray(p1) ? p1[1] : (p1 as any).y;
              const x2 = Array.isArray(p2) ? p2[0] : (p2 as any).x;
              const y2 = Array.isArray(p2) ? p2[1] : (p2 as any).y;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len > 0.0001) {
                tangent = [dx / len, dy / len] as Vec2;
              }
            }
          } catch (e) {
            // ignore tangent calculation error
          }
        }

        console.log('[calculatePositionOnPath] Path API result:', {
          hasPointAtLength: typeof (path as any).getPointAtLength === 'function',
          pos,
          tangent,
          hasOffset: !!this.position.offset
        });

        return this.applyOffsetAndAngle(pos, tangent);
      }

      // Fallback for Line (x1, y1, x2, y2): interpolate between start and end points
      const style = (path as any).style;
      if (style && typeof style.x1 === 'number' && typeof style.y1 === 'number' &&
          typeof style.x2 === 'number' && typeof style.y2 === 'number') {
        const x1 = style.x1, y1 = style.y1;
        const x2 = style.x2, y2 = style.y2;

        // Interpolate point at t
        const pos: Vec2 = [
          x1 + (x2 - x1) * t,
          y1 + (y2 - y1) * t
        ];

        // Calculate tangent (direction vector)
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const tangent: Vec2 = length > 0 ? [dx / length, dy / length] : [0, 0];

        console.log('[calculatePositionOnPath] Line fallback:', {
          x1, y1, x2, y2,
          pos,
          tangent,
          hasOffset: !!this.position.offset
        });

        return this.applyOffsetAndAngle(pos, tangent);
      }

      // Final fallback: return [0, 0]
      console.warn('[calculatePositionOnPath] No valid path method found, returning [0, 0]');
      return [0, 0];
    } catch (e) {
      console.error('[calculatePositionOnPath] Error:', e);
      return [0, 0];
    }
  }

  /**
   * Calculate position on a Shape based on layout
   * For Node ports, labels, and tools
   * @param shape - Shape object
   * @param layout - Layout type
   * @returns Position on shape (relative to shape origin)
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
          case 'center': return center;
          case 'top': return [center[0], bounds.min[1]];
          case 'bottom': return [center[0], bounds.max[1]];
          case 'left': return [bounds.min[0], center[1]];
          case 'right': return [bounds.max[0], center[1]];
          default: return center;
        }
      }

      // Handle object layout types
      if (typeof layout === 'object') {
        const layoutName = (layout as any).name;

        if (layoutName === 'angle') {
          const angle = ((layout as any).args?.angle ?? 0) * Math.PI / 180;
          const r = Math.max(size[0], size[1]) / 2;
          return [
            center[0] + r * Math.cos(angle),
            center[1] + r * Math.sin(angle)
          ];
        }

        if (layoutName === 'absolute') {
          return [
            Number((layout as any).args?.x ?? 0),
            Number((layout as any).args?.y ?? 0)
          ];
        }

        if (layoutName === 'path') {
          // For closed shapes with 'path' layout, treat as center
          // (path layout is mainly for Edge labels, which use calculatePositionOnPath)
          return center;
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

    console.log('[applyOffsetAndAngle] Input:', {
      point,
      offset: this.position.offset,
      angle: this.position.angle,
      tangent
    });

    // Apply normal offset (perpendicular to tangent)
    if (this.position.offset?.normal && tangent) {
      const normal = [-tangent[1], tangent[0]]; // Perpendicular
      result[0] += normal[0] * this.position.offset.normal;
      result[1] += normal[1] * this.position.offset.normal;

      console.log('[applyOffsetAndAngle] Applied normal offset:', {
        normal,
        offsetValue: this.position.offset.normal,
        result
      });
    }

    // Apply tangent offset (parallel to tangent)
    if (this.position.offset?.tangent && tangent) {
      result[0] += tangent[0] * this.position.offset.tangent;
      result[1] += tangent[1] * this.position.offset.tangent;

      console.log('[applyOffsetAndAngle] Applied tangent offset:', {
        tangent,
        offsetValue: this.position.offset.tangent,
        result
      });
    }

    // Apply angle rotation (around point itself)
    if (this.position.angle) {
      // For now, angle is just stored - actual rotation would be applied to the element
      // This can be implemented by subclasses
      console.log('[applyOffsetAndAngle] Angle not implemented yet:', this.position.angle);
    }

    console.log('[applyOffsetAndAngle] Final result:', result);

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
