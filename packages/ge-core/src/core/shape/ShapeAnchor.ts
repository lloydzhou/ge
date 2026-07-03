/**
 * 统一的 ShapeAnchor 系统
 *
 * 核心设计：所有 Anchor 计算都是对 DisplayObject 的操作
 * - NodeAnchor = ShapeAnchor(Node.primaryShape)
 * - PortAnchor = ShapeAnchor(Port.shape)
 * - EdgeAnchor = ShapeAnchor(Edge 作为线性 DisplayObject)
 *
 * 这样设计的好处：
 * 1. 统一的接口，简化使用
 * 2. 复用代码，减少重复
 * 3. 易于扩展，新增形状只需实现一个函数
 */

import type { DisplayObject } from '@antv/g-lite';
import type { Vec2 } from '../../types';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Anchor 点数据结构
 */
export interface AnchorPoint {
  x: number;
  y: number;
  tangent?: Vec2;   // 切向量 (normalized) - 可选
  normal?: Vec2;    // 法向量 (normalized) - 可选
}

/**
 * Anchor 计算结果
 * 可以是简化版 (仅坐标) 或完整版 (包含向量)
 */
export type AnchorResult =
  | AnchorPoint           // 完整版
  | [number, number];     // 简化版

/**
 * 统一的 ShapeAnchor 参数
 * 支持所有类型的 Anchor 计算
 */
export interface ShapeAnchorArgs {
  // ========================================
  // 通用参数 (所有形状都支持)
  // ========================================
  dx?: number | string;    // X轴偏移 (数字或百分比) 或 方向向量 X
  dy?: number | string;    // Y轴偏移 (数字或百分比) 或 方向向量 Y

  // ========================================
  // 2D 形状参数 (Node/Port 使用)
  // ========================================
  angle?: number;          // 角度锚点 (度数，0-360)
  x?: number;              // 绝对位置 X
  y?: number;              // 绝对位置 Y

  // midSide 专用 - 最近侧中心点
  direction?: Vec2;        // 进入方向向量 [dx, dy]

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

/**
 * 统一的 ShapeAnchor 函数签名
 *
 * 适用于所有 DisplayObject：
 * - Node.primaryShape (rect, circle, ellipse, polygon, etc.)
 * - Port.shape (circle, rect, or custom)
 * - Edge (作为线性形状)
 *
 * @param shape - DisplayObject (任何图形对象)
 * @param args - Anchor 参数 (根据不同预设有不同含义)
 * @returns Anchor 点坐标或完整信息
 */
export interface ShapeAnchorFunction {
  (
    shape: DisplayObject,
    args?: ShapeAnchorArgs
  ): AnchorResult;
}

/**
 * Anchor 定义类型
 * 支持多种定义方式
 */
export type AnchorDefinition<TArgs extends ShapeAnchorArgs = ShapeAnchorArgs> =
  | string                           // 预设名称，如 'center', 'top', 'midSide'
  | {
      name: string;
      args?: TArgs;
    }
  | ShapeAnchorFunction;             // 自定义函数

// ============================================================================
// 预设名称常量
// ============================================================================

/**
 * 2D 形状 Anchor 预设名称
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
 * 线性形状 Anchor 预设名称 (Edge)
 */
export type LinearAnchorPreset =
  | 'start'
  | 'end'
  | 'middle'
  | 'ratio'
  | 'length';

/**
 * 所有 Anchor 预设名称
 */
export type AnchorPreset = Shape2DAnchorPreset | LinearAnchorPreset;

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 将 AnchorResult 转换为 [number, number]
 */
export function toPoint(result: AnchorResult): [number, number] {
  if (Array.isArray(result)) {
    return result;
  }
  return [result.x, result.y];
}

/**
 * 计算两个向量之间的角度（度数）
 */
export function angleBetweenVectors(v1: Vec2, v2: Vec2): number {
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const det = v1[0] * v2[1] - v1[1] * v2[0];
  return Math.atan2(det, dot) * 180 / Math.PI;
}

/**
 * 归一化向量
 */
export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  if (len === 0) return [1, 0];
  return [v[0] / len, v[1] / len];
}

/**
 * 计算向量的垂直向量 (法向量)
 */
export function perpendicular(v: Vec2): Vec2 {
  return [-v[1], v[0]];
}

/**
 * 判断形状是否是线性形状 (Edge)
 */
export function isLinearShape(shape: DisplayObject): boolean {
  // Line, Polyline, Path 都是线性形状
  return ['line', 'polyline', 'path'].includes(shape.nodeName);
}

/**
 * 判断形状是否是 2D 形状 (Node/Port)
 */
export function is2DShape(shape: DisplayObject): boolean {
  // rect, circle, ellipse, polygon 都是 2D 形状
  return ['rect', 'circle', 'ellipse', 'polygon', 'polyline'].includes(shape.nodeName);
}
