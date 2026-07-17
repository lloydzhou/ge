# 拖拽与选中

集成四个核心交互插件，演示最常用的编辑能力。

<ExamplePreview src="plugin/interaction" />

## 操作方式

- **拖拽**节点，相连的边自动跟随更新
- **单击**选中（橙色高亮），**Shift + 单击**多选
- **Cmd/Ctrl + Z** 撤销，**Shift + Cmd/Ctrl + Z** 重做
- 右下角**小地图**实时反映画布全貌

## 涉及插件

```ts
graph.use(new DragPlugin());      // 拖拽
graph.use(new SelectionPlugin()); // 选中 / 框选
graph.use(new HistoryPlugin());   // 撤销 / 重做
graph.use(new MinimapPlugin());   // 小地图
```

## 源码

<<< ../../../examples/plugin/interaction.ts
