/**
 * DndPlugin —— 从 Stencil 面板拖拽创建节点。
 * 用 GE 自有 viewport2Canvas（2D panOffset + zoom），与 root.translate 渲染一致。
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
      // GE 自有 viewport2Canvas（2D panOffset + zoom），与 root.translate 渲染一致
      const world = graph.viewport2Canvas({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      const node = this.dropTemplate(type, (world as any).x, (world as any).y);
      // 放置后用 DOM 校准一次（防极端情况，收敛快）
      const tpl = this.templates.get(type);
      const w = (tpl?.props.width as number) ?? 120;
      const h = (tpl?.props.height as number) ?? 40;
      let iter = 0;
      const calibrate = (): void => {
        if (!node || iter++ > 5) return;
        const domEl = document.querySelector(`[id="${(node as any).id}"]`);
        if (!domEl) return;
        const r = (domEl as HTMLElement).getBoundingClientRect();
        if (r.width === 0) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        // 用 GE viewport2Canvas 的 delta 校准（2D，准）
        const w1 = graph.viewport2Canvas({ x: cx - rect.left, y: cy - rect.top });
        const w2 = graph.viewport2Canvas({ x: cx + dx - rect.left, y: cy + dy - rect.top });
        const curX = (node as any).getAttribute('x') as number;
        const curY = (node as any).getAttribute('y') as number;
        (node as any).moveTo(curX + ((w2 as any).x - (w1 as any).x), curY + ((w2 as any).y - (w1 as any).y));
        requestAnimationFrame(calibrate);
      };
      requestAnimationFrame(calibrate);
      // 自动选中
      const sel = graph.getPlugin('selection');
      if (sel && node) {
        sel.clear();
        sel.select((node as any).id);
      }
    });
  }
}
