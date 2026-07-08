/**
 * Node —— 图节点，g-lite CustomElement 的领域特化。
 *
 * - 领域属性 x/y/width/height/shape/fill/stroke/strokeWidth/radius 均为响应式 style props。
 * - connectedCallback 构建主体 shape（rect/circle），修复 P0-3。
 * - 位置/尺寸变化时派发 `node:boundschange`，供相连 Edge 监听重算（事件驱动联动）。
 */
import { Rect, Circle, Ellipse, Text, type DisplayObject } from '@antv/g-lite';
import { Cell, POSITION, GEOMETRY, STYLE, LABEL, REBUILD } from './Cell';
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


  /** 重建 body（width/height/radius/shape 变更时） */
  protected rebuildBody(): void {
    if (!this.body) return;
    this.body.destroy();
    const ns = this.styleProps();
    this.body = this.createBody(ns);
    // body 置于最底层（port/label 之下），避免 resize 重建后遮住 port
    const first = this.firstChild;
    if (first) this.insertBefore(this.body, first);
    else this.appendChild(this.body);
    this.applyPosition();
    this.applyRotation();
    this.syncLabel();
    this.fire('node:boundschange');
  }

  protected applyPosition(): void {
    const s = this.styleProps();
    const x = s.x as number, y = s.y as number;
    const w = s.width as number, h = s.height as number;
    // Node origin = 节点中心（旋转绕中心，非左上角）
    this.setLocalPosition(x + w / 2, y + h / 2);
    if (this.body) this.body.setLocalPosition(-w / 2, -h / 2);
    if (this.labelText) this.labelText.setLocalPosition(0, 0);
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
        this.markDirty(POSITION); // 只改位置，不碰 body 几何
        break;
      case 'width':
      case 'height':
      case 'radius':
        this.markDirty(GEOMETRY); // 原地更新几何 + 重定位
        break;
      case 'shape':
        this.markDirty(REBUILD); // shape 类型变化，需销毁重建
        break;
      case 'fill':
      case 'stroke':
      case 'strokeWidth':
        this.markDirty(STYLE);
        break;
      case 'label':
      case 'labels':
      case 'labelFill':
      case 'labelFontSize':
        this.markDirty(LABEL);
        break;
      case 'angle':
        this.applyRotation();
        break;
      case 'shadowColor':
      case 'shadowBlur':
      case 'fillOpacity':
      case 'strokeOpacity':
      case 'opacity':
      case 'lineDash':
        // 轻量样式直接同步到 body（g-lite 已 batch 渲染）
        this.body?.setAttribute(name, newV);
        if (name === 'opacity' && this.labelText) this.labelText.setAttribute('opacity', newV);
        break;
      case 'visible':
        this.setAttribute('visibility', newV ? 'visible' : 'hidden');
        break;
      case 'class':
      case 'stateStyles':
        this.applyStates();
        break;
      default:
        break;
    }
  }

  /** Scheduler 帧边界统一调用：按 dirty flag 决定重算范围（原地更新优先，避免销毁重建） */
  flushDirty(): void {
    const d = this._dirty;
    this._dirty = 0;
    if (!this.body) return;
    if (d & REBUILD) {
      // shape 类型变化（rect→circle），必须销毁重建
      this.rebuildBody();
      return; // rebuildBody 内部已 applyPosition + fire boundschange
    }
    const s = this.styleProps();
    if (d & GEOMETRY) {
      // width/height/radius 变化 → 原地更新 body 几何 + 重定位
      this.body.setAttribute('width', s.width as number);
      this.body.setAttribute('height', s.height as number);
      if (s.radius != null) this.body.setAttribute('radius', s.radius);
      this.applyPosition(); // 重定位（中心依赖 w/h）+ fire boundschange → Edge/Port 联动
    } else if (d & POSITION) {
      // 仅 x/y 变化（拖动）→ 只重定位，不碰 body 几何（避免 g-lite geometry 重算）
      this.applyPosition();
    }
    if (d & STYLE) {
      this.body.setAttribute('fill', s.fill as string);
      this.body.setAttribute('stroke', s.stroke as string);
      this.body.setAttribute('lineWidth', s.strokeWidth as number);
    }
    if (d & LABEL) {
      this.syncLabel();
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
      this.labelText.setLocalPosition(0, 0);
      this.subElements.set('label', this.labelText);
    } else {
      this.labelText.setAttribute('text', text as any);
      this.labelText.setLocalPosition(0, 0);
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

  /** 世界坐标包围盒（x/y attribute + parent group 偏移，支持嵌套） */
  getWorldBBox(): BBox {
    const s = this.styleProps();
    let x = (s.x as number) ?? 0;
    let y = (s.y as number) ?? 0;
    // 遍历 parent chain，累加 group 偏移（支持嵌套 group）
    let p: any = this.parentNode;
    while (p) {
      if (typeof p.className === 'string' && p.className.includes('ge-group')) {
        const ps = p.styleProps?.();
        if (ps) { x += (ps.x as number) ?? 0; y += (ps.y as number) ?? 0; }

      }
      p = p.parentNode;
    }
    return {
      x, y,
      width: (s.width as number) ?? 0,
      height: (s.height as number) ?? 0,
    };
  }

  /** 置顶（DOM 最后 = 最上层渲染） */
  toFront(): this {
    this.parentNode?.appendChild(this);
    return this;
  }

  /** 置底（DOM 最前 = 最下层渲染） */
  toBack(): this {
    this.parentNode?.insertBefore(this, this.parentNode.firstChild);
    return this;
  }

  /** 几何中心（旋转感知，x+w/2, y+h/2，不用 AABB） */
  getWorldCenter(): { x: number; y: number } {
    const x = this.getAttribute('x') as number;
    const y = this.getAttribute('y') as number;
    return { x: x + (this.getAttribute('width') as number) / 2, y: y + (this.getAttribute('height') as number) / 2 };
  }
}
