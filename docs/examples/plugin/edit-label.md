# 标签编辑 EditLabel

双击节点进入 inline 编辑模式，在节点上方显示 input。**回车**确认 / **ESC** 取消 / **blur** 确认，提交后通过 `setAttribute('label', ...)` 更新。

<ExamplePreview src="plugin/edit-label" />

## 操作

**双击**任意节点 → 出现输入框 → 编辑后回车确认。

## 用法

```ts
graph.use(new EditLabelPlugin());
```

插件无配置项，开箱即用；监听画布 `dblclick`，命中节点即弹出编辑器。

## 源码

<<< ../../../examples/plugin/edit-label.ts
