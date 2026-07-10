/**
 * DndPlugin —— 从 Stencil 面板拖拽创建节点。
 * 用 GE 自有 viewport2Canvas（2D panOffset + zoom），与 root.translate 渲染一致。
 */
import { Plugin } from './plugin';
import type { NodeProps } from '../core/types';

export interface DndTemplate { type: string; props: NodeProps; }

export class DndPlugin extends Plugin {
  readonly name = 'dnd';
  private templates = new Map<string, DndTemplate>();
  private container?: HTMLElement;
  private readonly onDragOver = (event: DragEvent): void => event.preventDefault();
  private readonly onDrop = (event: DragEvent): void => {
    const container = this.container;
    if (!container) return;
    event.preventDefault();
    const type = event.dataTransfer?.getData('text/ge-template');
    if (!type) return;
    const graph = this.graph as any;
    const rect = container.getBoundingClientRect();
    const world = graph.viewport2Canvas({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    const node = this.dropTemplate(type, world.x, world.y);
    let iterations = 0;
    const calibrate = (): void => {
      if (!node || iterations++ > 5) return;
      const domEl = document.querySelector(`[id="${node.id}"]`) as HTMLElement | null;
      if (!domEl) return;
      const bounds = domEl.getBoundingClientRect();
      if (bounds.width === 0) return;
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const from = graph.viewport2Canvas({ x: centerX - rect.left, y: centerY - rect.top });
      const to = graph.viewport2Canvas({ x: centerX + dx - rect.left, y: centerY + dy - rect.top });
      node.moveTo(node.getAttribute('x') + to.x - from.x, node.getAttribute('y') + to.y - from.y);
      requestAnimationFrame(calibrate);
    };
    requestAnimationFrame(calibrate);
    const selection = graph.getPlugin('selection');
    if (selection && node) { selection.clear(); selection.select(node.id); }
  };

  registerTemplate(template: DndTemplate): this { this.templates.set(template.type, template); return this; }

  /** 在世界坐标 (worldX, worldY) 放置一个模板节点（居中） */
  dropTemplate(type: string, worldX: number, worldY: number): any | null {
    const template = this.templates.get(type);
    if (!template) return null;
    const width = (template.props.width as number) ?? 120;
    const height = (template.props.height as number) ?? 40;
    return this.graph.addNode({ ...template.props, x: worldX - width / 2, y: worldY - height / 2 });
  }

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    this.container = container;
    container.addEventListener('dragover', this.onDragOver);
    container.addEventListener('drop', this.onDrop);
  }

  destroy(): void {
    this.container?.removeEventListener('dragover', this.onDragOver);
    this.container?.removeEventListener('drop', this.onDrop);
    this.container = undefined;
    super.destroy();
  }
}
