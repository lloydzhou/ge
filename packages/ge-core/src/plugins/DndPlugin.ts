/**
 * DndPlugin —— 从 Stencil 面板拖拽创建节点。
 *
 * - registerTemplate 注册模板；dropTemplate(type, x, y) 在世界坐标创建节点（核心逻辑，可编程调用）。
 * - 同时接入 HTML5 Drag and Drop：模板项 dragstart 写 dataTransfer，画布 drop 读出并创建。
 */
import { Plugin } from './plugin';
import type { NodeProps } from '../core/types';

export interface DndTemplate {
  type: string;
  props: NodeProps;
}

export class DndPlugin extends Plugin {
  readonly name = 'dnd';
  private templates = new Map<string, DndTemplate>();

  registerTemplate(t: DndTemplate): this {
    this.templates.set(t.type, t);
    return this;
  }

  /** 在世界坐标 (worldX, worldY) 放置一个模板节点（居中） */
  dropTemplate(type: string, worldX: number, worldY: number): any | null {
    const tpl = this.templates.get(type);
    if (!tpl) return null;
    const w = (tpl.props.width as number) ?? 120;
    const h = (tpl.props.height as number) ?? 40;
    return this.graph.addNode({ ...tpl.props, x: worldX - w / 2, y: worldY - h / 2 });
  }

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    container.addEventListener('dragover', (e: DragEvent) => e.preventDefault());
    container.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer?.getData('text/ge-template');
      if (!type) return;
      const rect = container.getBoundingClientRect();
      const world = graph.viewport2Canvas({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      this.dropTemplate(type, (world as any).x, (world as any).y);
    });
  }
}
