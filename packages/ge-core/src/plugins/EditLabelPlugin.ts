/**
 * EditLabelPlugin —— 双击节点 inline 编辑标签。
 * 双击节点 → 在节点上方显示 input → 回车确认 / ESC 取消 / blur 确认。
 */
import { Plugin, closestCell } from './plugin';

export class EditLabelPlugin extends Plugin {
  readonly name = 'edit-label';
  private input?: HTMLInputElement;
  private inputKeydown?: (event: KeyboardEvent) => void;
  private inputBlur?: () => void;
  private readonly onDblClick = (e: any): void => {
    const container = this.container;
    if (!container) return;
    const node = closestCell(e.target);
    if (!node) return;
    e.preventDefault();
    this.showEditor(container, node, (node.getAttribute('label') as string) ?? '');
  };
  private container?: HTMLElement;

  init(graph: any): void {
    super.init(graph);
    const container = graph.getConfig().container as HTMLElement;
    if (!container) return;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    this.container = container;
    graph.addEventListener('dblclick', this.onDblClick);
  }

  private closeEditor(): void {
    if (this.input && this.inputKeydown) this.input.removeEventListener('keydown', this.inputKeydown);
    if (this.input && this.inputBlur) this.input.removeEventListener('blur', this.inputBlur);
    this.inputKeydown = undefined;
    this.inputBlur = undefined;
    this.input?.remove();
    this.input = undefined;
  }

  private showEditor(container: HTMLElement, node: any, label: string): void {
    this.closeEditor();
    const c = node.getWorldCenter();
    const vp = this.graph.canvas2Viewport({ x: c.x - (node.getAttribute('width') as number) / 2, y: c.y - (node.getAttribute('height') as number) / 2 - 28 });
    const input = document.createElement('input');
    input.value = label;
    input.style.cssText = `position:absolute;left:${vp.x}px;top:${vp.y}px;min-width:60px;padding:2px 6px;border:2px solid #1890ff;border-radius:3px;font-size:12px;z-index:20;outline:none;`;
    container.appendChild(input);
    input.focus();
    input.select();
    const commit = (): void => {
      if (input.value !== label) node.setAttribute('label', input.value);
      this.closeEditor();
    };
    this.inputKeydown = (ev: KeyboardEvent): void => {
      if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
      else if (ev.key === 'Escape') this.closeEditor();
    };
    this.inputBlur = commit;
    input.addEventListener('keydown', this.inputKeydown);
    input.addEventListener('blur', this.inputBlur);
    this.input = input;
  }

  destroy(): void {
    this.closeEditor();
    this.graph.removeEventListener('dblclick', this.onDblClick);
    this.container = undefined;
    super.destroy();
  }
}
