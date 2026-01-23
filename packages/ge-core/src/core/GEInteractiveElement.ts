import { CustomElement, FederatedEvent, CustomEvent } from '@antv/g-lite';
import type { GEDataTransfer } from '../types/events';
import { GEInteractionType } from '../types/events';
import type { Graph } from './Graph';
import type { Node } from './node/Node';
import type { Port } from './port/Port';

/**
 * GE 交互元素基类
 *
 * 为 Node、Port、Edge 提供共享的交互逻辑：
 * - 拖拽状态管理
 * - 数据传输（DataTransfer）
 * - 通用拖拽事件处理（pointermove/pointerup/pointercancel）
 * - Graph 查找和事件派发
 * - 连线处理（connect:over/drop）
 *
 * 继承关系：
 * CustomElement (@antv/g-lite)
 *   ↑
 * GEInteractiveElement (本类)
 *   ↑
 * Node / Port / Edge
 */
export abstract class GEInteractiveElement<T = any> extends CustomElement<T> {
  // ============================================
  // 交互状态管理（子类共享）
  // ============================================

  /** 是否正在拖拽 */
  protected _isDragging = false;
  /** 当前拖拽类型 */
  protected _dragType: GEInteractionType | null = null;
  /** 拖拽数据传输对象 */
  protected _dataTransfer: GEDataTransfer | null = null;
  /** 拖拽起始位置 */
  protected _dragStartPos: [number, number] | null = null;
  /** 指针捕获 ID（用于拖拽过程中捕获指针事件） */
  protected _pointerId: number | null = null;

  // ============================================
  // 子类可覆盖的默认值
  // ============================================

  /** 默认是否可作为连线源（子类可覆盖） */
  protected _defaultSourceConnectable = false;
  /** 默认是否可作为连线目标（子类可覆盖） */
  protected _defaultTargetConnectable = false;

  // ============================================
  // 初始化
  // ============================================

  /**
   * 初始化交互事件监听
   * 在 connectedCallback 中调用
   */
  protected _initInteraction(): void {
    this.addEventListener('pointerdown', this._handlePointerDown);
  }

  /**
   * 处理 pointerdown 事件
   * 根据配置决定交互类型，启动拖拽
   */
  private _handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;

    // 防止重复触发：如果已经在拖拽中，忽略后续的 pointerdown
    if (this._isDragging) {
      return;
    }

    const dragType = this._determineDragType();
    if (dragType) {
      this._startDrag(e, dragType);
    }
  };

  /**
   * 决定交互类型
   * 按优先级：sourceConnectable > draggable
   */
  protected _determineDragType(): GEInteractionType | null {
    const isSourceConnectable = this._isSourceConnectable();
    const isDraggable = this._isDraggable();

    if (isSourceConnectable) return GEInteractionType.CONNECTION;
    if (isDraggable) return GEInteractionType.NODE_DRAG;

    return null;
  }

  /**
   * 检查是否可拖拽
   * 子类通过 data.draggable 配置
   */
  protected _isDraggable(): boolean {
    const config = (this as any).data?.draggable;
    if (typeof config === 'boolean') return config;
    return config?.enabled ?? false;
  }

  /**
   * 检查是否可作为连线源
   * 子类通过 data.sourceConnectable 配置，或覆盖 _defaultSourceConnectable 属性
   */
  protected _isSourceConnectable(): boolean {
    const config = (this as any).data?.sourceConnectable;
    if (typeof config === 'boolean') return config;
    return config?.enabled ?? this._defaultSourceConnectable;
  }

  // ============================================
  // 工具方法（子类共享）
  // ============================================

  /**
   * 根据交互类型获取事件名称后缀
   * @param type 交互类型
   * @returns 事件后缀 ('dragstart/drag/dragend' 或 'start/drag/end')
   */
  protected _getEventPrefix(type: GEInteractionType | string): string {
    // 处理枚举和字符串两种情况
    if (typeof type === 'string') {
      return type === GEInteractionType.NODE_DRAG ? 'node' : 'connect';
    }
    return type === GEInteractionType.NODE_DRAG ? 'node' : 'connect';
  }

  /**
   * 根据交互类型获取事件名称后缀
   * @param type 交互类型
   * @returns 事件后缀 ('dragstart/drag/dragend' 或 'start/drag/end')
   */
  protected _getEventSuffix(type: GEInteractionType | string): string {
    // NODE_DRAG 使用 dragstart/drag/dragend（MovePlugin 兼容）
    // CONNECTION 使用 start/drag/end（ConnectionPlugin）
    if (typeof type === 'string') {
      return type === GEInteractionType.NODE_DRAG ? 'dragstart' : 'start';
    }
    return type === GEInteractionType.NODE_DRAG ? 'dragstart' : 'start';
  }

  /**
   * 创建 DataTransfer 对象
   * 类似浏览器原生 dataTransfer
   */
  protected _createDataTransfer(): GEDataTransfer {
    const dataMap = new Map<string, unknown>();

    return {
      setData(type: string, data: unknown): void {
        dataMap.set(type, data);
      },
      getData(type: string): unknown {
        return dataMap.get(type);
      },
      hasType(type: string): boolean {
        return dataMap.has(type);
      },
      clearData(): void {
        dataMap.clear();
      },
      effectAllowed: 'move',
      dropEffect: 'none',
    };
  }

  /**
   * 捕获指针（带兼容性检查）
   * @param pointerId 指针 ID
   */
  protected _capturePointer(pointerId: number): void {
    try {
      if (typeof this.setPointerCapture === 'function') {
        this.setPointerCapture(pointerId);
      }
    } catch (e) {
      // setPointerCapture 不可用，忽略
    }
  }

  /**
   * 启动拖拽
   * 由子类在 pointerdown 时调用
   * @param e 原始指针事件
   * @param type 拖拽类型
   */
  protected _startDrag(e: PointerEvent, type: GEInteractionType): void {
    // 立即设置拖拽状态，防止重复触发
    this._isDragging = true;

    // 阻止事件冒泡，避免触发父元素的拖拽逻辑
    // 例如：Port 触发连线时，不会触发 Node 的移动
    //       Node 触发连线时，不会触发 MovePlugin 的节点移动
    e.stopPropagation();
    this._dragType = type;
    this._pointerId = e.pointerId;
    this._dataTransfer = this._createDataTransfer();

    const canvasX = (e as any).canvasX ?? e.clientX;
    const canvasY = (e as any).canvasY ?? e.clientY;
    this._dragStartPos = [canvasX, canvasY];

    this._dataTransfer.setData('ge/source', this);
    this._dataTransfer.setData('ge/type', type);
    this._dataTransfer.setData('ge/startX', canvasX);
    this._dataTransfer.setData('ge/startY', canvasY);

    const prefix = this._getEventPrefix(type);
    const suffix = this._getEventSuffix(type);

    const eventDetail = {
      type,
      source: this,
      x: canvasX,
      y: canvasY,
      dataTransfer: this._dataTransfer,
      event: e
    };

    const dragStartEvent = (e as any).clone();
    (dragStartEvent as any).type = `${prefix}:${suffix}`;
    (dragStartEvent as any).detail = eventDetail;

    this.dispatchEvent(dragStartEvent);

    // Bind events to Canvas to ensure tracking even when mouse moves fast
    const canvas = this.ownerDocument;
    canvas.addEventListener('pointermove', this._handlePointerMove);
    canvas.addEventListener('pointerup', this._handlePointerUp);
    canvas.addEventListener('pointercancel', this._handlePointerCancel);
  }

  /**
   * 处理 pointermove 事件
   * 派发 drag 事件
   */
  private _handlePointerMove = (e: PointerEvent): void => {
    if (!this._isDragging || e.pointerId !== this._pointerId) return;

    // 使用与 dragstart 相同的坐标获取方式
    const canvasX = (e as any).canvasX ?? e.clientX;
    const canvasY = (e as any).canvasY ?? e.clientY;
    const prefix = this._getEventPrefix(this._dragType!);

    // 派发 drag 事件（pointermove 始终使用 'drag' 后缀）
    const dragEvent = (e as any).clone();
    (dragEvent as any).type = `${prefix}:drag`;
    (dragEvent as any).detail = {
      type: this._dragType!,
      source: this,
      x: canvasX,
      y: canvasY,
      dataTransfer: this._dataTransfer,
      target: undefined,
      event: e  // 原始 FederatedEvent
    };

    this.dispatchEvent(dragEvent);
  };

  /**
   * 处理 pointerup 事件
   * 派发 dragend/end 事件
   */
  private _handlePointerUp = (e: PointerEvent): void => {
    if (!this._isDragging || e.pointerId !== this._pointerId) return;

    // 使用与 dragstart 相同的坐标获取方式
    const canvasX = (e as any).canvasX ?? e.clientX;
    const canvasY = (e as any).canvasY ?? e.clientY;
    const prefix = this._getEventPrefix(this._dragType!);

    // 构建事件详情
    const detail: any = {
      type: this._dragType!,
      source: this,
      dropped: false,
      target: undefined
    };

    // For connection events, include position
    if (this._dragType === GEInteractionType.CONNECTION) {
      detail.x = canvasX;
      detail.y = canvasY;
      detail.connected = false;
    }

    // pointerup 始终使用 'end' 后缀（NODE_DRAG 用 'dragend'，CONNECTION 用 'end'）
    const endSuffix = this._dragType === GEInteractionType.NODE_DRAG ? 'dragend' : 'end';
    const dragEndEvent = (e as any).clone();
    (dragEndEvent as any).type = `${prefix}:${endSuffix}`;
    (dragEndEvent as any).detail = detail;

    // 清理状态
    this._endDrag();

    // 派发事件
    this.dispatchEvent(dragEndEvent);
  };

  /**
   * 处理 pointercancel 事件
   */
  private _handlePointerCancel = (e: PointerEvent): void => {
    if (!this._isDragging || e.pointerId !== this._pointerId) return;
    this._cancelDrag();
  };

  /**
   * 结束拖拽（清理状态）
   */
  protected _endDrag(): void {
    const canvas = this.ownerDocument;
    canvas.removeEventListener('pointermove', this._handlePointerMove);
    canvas.removeEventListener('pointerup', this._handlePointerUp);
    canvas.removeEventListener('pointercancel', this._handlePointerCancel);

    if (this._pointerId !== null) {
      try {
        this.releasePointerCapture(this._pointerId);
      } catch (e) {
        // ignore
      }
    }

    this._isDragging = false;
    this._dragType = null;
    this._dataTransfer = null;
    this._dragStartPos = null;
    this._pointerId = null;
  }

  /**
   * 取消拖拽
   * 派发 end 事件（dropped = false）
   */
  protected _cancelDrag(): void {
    const prefix = this._getEventPrefix(this._dragType || GEInteractionType.NODE_DRAG);
    // pointercancel 始终使用 'end' 后缀（NODE_DRAG 用 'dragend'，CONNECTION 用 'end'）
    const endSuffix = (this._dragType || GEInteractionType.NODE_DRAG) === GEInteractionType.NODE_DRAG ? 'dragend' : 'end';

    // 创建事件（_cancelDrag 没有原始事件可以 clone，所以使用 CustomEvent）
    const dragEndEvent = new CustomEvent(`${prefix}:${endSuffix}`, {
      detail: {
        type: this._dragType || GEInteractionType.NODE_DRAG,
        source: this,
        dropped: false,
        target: undefined
      }
    });

    this._endDrag();
    this.dispatchEvent(dragEndEvent);
  }

  // ============================================
  // Connect 处理方法（子类共享）
  // ============================================

  /**
   * 作为目标处理 connect:over（由 Graph 在连线拖拽时调用）
   * 返回 true 表示接受连线
   *
   * 子类可以通过覆盖 data.targetConnectable 来控制行为
   */
  _handleConnectOver(e: {
    source: Node | Port;
    x: number;
    y: number;
    dataTransfer: GEDataTransfer;
  }): boolean {
    const config = (this as any).data?.targetConnectable;

    // 检查配置
    if (typeof config === 'boolean') return config;
    if (config?.enabled === false) return false;

    // 触发自定义回调
    if (config && typeof config === 'object' && config.onDragOver) {
      return config.onDragOver(
        new CustomEvent('connect:over', { detail: e })
      ) !== false;
    }

    return true;
  }

  /**
   * 作为目标处理 connect:drop（由 Graph 在连线放置时调用）
   * 返回 true 表示成功处理连线
   *
   * 子类可以通过覆盖 data.targetConnectable 来控制行为
   */
  _handleConnectDrop(e: {
    source: Node | Port;
    x: number;
    y: number;
    dataTransfer: GEDataTransfer;
  }): boolean {
    const config = (this as any).data?.targetConnectable;

    // 检查配置
    if (typeof config === 'boolean') return config;
    if (config?.enabled === false) return false;

    // 触发自定义回调
    if (config && typeof config === 'object' && config.onDrop) {
      return config.onDrop(
        new CustomEvent('connect:drop', { detail: e })
      ) !== false;
    }

    return true;
  }

  // ============================================
  // 辅助方法（子类可选覆盖）
  // ============================================

  /**
   * 获取元素的 data 配置
   * 子类需要实现此方法以提供配置数据
   */
  abstract getData(): any;

  /**
   * 检查是否可作为连线目标
   * 子类通过 data.targetConnectable 配置，或覆盖 _defaultTargetConnectable 属性
   */
  protected _isTargetConnectable(): boolean {
    const config = (this as any).data?.targetConnectable;
    if (typeof config === 'boolean') return config;
    return config?.enabled ?? this._defaultTargetConnectable;
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
}
