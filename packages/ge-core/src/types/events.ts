/**
 * GE 事件系统类型定义
 *
 * 现在基于 g-plugin-dragndrop 的标准事件系统
 * 保留必要的类型定义以兼容现有代码
 */

import type { Node } from '../core/node/Node';
import type { Port } from '../core/port/Port';
import type { Edge } from '../core/edge/Edge';
import type { Graph } from '../core/Graph';

// ============================================================================
// 交互类型枚举（用于内部逻辑区分）
// ============================================================================

/**
 * GE 交互类型
 * 用于区分不同的拖拽交互场景
 * @deprecated 现在 g-plugin-dragndrop 统一处理所有拖拽
 */
export enum GEInteractionType {
  // 节点拖拽移动
  NODE_DRAG = 'ge:nodedrag',
  // 边拖拽移动
  EDGE_DRAG = 'ge:edgedrag',
  // 连线创建
  CONNECTION = 'ge:connection',
}

// ============================================================================
// DataTransfer - 类似浏览器的 dataTransfer
// ============================================================================

/**
 * 拖拽数据传输对象
 * 类似浏览器原生 dataTransfer，用于在拖拽过程中传递数据
 */
export interface GEDataTransfer {
  setData(type: string, data: unknown): void;
  getData(type: string): unknown;
  hasType(type: string): boolean;
  clearData(): void;
  effectAllowed: 'move' | 'copy' | 'link' | 'none';
  dropEffect: 'move' | 'copy' | 'link' | 'none;
}

// ============================================================================
// 事件名称常量（保留用于向后兼容）
// ============================================================================

/**
 * GE 事件名称常量
 *
 * 现在主要使用 g-plugin-dragndrop 的标准事件：
 * - dragstart, drag, dragend (拖拽事件)
 * - dragenter, dragleave, dragover, drop (放置事件)
 *
 * GE 特有事件：
 * - node:moved (节点移动后派发)
 */
export const GEEventNames = {
  // ========================================
  // GE 特有事件
  // ========================================
  NODE_MOVED: 'node:moved',
  NODE_ADDED: 'node:added',
  NODE_REMOVED: 'node:removed',
  EDGE_ADDED: 'edge:added',
  EDGE_REMOVED: 'edge:removed',
  EDGE_CHANGE: 'edge:change',
  PORT_ADDED: 'port:added',
  PORT_REMOVED: 'port:removed',

  // ========================================
  // 已废弃：现在使用 g-plugin-dragndrop 的标准事件
  // ========================================
  // NODE_DRAG_START: 'node:dragstart',  // 使用 dragstart
  // NODE_DRAG: 'node:drag',                  // 使用 drag
  // NODE_DRAG_END: 'node:dragend',        // 使用 dragend
  // CONNECT_START: 'connect:start',          // 使用 dragstart (检查 style.linkable)
  // CONNECT_DRAG: 'connect:drag',            // 使用 drag (检查 style.linkable)
  // CONNECT_DROP: 'connect:drop',            // 使用 drop (检查 style.linkto)
  // CONNECT_END: 'connect:end',              // 使用 dragend
} as const;

export type GEEventName = typeof GEEventNames[keyof typeof GEEventNames];

// ============================================================================
// 事件处理器类型（向后兼容）
// ============================================================================

/**
 * Node Moved 事件处理器
 * 当节点移动后派发
 */
export type GENodeMovedEventHandler = (e: CustomEvent<{ id: string; x: number; y: number }>) => void;
