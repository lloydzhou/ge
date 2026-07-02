/**
 * ShapeRegistry —— 节点形状注册表（Markup/Selector 抽象的前置基础）。
 *
 * - shape = { name, defaults?, create(style) → DisplayObject }。
 * - Node.createBody 经 registry 解析（不再硬编码 switch），支持自定义 shape。
 * - 默认注册 rect / circle / ellipse / diamond。
 */
import type { DisplayObject } from '@antv/g-lite';
import type { NodeStyleProps } from '../core/Node';

export interface ShapeDefinition {
  name: string;
  /** 该 shape 的默认样式（合并到节点属性） */
  defaults?: Partial<NodeStyleProps>;
  /** 创建主体渲染元素（rect / circle / path ...） */
  create: (style: NodeStyleProps) => DisplayObject;
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
