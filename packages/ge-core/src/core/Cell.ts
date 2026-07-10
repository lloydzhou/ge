/**
 * Cell —— 所有领域元素的抽象基类。
 *
 * 设计原则（拥抱 g-lite DOM 模型）：
 * - 继承 g-lite CustomElement，享有完整 DOM 原语（appendChild / querySelector / 事件 / 生命周期）。
 * - 领域属性作为 style props，attributeChangedCallback 做响应式。
 * - 渲染子 shape 在 connectedCallback 构建（ownerDocument 此时可用，修复 P0-3）。
 * - 维护可序列化 model，为 History / 序列化铺路。
 */
import { CustomElement, CustomEvent } from '@antv/g-lite';

/** dirty flag 位（仿浏览器 layout/style invalidation） */
export const POSITION = 1; // 位置（x/y）→ 只需 setLocalPosition，不碰 body 几何
export const GEOMETRY = 2; // 几何（width/height/radius）→ body.setAttribute + 重定位
export const STYLE = 4; // 样式（fill/stroke/strokeWidth）
export const LABEL = 8; // 标签
export const ROUTE = 16; // 边路径重算
export const LAYOUT = 32; // port 定位
export const REBUILD = 64; // shape 类型变化，需销毁重建

export abstract class Cell extends CustomElement<any> {
  /** 是否已完成首次渲染 */
  protected rendered = false;

  /** 可序列化业务数据 */
  protected model: Record<string, unknown> = {};

  /** 完整属性 model（序列化用，含用户设的所有字段，随 setAttribute 同步） */
  props: Record<string, any> = {};

  /** dirty 标记（位运算，一帧内多次标记去重） */
  protected _dirty = 0;

  /** 初始化 props（子类 constructor 在 super 后调用，避免干扰 g-lite CustomElement 初始化） */
  protected initProps(config: any): void {
    this.props = { ...(config?.style || {}) };
    if (config?.id) this.props.id = config.id;
  }

  connectedCallback(): void {
    if (!this.rendered) {
      this.render();
      this.rendered = true;
    }
    this.fire('cell:added', { id: this.id, cell: this });
  }

  disconnectedCallback(): void {
    this.rendered = false;
    this.fire('cell:removed', { id: this.id, cell: this });
  }

  /** 首次连接时构建渲染元素 */
  protected abstract render(): void;

  /** 派发自定义事件（避免与 g-lite 公有 emit 冲突，命名为 fire） */
  protected fire(type: string, detail?: object): void {
    this.dispatchEvent(new CustomEvent(type, detail ? { detail } : undefined));
  }

  /** 同步属性变化到 props model（Node/Edge/Port 的 attributeChangedCallback 调用） */
  protected syncProp(name: string, value: any): void {
    // super() 执行中 g-lite 可能触发 attributeChangedCallback，此时类字段尚未初始化，需惰性兜底
    if (!this.props) this.props = {};
    this.props[name] = value;
  }

  /** 派发统一属性变更事件，供多 view / 插件做增量同步。走 Scheduler 帧边界合并派发。 */
  protected fireAttributeChange(name: string, oldValue: any, newValue: any): void {
    const doc = this.ownerDocument as any;
    const sched = doc?.scheduler ?? doc?.defaultView?.scheduler;
    if (sched) { sched.addAttributeChange(this, name, oldValue, newValue); return; }
    // 无 scheduler（测试 / 未挂载）：同步派发，保证行为一致
    this.fire('cell:attributechange', { cell: this, name, oldValue, newValue });
  }

  /**
   * 标记 dirty 并加入全局调度器（仿浏览器 layout invalidation）。
   * 无 scheduler（测试 / 未挂载）时同步 flush，保证行为一致。
   */
  protected markDirty(flag: number): void {
    this._dirty |= flag;
    // 多路径查找 scheduler：ownerDocument 可能是 Document（.scheduler 或 .defaultView.scheduler）
    const doc = this.ownerDocument as any;
    const sched = doc?.scheduler ?? doc?.defaultView?.scheduler;
    if (sched) { sched.add(this); return; }
    // scheduler 未找到（测试/未挂载），同步执行
    this.flushDirty();
  }

  /** 由 Scheduler 在帧边界统一调用，子类按 dirty flag 决定重算范围 */
  flushDirty(): void {
    this._dirty = 0;
  }

  getData(): Record<string, unknown> {
    return { ...this.model };
  }

  setData(patch: Record<string, unknown>): void {
    this.model = { ...this.model, ...patch };
    this.fire('cell:change', { data: this.model });
  }

  /**
   * 克隆当前 cell（DOM Node.cloneNode 语义）。
   *
   * - 基于 props 重建一个**未挂载**的副本；deep=true 时递归克隆 GE 领域子元素（Port / Group 内 Node）。
   * - 内部渲染元素（body / labelText / marker）不克隆，由 connectedCallback 在插入时重建。
   * - id 遵循 DOM 行为保留原值；插入同一 Graph 前应改为唯一 id（否则 getElementById 命中首个）。
   * - Edge 的 source/target 是 id 引用，克隆后不重连，沿用原端点（与 DOM 引用语义一致）。
   *
   * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Node/cloneNode
   */
  cloneNode(deep = false): this {
    const doc = this.ownerDocument as any;
    const tag = (this.constructor as any).tag as string | undefined;
    if (!doc?.createElement || !tag) {
      throw new Error('[GE] cloneNode 需要 cell 已挂载到 Graph（ownerDocument 可用）');
    }
    const style = { ...this.props };
    delete style.id;
    const copy = doc.createElement(tag, { id: this.id, style });
    if (deep) {
      for (const child of (this.childNodes ?? []) as any[]) {
        // 只递归克隆 GE 领域子元素（Port / Group 内 Node），跳过 body/labelText 等内部渲染元素
        if (child instanceof Cell) copy.appendChild((child as Cell).cloneNode(true));
      }
    }
    return copy;
  }
}
