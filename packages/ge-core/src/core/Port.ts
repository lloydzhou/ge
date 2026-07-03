/**
 * Port —— 节点上的连接端口，挂在 Node 内部，定位为相对 owner 的局部坐标。
 */
import { Circle } from '@antv/g-lite';
import { Cell } from './Cell';
import { CLASS } from './types';

export interface PortStyleProps {
  /** 相对 owner 的局部坐标 */
  x?: number;
  y?: number;
  r?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  [key: string]: any;
}

const DEFAULTS: PortStyleProps = { x: 0, y: 0, r: 4, fill: '#1890ff', stroke: '#ffffff', strokeWidth: 1 };

export class Port extends Cell {
  static readonly tag = 'ge-port';
  protected body?: Circle;

  constructor(config: Record<string, any> = {}) {
    const style = { ...DEFAULTS, ...config?.style };
    super({ className: CLASS.port, ...config, style });
    this.initProps({ id: config?.id, style });
  }

  protected render(): void {
    const s = this.styleProps();
    this.body = new Circle({
      style: { cx: 0, cy: 0, r: s.r ?? 4, fill: s.fill, stroke: s.stroke, lineWidth: s.strokeWidth },
    });
    this.appendChild(this.body);
    this.setLocalPosition(s.x as number, s.y as number);
  }

  attributeChangedCallback(name: any, oldV: any, newV: any): void {
    if (oldV === newV || !this.rendered) return;
    const s = this.styleProps();
    if (name === 'x' || name === 'y') {
      this.setLocalPosition(s.x as number, s.y as number);
    } else if (this.body) {
      if (name === 'r') this.body.setAttribute('r', newV);
      else if (name === 'fill' || name === 'stroke') this.body.setAttribute(name, newV);
    }
  }

  protected styleProps(): PortStyleProps {
    return { ...DEFAULTS, ...(this.attributes as PortStyleProps) };
  }
}
