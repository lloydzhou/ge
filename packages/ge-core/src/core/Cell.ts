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

export abstract class Cell extends CustomElement<any> {
  /** 是否已完成首次渲染 */
  protected rendered = false;

  /** 可序列化业务数据 */
  protected model: Record<string, unknown> = {};

  connectedCallback(): void {
    if (!this.rendered) {
      this.render();
      this.rendered = true;
    }
  }

  disconnectedCallback(): void {
    this.rendered = false;
  }

  /** 首次连接时构建渲染元素 */
  protected abstract render(): void;

  /** 派发自定义事件（避免与 g-lite 公有 emit 冲突，命名为 fire） */
  protected fire(type: string, detail?: object): void {
    this.dispatchEvent(new CustomEvent(type, detail ? { detail } : undefined));
  }

  getData(): Record<string, unknown> {
    return { ...this.model };
  }

  setData(patch: Record<string, unknown>): void {
    this.model = { ...this.model, ...patch };
    this.fire('cell:change', { data: this.model });
  }
}
