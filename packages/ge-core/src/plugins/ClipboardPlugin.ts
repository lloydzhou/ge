/**
 * ClipboardPlugin —— 复制 / 粘贴 / 克隆。
 *
 * - copy()：拷贝当前选中节点的属性快照。
 * - paste()：按偏移新建节点（每次粘贴再偏移，避免重叠）。
 * - duplicate()：copy + paste 一步完成。
 * - 依赖 SelectionPlugin。
 */
import { Plugin } from './plugin';
import type { NodeProps } from '../core/types';

export class ClipboardPlugin extends Plugin {
  readonly name = 'clipboard';
  private snapshot: NodeProps[] = [];

  /** 拷贝选中节点 */
  copy(): NodeProps[] {
    const sel = (this.graph.getPlugin('selection') as any)?.getSelected?.() ?? [];
    this.snapshot = sel
      .map((id: string) => {
        const n = this.graph.getNode(id);
        if (!n) return null;
        const a = n.attributes;
        return {
          x: (a.x ?? 0) as number,
          y: (a.y ?? 0) as number,
          width: a.width,
          height: a.height,
          shape: a.shape,
          fill: a.fill,
          stroke: a.stroke,
          strokeWidth: a.strokeWidth,
          radius: a.radius,
          label: a.label,
        } as NodeProps;
      })
      .filter(Boolean);
    return this.snapshot;
  }

  /** 粘贴（偏移创建新节点） */
  paste(): any[] {
    const created: any[] = [];
    for (const p of this.snapshot) {
      created.push(this.graph.addNode({ ...p, x: (p.x as number) + 24, y: (p.y as number) + 24 }));
    }
    return created;
  }

  /** 等价于 copy + paste */
  duplicate(): any[] {
    this.copy();
    return this.paste();
  }

  hasData(): boolean {
    return this.snapshot.length > 0;
  }

  clear(): void {
    this.snapshot = [];
  }
}
