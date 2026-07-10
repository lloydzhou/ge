import { describe, it, expect } from 'vitest';
import { Scheduler } from '../src/core/Scheduler';

describe('Scheduler', () => {
  it('同一 cell 多次 add → 只 flush 一次（幂等去重）', () => {
    let count = 0;
    const cell = { flushDirty: () => { count++; }, _dirty: 0 };
    const sched = new Scheduler();
    sched.add(cell);
    sched.add(cell);
    sched.add(cell);
    sched.flush();
    expect(count).toBe(1);
  });

  it('不同 cell 各 flush 一次', () => {
    const log: string[] = [];
    const mk = (id: string) => ({ flushDirty: () => { log.push(id); }, _dirty: 0 });
    const a = mk('A'), b = mk('B'), c = mk('C');
    const sched = new Scheduler();
    sched.add(a); sched.add(b); sched.add(c);
    sched.flush();
    expect(log.sort()).toEqual(['A', 'B', 'C']);
  });

  it('联动：flush 期间新增 cell 同帧处理（Node→Edge 联动）', () => {
    const log: string[] = [];
    const sched = new Scheduler();
    const edge = { flushDirty: () => { log.push('edge'); }, _dirty: 0 };
    const node = { flushDirty: () => { log.push('node'); sched.add(edge); }, _dirty: 0 };
    sched.add(node);
    sched.flush();
    // node flush 触发 edge 入队，while 循环继续处理 edge
    expect(log).toEqual(['node', 'edge']);
  });

  it('flush 后队列清空，再次 flush 无副作用', () => {
    let count = 0;
    const cell = { flushDirty: () => { count++; }, _dirty: 0 };
    const sched = new Scheduler();
    sched.add(cell);
    sched.flush();
    sched.flush(); // 空队列
    expect(count).toBe(1);
  });

  it('guard 防御：极端环依赖不会无限循环，残余任务会保留到下一帧', () => {
    const sched = new Scheduler();
    const loop: any = { _dirty: 1 };
    loop.flushDirty = () => { sched.add(loop); }; // 每次又把自己加回去
    sched.add(loop);
    expect(() => sched.flush()).not.toThrow();
    expect((sched as any).queue.has(loop)).toBe(true);
    sched.destroy();
  });

  it('超出轮次预算后保留未完成任务，下一轮可继续完成', () => {
    const sched = new Scheduler();
    const log: number[] = [];
    const cells = Array.from({ length: 17 }, (_, i) => ({
      flushDirty: () => {
        log.push(i);
        if (i < 16) sched.add(cells[i + 1]);
      },
    }));
    sched.add(cells[0]);
    sched.flush();
    expect(log).toHaveLength(16);
    expect((sched as any).queue.has(cells[16])).toBe(true);
    sched.flush();
    expect(log).toEqual(Array.from({ length: 17 }, (_, i) => i));
  });

  it('addAttributeChange：同 cell 同属性一帧内合并（保留首次 oldValue、最新 newValue）', () => {
    const received: any[] = [];
    const cell = { dispatchEvent: (e: any) => { received.push(e.detail); } };
    const sched = new Scheduler();
    sched.addAttributeChange(cell, 'fill', 'red', 'blue');
    sched.addAttributeChange(cell, 'fill', 'blue', 'green'); // 合并：只保留首 oldValue、最新 newValue
    sched.addAttributeChange(cell, 'stroke', '#000', '#fff'); // 不同属性并存
    sched.flush();
    expect(received).toHaveLength(2);
    const fill = received.find((r) => r.name === 'fill')!;
    expect(fill.oldValue).toBe('red');
    expect(fill.newValue).toBe('green');
    expect(fill.cell).toBe(cell);
  });

  it('addAttributeChange：flush 后队列清空，再次 flush 无派发', () => {
    const received: any[] = [];
    const cell = { dispatchEvent: (e: any) => { received.push(e); } };
    const sched = new Scheduler();
    sched.addAttributeChange(cell, 'x', 0, 1);
    sched.flush();
    sched.flush();
    expect(received).toHaveLength(1);
  });
});
