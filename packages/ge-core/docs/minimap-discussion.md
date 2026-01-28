# Minimap 实现讨论文档

## 问题描述

### X6 的 Minimap 实现方式及其问题

在 AntV X6 中，Minimap 采用了"双画布复制"的方式：
- 在小画布（minimap）中完整复制所有节点和边
- 自定义节点（React/Vue 组件）会在两个画布中都渲染
- 导致组件生命周期执行两次
- 带来性能问题和开发困惑

**核心问题**: 相同的节点被渲染了两次，增加了不必要的性能开销。

## 核心洞察

### Minimap 的本质

Minimap 不是"复制主画布"，而是：
- **Minimap**: 全局的、简化的导航视图（"不清晰的"全景图）
- **主画布**: 局部的、详细的工作视图（部分细节图）

两者是**同一份数据的不同视口展示**，而不是复制关系。

### 正确的理解

```
┌─────────────────────────────────────────────────────────┐
│                    Graph Data (Source)                  │
│                    ┌──────────────┐                     │
│                    │   Node 1     │                     │
│                    │   Edge 1     │                     │
│                    │   ...        │                     │
│                    └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│   Main Canvas         │       │   Minimap Canvas      │
│   - 局部视口           │       │   - 全局视口           │
│   - 详细渲染           │       │   - 简化渲染           │
│   - 完整节点形状       │       │   - 简单矩形代替       │
│   - 交互操作           │       │   - 仅显示导航         │
└───────────────────────┘       └───────────────────────┘
```

## 实现方案对比

### 方案 1: 截图方式 (❌ 不推荐)

**思路**: 定期对主画布截图，显示在 minimap 中。

**问题**:
- `canvas.toDataURL()` 对大画布非常昂贵
- 需要定时更新，增加性能开销
- 仍然需要渲染两次（主画布 + 截图生成）

### 方案 2: Copy Renderer (❌ 过于复杂)

**思路**: 复用渲染命令，在两个 renderer 上分别执行。

**问题**:
- g-lite 不原生支持多 renderer
- 需要拦截和复制渲染命令
- 实现复杂度高

### 方案 3: 两个 Canvas 实例 (✅ 推荐)

**思路**: 创建两个独立的 Canvas 实例，共享同一份 Graph 数据。

```typescript
class MinimapPlugin implements RenderingPlugin {
  name = 'minimap';

  private minimapCanvas: Canvas;
  private graph: Graph;
  private scale: number = 0.1;  // Minimap 缩放比例

  apply(context: RenderingPluginContext): void {
    this.graph = (context as any).graph;

    // 创建独立的 minimap canvas
    this.minimapCanvas = new Canvas({
      width: 200,
      height: 150,
      renderer: 'canvas',  // 使用简单渲染器
      container: this.createMinimapContainer()
    });

    // 监听主画布变化，更新 minimap
    this.graph.addEventListener('node:added', this.updateMinimap.bind(this));
    this.graph.addEventListener('node:removed', this.updateMinimap.bind(this));
    this.graph.addEventListener('node:moved', this.updateMinimap.bind(this));
    this.graph.addEventListener('viewport:change', this.updateViewportRect.bind(this));
  }

  private updateMinimap(): void {
    // 清空 minimap
    this.minimapCanvas.document.removeChild(...this.minimapCanvas.document.children);

    // 计算全局边界
    const bounds = this.getGraphBounds();

    // 计算缩放比例，使整个图适应 minimap
    const scaleX = 200 / bounds.width;
    const scaleY = 150 / bounds.height;
    this.scale = Math.min(scaleX, scaleY);

    // 简化渲染：用简单矩形代替节点
    this.graph.getNodes().forEach(node => {
      const pos = node.getPosition();
      const size = node.getSize();

      const simpleRect = new Rect({
        style: {
          x: (pos[0] - bounds.x) * this.scale,
          y: (pos[1] - bounds.y) * this.scale,
          width: size.width * this.scale,
          height: size.height * this.scale,
          fill: this.getNodeColor(node)
        }
      });

      this.minimapCanvas.document.appendChild(simpleRect);
    });

    // 简化渲染：用简单线条代替边
    this.graph.getEdges().forEach(edge => {
      const points = edge.getPoints();
      const simpleLine = new Path({
        style: {
          path: this.createSimplifiedPath(points, bounds),
          stroke: '#999',
          lineWidth: 1
        }
      });

      this.minimapCanvas.document.appendChild(simpleLine);
    });

    // 绘制当前视口矩形
    this.drawViewportRect();
  }

  private drawViewportRect(): void {
    // 获取主画布当前视口
    const viewport = this.getCurrentViewport();

    // 在 minimap 上绘制视口矩形
    const viewportRect = new Rect({
      style: {
        x: (viewport.x - bounds.x) * this.scale,
        y: (viewport.y - bounds.y) * this.scale,
        width: viewport.width * this.scale,
        height: viewport.height * this.scale,
        fill: 'transparent',
        stroke: '#1890ff',
        lineWidth: 2
      }
    });

    this.minimapCanvas.document.appendChild(viewportRect);
  }

  private createMinimapContainer(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 200px;
      height: 150px;
      border: 1px solid #ddd;
      background: rgba(255, 255, 255, 0.9);
    `;
    document.body.appendChild(container);
    return container;
  }
}
```

**优势**:
- ✅ 避免了 React/Vue 组件的双渲染
- ✅ Minimap 使用简化的图形，性能好
- ✅ 两个 Canvas 独立，互不影响
- ✅ 可以只在数据变化时更新，不需要定时刷新

### 方案 4: 同一 Canvas，两个区域 (备选)

**思路**: 在同一个 Canvas 上使用 `save()`, `translate()`, `clip()` 绘制不同区域。

```typescript
// 在主 Canvas 的 render 循环中
render() {
  // 主视口渲染
  this.renderMainViewport();

  // Minimap 区域渲染（使用 transform 和 clip）
  ctx.save();
  ctx.translate(200, 0);  // 移动到 minimap 区域
  ctx.clip(0, 0, 200, 150);
  this.renderMinimapViewport();
  ctx.restore();
}
```

**问题**:
- 需要修改主 Canvas 的渲染逻辑
- 不如独立 Canvas 清晰

## 推荐实现

### 核心原则

1. **共享数据，独立渲染**: Minimap 和主画布共享 Graph 数据，但使用不同的渲染策略
2. **简化 Minimap 渲染**: 使用简单矩形和线条，不渲染完整的节点组件
3. **事件驱动更新**: 只在数据变化时更新 Minimap，不需要定时刷新
4. **视口同步**: Minimap 显示当前主画布的视口范围

### 实现要点

```typescript
interface MinimapConfig {
  width?: number;           // Minimap 宽度，默认 200
  height?: number;          // Minimap 高度，默认 150
  position?: {              // Minimap 位置
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  nodeColor?: (node: Node) => string;  // 节点颜色函数
  edgeColor?: string;        // 边颜色，默认 '#999'
  viewportColor?: string;   // 视口矩形颜色，默认 '#1890ff'
}

class MinimapPlugin implements RenderingPlugin {
  name = 'minimap';

  private minimapCanvas: Canvas;
  private config: Required<MinimapConfig>;

  constructor(config: MinimapConfig = {}) {
    this.config = {
      width: config.width || 200,
      height: config.height || 150,
      position: config.position || { top: 10, right: 10 },
      nodeColor: config.nodeColor || (() => '#ccc'),
      edgeColor: config.edgeColor || '#999',
      viewportColor: config.viewportColor || '#1890ff'
    };
  }

  apply(context: RenderingPluginContext): void {
    const graph = (context as any).graph;

    // 创建 minimap canvas
    this.minimapCanvas = new Canvas({
      width: this.config.width,
      height: this.config.height,
      renderer: 'canvas'
    });

    // 添加到 DOM
    this.addToDOM();

    // 监听变化并更新
    this.setupListeners(graph);

    // 初始渲染
    this.renderMinimap(graph);
  }

  private renderMinimap(graph: Graph): void {
    // 获取全局边界
    const bounds = this.calculateBounds(graph);

    // 计算缩放
    const scale = Math.min(
      this.config.width / bounds.width,
      this.config.height / bounds.height
    );

    // 清空并简化渲染
    this.renderSimplifiedNodes(graph, bounds, scale);
    this.renderSimplifiedEdges(graph, bounds, scale);
    this.renderViewportRect(graph, bounds, scale);
  }

  private renderSimplifiedNodes(graph: Graph, bounds: Bounds, scale: number): void {
    graph.getNodes().forEach(node => {
      const pos = node.getPosition();
      const size = node.getSize();

      // 使用简单矩形，不渲染完整的节点组件
      const rect = new Rect({
        style: {
          x: (pos[0] - bounds.x) * scale,
          y: (pos[1] - bounds.y) * scale,
          width: size.width * scale,
          height: size.height * scale,
          fill: this.config.nodeColor(node)
        }
      });

      this.minimapCanvas.document.appendChild(rect);
    });
  }

  // ... 其他方法
}
```

## 使用示例

```typescript
import { Graph } from '@antv/ge';
import { MinimapPlugin } from '@antv/ge/plugin';

const graph = new Graph({
  container: 'container',
  width: 800,
  height: 600
});

// 添加 Minimap 插件
graph.use(new MinimapPlugin({
  width: 200,
  height: 150,
  position: { top: 10, right: 10 },
  nodeColor: (node) => {
    // 根据节点类型返回不同颜色
    return node.getData().type === 'start' ? '#52c41a' : '#ccc';
  }
}));

// Minimap 会自动更新，无需手动操作
```

## 总结

### X6 的问题
- 双画布完整复制导致组件双渲染
- 自定义组件生命周期执行两次
- 性能开销和开发困惑

### GE 的解决方案
- **核心概念**: 同一数据，不同视口，不同渲染策略
- **Minimap**: 全局简化导航视图
- **主画布**: 局部详细工作视图
- **实现方式**: 两个独立 Canvas 实例，共享 Graph 数据

### 关键优势
1. ✅ 避免 React/Vue 组件的双渲染
2. ✅ Minimap 使用简化图形，性能优秀
3. ✅ 事件驱动更新，按需刷新
4. ✅ 架构清晰，易于维护

---

## 架构关键洞察：统一设计 Minimap + Scroller + Transform

### 为什么需要统一设计？

用户提出的关键洞察：

> "Minimap 和 Scroller 以及 Transform 是不是应该结合起来一起设计！如果单独设计，实施的时候可能不同功能之间会有冲突？"

这三个功能本质上是**视图变换系统的不同侧面**：

| 功能 | 核心作用 | 变换维度 |
|------|----------|----------|
| **Scroller** | 控制主画布视口（平移、缩放） | 全局变换 |
| **Minimap** | 显示全局视图 + 当前视口位置 | 视口映射 |
| **Transform** | 节点级别的变换（调整大小、旋转） | 局部变换 |

**如果不统一设计，会出现的问题**：
1. Scroller 改变视口 → Minimap 的视口矩形没有同步
2. Minimap 拖拽视口矩形 → Scroller 的视口没有更新
3. Transform 改变节点大小 → Minimap 的简化渲染没有更新
4. 缩放级别变化 → Transform 的手柄位置计算错误
5. 坐标转换逻辑分散 → 维护困难

---

## @antv/g-lite 底层绘图能力探索

### GE vs X6 的架构差异（关键！）

**X6 的情况**：
- ❌ 没有统一的渲染引擎
- ❌ 直接操作 SVG DOM
- ❌ 需要自己实现所有变换、坐标转换逻辑
- ❌ 内部实现复杂度高

**GE 的优势**：
- ✅ 基于 @antv/g-lite 统一渲染引擎
- ✅ 有完整的 Camera 系统
- ✅ 有变换矩阵和坐标转换 API
- ✅ 可以利用底层能力，实现更简洁

### g-lite 核心能力

#### 1. Camera 系统（相机系统）

```typescript
// Camera 类 - 完整的 3D 变换系统
class Camera {
  // 相机类型
  enum CameraType {
    ORBITING = 0,      // 轨道相机（围绕焦点旋转）
    EXPLORING = 1,     // 探索相机
    TRACKING = 2       // 跟踪相机
  }

  // 投影模式
  enum CameraProjectionMode {
    ORTHOGRAPHIC = 0,  // 正交投影（2D 图编辑器适用）
    PERSPECTIVE = 1    // 透视投影
  }

  // 核心方法
  setPosition(x, y, z): this
  setFocalPoint(x, y, z): this
  setDistance(d): this
  rotate(azimuth, elevation, roll): this
  pan(tx, ty): this
  dolly(value): this

  // 缩放控制
  setZoom(zoom: number): this
  setZoomByViewportPoint(zoom, viewportPoint): this

  // 变换矩阵
  getViewTransform(): mat4           // MV 矩阵
  getWorldTransform(): mat4          // 世界变换矩阵
  getLocalTransform(): mat4          // 本地变换矩阵
}
```

**关键点**：
- ✅ Camera 已经实现了完整的平移、缩放、旋转逻辑
- ✅ 提供了变换矩阵管理
- ✅ 支持正交投影模式（适合 2D 图编辑）

#### 2. 坐标转换系统

```typescript
// Canvas 提供完整的坐标转换
class Canvas {
  // 客户端坐标 ↔ 视口坐标
  client2Viewport(client: PointLike): PointLike
  viewport2Client(canvas: PointLike): PointLike

  // 视口坐标 ↔ Canvas 坐标
  viewport2Canvas(viewport: PointLike): PointLike
  canvas2Viewport(canvasP: PointLike): PointLike
}
```

**坐标系统层级**：
```
屏幕/客户端坐标 (Screen/Client)
    ↓ client2Viewport
视口坐标 (Viewport)
    ↓ viewport2Canvas
Canvas/世界坐标 (Canvas/World)
    ↓ DisplayObject.getLocalBounds()
本地坐标 (Local)
```

#### 3. 事件系统

```typescript
// EventService 提供完整的事件处理
class EventService {
  client2Viewport(client: PointLike): PointLike
  viewport2Canvas({ x, y }): PointLike

  // 碰撞检测
  hitTest(position: EventPosition): IEventTarget | null

  // 事件传播路径
  propagationPath(target: IEventTarget): IEventTarget[]

  // 事件冒泡
  propagate(e: FederatedEvent, type?: string): void
}
```

#### 4. 渲染管线

```typescript
// RenderingService 提供完整的渲染流程
class RenderingService {
  hooks: {
    init: SyncHook<[], void>
    dirtycheck: SyncWaterfallHook<[DisplayObject]>
    cull: SyncWaterfallHook<[DisplayObject, ICamera]>  // 裁剪
    beginFrame: SyncHook<[XRFrame]>
    beforeRender: SyncHook<[DisplayObject]>
    render: SyncHook<[DisplayObject]>
    afterRender: SyncHook<[DisplayObject]>
    endFrame: SyncHook<[XRFrame]>
    pick: AsyncSeriesWaterfallHook<[PickingResult]>  // 拾取
  }
}
```

**关键能力**：
- ✅ 脏检查（dirtycheck）- 只重绘变化的对象
- ✅ 视口裁剪（cull）- 只渲染可见区域
- ✅ GPU 加速拾取（pick）- 高性能碰撞检测

#### 5. Offline Canvas

```typescript
// Canvas 配置支持离屏渲染
interface CanvasConfig {
  canvas?: CanvasLike              // 支持原生 canvas 或 OffscreenCanvas
  offscreenCanvas?: CanvasLike     // 离屏 canvas
  renderer?: 'canvas' | 'webgl' | 'svg'
}

// Offline canvas 仍然支持事件
supportsTouchEvents: boolean
supportsPointerEvents: boolean
```

**重要**：
- ✅ Offline Canvas 可以使用 OffscreenCanvas（Web Worker 中渲染）
- ✅ 仍然支持完整的事件系统
- ✅ 可以通过 `postMessage` 与主线程通信

---

## 统一设计方案：ViewportManager 核心插件

### 设计原则

**核心思想**：利用 g-lite 的 Camera 系统，创建统一的 ViewportManager 插件作为单一数据源。

```
┌─────────────────────────────────────────────────────────────┐
│                    ViewportManager (核心)                   │
│  - 管理 Camera 实例                                          │
│  - 维护视口状态（x, y, scale）                               │
│  - 提供坐标转换 API                                          │
│  - 派发 viewport:change 事件                                 │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ ScrollerPlugin │  │ MinimapPlugin │  │TransformPlugin│
│ - 监听 wheel   │  │ - 监听事件    │  │ - 使用坐标    │
│ - 调用 Camera  │  │ - 获取视口    │  │   转换 API    │
│ - 同步 Minimap │  │ - 绘制简化图  │  │ - 更新手柄    │
└───────────────┘  └───────────────┘  └───────────────┘
```

### ViewportManager 核心实现

```typescript
/**
 * ViewportManager - 统一的视口管理插件
 *
 * 职责：
 * 1. 管理 Camera 实例（使用 g-lite 的 Camera）
 * 2. 维护视口状态（位置、缩放）
 * 3. 提供坐标转换 API
 * 4. 派发 viewport:change 事件
 */
class ViewportManager implements RenderingPlugin {
  name = 'viewport-manager';

  private camera: Camera;
  private canvas: Canvas;
  private graph: Graph;

  // 视口状态
  private viewport: {
    x: number;        // 视口左上角在世界坐标系中的位置
    y: number;
    scale: number;    // 缩放级别
    width: number;    // 视口宽度（屏幕像素）
    height: number;   // 视口高度（屏幕像素）
  } = {
    x: 0,
    y: 0,
    scale: 1,
    width: 800,
    height: 600
  };

  // 缩放限制
  private scaleRange = { min: 0.1, max: 5 };

  apply(context: RenderingPluginContext): void {
    this.canvas = context.canvas as Canvas;
    this.graph = (context as any).graph;

    // 获取或创建 Camera
    this.camera = this.canvas.camera || this.canvas.createCamera();

    // 设置为正交投影模式（2D 图编辑器）
    this.camera.setProjectionMode(CameraProjectionMode.ORTHOGRAPHIC);

    // 初始化视口
    this.updateViewportFromCamera();

    // 监听 Camera 变化
    this.setupCameraListeners();

    // 暴露 API 到 graph
    (this.graph as any).viewport = this.createViewportAPI();
  }

  /**
   * 坐标转换：屏幕坐标 → 世界坐标
   */
  screenToWorld(x: number, y: number): [number, number] {
    const canvas = this.canvas;
    const viewportP = canvas.client2Viewport({ x, y });
    const worldP = canvas.viewport2Canvas(viewportP);
    return [worldP.x, worldP.y];
  }

  /**
   * 坐标转换：世界坐标 → 屏幕坐标
   */
  worldToScreen(x: number, y: number): [number, number] {
    const canvas = this.canvas;
    const canvasP = canvas.canvas2Viewport({ x, y });
    const clientP = canvas.viewport2Client(canvasP);
    return [clientP.x, clientP.y];
  }

  /**
   * 缩放（以指定点为中心）
   */
  zoom(factor: number, center?: { x: number; y: number }): void {
    const newScale = Math.max(
      this.scaleRange.min,
      Math.min(this.scaleRange.max, this.viewport.scale * factor)
    );

    if (center) {
      // 以指定点为中心缩放
      this.camera.setZoomByViewportPoint(newScale / this.viewport.scale, center);
    } else {
      // 以视口中心为中心缩放
      const centerX = this.viewport.width / 2;
      const centerY = this.viewport.height / 2;
      this.camera.setZoomByViewportPoint(newScale / this.viewport.scale, { x: centerX, y: centerY });
    }

    this.updateViewportFromCamera();
    this.emitViewportChange();
  }

  /**
   * 平移
   */
  pan(deltaX: number, deltaY: number): void {
    // deltaX, deltaY 是屏幕像素
    // 需要转换为世界坐标的平移量
    const worldDeltaX = deltaX / this.viewport.scale;
    const worldDeltaY = deltaY / this.viewport.scale;

    this.camera.pan(worldDeltaX, worldDeltaY);
    this.updateViewportFromCamera();
    this.emitViewportChange();
  }

  /**
   * 滚动到指定点
   */
  scrollTo(x: number, y: number): void {
    // x, y 是世界坐标
    // 移动视口使该点位于视口中心
    const centerX = this.viewport.width / 2;
    const centerY = this.viewport.height / 2;

    this.camera.setPosition(
      x - centerX / this.viewport.scale,
      y - centerY / this.viewport.scale,
      0
    );

    this.updateViewportFromCamera();
    this.emitViewportChange();
  }

  /**
   * 适应内容（缩放以显示所有内容）
   */
  fitToContent(padding = 20): void {
    const bounds = this.getGraphBounds();

    // 计算合适的缩放级别
    const scaleX = (this.viewport.width - padding * 2) / bounds.width;
    const scaleY = (this.viewport.height - padding * 2) / bounds.height;
    const scale = Math.min(scaleX, scaleY);

    // 计算中心位置
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    // 应用缩放和位置
    this.camera.setZoom(scale);
    this.camera.setPosition(
      centerX - this.viewport.width / 2 / scale,
      centerY - this.viewport.height / 2 / scale,
      0
    );

    this.updateViewportFromCamera();
    this.emitViewportChange();
  }

  /**
   * 获取当前视口状态
   */
  getViewport(): Readonly<typeof this.viewport> {
    return { ...this.viewport };
  }

  /**
   * 从 Camera 更新视口状态
   */
  private updateViewportFromCamera(): void {
    const transform = this.camera.getViewTransform();
    // 从矩阵中提取位置和缩放
    // ... 矩阵解析逻辑
    this.emitViewportChange();
  }

  /**
   * 派发视口变化事件
   */
  private emitViewportChange(): void {
    const event = new CustomEvent('viewport:change', {
      detail: { viewport: this.getViewport() }
    });
    this.canvas.dispatchEvent(event);
  }

  /**
   * 创建对外的 API
   */
  private createViewportAPI() {
    return {
      zoom: this.zoom.bind(this),
      pan: this.pan.bind(this),
      scrollTo: this.scrollTo.bind(this),
      fitToContent: this.fitToContent.bind(this),
      getViewport: this.getViewport.bind(this),
      screenToWorld: this.screenToWorld.bind(this),
      worldToScreen: this.worldToScreen.bind(this),
    };
  }

  private getGraphBounds(): { x: number; y: number; width: number; height: number } {
    // 计算所有节点的边界
    // ...
    return { x: 0, y: 0, width: 800, height: 600 };
  }
}
```

### ScrollerPlugin 实现

```typescript
/**
 * ScrollerPlugin - 视口导航插件
 *
 * 职责：
 * 1. 处理鼠标滚轮缩放
 * 2. 处理拖拽平移
 * 3. 提供 UI 控件（缩放按钮）
 */
class ScrollerPlugin implements RenderingPlugin {
  name = 'scroller';

  private viewport: any;
  private canvas: Canvas;

  constructor(private options: {
    zoom?: { enabled?: boolean; min?: number; max?: number };
    pan?: { enabled?: boolean; modifiers?: string[] };
  } = {}) {}

  apply(context: RenderingPluginContext): void {
    this.canvas = context.canvas as Canvas;
    const graph = (context as any).graph;

    // 获取 ViewportManager
    this.viewport = (graph as any).viewport;
    if (!this.viewport) {
      console.warn('ScrollerPlugin requires ViewportManager to be loaded first');
      return;
    }

    // 设置事件监听
    this.setupEventListeners();

    // 创建 UI 控件
    if (this.options.zoom?.enabled) {
      this.createZoomControls();
    }
  }

  private setupEventListeners(): void {
    // 鼠标滚轮缩放
    if (this.options.zoom?.enabled) {
      this.canvas.addEventListener('wheel', this.handleWheel as any, { passive: false });
    }

    // 拖拽平移
    if (this.options.pan?.enabled) {
      this.canvas.addEventListener('pointerdown', this.handlePointerDown as any);
    }
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    // Ctrl+滚轮 或 Mac 上双指缩放
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.viewport.zoom(delta, { x: e.clientX, y: e.clientY });
    } else {
      // 滚轮平移
      this.viewport.pan(-e.deltaX, -e.deltaY);
    }
  }

  private handlePointerDown = (e: PointerEvent): void => {
    // 检查是否点击在空白区域
    const target = e.target as DisplayObject;
    if (target !== this.canvas.document) return;

    // 检查修饰键
    if (this.options.pan?.modifiers) {
      const hasModifier = this.options.pan.modifiers.some(mod =>
        mod === 'shift' && e.shiftKey ||
        mod === 'ctrl' && e.ctrlKey ||
        mod === 'alt' && e.altKey ||
        mod === 'meta' && e.metaKey
      );
      if (!hasModifier) return;
    }

    // 开始平移
    let lastX = e.clientX;
    let lastY = e.clientY;

    const onMove = (e: PointerEvent) => {
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      this.viewport.pan(deltaX, deltaY);
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onUp = () => {
      this.canvas.removeEventListener('pointermove', onMove as any);
      this.canvas.removeEventListener('pointerup', onUp as any);
    };

    this.canvas.addEventListener('pointermove', onMove as any);
    this.canvas.addEventListener('pointerup', onUp as any);
  }

  private createZoomControls(): void {
    // 创建缩放按钮
    const container = document.createElement('div');
    container.className = 'ge-scroller-controls';
    container.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    const zoomInBtn = this.createButton('+', () => this.viewport.zoom(1.2));
    const zoomOutBtn = this.createButton('-', () => this.viewport.zoom(0.8));
    const fitBtn = this.createButton('Fit', () => this.viewport.fitToContent());

    container.appendChild(zoomInBtn);
    container.appendChild(zoomOutBtn);
    container.appendChild(fitBtn);

    this.canvas.getContainer()?.appendChild(container);
  }

  private createButton(text: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      width: 32px;
      height: 32px;
      border: 1px solid #ddd;
      background: white;
      cursor: pointer;
      border-radius: 4px;
    `;
    button.onclick = onClick;
    return button;
  }
}
```

### MinimapPlugin 实现（更新版）

```typescript
/**
 * MinimapPlugin - 小地图插件
 *
 * 职责：
 * 1. 创建独立的 minimap canvas
 * 2. 简化渲染节点和边
 * 3. 显示当前视口矩形
 * 4. 处理交互（点击、拖拽）
 */
class MinimapPlugin implements RenderingPlugin {
  name = 'minimap';

  private minimapCanvas: Canvas;
  private viewport: any;
  private mainGraph: Graph;
  private config: Required<MinimapConfig>;

  constructor(config: MinimapConfig = {}) {
    this.config = {
      width: config.width || 200,
      height: config.height || 150,
      position: config.position || { top: 10, right: 10 },
      nodeColor: config.nodeColor || (() => '#ccc'),
      edgeColor: config.edgeColor || '#999',
      viewportColor: config.viewportColor || '#1890ff'
    };
  }

  apply(context: RenderingPluginContext): void {
    this.mainGraph = (context as any).graph;
    const mainCanvas = context.canvas as Canvas;

    // 获取 ViewportManager
    this.viewport = (this.mainGraph as any).viewport;
    if (!this.viewport) {
      console.warn('MinimapPlugin requires ViewportManager to be loaded first');
      return;
    }

    // 创建独立的 minimap canvas
    this.minimapCanvas = new Canvas({
      width: this.config.width,
      height: this.config.height,
      renderer: 'canvas',
      container: this.createContainer()
    });

    // 监听主画布变化
    this.setupListeners();

    // 初始渲染
    this.render();
  }

  private setupListeners(): void {
    // 监听视口变化
    this.mainGraph.addEventListener('viewport:change', this.onViewportChange.bind(this));

    // 监听图内容变化
    this.mainGraph.addEventListener('node:added', this.scheduleRender.bind(this));
    this.mainGraph.addEventListener('node:removed', this.scheduleRender.bind(this));
    this.mainGraph.addEventListener('node:moved', this.scheduleRender.bind(this));
    this.mainGraph.addEventListener('edge:added', this.scheduleRender.bind(this));
    this.mainGraph.addEventListener('edge:removed', this.scheduleRender.bind(this));

    // 监听 minimap 交互
    this.setupMinimapInteraction();
  }

  private setupMinimapInteraction(): void {
    let isDragging = false;

    // 点击/拖拽平移主画布视口
    this.minimapCanvas.addEventListener('pointerdown', (e: PointerEvent) => {
      isDragging = true;
      this.handleMinimapClick(e.clientX, e.clientY);
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (isDragging) {
        this.handleMinimapDrag(e.clientX, e.clientY);
      }
    });

    window.addEventListener('pointerup', () => {
      isDragging = false;
    });
  }

  private handleMinimapClick(clientX: number, clientY: number): void {
    // 计算点击位置对应的世界坐标
    const bounds = this.getGraphBounds();
    const rect = this.minimapCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // 转换为世界坐标
    const worldX = bounds.x + (x / this.config.width) * bounds.width;
    const worldY = bounds.y + (y / this.config.height) * bounds.height;

    // 移动主画布视口
    this.viewport.scrollTo(worldX, worldY);
  }

  private handleMinimapDrag(clientX: number, clientY: number): void {
    // 与 handleMinimapClick 类似，但可以添加拖拽的平滑效果
    this.handleMinimapClick(clientX, clientY);
  }

  private onViewportChange(e: CustomEvent): void {
    // 更新视口矩形
    this.drawViewportRect();
  }

  private render(): void {
    const bounds = this.getGraphBounds();
    const scale = Math.min(
      this.config.width / bounds.width,
      this.config.height / bounds.height
    );

    // 清空
    this.minimapCanvas.document.removeAllChildren();

    // 简化渲染节点
    this.renderSimplifiedNodes(bounds, scale);

    // 简化渲染边
    this.renderSimplifiedEdges(bounds, scale);

    // 绘制视口矩形
    this.drawViewportRect();
  }

  private drawViewportRect(): void {
    const viewport = this.viewport.getViewport();
    const bounds = this.getGraphBounds();

    // 计算视口矩形在 minimap 中的位置和大小
    const rect = new Rect({
      style: {
        x: ((viewport.x - bounds.x) / bounds.width) * this.config.width,
        y: ((viewport.y - bounds.y) / bounds.height) * this.config.height,
        width: (viewport.width / viewport.scale / bounds.width) * this.config.width,
        height: (viewport.height / viewport.scale / bounds.height) * this.config.height,
        fill: 'transparent',
        stroke: this.config.viewportColor,
        lineWidth: 2
      }
    });

    this.minimapCanvas.document.appendChild(rect);
  }

  private renderSimplifiedNodes(bounds: Bounds, scale: number): void {
    this.mainGraph.getNodes().forEach(node => {
      const pos = node.getPosition();
      const size = node.getSize();

      const rect = new Rect({
        style: {
          x: ((pos[0] - bounds.x) / bounds.width) * this.config.width,
          y: ((pos[1] - bounds.y) / bounds.height) * this.config.height,
          width: (size.width / bounds.width) * this.config.width,
          height: (size.height / bounds.height) * this.config.height,
          fill: this.config.nodeColor(node)
        }
      });

      this.minimapCanvas.document.appendChild(rect);
    });
  }

  private renderSimplifiedEdges(bounds: Bounds, scale: number): void {
    // 类似地简化渲染边
  }

  private scheduleRender(): void {
    // 使用 requestAnimationFrame 批量更新
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.render();
        this.rafId = null;
      });
    }
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: ${this.config.position.top || 10}px;
      right: ${this.config.position.right || 10}px;
      width: ${this.config.width}px;
      height: ${this.config.height}px;
      border: 1px solid #ddd;
      background: rgba(255, 255, 255, 0.95);
    `;
    document.body.appendChild(container);
    return container;
  }

  private rafId: number | null = null;
}
```

### TransformPlugin 实现（简化版）

```typescript
/**
 * TransformPlugin - 节点变换插件
 *
 * 职责：
 * 1. 在选中节点时显示变换手柄
 * 2. 处理调整大小和旋转
 * 3. 使用 ViewportManager 的坐标转换
 */
class TransformPlugin implements RenderingPlugin {
  name = 'transform';

  private viewport: any;
  private selectedNode: Node | null = null;
  private transformWidget: HTMLElement | null = null;

  constructor(private options: {
    resize?: { enabled?: boolean; minSize?: number };
    rotate?: { enabled?: boolean };
  } = {}) {}

  apply(context: RenderingPluginContext): void {
    const graph = (context as any).graph;

    // 获取 ViewportManager
    this.viewport = (graph as any).viewport;
    if (!this.viewport) {
      console.warn('TransformPlugin requires ViewportManager to be loaded first');
      return;
    }

    // 监听节点选择事件
    graph.addEventListener('node:selected', this.onNodeSelected.bind(this));
    graph.addEventListener('node:unselected', this.onNodeUnselected.bind(this));

    // 监听视口变化（更新手柄位置）
    graph.addEventListener('viewport:change', this.updateWidgetPosition.bind(this));
  }

  private onNodeSelected(e: CustomEvent): void {
    this.selectedNode = e.detail.node;
    this.createTransformWidget();
    this.updateWidgetPosition();
  }

  private onNodeUnselected(): void {
    this.selectedNode = null;
    this.destroyTransformWidget();
  }

  private updateWidgetPosition(): void {
    if (!this.selectedNode || !this.transformWidget) return;

    // 使用 ViewportManager 的坐标转换
    const pos = this.selectedNode.getPosition();
    const size = this.selectedNode.getSize();
    const [screenX, screenY] = this.viewport.worldToScreen(pos[0], pos[1]);

    // 计算缩放后的尺寸
    const viewport = this.viewport.getViewport();
    const scaledWidth = size.width * viewport.scale;
    const scaledHeight = size.height * viewport.scale;

    // 更新手柄位置
    this.transformWidget.style.left = `${screenX}px`;
    this.transformWidget.style.top = `${screenY}px`;
    this.transformWidget.style.width = `${scaledWidth}px`;
    this.transformWidget.style.height = `${scaledHeight}px`;
  }

  private createTransformWidget(): void {
    // 创建变换手柄的 DOM 结构
    this.transformWidget = document.createElement('div');
    this.transformWidget.className = 'ge-transform-widget';

    // 添加调整大小的手柄
    if (this.options.resize?.enabled) {
      const positions = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
      positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `ge-transform-handle ge-transform-handle-${pos}`;
        handle.style.cssText = /* 手柄样式 */;
        handle.addEventListener('pointerdown', (e) => this.handleResizeStart(e, pos));
        this.transformWidget.appendChild(handle);
      });
    }

    // 添加旋转手柄
    if (this.options.rotate?.enabled) {
      const rotateHandle = document.createElement('div');
      rotateHandle.className = 'ge-transform-rotate-handle';
      rotateHandle.addEventListener('pointerdown', this.handleRotateStart.bind(this));
      this.transformWidget.appendChild(rotateHandle);
    }

    document.body.appendChild(this.transformWidget);
  }

  private handleResizeStart(e: PointerEvent, direction: string): void {
    e.stopPropagation();

    const startPos = this.selectedNode.getPosition();
    const startSize = this.selectedNode.getSize();

    const onMove = (e: PointerEvent) => {
      // 使用 ViewportManager 转换坐标
      const [worldX, worldY] = this.viewport.screenToWorld(e.clientX, e.clientY);
      const [startWorldX, startWorldY] = this.viewport.screenToWorld(
        (e as any).startClientX,
        (e as any).startClientY
      );

      // 计算新的位置和大小
      // ...

      this.selectedNode.setPosition(newX, newY);
      this.selectedNode.setSize(newWidth, newHeight);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    (e as any).startClientX = e.clientX;
    (e as any).startClientY = e.clientY;

    window.addEventListener('pointermove', onMove as any);
    window.addEventListener('pointerup', onUp as any);
  }

  private handleRotateStart(e: PointerEvent): void {
    // 类似地处理旋转
  }

  private destroyTransformWidget(): void {
    if (this.transformWidget) {
      this.transformWidget.remove();
      this.transformWidget = null;
    }
  }
}
```

---

## 事件传递问题解析

### 两个 Canvas 之间的事件传递

**问题**：用户在 Minimap 上点击/拖拽，如何影响主画布？

**解决方案**：
1. **直接调用 API**：MinimapPlugin 直接调用 ViewportManager 的 API
2. **事件转发**：Minimap 派发自定义事件，ScrollerPlugin 监听并响应

```typescript
// 方案 1：直接调用 API（推荐）
class MinimapPlugin {
  private handleMinimapClick(clientX: number, clientY: number): void {
    // 计算世界坐标
    const worldX = /* ... */;
    const worldY = /* ... */;

    // 直接调用 ViewportManager API
    this.viewport.scrollTo(worldX, worldY);
  }
}

// 方案 2：事件转发
class MinimapPlugin {
  private handleMinimapClick(clientX: number, clientY: number): void {
    const worldX = /* ... */;
    const worldY = /* ... */;

    // 派发自定义事件
    const event = new CustomEvent('minimap:navigate', {
      detail: { x: worldX, y: worldY }
    });
    this.mainGraph.dispatchEvent(event);
  }
}

class ScrollerPlugin {
  setupListeners() {
    // 监听 minimap 事件
    this.mainGraph.addEventListener('minimap:navigate', (e: CustomEvent) => {
      const { x, y } = e.detail;
      this.viewport.scrollTo(x, y);
    });
  }
}
```

### Offline Canvas 模式下的事件传递

**问题**：使用 offline canvas（如 OffscreenCanvas）时，事件如何传递？

**g-lite 的解决方案**：
- ✅ Offline Canvas 仍然支持完整的事件系统
- ✅ 使用 `postMessage` 与主线程通信
- ✅ 可以在 Worker 中处理事件逻辑

```typescript
// 主线程
const worker = new Worker('canvas-worker.js');
const offscreen = document.querySelector('canvas').transferControlToOffscreen();

worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);

// 监听 Worker 的事件
worker.onmessage = (e) => {
  if (e.data.type === 'navigate') {
    const { x, y } = e.data;
    viewport.scrollTo(x, y);
  }
};

// Worker 线程（canvas-worker.js）
let canvas: OffscreenCanvas;

onmessage = (e) => {
  if (e.data.type === 'init') {
    canvas = e.data.canvas;

    // 创建 Canvas 实例
    const graph = new Canvas({ canvas });

    // 设置事件监听
    canvas.addEventListener('pointerdown', (e) => {
      const worldPos = canvas.viewport2Canvas({ x: e.clientX, y: e.clientY });

      // 转发到主线程
      postMessage({
        type: 'navigate',
        x: worldPos.x,
        y: worldPos.y
      });
    });
  }
};
```

---

## 使用示例

```typescript
import { Graph } from '@antv/ge';
import {
  ViewportManager,
  ScrollerPlugin,
  MinimapPlugin,
  TransformPlugin
} from '@antv/ge/plugins';

const graph = new Graph({
  container: 'container',
  width: 800,
  height: 600
});

// ⚠️ 重要：加载顺序
// 1. 先加载 ViewportManager（核心）
graph.use(new ViewportManager());

// 2. 再加载其他插件（依赖 ViewportManager）
graph.use(new ScrollerPlugin({
  zoom: { enabled: true, min: 0.1, max: 5 },
  pan: { enabled: true, modifiers: ['shift'] }
}));

graph.use(new MinimapPlugin({
  width: 200,
  height: 150,
  position: { top: 10, right: 10 }
}));

graph.use(new TransformPlugin({
  resize: { enabled: true, minSize: 20 },
  rotate: { enabled: true }
}));

// 使用 API
graph.viewport.zoom(1.5);           // 缩放
graph.viewport.pan(100, 50);        // 平移
graph.viewport.fitToContent();     // 适应内容
const viewport = graph.viewport.getViewport();  // 获取视口

// 坐标转换
const [worldX, worldY] = graph.viewport.screenToWorld(clientX, clientY);
const [screenX, screenY] = graph.viewport.worldToScreen(nodeX, nodeY);
```

---

## 总结

### GE vs X6 架构对比

| 方面 | X6 | GE |
|------|----|----|
| **渲染引擎** | ❌ 无，直接操作 SVG | ✅ @antv/g-lite 统一引擎 |
| **变换系统** | ❌ 自己实现矩阵计算 | ✅ Camera 系统 |
| **坐标转换** | ❌ 自己实现 | ✅ Canvas API |
| **事件系统** | ⚠️ 自定义事件系统 | ✅ 标准 DOM 事件 |
| **实现复杂度** | 🔴 高 | 🟢 低 |

### 统一设计的优势

1. **单一数据源**：ViewportManager 管理所有视口状态
2. **统一坐标转换**：所有插件使用相同的转换 API
3. **事件自动同步**：通过 viewport:change 事件自动同步
4. **利用底层能力**：充分利用 g-lite 的 Camera、坐标转换等能力
5. **代码简洁**：不需要重复实现变换、坐标转换逻辑

### 关键要点

1. ✅ **ViewportManager 是核心**：所有变换功能的基础
2. ✅ **利用 g-lite 的 Camera**：不需要自己实现矩阵计算
3. ✅ **事件驱动同步**：通过 viewport:change 事件自动同步
4. ✅ **简化 Minimap 渲染**：使用简单矩形，避免双渲染
5. ✅ **坐标转换统一**：所有插件使用相同的转换 API

---

## 进阶讨论：扩展 g-lite 支持多 Camera 渲染

### 用户提出的关键架构问题

> "如果 antv/g-lite 不支持，那能否通过一定的方式扩展 g-lite 支持？我们当前项目本身就是 Graph 继承了 antv/g-lite 的 Canvas"

这是一个非常有价值的架构思考！

### 核心：Graph 继承 Canvas，可以扩展多 Camera 支持

```typescript
// GE 的架构
class Graph extends Canvas {
  // Graph 继承了 Canvas 的所有能力
  // 可以在 Graph 层面扩展多 Camera 支持
}
```

### g-lite 单相机架构的确认

经过探索确认，**@antv/g-lite 当前是单相机架构**：

```typescript
class Canvas {
  getCamera(): ICamera;  // 单例，不是数组
}
```

**限制**：
- ❌ Canvas 只能有一个 Camera 实例
- ❌ RenderingService 的渲染循环基于单个 Camera
- ❌ 不支持原生多视口渲染

### 扩展方案：在 Graph 层面实现多 Camera

#### 方案架构

```
Graph (扩展版)
├── CameraManager (新增)
│   ├── mainCamera (主视图)
│   ├── minimapCamera (小地图视图)
│   └── detailCamera (细节视图)
├── render() (覆盖)
│   ├── renderCamera('main') → 区域 1
│   ├── renderCamera('minimap') → 区域 2
│   └── renderCamera('detail') → 区域 3
└── MultiCameraEventPlugin (新增)
    └── 处理不同区域的事件
```

#### CameraManager 实现

```typescript
/**
 * CameraManager - 多相机管理器
 */
class CameraManager {
  private cameras: Map<string, Camera> = new Map();
  private activeCameraId: string = 'main';

  constructor(
    private canvas: Canvas,
    cameraConfigs?: CameraConfig[]
  ) {
    this.initCameras(cameraConfigs);
  }

  /**
   * 初始化多个 Camera
   */
  private initCameras(configs?: CameraConfig[]): void {
    // 主 Camera（默认）
    const mainCamera = this.canvas.getCamera();
    mainCamera.setProjectionMode(CameraProjectionMode.ORTHOGRAPHIC);
    this.cameras.set('main', mainCamera);

    // 如果有配置，创建额外的 Camera
    if (configs) {
      configs.forEach(config => {
        const camera = this.createCamera(config);
        this.cameras.set(config.id, camera);
      });
    }
  }

  /**
   * 创建新的 Camera
   */
  private createCamera(config: CameraConfig): Camera {
    // 注意：g-lite 的 Canvas 不直接提供 createCamera 方法
    // 这里需要通过其他方式创建 Camera 实例
    // 可能的方案：
    // 1. 使用 Camera 类直接创建
    // 2. 克隆现有的 Camera
    // 3. 向 g-lite 提交 PR 添加 createCamera 方法

    const camera = new Camera(this.canvas, {
      type: CameraType.ORBITING,
      projectionMode: CameraProjectionMode.ORTHOGRAPHIC
    });

    // 配置视口偏移
    if (config.viewport) {
      camera.setViewOffset(
        config.viewport.fullWidth,
        config.viewport.fullHeight,
        config.viewport.offsetX,
        config.viewport.offsetY,
        config.viewport.width,
        config.viewport.height
      );
    }

    return camera;
  }

  /**
   * 获取指定的 Camera
   */
  getCamera(id: string): Camera | undefined {
    return this.cameras.get(id);
  }

  /**
   * 获取主 Camera
   */
  getMainCamera(): Camera {
    return this.cameras.get('main')!;
  }

  /**
   * 设置活动的 Camera（用于渲染）
   */
  setActiveCamera(id: string): void {
    if (this.cameras.has(id)) {
      this.activeCameraId = id;
    }
  }

  /**
   * 获取当前活动的 Camera
   */
  getActiveCamera(): Camera {
    return this.cameras.get(this.activeCameraId)!;
  }

  /**
   * 获取所有 Camera
   */
  getAllCameras(): Map<string, Camera> {
    return this.cameras;
  }
}
```

#### MultiCameraGraph 实现

```typescript
/**
 * MultiCameraGraph - 支持多相机的 Graph 扩展
 */
class MultiCameraGraph extends Canvas {
  private cameraManager: CameraManager;

  constructor(config: MultiCameraGraphOptions) {
    super(config);

    // 初始化 CameraManager
    this.cameraManager = new CameraManager(this, config.cameras);

    // 设置渲染循环
    this.setupRenderLoop();
  }

  /**
   * 覆盖 render 方法，实现多 Camera 渲染
   */
  render(frame?: XRFrame): void {
    const cameras = this.cameraManager.getAllCameras();

    // 为每个 Camera 渲染一次
    cameras.forEach((camera, id) => {
      if (id === 'minimap') {
        // Minimap 使用简化渲染
        this.renderMinimap(camera, frame);
      } else if (id === 'main') {
        // 主视图使用完整渲染
        this.renderMainView(camera, frame);
      } else {
        // 其他视图...
        this.renderCamera(camera, frame);
      }
    });
  }

  /**
   * 渲染主视图
   */
  private renderMainView(camera: Camera, frame?: XRFrame): void {
    // 设置 Camera 为活动状态
    this.cameraManager.setActiveCamera('main');

    // 设置视口（整个画布）
    const gl = this.getContext().getWebGLContext();
    gl.viewport(0, 0, this.width, this.height);

    // 调用父类的渲染方法
    super.render(frame);
  }

  /**
   * 渲染 Minimap
   */
  private renderMinimap(camera: Camera, frame?: XRFrame): void {
    // 设置 Camera 为活动状态
    this.cameraManager.setActiveCamera('minimap');

    // 设置视口（Minimap 区域）
    const gl = this.getContext().getWebGLContext();
    const minimapConfig = this.getMinimapConfig();

    // 使用 scissor test 限制渲染区域
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(
      minimapConfig.x,
      minimapConfig.y,
      minimapConfig.width,
      minimapConfig.height
    );
    gl.viewport(
      minimapConfig.x,
      minimapConfig.y,
      minimapConfig.width,
      minimapConfig.height
    );

    // 简化渲染：只渲染节点和边的简化版本
    this.renderSimplifiedContent(frame);

    // 禁用 scissor test
    gl.disable(gl.SCISSOR_TEST);
  }

  /**
   * 渲染指定 Camera 的视图
   */
  private renderCamera(camera: Camera, frame?: XRFrame): void {
    this.cameraManager.setActiveCamera(camera);
    // ... 渲染逻辑
  }

  /**
   * 简化渲染内容（用于 Minimap）
   */
  private renderSimplifiedContent(frame?: XRFrame): void {
    // 直接绘制简单的矩形和线条
    // 不触发完整的节点渲染管线
    // 这样避免了 React/Vue 组件的双渲染

    const nodes = this.getAllNodes();
    const bounds = this.getGraphBounds();

    nodes.forEach(node => {
      const pos = node.getPosition();
      const size = node.getSize();

      // 绘制简化矩形
      this.drawSimpleRect(pos, size, bounds);
    });
  }

  /**
   * 绘制简单矩形
   */
  private drawSimpleRect(pos: [number, number], size: { width: number; height: number }, bounds: Bounds): void {
    // 使用底层 WebGL API 直接绘制矩形
    // 不创建 DisplayObject，避免触发完整渲染
  }

  // 公开 API
  getCamera(id: string): Camera | undefined {
    return this.cameraManager.getCamera(id);
  }

  getMainCamera(): Camera {
    return this.cameraManager.getMainCamera();
  }

  getMinimapCamera(): Camera {
    return this.cameraManager.getCamera('minimap')!;
  }
}
```

#### 事件处理扩展

```typescript
/**
 * MultiCameraEventPlugin - 多相机事件处理
 */
class MultiCameraEventPlugin implements RenderingPlugin {
  name = 'multi-camera-events';

  private cameraManager: CameraManager;
  private canvas: Canvas;

  apply(context: RenderingPluginContext): void {
    this.canvas = context.canvas as Canvas;
    const graph = (context as any).graph;

    this.cameraManager = (graph as MultiCameraGraph).cameraManager;

    // 设置事件监听
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const eventService = this.canvas.getEventService();

    // 拦截 pointer 事件
    this.canvas.addEventListener('pointerdown', this.handlePointerDown as any);
    this.canvas.addEventListener('pointermove', this.handlePointerMove as any);
    this.canvas.addEventListener('pointerup', this.handlePointerUp as any);
  }

  private handlePointerDown = (e: PointerEvent): void => {
    // 确定事件发生在哪个 Camera 的区域
    const cameraId = this.getCameraAtPoint(e.clientX, e.clientY);

    if (cameraId === 'minimap') {
      // Minimap 事件：转换为世界坐标，移动主视图
      this.handleMinimapInteraction(e);
    } else if (cameraId === 'main') {
      // 主视图事件：正常处理
      this.handleMainViewInteraction(e);
    }
  }

  /**
   * 根据屏幕坐标确定所属的 Camera
   */
  private getCameraAtPoint(clientX: number, clientY: number): string {
    const minimapConfig = this.getMinimapConfig();

    // 检查是否在 Minimap 区域
    if (
      clientX >= minimapConfig.x &&
      clientX <= minimapConfig.x + minimapConfig.width &&
      clientY >= minimapConfig.y &&
      clientY <= minimapConfig.y + minimapConfig.height
    ) {
      return 'minimap';
    }

    return 'main';
  }

  private handleMinimapInteraction(e: PointerEvent): void {
    // 计算 Minimap 点击位置对应的世界坐标
    const minimapCamera = this.cameraManager.getCamera('minimap');
    const mainCamera = this.cameraManager.getMainCamera();

    // 转换坐标...
    // 移动主视图
  }

  private handleMainViewInteraction(e: PointerEvent): void {
    // 正常的主视图交互
  }

  private getMinimapConfig(): { x: number; y: number; width: number; height: number } {
    // 从配置或默认值获取 Minimap 区域
    return { x: 600, y: 10, width: 190, height: 140 };
  }
}
```

### 配置接口

```typescript
/**
 * 多相机 Graph 配置
 */
interface MultiCameraGraphOptions extends CanvasConfig {
  cameras?: CameraConfig[];
}

/**
 * Camera 配置
 */
interface CameraConfig {
  id: string;
  viewport?: {
    fullWidth: number;   // 画布总宽度
    fullHeight: number;  // 画布总高度
    offsetX: number;     // 视口 X 偏移
    offsetY: number;     // 视口 Y 偏移
    width: number;       // 视口宽度
    height: number;      // 视口高度
  };
  projection?: 'orthographic' | 'perspective';
  zoom?: number;
  position?: { x: number; y: number; z: number };
}
```

### 使用示例

```typescript
import { MultiCameraGraph } from '@antv/ge';

const graph = new MultiCameraGraph({
  container: 'container',
  width: 800,
  height: 600,

  // 配置多个 Camera
  cameras: [
    {
      id: 'minimap',
      viewport: {
        fullWidth: 800,
        fullHeight: 600,
        offsetX: 600,
        offsetY: 10,
        width: 190,
        height: 140
      },
      zoom: 0.2  // Minimap 缩小显示
    }
  ]
});

// 获取不同的 Camera
const mainCamera = graph.getMainCamera();
const minimapCamera = graph.getMinimapCamera();

// 独立控制每个 Camera
mainCamera.setZoom(1.0);
minimapCamera.setZoom(0.2);

// 渲染时自动使用多 Camera
graph.render();
```

### 技术可行性总结

| 方面 | 可行性 | 说明 |
|------|--------|------|
| **多 Camera 实例** | ✅ | 可以创建多个 Camera 对象 |
| **分区域渲染** | ✅ | 使用 gl.viewport 和 gl.scissor |
| **坐标转换** | ✅ | 每个独立的 Camera 有自己的坐标系统 |
| **事件处理** | ✅ | 通过区域判断分发事件 |
| **简化渲染** | ✅ | Minimap 使用简化绘制逻辑 |
| **性能** | ✅ | 可以针对不同 Camera 使用不同策略 |

### 关键优势

1. **统一的数据源**：所有 Camera 共享同一个 Graph 的数据
2. **独立的视图控制**：每个 Camera 可以独立设置位置、缩放
3. **简化的 Minimap**：Minimap Camera 使用简化渲染，避免双渲染
4. **统一的事件系统**：通过区域判断分发事件到不同的 Camera
5. **更好的性能**：只渲染可见区域，Minimap 使用简化图形

### 实现路径

#### 阶段 1：CameraManager（核心）
- [ ] 创建 CameraManager 类
- [ ] 实现多 Camera 创建和管理
- [ ] 提供 Camera 切换 API

#### 阶段 2：MultiCameraGraph（扩展）
- [ ] 扩展 Graph 类
- [ ] 覆盖 render 方法
- [ ] 实现分区域渲染

#### 阶段 3：事件处理
- [ ] 实现 MultiCameraEventPlugin
- [ ] 区域判断和事件分发
- [ ] 坐标转换适配

#### 阶段 4：Minimap 集成
- [ ] 简化渲染逻辑
- [ ] 视口矩形绘制
- [ ] 交互处理

### 与之前方案的对比

| 方面 | 两个独立 Canvas | 多 Camera 单 Canvas |
|------|-----------------|---------------------|
| **数据共享** | ⚠️ 需要手动同步 | ✅ 自动共享 |
| **渲染次数** | ⚠️ 两次完整渲染 | ✅ 一次渲染，不同区域 |
| **事件处理** | ✅ 独立处理 | ⚠️ 需要区域判断 |
| **实现复杂度** | ✅ 简单 | ⚠️ 中等 |
| **性能** | ⚠️ 较低 | ✅ 更好 |
| **g-lite 依赖** | ✅ 无需修改 | ⚠️ 需要扩展 |

### 结论

**多 Camera 单 Canvas 方案是更优的架构设计**：

1. ✅ **统一数据源**：所有视图共享同一个 Graph 数据
2. ✅ **更好的性能**：一次渲染循环，不同区域
3. ✅ **更简洁的同步**：不需要手动同步数据
4. ✅ **充分利用 g-lite**：扩展而非绕过底层能力
5. ✅ **更符合 GE 架构**：Graph 作为中心，Camera 作为视图

**实现建议**：
- 优先实现 CameraManager 和 MultiCameraGraph
- 使用 scissor test 实现分区域渲染
- Minimap 使用简化渲染逻辑
- 通过插件系统处理事件

这个方案既保持了 GE 的架构清晰性，又充分利用了 g-lite 的底层能力，是实现 Minimap 的最佳方案。

---

## 核心架构澄清：虚拟 DOM vs 真实 DOM

### 用户的两个关键问题

> "在哪一层是只有一份，在哪一层是要分开渲染？"
> "这些虚拟 DOM 要如何才能真实的被处理成在两个不同的地方渲染的不同的真实 DOM？"

这是理解整个架构的关键问题。

### 清晰的分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        数据层 (共享 - 只有一份)                  │
│                                                                     │
│  Graph 的业务数据                                                   │
│  - nodesById: Map<string, Node>                                   │
│  - edgesById: Map<string, Edge>                                   │
│  - anchorRegistry: AnchorRegistry                                 │
│                                                                     │
│  这份数据是"真实信息"的单一来源                                      │
└─────────────────────────────────────────────────────────────────┘
                              │ 引用
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    虚拟 DOM 层 (分开 - 每个实例一份)               │
│                                                                     │
│  ┌─────────────────────┐         ┌─────────────────────┐         │
│  │   Canvas (主视图)     │         │   Canvas (Minimap)  │         │
│  │                     │         │                     │         │
│  │  - Document (虚拟)   │         │  - Document (虚拟)   │         │
│  │  - context          │         │  - context          │         │
│  │  - renderer         │         │  - renderer         │         │
│  │  - camera           │         │  - camera           │         │
│  │                     │         │                     │         │
│  │  ┌───────────────┐ │         │  ┌───────────────┐ │         │
│  │  │  Document     │ │         │  │  Document     │ │         │
│  │  │    └─ Group   │ │         │  │    └─ Group   │ │         │
│  │  │       └─ Node  │ │         │  │       └─ Node  │ │         │
│  │  └───────────────┘ │         │  └───────────────┘ │         │
│  └─────────────────────┘         └─────────────────────┘         │
│                                                                     │
│  每个 Canvas 有自己独立的虚拟 DOM 树                                │
└─────────────────────────────────────────────────────────────────┘
                              │ 映射 (1:1)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    真实 DOM 层 (分开 - 每个容器一份)               │
│                                                                     │
│  ┌─────────────────────┐         ┌─────────────────────┐         │
│  │  container1         │         │  container2         │         │
│  │  (主视图容器)       │         │  (Minimap容器)      │         │
│  │                     │         │                     │         │
│  │  ┌───────────────┐ │         │  ┌───────────────┐ │         │
│  │  │ $cameraContainer│ │         │  │ $cameraContainer│ │         │
│  │  │    └─ $camera  │ │         │  │    └─ $camera  │ │         │
│  │  │         └─ $el │ │         │  │         └─ $el │ │         │
│  │  │         (div)  │ │         │  │         (div)  │ │         │
│  │  └───────────────┘ │         │  └───────────────┘ │         │
│  │                     │         │                     │         │
│  │  真实的 <div> 元素   │         │  真实的 <div> 元素   │         │
│  └─────────────────────┘         └─────────────────────┘         │
│                                                                     │
│  每个容器有独立的真实 DOM 结构                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 关键理解

#### 1. 数据层 - 只有一份（共享）

```typescript
// Graph 的业务数据
class Graph {
  private nodesById: Map<string, Node> = new Map();
  private edgesById: Map<string, Edge> = new Map();
}
```

**这是"真实信息"的单一来源**：
- 节点和边的数据结构
- 它们的属性、样式、连接关系
- 这份数据被所有视图共享

#### 2. 虚拟 DOM 层 - 分开（每个实例一份）

```typescript
// 主视图 Canvas
const mainCanvas = new Canvas({
  container: 'container1',
  width: 800,
  height: 600
});

// Minimap Canvas
const minimapCanvas = new Canvas({
  container: 'container2',
  width: 200,
  height: 150
});
```

**每个 Canvas 有自己独立的虚拟 DOM**：
- 独立的 Document 实例
- 独立的 DisplayObject 树
- 独立的渲染管线
- 独立的 Camera

**但它们可以引用相同的数据**：
```typescript
// 主视图创建节点
const node1 = new Node({ id: 'n1', x: 100, y: 100 });
mainCanvas.document.appendChild(node1);

// Minimap 引用相同的节点数据
const minimapNode = new Node({
  id: 'n1',
  data: node1.getData()  // 引用相同的数据
});
minimapCanvas.document.appendChild(minimapNode);
```

#### 3. 真实 DOM 层 - 分开（每个容器一份）

```typescript
// HTMLRenderingPlugin 的映射机制
displayObjectHTMLElementMap = new WeakMap<DisplayObject, HTMLElement>();

// 每个虚拟 DisplayObject 映射到一个真实 DOM 元素
const $el = document.createElement('div');
displayObjectHTMLElementMap.set(displayObject, $el);
```

**映射关系是 1:1**：
- 一个虚拟 DisplayObject → 一个真实 `<div>` 元素
- 每个 Canvas 有自己的 `displayObjectHTMLElementMap`
- 每个 Canvas 渲染到自己的容器中

### 关键区别

| 层级 | 主视图 | Minimap | 关系 |
|------|--------|---------|------|
| **数据层** | nodesById, edgesById | nodesById, edgesById | ✅ 共享（引用） |
| **虚拟 DOM** | Canvas, Document, Node | Canvas, Document, Node | ❌ 分开（独立实例） |
| **真实 DOM** | container1, $el | container2, $el | ❌ 分开（不同容器） |

### Minimap 实现的正确理解

#### 错误理解
```
❌ 一份虚拟 DOM，渲染到两个地方
```

#### 正确理解
```
✅ 一份数据（业务逻辑）
✅ 两份虚拟 DOM（两个 Canvas 实例）
✅ 两份真实 DOM（两个容器）
```

### 具体实现

```typescript
// 1. 数据层：单一来源
const graphData = {
  nodes: [
    { id: 'n1', x: 100, y: 100, width: 50, height: 50 }
  ],
  edges: []
};

// 2. 虚拟 DOM 层：两个独立实例
const mainCanvas = new Canvas({
  container: 'main-container',
  width: 800,
  height: 600
});

const minimapCanvas = new Canvas({
  container: 'minimap-container',
  width: 200,
  height: 150
});

// 3. 主视图：完整渲染
graphData.nodes.forEach(nodeData => {
  const node = new Node(nodeData);
  mainCanvas.document.appendChild(node);  // 完整的节点
});

// 4. Minimap：简化渲染
graphData.nodes.forEach(nodeData => {
  // 使用简化版本（只是矩形，不是完整的 Node）
  const simpleRect = new Rect({
    style: {
      x: nodeData.x * minimapScale,
      y: nodeData.y * minimapScale,
      width: nodeData.width * minimapScale,
      height: nodeData.height * minimapScale,
      fill: '#ccc'
    }
  });
  minimapCanvas.document.appendChild(simpleRect);
});

// 5. 真实 DOM 层：HTMLRenderingPlugin 自动映射
// mainCanvas 的 DisplayObject → container1 中的真实 DOM
// minimapCanvas 的 DisplayObject → container2 中的真实 DOM
```

### 关键优势

1. **数据一致性**：
   - 只有一份业务数据
   - 更新数据时，所有视图自动同步

2. **渲染独立性**：
   - 主视图可以完整渲染（包括 React/Vue 组件）
   - Minimap 可以简化渲染（只用矩形）
   - 互不影响

3. **架构清晰**：
   - 数据层、虚拟 DOM 层、真实 DOM 层职责分离
   - 每层可以独立优化

### 总结

**回答用户的问题**：

1. **哪一层是只有一份？**
   - **数据层**（Graph 的 nodesById, edgesById）：只有一份
   - 这是业务数据的单一来源

2. **哪一层要分开渲染？**
   - **虚拟 DOM 层**（Canvas, Document, DisplayObject）：分开
   - 每个视图有独立的虚拟 DOM 树
   - **真实 DOM 层**（container, DOM 元素）：分开
   - 每个视图渲染到不同的容器

3. **如何映射到真实的 DOM？**
   - **HTMLRenderingPlugin** 是桥梁
   - 通过 `displayObjectHTMLElementMap` 建立 1:1 映射
   - 虚拟 DisplayObject → 真实 `<div>` 元素
   - 每个 Canvas 有自己独立的映射表

---

## 分叉点分析：从哪一层分开是合理的？

### 用户的核心问题

> "我前面只是基于一些概念，觉得从 camera 分开可能是合理的。但是实际情况可能不一定？"

这是一个非常重要的架构决策问题。让我分析各种分叉方案的可行性。

### g-lite 的层级约束

首先，我们需要理解 g-lite 的硬约束（无法改变的架构设计）：

| 关系 | 约束 | 说明 |
|------|------|------|
| Canvas : Camera | **1:1** | 一个 Canvas 只有一个 Camera |
| Canvas : Renderer | **1:1** | 一个 Canvas 只能有一个 Renderer |
| Canvas : RenderingService | **1:1** | 一个 Canvas 只有一个 RenderingService |
| DisplayObject : HTMLElement | **1:1** | 一个虚拟对象只能映射到一个真实 DOM 元素 |

### 可能的分叉点分析

#### 方案 1：从 Renderer 分开 ❌

```
数据层
    ↓
虚拟 DOM (Canvas, Document)
    ↓
    ├─ Renderer 1 (主视图)
    └─ Renderer 2 (Minimap)  ❌ 不可能：Canvas : Renderer = 1:1
```

**结论**：❌ 不可行
- g-lite 架构不支持一个 Canvas 有多个 Renderer
- `canvas.setRenderer()` 只能设置一次

#### 方案 2：从 Camera 分开 ⚠️

```
数据层
    ↓
虚拟 DOM (Canvas, Document)
    ↓
Camera
    ├─ mainCamera (主视图)
    └─ minimapCamera (Minimap)  ❌ 需要在 Graph 层面扩展
```

**结论**：⚠️ 理论可行，但需要大量扩展
- g-lite 的 Canvas : Camera = 1:1 是硬约束
- 需要在 Graph 层面实现 CameraManager
- 需要覆盖 render() 方法
- 需要手动处理 gl.viewport 和 gl.scissor
- 需要处理事件分发

**复杂度**：🔴 高

#### 方案 3：从 Canvas 分开 ✅（推荐）

```
数据层 (Graph.nodesById, Graph.edgesById)
    ↓ 共享引用
    ├─────────────────┐
    │                 │
    ▼                 ▼
虚拟 DOM 1          虚拟 DOM 2
(Canvas, Document)  (Canvas, Document)
    │                 │
    ▼                 ▼
Renderer 1          Renderer 2
    │                 │
    ▼                 ▼
真实 DOM 1          真实 DOM 2
(container1)        (container2)
```

**结论**：✅ 可行且推荐
- 符合 g-lite 的架构设计
- 每个 Canvas 独立运行
- 实现简单，维护容易

#### 方案 4：从 DisplayObject 分开 ⚠️

```
数据层
    ↓
虚拟 DOM (Canvas, Document)
    ├─ 主视图 DisplayObject 树
    └─ Minimap DisplayObject 树  ⚠️ 但仍然在同一个 Canvas 下
    ↓
Renderer
    ↓
真实 DOM
```

**结论**：⚠️ 实际上还是需要两个 Canvas
- 如果只有一个 Canvas，仍然只有一个 Camera
- 仍然只有一个 Renderer
- 无法真正实现分区域渲染

### 分叉点对比

| 分叉点 | 可行性 | 复杂度 | 优势 | 劣势 |
|--------|--------|--------|------|------|
| **Renderer** | ❌ 不可行 | - | - | 架构不支持 |
| **Camera** | ⚠️ 需扩展 | 🔴 高 | 统一的数据和虚拟 DOM | 需要大量底层工作 |
| **Canvas** | ✅ 可行 | 🟢 低 | 符合架构，实现简单 | 两个独立实例 |
| **DisplayObject** | ⚠️ 假分开 | 🟡 中 | 实际还是需要两个 Canvas | 仍然有单 Camera 限制 |

### 为什么从 Canvas 分开是合理的？

#### 1. 符合 g-lite 的架构设计

```typescript
// g-lite 的设计理念
Canvas (容器)
├── Camera (1:1 关系)
├── Renderer (1:1 关系)
└── RenderingService (1:1 关系)
```

**从 Canvas 分开**意味着：
- 每个 Canvas 有自己的 Camera
- 每个 Canvas 有自己的 Renderer
- 每个 Canvas 有自己的 RenderingService
- 完全符合 g-lite 的设计

#### 2. 清晰的职责分离

```
┌─────────────────────────────────────────────┐
│ 数据层 (共享)                                │
│ Graph.nodesById, Graph.edgesById           │
└─────────────────────────────────────────────┘
              │ 引用
              ▼
┌─────────────────────────────────────────────┐
│ 主视图 Canvas (实例 1)                      │
│ - 完整的虚拟 DOM 树                        │
│ - 完整的渲染管线                           │
│ - 渲染到 container1                        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Minimap Canvas (实例 2)                     │
│ - 简化的虚拟 DOM 树                        │
│ - 完整的渲染管线                           │
│ - 渲染到 container2                        │
└─────────────────────────────────────────────┘
```

#### 3. 实现简单

```typescript
// 主视图
const mainCanvas = new Graph({
  container: 'main-container',
  width: 800,
  height: 600
});

// Minimap
const minimapCanvas = new Canvas({
  container: 'minimap-container',
  width: 200,
  height: 150
});

// 同步数据
mainCanvas.getNodes().forEach(node => {
  const minimapNode = createSimplifiedNode(node);
  minimapCanvas.document.appendChild(minimapNode);
});
```

### 为什么从 Camera 分开不推荐？

虽然理论上可行，但实际问题很多：

#### 1. 违反 g-lite 的架构约束

```typescript
// g-lite 的设计
class Canvas {
  private camera: Camera;  // 单一 Camera

  getCamera(): Camera {
    return this.camera;  // 返回唯一的 Camera
  }
}
```

**问题**：
- Canvas 期望只有一个 Camera
- 需要破坏性地修改这个设计

#### 2. 需要大量底层工作

```typescript
// 需要手动做的事情
class MultiCameraGraph extends Canvas {
  render() {
    // 1. 保存当前状态
    gl.save();

    // 2. 渲染主视图
    gl.viewport(0, 0, 800, 600);
    this.renderMainView();

    // 3. 渲染 Minimap
    gl.viewport(600, 10, 200, 150);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(600, 10, 200, 150);
    this.renderMinimap();
    gl.disable(gl.SCISSOR_TEST);

    // 4. 恢复状态
    gl.restore();
  }
}
```

**问题**：
- 需要直接操作 WebGL API
- 需要手动管理视口和裁剪
- 需要处理不同区域的坐标转换

#### 3. 事件处理复杂

```typescript
// 需要手动判断事件发生在哪个区域
handlePointerDown(e: PointerEvent) {
  if (e.clientX > 600 && e.clientX < 800) {
    // Minimap 区域
    this.handleMinimapEvent(e);
  } else {
    // 主视图区域
    this.handleMainViewEvent(e);
  }
}
```

### 推荐的分叉点

**结论：从 Canvas 分开是最合理的选择**

**理由**：
1. ✅ **符合架构**：遵循 g-lite 的 1:1 设计原则
2. ✅ **实现简单**：不需要扩展底层能力
3. ✅ **维护容易**：两个独立实例，互不影响
4. ✅ **性能良好**：可以针对不同视图优化
5. ✅ **数据共享**：可以通过引用共享业务数据

### 架构总结

```
数据层 (共享 - Graph.nodesById, Graph.edgesById)
    │
    ├─ 引用 ─────────────────────────────┐
    │                                      │
    ▼                                      ▼
主视图 Canvas (实例 1)                Minimap Canvas (实例 2)
├─ Camera (独立)                      ├─ Camera (独立)
├─ Renderer (独立)                     ├─ Renderer (独立)
├─ RenderingService (独立)             ├─ RenderingService (独立)
├─ Document (独立)                     ├─ Document (独立)
└─ DisplayObject 树 (独立)              └─ DisplayObject 树 (简化)
    │                                      │
    ▼                                      ▼
container1 (真实 DOM)                  container2 (真实 DOM)
```

**关键点**：
- 数据层：共享（引用）
- Canvas 层及以下：分开（独立实例）
- 通过引用共享数据来实现一致性

---

## 最终架构方案：Graph 动态 renderTargets

### 用户的核心洞察

> "如果是多Camera多 renderer的模式，是不是意味着 canvas.document只有一份，Camera有多个，不同的Camera从不同视角，将结果绘制到不同的container上面？"

**答案：完全正确！**

### 最终架构设计

```
Graph (single, 继承 Canvas)
  ↓
document (single) ← 只有一份虚拟 DOM 树（数据源）
  ↓
renderTargets: RenderTarget[] (动态数组)
  │
  ├─ { name: 'main', camera, renderer → container1 }
  └─ { name: 'minimap', camera, renderer → container2 }
```

### 核心实现

```typescript
class Graph extends Canvas {
  private renderTargets: RenderTarget[] = [];

  constructor(config: GraphConfig) {
    super(config);

    // 默认只有一个主视图
    this.renderTargets = [{
      name: 'main',
      renderer: this.renderer,
      container: config.container,
      camera: this.camera
    }];
  }

  // 核心：遍历所有 renderTargets 进行渲染
  render(frame?: XRFrame): void {
    this.renderTargets.forEach(target => {
      if (target.config?.enabled !== false) {
        this.renderToTarget(target, frame);
      }
    });
  }

  // 动态添加 renderTarget（Minimap、Export 等使用）
  addTarget(target: RenderTarget): void {
    this.renderTargets.push(target);
    this.render();
  }

  // 动态移除 renderTarget
  removeTarget(name: string): void {
    this.renderTargets = this.renderTargets.filter(t => t.name !== name);
    this.render();
  }
}
```

### 使用场景

#### 场景 1：正常使用（无插件）
```typescript
const graph = new Graph({ container: 'container' });
// renderTargets = [{ name: 'main', renderer, container, camera }]
```

#### 场景 2：开启 Minimap 插件
```typescript
class MinimapPlugin implements RenderingPlugin {
  apply(context: RenderingPluginContext) {
    const graph = context.graph as Graph;

    // 动态添加 minimap renderTarget
    graph.addTarget({
      name: 'minimap',
      renderer: new CanvasRenderer({}),
      container: this.createMinimapContainer(),
      camera: new Camera(graph, { zoom: 0.2 })
    });
  }

  destroy() {
    (this.graph as Graph).removeTarget('minimap');
  }
}
```

#### 场景 3：导出图片
```typescript
class ExportPlugin implements RenderingPlugin {
  async exportToPNG(): Promise<Blob> {
    // 1. 临时添加 offline canvas renderTarget
    graph.addTarget({
      name: 'export-temp',
      renderer: new CanvasRenderer({ canvas: new OffscreenCanvas(2000, 1500) }),
      container: null,  // 离屏
      camera: new Camera(graph, { /* 完整视角 */ })
    });

    // 2. 触发渲染
    graph.render();

    // 3. 导出
    const blob = await canvas.convertToBlob();

    // 4. 移除临时 renderTarget
    graph.removeTarget('export-temp');

    return blob;
  }
}
```

### 架构优势

| 特性 | 说明 |
|------|------|
| ✅ **单一数据源** | document 只有一份，避免 React/Vue 双渲染 |
| ✅ **动态可扩展** | renderTargets 可以动态增减 |
| ✅ **插件驱动** | Minimap、Export 等以插件形式添加 |
| ✅ **临时渲染目标** | Export 等临时添加用完即删 |
| ✅ **独立容器** | 每个 Renderer 渲染到不同的 DOM 容器 |

### HTMLRenderingPlugin 多实例模式

**关键解决**：通过多个 HTMLRenderingPlugin 实例，解决单一映射问题

```typescript
// 每个 Renderer 创建自己的 HTMLRenderingPlugin 实例
renderer1.htmlPlugin = new HTMLRenderingPlugin({ container: container1 });
renderer2.htmlPlugin = new HTMLRenderingPlugin({ container: container2 });

// 各自维护自己的映射
renderer1.htmlPlugin.displayObjectHTMLElementMap = new WeakMap(); // Map 1
renderer2.htmlPlugin.displayObjectHTMLElementMap = new WeakMap(); // Map 2

// 同一个 DisplayObject，映射到不同的 DOM 元素
const node = this.document.children[0];
renderer1.htmlPlugin.displayObjectHTMLElementMap.set(node, domElement1);  // 主视图
renderer2.htmlPlugin.displayObjectHTMLElementMap.set(node, domElement2);  // Minimap
```

---

## 实现计划

### 关键文件

| 文件 | 操作 | 描述 |
|------|------|------|
| `src/core/Graph.ts` | 修改 | 添加 renderTargets 支持 |
| `src/types/index.ts` | 修改 | 添加 RenderTarget 接口 |
| `src/plugins/MinimapPlugin.ts` | 创建 | Minimap 实现 |
| `src/plugins/ExportPlugin.ts` | 创建 | 导出功能 |

### 实现优先级

1. **Graph 核心扩展**（renderTargets）
2. **Minimap Plugin**
3. **Export Plugin**（可选）

---

## Minimap + Scroller 统一架构设计

### 用户核心洞察

> "实现minimap的时候是不是可以一并把 Scroller 一起做了，主视图可以通过 Scroller 和 Transform 控制显示整个图的哪一部分？"
> "而minimap展示所有元素，同时渲染一个 主视图的 矩形位置示意图"

**答案：完全正确！这是 Minimap 的经典实现模式！**

### 统一架构概念

```
┌─────────────────────────────────────────────────────────────────┐
│                        Graph (单一数据源)                       │
│                      document (虚拟 DOM 树)                     │
└─────────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐
│     Main View (主视图)         │  │     Minimap (小地图)         │
│  ┌─────────────────────────┐  │  │  ┌─────────────────────────┐ │
│  │  Scroller 控制区域      │  │  │  │  全图预览               │ │
│  │  - 平移 (pan)           │  │  │  │  - 显示所有元素         │ │
│  │  - 缩放 (zoom)          │  │  │  │  - 渲染主视口矩形框     │ │
│  │  - 显示局部细节         │  │  │  │  - 可点击拖拽导航       │ │
│  └─────────────────────────┘  │  │  └─────────────────────────┘ │
│                               │  │                               │
│  mainCamera (可变)             │  │  minimapCamera (固定，全景)   │
└───────────────────────────────┘  └───────────────────────────────┘
```

### 核心组件

| 组件 | 职责 | 交互 |
|------|------|------|
| **Scroller Plugin** | 控制主视图的平移/缩放 | 鼠标拖拽平移、滚轮缩放 |
| **Minimap Plugin** | 显示全图预览 + 视口矩形 | 点击/拖拽矩形导航主视图 |
| **Viewport Rectangle** | 在 Minimap 中显示主视图位置 | 跟随主视图变化 |

### 实现要点

#### 1. Scroller Plugin - 主视图控制

```typescript
class ScrollerPlugin implements RenderingPlugin {
  name = 'scroller';

  private graph: Graph;
  private isDragging = false;
  private lastPos = { x: 0, y: 0 };

  apply(context: RenderingPluginContext): void {
    this.graph = context.graph as Graph;

    // 监听主画布的指针事件
    const canvas = this.graph as any;

    // 平移：鼠标拖拽
    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button === 0) { // 左键
        this.isDragging = true;
        this.lastPos = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastPos.x;
        const dy = e.clientY - this.lastPos.y;
        this.pan(dx, dy);
        this.lastPos = { x: e.clientX, y: e.clientY };

        // 通知 Minimap 更新视口矩形
        this.graph.dispatchEvent(new CustomEvent('viewport:change', {
          detail: this.getCurrentViewport()
        }));
      }
    });

    canvas.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    // 缩放：鼠标滚轮
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom(zoomFactor, e.clientX, e.clientY);

      // 通知 Minimap 更新视口矩形
      this.graph.dispatchEvent(new CustomEvent('viewport:change', {
        detail: this.getCurrentViewport()
      }));
    }, { passive: false });
  }

  private pan(dx: number, dy: number): void {
    const mainTarget = this.graph.getMainRenderTarget();
    if (!mainTarget?.camera) return;

    // 移动相机位置
    const camera = mainTarget.camera as any;
    if (camera.setPosition) {
      const currentPos = camera.position || [0, 0];
      camera.setPosition([currentPos[0] - dx, currentPos[1] - dy]);
    }
    this.graph.render();
  }

  private zoom(factor: number, centerX: number, centerY: number): void {
    const mainTarget = this.graph.getMainRenderTarget();
    if (!mainTarget?.camera) return;

    // 缩放相机
    const camera = mainTarget.camera as any;
    if (camera.setZoom) {
      const currentZoom = camera.zoom || 1;
      camera.setZoom(currentZoom * factor);
    }
    this.graph.render();
  }

  private getCurrentViewport() {
    const mainTarget = this.graph.getMainRenderTarget();
    const camera = mainTarget?.camera as any;
    return {
      x: camera?.position?.[0] || 0,
      y: camera?.position?.[1] || 0,
      zoom: camera?.zoom || 1,
      width: (this.graph as any).width,
      height: (this.graph as any).height
    };
  }
}
```

#### 2. Minimap Plugin - 全图预览 + 视口矩形

```typescript
class MinimapPlugin implements RenderingPlugin {
  name = 'minimap';

  private graph: Graph;
  private minimapRenderer: any;
  private minimapContainer: HTMLElement;
  private viewportRect: DisplayObject | null = null;

  apply(context: RenderingPluginContext): void {
    this.graph = context.graph as Graph;

    // 创建 Minimap 容器
    this.minimapContainer = this.createContainer();

    // 添加 Minimap renderTarget
    this.graph.addTarget({
      name: 'minimap',
      renderer: this.minimapRenderer,
      container: this.minimapContainer,
      camera: {
        // Minimap 使用固定相机，显示全图
        zoom: 0.2, // 缩小显示
        position: [0, 0]
      },
      config: { scale: 0.2 }
    });

    // 监听主视图视口变化，更新视口矩形
    this.graph.addEventListener('viewport:change', (e: any) => {
      this.updateViewportRect(e.detail);
    });

    // 初始化视口矩形
    this.initViewportRect();
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 200px;
      height: 150px;
      border: 1px solid #ccc;
      background: rgba(255, 255, 255, 0.9);
      overflow: hidden;
    `;
    document.body.appendChild(container);
    return container;
  }

  private initViewportRect(): void {
    // 在 Minimap 上绘制视口矩形（蓝色边框）
    const viewport = this.graph.getCurrentViewport();
    const minimapTarget = this.graph.getTarget('minimap');

    // 创建矩形表示主视图的位置
    this.viewportRect = new Rect({
      style: {
        x: viewport.x * 0.2,  // Minimap 的缩放比例
        y: viewport.y * 0.2,
        width: viewport.width * viewport.zoom * 0.2,
        height: viewport.height * viewport.zoom * 0.2,
        fill: 'transparent',
        stroke: '#1890ff',
        lineWidth: 2
      }
    });

    // 添加到 Minimap 的 document 中
    (minimapTarget?.renderer as any)?.document?.appendChild?.(this.viewportRect);

    // 添加交互：点击/拖拽矩形可以导航主视图
    this.setupViewportInteraction();
  }

  private updateViewportRect(viewport: any): void {
    if (!this.viewportRect) return;

    // 更新矩形位置和大小
    (this.viewportRect as any).style.x = viewport.x * 0.2;
    (this.viewportRect as any).style.y = viewport.y * 0.2;
    (this.viewportRect as any).style.width = viewport.width * viewport.zoom * 0.2;
    (this.viewportRect as any).style.height = viewport.height * viewport.zoom * 0.2;

    // 触发 Minimap 重新渲染
    this.graph.render();
  }

  private setupViewportInteraction(): void {
    if (!this.viewportRect) return;

    let isDragging = false;

    // 点击/拖拽视口矩形，导航主视图
    this.viewportRect.addEventListener('pointerdown', (e: PointerEvent) => {
      isDragging = true;
      e.stopPropagation();
    });

    this.minimapContainer.addEventListener('pointermove', (e: PointerEvent) => {
      if (isDragging) {
        // 计算新的主视图位置（反向映射）
        const newX = e.offsetX / 0.2; // 除以 Minimap 缩放
        const newY = e.offsetY / 0.2;

        // 移动主视图相机
        const mainTarget = this.graph.getMainRenderTarget();
        const camera = mainTarget?.camera as any;
        if (camera?.setPosition) {
          camera.setPosition([newX, newY]);
        }

        this.graph.render();
      }
    });

    this.minimapContainer.addEventListener('pointerup', () => {
      isDragging = false;
    });
  }

  destroy(): void {
    // 移除 Minimap renderTarget
    this.graph.removeTarget('minimap');

    // 清理容器
    if (this.minimapContainer?.parentNode) {
      this.minimapContainer.parentNode.removeChild(this.minimapContainer);
    }
  }
}
```

### 交互流程

```
用户操作主视图:
  1. 鼠标拖拽 → Scroller.pan() → 移动 mainCamera
  2. 鼠标滚轮 → Scroller.zoom() → 缩放 mainCamera
  3. 派发 'viewport:change' 事件
  4. Minimap 监听事件 → 更新视口矩形位置

用户操作 Minimap:
  1. 拖拽视口矩形 → 计算新位置
  2. 反向映射到主视图坐标
  3. 移动 mainCamera → 主视图跟随更新
  4. 触发主视图重新渲染
```

### 关键优势

| 特性 | 说明 |
|------|------|
| ✅ **统一视图控制** | Scroller 控制主视图，Minimap 显示全局 |
| ✅ **视口同步** | 主视图变化自动同步到 Minimap |
| ✅ **双向导航** | 可在主视图或 Minimap 上导航 |
| ✅ **性能优化** | Minimap 使用简化渲染，不影响主视图 |
| ✅ **插件分离** | Scroller 和 Minimap 独立实现，可单独使用 |

---

**讨论日期**: 2025-01-25
**相关文件**:
- `packages/ge-core/docs/GE-vs-X6-comparison.md`
- `packages/ge-core/docs/minimap-discussion.md`
