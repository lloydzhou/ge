import { Text } from '@antv/g-lite';
import { ItemToolElement } from './ItemToolElement';
import type { ItemElement } from './ItemElement';
import type { Vec2 } from '../types';

/**
 * ItemLabelElement - 统一的 Label 元素
 *
 * 继承 ItemToolElement<Text>，提供：
 * - 文本内容管理 (getText/setText)
 * - 统一的编辑功能 (contenteditable, double-click)
 * - 自动定位逻辑：
 *   - owner 是 Node → 使用 layout='center'，通过 calculatePositionOnShape() 计算
 *   - owner 是 Edge → 使用 layout={name: 'path', args: {distance, offset, angle}}
 */
export class ItemLabelElement extends ItemToolElement<Text> {
  constructor(config: {
    id?: string;
    text?: string;
    position?: {
      distance?: number;
      offset?: { normal?: number; tangent?: number };
      angle?: number;
    };
    style?: {
      fill?: string;
      fontSize?: number;
      fontFamily?: string;
      background?: string;
      padding?: number;
      zIndex?: number;
      [key: string]: unknown;
    };
    editable?: boolean;
  }) {
    super({ id: config.id || `label-${Math.random().toString(36).slice(2, 9)}` });

    // For Node labels, default layout is 'center'
    // For Edge labels, layout will be {name: 'path', args: {...}} based on position config
    this.layout = 'center';

    // Store position parameters and convert to path layout for Edge labels
    if (config.position) {
      this.position.distance = config.position.distance;
      if (config.position.offset) {
        this.position.offset = config.position.offset;
      }
      this.position.angle = config.position.angle;

      // If position has distance, treat this as an Edge label with path layout
      if (config.position.distance !== undefined) {
        this.layout = {
          name: 'path',
          args: {
            distance: config.position.distance,
            offset: config.position.offset,
            angle: config.position.angle
          }
        };
      }
    }

    // Create primaryShape (Text)
    this.primaryShape = this.createPrimaryShape({
      id: `${this.id}-primary`,
      style: {
        text: config.text || this.id,
        fill: config.style?.fill || '#000',
        fontSize: config.style?.fontSize || 12,
        fontFamily: config.style?.fontFamily || 'sans-serif',
        textAlign: 'center',
        textBaseline: 'middle',
        zIndex: config.style?.zIndex ?? 1,
        ...config.style
      }
    });

    this.appendChild(this.primaryShape);

    // Enable editing if editable is true
    if (config.editable === true) {
      this.setAttribute('contenteditable', 'true');
    }
  }

  /**
   * Create the primary Text shape
   */
  protected createPrimaryShape(config: { id?: string; style?: any }): Text {
    return new Text(config);
  }

  /**
   * Get the text content
   */
  getText(): string {
    return (this.primaryShape as any).style?.text || '';
  }

  /**
   * Set the text content
   */
  setText(text: string): void {
    if (this.primaryShape) {
      (this.primaryShape as any).style.text = text;
    }
  }

  /**
   * Get the label shape (returns primaryShape which is the Text)
   */
  getLabelShape(): Text | null {
    return this.primaryShape;
  }

  /**
   * Set the owner (Node or Edge) for this label
   */
  setOwner(owner: ItemElement): void {
    this._owner = owner;
  }

  /**
   * Update position based on layout type
   * - layout='center' → Node label, position at center of shape
   * - layout={name:'path', args:{distance, offset, angle}} → Edge label, position along path
   */
  updatePosition(): void {
    if (!this._owner) return;

    const ownerShape = (this._owner as any).primaryShape;
    if (!ownerShape) return;

    try {
      // Check if layout is path layout
      if (typeof this.layout === 'object' && (this.layout as any).name === 'path') {
        // Edge label: position along path at distance t
        const args = (this.layout as any).args || {};
        const distance = args.distance ?? 0.5;

        console.log('[ItemLabelElement.updatePosition] Path label:', {
          id: this.id,
          args,
          offset: args.offset,
          distance
        });

        // Backfill position.offset/angle from layout.args so calculatePositionOnPath can use them
        this.position.distance = distance;
        if (args.offset) {
          this.position.offset = args.offset;
        }
        if (args.angle !== undefined) {
          this.position.angle = args.angle;
        }

        console.log('[ItemLabelElement.updatePosition] After backfill:', {
          position: this.position
        });

        // Get position along path with offset applied
        const pos = this.calculatePositionOnPath(ownerShape, distance);

        console.log('[ItemLabelElement.updatePosition] Final position:', pos);

        // For Edge labels, the path position is already in canvas coordinates
        this.setPosition(pos);
      } else {
        // Node label: use calculatePositionOnShape with layout (default 'center')
        // Returns position relative to shape
        const localPos = this.calculatePositionOnShape(ownerShape, this.layout);

        // Get owner's absolute position (Node's position)
        const ownerPos = (this._owner as any).getPosition?.() || [0, 0];
        const ownerX = Number(ownerPos[0]) || 0;
        const ownerY = Number(ownerPos[1]) || 0;

        // Final position = owner position + local position
        this.setPosition([ownerX + localPos[0], ownerY + localPos[1]]);
      }
    } catch (e) {
      console.error('[ItemLabelElement.updatePosition] Error:', e);
    }
  }

  connectedCallback(): void {
    // Initialize interaction event listeners (from ItemToolElement)
    this._initInteraction();

    // Update position on connection
    this.updatePosition();
  }
}
