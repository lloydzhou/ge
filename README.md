# GE — 基于 AntV/G DOM 模型的图编辑器

> GE = g-lite DOM 模型 + 图编辑领域语义。把 [AntV/G](https://g.antv.antgroup.com/) 当作「浏览器引擎」，GE 是跑在它之上的「图编辑 DOM 规范」——就像 HTML 之于浏览器。

本仓库的 `rewrite` 分支为**从零重写**版本：以 g-lite 的 CustomElement / Document 为唯一基座，不再重建任何平行系统。

---

## 核心特性

- **真正的类 DOM API**：`appendChild / getElementById / getElementsByClassName / addEventListener / connectedCallback` 全部直接来自 g-lite。
- **Web Components 心智**：领域元素 = 领域特化的 `CustomElement`，`attributeChangedCallback` 做响应式，`className` 做类型识别。
- **统一锚点模块**：Node/Port/Edge 共用唯一的 Anchor 类型源与注册表（消除旧版 5 文件碎片化）。
- **边原地更新**：Router/Connector 计算路径后 `setAttribute('d', ...)` 原地写回 Path，不销毁重建。
- **事件驱动联动**：节点移动派发 `node:boundschange`，相连边监听后自动重算路径。
- **渲染引擎可插拔**：基于 g-canvas / g-svg。
- **交互编辑（L3）**：`DragPlugin`（拖拽，边实时跟随）/ `SelectionPlugin`（单/多选）/ `HistoryPlugin`（撤销重做）/ `ScrollerPlugin`（滚轮缩放·空白平移）/ `SnaplinePlugin`（对齐辅助线）/ Group embedding（分组整体移动）。
- **数据能力（L4）**：`graph.toJSON()` / `fromJSON()` 序列化往返；`graph.toDataURL()` 导出 PNG；`MinimapPlugin` 缩略导航。
- **自动布局（L4）**：`gridLayout` / `circularLayout` / `forceLayout`（力导向 FR）/ `hierarchicalLayout`（DAG 分层），纯函数 + `graph.applyLayout()`。
- **拖拽创建（L4）**：`DndPlugin` + Stencil 面板，从模板拖出节点。
- **框架封装（L4）**：`@antv/ge-react` 声明式 `<GraphView>` 组件。

## 架构分层

```
Layer 4  框架适配  @antv/ge-react / @antv/ge-vue（后续）
Layer 3  插件工具  Selection / Snapline / History / Clipboard / Keyboard ...（后续）
Layer 2  核心包    @antv/ge-core（当前重点）
         ├─ 领域元素  Cell → Node/Edge/Port/Group（extends CustomElement）
         ├─ 原语      Anchor / Router / Connector（纯函数 + 注册表）
         └─ 图容器    Graph extends Canvas
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

## 示例（嵌入式 HTML）

每个示例是独立的 HTML，通过 Vite 直接 import 源码（`@ge` 别名指向 `packages/ge-core/src`）：

| 文件 | 演示 |
|------|------|
| `examples/01-basic.html` | Node × 3 + Edge × 3，perimeter 锚点 + 不同 connector |
| `examples/02-ports.html` | Port 挂载 + ratio 锚点精确定位连接点 |
| `examples/03-router.html` | normal / orthogonal / manhattan 路由 × rounded / smooth 连接器对比 |
| `examples/04-interaction.html` | 拖拽 + 选中 + 撤销/重做 + 序列化 + 小地图（完整交互编辑） |
| `examples/05-advanced.html` | 滚轮缩放/平移 + 分组嵌入 + 对齐辅助线 + 导出 PNG |
| `examples/06-stencil.html` | Stencil 拖拽创建 + 一键布局（grid/环形/力导向/层次） |
| `examples/07-react.html` | `@antv/ge-react` 声明式 `<GraphView>` |

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

纯原语（utils 几何、Anchor、Router、Connector、computeEdgePoints）以 Vitest 单元测试覆盖。领域元素的渲染行为通过 examples 可视化 + Playwright 像素/结构校验。

```
✓ utils.test.ts       17 tests   几何 / 向量
✓ anchor.test.ts      16 tests   节点 / 线性锚点 / 注册表
✓ edge.test.ts        14 tests   Router / Connector / 原地 update
✓ compute.test.ts      4 tests   computeEdgePoints
✓ smoke.test.ts        1 test
```

## 目录结构

```
ge/
├─ packages/
│  ├─ ge-core/           核心包
│  │  ├─ src/
│  │  │  ├─ core/        Cell/Node/Edge/Port/Group/Graph + types/compute
│  │  │  ├─ anchor/      统一锚点（node-anchor / edge-anchor / registry）
│  │  │  ├─ edge/        router / connector（含 updatePath 原地更新）
│  │  │  ├─ plugins/     Drag/Selection/History/Scroller/Snapline/Dnd/Minimap
│  │  │  ├─ layout/      grid/circular/force/hierarchical 自动布局
│  │  │  └─ utils/       几何 / 向量（纯函数）
│  │  └─ __tests__/      Vitest 单测
│  └─ ge-react/          React 封装（<GraphView>）
├─ examples/             嵌入式 HTML（01–07）
├─ vite.config.ts        examples dev server（含 React 插件）
├─ vitest.config.ts      测试配置
└─ tsconfig.base.json    TS5 strict
```

## 路线图

- [x] **L0** 工程地基（pnpm / TS5 / tsup / Vite / Vitest）
- [x] **L1** 核心原语 + 单测（Anchor / Router / Connector / utils）
- [x] **L2** 领域元素 + Graph（最小可渲染 + 校验）
- [~] **L3** 交互与编辑：✅ Drag / Selection / History / Scroller / Snapline / Group embedding　⬜ Transform
- [~] **L4** 生态：✅ 序列化 / Minimap / Export / Layout / Dnd / `@antv/ge-react`　⬜ Stencil 独立组件 / 更多布局算法

## License

MIT
