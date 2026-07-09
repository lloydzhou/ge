# GE 架构文档

## 概述

**GE (Graph Editor)** 是基于 [@antv/g-lite](https://g.antv.antgroup.com/) 的图编辑器库。核心理念：**以 g-lite 为渲染引擎，在其上用 DOM 原语构建图编辑能力**。

- 包名：`@antv/ge`（monorepo 根）/ `@antv/ge-core`（核心包）
- 渲染引擎：`@antv/g-lite`（peer dependency）
- 设计原则：**API 尽可能模仿浏览器原生 DOM**

---

## 架构分层

```
┌─────────────────────────────────────────────────────┐
│  Layer 4: 插件（Drag / Selection / Resize / ...）    │  交互行为
├─────────────────────────────────────────────────────┤
│  Layer 3: 原语（Router / Connector / Anchor）        │  纯函数，无渲染
├─────────────────────────────────────────────────────┤
│  Layer 2: GE 核心                                    │
│    Cell → Node / Edge / Port / Group                │  领域元素
│    Graph (extends Canvas)                           │  图容器
│    Scheduler                                        │  渲染队列
├─────────────────────────────────────────────────────┤
│  Layer 1: @antv/g-lite（渲染引擎）                   │  Canvas / DisplayObject / 事件
└─────────────────────────────────────────────────────┘
```

### Layer 1: g-lite 渲染引擎

GE 继承 g-lite 的基础类：

| g-lite 类 | GE 类 | 说明 |
|-----------|-------|------|
| `Canvas` | `Graph` | 图容器，类似 DOM 的 document |
| `CustomElement` | `Cell` → `Node`/`Edge`/`Port` | 可视化元素，类似 DOM 元素 |
| `DisplayObject` | — | 所有可见元素的基础 |

g-lite 提供：渲染管线、事件系统、DOM 风格 API（appendChild / querySelector / setAttribute）、样式系统。

**获取 Graph 实例**：`this.ownerDocument.defaultView`（所有 Cell 都可用）。

### Layer 2: GE 核心元素

#### 继承架构（实际代码）

```
Canvas (g-lite)
  └─ Graph                    图容器，持有 scheduler / registries / plugins

CustomElement (g-lite)
  └─ Cell (抽象基类)           dirty flag + markDirty + flushDirty + fire + props
      ├─ Node                 节点（body + labelText + ports）
      │   └─ Group            分组（继承 Node，管理子节点）
      ├─ Edge                 边（body=Path + markers + labelTexts）
      └─ Port                 端口（基于 owner 尺寸自动定位）
```

> **注意**：早期设计文档描述的 `GEInteractiveElement` / `ItemElement` / `ItemToolElement` 五层架构是设计愿景，当前实现简化为 `Cell` 直接派生。交互能力通过插件（DragPlugin / CreateEdgePlugin）实现，而非继承层。

#### Cell 基类职责

- `render()`：首次连接时构建渲染元素（子类重写）
- `attributeChangedCallback()`：属性变化 → `markDirty(flag)`（走 Scheduler）
- `flushDirty()`：Scheduler 帧边界调用，按 dirty flag 决定重算范围（子类重写）
- `fire(type, detail)`：派发自定义事件（dispatchEvent + CustomEvent）
- `fireAttributeChange(name, oldValue, newValue)`：派发统一 `cell:attributechange`，供多 view / 插件增量同步
- `props`：可序列化属性 model（随 setAttribute 自动同步）

#### Graph 职责

- 继承 Canvas，持有 `scheduler`（渲染队列）、`anchors`/`routers`/`connectors`/`shapes`（注册表）
- DOM 操作（appendChild / getElementById / getNodes / getEdges）
- 插件系统（`use(plugin)` / `dispose(name)`）
- 撤销/重做（CommandHistory）

### Layer 3: 原语（纯函数，无渲染）

| 原语 | 位置 | 接口 | 作用 |
|------|------|------|------|
| **Router** | `edge/router.ts` | `(points, options?) => Point[]` | 计算边路径点（normal / orthogonal / manhattan / manhattan-astar） |
| **Connector** | `edge/connector.ts` | `(points, options?) => string` | 路径点 → SVG path d 字符串（normal / rounded / smooth） |
| **Anchor** | `anchor/node-anchor.ts` | `(bbox, args) => Point` | 计算节点上的连接点（center / perimeter） |

原语是纯 JS 函数，不继承 DisplayObject，只负责计算。渲染由 Cell 的 body（g-lite DisplayObject）负责。

### Layer 4: 插件

插件扩展图的功能，通过 `graph.use(plugin)` 安装。插件继承 `Plugin` 基类，在 `init(graph)` 时注册事件监听。

内置插件（`src/plugins/`）：
- **DragPlugin** — 节点拖拽（pointermove → moveTo → Scheduler）
- **SelectionPlugin** — 点选/框选
- **ResizePlugin / RotatePlugin** — 缩放/旋转手柄
- **CreateEdgePlugin** — 交互式连线
- **HistoryPlugin** — 撤销/重做
- **MinimapPlugin** — 同一份图数据的第二个 overview view（内部 Graph + canvas renderer）
- **GridPlugin / SnaplinePlugin** — 辅助视图
- **ClipboardPlugin / KeyboardPlugin** — 快捷操作

---

## Scheduler 渲染队列

**仿浏览器渲染机制**：属性变化不立即重绘，标记 dirty 后在帧边界统一 flush。

### 工作流程

```
setAttribute('width', 200)  →  markDirty(GEOMETRY)     ← 廉价，只标记位
setAttribute('fill', 'red') →  markDirty(STYLE)
moveTo(100, 100)            →  markDirty(POSITION)
      ⋮（一帧内 N 次，全是标记，零重算）
──────────── rAF 帧边界 ────────────
scheduler.flush()
  → Node.flushDirty():  GEOMETRY|STYLE → setAttribute 原地 + applyPosition
  → applyPosition fire boundschange → Edge/Port 入队 → while 继续
  → Edge.flushDirty():  ROUTE → computeEdgePoints（A* 跑一次）
  → Port.flushDirty():  LAYOUT → applyLayout
──────────── g-lite 渲染 ────────────  ← 同帧看到最新状态
```

### dirty flag

```ts
export const POSITION = 1;   // x/y → 只需 setLocalPosition
export const GEOMETRY = 2;   // width/height/radius
export const STYLE = 4;      // fill/stroke/strokeWidth
export const LABEL = 8;      // label/labels
export const ROUTE = 16;     // 边路径重算
export const LAYOUT = 32;    // port 定位
export const REBUILD = 64;   // shape 类型变化，需销毁重建
```

### 关键特性

- **幂等去重**：同一 cell 一帧内多次 `markDirty` 只入队一次
- **联动处理**：`flush()` 的 while 循环处理 Node → Edge/Port 联动（同帧完成）
- **guard 防环**：极端环依赖最多 16 轮，不会死循环
- **同步 fallback**：无 scheduler（测试环境）时 `markDirty` 直接 `flushDirty`，保证行为一致

### 对象复用（避免销毁重建）

Node 属性变化优先**原地 setAttribute**，不 destroy + new：

| 属性变化 | 方式 |
|---------|------|
| width/height/radius/fill/stroke | `body.setAttribute(...)` 原地更新 |
| shape 类型（rect→circle） | 才 destroy + createBody（REBUILD） |

Edge 的 path 同理：`updatePath` 原地 `setAttribute('d', ...)`，不销毁 Path。

---

## 事件驱动联动

节点移动/缩放时，相连的边和端口自动更新：

```
Node.applyPosition()  →  fire('node:boundschange')
  → Edge 监听  →  markDirty(ROUTE)  →  Scheduler flush → update()
  → Port 监听  →  markDirty(LAYOUT) →  Scheduler flush → applyLayout()
```

事件用标准 DOM API（`dispatchEvent` / `addEventListener`），事件冒泡到 Graph。**不使用 eventBus**。

### 属性变更事件

`Node` / `Edge` / `Port` 在 `attributeChangedCallback()` 中同步 `props` 后，会派发统一的 `cell:attributechange`：

```ts
cell.setAttribute('fill', '#f00')
  → syncProp('fill', '#f00')
  → fire('cell:attributechange', { cell, name: 'fill', oldValue, newValue })
  → markDirty(STYLE)
```

这个事件不是独立 eventBus，而是标准 DOM 事件。它的用途是让插件或第二个 View 订阅模型层属性变化，做局部同步，而不扫描全图 diff。

---

## Model 多 View 方向

长期方向是 **一个 GraphModel，多种 GraphView**：

```
GraphModel（唯一事实源：nodes / edges / ports / attrs / viewport）
  ├─ MainGraphView      主编辑视图，可使用 SVG 或 Canvas renderer
  ├─ MinimapView        缩略视图，固定使用 Canvas renderer
  └─ ExportView         导出 / 截图视图，按需创建
```

当前代码还没有完全拆出 `GraphModel`，因此采用过渡实现：`Graph` 的 `Cell.props` / attributes 先承担轻量 model 职责，`MinimapPlugin` 订阅主图的 cell 事件，把变化同步到一个独立的 overview `Graph`。

关键原则：

- 不共享 g-lite `root` / `DisplayObject` tree：每个 View 维护自己的 g-lite 对象，避免 renderer / document / dirty tracking 绑定问题。
- 不使用主画布截图：主画布的渲染结果会随 viewport pan/zoom 变化（是“当前视图”而非“全图俯瞰”），且 SVG renderer 下根本拿不到 canvas 像素缓冲。
- 不使用低保真 canvas 2D 手动画：Minimap 也通过 GE 的 `Node` / `Edge` / `ShapeRegistry` / `Router` / `Connector` 渲染。
- 初始化时从 model snapshot 构建一次；后续通过 `cell:added` / `cell:removed` / `cell:attributechange` / `node:boundschange` 增量同步。
- pan / zoom 高频路径只更新 minimap 上的 DOM viewport rect，不重绘 overview graph。

### 当前 MinimapPlugin 架构

`MinimapPlugin` 安装后会：

1. 在主图容器右下角创建 minimap DOM host 和 viewport rect。
2. 在 host 内创建常驻 overview `Graph`，`renderer: 'canvas'`。
3. 初始化时同步主图已有节点、端口、边，并维护 `mainCellId → overviewCell` 映射。
4. 节点 / 边 / 端口属性变化时，仅同步对应 overview cell；节点移动时同步该节点和相关边。
5. 节点 / 边新增删除时局部创建 / 删除；大范围变化可调用 rebuild 兜底。
6. overview 内容范围变化时重新 fit overview root；主图 pan / zoom 只更新 viewport rect。

这使 Minimap 成为“同一份图数据的第二个 View”的雏形，而不是主视图截图、共享 root 副本或手绘缩略图。

### Scheduler 的演进方向

现在的 `Scheduler` 仍以 `Cell` dirty flush 为主：收集 dirty cell，在 rAF 帧边界调用 `flushDirty()`。在多 View 架构中，它应进一步演进为 model dirty records 的收集与分发器：

```
GraphModel mutation
  → Scheduler 记录 dirty records（Structure / Geometry / Style / Label / Ports / Route / ZIndex / Visible）
  → MainGraphView.consume(records)
  → MinimapView.consume(records)
  → ExportView.consume(records)
```

第一阶段先通过 DOM 事件实现增量同步，避免大重构；后续拆出 `GraphModel` 后，再把 dirty records 从主 view 的 Cell 事件上移到 model 层。

---

## DOM API 设计原则

GE 的公开 API 尽可能模仿浏览器原生 DOM：

| 操作 | GE API |
|------|--------|
| 创建节点 | `graph.appendChild(new Node({...}))` |
| 删除 | `graph.removeChild(node)` |
| 改属性 | `node.setAttribute('width', w)` |
| 端口 | `node.appendChild(new Port({...}))` |
| 事件 | `graph.addEventListener('node:click', fn)`（冒泡） |

**Model = attribute/props**，不独立 Model 类。CustomElement 的 attribute 即模型，`attributeChangedCallback` → `markDirty` 即变更监听。

犹豫时的判断准则：浏览器原生对应的是什么？MDN 如何记录这种模式？

---

## 扩展点

### 自定义节点

```typescript
class MyNode extends Node {
  protected createBody(s: NodeStyleProps): DisplayObject {
    return new Circle({ style: { ... } });
  }
}
// 或注册 shape 字符串
graph.shapes.register('my-shape', { create: (s) => new Circle({...}) });
```

### 自定义路由器/连接器

```typescript
import type { RouterFn } from '@antv/ge';

const myRouter: RouterFn = (points, options) => {
  // 计算路径点
  return computedPoints;
};
graph.routers.register('my-router', myRouter);

const edge = new Edge({ source: 'n1', target: 'n2', router: 'my-router' });
```

### 自定义插件

```typescript
class MyPlugin extends Plugin {
  readonly name = 'my-plugin';
  init(graph: Graph) {
    super.init(graph);
    graph.addEventListener('node:click', (e) => { /* ... */ });
  }
}
graph.use(new MyPlugin());
```

---

## 命令模式（撤销/重做）

```typescript
await graph.executeCommand(new AddNodeCommand(graph, nodeData));
await graph.undo();
await graph.redo();
graph.canUndo();  // true/false
```

命令位于 `src/core/commands/`：AddNodeCommand / RemoveNodeCommand / AddEdgeCommand / MoveNodeCommand / BatchCommand 等。

---

## 端口布局系统

Port 通过 `layout` 属性自动定位到 Node 边缘：

```typescript
// 预定义方向（自动定位到边中点，同方向多 port 均匀排列）
layout: 'top' | 'bottom' | 'left' | 'right'

// 手动定位（默认）
x: 10, y: 20
```

Port 监听 owner 的 `node:boundschange`，节点 resize 后自动重算位置（贴随新边缘）。

---

## 边路由系统

```typescript
const edge = new Edge({
  source: 'n1', target: 'n2',
  router: 'manhattan-astar',   // normal / orthogonal / manhattan / manhattan-astar
  connector: 'rounded',         // normal / rounded / smooth
  waypoints: [[x, y], ...],     // 用户指定的中间点
});

// A* 避障：自动收集其他节点为 obstacles
// 搜索空间上限 4000 格，超阈值降级 manhattan（防卡死）
```

边通过 `appendChild` 添加时自动连接到节点，监听节点 boundschange 自动更新路径。
