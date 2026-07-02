/**
 * GE 领域类型定义。
 */
import type { Point } from '../utils/types';
import type { NodeAnchorArgs } from '../anchor/types';

/** 领域形状名 */
export type ShapeName = 'rect' | 'circle' | 'ellipse' | 'diamond' | 'path';

/** Cell 的可序列化纯数据（model）—— 为 History / 序列化铺路 */
export interface CellData {
  id?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Node 领域属性（响应式 style props） */
export interface NodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  shape?: ShapeName;
  label?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  /** 业务数据 */
  data?: Record<string, unknown>;
}

/** 边端点配置 */
export interface EndpointConfig {
  /** 目标 node 的 id */
  cell: string;
  /** 锚点名称 */
  anchor?: string;
  /** 锚点参数 */
  anchorArgs?: NodeAnchorArgs;
  /** 端口 id */
  port?: string;
}

/** Edge 领域属性 */
export interface EdgeProps {
  source?: EndpointConfig | string;
  target?: EndpointConfig | string;
  router?: string;
  connector?: string;
  waypoints?: Point[];
  label?: string;
  stroke?: string;
  strokeWidth?: number;
  data?: Record<string, unknown>;
}

/** Port 领域属性 */
export interface PortProps {
  id?: string;
  anchor?: string;
  anchorArgs?: NodeAnchorArgs;
  fill?: string;
  r?: number;
}

/** Graph 构造选项 */
export interface GraphOptions {
  /** DOM 容器或选择器 */
  container: HTMLElement | string;
  width?: number;
  height?: number;
  background?: string;
}

/** 自定义元素 tag 名（用于 customElements.define / createElement） */
export const TAG = {
  node: 'ge-node',
  edge: 'ge-edge',
  port: 'ge-port',
  group: 'ge-group',
} as const;

/** className（用于 getElementsByClassName 类型识别） */
export const CLASS = {
  cell: 'ge-cell',
  node: 'ge-node',
  edge: 'ge-edge',
  port: 'ge-port',
  group: 'ge-group',
} as const;
