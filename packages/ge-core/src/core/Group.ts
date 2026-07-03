/**
 * Group —— 节点分组容器，继承 Node。
 * 子节点 appendChild 进来即被「包含」，可整体移动（embed 留待 L3 完善）。
 */
import { Node } from './Node';
import { CLASS } from './types';

export class Group extends Node {
  static readonly tag = 'ge-group';

  constructor(config: Record<string, any> = {}) {
    super({
      className: CLASS.group,
      ...config,
      style: {
        fill: 'rgba(24,144,255,0.06)',
        stroke: '#1890ff',
        strokeDasharray: '4 4',
        strokeWidth: 1,
        ...config?.style,
      },
    });
  }

  /** 移动分组时，同步通知组内子节点重发 boundschange（其世界位置已变，触发相连 edge 更新） */
  protected applyPosition(): void {
    super.applyPosition();
    for (const child of this.children) {
      const c = child as any;
      if (c && typeof c.fire === 'function' && typeof c.className === 'string' && c.className.includes(CLASS.node)) {
        c.fire('node:boundschange');
      }
    }
  }

  /** 把节点嵌入分组：转为相对 group 的局部坐标，移动 group 时子节点自动跟随 */
  embed(node: Node): void {
    const world = node.getWorldBBox();
    const gx = (this.getAttribute('x') as number) ?? 0;
    const gy = (this.getAttribute('y') as number) ?? 0;
    this.appendChild(node);
    node.setAttribute('x', world.x - gx);
    node.setAttribute('y', world.y - gy);
  }
}
