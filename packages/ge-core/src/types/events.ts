/**
 * GE 事件系统类型定义
 *
 * 参考浏览器原生 Drag and Drop API 设计
 * 支持多种交互模式：节点拖拽、边拖拽、连线创建
 */

import type { Node } from '../core/node/Node';
import type { Port } from '../core/port/Port';
import type { Edge } from '../core/edge/Edge';
import type { Graph } from '../core/Graph';

// ============================================================================
// 交互类型枚举
// ============================================================================

/**
 * GE 交互类型
 * 用于区分不同的拖拽交互场景
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
  /**
   * 设置数据
   * @param type 数据类型
   * @param data 数据内容
   */
  setData(type: string, data: unknown): void;

  /**
   * 获取数据
   * @param type 数据类型
   */
  getData(type: string): unknown;

  /**
   * 检查是否包含指定类型的数据
   * @param type 数据类型
   */
  hasType(type: string): boolean;

  /**
   * 清除所有数据
   */
  clearData(): void;

  /**
   * 允许的效果
   * - move: 移动操作
   * - copy: 复制操作
   * - link: 链接操作
   * - none: 不允许操作
   */
  effectAllowed: 'move' | 'copy' | 'link' | 'none';

  /**
   * 当前实际效果
   * 由 drop 目标设置
   */
  dropEffect: 'move' | 'copy' | 'link' | 'none';
}

// ============================================================================
// 通用 Drag 事件 - 拖拽过程事件
// ============================================================================

/**
 * GE Drag 事件
 * 在拖拽过程中触发（dragstart, drag, dragend）
 */
export interface GEDragEvent extends CustomEvent<any> {
  /**
   * 交互类型
   */
  type: GEInteractionType;

  /**
   * 源元素
   * 可能是 Node、Port 或 Edge
   */
  source: Node | Port | Edge;

  /**
   * 当前位置（相对于画布）
   */
  x: number;
  y: number;

  /**
   * 拖拽数据传输对象
   */
  dataTransfer: GEDataTransfer;

  /**
   * 阻止默认行为
   * 可以在事件处理器中调用以阻止拖拽
   */
  preventDefault(): void;
}

/**
 * DragStart 事件详情
 */
export interface GEDragStartEventDetail {
  type: GEInteractionType;
  source: Node | Port | Edge;
  x: number;
  y: number;
  dataTransfer: GEDataTransfer;
}

/**
 * Drag 事件详情
 */
export interface GEDragEventDetail {
  type: GEInteractionType;
  source: Node | Port | Edge;
  x: number;
  y: number;
  dataTransfer: GEDataTransfer;
  // 当前悬停的目标（如果有）
  target?: Node | Port | Graph;
}

/**
 * DragEnd 事件详情
 */
export interface GEDragEndEventDetail {
  type: GEInteractionType;
  source: Node | Port | Edge;
  // 是否成功 drop
  dropped: boolean;
  // 最终目标（如果成功 drop）
  target?: Node | Port | Graph;
}

// ============================================================================
// Connect 连线创建事件（独立事件）
// ============================================================================

/**
 * Connect Start 事件详情
 * 开始创建连线
 */
export interface GEConnectStartEventDetail {
  /**
   * 连线源
   */
  source: Node | Port;

  /**
   * 开始位置
   */
  x: number;
  y: number;

  /**
   * 拖拽数据传输对象
   */
  dataTransfer: GEDataTransfer;
}

/**
 * Connect Drag 事件详情
 * 拖拽连线中
 */
export interface GEConnectDragEventDetail {
  /**
   * 连线源
   */
  source: Node | Port;

  /**
   * 当前位置
   */
  x: number;
  y: number;

  /**
   * 拖拽数据传输对象
   */
  dataTransfer: GEDataTransfer;

  /**
   * 当前悬停的目标（如果有）
   */
  target?: Node | Port | Graph;
}

/**
 * Connect Drop 事件详情
 * 放置连线到目标
 */
export interface GEConnectDropEventDetail {
  /**
   * 连线源
   */
  source: Node | Port;

  /**
   * 连线目标
   */
  target: Node | Port | Graph;

  /**
   * 放置位置
   */
  x: number;
  y: number;

  /**
   * 拖拽数据传输对象
   */
  dataTransfer: GEDataTransfer;
}

/**
 * Connect End 事件详情
 * 连线操作结束
 */
export interface GEConnectEndEventDetail {
  /**
   * 连线源
   */
  source: Node | Port;

  /**
   * 是否成功创建连线
   */
  connected: boolean;

  /**
   * 最终目标（如果成功连接）
   */
  target?: Node | Port | Graph;
}

// ============================================================================
// Drop 事件 - 放置事件
// ============================================================================

/**
 * GE Drop 事件
 * 当拖拽元素被放置时触发
 */
export interface GEDropEvent extends CustomEvent<any> {
  /**
   * 交互类型
   */
  type: GEInteractionType;

  /**
   * 源元素
   */
  source: Node | Port | Edge;

  /**
   * 目标元素
   */
  target: Node | Port | Graph;

  /**
   * 放置位置
   */
  x: number;
  y: number;

  /**
   * 拖拽数据传输对象
   */
  dataTransfer: GEDataTransfer;

  /**
   * 阻止默认行为
   * 可以阻止 drop 操作
   */
  preventDefault(): void;
}

/**
 * Drop 事件详情
 */
export interface GEDropEventDetail {
  type: GEInteractionType;
  source: Node | Port | Edge;
  target: Node | Port | Graph;
  x: number;
  y: number;
  dataTransfer: GEDataTransfer;
}

// ============================================================================
// DragOver 事件 - 拖拽悬停事件
// ============================================================================

/**
 * DragOver 事件详情
 * 当拖拽元素悬停在某个目标上方时触发
 */
export interface GEDragOverEventDetail {
  type: GEInteractionType;
  source: Node | Port | Edge;
  target: Node | Port | Graph;
  x: number;
  y: number;
  dataTransfer: GEDataTransfer;
  /**
   * 目标应该调用 preventDefault() 来表示接受 drop
   */
  preventDefault(): void;
}

// ============================================================================
// ConnectOver 事件 - 连线悬停事件
// ============================================================================

/**
 * Connect Over 事件详情
 * 当连线悬停在某个目标上方时触发
 */
export interface GEConnectOverEventDetail {
  /**
   * 连线源
   */
  source: Node | Port;

  /**
   * 悬停目标
   */
  target: Node | Port | Graph;

  /**
   * 当前位置
   */
  x: number;
  y: number;

  /**
   * 拖拽数据传输对象
   */
  dataTransfer: GEDataTransfer;

  /**
   * 目标应该调用 preventDefault() 来表示接受连接
   */
  preventDefault(): void;
}

// ============================================================================
// 事件名称常量
// ============================================================================

/**
 * GE 事件名称常量
 * 用于 addEventListener/removeEventListener
 *
 * 事件命名规范：
 * - node:* - 节点相关事件
 * - connect:* - 连线创建相关事件（从源拖出线连接到目标）
 * - port:* - 端口相关事件
 *
 * 交互事件：
 * 1. 节点拖拽：node:dragstart, node:drag, node:dragend
 * 2. 连线创建：connect:start, connect:drag, connect:drop, connect:end
 */
export const GEEventNames = {
  // ========================================
  // 节点拖拽事件
  // ========================================
  NODE_DRAG_START: 'node:dragstart',
  NODE_DRAG: 'node:drag',
  NODE_DRAG_END: 'node:dragend',

  // ========================================
  // 连线创建事件（从源拖出线连接到目标）
  // ========================================
  CONNECT_START: 'connect:start',
  CONNECT_DRAG: 'connect:drag',
  CONNECT_DROP: 'connect:drop',
  CONNECT_END: 'connect:end',

  // ========================================
  // 节点状态事件
  // ========================================
  NODE_MOVED: 'node:moved',
  NODE_ADDED: 'node:added',
  NODE_REMOVED: 'node:removed',

  // ========================================
  // 边状态事件
  // ========================================
  EDGE_ADDED: 'edge:added',
  EDGE_REMOVED: 'edge:removed',
  EDGE_CHANGE: 'edge:change',

  // ========================================
  // 端口事件
  // ========================================
  PORT_ADDED: 'port:added',
  PORT_REMOVED: 'port:removed',
} as const;

export type GEEventName = typeof GEEventNames[keyof typeof GEEventNames];

// ============================================================================
// 事件处理器类型
// ============================================================================

/**
 * DragStart 事件处理器
 */
export type GEDragStartEventHandler = (e: CustomEvent<GEDragStartEventDetail>) => void | boolean;

/**
 * Drag 事件处理器
 */
export type GEDragEventHandler = (e: CustomEvent<GEDragEventDetail>) => void;

/**
 * DragEnd 事件处理器
 */
export type GEDragEndEventHandler = (e: CustomEvent<GEDragEndEventDetail>) => void;

/**
 * Drop 事件处理器
 */
export type GEDropEventHandler = (e: CustomEvent<GEDropEventDetail>) => void | boolean;

/**
 * DragOver 事件处理器
 */
export type GEDragOverEventHandler = (e: CustomEvent<GEDragOverEventDetail>) => void | boolean;

/**
 * Connect Start 事件处理器
 */
export type GEConnectStartEventHandler = (e: CustomEvent<GEConnectStartEventDetail>) => void | boolean;

/**
 * Connect Drag 事件处理器
 */
export type GEConnectDragEventHandler = (e: CustomEvent<GEConnectDragEventDetail>) => void;

/**
 * Connect Drop 事件处理器
 */
export type GEConnectDropEventHandler = (e: CustomEvent<GEConnectDropEventDetail>) => void | boolean;

/**
 * Connect End 事件处理器
 */
export type GEConnectEndEventHandler = (e: CustomEvent<GEConnectEndEventDetail>) => void;

/**
 * Connect Over 事件处理器
 */
export type GEConnectOverEventHandler = (e: CustomEvent<GEConnectOverEventDetail>) => void | boolean;
