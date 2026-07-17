# 右键菜单 ContextMenu

右键画布弹出自定义菜单。菜单项通过构造函数配置（DOM 化），点击触发 `action({ target, graph })`，`target` 为右键命中的节点（空白处为 `null`）。

<ExamplePreview src="plugin/context-menu" />

## 操作

- **右键节点** → 弹出菜单（复制 / 删除 / 自适应）
- **右键空白** → 同样弹出（删除项对 null target 无操作）
- 点击菜单项或空白处自动关闭

## 用法

```ts
graph.use(new ContextMenuPlugin([
  { label: '删除节点', action: ({ target, graph }) => {
    if (target) graph.removeCell(target.id);
  }},
  { label: '', separator: true },
  { label: '自适应', action: ({ graph }) => graph.zoomToFit() },
]));
```

## 源码

<<< ../../../examples/plugin/context-menu.ts
