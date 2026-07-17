# 基础渲染

最简示例：3 个节点 + 3 条边，展示 GE 的默认渲染能力。边默认使用 `perimeter` 锚点（沿节点几何边缘计算连接点），并通过 `connector` 控制连线形态。

<ExamplePreview src="node/basic" />

## 要点

- `graph.addNode()` 创建节点，`shape` 默认为 `rect`
- `graph.addEdge()` 创建边，`source` / `target` 可直接传节点 id
- `connector`：`rounded`（直角圆滑）/ `smooth`（贝塞尔曲线）
- `router`：`orthogonal`（正交路由）

## 源码

<<< ../../../examples/node/basic.ts
