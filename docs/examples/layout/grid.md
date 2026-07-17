# 布局算法 Layout

GE 提供多种布局算法，均为**纯函数**：输入节点（和边），输出 `positions Map`，由 `graph.applyLayout()` 应用到节点。

<ExamplePreview src="layout/grid" :height="460" />

## 算法一览

| 函数 | 说明 |
|------|------|
| `gridLayout` | 网格布局 |
| `circularLayout` | 环形布局 |
| `forceLayout` | 力导向（需传入边） |
| `hierarchicalLayout` | 层次布局（需传入边） |
| `treeLayout` | 树形布局（需传入边） |

## 用法

```ts
import { gridLayout } from '@ge';

const positions = gridLayout(
  graph.getNodes().map((n) => ({ id: n.id })),
  { gap: 40, startX: 30, startY: 30 },
);
graph.applyLayout(positions);
```

## 源码

<<< ../../../examples/layout/grid.ts
