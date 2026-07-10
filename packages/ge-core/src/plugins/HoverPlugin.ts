/**
 * HoverPlugin —— 鼠标悬停高亮（节点 + 边）。
 * pointermove 命中 → addClass('hover')，离开 → removeClass('hover')。
 */
import { Plugin, closestCell, closestEdge, addClass, removeClass } from './plugin';

export class HoverPlugin extends Plugin {
  readonly name = 'hover';
  private hovered: any = null;
  private readonly onPointerMove = (e: any): void => {
    const node = this.graph.pickNode(e.viewportX, e.viewportY);
    const target = node || (node ? null : closestEdge(e.target));
    if (target === this.hovered) return;
    if (this.hovered) removeClass(this.hovered, 'hover');
    this.hovered = target;
    const container = this.graph.getConfig().container as HTMLElement;
    if (target) { addClass(target, 'hover'); container.style.cursor = 'move'; }
    else container.style.cursor = '';
  };

  init(graph: any): void {
    super.init(graph);
    graph.addEventListener('pointermove', this.onPointerMove);
  }

  destroy(): void {
    this.graph.removeEventListener('pointermove', this.onPointerMove);
    if (this.hovered) removeClass(this.hovered, 'hover');
    this.hovered = null;
    super.destroy();
  }
}
