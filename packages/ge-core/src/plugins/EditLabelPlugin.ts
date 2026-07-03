/**
 * EditLabelPlugin —— 双击节点 inline 编辑标签。
 * 双击节点 → 在节点上方显示 input → 回车确认 / ESC 取消 / blur 确认。
 */
import { Plugin, closestCell } from './plugin';

export class EditLabelPlugin extends Plugin {
  readonly name = 'edit-label';
  private input?: HTMLInputElement;

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    graph.addEventListener('dblclick', (e: any) => {
      const node = closestCell(e.target);
      if (!node) return;
      e.preventDefault();
      this.showEditor(container, node, (node.getAttribute('label') as string) ?? '');
    });
  }

  private showEditor(container: HTMLElement, node: any, label: string): void {
    this.destroy();
    const bb = node.getWorldBBox();
    const vp = this.graph.canvas2Viewport({ x: bb.x, y: bb.y - 28 });
    const input = document.createElement('input');
    input.value = label;
    input.style.cssText = `position:absolute;left:${vp.x}px;top:${vp.y}px;min-width:60px;padding:2px 6px;border:2px solid #1890ff;border-radius:3px;font-size:12px;z-index:20;outline:none;`;
    container.appendChild(input);
    input.focus();
    input.select();
    const commit = (): void => {
      if (input.value !== label) node.setAttribute('label', input.value);
      this.destroy();
    };
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
      else if (ev.key === 'Escape') this.destroy();
    });
    input.addEventListener('blur', commit);
    this.input = input;
  }

  destroy(): void {
    this.input?.remove();
    this.input = undefined;
  }
}
