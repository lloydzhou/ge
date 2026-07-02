/**
 * GE —— 基于 AntV/G DOM 模型的图编辑器核心。
 *
 * 架构分层：
 *   utils  几何工具（纯函数）
 *   anchor 统一锚点（node-anchor / edge-anchor / registry）
 *   edge   Router / Connector（含原地 update）
 *   core   领域元素 Cell → Node/Edge/Port/Group + Graph(extends Canvas)
 */
export const VERSION = '2.0.0-alpha.0';

export * from './core';
export * from './layout';
export * from './plugins';
export * from './anchor';
export * from './edge';
export * from './utils';
