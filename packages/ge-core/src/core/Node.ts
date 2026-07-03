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
import type { Markup } from '../shape/registry';

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
  /** 交互状态样式：{ hover: {...}, selected: {...} }，按 className 上的状态 token 触发 */
  stateStyles?: Record<string, Record<string, unknown>>;
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
  /** 子元素 selector 索引（markup 模式下由 shape 声明，create 模式下含 'body'） */
  protected subElements = new Map<string, DisplayObject>();
  protected labelText?: Text;
  /** 当前被状态样式覆盖的属性原值（状态移除时还原） */
  private appliedState: Record<string, unknown> = {};

  constructor(config: Record<string, any> = {}) {
    const style = { ...DEFAULTS, ...config?.style };
    super({ className: CLASS.node, ...config, style });
    this.initProps({ id: config?.id, style });
  }

  protected render(): void {
    this.buildBody();
    this.applyPosition();
    this.syncLabel();
    this.applyStates();
  }

  protected buildBody(): void {
    const s = this.styleProps();
    for (const el of this.subElements.values()) el.destroy();
    this.subElements.clear();
    this.body = undefined;
    const graph: any = (this.ownerDocument as any)?.defaultView;
    const def = graph?.shapes?.resolve(s.shape as string);
    if (def?.markup?.length && this.ownerDocument) {
      this.buildFromMarkup(def.markup);
      this.body = this.subElements.get('body');
    } else {
      this.body = this.createBody(s);
      this.subElements.set('body', this.body);
      if (this.body) this.appendChild(this.body);
    }
  }

  /** 按 markup 声明创建子元素并建立 selector 索引 */
  protected buildFromMarkup(markup: Markup): void {
    for (const item of markup) {
      const el = this.ownerDocument!.createElement<DisplayObject, any>(item.tagName, { style: item.attrs || {} });
      if (item.selector) this.subElements.set(item.selector, el);
      this.appendChild(el);
    }
  }

  /** 按 selector 获取子元素（'body' / 'header' / 'label' ...） */
  getSubElement(selector: string): DisplayObject | undefined {
    return this.subElements.get(selector);
  }

  protected createBody(s: NodeStyleProps): DisplayObject {
    // 通过 graph 的 ShapeRegistry 解析（支持自定义 shape）；找不到时回退到 rect
    const graph: any = (this.ownerDocument as any)?.defaultView;
    const def = graph?.shapes?.resolve(s.shape as string);
    if (def) return def.create(s) as DisplayObject;
    return new Rect({
      style: {
        width: s.width as number,
        height: s.height as number,
        fill: s.fill,
        stroke: s.stroke,
        lineWidth: s.strokeWidth,
        radius: s.radius as number,
      },
    });
  }

  protected applyPosition(): void {
    const s = this.styleProps();
    this.setLocalPosition(s.x as number, s.y as number);
    if (this.body) this.body.setLocalPosition(0, 0);
    this.fire('node:boundschange');
  }

  /** 应用旋转（angle attribute → setLocalEulerAngles） */
  protected applyRotation(): void {
    const s = this.styleProps();
    const angle = (s.angle as number) ?? 0;
    this.setLocalEulerAngles(angle);
    this.fire('node:boundschange');
  }

  attributeChangedCallback(
    name: string | number | symbol,
    oldV: any,
    newV: any,
  ): void {
    if (oldV === newV) return;
    this.syncProp(name as string, newV);
    if (!this.rendered) return; // 构造期间不处理，等 connectedCallback 统一渲染
    switch (name) {
      case 'x':
      case 'y':
        this.applyPosition();
        break;
      case 'angle':
        this.applyRotation();
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
      case 'class':
      case 'stateStyles':
        this.applyStates();
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
      this.subElements.delete('label');
      return;
    }
    const w = s.width as number;
    const h = s.height as number;
    if (!this.labelText) {
      this.labelText = new Text({
        style: { text, fontSize: 14, fill: '#333333', textAlign: 'center', textBaseline: 'middle' },
      });
      this.appendChild(this.labelText);
      this.labelText.setLocalPosition(w / 2, h / 2);
      this.subElements.set('label', this.labelText);
    } else {
      this.labelText.setAttribute('text', text as any);
      this.labelText.setLocalPosition(w / 2, h / 2);
    }
  }

  /**
   * 根据 className 上的状态 token 应用 stateStyles（可配置）。
   * - 先还原上次覆盖的属性，再按当前激活状态重新合并应用。
   * - stateStyles 与内置默认合并；strokeWidth 自动映射为 body 的 lineWidth。
   */
  protected applyStates(): void {
    if (!this.body) return;
    // 还原：appliedState 的 key 形如 "selector::attr"
    for (const [sk, v] of Object.entries(this.appliedState)) {
      const idx = sk.indexOf('::');
      const selector = idx > 0 ? sk.slice(0, idx) : 'body';
      const attr = idx > 0 ? sk.slice(idx + 2) : sk;
      const el = this.subElements.get(selector) || this.body;
      el?.setAttribute(attr as any, v as any);
    }
    this.appliedState = {};
    const s = this.styleProps();
    // 默认按 selector 粒度
    const defaults: Record<string, Record<string, Record<string, unknown>>> = {
      hover: { body: { stroke: '#69b1ff' } },
      selected: { body: { stroke: '#fa541c', lineWidth: 2.5 } },
    };
    const all = { ...defaults, ...((s.stateStyles as Record<string, any>) || {}) };
    const tokens = (this.className || '')
      .split(/\s+/)
      .filter((t) => t && t !== CLASS.node && t !== CLASS.cell && t !== CLASS.group);
    // 合并激活状态 → selector -> props
    const merged: Record<string, Record<string, unknown>> = {};
    for (const token of tokens) {
      const attrs = all[token];
      if (!attrs) continue;
      for (const [k, v] of Object.entries(attrs)) {
        if (v && typeof v === 'object') {
          // selector 粒度：{ body: {...}, label: {...} }
          if (!merged[k]) merged[k] = {};
          Object.assign(merged[k], v as object);
        } else {
          // 旧格式（直接属性）→ 作用于 body
          if (!merged.body) merged.body = {};
          merged.body[k] = v;
        }
      }
    }
    const mapKey = (k: string): string => (k === 'strokeWidth' ? 'lineWidth' : k);
    for (const [selector, props] of Object.entries(merged)) {
      const el = this.subElements.get(selector) || (selector === 'body' ? this.body : undefined);
      if (!el) continue;
      for (const [k, v] of Object.entries(props)) {
        const bk = mapKey(k);
        const sk = `${selector}::${bk}`;
        if (!(sk in this.appliedState)) this.appliedState[sk] = el.getAttribute(bk as any);
        el.setAttribute(bk as any, v as any);
      }
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

  /** 世界坐标包围盒（直接用 x/y/width/height attribute，避免 getBounds 的 root.translate 污染与副作用） */
  getWorldBBox(): BBox {
    const s = this.styleProps();
    return {
      x: (s.x as number) ?? 0,
      y: (s.y as number) ?? 0,
      width: (s.width as number) ?? 0,
      height: (s.height as number) ?? 0,
    };
  }
}
