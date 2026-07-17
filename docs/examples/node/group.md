# 分组 Group

`Group` 是一种特殊节点，可 `embed` 其它节点。拖动分组时，组内节点整体跟随；组内节点连到组外节点时，世界坐标计算正确。

<ExamplePreview src="node/group" />

## 要点

- `graph.addGroup({ ... })` 创建分组（虚线框）
- `group.embed(node)` 将节点纳入分组，移动分组时整体跟随
- 组内/组外节点之间的边，端点坐标按世界坐标正确计算

## 源码

<<< ../../../examples/node/group.ts
