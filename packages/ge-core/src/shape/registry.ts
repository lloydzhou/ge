/**
 * ShapeRegistry —— 节点形状注册表（Markup/Selector 抽象的前置基础）。
 *
 * - shape = { name, defaults?, create(style) → DisplayObject }。
 * - Node.createBody 经 registry 解析（不再硬编码 switch），支持自定义 shape。
 * - 默认注册 rect / circle / ellipse / diamond。
 */
import type { DisplayObject } from '@antv/g-lite';
import type { NodeStyleProps } from '../core/Node';

export interface MarkupItem {
  /** g-lite 形状标签：rect / circle / path / text ... */
  tagName: string;
  /** 选择器，用于后续按 selector 寻址（如 'body' / 'header' / 'label'） */
  selector?: string;
  /** 该子元素的样式 */
  attrs?: Record<string, unknown>;
}
export type Markup = MarkupItem[];

export interface ShapeDefinition {
  name: string;
  /** 该 shape 的默认样式（合并到节点属性） */
  defaults?: Partial<NodeStyleProps>;
  /** 声明式子元素（与 create 二选一；有 markup 时按其渲染并建立 selector 索引） */
  markup?: Markup;
  /** 创建主体渲染元素（与 markup 二选一） */
  create?: (style: NodeStyleProps) => DisplayObject;
  /** 原地更新 body 几何（resize 时调用，不 destroy/create） */
  update?: (body: DisplayObject, style: NodeStyleProps) => void;
}

export class ShapeRegistry {
  private readonly map = new Map<string, ShapeDefinition>();

  register(def: ShapeDefinition): this {
    this.map.set(def.name, def);
    return this;
  }

  get(name: string): ShapeDefinition | undefined {
    return this.map.get(name);
  }

  /** 解析 shape，找不到时回退到 rect */
  resolve(name?: string): ShapeDefinition {
    if (name && this.map.has(name)) return this.map.get(name)!;
    return this.map.get('rect')!;
  }

  has(name: string): boolean {
    return this.map.has(name);
  }

  list(): string[] {
    return [...this.map.keys()];
  }
}
