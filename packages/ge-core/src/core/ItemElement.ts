import { DisplayObject } from '@antv/g-lite';
import { GEInteractiveElement } from './GEInteractiveElement';
import type { Port } from '../port/Port';
import type { PortConfig } from '../../types';

/**
 * Forward declaration - will be defined in ItemToolElement.ts
 */
export interface ItemToolElement {
  getIndex?(): number;
  updateDistributedPosition?(index: number, total: number): void;
}

/**
 * ItemElement - Collection Manager for Node/Edge/Group
 *
 * Extends GEInteractiveElement to provide:
 * - Collection management (tools/ports/labels arrays)
 * - Layout algorithms (distributeItems for even distribution)
 * - Convenience methods (addPort, getPorts, etc.)
 *
 * Responsibilities:
 * - Manage tools/ports/labels arrays (for tracking and layout)
 * - Provide distributeItems() layout algorithm
 * - Provide convenience methods (addPort, getPorts, etc.)
 * - Track items by layout type for distribution
 *
 * Note: ItemToolElement instances still live in owner.children (DOM-compliant).
 * The arrays in ItemElement are for tracking and layout only.
 *
 * Inheritance:
 * CustomElement (@antv/g-lite)
 *   ↑
 * GEInteractiveElement<TShape> (existing - interactions)
 *   ↑
 * ItemElement<TShape> (NEW - collection management)
 *   ↑
 * Node | Edge | Group
 *
 * @template TShape - The display object type used as primary shape
 */
export abstract class ItemElement<TShape extends DisplayObject = DisplayObject>
  extends GEInteractiveElement<TShape> {

  // Collection arrays (for tracking and layout)
  protected tools: ItemToolElement[] = [];
  protected ports: ItemToolElement[] = [];
  protected labels: ItemToolElement[] = [];

  /**
   * Layout algorithm: distribute items evenly
   * Called when items are added/removed
   *
   * @param items - Array of items to distribute
   */
  protected distributeItems(items: ItemToolElement[]): void {
    const count = items.length;
    if (count === 0) return;

    // Sort by index and distribute evenly
    items.sort((a, b) => (a.getIndex?.() ?? 0) - (b.getIndex?.() ?? 0));

    items.forEach((item, i) => {
      // Update item's position based on distribution
      item.updateDistributedPosition?.(i, count);
    });
  }

  /**
   * Add a port to this element
   * Port is added to children AND tracked in ports array
   *
   * @param config - Port configuration
   * @returns The created port
   */
  addPort(config: PortConfig): Port {
    // Forward to existing Node.createPort method
    // Subclasses (Node) should override this to use their own createPort
    throw new Error('addPort must be implemented by subclass (Node)');
  }

  /**
   * Get all ports
   * @returns Array of ports
   */
  getPorts(): Port[] {
    return [...this.ports] as Port[];
  }

  /**
   * Get all tools
   * @returns Array of tools
   */
  getTools(): ItemToolElement[] {
    return [...this.tools];
  }

  /**
   * Get all labels
   * @returns Array of labels
   */
  getLabels(): ItemToolElement[] {
    return [...this.labels];
  }

  /**
   * Track an item in the appropriate collection array
   * Called by subclasses after appending item to children
   *
   * @param item - The item to track
   * @param type - The collection type ('tool', 'port', or 'label')
   */
  protected _trackItem(item: ItemToolElement, type: 'tool' | 'port' | 'label'): void {
    switch (type) {
      case 'tool':
        this.tools.push(item);
        break;
      case 'port':
        this.ports.push(item);
        break;
      case 'label':
        this.labels.push(item);
        break;
    }
  }

  /**
   * Untrack an item from the appropriate collection array
   * Called by subclasses after removing item from children
   *
   * @param item - The item to untrack
   * @param type - The collection type ('tool', 'port', or 'label')
   */
  protected _untrackItem(item: ItemToolElement, type: 'tool' | 'port' | 'label'): void {
    switch (type) {
      case 'tool':
        const toolIndex = this.tools.indexOf(item);
        if (toolIndex !== -1) this.tools.splice(toolIndex, 1);
        break;
      case 'port':
        const portIndex = this.ports.indexOf(item);
        if (portIndex !== -1) this.ports.splice(portIndex, 1);
        break;
      case 'label':
        const labelIndex = this.labels.indexOf(item);
        if (labelIndex !== -1) this.labels.splice(labelIndex, 1);
        break;
    }
  }
}
