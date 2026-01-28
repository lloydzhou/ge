import type { CanvasConfig } from '@antv/g-lite';
import type { EdgeRouter } from '../core/edge/EdgeRouter';
import type { EdgeConnector } from '../core/edge/EdgeConnector';
import type {
  GEInteractionType,
  GEDataTransfer,
} from './events';

// Forward declarations for circular dependencies
import type { Graph } from '../core/Graph';
import type { Node } from '../core/node/Node';
import type { Edge } from '../core/edge/Edge';
import type { Port } from '../core/port/Port';
import type { ItemElement } from '../core/ItemElement';
import type { ItemToolElement } from '../core/ItemToolElement';
import type { ItemLabelElement } from '../core/ItemLabelElement';

// Export types
export type { Graph, Node, Edge, Port, ItemElement, ItemToolElement, ItemLabelElement, LabelConfig };

// Note: GEInteractiveElement is not re-exported here because it causes issues with Jest's ts-jest.
// Node/Port import it directly from '../core/GEInteractiveElement' instead.

// ============================================================================
// Common Vector Types
// ============================================================================

/**
 * 2D vector type (tuple)
 */
export type Vec2 = [number, number];

// Export event types (runtime values like enums must be exported)
export { GEInteractionType } from './events';
export type {
  GEDataTransfer,
  GEDragStartEventDetail,
  GEDragEventDetail,
  GEDragEndEventDetail,
  GEDropEventDetail,
  GEDragOverEventDetail,
  GEConnectStartEventDetail,
  GEConnectDragEventDetail,
  GEConnectDropEventDetail,
  GEConnectEndEventDetail,
  GEConnectOverEventDetail,
  GEDragStartEventHandler,
  GEDragEventHandler,
  GEDragEndEventHandler,
  GEDropEventHandler,
  GEDragOverEventHandler,
  GEConnectStartEventHandler,
  GEConnectDragEventHandler,
  GEConnectDropEventHandler,
  GEConnectEndEventHandler,
  GEConnectOverEventHandler,
  GEEventNames,
  GEEventName,
} from './events';

// Common style properties
export interface BaseStyleProps {
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  lineDash?: number[];
  opacity?: number;
  visibility?: 'visible' | 'hidden';
  zIndex?: number;
  cursor?: string;
}

export interface BaseNodeStyleProps extends BaseStyleProps {
  width?: number;
  height?: number;
  radius?: number;
  x?: number;
  y?: number;
  label?: string;
  labelFill?: string;
  labelFontSize?: number;
  labelOffset?: number;
  labelEditable?: boolean; // Whether the node label is editable (double-click to edit)
}

export interface BaseEdgeStyleProps extends BaseStyleProps {
  label?: string;
  labelFill?: string;
  labelFontSize?: number;
  labelOffset?: number;
  labelZIndex?: number; // zIndex for single label (backward compatibility)
  labelEditable?: boolean; // Whether the edge label is editable (double-click to edit)
  labels?: LabelConfig[]; // Multiple labels support
  router?: EdgeRouter;
  connector?: EdgeConnector;
  vertices?: [number, number][];
  startMarker?: EdgeMarkerConfig;
  endMarker?: EdgeMarkerConfig;
}

export interface BasePortStyleProps extends BaseStyleProps {
  r?: number;
  x?: number;
  y?: number;
}

export interface EdgeMarkerConfig {
  enabled?: boolean;
  shape?: string | Function;
  size?: number;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  layout?: EdgeLayoutOptions;
}

/**
 * Label configuration for Edge labels
 */
export interface LabelConfig {
  /** Label ID (default 'default') */
  id?: string;
  /** Label text content */
  text?: string;
  /** Label position */
  position?: {
    /** t: 0-1 along edge */
    distance?: number;
    /** Offset from path */
    offset?: {
      /** Perpendicular offset */
      normal?: number;
      /** Parallel offset */
      tangent?: number;
    };
    /** Rotation in degrees */
    angle?: number;
  };
  /** Label style */
  style?: {
    fill?: string;
    fontSize?: number;
    background?: string;
    padding?: number;
    [key: string]: unknown;
  };
  /** Whether the label is editable (double-click to edit) */
  editable?: boolean;
}

export interface EdgeLayoutOptions {
  snap?: 'start' | 'end';
  t?: number;
  offset?: { normal?: number; tangent?: number };
}

// Graph configuration
export interface GraphOptions extends CanvasConfig {
  renderer?: unknown;
  /** Whether the canvas background is draggable (for camera panning) */
  draggable?: boolean;
}

// Minimap configuration
export interface MinimapConfig {
  container: HTMLElement | string;
  width?: number;
  height?: number;
  scale?: number;
  /**
   * Optional renderer for minimap.
   * If not provided, will attempt to clone the main graph's renderer.
   * Note: The minimap renderer should be the same type as the main renderer (e.g., SVGRenderer).
   */
  renderer?: any;
}

// ============================================================================
// 交互配置类型
// ============================================================================

/**
 * 拖拽配置
 * 控制节点/端口是否可拖拽移动
 */
export type DraggableConfig = boolean | {
  /** 是否启用拖拽 */
  enabled?: boolean;
  /**
   * 自定义 dragstart 处理
   * 返回 false 可以阻止拖拽开始
   */
  onDragStart?: (e: CustomEvent<any>) => void | boolean;
  /** 自定义 drag 处理 */
  onDrag?: (e: CustomEvent<any>) => void;
  /** 自定义 drop 处理 */
  onDrop?: (e: CustomEvent<any>) => void;
};

/**
 * 源连接配置
 * 控制节点/端口是否可以作为连线源
 */
export type SourceConnectableConfig = boolean | {
  /** 是否启用作为连线源 */
  enabled?: boolean;
  /**
   * 自定义 dragstart 处理
   * 返回 false 可以阻止连线开始
   */
  onDragStart?: (e: CustomEvent<any>) => void | boolean;
  /** 自定义 drag 处理 */
  onDrag?: (e: CustomEvent<any>) => void;
  /** 自定义 drop 处理 */
  onDrop?: (e: CustomEvent<any>) => void;
};

/**
 * 目标连接配置
 * 控制节点/端口是否可以作为连线目标
 */
export type TargetConnectableConfig = boolean | {
  /** 是否启用作为连线目标 */
  enabled?: boolean;
  /**
   * 自定义 dragover 处理
   * 返回 false 可以阻止在该目标上 drop
   * 类似浏览器 dragover 事件中的 preventDefault()
   */
  onDragOver?: (e: CustomEvent<any>) => void | boolean;
  /** 自定义 drop 处理 */
  onDrop?: (e: CustomEvent<any>) => void | boolean;
};

/**
 * 连接验证函数
 * 用于验证是否允许在源和目标之间创建连接
 */
export type ConnectableFunction = (
  source: Node | Port,
  target: Node | Port
) => boolean;

// Node data
export interface NodeData {
  id: string;
  x?: number;
  y?: number;
  shape?: string | Function;
  style?: BaseNodeStyleProps;

  // ========================================
  // 交互配置（模仿浏览器 drag-drop API）
  // ========================================

  /**
   * 节点拖拽配置
   * 控制节点是否可以被拖拽移动
   * @example
   * // 简单启用
   * draggable: true
   * @example
   * // 详细配置
   * draggable: {
   *   enabled: true,
   *   onDragStart: (e) => {
   *     console.log('开始拖拽节点');
   *   }
   * }
   */
  draggable?: DraggableConfig;

  /**
   * 源连接配置
   * 控制节点是否可以作为连线的源（拖出连线）
   * @example
   * sourceConnectable: true
   */
  sourceConnectable?: SourceConnectableConfig;

  /**
   * 目标连接配置
   * 控制节点是否可以作为连线的目标（接受连线）
   * @example
   * targetConnectable: {
   *   enabled: true,
   *   onDragOver: (e) => {
   *     // 可以在这里决定是否接受这个连接
   *     return validateConnection(e.detail.source);
   *   }
   * }
   */
  targetConnectable?: TargetConnectableConfig;

  /**
   * 连接验证函数
   * 统一的连接验证逻辑
   * @param source 源节点或端口
   * @param target 目标节点或端口
   * @returns 是否允许连接
   * @example
   * connectable: (source, target) => {
   *   // 不允许自连接
   *   if (source === target) return false;
   *   // 不允许超过 3 条连接
   *   if (target.getEdges().length >= 3) return false;
   *   return true;
   * }
   */
  connectable?: ConnectableFunction;
}

// Edge data
export interface EdgeData {
  id: string;
  source: string | Node | Port | null;
  target: string | Node | Port | null;
  shape?: string | Function;
  style?: BaseEdgeStyleProps;
}

// Graph data
export interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
}

// Port data
export interface PortData {
  id: string;
  parentId?: string;
  shape?: string | Function;
  style?: BasePortStyleProps;
  layout?: PortLayoutOptions;

  // ========================================
  // 交互配置（与 Node 一致）
  // ========================================

  /**
   * 端口拖拽配置
   * 控制端口是否可以被拖拽移动
   */
  draggable?: DraggableConfig;

  /**
   * 源连接配置
   * 控制端口是否可以作为连线的源（拖出连线）
   */
  sourceConnectable?: SourceConnectableConfig;

  /**
   * 目标连接配置
   * 控制端口是否可以作为连线的目标（接受连线）
   */
  targetConnectable?: TargetConnectableConfig;

  /**
   * 连接验证函数
   * 统一的连接验证逻辑
   */
  connectable?: ConnectableFunction;
}

export type PortLayoutOptions =
  | 'center'
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
    }
  | {
      name: 'path';
      args: {
        distance: number; // Position along path (0-1)
        offset?: {
          normal?: number; // Perpendicular offset
          tangent?: number; // Parallel offset
        };
        angle?: number; // Rotation in degrees
      };
    };

// Custom element configuration
export type DisplayObjectConfigWithShape<T = unknown> = import('@antv/g-lite').DisplayObjectConfig<T> & {
  shape?: string | Function;
};

// === Plugin (using Canvas's RenderingPlugin) ===
// Re-export Canvas's RenderingPlugin for convenience
export type { RenderingPlugin, RenderingPluginContext } from '@antv/g-lite';

// === GE Primitives (Non-visual graph editing objects) ===
// Re-export EdgeRouter, EdgeConnector for convenience
export type { EdgeRouter, NormalRouter, OrthogonalRouter, ManhattanRouter } from '../core/edge/EdgeRouter';
export type { EdgeConnector, NormalConnector, PolylineConnector, SmoothConnector } from '../core/edge/EdgeConnector';

// Command interface for undo/redo
export interface Command {
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;
  canExecute?(): boolean;
  canUndo?(): boolean;
}

// === ShapeAnchor System Types ===

/**
 * 2D 形状 Anchor 预设类型 (Node/Port 使用)
 */
export type Shape2DAnchorPreset =
  // 基本方向
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  // 智能预设
  | 'midSide'      // 最近侧中心点 (根据 direction 自动选择)
  | 'orth'         // 正交锚点 (选择水平或垂直方向最近的点)
  // 角度
  | 'angle'
  // 绝对位置
  | 'absolute'
  // 四个角
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight';

/**
 * 线性形状 Anchor 预设类型 (Edge 使用)
 */
export type LinearAnchorPreset =
  | 'start'
  | 'end'
  | 'middle'
  | 'ratio'
  | 'length';

/**
 * 所有 Anchor 预设类型
 */
export type AnchorPreset = Shape2DAnchorPreset | LinearAnchorPreset;

/**
 * 统一的 ShapeAnchor 参数
 * 支持所有类型的 Anchor 计算
 */
export interface ShapeAnchorArgs {
  // 通用偏移
  dx?: number | string;
  dy?: number | string;

  // ========================================
  // 2D 形状参数 (Node/Port 使用)
  // ========================================
  angle?: number;          // 角度锚点 (度数，0-360)
  x?: number;              // 绝对位置 X
  y?: number;              // 绝对位置 Y

  // midSide 专用 - 最近侧中心点
  direction?: [number, number];  // 进入方向向量 [dx, dy]

  // orth 专用 - 正交锚点
  refX?: number;           // 参考点 X 坐标
  refY?: number;           // 参考点 Y 坐标

  // ========================================
  // 线性形状参数 (Edge 使用)
  // ========================================
  t?: number;              // 0-1 之间的比例位置
  ratio?: number;          // 同 t，比例位置
  length?: number;         // 绝对长度位置

  // offset - 沿切线/法线偏移
  offset?: {
    along?: number;        // 沿切线偏移
    normal?: number;       // 沿法线偏移
  };

  // 段索引 (用于多段线)
  segmentIndex?: number;

  // 吸附选项
  snap?: 'start' | 'middle' | 'end';
}
