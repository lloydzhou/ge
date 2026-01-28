import type { RenderingPlugin, RenderingPluginContext, MinimapConfig } from '../types';
import {
  Camera,
  CameraType,
  DisplayObject,
  Shape,
} from '@antv/g-lite';
import { CanvasPathGenerator, CanvasRenderer } from '@antv/g-canvas';

import { mat4 } from 'gl-matrix';

/**
 * MinimapPlugin - 使用 Canvas 2D 实现 Minimap
 *
 * 核心思路：
 * 1. 创建独立的 <canvas> 元素作为 minimap 容器
 * 2. 使用相同的 DisplayObject 树（document.documentElement）
 * 3. 使用 CanvasRenderer.Plugin 的 pathGeneratorFactory 和 styleRendererFactory 正确渲染
 * 4. 配置独立的 Camera 实现缩放和平移
 * 5. 在 endFrame hook 中渲染到 minimap canvas
 *
 * @example
 * ```typescript
 * const minimap = new MinimapPlugin({
 *   container: document.getElementById('minimap'),
 *   width: 200,
 *   height: 150,
 *   scale: 0.3
 * });
 * graph.use(minimap);
 * ```
 */
export class MinimapPlugin implements RenderingPlugin {
  name = 'minimap';

  private graph: any;
  private config: MinimapConfig;
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapContext: CanvasRenderingContext2D | null = null;
  private minimapCamera: Camera | null = null;
  private dynamicScale: number = 0.3;

  // CanvasRenderer.Plugin 相关
  private canvasRendererPlugin: CanvasRenderer.Plugin | null = null;
  private pathGeneratorFactory: Record<Shape, any> | null = null;
  private styleRendererFactory: Record<Shape, any> | null = null;
  private renderState: any = {
    restoreStack: [],
    prevObject: null,
    currentContext: new Map(),
  };
  private vpMatrix = mat4.create();
  private tmpMat4 = mat4.create();

  constructor(config: MinimapConfig) {
    this.config = config;
  }

  apply(context: RenderingPluginContext): void {
    this.graph = (context as any).graph;
    const { renderingService } = context;

    // 🌟 使用 CanvasRenderer.Plugin 生成渲染所需的所有 factories
    this.initializeCanvasRenderer();

    // 在 endFrame hook 中渲染 minimap
    renderingService.hooks.endFrame.tap(MinimapPlugin.name, () => {
      this.renderMinimap();
    });

    // 等待 graph ready 后初始化
    this.graph.ready.then(() => {
      this.initializeMinimap();
      this.setupInteractions();
    }).catch((err: any) => {
      console.error('[MinimapPlugin] Graph ready failed:', err);
    });
  }

  /**
   * 初始化 CanvasRenderer.Plugin 并获取所需的 factories
   * 🌟 复用 CanvasRenderer.Plugin 的完整渲染逻辑
   */
  private initializeCanvasRenderer(): void {
    // 🌟 创建简化的 imagePool，支持渐变色
    const imagePool: any = {
      getOrCreateImage: () => null,
      getOrCreateGradient: (
        config: any,
        context: CanvasRenderingContext2D,
      ) => {
        const { type, min, width, height } = config;
        const x = min ? min[0] : 0;
        const y = min ? min[1] : 0;

        if (type === 'linear-gradient') {
          const { x1, y1, x2, y2 } = config;
          return context.createLinearGradient(
            x + x1 * width,
            y + y1 * height,
            x + x2 * width,
            y + y2 * height,
          );
        } else if (type === 'radial-gradient') {
          const { cx, cy, r } = config;
          return context.createRadialGradient(
            x + cx * width,
            y + cy * height,
            0,
            x + cx * width,
            y + cy * height,
            r * Math.max(width, height),
          );
        }
        return '#000';
      },
      getOrCreatePatternSync: () => null,
    };

    // 🌟 共享的 context（包含 imagePool）
    const sharedContext: any = {
      imagePool,
      renderingPlugins: [],
    };

    // 🌟 使用 CanvasPathGenerator 获取 pathGeneratorFactory
    const canvasPathGeneratorPlugin = new CanvasPathGenerator.Plugin();
    (canvasPathGeneratorPlugin as any).context = sharedContext;
    (canvasPathGeneratorPlugin as any).plugins = [];
    canvasPathGeneratorPlugin.init();

    // 🌟 使用 CanvasRenderer.Plugin 获取 styleRendererFactory
    const canvasRendererPlugin = new CanvasRenderer.Plugin();
    (canvasRendererPlugin as any).context = sharedContext;
    (canvasRendererPlugin as any).plugins = [];
    canvasRendererPlugin.init();

    // 🌟 获取 factories
    this.canvasRendererPlugin = canvasRendererPlugin;
    this.pathGeneratorFactory = sharedContext.pathGeneratorFactory;
    this.styleRendererFactory = sharedContext.styleRendererFactory;

    console.log('[MinimapPlugin] Initialized with CanvasRenderer.Plugin factories');
  }

  destroy(): void {
    // 移除事件监听器
    this.removeEventListeners();

    // 移除 camera 监听器
    const mainCamera = (this as any).mainCamera;
    if (mainCamera && typeof mainCamera.removeEventListener === 'function') {
      // @ts-ignore - Camera has addEventListener but not typed in g-lite
      mainCamera.removeEventListener('change');
    }

    // 移除 minimap canvas
    if (this.minimapCanvas && this.minimapCanvas.parentNode) {
      this.minimapCanvas.parentNode.removeChild(this.minimapCanvas);
    }

    this.minimapCanvas = null;
    this.minimapContext = null;
    this.minimapCamera = null;
    this.canvasRendererPlugin = null;
    this.pathGeneratorFactory = null;
    this.styleRendererFactory = null;
  }

  /**
   * 初始化 minimap
   */
  private initializeMinimap(): void {
    // 1. 获取容器
    let container: HTMLElement | null;
    if (typeof this.config.container === 'string') {
      container = document.getElementById(this.config.container);
    } else {
      container = this.config.container;
    }

    if (!container) {
      console.error('[MinimapPlugin] Container not found');
      return;
    }

    // 2. 创建 minimap canvas
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = this.config.width || 200;
    this.minimapCanvas.height = this.config.height || 150;
    this.minimapCanvas.style.backgroundColor = '#f5f5f5';
    this.minimapCanvas.style.border = '1px solid #d9d9d9';
    this.minimapCanvas.style.cursor = 'grab';
    container.appendChild(this.minimapCanvas);

    // 3. 获取 Canvas 2D context
    this.minimapContext = this.minimapCanvas.getContext('2d');
    if (!this.minimapContext) {
      console.error('[MinimapPlugin] Failed to get 2D context');
      return;
    }

    // 4. 创建独立的 minimap camera
    this.minimapCamera = new Camera();

    console.log('[MinimapPlugin] Initialized successfully');
  }

  /**
   * 渲染 minimap
   */
  private renderMinimap(): void {
    if (!this.minimapContext || !this.minimapCamera) {
      return;
    }

    const document = this.graph.document;
    if (!document?.documentElement) return;

    // 1. 清空 minimap canvas
    const width = this.minimapCanvas!.width;
    const height = this.minimapCanvas!.height;
    this.minimapContext.clearRect(0, 0, width, height);

    // 2. 绘制背景
    this.minimapContext.fillStyle = '#f5f5f5';
    this.minimapContext.fillRect(0, 0, width, height);

    // 3. 计算 minimap camera 的 transform
    this.updateMinimapCamera();

    // 4. 初始化 render state
    this.renderState = {
      restoreStack: [],
      prevObject: null,
      currentContext: new Map(),
    };

    // 5. 初始化 vpMatrix（投影矩阵）
    this.initViewportMatrix();

    // 6. 遍历 DisplayObject 树并渲染
    this.traverseAndRender(document.documentElement);

    // 7. 恢复 context transform
    this.minimapContext.setTransform(1, 0, 0, 1, 0, 0);

    // 8. pop restore stack
    this.renderState.restoreStack.forEach(() => {
      this.minimapContext!.restore();
    });
    this.renderState.restoreStack = [];

    // 9. 绘制视口矩形（不应用 camera transform）
    this.drawViewportRect();
  }

  /**
   * 初始化 vpMatrix（投影矩阵）
   * 🌟 Scale 已基于 effectiveMinimapWidth（减去 padding）计算
   * 内容缩放后会自动小于 canvas，自然居中即可
   *
   * 为什么不需要在 translate 中应用 padding：
   * - scale = effectiveMinimapWidth / contentWidth
   * - 缩放后内容宽度 = contentWidth * scale = effectiveMinimapWidth
   * - 内容居中后，左右边距 = (minimapWidth - effectiveMinimapWidth) / 2 = padding
   */
  private initViewportMatrix(): void {
    if (!this.minimapCamera || !this.minimapCanvas) return;

    const zoom = this.minimapCamera.getZoom();
    const cameraPos = this.minimapCamera.getPosition();

    // 计算 canvas 参数（屏幕坐标）
    const width = this.minimapCanvas.width;
    const height = this.minimapCanvas.height;

    // 🌟 简单居中：让内容中心对齐 minimap 中心
    // scale 已经确保缩放后的内容小于 canvas，会自然留出边距
    const tx = width / 2 - cameraPos[0] * zoom;
    const ty = height / 2 - cameraPos[1] * zoom;

    // 清空 vpMatrix
    mat4.identity(this.vpMatrix);

    // 设置缩放和平移
    this.vpMatrix[0] = zoom;   // scaleX
    this.vpMatrix[5] = zoom;   // scaleY
    this.vpMatrix[12] = tx;    // translateX
    this.vpMatrix[13] = ty;    // translateY
  }

  /**
   * 遍历 DisplayObject 树并渲染到 minimap
   * 🌟 使用与 CanvasRendererPlugin.renderByZIndex 相同的遍历逻辑
   */
  private traverseAndRender(object: DisplayObject): void {
    const stack = [object];

    while (stack.length > 0) {
      const current = stack.pop()!;

      // 检查可见性和裁剪
      if (!current.isVisible() || current.isCulled()) {
        continue;
      }

      // 渲染当前对象
      this.renderDisplayObject(current);

      // 获取子节点（考虑 z-index 排序）
      const objects =
        (current as any).sortable?.sorted?.length > 0
          ? (current as any).sortable.sorted
          : current.childNodes;

      // 反向遍历加入栈（保持正确的渲染顺序）
      for (let i = (objects?.length || 0) - 1; i >= 0; i--) {
        stack.push(objects[i] as DisplayObject);
      }
    }
  }

  /**
   * 渲染单个 DisplayObject 到 minimap
   * 🌟 使用 CanvasRendererPlugin 的 renderDisplayObject 方法
   */
  private renderDisplayObject(object: DisplayObject): void {
    if (!this.minimapContext || !this.canvasRendererPlugin) return;

    const nodeName = object.nodeName as Shape;

    // 🌟 GROUP、HTML、MESH、FRAGMENT 不渲染自己
    if (nodeName === Shape.GROUP || nodeName === Shape.HTML || nodeName === Shape.MESH || nodeName === Shape.FRAGMENT) {
      return;
    }

    // 🌟 获取 pathGenerator 和 styleRenderer
    const generatePath = this.pathGeneratorFactory?.[nodeName];
    const styleRenderer = this.styleRendererFactory?.[nodeName];

    // TEXT 类型不需要 pathGenerator，只需要 styleRenderer
    if (nodeName !== Shape.TEXT && (!generatePath || !styleRenderer)) {
      return;
    }
    if (nodeName === Shape.TEXT && !styleRenderer) {
      return;
    }

    // 🌟 restore to its ancestor
    const parent = this.renderState.restoreStack[this.renderState.restoreStack.length - 1];
    if (parent) {
      const contains = (object.compareDocumentPosition(parent) & 0x8) !== 0; // DOCUMENT_POSITION_CONTAINS
      if (!contains) {
        this.minimapContext.restore();
        this.renderState.restoreStack.pop();
      }
    }

    // 🌟 clip path
    const { clipPath } = object.parsedStyle;
    if (clipPath) {
      this.applyWorldTransform(clipPath);

      const clipPathGenerator = this.pathGeneratorFactory?.[clipPath.nodeName as Shape];
      if (clipPathGenerator) {
        this.minimapContext.save();
        this.renderState.restoreStack.push(object);

        this.minimapContext.beginPath();
        clipPathGenerator(this.minimapContext, clipPath.parsedStyle);
        this.minimapContext.closePath();
        this.minimapContext.clip();
      }
    }

    // 🌟 fill & stroke
    if (styleRenderer) {
      this.applyWorldTransform(object);
      this.minimapContext.save();

      // apply attributes to context
      this.applyAttributesToContext(object);
    }

    // 🌟 TEXT 不需要 generatePath，其他类型需要
    if (nodeName !== Shape.TEXT && generatePath) {
      this.minimapContext.beginPath();
      generatePath(this.minimapContext, object.parsedStyle);
      if (
        nodeName !== Shape.LINE &&
        nodeName !== Shape.PATH &&
        nodeName !== Shape.POLYLINE
      ) {
        this.minimapContext.closePath();
      }
    }

    // 🌟 使用 styleRenderer.render() 进行渲染
    if (styleRenderer) {
      // 创建简化的 canvasContext
      const canvasContext: any = {
        imagePool: (this.canvasRendererPlugin as any).context?.imagePool,
      };

      // 创建简化的 runtime
      const runtime: any = {};

      // 调用 styleRenderer.render()
      styleRenderer.render(
        this.minimapContext,
        object.parsedStyle,
        object,
        canvasContext,
        this.canvasRendererPlugin,
        runtime,
      );

      // restore applied attributes
      this.minimapContext.restore();
    }

    // finish rendering, clear dirty flag
    object.dirty(false);
  }

  /**
   * 应用世界变换
   * 🌟 使用与 CanvasRendererPlugin 相同的逻辑
   */
  private applyWorldTransform(object: DisplayObject): void {
    const worldTransform = object.getWorldTransform();
    mat4.copy(this.tmpMat4, worldTransform);
    mat4.multiply(this.tmpMat4, this.vpMatrix, this.tmpMat4);

    this.minimapContext!.setTransform(
      this.tmpMat4[0],
      this.tmpMat4[1],
      this.tmpMat4[4],
      this.tmpMat4[5],
      this.tmpMat4[12],
      this.tmpMat4[13],
    );
  }

  /**
   * 应用属性到 context
   * 🌟 使用与 CanvasRendererPlugin 相同的逻辑
   */
  private applyAttributesToContext(object: DisplayObject): void {
    const context = this.minimapContext!;
    const { stroke, fill, opacity, lineDash, lineDashOffset } = object.parsedStyle;

    if (lineDash) {
      context.setLineDash(lineDash);
    }

    if (lineDashOffset !== undefined && lineDashOffset !== null) {
      context.lineDashOffset = lineDashOffset;
    }

    if (opacity !== undefined && opacity !== null) {
      context.globalAlpha *= opacity;
    }

    if (
      stroke &&
      !Array.isArray(stroke) &&
      !stroke.isNone
    ) {
      context.strokeStyle = object.attributes.stroke as string;
    }

    if (fill && !Array.isArray(fill) && !fill.isNone) {
      context.fillStyle = object.attributes.fill as string;
    }
  }

  /**
   * 更新 minimap camera 参数
   * 🌟 使用主画布中心作为坐标原点，保持一致性
   */
  private updateMinimapCamera(): void {
    if (!this.minimapCamera) return;

    const document = this.graph.document;
    if (!document) return;

    // 🌟 计算内容的边界框（与 SVG MinimapPlugin 相同）
    const bounds = document.documentElement.getBounds();
    let minX: number, minY: number, maxX: number, maxY: number;

    if (bounds && bounds.min && bounds.max) {
      minX = bounds.min[0];
      minY = bounds.min[1];
      maxX = bounds.max[0];
      maxY = bounds.max[1];
    } else {
      minX = minY = maxX = maxY = 0;
    }

    if (minX === Infinity) {
      minX = minY = maxX = maxY = 0;
    }

    // 🌟 计算内容的中心和尺寸（世界坐标系）
    // const contentCenterX = (minX + maxX) / 2;
    // const contentCenterY = (minY + maxY) / 2;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // 🌟 计算动态缩放比例
    const minimapWidth = this.config.width || 200;
    const minimapHeight = this.config.height || 150;

    // padding 是屏幕坐标系的概念
    const padding = Math.min(20, minimapWidth / 10, minimapHeight / 10);
    const effectiveMinimapWidth = minimapWidth - padding * 2;
    const effectiveMinimapHeight = minimapHeight - padding * 2;

    // 如果内容为空，使用主画布尺寸
    const canvasWidth = this.graph.width || 800;
    const canvasHeight = this.graph.height || 600;

    // 🌟 取最大值：确保 minimap 始终显示整个画布区域
    // 即使内容很小，minimap 也应该显示完整的画布大小
    const actualContentWidth = Math.max(contentWidth, canvasWidth);
    const actualContentHeight = Math.max(contentHeight, canvasHeight);

    // scale：显示整个内容（或画布）
    const finalScale = Math.min(
      effectiveMinimapWidth / actualContentWidth,
      effectiveMinimapHeight / actualContentHeight
    );

    // 计算内容中心点（世界坐标系）
    const contentCenterX = actualContentWidth / 2;
    const contentCenterY = actualContentHeight / 2;

    // 配置 Canvas 2D Camera
    this.minimapCamera.setZoom(finalScale);
    // 🌟 关键修复：Camera position 应该设置为内容中心点
    // 这样相机就会聚焦在内容的中心位置
    this.minimapCamera.setPosition([contentCenterX, contentCenterY, 0]);

    // 存储 scale 和 contentCenter 用于其他计算
    this.dynamicScale = finalScale;
    (this as any).contentCenter = { x: contentCenterX, y: contentCenterY };
  }

  /**
   * 绘制视口矩形
   * 🌟 使用与内容渲染相同的变换逻辑，确保精确对齐
   */
  private drawViewportRect(): void {
    if (!this.minimapContext) return;

    const mainCamera = this.graph.getCamera();
    const graphWidth = this.graph.width || 800;
    const graphHeight = this.graph.height || 600;

    // 🌟 计算主视口在世界坐标系中的实际位置和尺寸
    const mainZoom = mainCamera.getZoom();
    const mainPos = mainCamera.getPosition();

    // 视口在世界坐标系中的尺寸（考虑 zoom）
    const viewportWorldWidth = graphWidth / mainZoom;
    const viewportWorldHeight = graphHeight / mainZoom;

    // 视口左上角在世界坐标系中的位置
    // camera.position 是视口中心，所以左上角是 center - size/2
    const viewportWorldX = mainPos[0] - viewportWorldWidth / 2;
    const viewportWorldY = mainPos[1] - viewportWorldHeight / 2;

    // 🌟 使用 vpMatrix 将世界坐标转换为 minimap 坐标
    // 简化方法：直接应用 vpMatrix 到 context，绘制矩形，然后恢复
    const context = this.minimapContext;
    context.save();

    // 应用 vpMatrix 变换
    context.setTransform(
      this.vpMatrix[0],
      this.vpMatrix[1],
      this.vpMatrix[4],
      this.vpMatrix[5],
      this.vpMatrix[12],
      this.vpMatrix[13]
    );

    // 在世界坐标系中绘制矩形（会被 vpMatrix 自动转换到 minimap 坐标）
    context.strokeStyle = '#1890ff';
    context.lineWidth = 2;
    context.fillStyle = 'rgba(24, 144, 255, 0.1)';

    // 使用 RectPath 生成路径（与内容渲染保持一致）
    const rectPath = this.pathGeneratorFactory?.[Shape.RECT];
    if (rectPath) {
      context.beginPath();
      rectPath(context, {
        x: viewportWorldX,
        y: viewportWorldY,
        width: viewportWorldWidth,
        height: viewportWorldHeight,
        radius: 0,
      });
      context.closePath();
    } else {
      // fallback
      context.beginPath();
      context.rect(viewportWorldX, viewportWorldY, viewportWorldWidth, viewportWorldHeight);
    }

    context.fill();
    context.stroke();

    context.restore();
  }

  /**
   * 设置拖拽交互
   */
  private setupInteractions(): void {
    if (!this.minimapCanvas) return;

    let isDragging = false;
    let dragStartPos: { x: number; y: number } | null = null;
    let startCameraPos: [number, number] | null = null;

    const handlePointerDown = (e: PointerEvent) => {
      const rect = this.minimapCanvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 任何点击都启动拖拽（可以点击视口矩形外平移）
      isDragging = true;
      dragStartPos = { x: e.clientX, y: e.clientY };
      startCameraPos = this.graph.getCamera().getPosition();
      this.minimapCanvas!.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !dragStartPos || !startCameraPos) return;

      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      const scale = this.dynamicScale;

      // 计算新的相机位置
      const newX = startCameraPos[0] + dx / scale;
      const newY = startCameraPos[1] + dy / scale;

      this.graph.getCamera().setPosition([newX, newY, 0]);
    };

    const handlePointerUp = () => {
      isDragging = false;
      dragStartPos = null;
      startCameraPos = null;
      if (this.minimapCanvas) {
        this.minimapCanvas.style.cursor = 'grab';
      }
    };

    // 存储事件处理器引用以便清理
    (this as any).pointerDownHandler = handlePointerDown;
    (this as any).pointerMoveHandler = handlePointerMove;
    (this as any).pointerUpHandler = handlePointerUp;

    this.minimapCanvas.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }

  /**
   * 移除事件监听器
   */
  private removeEventListeners(): void {
    if (!this.minimapCanvas) return;

    const pointerDownHandler = (this as any).pointerDownHandler;
    const pointerMoveHandler = (this as any).pointerMoveHandler;
    const pointerUpHandler = (this as any).pointerUpHandler;

    if (pointerDownHandler) {
      this.minimapCanvas.removeEventListener('pointerdown', pointerDownHandler);
    }
    if (pointerMoveHandler) {
      document.removeEventListener('pointermove', pointerMoveHandler);
    }
    if (pointerUpHandler) {
      document.removeEventListener('pointerup', pointerUpHandler);
    }
  }
}
