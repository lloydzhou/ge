/**
 * HoverPlugin —— 鼠标悬停高亮（通过 className 触发，样式由 Node 的 stateStyles 配置）。
 *
 * - pointermove 命中检测，进入节点 addClass('hover')，离开 removeClass('hover')。
 * - 不写死任何样式，视觉完全由 stateStyles.hover 决定（Node 自带默认 hover 色）。
 */
import { Plugin, closestCell, addClass, removeClass } from './plugin';

export class HoverPlugin extends Plugin {
  readonly name = 'hover';
  private hovered: any = null;

  init(graph: any): void {
    super.init(graph);
    graph.addEventListener('pointermove', (e: any) => {
      const node = graph.pickNode(e.viewportX, e.viewportY);
      if (node === this.hovered) return;
      if (this.hovered) removeClass(this.hovered, 'hover');
      this.hovered = node;
      if (node) addClass(node, 'hover');
    });
  }

  destroy(): void {
    if (this.hovered) removeClass(this.hovered, 'hover');
    this.hovered = null;
  }
}
