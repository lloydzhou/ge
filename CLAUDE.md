# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**GE (Graph Editor)** 是基于 [AntV/G](https://g.antv.antgroup.com/) 的现代化图编辑器库。它采用类 DOM 的 API 设计，对于熟悉文档对象模型 (DOM) 的 Web 开发者来说非常直观。

**包名**: `@antv/ge` (monorepo 根目录) / `@antv/ge-core` (核心包)
**版本**: `1.0.0-alpha.0`
**渲染引擎**: `@antv/g-lite` (peer dependency，外部依赖)

## 核心架构设计

### 架构愿景

**核心目标**: 以 @antv/g-lite 为渲染引擎，在其上抽象图编辑的"原语"（借鉴 antv/x6 的概念）。

**关键类比**:
- Canvas (DOM) + Context (ctx)
- Graph (继承 Canvas) + 图编辑原语 (非可视化对象)

### 架构分层

#### Layer 1: @antv/g-lite (渲染引擎)

**继承的基础类**:
- `Canvas` → `Graph` (图容器，类似 DOM 的 document)
- `CustomElement` → `Node`, `Edge`, `Port` (可视化元素，类似 DOM 元素)
- `DisplayObject` → 所有可见元素的基础

**g-lite 提供的能力**:
- 渲染管线
- 事件系统
- DOM 风格 API (appendChild, removeChild, querySelector)
- 样式系统
- 文档结构

**重要 DOM API**:
- `this.ownerDocument` - 获取 Canvas 实例（类似 DOM 的 document）
  - 所有 g-lite 的 DisplayObject 都有 `ownerDocument` 属性
  - 用于在 Canvas 级别绑定事件，确保快速移动时不会丢失事件
  - 例如：`const canvas = this.ownerDocument; canvas.addEventListener('pointermove', handler)`

#### Layer 2: GE 图编辑原语 (非可视化对象)

**这些是 JS 对象，不是 DisplayObject**:

| 概念 | 可视化? | 基类 | 作用 |
|------|---------|------|------|
| Router | ❌ | 纯 JS 类 | 计算边的路径点 |
| Connector | ❌ | 纯 JS 类 | 生成图形 (Line/Polyline/Path) |
| Anchor | ❌ | 工具函数 | 计算连接点位置 |

1. **Router (路由器)**
   - 作用: 计算边的路径点
   - 类别: NormalRouter (直线), OrthogonalRouter (正交), ManhattanRouter (曼哈顿), SmoothRouter (贝塞尔)
   - 位置: `/core/edge/EdgeRouter.ts`
   - 接口: `route(points: Vec2[]): Vec2[]`

2. **Connector (连接器)**
   - 作用: 将路径点转换为实际的图形
   - 类别: NormalConnector (Line), PolylineConnector (Polyline), SmoothConnector (贝塞尔曲线)
   - 位置: `/core/edge/EdgeConnector.ts`
   - 接口: `connect(points: Vec2[], style): DisplayObject`

3. **Anchor (锚点计算)**
   - 作用: 计算节点/端口上的连接点位置
   - 位置: `/utils/edgeLayout.ts`
   - 接口: `computeAnchor(shape, angle): Vec2`

#### Layer 3: GE 可视化元素 (继承 CustomElement)

1. **Graph (图容器)**
   - 继承: `Canvas`
   - 职责:
     - 节点/边注册表
     - DOM 操作 (appendChild 等继承自 Canvas)
     - 事件总线
     - 插件系统 (复用 Canvas 的 RenderingPlugin)
     - 撤销/重做系统

2. **Node (节点)**
   - 继承: `CustomElement`
   - 组成:
     - `primaryShape` (用户可自定义的形状)
     - `label` (文本)
     - `ports[]` (端口容器)
   - 能力:
     - 端口管理 (createPort, removePort, getPort)
     - 锚点计算 (computeAnchor)
     - 事件 (node:moved, node:connected, etc.)

3. **Edge (边)**
   - 继承: `CustomElement`
   - 组成:
     - `path` (由 Connector 生成的图形)
     - `label` (边标签)
     - `startMarker`, `endMarker` (箭头)
   - 属性:
     - `source` (起点: Node | Port)
     - `target` (终点: Node | Port)
     - `router` (Router 实例)
     - `connector` (Connector 实例)
     - `vertices` (用户指定的中间点)
   - 能力:
     - 自动连接/断开
     - 路径自动更新

4. **Port (端口)**
   - 继承: `CustomElement`
   - 作用: 节点上的连接桩
   - 位置: 通过 layout 计算 (top, bottom, left, right, angle, absolute)

### 关键设计决策

1. **继承关系明确**
   ```
   Canvas (g-lite)
     ↓ extends
   Graph
     ├── contains → Node[]
     └── contains → Edge[]

   CustomElement (g-lite)
     ↓ extends
   Node, Edge, Port
     └── each has primaryShape (可视化部分)
   ```

2. **原语分离**
   - Router/Connector/Anchor 是纯 JS 对象，不继承 DisplayObject
   - 它们只负责计算和逻辑，不负责渲染
   - 渲染由 Node/Edge/Port 这些 CustomElement 负责

3. **插件系统**
   - 直接复用 Canvas 的 RenderingPlugin
   - 插件接收 RenderingPluginContext，包含 graph 引用

### 扩展点设计

**用户扩展节点**:
```typescript
// 方式1: 使用 shape 字符串 + 自定义元素注册
graph.customElements.define('my-node', MyCustomNode);

// 方式2: 继承 Node 类
class MyCustomNode extends Node {
  createPrimaryShape() {
    return new Circle({ ... });
  }
}

// 使用自定义节点
const node = new Node({
  id: 'n1',
  shape: 'my-node',  // 使用注册名
  x: 100,
  y: 100
});
```

**用户扩展路由器**:
```typescript
import type { EdgeRouter } from '@antv/ge';
import type { Vec2 } from '@antv/ge';

class MyRouter implements EdgeRouter {
  route(points: Vec2[], vertices?: Vec2[]): Vec2[] {
    // 自定义路由逻辑
    // points: [start, end] 或 [start, ..., end]
    // 返回计算后的路径点数组
    return points;
  }
}

// 使用自定义路由器
const edge = new Edge({
  id: 'e1',
  source: 'n1',
  target: 'n2',
  style: {
    router: new MyRouter()
  }
});
```

**用户扩展连接器**:
```typescript
import type { EdgeConnector } from '@antv/ge';
import { DisplayObject } from '@antv/g-lite';
import type { BaseEdgeStyleProps } from '@antv/ge';

class MyConnector implements EdgeConnector {
  connect(points: Vec2[], style: BaseEdgeStyleProps): DisplayObject {
    // 自定义图形生成
    // 返回 Line, Path, Polyline 等 DisplayObject
    return new Line({
      style: {
        x1: points[0][0],
        y1: points[0][1],
        x2: points[1][0],
        y2: points[1][1],
        ...style
      }
    });
  }
}

// 使用自定义连接器
const edge = new Edge({
  id: 'e1',
  source: 'n1',
  target: 'n2',
  style: {
    connector: new MyConnector()
  }
});
```

**用户创建插件**:
```typescript
import type { RenderingPlugin, RenderingPluginContext } from '@antv/ge';

class MyPlugin implements RenderingPlugin {
  name = 'my-plugin';

  apply(context: RenderingPluginContext): void {
    const graph = (context as any).graph;
    // 初始化插件逻辑
    console.log('Plugin initialized with graph:', graph);
  }

  destroy(): void {
    // 清理插件逻辑
  }
}

// 使用插件
graph.use(new MyPlugin());

// 移除插件
graph.dispose('my-plugin');
```

## 构建与测试命令

```bash
# 安装依赖（从根目录）
npm run bootstrap
# 或: pnpm install

# 构建所有包
npm run build

# 构建特定包
cd packages/ge-core && npm run build

# 开发模式（监听文件变化）
npm run dev

# 运行测试
npm test

# 清理构建产物
npm run clean

# 启动示例服务
npm run serve
```

### 运行单个测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npx jest packages/ge-core/src/core/__tests__/EdgeRouterConnector.test.ts

# 监听模式运行测试
npx jest --watch

# 运行测试并生成覆盖率报告
npx jest --coverage
```

## 构建产物

构建会在 `packages/ge-core/` 中生成多种格式：
- **ESM**: `esm/index.js` + `.d.ts` (ES 模块格式)
- **CommonJS**: `lib/index.js` + `.d.ts` (Node.js require 格式)
- **UMD**: `dist/index.umd.js` (通用模块定义)
- **UMD 压缩**: `dist/index.umd.min.js` (生产环境)

外部依赖: `@antv/g-lite` 不会被打包（必须由使用方提供）。

## 项目结构

```
packages/ge-core/src/
├── index.ts                    # 主入口文件
├── types/index.ts              # 中心化类型定义
├── core/                       # 核心图编辑组件
│   ├── Graph.ts               # 主画布（继承 @antv/g-lite Canvas）
│   ├── CommandHistory.ts      # 撤销/重做系统
│   ├── commands/               # 命令模式实现
│   │   └── GraphCommands.ts   # 节点/边操作命令
│   ├── node/
│   │   └── Node.ts            # 节点组件（继承 CustomElement）
│   ├── edge/
│   │   ├── Edge.ts            # 边组件（继承 CustomElement）
│   │   ├── EdgeRouter.ts      # 路径路由算法（非可视化原语）
│   │   ├── EdgeConnector.ts   # 连接器（非可视化原语）
│   │   ├── EdgeMarker.ts      # 箭头标记
│   │   └── EdgeTool.ts        # 边交互工具
│   └── port/
│       └── Port.ts            # 连接端口（继承 CustomElement）
├── plugins/
│   └── ConnectionPlugin.ts    # 交互式边创建
├── utils/
│   ├── edgeLayout.ts          # 边锚点计算（computeAnchor）
│   ├── nodeAnchor.ts          # 节点形状锚点计算（computeAnchorForShape）
│   └── shapeResolver.ts       # 形状工厂模式
└── __tests__/                 # 单元测试
```

## 核心架构概念

### 1. 类 DOM 风格 API

库模仿 DOM API 以提供熟悉的使用体验：

```typescript
// 创建图（类似 canvas）
const graph = new Graph({ container: 'container', width: 800, height: 600 });

// 创建节点（类似 createElement）
const node = new Node({ id: 'node1', x: 100, y: 100, shape: Rect, style: { ... } });

// 添加到图中（类似 appendChild）
graph.appendChild(node);

// 获取元素（类似 getElementById）
const found = graph.getElementById('node1');

// 事件处理（类似 addEventListener）
node.addEventListener('click', (event) => { ... });
```

### 2. 形状解析系统

节点和边接受 `shape` 为字符串（注册名）或构造函数：

```typescript
// 使用类
shape: Rect

// 使用注册名（通过 graph.customElements 解析）
shape: 'custom-rectangle'
```

形状解析器首先检查 `graph.customElements`（图作用域注册表），然后通过 `utils/shapeResolver.ts` 回退到全局解析。

### 3. 插件系统

插件扩展图的功能，直接复用 Canvas 的 RenderingPlugin：

```typescript
import type { RenderingPlugin } from '@antv/ge';

// 插件接口（与 Canvas RenderingPlugin 兼容）
interface RenderingPlugin {
  name?: string;
  apply(context: RenderingPluginContext, runtime?: any): void;
  destroy?(): void;
}

// 使用方法
graph.use(new ConnectionPlugin({ defaultEdgeStyle: { ... } }));

// 获取插件
const plugin = graph.getPlugin('connection');

// 移除插件
graph.dispose('connection');
```

### 4. 命令模式（撤销/重做）

图具有内置的撤销/重做功能：

```typescript
// 使用命令
await graph.executeCommand(new AddNodeCommand(graph, nodeData));
await graph.undo();
await graph.redo();

// 检查可用性
graph.canUndo(); // true/false
graph.canRedo(); // true/false

// 清空历史
graph.clearHistory();
```

命令位于 `src/core/commands/GraphCommands.ts`:
- `AddNodeCommand`, `RemoveNodeCommand`
- `AddEdgeCommand`, `RemoveEdgeCommand`
- `MoveNodeCommand`, `UpdateNodeCommand`, `UpdateEdgeCommand`
- `BatchCommand` 用于复合操作

### 5. 边路由系统

边使用路由器和连接器：

```typescript
// Router: 计算路径点 (NormalRouter, OrthogonalRouter, ManhattanRouter)
// Connector: 创建视觉形状 (Line, Polyline 等)

const edge = new Edge({
  id: 'edge1',
  source: 'node1',
  target: 'node2',
  style: {
    router: new OrthogonalRouter(),  // 或 new ManhattanRouter()
    connector: new NormalConnector(),
    vertices: [[x1, y1], [x2, y2]], // 额外的路径点
  }
});
```

### 6. 端口布局系统

端口可以使用不同的布局方式定位：

```typescript
// 预定义方向
layout: 'top' | 'bottom' | 'left' | 'right'

// 基于角度
layout: { name: 'angle', args: { angle: 45 } }

// 绝对定位
layout: { name: 'absolute', args: { x: 10, y: 20 } }
```

### 7. 事件系统

- 元素使用标准类 DOM 事件（click, mouseenter 等）
- 使用 `dispatchEvent` 派发事件，`addEventListener` 监听事件
- 边会监听相关节点事件以自动更新位置

---

## 🎨 设计原则：模仿浏览器原生 API

### 核心原则

**GE 应尽可能模仿浏览器原生 API。**

由于 `@antv/g-lite` 已经模拟了 DOM API，GE 的交互系统也应该模拟浏览器内置 API。这确保了：

1. **开发者知识直接迁移** - 现有的浏览器 API 立即可用
2. **GE 的编辑"原语"足够"原生"** - 交互行为符合开发者预期
3. **更低的学习成本** - 无需学习 GE 特有的交互模式
4. **更好的直观性** - 行为遵循经过验证的浏览器标准

### 原生 API 模仿示例

| 浏览器 API | GE 实现 | 说明 |
|-------------|---------|------|
| `draggable="true"` | `draggable: true` | 相同的属性名和行为 |
| `dragstart` 事件 | `node:dragstart` / `connect:start` | 节点拖拽或连线开始 |
| `drag` 事件 | `node:drag` / `connect:drag` | 拖拽/连线过程中 |
| `drop` 事件 | `connect:drop` | 连线放置到目标 |
| `dragend` 事件 | `node:dragend` / `connect:end` | 拖拽/连线完成 |
| `dataTransfer.setData()` | `GEDataTransfer.setData()` | 拖拽过程中的数据传递 |
| `preventDefault()` | `preventDefault()` | 取消默认行为 |
| `effectAllowed` | `effectAllowed` | 控制拖拽操作类型 |

### 关键设计模式

1. **事件驱动，而非插件驱动**
   - 使用标准的事件发射/监听模式
   - 元素发射事件，监听器处理行为
   - 插件变为可选的便利层

2. **关注点分离**
   - 事件发射器（Node/Port）仅发射事件
   - 事件监听器实现行为
   - 直接操作在监听器中执行，而非发射器

3. **多层级处理**
   - 可在 Graph 级别处理全局行为
   - 可在 Node/Port 级别处理本地行为
   - 同一事件可在多个层级处理

4. **配置即属性**
   - `draggable: true` 而非复杂的插件设置
   - `sourceConnectable: true` 作为连接源
   - `targetConnectable: true` 作为连接目标

5. **🚨 CRITICAL: 使用 DOM API，而非 eventBus**
   - ✅ 正确：元素直接派发事件 `element.dispatchEvent(new CustomEvent('name', { detail }))`
   - ✅ 正确：元素直接监听事件 `element.addEventListener('name', handler)`
   - ✅ 正确：元素移除监听 `element.removeEventListener('name', handler)`
   - ❌ 错误：`graph.eventBus.addEventListener('node:moved', handler)` - 不符合 DOM API
   - ❌ 错误：`graph.eventBus.dispatchEvent(...)` - 不是 @antv/g-lite 的正确使用方式

   **原因**：
   - @antv/g-lite 提供了完整的事件系统（继承自 DisplayObject）
   - DOM API 的元素自己可以派发和监听事件
   - eventBus 是非标准模式，增加了不必要的复杂性

### 实现示例

```typescript
// Graph 级别的统一事件处理（类似全局事件委托）
graph.addEventListener('node:dragstart', (e) => {
  const { source } = e.detail;
  console.log('节点开始拖拽:', source.getId());
});

graph.addEventListener('node:drag', (e) => {
  // 节点拖拽过程中
  const { source, x, y } = e.detail;
  console.log('节点移动到:', x, y);
});

graph.addEventListener('node:dragend', (e) => {
  const { source } = e.detail;
  console.log('节点拖拽结束:', source.getId());
});

graph.addEventListener('connect:start', (e) => {
  const { source } = e.detail;
  console.log('开始连线:', source.getId());
});

graph.addEventListener('connect:drag', (e) => {
  // 连线拖拽：检测最近的锚点
  const { x, y } = e.detail;
  const nearest = findNearestEndpoint(x, y);
  if (nearest) {
    snapTo(nearest);
    highlight(nearest);
  }
});

graph.addEventListener('connect:end', (e) => {
  const { source, target } = e.detail;
  if (target) {
    // 创建边
    graph.addEdge({
      id: `edge-${Date.now()}`,
      source: source.getId(),
      target: target.getId()
    });
  }
});

// Node/Port 级别的自定义处理
const node = graph.addNode({
  id: 'special-node',
  draggable: true,
  sourceConnectable: {
    enabled: true,
    onDragStart: (e) => {
      // 自定义开始拖拽逻辑
      console.log('特殊节点开始连线');
      return true;  // 返回 false 可阻止拖拽
    }
  }
});
```

### 犹豫时的判断准则

设计新的 GE 功能时，询问：
- **浏览器原生对应的是什么？**
- **MDN 如何记录这种模式？**
- **我能使用相同的 API 名称和行为吗？**

**参考**: [MDN Web API 文档](https://developer.mozilla.org/en-US/docs/Web/API)

---

## 🚨 交互系统架构规则（CRITICAL）

### 核心原则：职责分离

**在拖拽和连线过程中，子类（Node/Port/Edge）不需要任何操作！！！**

```
父类 GEInteractiveElement:
  - 根据配置属性（draggable/sourceConnectable/targetConnectable）决定交互类型
  - 在合适的时机派发事件（dragstart/drag/dragend）
  - 处理指针事件（pointerdown/pointermove/pointerup）

插件（MovePlugin/ConnectionPlugin）:
  - 监听事件并实现实际逻辑
  - MovePlugin: 监听 node:drag 事件来移动节点
  - ConnectionPlugin: 监听 connect:drag 事件来创建连线

子类（Node/Port/Edge）:
  - 只负责数据和渲染
  - 在 connectedCallback 中调用 super._initInteraction()
  - 不实现任何交互逻辑
```

### 继承层次

```
CustomElement (@antv/g-lite)
  ↑
GEInteractiveElement (所有交互逻辑)
  ↑
Node / Port / Edge (纯数据+渲染，无交互逻辑)
```

### 关键规则

1. **事件派发由父类统一处理**
   - `_initInteraction()` 在父类中实现
   - `_handlePointerDown` 在父类中实现
   - `_determineDragType()` 在父类中实现（优先级：sourceConnectable > draggable）
   - `_isDraggable()`, `_isSourceConnectable()`, `_isTargetConnectable()` 在父类中实现
   - `_startDrag()` 在父类中实现
   - `_handlePointerMove/Up/Cancel` 在父类中实现

2. **子类只调用父类方法**
   - Node: `connectedCallback()` 中调用 `super._initInteraction()`
   - Port: `connectedCallback()` 中调用 `super._initInteraction()`
   - Edge: 不需要交互（不继承 GEInteractiveElement）

3. **插件处理实际逻辑**
   - MovePlugin 监听 `node:dragstart/drag/dragend` 事件，移动节点
   - ConnectionPlugin 监听 `connect:start/drag/end` 事件，创建连线

4. **不要做的事情**
   - ❌ 子类中不要重复定义 `_initInteraction()`
   - ❌ 子类中不要重复定义 `_isDraggable()` 等配置检查方法
   - ❌ 子类中不要重复定义 `_handlePointerDown` 等事件处理方法
   - ❌ 不要在子类中直接实现拖拽逻辑
   - ❌ 不要使用 `_emitToGraph` 这种模式（事件应该自然冒泡）

5. **配置属性控制行为**
   - `draggable: true` - 节点可拖拽移动
   - `sourceConnectable: true` - 可作为连线源
   - `targetConnectable: true` - 可作为连线目标
   - 如果同时配置，优先级：sourceConnectable > draggable

### 事件流示例

```
用户按下鼠标
  ↓
Node (通过父类 GEInteractiveElement)
  ↓
_determineDragType() 检查配置
  ↓
派发 node:dragstart 或 connect:start 事件
  ↓
事件冒泡到 Graph
  ↓
MovePlugin/ConnectionPlugin 监听到事件
  ↓
插件执行实际逻辑（移动节点/创建连线）
```

### 常见错误

| 错误 | 正确做法 |
|------|----------|
| 子类重复实现 `_isDraggable()` | 删除，使用父类的实现 |
| 子类重复实现 `_handlePointerDown` | 删除，使用父类的实现 |
| 子类直接调用 `setPosition()` 移动自己 | 由 MovePlugin 监听事件后调用 |
| 使用 `_emitToGraph` 手动派发事件 | 使用 `dispatchEvent` 让事件自然冒泡 |

---

## 类型系统

所有类型都集中在 `src/types/index.ts`:

**核心类型**: `Graph`, `Node`, `Edge`, `Port`, `RenderingPlugin`, `Command`

**数据类型**: `NodeData`, `EdgeData`, `PortData`, `GraphData`

**样式类型**: `BaseStyleProps`, `BaseNodeStyleProps`, `BaseEdgeStyleProps`, `BasePortStyleProps`

**配置类型**: `GraphOptions`, `EdgeMarkerConfig`, `EdgeLayoutOptions`, `PortLayoutOptions`

**原语类型**: `EdgeRouter`, `EdgeConnector`, `NormalRouter`, `OrthogonalRouter`, `ManhattanRouter`, `SmoothRouter`, `NormalConnector`, `PolylineConnector`, `SmoothConnector`

**工具类型**: `DisplayObjectConfigWithShape<T>`, `RenderingPluginContext`, `Vec2`, `EdgeAnchor`

## 重要模式

### 边连接端点

边接受 `source` 和 `target` 为:
- 字符串 ID: `'node1'`
- 节点对象: `node` (将调用 `node.getId()`)
- 端口对象: `port` (将调用 `port.getAbsolutePosition()`)
- 带冒号的端口 ID: `'node1:port1'`

### 内存管理

边通过 `appendChild` 添加时自动连接到节点。边会:
1. 通过 ID 或直接引用查找源/目标节点
2. 监听相关节点的事件以自动更新位置
3. 节点移动时自动更新边路径
4. 在 `disconnectedCallback` 中清理监听器

**关键**: 删除边/节点时，始终使用 `graph.removeChild()` 而非手动 DOM 操作。

### 形状注册

图作用域的自定义元素:
```typescript
// 注册自定义形状
graph.customElements.define('my-shape', MyShapeClass);

// 使用名称
const node = new Node({ id: 'n1', shape: 'my-shape', ... });
```

## 开发注意事项

### TypeScript 配置

- 目标: ES2018，模块: ESNext
- `strict: true`，但 `noImplicitAny: false`（渐进式类型）
- 声明文件输出到 `lib/` 和 `esm/` 与编译代码一起

### 测试位置

测试必须位于 `**/__tests__/**/*.test.ts` 才能匹配 Jest 配置。

### 外部依赖

`@antv/g-lite` 是外部依赖。测试或构建时，确保消费者可以访问它。

### 代码约定

- 使用 `customElements.define()` 进行图作用域形状注册
- 使用 `shapeResolver` 工具进行运行时形状解析
- 优先使用 `graph.appendChild()` 而非直接 DOM 操作
- 对于应该可撤销的变更使用命令
- 边上的事件监听器必须在 `disconnectedCallback` 中正确清理

### API 差异说明

README 中部分 API 尚未完全实现，实际使用时请注意：

1. **样式属性访问**: README 中的 `node.style.width = 120` 尚未支持，需使用 `node.getData().style.width`
2. **setAttribute/getAttribute**: 这些方法尚未实现
3. **querySelectorAll**: Graph 上没有此方法，只有 `getElementById`
4. **children 属性**: Node 类没有暴露 children getter

当前推荐的 API:
- 使用 `node.getData().style` 访问样式
- 使用 `graph.getNodeById(id)` 查找节点
- 使用 `graph.getNodes()` / `graph.getEdges()` 获取所有节点/边
