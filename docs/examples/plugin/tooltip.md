# 悬停提示 Tooltip

鼠标悬停节点时显示 tooltip（DOM overlay），移开自动隐藏。`content` 可自定义生成函数，默认取节点的 `tooltip` attribute 或 `id`。

<ExamplePreview src="plugin/tooltip" />

## 操作

将鼠标悬停在任意节点上，即显示 `id · label` 形式的提示。

## 用法

```ts
graph.use(new TooltipPlugin({
  content: (node) => `${node.id} · ${node.getAttribute('label')}`,
  offset: 14,
}));
```

也可在节点上设置 `tooltip` attribute，用默认 content 生成：

```ts
graph.addNode({ id: 'a', tooltip: '我是提示文字', label: 'A' });
```

## 源码

<<< ../../../examples/plugin/tooltip.ts
