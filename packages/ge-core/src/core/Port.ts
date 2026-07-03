/**
 * Port —— 节点上的连接端口。
 *
 * - layout attribute: 'top'/'bottom'/'left'/'right'（自动定位到 owner 边中点）
 * - 默认 absolute（x/y 局部坐标手动定位）
 */
import { Circle } from '@antv/g-lite';
import { Cell } from './Cell';
import { CLASS } from './types';

export interface PortStyleProps {
  x?: number;
  y?: number;
  r?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  layout?: string;
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
    this.applyLayout();
  }

  protected applyLayout(): void {
    const s = this.styleProps();
    const layout = (s.layout as string) ?? '';
    const parent = this.parentNode as any;
    const pw = (parent?.getAttribute?.('width') as number) ?? 100;
    const ph = (parent?.getAttribute?.('height') as number) ?? 50;
    let x = s.x as number, y = s.y as number;
    if (layout === 'top') { x = pw / 2; y = 0; }
    else if (layout === 'bottom') { x = pw / 2; y = ph; }
    else if (layout === 'left') { x = 0; y = ph / 2; }
    else if (layout === 'right') { x = pw; y = ph / 2; }
    this.setLocalPosition(x, y);
  }

  attributeChangedCallback(name: any, oldV: any, newV: any): void {
    if (oldV === newV || !this.rendered) return;
    const s = this.styleProps();
    if (name === 'x' || name === 'y' || name === 'layout') {
      this.applyLayout();
    } else if (this.body) {
      if (name === 'r') this.body.setAttribute('r', newV);
      else if (name === 'fill' || name === 'stroke') this.body.setAttribute(name, newV);
    }
  }

  protected styleProps(): PortStyleProps {
    return { ...DEFAULTS, ...(this.attributes as PortStyleProps) };
  }
}
