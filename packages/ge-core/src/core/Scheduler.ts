/**
 * Scheduler —— 全局渲染调度器（仿浏览器渲染队列）。
 *
 * 设计原则（拥抱 DOM 模型）：
 * - Cell 属性变化时 markDirty(flag)，加入队列，不立即重算（标记 layout dirty）。
 * - rAF 回调内统一 flush，一帧内无论改多少属性，每个 cell 只重算一次。
 * - 替代各处散装的 requestAnimationFrame（DragPlugin / Edge / Port）。
 * - 对外 API（setAttribute）完全不变，纯内部调度优化。
 *
 * 同时承担「属性变更通知」的合并：
 * - cell:attributechange 不再在 setAttribute 时同步派发，
 *   而是收集到 attrQueue，帧边界统一派发，避免拖拽等高频场景下的事件风暴。
 */
import { CustomEvent } from '@antv/g-lite';

interface AttrRecord {
  oldValue: any;
  newValue: any;
}

export class Scheduler {
  private queue = new Set<any>();
  private rafId: number | null = null;
  private isFlushing = false;
  /** 属性变更合并队列：cell → (attrName → record)，保留首次 oldValue 与最新 newValue */
  private attrQueue = new Map<any, Map<string, AttrRecord>>();

  /** 标记 cell 为 dirty 并加入队列（幂等，同一 cell 多次 add 只入队一次） */
  add(cell: any): void {
    this.queue.add(cell);
    // flush 中不重新调度（while 循环会处理），防止 rAF 无限触发
    if (this.isFlushing || this.rafId != null) return;
    this.schedule();
  }

  /**
   * 收集一次属性变更（cell:attributechange 的合并入口）。
   * 同一 cell 同一 attribute 在一帧内多次变化，只保留首次 oldValue 与最新 newValue，
   * 帧边界由 flush() 统一在 cell 上派发 `cell:attributechange`（冒泡到 Graph）。
   */
  addAttributeChange(cell: any, name: string, oldValue: any, newValue: any): void {
    let attrs = this.attrQueue.get(cell);
    if (!attrs) {
      attrs = new Map();
      this.attrQueue.set(cell, attrs);
    }
    const existed = attrs.get(name);
    if (existed) existed.newValue = newValue; // 保留首次 oldValue
    else attrs.set(name, { oldValue, newValue });
    if (!this.isFlushing && this.rafId == null) this.schedule();
  }

  /** 立即 flush 所有 dirty cell（rAF 自动触发 / 测试手动调用） */
  flush(): void {
    this.cancelScheduled();
    this.isFlushing = true;
    const deadline = performance.now() + 50; // 50ms 上限，防极重计算冻结主线程
    let guard = 0;
    // while 循环处理联动：Node flush → fire boundschange → Edge/Port 入队 → 继续 flush
    while (this.queue.size > 0 && guard++ < 16 && performance.now() < deadline) {
      const cells = Array.from(this.queue);
      this.queue.clear();
      for (const cell of cells) {
        if (cell.flushDirty) cell.flushDirty();
      }
    }
    this.isFlushing = false;
    // 环依赖或极重计算导致超限 → 清空残余（防下一帧继续无限循环）
    if (this.queue.size > 0) this.queue.clear();
    // 帧边界统一派发属性变更通知（此时 cell 几何已是最终态）
    this.flushAttributeChanges();
  }

  /** 取出当前快照派发，清空队列；派发回调中新产生的变更留待下一帧 */
  private flushAttributeChanges(): void {
    if (this.attrQueue.size === 0) return;
    const queue = this.attrQueue;
    this.attrQueue = new Map();
    for (const [cell, attrs] of queue) {
      for (const [name, rec] of attrs) {
        // 注意：g-lite CustomEvent 构造会 Object.assign(this, obj) 到 event 顶层，
        // 而 name/target/type 是只读 getter，直接放顶层会抛错 → 必须包进 detail
        cell.dispatchEvent?.(
          new CustomEvent('cell:attributechange', {
            detail: { cell, name, oldValue: rec.oldValue, newValue: rec.newValue },
          }),
        );
      }
    }
    // 派发回调中又产生新变更 → 安排下一帧
    if (this.attrQueue.size > 0 && this.rafId == null) this.schedule();
  }

  destroy(): void {
    this.cancelScheduled();
    this.queue.clear();
    this.attrQueue.clear();
  }

  private schedule(): void {
    const flush = (): void => {
      this.rafId = null;
      this.flush();
    };
    if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(flush);
    } else {
      this.rafId = setTimeout(flush, 16) as unknown as number;
    }
  }

  private cancelScheduled(): void {
    if (this.rafId == null) return;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.rafId);
    else clearTimeout(this.rafId);
    this.rafId = null;
  }
}
