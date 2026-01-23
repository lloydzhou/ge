import { Circle, CustomElement, type DisplayObject } from '@antv/g-lite';
import type { Vec2 } from '../../utils/edgeLayout';
import type { Edge } from './Edge';
import type { BaseStyleProps } from '../../types';

export interface EdgeToolOptions {
  // 工具的类型
  type: 'vertices' | 'button' | 'boundary' | string;
  // 工具的位置
  position?: Vec2;
  // 工具的样式
  style?: BaseStyleProps;
  // 工具的偏移量
  offset?: number;
}

export class EdgeTool extends CustomElement<EdgeToolOptions> {
  private edge: Edge | null = null;
  private innerShape: DisplayObject | null = null;

  constructor(options: EdgeToolOptions, edge: Edge) {
    super({
      className: 'g-edge-tool',
      ...options
    });
    this.edge = edge;
    this.createToolShape();
  }

  private createToolShape() {
    const type = this.attributes.type;
    const style = this.attributes.style || {};

    switch (type) {
      case 'vertices':
        // 创建顶点工具（小圆点）
        this.innerShape = new Circle({
          style: {
            r: 6,
            fill: '#333',
            stroke: '#fff',
            lineWidth: 1,
            cursor: 'move',
            ...style
          }
        });
        break;
      default:
        // 默认创建一个圆形工具
        this.innerShape = new Circle({
          style: {
            r: 6,
            fill: '#333',
            stroke: '#fff',
            lineWidth: 1,
            ...style
          }
        });
    }

    if (this.innerShape) {
      this.appendChild(this.innerShape);
    }
  }

  // 更新工具位置
  updatePosition(position: Vec2) {
    if (this.innerShape) {
      this.innerShape.setPosition(position[0], position[1]);
    }
  }

  // 获取关联的边
  getEdge(): Edge | null {
    return this.edge;
  }
}