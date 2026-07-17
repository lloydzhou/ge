# 内置 Shape

GE 开箱即提供 12 个内置形状，通过 `shape` 字段选择。所有节点均支持 `resizable` / `rotatable`（由 Resize / Rotate 插件提供交互）。

<ExamplePreview src="node/shapes" :height="340" />

## 内置形状列表

| shape | 说明 |
|-------|------|
| `rect` | 矩形（默认） |
| `circle` | 圆形 |
| `ellipse` | 椭圆 |
| `diamond` | 菱形 |
| `triangle` | 三角形 |
| `hexagon` | 六边形 |
| `parallelogram` | 平行四边形 |
| `cylinder` | 圆柱体 |
| `star` | 星形 |
| `text` | 纯文本 |
| `cross` | 十字 |
| `arrow` | 箭头 |

如需自定义形状，可通过 `shape.register()` 注册（详见 [内置 Shape 指南](/guide/shapes)）。

## 源码

<<< ../../../examples/node/shapes.ts
