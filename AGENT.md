# AGENT.md

> 架构设计详见 [docs/architecture.md](./docs/architecture.md)。本文件只记录开发注意事项。

## 项目概述

**GE (Graph Editor)** — 基于 [@antv/g-lite](https://g.antv.antgroup.com/) 的图编辑器库，采用类 DOM API。

- 包名：`@antv/ge`（monorepo 根）/ `@antv/ge-core`（核心包）
- 渲染引擎：`@antv/g-lite`（peer dependency，外部依赖）

## 构建与测试

```bash
# 安装依赖
pnpm install

# 构建（tsup → dist/index.js CJS + dist/index.mjs ESM + .d.ts）
cd packages/ge-core && npm run build
# 或从根目录
pnpm --filter @antv/ge-core build

# 开发模式（vite dev server）
npm run dev

# 测试（vitest，不是 jest）
npx vitest run                          # 全量
npx vitest run packages/ge-core/__tests__/edge.test.ts  # 单文件
npx vitest --watch                       # 监听

# 类型检查
cd packages/ge-core && npx tsc --noEmit

# 启动示例（vite，默认 5173 端口）
npm run dev
# 示例页：http://localhost:5173/examples/01-basic.html ~ 09-features.html
```

## 项目结构

```
packages/ge-core/
├── src/
│   ├── core/                # 核心元素
│   │   ├── Cell.ts          # 抽象基类（dirty flag + markDirty + flushDirty）
│   │   ├── Node.ts          # 节点
│   │   ├── Edge.ts          # 边
│   │   ├── Port.ts          # 端口
│   │   ├── Group.ts         # 分组（extends Node）
│   │   ├── Graph.ts         # 图容器（extends Canvas，持有 scheduler）
│   │   ├── Scheduler.ts     # 渲染队列（rAF 合并 dirty cell）
│   │   ├── compute.ts       # 边路径计算（纯函数）
│   │   └── commands/        # 撤销/重做命令
│   ├── edge/                # 边原语（纯函数）
│   │   ├── router.ts        # Router（normal/orthogonal/manhattan/astar）
│   │   └── connector.ts     # Connector（normal/rounded/smooth）
│   ├── anchor/              # 锚点计算（纯函数）
│   ├── plugins/             # 插件（Drag/Selection/Resize/Rotate/...）
│   ├── shape/               # 形状注册
│   ├── layout/              # 布局算法（grid/circular/force/hierarchical/tree）
│   └── utils/               # 工具函数
├── __tests__/               # 单元测试（vitest）
└── tsup.config.ts           # 构建配置
```

## 开发约束

### API 设计原则（DOM-like）

GE 的核心设计是 **API 尽可能模仿浏览器原生 DOM**。Cell/Node/Edge/Port/Group 继承 g-lite `CustomElement`，是**真正的 DOM 元素**，不是 X6 那种「数据对象 + 自渲染」。

| 操作 | 用 DOM 原语 | 禁止 |
|------|------------|------|
| 增删元素 | `createElement` + `appendChild` / `removeChild` | 不要维护平行 Map 索引 |
| 查询 | `getElementById` / `getElementsByClassName` | 不要自造 registry 查询 |
| 改属性 | `setAttribute` / `getAttribute` | 不要 jQuery 风格 `prop()`/`attr(path)` |
| 事件 | `addEventListener` / `dispatchEvent` / `CustomEvent`（冒泡） | **禁止 eventBus**，禁止自有 `on/off` |
| 序列化 | `toJSON()` / `fromJSON()` | 不要自定义 `toObject` |
| 业务数据 | `getData()` / `setData()`（类似 `dataset`） | — |

**合理例外**（DOM 无对应物的 Canvas/图表能力，保留即可）：`panBy` / `panTo` / `setZoom` / `canvas2Viewport` / `viewport2Canvas` / `pickNode` / `toDataURL` / `zoomToFit` / `cullViewport`。

判断准则：犹豫时问「浏览器原生对应的是什么？MDN 如何记录这种模式？」。X6 的 `cell.on()` / `cell.prop()` / `cell.attr('body/fill')` 这类 jQuery 风格 API 在 GE 里一律不引入。

### 渲染调度（Scheduler）

- **属性变化走 markDirty，不要同步重绘**：`attributeChangedCallback` 内调 `this.markDirty(FLAG)`，由 Scheduler 在帧边界统一 `flushDirty`。直接调 `rebuildBody()`/`update()` 会绕过合并，导致高频场景卡顿。
- **对象复用优先**：改属性用 `body.setAttribute('width', ...)` 原地更新，不要 `destroy()` + `new`。只有 **shape 类型变化**（rect→circle）才需要销毁重建（`markDirty(REBUILD)`）。
- **手动 flush**：需要立即生效时（如拖拽结束）调 `graph.scheduler.flush()`。

### g-lite 兼容性

- g-lite 的 `DisplayObject` 已有 public `dirty` 属性，GE 用 **`_dirty`** 避免冲突。不要用 `this.dirty`。
- 获取 Graph 实例：`this.ownerDocument.defaultView`（不是 `this.ownerDocument` 本身）。
- `@antv/g-lite` 是 peer dependency，不打包，消费者必须提供。

### 事件系统

- **用 DOM API**：`element.dispatchEvent(new CustomEvent(...))` / `element.addEventListener(...)`，事件自然冒泡。
- **不用 eventBus**：`graph.eventBus.xxx` 是非标准模式，禁止使用。
- 节点移动/缩放派发 `node:boundschange`，Edge/Port 监听后走 `markDirty` 联动更新。

### DOM 操作

- 删除元素始终用 `graph.removeChild(node)`，不要手动 DOM 操作（需触发 disconnectedCallback 清理监听器）。
- Edge 上的事件监听器必须在 `disconnectedCallback` 中清理。

### A* 路由

- `manhattan-astar` 有搜索空间上限（4000 格），超阈值降级 `manhattan`（不避障但正交）。节点拖远时自动降级，防卡死。
- obstacles 仅在 router 含 `'astar'` 时计算（普通路由零开销）。

## 已知问题

- **tsc 预存警告**：`npx tsc --noEmit` 有约 30 个 unused import / unused var 警告（预存，非阻塞，不影响 vitest/tsup）。
- **测试框架**：vitest（不是 jest）。测试文件在 `__tests__/*.test.ts`。happy-dom 环境。
