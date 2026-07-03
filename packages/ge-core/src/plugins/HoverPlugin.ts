/**
 * HoverPlugin —— 鼠标悬停高亮（节点 + 边）。
 * pointermove 命中 → addClass('hover')，离开 → removeClass('hover')。
 */
import { Plugin, closestCell, closestEdge, addClass, removeClass } from './plugin';

export class HoverPlugin extends Plugin {
  readonly name = 'hover';
  private hovered: any = null;

  init(graph: any): void {
    super.init(graph);
    graph.addEventListener('pointermove', (e: any) => {
      const node = graph.pickNode(e.viewportX, e.viewportY);
      const edge = node ? null : closestEdge(e.target);
      const target = node || edge;
      if (target === this.hovered) return;
      if (this.hovered) removeClass(this.hovered, 'hover');
      this.hovered = target;
      if (target) { addClass(target, 'hover'); (this.graph.getConfig().container as HTMLElement).style.cursor = 'move'; }
      else { (this.graph.getConfig().container as HTMLElement).style.cursor = ''; }
    });
  }

  destroy(): void {
    if (this.hovered) removeClass(this.hovered, 'hover');
    this.hovered = null;
  }
}
