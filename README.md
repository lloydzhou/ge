# GE — 基于 AntV/G DOM 模型的图编辑器

> GE = g-lite DOM 模型 + 图编辑领域语义。把 [AntV/G](https://g.antv.antgroup.com/) 当作「浏览器引擎」，GE 是跑在它之上的「图编辑 DOM 规范」——就像 HTML 之于浏览器。

## 设计哲学

- **数据结构**：借鉴 X6（Markup/Selector/Attrs/shape 声明式模型）
- **交互 API**：靠拢 DOM（`setAttribute` / `appendChild` / `addEventListener` / `classList` / `querySelector`）

摒弃 X6 的命令式 API（`addTools` / `graph.on` / `node.resize` / `node.prop`），改用 DOM 标准 API。节点 / 边 / 端口都是真正的 DOM 元素（继承 `CustomElement`）：

| 操作 | ❌ X6 命令式（GE 不采用） | ✅ GE DOM 化 |
|------|------------------------|-------------|
| 改属性 | `node.resize(w,h)` / `node.prop(...)` | `node.setAttribute('width', w)` |
| 工具 | `node.addTools(['resize'])` | `node.setAttribute('resizable', true)` |
| 事件 | `graph.on('node:click', fn)` | `graph.addEventListener('click', fn)` |
| 端口 | `node.addPort({id})` | `node.appendChild(new Port({id}))` |
| 删除 | `graph.removeNode(id)` | `graph.removeCell(id)` / `removeChild(el)` |

> `graph.addNode({...})` 与 `graph.appendChild(new Node({...}))` **等价**——前者内部就是 `createElement` + `appendChild` 的便捷封装，均可使用。

```ts
// 创建（DOM 风格）
graph.appendChild(new Node({ shape: 'rect', x: 100, y: 100, label: 'A' }));

// 变换（attribute 驱动，响应式）
node.setAttribute('angle', 45);        // 旋转
node.setAttribute('width', 200);       // 缩放
node.setAttribute('visible', false);   // 隐藏
node.setAttribute('shadowBlur', 10);   // 阴影

// 声明式工具配置（不用 addTools）
node.setAttribute('resizable', true);  // → 选中显示 8 向手柄
node.setAttribute('rotatable', true);  // → 选中显示旋转手柄

// 端口（appendChild）
node.appendChild(new Port({ id: 'p1', layout: 'top' }));

// 查询（document API）
graph.getElementById('n1');
graph.getCells();   // 所有节点 + 边

// 事件（DOM 冒泡）
node.addEventListener('click', fn);
graph.addEventListener('node:dragend', fn);
graph.addEventListener('cell:added', fn);
```

## 核心特性

### 12 个内置 Shape

`rect` / `circle` / `ellipse` / `diamond` / `triangle` / `hexagon` / `parallelogram` / `cylinder` / `star` / `text` / `cross` / `arrow`

### 20 个插件

| 插件 | 能力 |
|------|------|
| **Drag** | 节点拖拽移动 |
| **Resize** | 8 向尺寸手柄（4 角 + 4 边，`resizable` 声明式） |
| **Rotate** | 旋转手柄（`rotatable` 声明式，`angle` attribute） |
| **Selection** | 点击选中（节点 + 边）+ 空白左键框选（Shift 多选） |
| **Hover** | 节点/边悬停高亮 + move cursor |
| **CreateEdge** | Port 直接拖出连线 + Alt 拖节点连线 |
| **Vertex** | waypoint 增删 + 端点重连（source/target-arrow）+ segments 整段拖拽 |
| **Keyboard** | Delete + Ctrl+Z/Y（undo/redo）+ Ctrl+A（全选）+ Ctrl+C/V/D |
| **Clipboard** | 复制 / 粘贴 / 克隆 |
| **Transform** | 多选整体平移 |
| **History** | snapshot undo/redo（覆盖全操作 + mark/commit） |
| **Scroller** | 滚轮缩放 + 中/右键平移 |
| **Snapline** | 对齐辅助线 |
| **EditLabel** | 双击节点 inline 编辑标签 |
| **Dnd** | Stencil 拖拽创建（pan/zoom 后精确） |
| **Minimap** | 缩略导航（拖框平移） |
| **Grid** | 背景网格（点阵/网格线） |
| **ContextMenu** | 右键自定义菜单 |
| **Tooltip** | 悬停提示 |
| **Boundary** | 选中节点虚线包围框 |

### 边能力（12 种）

- **4 个 Router**：normal / orthogonal / manhattan / **manhattan-astar**（A* 避障路由）
- **3 个 Connector**：normal / rounded / smooth
- **双向箭头**：`startArrow: true`
- **多标签**：`labels: [{ text, distance }]`（distance 0-1 沿路径定位）
- **流动动画**：`lineDashFlow: true`（数据流效果）
- **虚线/透明/可见**：`lineDash` / `opacity` / `visible`
- **路径控制**：`waypoints`（路径控制点）
- **端点重连**：拖拽 source/target 手柄改变连线端点
- **整段拖拽**：拖拽边线 → 所有 waypoints 平移
- **自环**：source == target → 自动 U 形路径

### 节点能力（10 种）

- **变换**：旋转（`angle`）/ resize（`width`/`height` 8 向）
- **层级**：`toFront()` / `toBack()`
- **视觉**：`visible` / `shadowColor` + `shadowBlur`
- **端口**：`Port` + `layout: 'top'/'bottom'/'left'/'right'`（同方向自动均匀排列）
- **声明式工具**：`resizable` / `rotatable`

### 坐标变换

GE 自有 2D 坐标层（绕过 g-lite SVG camera 3D 投影不一致）：
- `panBy` / `panTo` / `zoomToFit`
- `canvas2Viewport` / `viewport2Canvas`（中心缩放公式）
- `pickNode`（自定义命中检测）
- `culling`（视口虚拟渲染，大图性能）

### 数据 & 布局

```ts
// 序列化往返
graph.toJSON();
graph.fromJSON(data);

// 导出
graph.toDataURL('image/png');
graph.toSVGString();

// 批量操作（History 合并为一次 undo）
graph.batch(() => {
  graph.addNode({ id: 'x', x: 100, y: 100 });
  graph.addNode({ id: 'y', x: 300, y: 100 });
  graph.addEdge({ source: 'x', target: 'y' });
});

// 布局（纯函数返回 positions Map，由 applyLayout 应用）
import { hierarchicalLayout } from '@antv/ge';
graph.applyLayout(hierarchicalLayout(nodes, edges, { layerGap: 110, nodeGap: 140 }));
// 可用：gridLayout / circularLayout / forceLayout / hierarchicalLayout / treeLayout
```

### 抽象层（X6 对齐）

- **ShapeRegistry**：shape 可注册（12 内置 + 自定义）
- **Markup + Selector**：声明式子元素（`getSubElement('body')`）
- **Attrs**：selector 粒度 stateStyles
- **Model**：Cell `props` 自动同步（toJSON 完整）
- **OverlayPlugin**：DOM overlay 插件 DRY 基类

### React 封装

`@antv/ge-react` 声明式 `<GraphView>`（props 变化 → 按 id diff 自动同步：增/删/改）。

## 快速开始

```bash
pnpm install && pnpm dev    # 启动 examples
pnpm test                    # 121 单测
pnpm build                   # 构建
```

## 示例

| 文件 | 演示 |
|------|------|
| `01-basic` | 基础渲染 + perimeter 锚点 |
| `02-ports` | Port + ratio 锚点 |
| `03-router` | 路由 × 连接器对比 |
| `04-interaction` | 拖拽 + 选中 + 撤销 + 小地图 |
| `05-advanced` | 缩放/平移 + 分组 + 对齐线 + 导出 |
| `06-stencil` | Stencil 拖拽 + 布局 + 小地图拖框 |
| `07-react` | React 声明式 GraphView |
| `08-edit` | 连线 + 键盘 + 复制 + Resize + Rotate + 框选 + Grid |
| `09-features` | 全功能集成（12 Shape + A* 避障 + Port + 流动动画） |
| `10-multi-canvas` | 多画布实例 |

📖 **在线文档站**：https://lloydzhou.github.io/ge/ （18 个可交互示例 + API 参考）

## License

MIT
