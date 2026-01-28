import { CustomElement, CustomEvent, type DisplayObject, Text } from '@antv/g-lite';
import type { DisplayObjectConfigWithShape } from '../types';

/**
 * GE 交互元素基类（泛型版本）
 *
 * 为 Node、Port、Edge 提供共享的基础功能：
 * - ID 管理
 * - primaryShape 管理（泛型类型安全）
 * - labelShape 管理（单一标签）
 * - 配置检查方法（draggable, linkable, linkto）
 * - 光标样式应用
 * - 双击支持
 *
 * 继承关系：
 * CustomElement (@antv/g-lite)
 *   ↑
 * GEInteractiveElement<TShape> (本类)
 *   ↑
 * ItemElement<TShape> (集合管理)
 *   ↑
 * Node<TShape>, Edge<TShape>
 *
 *   ↑
 * ItemToolElement<TShape> (单项定位)
 *   ↑
 * Port<TShape>
 *
 * @template TShape - 主要图形类型（Node/Port 使用，Edge 使用 DisplayObject）
 */
export abstract class GEInteractiveElement<TShape extends DisplayObject = DisplayObject> extends CustomElement<any> {
  // ============================================
  // ID Management
  // ============================================

  /**
   * Get the element's ID
   * Uses the id property from CustomElement (set via super() call)
   * @returns The element's ID string
   */
  getId(): string {
    return (this as any).id || '';
  }

  /**
   * Generate a unique ID
   * Uses timestamp + random string to ensure uniqueness
   * Subclasses can use this in their constructors before super()
   * @param prefix - ID prefix (e.g., 'node', 'edge', 'port', 'label', 'marker')
   * @returns Unique ID string
   */
  protected static generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // ============================================
  // PrimaryShape 管理（泛型类型安全）
  // ============================================

  /** 主要图形对象（子类创建）*/
  protected primaryShape: TShape | null = null;

  /**
   * 创建主要图形对象（子类实现）
   * @param config - 可选的配置对象
   * @returns 主要图形对象
   */
  protected abstract createPrimaryShape(config?: DisplayObjectConfigWithShape<any>): TShape;

  /**
   * 获取主要图形对象（类型安全）
   * @returns 主要图形对象
   */
  getPrimaryShape(): TShape {
    return this.primaryShape!;
  }

  // ============================================
  // Label 管理（基于方法，子类可扩展支持多标签）
  // ============================================

  /**
   * 获取标签对象（单一标签）
   * 默认从 children 中查找第一个 Text 对象
   * 子类（如 Edge）可以 override 支持多标签
   * @returns 标签对象，如果不存在则返回 null
   */
  getLabelShape(): Text | null {
    return this.findLabelInChildren();
  }

  /**
   * 获取指定 ID 的标签（支持多标签）
   * 默认实现只支持单一标签，子类可以 override
   * @param id - 标签 ID，不传则返回主标签
   * @returns 标签对象，如果不存在则返回 null
   */
  getLabel(id?: string): Text | null {
    if (!id) return this.getLabelShape();
    return null;  // 子类可以 override 支持多标签
  }

  /**
   * 设置或更新标签内容
   * 如果标签不存在则创建，存在则更新
   * @param config - 标签配置
   */
  setLabelShape(config: { text?: string; fill?: string; fontSize?: number; [key: string]: unknown }): void {
    let label = this.getLabelShape();
    if (!label) {
      label = new Text({ style: config });
      // Try to append the label
      try {
        this.appendChild(label);
      } catch (e) {
        // If appendChild fails (e.g., during construction), label is still usable
        console.warn('Failed to append label:', e);
      }
    } else {
      // Update existing
      if (config.text !== undefined) {
        label.style.text = config.text as string;
      }
      if (config.fill) {
        label.style.fill = config.fill as string;
      }
      if (config.fontSize) {
        label.style.fontSize = config.fontSize as number;
      }
      // Update other style properties
      Object.keys(config).forEach(key => {
        if (key !== 'text' && key !== 'fill' && key !== 'fontSize') {
          (label?.style as any)[key] = config[key];
        }
      });
    }
  }

  /**
   * 从 children 中查找第一个 Text 对象
   * @protected 子类可以复用此方法
   */
  protected findLabelInChildren(): Text | null {
    try {
      for (const child of this.children || []) {
        if ((child as any).nodeName === 'text') {
          return child as Text;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  // ============================================
  // 双击支持（Text 元素不支持原生 dblclick）
  // ============================================

  /** 上次点击时间（用于检测双击） */
  protected _lastClickTime: number = 0;
  /** 点击超时（用于重置双击检测） */
  protected _clickTimeout: ReturnType<typeof setTimeout> | null = null;

  // ============================================
  // 子类可覆盖的默认值
  // ============================================

  /** 默认是否可作为连线源（子类可覆盖） */
  protected _defaultSourceConnectable = false;
  /** 默认是否可作为连线目标（子类可覆盖） */
  protected _defaultTargetConnectable = false;

  // ============================================
  // 配置检查方法（子类使用新配置：linkable/linkto）
  // ============================================

  /**
   * 检查是否可拖拽
   * 子类通过 data.draggable 配置
   * @deprecated 使用 g-plugin-dragndrop 的 style.draggable 代替
   */
  protected _isDraggable(): boolean {
    const config = (this as any).data?.draggable;
    if (typeof config === 'boolean') return config;
    return config?.enabled ?? false;
  }

  /**
   * 检查是否可作为连线源（新配置：linkable）
   * 子类通过 data.linkable 配置，或覆盖 _defaultSourceConnectable 属性
   */
  protected _isSourceConnectable(): boolean {
    const config = (this as any).data?.linkable;
    if (typeof config === 'boolean') return config;
    return config?.enabled ?? this._defaultSourceConnectable;
  }

  /**
   * 检查是否可作为连线目标（新配置：linkto）
   * 子类通过 data.linkto 配置，或覆盖 _defaultTargetConnectable 属性
   */
  protected _isTargetConnectable(): boolean {
    const config = (this as any).data?.linkto;
    if (typeof config === 'boolean') return config;
    return config?.enabled ?? this._defaultTargetConnectable;
  }

  // ============================================
  // 辅助方法（子类可选覆盖）
  // ============================================

  /**
   * 获取元素的 data 配置
   * 子类需要实现此方法以提供配置数据
   */
  getData(): any {
    // Default implementation - subclasses should override
    return {};
  }

  /**
   * 应用光标样式到指定形状（子类调用此方法）
   * @param targetShape - 要应用光标样式的形状对象
   */
  protected _applyCursorStyleTo(targetShape: any): void {
    let cursor = 'default';

    const isDraggable = this._isDraggable();
    const isSourceConnectable = this._isSourceConnectable();
    const isTargetConnectable = this._isTargetConnectable();

    // 优先级：sourceConnectable > draggable > targetConnectable
    if (isSourceConnectable) {
      cursor = 'crosshair';
    } else if (isDraggable) {
      cursor = 'move';
    } else if (isTargetConnectable) {
      cursor = 'pointer';
    }

    try {
      if (targetShape && typeof targetShape.style === 'object') {
        targetShape.style.cursor = cursor;
      }
    } catch (e) {
      // ignore
    }
  }

  // ============================================
  // 双击支持方法
  // ============================================

  /**
   * 为指定元素设置双击监听
   * 由于 Text 等 DisplayObject 不支持原生 dblclick，使用 click + 时间间隔模拟
   * @param element - 要监听的元素（通常是 primaryShape 或 labelShape）
   */
  protected _setupDblClick(element: DisplayObject): void {
    // Block pointerdown from bubbling to prevent parent drag
    element.addEventListener('pointerdown', (e: Event) => {
      e.stopPropagation();
    });

    // Use click to simulate double-click (Text doesn't support dblclick)
    element.addEventListener('click', (e: Event) => {
      const now = Date.now();
      const timeSinceLastClick = now - this._lastClickTime;

      if (this._clickTimeout) {
        clearTimeout(this._clickTimeout);
        this._clickTimeout = null;
      }

      if (timeSinceLastClick < 300) {
        // Double click detected - dispatch dblclick event
        e.stopPropagation();
        e.preventDefault();
        this._lastClickTime = 0;
        this._dispatchDblClick(e);
      } else {
        this._lastClickTime = now;
        this._clickTimeout = setTimeout(() => {
          this._lastClickTime = 0;
        }, 300);
      }
    });
  }

  /**
   * 派发 dblclick 事件
   * 子类可以通过 addEventListener('dblclick', handler) 来监听
   */
  private _dispatchDblClick(originalEvent: Event): void {
    const dblClickEvent = new CustomEvent('dblclick', {
      detail: {
        originalEvent,
        target: this
      }
    });
    this.dispatchEvent(dblClickEvent);
  }

  // ============================================
  // g-plugin-dragndrop 交互属性统一设置
  // ============================================

  /**
   * 当元素被连接到 DOM 树时触发
   * 统一设置 g-plugin-dragndrop 所需的交互属性：
   * - draggable: 可拖拽移动
   * - linkable: 可作为连线源
   * - droppable: 可作为放置目标
   * - linkto: 可作为连线目标
   *
   * 这些属性同时设置到：
   * 1. HTML 属性 (setAttribute) - g-plugin-dragndrop 的 .closest() 选择器
   * 2. style 属性 - 插件检查使用
   * 3. primaryShape - 如果存在，确保点击时能识别
   */
  connectedCallback(): void {
    const isSourceConnectable = this._isSourceConnectable();
    const isTargetConnectable = this._isTargetConnectable();
    const isDraggable = this._isDraggable();

    // 根据配置设置属性（不判断元素类型）
    // sourceConnectable/linkable: 设置 draggable + linkable
    if (isSourceConnectable) {
      this._setLinkableProperties(true);
      // sourceConnectable 会同时设置 draggable（因为需要拖拽来创建连线）
      this._setDraggableProperties(true);
    } else if (isDraggable) {
      // 如果没有 sourceConnectable 但有 draggable，只设置 draggable
      this._setDraggableProperties(true);
    }

    // targetConnectable/linkto: 设置 droppable + linkto
    if (isTargetConnectable) {
      this._setDroppableProperties(true);
    }
  }

  /**
   * 设置 draggable 相关属性
   */
  private _setDraggableProperties(enabled: boolean): void {
    if (enabled) {
      this.setAttribute('draggable', 'true');
      this.style.draggable = true;
    } else {
      this.removeAttribute('draggable');
      this.style.draggable = false;
    }
  }

  /**
   * 设置 linkable 相关属性
   */
  private _setLinkableProperties(enabled: boolean): void {
    if (enabled) {
      this.setAttribute('linkable', 'true');
      this.style.linkable = true;
    } else {
      this.removeAttribute('linkable');
      this.style.linkable = false;
    }
  }

  /**
   * 设置 droppable 相关属性（作为连线目标）
   */
  private _setDroppableProperties(enabled: boolean): void {
    if (enabled) {
      this.setAttribute('droppable', 'true');
      this.setAttribute('linkto', 'true');
      this.style.droppable = true;
      this.style.linkto = true;
    } else {
      this.removeAttribute('droppable');
      this.removeAttribute('linkto');
      this.style.droppable = false;
      this.style.linkto = false;
    }
  }
}
