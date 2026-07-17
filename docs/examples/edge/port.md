# 端口连接 Port

节点可挂载 `Port` 作为连接点，边端点用 `ratio` 锚点精确定位到端口位置。

<ExamplePreview src="edge/port" />

## 要点

- `graph.addPort(node, { x, y, fill })` 在节点局部坐标系添加端口
- 边端点用锚点对象指定连接方式：

```ts
graph.addEdge({
  source: { cell: 'a', anchor: 'ratio', anchorArgs: { dx: 0.5, dy: 0 } },
  target: { cell: 'b', anchor: 'ratio', anchorArgs: { dx: -0.5, dy: 0 } },
});
```

- `ratio` 锚点的 `dx` / `dy` 为相对节点中心的比例（范围 -0.5 ~ 0.5）

## 源码

<<< ../../../examples/edge/port.ts
