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
}
