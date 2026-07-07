/**
 * Port —— 节点上的连接端口。
 *
 * - layout attribute: 'top'/'bottom'/'left'/'right'（自动定位到 owner 边中点）
 * - 默认 absolute（x/y 局部坐标手动定位）
 */
import { Circle } from '@antv/g-lite';
import { Cell, LAYOUT } from './Cell';
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
  private ownerBound = false;

  constructor(config: Record<string, any> = {}) {
    const style = { ...DEFAULTS, ...config?.style, layout: config?.layout, x: config?.x, y: config?.y };
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
    this.bindOwnerBounds();
  }

  protected applyLayout(): void {
    const s = this.styleProps();
    const layout = (s.layout as string) ?? '';
    const parent = this.parentNode as any;
    const pw = (parent?.getAttribute?.('width') as number) ?? 100;
    const ph = (parent?.getAttribute?.('height') as number) ?? 50;
    let x = s.x as number, y = s.y as number;
    if (layout) {
      // 同方向 sibling ports → 均匀排列
      const siblings = (parent?.childNodes as any[])?.filter((c) => (c.getAttribute?.('layout') ?? '') === layout) ?? [];
      const idx = siblings.indexOf(this);
      const count = siblings.length || 1;
      const ratio = count <= 1 ? 0.5 : idx / (count - 1);
      const margin = 0.15; // 两侧留 15%
      const span = 1 - 2 * margin;
      const pos = margin + ratio * span;
      if (layout === 'top') { x = (pos - 0.5) * pw; y = -ph / 2; }
      else if (layout === 'bottom') { x = (pos - 0.5) * pw; y = ph / 2; }
      else if (layout === 'left') { x = -pw / 2; y = (pos - 0.5) * ph; }
      else if (layout === 'right') { x = pw / 2; y = (pos - 0.5) * ph; }
    }
    this.setLocalPosition(x, y);
  }

  /** 监听 owner（Node）尺寸变化，重算 port 位置（resize 后 port 贴随节点边缘） */
  protected bindOwnerBounds(): void {
    const owner = this.parentNode as any;
    if (!owner || this.ownerBound) return;
    this.ownerBound = true;
    owner.addEventListener('node:boundschange', () => this.markDirty(LAYOUT));
  }

  /** Scheduler 帧边界统一调用 */
  flushDirty(): void {
    const d = this._dirty;
    this._dirty = 0;
    if (d & LAYOUT) this.applyLayout();
  }

  attributeChangedCallback(name: any, oldV: any, newV: any): void {
    if (oldV === newV || !this.rendered) return;
    if (name === 'x' || name === 'y' || name === 'layout') {
      this.markDirty(LAYOUT);
    } else if (this.body) {
      if (name === 'r') this.body.setAttribute('r', newV);
      else if (name === 'fill' || name === 'stroke') this.body.setAttribute(name, newV);
    }
  }

  protected styleProps(): PortStyleProps {
    return { ...DEFAULTS, ...(this.attributes as PortStyleProps) };
  }
}
