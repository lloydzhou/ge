/**
 * Scheduler —— 全局渲染调度器（仿浏览器渲染队列）。
 *
 * 设计原则（拥抱 DOM 模型）：
 * - Cell 属性变化时 markDirty(flag)，加入队列，不立即重算（标记 layout dirty）。
 * - rAF 回调内统一 flush，一帧内无论改多少属性，每个 cell 只重算一次。
 * - 替代各处散装的 requestAnimationFrame（DragPlugin / Edge / Port）。
 * - 对外 API（setAttribute）完全不变，纯内部调度优化。
 */
export class Scheduler {
  private queue = new Set<any>();
  private rafId: number | null = null;

  /** 标记 cell 为 dirty 并加入队列（幂等，同一 cell 多次 add 只入队一次） */
  add(cell: any): void {
    this.queue.add(cell);
    if (this.rafId != null) return;
    this.schedule();
  }

  /** 立即 flush 所有 dirty cell（rAF 自动触发 / 测试手动调用） */
  flush(): void {
    this.cancelScheduled();
    // while 循环处理联动：Node flush → fire boundschange → Edge/Port 入队 → 继续 flush
    // guard 防御极端环依赖
    let guard = 0;
    while (this.queue.size > 0 && guard++ < 16) {
      const cells = Array.from(this.queue);
      this.queue.clear();
      for (const cell of cells) {
        if (cell.flushDirty) cell.flushDirty();
      }
    }
  }

  destroy(): void {
    this.cancelScheduled();
    this.queue.clear();
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
