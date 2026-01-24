/**
 * Layout System for GE (Graph Editor)
 *
 * Provides unified positioning algorithms for Labels, Ports, and Tools.
 * All positioning logic uses ItemToolElement.calculatePositionOnShape().
 *
 * ============================================
 * String Layouts (Simple)
 * ============================================
 *
 * For closed shapes (Node, Port, etc.):
 *
 * - 'center'  → Position at shape center (AABB center)
 * - 'top'     → Position at top-center of shape
 * - 'bottom'  → Position at bottom-center of shape
 * - 'left'    → Position at left-center of shape
 * - 'right'   → Position at right-center of shape
 *
 * ============================================
 * Object Layouts (Advanced)
 * ============================================
 *
 * 1. Angle Layout
 *    Position at shape edge at specified angle (0° = right, 90° = bottom)
 *    Usage: Port positioning around Node
 *    Example: { name: 'angle', args: { angle: 45 } }
 *
 * 2. Absolute Layout
 *    Position at absolute coordinates relative to shape origin
 *    Usage: Custom tool/button positioning
 *    Example: { name: 'absolute', args: { x: 10, y: 20 } }
 *
 * 3. Path Layout (for Edges)
 *    Position along a path at specified distance
 *    Usage: Edge label positioning
 *    Example: { name: 'path', args: { distance: 0.5, offset: { normal: 10 }, angle: 45 } }
 *
 *    Args:
 *    - distance: number (0-1) - Position along path (0 = start, 1 = end)
 *    - offset?: { normal?: number, tangent?: number } - Offset from path
 *      * normal: Perpendicular offset (positive = left, negative = right)
 *      * tangent: Parallel offset (along path direction)
 *    - angle?: number - Rotation in degrees
 *
 * ============================================
 * Common Layout Presets
 * ============================================
 *
 * Node Labels:
 *   - Default: 'center'
 *
 * Edge Labels:
 *   - Default: { name: 'path', args: { distance: 0.5 } } (center of edge)
 *   - Start: { name: 'path', args: { distance: 0.1 } }
 *   - End: { name: 'path', args: { distance: 0.9 } }
 *   - Above: { name: 'path', args: { distance: 0.5, offset: { normal: -10 } }
 *   - Below: { name: 'path', args: { distance: 0.5, offset: { normal: 10 } }
 *
 * Ports (4-way):
 *   - Top: 'top'
 *   - Bottom: 'bottom'
 *   - Left: 'left'
 *   - Right: 'right'
 *
 * Ports (Radial):
 *   - North: { name: 'angle', args: { angle: -90 } }
 *   - Northeast: { name: 'angle', args: { angle: -45 } }
 *   - East: { name: 'angle', args: { angle: 0 } }
 *   - Southeast: { name: 'angle', args: { angle: 45 } }
 *   - South: { name: 'angle', args: { angle: 90 } }
 *   - Southwest: { name: 'angle', args: { angle: 135 } }
 *   - West: { name: 'angle', args: { angle: 180 } }
 *   - Northwest: { name: 'angle', args: { angle: -135 } }
 *
 * ============================================
 * Implementation Notes
 * ============================================
 *
 * - All positions are calculated relative to shape origin (top-left)
 * - For closed shapes, use getLocalBounds() to get AABB
 * - For path shapes (Edge), use getPointAtLength() or interpolation
 * - After calculating local position, add owner's position for canvas coords
 *
 * @see ItemToolElement.calculatePositionOnShape()
 * @see ItemToolElement.calculatePositionOnPath()
 */

import type { Vec2 } from '../../types';

/**
 * String layout type (simple presets)
 */
export type StringLayout =
  | 'center'   // Center of shape (AABB center)
  | 'top'      // Top-center of shape
  | 'bottom'   // Bottom-center of shape
  | 'left'     // Left-center of shape
  | 'right';   // Right-center of shape

/**
 * Angle layout - position at shape edge at specified angle
 *
 * Angle convention (degrees):
 * - 0   = Right (East)
 * - 90  = Bottom (South)
 * - 180 = Left (West)
 * - -90 = Top (North)
 */
export interface AngleLayout {
  name: 'angle';
  args: {
    angle: number;  // Angle in degrees
  };
}

/**
 * Absolute layout - position at absolute coordinates
 */
export interface AbsoluteLayout {
  name: 'absolute';
  args: {
    x: number;
    y: number;
  };
}

/**
 * Path layout - position along a path (for Edge labels)
 *
 * @example
 * // Center of edge, 10px above
 * { name: 'path', args: { distance: 0.5, offset: { normal: -10 } } }
 *
 * // Quarter of edge, rotated 45 degrees
 * { name: 'path', args: { distance: 0.25, angle: 45 } }
 */
export interface PathLayout {
  name: 'path';
  args: {
    distance: number;  // Position along path (0-1)
    offset?: {
      normal?: number;   // Perpendicular offset
      tangent?: number;  // Parallel offset
    };
    angle?: number;      // Rotation in degrees
  };
}

/**
 * Union type of all layout options
 */
export type LayoutOption =
  | StringLayout
  | AngleLayout
  | AbsoluteLayout
  | PathLayout;

/**
 * Check if layout is path layout
 */
export function isPathLayout(layout: string | LayoutOption): layout is PathLayout {
  return typeof layout === 'object' && (layout as any).name === 'path';
}

/**
 * Check if layout is angle layout
 */
export function isAngleLayout(layout: string | LayoutOption): layout is AngleLayout {
  return typeof layout === 'object' && (layout as any).name === 'angle';
}

/**
 * Check if layout is absolute layout
 */
export function isAbsoluteLayout(layout: string | LayoutOption): layout is AbsoluteLayout {
  return typeof layout === 'object' && (layout as any).name === 'absolute';
}

/**
 * Check if layout is string layout
 */
export function isStringLayout(layout: string | LayoutOption): layout is StringLayout {
  return typeof layout === 'string';
}

/**
 * Common layout presets for quick access
 */
export const LayoutPresets = {
  // Node label presets
  CENTER: 'center' as StringLayout,

  // Edge label presets
  PATH_CENTER: { name: 'path', args: { distance: 0.5 } } as PathLayout,
  PATH_START: { name: 'path', args: { distance: 0.1 } } as PathLayout,
  PATH_END: { name: 'path', args: { distance: 0.9 } } as PathLayout,
  PATH_ABOVE: { name: 'path', args: { distance: 0.5, offset: { normal: -10 } } } as PathLayout,
  PATH_BELOW: { name: 'path', args: { distance: 0.5, offset: { normal: 10 } } } as PathLayout,

  // Port presets (cardinal directions)
  TOP: 'top' as StringLayout,
  BOTTOM: 'bottom' as StringLayout,
  LEFT: 'left' as StringLayout,
  RIGHT: 'right' as StringLayout,

  // Port presets (ordinal directions using angle)
  NORTH: { name: 'angle', args: { angle: -90 } } as AngleLayout,
  NORTHEAST: { name: 'angle', args: { angle: -45 } } as AngleLayout,
  EAST: { name: 'angle', args: { angle: 0 } } as AngleLayout,
  SOUTHEAST: { name: 'angle', args: { angle: 45 } } as AngleLayout,
  SOUTH: { name: 'angle', args: { angle: 90 } } as AngleLayout,
  SOUTHWEST: { name: 'angle', args: { angle: 135 } } as AngleLayout,
  WEST: { name: 'angle', args: { angle: 180 } } as AngleLayout,
  NORTHWEST: { name: 'angle', args: { angle: -135 } } as AngleLayout,
} as const;

/**
 * Type guard for preset layouts
 */
export type LayoutPreset = typeof LayoutPresets[keyof typeof LayoutPresets];
