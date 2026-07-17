# 对齐辅助线 Snapline

拖拽节点时，若与其它节点的边缘接近对齐，自动显示参考线（红色）。`threshold` 控制触发灵敏度。

<ExamplePreview src="plugin/snapline" />

## 操作

拖动「拖我对齐」节点，靠近 B / C 的边缘或中心时会出现对齐线。

## 用法

```ts
graph.use(new SnaplinePlugin({ threshold: 6 }));
```

## 源码

<<< ../../../examples/plugin/snapline.ts
