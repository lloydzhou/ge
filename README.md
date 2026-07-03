# GE — 基于 AntV/G DOM 模型的图编辑器

> GE = g-lite DOM 模型 + 图编辑领域语义。把 [AntV/G](https://g.antv.antgroup.com/) 当作「浏览器引擎」，GE 是跑在它之上的「图编辑 DOM 规范」——就像 HTML 之于浏览器。

本仓库的 `rewrite` 分支为**从零重写**版本：以 g-lite 的 CustomElement / Document 为唯一基座，不再重建任何平行系统。

---

## 核心特性

- **真正的类 DOM API**：`appendChild / getElementById / getElementsByClassName / addEventListener / connectedCallback` 全部直接来自 g-lite。
- **Web Components 心智**：领域元素 = 领域特化的 `CustomElement`，`attributeChangedCallback` 做响应式，`className` 做类型识别。
- **X6 式抽象层**：`ShapeRegistry`（shape 可注册：rect/circle/ellipse/diamond/自定义）+ `Markup/Selector`（声明式子元素 + `getSubElement(selector)` 寻址）+ `Attrs`（selector 粒度 `stateStyles`）+ `Model`（完整 props 序列化，不漏字段）。
- **统一锚点模块**：Node/Port/Edge 共用唯一的 Anchor 类型源与注册表。
- **边原地更新**：Router/Connector 计算路径后 `setAttribute('d', ...)` 原地写回 Path，不销毁重建。
- **边视觉**：终点方向箭头（marker，尖端贴 target 边缘）+ 边标签（自动定位路径中点）+ 边路径控制点编辑（双击添加 waypoint，拖拽调整）。
- **事件驱动联动**：节点移动派发 `node:boundschange`，相连边监听后自动重算路径。
- **渲染引擎可插拔**：默认 `g-svg`（每图形即真实 DOM 元素，便于 querySelector 检视/自动化验证），大图可切 `renderer: 'canvas'`。
- **交互编辑**：`Drag` / `Resize`（选中节点拖角改尺寸）/ `Selection` / `Hover` / `CreateEdge` / `Vertex`（边路径控制点）/ `Keyboard` / `Clipboard` / `Transform`（多选变换）/ `History` / `Scroller`（缩放·平移）/ `Snapline` / `Group embedding`。
- **坐标变换（pan/zoom）**：GE 自有 2D 坐标层（panOffset + 中心缩放公式），pan 用 `root.translate`、zoom 用 `camera.setZoom`，坐标转换与渲染完全一致。自定义 `pickNode` 命中（不依赖 g-lite 3D 投影）。
- **状态样式可配置**：交互状态通过 `className` 触发，样式由 `stateStyles` 按 selector 粒度配置。
- **数据能力**：`toJSON/fromJSON`（完整序列化）/ `toDataURL`（PNG 导出）/ `MinimapPlugin`（拖框导航 + 实时预览）。
- **自动布局**：`gridLayout` / `circularLayout` / `forceLayout`（力导向 FR）/ `hierarchicalLayout`（DAG 分层），`graph.applyLayout()`。
- **拖拽创建**：`DndPlugin` + Stencil 面板，放置后 DOM 校准确保 pan/zoom 后精确对齐鼠标位置。
- **框架封装**：`@antv/ge-react` 声明式 `<GraphView>`（props 变化自动 diff 同步：增/删/改）。

## 架构分层

```
Layer 4  框架适配  @antv/ge-react（声明式 GraphView + diff）
Layer 3  插件工具  Drag/Resize/Selection/Hover/CreateEdge/Vertex/Keyboard/Clipboard/Transform/History/Scroller/Snapline/Dnd/Minimap
Layer 2  核心包    @antv/ge-core
         ├─ 领域元素  Cell → Node/Edge/Port/Group（extends CustomElement）
         ├─ X6 抽象   ShapeRegistry / Markup+Selector / Attrs / Model
         ├─ 原语      Anchor / Router / Connector（纯函数 + 注册表）
         └─ 图容器    Graph extends Canvas（panOffset + 2D 坐标层）
Layer 1  渲染引擎  @antv/g-lite（不改）
```

## 快速开始

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动 Vite，打开 examples
pnpm test             # 运行单元测试（Vitest）
pnpm build            # 构建包（tsup）
```

### 最小示例

```ts
import { Graph } from '@ge';

const graph = new Graph({ container: '#app', background: '#fafafa' });
await graph.ready;

graph.addNode({ id: 'a', x: 80, y: 140, width: 130, height: 50, label: 'Start' });
graph.addNode({ id: 'b', x: 360, y: 80, width: 130, height: 50, label: 'Process' });

// 边自动用 perimeter 锚点从节点「边缘」连接，并经 router/connector 路由
graph.addEdge({ source: 'a', target: 'b', router: 'orthogonal', connector: 'rounded' });

// 查询走 g-lite document API，无平行 Map
graph.getNode('a');     // getElementById
graph.getNodes();       // getElementsByClassName('ge-node')
```

### 声明式自定义节点（X6 式 Markup）

```ts
graph.shapes.register({
  name: 'card',
  markup: [
    { tagName: 'rect', selector: 'body', attrs: { width: 140, height: 70, fill: '#fff', stroke: '#1890ff' } },
    { tagName: 'rect', selector: 'header', attrs: { x: 0, y: 0, width: 140, height: 22, fill: '#1890ff' } },
  ],
});
graph.addNode({ shape: 'card', stateStyles: { hover: { body: { stroke: '#f00' }, header: { fill: '#fa8c16' } } } });

// DOM 风格操作
node.getSubElement('header');       // 按 selector 寻址
node.classList.add('selected');     // className 触发状态
graph.toJSON();                      // 完整 model 序列化
```

## 示例（嵌入式 HTML）

| 文件 | 演示 |
|------|------|
| `01-basic.html` | Node × 3 + Edge × 3，perimeter 锚点 + 不同 connector |
| `02-ports.html` | Port 挂载 + ratio 锚点精确定位 |
| `03-router.html` | normal / orthogonal / manhattan × rounded / smooth 对比 |
| `04-interaction.html` | 拖拽 + 选中 + 撤销 + 对齐线 + 小地图 |
| `05-advanced.html` | 滚轮缩放/平移 + 分组 + 对齐线 + 导出 PNG + diamond shape |
| `06-stencil.html` | Stencil 拖拽创建 + 一键布局 + 小地图拖框导航 |
| `07-react.html` | `@antv/ge-react` 声明式 `<GraphView>`（props diff） |
| `08-edit.html` | 拖出连线 + 键盘 + 复制粘贴 + 多选变换 + Resize + Vertex |

## 核心原语

| 模块 | 能力 | 内置 |
|------|------|------|
| **Anchor** | 节点 / 线性锚点 | center/top/bottom/left/right/四角/ratio/coordinate/perimeter；edge: ratio/length/mid/segment |
| **Router** | 控制点 → 路由折线 | normal / orthogonal / manhattan |
| **Connector** | 折线 → SVG path `d`（含原地 `update`） | normal / polyline / rounded / smooth |

均为纯函数 + 注册表，核心逻辑无 DOM 依赖，单测密集覆盖。

## 测试

```bash
pnpm test
```

```
✓ utils.test.ts       17 tests   几何 / 向量
✓ anchor.test.ts      16 tests   节点 / 线性锚点 / 注册表
✓ edge.test.ts        14 tests   Router / Connector / 原地 update
✓ compute.test.ts      4 tests   computeEdgePoints
✓ layout.test.ts       7 tests   grid/circular/force/hierarchical
✓ plugins.test.ts     11 tests   History / closestCell / addClass/removeClass
✓ shape.test.ts        5 tests   ShapeRegistry 注册/resolve/覆盖
✓ smoke.test.ts        1 test
                         75 tests passed
```

领域元素的渲染行为 + 交互（pan/zoom/Drag/Resize/Dnd 坐标变换）通过 8 个 example 的 Playwright 自动化校验。

## 目录结构

```
ge/
├─ packages/
│  ├─ ge-core/           核心包
│  │  ├─ src/
│  │  │  ├─ core/        Cell/Node/Edge/Port/Group/Graph + types/compute
│  │  │  ├─ shape/       ShapeRegistry + Markup/Selector + builtIn（rect/circle/ellipse/diamond）
│  │  │  ├─ anchor/      统一锚点（node-anchor / edge-anchor / registry）
│  │  │  ├─ edge/        router / connector（含 updatePath 原地更新）
│  │  │  ├─ plugins/     Drag/Resize/Selection/Hover/CreateEdge/Vertex/Keyboard/Clipboard/Transform/History/Scroller/Snapline/Dnd/Minimap
│  │  │  ├─ layout/      grid/circular/force/hierarchical
│  │  │  └─ utils/       几何 / 向量
│  │  └─ __tests__/      Vitest 单测（75 tests）
│  └─ ge-react/          React 封装（<GraphView> 声明式 diff）
├─ examples/             嵌入式 HTML（01–08）
├─ vite.config.ts        examples dev server
└─ tsconfig.base.json    TS5 strict
```

## 路线图

- [x] **L0** 工程地基（pnpm / TS5 / tsup / Vite / Vitest）
- [x] **L1** 核心原语 + 单测（Anchor / Router / Connector / utils）
- [x] **L2** 领域元素 + Graph + X6 抽象（ShapeRegistry / Markup / Selector / Attrs / Model）
- [x] **L3** 交互与编辑：Drag / Resize / Selection / Hover / CreateEdge / Vertex / Keyboard / Clipboard / Transform / History / Scroller / Snapline / Group
- [x] **L4** 生态：序列化 / Minimap（拖框导航）/ Export / Layout / Dnd（坐标校准）/ `@antv/ge-react`（声明式 diff）
- [ ] 后续：完整 dagre / 更多内置 shape / 性能优化 / API 文档站点

## License

MIT
