/**
 * Node —— 图节点，g-lite CustomElement 的领域特化。
 *
 * - 领域属性 x/y/width/height/shape/fill/stroke/strokeWidth/radius 均为响应式 style props。
 * - connectedCallback 构建主体 shape（rect/circle），修复 P0-3。
 * - 位置/尺寸变化时派发 `node:boundschange`，供相连 Edge 监听重算（事件驱动联动）。
 */
import { Rect, Circle, Ellipse, Text, type DisplayObject } from '@antv/g-lite';
import { Cell } from './Cell';
import { CLASS, type ShapeName } from './types';
import type { BBox } from '../utils/types';

export interface NodeStyleProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  shape?: ShapeName;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  label?: string;
  [key: string]: any;
}

const DEFAULTS: NodeStyleProps = {
  x: 0,
  y: 0,
  width: 120,
  height: 40,
  shape: 'rect',
  fill: '#ffffff',
  stroke: '#1890ff',
  strokeWidth: 1,
  radius: 4,
};

export class Node extends Cell {
  static readonly tag: string = 'ge-node';

  protected body?: DisplayObject;
  protected labelText?: Text;
  private _origStroke?: string;
  private _origLineWidth?: number;

  constructor(config: Record<string, any> = {}) {
    super({
      className: CLASS.node,
      ...config,
      style: { ...DEFAULTS, ...config?.style },
    });
  }

  protected render(): void {
    this.buildBody();
    this.applyPosition();
    this.syncLabel();
  }

  protected buildBody(): void {
    const s = this.styleProps();
    this.body?.destroy();
    this.body = this.createBody(s);
    this.appendChild(this.body);
  }

  protected createBody(s: NodeStyleProps): DisplayObject {
    const { shape, fill, stroke, strokeWidth, radius, width, height } = s;
    const w = width as number;
    const h = height as number;
    switch (shape) {
      case 'circle': {
        const r = Math.min(w, h) / 2;
        return new Circle({ style: { cx: w / 2, cy: h / 2, r, fill, stroke, lineWidth: strokeWidth } });
      }
      case 'ellipse': {
        return new Ellipse({ style: { cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2, fill, stroke, lineWidth: strokeWidth } });
      }
      case 'rect':
      default:
        return new Rect({ style: { width: w, height: h, fill, stroke, lineWidth: strokeWidth, radius: radius as number } });
    }
  }

  protected applyPosition(): void {
    const s = this.styleProps();
    this.setLocalPosition(s.x as number, s.y as number);
    this.fire('node:boundschange');
  }

  attributeChangedCallback(
    name: string | number | symbol,
    oldV: any,
    newV: any,
  ): void {
    if (oldV === newV) return;
    if (!this.rendered) return; // 构造期间不处理，等 connectedCallback 统一渲染
    switch (name) {
      case 'x':
      case 'y':
        this.applyPosition();
        break;
      case 'shape':
      case 'width':
      case 'height':
      case 'radius':
        this.buildBody();
        this.applyPosition();
        this.syncLabel();
        break;
      case 'fill':
      case 'stroke':
        this.body?.setAttribute(name, newV);
        break;
      case 'strokeWidth':
        this.body?.setAttribute('lineWidth', newV);
        break;
      case 'selected':
        this.applySelected(newV);
        break;
      case 'label':
        this.syncLabel();
        break;
      default:
        break;
    }
  }

  /** 同步标签文本（居中） */
  protected syncLabel(): void {
    const s = this.styleProps();
    const text = s.label as string | undefined;
    if (!text) {
      this.labelText?.destroy();
      this.labelText = undefined;
      return;
    }
    const w = s.width as number;
    const h = s.height as number;
    if (!this.labelText) {
      this.labelText = new Text({
        style: { text, x: w / 2, y: h / 2, fontSize: 14, fill: '#333333', textAlign: 'center', textBaseline: 'middle' },
      });
      this.appendChild(this.labelText);
    } else {
      this.labelText.setAttribute('text', text as any);
      this.labelText.setLocalPosition(w / 2, h / 2);
    }
  }

  /** 选中态视觉强调 */
  protected applySelected(selected: any): void {
    if (!this.body) return;
    if (selected) {
      if (this._origStroke === undefined) {
        const s = this.styleProps();
        this._origStroke = s.stroke as string;
        this._origLineWidth = s.strokeWidth as number;
      }
      this.body.setAttribute('stroke', '#fa541c');
      this.body.setAttribute('lineWidth', 2.5);
    } else if (this._origStroke !== undefined) {
      this.body.setAttribute('stroke', this._origStroke);
      this.body.setAttribute('lineWidth', this._origLineWidth);
      this._origStroke = undefined;
    }
  }

  /** 读取合并默认值后的 style props */
  protected styleProps(): NodeStyleProps {
    const attrs = this.attributes as NodeStyleProps;
    return { ...DEFAULTS, ...attrs };
  }

  // ---- 公开 API ----
  moveTo(x: number, y: number): this {
    this.setAttribute('x', x);
    this.setAttribute('y', y);
    return this;
  }

  resize(width: number, height: number): this {
    this.setAttribute('width', width);
    this.setAttribute('height', height);
    return this;
  }

  /** 世界坐标包围盒（供 Edge 计算；用 g-lite getBounds 以支持 group 嵌套） */
  getWorldBBox(): BBox {
    try {
      const b = this.getBounds();
      const hx = b.halfExtents[0];
      const hy = b.halfExtents[1];
      return {
        x: b.center[0] - hx,
        y: b.center[1] - hy,
        width: hx * 2,
        height: hy * 2,
      };
    } catch {
      const s = this.styleProps();
      return { x: s.x as number, y: s.y as number, width: s.width as number, height: s.height as number };
    }
  }
}
