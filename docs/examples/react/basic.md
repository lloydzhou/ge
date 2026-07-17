# React GraphView

`@antv/ge-react` 提供声明式 `<GraphView>` 组件：传入 `nodes` / `edges`，props 变化时按 id 做**增量 diff**（增 / 删 / 改）自动同步到底层 graph。

<ExamplePreview src="react/basic" :height="460" />

## 操作

- **+ 节点**：动态新增节点（diff 自动 addNode）
- **删末**：删除末尾节点（diff 自动 removeCell）
- **移动 A**：声明式更新属性（diff 自动 setAttribute）

## 用法

```tsx
import { GraphView } from '@antv/ge-react';

function App() {
  const [nodes, setNodes] = useState(initialNodes);
  return (
    <GraphView
      options={{ background: '#fafafa' }}
      nodes={nodes}
      edges={edges}
    />
  );
}
```

## 源码

<<< ../../../examples/react/basic.ts
