/**
 * 基础几何类型 —— GE 全局共享的唯一类型源。
 * 所有原语（Anchor / Router / Connector）都基于这些类型。
 */

/** 二维点 / 向量 */
export interface Point {
  x: number;
  y: number;
}

/** 轴对齐包围盒（左上角 + 宽高） */
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** BBox 的四角与中心 */
export interface BBoxCorners {
  center: Point;
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

/** 直线段 */
export interface Segment {
  start: Point;
  end: Point;
}

/** 矩形四边的 t 值（常用于锚点定位） */
export interface RectEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
